// src/services/reports/detail.report.js
// Version 1.0 - Detail views logic
import { get } from 'svelte/store';
import * as utils from '../../utils.js';
import { formatters } from '../../utils/formatters.js';
import { dataProcessing } from '../dataProcessing.js';
import { masterReportData } from '../../stores.js';

export const detailReportLogic = {
    generateRealtimeEmployeeDetailReport(employeeMaNV, realtimeYCXData) {
        if (!employeeMaNV || !realtimeYCXData || realtimeYCXData.length === 0) return null;

        const employeeData = realtimeYCXData.filter(row => {
            const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
            return msnvMatch && msnvMatch[1].trim() === String(employeeMaNV);
        });

        if (employeeData.length === 0) return null;

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();

        const summary = {
            totalRealRevenue: 0,
            totalConvertedRevenue: 0,
            unexportedRevenue: 0
        };
        const byProductGroup = {};
        const byCustomer = {};

        employeeData.forEach(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' && (row.trangThaiHuy || "").trim() === 'Chưa hủy' && (row.tinhTrangTra || "").trim() === 'Chưa trả';

            if (isDoanhThuHTX && isBaseValid) {
                const realRevenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                const quantity = parseInt(String(row.soLuong || "0"), 10) || 0;
                const heSo = heSoQuyDoi[row.nhomHang] || 1;
                
                // [FIX] Dùng revenueQuyDoi từ normalizer
                const convertedRevenue = row.revenueQuyDoi !== undefined ? row.revenueQuyDoi : (realRevenue * heSo);
                
                const groupName = utils.cleanCategoryName(row.nhomHang || 'Khác');
                const customerName = row.tenKhachHang || 'Khách lẻ';

                if ((row.trangThaiXuat || "").trim() === 'Đã xuất') {
                    summary.totalRealRevenue += realRevenue;
                    summary.totalConvertedRevenue += convertedRevenue;

                    if (!byProductGroup[groupName]) {
                        byProductGroup[groupName] = { name: groupName, quantity: 0, realRevenue: 0, convertedRevenue: 0 };
                    }
                    byProductGroup[groupName].quantity += quantity;
                    byProductGroup[groupName].realRevenue += realRevenue;
                    byProductGroup[groupName].convertedRevenue += convertedRevenue;

                    if (!byCustomer[customerName]) {
                        byCustomer[customerName] = { name: customerName, products: [], totalQuantity: 0 };
                    }
                    byCustomer[customerName].products.push({
                        productName: row.tenSanPham,
                        quantity: quantity,
                        realRevenue: realRevenue,
                        convertedRevenue: convertedRevenue,
                    });
                    byCustomer[customerName].totalQuantity += quantity;
                } else if ((row.trangThaiXuat || "").trim() === 'Chưa xuất') {
                    summary.unexportedRevenue += convertedRevenue;
                }
            }
        });

        summary.totalOrders = Object.keys(byCustomer).length;
        summary.bundledOrderCount = Object.values(byCustomer).filter(c => c.totalQuantity > 1).length;
        summary.conversionRate = summary.totalRealRevenue > 0 ? (summary.totalConvertedRevenue / summary.totalRealRevenue) - 1 : 0;

        return {
            summary,
            byProductGroup: Object.values(byProductGroup).sort((a, b) => b.realRevenue - a.realRevenue),
            byCustomer: Object.values(byCustomer)
        };
    },

    generateLuyKeEmployeeDetailReport(employeeMaNV, luykeYCXData) {
        if (!employeeMaNV || !luykeYCXData || luykeYCXData.length === 0) {
            return null;
        }

        const employeeData = luykeYCXData.filter(row => {
            const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
            return msnvMatch && msnvMatch[1].trim() === String(employeeMaNV);
        });

        if (employeeData.length === 0) {
             return null;
        }

        const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
        const heSoQuyDoi = dataProcessing.getHeSoQuyDoi();

        const summary = {
            totalRealRevenue: 0,
            totalConvertedRevenue: 0,
            unexportedRevenue: 0, 
        };
        const byProductGroup = {};
        const byCustomer = {};
        const categoryChartDataMap = {};
        const dailyStats = {}; 
        const unexportedDetails = {};
        
        employeeData.forEach(row => {
            const isDoanhThuHTX = hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat);
            
            const isBaseValid = (row.trangThaiThuTien || "").trim() === 'Đã thu' &&
                                (row.trangThaiHuy || "").trim() === 'Chưa hủy' &&
                                (row.tinhTrangTra || "").trim() === 'Chưa trả';

            if (isDoanhThuHTX && isBaseValid) {
                const realRevenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
                const quantity = parseInt(String(row.soLuong || "0"), 10) || 0;
                if(isNaN(realRevenue) || isNaN(quantity)) return;

                const heSo = heSoQuyDoi[row.nhomHang] || 1;
                
                // [FIX] Dùng revenueQuyDoi từ normalizer
                const convertedRevenue = row.revenueQuyDoi !== undefined ? row.revenueQuyDoi : (realRevenue * heSo);
                
                const groupName = utils.cleanCategoryName(row.nhomHang || 'Khác');
                const customerName = row.tenKhachHang || 'Khách Lẻ';
                const categoryName = utils.cleanCategoryName(row.nganhHang || 'Khác');
                const productName = row.tenSanPham || 'Không rõ';
                
                if ((row.trangThaiXuat || "").trim() === 'Đã xuất') {
                    summary.totalRealRevenue += realRevenue;
                    summary.totalConvertedRevenue += convertedRevenue;

                    if (!byProductGroup[groupName]) {
                        byProductGroup[groupName] = { name: groupName, quantity: 0, realRevenue: 0, convertedRevenue: 0 };
                    }
                    byProductGroup[groupName].quantity += quantity;
                    byProductGroup[groupName].realRevenue += realRevenue;
                    byProductGroup[groupName].convertedRevenue += convertedRevenue;

                    if (!categoryChartDataMap[categoryName]) {
                        categoryChartDataMap[categoryName] = { name: categoryName, revenue: 0 };
                    }
                    categoryChartDataMap[categoryName].revenue += realRevenue;
                    if (!byCustomer[customerName]) {
                        byCustomer[customerName] = { name: customerName, products: [], totalQuantity: 0, totalRealRevenue: 0, totalConvertedRevenue: 0 };
                    }
                    byCustomer[customerName].products.push({
                        productName: row.tenSanPham,
                        quantity: quantity,
                        realRevenue: realRevenue,
                        convertedRevenue: convertedRevenue,
                    });
                    byCustomer[customerName].totalQuantity += quantity;
                    byCustomer[customerName].totalRealRevenue += realRevenue;
                    byCustomer[customerName].totalConvertedRevenue += convertedRevenue;
                    
                    const ngayTao = row.ngayTao;
                    if (ngayTao instanceof Date) {
                        const dateString = ngayTao.toISOString().split('T')[0];
                        if (!dailyStats[dateString]) {
                            dailyStats[dateString] = { date: ngayTao, revenue: 0, convertedRevenue: 0 };
                        }
                        dailyStats[dateString].revenue += realRevenue;
                        dailyStats[dateString].convertedRevenue += convertedRevenue;
                    }

                } else if ((row.trangThaiXuat || "").trim() === 'Chưa xuất') {
                    summary.unexportedRevenue += convertedRevenue;

                    if (!unexportedDetails[groupName]) {
                        unexportedDetails[groupName] = { name: groupName, totalSL: 0, totalDTQD: 0, products: {} };
                    }
                    if (!unexportedDetails[groupName].products[productName]) {
                        unexportedDetails[groupName].products[productName] = { name: productName, sl: 0, dtqd: 0 };
                    }
                    unexportedDetails[groupName].products[productName].sl += quantity;
                    unexportedDetails[groupName].products[productName].dtqd += convertedRevenue;
                    unexportedDetails[groupName].totalSL += quantity;
                    unexportedDetails[groupName].totalDTQD += convertedRevenue;
                }
            }
        });

        summary.totalOrders = Object.keys(byCustomer).length;
        summary.bundledOrderCount = Object.values(byCustomer).filter(c => c.products.length > 1).length;
        summary.conversionRate = summary.totalRealRevenue > 0 ? (summary.totalConvertedRevenue / summary.totalRealRevenue) - 1 : 0;

        for (const customerName in byCustomer) {
            const customer = byCustomer[customerName];
            customer.conversionRate = customer.totalRealRevenue > 0 ? (customer.totalConvertedRevenue / customer.totalRealRevenue) - 1 : 0;
        }
        for (const groupName in byProductGroup) {
            const group = byProductGroup[groupName];
            group.conversionRate = group.realRevenue > 0 ? (group.convertedRevenue / group.realRevenue) - 1 : 0;
        }

        const finalDailyStats = Object.values(dailyStats).sort((a, b) => a.date - b.date);
        const finalUnexportedDetails = Object.values(unexportedDetails)
            .map(group => ({
                ...group,
                products: Object.values(group.products).sort((a, b) => b.dtqd - a.dtqd)
            }))
            .sort((a, b) => b.totalDTQD - a.totalDTQD);

        return {
            summary,
            topProductGroups: Object.values(byProductGroup)
                .sort((a, b) => b.realRevenue - a.realRevenue)
                .slice(0, 8),
            categoryChartData: Object.values(categoryChartDataMap),
            byCustomer: Object.values(byCustomer)
                .sort((a,b) => b.totalRealRevenue - a.totalRealRevenue),
            dailyStats: finalDailyStats, 
            unexportedDetails: finalUnexportedDetails 
        };
    }
};