<script>
    import { modalState, isAdmin, activeTab } from '../../stores.js';
    import { config } from '../../config.js';
    import { tick } from 'svelte';

    let password = '';
    let showError = false;
    let passwordInput;

    $: isOpen = $modalState.activeModal === 'admin-modal';

    $: if (isOpen) {
        resetForm();
        focusInput();
    }

    async function focusInput() {
        await tick();
        if (passwordInput) passwordInput.focus();
    }

    function resetForm() {
        password = '';
        showError = false;
    }

    function close() {
        modalState.update(s => ({ ...s, activeModal: null }));
    }

    function submit() {
        // --- MÁY DÒ LỖI (DEBUGGING) ---
        console.log("🔍 [DEBUG ADMIN LOGIN]");
        console.log("👉 Bạn đã nhập:", `'${password}'`); // Dấu '' giúp phát hiện khoảng trắng thừa
        console.log("👉 Mật khẩu gốc (Config):", `'${config?.ADMIN_PASSWORD}'`);
        
        if (!config) {
            console.error("❌ LỖI: Không tìm thấy biến 'config'. Kiểm tra lại file src/config.js và đường dẫn import.");
            alert("Lỗi hệ thống: Không tải được cấu hình.");
            return;
        }
        // ------------------------------

        if (password === config.ADMIN_PASSWORD) {
            console.log("✅ Đăng nhập thành công!");
            isAdmin.set(true);
            activeTab.set('declaration-section');
            close();
        } else {
            console.warn("❌ Sai mật khẩu!");
            showError = true;
            password = '';
            focusInput();
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            submit();
        } else if (event.key === 'Escape') {
            close();
        }
    }
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1050] transition-opacity"
        on:click={close}
    >
        <div 
            class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-4 transform transition-all scale-100"
            on:click|stopPropagation
        >
            <h3 class="text-lg font-bold mb-4 text-gray-900">Truy cập khu vực Admin</h3>
            
            <p class="text-sm text-gray-600 mb-4">
                Vui lòng nhập mật khẩu để xem và chỉnh sửa phần Khai báo.
            </p>

            <div class="mb-4">
                <input 
                    bind:this={passwordInput}
                    type="password" 
                    class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors {showError ? 'border-red-500 bg-red-50' : 'border-gray-300'}" 
                    placeholder="Mật khẩu..."
                    bind:value={password}
                    on:keydown={handleKeydown}
                >
                {#if showError}
                    <p class="text-red-500 text-sm mt-2 animate-pulse">
                        Mật khẩu không đúng. Vui lòng thử lại.
                    </p>
                {/if}
            </div>

            <div class="flex justify-end space-x-3">
                <button 
                    class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                    on:click={close}
                >
                    Hủy
                </button>
                <button 
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                    on:click={submit}
                >
                    Xác nhận
                </button>
            </div>
        </div>
    </div>
{/if}