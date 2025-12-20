// src/stores.js (Copy đè lên file cũ)
import { writable } from 'svelte/store';

// ... (Giữ nguyên các phần trên) ...
export const activeTab = writable('data-section');
export const isAdmin = writable(false); 
export const currentUser = writable(null);
export const feedbackList = writable([]);
export const userStats = writable([]); 
export const helpContent = writable({ data: '...', luyke: '...', sknv: '...', realtime: '...' });
export const composerTemplates = writable({ luyke: '', sknv: '', realtime: '' });
export const competitionNameMappings = writable({}); 
export const homeConfig = writable({ videoUrl: '', timeline: [], sliderImages: [], changelogs: [] });
export const danhSachNhanVien = writable([]);
export const ycxData = writable([]);
export const rawGioCongData = writable([]);
export const thuongNongData = writable([]);
export const thuongERPData = writable([]);
export const pastedThiDuaReportData = writable([]);
export const realtimeYCXData = writable([]);
export const thiDuaVungChiTiet = writable([]);
export const thiDuaVungTong = writable([]);
export const ycxDataThangTruoc = writable([]);
export const thuongNongDataThangTruoc = writable([]);
export const thuongERPDataThangTruoc = writable([]);
export const masterReportData = writable({ luyke: [], sknv: [], realtime: [] });
export const competitionData = writable([]);
export const declarations = writable({ hinhThucXuat: '', hinhThucXuatGop: '', heSoQuyDoi: '' });
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
export const efficiencyConfig = writable([]); 
export const qdcConfigStore = writable([]);
export const warehouseCustomMetrics = writable([]);
export const customRevenueTables = writable([]);
export const customPerformanceTables = writable([]);

// --- [LOGGING SECTION] QUẢN LÝ MỤC TIÊU (KPI) ---
let savedKpi = null;
if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('kpiStore_cache');
    console.log(`[STORE ${new Date().toLocaleTimeString()}] Raw LocalStorage:`, raw);
    savedKpi = raw ? JSON.parse(raw) : null;
}

export const kpiStore = writable(savedKpi || {
    targets: {}, 
    globalSettings: {} 
});

kpiStore.subscribe(value => {
    // console.log('[STORE] KPI Update:', value); // Uncomment nếu muốn log chi tiết thay đổi
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
export const warehouseList = writable([]);
export const selectedWarehouse = writable(null);
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