<script>
    import { createEventDispatcher } from 'svelte';
    
    export let allDimensions = [];
    export let activeIds = [];
    export let filterOptions = {}; 
    export let currentFilters = {};

    const dispatch = createEventDispatcher();
    let openFilterId = null;
    let filterSearchQuery = '';

    $: getDisplayOptions = (dimId) => {
        const options = filterOptions[dimId] || [];
        const current = currentFilters[dimId];
        const query = filterSearchQuery.toLowerCase();
        return options.filter(opt => opt.toLowerCase().includes(query)).sort((a, b) => {
            const aSel = current === undefined || current.includes(a); 
            const bSel = current === undefined || current.includes(b);
            if (aSel && !bSel) return -1; 
            if (!aSel && bSel) return 1; 
            return a.localeCompare(b);
        });
    };

    function toggleFilterDropdown(dimId) { if (openFilterId === dimId) openFilterId = null; else { openFilterId = dimId; filterSearchQuery = ''; } }
    
    function toggleFilterItem(dimId, value) {
        const allOptions = filterOptions[dimId] || [];
        let current = currentFilters[dimId];
        if (current === undefined) current = allOptions.filter(x => x !== value);
        else {
            if (current.includes(value)) current = current.filter(x => x !== value);
            else current = [...current, value];
        }
        if (current.length === allOptions.length) dispatch('filterChange', { key: dimId, selected: undefined });
        else dispatch('filterChange', { key: dimId, selected: current });
    }

    function handleDimensionToggle(dimId) {
        let newIds = [...activeIds];
        if (newIds.includes(dimId)) newIds = newIds.filter(id => id !== dimId); else newIds.push(dimId);
        dispatch('configChange', newIds);
    }
</script>

<div class="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200 luyke-filter-section">
    <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold text-gray-700 mr-2">Cấu hình & Lọc:</span>
        {#each allDimensions as dim (dim.id)}
            {@const activeIndex = activeIds.indexOf(dim.id)}
            {@const isActive = activeIndex > -1}
            {@const hasFilter = currentFilters[dim.id] !== undefined}
        
            <div class="relative group">
                <div class="flex items-center rounded-md border {isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} hover:shadow-md transition-all">
                    <button class="px-3 py-1.5 text-sm flex items-center gap-2 {isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}" on:click={() => handleDimensionToggle(dim.id)}>
                        {#if isActive}<span class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-sm">{activeIndex + 1}</span>
                        {:else}<span class="w-4 h-4 rounded border border-gray-400"></span>{/if}
                        {dim.label}
                    </button>
                    <button class="px-2 py-1.5 border-l border-gray-200 hover:bg-gray-100 {hasFilter ? 'text-blue-600' : 'text-gray-400'}" on:click|stopPropagation={() => toggleFilterDropdown(dim.id)}>
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    </button>
                </div>
                {#if openFilterId === dim.id}
                    <div class="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3">
                         <div class="flex justify-between items-center mb-3">
                             <span class="text-xs font-bold text-gray-500 uppercase">Lọc {dim.label}</span>
                             <div class="flex items-center gap-3">
                                 <button on:click={() => dispatch('filterChange', { key: dim.id, selected: [] })} class="text-[11px] font-bold text-orange-600 hover:text-orange-800">Bỏ chọn hết</button>
                                 {#if hasFilter}
                                     <button on:click={() => dispatch('filterChange', { key: dim.id, selected: undefined })} class="text-[11px] font-bold text-red-500 hover:text-red-700">Xóa lọc</button>
                                 {/if}
                             </div>
                         </div>
                         <input type="text" bind:value={filterSearchQuery} placeholder="Tìm kiếm..." class="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-2 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"/>
                         <div class="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                            {#each getDisplayOptions(dim.id) as option (option)}
                                {@const isSelected = currentFilters[dim.id] === undefined || currentFilters[dim.id].includes(option)}
                                <label class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors" on:click|preventDefault={() => toggleFilterItem(dim.id, option)}>
                                    <input type="checkbox" checked={isSelected} class="rounded border-gray-300 text-blue-600 pointer-events-none" tabindex="-1"/>
                                    <span class="text-sm text-gray-700 truncate {isSelected ? 'font-bold text-blue-800' : ''}">{option}</span>
                                </label>
                            {/each}
                         </div>
                         <div class="mt-2 pt-2 border-t border-slate-100 text-right">
                             <button on:click={() => openFilterId = null} class="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-md">Đóng</button>
                         </div>
                    </div>
                    <div class="fixed inset-0 z-40" on:click={() => openFilterId = null}></div>
                {/if}
            </div>
          {/each}
    </div>
</div>