<script>
    import { onMount, afterUpdate } from 'svelte';
    import { competitionNameMappings } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    // [FIX] Xóa dòng import ui.js vì file này đã bị xóa
    // import { ui } from '../../ui.js'; 

    let mappingSearch = '';
    let debounceTimer;
    
    // Subscribe store
    $: mappings = $competitionNameMappings || {};

    $: filteredMappings = Object.entries(mappings).filter(([original, short]) => {
        const term = mappingSearch.toLowerCase();
        return original.toLowerCase().includes(term) || (short && short.toLowerCase().includes(term));
    });

    function handleMappingInput(originalName, event) {
        const newShortName = event.target.value;
        competitionNameMappings.update(current => {
            return { ...current, [originalName]: newShortName };
        });
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // Service đã có log/alert bên trong, không cần ui.showNotification ở đây nữa
            adminService.saveCompetitionNameMappings($competitionNameMappings);
        }, 1000);
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <details class="group"> 
        <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-teal-50 rounded-lg text-teal-600">
                    <i data-feather="git-merge"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-700 text-lg">Tên Rút Gọn Thi Đua</h3>
                    <p class="text-xs text-slate-500">Ánh xạ tên chương trình dài dòng thành tên ngắn gọn</p>
                </div>
            </div>
            <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                <i data-feather="chevron-down"></i>
            </span>
        </summary> 
        
        <div class="p-6 border-t border-slate-100 bg-slate-50/50"> 
            <div class="flex items-center gap-3 mb-4">
                <div class="relative flex-grow">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <i data-feather="search" class="w-4 h-4"></i>
                    </span>
                    <input 
                        type="text" 
                        class="w-full pl-10 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white" 
                        placeholder="Tìm kiếm tên gốc hoặc tên rút gọn..." 
                        bind:value={mappingSearch}
                    >
                </div>
                <div class="text-xs text-slate-500 italic bg-white px-3 py-2 rounded border border-slate-200">
                    <i data-feather="save" class="w-3 h-3 inline mr-1"></i> Tự động lưu
                </div>
            </div>

            <div class="max-h-96 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-inner"> 
                {#if filteredMappings.length === 0}
                    <div class="flex flex-col items-center justify-center p-8 text-slate-400">
                        <i data-feather="inbox" class="w-8 h-8 mb-2 opacity-50"></i>
                        <p class="text-sm">Chưa có dữ liệu thi đua hoặc không tìm thấy kết quả.</p>
                    </div>
                {:else}
                    <table class="min-w-full text-sm border-collapse">
                        <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="px-4 py-3 border-b text-center w-14 font-semibold">STT</th>
                                <th class="px-4 py-3 border-b text-left w-1/2 font-semibold">Tên Gốc (Từ dữ liệu)</th>
                                <th class="px-4 py-3 border-b text-left w-1/2 font-semibold">Tên Rút Gọn (Hiển thị)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            {#each filteredMappings as [originalName, shortName], index}
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-4 py-3 text-center text-slate-400 text-xs">{index + 1}</td>
                                    <td class="px-4 py-3 text-slate-700 text-xs leading-relaxed font-medium break-words">{originalName}</td>
                                    <td class="px-4 py-2">
                                        <input 
                                            type="text" 
                                            class="w-full p-2 border border-slate-200 rounded-md text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 focus:bg-white transition-all" 
                                            value={shortName || ''} 
                                            placeholder="Nhập tên hiển thị..."
                                            on:input={(e) => handleMappingInput(originalName, e)}
                                        >
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div> 
        </div>
    </details>
</div>