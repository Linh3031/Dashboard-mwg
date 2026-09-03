// src/services/adminAuth.service.js
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { get } from "svelte/store";
import { firebaseStore } from "../stores.js";

export const adminAuthService = {
    async createSecondaryUser(email, password, role, allowedWarehouses, subscriptionTier) {
        const store = get(firebaseStore);
        if (!store || !store.app) throw new Error("Hệ thống chưa kết nối Firebase.");

        const secondaryAppName = "SecondaryApp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
        const secondaryApp = initializeApp(store.app.options, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);

        try {
            const cleanEmail = email.trim().toLowerCase();
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password);
            
            // Tính toán ngày hết hạn dựa trên Gói (Tier)
            let expireAt = null;
            const now = new Date();
            if (subscriptionTier === '1_month') {
                expireAt = new Date(now.setMonth(now.getMonth() + 1));
            } else if (subscriptionTier === '3_months') {
                expireAt = new Date(now.setMonth(now.getMonth() + 3));
            } else if (subscriptionTier === '6_months') {
                expireAt = new Date(now.setMonth(now.getMonth() + 6));
            } else if (subscriptionTier === '12_months') {
                expireAt = new Date(now.setFullYear(now.getFullYear() + 1));
            }
            
            const userRef = doc(store.db, "users", cleanEmail);
            await setDoc(userRef, {
                uid: userCred.user.uid,
                email: cleanEmail,
                role: role || 'user',
                allowedWarehouses: allowedWarehouses || [],
                status: 'active',
                tier: subscriptionTier || 'trial',
                expireAt: expireAt ? expireAt.getTime() : null, // Lưu timestamp để dễ so sánh
                createdAt: serverTimestamp(),
                createdBy: store.auth.currentUser ? store.auth.currentUser.email : 'admin'
            });

            await deleteApp(secondaryApp);
            return { success: true, email: cleanEmail };
            
        } catch (error) {
            await deleteApp(secondaryApp).catch(() => {});
            let msg = "Lỗi không xác định khi tạo User.";
            if (error.code === 'auth/email-already-in-use') msg = "Email này đã được đăng ký trên hệ thống!";
            if (error.code === 'auth/weak-password') msg = "Mật khẩu quá yếu (cần tối thiểu 6 ký tự).";
            throw new Error(msg);
        }
    }
};