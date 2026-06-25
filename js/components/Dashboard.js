/**
 * js/components/Dashboard.js
 * Renders the home-visit lookup control and queries student data.
 */

import { fetchStudentRecord } from '../services/apiService.js';
import { createEmptyFormSchema } from '../config/formSchema.js';
import { getDraft } from '../services/localStorage.js';

export class Dashboard {
  /**
   * @param {string} containerId - Element ID to render this panel in.
   * @param {Function} onStartSessionCallback - Triggered when a record session begins.
   *                                             Passes (formStateData, isNewRecord).
   */
  constructor(containerId, onStartSessionCallback) {
    this.container = document.getElementById(containerId);
    this.onStartSession = onStartSessionCallback;
  }

  /**
   * Renders student lookup control card.
   */
  render() {
    const config = window.appConfig || {};

    this.container.innerHTML = `
      <div class="dashboard-grid">
        <!-- Search Section -->
        <div class="card">
          <div class="card-title">🔍 ค้นหารายการเยี่ยมบ้านนักเรียน</div>
          <form id="search-form" class="search-box">
            <div class="form-group">
              <label for="input-student-id">เลขประจำตัวประชาชน หรือ G-Code นักเรียน</label>
              <input type="text" id="input-student-id" class="form-control" placeholder="ระบุเลข 13 หลัก หรือ G-Code" minlength="5" maxlength="17" required>
            </div>
            
            <button type="submit" class="button-primary" style="font-size: 1.1rem; padding: 0.9rem; width: 100%;">
              ตรวจสอบและเริ่มบันทึก กสศ. 01
            </button>
          </form>
        </div>

        <!-- Sync Details Section -->
        <div class="card">
          <div class="card-title">📋 ข้อมูลระบบในปัจจุบัน</div>
          <div style="font-size: 0.95rem; color: var(--text-main);">
            <p style="margin-bottom: 0.75rem; font-weight: 600; color: var(--primary-dark);">
              กำลังกรอกหรือแก้ไขข้อมูลภายใต้สังกัด:
            </p>
            <ul class="info-bullet-list">
              <li><strong>โรงเรียน/สถานศึกษา:</strong> ${config.schoolName || "ยังไม่ได้ตั้งค่า"}</li>
              <li><strong>ภาคเรียน & ปีการศึกษา:</strong> ภาคเรียนที่ ${config.rawTerm || "ยังไม่ได้ตั้งค่า"}/${config.academicYear || "ยังไม่ได้ตั้งค่า"} (โฟลเดอร์: ${config.term || "-"})</li>
            </ul>
            <hr style="margin: 1.2rem 0; border: none; border-top: 1px solid var(--border-color);">
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">
              * หากตรวจพบข้อมูลเดิมที่มีอยู่ในระบบคลาวด์ (Google Drive) ของภาคเรียนปัจจุบัน ระบบจะดึงข้อมูลชุดเดิมขึ้นมาให้ทำการแก้ไขต่อทันที (Edit Later) 
              หากไม่พบจะถือเป็นการสร้างใบงานใหม่
            </p>
          </div>
        </div>
      </div>
    `;

    document.getElementById("search-form").addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSearch();
    });
  }

  /**
   * Search handles polling of data from Google Drive backend.
   */
  async handleSearch() {
    const studentId = document.getElementById("input-student-id").value.trim();
    if (!studentId) return;

    const config = window.appConfig;

    // 1. Check offline local storage draft first
    const localDraft = getDraft(studentId, config.term);
    if (localDraft) {
      const loadLocal = confirm("พบข้อมูลใบงานนี้บันทึกค้างไว้ในเครื่องนี้ (แบบร่างสำรอง) คุณต้องการเปิดประวัติแบบร่างนี้ขึ้นมาเพื่อเขียนต่อเลยหรือไม่? (หากไม่ต้องการ ระบบจะข้ามไปดึงข้อมูลล่าจากคลาวด์แทน)");
      if (loadLocal) {
        this.onStartSession(localDraft, false);
        return;
      }
    }

    const loader = document.getElementById("global-loader");
    const loaderText = document.getElementById("loader-text");

    // Activate loading layer
    if (loader) {
      loaderText.textContent = "กำลังค้นหาข้อมูลจากเซิร์ฟเวอร์ Google Drive...";
      loader.classList.remove("hidden");
    }

    try {
      // GET fetch call to GAS backend
      const existingData = await fetchStudentRecord(studentId, config.schoolName, config.term);

      if (loader) {
        loader.classList.add("hidden");
      }

      if (existingData) {
        alert("ตรวจพบข้อมูลแบบฟอร์มการเยี่ยมบ้านแล้ว! ระบบกำลังเข้าสู่โหมดแก้ไขข้อมูล...");
        this.onStartSession(existingData, false);
      } else {
        alert("ไม่พบข้อมูลแบบฟอร์มการเยี่ยมบ้านเดิมของนักเรียนรายนี้ ระบบกำลังเตรียมใบงานหน้า 1-5 แผ่นใหม่ให้คุณ...");
        
        // Initialize from template form schema
        const freshState = createEmptyFormSchema();
        
        // Inject active settings defaults
        freshState.schoolName = config.schoolName;
        freshState.term = config.rawTerm;
        freshState.academicYear = config.academicYear;
        freshState.studentId = studentId;

        // Auto determine GCode vs NationalID
        if (/^\d{13}$/.test(studentId)) {
          freshState.nationalId = studentId;
          freshState.GCode = "";
        } else {
          freshState.nationalId = "";
          freshState.GCode = studentId;
        }

        this.onStartSession(freshState, true);
      }

    } catch (error) {
      if (loader) {
        loader.classList.add("hidden");
      }
      // If offline and request failed but user declined localDraft earlier (or it didn't exist)
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลจาก Drive (หากคุณกำลังออฟไลน์ ระบบจะจำกัดเฉพาะข้อมูลที่บันทึกไว้ในเครื่องก่อนหน้า): " + error.message);
    }
  }
}
