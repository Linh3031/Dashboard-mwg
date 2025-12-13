// src/services/reports/master/aggregator.js
import { get } from 'svelte/store';
import { efficiencyConfig, warehouseCustomMetrics } from '../../../stores.js';
import { normalize } from './utils.js';

export const aggregator = {
    aggregateReport(reportData) {
        if (!reportData || reportData.length === 0) return {};

        // Tính tổng hợp cho toàn siêu thị
        const supermarketReport = reportData.reduce((acc, curr) => {
            // Cộng dồn tất cả các trường số
            for (const key in curr) {
                if (typeof curr[key] === 'number') {
                    acc[key] = (acc[key] || 0) + curr[key];
                }
            }
            
            // Merge chi tiết Ngành hàng / Nhóm hàng
            ['doanhThuTheoNganhHang', 'doanhThuTheoNhomHang'].forEach(dictKey => {
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

        // Tính lại % Tổng hợp Siêu thị
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

        // --- Tính lại Dynamic Metrics cho cấp Siêu thị ---
        const $efficiencyConfig = get(efficiencyConfig) || [];
        const $warehouseCustomMetrics = get(warehouseCustomMetrics) || [];
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
                        
                        groupList.forEach(rawName => {
                            if(!rawName) return;
                            const cleanCfgName = normalize(rawName);
                             const scanBucket = (bucket) => {
                                for (const [k, v] of Object.entries(bucket)) {
                                    if (normalize(k).includes(cleanCfgName)) {
                                        if(valueType==='SL') total+=v.quantity;
                                        else if(valueType==='DTQD') total+=v.revenueQuyDoi;
                                        else total+=v.revenue;
                                    }
                                }
                            };
                            scanBucket(supermarketReport.doanhThuTheoNganhHang);
                            scanBucket(supermarketReport.doanhThuTheoNhomHang);
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
                } catch(e) {}
            });
        }

        return supermarketReport;
    }
};