<script>
    import { createEventDispatcher } from 'svelte';
    import LuykeTableRowRecursive from './LuykeTableRowRecursive.svelte';
    import LuykeCategoryFilterBar from './LuykeCategoryFilterBar.svelte';
    
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

    // --- LOGIC RUN RATE (SỐ DỰ KIẾN) ---
    $: today = new Date();
    $: daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    $: elapsedDays = Math.max(1, today.getDate() - 1); 

    $: getProjected = (val) => {
        if (!val) return 0;
        return (val / elapsedDays) * daysInMonth;
    };

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

    $: getPctVal = (currProj, prev) => prev ? ((currProj - prev) / prev) * 100 : (currProj > 0 ? 100 : 0);
    $: fmtDiffText = (diff, formatter) => diff === 0 ? '0' : (diff > 0 ? '+' : '') + formatter(diff);
    $: fmtPctText = (pct) => pct === 0 ? '0.0%' : (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
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
                const dgA = getProjected(a.quantity ? (a.revenue / a.quantity) : 0);
                const dgB = getProjected(b.quantity ? (b.revenue / b.quantity) : 0);
                const dgC_A = a.quantityCK ? (a.revenueCK / a.quantityCK) : 0;
                const dgC_B = b.quantityCK ? (b.revenueCK / b.quantityCK) : 0;
                valA = dgA - dgC_A; valB = dgB - dgC_B;
            } else if (key === 'donGia_pct') {
                const dgA = getProjected(a.quantity ? (a.revenue / a.quantity) : 0);
                const dgB = getProjected(b.quantity ? (b.revenue / b.quantity) : 0);
                const dgC_A = a.quantityCK ? (a.revenueCK / a.quantityCK) : 0;
                const dgC_B = b.quantityCK ? (b.revenueCK / b.quantityCK) : 0;
                valA = dgC_A ? (dgA - dgC_A) / dgC_A : (dgA > 0 ? 999999 : 0);
                valB = dgC_B ? (dgB - dgC_B) / dgC_B : (dgB > 0 ? 999999 : 0);
            } else if (key.endsWith('_prev')) {
                const baseKey = key.replace('_prev', '');
                valA = a[`${baseKey}CK`] || 0; valB = b[`${baseKey}CK`] || 0;
            } else if (key.endsWith('_diff')) {
                const baseKey = key.replace('_diff', '');
                valA = getProjected(a[baseKey] || 0) - (a[`${baseKey}CK`] || 0);
                valB = getProjected(b[baseKey] || 0) - (b[`${baseKey}CK`] || 0);
            } else if (key.endsWith('_pct')) {
                const baseKey = key.replace('_pct', '');
                const currA = getProjected(a[baseKey] || 0); const prevA = a[`${baseKey}CK`] || 0;
                const currB = getProjected(b[baseKey] || 0); const prevB = b[`${baseKey}CK`] || 0;
                valA = prevA ? (currA - prevA) / prevA : (currA > 0 ? 999999 : 0);
                valB = prevB ? (currB - prevB) / prevB : (currB > 0 ? 999999 : 0);
            } else {
                valA = a[key] || 0; valB = b[key] || 0;
            }
            return dir === 'asc' ? valA - valB : valB - valA;
        });
        return sorted.map(node => {
            if (node.children && node.children.length > 0) return { ...node, children: sortTree(node.children, key, dir) };
            return node;
        });
    }

    $: sortedData = sortTree(data, sortKey, sortDirection);
    function toggleRow(id) { if (expandedRows.has(id)) expandedRows.delete(id); else expandedRows.add(id); expandedRows = expandedRows; }
    function expandAll(nodes) { if (!nodes) return; nodes.forEach(node => { expandedRows.add(node.id); if (node.children) expandAll(node.children); }); expandedRows = expandedRows; }
    function collapseAll() { expandedRows = new Set(); }
    $: getArrow = (key) => sortKey === key ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : '';
</script>

<LuykeCategoryFilterBar 
    {allDimensions} 
    {activeIds} 
    {filterOptions} 
    {currentFilters}
    on:configChange={(e) => dispatch('configChange', e.detail)}
    on:filterChange={(e) => dispatch('filterChange', e.detail)}
/>

<div class="bg-white rounded-lg shadow border border-gray-200 luyke-table-wrapper">
    <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-xs text-left border-collapse">
            <thead class="text-gray-700 uppercase font-bold sticky top-0 z-20 shadow-sm">
                <!-- TẦNG TIÊU ĐỀ 1 -->
                <tr class="bg-gray-100 text-[11px]">
                    <!-- [PHẪU THUẬT LOGIC]: Sửa width của cột này, ép fix width max-w-[260px] để chữ bị đẩy xuống dòng thay vì kéo giãn bảng -->
                    <th rowspan={isCompareMode && !isVelocityMode ? 2 : 1} class="py-3 px-4 border-b border-r bg-gray-100 text-gray-700 align-middle text-left w-[260px] min-w-[260px] max-w-[260px] xl:w-[320px] xl:min-w-[320px] xl:max-w-[320px] whitespace-normal">
                        <div class="flex items-center gap-2">
                             <span>Danh mục</span>
                             <div class="flex gap-1 ml-auto capture-hide">
                               <button on:click={() => expandAll(data)} class="p-1 hover:bg-gray-200 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg></button>
                                <button on:click={collapseAll} class="p-1 hover:bg-gray-200 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg></button>
                            </div>
                        </div>
                    </th>

                    {#if isColVisible('quantity')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-slate-50/50 text-slate-800 align-middle cursor-pointer" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('quantity'); }}>
                            {isVelocityMode ? 'SL TB / Ngày' : 'Số lượng (SL)'}{getArrow('quantity')}
                        </th>
                    {/if}
                    
                    {#if isColVisible('revenue')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-blue-50/50 text-blue-900 align-middle cursor-pointer" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('revenue'); }}>
                            {isVelocityMode ? 'DT TB / Ngày' : 'Doanh thu thực'}{getArrow('revenue')}
                        </th>
                    {/if}

                    {#if isColVisible('donGia')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-amber-50/50 text-amber-900 align-middle cursor-pointer" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('donGia'); }}>
                            Đơn giá (Tr){getArrow('donGia')}
                        </th>
                    {/if}

                    {#if isColVisible('revenueQD')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-indigo-50/50 text-indigo-900 align-middle cursor-pointer" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('revenueQD'); }}>
                            {isVelocityMode ? 'DT QĐ / Ngày' : 'Doanh thu Quy đổi'}{getArrow('revenueQD')}
                        </th>
                        {#if !isVelocityMode && !isCompareMode}
                            <th class="py-2.5 px-2 text-center border-b border-r bg-indigo-50/50 text-indigo-900 align-middle cursor-pointer" on:click={() => handleSort('percentQD')}>% QĐ{getArrow('percentQD')}</th>
                        {/if}
                    {/if}
                    
                    {#if hasInventoryData}
                        <th rowspan={isCompareMode && !isVelocityMode ? 2 : 1} class="py-2.5 px-2 text-right border-b border-r bg-emerald-50 text-emerald-800 align-middle">SL Tồn</th>
                        <th rowspan={isCompareMode && !isVelocityMode ? 2 : 1} class="py-2.5 px-2 text-center border-b border-r bg-red-50 text-red-800 align-middle">Cảnh báo</th>
                    {/if}
                    
                    {#if isColVisible('revenueTraCham')}
                        <th colspan={isCompareMode && !isVelocityMode ? 4 : 1} class="py-2.5 px-2 text-center border-b border-r bg-yellow-50/50 text-yellow-900 align-middle cursor-pointer" on:click={() => { if(!isCompareMode || isVelocityMode) handleSort('revenueTraCham'); }}>
                            DT Trả chậm{getArrow('revenueTraCham')}
                        </th>
                        {#if !isVelocityMode && !isCompareMode}
                            <th class="py-2.5 px-2 text-center border-b bg-yellow-50/50 text-yellow-900 align-middle">% Trả chậm</th>
                        {/if}
                    {/if}
                </tr>
                
                <!-- TẦNG TIÊU ĐỀ 2 -->
                {#if isCompareMode && !isVelocityMode}
                    <tr class="bg-gray-50 text-[10px] text-center">
                        {#if isColVisible('quantity')}
                            <th class="py-1 px-1 bg-slate-50/30 border-b border-r cursor-pointer hover:bg-slate-100" on:click={() => handleSort('quantity_prev')}>Tháng trước{getArrow('quantity_prev')}</th>
                            <th class="py-1 px-1 bg-slate-50/30 border-b border-r cursor-pointer hover:bg-slate-100" on:click={() => handleSort('quantity')}>Dự kiến{getArrow('quantity')}</th>
                            <th class="py-1 px-1 bg-slate-50/30 border-b border-r cursor-pointer hover:bg-slate-100" on:click={() => handleSort('quantity_diff')}>+/-{getArrow('quantity_diff')}</th>
                            <th class="py-1 px-1 bg-slate-50/30 border-b border-r cursor-pointer hover:bg-slate-100" on:click={() => handleSort('quantity_pct')}>%{getArrow('quantity_pct')}</th>
                        {/if}
                        {#if isColVisible('revenue')}
                            <th class="py-1 px-1 bg-blue-50/30 border-b border-r cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue_prev')}>Tháng trước{getArrow('revenue_prev')}</th>
                            <th class="py-1 px-1 bg-blue-50/30 border-b border-r cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue')}>Dự kiến{getArrow('revenue')}</th>
                            <th class="py-1 px-1 bg-blue-50/30 border-b border-r cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue_diff')}>+/-{getArrow('revenue_diff')}</th>
                            <th class="py-1 px-1 bg-blue-50/30 border-b border-r cursor-pointer hover:bg-blue-100" on:click={() => handleSort('revenue_pct')}>%{getArrow('revenue_pct')}</th>
                        {/if}
                        {#if isColVisible('donGia')}
                            <th class="py-1 px-1 bg-amber-50/30 border-b border-r cursor-pointer hover:bg-amber-100" on:click={() => handleSort('donGia_prev')}>Tháng trước{getArrow('donGia_prev')}</th>
                            <th class="py-1 px-1 bg-amber-50/30 border-b border-r cursor-pointer hover:bg-amber-100" on:click={() => handleSort('donGia')}>Dự kiến{getArrow('donGia')}</th>
                            <th class="py-1 px-1 bg-amber-50/30 border-b border-r cursor-pointer hover:bg-amber-100" on:click={() => handleSort('donGia_diff')}>+/-{getArrow('donGia_diff')}</th>
                            <th class="py-1 px-1 bg-amber-50/30 border-b border-r cursor-pointer hover:bg-amber-100" on:click={() => handleSort('donGia_pct')}>%{getArrow('donGia_pct')}</th>
                        {/if}
                        {#if isColVisible('revenueQD')}
                            <th class="py-1 px-1 bg-indigo-50/30 border-b border-r cursor-pointer hover:bg-indigo-100" on:click={() => handleSort('revenueQD_prev')}>Tháng trước{getArrow('revenueQD_prev')}</th>
                            <th class="py-1 px-1 bg-indigo-50/30 border-b border-r cursor-pointer hover:bg-indigo-100" on:click={() => handleSort('revenueQD')}>Dự kiến{getArrow('revenueQD')}</th>
                            <th class="py-1 px-1 bg-indigo-50/30 border-b border-r cursor-pointer hover:bg-indigo-100" on:click={() => handleSort('revenueQD_diff')}>+/-{getArrow('revenueQD_diff')}</th>
                            <th class="py-1 px-1 bg-indigo-50/30 border-b border-r cursor-pointer hover:bg-indigo-100" on:click={() => handleSort('revenueQD_pct')}>%{getArrow('revenueQD_pct')}</th>
                        {/if}
                        {#if isColVisible('revenueTraCham')}
                            <th class="py-1 px-1 bg-yellow-50/30 border-b border-r cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham_prev')}>Tháng trước{getArrow('revenueTraCham_prev')}</th>
                            <th class="py-1 px-1 bg-yellow-50/30 border-b border-r cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham')}>Dự kiến{getArrow('revenueTraCham')}</th>
                            <th class="py-1 px-1 bg-yellow-50/30 border-b border-r cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham_diff')}>+/-{getArrow('revenueTraCham_diff')}</th>
                            <th class="py-1 px-1 bg-yellow-50/30 border-b cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham_pct')}>%{getArrow('revenueTraCham_pct')}</th>
                        {/if}
                    </tr>
                {/if}
                
                <!-- DÒNG TỔNG CỘNG -->
                <tr class="bg-blue-50 text-blue-800 font-bold border-b-2 border-blue-200">
                    <td class="py-3 px-4 border-r font-black">TỔNG CỘNG</td>
                    
                    {#if isColVisible('quantity')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.quantityCK || 0} {@const currProj = getProjected(totalMetrics.quantity || 0)}
                            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
                            <td class="py-2 px-1 text-right bg-slate-50/30 border-r">{fmtQty(prev)}</td>
                            <td class="py-2 px-1 text-right bg-slate-50/30 border-r font-black">{fmtQty(currProj)}</td>
                            <td class="py-2 px-1 text-right bg-slate-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtQty)}</td>
                            <td class="py-2 px-1 text-center bg-slate-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right bg-slate-50/30 border-r font-black">{fmtQty(totalMetrics.quantity)}</td>
                        {/if}
                    {/if}

                    {#if isColVisible('revenue')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.revenueCK || 0} {@const currProj = getProjected(totalMetrics.revenue || 0)}
                            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
                            <td class="py-2 px-1 text-right bg-blue-50/30 border-r">{fmtRev(prev)}</td>
                            <td class="py-2 px-1 text-right bg-blue-50/30 border-r font-black text-blue-700">{fmtRev(currProj)}</td>
                            <td class="py-2 px-1 text-right bg-blue-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
                            <td class="py-2 px-1 text-center bg-blue-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right bg-blue-50/30 border-r font-black text-blue-700">{fmtRev(totalMetrics.revenue)}</td>
                        {/if}
                    {/if}

                    {#if isColVisible('donGia')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.quantityCK > 0 ? totalMetrics.revenueCK / totalMetrics.quantityCK : 0}
                            {@const currProj = getProjected(totalMetrics.quantity > 0 ? totalMetrics.revenue / totalMetrics.quantity : 0)}
                            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
                            <td class="py-2 px-1 text-right bg-amber-50/30 border-r">{fmtRev(prev)}</td>
                            <td class="py-2 px-1 text-right bg-amber-50/30 border-r text-amber-800">{fmtRev(currProj)}</td>
                            <td class="py-2 px-1 text-right bg-amber-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
                            <td class="py-2 px-1 text-center bg-amber-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right border-r bg-amber-50/30 text-amber-800">{totalMetrics.quantity > 0 ? fmtRev(totalMetrics.revenue / totalMetrics.quantity) : '-'}</td>
                        {/if}
                    {/if}

                    {#if isColVisible('revenueQD')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.revenueQDCK || 0} {@const currProj = getProjected(totalMetrics.revenueQD || 0)}
                            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
                            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r">{fmtRev(prev)}</td>
                            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r">{fmtRev(currProj)}</td>
                            <td class="py-2 px-1 text-right bg-indigo-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
                            <td class="py-2 px-1 text-center bg-indigo-50/30 border-r {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right bg-indigo-50/30 border-r font-black">{fmtRev(totalMetrics.revenueQD)}</td>
                            {#if !isVelocityMode}<td class="py-3 px-4 text-center bg-indigo-50/30 border-r">{totalMetrics.revenue > 0 ? fmtPct(((totalMetrics.revenueQD / totalMetrics.revenue) * 100) - 100) : '0%'}</td>{/if}
                        {/if}
                    {/if}

                    {#if hasInventoryData}
                        <td class="py-3 px-4 bg-emerald-100 border-r border-white"></td>
                        <td class="py-3 px-4 bg-red-100 border-r"></td>
                    {/if}

                    {#if isColVisible('revenueTraCham')}
                        {#if isCompareMode && !isVelocityMode}
                            {@const prev = totalMetrics.revenueTraChamCK || 0} {@const currProj = getProjected(totalMetrics.revenueTraCham || 0)}
                            {@const diff = currProj - prev} {@const pct = getPctVal(currProj, prev)}
                            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r">{fmtRev(prev)}</td>
                            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r">{fmtRev(currProj)}</td>
                            <td class="py-2 px-1 text-right bg-yellow-50/30 border-r {getColorClass(diff)}">{fmtDiffText(diff, fmtRev)}</td>
                            <td class="py-2 px-1 text-center bg-yellow-50/30 {getColorClass(diff)}">{fmtPctText(pct)}</td>
                        {:else}
                            <td class="py-3 px-4 text-right bg-yellow-50/30 border-r">{fmtRev(totalMetrics.revenueTraCham)}</td>
                            <td class="py-3 px-4 text-center bg-yellow-50/30">{totalMetrics.revenue > 0 ? fmtPct((totalMetrics.revenueTraCham / totalMetrics.revenue) * 100) : '0%'}</td>
                        {/if}
                    {/if}
                </tr>
            </thead>
            
            <tbody>
                {#if sortedData.length === 0}
                    <tr><td colspan="30" class="text-center py-10 text-gray-500 font-medium">Chưa có dữ liệu hiển thị.</td></tr>
                {:else}
                    {#each sortedData as group (group.id)}
                        <LuykeTableRowRecursive 
                            {group} {expandedRows} {toggleRow} {LEVEL_COLORS} {fmtQty} {fmtRev} {fmtPct} 
                            {isVelocityMode} {hasInventoryData} {isCompareMode} {columnSettings} {elapsedDays} {daysInMonth}
                        />
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<style>
    /* BẢO TOÀN CAPTURE VÀ FIXTURE CHỤP PHẲNG KHÔNG CẮT CHỮ */
    :global(.capture-container .luyke-filter-section) { display: none !important; }
    :global(.capture-container .velocity-toolbar) { display: none !important; }
    :global(.capture-container .luyke-table-wrapper) {
        width: max-content !important; min-width: 100% !important; max-width: none !important;
        margin: 0 auto !important; border-radius: 0 !important; border: none !important; box-shadow: none !important;
    }
    :global(.capture-container .overflow-x-auto) { overflow: visible !important; width: auto !important; max-width: none !important; }
    :global(.capture-container table) { width: 100% !important; font-family: 'Segoe UI', sans-serif !important; }
    :global(.capture-container th), :global(.capture-container td) {
        padding: 7px 5px !important; white-space: nowrap !important; overflow: visible !important;
        height: auto !important; line-height: 1.4 !important; font-size: 13px !important;
    }
    :global(.capture-container th:first-child), :global(.capture-container td:first-child) { 
        min-width: 160px !important; 
        white-space: normal !important; 
    }

    /* [PHẪU THUẬT LOGIC]: Thuốc giải trị dứt điểm tình trạng bị cắt chữ tên Ngành hàng bằng "..." khi chụp ảnh */
    :global(.capture-container .truncate) {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
    }
</style>