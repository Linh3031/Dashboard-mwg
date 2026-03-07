import { doc, getDoc, setDoc } from "firebase/firestore";
import { get } from 'svelte/store';
import { firebaseStore } from '../stores.js';

export const toolsService = {
    // Lấy danh sách công cụ từ Firestore
    async getTools() {
        try {
            const { db } = get(firebaseStore);
            if (!db) {
                console.warn("[ToolsService] Database chưa sẵn sàng.");
                return [];
            }
            
            const docRef = doc(db, "system_config", "external_tools");
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data().items || [];
            }
            return [];
        } catch (error) {
            console.error("[ToolsService] Lỗi khi tải danh sách công cụ:", error);
            return [];
        }
    },

    // Lưu danh sách công cụ lên Firestore (Dành cho Admin)
    async saveTools(items) {
        try {
            const { db } = get(firebaseStore);
            if (!db) throw new Error("Database chưa sẵn sàng.");
            
            const docRef = doc(db, "system_config", "external_tools");
            await setDoc(docRef, { items });
            console.log("[ToolsService] Đã lưu thành công!");
            return true;
        } catch (error) {
            console.error("[ToolsService] Lỗi khi lưu danh sách công cụ:", error);
            return false;
        }
    }
};