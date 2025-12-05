/* global XLSX */
import { get } from 'svelte/store';
import { 
    danhSachNhanVien,
    rawGioCongData,
    ycxData,
    thuongNongData,
    ycxDataThangTruoc,
    thuongNongDataThangTruoc,
    thuongERPData,
    thuongERPDataThangTruoc,
    competitionData,
    pastedThiDuaReportData,
    realtimeYCXData,
    categoryStructure, // Store mới
    brandList,       // Store mới
    specialProductList // Store mới
} from '../stores.js';
import { dataProcessing } from './dataProcessing.js';
import { storage } from '../modules/storage.js';
import { adminService } from './admin.service.js'; // Import Admin Service

const LOCAL_DSNV_FILENAME_KEY = '_localDsnvFilename';

const FILE_MAPPING = {
    'saved_danhsachnv': { store: danhSachNhanVien, normalizeType: 'danhsachnv' },
    'saved_giocong': { store: rawGioCongData, normalizeType: 'giocong' },
    'saved_ycx': { store: ycxData, normalizeType: 'ycx' },
    'saved_thuongnong': { store: thuongNongData, normalizeType: 'thuongnong' },
    'saved_ycx_thangtruoc': { store: ycxDataThangTruoc, normalizeType: 'ycx' },
    'saved_thuongnong_thangtruoc': { store: thuongNongDataThangTruoc, normalizeType: 'thuongnong' }
};

const PASTE_MAPPING = {
    'daily_paste_luyke': { 
        processFunc: dataProcessing.parseCompetitionDataFromLuyKe, 
        store: competitionData 
    },
    'daily_paste_thuongerp': { 
        processFunc: dataProcessing.processThuongERP, 
        store: thuongERPData 
    },
    'saved_thuongerp_thangtruoc': { 
        processFunc: dataProcessing.processThuongERP, 
        store: thuongERPDataThangTruoc 
    },
    'daily_paste_thiduanv': { 
        processFunc: dataProcessing.processThiDuaNhanVienData, 
        store: pastedThiDuaReportData,
        isThiDuaNV: true 
    }
};

// Helper đọc file
async function _handleFileRead(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No file provided."));
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: true });
                resolve(workbook);
            } catch (err) { reject(err); }
        };
        reader.onerror = (err) => reject(new Error("Could not read the file: " + err));
        reader.readAsArrayBuffer(file);
    });
}

// ... (Giữ nguyên handleFileChange, handlePasteChange, loadAllFromCache) ...
export async function handleFileChange(file, saveKey) {
    const mapping = FILE_MAPPING[saveKey];
    if (!mapping) return { success: false, message: `❌ Lỗi: Không tìm thấy mapping cho key ${saveKey}` };

    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, mapping.normalizeType);
        
        if (success) {
            mapping.store.set(normalizedData);
            try {
                await storage.setItem(saveKey, normalizedData);
                if (saveKey === 'saved_danhsachnv') localStorage.setItem(LOCAL_DSNV_FILENAME_KEY, file.name);
            } catch (err) { console.error(`Lỗi lưu ${saveKey}:`, err); }
            return { success: true, count: normalizedData.length, message: `✅ Tải thành công ${normalizedData.length} dòng.` };
        } else {
            return { success: false, message: `❌ Lỗi: File thiếu cột: ${missingColumns.join(', ')}` };
        }
    } catch (err) { return { success: false, message: `❌ Lỗi: ${err.message}` }; }
}

export function handlePasteChange(pastedText, saveKeyPaste, saveKeyRaw, saveKeyProcessed) {
     const primaryKey = saveKeyProcessed || saveKeyPaste;
     const mapping = PASTE_MAPPING[primaryKey];
     if (!mapping) return { success: false, message: `❌ Lỗi: Không tìm thấy mapping` };
     
     try {
         let processedData;
         let message = "";
         if (mapping.isThiDuaNV) {
             const parsedData = dataProcessing.parsePastedThiDuaTableData(pastedText);
             if (!parsedData.success) throw new Error(parsedData.error || "Lỗi phân tích cú pháp.");
             dataProcessing.updateCompetitionNameMappings(parsedData.mainHeaders);
             const $competitionData = get(competitionData);
             processedData = dataProcessing.processThiDuaNhanVienData(parsedData, $competitionData);
             mapping.store.set(processedData);
             localStorage.setItem(saveKeyRaw, pastedText);
             localStorage.setItem(saveKeyProcessed, JSON.stringify(processedData));
             message = `✅ Đã xử lý ${processedData.length} nhân viên.`;
         } else if (mapping.processFunc) {
             processedData = mapping.processFunc(pastedText);
             mapping.store.set(processedData);
             localStorage.setItem(saveKeyPaste, pastedText);
             message = `✅ Đã xử lý.`;
         }
         return { success: true, message: message };
     } catch (err) { return { success: false, message: `❌ Lỗi: ${err.message}` }; }
}

export async function loadAllFromCache() {
    try { await storage.openDB(); } catch (err) { console.error("Lỗi DB:", err); }
    try {
        for (const [saveKey, mapping] of Object.entries(FILE_MAPPING)) {
            const data = await storage.getItem(saveKey);
            if (data && data.length > 0) mapping.store.set(data);
        }
    } catch (err) { console.error("Lỗi tải cache file:", err); }
    // Load paste data...
    try {
        const luykeText = localStorage.getItem('daily_paste_luyke');
        if (luykeText) {
            dataProcessing.parseLuyKePastedData(luykeText);
            dataProcessing.parseCompetitionDataFromLuyKe(luykeText);
        }
        const thiduaProcessed = localStorage.getItem('daily_paste_thiduanv');
        if (thiduaProcessed) pastedThiDuaReportData.set(JSON.parse(thiduaProcessed));
        const erpText = localStorage.getItem('daily_paste_thuongerp');
        if (erpText) thuongERPData.set(dataProcessing.processThuongERP(erpText));
        const erpTTText = localStorage.getItem('saved_thuongerp_thangtruoc');
        if (erpTTText) thuongERPDataThangTruoc.set(dataProcessing.processThuongERP(erpTTText));
    } catch (err) { console.error("Lỗi tải cache paste:", err); }
}

// --- HÀM MỚI: XỬ LÝ UPLOAD ADMIN ---

/**
 * Xử lý tải file Cấu trúc Ngành hàng.
 */
export async function handleCategoryFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const workbook = await _handleFileRead(file);
    const categorySheet = workbook.Sheets[workbook.SheetNames[0]];
    const categoryRawData = XLSX.utils.sheet_to_json(categorySheet, { raw: false, defval: null });
    const categoryResult = dataProcessing.normalizeCategoryStructureData(categoryRawData);

    let brandResult = { success: true, normalizedData: [] };
    const brandSheetName = workbook.SheetNames.find(name => name.toLowerCase().trim() === 'hãng');
    if (brandSheetName) {
        const brandSheet = workbook.Sheets[brandSheetName];
        const brandRawData = XLSX.utils.sheet_to_json(brandSheet, { raw: false, defval: null });
        brandResult = dataProcessing.normalizeBrandData(brandRawData);
    }

    if(categoryResult.success) {
        categoryStructure.set(categoryResult.normalizedData);
        brandList.set(brandResult.normalizedData);
    } else {
        throw new Error(`Lỗi xử lý file khai báo: ${categoryResult.error}`);
    }
    event.target.value = ''; // Reset input
}

/**
 * Xử lý tải file Sản Phẩm Đặc Quyền (SPĐQ).
 */
export async function handleSpecialProductFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const workbook = await _handleFileRead(file);
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
    
    const result = dataProcessing.normalizeSpecialProductData(rawData);

    if (result.success) {
        specialProductList.set(result.normalizedData);
        // Gọi service để lưu ngay
        await adminService.saveSpecialProductList(result.normalizedData);
    } else {
        throw new Error(`Lỗi xử lý file SPĐQ: ${result.error}`);
    }
    event.target.value = ''; // Reset input
}

export async function handleTemplateDownload() {
    alert("Chức năng tải file mẫu đang được cập nhật link.");
}

export async function handleRealtimeFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const workbook = await _handleFileRead(file);
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: null });
        const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'ycx');
        if (success) {
            realtimeYCXData.set(normalizedData);
        } else {
            console.error(`File lỗi! Thiếu cột: ${missingColumns.join(', ')}`);
        }
    } catch (e) {
        console.error("Lỗi xử lý file Realtime:", e);
    } finally {
        event.target.value = '';
    }
}