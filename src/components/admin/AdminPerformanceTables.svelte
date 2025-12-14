<script>
    import { onMount } from 'svelte';
    import { customPerformanceTables, modalState } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    
    // Load bảng hệ thống khi mount
    onMount(async () => {
        const tables = await adminService.loadSystemPerformanceTables();
        // Cập nhật store hiển thị
        customPerformanceTables.update(current => {
            // Giữ lại bảng cá nhân (nếu có), thay thế bảng hệ thống cũ bằng bảng mới tải về
            const userTables = current.filter(t => !t.isSystem);
            // Gán cờ isSystem cho chắc chắn
            const sysTables = tables.map(t => ({ ...t, isSystem: true }));
            return [...sysTables, ...userTables];
        });
    });

    // Chỉ hiển thị bảng hệ thống trong trang Admin
    $: systemTables = $customPerformanceTables.filter(t => t.isSystem);

    function openAddModal() {
        // Mở modal với cờ isSystem = true (Admin tạo)
        modalState.update(s => ({ 
            ...s, 
            activeModal: 'add-performance-table-modal', 
            payload: null,
            isSystem: true 
        }));
    }

    function editTable(table) {
        modalState.update(s => ({ 
            ...s, 
            activeModal: 'add-performance-table-modal', 
            payload: table,
            isSystem: true 
        }));
    }

    async function deleteTable(id) {
        if(!confirm("Bạn có chắc muốn xóa bảng hiệu quả hệ thống này? Hành động này sẽ ảnh hưởng đến toàn bộ người dùng.")) return;
        
        const newTables = $customPerformanceTables.filter(t => t.id !== id);
        // Cập nhật Store local
        customPerformanceTables.set(newTables);
        
        // Lọc lấy danh sách system mới để lưu Cloud
        const systemTablesToSave = newTables.filter(t => t.isSystem);
        await adminService.saveSystemPerformanceTables(systemTablesToSave);
    }
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <div class="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
        <div class="flex items-center gap-4">
            <div class="p-2.5 bg-teal-50 rounded-lg text-teal-600 shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
                <div class="flex items-center gap-3">
                    <h3 class="font-bold text-slate-800 text-lg">Cấu hình Bảng Hiệu quả (Hệ thống)</h3>
                    <span class="bg-teal-100 text-teal-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide border border-teal-200">Global</span>
                </div>
                <p class="text-sm text-slate-500 mt-0.5">Tạo bảng mẫu (Tỷ lệ %, Doanh thu, SL) hiển thị ở tab "Hiệu quả NV"</p>
            </div>
        </div>
        <button on:click={openAddModal} class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold shadow-sm flex items-center gap-2 text-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            Tạo bảng mới
        </button>
    </div>
    
    <div class="p-6 bg-slate-50/50">
        {#if systemTables.length === 0}
            <div class="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
                <p class="text-slate-500 italic">Chưa có bảng hiệu quả hệ thống nào.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each systemTables as table}
                    <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col hover:border-teal-300 transition-colors group">
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-bold text-slate-800 text-lg">{table.title}</h4>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Sửa" on:click={() => editTable(table)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Xóa" on:click={() => deleteTable(table.id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="mt-auto">
                            <p class="text-xs text-slate-500 font-semibold uppercase mb-2">Cấu trúc:</p>
                            <div class="flex flex-wrap gap-2">
                                {#each table.columns as col}
                                    <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200 flex items-center gap-1">
                                        {col.header} 
                                        {#if col.type === 'PERCENT'}
                                            <span class="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold">%</span>
                                        {:else if col.type === 'SL'}
                                            <span class="text-[9px] bg-gray-200 text-gray-600 px-1 rounded font-bold">SL</span>
                                        {:else}
                                            <span class="text-[9px] bg-blue-100 text-blue-600 px-1 rounded font-bold">DT</span>
                                        {/if}
                                    </span>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>