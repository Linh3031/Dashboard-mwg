// src/services/demo.service.js
import { get } from 'svelte/store';
import { 
    danhSachNhanVien, 
    realtimeYCXData, 
    ycxData,
    masterReportData, 
    declarations, 
    categoryStructure, 
    kpiStore, 
    efficiencyConfig, 
    customRevenueTables, 
    customPerformanceTables,
    isDemoMode,
    selectedWarehouse,
    activeTab
} from '../stores.js';

export const demoService = {
    // 1. CHỨC NĂNG CHỤP ẢNH DỮ LIỆU (Dùng cho Admin)
    createSnapshot: () => {
        const snapshot = {
            timestamp: new Date().toISOString(),
            version: '2.0',
            data: {
                danhSachNhanVien: get(danhSachNhanVien),
                realtimeYCXData: get(realtimeYCXData), // Dữ liệu thô Realtime
                ycxData: get(ycxData),                 // Dữ liệu thô Lũy kế
                masterReportData: get(masterReportData), // [QUAN TRỌNG] Báo cáo ĐÃ XỬ LÝ
                declarations: get(declarations),
                categoryStructure: get(categoryStructure),
                kpiStore: get(kpiStore),
                efficiencyConfig: get(efficiencyConfig),
                customRevenueTables: get(customRevenueTables),
                customPerformanceTables: get(customPerformanceTables)
            }
        };
        return snapshot;
    },

    // Hàm tải xuống file JSON
    downloadSnapshot: () => {
        try {
            const data = demoService.createSnapshot();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `demo_snapshot_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch (e) {
            console.error("Lỗi xuất dữ liệu Demo:", e);
            return false;
        }
    },

    // 2. CHỨC NĂNG NẠP DỮ LIỆU (Dùng cho User Demo)
    loadSnapshot: async (snapshotData) => {
        if (!snapshotData || !snapshotData.data) {
            console.error("Dữ liệu Snapshot không hợp lệ");
            return false;
        }

        const d = snapshotData.data;

        // Bật chế độ Demo
        isDemoMode.set(true);

        // Nạp dữ liệu vào từng Store
        if (d.danhSachNhanVien) danhSachNhanVien.set(d.danhSachNhanVien);
        if (d.realtimeYCXData) realtimeYCXData.set(d.realtimeYCXData);
        if (d.ycxData) ycxData.set(d.ycxData);
        if (d.masterReportData) masterReportData.set(d.masterReportData); // Quan trọng nhất
        if (d.declarations) declarations.set(d.declarations);
        if (d.categoryStructure) categoryStructure.set(d.categoryStructure);
        if (d.kpiStore) kpiStore.set(d.kpiStore);
        if (d.efficiencyConfig) efficiencyConfig.set(d.efficiencyConfig);
        if (d.customRevenueTables) customRevenueTables.set(d.customRevenueTables);
        if (d.customPerformanceTables) customPerformanceTables.set(d.customPerformanceTables);

        return true;
    }
};