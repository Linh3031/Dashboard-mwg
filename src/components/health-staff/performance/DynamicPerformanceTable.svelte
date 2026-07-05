<script>
    import { createEventDispatcher } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';
    import { dynamicTableProcessor } from '../../../services/processing/logic/dynamicTable.processor.js';
    import { isAdmin } from '../../../stores.js';
    import SortableTh from '../../common/SortableTh.svelte';

    export let config = {};
    export let reportData = [];
    export let colorTheme = 'blue';

    const dispatch = createEventDispatcher();
    let sortKey = 'hoTen';
    let sortDirection = 'asc';
    
    $: processedResult = dynamicTableProcessor.processTableData(reportData, config);
    $: tableData = processedResult.processedData;
    $: totals = processedResult.totals;

    // Biến phản ứng kiểm tra cấu hình chia cột
    $: hasSplit = config?.mainColumn?.showSL || config?.columns?.some(c => c.showSL) || false;

    // Chặn hàm sort của processor, viết lại sort cục bộ để bắt được logic _sl
    $: sortedData = customSort(tableData, sortKey, sortDirection);
    
    function customSort(data, key, dir) {
        return [...data].sort((a, b) => {
            if (key === 'hoTen') {
                return dir === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
            }
            let valA = 0, valB = 0;
            if (key.endsWith('_sl')) { 
                const baseKey = key.replace('_sl', '');
                valA = a.cells[baseKey]?.sl ?? (baseKey === 'mainValue' ? a.mainValue_sl : 0) ?? 0;
                valB = b.cells[baseKey]?.sl ?? (baseKey === 'mainValue' ? b.mainValue_sl : 0) ?? 0;
            } else {
                valA = a.cells[key]?.value ?? a[key] ?? 0;
                valB = b.cells[key]?.value ?? b[key] ?? 0;
            }
            return dir === 'asc' ? valA - valB : valB - valA;
        });
    }

    function handleSort(event) {
        const key = event.detail;
        if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        else { sortKey = key; sortDirection = 'desc'; }
    }

    const themeMap = {
        blue: { header: 'bg-blue-50 border-blue-200', title: 'text-blue-800' },
        green: { header: 'bg-green-50 border-green-200', title: 'text-green-800' },
        orange: { header: 'bg-orange-50 border-orange-200', title: 'text-orange-800' },
        purple: { header: 'bg-purple-50 border-purple-200', title: 'text-purple-800' },
        teal: { header: 'bg-teal-50 border-teal-200', title: 'text-teal-800' },
    };
    $: theme = themeMap[colorTheme] || themeMap.blue;
    
    function formatMainValue(value, type) {
        if (!value && value !== 0) return '-';
        if (type === 'SL') return formatters.formatNumber(value);
        return formatters.formatRevenue(value);
    }

    function getValueColor(cell) {
        if (!cell || !cell.config) return '';
        const targetVal = cell.config.target || 0; 
        
        if (cell.config.type === 'PERCENT') {
            const currentVal = cell.value * 100;
            if (targetVal > 0) return currentVal >= targetVal ? 'text-blue-600 font-bold' : 'text-red-600 font-bold bg-red-50';
            return 'text-red-600 font-bold'; 
        }
        
        if (targetVal > 0) {
            const compareVal = cell.config.type === 'SL' ? cell.value : cell.value / 1000;
            if (compareVal < targetVal) return 'text-red-600 font-semibold bg-red-50';
        }

        if (cell.config.type === 'SL') return 'text-gray-800 font-semibold'; 
        return 'text-blue-700 font-semibold'; 
    }
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col transition-all hover:shadow-md relative group/card">
    
    <div class="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-1 z-20 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm border border-gray-100">
        {#if !config.isSystem || $isAdmin}
            <button class="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Sửa" on:click|stopPropagation={() => dispatch('edit', config)}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button class="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Xóa" on:click|stopPropagation={() => dispatch('delete', config.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        {/if}
    </div>

    <div class="px-5 py-3 border-b {theme.header} flex justify-between items-center">
        <h4 class="text-base font-bold uppercase {theme.title} flex items-center gap-2" title={config.title}>
            <i data-feather="bar-chart-2" class="w-4 h-4"></i> {config.title}
        </h4>
    </div>

    {#if sortedData.length === 0}
        <div class="flex-grow flex items-center justify-center p-8 bg-slate-50/30">
             <p class="text-gray-400 italic text-sm">Chưa có phát sinh dữ liệu.</p>
        </div>
    {:else}
        <div class="overflow-x-auto flex-grow custom-scrollbar relative">
            <table class="min-w-full text-sm border-collapse border-0">
                <thead class="bg-gray-50 text-xs uppercase text-gray-600 font-bold sticky top-0 z-20 shadow-sm">
                    <tr>
                        <SortableTh 
                            key="hoTen" 
                            label="Nhân viên" 
                            className="sticky left-0 z-30 bg-gray-100 border-r border-gray-300 min-w-[150px] {hasSplit ? 'border-b-0 pb-0' : 'border-b'}" 
                            {sortKey} {sortDirection} 
                            on:sort={handleSort} 
                        />
                       
                        {#if config.mainColumn}
                            {#if config.mainColumn.showSL}
                                <th colspan="2" class="px-2 py-2 text-center border-r border-b border-gray-300 font-bold uppercase bg-orange-50 text-orange-800 align-middle">
                                    {config.mainColumn.header || 'Tổng cộng'}
                                </th>
                            {:else}
                                <SortableTh 
                                    key="mainValue" 
                                    label={config.mainColumn.header || 'Tổng cộng'} 
                                    align="right"
                                    className="bg-orange-50 text-orange-800 border-r border-gray-300 min-w-[100px] {hasSplit ? 'border-b-0 pb-0' : 'border-b'}" 
                                    {sortKey} {sortDirection} 
                                    on:sort={handleSort} 
                                />
                            {/if}
                        {/if}

                        {#each config.columns as col, index (col.id || 'head_fallback_' + index)}
                            {@const hexColor = col.color || '#3b82f6'}
                            {#if col.showSL}
                                <th colspan="2" class="px-2 py-2 text-center border-r border-b border-gray-300 font-bold uppercase align-middle" style="color: {hexColor}; background-color: {hexColor}1a;">
                                    {col.header}
                                </th>
                            {:else}
                                <SortableTh 
                                    key={col.id || 'head_fallback_' + index} 
                                    label={col.header} 
                                    align="right" 
                                    themeColor={hexColor}
                                    className="border-r border-gray-200 min-w-[100px] bg-white {hasSplit ? 'border-b-0 pb-0' : 'border-b'}" 
                                    {sortKey} {sortDirection} 
                                    on:sort={handleSort} 
                                />
                            {/if}
                        {/each}
                    </tr>
                    
                    {#if hasSplit}
                    <tr>
                        <th class="sticky left-0 z-30 bg-gray-100 border-r border-b border-gray-300 min-w-[150px] border-t-0 pt-0"></th>
                        
                        {#if config.mainColumn}
                            {#if config.mainColumn.showSL}
                                <SortableTh 
                                    key="mainValue_sl" 
                                    label="SL" 
                                    align="right"
                                    className="bg-orange-50 text-orange-800 border-r border-b border-gray-300 min-w-[70px]" 
                                    {sortKey} {sortDirection} 
                                    on:sort={handleSort} 
                                />
                                <SortableTh 
                                    key="mainValue" 
                                    label={config.mainColumn.type === 'DTQD' ? 'DTQĐ' : 'DT'} 
                                    align="right"
                                    className="bg-orange-50 text-orange-800 border-r border-b border-gray-300 min-w-[90px]" 
                                    {sortKey} {sortDirection} 
                                    on:sort={handleSort} 
                                />
                            {:else}
                                <th class="bg-orange-50 border-r border-b border-gray-300 min-w-[100px] border-t-0 pt-0"></th>
                            {/if}
                        {/if}

                        {#each config.columns as col, index (col.id || 'subhead_fallback_' + index)}
                            {@const hexColor = col.color || '#3b82f6'}
                            {#if col.showSL}
                                <SortableTh 
                                    key={(col.id || 'head_fallback_' + index) + '_sl'} 
                                    label="SL" 
                                    align="right" 
                                    themeColor={hexColor}
                                    className="border-r border-b border-gray-200 min-w-[70px] bg-white" 
                                    {sortKey} {sortDirection} 
                                    on:sort={handleSort} 
                                />
                                <SortableTh 
                                    key={col.id || 'head_fallback_' + index} 
                                    label={col.type === 'DTQD' ? 'DTQĐ' : 'DT'} 
                                    align="right" 
                                    themeColor={hexColor}
                                    className="border-r border-b border-gray-200 min-w-[90px] bg-white" 
                                    {sortKey} {sortDirection} 
                                    on:sort={handleSort} 
                                />
                            {:else}
                                <!-- [Surgical Fix]: Đồng bộ màu nền background-color cho thẻ lấp khoảng trống -->
                                <th class="border-r border-b border-gray-200 min-w-[100px] border-t-0 pt-0" style="background-color: {hexColor}1a;"></th>
                            {/if}
                        {/each}
                    </tr>
                    {/if}
                </thead>

                <tbody class="divide-y divide-gray-100">
                    {#each sortedData as row (row.maNV)}
                        <tr class="hover:bg-blue-50/50 transition-colors group">
                            <td class="px-3 py-2 font-semibold text-gray-700 border-r border-b border-gray-300 bg-white group-hover:bg-blue-50/50 sticky left-0 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span class="text-blue-700 text-sm leading-relaxed" title="{row.hoTen} - {row.maNV}">
                                    {formatters.getShortEmployeeName(row.hoTen, row.maNV)}
                                </span>
                            </td>

                            {#if config.mainColumn}
                                {#if config.mainColumn.showSL}
                                    <td class="px-2 py-2 text-right border-r border-b border-gray-300 bg-orange-50/30 text-gray-800 font-semibold group-hover:bg-orange-50">
                                        {row.mainValue_sl !== undefined ? formatters.formatNumber(row.mainValue_sl) : '-'}
                                    </td>
                                    <td class="px-2 py-2 text-right border-r border-b border-gray-300 bg-orange-50/30 font-bold text-orange-700 group-hover:bg-orange-50">
                                        {formatMainValue(row.mainValue, config.mainColumn.type)}
                                    </td>
                                {:else}
                                    <td class="px-2 py-2 text-right border-r border-b border-gray-300 bg-orange-50/30 font-bold text-orange-700 group-hover:bg-orange-50">
                                        {formatMainValue(row.mainValue, config.mainColumn.type)}
                                    </td>
                                {/if}
                            {/if}

                            {#each config.columns as col, index (col.id || 'body_fallback_' + index)}
                                {@const cell = row.cells[col.id || 'body_fallback_' + index]}
                                {#if col.showSL}
                                    <td class="px-2 py-2 text-right border-r border-gray-200 border-b text-gray-800 font-semibold">
                                        {cell && cell.sl !== undefined ? formatters.formatNumber(cell.sl) : '-'}
                                    </td>
                                    <td class="px-2 py-2 text-right border-r border-gray-200 border-b {getValueColor(cell)}">
                                        {cell ? cell.display : '-'}
                                    </td>
                                {:else}
                                    <td class="px-2 py-2 text-right border-r border-gray-200 border-b {getValueColor(cell)}">
                                        {cell ? cell.display : '-'}
                                    </td>
                                {/if}
                            {/each}
                        </tr>
                    {/each}
                </tbody>

                <tfoot class="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300 sticky bottom-0 z-20">
                    <tr>
                        <td class="px-3 py-2 sticky left-0 bg-gray-200 z-30 border-r border-gray-300">TỔNG</td>
  
                        {#if config.mainColumn}
                            {#if config.mainColumn.showSL}
                                <td class="px-2 py-2 text-right border-r border-gray-300 bg-orange-100 text-gray-800">
                                    {totals.mainValue_sl !== undefined ? formatters.formatNumber(totals.mainValue_sl) : '-'}
                                </td>
                                <td class="px-2 py-2 text-right border-r border-gray-300 bg-orange-100 text-orange-800">
                                    {formatMainValue(totals.mainValue, config.mainColumn.type)}
                                </td>
                            {:else}
                                <td class="px-2 py-2 text-right border-r border-gray-300 bg-orange-100 text-orange-800">
                                    {formatMainValue(totals.mainValue, config.mainColumn.type)}
                                </td>
                            {/if}
                        {/if}

                        {#each config.columns as col, index (col.id || 'foot_fallback_' + index)}
                            {@const cell = totals.cells[col.id || 'foot_fallback_' + index]}
                            {#if col.showSL}
                                <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-100" style="color: {col.color || '#3b82f6'}">
                                    {cell && cell.sl !== undefined ? formatters.formatNumber(cell.sl) : '-'}
                                </td>
                                <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-100" style="color: {col.color || '#3b82f6'}">
                                    {cell ? cell.display : '-'}
                                </td>
                            {:else}
                                <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-100" style="color: {col.color || '#3b82f6'}">
                                    {cell ? cell.display : '-'}
                                </td>
                            {/if}
                        {/each}
                    </tr>
                </tfoot>
            </table>
        </div>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
</style>