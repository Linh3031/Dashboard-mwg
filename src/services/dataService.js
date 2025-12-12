// src/services/dataService.js
import { fileHandler } from './data/fileHandler.js';
import { pasteHandler } from './data/pasteHandler.js';
import { syncHandler } from './data/syncHandler.js';
import { cacheHandler } from './data/cacheHandler.js';

export const dataService = {
    appController: null,
    init(controller) { this.appController = controller; },

    // --- File Handlers ---
    // [FIX] Sử dụng arrow function để wrap, tránh lỗi undefined khi khởi tạo module
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

    _getSavedMetadata(warehouse, dataType) { return null; }
};