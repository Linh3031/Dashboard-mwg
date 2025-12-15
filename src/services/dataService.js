// src/services/dataService.js
import { fileHandler } from './data/fileHandler.js';
import { pasteHandler } from './data/pasteHandler.js';
import { syncHandler } from './data/syncHandler.js';
import { cacheHandler } from './data/cacheHandler.js';
// [NEW] Import thêm để xử lý load config
import { datasyncService } from './datasync.service.js';
import { localCompetitionConfigs, specialProductList } from '../stores.js';

export const dataService = {
    appController: null,
    init(controller) { this.appController = controller; },

    // --- File Handlers ---
    handleFileChange: (file, key) => fileHandler.handleFileChange(file, key),
    handleRealtimeFileInput: (event) => fileHandler.handleRealtimeFileInput(event),
    handleCategoryFile: (event) => fileHandler.handleCategoryFile(event),
    handleSpecialProductFileUpload: (event) => fileHandler.handleSpecialProductFileUpload(event),
    handleTemplateDownload: () => fileHandler.handleTemplateDownload(),

    // --- Paste Handlers ---
    handlePasteChange: (text, key1, key2, key3) => pasteHandler.handlePasteChange(text, key1, key2, key3),

    // --- Sync & Cache ---
    syncDownFromCloud: (wh) => syncHandler.syncDownFromCloud(wh),
    downloadFileFromCloud: (key) => syncHandler.downloadFileFromCloud(key),
    loadAllFromCache: () => cacheHandler.loadAllFromCache(),

    _getSavedMetadata(warehouse, dataType) { return null; },

    // [NEW] Hàm tải toàn bộ cấu hình phụ trợ của Kho (Thi đua, SPĐQ...)
    // Hàm này sẽ được gọi khi chọn Kho
    async loadWarehouseSettings(warehouse) {
        if (!warehouse) return;
        console.log(`[DataService] Loading settings for warehouse: ${warehouse}`);
        
        try {
            // 1. Tải cấu hình Thi đua (User)
            const competitions = await datasyncService.loadCompetitionConfigs(warehouse);
            if (competitions) {
                localCompetitionConfigs.set(competitions);
                console.log(`[DataService] Loaded ${competitions.length} competitions.`);
            } else {
                localCompetitionConfigs.set([]);
            }

            // 2. Tải danh sách SPĐQ (nếu có lưu theo kho - logic mở rộng)
            // const spList = await datasyncService.loadSpecialPrograms(warehouse);
            // ...

        } catch (error) {
            console.error("[DataService] Error loading warehouse settings:", error);
        }
    }
};