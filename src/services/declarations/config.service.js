import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { get } from 'svelte/store';
import { firebaseStore, homeConfig } from '../../stores.js';
import { getDB, notify, sanitizeForFirestore, checkAdmin } from './utils.js';

export const configService = {
    // --- HELP CONTENT ---
    async saveHelpContent(contents) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;

        try {
            await Promise.all([
                setDoc(doc(db, "help_content", "data"), { content: contents.data }),
                setDoc(doc(db, "help_content", "luyke"), { content: contents.luyke }),
                setDoc(doc(db, "help_content", "sknv"), { content: contents.sknv }),
                setDoc(doc(db, "help_content", "realtime"), { content: contents.realtime })
            ]);
            notify('Đã cập nhật nội dung hướng dẫn thành công!', 'success');
        } catch (error) { 
            console.error("Error saving help content:", error);
            notify('Lỗi khi lưu nội dung hướng dẫn.', 'error'); 
        }
    },

    // --- HOME CONFIG ---
    async saveHomeConfig(configData) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;

        try {
            const docRef = doc(db, "declarations", "homeConfig");
            await setDoc(docRef, { data: sanitizeForFirestore(configData) });
            homeConfig.set(configData);
            notify('Đã lưu cấu hình Trang chủ thành công!', 'success');
        } catch (error) { 
            console.error("Error saving home config:", error);
            notify('Lỗi khi lưu cấu hình trang chủ: ' + error.message, 'error');
        }
    },

    async loadHomeConfig() {
        const db = getDB();
        if (!db) return;
        try {
            const docRef = doc(db, "declarations", "homeConfig");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const raw = docSnap.data();
                const data = raw.data || raw.config || raw;
                if (data) homeConfig.set(data);
            }
        } catch (error) { console.error("Error loading home config:", error); }
    },

    // --- UPLOAD IMAGE ---
    async uploadImage(file, folder = 'slides') {
        const fb = get(firebaseStore);
        if (!fb.storage) {
            console.warn("Firebase Storage chưa được khởi tạo trong firebaseStore.");
            return null;
        }

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(fb.storage, `${folder}/${fileName}`);
            
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Upload failed:", error);
            throw error;
        }
    }
};