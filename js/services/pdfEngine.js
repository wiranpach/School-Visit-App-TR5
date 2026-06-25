/**
 * js/services/pdfEngine.js
 * Compiles the student home-visit PDF form using pdf-lib on the client-side.
 * Fetches the local PDF template, embeds TH Sarabun fonts, stamps inputs,
 * crops camera JPEGs, embeds transparent signatures, and exports as base64.
 */

import { PDFDocument, rgb } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';
import fontkit from 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm';
import { PDFCoordinatesBlueprint } from '../config/pdfCoordinates.js';

/**
 * Resolves a nested value from an object by dot notation path.
 */
function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Converts a base64 string (supporting data URL prefix) into an ArrayBuffer.
 * @param {string} base64 - Base64 encoded string.
 * @return {ArrayBuffer} Decoded binary array.
 */
function base64ToArrayBuffer(base64) {
  if (base64.indexOf(',') !== -1) {
    base64 = base64.split(',')[1];
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates the stamped PDF from the template and current form state.
 * @param {Object} currentFormState - Single source of truth formState.
 * @return {Promise<string>} Base64 string of the generated PDF (without data URI prefix).
 */
export async function generateStampedPDF(currentFormState) {
  try {
    // 1. Fetch the raw PDF template file from root workspace directory
    const templateResponse = await fetch('./แบบฟอร์ม นร._กสศ. 01 แบบขอรับเงินอุดหนุนนักเรียนยากจน.pdf');
    if (!templateResponse.ok) {
      throw new Error("ไม่สามารถดาวน์โหลดไฟล์แม่แบบ PDF 'แบบฟอร์ม นร._กสศ. 01 แบบขอรับเงินอุดหนุนนักเรียนยากจน.pdf' ได้");
    }
    const templateBuffer = await templateResponse.arrayBuffer();

    // 2. Fetch the TH Sarabun Font TTF from jsDelivr CDN
    const fontUrl = 'https://cdn.jsdelivr.net/npm/font-th-sarabun-new@1.0.0/fonts/THSarabunNew-webfont.ttf';
    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) {
      throw new Error("ไม่สามารถเชื่อมต่อดึงฟอนต์ภาษาไทย THSarabunNew.ttf ได้");
    }
    const fontBuffer = await fontResponse.arrayBuffer();

    // 3. Initialize PDF document and register fontkit
    const pdfDoc = await PDFDocument.load(templateBuffer);
    pdfDoc.registerFontkit(fontkit);

    // Embed Thai Font
    const customFont = await pdfDoc.embedFont(fontBuffer);

    // 4. Retrieve Pages and iterate stamping Coordinates
    const pages = pdfDoc.getPages();

    for (let pageIdx = 0; pageIdx < 5; pageIdx++) {
      const page = pages[pageIdx];
      if (!page) continue;

      const pageSpecs = PDFCoordinatesBlueprint[pageIdx] || {};

      for (const key in pageSpecs) {
        const spec = pageSpecs[key];
        const value = getValueByPath(currentFormState, key);

        if (spec.type === 'text') {
          if (value !== undefined && value !== null && value !== '') {
            page.drawText(String(value), {
              x: spec.x,
              y: spec.y,
              size: spec.fontSize || 9,
              font: customFont,
              color: rgb(0, 0, 0)
            });
          }
        } else if (spec.type === 'checkbox') {
          // Resolve standard checkbox paths vs formatted checkbox paths (e.g. status_none)
          let isChecked = false;
          if (key.includes('_')) {
            const parts = key.split('_');
            const statePath = parts[0];
            const targetValue = parts[1];
            const stateVal = getValueByPath(currentFormState, statePath);
            // Support check for strings and booleans
            isChecked = String(stateVal) === targetValue;
          } else {
            isChecked = !!value;
          }

          if (isChecked) {
            // Draw a checkmark '✓' at the specified coordinates
            page.drawText('✓', {
              x: spec.x,
              y: spec.y,
              size: 11,
              font: customFont,
              color: rgb(0, 0, 0)
            });
          }
        } else if (spec.type === 'image') {
          // Camera house photo captures
          if (value && value.trim() !== '') {
            try {
              const imageBytes = base64ToArrayBuffer(value);
              const embeddedImage = await pdfDoc.embedJpg(imageBytes);
              page.drawImage(embeddedImage, {
                x: spec.x,
                y: spec.y,
                width: spec.width,
                height: spec.height
              });
            } catch (imageError) {
              console.error(`Failed to embed JPG image for key: ${key}`, imageError);
            }
          }
        } else if (spec.type === 'signature') {
          // Apple Pencil vector signature captures
          if (value && value.trim() !== '') {
            try {
              const sigBytes = base64ToArrayBuffer(value);
              const embeddedSig = await pdfDoc.embedPng(sigBytes); // Png preserves alpha transparency
              page.drawImage(embeddedSig, {
                x: spec.x,
                y: spec.y,
                width: spec.width,
                height: spec.height
              });
            } catch (sigError) {
              console.error(`Failed to embed PNG signature for key: ${key}`, sigError);
            }
          }
        }
      }
    }

    // 5. Serialize PDF to Base64 (raw string, dataUri: false)
    const base64PdfString = await pdfDoc.saveAsBase64({ dataUri: false });
    return base64PdfString;

  } catch (error) {
    console.error("generateStampedPDF error:", error);
    throw error;
  }
}
