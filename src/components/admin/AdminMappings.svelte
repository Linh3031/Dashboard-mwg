<script>
    import { afterUpdate } from 'svelte';
    import { competitionNameMappings } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let mappingSearch = '';
    let isSaving = false;
    let debounceTimer;
    
    // Subscribe store
    $: mappings = $competitionNameMappings || {};

    // Chuyển object mappings thành array để render bảng
    $: mappingList = Object.entries(mappings).map(([original, short], index) => ({
        originalName: original,
        shortName: short || original, // Mặc định hiển thị tên gốc nếu chưa có tên rút gọn
        index: index + 1
    }));

    // Lọc danh sách
    $: filteredList = mappingList.filter(item => {
        const term = mappingSearch.toLowerCase();
        return item.originalName.toLowerCase().includes(term) || 
               item.shortName.toLowerCase().includes(term);
    });

    function handleMappingInput(originalName, event) {
        const newShortName = event.target.value;
        
        // Cập nhật store local ngay lập tức để UI phản hồi nhanh
        competitionNameMappings.update(current => {
            return { ...current, [originalName]: newShortName };
        });
    }

    async function saveAllMappings() {
        isSaving = true;
        try {
            await adminService.saveCompetitionNameMappings($competitionNameMappings);
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu mapping.");
        } finally {
            isSaving = false;
        }
    }

    // [THÊM MỚI] Hàm dọn dẹp dữ liệu tháng cũ
    async function clearAllMappings() {
        if (confirm("⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ TÊN RÚT GỌN THI ĐUA?\n\nHành động này dùng để dọn rác khi sang tháng mới. Sau khi xóa, bạn cần ra tab Cập Nhật Dữ Liệu dán lại data Thi đua để hệ thống tạo danh sách mới.")) {
            competitionNameMappings.set({});
            isSaving = true;
            try {
                await adminService.saveCompetitionNameMappings({});
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
        <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-teal-50 rounded-lg text-teal-600">
                    <i data-feather="git-merge"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-700 text-lg">Tên Rút Gọn Thi Đua</h3>
                    <p class="text-xs text-slate-500">Đặt tên ngắn gọn cho các cột thi đua trên bảng báo cáo</p>
                </div>
            </div>
            <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                <i data-feather="chevron-down"></i>
            </span>
        </summary> 
        
        <div class="p-6 border-t border-slate-100 bg-slate-50/50"> 
            
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
                        <i data-feather="trash-2" class="w-4 h-4"></i> Dọn Tháng Cũ
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
                            <p class="text-xs mt-1">Vui lòng dán dữ liệu "Thi đua nhân viên" ở tab Cập nhật dữ liệu để hệ thống tự động trích xuất tên.</p>
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
            
            <p class="text-xs text-slate-500 mt-3 italic flex items-center gap-1">
                <i data-feather="info" class="w-3 h-3"></i>
                Mẹo: Tên rút gọn mặc định sẽ giống tên gốc. Bạn hãy sửa lại cho ngắn gọn để bảng hiển thị đẹp hơn.
            </p>
        </div>
    </details>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>