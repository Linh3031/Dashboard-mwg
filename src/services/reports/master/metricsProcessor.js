// src/services/reports/master/metricsProcessor.js
import { get } from 'svelte/store';
import { efficiencyConfig, macroProductGroupConfig, macroCategoryConfig } from '../../../stores.js';
import { normalize } from './utils.js';
import { parseIdentity } from '../../../utils.js';

export const metricsProcessor = {
    calculateDynamicMetrics(salesData, goalSettings) {
        const metrics = {};
        const $efficiencyConfig = get(efficiencyConfig) || [];
        const $macroGrpCfg = get(macroProductGroupConfig) || []; 
        const $macroCatCfg = get(macroCategoryConfig) || []; 

        if (!$efficiencyConfig.length) return metrics;

        $efficiencyConfig.forEach(cfg => {
            try {
                if (!cfg.id || !cfg.groupA || !cfg.groupB) return;

                const numType = cfg.typeA || 'DTTL';
                const denType = cfg.typeB || 'DTTL';

                const calcGroupValue = (groupList, valueType) => {
                    let total = 0;
                    if (!Array.isArray(groupList) || groupList.length === 0) return 0;

                    const resolvedIds = new Set();

                    groupList.forEach(rawName => {
                        if(!rawName) return;

                        const macroGrp = $macroGrpCfg.find(m => m.name === rawName);
                        const macroCat = $macroCatCfg.find(m => m.name === rawName);
                        
                        if (macroGrp && macroGrp.items) {
                            macroGrp.items.forEach(id => resolvedIds.add(id));
                        } else if (macroCat && macroCat.items) {
                            macroCat.items.forEach(id => resolvedIds.add(id));
                        } else {
                            resolvedIds.add(rawName);
                        }
                    });

                    resolvedIds.forEach(targetId => {
                        const parsed = parseIdentity(targetId);
                        const searchKey = (parsed.id !== 'unknown' ? parsed.id : targetId).toString().trim();

                        // CHỈ TRUY XUẤT NHÓM HÀNG HOẶC NGÀNH HÀNG
                        const nh = salesData.doanhThuTheoNhomHang?.[searchKey];
                        const ng = salesData.doanhThuTheoNganhHang?.[searchKey];

                        let foundData = null;
                        if (nh && (nh.quantity > 0 || nh.revenue > 0)) foundData = nh;
                        else if (ng && (ng.quantity > 0 || ng.revenue > 0)) foundData = ng;

                        if (foundData) {
                            if(valueType === 'SL') total += foundData.quantity;
                            else if(valueType === 'DTQD') total += foundData.revenueQuyDoi;
                            else total += foundData.revenue;
                        }
                    });
                    return total;
                };

                const numVal = calcGroupValue(cfg.groupA, numType);
                const denVal = calcGroupValue(cfg.groupB, denType);
                
                metrics[cfg.id] = {
                    value: denVal > 0 ? numVal / denVal : 0,
                    target: cfg.target,
                    label: cfg.label
                };
            } catch(e) {
                console.error("Metric Processor Error:", e);
            }
        });

        return metrics;
    }
};