// src/services/reports/master/metricsProcessor.js
import { get } from 'svelte/store';
import { efficiencyConfig, warehouseCustomMetrics } from '../../../stores.js';
import { normalize } from './utils.js';

export const metricsProcessor = {
    calculateDynamicMetrics(data, goalSettings) {
        const $efficiencyConfig = get(efficiencyConfig) || [];
        const $warehouseCustomMetrics = get(warehouseCustomMetrics) || [];
        
        // Gộp cấu hình Admin và User
        const allMetricsConfig = [...$efficiencyConfig, ...$warehouseCustomMetrics];
        
        const dynamicMetrics = {};

        if (allMetricsConfig && Array.isArray(allMetricsConfig)) {
            allMetricsConfig.forEach(cfg => {
                try {
                    if (!cfg.id || !cfg.groupA || !cfg.groupB) return;

                    const numType = cfg.typeA || cfg.type || 'DTTL';
                    const denType = cfg.typeB || (numType === 'SL' ? 'SL' : 'DTTL');

                    const calcValue = (groupList, type) => {
                        let total = 0;
                        groupList.forEach(shortName => {
                            const normShort = normalize(shortName);
                            // Hàm quét đệ quy
                            const scanBucket = (bucket) => {
                                for (const [key, val] of Object.entries(bucket)) {
                                    if (normalize(key).includes(normShort)) {
                                        if (type === 'SL') total += val.quantity;
                                        else if (type === 'DTQD') total += val.revenueQuyDoi;
                                        else total += val.revenue;
                                    }
                                }
                            };
                            scanBucket(data.doanhThuTheoNganhHang);
                            scanBucket(data.doanhThuTheoNhomHang);
                        });
                        return total;
                    };

                    const num = calcValue(cfg.groupA, numType);
                    const den = calcValue(cfg.groupB, denType);

                    dynamicMetrics[cfg.id] = {
                        value: den > 0 ? num / den : 0,
                        // Lấy target từ Goal Settings nếu có, nếu không lấy default
                        target: goalSettings && goalSettings[cfg.id] ? parseFloat(goalSettings[cfg.id]) : (cfg.target || 0),
                        label: cfg.label
                    };
                } catch (e) {
                    // Silent fail
                }
            });
        }
        return dynamicMetrics;
    }
};