// src/services/reports/installment.report.js
import { config } from '../../config';

// Helpers
const normalize = (str) => str ? str.toString().trim().toLowerCase() : '';
const formatCurrency = (amount) => amount ? parseInt(amount) : 0;

/**
 * [GENESIS] Kiểm tra đơn hàng có được tính doanh thu không
 */
const isRevenueOrder = (hinhThucXuat) => {
    if (!hinhThucXuat) return false;
    const type = normalize(hinhThucXuat);
    const revenueTypes = (config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU || []).map(t => normalize(t));
    return revenueTypes.includes(type);
};

/**
 * [GENESIS] Kiểm tra Ngành Hàng cho phép
 */
const isValidSector = (nganhHang) => {
    if (!nganhHang) return false;
    const sectorVal = normalize(nganhHang); 
    const allowedSectors = config.DEFAULT_DATA.NGANH_HANG_TRA_GOP_ALLOW_LIST || [];

    return allowedSectors.some(code => {
        const cleanCode = normalize(code);
        return sectorVal === cleanCode || 
               sectorVal.startsWith(cleanCode + ' ') || 
               sectorVal.startsWith(cleanCode + '-');
    });
};

const isInstallmentOrder = (hinhThucXuat) => {
    if (!hinhThucXuat) return false;
    const type = normalize(hinhThucXuat);
    const installmentTypes = (config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP || []).map(t => normalize(t));
    return installmentTypes.includes(type);
};

const isSuccessInstallment = (order) => {
    if (!isInstallmentOrder(order.hinhThucXuat)) return false;
    const statusHuy = normalize(order.trangThaiHuy);
    const statusThuTien = normalize(order.trangThaiThuTien);
    return statusHuy !== 'đã hủy' && statusThuTien === 'đã thu';
};

/**
 * Hàm xử lý chính
 */
export const processInstallmentReport = (employeesInput) => {
    const kpi = {
        totalOrders: 0,
        totalInstallment: 0,
        totalSuccess: 0,
        approvalRate: 0
    };

    const sourceEmployees = Array.isArray(employeesInput) ? employeesInput : [];

    const processedEmployees = sourceEmployees.map(emp => {
        const newEmp = {
            ...emp,
            stats: {
                ...emp.stats, 
                totalRevenue: 0,          // [NEW] Tổng doanh thu thực (tất cả đơn hợp lệ)
                installmentTotal: 0,
                installmentSuccess: 0,
                installmentFail: 0,
                installmentRevenueRaw: 0,     // [NEW] Doanh thu trả chậm gốc (chưa nhân 30%)
                installmentRevenueWeighted: 0 // [NEW] Doanh thu trả chậm * 30%
            }
        };

        const rawOrders = emp.orders || [];
        
        // 1. Lọc đơn hợp lệ (Doanh thu + Ngành hàng)
        const validOrders = rawOrders.filter(o => 
            isRevenueOrder(o.hinhThucXuat) && 
            isValidSector(o.nganhHang)
        );

        validOrders.forEach(order => {
            const amount = formatCurrency(order.thanhTien);

            // [NEW] Cộng tổng doanh thu thực (bất kể trả góp hay tiền mặt)
            newEmp.stats.totalRevenue += amount;
            
            kpi.totalOrders++;
            
            if (isInstallmentOrder(order.hinhThucXuat)) {
                kpi.totalInstallment++;
                newEmp.stats.installmentTotal++;
                
                if (isSuccessInstallment(order)) {
                    kpi.totalSuccess++;
                    newEmp.stats.installmentSuccess++;
                    
                    // [NEW] Chỉ cộng doanh thu trả chậm nếu ĐẬU
                    newEmp.stats.installmentRevenueRaw += amount;
                } else {
                    newEmp.stats.installmentFail++;
                }
            }
        });

        // [NEW] Tính doanh thu trả chậm quy đổi (30%)
        newEmp.stats.installmentRevenueWeighted = newEmp.stats.installmentRevenueRaw * 0.3;

        // Tính tỷ lệ duyệt
        newEmp.stats.approvalRate = newEmp.stats.installmentTotal > 0
            ? ((newEmp.stats.installmentSuccess / newEmp.stats.installmentTotal) * 100).toFixed(1)
            : 0;

        newEmp.processedCustomers = processCustomerGrouping(validOrders);

        return newEmp;
    });

    kpi.approvalRate = kpi.totalInstallment > 0
        ? ((kpi.totalSuccess / kpi.totalInstallment) * 100).toFixed(1)
        : 0;

    const finalEmployees = processedEmployees
        .filter(e => e.processedCustomers && e.processedCustomers.length > 0) 
        .sort((a, b) => b.stats.installmentTotal - a.stats.installmentTotal);

    return { kpi, employees: finalEmployees };
};

const processCustomerGrouping = (orders) => {
    const customerMap = {};
    orders.forEach(order => {
        const rawName = order.tenKhachHang || 'Khách lẻ';
        const key = normalize(rawName);

        if (!customerMap[key]) {
            customerMap[key] = {
                name: rawName,
                totalOrders: 0, installmentCount: 0, successCount: 0, orders: []
            };
        }
        const cust = customerMap[key];
        const isInst = isInstallmentOrder(order.hinhThucXuat);
        const isSucc = isSuccessInstallment(order);

        cust.totalOrders++; 
        if (isInst) {
            cust.installmentCount++;
            if (isSucc) cust.successCount++;
        }
        cust.orders.push({ ...order, _isInstallment: isInst, _isSuccess: isSucc });
    });

    return Object.values(customerMap).sort((a, b) => {
        if (b.installmentCount !== a.installmentCount) return b.installmentCount - a.installmentCount;
        return b.totalOrders - a.totalOrders;
    });
};