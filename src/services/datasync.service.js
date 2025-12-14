// src/services/datasync.service.js
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; 
import { firebaseStore, currentUser } from '../stores.js'; 
import { get } from 'svelte/store';

const getDB = () => {
    const fb = get(firebaseStore);
    return fb.db;
};

const getCurrentUserEmail = () => {
    const user = get(currentUser);
    return user ? user.email : 'unknown';
};

export const datasyncService = {
    // --- MỤC TIÊU (GOALS) ---
    // Lưu cấu hình mục tiêu (Lũy kế + Realtime) cho kho
    async saveGoalSettings(kho, type, settings) {
        const db = getDB();
        if (!db || !kho) return;

        // type: 'luyke' hoặc 'realtime'
        const fieldName = type === 'luyke' ? 'luykeGoals' : 'realtimeGoals';

        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                [fieldName]: settings,
                [`${fieldName}UpdatedAt`]: serverTimestamp(),
                [`${fieldName}UpdatedBy`]: getCurrentUserEmail()
            }, { merge: true });
            console.log(`[DataSync] Đã lưu mục tiêu ${type} cho kho ${kho}`);
        } catch (error) {
            console.error(`[DataSync] Lỗi lưu mục tiêu ${type}:`, error);
        }
    },

    // Tải cấu hình mục tiêu
    async loadGoalSettings(kho) {
        const db = getDB();
        if (!db || !kho) return { luyke: {}, realtime: {} };

        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    luyke: data.luykeGoals || {},
                    realtime: data.realtimeGoals || {}
                };
            }
            return { luyke: {}, realtime: {} };
        } catch (e) {
            console.error("[DataSync] Lỗi tải mục tiêu:", e);
            return { luyke: {}, realtime: {} };
        }
    },

    // --- CÁC HÀM KHÁC (GIỮ NGUYÊN) ---
    async saveQdcConfig(kho, config) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                qdcConfig: config,
                qdcConfigUpdatedAt: serverTimestamp(),
                qdcConfigUpdatedBy: getCurrentUserEmail()
            }, { merge: true });
        } catch (error) { console.error(error); }
    },

    async loadQdcConfig(kho) {
        const db = getDB();
        if (!db || !kho) return null;
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            return (docSnap.exists() && docSnap.data().qdcConfig) ? docSnap.data().qdcConfig : null;
        } catch (e) { return null; }
    },

    async saveRealtimeHiddenCategories(kho, hiddenList) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                realtimeConfig: { hiddenCategories: hiddenList, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() }
            }, { merge: true });
        } catch (error) { console.error(error); }
    },

    async loadRealtimeHiddenCategories(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            return (docSnap.exists() && docSnap.data().realtimeConfig) ? docSnap.data().realtimeConfig.hiddenCategories || [] : [];
        } catch (e) { return []; }
    },

    async savePersonalRevenueTables(kho, tables) {
        const db = getDB();
        if (!db || !kho) return;
        const personalTables = tables.filter(t => !t.isSystem);
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { personalRevenueTables: personalTables, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async loadPersonalRevenueTables(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? (docSnap.data().personalRevenueTables || []) : []; } catch(e) { return []; }
    },

    // --- [NEW] BẢNG HIỆU QUẢ CÁ NHÂN ---
    async savePersonalPerformanceTables(kho, tables) {
        const db = getDB();
        if (!db || !kho) return;
        const personalTables = tables.filter(t => !t.isSystem);
        const khoRef = doc(db, "warehouseData", kho);
        try { 
            await setDoc(khoRef, { 
                personalPerformanceTables: personalTables, 
                updatedAt: serverTimestamp() 
            }, { merge: true }); 
        } catch (error) { throw error; }
    },

    async loadPersonalPerformanceTables(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { 
            const docSnap = await getDoc(khoRef); 
            return docSnap.exists() ? (docSnap.data().personalPerformanceTables || []) : []; 
        } catch(e) { 
            console.error("Lỗi tải bảng hiệu quả cá nhân:", e);
            return []; 
        }
    },
    // --- END NEW ---

    async saveCustomMetrics(kho, metrics) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { customMetrics: metrics, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async loadCustomMetrics(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? (docSnap.data().customMetrics || []) : []; } catch(e) { return []; }
    },

    async saveMetadataToFirestore(kho, dataType, metadata) {
        const db = getDB();
        if (!db || !kho) throw new Error("Invalid parameters.");
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = { [dataType]: { ...metadata, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch(e) { throw e; }
    },

    async savePastedDataToFirestore(kho, dataType, content, versionInfo) {
        const db = getDB();
        if (!db || !kho) throw new Error("Invalid parameters.");
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = { [dataType]: { content, ...versionInfo, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch(e) { throw e; }
    },

    async saveCompetitionConfigs(kho, configs) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { competitionConfigs: configs, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async loadCompetitionConfigs(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? (docSnap.data().competitionConfigs || []) : []; } catch(e) { return []; }
    },

    async saveSpecialPrograms(kho, programs) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { specialPrograms: programs, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async saveWarehouseMetadata(kho, key, metadata) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = { [key]: { ...metadata, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch (error) { throw error; }
    },

    async loadWarehouseData(kho) {
        const db = getDB();
        if (!db || !kho) return null;
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? docSnap.data() : null; } catch (error) { throw error; }
    }
};