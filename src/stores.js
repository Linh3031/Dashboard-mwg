// src/stores.js
import { writable, derived, get } from 'svelte/store';

// --- [NEW] CHẾ ĐỘ DEMO ---
export const isDemoMode = writable(false); 
// -------------------------

// --- [NEW] TRẠM TRUNG CHUYỂN VERSION ---
export const latestSystemVersion = writable(null);

export const currentCluster = writable(null);
export const activeTab = writable('data-section');
export const isAdmin = writable(false); 

// [PHẪU THUẬT FAST BOOT]: Khởi tạo currentUser ngay lập tức từ Cache thay vì chờ Firebase
let savedUserEmail = null;
if (typeof localStorage !== 'undefined') {
    savedUserEmail = localStorage.getItem('userEmail');
}
export const currentUser = writable(savedUserEmail ? { email: savedUserEmail } : null);
// ---------------------------------------------------------------------------------

export const feedbackList = writable([]);
export const userStats = writable([]); 
export const helpContent = writable({ data: '...', luyke: '...', sknv: '...', realtime: '...' });

// --- [SỬA ĐỔI] XỬ LÝ LƯU TRỮ MẪU NHẬN XÉT (PERSISTENCE) ---
let savedTemplates = { luyke: '', sknv: '', realtime: '' };
if (typeof localStorage !== 'undefined') {
    try {
        const raw = localStorage.getItem('composerTemplates');
        if (raw) savedTemplates = JSON.parse(raw);
    } catch (e) {
        console.error('Lỗi đọc mẫu nhận xét từ localStorage:', e);
    }
}
export const composerTemplates = writable(savedTemplates);
// -------------------------------------------------------------

// --- [SỬA ĐỔI CHÍNH] ĐỒNG BỘ MAPPING QUA LOCALSTORAGE (HỖ TRỢ CROSS-TAB REALTIME) ---
let savedCompMappings = {};
let savedLuykeMappings = {};
if (typeof localStorage !== 'undefined') {
    try {
        const compRaw = localStorage.getItem('compMappings_cache');
        if (compRaw) savedCompMappings = JSON.parse(compRaw);
        
        const luykeRaw = localStorage.getItem('luykeMappings_cache');
        if (luykeRaw) savedLuykeMappings = JSON.parse(luykeRaw);
    } catch (e) {
        console.error('Lỗi đọc mapping từ localStorage:', e);
    }
}

export const competitionNameMappings = writable(savedCompMappings);
export const luykeNameMappings = writable(savedLuykeMappings);

competitionNameMappings.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('compMappings_cache', JSON.stringify(value));
    }
});

luykeNameMappings.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('luykeMappings_cache', JSON.stringify(value));
    }
});

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key === 'compMappings_cache' && event.newValue) {
            competitionNameMappings.set(JSON.parse(event.newValue));
        }
        if (event.key === 'luykeMappings_cache' && event.newValue) {
            luykeNameMappings.set(JSON.parse(event.newValue));
        }
    });
}
// ---------------------------------------------------------------------------------

export const homeConfig = writable({ videoUrl: '', timeline: [], sliderImages: [], changelogs: [] });
export const danhSachNhanVien = writable([]);
export const ycxData = writable([]);
export const rawGioCongData = writable([]);
export const thuongNongData = writable([]);
export const thuongERPData = writable([]);
export const pastedThiDuaReportData = writable([]);
export const realtimeYCXData = writable([]);

export const doanhThuBIData = writable([]); 

export const dtCkNamData = writable([]);
export const ycxDataCungKyNam = writable([]);
export const thiDuaVungChiTiet = writable([]);
export const thiDuaVungTong = writable([]);
export const ycxDataThangTruoc = writable([]);
export const thuongNongDataThangTruoc = writable([]);
export const thuongERPDataThangTruoc = writable([]);
export const masterReportData = writable({ luyke: [], sknv: [], realtime: [] });
export const competitionData = writable([]);

// --- [PHẪU THUẬT v3.1]: Vá lỗi mất cấu hình Hệ số (Mất DT Quy Đổi) khi F5 ---
let savedDeclarations = { hinhThucXuat: '', hinhThucXuatGop: '', heSoQuyDoi: '' };
let savedEfficiency = [];
if (typeof localStorage !== 'undefined') {
    try {
        const decRaw = localStorage.getItem('declarations_cache');
        if (decRaw) savedDeclarations = JSON.parse(decRaw);
        
        const effRaw = localStorage.getItem('efficiencyConfig_cache');
        if (effRaw) savedEfficiency = JSON.parse(effRaw);
    } catch (e) {
        console.error('Lỗi đọc cấu hình hệ số từ localStorage:', e);
    }
}

export const declarations = writable(savedDeclarations);
export const efficiencyConfig = writable(savedEfficiency);

declarations.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('declarations_cache', JSON.stringify(value));
    }
});
efficiencyConfig.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('efficiencyConfig_cache', JSON.stringify(value));
    }
});
// -------------------------------------------------------------------------

export const virtualProductList = writable([]); 
export const categoryStructure = writable([]); 
export const brandList = writable([]); 
export const specialProductList = writable([]);
export const macroCategoryConfig = writable([]); 
export const macroProductGroupConfig = writable([]); 
export const categoryNameMapping = writable({}); 
export const groupNameMapping = writable({});
export const brandNameMapping = writable({}); 
export const localCompetitionConfigs = writable([]); 
export const globalCompetitionConfigs = writable([]); 
export const globalSpecialPrograms = writable([]); 
export const qdcConfigStore = writable([]);
// [MỚI] Mã Loại TĐ (số nguyên) được admin khai báo là tính theo Số Lượng — còn lại mặc định tính theo Doanh Thu
export const quantityCompetitionTypeCodes = writable([2, 6]);
export const warehouseCustomMetrics = writable([]);
export const customPerformanceTables = writable([]);
export const dailyTrendConfigs = writable([]);

// --- [LOGGING SECTION] QUẢN LÝ MỤC TIÊU (KPI) ---
let savedKpi = null;
if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('kpiStore_cache');
    savedKpi = raw ? JSON.parse(raw) : null;
}

export const kpiStore = writable(savedKpi || {
    targets: {}, 
    globalSettings: {} 
});

kpiStore.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('kpiStore_cache', JSON.stringify(value));
    }
});
// -----------------------------------------------------

export const luykeGoalSettings = writable({});
export const realtimeGoalSettings = writable({});
export const highlightSettings = writable({ luyke: {}, sknv: {}, realtime: {} });
export const debugInfo = writable({});
export const employeeMaNVMap = writable(new Map());
export const employeeNameToMaNVMap = writable(new Map());
export const charts = writable({});
export const choices = writable({
    luyke_employee: null, luyke_date_picker: null, luyke_highlight_nhanhang: null, luyke_highlight_nhomhang: null, luyke_highlight_employee: null,
    sknv_employee: null, sknv_date_picker: null, sknv_highlight_nhanhang: null, sknv_highlight_nhomhang: null, sknv_highlight_employee: null,
    realtime_employee: null, realtime_highlight_nhanhang: null, realtime_highlight_nhomhang: null, realtime_highlight_employee: null,
    thiDuaVung_sieuThi: null,
    competition_group: null,
    competition_brand: null,
    special_program_group: null, 
    thidua_employee_detail: null,
    realtime_brand_category_filter: null,
    realtime_brand_filter: null,
});
export const viewingDetailFor = writable(null);
export const sortState = writable({});
export const drawerState = writable({ activeDrawer: null });
export const modalState = writable({ activeModal: null });
export const notificationStore = writable({ message: '', type: 'info', visible: false });
export const interfaceSettings = writable({
    contrastLevel: '3', globalFontSize: '18', kpiFontSize: '36',
    kpiCard1Bg: '#38bdf8', kpiCard2Bg: '#34d399', kpiCard3Bg: '#fbbf24',
    kpiCard4Bg: '#2dd4bf', kpiCard5Bg: '#a78bfa', kpiCard6Bg: '#f472b6',
    kpiCard7Bg: '#818cf8', kpiCard8Bg: '#f87171',
    kpiTitleColor: '#ffffff', kpiMainColor: '#ffffff', kpiSubColor: '#ffffff'
});
export const firebaseStore = writable({ app: null, auth: null, db: null, storage: null });
export const fileSyncState = writable({});
export const clusterSummaryData = writable(null);

// ============================================================================
// [GIAI ĐOẠN 3]: THIẾT QUÂN LUẬT PHÂN QUYỀN (RBAC GATEKEEPER)
// ============================================================================
// [PHẪU THUẬT]: Khởi tạo Cache Profile từ LocalStorage để chống ngẽn F5
let savedUserProfile = null;
if (typeof localStorage !== 'undefined') {
    try {
        const raw = localStorage.getItem('userProfile_cache');
        if (raw) savedUserProfile = JSON.parse(raw);
    } catch (e) {
        console.error('Lỗi đọc userProfile cache:', e);
    }
}
export const userProfile = writable(savedUserProfile);

userProfile.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
        if (value) {
            localStorage.setItem('userProfile_cache', JSON.stringify(value));
        } else {
            localStorage.removeItem('userProfile_cache');
        }
    }
});

const rawWarehouseList = writable([]);
export const warehouseList = {
    subscribe: rawWarehouseList.subscribe,
    set: (rawList) => {
        const profile = get(userProfile);
        if (profile && profile.role === 'user') {
            const allowed = profile.allowedWarehouses || [];
            const filtered = rawList.filter(wh => allowed.includes(wh) && wh !== 'ALL');
            rawWarehouseList.set(filtered);
        } else {
            rawWarehouseList.set(rawList);
        }
    },
    update: (updater) => { warehouseList.set(updater(get(rawWarehouseList))); }
};

const rawSelectedWarehouse = writable(null);
export const selectedWarehouse = {
    subscribe: rawSelectedWarehouse.subscribe,
    set: (val) => {
        const profile = get(userProfile);
        if (profile && profile.role === 'user') {
            const allowed = profile.allowedWarehouses || [];
            if (val && val !== 'ALL' && !allowed.includes(val)) {
                rawSelectedWarehouse.set(allowed.length > 0 ? allowed[0] : null);
                return;
            }
        }
        rawSelectedWarehouse.set(val);
    },
    update: (updater) => { selectedWarehouse.set(updater(get(rawSelectedWarehouse))); }
};

userProfile.subscribe(profile => {
    if (profile) {
        isAdmin.set(profile.role === 'admin');
        warehouseList.set(get(rawWarehouseList));
        selectedWarehouse.set(get(rawSelectedWarehouse));
    }
});
// ============================================================================

export const processedEmployeeCompetitionData = derived(
    [pastedThiDuaReportData, danhSachNhanVien, ycxData, selectedWarehouse],
    ([$pastedData, $dsnv, $ycx, $wh]) => {
        if (!$pastedData || $pastedData.length === 0) return [];

        const infoMap = {};
        if ($ycx && $ycx.length) {
            $ycx.forEach(nv => {
                const code = String(nv.ma_nv || nv.maNV || '').trim();
                const name = nv.ten_nv || nv.hoTen || '';
                const dept = nv.ma_kho || nv.boPhan || nv.vi_tri || '';
                if (code) infoMap[code] = { name, dept };
                if (nv.nguoiTao) {
                    const msnvMatch = String(nv.nguoiTao).match(/(\d+)/);
                    if (msnvMatch) {
                        const extractedCode = msnvMatch[1].trim();
                        if (!infoMap[extractedCode]) infoMap[extractedCode] = { name: nv.hoTen || nv.nguoiTao, dept };
                    }
                }
            });
        }

        let targetEmps = $dsnv || [];
        if ($wh && $wh !== 'ALL') {
            targetEmps = targetEmps.filter(e => String(e.ma_kho || e.maKho) === $wh);
        }

        const reportByNv = new Map();
        $pastedData.forEach(r => {
            const code = String(r.maNV).trim();
            if (!reportByNv.has(code)) reportByNv.set(code, []);
            reportByNv.get(code).push(r);
        });

        let finalEmployees = [];
        targetEmps.forEach(emp => {
            const empCode = String(emp.ma_nv || emp.maNV || '').trim();
            const empKho = String(emp.ma_kho || emp.maKho || '').trim();
            
            const matchingReports = reportByNv.get(empCode) || [];
            let matchedReport = null;
            if (matchingReports.length > 0) {
                matchedReport = matchingReports.find(r => String(r.maKho).trim() === empKho);
                if (!matchedReport) matchedReport = matchingReports[0]; 
            }

            if (matchedReport) {
                finalEmployees.push({
                    ...matchedReport,
                    maNV: empCode,
                    maKho: empKho || matchedReport.maKho || 'N/A',
                    hoTen: infoMap[empCode]?.name || emp.ten_nv || emp.hoTen || matchedReport.hoTen,
                    boPhan: infoMap[empCode]?.dept || emp.vi_tri || emp.boPhan || matchedReport.boPhan
                });
            } else {
                finalEmployees.push({
                    maNV: empCode,
                    maKho: empKho || 'N/A',
                    hoTen: infoMap[empCode]?.name || emp.ten_nv || emp.hoTen,
                    boPhan: infoMap[empCode]?.dept || emp.vi_tri || emp.boPhan || 'Chưa phân loại',
                    competitions: [],
                    completedCount: 0
                });
            }
        });

        return finalEmployees;
    }
);