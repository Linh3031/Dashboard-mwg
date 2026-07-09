// src/services/reports/master/aggregator.js
import { get } from 'svelte/store';
import { efficiencyConfig, warehouseCustomMetrics, macroProductGroupConfig, macroCategoryConfig } from '../../../stores.js';
import { normalize } from './utils.js';
import { parseIdentity } from '../../../utils.js';

export const aggregator = {
    aggregateReport(reportData) {
        if (!reportData || reportData.length === 0) return {};

        const supermarketReport = reportData.reduce((acc, curr) => {
            for (const key in curr) {
                if (typeof curr[key] === 'number') {
                    acc[key] = (acc[key] || 0) + curr[key];
                }
            }
            
            ['doanhThuTheoNganhHang', 'doanhThuTheoNhomHang', 'doanhThuTheoMaSanPham'].forEach(dictKey => {
                if(curr[dictKey]) {
                    if(!acc[dictKey]) acc[dictKey] = {};
                    Object.entries(curr[dictKey]).forEach(([k, v]) => {
                        if(!acc[dictKey][k]) acc[dictKey][k] = { ...v };
                        else {
                            acc[dictKey][k].revenue += v.revenue;
                            acc[dictKey][k].quantity += v.quantity;
                            acc[dictKey][k].revenueQuyDoi += v.revenueQuyDoi;
                        }
                    });
                }
            });

            return acc;
        }, { doanhThu: 0, dynamicMetrics: {} });

        supermarketReport.nganhHangChiTiet = supermarketReport.doanhThuTheoNganhHang;
        supermarketReport.nhomHangChiTiet = supermarketReport.doanhThuTheoNhomHang;
        supermarketReport.sanPhamChiTiet = supermarketReport.doanhThuTheoMaSanPham; 

        const totalRevenue = supermarketReport.doanhThu || 1;
        supermarketReport.pctPhuKien = (supermarketReport.dtPhuKien || 0) / totalRevenue;
        supermarketReport.pctGiaDung = (supermarketReport.dtGiaDung || 0) / totalRevenue;
        supermarketReport.pctMLN = (supermarketReport.dtMLN || 0) / totalRevenue;
        supermarketReport.pctSim = (supermarketReport.dtSim || 0) / totalRevenue;
        supermarketReport.pctVAS = (supermarketReport.dtVAS || 0) / totalRevenue;
        supermarketReport.pctBaoHiem = (supermarketReport.dtBaoHiem || 0) / totalRevenue;
        supermarketReport.hieuQuaQuyDoi = (supermarketReport.doanhThuQuyDoi || 0) / totalRevenue - 1;
        supermarketReport.tyLeTraCham = (supermarketReport.doanhThuTraGop || 0) / totalRevenue;
        supermarketReport.comparisonData = { value: 0, percentage: 'N/A' }; 

        if (supermarketReport.qdc) {
            for (const key in supermarketReport.qdc) {
                const group = supermarketReport.qdc[key];
                group.donGia = group.sl > 0 ? group.dt / group.sl : 0;
            }
        }

        const $efficiencyConfig = get(efficiencyConfig) || [];
        const $warehouseCustomMetrics = get(warehouseCustomMetrics) || [];
        const $macroGrpCfg = get(macroProductGroupConfig) || []; 
        const $macroCatCfg = get(macroCategoryConfig) || [];     
        const allMetricsConfig = [...$efficiencyConfig, ...$warehouseCustomMetrics];

        supermarketReport.dynamicMetrics = {};
        
        if (allMetricsConfig.length > 0) {
            allMetricsConfig.forEach(cfg => {
                try {
                    if (!cfg.id || !cfg.groupA || !cfg.groupB) return;

                    const numType = cfg.typeA || 'DTTL';
                    const denType = cfg.typeB || 'DTTL'; 

                    const calcGroupValue = (groupList, valueType) => {
                        let total = 0;
                        if (!Array.isArray(groupList) || groupList.length === 0) return 0;
                        
                        const resolvedIds = new Set();
                        
                        const addCleanId = (rawId) => {
                            if (!rawId) return;
                            const parsed = parseIdentity(rawId);
                            const cleanId = (parsed.id !== 'unknown' ? parsed.id : rawId).toString().trim();
                            if (cleanId) resolvedIds.add(cleanId);
                        };

                        groupList.forEach(rawName => {
                            const macroGrp = $macroGrpCfg.find(m => m.name === rawName);
                            const macroCat = $macroCatCfg.find(m => m.name === rawName);
                            
                            if (macroGrp && macroGrp.items) {
                                macroGrp.items.forEach(subId => addCleanId(subId));
                            } else if (macroCat && macroCat.items) {
                                macroCat.items.forEach(subId => addCleanId(subId));
                            } else {
                                addCleanId(rawName);
                            }
                        });

                        resolvedIds.forEach(targetId => {
                            // CẤM QUÉT THEO CHUỖI, CHỈ TÌM CHÍNH XÁC ID TRONG NHÓM VÀ NGÀNH
                            const nh = supermarketReport.doanhThuTheoNhomHang?.[targetId];
                            const ng = supermarketReport.doanhThuTheoNganhHang?.[targetId];

                            let foundData = null;
                            if (nh && (nh.quantity > 0 || nh.revenue > 0)) foundData = nh;
                            else if (ng && (ng.quantity > 0 || ng.revenue > 0)) foundData = ng;

                            if (foundData) {
                                if (valueType === 'SL') total += foundData.quantity;
                                else if (valueType === 'DTQD') total += foundData.revenueQuyDoi;
                                else total += foundData.revenue;
                            }
                        });

                        return total;
                    };

                    const numVal = calcGroupValue(cfg.groupA, numType);
                    const denVal = calcGroupValue(cfg.groupB, denType);
                    
                    supermarketReport.dynamicMetrics[cfg.id] = {
                        value: denVal > 0 ? numVal / denVal : 0,
                        target: cfg.target, 
                        label: cfg.label
                    };
                } catch(e) { console.error("Aggregator Metric Error:", e); }
            });
        }

        return supermarketReport;
    }
};