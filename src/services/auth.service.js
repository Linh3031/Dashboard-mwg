// Version 2.3 - Add Anonymous Auth to fix 403 error
import { get } from 'svelte/store';
import { currentUser, isAdmin } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { config } from '../config.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

export const authService = {
    /**
     * Kiểm tra định dạng email
     * @param {string} email 
     * @returns {boolean}
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return email && emailRegex.test(email);
    },

    /**
     * [QUAN TRỌNG] Đảm bảo người dùng đã đăng nhập vào Firebase (Ẩn danh)
     * Hàm này cần được gọi ngay khi App khởi chạy để lấy token.
     * @returns {Promise<User>} Firebase User object
     */
    async ensureAnonymousAuth() {
        const auth = getAuth();
        return new Promise((resolve, reject) => {
            // Lắng nghe trạng thái xác thực
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log("[AuthService] Đã xác thực Firebase (Ẩn danh):", user.uid);
                    unsubscribe(); // Hủy lắng nghe sau khi đã có user
                    resolve(user);
                } else {
                    console.log("[AuthService] Chưa có user, đang đăng nhập ẩn danh...");
                    signInAnonymously(auth)
                        .catch((error) => {
                            console.error("[AuthService] Lỗi đăng nhập ẩn danh:", error);
                            reject(error);
                        });
                }
            });
        });
    },

    /**
     * Xử lý định danh người dùng qua Email (Application Layer)
     * @param {string} email 
     * @returns {Promise<boolean>} true nếu thành công
     */
    async loginUser(email) {
        const cleanEmail = email.trim();
        if (!this.isValidEmail(cleanEmail)) {
            return false;
        }

        // 1. Lưu vào LocalStorage để nhớ cho lần sau
        localStorage.setItem('userEmail', cleanEmail);

        // 2. Cập nhật Store
        currentUser.set({ email: cleanEmail });

        // 3. Gọi Analytics (Upsert user record)
        analyticsService.upsertUserRecord(cleanEmail).catch(err => {
            console.error("[AuthService] Lỗi khi ghi nhận user vào analytics:", err);
        });

        return true;
    },

    /**
     * Kiểm tra mật khẩu Admin
     * @param {string} password 
     * @returns {boolean}
     */
    checkAdminPassword(password) {
        if (!config || !config.ADMIN_PASSWORD) {
            console.error("[AuthService] Chưa cấu hình mật khẩu Admin trong config.js");
            return false;
        }
        
        if (password === config.ADMIN_PASSWORD) {
            isAdmin.set(true);
            return true;
        }
        
        return false;
    },

    /**
     * Khởi tạo: Kiểm tra xem đã có email lưu trong localStorage chưa
     * (Chỉ kiểm tra logic Email, phần Firebase Auth sẽ chạy riêng)
     */
    initAuth() {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail && this.isValidEmail(savedEmail)) {
            console.log(`[AuthService] Tìm thấy email đã lưu: ${savedEmail}`);
            currentUser.set({ email: savedEmail });
            // Ghi nhận phiên truy cập
            analyticsService.upsertUserRecord(savedEmail);
            return true; // Đã có email định danh
        }
        return false; // Chưa có email
    }
};