// src/services/reports/master.report.js
// Version 6.3 - Surgical Logic: Fix Warehouse Filtering for Multi-Warehouse (Array Support)
import { get } from 'svelte/store';
import { danhSachNhanVien, selectedWarehouse } from '../../stores.js';

// Import sub-modules
import { configLoader } from './master/configLoader.js';
import { salaryProcessor } from './master/salaryProcessor.js';
import { salesProcessor } from './master/salesProcessor.js';
import { metricsProcessor } from './master/metricsProcessor.js';
import { aggregator } from './master/aggregator.js';

export const masterReportLogic = {
    generateMasterReportData: (sourceData, goalSettings, isRealtime = false) => {
        const $rawDanhSachNhanVien = get(danhSachNhanVien);
        const currentSelectedWh = get(selectedWarehouse);

        if (!$rawDanhSachNhanVien || $rawDanhSachNhanVien.length === 0) return [];

        // 1. Load Configurations & Keywords
        const uiKeywords = configLoader.loadUiKeywords();

        // --- PHẪU THUẬT LOGIC: LỌC DỮ LIỆU ĐÚNG THEO KHO (WAREHOUSE ISOLATION) ---
        
        let filteredEmployees = $rawDanhSachNhanVien;
        let filteredSourceData = sourceData;

        if (currentSelectedWh && currentSelectedWh !== 'ALL') {
             // [SỬA LỖI]: Hàm helper kiểm tra xem mã kho có nằm trong danh sách đang chọn không (Hỗ trợ cả Mảng và Chuỗi)
             const isMatchWh = (code, selected) => {
                 if (Array.isArray(selected)) return selected.includes(code);
                 return code === selected;
             };

             // 1.1 Lọc Nhân viên
             filteredEmployees = $rawDanhSachNhanVien.filter(emp => {
                 const whCode = String(emp.maKho || emp.storeId || emp['Mã kho tạo'] || emp['Kho tạo'] || '').trim();
                 return isMatchWh(whCode, currentSelectedWh);
             });

             // 1.2 Lọc Dữ liệu Giao dịch (YCX) chỉ thuộc về kho đang chọn
             if (filteredSourceData && filteredSourceData.length > 0) {
                 filteredSourceData = sourceData.filter(tx => {
                     const txWhCode = String(tx.maKho || tx.maKhoTao || tx['Mã kho tạo'] || tx['Kho tạo'] || '').trim();
                     // Nếu giao dịch không có mã kho rõ ràng, ta tạm cho qua để khỏi mất số
                     if (!txWhCode) return true; 
                     return isMatchWh(txWhCode, currentSelectedWh);
                 });
             }
        }

        // Bước 2: Deduplicate (Xóa trùng lặp) dựa trên Mã NV để Svelte không văng lỗi render
        const uniqueEmployeesMap = new Map();
        filteredEmployees.forEach(emp => {
            const key = String(emp.maNV || emp.MaNV || emp.id || '').trim();
            if (key) {
                if (!uniqueEmployeesMap.has(key)) {
                    uniqueEmployeesMap.set(key, { ...emp }); 
                }
            }
        });
        const finalEmployeeList = Array.from(uniqueEmployeesMap.values());
        // -------------------------------------------------------------------------

        // 2. Prepare Salary Data
        const salaryData = salaryProcessor.prepareSalaryData();

        // 3. Main Loop: Process each employee
        return finalEmployeeList.map((employee) => {
            // A. Calculate Sales (Sử dụng dữ liệu giao dịch ĐÃ ĐƯỢC LỌC)
            const salesData = salesProcessor.processEmployeeSales(employee, filteredSourceData, uiKeywords);
            
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