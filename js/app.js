/**
 * js/app.js
 * PWA Core Shell Orchestrator. Bootstraps the application, coordinates screen transitions,
 * registers service workers, and connects Dashboard lookup to the Form Wizard.
 */

import { SettingsPanel } from './components/SettingsPanel.js';
import { Dashboard } from './components/Dashboard.js';
import { StepWizard } from './components/StepWizard.js';
import { saveStudentRecord } from './services/apiService.js';
import { saveDraftDebounced, clearDraft } from './services/localStorage.js';
import { generateStampedPDF } from './services/pdfEngine.js';

// Global Application State
window.appConfig = null;
window.currentFormState = null;

// Initialize app when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  initApp();
  registerServiceWorker();
});

/**
 * Bootstraps configuration parameters and launches initial view.
 */
function initApp() {
  // Bind Settings toggle button in App Header
  const settingsBtn = document.getElementById("btn-toggle-settings");
  
  // Remove existing listeners by cloning the button (prevents duplicate bindings on re-init)
  const newSettingsBtn = settingsBtn.cloneNode(true);
  settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
  newSettingsBtn.addEventListener("click", () => {
    switchView("app-settings");
  });

  // Verify settings variables in LocalStorage
  const schoolName = localStorage.getItem("schoolName");
  const term = localStorage.getItem("term");
  const academicYear = localStorage.getItem("academicYear");
  const gasUrl = localStorage.getItem("gasUrl");

  // Instanciate Settings Component
  const settingsPanel = new SettingsPanel("app-settings", () => {
    // OnSettingsSavedCallback: reload state and route to dashboard
    initApp();
  });
  settingsPanel.render();

  if (!schoolName || !term || !academicYear || !gasUrl) {
    // Configuration incomplete, force user to configure settings first
    switchView("app-settings");
    newSettingsBtn.classList.add("hidden");
  } else {
    // Configuration complete: load config globally
    newSettingsBtn.classList.remove("hidden");
    const formattedTerm = `${academicYear}_${term}`;

    window.appConfig = {
      schoolName,
      term: formattedTerm,
      rawTerm: term,
      academicYear,
      gasUrl
    };

    // Update Header Brand
    const headerInfo = document.getElementById("header-school-info");
    if (headerInfo) {
      headerInfo.textContent = `${schoolName} | ภาคเรียนที่ ${term}/${academicYear}`;
    }

    // Initialize & mount Dashboard
    const dashboard = new Dashboard("app-dashboard", (formState, isNew) => {
      startHomeVisitSession(formState, isNew);
    });
    dashboard.render();

    // Route to Dashboard
    switchView("app-dashboard");
  }
}

/**
 * Registers PWA Service Worker for offline capability.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered successfully with scope: ', reg.scope);
          // Set Online/Offline indicator in App Header
          const updateStatus = () => {
            const statusEl = document.getElementById("sync-status");
            if (navigator.onLine) {
              statusEl.textContent = "ออนไลน์";
              statusEl.className = "status-indicator online";
            } else {
              statusEl.textContent = "ออฟไลน์";
              statusEl.className = "status-indicator";
            }
          };
          window.addEventListener('online', updateStatus);
          window.addEventListener('offline', updateStatus);
          updateStatus();
        })
        .catch((error) => {
          console.error('Service Worker registration failed: ', error);
        });
    });
  }
}

/**
 * Handles view switching by toggling hidden class on views.
 * @param {string} viewId - Element ID of the view to activate.
 */
export function switchView(viewId) {
  const views = ["app-settings", "app-dashboard", "form-wizard-container"];
  views.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === viewId) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    }
  });
}

/**
 * Starts a form-filling session. Renders a form wizard shell in Phase 2
 * to make the API Sync functions testable.
 * 
 * @param {Object} formState - The initial or retrieved form state object.
 * @param {boolean} isNew - True if it's a new record.
 */
function startHomeVisitSession(formState, isNew) {
  window.currentFormState = formState;

  // Bind Event Listeners for Reactive Auto-Save
  const onStateChange = (event) => {
    const statusText = document.getElementById("autosave-status-text");
    if (statusText) {
      statusText.textContent = "กำลังบันทึกร่างลงเครื่อง...";
      statusText.style.color = "var(--primary-accent)";
    }
    
    // Trigger debounced storage persist (saves after 1 second of inactivity)
    saveDraftDebounced(formState.studentId, window.appConfig.term, event.detail);
  };

  const onAutoSaved = () => {
    const statusText = document.getElementById("autosave-status-text");
    if (statusText) {
      statusText.textContent = "แบบร่างบันทึกอัตโนมัติแล้ว";
      statusText.style.color = "var(--text-muted)";
    }
  };

  // Clean listeners before registering to prevent memory leaks
  window.removeEventListener("form-state-changed", onStateChange);
  window.removeEventListener("draft-autosaved", onAutoSaved);

  window.addEventListener("form-state-changed", onStateChange);
  window.addEventListener("draft-autosaved", onAutoSaved);

  // Initialize and mount StepWizard Component
  const wizard = new StepWizard(
    "form-wizard-container",
    formState,
    async (finalState) => {
      // ON SUBMIT: Send payload to Drive via GAS Web App
      const loader = document.getElementById("global-loader");
      const loaderText = document.getElementById("loader-text");
      if (loader) {
        loaderText.textContent = "กำลังประมวลผลไฟล์เอกสาร PDF เป๊ะๆ... กรุณารอสักครู่";
        loader.classList.remove("hidden");
      }

      try {
        // 1. Generate the stamped PDF base64 stream dynamically in browser
        const pdfBase64Data = await generateStampedPDF(finalState);

        if (loaderText) {
          loaderText.textContent = "กำลังอัปโหลดไฟล์ข้อมูลและเอกสาร PDF ไปที่ Google Drive...";
        }

        const payload = {
          schoolName: window.appConfig.schoolName,
          term: window.appConfig.term,
          studentId: finalState.studentId,
          jsonData: finalState,
          pdfBase64: pdfBase64Data
        };

        const result = await saveStudentRecord(payload);

        // Clear local drafts since it is now synchronized with remote Drive
        clearDraft(finalState.studentId, window.appConfig.term);

        // Remove active session auto-save event listeners
        window.removeEventListener("form-state-changed", onStateChange);
        window.removeEventListener("draft-autosaved", onAutoSaved);

        if (loader) loader.classList.add("hidden");
        
        alert("ซิงค์ข้อมูลและบันทึกเอกสารเยี่ยมบ้านนักเรียนลง Google Drive สำเร็จ!");
        
        // Return back to dashboard lookup
        initApp();

      } catch (error) {
        if (loader) loader.classList.add("hidden");
        alert("ไม่สามารถซิงค์ขึ้น Drive ได้: " + error.message);
      }
    },
    () => {
      // ON CANCEL: Return back to dashboard lookup and clean listeners
      window.removeEventListener("form-state-changed", onStateChange);
      window.removeEventListener("draft-autosaved", onAutoSaved);
      initApp();
    }
  );

  wizard.render();
  switchView("form-wizard-container");
}
