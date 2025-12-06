// src/services/analytics.service.js
// Version 2.2 - Full code implementation (Added getSystemStats & trackAction)
import { get } from 'svelte/store';
import { collection, getDocs, doc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { firebaseStore, isAdmin, currentUser } from '../stores.js';

const getDB = () => {
    const fb = get(firebaseStore);
    return fb.db;
};

export const analyticsService = {
    // Lấy danh sách toàn bộ user để tính toán thống kê
    async getAllUsers() {
        const db = getDB();
        // Không yêu cầu quyền Admin ở đây để Home có thể hiển thị số liệu chung
        if (!db) return [];

        try {
            const usersCollection = collection(db, "users");
            const querySnapshot = await getDocs(usersCollection);
            const users = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                users.push({
                    email: data.email,
                    loginCount: data.loginCount || 0,
                    lastLogin: data.lastLogin ? data.lastLogin.toDate() : null,
                    actionsTaken: data.actionsTaken || 0
                });
            });
            return users;
        } catch (error) {
            console.error("Lỗi khi lấy danh sách user:", error);
            return [];
        }
    },

    // Cập nhật thông tin user khi đăng nhập
    async upsertUserRecord(email) {
        const db = getDB();
        if (!db || !email) return;

        const userRef = doc(db, "users", email);
        try {
            await setDoc(userRef, {
                email: email,
                lastLogin: serverTimestamp(),
                loginCount: increment(1)
            }, { merge: true });
        } catch (error) {
            console.error("Lỗi cập nhật user record:", error);
        }
    },

    // Hàm tăng counter thủ công (Giữ lại để tương thích ngược nếu cần)
    async incrementCounter(fieldName, email = null) {
        const db = getDB();
        if (!db || !fieldName) return;

        if (!email) {
            const user = get(currentUser);
            if (user) email = user.email;
        }

        let docRef;
        const dataToUpdate = { [fieldName]: increment(1) };

        if (fieldName === 'actionsTaken' && email) {
            docRef = doc(db, "users", email);
        } else {
            docRef = doc(db, "analytics", "site_stats");
        }

        try {
            await setDoc(docRef, dataToUpdate, { merge: true });
        } catch (error) {
            console.error(`Lỗi tăng counter ${fieldName}:`, error);
        }
    },

    // [MỚI] Hàm lấy tổng hợp số liệu toàn hệ thống
    async getSystemStats() {
        const users = await this.getAllUsers();
        
        const stats = users.reduce((acc, user) => {
            acc.totalUsers += 1; // Mỗi user là 1 người dùng
            acc.totalVisits += (user.loginCount || 0); // Tổng số lần đăng nhập
            acc.totalActions += (user.actionsTaken || 0); // Tổng số lần upload/paste
            return acc;
        }, { totalUsers: 0, totalVisits: 0, totalActions: 0 });

        return stats;
    },

    // [MỚI] Hàm ghi nhận hành động (dùng cho upload/paste)
    async trackAction() {
        const user = get(currentUser);
        if (!user || !user.email) return; // Chỉ tính khi đã đăng nhập
        
        const db = getDB();
        if (!db) return;

        const userRef = doc(db, "users", user.email);
        try {
            await setDoc(userRef, {
                actionsTaken: increment(1)
            }, { merge: true });
            console.log("[Analytics] Đã ghi nhận 1 lượt sử dụng.");
        } catch (error) {
            console.error("Lỗi trackAction:", error);
        }
    }
};