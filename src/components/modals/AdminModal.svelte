<script>
    import { modalState, activeTab } from '../../stores.js';
    import { authService } from '../../services/auth.service.js';
    import { tick } from 'svelte';

    let password = '';
    let showError = false;
    let passwordInput;
    let isBackdropMouseDown = false; // [FIX] Biến cờ kiểm tra

    // Reactive: Kiểm tra modal
    $: isOpen = $modalState.activeModal === 'admin-modal';

    // Reactive: Khi mở modal, reset form và focus input
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
        const isValid = authService.checkAdminPassword(password);
        if (isValid) {
            activeTab.set('declaration-section');
            close();
        } else {
            showError = true;
            password = '';
            focusInput();
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') submit();
        else if (event.key === 'Escape') close();
    }

    // [FIX] Logic xử lý click backdrop an toàn
    function handleBackdropMouseDown(e) {
        if (e.target === e.currentTarget) {
            isBackdropMouseDown = true;
        }
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget && isBackdropMouseDown) {
            close();
        }
        isBackdropMouseDown = false; // Reset sau mỗi lần click
    }
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1050] transition-opacity backdrop-blur-sm"
        on:mousedown={handleBackdropMouseDown}
        on:click={handleBackdropClick}
        role="button"
        tabindex="0"
    >
        <div 
            class="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm mx-4 transform transition-all scale-100"
            on:click|stopPropagation
            on:mousedown|stopPropagation={() => isBackdropMouseDown = false} 
        >
            <div class="mb-4">
                <h3 class="text-lg font-bold text-gray-900">Truy cập khu vực Admin</h3>
            </div>
            
            <p class="text-sm text-gray-600 mb-4">
                 Vui lòng nhập mật khẩu để xem và chỉnh sửa phần Khai báo.
            </p>

            <div class="mb-6">
                <input 
                    bind:this={passwordInput}
                    type="password" 
                    class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors 
                           {showError ? 'border-red-500 bg-red-50' : 'border-gray-300'}" 
                    placeholder="Nhập mật khẩu..."
                    bind:value={password}
                    on:keydown={handleKeydown}
                >
                {#if showError}
                    <p class="text-red-500 text-sm mt-2 animate-pulse flex items-center">
                         <span class="mr-1">🚫</span> Mật khẩu không đúng. Vui lòng thử lại.
                    </p>
                {/if}
            </div>

            <div class="flex justify-end space-x-3 border-t pt-4">
                <button 
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    on:click={close}
                >
                    Hủy
                </button>
                <button 
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-sm"
                    on:click={submit}
                >
                    Xác nhận
                </button>
            </div>
        </div>
    </div>
{/if}