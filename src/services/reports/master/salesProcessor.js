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
        const heSo = heSoQuyDoi[row.nhomHang] || 1;
        const revenueQuyDoi = row.revenueQuyDoi !== undefined ? parseMoney(row.revenueQuyDoi) : (thanhTien * heSo);
        const isTraGop = hinhThucXuatTraGop.has(htx);

        return { isValid: true, empId, isDaXuat, isChuaXuat, isTraGop, thanhTien, soLuong, revenueQuyDoi };
    },

    createEmptySalesData() {
        const PG = config.PRODUCT_GROUPS;
        let data = {
            doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0,
            doanhThuChuaXuat: 0, doanhThuQuyDoiChuaXuat: 0,
            doanhThuGiaoXa: 0, doanhThuQuyDoiGiaoXa: 0,
            doanhThuTheoNganhHang: {}, doanhThuTheoNhomHang: {}, doanhThuTheoMaSanPham: {}, tongSoLuong: 0, qdc: {},
            dtICT: 0, dtCE: 0, dtPhuKien: 0, dtGiaDung: 0, dtSim: 0, dtVAS: 0, dtBaoHiem: 0, dtMLN: 0,
            dtTivi: 0, slTivi: 0, dtTuLanh: 0, slTuLanh: 0, dtMayGiat: 0, slMayGiat: 0, 
            dtMayLanh: 0, slMayLanh: 0, dtDienThoai: 0, slDienThoai: 0, dtLaptop: 0, slLaptop: 0,
            _rawSalesData: []
        };

        if (PG && PG.QDC_GROUPS) {
            for (const key in PG.QDC_GROUPS) {
                data.qdc[key] = { sl: 0, dt: 0, dtqd: 0, name: PG.QDC_GROUPS[key].name };
            }
        }
        return data;
    },

    processEmployeeSales(employee, sourceData, uiKeywords) {
        const data = this.createEmptySalesData();
        const PG = config.PRODUCT_GROUPS;

        const context = {
            hinhThucXuatTinhDoanhThu: dataProcessing.getHinhThucXuatTinhDoanhThu(),
            hinhThucXuatTraGop: dataProcessing.getHinhThucXuatTraGop(),
            heSoQuyDoi: dataProcessing.getHeSoQuyDoi()
        };

        if (sourceData && Array.isArray(sourceData)) {
            sourceData.forEach((row, index) => {
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

                        data.doanhThu += thanhTien;
                        data.doanhThuQuyDoi += revenueQuyDoi;
                        data.tongSoLuong += soLuong;

                        if (evalResult.isTraGop) { data.doanhThuTraGop += thanhTien; }
                        
                        if (PG.DIEN_THOAI.includes(nhomHangCode) || PG.LAPTOP.includes(nhomHangCode) || (PG.TABLET && PG.TABLET.includes(nhomHangCode))) { data.dtICT += thanhTien; }
                        if (PG.TIVI.includes(nhomHangCode) || PG.TU_LANH.includes(nhomHangCode) || PG.MAY_GIAT.includes(nhomHangCode) || PG.MAY_LANH.includes(nhomHangCode) || (PG.DONG_HO && PG.DONG_HO.includes(nhomHangCode))) { data.dtCE += thanhTien; }
                        if (PG.PHU_KIEN && PG.PHU_KIEN.includes(nhomHangCode)) { data.dtPhuKien += thanhTien; }
                        if (PG.GIA_DUNG && PG.GIA_DUNG.includes(nhomHangCode)) { data.dtGiaDung += thanhTien; }
                        if (PG.MAY_LOC_NUOC && PG.MAY_LOC_NUOC.includes(nhomHangCode)) { data.dtMLN += thanhTien; }
                        if (PG.SIM && PG.SIM.includes(nhomHangCode)) { data.dtSim += thanhTien; }
                        if (PG.VAS && PG.VAS.includes(nhomHangCode)) { data.dtVAS += thanhTien; }
                        if (PG.BAO_HIEM_VAS && PG.BAO_HIEM_VAS.includes(nhomHangCode)) { data.dtBaoHiem += thanhTien; }

                        const rawNhomHang = normalize(row.nhomHang);
                        const rawNganhHang = normalize(row.nganhHang);
                        const cleanNhomId = normalize(nhomHangCode);
                        const cleanNganhId = normalize(nganhIdObj.id);

                        const checkDynamic = (uiKey, hardcodeList = []) => {
                            const keywords = uiKeywords[uiKey];
                            if (!keywords || keywords.length === 0) return;
                            const isMatch = keywords.some(k => rawNhomHang.includes(k) || rawNganhHang.includes(k) || cleanNhomId === k || cleanNganhId === k);
                            if (isMatch && !hardcodeList.includes(nhomHangCode)) {
                                data[uiKey] += thanhTien;
                            }
                        };
                        
                        checkDynamic('dtICT', [...PG.DIEN_THOAI, ...PG.LAPTOP, ...(PG.TABLET || [])]); 
                        checkDynamic('dtCE', [...PG.TIVI, ...PG.TU_LANH, ...PG.MAY_GIAT, ...PG.MAY_LANH, ...(PG.DONG_HO || [])]); 
                        checkDynamic('dtPhuKien', PG.PHU_KIEN || []);
                        checkDynamic('dtGiaDung', PG.GIA_DUNG || []);
                        checkDynamic('dtMLN', PG.MAY_LOC_NUOC || []); 
                        checkDynamic('dtSim', PG.SIM || []);
                        checkDynamic('dtVAS', PG.VAS || []); 
                        checkDynamic('dtBaoHiem', PG.BAO_HIEM_VAS || []);

                        if (PG.DIEN_THOAI.includes(nhomHangCode)) { data.dtDienThoai += thanhTien; data.slDienThoai += soLuong; }
                        if (PG.LAPTOP.includes(nhomHangCode)) { data.dtLaptop += thanhTien; data.slLaptop += soLuong; }
                        if (PG.TIVI.includes(nhomHangCode)) { data.dtTivi += thanhTien; data.slTivi += soLuong; }
                        if (PG.TU_LANH.includes(nhomHangCode)) { data.dtTuLanh += thanhTien; data.slTuLanh += soLuong; }
                        if (PG.MAY_GIAT.includes(nhomHangCode)) { data.dtMayGiat += thanhTien; data.slMayGiat += soLuong; }
                        if (PG.MAY_LANH.includes(nhomHangCode)) { data.dtMayLanh += thanhTien; data.slMayLanh += soLuong; }

                        for (const key in PG.QDC_GROUPS) {
                            if (PG.QDC_GROUPS[key].codes.includes(nhomHangCode)) {
                                data.qdc[key].sl += soLuong; 
                                data.qdc[key].dt += thanhTien; 
                                data.qdc[key].dtqd += revenueQuyDoi;
                            }
                        }

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
        data.donGiaTivi = data.slTivi > 0 ? data.dtTivi / data.slTivi : 0;
        data.donGiaTuLanh = data.slTuLanh > 0 ? data.dtTuLanh / data.slTuLanh : 0;
        data.donGiaMayGiat = data.slMayGiat > 0 ? data.dtMayGiat / data.slMayGiat : 0;
        data.donGiaMayLanh = data.slMayLanh > 0 ? data.dtMayLanh / data.slMayLanh : 0;
        data.donGiaDienThoai = data.slDienThoai > 0 ? data.dtDienThoai / data.slDienThoai : 0;
        data.donGiaLaptop = data.slLaptop > 0 ? data.dtLaptop / data.slLaptop : 0;

        return data;
    },

    calculateStaticRatios(data) {
        const totalRevenue = data.doanhThu > 0 ? data.doanhThu : 1;
        return {
            pctPhuKien: data.dtPhuKien / totalRevenue,
            pctGiaDung: data.dtGiaDung / totalRevenue,
            pctMLN: data.dtMLN / totalRevenue,
            pctSim: data.dtSim / totalRevenue,
            pctVAS: data.dtVAS / totalRevenue,
            pctBaoHiem: data.dtBaoHiem / totalRevenue,
            hieuQuaQuyDoi: data.doanhThu > 0 ? (data.doanhThuQuyDoi / data.doanhThu) - 1 : 0,
            tyLeTraCham: data.doanhThu > 0 ? data.doanhThuTraGop / data.doanhThu : 0
        };
    }
};