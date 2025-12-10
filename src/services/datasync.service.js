// src/services/datasync.service.js
// Version 2.2 - Add Personal Revenue Tables Sync
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
    // --- [MỚI] QUẢN LÝ BẢNG DOANH THU CÁ NHÂN THEO KHO ---
    
    async savePersonalRevenueTables(kho, tables) {
        const db = getDB();
        if (!db || !kho) return;
        
        // Lọc kỹ để chắc chắn không lưu nhầm bảng System vào đây
        const personalTables = tables.filter(t => !t.isSystem);

        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            personalRevenueTables: personalTables,
            personalTablesUpdatedAt: serverTimestamp(),
            personalTablesUpdatedBy: getCurrentUserEmail()
        };
        
        try { 
            await setDoc(khoRef, dataToSave, { merge: true }); 
            console.log(`[DataSync] Đã lưu ${personalTables.length} bảng cá nhân cho kho ${kho}`);
        } catch (error) { 
            console.error("[DataSync] Lỗi lưu bảng cá nhân:", error); 
            throw error; 
        }
    },

    async loadPersonalRevenueTables(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            return docSnap.exists() ? (docSnap.data().personalRevenueTables || []) : [];
        } catch(e) { 
            console.error("[DataSync] Lỗi tải bảng cá nhân:", e);
            return []; 
        }
    },

    // --- CÁC HÀM KHÁC (GIỮ NGUYÊN) ---
    
    async saveCustomMetrics(kho, metrics) {
        const db = getDB();
        if (!db || !kho) { console.warn("Missing DB or Warehouse"); return; }
        
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            customMetrics: metrics,
            customMetricsUpdatedAt: serverTimestamp(),
            customMetricsUpdatedBy: getCurrentUserEmail()
        };
        
        try { 
            await setDoc(khoRef, dataToSave, { merge: true }); 
        } catch (error) { 
            console.error("[DataSync] Lỗi lưu custom metrics:", error); 
            throw error; 
        }
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
        if (!db || !kho) { alert("Vui lòng chọn Kho trước."); return; }
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            competitionConfigs: configs,
            competitionConfigsUpdatedAt: serverTimestamp(),
            competitionConfigsUpdatedBy: getCurrentUserEmail()
        };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch (error) { console.error(error); throw error; }
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
        if (!db || !kho) { alert("Vui lòng chọn Kho trước."); return; }
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
            specialPrograms: programs,
            specialProgramsUpdatedAt: serverTimestamp(),
            specialProgramsUpdatedBy: getCurrentUserEmail()
        };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch (error) { console.error(error); throw error; }
    },

    async saveWarehouseMetadata(kho, key, metadata) {
        const db = getDB();
        if (!db) { console.warn("Firestore chưa sẵn sàng"); return; }
        if (!kho) return;

        const khoRef = doc(db, "warehouseData", kho);
        
        const dataToSave = {
            [key]: {
                ...metadata,
                updatedAt: serverTimestamp(),
                updatedBy: getCurrentUserEmail()
            }
        };

        try {
            await setDoc(khoRef, dataToSave, { merge: true });
        } catch (error) {
            console.error(`[Firestore] Lỗi lưu metadata ${key}:`, error);
            throw error;
        }
    },

    async loadWarehouseData(kho) {
        const db = getDB();
        if (!db || !kho) return null;

        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error(`[Firestore] Lỗi tải kho ${kho}:`, error);
            throw error;
        }
    }
};