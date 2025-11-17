// Version 1.1 - Add all missing stores from state.js
// MODULE: STORES
// File này thay thế state.js, sử dụng Svelte Stores (writable)
// để quản lý trạng thái toàn cục của ứng dụng.

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
export const specialProductList = writable([]); // Danh sách SPĐQ (từ Cloud)
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
    luyke_employee: null, luyke_date_picker: null, luyke_highlight_nhanhang: null, luyke_highlight_nhomhang: null, luyke_highlight_employee: null,
    sknv_employee: null, sknv_date_picker: null, sknv_highlight_nhanhang: null, sknv_highlight_nhomhang: null, sknv_highlight_employee: null,
    realtime_employee: null, realtime_highlight_nhanhang: null, realtime_highlight_nhomhang: null, realtime_highlight_employee: null,
    thiDuaVung_sieuThi: null,
    competition_group: null,
    competition_brand: null,
    special_program_group: null, // Thêm store cho SPĐQ
    thidua_employee_detail: null,
    realtime_brand_category_filter: null,
    realtime_brand_filter: null,
});
export const viewingDetailFor = writable(null); // State theo dõi chi tiết NV
export const sortState = writable({
    user_stats: { key: 'lastLogin', direction: 'desc' },
    luyke_chuaxuat: { key: 'doanhThuQuyDoi', direction: 'desc' },
    sknv_summary: { key: 'totalAbove', direction: 'desc' },
    doanhthu_lk: { key: 'doanhThu', direction: 'desc' },
    thunhap: { key: 'tongThuNhap', direction: 'desc' },
    hieu_qua: { key: 'dtICT', direction: 'desc' },
    sknv_ict: { key: 'dtICT', direction: 'desc' },
    sknv_phukien: { key: 'dtPhuKien', direction: 'desc' },
    sknv_giadung: { key: 'dtGiaDung', direction: 'desc' },
    sknv_ce: { key: 'dtCE', direction: 'desc' },
    sknv_baohiem: { key: 'dtBaoHiem', direction: 'desc' },
    sknv_nganhhang_chitiet: { key: 'revenue', direction: 'desc' },
    sknv_qdc: { key: 'dtqd', direction: 'desc' },
    sknv_thidua_summary: { key: 'completedCount', direction: 'desc'},
    sknv_thidua_category: { key: 'percentExpected', direction: 'desc'},
    sknv_thidua_employee: { key: 'percentExpected', direction: 'desc'},
    sknv_thidua_pasted: { key: 'hoTen', direction: 'asc' },
    sknv_thidua_pasted_detail: { key: 'name', direction: 'asc' },
    luyke_competition_doanhthu: { key: 'hoanThanh', direction: 'desc' },
    luyke_competition_soluong: { key: 'hoanThanh', direction: 'desc' },
    luyke_nganhhang: { key: 'revenue', direction: 'desc' },
    luyke_qdc: { key: 'dtqd', direction: 'desc' },
    realtime_nganhhang: { key: 'revenue', direction: 'desc' },
    realtime_dt_nhanvien: { key: 'doanhThu', direction: 'desc' },
    realtime_hieuqua_nhanvien: { key: 'dtICT', direction: 'desc' },
    realtime_ict: { key: 'dtICT', direction: 'desc' },
    realtime_phukien: { key: 'dtPhuKien', direction: 'desc' },
    realtime_giadung: { key: 'dtGiaDung', direction: 'desc' },
    realtime_ce: { key: 'dtCE', direction: 'desc' },
    realtime_baohiem: { key: 'dtBaoHiem', direction: 'desc' },
    realtime_qdc: { key: 'dtqd', direction: 'desc' },
    realtime_brand: { key: 'revenue', direction: 'desc' },
    realtime_brand_employee: { key: 'revenue', direction: 'desc' }
});