// src/services/dataProcessing.js
// Version 3.0 - Modular Facade
// File này đóng vai trò tập hợp các hàm từ thư mục processing/
// Giúp giữ nguyên API cũ để không làm hỏng các component đang sử dụng.

import { helpers } from './processing/helpers.js';
import { normalizers } from './processing/normalizers.js';
import { parsers } from './processing/parsers.js';
import { processors } from './processing/processors.js';

export const dataProcessing = {
    // --- Helpers ---
    findColumnName: helpers.findColumnName,
    getHinhThucXuatTinhDoanhThu: helpers.getHinhThucXuatTinhDoanhThu,
    getHinhThucXuatTraGop: helpers.getHinhThucXuatTraGop,
    getHeSoQuyDoi: helpers.getHeSoQuyDoi,
    _cleanCompetitionName: helpers.cleanCompetitionName,
    classifyInsurance: helpers.classifyInsurance,
    _findHeaderAndProcess: helpers.findHeaderAndProcess, // Public alias cho processors dùng

    // --- Normalizers ---
    normalizeData: normalizers.normalizeData,
    normalizeCategoryStructureData: normalizers.normalizeCategoryStructureData,
    normalizeSpecialProductData: normalizers.normalizeSpecialProductData,
    normalizeBrandData: normalizers.normalizeBrandData,

    // --- Parsers ---
    processThuongERP: parsers.processThuongERP,
    parseLuyKePastedData: parsers.parseLuyKePastedData,
    parseCompetitionDataFromLuyKe: parsers.parseCompetitionDataFromLuyKe,
    parsePastedThiDuaTableData: parsers.parsePastedThiDuaTableData,

    // --- Processors ---
    debugCompetitionFiltering: processors.debugCompetitionFiltering,
    updateCompetitionNameMappings: processors.updateCompetitionNameMappings,
    processThiDuaNhanVienData: processors.processThiDuaNhanVienData,
    processGioCongData: processors.processGioCongData,
    processThiDuaVungFile: processors.processThiDuaVungFile
};