<script>
    import { onMount } from 'svelte';
    import { efficiencyConfig, warehouseCustomMetrics, selectedWarehouse, dailyTrendConfigs, modalState } from '../../../stores.js';
    import { datasyncService } from '../../../services/datasync.service.js';
    
    import DailyTrendPivotGrid from './DailyTrendPivotGrid.svelte';
    import AddDailyTrendModal from '../../modals/AddDailyTrendModal.svelte';

    let isLoading = true;
    let lastLoadedWarehouse = '';

    $: allMetricsConfig = [...($efficiencyConfig || []), ...($warehouseCustomMetrics || [])];
    $: visibleTables = ($dailyTrendConfigs || []).filter(t => t.visible);

    $: if ($selectedWarehouse) {
        handleWarehouseDataLoad($selectedWarehouse);
    }

    async function handleWarehouseDataLoad(kho) {
        if ($dailyTrendConfigs.length > 0 && lastLoadedWarehouse === kho) {
            isLoading = false;
            return;
        }
        await loadData(kho);
    }

    async function loadData(kho) {
        isLoading = true;
        try {
            const configs = await datasyncService.loadDailyTrendConfigs(kho);
            dailyTrendConfigs.set(configs || []);
            lastLoadedWarehouse = kho;
        } catch (error) {
            console.error("Lỗi tải bảng xu hướng:", error);
        } finally {
            isLoading = false;
        }
    }

    async function toggleTableVisibility(tableId) {
        const updated = $dailyTrendConfigs.map(t => t.id === tableId ? { ...t, visible: !t.visible } : t);
        dailyTrendConfigs.set(updated);
        try { await datasyncService.saveDailyTrendConfigs($selectedWarehouse, updated); } catch (e) { console.error(e); }
    }

    async function deleteTable(tableId) {
        if (!confirm('Bạn có chắc chắn muốn xóa bảng phân tích này?')) return;
        const updated = $dailyTrendConfigs.filter(t => t.id !== tableId);
        dailyTrendConfigs.set(updated);
        try { await datasyncService.saveDailyTrendConfigs($selectedWarehouse, updated); } catch (e) { console.error(e); }
    }

    function openAddModal() {
        modalState.update(s => ({ ...(s || {}), activeModal: 'add-daily-trend-modal', payload: null }));
    }

    function openEditModal(tableConfig) {
        modalState.update(s => ({ ...(s || {}), activeModal: 'add-daily-trend-modal', payload: tableConfig }));
    }
</script>

<div class="flex flex-col gap-5 min-h-[500px]">
    
    <div class="bg-gray-100 rounded-xl p-2 flex flex-wrap items-center gap-2 border border-gray-200">
        <span class="text-xs font-bold text-gray-500 uppercase px-2 flex items-center gap-1.5 border-r border-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            BẢNG HIỂN THỊ:
        </span>
        
        <div class="flex flex-wrap gap-2 flex-1">
            {#each $dailyTrendConfigs as table (table.id)}
                <button class="px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 {table.visible ? 'bg-white text-blue-700 border-blue-200 shadow-sm' : 'bg-transparent text-gray-400 border-gray-300 hover:bg-gray-200'}" on:click={() => toggleTableVisibility(table.id)}>
                    <span class="w-2 h-2 rounded-full {table.visible ? 'bg-blue-500' : 'bg-gray-400'}"></span>
                    {table.title} ({table.dateMode === 'custom' ? 'Tùy chỉnh' : `${table.rollingDays}d`})
                </button>
            {/each}
        </div>

        <button class="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center gap-1 transition-colors ml-auto border border-blue-200" on:click={openAddModal}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Tạo bảng mới
        </button>
    </div>

    {#if isLoading}
        <div class="flex items-center justify-center p-20 flex-col gap-4">
            <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p class="text-gray-500 font-medium">Đang tải cấu hình bảng...</p>
        </div>
    {:else if $dailyTrendConfigs.length === 0}
        <div class="flex flex-col items-center justify-center py-20 px-4 bg-gray-50 border border-gray-200 border-dashed rounded-xl">
            <div class="w-20 h-20 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
            </div>
            <h4 class="text-lg font-bold text-gray-800 mb-2">Chưa có Bảng xu hướng nào</h4>
            <button class="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 mt-4" on:click={openAddModal}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                Tạo bảng ngay
            </button>
        </div>
    {:else if visibleTables.length === 0}
        <div class="p-12 text-center bg-gray-50 rounded-xl border border-gray-200 border-dashed">
            <p class="text-gray-500 font-medium">Bạn đã ẩn tất cả các bảng. Vui lòng bật lại trên thanh công cụ.</p>
        </div>
    {:else}
        <div class="flex flex-col gap-6 pb-10">
            {#each visibleTables as tableConfig (tableConfig.id)}
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in relative group">
                    <div class="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                            <h3 class="font-bold text-gray-800 text-sm uppercase tracking-wide">{tableConfig.title}</h3>
                            <span class="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2">Cập nhật lúc {new Date().getHours()}:{new Date().getMinutes().toString().padStart(2, '0')}</span>
                        </div>
                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors" on:click={() => openEditModal(tableConfig)} title="Sửa bảng này">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" on:click={() => deleteTable(tableConfig.id)} title="Xóa bảng này">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                    
                    <DailyTrendPivotGrid {tableConfig} {allMetricsConfig} showSummaryColumn={tableConfig.showSummaryColumn !== false} />
                </div>
            {/each}
        </div>
    {/if}
 <AddDailyTrendModal /> 
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>