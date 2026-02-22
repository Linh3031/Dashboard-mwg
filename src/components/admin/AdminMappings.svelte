<script>
    import { afterUpdate } from 'svelte';
    import { competitionNameMappings, luykeNameMappings } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let mappingSearch = '';
    let isSaving = false;
    let activeTab = 'nhanvien'; // 'nhanvien' hoặc 'sieuthi'
    
    // Dynamic Subscribe theo Tab
    $: mappings = activeTab === 'nhanvien' ? ($competitionNameMappings || {}) : ($luykeNameMappings || {});

    $: mappingList = Object.entries(mappings).map(([original, short], index) => ({
        originalName: original,
        shortName: short || original,
        index: index + 1
    }));

    $: filteredList = mappingList.filter(item => {
        const term = mappingSearch.toLowerCase();
        return item.originalName.toLowerCase().includes(term) || 
               item.shortName.toLowerCase().includes(term);
    });

    function handleMappingInput(originalName, event) {
        const newShortName = event.target.value;
        if (activeTab === 'nhanvien') {
            competitionNameMappings.update(current => ({ ...current, [originalName]: newShortName }));
        } else {
            luykeNameMappings.update(current => ({ ...current, [originalName]: newShortName }));
        }
    }

    async function saveAllMappings() {
        isSaving = true;
        try {
            if (activeTab === 'nhanvien') {
                await adminService.saveCompetitionNameMappings($competitionNameMappings);
            } else {
                await adminService.saveLuykeNameMappings($luykeNameMappings);
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu mapping.");
        } finally {
            isSaving = false;
        }
    }

    async function clearAllMappings() {
        const tabName = activeTab === 'nhanvien' ? 'NHÂN VIÊN' : 'SIÊU THỊ';
        if (confirm(`⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ TÊN RÚT GỌN THI ĐUA [${tabName}]?\n\nHành động này dùng để dọn rác khi sang tháng mới. Sau khi xóa, bạn cần dán lại dữ liệu để hệ thống tạo danh sách mới.`)) {
            isSaving = true;
            try {
                if (activeTab === 'nhanvien') {
                    competitionNameMappings.set({});
                    await adminService.saveCompetitionNameMappings({});
                } else {
                    luykeNameMappings.set({});
                    await adminService.saveLuykeNameMappings({});
                }
            } catch (e) {
                console.error(e);
                alert("Có lỗi xảy ra khi xóa dữ liệu trên Cloud.");
            } finally {
                isSaving = false;
            }
        }
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <details class="group" open> 
        <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none border-b border-slate-100">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-teal-50 rounded-lg text-teal-600">
                    <i data-feather="git-merge"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-700 text-lg">Tên Rút Gọn Thi Đua</h3>
                    <p class="text-xs text-slate-500">Quản lý tên hiển thị ngắn gọn cho các bảng báo cáo</p>
                </div>
            </div>
            <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                <i data-feather="chevron-down"></i>
            </span>
        </summary> 
        
        <div class="bg-slate-50/50"> 
            <div class="flex border-b border-slate-200 px-6 pt-4 gap-6">
                <button 
                    class="pb-3 text-sm font-bold transition-colors {activeTab === 'nhanvien' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}"
                    on:click={() => { activeTab = 'nhanvien'; mappingSearch = ''; }}
                >
                    <i data-feather="users" class="w-4 h-4 inline-block mr-1"></i>
                    Thi Đua Nhân Viên
                </button>
                <button 
                    class="pb-3 text-sm font-bold transition-colors {activeTab === 'sieuthi' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}"
                    on:click={() => { activeTab = 'sieuthi'; mappingSearch = ''; }}
                >
                    <i data-feather="home" class="w-4 h-4 inline-block mr-1"></i>
                    Thi Đua Siêu Thị
                </button>
            </div>

            <div class="p-6">
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                    <div class="relative flex-grow w-full sm:w-auto">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <i data-feather="search" class="w-4 h-4"></i>
                        </span>
                        <input 
                            type="text" 
                            class="w-full pl-10 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white" 
                            placeholder="Tìm kiếm tên thi đua..." 
                            bind:value={mappingSearch}
                        >
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <button 
                            class="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                            on:click={clearAllMappings}
                            disabled={isSaving}
                            title="Dọn dẹp danh sách khi sang tháng mới"
                        >
                            <span><i data-feather="trash-2" class="w-4 h-4"></i></span> Dọn Tháng Cũ
                        </button>

                        <button 
                            class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
                            on:click={saveAllMappings}
                            disabled={isSaving}
                        >
                            {#if isSaving}
                                <span class="animate-spin">↻</span> Đang lưu...
                            {:else}
                                <span><i data-feather="save" class="w-4 h-4"></i></span> Lưu Thay Đổi
                            {/if}
                        </button>
                    </div>
                </div>

                <div class="border border-slate-200 rounded-lg bg-white shadow-inner overflow-hidden">
                    <div class="max-h-[500px] overflow-y-auto custom-scrollbar"> 
                        {#if filteredList.length === 0}
                            <div class="flex flex-col items-center justify-center p-12 text-slate-400">
                                <i data-feather="inbox" class="w-10 h-10 mb-3 opacity-50"></i>
                                <p class="text-sm font-medium">Chưa có dữ liệu thi đua.</p>
                                <p class="text-xs mt-1">
                                    {activeTab === 'nhanvien' ? 'Dán dữ liệu "Thi đua nhân viên"' : 'Dán dữ liệu "Lũy kế"'} ở tab Cập nhật để hệ thống trích xuất tên.
                                </p>
                            </div>
                        {:else}
                            <table class="min-w-full text-sm border-collapse">
                                <thead class="text-xs text-slate-600 uppercase bg-slate-100 font-bold sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th class="px-4 py-3 border-b text-center w-16">STT</th>
                                        <th class="px-4 py-3 border-b text-left w-1/2">Tên Gốc (Từ dữ liệu dán)</th>
                                        <th class="px-4 py-3 border-b text-left w-1/2 text-teal-700">Tên Rút Gọn (Hiển thị)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    {#each filteredList as item}
                                        <tr class="hover:bg-slate-50 transition-colors group">
                                            <td class="px-4 py-3 text-center text-slate-400 text-xs font-mono">{item.index}</td>
                                            <td class="px-4 py-3 text-slate-700 text-xs leading-relaxed font-medium break-words select-all">
                                                {item.originalName}
                                            </td>
                                            <td class="px-4 py-2">
                                                <input 
                                                    type="text" 
                                                    class="w-full p-2 border border-slate-200 rounded-md text-sm font-semibold text-teal-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 focus:bg-white transition-all placeholder-slate-300" 
                                                    value={item.shortName} 
                                                    on:input={(e) => handleMappingInput(item.originalName, e)}
                                                    placeholder={item.originalName}
                                                >
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        {/if}
                    </div> 
                </div>
            </div>
        </div>
    </details>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>