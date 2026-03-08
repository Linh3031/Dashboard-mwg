<script>
    import { createEventDispatcher } from 'svelte';
    import TableRowRecursive from '../../realtime/brand/TableRowRecursive.svelte';
    
    export let data = [];
    export let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
    export let allDimensions = [];
    export let activeIds = [];
    export let filterOptions = {}; 
    export let currentFilters = {};
    export let isVelocityMode = false;
    export let expandedRows = new Set();
    export let hasInventoryData = false;

    export let isCompareMode = false;
    export let compareSortType = 'diff';

    export let sortKey = 'revenue'; 
    export let sortDirection = 'desc';

    const dispatch = createEventDispatcher();
    let openFilterId = null;
    let filterSearchQuery = '';

    $: fmtQty = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: isVelocityMode ? 1 : 0, minimumFractionDigits: isVelocityMode ? 1 : 0 }).format(n || 0);
    $: fmtRev = (n) => {
        if (!n) return '0';
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: isVelocityMode ? 1 : 0, minimumFractionDigits: isVelocityMode ? 1 : 0 }).format(n / 1000000);
    };
    const fmtPct = (n) => (n || 0).toFixed(1) + '%';
    const LEVEL_COLORS = ['text-red-700 font-bold', 'text-blue-700 font-semibold', 'text-purple-700 font-medium', 'text-emerald-700', 'text-orange-700'];
    function handleSort(key) {
        if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        else { sortKey = key; sortDirection = 'desc'; }
    }

    function sortTree(nodes, key, dir, sortType) {
        if (!nodes || nodes.length === 0) return [];
        const sorted = [...nodes].sort((a, b) => {
            let valA, valB;
            if (key === 'percentQD') {
                valA = a.revenue ? (a.revenueQD / a.revenue) : 0;
                valB = b.revenue ? (b.revenueQD / b.revenue) : 0;
            } else {
              if (isCompareMode && !isVelocityMode) {
                    const currA = a[key] || 0; const prevA = a[`${key}CK`] || 0;
                    const currB = b[key] || 0; const prevB = b[`${key}CK`] || 0;
                    
                    if (sortType === 'current') { valA = currA; valB = currB; } 
                    else if (sortType === 'diff') { valA = currA - prevA; valB = currB - prevB; } 
                    else if (sortType === 'percent') { valA = prevA ? (currA - prevA) / prevA : (currA > 0 ? 999999 : 0); valB = prevB ? (currB - prevB) / prevB : (currB > 0 ? 999999 : 0); }
                } else { valA = a[key] || 0; valB = b[key] || 0; }
            }
            return dir === 'asc' ? valA - valB : valB - valA;
        });
        return sorted.map(node => {
            if (node.children && node.children.length > 0) return { ...node, children: sortTree(node.children, key, dir, sortType) };
            return node;
        });
    }

    $: sortedData = sortTree(data, sortKey, sortDirection, compareSortType);
    function toggleRow(id) {
        if (expandedRows.has(id)) expandedRows.delete(id); else expandedRows.add(id);
        expandedRows = expandedRows;
    }
    function expandAll(nodes) {
        if (!nodes) return;
        nodes.forEach(node => { expandedRows.add(node.id); if (node.children) expandAll(node.children); });
        expandedRows = expandedRows;
    }
    function collapseAll() { expandedRows = new Set(); }
    function toggleFilterDropdown(dimId) { if (openFilterId === dimId) openFilterId = null; else { openFilterId = dimId; filterSearchQuery = ''; } }
    
    // [GENESIS FIX]: Xử lý Checkbox nghiêm ngặt với giá trị undefined
    function toggleFilterItem(dimId, value) {
        const allOptions = filterOptions[dimId] || [];
        let current = currentFilters[dimId];
        
        if (current === undefined) {
            current = allOptions.filter(x => x !== value);
        } else {
            if (current.includes(value)) current = current.filter(x => x !== value);
            else current = [...current, value];
        }

        if (current.length === allOptions.length) {
            dispatch('filterChange', { key: dimId, selected: undefined });
        } else {
            dispatch('filterChange', { key: dimId, selected: current });
        }
    }
    
    function clearFilter(dimId) { dispatch('filterChange', { key: dimId, selected: undefined }); }
    
    $: getDisplayOptions = (dimId) => {
        const options = filterOptions[dimId] || [];
        const current = currentFilters[dimId];
        const query = filterSearchQuery.toLowerCase();
        return options.filter(opt => opt.toLowerCase().includes(query)).sort((a, b) => {
            const aSel = current === undefined || current.includes(a); 
            const bSel = current === undefined || current.includes(b);
            if (aSel && !bSel) return -1; if (!aSel && bSel) return 1; return a.localeCompare(b);
        });
    };
    function handleDimensionToggle(dimId) {
        let newIds = [...activeIds];
        if (newIds.includes(dimId)) newIds = newIds.filter(id => id !== dimId); else newIds.push(dimId);
        dispatch('configChange', newIds);
    }

    $: iconClass = (key) => sortKey === key ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-500';
    const getDiff = (current, prev) => (current || 0) - (prev || 0);
    const getPct = (current, prev) => {
        if (!prev) return current > 0 ? '+100%' : '0%';
        const diff = current - prev; const pct = (diff / prev) * 100;
        return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
    };
    const getDiffColor = (diff) => diff >= 0 ? 'text-blue-600' : 'text-red-500';
    const getDiffIcon = (diff) => diff >= 0 ? '▲' : '▼';
    $: sortLabel = compareSortType === 'current' ? 'Số hiện tại' : (compareSortType === 'diff' ? 'Chênh lệch' : 'Tỷ lệ %');
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
                    <div class="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3 animate-fade-in-down">
                         <div class="flex justify-between items-center mb-2"><span class="text-xs font-bold text-gray-500 uppercase">Lọc {dim.label}</span>{#if hasFilter}<button on:click={() => clearFilter(dim.id)} class="text-xs text-red-500 hover:underline">Xóa lọc</button>{/if}</div>
  
                         <input type="text" bind:value={filterSearchQuery} placeholder="Tìm kiếm..." class="w-full text-sm border border-gray-300 rounded px-2 py-1 mb-2 focus:outline-none focus:border-blue-500"/>
                         <div class="max-h-48 overflow-y-auto space-y-1">
                            {#each getDisplayOptions(dim.id) as option (option)}
                                {@const isSelected = currentFilters[dim.id] === undefined || currentFilters[dim.id].includes(option)}
                                <label 
                                    class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer" 
                                    on:click|preventDefault={() => toggleFilterItem(dim.id, option)}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected} 
                                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none" 
                                        tabindex="-1"
                                    />
                                    <span class="text-sm text-gray-700 truncate {isSelected ? 'font-semibold' : ''}">{option}</span>
                                </label>
                            {/each}
                            {#if getDisplayOptions(dim.id).length === 0}<div class="text-xs text-gray-400 text-center py-2">Không tìm thấy dữ liệu</div>{/if}
                         </div>
                         <div class="mt-2 pt-2 border-t text-right"><button on:click={() => openFilterId = null} class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Đóng</button></div>
                    </div>
                    <div class="fixed inset-0 z-40" on:click={() => openFilterId = null}></div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200 luyke-table-wrapper">
    <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
            <thead class="bg-gray-100 text-gray-700 uppercase font-bold sticky top-0 z-10">
                <tr>
                    <th class="py-3 px-4 border-b border-r {isVelocityMode ? 'w-[300px] max-w-[300px]' : 'w-auto min-w-[200px]'}">
                        <div class="flex items-center gap-2">
                             <span>Danh mục</span>
                             <div class="flex gap-1 ml-auto">
                               <button on:click={() => expandAll(data)} class="p-1 hover:bg-gray-200 rounded" title="Mở rộng"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg></button>
                                <button on:click={collapseAll} class="p-1 hover:bg-gray-200 rounded" title="Thu gọn"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg></button>
                            </div>
                        </div>
                    </th>
                 
                    <th class="py-3 px-4 text-right border-b w-32 cursor-pointer hover:bg-gray-200 transition-colors select-none group relative" on:click={() => handleSort('quantity')} title="Sắp xếp theo Số lượng">
                        <div class="flex items-center justify-end gap-1">
                            {isVelocityMode ? 'SL TB/Ngày' : 'Số lượng'}
                            <div class="flex flex-col text-[10px] leading-[8px] {iconClass('quantity')}">▲▼</div>
                        </div>
                        {#if isCompareMode && !isVelocityMode}<div class="text-[9px] text-green-600 font-normal absolute bottom-1 right-4 tracking-tight">(Sort: {sortLabel})</div>{/if}
                    </th>
                    
                    <th class="py-3 px-4 text-right border-b w-40 cursor-pointer hover:bg-gray-200 transition-colors select-none group relative" on:click={() => handleSort('revenue')} title="Sắp xếp theo Doanh thu">
                        <div class="flex items-center justify-end gap-1">
                            {isVelocityMode ? 'DT TB/Ngày' : 'Doanh thu'} 
                            <div class="flex flex-col text-[10px] leading-[8px] {iconClass('revenue')}">▲▼</div>
                        </div>
                        {#if isCompareMode && !isVelocityMode}<div class="text-[9px] text-green-600 font-normal absolute bottom-1 right-4 tracking-tight">(Sort: {sortLabel})</div>{/if}
                    </th>

                    <th class="py-3 px-4 text-right border-b w-40 cursor-pointer hover:bg-gray-200 transition-colors select-none group relative" on:click={() => handleSort('revenueQD')} title="Sắp xếp theo DT Quy đổi">
                         <div class="flex items-center justify-end gap-1">
                             {isVelocityMode ? 'DT QĐ/Ngày' : 'DT Quy đổi'} 
                             <div class="flex flex-col text-[10px] leading-[8px] {iconClass('revenueQD')}">▲▼</div>
                        </div>
                        {#if isCompareMode && !isVelocityMode}<div class="text-[9px] text-green-600 font-normal absolute bottom-1 right-4 tracking-tight">(Sort: {sortLabel})</div>{/if}
                    </th>

                    {#if !isVelocityMode}
                        <th class="py-3 px-4 text-center border-b w-24 cursor-pointer hover:bg-gray-200 transition-colors select-none group" on:click={() => handleSort('percentQD')} title="Sắp xếp theo % Quy đổi">
                            <div class="flex items-center justify-center gap-1">
                                % QĐ
                                <div class="flex flex-col text-[10px] leading-[8px] {iconClass('percentQD')}">▲▼</div>
                             </div>
                        </th>
                    {/if}
                    
                    {#if hasInventoryData}
                        <th class="py-3 px-4 text-right border-b w-32 bg-emerald-50 text-emerald-800">SL Tồn kho</th>
                        <th class="py-3 px-4 text-center border-b w-32 bg-red-50 text-red-800">Cảnh báo</th>
                    {/if}
                 
                    {#if !isVelocityMode}
                        <th class="py-3 px-4 text-right border-b w-40 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors select-none group relative" on:click={() => handleSort('revenueTraCham')} title="Sắp xếp theo Trả chậm">
                            <div class="flex items-center justify-end gap-1">
                                DT Trả chậm 
                                <div class="flex flex-col text-[10px] leading-[8px] {iconClass('revenueTraCham')}">▲▼</div>
                            </div>
                            {#if isCompareMode}<div class="text-[9px] text-green-600 font-normal absolute bottom-1 right-4 tracking-tight">(Sort: {sortLabel})</div>{/if}
                        </th>
                        <th class="py-3 px-4 text-center border-b w-24 bg-yellow-50">% Trả chậm</th>
                    {/if}
                </tr>
                
                <tr class="bg-blue-50 font-bold text-blue-800 border-b-2 border-blue-200">
                    <td class="py-3 px-4 border-r">TỔNG CỘNG</td>
                    <td class="py-3 px-4 text-right group relative">
                        <div class="flex items-center justify-end gap-1.5">
                            <span>{fmtQty(totalMetrics.quantity)}</span>
                            {#if isCompareMode && !isVelocityMode}
                                {@const diff = getDiff(totalMetrics.quantity, totalMetrics.quantityCK)}
                                <span class="text-blue-300 font-light">|</span>
                                <span class="text-xs {getDiffColor(diff)} bg-white/60 px-1 rounded">{diff > 0 ? '+' : ''}{fmtQty(diff)}</span>
                            {/if}
                        </div>
                        {#if isCompareMode && !isVelocityMode}
                            {@const diff = getDiff(totalMetrics.quantity, totalMetrics.quantityCK)}
                            <div class="text-[10px] font-bold mt-0.5 {getDiffColor(diff)}">{getDiffIcon(diff)} {getPct(totalMetrics.quantity, totalMetrics.quantityCK)}</div>
                            <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap font-normal">
                                 Tổng Cùng kỳ: <b>{fmtQty(totalMetrics.quantityCK)}</b> <br/>
                                Chênh lệch: <b class="{diff >= 0 ? 'text-blue-300' : 'text-red-300'}">{diff > 0 ? '+' : ''}{fmtQty(diff)} ({getPct(totalMetrics.quantity, totalMetrics.quantityCK)})</b>
                            </div>
                        {/if}
                    </td>
                    
                    <td class="py-3 px-4 text-right group relative">
                        <div class="flex items-center justify-end gap-1.5">
                            <span>{fmtRev(totalMetrics.revenue)}</span>
                            {#if isCompareMode && !isVelocityMode}
                                {@const diff = getDiff(totalMetrics.revenue, totalMetrics.revenueCK)}
                                <span class="text-blue-300 font-light">|</span>
                                <span class="text-xs {getDiffColor(diff)} bg-white/60 px-1 rounded">{diff > 0 ? '+' : ''}{fmtRev(diff)}</span>
                            {/if}
                        </div>
                        {#if isCompareMode && !isVelocityMode}
                            {@const diff = getDiff(totalMetrics.revenue, totalMetrics.revenueCK)}
                            <div class="text-[10px] font-bold mt-0.5 {getDiffColor(diff)}">{getDiffIcon(diff)} {getPct(totalMetrics.revenue, totalMetrics.revenueCK)}</div>
                            <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap font-normal">
                                 Tổng Cùng kỳ: <b>{fmtRev(totalMetrics.revenueCK)}</b> <br/>
                                Chênh lệch: <b class="{diff >= 0 ? 'text-blue-300' : 'text-red-300'}">{diff > 0 ? '+' : ''}{fmtRev(diff)} ({getPct(totalMetrics.revenue, totalMetrics.revenueCK)})</b>
                            </div>
                        {/if}
                    </td>

                    <td class="py-3 px-4 text-right group relative">
                        <div class="flex items-center justify-end gap-1.5">
                            <span>{fmtRev(totalMetrics.revenueQD)}</span>
                            {#if isCompareMode && !isVelocityMode}
                                {@const diff = getDiff(totalMetrics.revenueQD, totalMetrics.revenueQDCK)}
                                <span class="text-blue-300 font-light">|</span>
                                <span class="text-xs {getDiffColor(diff)} bg-white/60 px-1 rounded">{diff > 0 ? '+' : ''}{fmtRev(diff)}</span>
                            {/if}
                        </div>
                        {#if isCompareMode && !isVelocityMode}
                            {@const diff = getDiff(totalMetrics.revenueQD, totalMetrics.revenueQDCK)}
                            <div class="text-[10px] font-bold mt-0.5 {getDiffColor(diff)}">{getDiffIcon(diff)} {getPct(totalMetrics.revenueQD, totalMetrics.revenueQDCK)}</div>
                            <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap font-normal">
                                 Tổng Cùng kỳ: <b>{fmtRev(totalMetrics.revenueQDCK)}</b> <br/>
                                Chênh lệch: <b class="{diff >= 0 ? 'text-blue-300' : 'text-red-300'}">{diff > 0 ? '+' : ''}{fmtRev(diff)} ({getPct(totalMetrics.revenueQD, totalMetrics.revenueQDCK)})</b>
                            </div>
                        {/if}
                    </td>
                    
                    {#if !isVelocityMode}
                        <td class="py-3 px-4 text-center">{totalMetrics.revenue > 0 ? fmtPct(((totalMetrics.revenueQD / totalMetrics.revenue) * 100) - 100) : '0%'}</td>
                    {/if}

                    {#if hasInventoryData}
                        <td class="py-3 px-4 bg-emerald-100 border-r border-white"></td>
                        <td class="py-3 px-4 bg-red-100"></td>
                    {/if}

                    {#if !isVelocityMode}
                        <td class="py-3 px-4 text-right bg-yellow-100 group relative">
                            <div class="flex items-center justify-end gap-1.5">
                                <span>{fmtRev(totalMetrics.revenueTraCham)}</span>
                                {#if isCompareMode}
                                    {@const diff = getDiff(totalMetrics.revenueTraCham, totalMetrics.revenueTraChamCK)}
                                    <span class="text-yellow-400 font-light">|</span>
                                    <span class="text-xs {getDiffColor(diff)} bg-white/60 px-1 rounded">{diff > 0 ? '+' : ''}{fmtRev(diff)}</span>
                                {/if}
                            </div>
                            {#if isCompareMode}
                                {@const diff = getDiff(totalMetrics.revenueTraCham, totalMetrics.revenueTraChamCK)}
                                <div class="text-[10px] font-bold mt-0.5 {getDiffColor(diff)}">{getDiffIcon(diff)} {getPct(totalMetrics.revenueTraCham, totalMetrics.revenueTraChamCK)}</div>
                                <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-max px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap font-normal">
                                    Tổng Cùng kỳ: <b>{fmtRev(totalMetrics.revenueTraChamCK)}</b> <br/>
                                    Chênh lệch: <b class="{diff >= 0 ? 'text-blue-300' : 'text-red-300'}">{diff > 0 ? '+' : ''}{fmtRev(diff)} ({getPct(totalMetrics.revenueTraCham, totalMetrics.revenueTraChamCK)})</b>
                                </div>
                            {/if}
                        </td>
                        <td class="py-3 px-4 text-center bg-yellow-100">{totalMetrics.revenue > 0 ? fmtPct((totalMetrics.revenueTraCham / totalMetrics.revenue) * 100) : '0%'}</td>
                    {/if}
                </tr>
            </thead>
            <tbody>
                {#if sortedData.length === 0}
                    <tr><td colspan="{isVelocityMode ? (hasInventoryData ? 6 : 4) : (hasInventoryData ? 9 : 7)}" class="text-center py-10 text-gray-500">Chưa có dữ liệu</td></tr>
                {:else}
                    {#each sortedData as group (group.id)}
                        <TableRowRecursive {group} {expandedRows} {toggleRow} {LEVEL_COLORS} {fmtQty} {fmtRev} {fmtPct} {isVelocityMode} {hasInventoryData} {isCompareMode} />
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<style>
    .animate-fade-in-down { animation: fadeInDown 0.2s ease-out; }
    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    :global(.cell-alert) { color: #c02424; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 4px; }
    :global(.cell-ok) { color: #059669; font-weight: bold; text-align: center; }

    /* [CAPTURE STYLE FIX] - Tăng kích thước bao ngoài để chứa đủ cột dữ liệu và xóa tràn overflow */
    :global(.capture-container .luyke-filter-section) { display: none !important; }
    :global(.capture-container .velocity-toolbar) { display: none !important; }
    :global(.capture-container .luyke-table-wrapper) {
        width: 1050px !important; min-width: 1050px !important; max-width: 1050px !important;
        margin: 0 auto !important; border-radius: 0 !important; border: none !important; box-shadow: none !important;
    }
    :global(.capture-container .overflow-x-auto) { overflow: visible !important; }
    :global(.capture-container .overflow-y-auto) { overflow: visible !important; }

    :global(.capture-container .luyke-table-wrapper table) { width: 100% !important; font-family: 'Segoe UI', sans-serif !important; }
    :global(.capture-container .luyke-table-wrapper th),
    :global(.capture-container .luyke-table-wrapper td) {
        padding: 8px 6px !important; white-space: normal !important; overflow: visible !important;
        height: auto !important; line-height: 1.5 !important; font-size: 14px !important;
    }
    :global(.capture-container .luyke-table-wrapper th:first-child) { min-width: 150px !important; width: auto !important; }
</style>