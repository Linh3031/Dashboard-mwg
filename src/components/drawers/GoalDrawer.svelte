<script>
    import { 
        drawerState, 
        warehouseList, 
        luykeGoalSettings, 
        realtimeGoalSettings,
        globalSpecialPrograms,
        globalCompetitionConfigs
    } from '../../stores.js';
    import { settingsService } from '../../modules/settings.service.js';
    
    // State nội bộ của component
    let activeTab = 'monthly'; // 'monthly' | 'daily'
    let selectedWarehouse = '';
    
    // Dữ liệu form cục bộ (để bind vào input trước khi lưu)
    let currentLuykeGoals = {};
    let currentRealtimeGoals = { goals: {}, timing: {} };

    // Reactive: Kiểm tra xem drawer này có đang active không
    $: isOpen = $drawerState.activeDrawer === 'goal-drawer';

    // Reactive: Tự động chọn kho đầu tiên nếu danh sách kho có dữ liệu và chưa chọn kho nào
    $: if (isOpen && !selectedWarehouse && $warehouseList.length > 0) {
        selectedWarehouse = $warehouseList[0];
    }

    // Reactive: Khi đổi kho hoặc store tổng thay đổi, cập nhật dữ liệu form cục bộ
    // Điều này đảm bảo input luôn hiển thị đúng dữ liệu của kho đang chọn
    $: if (selectedWarehouse) {
        // Load Luyke Settings
        currentLuykeGoals = { ...($luykeGoalSettings[selectedWarehouse] || {}) };
        // Load Realtime Settings
        const rtSettings = $realtimeGoalSettings[selectedWarehouse] || { goals: {}, timing: {} };
        currentRealtimeGoals = {
            goals: { ...rtSettings.goals },
            timing: { ...rtSettings.timing }
        };
    }

    function close() {
        drawerState.update(s => ({ ...s, activeDrawer: null }));
    }

    function switchTab(tab) {
        activeTab = tab;
    }

    // Hàm lưu Lũy kế (Gọi service để update store & localStorage)
    function saveLuyke() {
        if (!selectedWarehouse) return;
        settingsService.saveLuykeGoalForWarehouse(selectedWarehouse, currentLuykeGoals);
    }

    // Hàm lưu Realtime (Gọi service để update store & localStorage)
    function saveRealtime() {
        if (!selectedWarehouse) return;
        settingsService.saveRealtimeGoalForWarehouse(selectedWarehouse, currentRealtimeGoals);
    }

    // Helper: Danh sách các trường input phần trăm để render vòng lặp
    const percentageInputs = [
        { id: 'phanTramQD', label: '% Quy đổi' },
        { id: 'phanTramTC', label: '% Trả chậm' },
        { id: 'phanTramGiaDung', label: '% Gia dụng' },
        { id: 'phanTramMLN', label: '% MLN' },
        { id: 'phanTramPhuKien', label: '% Phụ kiện' },
        { id: 'phanTramBaoHiem', label: '% Bảo hiểm' },
        { id: 'phanTramSim', label: '% Sim' },
        { id: 'phanTramVAS', label: '% VAS' },
    ];
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 bg-black/40 z-40 transition-opacity"
        on:click={close}
        role="button"
        tabindex="0"
    ></div>
{/if}

<div 
    class="fixed top-0 left-0 h-full bg-white shadow-2xl z-50 p-6 overflow-y-auto w-[450px] max-w-[90vw] transition-transform duration-300 ease-in-out transform {isOpen ? 'translate-x-0' : '-translate-x-full'}"
>
    <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-gray-800">Thiết lập mục tiêu</h3>
        <button 
            class="text-gray-500 hover:text-gray-800 text-3xl leading-none"
            on:click={close}
        >&times;</button>
    </div>

    <div class="border-b border-gray-200 mb-4 flex space-x-6">
        <button 
            class="pb-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'monthly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => switchTab('monthly')}
        >
            Mục tiêu Tháng (Lũy kế)
        </button>
        <button 
            class="pb-2 border-b-2 font-medium text-sm transition-colors {activeTab === 'daily' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => switchTab('daily')}
        >
            Mục tiêu Ngày (Realtime)
        </button>
    </div>

    <div class="space-y-6">
        <div>
            <label for="goal-warehouse" class="block text-sm font-medium text-gray-700 mb-1">Thiết lập cho kho</label>
            <select 
                id="goal-warehouse" 
                class="w-full p-2 border rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                bind:value={selectedWarehouse}
            >
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
            <div class="space-y-4 animate-fade-in">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="luyke-dtt" class="block text-sm font-medium text-gray-700">Target DT Thực</label>
                        <input 
                            type="number" id="luyke-dtt" 
                            class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            bind:value={currentLuykeGoals.doanhThuThuc}
                            on:input={saveLuyke}
                        >
                    </div>
                    <div>
                        <label for="luyke-dtqd" class="block text-sm font-medium text-gray-700">Target DT QĐ</label>
                        <input 
                            type="number" id="luyke-dtqd" 
                            class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            bind:value={currentLuykeGoals.doanhThuQD}
                            on:input={saveLuyke}
                        >
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
                                <input 
                                    type="number" id="luyke-{input.id}" 
                                    class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    bind:value={currentLuykeGoals[input.id]}
                                    on:input={saveLuyke}
                                >
                            </div>
                        {/each}
                    </div>
                </details>
            </div>
        {/if}

        {#if activeTab === 'daily'}
            <div class="space-y-4 animate-fade-in">
                <div class="grid grid-cols-2 gap-4 items-end">
                    <div class="flex items-center gap-2">
                        <label for="rt-open" class="font-medium text-gray-700 text-sm whitespace-nowrap">Mở cửa:</label>
                        <input 
                            type="time" id="rt-open" 
                            class="p-1 border border-gray-300 rounded-md shadow-sm w-full"
                            bind:value={currentRealtimeGoals.timing['rt-open-hour']}
                            on:input={saveRealtime}
                        >
                    </div>
                    <div class="flex items-center gap-2">
                        <label for="rt-close" class="font-medium text-gray-700 text-sm whitespace-nowrap">Đóng cửa:</label>
                        <input 
                            type="time" id="rt-close" 
                            class="p-1 border border-gray-300 rounded-md shadow-sm w-full"
                            bind:value={currentRealtimeGoals.timing['rt-close-hour']}
                            on:input={saveRealtime}
                        >
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="rt-dtt" class="block text-sm font-medium text-gray-700">DT Thực (triệu)</label>
                        <input 
                            type="number" id="rt-dtt" 
                            class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            bind:value={currentRealtimeGoals.goals.doanhThuThuc}
                            on:input={saveRealtime}
                        >
                    </div>
                    <div>
                        <label for="rt-dtqd" class="block text-sm font-medium text-gray-700">DT QĐ (triệu)</label>
                        <input 
                            type="number" id="rt-dtqd" 
                            class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            bind:value={currentRealtimeGoals.goals.doanhThuQD}
                            on:input={saveRealtime}
                        >
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
                                <label for="rt-{input.id}" class="block text-sm font-medium text-gray-700">{input.label}</label>
                                <input 
                                    type="number" id="rt-{input.id}" 
                                    class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    bind:value={currentRealtimeGoals.goals[input.id]}
                                    on:input={saveRealtime}
                                >
                            </div>
                        {/each}
                    </div>
                </details>
            </div>
        {/if}

        <div class="border-t pt-6 mt-6 space-y-6">
            <div>
                <h4 class="text-md font-bold text-gray-800 mb-3">Quản lý SP Đặc Quyền (Toàn hệ thống)</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    {#if $globalSpecialPrograms.length === 0}
                        <p class="text-xs text-center text-gray-500 italic">Chưa có chương trình nào.</p>
                    {:else}
                        {#each $globalSpecialPrograms as program}
                            <div class="p-2 border rounded bg-gray-50 text-sm">
                                <span class="font-bold block">{program.name}</span>
                                <span class="text-xs text-gray-500">Nhóm: {program.groups.join(', ')}</span>
                            </div>
                        {/each}
                    {/if}
                </div>
                <button class="mt-2 w-full text-xs py-2 border border-dashed rounded hover:bg-gray-50 text-gray-500 cursor-not-allowed" disabled>
                    + Thêm/Sửa (Vui lòng dùng Admin Panel)
                </button>
            </div>

            <div>
                <h4 class="text-md font-bold text-gray-800 mb-3">Quản lý Chương trình Thi đua</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    {#if $globalCompetitionConfigs.length === 0}
                        <p class="text-xs text-center text-gray-500 italic">Chưa có chương trình nào.</p>
                    {:else}
                        {#each $globalCompetitionConfigs as config}
                            <div class="p-2 border rounded bg-gray-50 text-sm">
                                <span class="font-bold block">{config.name}</span>
                                <span class="text-xs text-gray-500">Hãng: {config.brands.join(', ')}</span>
                            </div>
                        {/each}
                    {/if}
                </div>
                <button class="mt-2 w-full text-xs py-2 border border-dashed rounded hover:bg-gray-50 text-gray-500 cursor-not-allowed" disabled>
                    + Thêm/Sửa (Vui lòng dùng Admin Panel)
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    /* Simple fade-in animation cho tab content */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
</style>