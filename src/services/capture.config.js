// File: src/services/capture.config.js

// 1. Danh sách các nhóm cần TÁCH ẢNH (Mỗi bảng 1 ảnh)
export const SPLIT_GROUPS = [
    'category-revenue',         
    'competition-program',      
    'competition-program-view', 
    'efficiency-program',       
    'efficiency-program-view',
    'regional-competition',
    'efficiency-luyke'
];

// 2. Danh sách các nhóm cần GỘP DẠNG LƯỚI (Grid) - Dành cho KPI
// QUAN TRỌNG: Bất kỳ nhóm nào nằm trong list này sẽ được kích hoạt Grid 2 cột
export const KPI_GROUPS = [
    'kpi',
    'supermarket-kpi' 
];

// 3. Cấu hình mặc định: MERGE_VERTICAL (Gộp dọc)
// Dành cho: Realtime, Doanh thu NV LK, Thu nhập...