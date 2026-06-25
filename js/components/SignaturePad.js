/**
 * js/components/SignaturePad.js
 * Implements high-precision vector signature drawing for Apple Pencil/Touch/Mouse.
 * Utilizes Unified Pointer Events and scales resolution using Device Pixel Ratio.
 */

export class SignaturePad {
  /**
   * @param {string} containerId - Mount container ID.
   * @param {Object} formState - The global student data object.
   * @param {string} dataPath - State path of the signature (e.g. "signatures.studentSignatureBase64").
   * @param {string} datePath - State path of the signing timestamp (e.g. "signatures.studentSignedDate").
   * @param {string} label - Title of the signature field.
   */
  constructor(containerId, formState, dataPath, datePath, label) {
    this.container = document.getElementById(containerId);
    this.formState = formState;
    this.dataPath = dataPath;
    this.datePath = datePath;
    this.label = label;
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
  }

  /**
   * Initializes components.
   */
  init() {
    this.render();
    this.setupCanvas();
  }

  /**
   * Renders drawing card layout.
   */
  render() {
    if (!this.container) return;
    const value = this.getValue();
    const uniqueId = `sig-${this.dataPath.replace(/\./g, '-')}`;

    this.container.innerHTML = `
      <div class="signature-card card" style="padding: 1.25rem; background-color: var(--bg-primary);">
        <span style="font-weight: 600; display: block; margin-bottom: 0.5rem; color: var(--primary-dark); font-size: 0.95rem;">
          ${this.label}
        </span>
        
        <div class="canvas-wrapper" style="position: relative; border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden; background-color: #f8fafc; height: 140px; margin-bottom: 0.5rem;">
          <canvas id="${uniqueId}" style="width: 100%; height: 100%; display: block; touch-action: none; cursor: crosshair;"></canvas>
          ${value ? `
            <div id="${uniqueId}-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.92); display: flex; align-items: center; justify-content: center;">
              <img src="${value}" style="max-height: 110px;" alt="Signature Preview">
            </div>
          ` : ''}
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-align: left;">
            ${this.getDateValue() ? `ลงชื่อเมื่อ: ${this.getDateValue()}` : 'ยังไม่ได้ลงลายมือชื่อ'}
          </span>
          <button type="button" class="button-secondary" id="${uniqueId}-clear" style="font-size: 0.8rem; padding: 0.35rem 0.75rem; border-color: var(--border-color);">
            ล้างลายเซ็น
          </button>
        </div>
      </div>
    `;

    this.canvas = document.getElementById(uniqueId);
    this.clearBtn = document.getElementById(`${uniqueId}-clear`);
    this.clearBtn.addEventListener("click", () => this.handleClear());
  }

  /**
   * Configures canvas context and DPI resolution.
   */
  setupCanvas() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // Scale canvas elements to avoid blurry lines on Retina iPads
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);

    // Set drawing style guidelines
    this.ctx.strokeStyle = "#0f172a"; // Slate 900
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    // Bind pointer events (Pencil, touch, mouse)
    this.canvas.addEventListener("pointerdown", (e) => this.startDrawing(e));
    this.canvas.addEventListener("pointermove", (e) => this.draw(e));
    this.canvas.addEventListener("pointerup", () => this.stopDrawing());
    this.canvas.addEventListener("pointercancel", () => this.stopDrawing());
  }

  /**
   * Captures pointer start event.
   */
  startDrawing(event) {
    if (this.getValue()) return; // Drawing locked if image exists

    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    event.preventDefault();
  }

  /**
   * Draws vector lines between coordinates.
   */
  draw(event) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    event.preventDefault();
  }

  /**
   * Finalizes drawn stroke and exports as image/png.
   */
  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.ctx.closePath();

    // Export raw png data
    const dataUrl = this.canvas.toDataURL("image/png");
    this.setValue(dataUrl);

    // Set timestamp
    const dateStr = new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    this.setDateValue(dateStr);

    this.render();
  }

  /**
   * Resets signature data slots.
   */
  handleClear() {
    this.setValue("");
    this.setDateValue("");
    this.render();
    this.setupCanvas();
  }

  /**
   * Fetch signature state.
   */
  getValue() {
    const parts = this.dataPath.split('.');
    return parts.reduce((obj, part) => obj && obj[part], this.formState);
  }

  /**
   * Update signature state.
   */
  setValue(val) {
    const parts = this.dataPath.split('.');
    let current = this.formState;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = val;

    // Trigger state change trigger
    window.dispatchEvent(new CustomEvent('form-state-changed', { detail: this.formState }));
  }

  /**
   * Fetch date state.
   */
  getDateValue() {
    const parts = this.datePath.split('.');
    return parts.reduce((obj, part) => obj && obj[part], this.formState);
  }

  /**
   * Update date state.
   */
  setDateValue(val) {
    const parts = this.datePath.split('.');
    let current = this.formState;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = val;
  }
}
