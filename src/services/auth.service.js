// File: src/services/auth.service.js
import { get } from 'svelte/store';
import { currentUser, isAdmin } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { config } from '../config.js';

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
     * Xử lý đăng nhập người dùng thường
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
        // Chúng ta không await ở đây để không chặn UI, chạy ngầm
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
     */
    initAuth() {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail && this.isValidEmail(savedEmail)) {
            console.log(`[AuthService] Tìm thấy email đã lưu: ${savedEmail}`);
            currentUser.set({ email: savedEmail });
            // Ghi nhận phiên truy cập
            analyticsService.upsertUserRecord(savedEmail);
            return true; // Đã đăng nhập
        }
        return false; // Chưa đăng nhập
    }
};