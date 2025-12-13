// src/services/processing/parsers.js
import { erpParser } from './parsers/erp.parser.js';
import { luykeParser } from './parsers/luyke.parser.js';
import { thiduaParser } from './parsers/thidua.parser.js';

export const parsers = {
    // --- ERP Logic ---
    processThuongERP: erpParser.processThuongERP,

    // --- Luy Ke Logic ---
    parseLuyKePastedData: luykeParser.parseLuyKePastedData,
    parseCompetitionDataFromLuyKe: luykeParser.parseCompetitionDataFromLuyKe,

    // --- Thi Dua Nhan Vien Logic ---
    parsePastedThiDuaTableData: thiduaParser.parsePastedThiDuaTableData
};