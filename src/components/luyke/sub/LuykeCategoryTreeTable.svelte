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

    export let sortKey = 'revenue'; 
    export let sortDirection = 'desc';
    export let columnSettings = [];

    const dispatch = createEventDispatcher();
    let openFilterId = null;
    let filterSearchQuery = '';

    $: isColVisible = (id) => {
        const found = columnSettings.find(c => c.id === id);
        return found ? found.visible : true;
    };

    $: fmtQty = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: isVelocityMode ? 1 : 0, minimumFractionDigits: isVelocityMode ? 1 : 0 }).format(n || 0);
    $: fmtRev = (n) => {
        if (!n) return '0';
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: isVelocityMode ? 1 : 0, minimumFractionDigits: isVelocityMode ? 1 : 0 }).format(n / 1000000);
    };
    $: fmtPct = (n) => (n || 0).toFixed(1) + '%';
    const LEVEL_COLORS = ['text-red-700 font-bold', 'text-blue-700 font-semibold', 'text-purple-700 font-medium', 'text-emerald-700', 'text-orange-700'];

    // --- LOGIC TÍNH TOÁN CHO KHỐI MATRIX TỔNG CỘNG ---
    $: getDiffVal = (curr, prev) => (curr || 0) - (prev || 0);
    $: getPctVal = (curr, prev) => {
        if (!prev) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };
    $: fmtDiffText = (diff, formatter) => {
        if (diff === 0) return '0';
        return (diff > 0 ? '+' : '') + formatter(diff);
    };
    $: fmtPctText = (pct) => {
        if (pct === 0) return '0.0%';
        return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
    };
    $: getColorClass = (val) => val >= 0 ? 'text-blue-600 font-bold' : 'text-red-500 font-bold';

    function handleSort(key) {
        if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        else { sortKey = key; sortDirection = 'desc'; }
    }

    function sortTree(nodes, key, dir) {
        if (!nodes || nodes.length === 0) return [];
        const sorted = [...nodes].sort((a, b) => {
            let valA, valB;
            if (key === 'percentQD') {
                valA = a.revenue ? (a.revenueQD / a.revenue) : 0;
                valB = b.revenue ? (b.revenueQD / b.revenue) : 0;
            } else if (key === 'donGia') {
                valA = a.quantity ? (a.revenue / a.quantity) : 0;
                valB = b.quantity ? (b.revenue / b.quantity) : 0;
            } else if (key === 'donGia_prev') {
                valA = a.quantityCK ? (a.revenueCK / a.quantityCK) : 0;
                valB = b.quantityCK ? (b.revenueCK / b.quantityCK) : 0;
            } else if (key === 'donGia_diff') {
                const dgA = a.quantity ? (a.revenue / a.quantity) : 0;
                const dgB = b.quantity ? (b.revenue / b.quantity) : 0;
                const dgC_A = a.quantityCK ? (a.revenueCK / a.quantityCK) : 0;
                const dgC_B = b.quantityCK ? (b.revenueCK / b.quantityCK) : 0;
                valA = dgA - dgC_A;
                valB = dgB - dgC_B;
            } else if (key === 'donGia_pct') {
                const dgA = a.quantity ? (a.revenue / a.quantity) : 0;
                const dgB = b.quantity ? (b.revenue / b.quantity) : 0;
                const dgC_A = a.quantityCK ? (a.revenueCK / a.quantityCK) : 0;
                const dgC_B = b.quantityCK ? (b.revenueCK / b.quantityCK) : 0;
                valA = dgC_A ? (dgA - dgC_A) / dgC_A : (dgA > 0 ? 999999 : 0);
                valB = dgC_B ? (dgB - dgC_B) / dgC_B : (dgB > 0 ? 999999 : 0);
            } else if (key.endsWith('_prev')) {
                const baseKey = key.replace('_prev', '');
                valA = a[`${baseKey}CK`] || 0;
                valB = b[`${baseKey}CK`] || 0;
            } else if (key.endsWith('_diff')) {
                const baseKey = key.replace('_diff', '');
                valA = (a[baseKey] || 0) - (a[`${baseKey}CK`] || 0);
                valB = (b[baseKey] || 0) - (b[`${baseKey}CK`] || 0);
            } else if (key.endsWith('_pct')) {
                const baseKey = key.replace('_pct', '');
                const currA = a[baseKey] || 0; const prevA = a[`${baseKey}CK`] || 0;
                const currB = b[baseKey] || 0; const prevB = b[`${baseKey}CK`] || 0;
                valA = prevA ? (currA - prevA) / prevA : (currA > 0 ? 999999 : 0);
                valB = prevB ? (currB - prevB) / prevB : (currB > 0 ? 999999 : 0);
            } else {
                valA = a[key] || 0;
                valB = b[key] || 0;
            }
            return dir === 'asc' ? valA - valB : valB - valA;
        });
        return sorted.map(node => {
            if (node.children && node.children.length > 0) return { ...node, children: sortTree(node.children, key, dir) };
            return node;
        });
    }

    $: sortedData = sortTree(data, sortKey, sortDirection);
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
            if (aSel && !bSel) return -1; 
            if (!aSel && bSel) return 1; 
            return a.localeCompare(b);
        });
    };
    function handleDimensionToggle(dimId) {
        let newIds = [...activeIds];
        if (newIds.includes(dimId)) newIds = newIds.filter(id => id !== dimId); else newIds.push(dimId);
        dispatch('configChange', newIds);
    }

    $: getArrow = (key) => sortKey === key ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : '';
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
                    <div class="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3 animate-fade-in-down">
                         <div class="flex justify-between items-center mb-3">
                             <span class="text-xs font-bold text-gray-500 uppercase">Lọc {dim.label}</span>
                             <div class="flex items-center gap-3">
                                 <button on:click={() => dispatch('filterChange', { key: dim.id, selected: [] })} class="text-[11px] font-bold text-orange-600 hover:text-orange-800 transition-colors">Bỏ chọn hết</button>
                                 {#if hasFilter}
                                     <button on:click={() => clearFilter(dim.id)} class="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors">Xóa lọc</button>
                                 {/if}
                             </div>
                         </div>
                        
                         <input type="text" bind:value={filterSearchQuery} placeholder="Tìm kiếm..." class="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-2 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"/>
                         <div class="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                            {#each getDisplayOptions(dim.id) as option (option)}
                                {@const isSelected = currentFilters[dim.id] === undefined || currentFilters[dim.id].includes(option)}
                                <label class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors" on:click|preventDefault={() => toggleFilterItem(dim.id, option)}>
                                    <input type="checkbox" checked={isSelected} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none" tabindex="-1"/>
                                    <span class="text-sm text-gray-700 truncate {isSelected ? 'font-bold text-blue-800' : ''}">{option}</span>
                                </label>
                            {/each}
                            {#if getDisplayOptions(dim.id).length === 0}
                                <div class="text-xs text-gray-400 text-center py-4 font-medium">Không tìm thấy dữ liệu</div>
                            {/if}
                         </div>
                         <div class="mt-2 pt-2 border-t border-slate-100 text-right">
                             <button on:click={() => openFilterId = null} class="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-md transition-colors">Đóng</button>
                         </div>
                    </div>
                    <div class="fixed inset-0 z-40" on:click={() => openFilterId = null}></div>
                {/if}
            </div>
          {/each}
    </div>
</div>

<div class="bg-white rounded-lg shadow border border-gray-200 luyke-table-wrapper">
    <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-xs text-left border-collapse">
            <thead class="text-gray-700 uppercase font-bold sticky top-0 z-20 shadow-sm">
                <tr class="bg-gray-100 text-[11px]">
                    <th rowspan={isCompareMode && !isVelocityMode ? 2 : 1} class="py-3 px-4 border-b border-r bg-gray-100 text-gray-700 align-middle text-left {isVelocityMode ? 'w-[250px] max-w-[250px]' : 'w-auto min-w-[180px]'}">
                        <div class="flex items-center gap-2">
                             <span>Danh mục</span>
                             <div class="flex gap-1 ml-auto capture-hide">
                               <button on:click={() => expandAll(data)} class="p-1 hover:bg-gray-200 rounded" title="Mở rộng"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg></button>
                                <button on:click={collapseAll} class="p-1 hover:bg-gray-200 rounded" title="Thu gọn"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg></button>
                            </div>
                        </div>
                    </th>

                    {#if isColVisible('quantity')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-sky-100 text-sky-900 border-sky-200 align-middle cursor-pointer select-none" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('quantity'); }}>
                            {isVelocityMode ? 'SL TB / Ngày' : 'Số lượng (SL)'}{getArrow('quantity')}
                        </th>
                    {/if}
                    
                    {#if isColVisible('revenue')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-blue-100 text-blue-900 border-blue-200 align-middle cursor-pointer select-none" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('revenue'); }}>
                            {isVelocityMode ? 'DT TB / Ngày' : 'Doanh thu thực'}{getArrow('revenue')}
                        </th>
                    {/if}

                    {#if isColVisible('donGia')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-amber-100 text-amber-900 border-amber-200 align-middle cursor-pointer select-none" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('donGia'); }}>
                            Đơn giá (Tr){getArrow('donGia')}
                        </th>
                    {/if}

                    {#if isColVisible('revenueQD')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-indigo-100 text-indigo-900 border-indigo-200 align-middle cursor-pointer select-none" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('revenueQD'); }}>
                            {isVelocityMode ? 'DT QĐ / Ngày' : 'Doanh thu Quy đổi'}{getArrow('revenueQD')}
                        </th>
                        {#if !isVelocityMode && !isCompareMode}
                            <th class="py-2.5 px-2 text-center border-b border-r bg-indigo-50 text-indigo-900 align-middle cursor-pointer select-none" on:click={() => handleSort('percentQD')}>
                                % QĐ{getArrow('percentQD')}
                            </th>
                        {/if}
                    {/if}
                    
                    {#if hasInventoryData}
                        <th rowspan={isCompareMode && !isVelocityMode ? 2 : 1} class="py-2.5 px-2 text-right border-b border-r bg-emerald-50 text-emerald-800 align-middle">SL Tồn</th>
                        <th rowspan={isCompareMode && !isVelocityMode ? 2 : 1} class="py-2.5 px-2 text-center border-b border-r bg-red-50 text-red-800 align-middle">Cảnh báo</th>
                    {/if}
                    
                    {#if isColVisible('revenueTraCham')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-yellow-100 text-yellow-900 border-yellow-200 align-middle cursor-pointer select-none" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('revenueTraCham'); }}>
                            DT Trả chậm{getArrow('revenueTraCham')}
                        </th>
                        {#if !isVelocityMode && !isCompareMode}
                            <th class="py-2.5 px-2 text-center border-b bg-yellow-50 text-yellow-900 align-middle">% Trả chậm</th>
                        {/if}
                    {/if}
                </tr>
                
                {#if isCompareMode && !isVelocityMode}
                    <tr class="bg-gray-50 text-[10px] text-center">
                        {#if isColVisible('quantity')}
                            <th class="py-1 px-1 text-right bg-sky-50/60 border-b border-r cursor-pointer hover:bg-sky-100" on:click={() => handleSort('quantity_prev')}>Năm trước{getArrow('quantity_prev')}</th>
                            <th class="py-1 px-1 text-right bg-sky-50/60 border-b border-r cursor-pointer hover:bg-sky-100" on:click={() => handleSort('quantity')}>Năm nay{getArrow('quantity')}</th>
                            <th class="py-1 px-1 text-right bg-sky-50/60 border-b border-r cursor-pointer hover:bg-sky-100" on:click={() => handleSort('quantity_diff')}>+/- Tăng giảm{getArrow('quantity_diff')}</th>
                            <th class="py-1 px-1 text-center bg-sky-50/60 border-b border-r cursor-pointer hover:bg-sky-100" on:click={() => handleSort('quantity_pct')}>% Tỷ lệ{getArrow('quantity_pct')}</th>
                        {/if}
                        {#if isColVisible('revenue')}
                            <th class="py-1 px-1 text-right bg-blue-50/60 border-b border-r cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue_prev')}>Năm trước{getArrow('revenue_prev')}</th>
                            <th class="py-1 px-1 text-right bg-blue-50/60 border-b border-r cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue')}>Năm nay{getArrow('revenue')}</th>
                            <th class="py-1 px-1 text-right bg-blue-50/60 border-b border-r cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue_diff')}>+/- Tăng giảm{getArrow('revenue_diff')}</th>
                            <th class="py-1 px-1 text-center bg-blue-50/60 border-b border-r cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue_pct')}>% Tỷ lệ{getArrow('revenue_pct')}</th>
                        {/if}
                        {#if isColVisible('donGia')}
                            <th class="py-1 px-1 text-right bg-amber-50/60 border-b border-r cursor-pointer hover:bg-amber-100" on:click={() => handleSort('donGia_prev')}>Năm trước{getArrow('donGia_prev')}</th>
                            <th class="py-1 px-1 text-right bg-amber-50/60 border-b border-r cursor-pointer hover:bg-amber-100" on:click={() => handleSort('donGia')}>Năm nay{getArrow('donGia')}</th>
                            <th class="py-1 px-1 text-right bg-amber-50/60 border-b border-r cursor-pointer hover:bg-amber-100" on:click={() => handleSort('donGia_diff')}>+/- Tăng giảm{getArrow('donGia_diff')}</th>
                            <th class="py-1 px-1 text-center bg-amber-50/60 border-b border-r cursor-pointer hover:bg-amber-100" on:click={() => handleSort('donGia_pct')}>% Tỷ lệ{getArrow('donGia_pct')}</th>
                        {/if}
                        {#if isColVisible('revenueQD')}
                            <th class="py-1 px-1 text-right bg-indigo-50/60 border-b border-r cursor-pointer hover:bg-indigo-100" on:click={() => handleSort('revenueQD_prev')}>Năm trước{getArrow('revenueQD_prev')}</th>
                            <th class="py-1 px-1 text-right bg-indigo-50/60 border-b border-r cursor-pointer hover:bg-indigo-100" on:click={() => handleSort('revenueQD')}>Năm nay{getArrow('revenueQD')}</th>
                            <th class="py-1 px-1 text-right bg-indigo-50/60 border-b border-r cursor-pointer hover:bg-indigo-100" on:click={() => handleSort('revenueQD_diff')}>+/- Tăng giảm{getArrow('revenueQD_diff')}</th>
                            <th class="py-1 px-1 text-center bg-indigo-50/60 border-b border-r cursor-pointer hover:bg-indigo-100" on:click={() => handleSort('revenueQD_pct')}>% Tỷ lệ{getArrow('revenueQD_pct')}</th>
                        {/if}
                        {#if isColVisible('revenueTraCham')}
                            <th class="py-1 px-1 text-right bg-yellow-50/60 border-b border-r cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham_prev')}>Năm trước{getArrow('revenueTraCham_prev')}</th>
                            <th class="py-1 px-1 text-right bg-yellow-50/60 border-b border-r cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham')}>Năm nay{getArrow('revenueTraCham')}</th>
                            <th class="py-1 px-1 text-right bg-yellow-50/60 border-b border-r cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham_diff')}>+/- Tăng giảm{getArrow('revenueTraCham_diff')}</th>
                            <th class="py-1 px-1 text-center bg-yellow-50/60 border-b cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham_pct')}>% Tỷ lệ{getArrow('revenueTraCham_pct')}</th>
                        {/if}
                    </tr>
                {/if}
                
                <tr class="bg-blue-50 text-blue-800 font-bold border-b-2 border-blue-200">
                    <td class="py-3 px-4 border-r font-black">TỔNG CỘNG</td>
                    
                    {#if isColVisible('quantity')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.quantityCK || 0} {@const curr = totalMetrics.quantity || 0}
                            {@const diff = getDiffVal(curr, prev)} {@const pct = getPctVal(curr, prev)}
                            <td class="py-2 px-1 text-right bg-sky-50/30 border-r">{fmtQty(prev)}</td>
                            <td class="py-2 px-1 text-right bg-sky-50/30 border-r">{fmtQty(curr)}</td>
                            <td class="py-2 px-1 text-right bg-sky-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtQty)}</td>
                            <td class="py-2 px-1 text-center bg-sky-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right border-r font-black">{fmtQty(totalMetrics.quantity)}</td>
                        {/if}
                    {/if}

                    {#if isColVisible('revenue')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.revenueCK || 0} {@const curr = totalMetrics.revenue || 0}
                            {@const diff = getDiffVal(curr, prev)} {@const pct = getPctVal(curr, prev)}
                            <td class="py-2 px-1 text-right bg-blue-50/30 border-r">{fmtRev(prev)}</td>
                            <td class="py-2 px-1 text-right bg-blue-50/30 border-r">{fmtRev(curr)}</td>
                            <td class="py-2 px-1 text-right bg-blue-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
                            <td class="py-2 px-1 text-center bg-blue-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right border-r font-black text-blue-700">{fmtRev(totalMetrics.revenue)}</td>
                        {/if}
                    {/if}

                    {#if isColVisible('donGia')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.quantityCK > 0 ? totalMetrics.revenueCK / totalMetrics.quantityCK : 0}
                            {@const curr = totalMetrics.quantity > 0 ? totalMetrics.revenue / totalMetrics.quantity : 0}
                            {@const diff = getDiffVal(curr, prev)} {@const pct = getPctVal(curr, prev)}
                            <td class="py-2 px-1 text-right bg-amber-50/30 border-r">{fmtRev(prev)}</td>
                            <td class="py-2 px-1 text-right bg-amber-50/30 border-r">{fmtRev(curr)}</td>
                            <td class="py-2 px-1 text-right bg-amber-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
                            <td class="py-2 px-1 text-center bg-amber-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right border-r bg-amber-50/50 text-amber-800">
                                {totalMetrics.quantity > 0 ? fmtRev(totalMetrics.revenue / totalMetrics.quantity) : '-'}
                            </td>
                        {/if}
                    {/if}

                    {#if isColVisible('revenueQD')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.revenueQDCK || 0} {@const curr = totalMetrics.revenueQD || 0}
                            {@const diff = getDiffVal(curr, prev)} {@const pct = getPctVal(curr, prev)}
                            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r">{fmtRev(prev)}</td>
                            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r">{fmtRev(curr)}</td>
                            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
                            <td class="py-2 px-1 text-center bg-indigo-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right border-r font-black">{fmtRev(totalMetrics.revenueQD)}</td>
                            {#if !isVelocityMode}
                                <td class="py-3 px-4 text-center border-r">{totalMetrics.revenue > 0 ? fmtPct(((totalMetrics.revenueQD / totalMetrics.revenue) * 100) - 100) : '0%'}</td>
                            {/if}
                        {/if}
                    {/if}

                    {#if hasInventoryData}
                        <td class="py-3 px-4 bg-emerald-100 border-r border-white"></td>
                        <td class="py-3 px-4 bg-red-100 border-r"></td>
                    {/if}

                    {#if isColVisible('revenueTraCham')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.revenueTraChamCK || 0} {@const curr = totalMetrics.revenueTraCham || 0}
                            {@const diff = getDiffVal(curr, prev)} {@const pct = getPctVal(curr, prev)}
                            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r">{fmtRev(prev)}</td>
                            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r">{fmtRev(curr)}</td>
                            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
                            <td class="py-2 px-1 text-center bg-yellow-50/30 {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right bg-yellow-100 border-r">{fmtRev(totalMetrics.revenueTraCham)}</td>
                            <td class="py-3 px-4 text-center bg-yellow-100">{totalMetrics.revenue > 0 ? fmtPct((totalMetrics.revenueTraCham / totalMetrics.revenue) * 100) : '0%'}</td>
                        {/if}
                    {/if}
                </tr>
            </thead>
            
            <tbody>
                {#if sortedData.length === 0}
                    <tr><td colspan="30" class="text-center py-10 text-gray-500 font-medium">Chưa có dữ liệu hiển thị.</td></tr>
                {:else}
                    {#each sortedData as group (group.id)}
                        <TableRowRecursive 
                            {group} 
                            {expandedRows} 
                            {toggleRow} 
                            {LEVEL_COLORS} 
                            {fmtQty} 
                            {fmtRev} 
                            {fmtPct} 
                            {isVelocityMode} 
                            {hasInventoryData} 
                            {isCompareMode} 
                            {columnSettings}
                        />
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

    /* ==========================================================================
       BẢO TOÀN CAPTURE: BẢO VỆ CHIỀU RỘNG MA TRẬN PHẲNG, KHÔNG BỊ XÉN DỮ LIỆU
       ========================================================================== */
    :global(.capture-container .luyke-filter-section) { display: none !important; }
    :global(.capture-container .velocity-toolbar) { display: none !important; }
    
    :global(.capture-container .luyke-table-wrapper) {
        width: max-content !important;
        min-width: 100% !important;
        max-width: none !important;
        margin: 0 auto !important; 
        border-radius: 0 !important; 
        border: none !important; 
        box-shadow: none !important;
    }
    :global(.capture-container .overflow-x-auto) { 
        overflow: visible !important; 
        width: auto !important;
        max-width: none !important;
    }
    :global(.capture-container table) { 
        width: 100% !important; 
        font-family: 'Segoe UI', sans-serif !important; 
    }
    :global(.capture-container th), :global(.capture-container td) {
        padding: 7px 5px !important;
        white-space: nowrap !important; 
        overflow: visible !important;
        height: auto !important; 
        line-height: 1.4 !important; 
        font-size: 13px !important;
    }
    :global(.capture-container th[colspan]) {
        white-space: normal !important;
    }
    :global(.capture-container th:first-child), :global(.capture-container td:first-child) { 
        min-width: 160px !important; 
        white-space: normal !important;
    }
</style>