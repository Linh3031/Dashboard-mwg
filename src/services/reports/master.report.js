// src/services/reports/master.report.js
// Version 2.4 - Fix Macro Group Logic (Clean Name Matching & Fallback)
import { get } from 'svelte/store';
import { config } from '../../config.js';
import * as utils from '../../utils.js';
import { dataProcessing } from '../dataProcessing.js';
import {
    danhSachNhanVien,
    employeeNameToMaNVMap,
    thuongNongData,
    thuongERPData,
    thuongNongDataThangTruoc,
    thuongERPDataThangTruoc,
    macroCategoryConfig,
    macroProductGroupConfig,
    efficiencyConfig
} from '../../stores.js';

export const masterReportLogic = {
    generateMasterReportData: (sourceData, goalSettings, isRealtime = false) => {
        const $danhSachNhanVien = get(danhSachNhanVien);
        if ($danhSachNhanVien.length === 0) return [];

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const hinhThucXuatTraGop = dataProcessing.getHinhThucXuatTraGop();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();
        const PG = config.PRODUCT_GROUPS; 
        const gioCongByMSNV = dataProcessing.processGioCongData();
        
        const $macroCategoryConfig = get(macroCategoryConfig) || [];
        const $macroProductGroupConfig = get(macroProductGroupConfig) || [];
        const $efficiencyConfig = get(efficiencyConfig) || [];

        // 1. Xây dựng Map tra cứu nhanh: Item -> Macro Name
        // (Gộp cả Category Config và Product Group Config vào chung 1 map để tra cứu)
        const itemToMacroMap = {};
        const macroToItemsMap = {}; // Dùng cho efficiency calculation sau này

        const buildMap = (configs) => {
            configs.forEach(macro => {
                if (macro.items && Array.isArray(macro.items)) {
                    // Lưu danh sách items đã clean cho macro này
                    macroToItemsMap[macro.name] = macro.items.map(i => utils.cleanCategoryName(i));
                    
                    // Map ngược từ item -> macro name
                    macro.items.forEach(item => {
                        const cleanName = utils.cleanCategoryName(item);
                        itemToMacroMap[cleanName] = macro.name; 
                    });
                }
            });
        };

        buildMap($macroCategoryConfig);
        buildMap($macroProductGroupConfig);

        // 2. Hàm kiểm tra một dòng dữ liệu có thuộc Macro Group (ICT, CE...) hay không
        const checkMacroGroup = (targetMacroName, nhomHangCode, cleanNhomHang, cleanNganhHang, nganhHangCode) => {
            // A. Ưu tiên 1: Check theo cấu hình Admin (Dựa trên tên đã làm sạch)
            // Check Nhóm hàng
            if (itemToMacroMap[cleanNhomHang] === targetMacroName) return true;
            // Check Ngành hàng
            if (itemToMacroMap[cleanNganhHang] === targetMacroName) return true;

            // B. Ưu tiên 2: Fallback về Config cứng (Dựa trên mã Code)
            // Giúp hệ thống vẫn chạy đúng nếu Admin chưa khai báo gì
            const pgKeyMap = {
                'ICT': 'ICT',
                'CE': 'CE',
                'Phụ kiện': 'PHU_KIEN',
                'Gia dụng': 'GIA_DUNG',
                'Máy lọc nước': 'MAY_LOC_NUOC'
            };
            const configKey = pgKeyMap[targetMacroName];
            
            if (configKey && PG[configKey]) {
                const codes = Array.isArray(PG[configKey]) ? PG[configKey] : [PG[configKey]];
                // Check code nhóm hàng
                if (codes.includes(nhomHangCode)) return true;
                // Check code ngành hàng (cho các trường hợp đặc biệt)
                if (codes.includes(nganhHangCode)) return true;
            }

            return false;
        };

        const $thuongNongData = get(thuongNongData);
        const $employeeNameToMaNVMap = get(employeeNameToMaNVMap);
        const $thuongNongDataThangTruoc = get(thuongNongDataThangTruoc);
        const $thuongERPData = get(thuongERPData);
        const $thuongERPDataThangTruoc = get(thuongERPDataThangTruoc);

        const thuongNongByMSNV = {};
        $thuongNongData.forEach(row => {
            const maNV = String(row.maNV || '').trim();
            const hoTen = String(row.hoTen || '').trim().replace(/\s+/g, ' ');
            let foundMaNV = maNV || $employeeNameToMaNVMap.get(hoTen.toLowerCase()) || null;
            if (foundMaNV) {
                const diemThuongValue = parseFloat(String(row.diemThuong || '0').replace(/,/g, '')) || 0;
                thuongNongByMSNV[foundMaNV] = (thuongNongByMSNV[foundMaNV] || 0) + diemThuongValue;
            }
        });

        const thuongNongThangTruocByMSNV = {};
        $thuongNongDataThangTruoc.forEach(row => {
            const maNV = String(row.maNV || '').trim();
            const hoTen = String(row.hoTen || '').trim().replace(/\s+/g, ' ');
            let foundMaNV = maNV || $employeeNameToMaNVMap.get(hoTen.toLowerCase()) || null;
            if (foundMaNV) {
                const diemThuongValue = parseFloat(String(row.diemThuong || '0').replace(/,/g, '')) || 0;
                thuongNongThangTruocByMSNV[foundMaNV] = (thuongNongThangTruocByMSNV[foundMaNV] || 0) + diemThuongValue;
            }
        });

        return $danhSachNhanVien.map((employee) => {
            let data = {
                doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0, doanhThuTraGopQuyDoi: 0,
                doanhThuChuaXuat: 0, doanhThuQuyDoiChuaXuat: 0,
                doanhThuGiaoXa: 0, doanhThuQuyDoiGiaoXa: 0,
                dtICT: 0, dtCE: 0, dtPhuKien: 0, dtGiaDung: 0, dtMLN: 0,
                slICT: 0, dtBaoHiem: 0, slBaoHiem: 0,
                slPhuKien: 0, slGiaDung: 0, slCE: 0, slPinSDP: 0, slCamera: 0,
                slTaiNgheBLT: 0, slNoiChien: 0, slMLN: 0, slRobotHB: 0,
                slBH1d1: 0, slBHXM: 0, slBHRV: 0, slBHMR: 0,
                dtTivi: 0, slTivi: 0, dtTuLanh: 0, slTuLanh: 0,
                dtMayGiat: 0, slMayGiat: 0, dtMayLanh: 0, slMayLanh: 0,
                dtDienThoai: 0, slDienThoai: 0, dtLaptop: 0, slLaptop: 0,
                doanhThuTheoNganhHang: {}, 
                doanhThuTheoNhomHang: {}, 
                dynamicMetrics: {},
                slSimOnline: 0, slUDDD: 0, slBaoHiemVAS: 0, slSmartphone: 0, slBaoHiemDenominator: 0,
                qdc: {}
            };

            for (const key in PG.QDC_GROUPS) data.qdc[key] = { sl: 0, dt: 0, dtqd: 0, name: PG.QDC_GROUPS[key].name };

            sourceData.forEach(row => {
                const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                    const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
                    const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' && (row.trangThaiHuy || "").trim() === 'Chưa hủy' && (row.tinhTrangTra || "").trim() === 'Chưa trả';

                    if (isBaseValid && isDoanhThuHTX) {
                        const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                        if(isNaN(thanhTien)) return;

                        const heSo = heSoQuyDoi[row.nhomHang] || 1;
                        const trangThaiXuat = (row.trangThaiXuat || "").trim();

                        // --- TRÍCH XUẤT VÀ LÀM SẠCH DỮ LIỆU ĐỂ SO SÁNH ---
                        const nhomHangCode = String(row.nhomHang || '').match(/^\d+/)?.[0] || null;
                        const nganhHangCode = String(row.nganhHang || '').match(/^\d+/)?.[0] || null;
                        
                        const nhomHangNameClean = utils.cleanCategoryName(row.nhomHang); // VD: "Tivi Led"
                        const nganhHangNameClean = utils.cleanCategoryName(row.nganhHang); // VD: "Điện Tử"

                        // Kiểm tra thuộc nhóm nào bằng hàm checkMacroGroup mới
                        const isICT = checkMacroGroup('ICT', nhomHangCode, nhomHangNameClean, nganhHangNameClean, nganhHangCode);
                        const isCE = checkMacroGroup('CE', nhomHangCode, nhomHangNameClean, nganhHangNameClean, nganhHangCode);
                        const isPhuKien = checkMacroGroup('Phụ kiện', nhomHangCode, nhomHangNameClean, nganhHangNameClean, nganhHangCode);
                        const isGiaDung = checkMacroGroup('Gia dụng', nhomHangCode, nhomHangNameClean, nganhHangNameClean, nganhHangCode);
                        const isMLN = checkMacroGroup('Máy lọc nước', nhomHangCode, nhomHangNameClean, nganhHangNameClean, nganhHangCode);

                        if (trangThaiXuat === 'Chưa xuất') {
                            data.doanhThuChuaXuat += thanhTien;
                            data.doanhThuQuyDoiChuaXuat += thanhTien * heSo;
                        } else if (trangThaiXuat === 'Đã xuất') {
                            const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                            if(isNaN(soLuong)) return;

                            data.doanhThu += thanhTien;
                            data.doanhThuQuyDoi += thanhTien * heSo;

                            if (isRealtime && row.ngayTao && row.ngayHenGiao) {
                                const diffTime = row.ngayHenGiao - row.ngayTao;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                if (diffDays >= 2) {
                                    data.doanhThuGiaoXa += thanhTien;
                                    data.doanhThuQuyDoiGiaoXa += thanhTien * heSo;
                                }
                            }

                            if (hinhThucXuatTraGop.has(row.hinhThucXuat)) { 
                                data.doanhThuTraGop += thanhTien; 
                                data.doanhThuTraGopQuyDoi += thanhTien * heSo; 
                            }

                            const trackMetric = (container, name) => {
                                if (!name) return;
                                if (!container[name]) container[name] = { name: name, revenue: 0, quantity: 0, revenueQuyDoi: 0 };
                                container[name].revenue += thanhTien;
                                container[name].quantity += soLuong;
                                container[name].revenueQuyDoi += thanhTien * heSo;
                            }
                            
                            trackMetric(data.doanhThuTheoNganhHang, nganhHangNameClean);
                            trackMetric(data.doanhThuTheoNhomHang, nhomHangNameClean);

                            // Cộng dồn vào các nhóm lớn
                            if (isICT) { data.dtICT += thanhTien; data.slICT += soLuong; }
                            if (isCE) { data.dtCE += thanhTien; data.slCE += soLuong; }
                            if (isPhuKien) { data.dtPhuKien += thanhTien; data.slPhuKien += soLuong; }
                            if (isGiaDung) { data.dtGiaDung += thanhTien; data.slGiaDung += soLuong; }
                            if (isMLN) { data.dtMLN += thanhTien; data.slMLN += soLuong; }

                            // Logic cũ cho các nhóm con cụ thể (vẫn giữ để tính đơn giá chi tiết)
                            if (PG.DIEN_THOAI.includes(nhomHangCode)) { data.dtDienThoai += thanhTien; data.slDienThoai += soLuong; }
                            if (PG.LAPTOP.includes(nhomHangCode)) { data.dtLaptop += thanhTien; data.slLaptop += soLuong; }
                            if (PG.TIVI.includes(nhomHangCode)) { data.dtTivi += thanhTien; data.slTivi += soLuong; }
                            if (PG.TU_LANH.includes(nhomHangCode)) { data.dtTuLanh += thanhTien; data.slTuLanh += soLuong; }
                            if (PG.MAY_GIAT.includes(nhomHangCode)) { data.dtMayGiat += thanhTien; data.slMayGiat += soLuong; }
                            if (PG.MAY_LANH.includes(nhomHangCode)) { data.dtMayLanh += thanhTien; data.slMayLanh += soLuong; }

                            const loaiBaoHiem = dataProcessing.classifyInsurance(row.tenSanPham);
                            if (loaiBaoHiem) {
                                data.dtBaoHiem += thanhTien; data.slBaoHiem += soLuong;
                                if (loaiBaoHiem === 'BH1d1') data.slBH1d1 += soLuong;
                                if (loaiBaoHiem === 'BHXM') data.slBHXM += soLuong;
                                if (loaiBaoHiem === 'BHRV') data.slBHRV += soLuong;
                                if (loaiBaoHiem === 'BHMR') data.slBHMR += soLuong;
                            }
                            
                            // Các nhóm QĐC và nhóm nhỏ khác
                            if (nhomHangCode === PG.PIN_SDP) data.slPinSDP += soLuong;
                            if (nhomHangCode === PG.CAMERA_TRONG_NHA || nhomHangCode === PG.CAMERA_NGOAI_TROI) data.slCamera += soLuong;
                            if (nhomHangCode === PG.TAI_NGHE_BLT) data.slTaiNgheBLT += soLuong;
                            if (nhomHangCode === PG.NOI_CHIEN) data.slNoiChien += soLuong;
                            if (nhomHangCode === PG.ROBOT_HB) data.slRobotHB += soLuong;

                            if (PG.SIM.includes(nhomHangCode)) data.slSimOnline += soLuong;
                            if (PG.VAS.includes(nhomHangCode)) data.slUDDD += soLuong;
                            if (PG.SMARTPHONE.includes(nhomHangCode)) data.slSmartphone += soLuong;
                            if (PG.BAO_HIEM_VAS.includes(nhomHangCode)) data.slBaoHiemVAS += soLuong;
                            if (PG.BAO_HIEM_DENOMINATOR.includes(nhomHangCode)) data.slBaoHiemDenominator += soLuong;
                            
                            for (const key in PG.QDC_GROUPS) {
                                if (PG.QDC_GROUPS[key].codes.includes(nhomHangCode)) {
                                    data.qdc[key].sl += soLuong; 
                                    data.qdc[key].dt += thanhTien; 
                                    data.qdc[key].dtqd += thanhTien * heSo;
                                }
                            }
                        }
                    }
                }
            });

            // Tính toán Dynamic Metrics (Cấu hình Hiệu quả/Đơn giá)
            if ($efficiencyConfig && $efficiencyConfig.length > 0) {
                $efficiencyConfig.forEach(cfg => {
                    const sumValues = (listNames) => {
                        let total = 0;
                        listNames.forEach(name => {
                            // 1. Bung items nếu là Macro
                            const itemsToSum = macroToItemsMap[name] || [utils.cleanCategoryName(name)];
                            
                            itemsToSum.forEach(cleanName => {
                                // 2. Thử tìm trong Ngành Hàng
                                let item = data.doanhThuTheoNganhHang[cleanName];
                                // 3. Nếu không có, tìm trong Nhóm Hàng
                                if (!item) {
                                    item = data.doanhThuTheoNhomHang[cleanName];
                                }

                                if (item) {
                                    if (cfg.typeA === 'SL' || (cfg.type === 'UNIT_PRICE' && cfg.typeB === 'SL')) {
                                         // Logic cũ hoặc logic đơn giá (Mẫu là SL)
                                    }
                                    
                                    // Xác định giá trị cần cộng
                                    // Lưu ý: Hàm này đang được dùng chung, nên cần check kỹ loại
                                    // Logic này được gọi 2 lần: 1 lần cho Tử (typeA), 1 lần cho Mẫu (typeB)
                                    // Chúng ta cần truyền loại dữ liệu vào hàm sumValues để biết cộng gì
                                }
                            });
                        });
                        return total;
                    };
                    
                    // Helper mới xử lý chính xác loại dữ liệu
                    const calcGroupValue = (groupList, valueType) => {
                        let total = 0;
                        groupList.forEach(name => {
                            const itemsToSum = macroToItemsMap[name] || [utils.cleanCategoryName(name)];
                            itemsToSum.forEach(cleanName => {
                                let item = data.doanhThuTheoNganhHang[cleanName] || data.doanhThuTheoNhomHang[cleanName];
                                if (item) {
                                    if (valueType === 'SL') total += item.quantity;
                                    else if (valueType === 'DTQD') total += item.revenueQuyDoi;
                                    else total += item.revenue; // DTTL
                                }
                            });
                        });
                        return total;
                    };

                    const numVal = calcGroupValue(cfg.groupA || [], cfg.typeA || cfg.type); // type cũ là DTTL/SL
                    const denVal = calcGroupValue(cfg.groupB || [], cfg.typeB || 'DTTL'); // type cũ mặc định mẫu là DTTL

                    data.dynamicMetrics[cfg.id] = {
                        value: denVal > 0 ? numVal / denVal : 0,
                        target: cfg.target,
                        label: cfg.label
                    };
                });
            }

            // Tính toán các chỉ số dẫn xuất
            const hieuQuaQuyDoi = data.doanhThu > 0 ? (data.doanhThuQuyDoi / data.doanhThu) - 1 : 0;
            const tyLeTraCham = data.doanhThu > 0 ? data.doanhThuTraGop / data.doanhThu : 0;
            
            // Fix lỗi chia cho 0
            data.slICT = data.slICT || (data.slDienThoai + data.slLaptop); 
            
            const pctPhuKien = data.dtICT > 0 ? data.dtPhuKien / data.dtICT : 0;
            const pctGiaDung = data.dtCE > 0 ? data.dtGiaDung / data.dtCE : 0;
            const pctMLN = data.dtCE > 0 ? data.dtMLN / data.dtCE : 0;
            const pctSim = data.slSmartphone > 0 ? data.slSimOnline / data.slSmartphone : 0;
            const pctVAS = data.slSmartphone > 0 ? data.slUDDD / data.slSmartphone : 0;
            const pctBaoHiem = data.slBaoHiemDenominator > 0 ? data.slBaoHiemVAS / data.slBaoHiemDenominator : 0;
            
            // Tính đơn giá chi tiết
            data.donGiaTivi = data.slTivi > 0 ? data.dtTivi / data.slTivi : 0;
            data.donGiaTuLanh = data.slTuLanh > 0 ? data.dtTuLanh / data.slTuLanh : 0;
            data.donGiaMayGiat = data.slMayGiat > 0 ? data.dtMayGiat / data.slMayGiat : 0;
            data.donGiaMayLanh = data.slMayLanh > 0 ? data.dtMayLanh / data.slMayLanh : 0;
            data.donGiaDienThoai = data.slDienThoai > 0 ? data.dtDienThoai / data.slDienThoai : 0;
            data.donGiaLaptop = data.slLaptop > 0 ? data.dtLaptop / data.slLaptop : 0;
            
            const totalQuantity = Object.values(data.doanhThuTheoNganhHang).reduce((sum, category) => sum + category.quantity, 0);
            const donGiaTrungBinh = totalQuantity > 0 ? data.doanhThu / totalQuantity : 0;

            const gioCong = gioCongByMSNV[employee.maNV] || 0;
            const thuongNong = thuongNongByMSNV[employee.maNV] || 0;
            const erpEntry = $thuongERPData.find(e => e.name.includes(employee.hoTen));
            const thuongERP = erpEntry ? parseFloat(erpEntry.bonus.replace(/,/g, '')) : 0;
            const tongThuNhap = thuongNong + thuongERP;
            
            const today = new Date();
            const currentDay = today.getDate();
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            let thuNhapDuKien = 0;
            if (currentDay > 1) thuNhapDuKien = (tongThuNhap / (currentDay - 1)) * daysInMonth;
            else if (currentDay === 1) thuNhapDuKien = tongThuNhap * daysInMonth;

            const thuongNongThangTruoc = thuongNongThangTruocByMSNV[employee.maNV] || 0;
            const erpEntryThangTruoc = $thuongERPDataThangTruoc.find(e => e.name.includes(employee.hoTen));
            const thuongERPThangTruoc = erpEntryThangTruoc ? parseFloat(erpEntryThangTruoc.bonus.replace(/,/g, '')) : 0;
            const thuNhapThangTruoc = thuongNongThangTruoc + thuongERPThangTruoc;
            const chenhLechThuNhap = thuNhapDuKien - thuNhapThangTruoc;

            return { 
                ...employee, ...data, 
                gioCong, thuongNong, thuongERP, tongThuNhap, thuNhapDuKien, thuNhapThangTruoc, chenhLechThuNhap, 
                hieuQuaQuyDoi, tyLeTraCham, pctPhuKien, pctGiaDung, pctMLN, pctSim, pctVAS, pctBaoHiem, 
                donGiaTrungBinh, mucTieu: goalSettings 
            };
        });
    },

    aggregateReport(reportData, selectedWarehouse = null) {
        if (!reportData || reportData.length === 0) {
            const emptyShell = { doanhThu: 0, doanhThuQuyDoi: 0, dtCE: 0, dtICT: 0, qdc: {}, nganhHangChiTiet: {}, nhomHangChiTiet: {}, dynamicMetrics: {}, comparisonData: { value: 0, percentage: 'N/A' } };
            const numericKeys = ['doanhThuTraGop', 'doanhThuChuaXuat','doanhThuQuyDoiChuaXuat', 'dtGiaDung', 'dtMLN', 'dtPhuKien', 'slSmartphone', 'slSimOnline', 'slUDDD', 'slBaoHiemDenominator', 'slBaoHiemVAS', 'slCE', 'slPhuKien', 'slGiaDung', 'slMLN'];
            numericKeys.forEach(key => emptyShell[key] = 0);
            return emptyShell;
        }

        const supermarketReport = reportData.reduce((acc, curr) => {
            for (const key in curr) {
                if (typeof curr[key] === 'number') {
                    acc[key] = (acc[key] || 0) + curr[key];
                } else if (key === 'qdc' && typeof curr.qdc === 'object') {
                    if (!acc.qdc) acc.qdc = {};
                    for (const qdcKey in curr.qdc) {
                        if (!acc.qdc[qdcKey]) acc.qdc[qdcKey] = { sl: 0, dt: 0, dtqd: 0, name: curr.qdc[qdcKey].name };
                        acc.qdc[qdcKey].sl += curr.qdc[qdcKey].sl;
                        acc.qdc[qdcKey].dt += curr.qdc[qdcKey].dt;
                        acc.qdc[qdcKey].dtqd += curr.qdc[qdcKey].dtqd;
                    }
                }
            }
            acc.maKho = selectedWarehouse || '';
            return acc;
        }, {});

        // Helper Aggregation
        const aggregateDetail = (sourceKey, destKey, macroConfigStore, cleanerFunc) => {
            const aggregated = {};
            reportData.forEach(employee => {
                if (employee[sourceKey]) {
                    Object.entries(employee[sourceKey]).forEach(([name, values]) => {
                        if (!aggregated[name]) aggregated[name] = { name: name, quantity: 0, revenue: 0, revenueQuyDoi: 0, donGia: 0 };
                        aggregated[name].quantity += values.quantity;
                        aggregated[name].revenue += values.revenue;
                        aggregated[name].revenueQuyDoi += values.revenueQuyDoi;
                    });
                }
            });

            // Apply Macro Logic
            const macros = get(macroConfigStore) || [];
            macros.forEach(macro => {
                const macroName = macro.name;
                if (!aggregated[macroName] && macro.items) {
                    let mQuantity = 0, mRevenue = 0, mRevenueQuyDoi = 0;
                    macro.items.forEach(childName => {
                        const cleanChild = cleanerFunc(childName);
                        const childData = aggregated[cleanChild];
                        if (childData) {
                            mQuantity += childData.quantity;
                            mRevenue += childData.revenue;
                            mRevenueQuyDoi += childData.revenueQuyDoi;
                        }
                    });
                    if (mRevenue > 0 || mQuantity > 0) {
                        aggregated[macroName] = {
                            name: macroName,
                            quantity: mQuantity,
                            revenue: mRevenue,
                            revenueQuyDoi: mRevenueQuyDoi,
                            donGia: mQuantity > 0 ? mRevenue / mQuantity : 0,
                            isMacro: true 
                        };
                    }
                }
            });

            for (const name in aggregated) {
                const item = aggregated[name];
                item.donGia = item.quantity > 0 ? item.revenue / item.quantity : 0;
            }
            supermarketReport[destKey] = aggregated;
        }

        aggregateDetail('doanhThuTheoNganhHang', 'nganhHangChiTiet', macroCategoryConfig, utils.cleanCategoryName);
        aggregateDetail('doanhThuTheoNhomHang', 'nhomHangChiTiet', macroProductGroupConfig, utils.cleanCategoryName);

        // Dynamic Metrics Aggregation (Siêu thị)
        const $efficiencyConfig = get(efficiencyConfig);
        const macroToItemsMap = {};
        const buildMacroMap = (configs, cleanerFunc) => {
            configs.forEach(macro => {
                if (macro.items && Array.isArray(macro.items)) {
                    macroToItemsMap[macro.name] = macro.items.map(i => cleanerFunc(i));
                }
            });
        };
        buildMacroMap(get(macroCategoryConfig) || [], utils.cleanCategoryName);
        buildMacroMap(get(macroProductGroupConfig) || [], utils.cleanCategoryName);

        supermarketReport.dynamicMetrics = {};
        if ($efficiencyConfig && $efficiencyConfig.length > 0) {
             $efficiencyConfig.forEach(cfg => {
                const calcGroupValue = (groupList, valueType) => {
                    let total = 0;
                    groupList.forEach(name => {
                        const itemsToSum = macroToItemsMap[name] || [utils.cleanCategoryName(name)];
                        itemsToSum.forEach(cleanName => {
                            let item = supermarketReport.nganhHangChiTiet[cleanName] || supermarketReport.nhomHangChiTiet[cleanName];
                            if (item) {
                                if (valueType === 'SL') total += item.quantity;
                                else if (valueType === 'DTQD') total += item.revenueQuyDoi;
                                else total += item.revenue; 
                            }
                        });
                    });
                    return total;
                };

                const totalNum = calcGroupValue(cfg.groupA || [], cfg.typeA || cfg.type);
                const totalDen = calcGroupValue(cfg.groupB || [], cfg.typeB || 'DTTL');

                supermarketReport.dynamicMetrics[cfg.id] = {
                    value: totalDen > 0 ? totalNum / totalDen : 0,
                    target: cfg.target,
                    label: cfg.label
                };
             });
        }

        supermarketReport.hieuQuaQuyDoi = supermarketReport.doanhThu > 0 ? (supermarketReport.doanhThuQuyDoi / supermarketReport.doanhThu) - 1 : 0;
        supermarketReport.tyLeTraCham = supermarketReport.doanhThu > 0 ? supermarketReport.doanhThuTraGop / supermarketReport.doanhThu : 0;
        supermarketReport.pctGiaDung = supermarketReport.dtCE > 0 ? supermarketReport.dtGiaDung / supermarketReport.dtCE : 0;
        supermarketReport.pctMLN = supermarketReport.dtCE > 0 ? supermarketReport.dtMLN / supermarketReport.dtCE : 0;
        supermarketReport.pctPhuKien = supermarketReport.dtICT > 0 ? supermarketReport.dtPhuKien / supermarketReport.dtICT : 0;
        supermarketReport.pctSim = supermarketReport.slSmartphone > 0 ? supermarketReport.slSimOnline / supermarketReport.slSmartphone : 0;
        supermarketReport.pctVAS = supermarketReport.slSmartphone > 0 ? supermarketReport.slUDDD / supermarketReport.slSmartphone : 0;
        supermarketReport.pctBaoHiem = supermarketReport.slBaoHiemDenominator > 0 ? supermarketReport.slBaoHiemVAS / supermarketReport.slBaoHiemDenominator : 0;

        supermarketReport.comparisonData = { value: 0, percentage: 'N/A' }; 

        if (supermarketReport.qdc) {
            for (const key in supermarketReport.qdc) {
                const group = supermarketReport.qdc[key];
                group.donGia = group.sl > 0 ? group.dt / group.sl : 0;
            }
        }

        return supermarketReport;
    },

    calculateDepartmentAverages(departmentName, reportData) {
        const departmentEmployees = reportData.filter(e => e.boPhan === departmentName);
        if (departmentEmployees.length === 0) return {};

        const totals = departmentEmployees.reduce((acc, curr) => {
            Object.keys(curr).forEach(key => {
                if (typeof curr[key] === 'number') acc[key] = (acc[key] || 0) + curr[key];
            });
            // Cộng dồn Dynamic Metrics
            if(curr.dynamicMetrics) {
                if(!acc.dynamicMetrics) acc.dynamicMetrics = {};
                for(const k in curr.dynamicMetrics) {
                    if(!acc.dynamicMetrics[k]) acc.dynamicMetrics[k] = 0;
                    acc.dynamicMetrics[k] += curr.dynamicMetrics[k].value;
                }
            }
            if (curr.qdc) {
                if (!acc.qdc) acc.qdc = {};
                for (const k in curr.qdc) {
                    if (!acc.qdc[k]) acc.qdc[k] = { sl: 0, dt: 0, dtqd: 0 };
                    acc.qdc[k].sl += curr.qdc[k].sl;
                    acc.qdc[k].dt += curr.qdc[k].dt;
                    acc.qdc[k].dtqd += curr.qdc[k].dtqd;
                }
            }
            return acc;
        }, {});

        const averages = {};
        for (const key in totals) {
            if (key !== 'qdc' && key !== 'dynamicMetrics') averages[key] = totals[key] / departmentEmployees.length;
            else if (key === 'dynamicMetrics') {
                averages.dynamicMetrics = {};
                for(const k in totals.dynamicMetrics) {
                    averages.dynamicMetrics[k] = totals.dynamicMetrics[k] / departmentEmployees.length;
                }
            }
            else {
                averages.qdc = {};
                for (const qdcKey in totals.qdc) averages.qdc[qdcKey] = {
                    sl: totals.qdc[qdcKey].sl / departmentEmployees.length,
                    dt: totals.qdc[qdcKey].dt / departmentEmployees.length,
                    dtqd: totals.qdc[qdcKey].dtqd / departmentEmployees.length
                };
            }
        }
        return averages;
    },
};