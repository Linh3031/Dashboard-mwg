// src/services/settings.service.js
import { get } from 'svelte/store';
import { 
    luykeGoalSettings, 
    realtimeGoalSettings, 
    interfaceSettings,
    pastedThiDuaReportData
} from '../stores.js';
import { datasyncService } from './datasync.service.js'; // [MỚI] Import

// ... (Giữ nguyên các hằng số ALL_EFFICIENCY_ITEMS, PASTED_COMPETITION_SETTINGS_KEY) ...
const ALL_EFFICIENCY_ITEMS = [
    { id: 'dtICT', label: 'DT ICT' },
    { id: 'dtPhuKien', label: 'DT Phụ kiện' },
    { id: 'pctPhuKien', label: '% Phụ kiện' },
    { id: 'dtCE', label: 'DT CE' },
    { id: 'dtGiaDung', label: 'DT Gia dụng' },
    { id: 'pctGiaDung', label: '% Gia dụng' },
    { id: 'pctMLN',    label: '% Máy lọc nước' }, 
    { id: 'pctSim',    label: '% Sim' },
    { id: 'pctVAS',    label: '% VAS' },
    { id: 'pctBaoHiem', label: '% Bảo hiểm' }
];
const PASTED_COMPETITION_SETTINGS_KEY = 'pastedCompetitionViewSettings';

export const settingsService = {
    // --- INTERFACE SETTINGS ---
    loadInterfaceSettings() {
        try {
            const saved = localStorage.getItem('interfaceSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                interfaceSettings.set({ ...get(interfaceSettings), ...parsed });
            }
            this.applyInterfaceStyles(get(interfaceSettings));
            const contrast = localStorage.getItem('contrastLevel') || '3';
            this.updateContrast(contrast);
        } catch (e) { console.error(e); }
    },

    updateInterface(newSettings) {
        interfaceSettings.set(newSettings);
        localStorage.setItem('interfaceSettings', JSON.stringify(newSettings));
        this.applyInterfaceStyles(newSettings);
    },

    updateContrast(level) {
        document.documentElement.dataset.contrast = level;
        localStorage.setItem('contrastLevel', level);
        interfaceSettings.update(s => ({ ...s, contrastLevel: level }));
    },

    applyInterfaceStyles(settings) {
        const root = document.documentElement;
        if (!settings) return;
        if (settings.globalFontSize) root.style.fontSize = `${settings.globalFontSize}px`;
        for (let i = 1; i <= 8; i++) {
            const key = `kpiCard${i}Bg`;
            if (settings[key]) root.style.setProperty(`--kpi-card-${i}-bg`, settings[key]);
        }
        if (settings.kpiTitleColor) root.style.setProperty('--kpi-title-color', settings.kpiTitleColor);
        if (settings.kpiMainColor) root.style.setProperty('--kpi-main-color', settings.kpiMainColor);
        if (settings.kpiSubColor) root.style.setProperty('--kpi-sub-color', settings.kpiSubColor);
        if (settings.kpiFontSize) root.style.setProperty('--kpi-main-font-size', `${settings.kpiFontSize}px`);
    },

    // --- GOAL SETTINGS (MỤC TIÊU) - CẬP NHẬT ĐỂ SYNC CLOUD ---
    
    // [MỚI] Tải mục tiêu từ Cloud
    async loadGoalsFromCloud(warehouse) {
        if (!warehouse) return;
        const data = await datasyncService.loadGoalSettings(warehouse);
        
        // Cập nhật store Lũy kế
        luykeGoalSettings.update(current => ({
            ...current,
            [warehouse]: data.luyke || {}
        }));

        // Cập nhật store Realtime
        realtimeGoalSettings.update(current => ({
            ...current,
            [warehouse]: data.realtime || { goals: {}, timing: {} }
        }));
    },

    saveLuykeGoalForWarehouse(warehouse, goals) {
        luykeGoalSettings.update(current => {
            const updated = { ...current, [warehouse]: goals };
            // Vẫn lưu local để backup
            localStorage.setItem('luykeGoalSettings', JSON.stringify(updated)); 
            return updated;
        });
        // [MỚI] Lưu lên Cloud
        datasyncService.saveGoalSettings(warehouse, 'luyke', goals);
    },

    getLuykeGoalSettings(selectedWarehouse = null) {
        const $luykeGoalSettings = get(luykeGoalSettings);
        const settings = { goals: {} };
        const goalKeys = ['doanhThuThuc', 'doanhThuQD', 'phanTramQD', 'phanTramTC', 'phanTramGiaDung', 'phanTramMLN', 'phanTramPhuKien', 'phanTramBaoHiem', 'phanTramSim', 'phanTramVAS'];

        if (selectedWarehouse && $luykeGoalSettings[selectedWarehouse]) {
             const source = $luykeGoalSettings[selectedWarehouse];
             // [FIX] Copy động tất cả các key (để hỗ trợ Dynamic Metrics từ Admin)
             Object.assign(settings.goals, source);
        } else if (!selectedWarehouse) {
             // Logic trung bình (giữ nguyên nếu cần, hoặc đơn giản hóa)
             return settings;
        }
        return settings;
    },

    saveRealtimeGoalForWarehouse(warehouse, settings) {
        realtimeGoalSettings.update(current => {
            const updated = { ...current, [warehouse]: settings };
            localStorage.setItem('realtimeGoalSettings', JSON.stringify(updated));
            return updated;
        });
        // [MỚI] Lưu lên Cloud
        datasyncService.saveGoalSettings(warehouse, 'realtime', settings);
    },

    getRealtimeGoalSettings(selectedWarehouse = null) {
        const $realtimeGoalSettings = get(realtimeGoalSettings);
        if (selectedWarehouse && $realtimeGoalSettings && $realtimeGoalSettings[selectedWarehouse]) {
            return $realtimeGoalSettings[selectedWarehouse];
        }
        return { goals: {}, timing: {} };
    },

    // --- VIEW SETTINGS (GIỮ NGUYÊN) ---
    saveEfficiencyViewSettings(settings) {
        if (!Array.isArray(settings)) return;
        try { localStorage.setItem('efficiencyViewSettings', JSON.stringify(settings)); } catch (e) {}
    },
    loadEfficiencyViewSettings() {
        try {
            const savedSettingsJSON = localStorage.getItem('efficiencyViewSettings');
            if (savedSettingsJSON) {
                const savedItems = JSON.parse(savedSettingsJSON);
                if (Array.isArray(savedItems) && savedItems.length > 0) {
                    const savedIds = new Set(savedItems.map(s => s.id));
                    const newItems = ALL_EFFICIENCY_ITEMS
                        .filter(item => !savedIds.has(item.id))
                        .map(item => ({ ...item, visible: true }));
                    
                    const currentItems = savedItems
                        .filter(item => ALL_EFFICIENCY_ITEMS.some(config => config.id === item.id))
                        .map(item => {
                            const defaultItem = ALL_EFFICIENCY_ITEMS.find(d => d.id === item.id);
                             return defaultItem ? { ...item, label: defaultItem.label } : item;
                        });
                    return [...currentItems, ...newItems];
                }
            }
        } catch (e) {}
        return ALL_EFFICIENCY_ITEMS.map(item => ({ ...item, visible: true }));
    },
    saveQdcViewSettings(settings) {
        if (!Array.isArray(settings)) return;
        try { localStorage.setItem('qdcViewSettings', JSON.stringify(settings)); } catch (e) {}
    },
    saveCategoryViewSettings(settings) {
        if (!Array.isArray(settings)) return;
        try { localStorage.setItem('categoryViewSettings', JSON.stringify(settings)); } catch (e) {}
    },
    loadQdcViewSettings(allItems) {
        try {
            const saved = localStorage.getItem('qdcViewSettings');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return allItems;
    },
    loadCategoryViewSettings(allItems) {
        try {
            const saved = localStorage.getItem('categoryViewSettings');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return allItems;
    },
    savePastedCompetitionViewSettings(settings) {
        try { localStorage.setItem(PASTED_COMPETITION_SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
    },
    loadPastedCompetitionViewSettings() {
        const pastedDataStoreValue = get(pastedThiDuaReportData);
        if (!pastedDataStoreValue || pastedDataStoreValue.length === 0) return [];
        
        const masterColumns = pastedDataStoreValue[0].competitions.map((comp, index) => ({
            id: `comp_${index}`,
            label: comp.tenNganhHang,
            tenGoc: comp.tenGoc,
            loaiSoLieu: comp.loaiSoLieu,
            visible: true
        }));
        const masterMap = new Map(masterColumns.map(item => [item.tenGoc, item]));

        let savedItems = [];
        try {
            savedItems = JSON.parse(localStorage.getItem(PASTED_COMPETITION_SETTINGS_KEY) || '[]');
        } catch (e) { savedItems = []; }

        const savedMap = new Map(savedItems.map(item => [item.tenGoc, item]));
        const finalSettings = [];
        
        savedItems.forEach(savedItem => {
            if (masterMap.has(savedItem.tenGoc)) {
                const masterItem = masterMap.get(savedItem.tenGoc);
                finalSettings.push({ ...savedItem, id: masterItem.id, label: masterItem.label });
            }
        });
        masterColumns.forEach(masterItem => {
            if (!savedMap.has(masterItem.tenGoc)) finalSettings.push(masterItem);
        });
        return finalSettings;
    }
};