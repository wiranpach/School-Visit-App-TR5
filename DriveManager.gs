/**
 * DriveManager.gs
 * Provides folder structures and file persistence operations for the Student Home-Visit API.
 * Uses DriveApp (standard Google Apps Script API).
 */

var ROOT_FOLDER_NAME = "EEF_HomeVisit_Data";

/**
 * Retrieves the root folder on Google Drive. Creates it if it doesn't exist.
 * @return {Folder} The root folder.
 */
function getOrCreateRootFolder() {
  var folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

/**
 * Helper to retrieve a subfolder by name or create it if not found.
 * @param {Folder} parentFolder - The parent directory.
 * @param {string} folderName - The folder to find or create.
 * @return {Folder} The requested subfolder.
 */
function getOrCreateSubfolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Traverses the Drive directory structure: Root -> schoolName -> term -> studentId.
 * Optionally creates the directory structure if createIfMissing is true.
 * @param {string} schoolName - Name of the school.
 * @param {string} term - The academic term (e.g. "2569_1").
 * @param {string} studentId - The student identifier (ID / G-Code).
 * @param {boolean} createIfMissing - If true, creates any missing folders in the path.
 * @return {Folder|null} The student's subfolder or null if not found.
 */
function getStudentFolder(schoolName, term, studentId, createIfMissing) {
  var rootFolder = getOrCreateRootFolder();
  var schoolFolder;

  if (createIfMissing) {
    schoolFolder = getOrCreateSubfolder(rootFolder, schoolName);
  } else {
    var folders = rootFolder.getFoldersByName(schoolName);
    if (!folders.hasNext()) return null;
    schoolFolder = folders.next();
  }

  var termFolder;
  if (createIfMissing) {
    termFolder = getOrCreateSubfolder(schoolFolder, term);
  } else {
    var folders = schoolFolder.getFoldersByName(term);
    if (!folders.hasNext()) return null;
    termFolder = folders.next();
  }

  var studentFolder;
  if (createIfMissing) {
    studentFolder = getOrCreateSubfolder(termFolder, studentId);
  } else {
    var folders = termFolder.getFoldersByName(studentId);
    if (!folders.hasNext()) return null;
    studentFolder = folders.next();
  }

  return studentFolder;
}

/**
 * Reads student_data_[studentId].json from the given student folder.
 * @param {Folder} folder - The leaf folder of the student.
 * @param {string} studentId - The student identifier.
 * @return {Object|null} The parsed JSON data or null if the file doesn't exist.
 */
function readStudentJson(folder, studentId) {
  var fileName = "student_data_" + studentId + ".json";
  var files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    var file = files.next();
    var content = file.getBlob().getDataAsString("UTF-8");
    return JSON.parse(content);
  }
  return null;
}

/**
 * Saves (creates or updates) the student data JSON file.
 * @param {Folder} folder - The leaf folder of the student.
 * @param {string} studentId - The student identifier.
 * @param {Object} jsonData - The structured schema of the student form.
 * @return {Object} File metadata containing id and url.
 */
function saveStudentJson(folder, studentId, jsonData) {
  var fileName = "student_data_" + studentId + ".json";
  var contentString = JSON.stringify(jsonData, null, 2);
  var files = folder.getFilesByName(fileName);
  var file;

  if (files.hasNext()) {
    file = files.next();
    file.setContent(contentString);
  } else {
    file = folder.createFile(fileName, contentString, "application/json");
  }

  return {
    id: file.getId(),
    url: file.getUrl()
  };
}

/**
 * Saves (creates or updates) the student printed form PDF file by decoding base64 stream.
 * Trashes existing PDF to ensure standard DriveApp overwrite capability.
 * @param {Folder} folder - The leaf folder of the student.
 * @param {string} studentId - The student identifier.
 * @param {string} pdfBase64 - Base64 encoded string of the printed PDF.
 * @return {Object} File metadata containing id and url.
 */
function saveStudentPdf(folder, studentId, pdfBase64) {
  var fileName = "eef_form_printed_" + studentId + ".pdf";
  
  // Clean up any data URL prefix (e.g. "data:application/pdf;base64,") if present
  if (pdfBase64.indexOf(",") !== -1) {
    pdfBase64 = pdfBase64.split(",")[1];
  }
  
  var decodedBytes = Utilities.base64Decode(pdfBase64);
  var blob = Utilities.newBlob(decodedBytes, "application/pdf", fileName);

  // Trash existing file with same name to prevent duplicates
  var files = folder.getFilesByName(fileName);
  while (files.hasNext()) {
    var file = files.next();
    file.setTrashed(true);
  }

  var file = folder.createFile(blob);
  return {
    id: file.getId(),
    url: file.getUrl()
  };
}
