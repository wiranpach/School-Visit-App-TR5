/**
 * js/services/apiService.js
 * Handles communications with the Google Apps Script Backend REST API.
 */

/**
 * Gets the active GAS URL from window.appConfig.
 * Throws an error if settings are not initialized.
 * @return {string} The Google Apps Script web app endpoint.
 */
function getBackendUrl() {
  if (!window.appConfig || !window.appConfig.gasUrl) {
    throw new Error("ยังไม่ได้กำหนด URL ของระบบเบื้องหลัง (GAS Web App URL) ในส่วนการตั้งค่า");
  }
  return window.appConfig.gasUrl;
}

/**
 * Fetches existing student data (GET) from the backend.
 * @param {string} studentId - National ID or G-Code.
 * @param {string} schoolName - School name.
 * @param {string} term - Active term (e.g. "2569_1").
 * @return {Promise<Object|null>} Resolves to the parsed student data object, or null if not found.
 */
export async function fetchStudentRecord(studentId, schoolName, term) {
  try {
    const baseUrl = getBackendUrl();
    const params = new URLSearchParams({
      studentId: studentId,
      schoolName: schoolName,
      term: term
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.status === "error") {
      throw new Error(result.message || "Failed to fetch student record.");
    }

    return result.data; // will be parsed JSON data or null if record not found
  } catch (error) {
    console.error("fetchStudentRecord error:", error);
    throw error;
  }
}

/**
 * Saves or updates student record (POST) to the backend.
 * Payload matches Phase 1 specification:
 * {
 *   action: "save",
 *   schoolName: string,
 *   term: string,
 *   studentId: string,
 *   jsonData: object,
 *   pdfBase64: string
 * }
 * 
 * @param {Object} payload - The transaction payload.
 * @return {Promise<Object>} Metadata containing files' ids and urls.
 */
export async function saveStudentRecord(payload) {
  try {
    const baseUrl = getBackendUrl();

    // Standard GAS Web App POST request. Note: Do NOT set Content-Type header to application/json
    // to bypass preflight CORS check in Google servers. GAS accepts plaintext payload and parses it.
    const response = await fetch(baseUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "save",
        schoolName: payload.schoolName,
        term: payload.term,
        studentId: payload.studentId,
        jsonData: payload.jsonData,
        pdfBase64: payload.pdfBase64
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.status === "error") {
      throw new Error(result.message || "Failed to save student record.");
    }

    return result.data; // contains jsonFileId, jsonFileUrl, pdfFileId, pdfFileUrl
  } catch (error) {
    console.error("saveStudentRecord error:", error);
    throw error;
  }
}
