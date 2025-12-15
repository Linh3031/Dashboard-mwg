<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { isAdmin } from '../../stores.js';
  import { dynamicTableProcessor } from '../../services/processing/logic/dynamicTable.processor.js';
  
  // Import components con
  import DynamicTableHeader from './revenue/DynamicTableHeader.svelte';
  import DynamicTableRow from './revenue/DynamicTableRow.svelte';
  
  export let config;
  export let reportData = []; 
  export let colorTheme = 'blue'; 

  const dispatch = createEventDispatcher();

  let sortKey = 'mainValue'; 
  let sortDirection = 'desc';

  // [FIX] Fallback an toàn cho metrics
  $: tableMetrics = config.mainColumn?.metrics || config.tableMetrics || {
      sl: false, dt: true, dtqd: false
  };

  // 1. Xử lý dữ liệu
  $: processedResult = dynamicTableProcessor.processTableData(reportData, config);
  $: processedData = processedResult.processedData;
  $: totals = processedResult.totals;

  // 2. Sắp xếp dữ liệu
  $: sortedData = dynamicTableProcessor.sortTableData(processedData, sortKey, sortDirection);

  function handleSort(event) {
      const key = event.detail;
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }
  
  function handleManualSort(event) {
      const key = event.detail;
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'asc'; }
  }

  const themeMap = {
      blue: { header: 'bg-blue-50 border-blue-200', title: 'text-blue-800' },
      green: { header: 'bg-green-50 border-green-200', title: 'text-green-800' },
      orange: { header: 'bg-orange-50 border-orange-200', title: 'text-orange-800' },
      purple: { header: 'bg-purple-50 border-purple-200', title: 'text-purple-800' },
      teal: { header: 'bg-teal-50 border-teal-200', title: 'text-teal-800' },
      indigo: { header: 'bg-indigo-50 border-indigo-200', title: 'text-indigo-800' },
      rose: { header: 'bg-rose-50 border-rose-200', title: 'text-rose-800' },
  };
  $: theme = themeMap[colorTheme] || themeMap.blue;
  
  $: totalColSpan = (tableMetrics.sl ? 1 : 0) + (tableMetrics.dt ? 1 : 0) + (tableMetrics.dtqd ? 1 : 0);
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col transition-all hover:shadow-md relative group/card">
    
    {#if $isAdmin || !config.isSystem}
        <div class="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-1 z-10 bg-white/80 backdrop-blur rounded-lg p-1 shadow-sm border border-gray-100">
            {#if !config.isSystem}<button class="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Chỉnh sửa" on:click|stopPropagation={() => dispatch('edit')}><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>{/if}
            <button class="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title={config.isSystem ? "Xóa bảng hệ thống" : "Xóa bảng"} on:click|stopPropagation={() => dispatch('delete')}><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
    {/if}

    <div class="px-5 py-4 border-b {theme.header} flex justify-between items-center">
        <div class="flex items-center gap-3 w-full">
            <h4 class="text-lg font-bold uppercase {theme.title} truncate" title={config.title}>{config.title}</h4>
        </div>
    </div>
    
    {#if sortedData.length === 0}
        <div class="flex-grow flex items-center justify-center p-8 bg-slate-50/30">
             <p class="text-gray-400 italic text-sm">Chưa có phát sinh dữ liệu.</p>
        </div>
    {:else}
        <div class="overflow-x-auto flex-grow custom-scrollbar relative">
            <table class="min-w-full text-sm border-collapse border-0">
                
                <DynamicTableHeader 
                    {config} {tableMetrics} {totalColSpan} {sortKey} {sortDirection}
                    on:sort={handleSort}
                    on:manualSort={handleManualSort}
                />

                <tbody class="divide-y divide-gray-100">
                    {#each sortedData as item (item.maNV)}
                        <DynamicTableRow {item} {config} {tableMetrics} />
                    {/each}
                </tbody>

                <tfoot class="bg-gray-100 font-bold text-gray-800 border-t border-gray-300 sticky bottom-0 z-20">
                    <tr>
                        <td class="px-5 py-2 sticky left-0 bg-gray-200 z-30 border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TỔNG</td>
                        
                        {#if tableMetrics.sl}
                              <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-200">
                                  {formatters.formatNumber(totals.cells?.mainValue?.value_sl || totals.mainValue_sl)}
                              </td>
                        {/if}
                        {#if tableMetrics.dt}
                             <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-200 text-blue-800">
                                 {formatters.formatRevenue(totals.cells?.mainValue?.value || totals.mainValue)}
                             </td>
                        {/if}
                        {#if tableMetrics.dtqd}
                            <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-200 text-purple-800">
                                {formatters.formatRevenue(totals.cells?.mainValue?.value_dtqd || totals.mainValue_dtqd)}
                            </td>
                        {/if}

                        {#each config.subColumns as col}
                            {@const total = totals.cells ? (totals.cells[col.id] || totals.cells[col.header]) : null}
                            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                            
                            {#if metrics.sl}
                                <td class="px-2 py-2 text-right border-r border-gray-300">{formatters.formatNumber(total?.value_sl || total?.sl)}</td>
                            {/if}
                            {#if metrics.dt}
                                <td class="px-2 py-2 text-right border-r border-gray-300 text-blue-700">{formatters.formatRevenue(total?.value || total?.dt)}</td>
                            {/if}
                            {#if metrics.dtqd}
                                <td class="px-2 py-2 text-right border-r border-gray-300 text-purple-700">{formatters.formatRevenue(total?.value_dtqd || total?.dtqd)}</td>
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