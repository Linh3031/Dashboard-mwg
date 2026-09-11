// src/services/admin.service.js
// Version 4.0 - Refactored into 'declarations' sub-services to avoid name conflict

import { configService } from './declarations/config.service.js';
import { categoryService } from './declarations/category.service.js';
import { performanceService } from './declarations/performance.service.js';

export const adminService = {
    // --- 1. HELP CONTENT ---
    saveHelpContent: configService.saveHelpContent,
    // [PHẪU THUẬT LOGIC]: Khai báo Export hàm loadHelpContent
    loadHelpContent: configService.loadHelpContent,

    // --- 2. HOME CONFIG ---
    saveHomeConfig: configService.saveHomeConfig,
    loadHomeConfig: configService.loadHomeConfig,

    // --- 3. CATEGORY & BRAND STRUCTURE ---
    saveCategoryDataToFirestore: categoryService.saveCategoryDataToFirestore,
    loadCategoryDataFromFirestore: categoryService.loadCategoryDataFromFirestore,

    // --- 4. SYSTEM PERFORMANCE TABLES ---
    loadSystemPerformanceTables: performanceService.loadSystemPerformanceTables,
    saveSystemPerformanceTables: performanceService.saveSystemPerformanceTables,

    // --- 4.5. SYSTEM DAILY TREND CONFIGS ---
    loadSystemDailyTrendConfigs: performanceService.loadSystemDailyTrendConfigs,
    saveSystemDailyTrendConfigs: performanceService.saveSystemDailyTrendConfigs,

    // --- 5. MAPPINGS & CONFIGS GLOBAL ---
    loadMappingsGlobal: categoryService.loadMappingsGlobal,
    
    saveMacroCategoryConfig: categoryService.saveMacroCategoryConfig,
    loadMacroCategoryConfig: categoryService.loadMacroCategoryConfig,

    saveMacroProductGroupConfig: categoryService.saveMacroProductGroupConfig,
    loadMacroProductGroupConfig: categoryService.loadMacroProductGroupConfig,

    saveNameMapping: categoryService.saveNameMapping,
    saveCompetitionNameMappings: categoryService.saveCompetitionNameMappings,
    
    // [NEW] Lưu và tải mapping riêng biệt cho Thi đua Siêu thị
    saveLuykeNameMappings: categoryService.saveLuykeNameMappings,
    loadLuykeNameMappings: categoryService.loadLuykeNameMappings,

    // [MỚI] Khai báo mã Loại TĐ tính theo Số Lượng
    saveQuantityCompetitionTypeCodes: categoryService.saveQuantityCompetitionTypeCodes,
    loadQuantityCompetitionTypeCodes: categoryService.loadQuantityCompetitionTypeCodes,

    // --- 6. LOGIC & CALCULATION ---
    loadDeclarationsFromFirestore: performanceService.loadDeclarationsFromFirestore,
    saveDeclarationsToFirestore: performanceService.saveDeclarationsToFirestore,

    // --- 7. COMPETITION CONFIGS ---
    saveGlobalCompetitionConfigs: performanceService.saveGlobalCompetitionConfigs,
    loadGlobalCompetitionConfigs: performanceService.loadGlobalCompetitionConfigs,

    // --- 8. SPECIAL PRODUCTS ---
    saveSpecialProductList: categoryService.saveSpecialProductList,
    loadSpecialProductList: categoryService.loadSpecialProductList,
    loadGlobalSpecialPrograms: categoryService.loadGlobalSpecialPrograms,

    // --- 9. EFFICIENCY & QDC CONFIGS ---
    saveEfficiencyConfig: performanceService.saveEfficiencyConfig,
    loadEfficiencyConfig: performanceService.loadEfficiencyConfig,
    
    saveQdcConfig: performanceService.saveQdcConfig,
    loadQdcConfig: performanceService.loadQdcConfig,

    // --- 10. UPLOAD ---
    uploadImage: configService.uploadImage
};