/**
 * Code.gs
 * Entry points for the Student Home-Visit Application Backend API (Form EEF/กสศ. 01).
 * Exposes a stateless RESTful Web App API (doGet and doPost) for saving and fetching records.
 * 
 * Note on CORS/Fetch:
 * Google Apps Script Web Apps automatically handle CORS on their responses, but they utilize a 302 redirect
 * to script.googleusercontent.com. To prevent browser/CORS issues on the frontend:
 * 1. Do NOT send custom request headers (like Authorization or custom Content-Types) unless necessary.
 * 2. It is recommended to send the POST payload as a plain string using `fetch(url, { method: 'POST', body: JSON.stringify(...) })`
 *    without setting header `Content-Type: application/json` to avoid CORS preflight OPTIONS blocking.
 */

/**
 * Handles GET requests.
 * Used to fetch existing student JSON records to support the "Edit Later" functionality.
 * Expected query parameters: ?studentId=YOUR_ID&schoolName=YOUR_SCHOOL&term=YOUR_TERM
 * 
 * @param {Object} e - Event parameter from Google Web App.
 * @return {TextOutput} JSON response wrapper.
 */
function doGet(e) {
  try {
    // 1. Validate query parameters
    if (!e || !e.parameter) {
      return createJsonResponse("error", null, "No request parameters provided.");
    }
    
    var studentId = e.parameter.studentId;
    var schoolName = e.parameter.schoolName;
    var term = e.parameter.term;
    
    if (!studentId || !schoolName || !term) {
      return createJsonResponse("error", null, "Missing required query parameters: studentId, schoolName, term.");
    }
    
    // 2. Locate folder path without creating if missing
    var studentFolder = getStudentFolder(schoolName, term, studentId, false);
    if (!studentFolder) {
      return createJsonResponse("success", null, "Record not found (Folder path does not exist).");
    }
    
    // 3. Read JSON data
    var studentData = readStudentJson(studentFolder, studentId);
    if (!studentData) {
      return createJsonResponse("success", null, "Record not found (JSON file does not exist).");
    }
    
    // 4. Return successful response containing the student data
    return createJsonResponse("success", studentData);
    
  } catch (err) {
    return createJsonResponse("error", null, "Internal Server Error in doGet: " + err.toString());
  }
}

/**
 * Handles POST requests.
 * Used to save or update student JSON data and printed PDF forms.
 * Expected JSON payload body:
 * {
 *   "action": "save",
 *   "schoolName": "...",
 *   "term": "...",
 *   "studentId": "...",
 *   "jsonData": { ... },
 *   "pdfBase64": "..."
 * }
 * 
 * @param {Object} e - Event parameter from Google Web App containing postData.
 * @return {TextOutput} JSON response wrapper.
 */
function doPost(e) {
  try {
    // 1. Validate POST body structure
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse("error", null, "No post data received in the request.");
    }
    
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createJsonResponse("error", null, "Failed to parse POST body as JSON: " + parseError.toString());
    }
    
    var action = payload.action;
    var schoolName = payload.schoolName;
    var term = payload.term;
    var studentId = payload.studentId;
    var jsonData = payload.jsonData;
    var pdfBase64 = payload.pdfBase64;
    
    // 2. Validate payload parameters
    if (!action || action !== "save") {
      return createJsonResponse("error", null, "Unsupported or missing action. Action must be 'save'.");
    }
    if (!schoolName || !term || !studentId || !jsonData || !pdfBase64) {
      return createJsonResponse("error", null, "Missing required payload fields: schoolName, term, studentId, jsonData, or pdfBase64.");
    }
    
    // 3. Locate or create folder structure sequentially
    var studentFolder = getStudentFolder(schoolName, term, studentId, true);
    if (!studentFolder) {
      return createJsonResponse("error", null, "Failed to navigate or create directory hierarchy for student.");
    }
    
    // 4. Save/Update JSON File
    var jsonFileMeta = saveStudentJson(studentFolder, studentId, jsonData);
    
    // 5. Save/Overwrite PDF File
    var pdfFileMeta = saveStudentPdf(studentFolder, studentId, pdfBase64);
    
    // 6. Return standard success payload
    return createJsonResponse("success", {
      jsonFileId: jsonFileMeta.id,
      jsonFileUrl: jsonFileMeta.url,
      pdfFileId: pdfFileMeta.id,
      pdfFileUrl: pdfFileMeta.url
    }, "Data and PDF successfully saved.");
    
  } catch (err) {
    return createJsonResponse("error", null, "Internal Server Error in doPost: " + err.toString());
  }
}

/**
 * Utility to wrap responses into standard ContentService text output formatted as JSON.
 * Standardizes the response interface to resolve client integration errors.
 * 
 * @param {string} status - Response status ("success" or "error").
 * @param {Object|null} data - Requested payload data or metadata.
 * @param {string} [message] - Description of status or error messages.
 * @return {TextOutput} ContentService text output.
 */
function createJsonResponse(status, data, message) {
  var response = {
    status: status,
    data: data || null,
    message: message || ""
  };
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
