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
    async saveMetadataToFirestore(kho, dataType, metadata) {
        // ... (Giữ nguyên) ...
        const db = getDB();
        if (!db || !kho) throw new Error("Invalid parameters.");
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = {
             [dataType]: { ...metadata, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() }
        };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch(e) { throw e; }
    },

    async savePastedDataToFirestore(kho, dataType, content, versionInfo) {
        // ... (Giữ nguyên) ...
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
        // ... (Giữ nguyên) ...
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            return docSnap.exists() ? (docSnap.data().competitionConfigs || []) : [];
        } catch(e) { return []; }
    },

    // === HÀM MỚI ===
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
    }
};