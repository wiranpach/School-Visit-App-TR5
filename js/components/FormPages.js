/**
 * js/components/FormPages.js
 * Renders the HTML structure for Pages 1-5 of the กสศ. 01 form.
 * Implements two-way data binding and dynamic updates.
 */

import { CameraCapture } from './CameraCapture.js';
import { SignaturePad } from './SignaturePad.js';

/**
 * Resolves a nested value from an object by dot notation path.
 */
function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Sets a nested value on an object by dot notation path.
 */
function setValueByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || current[part] === null) {
      current[part] = isNaN(parts[i + 1]) ? {} : [];
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Sets up two-way data binding on inputs containing `data-path` attribute.
 * Also hooks into changes to save draft automatically.
 * 
 * @param {Element} container - Page DOM container.
 * @param {Object} formState - The global state.
 */
export function bindDataPaths(container, formState) {
  const inputs = container.querySelectorAll('[data-path]');
  
  inputs.forEach(input => {
    const path = input.dataset.path;
    const value = getValueByPath(formState, path);

    // Initial state rendering
    if (input.type === 'checkbox') {
      input.checked = !!value;
    } else if (input.type === 'radio') {
      input.checked = String(value) === input.value;
    } else {
      input.value = value !== undefined && value !== null ? value : '';
    }

    // Update handler
    const updateHandler = () => {
      let val;
      if (input.type === 'checkbox') {
        val = input.checked;
      } else if (input.type === 'radio') {
        val = input.value;
      } else if (input.type === 'number') {
        val = parseFloat(input.value) || 0;
      } else {
        val = input.value;
      }

      setValueByPath(formState, path, val);

      // Perform dynamic income summaries if input is an income element
      if (input.classList.contains('income-input')) {
        recalculateIncome(formState, container);
      }

      // Dispatch changes to save drafts in background
      window.dispatchEvent(new CustomEvent('form-state-changed', { detail: formState }));
    };

    input.addEventListener('change', updateHandler);
    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
      input.addEventListener('input', updateHandler);
    }
  });
}

/**
 * Calculates sum values of household members and updates data schema summaries.
 */
function recalculateIncome(formState, container) {
  let aggregateTotal = 0;
  let activeMembersCount = 0;

  formState.householdMembers.forEach((member, index) => {
    // Member is active if name is specified or age/relation is set
    const nameVal = member.name ? member.name.trim() : "";
    if (nameVal !== "" || member.age !== "" || member.relation !== "") {
      activeMembersCount++;
      const monthlySum = (member.incomeWages || 0) +
                         (member.incomeAgriculture || 0) +
                         (member.incomeBusiness || 0) +
                         (member.incomeWelfare || 0) +
                         (member.incomeOther || 0);
      member.totalMonthlyIncome = monthlySum;

      // Update individual total field in UI
      const totalField = container.querySelector(`[data-path="householdMembers.${index}.totalMonthlyIncome"]`);
      if (totalField) totalField.value = monthlySum;

      aggregateTotal += monthlySum;
    } else {
      member.totalMonthlyIncome = 0;
    }
  });

  formState.totalHouseholdMembers = Math.max(1, activeMembersCount);
  formState.aggregateHouseholdIncome = aggregateTotal * 12; // Annual Household Income
  formState.averageIncomePerHead = formState.aggregateHouseholdIncome / formState.totalHouseholdMembers;

  // Render summaries on UI
  const aggregateEl = container.querySelector('#summary-aggregate-income');
  const averageEl = container.querySelector('#summary-average-income');
  if (aggregateEl) aggregateEl.textContent = formState.aggregateHouseholdIncome.toLocaleString() + ' บาท/ปี';
  if (averageEl) averageEl.textContent = formState.averageIncomePerHead.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' บาท/คน/ปี';
}

/**
 * Renders HTML structures for Step Pages.
 */
export function renderFormPage(step, formState, container) {
  switch (step) {
    case 1:
      renderPage1(formState, container);
      break;
    case 2:
      renderPage2(formState, container);
      break;
    case 3:
      renderPage3(formState, container);
      break;
    case 4:
      renderPage4(formState, container);
      break;
    case 5:
      renderPage5(formState, container);
      break;
  }

  // Bind two-way paths
  bindDataPaths(container, formState);

  // Run secondary initializations (Camera uploads, pointer signatures)
  afterRenderFormPage(step, formState, container);
}

function renderPage1(formState, container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-title">🏫 ข้อมูลทั่วไปของสถานศึกษา</div>
      <div class="form-grid">
        <div class="form-group">
          <label>ชื่อสถานศึกษา</label>
          <input type="text" class="form-control" data-path="schoolName" disabled>
        </div>
        <div class="form-group">
          <label>ภาคเรียน</label>
          <input type="text" class="form-control" data-path="term" disabled>
        </div>
        <div class="form-group">
          <label>ปีการศึกษา</label>
          <input type="text" class="form-control" data-path="academicYear" disabled>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">👤 ข้อมูลนักเรียน</div>
      <div class="form-grid">
        <div class="form-group">
          <label>ชื่อนักเรียน</label>
          <input type="text" class="form-control" data-path="studentName" required>
        </div>
        <div class="form-group">
          <label>นามสกุลนักเรียน</label>
          <input type="text" class="form-control" data-path="studentSurname" required>
        </div>
      </div>

      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group">
          <label>เลขประจำตัวประชาชน (13 หลัก)</label>
          <input type="text" class="form-control" data-path="nationalId" disabled>
        </div>
        <div class="form-group">
          <label>G-Code</label>
          <input type="text" class="form-control" data-path="GCode" disabled>
        </div>
      </div>

      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group">
          <label>สถานภาพครอบครัว</label>
          <select class="form-control" data-path="familyStatus" id="select-family-status">
            <option value="" disabled>เลือกสถานภาพ</option>
            <option value="อยู่ร่วมกัน">อยู่ร่วมกัน</option>
            <option value="แยกกันอยู่">แยกกันอยู่</option>
            <option value="หย่าร้าง">หย่าร้าง</option>
            <option value="เสียชีวิต">เสียชีวิต</option>
            <option value="ครัวเรือนสถาบัน">ครัวเรือนสถาบัน (สถานสงเคราะห์/วัด/โรงเรียนประจำ)</option>
          </select>
        </div>
        <div class="form-group">
          <label>นักเรียนอาศัยอยู่กับใคร</label>
          <select class="form-control" data-path="livingWith">
            <option value="" disabled>เลือกความสัมพันธ์</option>
            <option value="บิดามารดา">บิดามารดา</option>
            <option value="บิดา">บิดา</option>
            <option value="มารดา">มารดา</option>
            <option value="ญาติ">ญาติ</option>
            <option value="ผู้ปกครอง">ผู้ปกครอง</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">👨‍👩‍👦 ข้อมูลผู้ปกครอง (กรณีผู้ปกครองไม่ใช่บิดา/มารดา)</div>
      <div class="form-grid">
        <div class="form-group">
          <label>ชื่อ-นามสกุล ผู้ปกครอง</label>
          <input type="text" class="form-control" data-path="guardianDetails.name">
        </div>
        <div class="form-group">
          <label>ความสัมพันธ์กับนักเรียน</label>
          <input type="text" class="form-control" data-path="guardianDetails.relation" placeholder="เช่น ป้า, ยาย">
        </div>
        <div class="form-group">
          <label>เบอร์โทรศัพท์ติดต่อ</label>
          <input type="tel" class="form-control" data-path="guardianDetails.phone">
        </div>
      </div>
      
      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group">
          <label>เลขประจำตัวประชาชนผู้ปกครอง (13 หลัก)</label>
          <input type="text" class="form-control" data-path="guardianDetails.citizenId">
        </div>
        <div class="form-group">
          <label>ระดับการศึกษาผู้ปกครอง</label>
          <input type="text" class="form-control" data-path="guardianDetails.education">
        </div>
        <div class="form-group">
          <label>อาชีพหลักผู้ปกครอง</label>
          <input type="text" class="form-control" data-path="guardianDetails.career">
        </div>
      </div>

      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group">
          <label>สถานะการรับสวัสดิการแห่งรัฐ</label>
          <select class="form-control" data-path="guardianDetails.welfareStatus">
            <option value="">เลือกสวัสดิการ</option>
            <option value="ได้รับบัตรสวัสดิการแห่งรัฐ">ได้รับบัตรสวัสดิการแห่งรัฐ</option>
            <option value="ไม่ได้รับ">ไม่ได้รับ</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderPage2(formState, container) {
  let membersHtml = "";
  for (let i = 0; i < 10; i++) {
    membersHtml += `
      <div class="member-row-card card" id="member-card-${i}" style="border-left: 5px solid var(--primary-accent); margin-bottom: 1.5rem; padding: 1.5rem;">
        <div style="font-weight: 600; display: flex; justify-content: space-between; margin-bottom: 1rem; color: var(--primary-dark);">
          <span>สมาชิกในครอบครัวคนที่ ${i + 1}</span>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label>ชื่อ-นามสกุล</label>
            <input type="text" class="form-control" data-path="householdMembers.${i}.name" placeholder="ชื่อ-นามสกุลสมาชิก">
          </div>
          <div class="form-group">
            <label>ความสัมพันธ์กับนักเรียน</label>
            <input type="text" class="form-control" data-path="householdMembers.${i}.relation" placeholder="เช่น บิดา, มารดา, ปู่, พี่สาว">
          </div>
          <div class="form-group">
            <label>อายุ (ปี)</label>
            <input type="number" class="form-control" data-path="householdMembers.${i}.age" placeholder="อายุ">
          </div>
        </div>

        <div class="form-grid" style="margin-top: 1rem;">
          <div class="form-group">
            <label>เลขประจำตัวประชาชน (13 หลัก)</label>
            <input type="text" class="form-control" data-path="householdMembers.${i}.nationalId" placeholder="หากไม่มีให้เว้นว่าง">
          </div>
          <div class="form-group">
            <label>การศึกษาสูงสุด</label>
            <input type="text" class="form-control" data-path="householdMembers.${i}.education">
          </div>
          <div class="form-group" style="display: flex; flex-direction: row; gap: 1.5rem; align-items: center; height: 100%;">
            <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
              <input type="checkbox" data-path="householdMembers.${i}.physicalDisability"> พิการ/ทุพพลภาพ
            </label>
            <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
              <input type="checkbox" data-path="householdMembers.${i}.chronicDisease"> มีโรคเจ็บป่วยเรื้อรัง
            </label>
          </div>
        </div>

        <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <span style="font-weight: 550; font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.75rem;">
            รายได้เฉลี่ยต่อเดือนของสมาชิกรายนี้ (บาท)
          </span>
          <div class="form-grid">
            <div class="form-group">
              <label>ค่าจ้าง / เงินเดือน</label>
              <input type="number" class="form-control income-input" data-path="householdMembers.${i}.incomeWages" value="0">
            </div>
            <div class="form-group">
              <label>เกษตรกรรม / ประมง</label>
              <input type="number" class="form-control income-input" data-path="householdMembers.${i}.incomeAgriculture" value="0">
            </div>
            <div class="form-group">
              <label>ธุรกิจส่วนตัว / ค้าขาย</label>
              <input type="number" class="form-control income-input" data-path="householdMembers.${i}.incomeBusiness" value="0">
            </div>
          </div>
          <div class="form-grid" style="margin-top: 1rem;">
            <div class="form-group">
              <label>เงินอุดหนุนช่วยเหลือรัฐ</label>
              <input type="number" class="form-control income-input" data-path="householdMembers.${i}.incomeWelfare" value="0">
            </div>
            <div class="form-group">
              <label>รายได้ช่องทางอื่นๆ</label>
              <input type="number" class="form-control income-input" data-path="householdMembers.${i}.incomeOther" value="0">
            </div>
            <div class="form-group">
              <label>รายได้รวมเฉลี่ย/เดือน</label>
              <input type="number" class="form-control" data-path="householdMembers.${i}.totalMonthlyIncome" value="0" disabled>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card" style="position: sticky; top: 156px; z-index: 80; background-color: var(--primary-light); border-color: var(--primary-accent); padding: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="font-weight: 700; color: var(--primary-dark);">สรุปรายได้เฉลี่ยสมาชิกครัวเรือน</span>
          <p class="subtitle" style="font-size: 0.8rem; color: var(--text-muted);">คำนวณอัตโนมัติเมื่อกรอกข้อมูลด้านล่าง</p>
        </div>
        <div style="display: flex; gap: 1.5rem; text-align: right;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">รายได้รวมสะสมครัวเรือน</div>
            <div id="summary-aggregate-income" style="font-size: 1.1rem; font-weight: 700; color: var(--primary-dark);">0 บาท/ปี</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">รายได้เฉลี่ยต่อคน</div>
            <div id="summary-average-income" style="font-size: 1.1rem; font-weight: 700; color: var(--primary-dark);">0 บาท/คน/ปี</div>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="color: var(--primary-dark);">👥 บัญชีรายชื่อสมาชิกครัวเรือน (ระบุเท่าที่มีความต้องการเพิ่มสูงสุด 10 คน)</h3>
        <div class="form-group" style="flex-direction: row; align-items: center; gap: 0.5rem; margin-bottom: 0;">
          <label for="select-member-count" style="font-size: 0.85rem;">แสดงจำนวนสมาชิก:</label>
          <select id="select-member-count" class="form-control" style="width: 70px; padding: 0.25rem 0.5rem;" data-path="totalHouseholdMembers">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}">${n}</option>`).join('')}
          </select>
        </div>
      </div>
      
      <div id="household-members-wrapper">
        ${membersHtml}
      </div>
    </div>
  `;

  // Dynamic Toggle Member count visibility
  const selectCount = container.querySelector('#select-member-count');
  const toggleVisibility = () => {
    const val = parseInt(selectCount.value) || 1;
    for (let i = 0; i < 10; i++) {
      const card = container.querySelector(`#member-card-${i}`);
      if (card) {
        if (i < val) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      }
    }
  };

  selectCount.addEventListener('change', toggleVisibility);
  toggleVisibility();
  
  // Set initial income sum metrics
  recalculateIncome(formState, container);
}

function renderPage3(formState, container) {
  const isInstitution = formState.familyStatus === "ครัวเรือนสถาบัน";

  container.innerHTML = `
    <!-- CONDITIONAL RENDER: Section 4 Institution Details -->
    <div id="institution-section" class="card ${isInstitution ? '' : 'hidden'}" style="border-left: 5px solid #d97706;">
      <div class="card-title" style="color: #b45309;">⛪ ส่วนที่ 4 ข้อมูลสถานศึกษาหรือสถาบันทางสังคม (ครัวเรือนสถาบัน)</div>
      <div class="form-grid">
        <div class="form-group">
          <label>ประเภทสถาบัน</label>
          <input type="text" class="form-control" data-path="institution.institutionType" placeholder="เช่น สถานสงเคราะห์, วัด">
        </div>
        <div class="form-group">
          <label>ชื่อสถาบัน/มูลนิธิ</label>
          <input type="text" class="form-control" data-path="institution.institutionName">
        </div>
        <div class="form-group">
          <label>จังหวัดที่ตั้งสถาบัน</label>
          <input type="text" class="form-control" data-path="institution.province">
        </div>
      </div>

      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group">
          <label>ชื่อผู้จัดการ/ผู้รับผิดชอบ</label>
          <input type="text" class="form-control" data-path="institution.managerName">
        </div>
        <div class="form-group">
          <label>โทรศัพท์สถาบัน</label>
          <input type="tel" class="form-control" data-path="institution.phone">
        </div>
        <div class="form-group" style="display: flex; flex-direction: row; gap: 0.5rem; align-items: flex-end;">
          <div style="flex: 1;">
            <label>เข้าพักตั้งแต่ (เดือน)</label>
            <input type="text" class="form-control" data-path="institution.arrivalMonth" placeholder="เช่น พฤษภาคม">
          </div>
          <div style="flex: 1;">
            <label>ปีการศึกษา (พ.ศ.)</label>
            <input type="text" class="form-control" data-path="institution.arrivalYear" placeholder="เช่น 2568">
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Household Conditions -->
    <div class="card">
      <div class="card-title">🏠 ส่วนที่ 3 สถานะครัวเรือนและภาระครัวเรือน (3.1 - 3.4)</div>
      
      <div style="margin-bottom: 1.5rem;">
        <span style="font-weight: 600; display: block; margin-bottom: 0.5rem; color: var(--primary-dark);">
          3.1 ภาระพึ่งอิงในครัวเรือน (เลือกหัวข้อที่ตรวจพบ)
        </span>
        <div style="display: flex; flex-wrap: wrap; gap: 1.5rem;">
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="householdBurden.disability"> มีคนพิการ
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="householdBurden.chronic"> มีคนเจ็บป่วยเรื้อรัง
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="householdBurden.elderly"> มีผู้สูงอายุเกิน 60 ปี
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="householdBurden.singleParent"> พ่อ/แม่เลี้ยงเดี่ยว
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="householdBurden.unemployed"> มีคนว่างงานวัยทำงาน
          </label>
        </div>
      </div>

      <div class="form-grid" style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
        <div class="form-group">
          <label>3.2 สถานะการอยู่อาศัย</label>
          <select class="form-control" data-path="housingStatus.type" id="select-housing-status">
            <option value="">เลือกสถานะ</option>
            <option value="owned">เป็นเจ้าของที่พักอาศัยเอง</option>
            <option value="livingFree">อาศัยอยู่ฟรี (ไม่เสียค่าเช่า)</option>
            <option value="rented">เช่าบ้าน / ห้องพัก</option>
            <option value="dormitory">อยู่หอพักโรงเรียน / สถาบัน</option>
          </select>
        </div>
        <div class="form-group" id="group-rent-cost">
          <label>ค่าเช่าบ้าน / ห้องพัก (บาท/เดือน)</label>
          <input type="number" class="form-control" data-path="housingStatus.rentCost" value="0">
        </div>
      </div>

      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group">
          <label>3.3.1 วัสดุทำพื้นบ้าน</label>
          <select class="form-control" data-path="housingMaterials.floor">
            <option value="">เลือกประเภทพื้น</option>
            <option value="คอนกรีต/กระเบื้อง">คอนกรีต / หินขัด / กระเบื้อง</option>
            <option value="ไม้กระดาน">ไม้กระดานขัดเรียบ</option>
            <option value="ดิน/ไม้ไผ่">ดินเปลือย / ฟากไม้ไผ่ / ไม้เศษกระดาน</option>
          </select>
        </div>
        <div class="form-group">
          <label>3.3.2 วัสดุทำฝาผนังบ้าน</label>
          <select class="form-control" data-path="housingMaterials.wall">
            <option value="">เลือกประเภทผนัง</option>
            <option value="อิฐ/ปูน">คอนกรีต / อิฐมอญ / ไม้ก่อสร้างถาวร</option>
            <option value="ไม้ไผ่/สังกะสี">ไม้ไผ่ขัดแตะ / สังกะสีผุพัง / ไม้อัดบาง</option>
            <option value="ใบจาก/ฟาง">ใบจาก / หญ้าคา / ฟางข้าว / เศษวัสดุเหลือใช้</option>
          </select>
        </div>
        <div class="form-group">
          <label>3.3.3 วัสดุทำหลังคาบ้าน</label>
          <select class="form-control" data-path="housingMaterials.roof">
            <option value="">เลือกประเภทหลังคา</option>
            <option value="คอนกรีต/กระเบื้องโมเนีย">คอนกรีต / กระเบื้องดินเผา / สังกะสีสภาพสมบูรณ์</option>
            <option value="สังกะสีผุพัง">สังกะสีผุกร่อนมีรูรั่ว / กระเบื้องแตกหัก</option>
            <option value="หญ้าคา/จาก">หญ้าคา / แฝก / ใบจาก / เศษกระดาษ</option>
          </select>
        </div>
      </div>

      <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; display: flex; gap: 2rem;">
        <div class="form-group">
          <label>ที่อยู่อาศัยมีห้องส้วมในตัวหรือไม่</label>
          <div style="display: flex; gap: 1.5rem; margin-top: 0.25rem;">
            <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
              <input type="radio" name="toiletExist" value="true" data-path="housingMaterials.toiletExist"> มีห้องส้วม
            </label>
            <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
              <input type="radio" name="toiletExist" value="false" data-path="housingMaterials.toiletExist"> ไม่มีส้วมใช้งาน/ส้วมสาธารณะ
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🌾 3.4 การครอบครองที่ดินทำกินทางการเกษตร (เกษตรกรรม)</div>
      <div class="form-group">
        <label>ขนาดพื้นที่ดินทำการเกษตรรวมในครอบครัว</label>
        <select class="form-control" data-path="agriculturalLand.status">
          <option value="">เลือกขนาดที่ดิน</option>
          <option value="none">ไม่มีที่ดินทำการเกษตร / ไม่ได้ทำเกษตรกรรม</option>
          <option value="lessThan1">ทำเกษตร แต่ไม่มีที่ดินทำกินของตนเอง (เช่า/อาศัยสิทธิ์ผู้อื่น)</option>
          <option value="1to5">ทำเกษตร มีที่ดินตนเอง น้อยกว่า 5 ไร่</option>
          <option value="moreThan5">ทำเกษตร มีที่ดินตนเอง เกิน 5 ไร่ ขึ้นไป</option>
        </select>
      </div>
    </div>
  `;

  // Conditionally hide/show rent cost input based on housing selection
  const selectHousing = container.querySelector('#select-housing-status');
  const rentGroup = container.querySelector('#group-rent-cost');
  const toggleRent = () => {
    if (selectHousing.value === 'rented') {
      rentGroup.style.display = 'flex';
    } else {
      rentGroup.style.display = 'none';
    }
  };
  selectHousing.addEventListener('change', toggleRent);
  toggleRent();
}

function renderPage4(formState, container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-title">🚰 สถานะสาธารณูปโภคขั้นพื้นฐาน (3.5 - 3.8)</div>
      
      <div class="form-grid">
        <div class="form-group">
          <label>3.5 แหล่งน้ำดื่มหลักของครัวเรือน</label>
          <select class="form-control" data-path="drinkingWaterSource">
            <option value="">เลือกแหล่งน้ำ</option>
            <option value="น้ำขวดบรรจุเสร็จ">น้ำบรรจุขวดเสร็จซื้อ/น้ำกรองผ่านระบบ</option>
            <option value="น้ำประปาต้ม">น้ำประปาภายในที่อยู่อาศัย (ประปาภูมิภาค/หมู่บ้าน)</option>
            <option value="น้ำบ่อขุด/น้ำฝน">น้ำบ่อธรรมชาติ / บ่อน้ำตื้น / น้ำฝนรองตุ่ม</option>
            <option value="แม่น้ำลำคลอง">แม่น้ำลำคลอง / ห้วยหนองธรรมชาติ</option>
          </select>
        </div>
        <div class="form-group">
          <label>3.6 แหล่งพลังงานไฟฟ้าหลัก</label>
          <select class="form-control" data-path="electricitySource">
            <option value="">เลือกแหล่งไฟฟ้า</option>
            <option value="สายส่งระบบการไฟฟ้า">ระบบสายส่งไฟฟ้าหลักการไฟฟ้าส่วนภูมิภาค/นครหลวง</option>
            <option value="แผงโซลาร์เซลล์">พลังงานแสงอาทิตย์ (โซลาร์เซลล์) ของบ้านตนเอง</option>
            <option value="เครื่องปั่นไฟ/แบตเตอรี่">เครื่องปั่นน้ำมันดีเซล / แบตเตอรี่พกพา</option>
            <option value="ไม่มีไฟฟ้า">ไม่มีพลังงานไฟฟ้าใช้งานภายในที่พักอาศัย</option>
          </select>
        </div>
      </div>

      <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
        <span style="font-weight: 600; display: block; margin-bottom: 0.5rem; color: var(--primary-dark);">
          3.7 ยานพาหนะที่คนในครัวเรือนครอบครอง (เลือกทุกอย่างที่ครอบครองและงานดี)
        </span>
        <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 1rem;">
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="vehiclesOwned.car"> รถยนต์ส่วนบุคคล (รถเก๋ง)
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="vehiclesOwned.pickup"> รถกระบะ / รถบรรทุกเล็ก
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="vehiclesOwned.tractor"> รถไถ / รถแทรกเตอร์เกษตรกรรม
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="vehiclesOwned.motorcycle"> รถจักรยานยนต์ (มอเตอร์ไซค์)
          </label>
        </div>
      </div>

      <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
        <span style="font-weight: 600; display: block; margin-bottom: 0.5rem; color: var(--primary-dark);">
          3.8 เครื่องใช้ไฟฟ้าที่สะสมในครัวเรือน (เลือกรายการที่ใช้งานได้ปกติ)
        </span>
        <div style="display: flex; flex-wrap: wrap; gap: 1.5rem;">
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="appliancesOwned.computer"> คอมพิวเตอร์ (ตั้งโต๊ะ/โน้ตบุ๊ก)
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="appliancesOwned.airCon"> เครื่องปรับอากาศ (แอร์)
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="appliancesOwned.flatTv"> โทรทัศน์จอแบน
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="appliancesOwned.washingMachine"> เครื่องซักผ้า
          </label>
          <label style="display: inline-flex; align-items: center; gap: 0.3rem;">
            <input type="checkbox" data-path="appliancesOwned.refrigerator"> ตู้เย็น
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🛵 ส่วนที่ 5 การเดินทางมาโรงเรียนของนักเรียน</div>
      <div class="form-grid">
        <div class="form-group">
          <label>วิธีการเดินทางเป็นหลัก</label>
          <select class="form-control" data-path="travel.travelMethod">
            <option value="">เลือกวิธีเดินทาง</option>
            <option value="เดินเท้า">เดินเท้า</option>
            <option value="จักรยาน">จักรยานสองล้อ</option>
            <option value="รถจักรยานยนต์ส่วนตัว">จักรยานยนต์ส่วนตัว (นักเรียนขับ/ผู้ปกครองซ้อน)</option>
            <option value="รถยนต์ส่วนตัว">รถยนต์ส่วนบุคคล / รถกระบะครอบครัว</option>
            <option value="รถรับส่งนักเรียน">รถโรงเรียน / รถรับส่งนักเรียนเหมาจ่าย</option>
            <option value="รถประจำทาง">รถโดยสารสาธารณะ / รถเมล์ / รถสองแถว</option>
          </select>
        </div>
        <div class="form-group">
          <label>ระยะทางจากบ้านไปโรงเรียน (กม.)</label>
          <input type="number" class="form-control" data-path="travel.distanceKm" step="0.1" value="0">
        </div>
        <div class="form-group">
          <label>ระยะเวลาเดินทางเฉลี่ย (ชั่วโมง)</label>
          <input type="number" class="form-control" data-path="travel.travelTimeHours" step="0.1" value="0">
        </div>
      </div>

      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group">
          <label>ค่าใช้จ่ายในการเดินทางเฉลี่ย (บาท/เดือน)</label>
          <input type="number" class="form-control" data-path="travel.travelExpenseMonthly" value="0">
        </div>
        <div class="form-group">
          <label>เงินค่าขนมประจำวันที่นักเรียนได้รับ (บาท/วัน)</label>
          <input type="number" class="form-control" data-path="travel.studentDailyAllowance" value="0">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📍 ส่วนที่ 6 ที่อยู่ทางกายภาพของที่พักอาศัยนักเรียน</div>
      <div class="form-grid">
        <div class="form-group">
          <label>บ้านเลขที่</label>
          <input type="text" class="form-control" data-path="address.addressNo">
        </div>
        <div class="form-group">
          <label>หมู่ที่</label>
          <input type="text" class="form-control" data-path="address.moo">
        </div>
        <div class="form-group">
          <label>ตรอก/ซอย</label>
          <input type="text" class="form-control" data-path="address.alley">
        </div>
        <div class="form-group">
          <label>ถนน</label>
          <input type="text" class="form-control" data-path="address.road">
        </div>
      </div>

      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group">
          <label>ตำบล / แขวง</label>
          <input type="text" class="form-control" data-path="address.subdistrict">
        </div>
        <div class="form-group">
          <label>อำเภอ / เขต</label>
          <input type="text" class="form-control" data-path="address.district">
        </div>
        <div class="form-group">
          <label>จังหวัด</label>
          <input type="text" class="form-control" data-path="address.province">
        </div>
        <div class="form-group">
          <label>รหัสไปรษณีย์</label>
          <input type="text" class="form-control" data-path="address.postalCode">
        </div>
      </div>
    </div>

    <!-- Section 7: Photographic captures -->
    <div class="card">
      <div class="card-title">📸 ส่วนที่ 7 ภาพถ่ายที่อยู่อาศัยในการตรวจเยี่ยมบ้าน</div>
      <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div id="camera-exterior-container"></div>
        <div id="camera-interior-container"></div>
      </div>
    </div>
  `;
}

function renderPage5(formState, container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-title">📝 ส่วนที่ 8 การรับรองและตรวจสอบข้อมูลความถูกต้อง</div>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <label style="display: inline-flex; align-items: flex-start; gap: 0.5rem; line-height: 1.6; font-size: 0.95rem;">
          <input type="checkbox" data-path="signatures.verificationStatus" style="margin-top: 0.3rem;">
          ข้าพเจ้า (ครูผู้เยี่ยมบ้าน) ขอรับรองว่าได้ลงพื้นที่ตรวจเยี่ยมบ้านนักเรียนจริง และขอรับรองว่าข้อมูลรายละเอียดสถานภาพครัวเรือน
          ตลอดจนรายได้ สมาชิก สภาพทางกายภาพ และยานพาหนะของครอบครัวนักเรียนที่ระบุในแบบขอรับเงินอุดหนุน กสศ. 01 ชุดนี้ มีความถูกต้องตรงกับความเป็นจริงทุกประการ
        </label>
        
        <label style="display: inline-flex; align-items: flex-start; gap: 0.5rem; line-height: 1.6; font-size: 0.95rem;">
          <input type="checkbox" data-path="signatures.directorApproved" style="margin-top: 0.3rem;">
          ข้าพเจ้า (ผู้อำนวยการโรงเรียน) ได้ตรวจสอบและขอรับรองเอกสารความช่วยเหลือในฐานะผู้แทนหน่วยรับรองสถานศึกษาของรัฐ
        </label>
      </div>
    </div>

    <!-- Canvas Signatures Section -->
    <div class="card">
      <div class="card-title">🖊️ ส่วนที่ 9 ลายมือเขียนอิเล็กทรอนิกส์ (Apple Pencil / Touch)</div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div id="sig-student-container"></div>
        <div id="sig-guardian-container"></div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
        <div id="sig-teacher-container"></div>
        <div id="sig-officer-container"></div>
      </div>

      <div style="max-width: 500px; margin: 1.5rem auto 0 auto;">
        <div id="sig-director-container"></div>
      </div>
    </div>
  `;
}

/**
 * Secondary initializations hook for sub-components (Camera uploads & pointer drawing canvas).
 */
export function afterRenderFormPage(step, formState, container) {
  if (step === 4) {
    const exterior = new CameraCapture("camera-exterior-container", formState, "photos.photoExteriorBase64", "รูปที่ 1 ภาพถ่ายสภาพนอกที่พักอาศัย (เห็นหน้าบ้านเต็มแผ่น)");
    exterior.init();
    
    const interior = new CameraCapture("camera-interior-container", formState, "photos.photoInteriorBase64", "รูปที่ 2 ภาพถ่ายภายในที่พักอาศัย (เห็นห้องนอน/ห้องน้ำ/สภาพเสื่อมโทรม)");
    interior.init();
  }

  if (step === 5) {
    const sig1 = new SignaturePad("sig-student-container", formState, "signatures.studentSignatureBase64", "signatures.studentSignedDate", "ลายมือชื่อ นักเรียน");
    sig1.init();

    const sig2 = new SignaturePad("sig-guardian-container", formState, "signatures.guardianSignatureBase64", "signatures.guardianSignedDate", "ลายมือชื่อ ผู้ปกครอง");
    sig2.init();

    const sig3 = new SignaturePad("sig-teacher-container", formState, "signatures.teacherSignatureBase64", "signatures.teacherSignedDate", "ลายมือชื่อ ครูผู้ลงพื้นที่เยี่ยมบ้าน");
    sig3.init();

    const sig4 = new SignaturePad("sig-officer-container", formState, "signatures.officerSignatureBase64", "signatures.officerSignedDate", "ลายมือชื่อ เจ้าหน้าที่รัฐ/กำนัน/ผู้ใหญ่บ้านรับรองสถานะ");
    sig4.init();

    const sig5 = new SignaturePad("sig-director-container", formState, "signatures.directorSignatureBase64", "signatures.directorSignedDate", "ลายมือชื่อ ผู้อำนวยการสถานศึกษา/ผู้บริหาร");
    sig5.init();
  }
}
