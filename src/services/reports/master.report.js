// src/services/reports/master.report.js
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

// Helper chuẩn hóa chuỗi
const normalizeStr = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, ' ')
        .trim();
};

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

        // 1. Build Macro Map
        const macroToItemsMap = {};
        const buildMacroMap = (configs) => {
            configs.forEach(macro => {
                if (macro.items && Array.isArray(macro.items)) {
                    macroToItemsMap[normalizeStr(macro.name)] = macro.items.map(i => normalizeStr(i));
                }
            });
        };
        buildMacroMap($macroCategoryConfig);
        buildMacroMap($macroProductGroupConfig);

        const $thuongNongData = get(thuongNongData);
        const $employeeNameToMaNVMap = get(employeeNameToMaNVMap);
        const $thuongERPData = get(thuongERPData);
        const $thuongNongDataThangTruoc = get(thuongNongDataThangTruoc);
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
                doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0,
                doanhThuChuaXuat: 0, doanhThuQuyDoiChuaXuat: 0,
                doanhThuGiaoXa: 0, doanhThuQuyDoiGiaoXa: 0,
                doanhThuTheoNganhHang: {}, 
                doanhThuTheoNhomHang: {}, 
                dynamicMetrics: {},
                qdc: {},
                dtTivi: 0, slTivi: 0, dtTuLanh: 0, slTuLanh: 0,
                dtMayGiat: 0, slMayGiat: 0, dtMayLanh: 0, slMayLanh: 0,
                dtDienThoai: 0, slDienThoai: 0, dtLaptop: 0, slLaptop: 0,
                dtICT: 0, dtCE: 0
            };

            for (const key in PG.QDC_GROUPS) data.qdc[key] = { sl: 0, dt: 0, dtqd: 0, name: PG.QDC_GROUPS[key].name };

            sourceData.forEach(row => {
                const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                    const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
                    const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' && 
                                      (row.trangThaiHuy || "").trim() === 'Chưa hủy' && 
                                      (row.tinhTrangTra || "").trim() === 'Chưa trả';

                    if (isBaseValid && isDoanhThuHTX) {
                        const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                        const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                        const heSo = heSoQuyDoi[row.nhomHang] || 1;
                        const trangThaiXuat = (row.trangThaiXuat || "").trim();
                        const nhomHangCode = String(row.nhomHang || '').match(/^\d+/)?.[0] || null;
                        
                        const trackMetric = (container, name) => {
                            if (!name) return;
                            const cleanName = utils.cleanCategoryName(name); 
                            if (!container[cleanName]) {
                                container[cleanName] = { 
                                    name: cleanName, 
                                    rawName: name, 
                                    revenue: 0, 
                                    quantity: 0, 
                                    revenueQuyDoi: 0 
                                };
                            }
                            container[cleanName].revenue += thanhTien;
                            container[cleanName].quantity += soLuong;
                            container[cleanName].revenueQuyDoi += thanhTien * heSo;
                        }
                        
                        trackMetric(data.doanhThuTheoNganhHang, row.nganhHang);
                        trackMetric(data.doanhThuTheoNhomHang, row.nhomHang);

                        if (trangThaiXuat === 'Chưa xuất') {
                            data.doanhThuChuaXuat += thanhTien;
                            data.doanhThuQuyDoiChuaXuat += thanhTien * heSo;
                        } else if (trangThaiXuat === 'Đã xuất') {
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
                            }

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
                                    data.qdc[key].dtqd += thanhTien * heSo;
                                }
                            }
                        }
                    }
                }
            });

            if ($efficiencyConfig && $efficiencyConfig.length > 0) {
                $efficiencyConfig.forEach(cfg => {
                    const numType = cfg.typeA || cfg.type || 'DTTL';
                    const denType = cfg.typeB || (numType === 'SL' ? 'SL' : 'DTTL');

                    const calcGroupValue = (groupList, valueType) => {
                        let total = 0;
                        if (!groupList || groupList.length === 0) return 0;

                        groupList.forEach(rawName => {
                            const cleanCfgName = normalizeStr(rawName);
                            const itemsToSum = macroToItemsMap[cleanCfgName] || [cleanCfgName];

                            itemsToSum.forEach(targetName => {
                                const findItem = (container) => {
                                    for (const key in container) {
                                        if (normalizeStr(key) === targetName) return container[key];
                                    }
                                    for (const key in container) {
                                        const normKey = normalizeStr(key);
                                        if (normKey.includes(targetName) || targetName.includes(normKey)) {
                                            return container[key];
                                        }
                                    }
                                    return null;
                                };

                                let item = findItem(data.doanhThuTheoNganhHang) || findItem(data.doanhThuTheoNhomHang);

                                if (item) {
                                    if (valueType === 'SL') total += item.quantity;
                                    else if (valueType === 'DTQD') total += item.revenueQuyDoi;
                                    else total += item.revenue; 
                                }
                            });
                        });
                        return total;
                    };

                    const numVal = calcGroupValue(cfg.groupA, numType);
                    const denVal = calcGroupValue(cfg.groupB, denType);

                    data.dynamicMetrics[cfg.id] = {
                        value: denVal > 0 ? numVal / denVal : 0,
                        target: goalSettings[cfg.id] !== undefined ? parseFloat(goalSettings[cfg.id]) : cfg.target,
                        label: cfg.label
                    };
                });
            }

            const hieuQuaQuyDoi = data.doanhThu > 0 ? (data.doanhThuQuyDoi / data.doanhThu) - 1 : 0;
            const tyLeTraCham = data.doanhThu > 0 ? data.doanhThuTraGop / data.doanhThu : 0;
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
            const thuNhapThangTruoc = (thuongNongThangTruoc || 0) + thuongERPThangTruoc;
            const chenhLechThuNhap = thuNhapDuKien - thuNhapThangTruoc;

            return { 
                ...employee, ...data, 
                gioCong, thuongNong, thuongERP, tongThuNhap, thuNhapDuKien, thuNhapThangTruoc, chenhLechThuNhap, 
                hieuQuaQuyDoi, tyLeTraCham,
                donGiaTrungBinh, mucTieu: goalSettings 
            };
        });
    },

    aggregateReport(reportData, selectedWarehouse = null) {
        if (!reportData || reportData.length === 0) return {};

        const supermarketReport = reportData.reduce((acc, curr) => {
            for (const key in curr) {
                if (typeof curr[key] === 'number') {
                    acc[key] = (acc[key] || 0) + curr[key];
                }
            }
            
            ['doanhThuTheoNganhHang', 'doanhThuTheoNhomHang'].forEach(dictKey => {
                if(curr[dictKey]) {
                    if(!acc[dictKey]) acc[dictKey] = {};
                    Object.entries(curr[dictKey]).forEach(([k, v]) => {
                        if(!acc[dictKey][k]) acc[dictKey][k] = { ...v };
                        else {
                            acc[dictKey][k].revenue += v.revenue;
                            acc[dictKey][k].quantity += v.quantity;
                            acc[dictKey][k].revenueQuyDoi += v.revenueQuyDoi;
                        }
                    });
                }
            });

            return acc;
        }, { doanhThu: 0, dynamicMetrics: {} });

        supermarketReport.nganhHangChiTiet = supermarketReport.doanhThuTheoNganhHang;
        supermarketReport.nhomHangChiTiet = supermarketReport.doanhThuTheoNhomHang;

        // [FIX] TÍNH TOÁN LẠI MACRO GROUP CHO CẤP SIÊU THỊ
        // Để đảm bảo bảng "Top Nhóm Hàng" hiện dữ liệu của nhóm lớn (VD: Bảo hiểm)
        const $macroProductGroupConfig = get(macroProductGroupConfig) || [];
        $macroProductGroupConfig.forEach(macro => {
            const macroName = macro.name;
            const cleanMacroName = utils.cleanCategoryName(macroName);
            
            if (macro.items && Array.isArray(macro.items)) {
                let mQuantity = 0, mRevenue = 0, mRevenueQuyDoi = 0;
                
                macro.items.forEach(childName => {
                    const cleanChild = utils.cleanCategoryName(childName);
                    // Tìm trong nhomHangChiTiet (ưu tiên) hoặc nganhHangChiTiet
                    const childData = supermarketReport.nhomHangChiTiet[cleanChild] || supermarketReport.nganhHangChiTiet[cleanChild];
                    
                    if (childData) {
                        mQuantity += childData.quantity;
                        mRevenue += childData.revenue;
                        mRevenueQuyDoi += childData.revenueQuyDoi;
                    }
                });

                if (mRevenue > 0 || mQuantity > 0 || mRevenueQuyDoi > 0) {
                    // Thêm vào nhomHangChiTiet để bảng Top Nhóm Hàng (QdcTable) có thể đọc được
                    if (!supermarketReport.nhomHangChiTiet[cleanMacroName]) {
                        supermarketReport.nhomHangChiTiet[cleanMacroName] = {
                            name: macroName,
                            quantity: mQuantity,
                            revenue: mRevenue,
                            revenueQuyDoi: mRevenueQuyDoi,
                            isMacro: true
                        };
                    }
                }
            }
        });

        // TÍNH LẠI DYNAMIC METRICS CHO CẤP SIÊU THỊ
        const $efficiencyConfig = get(efficiencyConfig) || [];
        supermarketReport.dynamicMetrics = {};
        
        const macroToItemsMap = {}; 
        const addToMap = (configs) => {
            (configs||[]).forEach(m => { if(m.items) macroToItemsMap[normalizeStr(m.name)] = m.items.map(i=>normalizeStr(i)); });
        };
        addToMap(get(macroCategoryConfig));
        addToMap(get(macroProductGroupConfig));

        if ($efficiencyConfig.length > 0) {
            $efficiencyConfig.forEach(cfg => {
                 const numType = cfg.typeA || cfg.type || 'DTTL';
                 const denType = cfg.typeB || (numType === 'SL' ? 'SL' : 'DTTL');

                 const calcGroupValue = (groupList, valueType) => {
                    let total = 0;
                    if (!groupList) return 0;
                    groupList.forEach(rawName => {
                        const cleanCfgName = normalizeStr(rawName);
                        const itemsToSum = macroToItemsMap[cleanCfgName] || [cleanCfgName];
                        
                        itemsToSum.forEach(targetName => {
                            const findItem = (container) => {
                                if(!container) return null;
                                for (const key in container) {
                                    if (normalizeStr(key) === targetName) return container[key];
                                }
                                for (const key in container) {
                                    const normKey = normalizeStr(key);
                                    if (normKey.includes(targetName) || targetName.includes(normKey)) {
                                        return container[key];
                                    }
                                }
                                return null;
                            };

                            let item = findItem(supermarketReport.doanhThuTheoNganhHang) || findItem(supermarketReport.doanhThuTheoNhomHang);

                            if (item) {
                                if (valueType === 'SL') total += item.quantity;
                                else if (valueType === 'DTQD') total += item.revenueQuyDoi;
                                else total += item.revenue;
                            }
                        });
                    });
                    return total;
                };

                const numVal = calcGroupValue(cfg.groupA, numType);
                const denVal = calcGroupValue(cfg.groupB, denType);
                
                supermarketReport.dynamicMetrics[cfg.id] = {
                    value: denVal > 0 ? numVal / denVal : 0,
                    target: cfg.target,
                    label: cfg.label
                };
            });
        }

        supermarketReport.hieuQuaQuyDoi = supermarketReport.doanhThu > 0 ? (supermarketReport.doanhThuQuyDoi / supermarketReport.doanhThu) - 1 : 0;
        supermarketReport.tyLeTraCham = supermarketReport.doanhThu > 0 ? supermarketReport.doanhThuTraGop / supermarketReport.doanhThu : 0;
        supermarketReport.comparisonData = { value: 0, percentage: 'N/A' }; 

        if (supermarketReport.qdc) {
            for (const key in supermarketReport.qdc) {
                const group = supermarketReport.qdc[key];
                group.donGia = group.sl > 0 ? group.dt / group.sl : 0;
            }
        }

        return supermarketReport;
    }
};