import { config } from '../../../config.js';
import * as utils from '../../../utils.js';
import { normalize } from './utils.js';
import { dataProcessing } from '../../dataProcessing.js';
import { parseIdentity } from '../../../utils.js';

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
                        const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
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
                            if (!container[idObj.id]) {
                                container[idObj.id] = { 
                                    id: idObj.id, 
                                    name: idObj.name || rawString, 
                                    revenue: 0, quantity: 0, revenueQuyDoi: 0 
                                };
                            }
                            container[idObj.id].revenue += thanhTien;
                            container[idObj.id].quantity += soLuong;
                            container[idObj.id].revenueQuyDoi += thanhTien * heSo;
                        }

                        trackMetric(data.doanhThuTheoNganhHang, nganhIdObj, row.nganhHang);
                        trackMetric(data.doanhThuTheoNhomHang, nhomIdObj, row.nhomHang);

                        // B. CỘNG TỔNG DOANH THU CHUNG
                        data.doanhThu += thanhTien;
                        data.doanhThuQuyDoi += thanhTien * heSo;

                        if (hinhThucXuat && hinhThucXuatTraGop.has(hinhThucXuat)) {
                            data.doanhThuTraGop += thanhTien;
                        }

                        // C. PHÂN LOẠI NHÓM (FIX LOGIC MỚI: Độc lập hoàn toàn, không dùng if/else if)
                        const nhomHangCode = nhomIdObj.id;
                        
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
                        
                        // Nhóm Gia Dụng (Tách riêng, không phụ thuộc CE hay ICT)
                        if (PG.GIA_DUNG && PG.GIA_DUNG.includes(nhomHangCode)) { 
                            data.dtGiaDung += thanhTien; 
                        }
                        
                        // Các nhóm khác
                        if (PG.MAY_LOC_NUOC && PG.MAY_LOC_NUOC.includes(nhomHangCode)) { data.dtMLN += thanhTien; }
                        if (PG.SIM && PG.SIM.includes(nhomHangCode)) { data.dtSim += thanhTien; }
                        if (PG.VAS && PG.VAS.includes(nhomHangCode)) { data.dtVAS += thanhTien; }
                        if (PG.BAO_HIEM_VAS && PG.BAO_HIEM_VAS.includes(nhomHangCode)) { data.dtBaoHiem += thanhTien; }

                        // --- 2. Dynamic Keyword Logic (Bổ sung từ Admin Config) ---
                        // Logic: Nếu Admin định nghĩa thêm keywords (hoặc ID) cho các nhóm này, thì cộng thêm vào.
                        // Lưu ý: Cần kiểm tra để tránh cộng trùng nếu ID đó đã nằm trong list Hardcode phía trên.
                        
                        const rawNhomHang = normalize(row.nhomHang);
                        const rawNganhHang = normalize(row.nganhHang);
                        const cleanNhomId = normalize(nhomHangCode);
                        const cleanNganhId = normalize(nganhIdObj.id);

                        const checkDynamic = (uiKey, hardcodeList = []) => {
                            const keywords = uiKeywords[uiKey];
                            if (!keywords || keywords.length === 0) return;

                            // Check xem sản phẩm này có khớp với bất kỳ keyword nào không
                            const isMatch = keywords.some(k => 
                                rawNhomHang.includes(k) || rawNganhHang.includes(k) || 
                                cleanNhomId === k || cleanNganhId === k
                            );

                            if (isMatch) {
                                // Kiểm tra xem đã được cộng ở bước Hardcode chưa
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

                        // --- 3. Detailed Stats (Cho Popup chi tiết) ---
                        if (PG.DIEN_THOAI.includes(nhomHangCode)) { data.dtDienThoai += thanhTien; data.slDienThoai += soLuong; }
                        if (PG.LAPTOP.includes(nhomHangCode)) { data.dtLaptop += thanhTien; data.slLaptop += soLuong; }
                        if (PG.TIVI.includes(nhomHangCode)) { data.dtTivi += thanhTien; data.slTivi += soLuong; }
                        if (PG.TU_LANH.includes(nhomHangCode)) { data.dtTuLanh += thanhTien; data.slTuLanh += soLuong; }
                        if (PG.MAY_GIAT.includes(nhomHangCode)) { data.dtMayGiat += thanhTien; data.slMayGiat += soLuong; }
                        if (PG.MAY_LANH.includes(nhomHangCode)) { data.dtMayLanh += thanhTien; data.slMayLanh += soLuong; }

                        // QDC Groups (Quy đổi chuẩn)
                        for (const key in PG.QDC_GROUPS) {
                            if (PG.QDC_GROUPS[key].codes.includes(nhomHangCode)) {
                                data.qdc[key].sl += soLuong; 
                                data.qdc[key].dt += thanhTien; 
                                data.qdc[key].dtqd += thanhTien * heSo;
                            }
                        }
                    } 
                    // Logic chưa xuất (Giữ nguyên)
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

    // --- TÍNH TỶ LỆ PHẦN TRĂM ---
    calculateStaticRatios(data) {
        const totalRevenue = data.doanhThu > 0 ? data.doanhThu : 1;
        // Các trường này để hiển thị ở bảng Fixed Column nếu người dùng vẫn dùng logic cũ
        // Nhưng tốt nhất nên dựa vào Dynamic Columns
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