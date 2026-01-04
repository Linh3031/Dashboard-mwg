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
 * [GENESIS NEW] Kiểm tra đơn hàng có thuộc Ngành Hàng cho phép (Trả góp) không
 * Logic: Chấp nhận nếu cột Ngành hàng chứa đúng mã hoặc bắt đầu bằng mã đó (VD: '484 - Gia dụng')
 */
const isValidSector = (nganhHang) => {
    if (!nganhHang) return false;
    const sectorVal = normalize(nganhHang); // đã lowercase
    const allowedSectors = config.DEFAULT_DATA.NGANH_HANG_TRA_GOP_ALLOW_LIST || [];

    // Check: 
    // 1. Trùng khớp mã (VD: '484' === '484')
    // 2. Hoặc bắt đầu bằng mã + ký tự phân cách (VD: '484 - ' hoặc '484 ')
    return allowedSectors.some(code => {
        const cleanCode = normalize(code);
        return sectorVal === cleanCode || 
               sectorVal.startsWith(cleanCode + ' ') || 
               sectorVal.startsWith(cleanCode + '-');
    });
};

/**
 * Kiểm tra đơn hàng có phải trả góp không
 */
const isInstallmentOrder = (hinhThucXuat) => {
    if (!hinhThucXuat) return false;
    const type = normalize(hinhThucXuat);
    const installmentTypes = (config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP || []).map(t => normalize(t));
    return installmentTypes.includes(type);
};

/**
 * Kiểm tra đơn trả góp thành công
 */
const isSuccessInstallment = (order) => {
    if (!isInstallmentOrder(order.hinhThucXuat)) return false;
    
    const statusHuy = normalize(order.trangThaiHuy);
    const statusThuTien = normalize(order.trangThaiThuTien);

    // Chưa hủy + Đã thu
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
                installmentTotal: 0,
                installmentSuccess: 0,
                installmentFail: 0,
                installmentRevenue: 0
            }
        };

        const rawOrders = emp.orders || [];
        
        // [GENESIS] BƯỚC LỌC KÉP:
        // 1. Đơn tính doanh thu
        // 2. Đơn thuộc Ngành hàng cho phép
        const validOrders = rawOrders.filter(o => 
            isRevenueOrder(o.hinhThucXuat) && 
            isValidSector(o.nganhHang)
        );

        validOrders.forEach(order => {
            kpi.totalOrders++;
            
            if (isInstallmentOrder(order.hinhThucXuat)) {
                const amount = formatCurrency(order.thanhTien);
                
                kpi.totalInstallment++;
                newEmp.stats.installmentTotal++;
                newEmp.stats.installmentRevenue += amount;

                if (isSuccessInstallment(order)) {
                    kpi.totalSuccess++;
                    newEmp.stats.installmentSuccess++;
                } else {
                    newEmp.stats.installmentFail++;
                }
            }
        });

        // Tính tỷ lệ
        newEmp.stats.approvalRate = newEmp.stats.installmentTotal > 0
            ? ((newEmp.stats.installmentSuccess / newEmp.stats.installmentTotal) * 100).toFixed(1)
            : 0;

        // Grouping cho Modal: Truyền validOrders đã lọc
        newEmp.processedCustomers = processCustomerGrouping(validOrders);

        return newEmp;
    });

    kpi.approvalRate = kpi.totalInstallment > 0
        ? ((kpi.totalSuccess / kpi.totalInstallment) * 100).toFixed(1)
        : 0;

    // Lọc hiển thị: Chỉ lấy nhân viên có đơn
    const finalEmployees = processedEmployees
        .filter(e => e.processedCustomers && e.processedCustomers.length > 0) 
        .sort((a, b) => b.stats.installmentTotal - a.stats.installmentTotal);

    return { kpi, employees: finalEmployees };
};

// Hàm group khách hàng
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