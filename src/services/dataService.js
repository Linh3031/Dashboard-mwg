// src/services/dataService.js
import { fileHandler } from './data/fileHandler.js';
import { pasteHandler } from './data/pasteHandler.js';
import { syncHandler } from './data/syncHandler.js';
import { cacheHandler } from './data/cacheHandler.js';

export const dataService = {
    appController: null,
    init(controller) { this.appController = controller; },

    // --- File Handlers ---
    // Kiểm tra xem fileHandler có tồn tại không để tránh crash
    handleFileChange: fileHandler ? fileHandler.handleFileChange : () => console.error("fileHandler missing"),
    handleCategoryFile: fileHandler?.handleCategoryFile,
    handleSpecialProductFileUpload: fileHandler?.handleSpecialProductFileUpload,
    handleRealtimeFileInput: fileHandler?.handleRealtimeFileInput,
    handleTemplateDownload: fileHandler?.handleTemplateDownload,

    // --- Paste Handlers ---
    handlePasteChange: pasteHandler?.handlePasteChange,

    // --- Sync & Cache ---
    syncDownFromCloud: syncHandler?.syncDownFromCloud.bind(syncHandler),
    downloadFileFromCloud: syncHandler?.downloadFileFromCloud.bind(syncHandler),
    loadAllFromCache: cacheHandler?.loadAllFromCache,

    _getSavedMetadata(warehouse, dataType) { return null; }
};