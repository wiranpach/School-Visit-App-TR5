/**
 * js/components/StepWizard.js
 * Controls step navigation (Pages 1 to 5 of the กสศ. 01 form) and enforces field validation.
 */

import { renderFormPage } from './FormPages.js';

export class StepWizard {
  /**
   * @param {string} containerId - Container element to render the wizard.
   * @param {Object} formState - Global student form data state.
   * @param {Function} onSubmitCallback - Fired when final submit is clicked on Page 5.
   * @param {Function} onCancelCallback - Fired when the session is cancelled.
   */
  constructor(containerId, formState, onSubmitCallback, onCancelCallback) {
    this.container = document.getElementById(containerId);
    this.formState = formState;
    this.currentStep = 1;
    this.onSubmit = onSubmitCallback;
    this.onCancel = onCancelCallback;
  }

  /**
   * Renders the wizard layout.
   */
  render() {
    this.container.innerHTML = `
      <div class="wizard-wrapper">
        <!-- Sticky Progress Stepper -->
        <div class="wizard-stepper card" style="padding: 1rem 2rem; margin-bottom: 1.5rem; position: sticky; top: 76px; z-index: 90;">
          <div class="stepper-track">
            ${[1, 2, 3, 4, 5].map(step => `
              <div class="step-node ${step === this.currentStep ? 'active' : ''} ${step < this.currentStep ? 'completed' : ''}" data-step="${step}">
                <div class="step-circle">${step < this.currentStep ? '✓' : step}</div>
                <span class="step-label">หน้า ${step}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Dynamic Form Content Area -->
        <div id="wizard-form-content"></div>

        <!-- Bottom Navigation Footer -->
        <div class="wizard-navigation card" style="padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
          <div style="display: flex; gap: 1rem;">
            <button id="btn-wizard-exit" class="button-secondary">✖️ ออก</button>
            <span id="wizard-autosave-indicator" class="autosave-status" style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem;">
              <span>💾</span> <span id="autosave-status-text">แบบร่างบันทึกอัตโนมัติแล้ว</span>
            </span>
          </div>
          <div style="display: flex; gap: 1rem;">
            <button id="btn-wizard-prev" class="button-secondary" ${this.currentStep === 1 ? 'disabled' : ''}>⬅️ ถอยกลับ</button>
            <button id="btn-wizard-next" class="button-primary">
              ${this.currentStep === 5 ? '💾 บันทึกและส่งข้อมูล' : 'ถัดไป ➡️'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind Event Listeners
    document.getElementById("btn-wizard-exit").addEventListener("click", () => {
      if (confirm("ต้องการออกจากแบบฟอร์มหรือไม่? (แบบร่างปัจจุบันถูกเซฟเก็บไว้ในเครื่องแล้ว)")) {
        this.onCancel();
      }
    });

    document.getElementById("btn-wizard-prev").addEventListener("click", () => this.navigate(-1));
    document.getElementById("btn-wizard-next").addEventListener("click", () => this.navigate(1));

    // Render Sub-Page inside form content div
    const pageContainer = document.getElementById("wizard-form-content");
    renderFormPage(this.currentStep, this.formState, pageContainer);
    
    // Auto scroll to top of form content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Navigates between steps, performing validation on transition.
   * @param {number} direction - Direction (-1 = back, 1 = next).
   */
  navigate(direction) {
    if (direction === 1) {
      // Validate active step
      if (this.currentStep === 1) {
        if (!this.validatePage1()) return;
      }
      
      if (this.currentStep === 5) {
        // Final Submission
        if (confirm("คุณตรวจสอบข้อมูลครบทั้ง 5 หน้า และพร้อมส่งขึ้น Google Drive ใช่หรือไม่?")) {
          this.onSubmit(this.formState);
        }
        return;
      }

      this.currentStep++;
    } else {
      if (this.currentStep === 1) return;
      this.currentStep--;
    }

    this.render();
  }

  /**
   * Validates mandatory inputs on Page 1 before proceeding.
   * @return {boolean} True if validation passes.
   */
  validatePage1() {
    // We validate name, surname, school and term. G-Code/NationalID is pre-validated on search.
    const name = this.formState.studentName ? this.formState.studentName.trim() : "";
    const surname = this.formState.studentSurname ? this.formState.studentSurname.trim() : "";
    const school = this.formState.schoolName ? this.formState.schoolName.trim() : "";
    const term = this.formState.term ? this.formState.term.trim() : "";

    if (!name || !surname) {
      alert("กรุณากรอกชื่อและนามสกุลนักเรียนก่อนไปหน้าถัดไป");
      return false;
    }
    if (!school || !term) {
      alert("กรุณาระบุชื่อโรงเรียนและภาคเรียนในหน้าจอตั้งค่า");
      return false;
    }
    return true;
  }
}
