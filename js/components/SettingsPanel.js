/**
 * js/components/SettingsPanel.js
 * Renders and manages PWA settings.
 */

export class SettingsPanel {
  /**
   * @param {string} containerId - Element ID to render this panel in.
   * @param {Function} onSaveCallback - Triggered after configuration is successfully saved.
   */
  constructor(containerId, onSaveCallback) {
    this.container = document.getElementById(containerId);
    this.onSave = onSaveCallback;
  }

  /**
   * Renders settings form panel.
   */
  render() {
    const schoolName = localStorage.getItem("schoolName") || "";
    const term = localStorage.getItem("term") || "";
    const academicYear = localStorage.getItem("academicYear") || "";
    const gasUrl = localStorage.getItem("gasUrl") || "";

    this.container.innerHTML = `
      <div class="panel-container">
        <div class="panel-header">
          <h2>⚙️ ตั้งค่าระบบเชื่อมต่อ API</h2>
          <p>กรอกข้อมูลเริ่มต้นของสถานศึกษาและ URL ของ Google Apps Script เพื่อเปิดใช้งานระบบบันทึกข้อมูล</p>
        </div>
        <form id="settings-form" class="card">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="input-school-name">ชื่อสถานศึกษา / โรงเรียน</label>
            <input type="text" id="input-school-name" class="form-control" placeholder="ระบุชื่อโรงเรียนโดยไม่มีคำว่า โรงเรียน (เช่น วัดโพธิ์กลาง)" value="${schoolName}" required>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label for="input-term">ภาคเรียน</label>
              <select id="input-term" class="form-control" required>
                <option value="" disabled selected>เลือกภาคเรียน</option>
                <option value="1" ${term === "1" ? "selected" : ""}>ภาคเรียนที่ 1</option>
                <option value="2" ${term === "2" ? "selected" : ""}>ภาคเรียนที่ 2</option>
              </select>
            </div>
            <div class="form-group">
              <label for="input-year">ปีการศึกษา (พ.ศ.)</label>
              <input type="number" id="input-year" class="form-control" placeholder="เช่น 2569" min="2560" max="2650" value="${academicYear}" required>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="input-gas-url">Google Apps Script Web App URL</label>
            <input type="url" id="input-gas-url" class="form-control" placeholder="https://script.google.com/macros/s/AKfycb.../exec" value="${gasUrl}" required>
            <p class="subtitle" style="font-size: 0.8rem; margin-top: 0.3rem; color: var(--text-muted);">
              ได้จากการ Deploy Web App บน Google Apps Script ในส่วน backend API (Phase 1)
            </p>
          </div>

          <div class="panel-actions">
            <button type="submit" class="button-primary">บันทึกข้อมูลตั้งค่า</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById("settings-form").addEventListener("submit", (event) => {
      event.preventDefault();
      this.saveSettings();
    });
  }

  /**
   * Reads settings form inputs, updates local storage & global app settings.
   */
  saveSettings() {
    const schoolName = document.getElementById("input-school-name").value.trim();
    const term = document.getElementById("input-term").value;
    const academicYear = document.getElementById("input-year").value.trim();
    const gasUrl = document.getElementById("input-gas-url").value.trim();

    localStorage.setItem("schoolName", schoolName);
    localStorage.setItem("term", term);
    localStorage.setItem("academicYear", academicYear);
    localStorage.setItem("gasUrl", gasUrl);

    // Format term string for backend directory layout: [academicYear]_[term] (e.g. "2569_1")
    const formattedTerm = `${academicYear}_${term}`;

    window.appConfig = {
      schoolName: schoolName,
      term: formattedTerm,
      rawTerm: term,
      academicYear: academicYear,
      gasUrl: gasUrl
    };

    // Update branding school info on PWA App Header
    const headerInfo = document.getElementById("header-school-info");
    if (headerInfo) {
      headerInfo.textContent = `${schoolName} | ภาคเรียนที่ ${term}/${academicYear}`;
    }

    if (this.onSave) {
      this.onSave();
    }
  }
}
