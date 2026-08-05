// src/services/reports/master/salesProcessor.js
import { config } from '../../../config.js';
import * as utils from '../../../utils.js';
import { normalize } from './utils.js';
import { dataProcessing } from '../../dataProcessing.js';
import { parseIdentity } from '../../../utils.js';

const parseMoney = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return parseFloat(String(value).replace(/,/g, '')) || 0;
};

const normalizeStr = (val) => (val || "").trim();

export const salesProcessor = {
    evaluateTransaction(row, context = null) {
        const hinhThucXuatTinhDoanhThu = context?.hinhThucXuatTinhDoanhThu || dataProcessing.getHinhThucXuatTinhDoanhThu();
        const hinhThucXuatTraGop = context?.hinhThucXuatTraGop || dataProcessing.getHinhThucXuatTraGop();
        const heSoQuyDoi = context?.heSoQuyDoi || dataProcessing.getHeSoQuyDoi();

        const thuTien = (row.trangThaiThuTien || row.TRANG_THAI_THU_TIEN || "").trim();
        const huy = (row.trangThaiHuy || row.TRANG_THAI_HUY || "").trim();
        const tra = (row.tinhTrangTra || row.TINH_TRANG_TRA || "").trim();
        const htx = row.hinhThucXuat || row.HINH_THUC_XUAT || "";
        const trangThaiXuat = normalizeStr(row.trangThaiXuat || row.TRANG_THAI_XUAT);

        const isBaseValid = thuTien === 'Đã thu' && huy === 'Chưa hủy' && tra === 'Chưa trả';
        const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(htx);

        if (!isBaseValid || !isDoanhThuHTX) {
            return { isValid: false };
        }

        const nguoiTaoRaw = row.nguoiTao || row['Người tạo'] || "";
        const msnvMatch = String(nguoiTaoRaw).match(/(\d+)/);
        const empId = msnvMatch ? msnvMatch[1].trim() : null;

        const isDaXuat = !trangThaiXuat || trangThaiXuat === 'Đã xuất' || trangThaiXuat === 'Đã giao';
        const isChuaXuat = trangThaiXuat === 'Chưa xuất';

        if (!isDaXuat && !isChuaXuat) {
            return { isValid: false };
        }

        const thanhTien = parseMoney(row.thanhTien || row.THANH_TIEN);
        const soLuong = parseInt(String(row.soLuong || row.SO_LUONG || "0"), 10) || 0;
        
        // --- PHẪU THUẬT LOGIC v3.3: DÒ TÌM ĐA CẤP (CASCADE FALLBACK) CHUẨN XÁC ---
        let heSo = 1;
        
        // Trích xuất ID từ cột Excel để đi so với kho lưu trữ (heSoQuyDoi)
        const nhomKey = row.maNhomHang ? String(row.maNhomHang).trim() : parseIdentity(row.nhomHang).id;
        const nganhKey = row.maNganhHang ? String(row.maNganhHang).trim() : parseIdentity(row.nganhHang).id;
        
        // Ưu tiên 1: Tra hệ số riêng của Nhóm Hàng
        if (heSoQuyDoi[nhomKey] !== undefined) {
            heSo = heSoQuyDoi[nhomKey];
        } 
        // Ưu tiên 2: Tra hệ số chung của Ngành Hàng
        else if (heSoQuyDoi[nganhKey] !== undefined) {
            heSo = heSoQuyDoi[nganhKey];
        }
        // Fallback: Mặc định bằng 1 nếu cả Nhóm và Ngành không có cấu hình.
        // -------------------------------------------------------------------------
        
const revenueQuyDoi = thanhTien * heSo;
        const isTraGop = hinhThucXuatTraGop.has(htx);

        return { isValid: true, empId, isDaXuat, isChuaXuat, isTraGop, thanhTien, soLuong, revenueQuyDoi };
    },

    createEmptySalesData() {
        // [PHẪU THUẬT LOGIC]: Xóa sạch rác, chỉ giữ lại các chỉ số cốt lõi và mảng thống kê động
        let data = {
            doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0,
            doanhThuChuaXuat: 0, doanhThuQuyDoiChuaXuat: 0,
            doanhThuGiaoXa: 0, doanhThuQuyDoiGiaoXa: 0,
            doanhThuTheoNganhHang: {}, doanhThuTheoNhomHang: {}, doanhThuTheoMaSanPham: {}, tongSoLuong: 0,
            _rawSalesData: []
        };
        return data;
    },

    processEmployeeSales(employee, sourceData, uiKeywords) {
        const data = this.createEmptySalesData();

        const context = {
            hinhThucXuatTinhDoanhThu: dataProcessing.getHinhThucXuatTinhDoanhThu(),
            hinhThucXuatTraGop: dataProcessing.getHinhThucXuatTraGop(),
            heSoQuyDoi: dataProcessing.getHeSoQuyDoi()
        };

        if (sourceData && Array.isArray(sourceData)) {
            sourceData.forEach((row) => {
                const evalResult = this.evaluateTransaction(row, context); 

                if (evalResult.isValid && evalResult.empId === String(employee.maNV)) {
                    if (evalResult.isDaXuat) {
                        const thanhTien = evalResult.thanhTien;
                        const soLuong = evalResult.soLuong;
                        const revenueQuyDoi = evalResult.revenueQuyDoi;
                        
                        const nhomIdObj = row.maNhomHang ? { id: row.maNhomHang, name: parseIdentity(row.nhomHang).name } : parseIdentity(row.nhomHang);
                        const nganhIdObj = row.maNganhHang ? { id: row.maNganhHang, name: parseIdentity(row.nganhHang).name } : parseIdentity(row.nganhHang);

                        const nhomHangCode = String(nhomIdObj.id).trim();
                        const rawMaSP = row.maSanPham || row.MA_SAN_PHAM || row['Mã sản phẩm'] || '';
                        const rawTenSP = row.tenSanPham || row.TEN_SAN_PHAM || row['Tên sản phẩm'] || rawMaSP;
                        const spIdObj = { id: String(rawMaSP).trim(), name: String(rawTenSP).trim() };

                        // Thu thập dữ liệu vào Dictionary tự do
                        const trackMetric = (container, idObj, rawString) => {
                            if (!idObj.id || idObj.id === 'unknown') return;
                            const key = String(idObj.id).trim();
                            if (!container[key]) {
                                container[key] = { id: key, name: idObj.name || rawString, revenue: 0, quantity: 0, revenueQuyDoi: 0 };
                            }
                            container[key].revenue += thanhTien;
                            container[key].quantity += soLuong;
                            container[key].revenueQuyDoi += revenueQuyDoi;
                        }

                        trackMetric(data.doanhThuTheoNganhHang, nganhIdObj, row.nganhHang);
                        trackMetric(data.doanhThuTheoNhomHang, nhomIdObj, row.nhomHang);
                        if (spIdObj.id) trackMetric(data.doanhThuTheoMaSanPham, spIdObj, spIdObj.name);

                        // Cộng dồn tổng
                        data.doanhThu += thanhTien;
                        data.doanhThuQuyDoi += revenueQuyDoi;
                        data.tongSoLuong += soLuong;

                        if (evalResult.isTraGop) { data.doanhThuTraGop += thanhTien; }
                        
                        // [PHẪU THUẬT LOGIC]: Loại bỏ hoàn toàn vòng lặp check nhóm QDC, ICT, CE...
                        
                        data._rawSalesData.push({
                            maNhomHang: nhomHangCode,
                            maNganhHang: String(nganhIdObj.id).trim(),
                            maSanPham: spIdObj.id,
                            nhaSanXuat: row.nhaSanXuat || row.brand || row['Hãng'] || row['Hãng sản xuất'] || row['NhaSanXuat'] || row['TEN_HANG'] || '',
                            _soLuong: soLuong,
                            _thanhTien: thanhTien,
                            _revenueQuyDoi: revenueQuyDoi
                        });
                    } else if (evalResult.isChuaXuat) {
                        data.doanhThuChuaXuat += evalResult.thanhTien;
                        data.doanhThuQuyDoiChuaXuat += evalResult.revenueQuyDoi;
                    }
                }
            });
        }

        data.donGiaTrungBinh = data.tongSoLuong > 0 ? data.doanhThu / data.tongSoLuong : 0;

        return data;
    },

    calculateStaticRatios(data) {
        // [PHẪU THUẬT LOGIC]: Xóa bỏ việc tính tĩnh các PCT ngành hàng cứng. 
        // Thay vào đó chỉ giữ lại những tỷ lệ cơ bản của dòng tiền.
        return {
            hieuQuaQuyDoi: data.doanhThu > 0 ? (data.doanhThuQuyDoi / data.doanhThu) - 1 : 0,
            tyLeTraCham: data.doanhThu > 0 ? data.doanhThuTraGop / data.doanhThu : 0
        };
    }
};