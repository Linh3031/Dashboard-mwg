<script>
    import { modalState } from '../../stores.js';
    import { authService } from '../../services/auth.service.js';
    import { ui } from '../../ui.js'; // Dùng để hiển thị notification
    
    // State nội bộ
    let email = '';
    let errorMsg = '';
    let isSubmitting = false;

    // Reactive: Kiểm tra modal có đang mở không
    $: isOpen = $modalState.activeModal === 'login-modal';

    function close() {
        // Login Modal thường không cho phép đóng nếu chưa login (bắt buộc),
        // nhưng ta vẫn cần hàm này để logic được đầy đủ.
        // Trong thực tế, overlay sẽ có 'cursor-not-allowed' và không gọi close().
        modalState.update(s => ({ ...s, activeModal: null }));
    }

    async function handleSubmit() {
        errorMsg = '';
        isSubmitting = true;

        try {
            const success = await authService.loginUser(email);
            
            if (success) {
                ui.showNotification(`Chào mừng ${email}!`, 'success');
                close();
            } else {
                errorMsg = 'Vui lòng nhập một địa chỉ email hợp lệ.';
            }
        } catch (e) {
            console.error(e);
            errorMsg = 'Có lỗi xảy ra. Vui lòng thử lại.';
        } finally {
            isSubmitting = false;
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    }
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 bg-gray-900 bg-opacity-60 z-[1100] flex items-center justify-center cursor-not-allowed backdrop-blur-sm"
    >
        <div 
            class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-[420px] mx-4 transform transition-all scale-100 cursor-default"
            on:click|stopPropagation
        >
            <div class="mb-6 border-b border-gray-100 pb-4">
                <h3 class="text-xl font-bold text-gray-800">Chào mừng đến với Công cụ Phân tích</h3>
            </div>
            
            <div class="space-y-4">
                <p class="text-gray-600 text-sm leading-relaxed">
                    Vui lòng nhập email của bạn để bắt đầu sử dụng. Email này sẽ được dùng để định danh và đồng bộ dữ liệu trong tương lai.
                </p>
                
                <div>
                    <label for="login-email-input" class="block text-sm font-medium text-gray-700 mb-1">Email của bạn</label>
                    <input 
                        type="email" 
                        id="login-email-input" 
                        class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors
                               {errorMsg ? 'border-red-500 bg-red-50' : 'border-gray-300'}"
                        placeholder="your.email@example.com"
                        bind:value={email}
                        on:keydown={handleKeydown}
                        disabled={isSubmitting}
                    >
                    {#if errorMsg}
                        <p class="text-red-500 text-sm mt-2 flex items-center animate-pulse">
                            <span class="mr-1">⚠️</span> {errorMsg}
                        </p>
                    {/if}
                </div>

                <button 
                    id="login-submit-btn" 
                    class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    on:click={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận & Tiếp tục'}
                </button>
            </div>
        </div>
    </div>
{/if}