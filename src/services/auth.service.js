// src/services/auth.service.js
import { get } from 'svelte/store';
// [ATOMIC] Import thêm userProfile và firebaseStore để kích hoạt màng lọc phân quyền
import { currentUser, isAdmin, userProfile, firebaseStore } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { config } from '../config.js';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "firebase/auth";
// [ATOMIC] Import Firestore API để kéo Profile
import { doc, getDoc } from "firebase/firestore";

export const authService = {
    /**
     * Kiểm tra định dạng email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return email && emailRegex.test(email);
    },

    /**
     * Lắng nghe trạng thái đăng nhập từ Firebase. 
     */
    initAuthListener(onResolved) {
        const auth = getAuth();
        let isFirstCheck = true;

        // --- [PHẪU THUẬT FAST BOOT] ---
        // Nếu đã có cache email đăng nhập trước đó, dỡ bỏ màn hình Loading NGAY LẬP TỨC (0ms)
        // Không đợi Firebase khởi tạo. Nếu Firebase báo token chết sau đó, ta tự sửa lỗi ngầm.
        if (typeof localStorage !== 'undefined') {
            const cachedEmail = localStorage.getItem('userEmail');
            if (cachedEmail) {
                console.log("[AuthService] Fast Boot: Phát hiện Cache, giải phóng UI loading tức thì.");
                isFirstCheck = false;
                if (typeof onResolved === 'function') onResolved();
            }
        }
        // ------------------------------

        onAuthStateChanged(auth, (user) => { // Không dùng async nữa, xử lý .then() bên trong
            // 1. Phanh phui và tiêu diệt tài khoản ẩn danh cũ
            if (user && user.isAnonymous) {
                console.log("[AuthService] Phát hiện tài khoản ẩn danh cũ. Đang dọn dẹp...");
                signOut(auth).then(() => {
                    currentUser.set(null);
                });
                return;
            }

            // 2. Chỉ chấp nhận User có Email đàng hoàng
            if (user && user.email) {
                console.log("[AuthService] Firebase xác thực ngầm thành công:", user.email);
                currentUser.set({ email: user.email, uid: user.uid });
                localStorage.setItem('userEmail', user.email);

                // Nếu chưa Fast Boot (trường hợp đăng nhập lần đầu tiên máy mới), giải phóng UI
                if (isFirstCheck) {
                    isFirstCheck = false;
                    if (typeof onResolved === 'function') onResolved();
                }

                // --- TẢI THÔNG TIN PHÂN QUYỀN (PROFILE) CHẠY NGẦM ---
                const db = get(firebaseStore).db;
                if (db) {
                    const userRef = doc(db, "users", user.email);
                    getDoc(userRef).then(snap => {
                        if (snap.exists()) {
                            userProfile.set(snap.data()); 
                            console.log("[AuthService] Đã cập nhật quyền Gatekeeper ngầm.");
                        } else {
                            console.warn("[AuthService] Cảnh báo: User không có cấu hình phân quyền trong Database.");
                            userProfile.set({ role: 'user', allowedWarehouses: [] });
                        }
                    }).catch(e => {
                        console.error("[AuthService] Lỗi khi kéo thông tin phân quyền ngầm:", e);
                    });
                }

                // Ghi nhận truy cập
                analyticsService.upsertUserRecord(user.email).catch(e => console.error(e));
            } else {
                // 3. User null (Token đã chết hoặc user chủ động đăng xuất)
                console.log("[AuthService] Firebase báo Token null. Đang dọn dẹp phiên...");
                currentUser.set(null);
                userProfile.set(null); // Xóa profile
                localStorage.removeItem('userEmail');
                
                // Self-correct (Tự sửa lỗi): Nếu Fast Boot đã lỡ cho vào, giờ tước quyền và giật UI lại
                if (isFirstCheck) {
                    isFirstCheck = false;
                    if (typeof onResolved === 'function') onResolved();
                }
            }
        });
    },

    /**
     * Đăng nhập bằng Email và Password
     */
    async loginUser(email, password) {
        const cleanEmail = email.trim();
        if (!this.isValidEmail(cleanEmail)) {
            throw new Error("Định dạng Email không hợp lệ!");
        }
        if (!password) {
            throw new Error("Vui lòng nhập mật khẩu!");
        }

        const auth = getAuth();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error("[AuthService] Lỗi đăng nhập:", error);
            let msg = "Đăng nhập thất bại. Vui lòng thử lại.";
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = "Tài khoản hoặc mật khẩu không chính xác.";
            } else if (error.code === 'auth/too-many-requests') {
                msg = "Tài khoản bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.";
            } else if (error.code === 'auth/network-request-failed') {
                msg = "Lỗi kết nối mạng. Vui lòng kiểm tra lại.";
            }
            
            throw new Error(msg);
        }
    },

    /**
     * Gửi link khôi phục mật khẩu qua Email (Miễn phí từ Firebase)
     */
    async resetPassword(email) {
        const cleanEmail = email.trim();
        if (!this.isValidEmail(cleanEmail)) {
            throw new Error("Định dạng Email không hợp lệ!");
        }

        const auth = getAuth();
        try {
            await sendPasswordResetEmail(auth, cleanEmail);
            return { success: true };
        } catch (error) {
            console.error("[AuthService] Lỗi reset password:", error);
            let msg = "Không thể gửi email khôi phục.";
            if (error.code === 'auth/user-not-found') {
                msg = "Email này chưa được cấp quyền trên hệ thống.";
            }
            throw new Error(msg);
        }
    },

    /**
     * Đăng xuất
     */
    async logoutUser() {
        const auth = getAuth();
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error("[AuthService] Lỗi đăng xuất:", error);
            throw new Error("Lỗi khi đăng xuất khỏi hệ thống.");
        }
    },

    /**
     * Kiểm tra mật khẩu Admin (Dùng cho các setting cục bộ)
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
    }
};