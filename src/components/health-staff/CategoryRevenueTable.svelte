<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { cleanCategoryName } from '../../utils.js';
  import SortableTh from '../common/SortableTh.svelte';
  import { isAdmin } from '../../stores.js';
  
  export let config; 
  export let reportData = []; 
  export let colorTheme = 'blue'; 

  const dispatch = createEventDispatcher();

  let sortKey = 'mainValue'; 
  let sortDirection = 'desc';

  $: tableMetrics = config.tableMetrics || { sl: false, dt: true, dtqd: false };

  const getFormat = (val, metricType) => {
      if (metricType === 'quantity') return formatters.formatNumber(val);
      return formatters.formatRevenue(val);
  };

  const normalizeStr = (str) => {
      if (!str) return '';
      return str.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
          .replace(/\s+/g, '') 
          .replace(/[^\w\d]/g, '');
  };

  // [FIX] Tìm kiếm đúng vào object chi tiết của NHÂN VIÊN
  const findItemData = (employee, rawName) => {
      const target = normalizeStr(rawName);

      const scanObject = (obj) => {
          if (!obj) return null;
          const foundKey = Object.keys(obj).find(key => {
              const current = normalizeStr(key);
              return current.includes(target) || target.includes(current);
          });
          return foundKey ? obj[foundKey] : null;
      };

      // 1. Tìm trong Nhóm Hàng (doanhThuTheoNhomHang - Tên đúng)
      let result = scanObject(employee.doanhThuTheoNhomHang);
      if (result) return result;

      // 2. Tìm trong Ngành Hàng (doanhThuTheoNganhHang - Tên đúng)
      result = scanObject(employee.doanhThuTheoNganhHang);
      return result;
  };

  $: processedData = reportData.map(employee => {
      const row = {
          maNV: employee.maNV,
          hoTen: employee.hoTen,
          mainValue: 0, 
          columns: {} 
      };

      let hasData = false;

      if (config.subColumns && Array.isArray(config.subColumns)) {
          config.subColumns.forEach(col => {
              const metrics = col.metrics || { sl: false, dt: true, dtqd: false };
              let sl = 0, dt = 0, dtqd = 0;
              let details = [];

              col.items.forEach(rawItemName => {
                  const itemData = findItemData(employee, rawItemName);
                  if (itemData) {
                      const qty = itemData.quantity || 0;
                      const rev = itemData.revenue || 0;
                      const revQd = itemData.revenueQuyDoi || 0;

                      sl += qty;
                      dt += rev;
                      dtqd += revQd;
                      
                      if (qty > 0 || rev > 0) {
                          hasData = true;
                          details.push(`${rawItemName}: ${formatters.formatNumber(qty)} / ${formatters.formatRevenue(rev)}`);
                      }
                  }
              });

              row.columns[col.header] = {
                  sl, dt, dtqd,
                  tooltip: details.length > 0 ? details.join('\n') : null
              };
              
              if (metrics.dt) row.mainValue += dt;
              else if (metrics.dtqd) row.mainValue += dtqd;
              else row.mainValue += sl;
          });
      }

      return hasData ? row : null;
  }).filter(Boolean);

  $: totals = processedData.reduce((acc, row) => {
      acc.mainValue += row.mainValue;
      Object.keys(row.columns).forEach(key => {
          if (!acc.columns[key]) acc.columns[key] = { sl: 0, dt: 0, dtqd: 0 };
          acc.columns[key].sl += row.columns[key].sl;
          acc.columns[key].dt += row.columns[key].dt;
          acc.columns[key].dtqd += row.columns[key].dtqd;
          
          acc.totalSL += row.columns[key].sl;
          acc.totalDT += row.columns[key].dt;
          acc.totalDTQD += row.columns[key].dtqd;
      });
      return acc;
  }, { totalSL: 0, totalDT: 0, totalDTQD: 0, mainValue: 0, columns: {} });

  function handleSort(event) {
      const key = event.detail;
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }

  $: sortedData = [...processedData].sort((a, b) => {
      if (sortKey === 'hoTen') return sortDirection === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
      if (sortKey.includes('|')) {
          const [colHeader, type] = sortKey.split('|');
          const valA = a.columns[colHeader]?.[type] || 0;
          const valB = b.columns[colHeader]?.[type] || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc' ? a.mainValue - b.mainValue : b.mainValue - a.mainValue;
  });

  const themeMap = {
      blue: { header: 'bg-blue-50 border-blue-200', title: 'text-blue-800', badge: 'bg-blue-100 text-blue-700' },
      green: { header: 'bg-green-50 border-green-200', title: 'text-green-800', badge: 'bg-green-100 text-green-700' },
      orange: { header: 'bg-orange-50 border-orange-200', title: 'text-orange-800', badge: 'bg-orange-100 text-orange-700' },
      purple: { header: 'bg-purple-50 border-purple-200', title: 'text-purple-800', badge: 'bg-purple-100 text-purple-700' },
      teal: { header: 'bg-teal-50 border-teal-200', title: 'text-teal-800', badge: 'bg-teal-100 text-teal-700' },
      indigo: { header: 'bg-indigo-50 border-indigo-200', title: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-700' },
      rose: { header: 'bg-rose-50 border-rose-200', title: 'text-rose-800', badge: 'bg-rose-100 text-rose-700' },
  };
  $: theme = themeMap[colorTheme] || themeMap.blue;
  $: totalColSpan = (tableMetrics.sl ? 1 : 0) + (tableMetrics.dt ? 1 : 0) + (tableMetrics.dtqd ? 1 : 0);
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col transition-all hover:shadow-md relative group/card">
    
    {#if !config.isSystem || $isAdmin}
        <div class="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-1 z-10 bg-white/80 backdrop-blur rounded-lg p-1 shadow-sm border border-gray-100">
            {#if !config.isSystem}<button class="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Chỉnh sửa" on:click|stopPropagation={() => dispatch('edit')}><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>{/if}
            <button class="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title={config.isSystem ? "Xóa bảng hệ thống" : "Xóa bảng"} on:click|stopPropagation={() => dispatch('delete')}><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
    {/if}

    <div class="px-5 py-4 border-b {theme.header} flex justify-between items-center">
        <div class="flex items-center gap-3 w-full">
            <h4 class="text-lg font-bold uppercase {theme.title} truncate" title={config.title}>{config.title}</h4>
            <div class="ml-auto flex gap-3 text-xs font-medium opacity-80">
                {#if tableMetrics.sl}
                     <span class="text-gray-600">SL: {formatters.formatNumber(totals.totalSL)}</span>
                {/if}
                {#if tableMetrics.dt}
                    <span class="{theme.title}">{formatters.formatRevenue(totals.totalDT)}</span>
                {/if}
                {#if tableMetrics.dtqd}
                    <span class="text-purple-600">{formatters.formatRevenue(totals.totalDTQD)} (QĐ)</span>
                {/if}
            </div>
        </div>
    </div>
    
    {#if sortedData.length === 0}
        <div class="flex-grow flex items-center justify-center p-8 bg-slate-50/30">
             <p class="text-gray-400 italic text-sm">Chưa có phát sinh dữ liệu.</p>
        </div>
    {:else}
        <div class="overflow-x-auto flex-grow custom-scrollbar relative">
            <table class="min-w-full text-sm border-collapse">
                <thead class="bg-gray-50 text-xs uppercase text-gray-600 font-bold sticky top-0 z-20 shadow-sm">
                    <tr>
                        <SortableTh key="hoTen" label="Nhân viên" className="pl-5 min-w-[150px] sticky left-0 z-30 bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" {sortKey} {sortDirection} on:sort={handleSort} rowspan={2} />
                        
                        {#each config.subColumns as col}
                            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                            {@const colSpan = (metrics.sl ? 1 : 0) + (metrics.dt ? 1 : 0) + (metrics.dtqd ? 1 : 0)}
                            {#if colSpan > 0}
                                <th colspan={colSpan} class="px-2 py-2 text-center border-b border-l border-gray-200 text-gray-800 bg-gray-100">
                                    {col.header}
                                </th>
                            {/if}
                        {/each}

                        {#if totalColSpan > 0}
                            <th colspan={totalColSpan} class="px-2 py-2 text-center border-b border-l border-gray-200 text-gray-800 bg-gray-200">
                                TỔNG
                            </th>
                        {/if}
                    </tr>
                    <tr>
                        {#each config.subColumns as col}
                            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                            {#if metrics.sl}
                                <SortableTh key={`${col.header}|sl`} label="SL" align="right" className="min-w-[60px] text-gray-500 bg-white border-l" {sortKey} {sortDirection} on:sort={handleSort} />
                            {/if}
                            {#if metrics.dt}
                                <SortableTh key={`${col.header}|dt`} label="DT" align="right" className="min-w-[80px] text-blue-600 bg-white border-l" {sortKey} {sortDirection} on:sort={handleSort} />
                            {/if}
                            {#if metrics.dtqd}
                                <SortableTh key={`${col.header}|dtqd`} label="QĐ" align="right" className="min-w-[80px] text-purple-600 bg-white border-l" {sortKey} {sortDirection} on:sort={handleSort} />
                            {/if}
                        {/each}

                        {#if tableMetrics.sl}
                             <SortableTh key="totalSL" label="SL" align="right" className="min-w-[60px] text-gray-600 bg-gray-50 border-l" {sortKey} {sortDirection} on:sort={handleSort} />
                        {/if}
                        {#if tableMetrics.dt}
                             <SortableTh key="mainValue" label="DT" align="right" className="min-w-[80px] text-blue-800 bg-gray-50 border-l" {sortKey} {sortDirection} on:sort={handleSort} />
                        {/if}
                        {#if tableMetrics.dtqd}
                             <SortableTh key="totalDTQD" label="QĐ" align="right" className="min-w-[80px] text-purple-800 bg-gray-50 border-l" {sortKey} {sortDirection} on:sort={handleSort} />
                        {/if}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    {#each sortedData as item (item.maNV)}
                        <tr class="hover:bg-blue-50/50 transition-colors group">
                            <td class="px-5 py-2 font-semibold text-gray-700 border-r border-gray-100 bg-white group-hover:bg-blue-50/50 sticky left-0 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span class="text-blue-700">{formatters.getShortEmployeeName(item.hoTen, item.maNV).split(' - ')[0]}</span>
                            </td>
                            
                            {#each config.subColumns as col}
                                {@const cell = item.columns[col.header]}
                                {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                                {#if metrics.sl}
                                    <td class="px-2 py-2 text-right border-l border-gray-100 text-gray-600">{formatters.formatNumber(cell?.sl)}</td>
                                {/if}
                                {#if metrics.dt}
                                    <td class="px-2 py-2 text-right border-l border-gray-100 font-bold text-gray-800">{formatters.formatRevenue(cell?.dt)}</td>
                                {/if}
                                {#if metrics.dtqd}
                                    <td class="px-2 py-2 text-right border-l border-gray-100 font-bold text-purple-600">{formatters.formatRevenue(cell?.dtqd)}</td>
                                {/if}
                            {/each}

                            {#if tableMetrics.sl}
                                <td class="px-2 py-2 text-right font-bold text-gray-600 bg-gray-50/30 border-l border-gray-100">{formatters.formatNumber(item.columns['total']?.sl || totals.totalSL)}</td>
                            {/if}
                            {#if tableMetrics.dt}
                                <td class="px-2 py-2 text-right font-bold text-blue-800 bg-gray-50/30 border-l border-gray-100">{formatters.formatRevenue(item.mainValue)}</td>
                            {/if}
                            {#if tableMetrics.dtqd}
                                <td class="px-2 py-2 text-right font-bold text-purple-800 bg-gray-50/30 border-l border-gray-100">{formatters.formatRevenue(item.mainValue_dtqd || totals.totalDTQD)}</td>
                            {/if}
                        </tr>
                    {/each}
                </tbody>
                <tfoot class="bg-gray-100 font-bold text-gray-800 border-t border-gray-200 sticky bottom-0 z-20">
                    <tr>
                        <td class="px-5 py-2 sticky left-0 bg-gray-100 z-30 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TỔNG</td>
                        {#each config.subColumns as col}
                            {@const total = totals.columns[col.header]}
                            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                            {#if metrics.sl}
                                <td class="px-2 py-2 text-right border-l border-gray-200">{formatters.formatNumber(total?.sl)}</td>
                            {/if}
                            {#if metrics.dt}
                                <td class="px-2 py-2 text-right border-l border-gray-200 text-blue-700">{formatters.formatRevenue(total?.dt)}</td>
                            {/if}
                            {#if metrics.dtqd}
                                <td class="px-2 py-2 text-right border-l border-gray-200 text-purple-700">{formatters.formatRevenue(total?.dtqd)}</td>
                            {/if}
                        {/each}
                        
                        {#if tableMetrics.sl}
                             <td class="px-2 py-2 text-right border-l border-gray-300">{formatters.formatNumber(totals.totalSL)}</td>
                        {/if}
                        {#if tableMetrics.dt}
                             <td class="px-2 py-2 text-right border-l border-gray-300 text-blue-800">{formatters.formatRevenue(totals.totalDT)}</td>
                        {/if}
                        {#if tableMetrics.dtqd}
                             <td class="px-2 py-2 text-right border-l border-gray-300 text-purple-800">{formatters.formatRevenue(totals.totalDTQD)}</td>
                        {/if}
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