// src/config.js
// Version 2.6 - Atomic Integrity: Cleaned up hardcoded HE_SO_QUY_DOI (Single Source of Truth via UI)
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
    PRODUCT_GROUPS: {
        ICT: ['1491', '931', '42'],
        CE: ['1097', '1098', '1099', '1094', '894'],
        PHU_KIEN: ['16', '1394', '184', '764'],
        GIA_DUNG: ['484', '1214'],
        MAY_LOC_NUOC: ['4171', '4172'],
        PIN_SDP: '12',
        CAMERA_TRONG_NHA: '6479',
        CAMERA_NGOAI_TROi: '4219',
        TAI_NGHE_BLT: '4540',
        NOI_CHIEN: '4099',
        ROBOT_HB: '4439',
        TIVI: '1094',
        TU_LANH: '1097',
        MAY_GIAT: '1099',
        MAY_LANH: '1098',
        DIEN_THOAI: ['13', '1491', '18'],
        LAPTOP: '42',
        SIM: ['1891', '664'],
        VAS: ['164', '571'],
        BAO_HIEM_VAS: ['4479', '4499'],
        SMARTPHONE: ['1491', '18', '13'],
        BAO_HIEM_DENOMINATOR: ['1491', '1097', '894', '1099', '1098', '42', '1094', '3859', '911', '893', '3659'],
        QDC_GROUPS: {
            PIN_SDP: { codes: ['12'], name: 'Pin SDP' },
            TAI_NGHE_BLT: { codes: ['3346', '4540'], name: 'Tai nghe BLT' },
            DONG_HO: { codes: ['4059', '4060', '4061', '4062', '4063', '4064', '4070'], name: 'Đồng hồ' },
            CAMERA: { codes: ['4219', '6479'], name: 'Camera' },
            LOA: { codes: ['1031', '1351', '4779'], name: 'Loa' },
            UDDD: { codes: ['571', '611'], name: 'UDDĐ' },
            BAO_HIEM: { codes: ['4479', '4499'], name: 'Bảo hiểm' },
            NOI_COM: { codes: ['4157', '4158'], name: 'Nồi cơm điện tử + cao tần' },
            NOI_CHIEN: { codes: ['4099'], name: 'Nồi chiên' },
            MAY_LOC_NUOC: { codes: ['4171', '4172'], name: 'Máy lọc nước' },
            ROBOT_HB: { codes: ['4439'], name: 'Robot hút bụi' },
            SIM_ONLINE: { codes: ['1891'], name: 'SIM' }
        }
    },
    DEPARTMENT_GROUPS: [
        'BP Tư Vấn - ĐM',
        'BP Trang Trí kiêm Thu ngân - Sim Số - ĐM',
        'BP Kho Kiêm Hỗ Trợ Kỹ Thuật Xe Đạp - ĐM'
    ],
    DEFAULT_DATA: {
        NGANH_HANG_TRA_GOP_ALLOW_LIST: [
            '484',  // Điện gia dụng
            '13',   // Điện thoại
            '244',  // Tablet
            '1754', // Máy lạnh, nước nóng
            '304',  // Điện tử
            '1756', // Máy giặt, sấy
            '1214', // Gia dụng lắp đặt
            '1755', // Tủ lạnh, đông, mát
            '1116', // Máy lọc nước
            '22',   // Laptop
            '1274', // Đồng Hồ Thời Trang
            '23'    // Wearable
        ],
        HINH_THUC_XUAT_TINH_DOANH_THU: [
            'Xuất bán hàng tại siêu thị', 'Xuất cung ứng dịch vụ',
            'Xuất bán pre-order tại siêu thị', 'Xuất SIM trắng kèm theo SIM',
            'Xuất bán hàng ưu đãi cho nhân viên', 'Xuất bán hàng tại siêu thị (TCĐM)',
            'Xuất dịch vụ bảo hành trọn đời', 'Xuất dịch vụ bảo dưỡng trọn đời',
            'Xuất bán hàng trả góp tại siêu thị', 'Xuất bán trả góp ưu đãi cho nhân viên',
            'Xuất bán trả góp cho NV phục vụ công việc', 'Xuất bán pre-order trả góp tại siêu thị',
            'Xuất bán pre-order trả góp tại siêu thị (TCĐM)',
            'Xuất dịch vụ thu hộ bảo hiểm'
        ],
        HINH_THUC_XUAT_TRA_GOP: ['Xuất bán hàng trả góp tại siêu thị', 'Xuất bán trả góp ưu đãi cho nhân viên', 'Xuất bán trả góp cho NV phục vụ công việc', 'Xuất bán pre-order trả góp tại siêu thị', 'Xuất bán pre-order trả góp tại siêu thị (TCĐM)']
        // Đã xóa bỏ mảng HE_SO_QUY_DOI đồ cổ. Trách nhiệm thuộc về Admin UI 100%.
    }
};