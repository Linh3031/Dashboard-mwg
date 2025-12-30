// src/services/reports/master/metricsProcessor.js
import { get } from 'svelte/store';
import { efficiencyConfig, warehouseCustomMetrics } from '../../../stores.js';
import { normalize } from './utils.js';

export const metricsProcessor = {
    calculateDynamicMetrics(data, goalSettings) {
        // [INFO] Lấy tên nhân viên để log dễ theo dõi
        const empName = data.info?.name || data.name || "Unknown Employee";
        
        // Chỉ log chi tiết nếu là Admin hoặc đang debug
        const shouldLog = true; 

        if (shouldLog) {
            console.groupCollapsed(`%c🔍 [DEBUG-METRIC] Tính toán cho: ${empName}`, "color: #2563eb; font-weight: bold; background: #eff6ff; padding: 2px 5px; border-radius: 4px;");
        }

        const $efficiencyConfig = get(efficiencyConfig) || [];
        const $warehouseCustomMetrics = get(warehouseCustomMetrics) || [];
        
        // Gộp cấu hình
        const allMetricsConfig = [...$efficiencyConfig, ...$warehouseCustomMetrics];
        
        const dynamicMetrics = {};

        if (allMetricsConfig && Array.isArray(allMetricsConfig)) {
            allMetricsConfig.forEach(cfg => {
                try {
                    if (!cfg.id || !cfg.groupA || !cfg.groupB) return;

                    // [LOGIC FIX] Ưu tiên lấy percentMetric (từ Modal mới) -> typeA -> type -> mặc định DTTL
                    // Điều này đảm bảo khi bạn chọn "Số lượng" ở Modal, code sẽ tính theo SL
                    const metricType = cfg.percentMetric || cfg.typeA || cfg.type || 'DTTL';
                    
                    const numType = metricType; 
                    const denType = cfg.typeB || metricType; // Nếu mẫu số không cấu hình riêng thì dùng chung loại

                    if (shouldLog) {
                        console.group(`📊 Cấu hình: ${cfg.label} (ID: ${cfg.id})`);
                        console.log(`- Loại dữ liệu: %c${metricType}`, "color: red; font-weight: bold");
                        console.log(`- IDs Tử số (A):`, cfg.groupA);
                        console.log(`- IDs Mẫu số (B):`, cfg.groupB);
                    }

                    const modeA = cfg.modeA || 'group';
                    const modeB = cfg.modeB || (cfg.modeA === 'category' ? 'category' : 'group'); 

                    const calcValue = (groupList, type, mode, contextName) => {
                        let total = 0;
                        if (!Array.isArray(groupList)) return 0;
                        
                        let logDetails = []; // Mảng chứa chi tiết để in bảng log

                        groupList.forEach(targetId => {
                            if (!targetId) return;
                            const cleanTargetId = normalize(targetId); 

                            // Chọn thùng dữ liệu
                            const bucketToScan = (mode === 'category') 
                                ? data.doanhThuTheoNganhHang 
                                : data.doanhThuTheoNhomHang;

                            // Quét dữ liệu
                            for (const [key, val] of Object.entries(bucketToScan)) {
                                const cleanKey = normalize(key);
                                
                                if (cleanKey === cleanTargetId) {
                                    let valueToAdd = 0;
                                    // Logic lấy giá trị chính xác theo type
                                    if (type === 'SL') valueToAdd = val.quantity || 0;
                                    else if (type === 'DTQD') valueToAdd = val.revenueQuyDoi || 0;
                                    else valueToAdd = val.revenue || 0; // Mặc định là DTTL

                                    total += valueToAdd;

                                    // Lưu lại chi tiết để log
                                    logDetails.push({
                                        'Nguồn (Key)': key,
                                        'Tên SP/Nhóm': val.name,
                                        'Loại tính': type,
                                        'Giá trị cộng': valueToAdd.toLocaleString('vi-VN')
                                    });
                                }
                            }
                        });

                        // [DEBUG] In bảng chi tiết các thành phần cấu thành nên tổng số
                        if (shouldLog && logDetails.length > 0) {
                            console.log(`%c➤ Chi tiết ${contextName} (Tổng: ${total.toLocaleString()}):`, "color: green; font-weight: bold");
                            console.table(logDetails);
                        } else if (shouldLog) {
                            console.log(`%c➤ Chi tiết ${contextName}: KHÔNG TÌM THẤY DỮ LIỆU KHỚP`, "color: orange");
                        }

                        return total;
                    };

                    // Tính toán
                    const num = calcValue(cfg.groupA, numType, modeA, 'TỬ SỐ');
                    const den = calcValue(cfg.groupB, denType, modeB, 'MẪU SỐ');

                    // Tính kết quả cuối cùng
                    const resultPercent = den > 0 ? (num / den) * 100 : 0;

                    if (shouldLog) {
                        console.log(
                            `%c🏁 KẾT QUẢ: ${num} / ${den} = ${resultPercent.toFixed(2)}%`, 
                            "background: #333; color: #fff; padding: 4px; font-size: 12px; border-radius: 4px;"
                        );
                        console.groupEnd(); // End group Config
                    }

                    dynamicMetrics[cfg.id] = {
                        value: den > 0 ? num / den : 0, // Lưu dạng decimal (0.5) để component UI format sau
                        target: goalSettings && goalSettings[cfg.id] ? parseFloat(goalSettings[cfg.id]) : (cfg.target || 0),
                        label: cfg.label
                    };
                } catch (e) {
                    console.error("Metric Calc Error:", e);
                }
            });
            if (shouldLog) console.groupEnd(); // End group Employee
        }
        return dynamicMetrics;
    }
};