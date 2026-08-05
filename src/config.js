// src/config.js
// Version 3.1 - Atomic Integrity: Cleaned up Technical Debt (Removed Hardcoded DEFAULT_DATA)
// Chứa tất cả các cấu hình tĩnh của ứng dụng.

export const config = {
    ADMIN_PASSWORD: "Linh3010", 
    COLUMN_MAPPINGS: {
        danhsachnv: {
            maKho: { required: true, displayName: 'Mã Kho', aliases: ['mã kho', 'makho', 'kho'] },
            maNV: { required: true, displayName: 'Mã Nhân Viên', aliases: ['mã nv', 'msnv', 'mã nhân viên', 'manv', 'mã số nhân viên'] },
            hoTen: { required: true, displayName: 'Họ và Tên', aliases: ['họ và tên', 'tên nhân viên', 'tên nv', 'họ tên'] },
            boPhan: { required: true, displayName: 'Bộ phận', aliases: ['bộ phận'] },
            tenKho: { required: false, displayName: 'Tên Kho', aliases: ['tên kho', 'ten kho', 'tên siêu thị', 'ten sieu thi'] }
        },
        ycx: {
            maKhoTao: { required: false, displayName: 'Mã kho tạo', aliases: ['mã kho tạo', 'ma kho tao', 'mã kho', 'kho tạo'] },
            ngayTao: { required: true, displayName: 'Ngày tạo', aliases: ['ngày tạo'] },
            ngayHenGiao: { required: false, displayName: 'Ngày hẹn giao', aliases: ['ngày hẹn giao'] },
            nguoiTao: { required: true, displayName: 'Người tạo', aliases: ['người tạo'] },
            thanhTien: { required: true, displayName: 'Giá bán_1', aliases: ['giá bán_1', 'giá bán'] },
            soLuong: { required: true, displayName: 'Số lượng', aliases: ['sl bán', 'số lượng'] },
            nhomHang: { required: true, displayName: 'Nhóm hàng', aliases: ['nhóm hàng'] },
            tenSanPham: { required: true, displayName: 'Tên sản phẩm', aliases: ['tên sản phẩm'] },
            maSanPham: { required: true, displayName: 'Mã sản phẩm', aliases: ['mã sản phẩm', 'masanpham', 'mã sp', 'product code'] },
            tenKhachHang: { required: true, displayName: 'Tên khách hàng', aliases: ['tên khách hàng', 'tenkhachhang'] },
            nhaSanXuat: { required: true, displayName: 'Nhà sản xuất', aliases: ['nhà sản xuất', 'nhasanxuat'] },
            nganhHang: { required: true, displayName: 'Ngành hàng', aliases: ['ngành hàng'] },
            hinhThucXuat: { required: true, displayName: 'Hình thức xuất', aliases: ['hình thức xuất'] },
            trangThaiThuTien: { required: true, displayName: 'Trạng thái thu tiền', aliases: ['trạng thái thu tiền'] },
            trangThaiHuy: { required: true, displayName: 'Trạng thái hủy', aliases: ['trạng thái hủy'] },
            tinhTrangTra: { required: true, displayName: 'Tình trạng trả', aliases: ['tình trạng nhập trả của sản phẩm đổi với sản phẩm chính', 'tình trạng trả'] },
            trangThaiXuat: { required: true, displayName: 'Trạng thái xuất', aliases: ['trạng thái xuất'] },
            diaChi: { required: false, displayName: 'Địa chỉ', aliases: ['địa chỉ', 'dia chi', 'address', 'địa chỉ giao hàng', 'địa chỉ kh'] }
        },
        giocong: {
            maKho: { required: false, displayName: 'Mã siêu thị', aliases: ['mã siêu thị', 'masieuthi', 'mã kho'] },
            maNV: { required: false, displayName: 'Mã NV', aliases: ['mã nv', 'msnv'] },
            hoTen: { required: false, displayName: 'Tên NV', aliases: ['tên nv', 'tennv'] },
            tongGioCong: { required: true, displayName: 'Tổng giờ công', aliases: ['tổng giờ công (x.nhận) total', 'tổng giờ công'] }
        },
        thuongnong: {
            maNV: { required: false, displayName: 'Mã NV', aliases: ['manv', 'mã nv'] },
            hoTen: { required: false, displayName: 'Tên NV', aliases: ['tennv', 'tên nv'] },
            diemThuong: { required: true, displayName: 'Điểm thưởng', aliases: ['diemthuong', 'điểm thưởng'] }
        }
    },
    DEPARTMENT_GROUPS: [
        'BP Tư Vấn - ĐM',
        'BP Trang Trí kiêm Thu ngân - Sim Số - ĐM',
        'BP Kho Kiêm Hỗ Trợ Kỹ Thuật Xe Đạp - ĐM'
    ],
    // [PHẪU THUẬT LOGIC] Xóa sạch dữ liệu cứng. 
    // Giữ vỏ rỗng để hệ thống không bị crash nếu lỡ gọi tới.
    // Mọi khai báo thực tế sẽ lấy từ Giao diện Admin (Firebase/Store)
    DEFAULT_DATA: {
        NGANH_HANG_TRA_GOP_ALLOW_LIST: [],
        HINH_THUC_XUAT_TINH_DOANH_THU: [],
        HINH_THUC_XUAT_TRA_GOP: [],
        HE_SO_QUY_DOI: {}
    }
};