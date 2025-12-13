// src/services/processing/logic/dynamicTable.processor.js
import { formatters } from '../../../utils/formatters.js';

export const dynamicTableProcessor = {
    // Hàm chuẩn hóa chuỗi để so sánh (bỏ dấu, viết thường, bỏ ký tự lạ)
    normalizeStr(str) {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
            .replace(/\s+/g, '') 
            .replace(/[^\w\d]/g, '');
    },

    // Hàm tìm kiếm dữ liệu đệ quy trong object (tìm mờ)
    findItemData(employee, rawName) {
        const target = this.normalizeStr(rawName);
        const scanObject = (obj) => {
            if (!obj) return null;
            const foundKey = Object.keys(obj).find(key => {
                const current = this.normalizeStr(key);
                // So sánh 2 chiều: target chứa key hoặc key chứa target
                return current.includes(target) || target.includes(current);
            });
            return foundKey ? obj[foundKey] : null;
        };
        
        // Ưu tiên tìm trong Nhóm hàng, sau đó đến Ngành hàng
        let result = scanObject(employee.doanhThuTheoNhomHang);
        if (result) return result;
        result = scanObject(employee.doanhThuTheoNganhHang);
        return result;
    },

    // Hàm chính: Biến đổi dữ liệu thô thành dữ liệu hiển thị cho bảng
    processTableData(reportData, config) {
        if (!reportData || !config) return { processedData: [], totals: {} };

        const processedData = reportData.map(employee => {
            const row = {
                maNV: employee.maNV,
                hoTen: employee.hoTen,
                mainValue: 0,      // Tổng DT (để sort)
                mainValue_dtqd: 0, // Tổng DTQĐ
                mainValue_sl: 0,   // Tổng SL
                columns: {}        // Data chi tiết từng cột
            };

            if (config.subColumns && Array.isArray(config.subColumns)) {
                config.subColumns.forEach(col => {
                    const metrics = col.metrics || { sl: false, dt: true, dtqd: false };
                    let sl = 0, dt = 0, dtqd = 0;
                    let details = [];

                    col.items.forEach(rawItemName => {
                        const itemData = this.findItemData(employee, rawItemName);
                        if (itemData) {
                            const qty = itemData.quantity || 0;
                            const rev = itemData.revenue || 0;
                            const revQd = itemData.revenueQuyDoi || 0;

                            sl += qty;
                            dt += rev;
                            dtqd += revQd;
                            
                            if (qty > 0 || rev > 0) {
                                details.push(`${rawItemName}: ${formatters.formatNumber(qty)} / ${formatters.formatRevenue(rev)}`);
                            }
                        }
                    });

                    row.columns[col.header] = { sl, dt, dtqd, tooltip: details.join('\n') };
                    
                    if (metrics.dt) row.mainValue += dt;
                    if (metrics.dtqd) row.mainValue_dtqd += dtqd;
                    if (metrics.sl) row.mainValue_sl += sl;
                    
                    // Fallback: Nếu không chọn metric nào thì cộng SL vào mainValue (để sort)
                    if (!metrics.dt && !metrics.dtqd && !metrics.sl) row.mainValue += sl;
                });
            }
            // Chỉ trả về nếu có dữ liệu
            return (row.mainValue > 0 || row.mainValue_sl > 0 || row.mainValue_dtqd > 0) ? row : null;
        }).filter(Boolean);

        // Tính tổng toàn bảng (Totals)
        const totals = processedData.reduce((acc, row) => {
            acc.mainValue += row.mainValue;
            acc.mainValue_dtqd += row.mainValue_dtqd;
            acc.mainValue_sl += row.mainValue_sl;

            Object.keys(row.columns).forEach(key => {
                if (!acc.columns[key]) acc.columns[key] = { sl: 0, dt: 0, dtqd: 0 };
                acc.columns[key].sl += row.columns[key].sl;
                acc.columns[key].dt += row.columns[key].dt;
                acc.columns[key].dtqd += row.columns[key].dtqd;
            });
            return acc;
        }, { mainValue: 0, mainValue_dtqd: 0, mainValue_sl: 0, columns: {} });

        return { processedData, totals };
    },

    // Hàm sắp xếp dữ liệu
    sortTableData(data, key, direction) {
        return [...data].sort((a, b) => {
            if (key === 'hoTen') {
                return direction === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
            }
            if (key === 'mainValue') return direction === 'asc' ? a.mainValue - b.mainValue : b.mainValue - a.mainValue;
            if (key === 'totalSL') return direction === 'asc' ? a.mainValue_sl - b.mainValue_sl : b.mainValue_sl - a.mainValue_sl;
            if (key === 'totalDTQD') return direction === 'asc' ? a.mainValue_dtqd - b.mainValue_dtqd : b.mainValue_dtqd - a.mainValue_dtqd;

            // Sort theo cột con (Format key: "HeaderName|MetricType")
            if (key.includes('|')) {
                const [colHeader, type] = key.split('|');
                const valA = a.columns[colHeader]?.[type] || 0;
                const valB = b.columns[colHeader]?.[type] || 0;
                return direction === 'asc' ? valA - valB : valB - valA;
            }
            // Mặc định
            return direction === 'asc' ? a.mainValue - b.mainValue : b.mainValue - a.mainValue;
        });
    }
};