// src/services/reports/general.report.js
// Version 1.2 - Fixed 2-Level Category Lookup for Unexported Revenue (Chưa Xuất)
import { get } from 'svelte/store';
import * as utils from '../../utils.js';
import { dataProcessing } from '../dataProcessing.js';
import { employeeMaNVMap } from '../../stores.js';
import { helpers } from '../processing/helpers.js'; 

export const generalReportLogic = {
    generateRealtimeBrandReport(realtimeYCXData, selectedCategory, selectedBrand) {
        if (!realtimeYCXData || realtimeYCXData.length === 0) return { byBrand: [], byEmployee: [] };
        
        const $employeeMaNVMap = get(employeeMaNVMap);

        const filteredData = realtimeYCXData.filter(row => {
            const categoryMatch = !selectedCategory || utils.cleanCategoryName(row.nganhHang) === selectedCategory;
            const brandMatch = !selectedBrand || (row.nhaSanXuat || 'Hãng khác') === selectedBrand;
            const isDoanhThuHTX = dataProcessing.getHinhThucXuatTinhDoanhThu().has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' && (row.trangThaiHuy || "").trim() === 'Chưa hủy' && (row.tinhTrangTra || "").trim() === 'Chưa trả' && (row.trangThaiXuat || "").trim() === 'Đã xuất';

            return categoryMatch && brandMatch && isDoanhThuHTX && isBaseValid;
        });

        const byBrand = {};
        const byEmployee = {};

        filteredData.forEach(row => {
            const brand = row.nhaSanXuat || 'Hãng khác';
            const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
            const employeeId = msnvMatch ? msnvMatch[1].trim() : 'Unknown';
            const realRevenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
            const quantity = parseInt(String(row.soLuong || "0"), 10) || 0;

            if (!byBrand[brand]) {
                byBrand[brand] = { name: brand, quantity: 0, revenue: 0 };
            }
            byBrand[brand].quantity += quantity;
            byBrand[brand].revenue += realRevenue;

            if (!byEmployee[employeeId]) {
                const employeeInfo = $employeeMaNVMap.get(employeeId);
                byEmployee[employeeId] = { id: employeeId, name: employeeInfo ? employeeInfo.hoTen : `NV ${employeeId}`, quantity: 0, revenue: 0 };
            }
            byEmployee[employeeId].quantity += quantity;
            byEmployee[employeeId].revenue += realRevenue;
        });

        const brandArray = Object.values(byBrand).map(b => ({...b, avgPrice: b.quantity > 0 ? b.revenue / b.quantity : 0})).sort((a,b) => b.revenue - a.revenue);
        const employeeArray = Object.values(byEmployee).sort((a,b) => b.revenue - a.revenue);

        return { byBrand: brandArray, byEmployee: employeeArray };
    },

    generateLuyKeChuaXuatReport(sourceYcxData) {
        if (!sourceYcxData || sourceYcxData.length === 0) return [];

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();
        const report = {};

        sourceYcxData.forEach(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả' &&
                                (row.trangThaiXuat || "").trim() === 'Chưa xuất';

            if (isBaseValid && isDoanhThuHTX) {
                const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                if (isNaN(thanhTien) || isNaN(soLuong)) return;

                const nganhHangName = utils.cleanCategoryName(row.nganhHang);
                
                // --- [PHẪU THUẬT LOGIC v3.7]: DÒ HỆ SỐ 2 CẤP CHO BÁO CÁO CHƯA XUẤT ---
                const nhomRaw = row.nhomHang || '';
                const nganhRaw = row.nganhHang || '';
                const maNhom = row.maNhomHang || row.MA_NHOM_HANG || '';
                const maNganh = row.maNganhHang || row.MA_NGANH_HANG || '';

                const nhomKey = maNhom ? String(maNhom).trim() : utils.parseIdentity(nhomRaw).id;
                const nganhKey = maNganh ? String(maNganh).trim() : utils.parseIdentity(nganhRaw).id;

                let heSo = 1;
                if (heSoQuyDoi[nhomKey] !== undefined) {
                    heSo = heSoQuyDoi[nhomKey];
                } else if (heSoQuyDoi[nganhKey] !== undefined) {
                    heSo = heSoQuyDoi[nganhKey];
                }
                
                const revenueQuyDoi = thanhTien * heSo;
                // -------------------------------------------------------------------------

                if (!report[nganhHangName]) {
                    report[nganhHangName] = {
                        nganhHang: nganhHangName,
                        soLuong: 0,
                        doanhThuThuc: 0,
                        doanhThuQuyDoi: 0
                    };
                }

                report[nganhHangName].soLuong += soLuong;
                report[nganhHangName].doanhThuThuc += thanhTien;
                report[nganhHangName].doanhThuQuyDoi += revenueQuyDoi; 
            }
        });

        return Object.values(report);
    },

    generateRealtimeChuaXuatReport(sourceRealtimeYcxData) {
        if (!sourceRealtimeYcxData || sourceRealtimeYcxData.length === 0) return [];

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();
        const report = {};

        sourceRealtimeYcxData.forEach(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả' &&
                                (row.trangThaiXuat || "").trim() === 'Chưa xuất';

            if (isBaseValid && isDoanhThuHTX) {
                const thanhTien = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                const soLuong = parseInt(String(row.soLuong || "0"), 10) || 0;
                if (isNaN(thanhTien) || isNaN(soLuong)) return;

                const nganhHangName = utils.cleanCategoryName(row.nganhHang);
                
                // --- [PHẪU THUẬT LOGIC v3.7]: DÒ HỆ SỐ 2 CẤP CHO BÁO CÁO CHƯA XUẤT ---
                const nhomRaw = row.nhomHang || '';
                const nganhRaw = row.nganhHang || '';
                const maNhom = row.maNhomHang || row.MA_NHOM_HANG || '';
                const maNganh = row.maNganhHang || row.MA_NGANH_HANG || '';

                const nhomKey = maNhom ? String(maNhom).trim() : utils.parseIdentity(nhomRaw).id;
                const nganhKey = maNganh ? String(maNganh).trim() : utils.parseIdentity(nganhRaw).id;

                let heSo = 1;
                if (heSoQuyDoi[nhomKey] !== undefined) {
                    heSo = heSoQuyDoi[nhomKey];
                } else if (heSoQuyDoi[nganhKey] !== undefined) {
                    heSo = heSoQuyDoi[nganhKey];
                }
                
                const revenueQuyDoi = thanhTien * heSo;
                // -------------------------------------------------------------------------

                if (!report[nganhHangName]) {
                    report[nganhHangName] = {
                        nganhHang: nganhHangName,
                        soLuong: 0,
                        doanhThuThuc: 0,
                        doanhThuQuyDoi: 0
                    };
                }

                report[nganhHangName].soLuong += soLuong;
                report[nganhHangName].doanhThuThuc += thanhTien;
                report[nganhHangName].doanhThuQuyDoi += revenueQuyDoi;
            }
        });

        return Object.values(report);
    }
};