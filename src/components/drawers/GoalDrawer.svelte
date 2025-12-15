<script>
    import { onMount, afterUpdate } from 'svelte';
    import { 
        drawerState, 
        warehouseList, 
        luykeGoalSettings, 
        realtimeGoalSettings,
        modalState,
        localCompetitionConfigs, 
        selectedWarehouse,
        efficiencyConfig 
    } from '../../stores.js';
    import { settingsService } from '../../services/settings.service.js';
    import { datasyncService } from '../../services/datasync.service.js';
    import { adminService } from '../../services/admin.service.js';
    
    let activeTab = 'monthly';
    let localSelectedWarehouse = ''; 
    
    let currentLuykeGoals = {};
    let currentRealtimeGoals = { goals: {}, timing: {} };

    $: isOpen = $drawerState.activeDrawer === 'goal-drawer';

    // Tự động chọn kho
    $: if (isOpen && !localSelectedWarehouse) {
        localSelectedWarehouse = $selectedWarehouse || ($warehouseList.length > 0 ? $warehouseList[0] : '');
    }

    // Khi đổi kho, tải dữ liệu từ Cloud
    $: if (isOpen && localSelectedWarehouse) {
        loadGoals(localSelectedWarehouse);
    }

    async function loadGoals(kho) {
        await settingsService.loadGoalsFromCloud(kho);
        
        currentLuykeGoals = { ...($luykeGoalSettings[kho] || {}) };
        
        const rtSettings = $realtimeGoalSettings[kho] || { goals: {}, timing: {} };
        currentRealtimeGoals = {
            goals: { ...rtSettings.goals },
            timing: { ...rtSettings.timing }
        };
    }
    
    onMount(async () => {
        const configs = await adminService.loadEfficiencyConfig();
        efficiencyConfig.set(configs);
        if (typeof feather !== 'undefined') feather.replace();
    });

    afterUpdate(() => {
        if (typeof feather !== 'undefined') feather.replace();
    });

    function close() {
        drawerState.update(s => ({ ...s, activeDrawer: null }));
    }

    function switchTab(tab) {
        activeTab = tab;
    }

    function saveLuyke() {
        if (!localSelectedWarehouse) return;
        settingsService.saveLuykeGoalForWarehouse(localSelectedWarehouse, currentLuykeGoals);
    }

    function saveRealtime() {
        if (!localSelectedWarehouse) return;
        settingsService.saveRealtimeGoalForWarehouse(localSelectedWarehouse, currentRealtimeGoals);
    }

    // Các hàm quản lý thi đua
    function openCompetitionManager() {
        if (localSelectedWarehouse) selectedWarehouse.set(localSelectedWarehouse);
        modalState.update(s => ({ ...s, activeModal: 'user-competition-modal' }));
    }
    function editCompetition(index) {
        if (localSelectedWarehouse) selectedWarehouse.set(localSelectedWarehouse);
        modalState.update(s => ({ ...s, activeModal: 'user-competition-modal', editingIndex: index }));
    }
    async function deleteCompetition(index) {
        if (!confirm("Bạn có chắc chắn muốn xóa chương trình thi đua này?")) return;
        let newConfigs = [...$localCompetitionConfigs];
        newConfigs.splice(index, 1);
        localCompetitionConfigs.set(newConfigs);
        if (localSelectedWarehouse) {
            try { await datasyncService.saveCompetitionConfigs(localSelectedWarehouse, newConfigs); } catch(e) { console.error(e); }
        }
    }

    const percentageInputs = [
        { id: 'phanTramQD', label: '% Quy đổi' },
        { id: 'phanTramTC', label: '% Trả chậm' }
    ];
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-black/40 z-40 transition-opacity" on:click={close} role="button" tabindex="0"></div>
{/if}

<div class="fixed top-0 left-0 h-full bg-white shadow-2xl z-50 p-6 overflow-y-auto w-[500px] max-w-[95vw] transition-transform duration-300 ease-in-out transform {isOpen ? 'translate-x-0' : '-translate-x-full'}">
    
    <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-gray-800">Thiết lập mục tiêu</h3>
        <button class="text-gray-500 hover:text-gray-800 text-3xl leading-none" on:click={close}>&times;</button>
    </div>

    <div class="border-b border-gray-200 mb-6 flex space-x-6">
        <button class="pb-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'monthly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => switchTab('monthly')}>
            Mục tiêu Tháng (Lũy kế)
        </button>
        <button class="pb-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'daily' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => switchTab('daily')}>
            Mục tiêu Ngày (Realtime)
        </button>
    </div>

    <div class="space-y-8">
        <div>
            <label for="goal-warehouse" class="block text-sm font-bold text-gray-700 mb-1">Thiết lập cho kho</label>
            <select id="goal-warehouse" class="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-blue-700" bind:value={localSelectedWarehouse}>
                {#if $warehouseList.length === 0}
                    <option value="">Vui lòng tải file DSNV...</option>
                {:else}
                    {#each $warehouseList as kho}
                        <option value={kho}>{kho}</option>
                    {/each}
                {/if}
            </select>
        </div>

        {#if activeTab === 'monthly'}
            <div class="space-y-5 animate-fade-in">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="luyke-dtt" class="block text-sm font-medium text-gray-700">Target DT Thực</label>
                        <input type="number" id="luyke-dtt" class="luyke-goal-input mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" bind:value={currentLuykeGoals.doanhThuThuc} on:input={saveLuyke}>
                    </div>
                    <div>
                        <label for="luyke-dtqd" class="block text-sm font-medium text-gray-700">Target DT QĐ</label>
                        <input type="number" id="luyke-dtqd" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" bind:value={currentLuykeGoals.doanhThuQD} on:input={saveLuyke}>
                    </div>
                </div>

                <details class="group border rounded-lg overflow-hidden" open>
                    <summary class="p-3 text-sm font-bold cursor-pointer bg-gray-50 hover:bg-gray-100 flex justify-between items-center select-none">
                         Mục tiêu khai thác (%)
                        <span class="transform group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div class="p-4 bg-white border-t grid grid-cols-2 gap-4">
                        {#each percentageInputs as input}
                            <div>
                                <label for="luyke-{input.id}" class="block text-sm font-medium text-gray-700">{input.label}</label>
                                <input type="number" id="luyke-{input.id}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" bind:value={currentLuykeGoals[input.id]} on:input={saveLuyke}>
                            </div>
                        {/each}
                        
                        {#each $efficiencyConfig as item}
                            <div>
                                <label for="goal-{item.id}" class="block text-sm font-medium text-gray-700 truncate" title={item.label}>
                                    {item.label} (MT: {item.target}%)
                                </label>
                                <input 
                                    type="number" 
                                    id="goal-{item.id}" 
                                    class="mt-1 block w-full p-2 border border-blue-200 bg-blue-50 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder={item.target} 
                                    bind:value={currentLuykeGoals[item.id]} 
                                    on:input={saveLuyke}
                                >
                            </div>
                        {/each}
                    </div>
                </details>
            </div>
        {/if}

        {#if activeTab === 'daily'}
            <div class="space-y-5 animate-fade-in">
                <div class="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label for="rt-open" class="block text-sm font-medium text-gray-700 mb-1">Giờ mở cửa</label>
                        <input type="time" id="rt-open" class="p-2 border border-gray-300 rounded-md shadow-sm w-full" bind:value={currentRealtimeGoals.timing['rt-open-hour']} on:input={saveRealtime}>
                    </div>
                    <div>
                        <label for="rt-close" class="block text-sm font-medium text-gray-700 mb-1">Giờ đóng cửa</label>
                        <input type="time" id="rt-close" class="p-2 border border-gray-300 rounded-md shadow-sm w-full" bind:value={currentRealtimeGoals.timing['rt-close-hour']} on:input={saveRealtime}>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="rt-dtt" class="block text-sm font-medium text-gray-700">DT Thực (triệu)</label>
                        <input type="number" id="rt-dtt" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" bind:value={currentRealtimeGoals.goals.doanhThuThuc} on:input={saveRealtime}>
                    </div>
                    <div>
                        <label for="rt-dtqd" class="block text-sm font-medium text-gray-700">DT QĐ (triệu)</label>
                        <input type="number" id="rt-dtqd" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" bind:value={currentRealtimeGoals.goals.doanhThuQD} on:input={saveRealtime}>
                    </div>
                </div>
                
                <details class="group border rounded-lg overflow-hidden" open>
                    <summary class="p-3 text-sm font-bold cursor-pointer bg-gray-50 hover:bg-gray-100 flex justify-between items-center select-none">
                         Mục tiêu tỷ lệ Realtime (%)
                        <span class="transform group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div class="p-4 bg-white border-t grid grid-cols-2 gap-4">
                        {#each percentageInputs as input}
                            <div>
                                <label for="rt-{input.id}" class="block text-sm font-medium text-gray-700">{input.label}</label>
                                <input type="number" id="rt-{input.id}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" bind:value={currentRealtimeGoals.goals[input.id]} on:input={saveRealtime}>
                            </div>
                        {/each}
                         {#each $efficiencyConfig as item}
                            <div>
                                <label for="rt-goal-{item.id}" class="block text-sm font-medium text-gray-700 truncate" title={item.label}>{item.label}</label>
                                <input type="number" id="rt-goal-{item.id}" class="mt-1 block w-full p-2 border border-blue-200 bg-blue-50 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder={item.target} bind:value={currentRealtimeGoals.goals[item.id]} on:input={saveRealtime}>
                            </div>
                        {/each}
                    </div>
                </details>
            </div>
        {/if}

        <div class="border-t pt-6 space-y-4">
            <div class="flex justify-between items-center">
                <h4 class="text-lg font-bold text-gray-800">Quản lý Chương trình Thi đua</h4>
                <button on:click={openCompetitionManager} class="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-1 shadow-sm"><i data-feather="plus-circle" class="w-4 h-4"></i> Tạo mới</button>
            </div>
            
            <div class="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar pb-2">
                {#if $localCompetitionConfigs.length === 0}
                    <div class="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p class="text-gray-500 text-sm italic">Chưa có chương trình nào.</p>
                    </div>
                {:else}
                    {#each $localCompetitionConfigs as config, index}
                        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group hover:border-blue-300 hover:shadow-md transition-all">
                            
                            <div class="flex justify-between items-start mb-2 pr-14">
                                <h4 class="text-base font-bold text-gray-800 leading-tight">{config.name}</h4>
                            </div>
                            
                            <div class="flex flex-wrap gap-2 mb-2">
                                <span class="text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border {config.type === 'doanhthu' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}">
                                    {config.type === 'doanhthu' ? 'Doanh thu' : 'Số lượng'}
                                </span>
                                {#if config.excludeApple}
                                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-600 border border-red-100">No Apple</span>
                                {/if}
                            </div>

                            <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 grid grid-cols-1 gap-1">
                                <div class="flex items-start gap-1">
                                    <span class="font-bold min-w-[35px]">Hãng:</span>
                                    <span class="text-blue-700 font-medium">{config.brands.join(', ')}</span>
                                </div>
                                <div class="flex items-start gap-1">
                                    <span class="font-bold min-w-[35px]">Nhóm:</span>
                                    <span class="text-gray-800">
                                        {#if config.groups.length > 0}
                                            {config.groups.join(', ')}
                                        {:else}
                                            <span class="italic text-gray-400">Tất cả</span>
                                        {/if}
                                    </span>
                                </div>
                            </div>

                            <div class="absolute top-3 right-3 flex gap-1">
                                <button on:click={() => editCompetition(index)} class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><i data-feather="edit-2" class="w-4 h-4"></i></button>
                                <button on:click={() => deleteCompetition(index)} class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>