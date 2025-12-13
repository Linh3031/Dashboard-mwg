// src/services/reports/master/salesProcessor.js
import { config } from '../../../config.js';
import * as utils from '../../../utils.js';
import { normalize } from './utils.js';
import { dataProcessing } from '../../dataProcessing.js';

export const salesProcessor = {
    // Khởi tạo object data rỗng cho 1 nhân viên
    createEmptySalesData() {
        const PG = config.PRODUCT_GROUPS;
        let data = {
            doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0,
            doanhThuChuaXuat: 0, doanhThuQuyDoiChuaXuat: 0,
            doanhThuGiaoXa: 0, doanhThuQuyDoiGiaoXa: 0,
            
            doanhThuTheoNganhHang: {}, 
            doanhThuTheoNhomHang: {}, 
            
            qdc: {},
            dtICT: 0, dtCE: 0, dtPhuKien: 0, dtGiaDung: 0, 
            dtSim: 0, dtVAS: 0, dtBaoHiem: 0, dtMLN: 0,

            dtTivi: 0, slTivi: 0, dtTuLanh: 0, slTuLanh: 0,
            dtMayGiat: 0, slMayGiat: 0, dtMayLanh: 0, slMayLanh: 0,
            dtDienThoai: 0, slDienThoai: 0, dtLaptop: 0, slLaptop: 0
        };

        for (const key in PG.QDC_GROUPS) {
            data.qdc[key] = { sl: 0, dt: 0, dtqd: 0, name: PG.QDC_GROUPS[key].name };
        }
        return data;
    },

    // Hàm core xử lý dữ liệu bán hàng cho 1 nhân viên
    processEmployeeSales(employee, sourceData, uiKeywords) {
        const data = this.createEmptySalesData();
        const PG = config.PRODUCT_GROUPS;
        
        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const hinhThucXuatTraGop = dataProcessing.getHinhThucXuatTraGop();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();

        if (sourceData && Array.isArray(sourceData)) {
            sourceData.forEach(row => {
                const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                    
                    const hinhThucXuat = row.hinhThucXuat;
                    const trangThaiXuat = row.trangThaiXuat;
                    
                    const isDoanhThuHTX = !hinhThucXuat || hinhThucXuatTinhDoanhThu.has(hinhThucXuat);
                    const isDaXuat = !trangThaiXuat || trangThaiXuat.trim() === 'Đã xuất' || trangThaiXuat.trim() === 'Đã giao';

                    if (isDoanhThuHTX && isDaXuat) {
                        const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                        const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                        const heSo = heSoQuyDoi[row.nhomHang] || 1;
                        
                        const nhomHangCode = String(row.nhomHang || '').match(/^\d+/)?.[0] || null;
                        const rawNhomHang = normalize(row.nhomHang);
                        const rawNganhHang = normalize(row.nganhHang);

                        // Tracking chi tiết
                        const trackMetric = (container, name) => {
                            if (!name) return;
                            const cleanName = utils.cleanCategoryName(name); 
                            if (!container[cleanName]) {
                                container[cleanName] = { name: cleanName, revenue: 0, quantity: 0, revenueQuyDoi: 0 };
                            }
                            container[cleanName].revenue += thanhTien;
                            container[cleanName].quantity += soLuong;
                            container[cleanName].revenueQuyDoi += thanhTien * heSo;
                        }
                        trackMetric(data.doanhThuTheoNganhHang, row.nganhHang);
                        trackMetric(data.doanhThuTheoNhomHang, row.nhomHang);

                        // Cộng tổng
                        data.doanhThu += thanhTien;
                        data.doanhThuQuyDoi += thanhTien * heSo;

                        if (hinhThucXuat && hinhThucXuatTraGop.has(hinhThucXuat)) {
                            data.doanhThuTraGop += thanhTien;
                        }

                        // Phân loại nhóm hàng
                        let mapped = false;
                        // Hardcode ID Check
                        if (PG.DIEN_THOAI.includes(nhomHangCode) || PG.LAPTOP.includes(nhomHangCode) || PG.TABLET && PG.TABLET.includes(nhomHangCode)) { data.dtICT += thanhTien; mapped = true; }
                        if (PG.TIVI.includes(nhomHangCode) || PG.TU_LANH.includes(nhomHangCode) || PG.MAY_GIAT.includes(nhomHangCode) || PG.MAY_LANH.includes(nhomHangCode) || PG.DONG_HO && PG.DONG_HO.includes(nhomHangCode)) { data.dtCE += thanhTien; mapped = true; }
                        if (PG.PHU_KIEN && PG.PHU_KIEN.includes(nhomHangCode)) { data.dtPhuKien += thanhTien; mapped = true; }
                        if (PG.GIA_DUNG && PG.GIA_DUNG.includes(nhomHangCode)) { data.dtGiaDung += thanhTien; mapped = true; }
                        if (PG.MAY_LOC_NUOC && PG.MAY_LOC_NUOC.includes(nhomHangCode)) { data.dtMLN += thanhTien; mapped = true; }
                        if (PG.SIM && PG.SIM.includes(nhomHangCode)) { data.dtSim += thanhTien; mapped = true; }
                        if (PG.VAS && PG.VAS.includes(nhomHangCode)) { data.dtVAS += thanhTien; mapped = true; }
                        if (PG.BAO_HIEM_VAS && PG.BAO_HIEM_VAS.includes(nhomHangCode)) { data.dtBaoHiem += thanhTien; mapped = true; }

                        // Dynamic Keyword Check
                        if (!mapped) {
                            const checkDynamic = (uiKey) => {
                                const keywords = uiKeywords[uiKey];
                                if (keywords && keywords.some(k => rawNhomHang.includes(k) || rawNganhHang.includes(k))) {
                                    data[uiKey] += thanhTien;
                                }
                            };
                            checkDynamic('dtICT'); checkDynamic('dtCE'); checkDynamic('dtPhuKien');
                            checkDynamic('dtGiaDung'); checkDynamic('dtMLN'); checkDynamic('dtSim');
                            checkDynamic('dtVAS'); checkDynamic('dtBaoHiem');
                        }

                        // Detailed Stats
                        if (PG.DIEN_THOAI.includes(nhomHangCode)) { data.dtDienThoai += thanhTien; data.slDienThoai += soLuong; }
                        if (PG.LAPTOP.includes(nhomHangCode)) { data.dtLaptop += thanhTien; data.slLaptop += soLuong; }
                        if (PG.TIVI.includes(nhomHangCode)) { data.dtTivi += thanhTien; data.slTivi += soLuong; }
                        if (PG.TU_LANH.includes(nhomHangCode)) { data.dtTuLanh += thanhTien; data.slTuLanh += soLuong; }
                        if (PG.MAY_GIAT.includes(nhomHangCode)) { data.dtMayGiat += thanhTien; data.slMayGiat += soLuong; }
                        if (PG.MAY_LANH.includes(nhomHangCode)) { data.dtMayLanh += thanhTien; data.slMayLanh += soLuong; }

                        // QDC Check
                        for (const key in PG.QDC_GROUPS) {
                            if (PG.QDC_GROUPS[key].codes.includes(nhomHangCode)) {
                                data.qdc[key].sl += soLuong; 
                                data.qdc[key].dt += thanhTien; 
                                data.qdc[key].dtqd += thanhTien * heSo;
                            }
                        }
                    } 
                    else if (trangThaiXuat === 'Chưa xuất') {
                        const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                        const heSo = heSoQuyDoi[row.nhomHang] || 1;
                        data.doanhThuChuaXuat += thanhTien;
                        data.doanhThuQuyDoiChuaXuat += thanhTien * heSo;
                    }
                }
            });
        }
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