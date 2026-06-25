// MARK: - Windows Companion Portal Orchestrator (app.js)

// Configuration Keys (Saved to LocalStorage)
const STORAGE_KEYS = {
    CLIENT_ID: 'eef_google_client_id',
    API_KEY: 'eef_google_api_key'
};

// Application State
let gapiInited = false;
let gisInited = false;
let tokenClient = null;
let studentsList = [];

// DOM Elements
const elements = {
    clientIdInput: document.getElementById('input-client-id'),
    apiKeyInput: document.getElementById('input-api-key'),
    btnSaveConfig: document.getElementById('btn-save-config'),
    btnToggleConfig: document.getElementById('btn-toggle-config'),
    configPanel: document.getElementById('config-fields-panel'),
    configCaret: document.getElementById('config-caret'),
    
    signinButton: document.getElementById('signin-button'),
    signoutButton: document.getElementById('signout-button'),
    authBadge: document.getElementById('auth-badge'),
    
    statTotal: document.getElementById('stat-total'),
    statSynced: document.getElementById('stat-synced'),
    statPending: document.getElementById('stat-pending'),
    
    searchInput: document.getElementById('search-input'),
    btnRefresh: document.getElementById('btn-refresh'),
    tableBody: document.getElementById('student-table-body'),
    emptyState: document.getElementById('empty-state'),
    paginationInfo: document.getElementById('pagination-info'),
    
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    toastIcon: document.getElementById('toast-icon')
};

// Initialize configuration values on load
document.addEventListener('DOMContentLoaded', () => {
    loadConfiguration();
    setupEventListeners();
});

// MARK: - Config & Events Setup

function loadConfiguration() {
    const savedClientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || '';
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    
    elements.clientIdInput.value = savedClientId;
    elements.apiKeyInput.value = savedApiKey;
    
    // หากบันทึกค่าไว้แล้ว ให้พับหน้าจอ Config
    if (savedClientId && savedApiKey) {
        toggleConfigPanel(false);
    }
}

function setupEventListeners() {
    elements.btnSaveConfig.addEventListener('click', saveConfiguration);
    elements.btnToggleConfig.addEventListener('click', () => {
        const isCollapsed = elements.configPanel.classList.contains('hidden');
        toggleConfigPanel(isCollapsed);
    });
    
    elements.signinButton.addEventListener('click', handleAuthClick);
    elements.signoutButton.addEventListener('click', handleSignoutClick);
    elements.btnRefresh.addEventListener('click', refreshDashboard);
    elements.searchInput.addEventListener('input', handleSearch);

    // Toggle view buttons
    const btnShowTable = document.getElementById('btn-show-table');
    const btnShowDashboard = document.getElementById('btn-show-dashboard');
    const tableViewContent = document.getElementById('table-view-content');
    const execDashboardContent = document.getElementById('executive-dashboard-content');
    const searchWrapper = document.getElementById('search-input-wrapper');

    if (btnShowTable && btnShowDashboard) {
        btnShowTable.addEventListener('click', () => {
            btnShowTable.className = "inline-flex items-center px-4 py-2 border border-brand-600 bg-brand-50 text-sm font-semibold rounded-lg text-brand-700 shadow-sm focus:outline-none transition-all duration-200";
            btnShowDashboard.className = "inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm focus:outline-none transition-all duration-200";
            
            tableViewContent.classList.remove('hidden');
            execDashboardContent.classList.add('hidden');
            searchWrapper.classList.remove('invisible');
        });

        btnShowDashboard.addEventListener('click', async () => {
            btnShowDashboard.className = "inline-flex items-center px-4 py-2 border border-brand-600 bg-brand-50 text-sm font-semibold rounded-lg text-brand-700 shadow-sm focus:outline-none transition-all duration-200";
            btnShowTable.className = "inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm focus:outline-none transition-all duration-200";
            
            tableViewContent.classList.add('hidden');
            execDashboardContent.classList.remove('hidden');
            searchWrapper.classList.add('invisible');

            await refreshExecutiveDashboard();
        });
    }
}

function toggleConfigPanel(show) {
    if (show) {
        elements.configPanel.classList.remove('hidden');
        elements.configCaret.style.transform = 'rotate(180deg)';
    } else {
        elements.configPanel.classList.add('hidden');
        elements.configCaret.style.transform = 'rotate(0deg)';
    }
}

function saveConfiguration() {
    const clientId = elements.clientIdInput.value.trim();
    const apiKey = elements.apiKeyInput.value.trim();
    
    if (!clientId || !apiKey) {
        showToast('กรุณากรอกข้อมูล Client ID และ API Key ให้ครบถ้วน', 'warning');
        return;
    }
    
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    
    showToast('บันทึกการตั้งค่า Google Cloud API สำเร็จ', 'success');
    toggleConfigPanel(false);
    
    // สั่ง Init โหลด SDK อีกรอบด้วยค่าคอนฟิกใหม่
    initGoogleSDKs();
}

// MARK: - Google API Integration

/**
 * โหลด GAPI Client library
 */
function gapiInit() {
    gapi.load('client', initGapiClient);
}

/**
 * เริ่มต้น GAPI Client
 */
async function initGapiClient() {
    gapiInited = true;
    initGoogleSDKs();
}

/**
 * โหลด Google Identity Services SDK
 */
function gisInit() {
    gisInited = true;
    initGoogleSDKs();
}

/**
 * เมื่อ SDK ตัวใดตัวหนึ่ง หรือข้อมูลคอนฟิกเปลี่ยน จะมาตรวจสอบและเชื่อมต่อ SDK
 */
async function initGoogleSDKs() {
    if (!gapiInited || !gisInited) return;
    
    const clientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    
    // ตรวจสอบว่าครูผู้ใช้งานตั้งค่าคีย์หรือยัง
    if (!clientId || !apiKey) {
        updateAuthUI(false);
        return;
    }
    
    try {
        await gapi.client.init({
            apiKey: apiKey,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
            callback: '', // จะระบุพิกัดในตอนคลิกขอ Access Token
        });
        
        // ตรวจสอบว่าครูเคยล็อกอินแล้วมี Token ค้างในระบบหรือไม่
        const storedToken = gapi.client.getToken();
        if (storedToken) {
            updateAuthUI(true);
            refreshDashboard();
        } else {
            updateAuthUI(false);
        }
        
    } catch (err) {
        console.error('Google SDK Initialization Error:', err);
        showToast('การเชื่อมต่อ Google API ผิดพลาด กรุณาตรวจสอบ Client ID หรือ API Key', 'error');
    }
}

/**
 * ล็อกอินเพื่อขอ Access Token
 */
function handleAuthClick() {
    if (!tokenClient) {
        showToast('กรุณากรอกข้อมูล Google API Key และทำการบันทึกค่าก่อนล็อกอิน', 'warning');
        return;
    }
    
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            showToast('การล็อกอินด้วยบัญชี Google ถูกปฏิเสธ', 'error');
            throw (resp);
        }
        
        showToast('เข้าสู่ระบบสำเร็จ กำลังเชื่อมต่อฐานข้อมูล Google Drive...', 'success');
        updateAuthUI(true);
        await refreshDashboard();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

/**
 * ออกจากระบบ
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revokeToken(token.access_token);
        gapi.client.setToken(null);
        studentsList = [];
        updateAuthUI(false);
        renderTable([]);
        updateStats();
        
        const container = document.getElementById('executive-dashboard-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12 text-slate-500">
                    <i class="fa-solid fa-chart-pie text-slate-300 text-5xl mb-4 block"></i>
                    <p class="text-sm font-medium">กรุณาล็อกอินด้วย Google Account เพื่อดูข้อมูลสถิติผู้บริหาร</p>
                </div>
            `;
        }
        
        showToast('ออกจากระบบเรียบร้อย', 'info');
    }
}

function updateAuthUI(isSignedIn) {
    if (isSignedIn) {
        elements.signinButton.classList.add('hidden');
        elements.signoutButton.classList.remove('hidden');
        elements.authBadge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800";
        elements.authBadge.innerHTML = `<span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-600"></span>เข้าสู่ระบบเรียบร้อย`;
    } else {
        elements.signinButton.classList.remove('hidden');
        elements.signoutButton.classList.add('hidden');
        elements.authBadge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800";
        elements.authBadge.innerHTML = `<span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-red-600"></span>ยังไม่ได้เข้าสู่ระบบ`;
        showTableState('login-required');
    }
}

// MARK: - Drive File Crawler & Sync

/**
 * ฟังก์ชันหลักในการดึงข้อมูลแบบฟอร์ม JSON จาก Google Drive ทั้งหมดในโฟลเดอร์ปลายทาง
 */
async function refreshDashboard() {
    if (gapi.client.getToken() === null) {
        showToast('กรุณาล็อกอินเพื่อทำการเชื่อมต่อ', 'warning');
        return;
    }
    
    showTableState('loading');
    
    try {
        // 1. ค้นหาโฟลเดอร์แม่ 'EEF_Student_Subsidies'
        const rootFolderId = await findFolderId('EEF_Student_Subsidies', null);
        if (!rootFolderId) {
            showToast('ไม่พบโฟลเดอร์ฐานข้อมูลหลัก "EEF_Student_Subsidies" ใน Google Drive', 'error');
            showTableState('empty');
            return;
        }
        
        // 2. ค้นหาโฟลเดอร์ย่อย '01_Raw_Data_JSON'
        const subFolderId = await findFolderId('01_Raw_Data_JSON', rootFolderId);
        if (!subFolderId) {
            showToast('ไม่พบโฟลเดอร์ย่อย "01_Raw_Data_JSON" ใน Google Drive', 'error');
            showTableState('empty');
            return;
        }
        
        // 3. ค้นหารายการไฟล์ .json ทั้งหมดภายใต้โฟลเดอร์ 01_Raw_Data_JSON
        const files = await listJsonFiles(subFolderId);
        if (files.length === 0) {
            studentsList = [];
            showTableState('empty');
            updateStats();
            return;
        }
        
        // 4. ดึงข้อมูลเนื้อหาภายในไฟล์ JSON ทีละไฟล์แบบ Asynchronous
        const fetchPromises = files.map(async (file) => {
            try {
                const response = await gapi.client.drive.files.get({
                    fileId: file.id,
                    alt: 'media'
                });
                
                // รองรับกรณีที่ GAPI ทำการ Auto-parse เป็น Object แล้ว หรือยังเป็น String
                let rawData = response.result;
                if (typeof rawData === 'string') {
                    rawData = JSON.parse(rawData);
                }
                
                // คัดแยกโครงสร้างเพื่อแสดงผลในตาราง
                return {
                    fileId: file.id,
                    studentID: rawData.studentID || file.name.replace('.json', ''),
                    studentName: rawData.studentName || 'ไม่ระบุชื่อ',
                    studentLastName: rawData.studentLastName || '',
                    guardianRelationship: rawData.guardianRelationship || '-',
                    isSyncedWithCloud: rawData.isSyncedWithCloud !== undefined ? rawData.isSyncedWithCloud : true,
                    syncState: rawData.syncState || 'Synced',
                    modifiedTime: new Date(file.modifiedTime).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    rawData: rawData
                };
            } catch (err) {
                console.error(`Error loading file ${file.name}:`, err);
                return null;
            }
        });
        
        const fetchedRecords = await Promise.all(fetchPromises);
        // กรองตัวที่เป็น null ออกไปกรณีไฟล์เสียหรืออ่านข้าม
        studentsList = fetchedRecords.filter(item => item !== null);
        
        showToast('ดึงข้อมูลระบบฐานข้อมูล กสศ. สำเร็จเรียบร้อย', 'success');
        handleSearch(); // แสดงผลลัพธ์ผ่านตัวกรอง

        const execDashboardContent = document.getElementById('executive-dashboard-content');
        if (execDashboardContent && !execDashboardContent.classList.contains('hidden')) {
            refreshExecutiveDashboard();
        }
        
    } catch (err) {
        console.error('Refresh Dashboard error:', err);
        showToast('การดึงไฟล์ข้อมูลล้มเหลว', 'error');
        showTableState('empty');
    }
}

/**
 * ค้นหา ID ของโฟลเดอร์ตามชื่อและระบุ Parent
 */
async function findFolderId(name, parentId) {
    let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }
    
    const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name)'
    });
    
    return response.result.files.length > 0 ? response.result.files[0].id : null;
}

/**
 * ดึงข้อมูลรายชื่อไฟล์ JSON ทั้งหมดในโฟลเดอร์
 */
async function listJsonFiles(folderId) {
    const query = `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`;
    const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, modifiedTime)'
    });
    
    return response.result.files || [];
}

// MARK: - Search & Render Layout

function handleSearch() {
    const query = elements.searchInput.value.trim().toLowerCase();
    
    if (!query) {
        renderTable(studentsList);
        return;
    }
    
    const filtered = studentsList.filter(student => {
        return student.studentID.toLowerCase().includes(query) ||
               student.studentName.toLowerCase().includes(query) ||
               student.studentLastName.toLowerCase().includes(query);
    });
    
    renderTable(filtered);
}

function renderTable(data) {
    updateStats();
    
    if (data.length === 0) {
        if (studentsList.length > 0) {
            // กรณีมีข้อมูลแต่เซิร์ชไม่เจอ
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-10 text-center text-slate-500">
                        <i class="fa-solid fa-face-frown text-slate-300 text-3xl mb-3 block"></i>
                        ไม่พบข้อมูลนักเรียนที่ตรงกับคำค้นหา
                    </td>
                </tr>
            `;
        } else {
            showTableState('empty');
        }
        elements.paginationInfo.innerText = 'แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ';
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.tableBody.innerHTML = '';
    
    data.forEach((student, index) => {
        // ออกแบบ Badge สถานะให้ชัดเจนและสวยงาม
        let statusBadge = '';
        if (student.syncState === 'Synced' || student.isSyncedWithCloud) {
            statusBadge = `
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-500"></span>ซิงก์สำเร็จ
                </span>
            `;
        } else if (student.syncState === 'Pending Sync') {
            statusBadge = `
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                    <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>ค้างในคิว
                </span>
            `;
        } else {
            statusBadge = `
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400"></span>แบบร่าง
                </span>
            `;
        }
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/50 transition-colors';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-medium">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap text-slate-900 font-mono text-xs font-semibold">${student.studentID}</td>
            <td class="px-6 py-4 whitespace-nowrap font-medium text-slate-800">${student.studentName} ${student.studentLastName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-slate-500">${student.guardianRelationship}</td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">${student.modifiedTime}</td>
            <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
                <button onclick="openEditor('${student.studentID}')" class="inline-flex items-center px-3 py-1.5 border border-slate-200 hover:border-brand-500 rounded-lg text-xs font-bold text-slate-700 hover:text-white hover:bg-brand-600 shadow-sm focus:outline-none transition-all duration-200">
                    <i class="fa-solid fa-user-pen mr-1.5"></i>ตรวจสอบ/แก้ไขข้อมูล
                </button>
            </td>
        `;
        elements.tableBody.appendChild(row);
    });
    
    elements.paginationInfo.innerText = `แสดง 1 ถึง ${data.length} จากทั้งหมด ${data.length} รายการ`;
}

function updateStats() {
    elements.statTotal.innerText = studentsList.length;
    
    const syncedCount = studentsList.filter(s => s.syncState === 'Synced' || s.isSyncedWithCloud).length;
    const pendingCount = studentsList.filter(s => s.syncState === 'Pending Sync').length;
    
    elements.statSynced.innerText = syncedCount;
    elements.statPending.innerText = pendingCount;
}

function showTableState(state) {
    elements.emptyState.classList.add('hidden');
    
    if (state === 'loading') {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-16 text-center text-slate-500">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <div class="w-8 h-8 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin"></div>
                        <p class="text-xs font-medium text-slate-500">กำลังเชื่อมต่อ Google Drive และประมวลผลไฟล์แบบจำลอง...</p>
                    </div>
                </td>
            </tr>
        `;
    } else if (state === 'empty') {
        elements.tableBody.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
    } else if (state === 'login-required') {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-slate-500">
                    <i class="fa-solid fa-lock text-slate-300 text-3xl mb-3 block"></i>
                    กรุณาล็อกอินเข้าสู่ระบบและระบุ API Key เพื่อเรียกดูข้อมูลนักเรียนยากจน กสศ.01
                </td>
            </tr>
        `;
    }
}

// MARK: - Core Editor trigger

/**
 * ฟังก์ชันเปิดหน้าต่าง Editor เมื่อคุณครูคลิกปุ่ม "ตรวจสอบ/แก้ไขข้อมูล"
 */
async function openEditor(studentID) {
    console.log(`[Dashboard Orchestrator] Triggered openEditor for Student ID: ${studentID}`);
    
    const student = studentsList.find(s => s.studentID === studentID);
    if (!student) {
        showToast('ไม่พบระเบียนข้อมูลนักเรียนคนนี้ในระบบแดชบอร์ด', 'error');
        return;
    }
    
    showToast('กำลังโหลดเอกสาร JSON จาก Google Drive...', 'info');
    
    try {
        const response = await gapi.client.drive.files.get({
            fileId: student.fileId,
            alt: 'media'
        });
        
        let rawData = response.result;
        if (typeof rawData === 'string') {
            rawData = JSON.parse(rawData);
        }
        
        // แสดง Modal การกรอกฟอร์มแก้ไข
        WebFormEditor.show(studentID, student.fileId, rawData, async (savedID) => {
            showToast(`บันทึกความเปลี่ยนแปลงของนักเรียน ${savedID} ขึ้นคลาวด์สำเร็จ!`, 'success');
            await refreshDashboard(); // รีเฟรชแดชบอร์ดอัปเดตค่าผลลัพธ์
        });
        
    } catch (err) {
        console.error('Failed to open editor:', err);
        showToast('การดึงไฟล์ต้นฉบับจากคลาวด์ขัดข้อง', 'error');
    }
}

// MARK: - Notification Toast

function showToast(message, type = 'info') {
    elements.toastMessage.innerText = message;
    
    // เปลี่ยนไอคอนและสีตามประเภท
    elements.toastIcon.className = 'fa-solid';
    if (type === 'success') {
        elements.toastIcon.classList.add('fa-circle-check', 'text-brand-500');
    } else if (type === 'error') {
        elements.toastIcon.classList.add('fa-circle-exclamation', 'text-red-500');
    } else if (type === 'warning') {
        elements.toastIcon.classList.add('fa-triangle-exclamation', 'text-amber-500');
    } else {
        elements.toastIcon.classList.add('fa-circle-info', 'text-accent-500');
    }
    
    // แสดงแอนิเมชัน Toast โผล่
    elements.toast.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
    elements.toast.classList.add('translate-y-0', 'opacity-100');
    
    // ซ่อนหลังจาก 4 วินาที
    setTimeout(() => {
        elements.toast.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
        elements.toast.classList.remove('translate-y-0', 'opacity-100');
    }, 4000);
}

// MARK: - Executive Dashboard Sync
async function refreshExecutiveDashboard() {
    const container = document.getElementById('executive-dashboard-container');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-12 text-slate-500">
            <div class="w-8 h-8 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-xs font-semibold text-slate-400">กำลังดาวน์โหลดข้อมูลการรวมผลลัพธ์จาก Google Sheets...</p>
        </div>
    `;

    // เช็คว่าอยู่ในโหมดจำลอง (Simulation/Mock) หรือไม่
    const isMock = typeof window.mockFiles !== 'undefined';
    
    if (isMock) {
        // โหมดจำลอง: เรนเดอร์ด้วยข้อมูลหลอกทันที
        const mockStudents = window.mockFiles.map(file => ({
            studentID: file.content.studentID,
            studentName: file.content.studentName,
            studentLastName: file.content.studentLastName,
            rawData: file.content
        }));
        setTimeout(() => {
            ExecutiveSummaryPortal.render(container, mockStudents);
        }, 300);
        return;
    }

    if (gapi.client.getToken() === null) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-500">
                <i class="fa-solid fa-lock text-slate-300 text-4xl mb-3 block"></i>
                <p class="text-xs font-semibold text-slate-400">กรุณาล็อกอินด้วย Google Account เพื่อดูข้อมูลสถิติผู้บริหาร</p>
            </div>
        `;
        return;
    }

    try {
        // โหลด API Sheets แบบ dynamic
        if (!gapi.client.sheets) {
            await gapi.client.load('sheets', 'v4');
        }

        // ค้นหา Spreadsheet ID
        let spreadsheetId = null;
        const driveResponse = await gapi.client.drive.files.list({
            q: "name = 'EEF_Master_Database' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
            fields: 'files(id, name)'
        });
        if (driveResponse.result.files && driveResponse.result.files.length > 0) {
            spreadsheetId = driveResponse.result.files[0].id;
        }

        let sheetRows = [];
        if (spreadsheetId) {
            const sheetsResponse = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'Sheet1!A:I'
            });
            sheetRows = sheetsResponse.result.values || [];
        }

        // ประมวลผลและเรนเดอร์แดชบอร์ด
        // สำหรับรายละเอียดสิ่งปลูกสร้าง เราใช้ข้อมูลในหน่วยความจำ (studentsList) ที่โหลดจาก JSON
        ExecutiveSummaryPortal.render(container, studentsList);

    } catch (err) {
        console.error('Error loading executive dashboard data:', err);
        // Fallback: ใช้เฉพาะข้อมูลรายชื่อที่อยู่ใน studentsList
        ExecutiveSummaryPortal.render(container, studentsList);
    }
}
