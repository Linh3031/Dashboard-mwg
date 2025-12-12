<script>
    import { onMount } from 'svelte';
    import { efficiencyConfig, modalState } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    
    // Load config khi mount
    onMount(async () => {
        const configs = await adminService.loadEfficiencyConfig();
        efficiencyConfig.set(configs);
    });

    function openAddModal() {
        // Mở modal thêm chỉ số (Tận dụng modal đã có)
        modalState.update(s => ({ ...s, activeModal: 'add-efficiency-modal', payload: null }));
    }

    function editItem(item) {
        modalState.update(s => ({ ...s, activeModal: 'add-efficiency-modal', payload: item }));
    }

    async function deleteItem(id) {
        if (!confirm("Bạn có chắc muốn xóa chỉ số hệ thống này? Nó sẽ biến mất khỏi bảng của tất cả người dùng.")) return;
        
        const newConfig = $efficiencyConfig.filter(i => i.id !== id);
        efficiencyConfig.set(newConfig);
        await adminService.saveEfficiencyConfig(newConfig);
    }

    // Hàm này được gọi khi Modal lưu thành công (thông qua sự kiện dispatch hoặc store update)
    // Ở đây ta lắng nghe sự kiện từ App.svelte (nơi đặt modal) hoặc update trực tiếp store trong modal
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <div class="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
        <div class="flex items-center gap-4">
            <div class="p-2.5 bg-orange-50 rounded-lg text-orange-600 shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
                <div class="flex items-center gap-3">
                    <h3 class="font-bold text-slate-800 text-lg">Cấu hình Bảng Hiệu quả (Hệ thống)</h3>
                    <span class="bg-orange-100 text-orange-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide border border-orange-200">Global</span>
                </div>
                <p class="text-sm text-slate-500 mt-0.5">Các chỉ số này sẽ hiển thị mặc định cho toàn bộ nhân viên/siêu thị</p>
            </div>
        </div>
        <button on:click={openAddModal} class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-sm flex items-center gap-2 text-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            Thêm chỉ số
        </button>
    </div>
    
    <div class="p-6 bg-slate-50/50">
        {#if $efficiencyConfig.length === 0}
            <div class="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
                <p class="text-slate-500 italic">Chưa có chỉ số hệ thống nào.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each $efficiencyConfig as item}
                    <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col hover:border-orange-300 transition-colors group relative">
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-bold text-slate-800">{item.label}</h4>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-white/90 p-1 rounded border border-gray-100 shadow-sm">
                                <button class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Sửa" on:click={() => editItem(item)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Xóa" on:click={() => deleteItem(item.id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="text-xs text-slate-500 space-y-1 mt-auto">
                            <p><strong>Loại:</strong> {item.type === 'SL' ? 'Số lượng' : (item.type === 'DTQD' ? 'Doanh thu QĐ' : 'Doanh thu Thực')}</p>
                            <p><strong>Mục tiêu:</strong> {item.target}%</p>
                            <p class="truncate" title={item.groupA.join(', ')}><strong>Tử số:</strong> {item.groupA.join(', ')}</p>
                            <p class="truncate" title={item.groupB.join(', ')}><strong>Mẫu số:</strong> {item.groupB.join(', ')}</p>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>