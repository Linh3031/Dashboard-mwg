import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { get } from 'svelte/store';
// [PHẪU THUẬT LOGIC]: Bổ sung import helpContent store
import { firebaseStore, homeConfig, helpContent } from '../../stores.js';
import { getDB, notify, sanitizeForFirestore, checkAdmin } from './utils.js';

export const configService = {
    // --- HELP CONTENT ---
    async saveHelpContent(contents) {
        const db = getDB();
        if (!db) { 
            notify("Lỗi kết nối CSDL!", "error"); 
            throw new Error("Không có kết nối Database"); 
        }
        if (!checkAdmin()) {
            throw new Error("Bạn không có quyền Admin");
        }

        try {
            // [PHẪU THUẬT LOGIC]: Lưu toàn bộ cục JSON vào 1 document duy nhất
            // Không hardcode key nữa để UI muốn thêm bao nhiêu video cũng được
            const docRef = doc(db, "declarations", "helpContent");
            await setDoc(docRef, { data: sanitizeForFirestore(contents) });
            notify('Đã cập nhật nội dung hướng dẫn thành công!', 'success');
        } catch (error) { 
            console.error("Error saving help content:", error);
            notify('Lỗi khi lưu nội dung hướng dẫn.', 'error'); 
            // [QUAN TRỌNG]: Bắt buộc phải throw error để UI nhận biết được sự cố
            throw error; 
        }
    },

    // [PHẪU THUẬT LOGIC]: Bổ sung hàm Load dữ liệu (trước đó bị thiếu hoàn toàn)
    async loadHelpContent() {
        const db = getDB();
        if (!db) return;
        try {
            const docRef = doc(db, "declarations", "helpContent");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const raw = docSnap.data();
                const data = raw.data || raw;
                if (data) {
                    helpContent.set(data);
                }
            }
        } catch (error) { 
            console.error("Error loading help content from Cloud:", error); 
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
            throw error;
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