<script>
    import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
    import { authService } from '../../services/auth.service.js';

    export let dismissable = false;
    const dispatch = createEventDispatcher();

    let email = '';
    let password = '';
    let isLoading = false;
    let errorMessage = '';
    let successMessage = '';
    let isResetMode = false;
    
    // State cho tính năng mới
    let showPassword = false;
    let rememberMe = false;

    onMount(() => {
        // Kiểm tra xem trước đó người dùng có check "Nhớ mật khẩu" không
        const savedEmail = localStorage.getItem('saved_login_email');
        const savedPass = localStorage.getItem('saved_login_pass');
        if (savedEmail && savedPass) {
            email = savedEmail;
            try {
                password = atob(savedPass); // Giải mã cơ bản
                rememberMe = true;
            } catch (e) {
                console.error("Lỗi giải mã mật khẩu đã lưu.");
            }
        }
    });

    async function handleLogin() {
        errorMessage = '';
        successMessage = '';
        isLoading = true;
        try {
            await authService.loginUser(email, password);
            
            // Xử lý lưu hoặc xóa mật khẩu nếu đăng nhập thành công
            if (rememberMe) {
                localStorage.setItem('saved_login_email', email);
                localStorage.setItem('saved_login_pass', btoa(password)); // Mã hóa cơ bản để tránh lộ plaintext
            } else {
                localStorage.removeItem('saved_login_email');
                localStorage.removeItem('saved_login_pass');
            }
            // Thành công thì AuthListener ở App.svelte sẽ tự cập nhật store
        } catch (error) {
            errorMessage = error.message;
        } finally {
            isLoading = false;
        }
    }

    async function handleResetPassword() {
        errorMessage = '';
        successMessage = '';
        isLoading = true;
        try {
            await authService.resetPassword(email);
            successMessage = 'Đã gửi link khôi phục! Vui lòng kiểm tra hộp thư đến (hoặc mục Thư Rác/Spam) của bạn.';
            setTimeout(() => {
                isResetMode = false;
                successMessage = '';
                password = '';
            }, 6000);
        } catch (error) {
            errorMessage = error.message;
        } finally {
            isLoading = false;
        }
    }

    function toggleMode() {
        isResetMode = !isResetMode;
        errorMessage = '';
        successMessage = '';
        password = '';
    }

    function togglePasswordVisibility() {
        showPassword = !showPassword;
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
    <div class="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md overflow-hidden flex flex-col animate-slide-up relative">
        {#if dismissable}
            <button
                on:click={() => dispatch('close')}
                class="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                title="Đóng"
            >
                <i data-feather="x" class="w-4 h-4"></i>
            </button>
        {/if}

        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div class="relative z-10 flex flex-col items-center justify-center">
                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-3">
                    <i data-feather="database" class="w-8 h-8 text-blue-700"></i>
                </div>
                <h2 class="text-xl font-extrabold text-white tracking-wide">CÔNG CỤ HỖ TRỢ PHÂN TÍCH DỮ LIỆU</h2>
                <p class="text-blue-100 text-sm mt-1">Sắp xếp và Tạo mẫu báo cáo</p>
            </div>
        </div>

        <!-- Form Area -->
        <div class="p-6 sm:p-8 bg-white">
            {#if errorMessage}
                <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
                    <i data-feather="alert-circle" class="w-4 h-4 mt-0.5 flex-shrink-0"></i>
                    <span>{errorMessage}</span>
                </div>
            {/if}

            {#if successMessage}
                <div class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-start gap-2">
                    <i data-feather="check-circle" class="w-4 h-4 mt-0.5 flex-shrink-0"></i>
                    <span>{successMessage}</span>
                </div>
            {/if}

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Email đăng nhập</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i data-feather="mail" class="w-4 h-4 text-slate-400"></i>
                        </div>
                        <input 
                            type="email" 
                            bind:value={email}
                            placeholder="Nhập email do Admin cấp..."
                            class="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            on:keydown={(e) => e.key === 'Enter' && (!isResetMode ? handleLogin() : handleResetPassword())}
                        />
                    </div>
                </div>

                {#if !isResetMode}
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="block text-sm font-bold text-slate-700">Mật khẩu</label>
                            <button on:click={toggleMode} class="text-xs font-semibold text-blue-600 hover:underline">Quên mật khẩu?</button>
                        </div>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i data-feather="lock" class="w-4 h-4 text-slate-400"></i>
                            </div>
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                bind:value={password}
                                placeholder="••••••••"
                                class="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                on:keydown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <!-- Nút hiển thị mật khẩu -->
                            <button 
                                type="button" 
                                on:click={togglePasswordVisibility}
                                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                <i data-feather={showPassword ? 'eye-off' : 'eye'} class="w-4 h-4"></i>
                            </button>
                        </div>
                        
                        <!-- Checkbox Nhớ mật khẩu -->
                        <div class="mt-3 flex items-center">
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    bind:checked={rememberMe} 
                                    class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <span class="text-sm font-semibold text-slate-600 group-hover:text-blue-600 transition-colors select-none">
                                    Nhớ tài khoản & mật khẩu
                                </span>
                            </label>
                        </div>
                    </div>
                {/if}

                <div class="pt-2">
                    {#if !isResetMode}
                        <button 
                            on:click={handleLogin}
                            disabled={isLoading}
                            class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {#if isLoading}
                                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Đang xác thực...</span>
                            {:else}
                                <i data-feather="log-in" class="w-5 h-5"></i>
                                <span>ĐĂNG NHẬP VÀO HỆ THỐNG</span>
                            {/if}
                        </button>
                    {:else}
                        <button 
                            on:click={handleResetPassword}
                            disabled={isLoading}
                            class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mb-3"
                        >
                            {#if isLoading}
                                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Đang gửi link...</span>
                            {:else}
                                <i data-feather="send" class="w-5 h-5"></i>
                                <span>GỬI LINK KHÔI PHỤC</span>
                            {/if}
                        </button>
                        <div class="text-center">
                            <button on:click={toggleMode} class="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">
                                Quay lại trang Đăng nhập
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Support Info Banner & QR Codes -->
        <div class="bg-slate-50 p-4 border-t border-slate-100 flex flex-col gap-4">
            <div class="flex items-start gap-3">
                <div class="p-2 bg-indigo-100 rounded-lg text-indigo-600 flex-shrink-0">
                    <i data-feather="shield" class="w-6 h-6"></i>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-700">Chưa có tài khoản?</h4>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                        Vui lòng liên hệ Admin qua Zalo hoặc Line để được tạo tài khoản.
                    </p>
                </div>
            </div>
            
            <!-- Khu vực 2 mã QR -->
            <div class="flex justify-center items-center gap-8 pt-3 border-t border-slate-200/60">
                <div class="text-center">
                    <!-- THAY ĐƯỜNG LINK ẢNH QR ZALO VÀO CHỖ SRC BÊN DƯỚI -->
                    <img
                        src="/images/qr-zalo.jpg"
                        alt="Zalo QR"
                        class="w-20 h-20 mx-auto rounded border border-slate-200 object-cover bg-white p-1 shadow-sm hover:scale-105 transition-transform" 
                    />
                    <span class="text-[11px] font-extrabold text-blue-600 mt-1.5 block tracking-wide">ZALO</span>
                </div>
                <div class="text-center">
                    <!-- THAY ĐƯỜNG LINK ẢNH QR LINE VÀO CHỖ SRC BÊN DƯỚI -->
                    <img
                        src="/images/qr-line.png"
                        alt="Line QR"
                        class="w-20 h-20 mx-auto rounded border border-slate-200 object-cover bg-white p-1 shadow-sm hover:scale-105 transition-transform" 
                    />
                    <span class="text-[11px] font-extrabold text-green-600 mt-1.5 block tracking-wide">LINE</span>
                </div>
            </div>
        </div>

    </div>
</div>

<style>
    .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>