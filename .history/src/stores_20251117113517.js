// File: src/stores.js
import { writable } from 'svelte/store';

/**
 * Biến state chính, theo dõi tab nào đang được hiển thị.
 */
export const activeTab = writable('data-section');

/**
 * Trạng thái xác thực
 */
export const isAdmin = writable(false);
export const currentUser = writable(null); // Sẽ chứa { email: '...' }

/**
 * Dữ liệu thô (Raw Data)
 * (Các store này được nạp bởi dataService.js)
 */
export const danhSachNhanVien = writable([]);
export const ycxData = writable([]);
export const rawGioCongData = writable([]);
export const thuongNongData = writable([]);
export const thuongERPData = writable([]);
export const pastedThiDuaReportData = writable([]);
export const realtimeYCXData = writable([]);
export const thiDuaVungChiTiet = writable([]);
export const thiDuaVungTong = writable([]);
// Dữ liệu tháng trước
export const ycxDataThangTruoc = writable([]);
export const thuongNongDataThangTruoc = writable([]);
export const thuongERPDataThangTruoc = writable([]);

/**
 * Dữ liệu đã xử lý (Processed Data)
 */
export const masterReportData = writable({
	luyke: [],
	sknv: [],
	realtime: []
});

/**
 * Dữ liệu thi đua từ ô dán Lũy Kế
 */
export const competitionData = writable([]);

/**
 * Cấu hình & Khai báo
 */
export const declarations = writable({
    hinhThucXuat: '',
    hinhThucXuatGop: '',
    heSoQuyDoi: ''
});
export const categoryStructure = writable([]);
export const brandList = writable([]);
export const specialProductList = writable([]);
export const competitionNameMappings = writable({});
export const localCompetitionConfigs = writable([]);
export const globalCompetitionConfigs = writable([]);
export const globalSpecialPrograms = writable([]);

/**
 * Cài đặt & Trạng thái UI
 */
export const luykeGoalSettings = writable({});
export const realtimeGoalSettings = writable({});
export const highlightSettings = writable({
    luyke: {},
    sknv: {},
    realtime: {}
});
export const debugInfo = writable({});
export const employeeMaNVMap = writable(new Map());
export const employeeNameToMaNVMap = writable(new Map());
export const charts = writable({});
export const choices = writable({
    lpyke_employee: null, luyke_date_picker: null, luyke_highlight_nhanhang: null, luyke_highlight_nhomhang: null, luyke_highlight_employee: null,
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
export const viewingDetailFor = writable(null); // State theo dõi chi tiết NV
export const sortState = writable({
    // ... (toàn bộ sortState của bạn giữ nguyên)
});

// === BẮT ĐẦU THÊM MỚI (2 DÒNG BỊ THIẾU) ===
/**
 * Trạng thái kho
 */
export const warehouseList = writable([]);
export const selectedWarehouse = writable(null);
// === KẾT THÚC THÊM MỚI ===