<script>
    import { onMount } from 'svelte';
    import { customRevenueTables, modalState } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    
    // Load bảng hệ thống khi mount
    onMount(async () => {
        const tables = await adminService.loadSystemRevenueTables();
        // Merge với local để hiển thị đủ (nhưng ở màn hình Admin này ta ưu tiên hiển thị System Table để quản lý)
        // Tuy nhiên, để nhất quán store, ta update store chính
        customRevenueTables.update(current => {
            // Lọc bỏ system cũ, thêm system mới từ cloud
            const userTables = current.filter(t => !t.isSystem);
            return [...tables, ...userTables];
        });
    });

    $: systemTables = $customRevenueTables.filter(t => t.isSystem);

    function openAddModal() {
        // Mặc định tạo bảng System khi ở trong trang Admin
        modalState.update(s => ({ ...s, activeModal: 'add-revenue-table-modal', payload: { isSystem: true } }));
    }

    function editTable(table) {
        modalState.update(s => ({ ...s, activeModal: 'add-revenue-table-modal', payload: table }));
    }

    async function deleteTable(id) {
        if(!confirm("Bạn có chắc muốn xóa bảng hệ thống này? Hành động này sẽ ảnh hưởng đến toàn bộ người dùng.")) return;
        
        const newTables = $customRevenueTables.filter(t => t.id !== id);
        customRevenueTables.set(newTables);
        
        // Lưu lại danh sách mới lên Cloud
        await adminService.saveSystemRevenueTables(newTables);
    }
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <div class="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
        <div class="flex items-center gap-4">
            <div class="p-2.5 bg-indigo-50 rounded-lg text-indigo-600 shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
                <div class="flex items-center gap-3">
                    <h3 class="font-bold text-slate-800 text-lg">Cấu hình Bảng Doanh thu (Hệ thống)</h3>
                    <span class="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide border border-indigo-200">Global</span>
                </div>
                <p class="text-sm text-slate-500 mt-0.5">Tạo các bảng mẫu hiển thị ở tab "SKNV - DT Ngành hàng" và "Realtime"</p>
            </div>
        </div>
        <button on:click={openAddModal} class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm flex items-center gap-2 text-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            Tạo bảng mới
        </button>
    </div>
    
    <div class="p-6 bg-slate-50/50">
        {#if systemTables.length === 0}
            <div class="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
                <p class="text-slate-500 italic">Chưa có bảng hệ thống nào.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each systemTables as table}
                    <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col hover:border-indigo-300 transition-colors group">
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
                                {#each table.subColumns as col}
                                    <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200">
                                        {col.header} 
                                        <span class="text-slate-400 text-[10px] ml-1">
                                            ({[col.metrics.sl?'SL':'', col.metrics.dt?'DT':'', col.metrics.dtqd?'QĐ':''].filter(Boolean).join('/')})
                                        </span>
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