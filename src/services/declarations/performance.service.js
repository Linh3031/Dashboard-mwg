import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { efficiencyConfig, qdcConfigStore } from '../../stores.js';
import { getDB, notify, sanitizeForFirestore, checkAdmin } from './utils.js';

export const performanceService = {
    // --- SYSTEM REVENUE TABLES ---
    async loadSystemRevenueTables() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "systemRevenueTables");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                const tables = d.tables || d.data || d.items || [];
                console.log(`[PerformanceService] Loaded ${tables.length} system revenue tables.`);
                return tables;
            }
            return [];
        } catch (e) {
            console.error("Lỗi tải bảng hệ thống:", e);
            return [];
        }
    },

    async saveSystemRevenueTables(tables) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
        const systemTables = tables.filter(t => t.isSystem).map(t => sanitizeForFirestore(t));
        try {
            const docRef = doc(db, "declarations", "systemRevenueTables");
            await setDoc(docRef, { tables: systemTables, updatedAt: serverTimestamp() });
            notify(`Đã lưu ${systemTables.length} bảng doanh thu hệ thống lên Cloud!`, 'success');
        } catch (error) { 
            console.error("Firebase Error Full:", error);
            notify('Lỗi lưu bảng hệ thống: ' + error.message, 'error'); 
        }
    },

    // --- SYSTEM PERFORMANCE TABLES ---
    async loadSystemPerformanceTables() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "systemPerformanceTables");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                const tables = d.tables || d.data || [];
                console.log(`[PerformanceService] Loaded ${tables.length} system performance tables.`);
                return tables;
            }
            return [];
        } catch (e) {
            console.error("Lỗi tải bảng hiệu quả hệ thống:", e);
            return [];
        }
    },

    async saveSystemPerformanceTables(tables) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
        
        const systemTables = tables.filter(t => t.isSystem).map(t => sanitizeForFirestore(t));
        try {
            const docRef = doc(db, "declarations", "systemPerformanceTables");
            await setDoc(docRef, { tables: systemTables, updatedAt: serverTimestamp() });
            notify(`Đã lưu ${systemTables.length} bảng hiệu quả hệ thống lên Cloud!`, 'success');
        } catch (error) { 
            console.error("Lỗi lưu bảng hiệu quả hệ thống:", error);
            notify('Lỗi lưu bảng hiệu quả hệ thống: ' + error.message, 'error');
        }
    },

    // --- LOGIC & CALCULATION ---
    async loadDeclarationsFromFirestore() {
        const db = getDB();
        if (!db) return {}; 
        try {
            const declarationIds = ['hinhThucXuat', 'hinhThucXuatGop', 'heSoQuyDoi'];
            const declarations = {};
            await Promise.all(declarationIds.map(async (id) => {
                const docRef = doc(db, "declarations", id);
                const docSnap = await getDoc(docRef);
                declarations[id] = docSnap.exists() ? (docSnap.data().content || '') : '';
            }));
            return declarations;
        } catch (error) { console.error("Error loading declarations:", error); return {}; }
    },

    async saveDeclarationsToFirestore(declarations) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
        try {
            await Promise.all([
                setDoc(doc(db, "declarations", "hinhThucXuat"), { content: declarations.ycx }),
                setDoc(doc(db, "declarations", "hinhThucXuatGop"), { content: declarations.ycxGop }),
                setDoc(doc(db, "declarations", "heSoQuyDoi"), { content: declarations.heSo })
            ]);
            notify('Đồng bộ khai báo tính toán thành công!', 'success');
        } catch (error) { console.error("Error saving declarations:", error); notify('Lỗi khi đồng bộ khai báo tính toán.', 'error'); }
    },

    // --- GLOBAL COMPETITION CONFIGS ---
    async saveGlobalCompetitionConfigs(configs) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            await setDoc(docRef, { configs: sanitizeForFirestore(configs) });
        } catch (error) { console.error("Error saving global comps:", error); }
    },

    async loadGlobalCompetitionConfigs() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                return d.configs || d.data || [];
            }
            return [];
        } catch (error) { return []; }
    },

    // --- EFFICIENCY & QDC CONFIGS ---
    async saveEfficiencyConfig(config) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
        try {
            const docRef = doc(db, "declarations", "efficiencyConfig");
            await setDoc(docRef, { data: sanitizeForFirestore(config), updatedAt: serverTimestamp() });
            efficiencyConfig.set(config);
            notify('Đã lưu cấu hình Bảng Hiệu quả hệ thống!', 'success');
        } catch (e) { console.error(e); notify('Lỗi lưu config: ' + e.message, 'error'); }
    },

    async loadEfficiencyConfig() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "efficiencyConfig");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                const data = d.data || d.items || d.config || [];
                // [FIX CRITICAL] Cập nhật store ngay sau khi tải về
                efficiencyConfig.set(data);
                console.log(`[PerformanceService] Đã cập nhật Store EfficiencyConfig với ${data.length} dòng.`);
                return data;
            }
            return [];
        } catch (e) { console.error("Lỗi tải efficiency config:", e); return []; }
    },
    
    async saveQdcConfig(selectedGroups) {
         const db = getDB();
        if (!db || !checkAdmin()) return;
        try {
            const docRef = doc(db, "declarations", "qdcConfig");
            await setDoc(docRef, { data: sanitizeForFirestore(selectedGroups) });
            qdcConfigStore.set(selectedGroups);
        } catch (e) { console.error(e); }
    },
    
    async loadQdcConfig() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "qdcConfig");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                return d.data || d.config || d.items || [];
            }
            return [];
        } catch (e) { return []; }
    },
};