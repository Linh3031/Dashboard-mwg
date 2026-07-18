// src/services/dataService.js
// Version 3.2 - Surgical Fix: Complete FileHandler Bridge & Auto-Hydrate Brand List
import { fileHandler } from './data/fileHandler.js';
import { pasteHandler } from './data/pasteHandler.js';
import { syncHandler } from './data/syncHandler.js';
import { cacheHandler } from './data/cacheHandler.js';
import { datasyncService } from './datasync.service.js';
import { categoryService } from './declarations/category.service.js';
import { localCompetitionConfigs, specialProductList, brandList, categoryStructure } from '../stores.js';

export const dataService = {
    appController: null,
    init(controller) { this.appController = controller; },

    // --- File Handlers (Đã khôi phục toàn bộ cầu nối bị đứt gãy) ---
    handleFileChange: (file, key, isMultiMode = false) => fileHandler.handleFileChange(file, key, isMultiMode),
    handleRealtimeFileInput: (event) => fileHandler.handleRealtimeFileInput(event),
    handleCategoryFile: (event) => fileHandler.handleCategoryFile(event),
    handleSpecialProductFileUpload: (event) => fileHandler.handleSpecialProductFileUpload(event),
    handleVirtualProductFileUpload: (event) => fileHandler.handleVirtualProductFileUpload(event),
    handleTemplateDownload: () => fileHandler.handleTemplateDownload(),

    // --- Paste Handlers ---
    handlePasteChange: (text, key1, key2, key3) => pasteHandler.handlePasteChange(text, key1, key2, key3),

    // --- Sync & Cache ---
    syncDownFromCloud: (wh) => syncHandler.syncDownFromCloud(wh),
    downloadFileFromCloud: (key) => syncHandler.downloadFileFromCloud(key),
    loadAllFromCache: () => cacheHandler.loadAllFromCache(),

    _getSavedMetadata(warehouse, dataType) { return null; },

    // --- Warehouse Settings Loader ---
    async loadWarehouseSettings(warehouse) {
        if (!warehouse) return;
        console.log(`[DataService] Loading settings for warehouse: ${warehouse}`);
        
        try {
            // [PHẪU THUẬT LOGIC]: Nạp song song cấu hình Thi đua và Danh sách Hãng/Ngành hàng từ Cloud
            const [competitions] = await Promise.all([
                datasyncService.loadCompetitionConfigs(warehouse),
                categoryService.loadMappingsGlobal()
            ]);

            if (competitions) {
                localCompetitionConfigs.set(competitions);
                console.log(`[DataService] Loaded ${competitions.length} competitions.`);
            } else {
                localCompetitionConfigs.set([]);
            }

        } catch (error) {
            console.error("[DataService] Error loading warehouse settings:", error);
        }
    }
};