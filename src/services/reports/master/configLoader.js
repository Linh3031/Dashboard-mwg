// src/services/reports/master/configLoader.js
import { get } from 'svelte/store';
import { 
    macroCategoryConfig, 
    macroProductGroupConfig 
} from '../../../stores.js';
import { normalize } from './utils.js';

export const configLoader = {
    loadUiKeywords() {
        const $macroProductGroupConfig = get(macroProductGroupConfig) || [];
        const $macroCategoryConfig = get(macroCategoryConfig) || [];

        const uiKeywords = {
            dtICT: [], dtCE: [], dtPhuKien: [], dtGiaDung: [],
            dtMLN: [], dtSim: [], dtVAS: [], dtBaoHiem: []
        };

        const uiIdentity = {
            dtICT: ['ict', 'điện thoại', 'laptop', 'tablet'],
            dtCE: ['ce', 'điện tử', 'tivi', 'loa', 'âm thanh'],
            dtPhuKien: ['phụ kiện', 'pk'],
            dtGiaDung: ['gia dụng', 'gd'],
            dtMLN: ['máy lọc nước', 'mln', 'lọc nước'],
            dtSim: ['sim', 'thẻ cào'],
            dtVAS: ['vas', 'dịch vụ'],
            dtBaoHiem: ['bảo hiểm', 'rơi vỡ']
        };

        const loadKeywords = (configs) => {
            if (!Array.isArray(configs)) return;
            configs.forEach(group => {
                const groupName = normalize(group.name);
                for (const [uiKey, ids] of Object.entries(uiIdentity)) {
                    if (ids.some(id => groupName.includes(id))) {
                        if (group.items) group.items.forEach(i => uiKeywords[uiKey].push(normalize(i)));
                    }
                }
            });
        };

        loadKeywords($macroProductGroupConfig);
        loadKeywords($macroCategoryConfig);

        return uiKeywords;
    }
};