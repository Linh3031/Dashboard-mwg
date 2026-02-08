// src/data/demoFixtures.js

// 1. Danh sách nhân viên (Lấy từ file bạn gửi)
const EMPLOYEES_908 = [
  {"maNhanVien": "263989", "hoTen": "Phan Bảo Ngọc", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "38809", "hoTen": "Phan Thị Mỹ Tiên", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "39540", "hoTen": "Võ Hoài Tâm", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "59343", "hoTen": "Nguyễn Thị Diễm My", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "38856", "hoTen": "Võ Bích Phương", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "33905", "hoTen": "Đoàn Văn Vinh", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "260898", "hoTen": "Bùi Thị Cẩm Ly", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "261045", "hoTen": "Lê Thị Quế Trân", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "141421", "hoTen": "Võ Tấn Quân", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "39454", "hoTen": "Lê Thị Xuân Quỳnh", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "260763", "hoTen": "Trần Khắc Huy", "boPhan": "AOI", "maKho": "908"},
  {"maNhanVien": "12277", "hoTen": "Phan Mai Thị Ái Trâm", "boPhan": "AOI", "maKho": "908"}
];

// 2. Dữ liệu đơn hàng mẫu (MÃ NHÂN VIÊN PHẢI KHỚP VỚI LIST TRÊN)
// Tôi gán cứng mã nhân viên vào đơn hàng để App tính ra số liệu.
const SALES_DATA = [
  {"maDonHang": "DEMO-001", "ngayTao": "2026-02-05 08:00:00", "nganhHang": "464 - Giao dịch AirTime", "nhomHang": "2513 - Thu hộ Payoo", "tenSanPham": "Thu hộ Demo 1", "soLuong": 1, "doanhThuThuc": 5000000, "doanhThuQuyDoi": 5000000, "trangThai": "Đã xuất", "maNhanVien": "263989", "maKho": "908"},
  {"maDonHang": "DEMO-002", "ngayTao": "2026-02-05 09:30:00", "nganhHang": "484 - Điện gia dụng", "nhomHang": "4156 - Nồi cơm", "tenSanPham": "Nồi cơm Demo", "soLuong": 1, "doanhThuThuc": 2000000, "doanhThuQuyDoi": 2000000, "trangThai": "Đã xuất", "maNhanVien": "38809", "maKho": "908"},
  {"maDonHang": "DEMO-003", "ngayTao": "2026-02-05 10:15:00", "nganhHang": "724 - Phiếu mua hàng điện tử", "nhomHang": "2151 - PMH", "tenSanPham": "PMH Demo", "soLuong": 5, "doanhThuThuc": 0, "doanhThuQuyDoi": 0, "trangThai": "Chưa xuất", "maNhanVien": "39540", "maKho": "908"},
  {"maDonHang": "DEMO-004", "ngayTao": "2026-02-05 11:00:00", "nganhHang": "464 - Giao dịch AirTime", "nhomHang": "2513 - Thu hộ Payoo", "tenSanPham": "Thu hộ Demo 2", "soLuong": 1, "doanhThuThuc": 10000000, "doanhThuQuyDoi": 10000000, "trangThai": "Đã xuất", "maNhanVien": "263989", "maKho": "908"}
];

// 3. Cấu hình Ngành hàng
const CATEGORY_DATA = [
    {"id": "724 - Phiếu mua hàng điện tử", "name": "724 - Phiếu mua hàng điện tử", "target": 500000000, "type": "revenue"},
    {"id": "464 - Giao dịch AirTime", "name": "464 - Giao dịch AirTime", "target": 500000000, "type": "revenue"},
    {"id": "484 - Điện gia dụng", "name": "484 - Điện gia dụng", "target": 500000000, "type": "revenue"}
];

// 4. Cấu hình Hiệu quả (Bắt buộc phải có để tránh lỗi chia cho 0)
const EFFICIENCY_CONFIG = [
    {"id": "congchuan", "name": "Ngày công chuẩn", "value": 26, "type": "constant", "isSystem": true},
    {"id": "hesoluong", "name": "Hệ số lương", "value": 1.0, "type": "coefficient", "isSystem": true}
];

// 5. Cấu hình KPI (Tránh lỗi null khi xem chi tiết)
const KPI_STORE = {
    "targets": {
        "263989": { "revenue": 150000000, "profit": 20000000 },
        "38809": { "revenue": 120000000, "profit": 15000000 }
    },
    "globalSettings": { "month": 2, "year": 2026 }
};

// 6. Dữ liệu Master Report (Fake số liệu tổng hợp để hiện Dashboard ngay)
const FAKE_MASTER_REPORT = {
    "luyke": EMPLOYEES_908.map(e => ({
        ...e,
        totalRevenue: Math.floor(Math.random() * 100000000),
        totalOrders: Math.floor(Math.random() * 50),
        kpiPercent: Math.floor(Math.random() * 120)
    })),
    "sknv": [],
    "realtime": [] // Để trống để App tự tính từ SALES_DATA hoặc fake luôn nếu muốn
};

export const DEMO_SNAPSHOT = {
  "timestamp": new Date().toISOString(),
  "version": "2.2",
  "data": {
    "danhSachNhanVien": EMPLOYEES_908,
    "realtimeYCXData": SALES_DATA,
    "ycxData": SALES_DATA, // Dữ liệu lũy kế cũng dùng sales data này
    "declarations": CATEGORY_DATA,
    "categoryStructure": CATEGORY_DATA,
    "efficiencyConfig": EFFICIENCY_CONFIG,
    "kpiStore": KPI_STORE,
    "masterReportData": FAKE_MASTER_REPORT, // Nạp sẵn báo cáo tổng hợp
    "customRevenueTables": [],
    "customPerformanceTables": [],
    "warehouseCustomMetrics": [] // Thêm cái này để tránh lỗi
  }
};

export const DEMO_DATA = { employees: EMPLOYEES_908, ycx: SALES_DATA };