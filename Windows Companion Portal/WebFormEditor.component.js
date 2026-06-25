// MARK: - WebFormEditor.component.js (Windows Companion Portal Component)

class WebFormEditor {
    /**
     * เปิดแสดง Modal ของตัวแก้ไขข้อมูลฟอร์ม กสศ. 01
     * @param {string} studentID - รหัสประจำตัวประชาชนของนักเรียน
     * @param {string} fileID - รหัสไฟล์ใน Google Drive
     * @param {object} jsonData - ข้อมูล JSON ที่โหลดมาจาก Drive
     * @param {function} onSaveSuccess - Callback เมื่อทำการบันทึกข้อมูลเรียบร้อย
     */
    static show(studentID, fileID, jsonData, onSaveSuccess) {
        // ลบอันเดิมทิ้งถ้ามีค้างอยู่
        const existingModal = document.getElementById('web-form-editor-modal');
        if (existingModal) existingModal.remove();

        // โคลนอ็อบเจ็กต์ข้อมูลต้นฉบับ เพื่อป้องกันการแก้ไขในหน่วยความจำโดยตรงก่อนเซฟ
        const data = JSON.parse(JSON.stringify(jsonData));
        
        // รับประกันโครงสร้าง eefFormModel
        if (!data.eefFormModel) {
            data.eefFormModel = { totalMembersCount: 1, householdMembers: [] };
        }
        if (!data.eefFormModel.householdMembers) {
            data.eefFormModel.householdMembers = [];
        }
        if (!data.householdAppliances) {
            data.householdAppliances = [];
        }
        
        // เติมจำนวนสมาชิกในตารางรายได้ครัวเรือนให้ครบ 10 แถวเพื่อจำลองการคัดกรองตามแบบฟอร์ม
        while (data.eefFormModel.householdMembers.length < 10) {
            data.eefFormModel.householdMembers.push({
                name: '', relation: '', nationalID: '', highestEducation: '', age: 0,
                hasDisability: false, hasChronicDisease: false,
                salary: 0, agricultureIncome: 0, businessIncome: 0, stateWelfare: 0, otherIncome: 0
            });
        }

        // สร้าง HTML Wrapper ของ Modal
        const modal = document.createElement('div');
        modal.id = 'web-form-editor-modal';
        modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
        
        // โครงสร้างหน้าต่างหลักของตัวแก้ไขฟอร์ม
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <!-- ส่วนหัว Modal -->
                <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 flex items-center">
                            <i class="fa-solid fa-user-pen text-brand-600 mr-2.5"></i>
                            ตรวจสอบและแก้ไขแบบเสนอขอรับเงินอุดหนุน กสศ. 01
                        </h3>
                        <p class="text-xs text-slate-500 mt-0.5">รหัสนักเรียน: <span class="font-mono font-semibold">${studentID}</span> | ชื่อ-สกุล: ${data.studentName || ''} ${data.studentLastName || ''}</p>
                    </div>
                    <button id="editor-close-btn-header" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <!-- ส่วนเลือกแท็บหน้าเว็บ -->
                <div class="flex border-b border-slate-200 bg-slate-50/50 px-6 overflow-x-auto whitespace-nowrap">
                    <button class="tab-btn active px-4 py-3 border-b-2 border-brand-600 text-sm font-bold text-brand-700" data-tab="tab-student">
                        <i class="fa-solid fa-user-graduate mr-2"></i>1. ข้อมูลนักเรียน/ผู้ปกครอง
                    </button>
                    <button class="tab-btn px-4 py-3 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800" data-tab="tab-household">
                        <i class="fa-solid fa-users-viewfinder mr-2"></i>2. รายได้ครัวเรือน
                    </button>
                    <button class="tab-btn px-4 py-3 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800" data-tab="tab-housing">
                        <i class="fa-solid fa-house-chimney-window mr-2"></i>3. สภาพความเป็นอยู่
                    </button>
                    <button class="tab-btn px-4 py-3 border-b-2 border-transparent text-sm font-medium text-slate-600 hover:text-slate-800" data-tab="tab-travel">
                        <i class="fa-solid fa-route mr-2"></i>4. สถาบัน/การเดินทาง/ภาพถ่าย
                    </button>
                </div>

                <!-- ส่วนเนื้อหาฟอร์ม (แต่ละแท็บจะเปิด/ปิดตามการคลิก) -->
                <form id="editor-form" class="p-6 overflow-y-auto flex-grow space-y-6 text-sm">
                    
                    <!-- TAB 1: ข้อมูลนักเรียนและผู้ปกครอง -->
                    <div id="tab-student" class="tab-content space-y-6">
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase">ชื่อนักเรียน</label>
                                <input type="text" name="studentName" value="${data.studentName || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase">นามสกุล</label>
                                <input type="text" name="studentLastName" value="${data.studentLastName || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase">รหัสประจำตัวประชาชน / ID G (อ่านอย่างเดียว)</label>
                                <input type="text" value="${data.studentID || ''}" disabled class="mt-1 block w-full px-3 py-2 border border-slate-200 bg-slate-100/70 rounded-lg text-sm text-slate-500 font-mono font-semibold">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- สถานภาพครอบครัว -->
                            <div class="border border-slate-100 p-4 rounded-xl bg-white shadow-sm space-y-3">
                                <h4 class="font-bold text-slate-800 border-b pb-2 mb-2"><i class="fa-solid fa-heart-broken text-rose-500 mr-2"></i>สถานภาพครอบครัว</h4>
                                <select name="familyStatus" class="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500">
                                    <option value="พ่อแม่อยู่ด้วยกัน" ${data.familyStatus === "พ่อแม่อยู่ด้วยกัน" ? 'selected' : ''}>พ่อแม่อยู่ด้วยกัน</option>
                                    <option value="พ่อแม่แยกกันอยู่" ${data.familyStatus === "พ่อแม่แยกกันอยู่" ? 'selected' : ''}>พ่อแม่แยกกันอยู่</option>
                                    <option value="พ่อแม่หย่าร้าง" ${data.familyStatus === "พ่อแม่หย่าร้าง" ? 'selected' : ''}>พ่อแม่หย่าร้าง</option>
                                    <option value="พ่อเสียชีวิต/สาบสูญ" ${data.familyStatus === "พ่อเสียชีวิต/สาบสูญ" ? 'selected' : ''}>พ่อเสียชีวิต/สาบสูญ</option>
                                    <option value="แม่เสียชีวิต/สาบสูญ" ${data.familyStatus === "แม่เสียชีวิต/สาบสูญ" ? 'selected' : ''}>แม่เสียชีวิต/สาบสูญ</option>
                                    <option value="เสียชีวิตทั้งคู่/สาบสูญ" ${data.familyStatus === "เสียชีวิตทั้งคู่/สาบสูญ" ? 'selected' : ''}>เสียชีวิตทั้งคู่/สาบสูญ</option>
                                    <option value="พ่อ/แม่ทอดทิ้ง" ${data.familyStatus === "พ่อ/แม่ทอดทิ้ง" ? 'selected' : ''}>พ่อ/แม่ทอดทิ้ง</option>
                                </select>
                            </div>

                            <!-- นักเรียนอาศัยอยู่กับ -->
                            <div class="border border-slate-100 p-4 rounded-xl bg-white shadow-sm space-y-3">
                                <h4 class="font-bold text-slate-800 border-b pb-2 mb-2"><i class="fa-solid fa-house-user text-indigo-500 mr-2"></i>นักเรียนอาศัยอยู่กับ</h4>
                                <select name="livingWith" class="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500">
                                    <option value="พ่อ/แม่" ${data.livingWith === "พ่อ/แม่" ? 'selected' : ''}>พ่อ/แม่</option>
                                    <option value="ญาติ" ${data.livingWith === "ญาติ" ? 'selected' : ''}>ญาติ</option>
                                    <option value="อยู่ลำพัง" ${data.livingWith === "อยู่ลำพัง" ? 'selected' : ''}>อยู่ลำพัง</option>
                                    <option value="ผู้อุปการะ/นายจ้าง" ${data.livingWith === "ผู้อุปการะ/นายจ้าง" ? 'selected' : ''}>ผู้อุปการะ/นายจ้าง</option>
                                    <option value="ครัวเรือนสถาบัน" ${data.livingWith === "ครัวเรือนสถาบัน" ? 'selected' : ''}>ครัวเรือนสถาบัน</option>
                                </select>
                            </div>
                        </div>

                        <!-- ข้อมูลผู้ปกครอง -->
                        <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm space-y-4">
                            <h4 class="font-bold text-slate-800 border-b pb-2"><i class="fa-solid fa-user-shield text-emerald-600 mr-2"></i>ข้อมูลผู้ปกครอง</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">ชื่อผู้ปกครอง</label>
                                    <input type="text" name="guardianFirstName" value="${data.guardianFirstName || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">นามสกุลผู้ปกครอง</label>
                                    <input type="text" name="guardianLastName" value="${data.guardianLastName || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">ความสัมพันธ์กับนักเรียน</label>
                                    <input type="text" name="guardianRelationship" value="${data.guardianRelationship || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">เลขประจำตัวประชาชนผู้ปกครอง</label>
                                    <input type="text" name="guardianID" value="${data.guardianID || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">เบอร์โทรศัพท์ติดต่อ</label>
                                    <input type="text" name="guardianPhone" value="${data.guardianPhone || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">อาชีพผู้ปกครอง</label>
                                    <input type="text" name="guardianOccupation" value="${data.guardianOccupation || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                </div>
                            </div>
                            
                            <div class="flex flex-col sm:flex-row gap-4 pt-2 border-t text-xs">
                                <label class="inline-flex items-center space-x-2">
                                    <input type="checkbox" name="guardianNoID" ${data.guardianNoID ? 'checked' : ''} class="rounded text-brand-600 focus:ring-brand-500">
                                    <span class="text-slate-600">ผู้ปกครองไม่มีเลขประจำตัวประชาชน</span>
                                </label>
                                <label class="inline-flex items-center space-x-2">
                                    <input type="checkbox" name="guardianHasStateWelfare" ${data.guardianHasStateWelfare ? 'checked' : ''} class="rounded text-brand-600 focus:ring-brand-500">
                                    <span class="text-slate-600">ผู้ปกครองได้รับสิทธิสวัสดิการแห่งรัฐ (ทะเบียนคนจน)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: ตารางรายได้สมาชิกครัวเรือน -->
                    <div id="tab-household" class="tab-content hidden space-y-6">
                        <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between text-xs text-blue-800">
                            <span class="font-medium"><i class="fa-solid fa-circle-info mr-1.5 text-blue-500"></i>รายได้รวมของสมาชิกทุกคนจะคำนวณและอัปเดตแบบเรียลไทม์เมื่อมีการแก้ไขตัวเลขการเงิน</span>
                            <div class="flex items-center space-x-2">
                                <span class="font-bold">จำนวนสมาชิกครัวเรือนทั้งหมด (รวมนักเรียน):</span>
                                <input type="number" id="input-total-members" name="totalMembersCount" value="${data.eefFormModel.totalMembersCount || 1}" min="1" max="10" class="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-slate-800">
                            </div>
                        </div>

                        <!-- ตารางรายได้ -->
                        <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                            <table class="min-w-full divide-y divide-slate-200 text-xs">
                                <thead class="bg-slate-50 font-bold text-slate-600 text-left">
                                    <tr>
                                        <th class="px-3 py-3 w-10">คนที่</th>
                                        <th class="px-3 py-3 w-40">ชื่อ - นามสกุล</th>
                                        <th class="px-3 py-3 w-24">ความสัมพันธ์</th>
                                        <th class="px-3 py-3 w-28">เลขประจำตัว ปชช.</th>
                                        <th class="px-3 py-3 w-12">อายุ</th>
                                        <th class="px-3 py-3 text-center w-24">ค่าจ้าง/เงินเดือน</th>
                                        <th class="px-3 py-3 text-center w-24">อาชีพเกษตร</th>
                                        <th class="px-3 py-3 text-center w-24">ธุรกิจส่วนตัว</th>
                                        <th class="px-3 py-3 text-center w-24">รัฐสวัสดิการ</th>
                                        <th class="px-3 py-3 text-center w-24">รายได้อื่นๆ</th>
                                        <th class="px-3 py-3 text-right font-bold text-brand-700 w-28">รายได้รวม/เดือน</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200 bg-white" id="household-members-rows">
                                    ${data.eefFormModel.householdMembers.map((member, idx) => `
                                        <tr class="hover:bg-slate-50/40 household-row" data-index="${idx}">
                                            <td class="px-3 py-2.5 text-slate-400 font-bold text-center">${idx + 1}</td>
                                            <td class="px-2 py-1">
                                                <input type="text" class="w-full px-2 py-1.5 border rounded text-xs member-name" value="${member.name || ''}" placeholder="ระบุชื่อ-สกุล">
                                            </td>
                                            <td class="px-2 py-1">
                                                <input type="text" class="w-full px-2 py-1.5 border rounded text-xs member-relation" value="${member.relation || ''}" placeholder="เช่น แม่, พ่อ">
                                            </td>
                                            <td class="px-2 py-1">
                                                <input type="text" class="w-full px-2 py-1.5 border rounded text-xs member-id font-mono" value="${member.nationalID || ''}" placeholder="เลขประชาชน">
                                            </td>
                                            <td class="px-2 py-1">
                                                <input type="number" class="w-full px-2 py-1.5 border rounded text-xs text-center member-age" value="${member.age || 0}" min="0">
                                            </td>
                                            <td class="px-2 py-1">
                                                <input type="number" class="w-full px-2 py-1.5 border rounded text-xs text-right income-input member-salary" value="${member.salary || 0}" min="0">
                                            </td>
                                            <td class="px-2 py-1">
                                                <input type="number" class="w-full px-2 py-1.5 border rounded text-xs text-right income-input member-agri" value="${member.agricultureIncome || 0}" min="0">
                                            </td>
                                            <td class="px-2 py-1">
                                                <input type="number" class="w-full px-2 py-1.5 border rounded text-xs text-right income-input member-business" value="${member.businessIncome || 0}" min="0">
                                            </td>
                                            <td class="px-2 py-1">
                                                <input type="number" class="w-full px-2 py-1.5 border rounded text-xs text-right income-input member-welfare" value="${member.stateWelfare || 0}" min="0">
                                            </td>
                                            <td class="px-2 py-1">
                                                <input type="number" class="w-full px-2 py-1.5 border rounded text-xs text-right income-input member-other" value="${member.otherIncome || 0}" min="0">
                                            </td>
                                            <td class="px-3 py-2.5 text-right font-bold text-slate-800 font-mono member-total-label">0</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- คำนวณสรุปการเงิน -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <span class="font-bold text-slate-600">รายได้ครัวเรือนรวมทั้งหมดต่อเดือน:</span>
                                <span class="text-xl font-extrabold text-slate-900 font-mono" id="sum-household-income">0 บาท</span>
                            </div>
                            <div class="p-4 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between">
                                <span class="font-bold text-brand-700">รายได้เฉลี่ยต่อสมาชิกครัวเรือน/คน/เดือน:</span>
                                <span class="text-xl font-extrabold text-brand-600 font-mono" id="avg-household-income">0 บาท</span>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 3: ข้อมูลสภาพสิ่งแวดล้อมสิ่งปลูกสร้าง -->
                    <div id="tab-housing" class="tab-content hidden space-y-6">
                        <!-- 3.1 ครัวเรือนมีภาระพึ่งพิง -->
                        <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm space-y-4">
                            <h4 class="font-bold text-slate-800 border-b pb-2"><i class="fa-solid fa-users-line text-amber-500 mr-2"></i>3.1 ครัวเรือนมีภาระพึ่งพิง</h4>
                            <label class="inline-flex items-center space-x-2">
                                <input type="checkbox" name="hasDependents" ${data.hasDependents ? 'checked' : ''} class="rounded text-brand-600">
                                <span class="text-slate-700 font-medium">มีภาระพึ่งพิง (ติ๊กถูกหากตรงกับหัวข้อด้านล่างนี้)</span>
                            </label>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-6 text-xs">
                                <label class="inline-flex items-center space-x-2">
                                    <input type="checkbox" name="dependentDisability" ${data.dependentDisability ? 'checked' : ''} class="rounded">
                                    <span>มีความพิการทางร่างกาย/สติปัญญา</span>
                                </label>
                                <label class="inline-flex items-center space-x-2">
                                    <input type="checkbox" name="dependentChronicDisease" ${data.dependentChronicDisease ? 'checked' : ''} class="rounded">
                                    <span>มีโรคเรื้อรัง (ยกเว้นเบาหวาน/ความดัน)</span>
                                </label>
                                <label class="inline-flex items-center space-x-2">
                                    <input type="checkbox" name="dependentElderly" ${data.dependentElderly ? 'checked' : ''} class="rounded">
                                    <span>มีผู้สูงอายุตั้งแต่ 60 ปีขึ้นไป</span>
                                </label>
                                <label class="inline-flex items-center space-x-2">
                                    <input type="checkbox" name="dependentSingleParent" ${data.dependentSingleParent ? 'checked' : ''} class="rounded">
                                    <span>เป็นพ่อ/แม่เลี้ยงเดี่ยว</span>
                                </label>
                                <label class="inline-flex items-center space-x-2">
                                    <input type="checkbox" name="dependentUnemployed" ${data.dependentUnemployed ? 'checked' : ''} class="rounded">
                                    <span>มีวัยแรงงานว่างงาน (อายุ 15-65 ปี)</span>
                                </label>
                            </div>
                        </div>

                        <!-- 3.2 สถานะที่อยู่อาศัย -->
                        <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-bold text-slate-800 border-b pb-2 mb-3"><i class="fa-solid fa-house-laptop text-brand-600 mr-2"></i>3.2 สถานภาพที่อยู่อาศัย</h4>
                                <select name="housingType" class="block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    <option value="อยู่บ้านตนเอง/เจ้าของบ้าน" ${data.housingType === "อยู่บ้านตนเอง/เจ้าของบ้าน" ? 'selected' : ''}>อยู่บ้านตนเอง/เจ้าของบ้าน</option>
                                    <option value="อยู่บ้านเช่า (เสียค่าเช่า)" ${data.housingType.includes("บ้านเช่า") ? 'selected' : ''}>อยู่บ้านเช่า (เสียค่าเช่า)</option>
                                    <option value="อยู่กับผู้อื่น/อยู่ฟรี" ${data.housingType === "อยู่กับผู้อื่น/อยู่ฟรี" ? 'selected' : ''}>อยู่กับผู้อื่น/อยู่ฟรี</option>
                                    <option value="หอพัก" ${data.housingType === "หอพัก" ? 'selected' : ''}>หอพัก</option>
                                </select>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 border-b pb-2 mb-3"><i class="fa-solid fa-hand-holding-dollar text-emerald-600 mr-2"></i>ระบุค่าเช่าต่อเดือน (หากเช่าบ้าน)</h4>
                                <input type="number" name="rentCost" value="${data.rentCost || 0}" min="0" class="block w-full px-3 py-2 border border-slate-300 rounded-lg font-mono">
                            </div>
                        </div>

                        <!-- 3.3 วัสดุหลักของบ้าน -->
                        <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm space-y-4">
                            <h4 class="font-bold text-slate-800 border-b pb-2"><i class="fa-solid fa-trowel-bricks text-slate-600 mr-2"></i>3.3 โครงสร้างวัสดุหลักของที่อยู่อาศัย</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">วัสดุใช้ทำพื้นบ้าน</label>
                                    <select name="floorMaterial" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                        <option value="กระเบื้อง/เซรามิค" ${data.floorMaterial === "กระเบื้อง/เซรามิค" ? 'selected' : ''}>กระเบื้อง/เซรามิค</option>
                                        <option value="ปาเก้/ไม้ขัดเงา" ${data.floorMaterial === "ปาเก้/ไม้ขัดเงา" ? 'selected' : ''}>ปาเก้/ไม้ขัดเงา</option>
                                        <option value="ซีเมนต์เปลือย" ${data.floorMaterial === "ซีเมนต์เปลือย" ? 'selected' : ''}>ซีเมนต์เปลือย</option>
                                        <option value="ไม้กระดาน" ${data.floorMaterial === "ไม้กระดาน" ? 'selected' : ''}>ไม้กระดาน</option>
                                        <option value="ไวนิล/กระเบื้องยาง/เสื่อน้ำมัน" ${data.floorMaterial === "ไวนิล/กระเบื้องยาง/เสื่อน้ำมัน" ? 'selected' : ''}>ไวนิล/เสื่อน้ำมัน</option>
                                        <option value="ไม้ไผ่" ${data.floorMaterial === "ไม้ไผ่" ? 'selected' : ''}>ไม้ไผ่</option>
                                        <option value="ดิน/ทราย" ${data.floorMaterial === "ดิน/ทราย" ? 'selected' : ''}>ดิน/ทราย</option>
                                        <option value="อื่นๆ" ${data.floorMaterial === "อื่นๆ" ? 'selected' : ''}>อื่นๆ</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">วัสดุใช้ทำฝาบ้าน</label>
                                    <select name="wallMaterial" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                        <option value="ฉาบซีเมนต์" ${data.wallMaterial === "ฉาบซีเมนต์" ? 'selected' : ''}>ฉาบซีเมนต์</option>
                                        <option value="อิฐ/ก้อนปูน/อิฐบล็อก" ${data.wallMaterial === "อิฐ/ก้อนปูน/อิฐบล็อก" ? 'selected' : ''}>อิฐ/อิฐบล็อก</option>
                                        <option value="สังกะสี" ${data.wallMaterial === "สังกะสี" ? 'selected' : ''}>สังกะสี</option>
                                        <option value="ไม้กระดาน" ${data.wallMaterial === "ไม้กระดาน" ? 'selected' : ''}>ไม้กระดาน</option>
                                        <option value="ไม้อัด" ${data.wallMaterial === "ไม้อัด" ? 'selected' : ''}>ไม้อัด</option>
                                        <option value="สมาร์ทบอร์ด/ไฟเบอร์" ${data.wallMaterial === "สมาร์ทบอร์ด/ไฟเบอร์" ? 'selected' : ''}>สมาร์ทบอร์ด/ไฟเบอร์</option>
                                        <option value="ไม้ไผ่/ท่อนไม้/เศษไม้" ${data.wallMaterial === "ไม้ไผ่/ท่อนไม้/เศษไม้" ? 'selected' : ''}>ไม้ไผ่/ท่อนไม้</option>
                                        <option value="อื่นๆ" ${data.wallMaterial === "อื่นๆ" ? 'selected' : ''}>อื่นๆ</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">วัสดุใช้ทำหลังคา</label>
                                    <select name="roofMaterial" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                        <option value="โลหะ (สังกะสี/เหล็ก)" ${data.roofMaterial === "โลหะ (สังกะสี/เหล็ก)" ? 'selected' : ''}>โลหะ (สังกะสี/เหล็ก)</option>
                                        <option value="กระเบื้อง/เซรามิค" ${data.roofMaterial === "กระเบื้อง/เซรามิค" ? 'selected' : ''}>กระเบื้อง/เซรามิค</option>
                                        <option value="ไม้กระดาน" ${data.roofMaterial === "ไม้กระดาน" ? 'selected' : ''}>ไม้กระดาน</option>
                                        <option value="ใบไม้/วัสดุธรรมชาติ" ${data.roofMaterial === "ใบไม้/วัสดุธรรมชาติ" ? 'selected' : ''}>ใบไม้/วัสดุธรรมชาติ</option>
                                        <option value="ไวนิล/กระดาษ/แผ่นพลาสติก" ${data.roofMaterial === "ไวนิล/กระดาษ/แผ่นพลาสติก" ? 'selected' : ''}>ไวนิล/พลาสติก</option>
                                        <option value="อื่นๆ" ${data.roofMaterial === "อื่นๆ" ? 'selected' : ''}>อื่นๆ</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="pt-2">
                                <label class="inline-flex items-center space-x-2">
                                    <input type="checkbox" name="hasToilet" ${data.hasToilet ? 'checked' : ''} class="rounded text-brand-600">
                                    <span class="text-slate-600 font-medium">มีห้องส้วมในที่อยู่อาศัย / บริเวณบ้าน</span>
                                </label>
                            </div>
                        </div>

                        <!-- แหล่งข้อมูลพื้นฐาน สาธารณูปโภค -->
                        <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm space-y-4">
                            <h4 class="font-bold text-slate-800 border-b pb-2"><i class="fa-solid fa-sink text-sky-500 mr-2"></i>3.4 - 3.8 แหล่งอำนวยความสะดวก</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">ที่ดินทำกินทางการเกษตร (รวมเช่า)</label>
                                    <select name="agricultureLandSize" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                        <option value="ไม่ทำเกษตร" ${data.agricultureLandSize === "ไม่ทำเกษตร" || !data.agricultureLandSize ? 'selected' : ''}>ไม่ทำเกษตร</option>
                                        <option value="มีที่ดินน้อยกว่า 1 ไร่" ${data.agricultureLandSize === "มีที่ดินน้อยกว่า 1 ไร่" ? 'selected' : ''}>มีที่ดินน้อยกว่า 1 ไร่</option>
                                        <option value="มีที่ดิน 1 ถึง 5 ไร่" ${data.agricultureLandSize === "มีที่ดิน 1 ถึง 5 ไร่" ? 'selected' : ''}>มีที่ดิน 1 ถึง 5 ไร่</option>
                                        <option value="มีที่ดินมากกว่า 5 ไร่" ${data.agricultureLandSize === "มีที่ดินมากกว่า 5 ไร่" ? 'selected' : ''}>มีที่ดินมากกว่า 5 ไร่</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">แหล่งไฟฟ้าหลัก</label>
                                    <select name="electricitySource" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                        <option value="ไม่มีไฟฟ้า" ${data.electricitySource === "ไม่มีไฟฟ้า" ? 'selected' : ''}>ไม่มีไฟฟ้า</option>
                                        <option value="เครื่องปั่นไฟ/โซลาร์เซลล์" ${data.electricitySource === "เครื่องปั่นไฟ/โซลาร์เซลล์" ? 'selected' : ''}>เครื่องปั่นไฟ/โซลาร์เซลล์</option>
                                        <option value="ไฟต่อพ่วง/แบตเตอรี่" ${data.electricitySource === "ไฟต่อพ่วง/แบตเตอรี่" ? 'selected' : ''}>ไฟต่อพ่วง/แบตเตอรี่</option>
                                        <option value="ไฟบ้านหรือมิเตอร์" ${data.electricitySource === "ไฟบ้านหรือมิเตอร์" ? 'selected' : ''}>ไฟบ้านหรือมิเตอร์</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">แหล่งน้ำดื่มหลัก</label>
                                    <select name="drinkingWaterSource" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                        <option value="น้ำดื่มบรรจุขวด/ตู้หยอดน้ำ" ${data.drinkingWaterSource === "น้ำดื่มบรรจุขวด/ตู้หยอดน้ำ" ? 'selected' : ''}>น้ำดื่มบรรจุขวด/ตู้หยอดน้ำ</option>
                                        <option value="น้ำประปา" ${data.drinkingWaterSource === "น้ำประปา" ? 'selected' : ''}>น้ำประปา</option>
                                        <option value="น้ำบ่อ/น้ำบาดาล" ${data.drinkingWaterSource === "น้ำบ่อ/น้ำบาดาล" ? 'selected' : ''}>น้ำบ่อ/น้ำบาดาล</option>
                                        <option value="น้ำฝน/น้ำประปาภูเขา/ลำธาร" ${data.drinkingWaterSource === "น้ำฝน/น้ำประปาภูเขา/ลำธาร" ? 'selected' : ''}>น้ำฝน/น้ำประปาภูเขา/ลำธาร</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- 3.7 ยานพาหนะในครัวเรือน -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 mb-2">3.7 ยานพาหนะในครัวเรือน (รถยนต์/รถจักรยานยนต์/รถไถ/รถเกษตร)</label>
                                    <label class="inline-flex items-center space-x-2 mt-1">
                                        <input type="checkbox" name="hasVehicle" ${data.hasVehicle ? 'checked' : ''} class="rounded text-brand-600">
                                        <span class="text-slate-700 font-medium">มีรถยนต์ / รถจักรยานยนต์ / ยานพาหนะอื่น ๆ ในครอบครอง</span>
                                    </label>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500">ประเภทและอายุการใช้งาน (เช่น รถจักรยานยนต์ 3 ปี)</label>
                                    <input type="text" name="vehicleTypeAndAge" value="${data.vehicleTypeAndAge || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="ระบุประเภทและอายุยานพาหนะ">
                                </div>
                            </div>
                            
                            <!-- 3.8 ของใช้ในครัวเรือน -->
                            <div class="border-t pt-4">
                                <label class="block text-xs font-bold text-slate-500 mb-2">3.8 เครื่องใช้ไฟฟ้า/ของใช้อื่นๆ ในครัวเรือน (เลือกรายการที่มีและใช้งานได้)</label>
                                <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-1 text-xs">
                                    ${[
                                        { key: 'computer', label: 'คอมพิวเตอร์', val: 'คอมพิวเตอร์' },
                                        { key: 'aircon', label: 'เครื่องปรับอากาศ (แอร์)', val: 'แอร์' },
                                        { key: 'flatTv', label: 'ทีวีจอแบน', val: 'ทีวีจอแบน' },
                                        { key: 'washing', label: 'เครื่องซักผ้า', val: 'เครื่องซักผ้า' },
                                        { key: 'refrigerator', label: 'ตู้เย็น', val: 'ตู้เย็น' }
                                    ].map(item => {
                                        const isChecked = Array.isArray(data.householdAppliances) && data.householdAppliances.includes(item.val);
                                        return `
                                            <label class="inline-flex items-center space-x-2 p-2 border rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                                                <input type="checkbox" name="householdAppliances" value="${item.val}" ${isChecked ? 'checked' : ''} class="rounded text-brand-600">
                                                <span>${item.label}</span>
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 4: สถาบัน / การเดินทาง / ภาพถ่ายสิ่งแนบแบบจำลอง (Read-only) -->
                    <div id="tab-travel" class="tab-content hidden space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- ข้อ 5 การเดินทาง -->
                            <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm space-y-4">
                                <h4 class="font-bold text-slate-800 border-b pb-2"><i class="fa-solid fa-bus text-accent-600 mr-2"></i>5. การเดินทางไปโรงเรียน</h4>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">วิธีเดินทางหลัก</label>
                                        <input type="text" name="travelMethod" value="${data.travelMethod || ''}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">ระยะทาง (กิโลเมตร ไป-กลับ)</label>
                                        <input type="number" step="0.1" name="travelDistanceKM" value="${data.travelDistanceKM || 0}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">เวลาเดินทางเฉลี่ย (ชั่วโมง)</label>
                                        <input type="number" step="0.1" name="travelTimeHours" value="${data.travelTimeHours || 0}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">ค่าใช้จ่ายเดินทางรายเดือน (บาท)</label>
                                        <input type="number" name="travelExpensePerMonth" value="${data.travelExpensePerMonth || 0}" class="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg font-mono">
                                    </div>
                                </div>
                            </div>

                            <!-- ข้อ 6 ที่อยู่ทางภูมิศาสตร์นักเรียน -->
                            <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm space-y-4">
                                <h4 class="font-bold text-slate-800 border-b pb-2"><i class="fa-solid fa-map-location-dot text-brand-600 mr-2"></i>6. ที่อยู่ปัจจุบันของนักเรียน</h4>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 font-medium">บ้านเลขที่</label>
                                        <input type="text" name="addressNo" value="${data.addressNo || ''}" class="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">หมู่ที่</label>
                                        <input type="text" name="addressMoo" value="${data.addressMoo || ''}" class="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">ซอย</label>
                                        <input type="text" name="addressSoi" value="${data.addressSoi || ''}" class="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                                    </div>
                                    <div class="sm:col-span-3">
                                        <label class="block text-xs font-bold text-slate-500">ถนน</label>
                                        <input type="text" name="addressRoad" value="${data.addressRoad || ''}" class="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">ตำบล</label>
                                        <input type="text" name="addressSubDistrict" value="${data.addressSubDistrict || ''}" class="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">อำเภอ</label>
                                        <input type="text" name="addressDistrict" value="${data.addressDistrict || ''}" class="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500">จังหวัด</label>
                                        <input type="text" name="addressProvince" value="${data.addressProvince || ''}" class="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ข้อ 7 ภาพถ่ายสิ่งปลูกสร้าง (Read-only) -->
                        <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm space-y-4">
                            <h4 class="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                                <span><i class="fa-solid fa-images text-rose-500 mr-2"></i>7. ภาพถ่ายที่พักอาศัยนักเรียน (อ่านอย่างเดียว - ห้ามสับเปลี่ยนรูป)</span>
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><i class="fa-solid fa-lock mr-1"></i>Secure Layer</span>
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="flex flex-col items-center justify-center p-4 border rounded-xl bg-slate-50">
                                    <span class="text-xs font-bold text-slate-500 mb-2">รูปถ่ายภายนอกที่พักอาศัย (เห็นหลังคาและฝาผนัง)</span>
                                    ${data.houseExteriorPhoto ? 
                                        `<img src="data:image/jpeg;base64,${data.houseExteriorPhoto}" class="rounded-lg max-h-48 border shadow-sm object-cover">` : 
                                        `<div class="h-32 w-full flex items-center justify-center text-slate-400"><i class="fa-solid fa-image-slash mr-2"></i>ไม่มีรูปถ่ายในระบบ</div>`
                                    }
                                </div>
                                <div class="flex flex-col items-center justify-center p-4 border rounded-xl bg-slate-50">
                                    <span class="text-xs font-bold text-slate-500 mb-2">รูปถ่ายภายในที่พักอาศัย (เห็นพื้นและบริเวณในบ้าน)</span>
                                    ${data.houseInteriorPhoto ? 
                                        `<img src="data:image/jpeg;base64,${data.houseInteriorPhoto}" class="rounded-lg max-h-48 border shadow-sm object-cover">` : 
                                        `<div class="h-32 w-full flex items-center justify-center text-slate-400"><i class="fa-solid fa-image-slash mr-2"></i>ไม่มีรูปถ่ายในระบบ</div>`
                                    }
                                </div>
                            </div>
                        </div>

                        <!-- ลายเซ็นแนบประวัติ (Read-only) -->
                        <div class="border border-slate-200/60 p-5 rounded-xl bg-white shadow-sm space-y-4">
                            <h4 class="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                                <span><i class="fa-solid fa-signature text-violet-500 mr-2"></i>ลายเซ็นรับรอง (อ่านอย่างเดียว - ห้ามสับเปลี่ยนลายเส้น)</span>
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><i class="fa-solid fa-lock mr-1"></i>Secure Layer</span>
                            </h4>
                            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                                ${[
                                    { label: 'นักเรียน', data: data.signatureStudent },
                                    { label: 'ผู้ปกครอง', data: data.signatureGuardian },
                                    { label: 'เจ้าหน้าที่รัฐ', data: data.signatureOfficial },
                                    { label: 'ผอ.โรงเรียน', data: data.signatureDirector },
                                    { label: 'คุณครูเยี่ยมบ้าน', data: data.signatureTeacher }
                                ].map(sig => `
                                    <div class="flex flex-col items-center justify-between p-3 border rounded-xl bg-slate-50">
                                        <span class="text-xs font-bold text-slate-500 mb-2">${sig.label}</span>
                                        <div class="h-16 flex items-center justify-center">
                                            ${sig.data ? 
                                                `<img src="data:image/png;base64,${sig.data}" class="max-h-16 object-contain">` : 
                                                `<span class="text-[10px] text-slate-400">ยังไม่ได้ลงนาม</span>`
                                            }
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </form>

                <!-- ส่วนท้าย Modal / ปุ่มเซฟบันทึก -->
                <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <span class="text-xs text-slate-400"><i class="fa-solid fa-shield-halved mr-1"></i>ข้อมูลเข้ารหัสผ่าน OAuth 2.0 สหกรณ์ กสศ.</span>
                    <div class="flex items-center space-x-3">
                        <button id="editor-close-btn-footer" class="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200">
                            ยกเลิก
                        </button>
                        <button id="editor-save-btn" class="inline-flex items-center px-5 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none transition-all duration-200">
                            <i class="fa-solid fa-cloud-arrow-up mr-2"></i>บันทึกการแก้ไข
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // โจมตี Event Listener การจัดการแท็บ
        const tabs = modal.querySelectorAll('.tab-btn');
        const contents = modal.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active', 'border-brand-600', 'text-brand-700'));
                tabs.forEach(t => t.classList.add('border-transparent', 'text-slate-600'));
                
                tab.classList.add('active', 'border-brand-600', 'text-brand-700');
                tab.classList.remove('border-transparent', 'text-slate-600');

                const targetTab = tab.getAttribute('data-tab');
                contents.forEach(content => {
                    if (content.id === targetTab) {
                        content.classList.remove('hidden');
                    } else {
                        content.classList.add('hidden');
                    }
                });
            });
        });

        // Event Listeners สองปุ่มปิด Modal
        document.getElementById('editor-close-btn-header').addEventListener('click', () => modal.remove());
        document.getElementById('editor-close-btn-footer').addEventListener('click', () => modal.remove());

        // การคำนวณรายได้ครอบครัวแบบเรียลไทม์ (เมื่อพิมพ์ตัวเลข)
        const incomeInputs = modal.querySelectorAll('.income-input');
        incomeInputs.forEach(input => {
            input.addEventListener('input', () => calculateTotalIncome(modal));
        });
        document.getElementById('input-total-members').addEventListener('input', () => calculateTotalIncome(modal));

        // รันคำนวณรายได้เริ่มต้นทีแรก
        calculateTotalIncome(modal);

        // ดักจับเหตุการณ์คลิกเซฟ บันทึกการแก้ไขลง Google Drive
        document.getElementById('editor-save-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            
            const saveBtn = e.currentTarget;
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i>กำลังบันทึก...`;

            try {
                // รวบรวมข้อมูลทั้งหมดที่ถูกแก้ไขใน DOM ยัดกลับลง JSON Payload ดั้งเดิม
                const formElement = document.getElementById('editor-form');
                const formDataObj = new FormData(formElement);
                
                // อัปเดตข้อมูลทั่วไปข้อเสนอทุน
                data.studentName = formDataObj.get('studentName');
                data.studentLastName = formDataObj.get('studentLastName');
                data.familyStatus = formDataObj.get('familyStatus');
                data.livingWith = formDataObj.get('livingWith');
                
                data.guardianFirstName = formDataObj.get('guardianFirstName');
                data.guardianLastName = formDataObj.get('guardianLastName');
                data.guardianRelationship = formDataObj.get('guardianRelationship');
                data.guardianID = formDataObj.get('guardianID');
                data.guardianPhone = formDataObj.get('guardianPhone');
                data.guardianOccupation = formDataObj.get('guardianOccupation');
                
                data.guardianNoID = formElement.querySelector('[name="guardianNoID"]').checked;
                data.guardianHasStateWelfare = formElement.querySelector('[name="guardianHasStateWelfare"]').checked;
                
                data.hasDependents = formElement.querySelector('[name="hasDependents"]').checked;
                data.dependentDisability = formElement.querySelector('[name="dependentDisability"]').checked;
                data.dependentChronicDisease = formElement.querySelector('[name="dependentChronicDisease"]').checked;
                data.dependentElderly = formElement.querySelector('[name="dependentElderly"]').checked;
                data.dependentSingleParent = formElement.querySelector('[name="dependentSingleParent"]').checked;
                data.dependentUnemployed = formElement.querySelector('[name="dependentUnemployed"]').checked;
                
                data.housingType = formDataObj.get('housingType');
                data.rentCost = WebFormEditor.roundFloat(parseFloat(formDataObj.get('rentCost')) || 0);
                
                data.floorMaterial = formDataObj.get('floorMaterial');
                data.wallMaterial = formDataObj.get('wallMaterial');
                data.roofMaterial = formDataObj.get('roofMaterial');
                data.hasToilet = formElement.querySelector('[name="hasToilet"]').checked;
                
                data.agricultureLandSize = formDataObj.get('agricultureLandSize');
                data.electricitySource = formDataObj.get('electricitySource');
                data.drinkingWaterSource = formDataObj.get('drinkingWaterSource');
                
                data.hasVehicle = formElement.querySelector('[name="hasVehicle"]').checked;
                data.vehicleTypeAndAge = formDataObj.get('vehicleTypeAndAge') || '';
                
                const checkedAppliances = Array.from(formElement.querySelectorAll('[name="householdAppliances"]:checked')).map(el => el.value);
                data.householdAppliances = checkedAppliances;
                
                data.travelMethod = formDataObj.get('travelMethod');
                data.travelDistanceKM = WebFormEditor.roundFloat(parseFloat(formDataObj.get('travelDistanceKM')) || 0);
                data.travelTimeHours = WebFormEditor.roundFloat(parseFloat(formDataObj.get('travelTimeHours')) || 0);
                data.travelExpensePerMonth = WebFormEditor.roundFloat(parseFloat(formDataObj.get('travelExpensePerMonth')) || 0);
                
                data.addressNo = formDataObj.get('addressNo');
                data.addressMoo = formDataObj.get('addressMoo');
                data.addressSoi = formDataObj.get('addressSoi');
                data.addressRoad = formDataObj.get('addressRoad');
                data.addressSubDistrict = formDataObj.get('addressSubDistrict');
                data.addressDistrict = formDataObj.get('addressDistrict');
                data.addressProvince = formDataObj.get('addressProvince');

                // อัปเดตข้อมูลจำนวนสมาชิกหลัก
                const totalMembersInput = document.getElementById('input-total-members');
                data.eefFormModel.totalMembersCount = parseInt(totalMembersInput.value) || 1;

                // รวบรวมข้อมูลสมาชิกครอบครัวตารางตรรกะ Matrix
                const rowElements = modal.querySelectorAll('.household-row');
                const updatedMembers = [];
                
                rowElements.forEach(row => {
                    const idx = parseInt(row.getAttribute('data-index'));
                    const name = row.querySelector('.member-name').value.trim();
                    const relation = row.querySelector('.member-relation').value.trim();
                    const nationalID = row.querySelector('.member-id').value.trim();
                    const age = parseInt(row.querySelector('.member-age').value) || 0;
                    
                    const salary = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-salary').value) || 0);
                    const agricultureIncome = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-agri').value) || 0);
                    const businessIncome = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-business').value) || 0);
                    const stateWelfare = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-welfare').value) || 0);
                    const otherIncome = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-other').value) || 0);
                    
                    const totalMonthlyIncome = WebFormEditor.roundFloat(salary + agricultureIncome + businessIncome + stateWelfare + otherIncome);

                    // ไม่เซฟแถวว่างที่ไม่ได้เขียนข้อมูล
                    if (name || relation || nationalID || salary || agricultureIncome || businessIncome) {
                        updatedMembers.push({
                            id: jsonData.eefFormModel?.householdMembers?.[idx]?.id || this.generateUUID(),
                            name, relation, nationalID, highestEducation: jsonData.eefFormModel?.householdMembers?.[idx]?.highestEducation || '-',
                            age, hasDisability: false, hasChronicDisease: false,
                            salary, agricultureIncome, businessIncome, stateWelfare, otherIncome,
                            totalMonthlyIncome
                        });
                    }
                });
                
                data.eefFormModel.householdMembers = updatedMembers;

                // อัปเดตยอดรวมและการคำนวณเฉลี่ยรายบุคคลใน eefFormModel
                let totalHouseholdIncome = 0;
                updatedMembers.forEach(m => {
                    totalHouseholdIncome += m.totalMonthlyIncome;
                });
                totalHouseholdIncome = WebFormEditor.roundFloat(totalHouseholdIncome);
                
                const totalMembersCount = parseInt(totalMembersInput.value) || 1;
                const averageIncomePerPerson = WebFormEditor.roundFloat(totalHouseholdIncome / Math.max(1, totalMembersCount));
                
                data.eefFormModel.totalHouseholdIncome = totalHouseholdIncome;
                data.eefFormModel.averageIncomePerPerson = averageIncomePerPerson;

                // ตั้งสถานะการเซฟขึ้น Cloud ให้ตรงกันและระบุ Synced (เนื่องจากเป็นการเซฟทับผ่าน Cloud)
                data.isSyncedWithCloud = true;
                data.syncState = 'Synced';

                // สั่ง PATCH สตรีม JSON ทับไฟล์เดิมใน Google Drive
                await gapi.client.request({
                    path: `/upload/drive/v3/files/${fileID}`,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                modal.remove();
                if (typeof onSaveSuccess === 'function') {
                    onSaveSuccess(studentID);
                }

            } catch (err) {
                console.error('Save changes failed:', err);
                alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${err.message || 'เน็ตเวิร์กขัดข้อง'}`);
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-2"></i>บันทึกการแก้ไข`;
            }
        });
    }

    /**
     * คำนวณสรุปการเงินบนตารางแถวสมาชิกและตัวชี้วัดเฉลี่ย
     */
    static calculateTotalIncome(modal) {
        const rows = modal.querySelectorAll('.household-row');
        let totalHouseholdSum = 0;

        rows.forEach(row => {
            const salary = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-salary').value) || 0);
            const agricultureIncome = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-agri').value) || 0);
            const businessIncome = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-business').value) || 0);
            const stateWelfare = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-welfare').value) || 0);
            const otherIncome = WebFormEditor.roundFloat(parseFloat(row.querySelector('.member-other').value) || 0);

            const rowTotal = WebFormEditor.roundFloat(salary + agricultureIncome + businessIncome + stateWelfare + otherIncome);
            row.querySelector('.member-total-label').innerText = rowTotal.toLocaleString('th-TH');
            
            // นำยอดรวมแถวสมทบยอดรวมครอบครัว
            totalHouseholdSum += rowTotal;
        });

        totalHouseholdSum = WebFormEditor.roundFloat(totalHouseholdSum);

        // แสดงผลลัพธ์
        document.getElementById('sum-household-income').innerText = `${totalHouseholdSum.toLocaleString('th-TH')} บาท`;

        const totalMembersCountInput = document.getElementById('input-total-members');
        const totalMembersCount = parseInt(totalMembersCountInput.value) || 1;
        const avgPerPerson = WebFormEditor.roundFloat(totalHouseholdSum / Math.max(1, totalMembersCount));
        
        document.getElementById('avg-household-income').innerText = `${avgPerPerson.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
    }

    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * ป้องกันปัญหาทศนิยมเกิน IEEE 754 โดยปัดเศษทศนิยมไม่เกิน 2 ตำแหน่ง
     */
    static roundFloat(val) {
        if (typeof val !== 'number' || isNaN(val)) return 0;
        return Math.round(val * 100) / 100;
    }
}

// ตรวจสอบระบบ Module หรือส่งเข้า Window ในพิกัด Browser
window.WebFormEditor = WebFormEditor;
