import { config } from '../../../config.js';
import * as utils from '../../../utils.js';
import { normalize } from './utils.js';
import { dataProcessing } from '../../dataProcessing.js';
import { parseIdentity } from '../../../utils.js';

// [FIX] Hàm xử lý số an toàn cho định dạng tiền tệ VN (loại bỏ dấu chấm/phẩy phân cách)
const parseSafeNumber = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Chuyển về chuỗi, loại bỏ mọi ký tự không phải số hoặc dấu trừ (cho số âm)
    const cleanStr = String(value).replace(/[^0-9-]/g, '');
    return parseFloat(cleanStr) || 0;
};

export const salesProcessor = {
    // --- KHỞI TẠO DỮ LIỆU RỖNG ---
    createEmptySalesData() {
        const PG = config.PRODUCT_GROUPS;
        let data = {
            // Tổng hợp chung
            doanhThu: 0, 
            doanhThuQuyDoi: 0, 
            doanhThuTraGop: 0,
            doanhThuChuaXuat: 0, 
            doanhThuQuyDoiChuaXuat: 0,
            doanhThuGiaoXa: 0, 
            doanhThuQuyDoiGiaoXa: 0,
            
            // Map chi tiết để tra cứu nhanh (O(1))
            doanhThuTheoNganhHang: {}, 
            doanhThuTheoNhomHang: {}, 
            
            // Quy đổi chuẩn (QDC)
            qdc: {},

            // [HARDCODED METRICS] - Các chỉ số cơ bản luôn phải có
            dtICT: 0, dtCE: 0, dtPhuKien: 0, dtGiaDung: 0, 
            dtSim: 0, dtVAS: 0, dtBaoHiem: 0, dtMLN: 0,
            
            // Chi tiết sản phẩm
            dtTivi: 0, slTivi: 0, 
            dtTuLanh: 0, slTuLanh: 0,
            dtMayGiat: 0, slMayGiat: 0, 
            dtMayLanh: 0, slMayLanh: 0,
            dtDienThoai: 0, slDienThoai: 0, 
            dtLaptop: 0, slLaptop: 0
        };

        // Init QDC Groups
        for (const key in PG.QDC_GROUPS) {
            data.qdc[key] = { sl: 0, dt: 0, dtqd: 0, name: PG.QDC_GROUPS[key].name };
        }
        return data;
    },

    // --- XỬ LÝ DOANH THU NHÂN VIÊN ---
    processEmployeeSales(employee, sourceData, uiKeywords) {
        const data = this.createEmptySalesData();
        const PG = config.PRODUCT_GROUPS;
        
        // Lấy config hệ thống
        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const hinhThucXuatTraGop = dataProcessing.getHinhThucXuatTraGop();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();

        if (sourceData && Array.isArray(sourceData)) {
            sourceData.forEach(row => {
                // Kiểm tra User ID
                const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                    
                    const hinhThucXuat = row.hinhThucXuat;
                    const trangThaiXuat = row.trangThaiXuat;
                    
                    // Logic điều kiện hợp lệ
                    const isDoanhThuHTX = !hinhThucXuat || hinhThucXuatTinhDoanhThu.has(hinhThucXuat);
                    const isDaXuat = !trangThaiXuat || trangThaiXuat.trim() === 'Đã xuất' || trangThaiXuat.trim() === 'Đã giao';

                    if (isDoanhThuHTX && isDaXuat) {
                        // [FIX] Sử dụng parseSafeNumber thay vì parseFloat trực tiếp
                        const thanhTien = parseSafeNumber(row.thanhTien);
                        const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                        const heSo = heSoQuyDoi[row.nhomHang] || 1;
                        
                        // Parse ID Nhóm/Ngành
                        const nhomIdObj = row.maNhomHang 
                            ? { id: row.maNhomHang, name: parseIdentity(row.nhomHang).name } 
                            : parseIdentity(row.nhomHang);
                        const nganhIdObj = row.maNganhHang 
                            ? { id: row.maNganhHang, name: parseIdentity(row.nganhHang).name } 
                            : parseIdentity(row.nganhHang);

                        // A. CỘNG DỒN VÀO MAP CHI TIẾT (Để dùng cho Dynamic Table / Modal)
                        const trackMetric = (container, idObj, rawString) => {
                            if (!idObj.id || idObj.id === 'unknown') return;
                            // Đảm bảo ID luôn là chuỗi để đồng nhất key
                            const key = String(idObj.id).trim();
                            if (!container[key]) {
                                container[key] = { 
                                    id: key, 
                                    name: idObj.name || rawString, 
                                    revenue: 0, quantity: 0, revenueQuyDoi: 0 
                                };
                            }
                            container[key].revenue += thanhTien;
                            container[key].quantity += soLuong;
                            container[key].revenueQuyDoi += thanhTien * heSo;
                        }

                        trackMetric(data.doanhThuTheoNganhHang, nganhIdObj, row.nganhHang);
                        trackMetric(data.doanhThuTheoNhomHang, nhomIdObj, row.nhomHang);

                        // B. CỘNG TỔNG DOANH THU CHUNG
                        data.doanhThu += thanhTien;
                        data.doanhThuQuyDoi += thanhTien * heSo;

                        if (hinhThucXuat && hinhThucXuatTraGop.has(hinhThucXuat)) {
                            data.doanhThuTraGop += thanhTien;
                        }

                        // C. PHÂN LOẠI NHÓM
                        const nhomHangCode = String(nhomIdObj.id).trim();
                        
                        // --- 1. Hardcode ID Logic (Mặc định MWG) ---
                        // Nhóm ICT
                        if (PG.DIEN_THOAI.includes(nhomHangCode) || PG.LAPTOP.includes(nhomHangCode) || (PG.TABLET && PG.TABLET.includes(nhomHangCode))) { 
                            data.dtICT += thanhTien; 
                        }
                        
                        // Nhóm CE
                        if (PG.TIVI.includes(nhomHangCode) || PG.TU_LANH.includes(nhomHangCode) || PG.MAY_GIAT.includes(nhomHangCode) || PG.MAY_LANH.includes(nhomHangCode) || (PG.DONG_HO && PG.DONG_HO.includes(nhomHangCode))) { 
                            data.dtCE += thanhTien; 
                        }
                        
                        // Nhóm Phụ Kiện
                        if (PG.PHU_KIEN && PG.PHU_KIEN.includes(nhomHangCode)) { 
                            data.dtPhuKien += thanhTien; 
                        }
                        
                        // Nhóm Gia Dụng
                        if (PG.GIA_DUNG && PG.GIA_DUNG.includes(nhomHangCode)) { 
                            data.dtGiaDung += thanhTien; 
                        }
                        
                        // Các nhóm khác
                        if (PG.MAY_LOC_NUOC && PG.MAY_LOC_NUOC.includes(nhomHangCode)) { data.dtMLN += thanhTien; }
                        if (PG.SIM && PG.SIM.includes(nhomHangCode)) { data.dtSim += thanhTien; }
                        if (PG.VAS && PG.VAS.includes(nhomHangCode)) { data.dtVAS += thanhTien; }
                        if (PG.BAO_HIEM_VAS && PG.BAO_HIEM_VAS.includes(nhomHangCode)) { data.dtBaoHiem += thanhTien; }

                        // --- 2. Dynamic Keyword Logic ---
                        const rawNhomHang = normalize(row.nhomHang);
                        const rawNganhHang = normalize(row.nganhHang);
                        const cleanNhomId = normalize(nhomHangCode);
                        const cleanNganhId = normalize(nganhIdObj.id);

                        const checkDynamic = (uiKey, hardcodeList = []) => {
                            const keywords = uiKeywords[uiKey];
                            if (!keywords || keywords.length === 0) return;

                            const isMatch = keywords.some(k => 
                                rawNhomHang.includes(k) || rawNganhHang.includes(k) || 
                                cleanNhomId === k || cleanNganhId === k
                            );

                            if (isMatch) {
                                const alreadyCounted = hardcodeList.includes(nhomHangCode);
                                if (!alreadyCounted) {
                                    data[uiKey] += thanhTien;
                                }
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

                        // --- 3. Detailed Stats ---
                        if (PG.DIEN_THOAI.includes(nhomHangCode)) { data.dtDienThoai += thanhTien; data.slDienThoai += soLuong; }
                        if (PG.LAPTOP.includes(nhomHangCode)) { data.dtLaptop += thanhTien; data.slLaptop += soLuong; }
                        if (PG.TIVI.includes(nhomHangCode)) { data.dtTivi += thanhTien; data.slTivi += soLuong; }
                        if (PG.TU_LANH.includes(nhomHangCode)) { data.dtTuLanh += thanhTien; data.slTuLanh += soLuong; }
                        if (PG.MAY_GIAT.includes(nhomHangCode)) { data.dtMayGiat += thanhTien; data.slMayGiat += soLuong; }
                        if (PG.MAY_LANH.includes(nhomHangCode)) { data.dtMayLanh += thanhTien; data.slMayLanh += soLuong; }

                        // QDC Groups
                        for (const key in PG.QDC_GROUPS) {
                            if (PG.QDC_GROUPS[key].codes.includes(nhomHangCode)) {
                                data.qdc[key].sl += soLuong; 
                                data.qdc[key].dt += thanhTien; 
                                data.qdc[key].dtqd += thanhTien * heSo;
                            }
                        }
                    } 
                    // Logic chưa xuất
                    else if (trangThaiXuat === 'Chưa xuất') {
                        const thanhTien = parseSafeNumber(row.thanhTien);
                        const heSo = heSoQuyDoi[row.nhomHang] || 1;
                        data.doanhThuChuaXuat += thanhTien;
                        data.doanhThuQuyDoiChuaXuat += thanhTien * heSo;
                    }
                }
            });
        }
        return data;
    },

    // --- TÍNH TỶ LỆ PHẦN TRĂM ---
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