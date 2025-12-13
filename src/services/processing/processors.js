// src/services/processing/processors.js
import { competitionProcessor } from './logic/competition.processor.js';
import { timekeepingProcessor } from './logic/timekeeping.processor.js';
import { regionalProcessor } from './logic/regional.processor.js';

export const processors = {
    // --- COMPETITION LOGIC ---
    debugCompetitionFiltering: competitionProcessor.debugCompetitionFiltering,
    updateCompetitionNameMappings: competitionProcessor.updateCompetitionNameMappings,
    processThiDuaNhanVienData: competitionProcessor.processThiDuaNhanVienData,

    // --- TIMEKEEPING LOGIC ---
    processGioCongData: timekeepingProcessor.processGioCongData,

    // --- REGIONAL LOGIC ---
    processThiDuaVungFile: regionalProcessor.processThiDuaVungFile
};