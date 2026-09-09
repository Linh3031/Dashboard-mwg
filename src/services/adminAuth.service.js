// src/services/adminAuth.service.js
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { get } from "svelte/store";
import { firebaseStore } from "../stores.js";

const DEFAULT_PASSWORD = "123456";

// Tính hạn dùng dựa trên Gói (Tier) - nguồn duy nhất, dùng chung cho tạo mới, sửa 1 user,
// sửa hàng loạt theo kho, và import Excel.
export function computeExpireAt(subscriptionTier) {
    const now = new Date();
    if (subscriptionTier === '1_day') return new Date(now.getTime() + 86400000);
    if (subscriptionTier === '3_days') return new Date(now.getTime() + 3 * 86400000);
    if (subscriptionTier === '1_month') return new Date(now.setMonth(now.getMonth() + 1));
    if (subscriptionTier === '3_months') return new Date(now.setMonth(now.getMonth() + 3));
    if (subscriptionTier === '6_months') return new Date(now.setMonth(now.getMonth() + 6));
    if (subscriptionTier === '12_months') return new Date(now.setFullYear(now.getFullYear() + 1));
    return null; // lifetime / trial
}

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

            const expireAt = computeExpireAt(subscriptionTier);

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
            const err = new Error(msg);
            err.code = error.code;
            throw err;
        }
    },

    // Import hàng loạt từ Excel: email mới -> tạo tài khoản (mật khẩu mặc định); email đã tồn tại
    // -> chỉ cập nhật lại mã kho + hạn dùng, không đụng mật khẩu cũ.
    async upsertUsersFromRows(rows) {
        const store = get(firebaseStore);
        if (!store || !store.db) throw new Error("Hệ thống chưa kết nối Firebase.");

        const created = [];
        const updated = [];
        const failed = [];

        for (const row of rows) {
            const cleanEmail = String(row.email || '').trim().toLowerCase();
            const role = row.role || 'user';
            try {
                await adminAuthService.createSecondaryUser(cleanEmail, DEFAULT_PASSWORD, role, row.allowedWarehouses, row.tier);
                created.push(cleanEmail);
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    try {
                        const expireAt = computeExpireAt(row.tier);
                        await updateDoc(doc(store.db, "users", cleanEmail), {
                            allowedWarehouses: row.allowedWarehouses || [],
                            tier: row.tier || 'trial',
                            expireAt: expireAt ? expireAt.getTime() : null
                        });
                        updated.push(cleanEmail);
                    } catch (updateError) {
                        failed.push({ email: cleanEmail, message: updateError.message });
                    }
                } else {
                    failed.push({ email: cleanEmail, message: error.message });
                }
            }
        }

        return { created, updated, failed };
    }
};