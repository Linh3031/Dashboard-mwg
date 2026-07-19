// src/services/reports/competition.report.js
// Version 2.3 - Atomic Integrity: Multi-layer Group & Brand Matching (Surgical Fix)
import { get } from 'svelte/store';
import * as utils from '../../utils.js';
import { dataProcessing } from '../dataProcessing.js';
import {
    danhSachNhanVien,
    specialProductList,
    thiDuaVungChiTiet,
    thiDuaVungTong
} from '../../stores.js';

export const competitionReportLogic = {
    calculateSpecialProductReport(sourceYcxData, specialProgramConfigs) {
        const $specialProductList = get(specialProductList);
        if (!sourceYcxData || sourceYcxData.length === 0 ||
            !specialProgramConfigs || specialProgramConfigs.length === 0 ||
            !$specialProductList || $specialProductList.length === 0) {
            return [];
        }

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const validSalesData = sourceYcxData.filter(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả' &&
                                (row.trangThaiXuat || "").trim() === 'Đã xuất';
            return isBaseValid && isDoanhThuHTX;
        });
        if (validSalesData.length === 0) return [];

        const $danhSachNhanVien = get(danhSachNhanVien);
        const report = specialProgramConfigs.map(program => {
            const programGroups = new Set((program.groups || []).map(g => String(g).trim()));
            if (programGroups.size === 0) return null;

            const specialProductSet = new Set(
                $specialProductList
                    .filter(sp => programGroups.has(String(sp.nhomHang).trim()))
                    .map(sp => String(sp.maSanPham).trim())
            );

            const totalGroupSales = validSalesData.filter(row => 
                programGroups.has(String(row.nhomHang).trim())
            );
    
            if (totalGroupSales.length === 0) return null;

            const employeeResults = $danhSachNhanVien.map(employee => {
                const stats = { slDacQuyen: 0, slNhomHang: 0, dtDacQuyen: 0, dtNhomHang: 0 };
                const employeeSales = totalGroupSales.filter(row => {
                    const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                    return msnvMatch && msnvMatch[1].trim() === employee.maNV;
                });
                if (employeeSales.length === 0) {
                    return { 
                        ...employee, 
                        maKho: employee.maKho, 
                        ...stats, 
                        tyLeSL: 0, 
                        tyLeDT: 0 
                    };
                }

                employeeSales.forEach(row => {
                    const maSanPham = String(row.maSanPham || '').trim();
                    const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                    const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;

                    stats.slNhomHang += soLuong;
                    stats.dtNhomHang += thanhTien;

                    if (specialProductSet.has(maSanPham)) {
                        stats.slDacQuyen += soLuong;
                        stats.dtDacQuyen += thanhTien;
                    }
                });
                const tyLeSL = stats.slNhomHang > 0 ? (stats.slDacQuyen / stats.slNhomHang) : 0;
                const tyLeDT = stats.dtNhomHang > 0 ? (stats.dtDacQuyen / stats.dtNhomHang) : 0;

                return {
                    maNV: employee.maNV,
                    hoTen: employee.hoTen,
                    boPhan: employee.boPhan,
                    maKho: employee.maKho,
                    ...stats,
                    tyLeSL,
                    tyLeDT
                };
            }).filter(e => e.slNhomHang > 0); 

            return {
                program: program,
                employeeData: employeeResults,
            };
        }).filter(Boolean); 

        return report;
    },

    calculateCompetitionFocusReport(sourceYcxData, competitionConfigs) {
        if (!competitionConfigs || competitionConfigs.length === 0) {
            return [];
        }

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoiMap = dataProcessing.getHeSoQuyDoi() || {};

        const validSalesData = (sourceYcxData || []).filter(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả' &&
                                (row.trangThaiXuat || "").trim() === 'Đã xuất';
            return isBaseValid && isDoanhThuHTX;
        });
        const $danhSachNhanVien = get(danhSachNhanVien);

        // [SURGICAL HELPER 1]: Tạo tập hợp từ khóa lọc đa tầng (Khớp cả ID số lẫn Tên chữ)
        const buildGroupSet = (groupList) => {
            const set = new Set();
            if (!groupList || !Array.isArray(groupList)) return set;
            groupList.forEach(g => {
                if (!g) return;
                const raw = String(g).trim();
                set.add(raw); // Thêm ID thô (VD: "1097")
                set.add(raw.toLowerCase());
                
                if (utils.cleanCategoryName) {
                    const cleaned = utils.cleanCategoryName(raw);
                    if (cleaned) set.add(cleaned); // Thêm tên sạch (VD: "tivi led")
                }
                if (utils.parseIdentity) {
                    const parsed = utils.parseIdentity(raw);
                    if (parsed && parsed.id && parsed.id !== 'unknown') {
                        set.add(String(parsed.id).trim()); // Thêm ID phân tích từ chuỗi "1097 - Tivi"
                    }
                }
            });
            return set;
        };

        // [SURGICAL HELPER 2]: Kiểm tra một đơn hàng YCX có khớp với tập hợp Nhóm/Ngành hàng hay không
        const isGroupMatch = (row, targetGroupSet) => {
            if (!targetGroupSet || targetGroupSet.size === 0) return true;

            const maNhom = String(row.maNhomHang || row.MA_NHOM_HANG || '').trim();
            const maNganh = String(row.maNganhHang || row.MA_NGANH_HANG || '').trim();
            if (targetGroupSet.has(maNhom) || targetGroupSet.has(maNganh)) return true;

            const rawNhom = String(row.nhomHang || row.NHOM_HANG || '').trim();
            const rawNganh = String(row.nganhHang || row.NGANH_HANG || '').trim();
            if (targetGroupSet.has(rawNhom) || targetGroupSet.has(rawNganh)) return true;
            if (targetGroupSet.has(rawNhom.toLowerCase()) || targetGroupSet.has(rawNganh.toLowerCase())) return true;

            if (utils.parseIdentity) {
                const pNhom = utils.parseIdentity(rawNhom);
                const pNganh = utils.parseIdentity(rawNganh);
                if (pNhom && pNhom.id && targetGroupSet.has(String(pNhom.id).trim())) return true;
                if (pNganh && pNganh.id && targetGroupSet.has(String(pNganh.id).trim())) return true;
            }

            if (utils.cleanCategoryName) {
                const cNhom = utils.cleanCategoryName(rawNhom);
                const cNganh = utils.cleanCategoryName(rawNganh);
                if (cNhom && targetGroupSet.has(cNhom)) return true;
                if (cNganh && targetGroupSet.has(cNganh)) return true;
            }

            return false;
        };

        // [SURGICAL HELPER 3]: Kiểm tra Hãng sản xuất không phân biệt chữ hoa/thường
        const isBrandMatch = (rowBrand, targetBrands) => {
            if (!targetBrands || !Array.isArray(targetBrands) || targetBrands.length === 0) return true;
            const cleanRowBrand = String(rowBrand || 'Khác').trim().toLowerCase();
            return targetBrands.some(b => String(b).trim().toLowerCase() === cleanRowBrand);
        };

        const report = competitionConfigs.map(config => {
            const mainColType = config.mainColumn ? (config.mainColumn.type || 'DT') : (config.type === 'soluong' ? 'SL' : (config.type === 'dtqd' ? 'DTQD' : 'DT'));
            const globalGroupsList = config.groups || (config.mainColumn ? config.mainColumn.items : []) || [];
            const globalGroupSet = buildGroupSet(globalGroupsList);
            const hasSubColumns = Array.isArray(config.subColumns) && config.subColumns.length > 0;

            let baseSalesData = validSalesData.filter(row => {
                if (mainColType === 'SL' && (config.minPrice > 0 || config.maxPrice > 0)) {
                    const price = (parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0) / (parseInt(String(row.soLuong || "1"), 10) || 1);
                    if (price < (config.minPrice || 0) || price > (config.maxPrice || Infinity)) return false;
                }
                return true;
            });

            if (config.excludeApple) {
                baseSalesData = baseSalesData.filter(row => String(row.nhaSanXuat || '').trim().toLowerCase() !== 'apple');
            }

            const employeeResults = $danhSachNhanVien.map(employee => {
                let performanceByBrand = {};
                let totalTargetRevenue = 0, totalTargetQuantity = 0, totalTargetRevenueQD = 0;
                let baseCategoryRevenue = 0, baseCategoryQuantity = 0, baseCategoryRevenueQD = 0;
                let dynamicColumns = {};

                baseSalesData.forEach(row => {
                    const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                    if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                        const rev = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                        const qty = parseInt(String(row.soLuong || "0"), 10) || 0;
                        const heSo = heSoQuyDoiMap[row.nhomHang] || 1;
                        const revQD = row.revenueQuyDoi !== undefined ? (parseFloat(String(row.revenueQuyDoi || "0").replace(/,/g, '')) || 0) : (rev * heSo);
                        const brand = row.nhaSanXuat || 'Khác';

                        // 1. TÍNH CHO CỘT TỔNG NHÓM (Sử dụng bộ đối chiếu đa tầng isGroupMatch)
                        if (isGroupMatch(row, globalGroupSet)) {
                            baseCategoryRevenue += rev;
                            baseCategoryQuantity += qty;
                            baseCategoryRevenueQD += revQD;
                        }

                        // 2. TÍNH CHO CÁC CỘT PHỤ (TABLE BUILDER)
                        if (hasSubColumns) {
                            config.subColumns.forEach(col => {
                                if (!col.id || col.type === 'PERCENT') return;
                                
                                if (!isBrandMatch(brand, col.brands)) return;

                                const colGroupsList = col.items || col.groups || [];
                                const effectiveGroupSet = colGroupsList.length > 0 ? buildGroupSet(colGroupsList) : globalGroupSet;
                                
                                if (!isGroupMatch(row, effectiveGroupSet)) return;

                                if (!dynamicColumns[col.id]) dynamicColumns[col.id] = { dt: 0, sl: 0, dtqd: 0 };
                                dynamicColumns[col.id].dt += rev;
                                dynamicColumns[col.id].sl += qty;
                                dynamicColumns[col.id].dtqd += revQD;
                            });
                        }

                        // 3. Tương thích ngược với config cũ
                        if (isBrandMatch(brand, config.brands)) {
                            if (isGroupMatch(row, globalGroupSet)) {
                                if (!performanceByBrand[brand]) performanceByBrand[brand] = { revenue: 0, quantity: 0, revenueQD: 0 };
                                performanceByBrand[brand].revenue += rev;
                                performanceByBrand[brand].quantity += qty;
                                performanceByBrand[brand].revenueQD += revQD;

                                totalTargetRevenue += rev;
                                totalTargetQuantity += qty;
                                totalTargetRevenueQD += revQD;
                            }
                        }
                    }
                });

                const tyLeDT = baseCategoryRevenue > 0 ? (totalTargetRevenue / baseCategoryRevenue) : 0;
                const tyLeSL = baseCategoryQuantity > 0 ? (totalTargetQuantity / baseCategoryQuantity) : 0;
                const tyLeDTQD = baseCategoryRevenueQD > 0 ? (totalTargetRevenueQD / baseCategoryRevenueQD) : 0;

                return {
                    maNV: employee.maNV,
                    hoTen: employee.hoTen,
                    boPhan: employee.boPhan,
                    maKho: employee.maKho,
                    performanceByBrand,
                    dynamicColumns,
                    targetBrandsRevenue: totalTargetRevenue,
                    targetBrandsQuantity: totalTargetQuantity,
                    targetBrandsRevenueQD: totalTargetRevenueQD,
                    baseCategoryRevenue,
                    baseCategoryQuantity,
                    baseCategoryRevenueQD,
                    tyLeDT,
                    tyLeSL,
                    tyLeDTQD,
                };
            }).filter(e => e.baseCategoryRevenue > 0 || e.baseCategoryQuantity > 0 || e.baseCategoryRevenueQD > 0);

            return {
                competition: config,
                employeeData: employeeResults,
            };
        });

        return report;
    },

    generateThiDuaVungReport(selectedSupermarket) {
        const $thiDuaVungChiTiet = get(thiDuaVungChiTiet);
        const $thiDuaVungTong = get(thiDuaVungTong);

        if (!selectedSupermarket || !$thiDuaVungChiTiet || $thiDuaVungChiTiet.length === 0 || !$thiDuaVungTong || $thiDuaVungTong.length === 0) {
            return null;
        }

        const findKey = (data, keyword) => {
            if (!data || data.length === 0) return null;
            return Object.keys(data[0]).find(k => k.trim().toLowerCase().includes(keyword.toLowerCase())) || keyword;
        };
        const supermarketKeyTong = findKey($thiDuaVungTong, 'siêu thị');
        const supermarketKeyChiTiet = findKey($thiDuaVungChiTiet, 'siêu thị');
        const tongThuongKey = findKey($thiDuaVungChiTiet, 'tổng thưởng');
        const hangVuotTroiKey = findKey($thiDuaVungChiTiet, 'hạng % target');
        const hangTargetKey = findKey($thiDuaVungChiTiet, 'hạng % target');
        const layTopKey = findKey($thiDuaVungChiTiet, 'lấy top');
        const kenhKey = findKey($thiDuaVungChiTiet, 'kênh');
        const nganhHangKey = findKey($thiDuaVungChiTiet, 'ngành hàng');

        if (!supermarketKeyTong || !supermarketKeyChiTiet) {
            console.error("Không thể tìm thấy cột 'siêu thị' trong dữ liệu.");
            return null;
        }

        const summary = $thiDuaVungTong.find(row => row[supermarketKeyTong] === selectedSupermarket);
        if (!summary) return null;

        const chiTiet = $thiDuaVungChiTiet.filter(row => row[supermarketKeyChiTiet] === selectedSupermarket);

        if (chiTiet.length > 0 && layTopKey) {
            summary.hangCoGiaiKenh = chiTiet[0][layTopKey];
        } else {
            summary.hangCoGiaiKenh = 'N/A';
        }

        const report = { summary, coGiai: [], sapCoGiai: [], tiemNang: [], canCoGangNhieu: [] };

        const getPotentialPrize = (kenh, nganhHang) => {
            const winningSupermarkets = $thiDuaVungChiTiet.filter(sm =>
                sm[kenhKey] === kenh && sm[nganhHangKey] === nganhHang && sm[tongThuongKey] > 0
            );
            if (winningSupermarkets.length === 0) return 0;
            return Math.min(...winningSupermarkets.map(s => s[tongThuongKey]));
        };

        chiTiet.forEach(nganhHang => {
            if (nganhHang[tongThuongKey] > 0) {
                report.coGiai.push(nganhHang);
            } else {
                const hangVuotTroi = nganhHang[hangVuotTroiKey] || Infinity;
                const hangTarget = nganhHang[hangTargetKey] || Infinity;
                const hangCoGiai = nganhHang[layTopKey] || 0;

                const khoangCach = Math.min(
                    (hangVuotTroi > 0 && hangVuotTroi > hangCoGiai) ? hangVuotTroi - hangCoGiai : Infinity,
                    (hangTarget > 0 && hangTarget > hangCoGiai) ? hangTarget - hangCoGiai : Infinity
                );
                nganhHang.khoangCach = khoangCach;

                if (hangCoGiai > 0 && khoangCach <= 20) {
                    nganhHang.thuongTiemNang = getPotentialPrize(nganhHang[kenhKey], nganhHang[nganhHangKey]);
                    report.sapCoGiai.push(nganhHang);
                } else if (hangCoGiai > 0 && khoangCach > 20 && khoangCach <= 40) {
                    report.tiemNang.push(nganhHang);
                } else {
                    report.canCoGangNhieu.push(nganhHang);
                }
            }
        });

        report.coGiai.sort((a, b) => b[tongThuongKey] - a[tongThuongKey]);
        report.sapCoGiai.sort((a, b) => a.khoangCach - b.khoangCach);
        report.tiemNang.sort((a, b) => a.khoangCach - b.khoangCach);

        return report;
    }
};