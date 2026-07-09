<script>
    import { onMount } from 'svelte';
    import { customPerformanceTables, isAdmin, modalState, selectedWarehouse } from '../../../stores.js';
    import { adminService } from '../../../services/admin.service.js';
    import { datasyncService } from '../../../services/datasync.service.js';
    
    import DynamicPerformanceTable from './DynamicPerformanceTable.svelte';
    export let reportData = [];

    // [FIX 1] Mặc định là đang tải để tránh hiện thông báo lỗi ngay khi mở
    let isLoading = true;
    let lastLoadedWarehouse = '';

    // --- LOGIC LOAD DỮ LIỆU ---
    $: if ($selectedWarehouse) {
        handleWarehouseDataLoad($selectedWarehouse);
    }

    async function handleWarehouseDataLoad(kho) {
        // CASE 1: Store First - Nếu đã có data đúng kho, không tải lại
        if ($customPerformanceTables.length > 0 && lastLoadedWarehouse === kho) {
             console.log(`[PerformanceView] Dùng Cache Store cho kho: ${kho}`);
             isLoading = false; 
             return;
        }
        // CASE 2: Fetch
        await loadData(kho);
    }

    async function loadData(kho) {
        isLoading = true;
        try {
            // 1. Load System Tables (Admin)
            const sysTables = await adminService.loadSystemPerformanceTables();
            // 2. Load Personal Tables (User)
            const perTables = await datasyncService.loadPersonalPerformanceTables(kho);
            // 3. Load trạng thái ẩn/hiện local
            const hiddenIds = JSON.parse(localStorage.getItem('hiddenPerformanceTableIds') || '[]');
            // 4. Merge
            const merged = [
                ...sysTables.map(t => ({ ...t, isSystem: true, isVisible: !hiddenIds.includes(t.id) })),
                ...perTables.map(t => ({ ...t, isSystem: false, isVisible: true }))
            ];
            customPerformanceTables.set(merged);
            lastLoadedWarehouse = kho;

        } catch (e) {
            console.error("[PerformanceView] Lỗi tải dữ liệu:", e);
        } finally {
            isLoading = false;
        }
    }

    // --- VISIBILITY LOGIC ---
    function toggleTableVisibility(tableId) {
        customPerformanceTables.update(items => {
            const newItems = items.map(t => t.id === tableId ? { ...t, isVisible: !t.isVisible } : t);
            
            // Save preference for System tables
            const hiddenIds = newItems.filter(t => t.isSystem && !t.isVisible).map(t => t.id);
            localStorage.setItem('hiddenPerformanceTableIds', JSON.stringify(hiddenIds));
            
            return newItems;
        });
    }

    // --- SURGICAL LOGIC: Bật/Tắt Tất Cả ---
    $: isAllVisible = $customPerformanceTables.length > 0 && $customPerformanceTables.every(t => t.isVisible);

    function toggleAllVisibility() {
        const targetState = !isAllVisible;
        customPerformanceTables.update(items => {
            const newItems = items.map(t => ({ ...t, isVisible: targetState }));
            
            const hiddenIds = newItems.filter(t => t.isSystem && !t.isVisible).map(t => t.id);
            localStorage.setItem('hiddenPerformanceTableIds', JSON.stringify(hiddenIds));
            
            return newItems;
        });
    }

    // --- CRUD ACTIONS ---
    function openAddModal() {
        if (!$selectedWarehouse) return alert("Vui lòng chọn Kho trước.");
        // Mở modal tạo mới (User context)
        modalState.update(s => ({ ...s, activeModal: 'add-performance-table-modal', payload: null, isSystem: false }));
    }

    function editTable(table) {
        // Check quyền
        if (table.isSystem && !$isAdmin) return alert("Bạn không có quyền sửa bảng hệ thống.");
        modalState.update(s => ({ 
            ...s, 
            activeModal: 'add-performance-table-modal', 
            payload: table,
            isSystem: table.isSystem 
        }));
    }

    async function deleteTable(id) {
        const table = $customPerformanceTables.find(t => t.id === id);
        if (!table) return;

        if (table.isSystem) {
            if (!$isAdmin) return alert("Bạn không có quyền xóa bảng hệ thống.");
            if (!confirm("Xóa vĩnh viễn bảng hệ thống này?")) return;
            const newTables = $customPerformanceTables.filter(t => t.id !== id && t.isSystem);
            await adminService.saveSystemPerformanceTables(newTables);
        } else {
            if (!confirm("Xóa bảng cá nhân này?")) return;
            const newTables = $customPerformanceTables.filter(t => t.id !== id && !t.isSystem);
            await datasyncService.savePersonalPerformanceTables($selectedWarehouse, newTables);
        }
        // Reload local store
        customPerformanceTables.update(items => items.filter(t => t.id !== id));
    }

    $: visibleTables = $customPerformanceTables.filter(t => t.isVisible);
    const colors = ['blue', 'green', 'orange', 'purple', 'teal'];
</script>

{#if isLoading}
    <div class="flex flex-col items-center justify-center p-12 text-teal-600">
        <svg class="animate-spin h-8 w-8 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-sm font-semibold">Đang tải bảng hiệu quả...</p>
    </div>
{:else}

    {#if $customPerformanceTables.length > 0}
        <div class="mb-6 flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div class="text-xs font-bold uppercase text-gray-500 mr-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                Bảng hiển thị:
            </div>
            
            <!-- SURGICAL FIX: Nút Hiện/Ẩn Tất Cả -->
            <button 
                class="px-2 py-1 mr-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-bold border border-gray-300 transition-colors flex items-center gap-1"
                on:click={toggleAllVisibility}
                title={isAllVisible ? "Ẩn tất cả bảng" : "Hiện tất cả bảng"}
            >
                {#if isAllVisible}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    Ẩn tất cả
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Hiện tất cả
                {/if}
            </button>

            {#each $customPerformanceTables as table}
                <button 
                    class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 select-none
                    {table.isVisible ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}
                    {table.isSystem ? 'border-dashed' : ''}"
                    on:click={() => toggleTableVisibility(table.id)}
                    title={table.isSystem ? "Bảng hệ thống" : "Bảng cá nhân"}
                >
                    {#if table.isSystem}<span class="text-[10px] opacity-70">🌐</span>{/if}
                    {table.title}
                </button>
            {/each}

            <button 
                class="px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors ml-auto flex items-center gap-1"
                on:click={openAddModal}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                Tạo bảng mới
            </button>
        </div>
    {/if}

    {#if $customPerformanceTables.length === 0}
        <div class="p-12 text-center bg-white rounded-xl border border-blue-100 shadow-sm flex flex-col items-center">
            <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h4 class="text-lg font-bold text-gray-800 mb-2">Chưa có Bảng hiệu quả nào</h4>
            <p class="text-gray-500 mb-6 max-w-md">Bạn chưa tạo bảng theo dõi nào.</p>
            <button class="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2" on:click={openAddModal}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                Tạo bảng ngay
            </button>
        </div>
    {:else if visibleTables.length === 0}
        <div class="p-12 text-center bg-gray-50 rounded-xl border border-gray-200 border-dashed flex flex-col items-center">
             <p class="text-gray-500 font-medium mb-3">Bạn đã ẩn tất cả các bảng. Vui lòng bật lại trên thanh công cụ.</p>
             <button class="px-4 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200" on:click={toggleAllVisibility}>
                 Hiện tất cả các bảng
             </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
            {#each visibleTables as table, index (table.id)}
                <div data-capture-group="performance-table" data-capture-filename={table.title}>
                    <DynamicPerformanceTable 
                        config={table} 
                        {reportData} 
                        colorTheme={colors[index % colors.length]}
                        on:edit={() => editTable(table)}
                        on:delete={() => deleteTable(table.id)}
                    />
                </div>
            {/each}
        </div>
    {/if}

{/if}