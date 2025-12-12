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
    // --- [MỚI] QUẢN LÝ CẤU HÌNH TOP NHÓM HÀNG (QDC) THEO KHO ---
    
    // Lưu danh sách nhóm hàng hiển thị
    async saveQdcConfig(kho, config) {
        const db = getDB();
        if (!db || !kho) return;

        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                qdcConfig: config, // Lưu mảng tên các nhóm hàng đã chọn
                qdcConfigUpdatedAt: serverTimestamp(),
                qdcConfigUpdatedBy: getCurrentUserEmail()
            }, { merge: true });
            console.log(`[DataSync] Đã lưu cấu hình Top nhóm hàng cho kho ${kho}`);
        } catch (error) {
            console.error("[DataSync] Lỗi lưu cấu hình Top nhóm hàng:", error);
        }
    },

    // Tải cấu hình
    async loadQdcConfig(kho) {
        const db = getDB();
        if (!db || !kho) return null; // Trả về null để biết là chưa có config

        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists() && docSnap.data().qdcConfig) {
                return docSnap.data().qdcConfig;
            }
            return null; // Chưa từng lưu
        } catch (e) {
            console.error("[DataSync] Lỗi tải cấu hình Top nhóm hàng:", e);
            return null;
        }
    },

    // --- CÁC HÀM CŨ (GIỮ NGUYÊN) ---
    async saveRealtimeHiddenCategories(kho, hiddenList) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                realtimeConfig: {
                    hiddenCategories: hiddenList,
                    updatedAt: serverTimestamp(),
                    updatedBy: getCurrentUserEmail()
                }
            }, { merge: true });
        } catch (error) {
            console.error("[DataSync] Lỗi lưu cấu hình Realtime:", error);
        }
    },

    async loadRealtimeHiddenCategories(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists() && docSnap.data().realtimeConfig) {
                return docSnap.data().realtimeConfig.hiddenCategories || [];
            }
            return [];
        } catch (e) {
            return [];
        }
    },

    async savePersonalRevenueTables(kho, tables) {
        const db = getDB();
        if (!db || !kho) return;
        const personalTables = tables.filter(t => !t.isSystem);
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            personalRevenueTables: personalTables,
            personalTablesUpdatedAt: serverTimestamp(),
            personalTablesUpdatedBy: getCurrentUserEmail()
        };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch (error) { throw error; }
    },

    async loadPersonalRevenueTables(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            return docSnap.exists() ? (docSnap.data().personalRevenueTables || []) : [];
        } catch(e) { return []; }
    },

    async saveCustomMetrics(kho, metrics) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            customMetrics: metrics,
            customMetricsUpdatedAt: serverTimestamp(),
            customMetricsUpdatedBy: getCurrentUserEmail()
        };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch (error) { throw error; }
    },

    async loadCustomMetrics(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            return docSnap.exists() ? (docSnap.data().customMetrics || []) : [];
        } catch(e) { return []; }
    },

    async saveMetadataToFirestore(kho, dataType, metadata) {
        const db = getDB();
        if (!db || !kho) throw new Error("Invalid parameters.");
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            [dataType]: { ...metadata, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() }
        };
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
        const dataToSave = {
            competitionConfigs: configs,
            competitionConfigsUpdatedAt: serverTimestamp(),
            competitionConfigsUpdatedBy: getCurrentUserEmail()
        };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch (error) { throw error; }
    },

    async loadCompetitionConfigs(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            return docSnap.exists() ? (docSnap.data().competitionConfigs || []) : [];
        } catch(e) { return []; }
    },

    async saveSpecialPrograms(kho, programs) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            specialPrograms: programs,
            specialProgramsUpdatedAt: serverTimestamp(),
            specialProgramsUpdatedBy: getCurrentUserEmail()
        };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch (error) { throw error; }
    },

    async saveWarehouseMetadata(kho, key, metadata) {
        const db = getDB();
        if (!db) return;
        if (!kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            [key]: {
                ...metadata,
                updatedAt: serverTimestamp(),
                updatedBy: getCurrentUserEmail()
            }
        };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch (error) { throw error; }
    },

    async loadWarehouseData(kho) {
        const db = getDB();
        if (!db || !kho) return null;
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            return docSnap.exists() ? docSnap.data() : null;
        } catch (error) { throw error; }
    }
};