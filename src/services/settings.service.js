// src/services/settings.service.js
// Version 5.9 - Fix missing functions (Restore Realtime Logic)
import { get } from 'svelte/store';
import { 
    luykeGoalSettings, 
    realtimeGoalSettings, 
    interfaceSettings,
    pastedThiDuaReportData
} from '../stores.js';

// Hằng số chứa danh sách đầy đủ và thứ tự cột chính xác cho bảng Hiệu quả khai thác
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
        } catch (e) {
            console.error("Lỗi tải cài đặt giao diện:", e);
        }
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
        if (settings.globalFontSize) root.style.setProperty('--global-font-size', `${settings.globalFontSize}px`);
        if (settings.kpiFontSize) root.style.setProperty('--kpi-main-font-size', `${settings.kpiFontSize}px`);
        for (let i = 1; i <= 8; i++) {
            const key = `kpiCard${i}Bg`;
            if (settings[key]) root.style.setProperty(`--kpi-card-${i}-bg`, settings[key]);
        }
        if (settings.kpiTitleColor) root.style.setProperty('--kpi-title-color', settings.kpiTitleColor);
        if (settings.kpiMainColor) root.style.setProperty('--kpi-main-color', settings.kpiMainColor);
        if (settings.kpiSubColor) root.style.setProperty('--kpi-sub-color', settings.kpiSubColor);
    },

    // --- GOAL SETTINGS (LUY KE) ---
    loadLuykeGoalSettings() {
        try {
            const saved = localStorage.getItem('luykeGoalSettings');
            if (saved) luykeGoalSettings.set(JSON.parse(saved));
        } catch (e) { console.error("Lỗi tải mục tiêu lũy kế:", e); }
    },

    saveLuykeGoalForWarehouse(warehouse, goals) {
        luykeGoalSettings.update(current => {
            const updated = { ...current, [warehouse]: goals };
            localStorage.setItem('luykeGoalSettings', JSON.stringify(updated));
            return updated;
        });
    },

    getLuykeGoalSettings(selectedWarehouse = null) {
        const $luykeGoalSettings = get(luykeGoalSettings);
        const settings = { goals: {} };
        const goalKeys = ['doanhThuThuc', 'doanhThuQD', 'phanTramQD', 'phanTramTC', 'phanTramGiaDung', 'phanTramMLN', 'phanTramPhuKien', 'phanTramBaoHiem', 'phanTramSim', 'phanTramVAS'];

        if (selectedWarehouse && $luykeGoalSettings[selectedWarehouse]) {
             const source = $luykeGoalSettings[selectedWarehouse];
             goalKeys.forEach(key => settings.goals[key] = parseFloat(source[key]) || 0);
        } else if (!selectedWarehouse) {
            const allSettings = $luykeGoalSettings || {};
            const warehouseKeys = Object.keys(allSettings);
            const percentCounts = {};
            goalKeys.forEach(key => settings.goals[key] = 0);

            warehouseKeys.forEach(whKey => {
                const source = allSettings[whKey];
                 goalKeys.forEach(key => {
                    const value = parseFloat(source[key]) || 0;
                    if (key.startsWith('phanTram')) {
                        settings.goals[key] += value;
                        percentCounts[key] = (percentCounts[key] || 0) + 1;
                    } else {
                         settings.goals[key] += value;
                    }
                });
            });
            Object.keys(percentCounts).forEach(key => {
                if (percentCounts[key] > 0) settings.goals[key] /= percentCounts[key];
            });
        }
        return settings;
    },

    // --- [KHÔI PHỤC] GOAL SETTINGS (REALTIME) ---
    loadRealtimeGoalSettings() {
        try {
            const saved = localStorage.getItem('realtimeGoalSettings');
            if (saved) realtimeGoalSettings.set(JSON.parse(saved));
        } catch (e) { console.error("Lỗi tải mục tiêu realtime:", e); }
    },

    saveRealtimeGoalForWarehouse(warehouse, settings) {
        realtimeGoalSettings.update(current => {
            const updated = { ...current, [warehouse]: settings };
            localStorage.setItem('realtimeGoalSettings', JSON.stringify(updated));
            return updated;
        });
    },

    getRealtimeGoalSettings(selectedWarehouse = null) {
        const $realtimeGoalSettings = get(realtimeGoalSettings);
        if (selectedWarehouse && $realtimeGoalSettings && $realtimeGoalSettings[selectedWarehouse]) {
            return $realtimeGoalSettings[selectedWarehouse];
        }
        if (!selectedWarehouse) {
            const allSettings = $realtimeGoalSettings || {};
            const validWarehouseSettings = Object.values(allSettings).filter(s => s.goals && Object.keys(s.goals).length > 0);
            if(validWarehouseSettings.length === 0) return { goals: {}, timing: {} };
            
            const aggregatedGoals = { doanhThuThuc: 0, doanhThuQD: 0 };
            const percentGoals = {}; const percentCounts = {};
            
            validWarehouseSettings.forEach(ws => {
                aggregatedGoals.doanhThuThuc += parseFloat(ws.goals.doanhThuThuc || 0);
                aggregatedGoals.doanhThuQD += parseFloat(ws.goals.doanhThuQD || 0);
                Object.entries(ws.goals).forEach(([key, value]) => {
                    if (key.startsWith('phanTram')) {
                        if (!percentGoals[key]) { percentGoals[key] = 0; percentCounts[key] = 0; }
                         const numValue = parseFloat(value);
                        if(!isNaN(numValue)) { percentGoals[key] += numValue; percentCounts[key]++; }
                    }
                });
            });
            Object.keys(percentCounts).forEach(key => { if(percentCounts[key] > 0) aggregatedGoals[key] = percentGoals[key] / percentCounts[key]; });
            const representativeTiming = validWarehouseSettings.length > 0 ? (validWarehouseSettings[0].timing || {}) : {};
            return { goals: aggregatedGoals, timing: representativeTiming };
        }
        return { goals: {}, timing: {} };
    },

    // --- TABLE VIEW SETTINGS ---
    saveEfficiencyViewSettings(settings) {
        if (!Array.isArray(settings)) return;
        try { localStorage.setItem('efficiencyViewSettings', JSON.stringify(settings)); } catch (e) { console.error("Lỗi lưu efficiency settings:", e); }
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
        } catch (e) { console.error("Lỗi tải efficiency settings:", e); }
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