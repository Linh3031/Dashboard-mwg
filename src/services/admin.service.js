// src/services/admin.service.js
// Version 4.0 - Refactored into 'declarations' sub-services to avoid name conflict

import { configService } from './declarations/config.service.js';
import { categoryService } from './declarations/category.service.js';
import { performanceService } from './declarations/performance.service.js';

export const adminService = {
    // --- 1. HELP CONTENT ---
    saveHelpContent: configService.saveHelpContent,

    // --- 2. HOME CONFIG ---
    saveHomeConfig: configService.saveHomeConfig,
    loadHomeConfig: configService.loadHomeConfig,

    // --- 3. CATEGORY & BRAND STRUCTURE ---
    saveCategoryDataToFirestore: categoryService.saveCategoryDataToFirestore,
    loadCategoryDataFromFirestore: categoryService.loadCategoryDataFromFirestore,

    // --- 4. SYSTEM REVENUE TABLES ---
    loadSystemRevenueTables: performanceService.loadSystemRevenueTables,
    saveSystemRevenueTables: performanceService.saveSystemRevenueTables,

    // --- 4.5. SYSTEM PERFORMANCE TABLES ---
    loadSystemPerformanceTables: performanceService.loadSystemPerformanceTables,
    saveSystemPerformanceTables: performanceService.saveSystemPerformanceTables,

    // --- 5. MAPPINGS & CONFIGS GLOBAL ---
    loadMappingsGlobal: categoryService.loadMappingsGlobal,
    
    saveMacroCategoryConfig: categoryService.saveMacroCategoryConfig,
    loadMacroCategoryConfig: categoryService.loadMacroCategoryConfig,

    saveMacroProductGroupConfig: categoryService.saveMacroProductGroupConfig,
    loadMacroProductGroupConfig: categoryService.loadMacroProductGroupConfig,

    saveNameMapping: categoryService.saveNameMapping,
    saveCompetitionNameMappings: categoryService.saveCompetitionNameMappings,

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