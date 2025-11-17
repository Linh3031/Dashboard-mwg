// Version 1.1 - Add missing stores for data processing
// MODULE: STORES
// File này thay thế state.js, sử dụng Svelte Stores (writable)
// để quản lý trạng thái toàn cục của ứng dụng.

import { writable } from 'svelte/store';

/**
 * Biến state chính, theo dõi tab nào đang được hiển thị.
 * Giá trị mặc định là 'data-section'.
 */
export const activeTab = writable('data-section');

/**
 * Trạng thái xác thực
 */
export const isAdmin = writable(false);
export const currentUser = writable(null); // Sẽ chứa { email: '...' }

/**
 * Dữ liệu thô (Raw Data)
 * Đây là các mảng chứa dữ liệu gốc được tải lên hoặc dán vào.
 */
export const danhSachNhanVien = writable([]);
export const ycxData = writable([]);
export const rawGioCongData = writable([]);
export const thuongNongData = writable([]);
export const thuongERPData = writable([]);
export const pastedThiDuaReportData = writable([]);
export const realtimeYCXData = writable([]);

// Dữ liệu tháng trước
export const ycxDataThangTruoc = writable([]);
export const thuongNongDataThangTruoc = writable([]);
export const thuongERPDataThangTruoc = writable([]);

/**
 * Dữ liệu đã xử lý (Processed Data)
 * Đây là kết quả sau khi logic tính toán chạy
 */
export const masterReportData = writable({
	luyke: [],
	sknv: [],
	realtime: []
});

// --- THÊM CÁC STORE BỊ THIẾU (V1.1) ---

/**
 * Lưu trữ các khai báo (Hình thức xuất, Hệ số quy đổi)
 * được đồng bộ từ Cloud. (Dựa trên)
 */
export const declarations = writable({
    hinhThucXuat: '',
    hinhThucXuatGop: '',
    heSoQuyDoi: ''
});

/**
 * Dữ liệu gỡ lỗi
 * (Dựa trên)
 */
export const debugInfo = writable({});

/**
 * Maps để tra cứu nhân viên nhanh
 * (Dựa trên)
 */
export const employeeMaNVMap = writable(new Map());
export const employeeNameToMaNVMap = writable(new Map());

/**
 * Dữ liệu thi đua từ ô dán Lũy Kế
 * (Dựa trên)
 */
export const competitionData = writable([]);

/**
 * Danh sách sản phẩm đặc quyền (từ Cloud)
 * (Dựa trên)
 */
export const specialProductList = writable([]);

// --- KẾT THÚC THÊM MỚI (V1.1) ---

/**
 * Cấu hình & Khai báo (Đã có từ v1.0)
 */
export const competitionNameMappings = writable({});
export const globalCompetitionConfigs = writable([]);