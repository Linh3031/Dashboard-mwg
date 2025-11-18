// Version 1.0 - Svelte Refactor
// MODULE: SETTINGS SERVICE
// Chuyển đổi từ appState sang Svelte Stores.
// Tạm thời vô hiệu hóa các hàm load/save Interface (sẽ được tái cấu trúc sau).

import { get } from 'svelte/store';
import { 
    luykeGoalSettings, 
    realtimeGoalSettings, 
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
    { id: 'pctMLN',    label: '% MLN' },
    { id: 'pctSim',    label: '% Sim' },
    { id: 'pctVAS',    label: '% VAS' },
    { id: 'pctBaoHiem', label: '% Bảo hiểm' }
];

const PASTED_COMPETITION_SETTINGS_KEY = 'pastedCompetitionViewSettings';

export const settingsService = {
    /**
     * Lưu cài đặt hiển thị cho bảng Hiệu quả khai thác.
     */
    saveEfficiencyViewSettings(settings) {
        if (!Array.isArray(settings)) return;
        try {
            localStorage.setItem('efficiencyViewSettings', JSON.stringify(settings));
        } catch (e) {
            console.error("Lỗi khi lưu cài đặt hiển thị Hiệu quả khai thác:", e);
        }
    },
    
    /**
     * Tải cài đặt hiển thị cho bảng Hiệu quả khai thác.
     */
    loadEfficiencyViewSettings() {
        try {
            const savedSettingsJSON = localStorage.getItem('efficiencyViewSettings');
            if (savedSettingsJSON) {
                const savedItems = JSON.parse(savedSettingsJSON);
                
                if (Array.isArray(savedItems) && savedItems.length > 0 && typeof savedItems[0] === 'object') {
                    const savedIds = new Set(savedItems.map(s => s.id));
                    const newItems = ALL_EFFICIENCY_ITEMS
                        .filter(item => !savedIds.has(item.id))
                        .map(item => ({ ...item, visible: true }));
                    
                    const currentItems = savedItems.filter(item => ALL_EFFICIENCY_ITEMS.some(config => config.id === item.id));
                    
                    return [...currentItems, ...newItems];
                }
            }
        } catch (e) {
            console.error("Lỗi khi tải cài đặt hiển thị Hiệu quả khai thác:", e);
        }

        // Trả về giá trị mặc định
        return ALL_EFFICIENCY_ITEMS.map(item => ({ ...item, visible: true }));
    },

    saveQdcViewSettings(settings) {
        if (!Array.isArray(settings)) return;
        try {
            localStorage.setItem('qdcViewSettings', JSON.stringify(settings));
        } catch (e) {
            console.error("Lỗi khi lưu cài đặt hiển thị Nhóm hàng QĐC:", e);
        }
    },

    saveCategoryViewSettings(settings) {
        if (!Array.isArray(settings)) return;
        try {
            localStorage.setItem('categoryViewSettings', JSON.stringify(settings));
        } catch (e) {
            console.error("Lỗi khi lưu cài đặt hiển thị Ngành hàng chi tiết:", e);
        }
    },

    loadQdcViewSettings(allItems) {
        try {
            const savedSettings = localStorage.getItem('qdcViewSettings');
            if (savedSettings) {
                return JSON.parse(savedSettings);
            }
        } catch (e) {
             console.error("Lỗi khi tải cài đặt hiển thị Nhóm hàng QĐC:", e);
        }
        return allItems; // Mặc định
    },

    loadCategoryViewSettings(allItems) {
        try {
            const savedSettings = localStorage.getItem('categoryViewSettings');
            if (savedSettings) {
                return JSON.parse(savedSettings);
            }
        } catch (e) {
            console.error("Lỗi khi tải cài đặt hiển thị Ngành hàng chi tiết:", e);
        }
        return allItems; // Mặc định
    },
    
    // --- CÁC HÀM GIAO DIỆN SẼ ĐƯỢC TÁI CẤU TRÚC SAU ---
    // loadInterfaceSettings() { ... },
    // saveInterfaceSettings() { ... },
    // applyFontSettings() { ... },
    // handleFontSizeChange(event, type) { ... },
    // applyContrastSetting() { ... },
    // loadHighlightSettings() { ... },
    // --- KẾT THÚC VÔ HIỆU HÓA ---

    saveRealtimeGoalSettings() {
        const warehouse = document.getElementById('rt-goal-warehouse-select').value;
        if (!warehouse) return;
        const settings = { goals: {}, timing: {} };
        document.querySelectorAll('.rt-goal-input').forEach(input => settings.goals[input.dataset.goal] = input.value);
        document.querySelectorAll('.rt-setting-input').forEach(input => settings.timing[input.id] = input.value);
        
        // Sửa: Dùng Svelte store
        const currentSettings = get(realtimeGoalSettings) || {};
        currentSettings[warehouse] = settings;
        realtimeGoalSettings.set(currentSettings);
        
        localStorage.setItem('realtimeGoalSettings', JSON.stringify(currentSettings));
        // ui.showNotification(`Đã lưu cài đặt Realtime cho kho ${warehouse}!`, 'success'); // Vô hiệu hóa
    },

    loadAndApplyRealtimeGoalSettings() {
         const warehouseSelect = document.getElementById('rt-goal-warehouse-select');
        if (!warehouseSelect) return;
        const warehouse = warehouseSelect.value;
        
        // Sửa: Dùng Svelte store
        const $realtimeGoalSettings = get(realtimeGoalSettings);
        const settings = (warehouse && $realtimeGoalSettings && $realtimeGoalSettings[warehouse]) 
            ? $realtimeGoalSettings[warehouse] 
            : { goals: {}, timing: {} };

        document.querySelectorAll('.rt-goal-input').forEach(input => input.value = settings.goals?.[input.dataset.goal] || '');
        document.querySelectorAll('.rt-setting-input').forEach(input => input.value = settings.timing?.[input.id] || '');
    },

    saveLuykeGoalSettings() {
        const warehouse = document.getElementById('luyke-goal-warehouse-select').value;
        if (!warehouse) return;
        const settings = {};
        document.querySelectorAll('.luyke-goal-input').forEach(input => settings[input.dataset.goal] = input.value);

        // Sửa: Dùng Svelte store
        const currentSettings = get(luykeGoalSettings) || {};
        currentSettings[warehouse] = settings;
        luykeGoalSettings.set(currentSettings);

        localStorage.setItem('luykeGoalSettings', JSON.stringify(currentSettings));
        // ui.showNotification(`Đã lưu cài đặt mục tiêu Lũy kế cho kho ${warehouse}!`, 'success'); // Vô hiệu hóa
    },

    loadAndApplyLuykeGoalSettings() {
        const warehouseSelect = document.getElementById('luyke-goal-warehouse-select');
        if (!warehouseSelect) return;
        const warehouse = warehouseSelect.value;
        
        // Sửa: Dùng Svelte store
        const $luykeGoalSettings = get(luykeGoalSettings);
        const settings = (warehouse && $luykeGoalSettings && $luykeGoalSettings[warehouse]) 
             ? $luykeGoalSettings[warehouse] 
            : {};
        document.querySelectorAll('.luyke-goal-input').forEach(input => input.value = settings[input.dataset.goal] || '');
    },

    getLuykeGoalSettings(selectedWarehouse = null) {
        const $luykeGoalSettings = get(luykeGoalSettings); // Sửa: Dùng Svelte store
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

    getRealtimeGoalSettings(selectedWarehouse = null) {
        const $realtimeGoalSettings = get(realtimeGoalSettings); // Sửa: Dùng Svelte store
        
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

    savePastedCompetitionViewSettings(settings) {
        if (!Array.isArray(settings)) return;
        try {
            localStorage.setItem(PASTED_COMPETITION_SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error("Lỗi khi lưu cài đặt hiển thị Thi đua NV:", e);
        }
    },

    loadPastedCompetitionViewSettings() {
        const $pastedThiDuaReportData = get(pastedThiDuaReportData); // Sửa: Dùng Svelte store
        
        if (!$pastedThiDuaReportData || $pastedThiDuaReportData.length === 0) {
            return [];
        }
        
        const masterColumns = $pastedThiDuaReportData[0].competitions.map((comp, index) => ({
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
            if (!Array.isArray(savedItems) || (savedItems.length > 0 && typeof savedItems[0] !== 'object')) {
                savedItems = [];
            }
        } catch (e) {
            console.error("Lỗi khi tải cài đặt Thi đua NV:", e);
            savedItems = [];
        }

        const savedMap = new Map(savedItems.map(item => [item.tenGoc, item]));
        const finalSettings = [];
        
        savedItems.forEach(savedItem => {
            if (masterMap.has(savedItem.tenGoc)) {
                const masterItem = masterMap.get(savedItem.tenGoc);
                finalSettings.push({
                    ...savedItem,
                    id: masterItem.id, 
                    label: masterItem.label 
                });
            }
        });

        masterColumns.forEach(masterItem => {
            if (!savedMap.has(masterItem.tenGoc)) {
                finalSettings.push(masterItem);
            }
        });

        return finalSettings;
    }
};