// src/services/auth.service.js
import { get } from 'svelte/store';
// [ATOMIC] Import thêm userProfile và firebaseStore để kích hoạt màng lọc phân quyền
import { currentUser, isAdmin, userProfile, firebaseStore, notificationStore } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { config } from '../config.js';
import { getAuth, signInWithEmailAndPassword, signInAnonymously, sendPasswordResetEmail, signOut, onAuthStateChanged } from "firebase/auth";
// [ATOMIC] Import Firestore API để kéo Profile
import { doc, getDocFromServer } from "firebase/firestore";

// [MỚI] Admin không bao giờ bị coi là hết hạn, bất kể expireAt.
const isProfileExpired = (profile) => {
    return !!profile && profile.role !== 'admin' && !!profile.expireAt && Date.now() > profile.expireAt;
};

export const authService = {
    /**
     * Kiểm tra định dạng email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return email && emailRegex.test(email);
    },

    /**
     * [Chế độ REQUIRE_LOGIN=false] Đảm bảo có phiên Firebase Auth (ẩn danh) để Storage/Firestore
     * chấp nhận request, trong lúc chưa bắt người dùng đăng nhập thật.
     */
    async ensureAnonymousAuth() {
        const auth = getAuth();
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    unsubscribe();
                    resolve(user);
                } else {
                    signInAnonymously(auth).catch((error) => {
                        console.error("[AuthService] Lỗi đăng nhập ẩn danh:", error);
                        reject(error);
                    });
                }
            });
        });
    },

    /**
     * Lắng nghe trạng thái đăng nhập từ Firebase.
     */
    initAuthListener(onResolved) {
        const auth = getAuth();
        const resolve = () => { if (typeof onResolved === 'function') onResolved(); };

        // --- [PHẪU THUẬT FAST BOOT] ---
        // Nếu đã có cache email đăng nhập trước đó, dỡ bỏ màn hình Loading NGAY LẬP TỨC (0ms)
        // Không đợi Firebase khởi tạo. Nếu Firebase báo token chết sau đó, ta tự sửa lỗi ngầm.
        if (typeof localStorage !== 'undefined') {
            const cachedEmail = localStorage.getItem('userEmail');
            if (cachedEmail) {
                console.log("[AuthService] Fast Boot: Phát hiện Cache, giải phóng UI loading tức thì.");
                resolve();
            }
        }
        // ------------------------------

        // [FIX] Trước đây dùng cờ `isFirstCheck` để chỉ gọi onResolved() đúng 1 lần duy nhất trong
        // cả vòng đời listener - nhưng lượt "null" đầu tiên (bình thường, chỉ để hiện form đăng nhập)
        // lại tiêu mất luôn lượt gọi cho lần ĐĂNG NHẬP THẬT SỰ thành công sau đó, khiến
        // loadGlobalSystemConfig() (nạp bảng hệ số quy đổi, khai báo...) không bao giờ chạy nếu người
        // dùng phải đăng nhập lại trong phiên (vd tài khoản hết hạn rồi thử đăng nhập lại thành công).
        // Gọi onResolved() vô điều kiện ở mọi nhánh: hàm này ở App.svelte đã tự chống tải trùng
        // (cờ hasLoadedSystemConfig) nên gọi nhiều lần là an toàn.
        onAuthStateChanged(auth, (user) => { // Không dùng async nữa, xử lý .then() bên trong
            // 1. Phanh phui và tiêu diệt tài khoản ẩn danh cũ
            // (Bỏ qua khi config.REQUIRE_LOGIN=false: lúc đó phiên ẩn danh là cơ chế
            // chủ đích để Storage/Firestore hoạt động cho khách chưa đăng nhập thật.)
            if (user && user.isAnonymous) {
                if (config.REQUIRE_LOGIN === false) {
                    resolve();
                    return;
                }
                console.log("[AuthService] Phát hiện tài khoản ẩn danh cũ. Đang dọn dẹp...");
                signOut(auth).then(() => {
                    currentUser.set(null);
                });
                return;
            }

            // 2. Chỉ chấp nhận User có Email đàng hoàng
            if (user && user.email) {
                console.log("[AuthService] Firebase xác thực ngầm thành công:", user.email);

                // [FIX] KHÔNG cấp quyền vào app (currentUser.set) ngay ở đây nữa. Trước đây làm vậy
                // khiến app mở khoá tức thì rồi mới kiểm tra hạn dùng, dẫn tới hiện tượng "vào được
                // app 1 nhịp rồi mới bị đá ra" và LoginModal cũ bị huỷ giữa chừng làm mất luôn
                // thông báo lỗi. Giờ đợi đọc xong hồ sơ (xác nhận KHÔNG hết hạn) mới thật sự mở khoá.
                const finalizeLogin = (profile) => {
                    currentUser.set({ email: user.email, uid: user.uid });
                    localStorage.setItem('userEmail', user.email);
                    userProfile.set(profile);
                    resolve();
                    // Ghi nhận truy cập - chỉ chạy sau khi đã đọc xong hồ sơ và xác nhận hợp lệ
                    analyticsService.upsertUserRecord(user.email).catch(e => console.error(e));
                };

                const db = get(firebaseStore).db;
                if (db) {
                    const userRef = doc(db, "users", user.email);
                    getDocFromServer(userRef).then(snap => {
                        const profile = snap.exists() ? snap.data() : { role: 'user', allowedWarehouses: [] };
                        if (!snap.exists()) {
                            console.warn("[AuthService] Cảnh báo: User không có cấu hình phân quyền trong Database.");
                        }

                        // [MỚI] Hết hạn (vd đăng nhập lại từ trước, mở tab qua luôn ngày hết hạn)
                        // -> không mở khoá app, đăng xuất ngay, không chờ F5 hay đăng nhập lại.
                        if (isProfileExpired(profile)) {
                            console.warn("[AuthService] Tài khoản đã hết hạn, chặn truy cập.");
                            notificationStore.update(s => ({ ...s, visible: true, type: 'error', message: 'Tài khoản đã hết hạn sử dụng. Vui lòng liên hệ Admin để gia hạn.' }));
                            signOut(auth);
                            resolve();
                            return;
                        }

                        console.log("[AuthService] Đã cập nhật quyền Gatekeeper ngầm.");
                        finalizeLogin(profile);
                    }).catch(e => {
                        console.error("[AuthService] Lỗi khi kéo thông tin phân quyền ngầm:", e);
                        // Không đọc được hồ sơ (vd mất mạng tạm thời) -> vẫn cho vào như user thường,
                        // tránh khoá nhầm người dùng hợp lệ chỉ vì 1 lần đọc lỗi.
                        finalizeLogin({ role: 'user', allowedWarehouses: [] });
                    });
                } else {
                    finalizeLogin({ role: 'user', allowedWarehouses: [] });
                }
            } else {
                // 3. User null (Token đã chết hoặc user chủ động đăng xuất)
                console.log("[AuthService] Firebase báo Token null. Đang dọn dẹp phiên...");
                currentUser.set(null);
                userProfile.set(null); // Xóa profile
                localStorage.removeItem('userEmail');
                resolve();
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

            // [MỚI] Chặn thật ngay lúc đăng nhập nếu tài khoản đã hết hạn sử dụng.
            const db = get(firebaseStore).db;
            if (db) {
                const snap = await getDocFromServer(doc(db, "users", userCredential.user.email));
                if (snap.exists() && isProfileExpired(snap.data())) {
                    await signOut(auth);
                    const expiredError = new Error("Tài khoản đã hết hạn sử dụng. Vui lòng liên hệ Admin để gia hạn.");
                    expiredError.code = 'app/account-expired';
                    throw expiredError;
                }
            }

            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error("[AuthService] Lỗi đăng nhập:", error);
            let msg = "Đăng nhập thất bại. Vui lòng thử lại.";

            if (error.code === 'app/account-expired') {
                msg = error.message;
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
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