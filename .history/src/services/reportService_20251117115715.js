// File: src/services/reportService.js
// MỤC ĐÍCH: Chỉ chứa logic tạo báo cáo.
import { get } from 'svelte/store';
import { config } from '../config.js';
import * as utils from '../utils.js';
import { dataProcessing } from './dataProcessing.js';
import {
    danhSachNhanVien,
    thuongNongData,
    thuongERPData,
    thuongNongDataThangTruoc,
    thuongERPDataThangTruoc,
    specialProductList,
    masterReportData
} from '../stores.js';

const reportGeneration = {
    // Logic `calculateSpecialProductReport` từ [cite: 2367-2384]
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
                    return { ...employee, ...stats, tyLeSL: 0, tyLeDT: 0 };
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

    // Logic `calculateCompetitionFocusReport` từ [cite: 2385-2410]
    calculateCompetitionFocusReport(sourceYcxData, competitionConfigs) {
        if (!sourceYcxData || sourceYcxData.length === 0 || !competitionConfigs || competitionConfigs.length === 0) {
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
        const $danhSachNhanVien = get(danhSachNhanVien);

        const report = competitionConfigs.map(config => {
            const cleanedConfigGroups = new Set((config.groups || []).map(g => utils.cleanCategoryName(g)));

            let baseSalesData = validSalesData.filter(row => {
                const cleanNhomHangFromYCX = utils.cleanCategoryName(row.nhomHang);
                const isInGroup = cleanedConfigGroups.has(cleanNhomHangFromYCX);
                if (!isInGroup) return false;

                if (config.type === 'soluong' && (config.minPrice > 0 || config.maxPrice > 0)) {
                    const price = (parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0) / (parseInt(String(row.soLuong || "1"), 10) || 1);
                    const minPrice = config.minPrice || 0;
                    const maxPrice = config.maxPrice || Infinity;
                    if (price < minPrice || price > maxPrice) return false;
                }
                return true;
            });

            if (config.excludeApple) {
                baseSalesData = baseSalesData.filter(row => row.nhaSanXuat !== 'Apple');
            }

            const employeeResults = $danhSachNhanVien.map(employee => {
                let performanceByBrand = {};
                let totalTargetRevenue = 0;
                let totalTargetQuantity = 0;
                let baseCategoryRevenue = 0;
                let baseCategoryQuantity = 0;

                baseSalesData.forEach(row => {
                    const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
                     if (msnvMatch && msnvMatch[1].trim() === employee.maNV) {
                        const revenueValue = (parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0);
                        const quantityValue = (parseInt(String(row.soLuong || "0"), 10) || 0);

                        baseCategoryRevenue += revenueValue;
                        baseCategoryQuantity += quantityValue;

                        const brand = row.nhaSanXuat;
                        if ((config.brands || []).includes(brand)) {
                            if (!performanceByBrand[brand]) {
                                performanceByBrand[brand] = { revenue: 0, quantity: 0 };
                            }
                            performanceByBrand[brand].revenue += revenueValue;
                            performanceByBrand[brand].quantity += quantityValue;

                            totalTargetRevenue += revenueValue;
                            totalTargetQuantity += quantityValue;
                        }
                    }
                });
                return {
                    maNV: employee.maNV,
                    hoTen: employee.hoTen,
                    boPhan: employee.boPhan,
                    performanceByBrand,
                    targetBrandsRevenue: totalTargetRevenue,
                    targetBrandsQuantity: totalTargetQuantity,
                    baseCategoryRevenue,
                    baseCategoryQuantity,
                    tyLeDT: baseCategoryRevenue > 0 ? (totalTargetRevenue / baseCategoryRevenue) : 0,
                    tyLeSL: baseCategoryQuantity > 0 ? (totalTargetQuantity / baseCategoryQuantity) : 0,
                };
            }).filter(e => e.baseCategoryRevenue > 0 || e.baseCategoryQuantity > 0);

            return {
                competition: config,
                employeeData: employeeResults,
            };
        }).filter(r => r.employeeData.length > 0);

        return report;
    },

    // ... (toàn bộ các hàm reportGeneration khác như 
    // generateMasterReportData, generateLuyKeChuaXuatReport, v.v.
    // sẽ được dán vào đây) ...
};

// Export đối tượng
export const reportService = reportGeneration;