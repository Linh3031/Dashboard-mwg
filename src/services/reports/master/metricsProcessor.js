// src/services/reports/master/metricsProcessor.js
import { get } from 'svelte/store';
import { efficiencyConfig, warehouseCustomMetrics } from '../../../stores.js';
import { normalize } from './utils.js';

export const metricsProcessor = {
    calculateDynamicMetrics(data, goalSettings) {
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

                    const modeA = cfg.modeA || 'group';
                    const modeB = cfg.modeB || (cfg.modeA === 'category' ? 'category' : 'group'); 

                    const calcValue = (groupList, type, mode) => {
                        let total = 0;
                        if (!Array.isArray(groupList)) return 0;
                        
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
                                }
                            }
                        });

                        return total;
                    };

                    // Tính toán
                    const num = calcValue(cfg.groupA, numType, modeA);
                    const den = calcValue(cfg.groupB, denType, modeB);

                    dynamicMetrics[cfg.id] = {
                        value: den > 0 ? num / den : 0, // Lưu dạng decimal (0.5) để component UI format sau
                        target: goalSettings && goalSettings[cfg.id] ? parseFloat(goalSettings[cfg.id]) : (cfg.target || 0),
                        label: cfg.label
                    };
                } catch (e) {
                    console.error("Metric Calc Error:", e);
                }
            });
        }
        return dynamicMetrics;
    }
};