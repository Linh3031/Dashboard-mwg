<script>
    import { modalState, luykeGoalSettings, realtimeGoalSettings, selectedWarehouse, kpiStore } from '../../stores.js';
    import { settingsService } from '../../services/settings.service.js';

    $: isOpen = $modalState.activeModal === 'quick-goal-modal';
    $: payload = $modalState.payload || {};
    
    let editValue = 0;

    $: if (isOpen && payload) {
        editValue = payload.currentValue || 0;
    }

    function close() {
        modalState.update(s => ({ ...s, activeModal: null, payload: null }));
    }

    function handleSave() {
        const targetWarehouse = $selectedWarehouse ? $selectedWarehouse : 'ALL';
        
        // [PHẪU THUẬT LOGIC]: Tự động rẽ nhánh lưu trữ tùy theo thẻ được bấm
        if (payload.type === 'realtime') {
            // LƯU CHO REALTIME
            // [SỬA LỖI]: Bắt buộc dùng phương thức .update() để thông báo cho toàn bộ hệ thống Svelte vẽ lại
            realtimeGoalSettings.update(store => {
                const oldSettings = store[targetWarehouse] || { goals: {}, timing: {} };
                store[targetWarehouse] = {
                    ...oldSettings,
                    goals: {
                        ...oldSettings.goals,
                        [payload.fieldId]: editValue
                    }
                };
                return store;
            });
            
            // Đồng bộ bản ghi mới nhất vừa cập nhật trong store lên Cloud
            settingsService.saveRealtimeGoalForWarehouse(targetWarehouse, $realtimeGoalSettings[targetWarehouse]);
        } else {
            // LƯU CHO LŨY KẾ
            let currentGoals = { ...($luykeGoalSettings[targetWarehouse] || {}) };
            currentGoals[payload.fieldId] = editValue;
            
            luykeGoalSettings.update(store => {
                store[targetWarehouse] = currentGoals;
                return store;
            });
            
            settingsService.saveLuykeGoalForWarehouse(targetWarehouse, currentGoals);

            kpiStore.update(store => ({
                ...store,
                globalSettings: {
                    ...store.globalSettings,
                    phanTramQD: Number(currentGoals.phanTramQD) || 80,
                    phanTramTC: Number(currentGoals.phanTramTC) || 20
                }
            }));
        }

        close();
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') handleSave();
        if (event.key === 'Escape') close();
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm transition-opacity" on:click={close} role="button" tabindex="0" on:keydown={handleKeydown}>
        
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100" on:click|stopPropagation role="dialog" tabindex="-1" on:keydown={handleKeydown}>
            
            <div class="px-6 py-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                <h3 class="text-lg font-bold text-indigo-800 flex items-center gap-2">
                    <i data-feather="edit-3" class="w-5 h-5"></i>
                    Cập nhật Mục tiêu
                </h3>
                <button on:click={close} class="text-gray-400 hover:text-red-500 transition-colors">
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="p-6">
                <label for="quick-goal-input" class="block text-sm font-semibold text-gray-700 mb-2">
                    {payload.title}
                </label>
                
                <div class="relative">
                    <input 
                        type="number" 
                        id="quick-goal-input"
                        class="w-full pl-4 pr-10 py-3 text-lg font-bold text-gray-900 bg-white border-2 border-indigo-200 rounded-xl focus:ring-0 focus:border-indigo-600 outline-none transition-colors"
                        bind:value={editValue}
                        autofocus
                    />
                    {#if payload.fieldId.includes('phanTram')}
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                    {/if}
                </div>

                <div class="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <i data-feather="info" class="w-3 h-3"></i>
                    Đang lưu cho kho: <span class="font-bold text-indigo-600">{$selectedWarehouse ? $selectedWarehouse : 'ALL (Toàn bộ)'}</span>
                    <span class="px-1.5 py-0.5 bg-gray-200 rounded text-[10px] ml-auto uppercase font-bold">{payload.type === 'realtime' ? 'Realtime' : 'Lũy kế'}</span>
                </div>
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button on:click={close} class="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                    Hủy
                </button>
                <button on:click={handleSave} class="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                    <i data-feather="save" class="w-4 h-4"></i> Lưu
                </button>
            </div>
        </div>
    </div>
{/if}