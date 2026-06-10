<script>
    import { modalState, luykeGoalSettings, realtimeGoalSettings, selectedWarehouse } from '../../stores.js';
    import { datasyncService } from '../../services/datasync.service.js';
    import { afterUpdate } from 'svelte';

    $: isOpen = $modalState.activeModal === 'quick-goal-modal';
    $: payload = $modalState.payload || {};
    
    let editValue = 0;
    let inputEl;

    // Tự động lấy giá trị và bôi đen toàn bộ text khi modal mở ra
    $: if (isOpen && payload) {
        editValue = payload.currentValue || 0;
        setTimeout(() => {
            if (inputEl) {
                inputEl.focus();
                inputEl.select(); // Quét đen số cũ để gõ đè ngay
            }
        }, 60);
    }

    function close() {
        modalState.update(s => ({ ...s, activeModal: null, payload: null }));
    }

    async function handleSave() {
        // Ưu tiên mã kho từ payload khi đang ở chế độ Cụm
        const targetWarehouse = String(payload.warehouse || ($selectedWarehouse ? $selectedWarehouse : 'ALL')).trim();
        const numericValue = parseFloat(editValue) || 0;
        
        if (payload.type === 'realtime') {
            // [PHẪU THUẬT NGUYÊN TỬ]: Tránh Reference Trap của Svelte bằng cách Clone Object mới 100%
            realtimeGoalSettings.update(store => {
                const currentStore = store || {};
                const warehouseSettings = currentStore[targetWarehouse] || { goals: {}, timing: {} };
                const currentGoals = warehouseSettings.goals || {};
                
                return {
                    ...currentStore,
                    [targetWarehouse]: {
                        ...warehouseSettings,
                        goals: {
                            ...currentGoals,
                            [payload.fieldId]: numericValue
                        }
                    }
                };
            });
            
            // Lưu trực tiếp xuống Firebase
            try {
                await datasyncService.saveGoalSettings(targetWarehouse, 'realtime', { [payload.fieldId]: numericValue });
            } catch (err) {
                console.error("Lỗi đồng bộ Firebase:", err);
            }

        } else {
            // LƯU CHO LŨY KẾ
            luykeGoalSettings.update(store => {
                const currentStore = store || {};
                const warehouseSettings = currentStore[targetWarehouse] || { goals: {}, timing: {} };
                const currentGoals = warehouseSettings.goals || {};
                
                return {
                    ...currentStore,
                    [targetWarehouse]: {
                        ...warehouseSettings,
                        goals: {
                            ...currentGoals,
                            [payload.fieldId]: numericValue
                        }
                    }
                };
            });
            
            try {
                await datasyncService.saveGoalSettings(targetWarehouse, 'luyke', { [payload.fieldId]: numericValue });
            } catch (err) {
                console.error("Lỗi đồng bộ Firebase:", err);
            }
        }
        close();
    }

    afterUpdate(() => {
        if (typeof feather !== 'undefined') feather.replace();
    });
</script>

{#if isOpen}
<div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-fade-in" on:click={close}>
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-scale-up" on:click|stopPropagation>
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
            <h3 class="font-bold text-gray-800 flex items-center gap-2 text-base">
                <i data-feather="edit-3" class="w-4 h-4 text-indigo-600"></i>
                {payload.title || 'Cập nhật mục tiêu'}
            </h3>
            <button on:click={close} class="text-gray-400 hover:text-gray-600 transition-colors">
                <i data-feather="x" class="w-5 h-5"></i>
            </button>
        </div>
        
        <div class="p-6">
            <div class="relative mt-1 rounded-md shadow-sm">
                <input 
                    type="number" 
                    step="any"
                    bind:this={inputEl}
                    bind:value={editValue}
                    on:focus={(e) => e.target.select()}
                    class="block w-full rounded-lg border-gray-300 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border outline-none transition-colors font-bold text-lg text-gray-800"
                    placeholder="Nhập giá trị..."
                />
                {#if payload.fieldId && payload.fieldId.includes('phanTram')}
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</span>
                {/if}
            </div>

            <div class="mt-4 text-xs text-gray-500 flex items-center gap-1 bg-slate-50 p-2 rounded border border-slate-100">
                <i data-feather="info" class="w-3.5 h-3.5 text-blue-500"></i>
                <span>Đang áp dụng cho:</span>
                <span class="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    {payload.warehouse && payload.warehouse !== 'ALL' ? 'Siêu thị ' + payload.warehouse : 'ALL (Toàn bộ cụm)'}
                </span>
                <span class="px-1.5 py-0.5 bg-gray-200 rounded text-[10px] ml-auto uppercase font-black tracking-wider text-gray-600">{payload.type === 'realtime' ? 'Realtime' : 'Lũy kế'}</span>
            </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button on:click={close} class="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                Hủy
            </button>
            <button on:click={handleSave} class="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
                Lưu lại
            </button>
        </div>
    </div>
</div>
{/if}

<style>
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>