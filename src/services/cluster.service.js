// src/services/cluster.service.js
import { writable } from 'svelte/store';
import { clusterParser } from './processing/parsers/cluster.parser.js';
import { clusterProcessor } from './processing/logic/cluster.processor.js';

// Stores để UI subscribe
export const clusterDataStore = writable({
    competition: null, // Dữ liệu thi đua
    cumulative: null,  // Dữ liệu lũy kế (General + Details)
    isClusterMode: false,
    currentClusterCode: null
});

const STORAGE_PREFIX = 'cluster_data_';

export const clusterService = {
    /**
     * Xử lý text paste từ ô "Thi đua siêu thị lũy kế"
     */
    processCompetitionInput: (text, clusterCode) => {
        const parsed = clusterParser.parseCompetitionStr(text);
        const processed = clusterProcessor.processCompetitionData(parsed);
        
        // Update Store
        clusterDataStore.update(s => ({ ...s, competition: processed }));
        
        // Save to Local
        localStorage.setItem(`${STORAGE_PREFIX}comp_${clusterCode}`, JSON.stringify(processed));
        return processed;
    },

    /**
     * Xử lý text paste từ ô "Data lũy kế" (Chế độ Cụm)
     */
    processCumulativeInput: (text, clusterCode) => {
        const parsed = clusterParser.parseCumulativeStr(text);
        const report = clusterProcessor.createClusterReport(parsed);
        
        // Update Store
        clusterDataStore.update(s => ({ ...s, cumulative: report }));
        
        // Save to Local
        localStorage.setItem(`${STORAGE_PREFIX}cumul_${clusterCode}`, JSON.stringify(report));
        return report;
    },

    /**
     * Load dữ liệu đã lưu khi người dùng chọn Kho/Cụm
     */
    loadSavedData: (clusterCode) => {
        if (!clusterCode) return;

        try {
            const savedComp = localStorage.getItem(`${STORAGE_PREFIX}comp_${clusterCode}`);
            const savedCumul = localStorage.getItem(`${STORAGE_PREFIX}cumul_${clusterCode}`);

            clusterDataStore.update(s => ({
                ...s,
                currentClusterCode: clusterCode,
                isClusterMode: true,
                competition: savedComp ? JSON.parse(savedComp) : null,
                cumulative: savedCumul ? JSON.parse(savedCumul) : null
            }));
        } catch (e) {
            console.error("Lỗi load dữ liệu cụm:", e);
        }
    },

    /**
     * Reset store khi chuyển về chế độ kho đơn
     */
    reset: () => {
        clusterDataStore.set({
            competition: null,
            cumulative: null,
            isClusterMode: false,
            currentClusterCode: null
        });
    }
};