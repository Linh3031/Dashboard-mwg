// src/services/reports/installment.report.js
import { config } from '../../config';

// Helpers
const normalize = (str) => str ? str.toString().trim().toLowerCase() : '';
const formatCurrency = (amount) => amount ? parseInt(amount) : 0;

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
 * Kiểm tra đơn trả góp thành công (Đậu/Đã thu)
 */
const isSuccessInstallment = (order) => {
    // 1. Phải là đơn trả góp
    if (!isInstallmentOrder(order.hinhThucXuat)) return false;

    const statusHuy = normalize(order.trangThaiHuy);
    const statusThuTien = normalize(order.trangThaiThuTien);

    // 2. Chưa hủy + Đã thu
    return statusHuy !== 'đã hủy' && statusThuTien === 'đã thu';
};

/**
 * Hàm xử lý chính: Nhận vào danh sách nhân viên (đã có orders)
 */
export const processInstallmentReport = (employeesInput) => {
    const kpi = {
        totalOrders: 0,
        totalInstallment: 0,
        totalSuccess: 0,
        approvalRate: 0
    };

    // Đảm bảo input là array
    const sourceEmployees = Array.isArray(employeesInput) ? employeesInput : [];

    const processedEmployees = sourceEmployees.map(emp => {
        // Clone object để không ảnh hưởng dữ liệu gốc
        const newEmp = {
            ...emp,
            stats: {
                // Giữ lại stats cũ nếu cần, hoặc tạo mới
                ...emp.stats, 
                // Các chỉ số riêng cho tab Trả Góp
                installmentTotal: 0,
                installmentSuccess: 0,
                installmentFail: 0,
                installmentRevenue: 0
            }
        };

        const orders = emp.orders || []; // Lấy đơn hàng đã được system map sẵn
        
        // Tính toán cho từng nhân viên
        orders.forEach(order => {
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

        // Tính tỷ lệ duyệt của nhân viên
        newEmp.stats.approvalRate = newEmp.stats.installmentTotal > 0
            ? ((newEmp.stats.installmentSuccess / newEmp.stats.installmentTotal) * 100).toFixed(1)
            : 0;

        // Xử lý group khách hàng cho Modal chi tiết
        newEmp.processedCustomers = processCustomerGrouping(orders);

        return newEmp;
    });

    // Tính tỷ lệ duyệt toàn kho
    kpi.approvalRate = kpi.totalInstallment > 0
        ? ((kpi.totalSuccess / kpi.totalInstallment) * 100).toFixed(1)
        : 0;

    // Lọc: Chỉ lấy nhân viên có đơn trả góp để hiển thị cho gọn (hoặc lấy hết tùy bạn)
    // Ở đây tôi lấy hết nhân viên có đơn hàng bất kỳ để so sánh
    const finalEmployees = processedEmployees
        .filter(e => e.orders && e.orders.length > 0)
        .sort((a, b) => b.stats.installmentTotal - a.stats.installmentTotal);

    return { kpi, employees: finalEmployees };
};

// Hàm group khách hàng (giữ nguyên logic cũ vì nó tốt)
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