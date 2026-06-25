// MARK: - ExecutiveSummaryPortal.component.js (Windows Companion Portal Component)

class ExecutiveSummaryPortal {
    /**
     * เรนเดอร์แดชบอร์ดสถิติผู้บริหารโรงเรียน
     * @param {HTMLElement} container - Element ปลายทางที่ต้องการแทรกแดชบอร์ด
     * @param {Array} studentsList - รายการข้อมูลนักเรียน (ที่ผูกวัตถุ rawData เข้ามาด้วย)
     * @param {number} defaultTarget - ค่าเริ่มต้นเป้าหมายการประเมิน
     */
    static render(container, studentsList, defaultTarget = 100) {
        if (!container) return;

        // รับประกันความปลอดภัยของข้อมูลอินพุต
        const data = Array.isArray(studentsList) ? studentsList : [];
        
        // อ่านค่า Target จาก LocalStorage หรือใช้ Default
        const storageKeyTarget = 'eef_dashboard_target_enrollment';
        let currentTarget = parseInt(localStorage.getItem(storageKeyTarget)) || defaultTarget;

        // คำนวณ 1: จำนวนประวัติที่บันทึกแล้ว
        const totalProcessed = data.length;

        // คำนวณ 2: ดัชนีความขัดสนสูงสุด/ต่ำสุด (Extreme Vulnerability Index)
        let minIncome = Infinity;
        let maxIncome = -Infinity;
        let vulnerableCount = 0;

        data.forEach(student => {
            const raw = student.rawData || {};
            // พยายามดึงรายได้เฉลี่ยต่อคน
            let avgIncome = 0;
            if (raw.eefFormModel && raw.eefFormModel.averageIncomePerPerson !== undefined) {
                avgIncome = parseFloat(raw.eefFormModel.averageIncomePerPerson) || 0;
            } else if (raw.eefFormModel && raw.eefFormModel.totalHouseholdIncome !== undefined) {
                const totalMembers = parseInt(raw.eefFormModel.totalMembersCount) || 1;
                avgIncome = (parseFloat(raw.eefFormModel.totalHouseholdIncome) || 0) / Math.max(1, totalMembers);
            } else {
                avgIncome = parseFloat(raw.averageIncomePerPerson) || 0;
            }

            if (avgIncome > 0) {
                if (avgIncome < minIncome) minIncome = avgIncome;
                if (avgIncome > maxIncome) maxIncome = avgIncome;
                // ดัชนีคัดกรองกสศ. ปกติต้องต่ำกว่า 3,000 บาท/คน/เดือน
                if (avgIncome <= 3000) {
                    vulnerableCount++;
                }
            }
        });

        if (minIncome === Infinity) minIncome = 0;
        if (maxIncome === -Infinity) maxIncome = 0;

        // คำนวณ 3: อัตราความสำเร็จเมื่อเทียบเป้าหมาย
        const progressPercentage = Math.min(100, Math.round((totalProcessed / Math.max(1, currentTarget)) * 100));

        // คำนวณสถิติสิ่งปลูกสร้างและโครงสร้างครัวเรือน (Physical Housing Deprivation)
        const stats = {
            walls: { concrete: 0, wood: 0, zinc: 0, bamboo: 0, other: 0 },
            roofs: { tiles: 0, zinc: 0, leaf: 0, other: 0 },
            floors: { tile: 0, cement: 0, wood: 0, dirt: 0, other: 0 },
            noToilet: 0
        };

        data.forEach(student => {
            const raw = student.rawData || {};
            
            // 1. วิเคราะห์วัสดุฝาบ้าน
            const wall = raw.wallMaterial || '';
            if (wall.includes('ซีเมนต์') || wall.includes('อิฐ') || wall.includes('ก้อนปูน')) {
                stats.walls.concrete++;
            } else if (wall.includes('ไม้กระดาน') || wall.includes('ไม้อัด')) {
                stats.walls.wood++;
            } else if (wall.includes('สังกะสี')) {
                stats.walls.zinc++;
            } else if (wall.includes('ไม้ไผ่') || wall.includes('เศษไม้')) {
                stats.walls.bamboo++;
            } else {
                stats.walls.other++;
            }

            // 2. วิเคราะห์หลังคา
            const roof = raw.roofMaterial || '';
            if (roof.includes('กระเบื้อง') || roof.includes('เซรามิค')) {
                stats.roofs.tiles++;
            } else if (roof.includes('โลหะ') || roof.includes('สังกะสี') || roof.includes('เหล็ก')) {
                stats.roofs.zinc++;
            } else if (roof.includes('ใบไม้') || roof.includes('ธรรมชาติ')) {
                stats.roofs.leaf++;
            } else {
                stats.roofs.other++;
            }

            // 3. วิเคราะห์พื้นบ้าน
            const floor = raw.floorMaterial || '';
            if (floor.includes('กระเบื้อง') || floor.includes('ปาเก้') || floor.includes('ขัดเงา')) {
                stats.floors.tile++;
            } else if (floor.includes('ซีเมนต์') || floor.includes('เสื่อน้ำมัน') || floor.includes('ไวนิล')) {
                stats.floors.cement++;
            } else if (floor.includes('ไม้กระดาน')) {
                stats.floors.wood++;
            } else if (floor.includes('ดิน') || floor.includes('ทราย') || floor.includes('ไม้ไผ่')) {
                stats.floors.dirt++;
            } else {
                stats.floors.other++;
            }

            // 4. วิเคราะห์การขาดแคลนสุขา
            if (raw.hasToilet === false || raw.hasToilet === 'false') {
                stats.noToilet++;
            }
        });

        // สร้าง HTML แดชบอร์ด
        container.innerHTML = `
            <div class="space-y-6">
                <!-- ส่วนหัวและแถบเป้าหมายการประเมิน -->
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 flex items-center">
                            <i class="fa-solid fa-chart-pie text-brand-600 mr-2.5"></i>
                            แดชบอร์ดสถิติวิเคราะห์เชิงลึกสำหรับผู้บริหาร (Executive Insights)
                        </h3>
                        <p class="text-xs text-slate-500 mt-1">สรุปข้อมูลเชิงสถิติจากการคัดกรองสภาพแวดล้อมครัวเรือนของนักเรียน กสศ. 01 แบบเรียลไทม์</p>
                    </div>
                    
                    <div class="flex items-center space-x-2.5">
                        <label for="dashboard-target-input" class="text-xs font-bold text-slate-500 whitespace-nowrap">เป้าหมายนักเรียนคัดกรอง (คน):</label>
                        <input type="number" id="dashboard-target-input" value="${currentTarget}" min="1" class="w-20 px-2 py-1 text-sm font-mono font-bold text-center border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                        <button id="dashboard-update-target-btn" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors">
                            ปรับเป้าหมาย
                        </button>
                    </div>
                </div>

                <!-- การแสดงผลการ์ดสรุป KPI (Core Summary Cards) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <!-- การ์ด 1: จำนวนคัดกรองแล้วเสร็จ -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                        <div class="space-y-1">
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">แบบเสนอคัดกรองแล้วเสร็จ</span>
                            <div class="text-3xl font-black text-slate-900">${totalProcessed} <span class="text-xs font-semibold text-slate-500">จากเป้าหมาย ${currentTarget} คน</span></div>
                            <p class="text-[10px] text-brand-600 font-semibold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i>พร้อมซิงก์ขึ้นคลาวด์ EEF Master Table</p>
                        </div>
                        <div class="bg-brand-50 text-brand-600 p-4 rounded-xl flex items-center justify-center">
                            <i class="fa-solid fa-file-invoice-dollar text-xl"></i>
                        </div>
                    </div>

                    <!-- การ์ด 2: ดัชนีความขัดสนสุดขั้ว -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                        <div class="space-y-1">
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">ดัชนีรายได้เฉลี่ยต่อคนต่อเดือน</span>
                            <div class="text-xs font-bold text-slate-700">
                                <div class="flex items-center space-x-2 text-rose-600 text-sm">
                                    <i class="fa-solid fa-arrow-down-short-wide text-xs"></i>
                                    <span>ต่ำสุด: <strong>${minIncome === Infinity ? 0 : minIncome.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</strong> บาท/เดือน</span>
                                </div>
                                <div class="flex items-center space-x-2 text-emerald-600 text-sm mt-1">
                                    <i class="fa-solid fa-arrow-up-wide-short text-xs"></i>
                                    <span>สูงสุด: <strong>${maxIncome === -Infinity ? 0 : maxIncome.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</strong> บาท/เดือน</span>
                                </div>
                            </div>
                            <p class="text-[10px] text-amber-600 font-semibold"><i class="fa-solid fa-circle-exclamation mr-1"></i>นักเรียนที่มีเกณฑ์ยากจนพิเศษ (≤ 3k/ด): ${vulnerableCount} คน</p>
                        </div>
                        <div class="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center justify-center">
                            <i class="fa-solid fa-person-circle-exclamation text-xl"></i>
                        </div>
                    </div>

                    <!-- การ์ด 3: อัตราการคัดกรองสำเร็จ -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                        <div class="space-y-2 w-full pr-4">
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">สัดส่วนผลงานคัดกรองสำเร็จ</span>
                            <div class="flex items-baseline space-x-1.5">
                                <span class="text-3xl font-black text-slate-900">${progressPercentage}%</span>
                                <span class="text-xs font-semibold text-slate-400">ของเป้าประเมิน</span>
                            </div>
                            <!-- แถบโปรเกรส -->
                            <div class="w-full bg-slate-100 rounded-full h-2">
                                <div class="bg-gradient-to-r from-brand-500 to-emerald-600 h-2 rounded-full transition-all duration-500" style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>
                        <div class="bg-sky-50 text-sky-600 p-4 rounded-xl flex items-center justify-center shrink-0">
                            <i class="fa-solid fa-chart-line text-xl"></i>
                        </div>
                    </div>
                </div>

                <!-- การวิเคราะห์ปัจจัยความขัดสนทางกายภาพ (Housing & Deprivation Details) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- โครงสร้างและวัสดุของสิ่งปลูกสร้าง -->
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 class="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                            <span><i class="fa-solid fa-trowel-bricks text-slate-500 mr-2"></i>วิเคราะห์ความแข็งแรงของวัสดุที่อยู่อาศัย</span>
                            <span class="text-[10px] text-slate-400">จากทั้งหมด ${totalProcessed} ครัวเรือน</span>
                        </h4>
                        
                        <div class="space-y-4">
                            <!-- แถบที่ 1: วัสดุฝาบ้าน -->
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between text-xs font-bold text-slate-600">
                                    <span>ฝาบ้านทรุดโทรม/วัสดุชั่วคราว (สังกะสี/ไม้ไผ่/เศษวัสดุ)</span>
                                    <span>${this.getPercentageString(stats.walls.zinc + stats.walls.bamboo, totalProcessed)}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div class="bg-amber-500 h-3 rounded-full" style="width: ${this.getPercentage(stats.walls.zinc + stats.walls.bamboo, totalProcessed)}%"></div>
                                    </div>
                                    <span class="text-xs font-semibold text-slate-400 font-mono whitespace-nowrap">${stats.walls.zinc + stats.walls.bamboo} ราย</span>
                                </div>
                            </div>

                            <!-- แถบที่ 2: โครงสร้างหลังคา -->
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between text-xs font-bold text-slate-600">
                                    <span>หลังคามุงใบไม้/หญ้าแฝก/แผ่นพลาสติก</span>
                                    <span>${this.getPercentageString(stats.roofs.leaf, totalProcessed)}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div class="bg-rose-500 h-3 rounded-full" style="width: ${this.getPercentage(stats.roofs.leaf, totalProcessed)}%"></div>
                                    </div>
                                    <span class="text-xs font-semibold text-slate-400 font-mono whitespace-nowrap">${stats.roofs.leaf} ราย</span>
                                </div>
                            </div>

                            <!-- แถบที่ 3: สภาพพื้นบ้าน -->
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between text-xs font-bold text-slate-600">
                                    <span>พื้นบ้านเป็นพื้นดิน/พื้นทราย/เศษไม้ปูสลับ</span>
                                    <span>${this.getPercentageString(stats.floors.dirt, totalProcessed)}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div class="bg-red-600 h-3 rounded-full" style="width: ${this.getPercentage(stats.floors.dirt, totalProcessed)}%"></div>
                                    </div>
                                    <span class="text-xs font-semibold text-slate-400 font-mono whitespace-nowrap">${stats.floors.dirt} ราย</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- การวิเคราะห์สุขอนามัยและสวัสดิการสุขา -->
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                        <div class="space-y-4">
                            <h4 class="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                                <span><i class="fa-solid fa-toilet text-slate-500 mr-2"></i>ตัวบ่งชี้การขาดแคลนสุขอนามัย (สุขา)</span>
                                <span class="text-[10px] text-slate-400">ตัวชี้วัดความยากจนกสศ.</span>
                            </h4>

                            <div class="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div class="space-y-1 pr-3">
                                    <span class="text-xs font-bold text-slate-500 block">สัดส่วนไม่มีห้องส้วมในที่อยู่อาศัย</span>
                                    <p class="text-xs text-slate-400">ครัวเรือนที่ไม่ปรากฏการสร้างสุขอนามัยที่ได้มาตรฐาน ป้องกันความเสี่ยงโรคระบาด</p>
                                </div>
                                <div class="text-right shrink-0">
                                    <div class="text-3xl font-black text-rose-600">${this.getPercentageString(stats.noToilet, totalProcessed)}</div>
                                    <span class="text-xs font-bold text-slate-500">${stats.noToilet} จาก ${totalProcessed} ครัวเรือน</span>
                                </div>
                            </div>

                            <!-- โปรเกรสวิเคราะห์สุขา -->
                            <div class="space-y-1">
                                <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                    <div class="bg-rose-500 h-3 rounded-full" style="width: ${this.getPercentage(stats.noToilet, totalProcessed)}%"></div>
                                </div>
                            </div>
                        </div>

                        <!-- แจ้งเตือนสภาวะวิกฤต -->
                        ${stats.noToilet > 0 || (stats.walls.bamboo + stats.roofs.leaf) > 0 ? `
                            <div class="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
                                <i class="fa-solid fa-triangle-exclamation mt-0.5 shrink-0"></i>
                                <div>
                                    <strong>ตรวจพบดัชนีเฝ้าระวังทางกายภาพ:</strong> มีครอบครัวเด็กนักเรียนบางส่วนเผชิญสภาวะขาดแคลนสุขอนามัยพื้นฐานหรืออาศัยในสิ่งปลูกสร้างไม่มั่นคงถาวร กรุณาจัดลำดับการช่วยเหลือด่วนพิเศษ
                                </div>
                            </div>
                        ` : `
                            <div class="p-3 bg-green-50 rounded-lg border border-green-200 text-xs text-green-800 flex items-start space-x-2">
                                <i class="fa-solid fa-circle-check mt-0.5 shrink-0"></i>
                                <div>
                                    <strong>สภาวะทางกายภาพสมบูรณ์:</strong> นักเรียนทุกคนได้รับการจัดสรรด้านสิ่งปลูกสร้างและสุขอนามัยเบื้องต้นตามพิกัดรายงาน
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        // เชื่อมโยงเหตุการณ์อัปเดต Target
        const input = container.querySelector('#dashboard-target-input');
        const updateBtn = container.querySelector('#dashboard-update-target-btn');
        
        updateBtn.addEventListener('click', () => {
            const targetVal = parseInt(input.value) || defaultTarget;
            if (targetVal < 1) return;
            localStorage.setItem(storageKeyTarget, targetVal);
            // โหลดและเรนเดอร์ตัวเองใหม่ทันทีด้วยเป้าหมายใหม่
            ExecutiveSummaryPortal.render(container, studentsList, defaultTarget);
            if (typeof window.showToast === 'function') {
                window.showToast('ปรับปรุงสัดส่วนเป้าหมายผู้ขอรับทุนเรียบร้อย', 'success');
            }
        });
    }

    static getPercentage(count, total) {
        if (!total) return 0;
        return Math.round((count / total) * 100);
    }

    static getPercentageString(count, total) {
        if (!total) return '0%';
        return `${this.getPercentage(count, total)}%`;
    }
}

// ผูกเข้ากับ Global Object
window.ExecutiveSummaryPortal = ExecutiveSummaryPortal;
