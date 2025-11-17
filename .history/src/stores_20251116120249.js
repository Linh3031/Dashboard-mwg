// Version 1.0 - Initial State Stores
// MODULE: STORES
// File này thay thế state.js, sử dụng Svelte Stores (writable)
// để quản lý trạng thái toàn cục của ứng dụng.

import { writable } from 'svelte/store';

/**
 * Biến state chính, theo dõi tab nào đang được hiển thị.
 * [cite_start]Giá trị mặc định là 'data-section'[cite: 120].
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
export const pastedThiDuaReportData = writable([]); //
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

/**
 * Cấu hình & Khai báo
 */
export const competitionNameMappings = writable({}); //
export const globalCompetitionConfigs = writable([]); //

// Các state khác sẽ được thêm vào khi cần...