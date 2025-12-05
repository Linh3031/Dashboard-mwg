// src/services/analytics.service.js
// Version 1.0 - Service thống kê người dùng
import { get } from 'svelte/store';
import { collection, getDocs, doc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { firebaseStore, isAdmin } from '../stores.js';

const getDB = () => {
    const fb = get(firebaseStore);
    return fb.db;
};

export const analyticsService = {
    /**
     * Lấy danh sách tất cả người dùng từ Firestore
     */
    async getAllUsers() {
        const db = getDB();
        if (!db || !get(isAdmin)) return [];

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

    /**
     * Ghi nhận người dùng truy cập (Upsert)
     */
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
    }
};