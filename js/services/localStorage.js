/**
 * js/services/localStorage.js
 * Manages reactive offline draft persistence for student home visits.
 */

const DRAFT_PREFIX = "eef_draft_";

/**
 * Generates a unique key combined of student ID and term.
 * @param {string} studentId - Student G-Code or National ID.
 * @param {string} term - The active term (e.g., "2569_1").
 * @return {string} Key name for local storage.
 */
function getDraftKey(studentId, term) {
  return `${DRAFT_PREFIX}${studentId}_${term}`;
}

/**
 * Saves the current state of the form schema into local storage.
 * @param {string} studentId - Student G-Code or National ID.
 * @param {string} term - The active term.
 * @param {Object} data - The current state object.
 */
export function saveDraft(studentId, term, data) {
  if (!studentId || !term || !data) return;
  const key = getDraftKey(studentId, term);
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Retrieves and parses the saved draft from local storage.
 * @param {string} studentId - Student G-Code or National ID.
 * @param {string} term - The active term.
 * @return {Object|null} The parsed draft data, or null if not found.
 */
export function getDraft(studentId, term) {
  if (!studentId || !term) return null;
  const key = getDraftKey(studentId, term);
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to parse draft from localStorage:", error);
    return null;
  }
}

/**
 * Deletes a draft from local storage. Called after successful sync to Drive.
 * @param {string} studentId - Student G-Code or National ID.
 * @param {string} term - The active term.
 */
export function clearDraft(studentId, term) {
  if (!studentId || !term) return;
  const key = getDraftKey(studentId, term);
  localStorage.removeItem(key);
}

// Timeout ID holder for debounce
let debounceTimer = null;

/**
 * Debounces the saveDraft listener to optimize storage writing during text input.
 * @param {string} studentId - Student ID.
 * @param {string} term - Active term.
 * @param {Object} data - Form data state.
 * @param {number} [delay] - Debounce delay in milliseconds (default 1000).
 */
export function saveDraftDebounced(studentId, term, data, delay = 1000) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    saveDraft(studentId, term, data);
    
    // Dispatch custom event to notify UI (e.g. status bar info)
    const event = new CustomEvent("draft-autosaved");
    window.dispatchEvent(event);
  }, delay);
}
