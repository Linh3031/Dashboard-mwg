// src/services/reports/master.report.js
// Version 6.0 - Modularized Architecture
import { get } from 'svelte/store';
import { danhSachNhanVien } from '../../stores.js';

// Import sub-modules
import { configLoader } from './master/configLoader.js';
import { salaryProcessor } from './master/salaryProcessor.js';
import { salesProcessor } from './master/salesProcessor.js';
import { metricsProcessor } from './master/metricsProcessor.js';
import { aggregator } from './master/aggregator.js';

export const masterReportLogic = {
    generateMasterReportData: (sourceData, goalSettings, isRealtime = false) => {
        const $danhSachNhanVien = get(danhSachNhanVien);
        if (!$danhSachNhanVien || $danhSachNhanVien.length === 0) return [];

        // 1. Load Configurations & Keywords
        const uiKeywords = configLoader.loadUiKeywords();

        // 2. Prepare Salary Data
        const salaryData = salaryProcessor.prepareSalaryData();

        // 3. Main Loop: Process each employee
        return $danhSachNhanVien.map((employee) => {
            // A. Calculate Sales (Core Logic)
            const salesData = salesProcessor.processEmployeeSales(employee, sourceData, uiKeywords);
            
            // B. Calculate Dynamic Metrics (Admin + User)
            salesData.dynamicMetrics = metricsProcessor.calculateDynamicMetrics(salesData, goalSettings);
            
            // C. Calculate Static Ratios
            const staticRatios = salesProcessor.calculateStaticRatios(salesData);

            // D. Calculate Salary
            const salaryInfo = salaryProcessor.calculateEmployeeSalary(employee, salaryData);

            // E. Calculate Average Price
            const totalQuantity = Object.values(salesData.doanhThuTheoNganhHang).reduce((sum, c) => sum + c.quantity, 0);
            const donGiaTrungBinh = totalQuantity > 0 ? salesData.doanhThu / totalQuantity : 0;

            // F. Combine Everything
            return { 
                ...employee, 
                ...salesData, 
                ...staticRatios,
                ...salaryInfo,
                donGiaTrungBinh,
                mucTieu: goalSettings 
            };
        });
    },

    aggregateReport: (reportData, selectedWarehouse = null) => {
        return aggregator.aggregateReport(reportData);
    }
};