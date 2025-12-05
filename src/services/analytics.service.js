// src/services/analytics.service.js
import { get } from 'svelte/store';
import { collection, getDocs, doc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { firebaseStore, isAdmin, currentUser } from '../stores.js';

const getDB = () => {
    const fb = get(firebaseStore);
    return fb.db;
};

export const analyticsService = {
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

    async incrementCounter(fieldName, email = null) {
        const db = getDB();
        if (!db || !fieldName) return;

        // Nếu email không được truyền vào, thử lấy từ store
        if (!email) {
            const user = get(currentUser);
            if (user) email = user.email;
        }

        let docRef;
        const dataToUpdate = { [fieldName]: increment(1) };

        if (fieldName === 'actionsTaken' && email) {
            docRef = doc(db, "users", email);
        } else {
            // Fallback: tăng global stats nếu không phải actionsTaken hoặc không có user
            docRef = doc(db, "analytics", "site_stats");
        }

        try {
            await setDoc(docRef, dataToUpdate, { merge: true });
        } catch (error) {
            console.error(`Lỗi tăng counter ${fieldName}:`, error);
        }
    }
};