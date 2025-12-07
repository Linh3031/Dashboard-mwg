// src/services/storage.service.js
// Version 3.1 - Fixed: Export both 'storage' (IndexedDB) and 'storageService' (Firebase)
// MODULE: STORAGE SERVICE
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { get } from 'svelte/store';
import { firebaseStore, notificationStore } from '../stores.js';

// --- PHẦN 1: FIREBASE STORAGE (Mới) ---

const getStorageInstance = () => {
    const fb = get(firebaseStore);
    if (!fb || !fb.storage) {
        try { return getStorage(); } catch (e) { return null; }
    }
    return fb.storage;
};

const showNotification = (message, type = 'info') => {
    notificationStore.set({ message, type, visible: true });
    setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
};

export const storageService = {
    async getTemplateDownloadURL() {
        const storage = getStorageInstance();
        if (!storage) throw new Error("Firebase Storage chưa được khởi tạo.");
        const filePath = 'templates/danh_sach_nhan_vien_mau.xlsx';
        const storageRef = ref(storage, filePath);
        return await getDownloadURL(storageRef);
    },

    async getBookmarkDownloadURL() {
        const storage = getStorageInstance();
        if (!storage) throw new Error("Firebase Storage chưa được khởi tạo.");
        const filePath = 'templates/Share_QLST.zip';
        const storageRef = ref(storage, filePath);
        return await getDownloadURL(storageRef);
    },

    async getQrCodeDownloadURL() {
        const storage = getStorageInstance();
        if (!storage) throw new Error("Firebase Storage chưa được khởi tạo.");
        const filePath = 'qrcodes/main-qr.jpg';
        const storageRef = ref(storage, filePath);
        return await getDownloadURL(storageRef);
    },

    async uploadFileToStorage(file, storagePath, onProgress) {
        const storage = getStorageInstance();
        if (!storage) throw new Error("Firebase Storage chưa khởi tạo.");
        
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload ${storagePath}: ${Math.round(progress)}%`);
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    console.error(`Upload lỗi:`, error);
                    showNotification(`Lỗi upload: ${error.code}`, 'error');
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log('File available at', downloadURL);
                        resolve(downloadURL);
                    } catch (err) {
                        reject(err);
                    }
                }
            );
        });
    },
};

// --- PHẦN 2: INDEXEDDB (Cũ - Khôi phục lại) ---

export const storage = {
    db: null,
    dbName: 'AppStorageDB',
    storeName: 'fileStore',

    openDB() {
        // console.log("[IndexedDB] Opening...");
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            request.onerror = (event) => reject(event.target.error);
        });
    },

    async setItem(id, value) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put({ id, value });
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) {
            console.error(`[IndexedDB] Error saving ${id}:`, error);
            throw error;
        }
    },

    async getItem(id) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);
                request.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : null);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (error) {
            console.error(`[IndexedDB] Error getting ${id}:`, error);
            throw error;
        }
    }
};