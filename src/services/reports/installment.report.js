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
    // Điều kiện đậu: Không hủy VÀ Đã thu tiền
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
                totalRevenue: 0,              // DT Thực (Đã thu tiền & Không hủy)
                installmentTotal: 0,
                installmentSuccess: 0,
                installmentFail: 0,
                installmentRevenueRaw: 0,     // DT Trả chậm gốc
                installmentRevenueWeighted: 0 // DT Trả chậm (30%)
            }
        };

        const rawOrders = emp.orders || [];
        
        // 1. Lấy danh sách đơn hợp lệ
        const validOrders = rawOrders.filter(o => 
            isRevenueOrder(o.hinhThucXuat) && 
            isValidSector(o.nganhHang)
        );

        validOrders.forEach(order => {
            const amount = formatCurrency(order.thanhTien);
            
            // [GENESIS FIX] Xác định điều kiện Doanh Thu Thực
            const isCancelled = normalize(order.trangThaiHuy) === 'đã hủy';
            const isCollected = normalize(order.trangThaiThuTien) === 'đã thu';

            // ĐIỀU KIỆN MỚI: Phải là "Đã thu" và Không phải "Đã hủy"
            if (isCollected && !isCancelled) {
                newEmp.stats.totalRevenue += amount;
            }
            
            kpi.totalOrders++;
            
            // Xử lý KPI Trả Chậm
            if (isInstallmentOrder(order.hinhThucXuat)) {
                kpi.totalInstallment++;
                newEmp.stats.installmentTotal++;
                
                // Logic đậu/rớt giữ nguyên (đã dùng logic tương tự trong hàm isSuccessInstallment)
                if (isSuccessInstallment(order)) {
                    kpi.totalSuccess++;
                    newEmp.stats.installmentSuccess++;
                    newEmp.stats.installmentRevenueRaw += amount;
                } else {
                    newEmp.stats.installmentFail++;
                }
            }
        });

        // Tính DT Trả chậm quy đổi (30%)
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