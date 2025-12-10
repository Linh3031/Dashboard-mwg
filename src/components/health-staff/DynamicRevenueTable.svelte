<script>
  import { createEventDispatcher } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import SortableTh from '../common/SortableTh.svelte';
  import { isAdmin } from '../../stores.js';
  
  export let config; 
  export let reportData = []; 
  export let colorTheme = 'blue'; 

  const dispatch = createEventDispatcher();

  let sortKey = 'mainValue'; 
  let sortDirection = 'desc';

  // Đảm bảo object tableMetrics luôn tồn tại và có giá trị mặc định
  $: tableMetrics = {
      sl: config.tableMetrics?.sl ?? false,
      dt: config.tableMetrics?.dt ?? true, // Mặc định hiện DT nếu k có config
      dtqd: config.tableMetrics?.dtqd ?? false
  };

  // Helper: Màu sắc header phụ
  const getSubHeaderColor = (index) => {
      const colors = [
          'bg-indigo-100 text-indigo-900 border-indigo-200', 
          'bg-emerald-100 text-emerald-900 border-emerald-200', 
          'bg-amber-100 text-amber-900 border-amber-200', 
          'bg-rose-100 text-rose-900 border-rose-200', 
          'bg-cyan-100 text-cyan-900 border-cyan-200'
      ];
      return colors[index % colors.length];
  };

  const normalizeStr = (str) => {
      if (!str) return '';
      return str.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
          .replace(/\s+/g, '') 
          .replace(/[^\w\d]/g, '');
  };

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
      let result = scanObject(employee.doanhThuTheoNhomHang);
      if (result) return result;
      result = scanObject(employee.doanhThuTheoNganhHang);
      return result;
  };

  $: processedData = reportData.map(employee => {
      const row = {
          maNV: employee.maNV,
          hoTen: employee.hoTen,
          mainValue: 0,
          mainValue_dtqd: 0,
          mainValue_sl: 0,
          columns: {} 
      };

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
                          details.push(`${rawItemName}: ${formatters.formatNumber(qty)} / ${formatters.formatRevenue(rev)}`);
                      }
                  }
              });

              row.columns[col.header] = { sl, dt, dtqd, tooltip: details.join('\n') };
              
              if (metrics.dt) row.mainValue += dt;
              if (metrics.dtqd) row.mainValue_dtqd += dtqd;
              if (metrics.sl) row.mainValue_sl += sl;
              
              // Fallback: Nếu không chọn metric nào thì cộng SL vào mainValue (để sort)
              if (!metrics.dt && !metrics.dtqd && !metrics.sl) row.mainValue += sl;
          });
      }
      // Chỉ hiện nhân viên có số liệu (SL > 0 hoặc DT > 0)
      return (row.mainValue > 0 || row.mainValue_sl > 0 || row.mainValue_dtqd > 0) ? row : null;
  }).filter(Boolean);

  $: totals = processedData.reduce((acc, row) => {
      acc.mainValue += row.mainValue;
      acc.mainValue_dtqd += row.mainValue_dtqd;
      acc.mainValue_sl += row.mainValue_sl;

      Object.keys(row.columns).forEach(key => {
          if (!acc.columns[key]) acc.columns[key] = { sl: 0, dt: 0, dtqd: 0 };
          acc.columns[key].sl += row.columns[key].sl;
          acc.columns[key].dt += row.columns[key].dt;
          acc.columns[key].dtqd += row.columns[key].dtqd;
      });
      return acc;
  }, { mainValue: 0, mainValue_dtqd: 0, mainValue_sl: 0, columns: {} });

  function handleSort(event) {
      const key = event.detail;
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }
  
  // Hàm sort thủ công cho cột Tên (vì không dùng SortableTh)
  function handleManualSort(key) {
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'asc'; } // Default asc cho tên
  }

  $: sortedData = [...processedData].sort((a, b) => {
      if (sortKey === 'hoTen') return sortDirection === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
      if (sortKey === 'mainValue') return sortDirection === 'asc' ? a.mainValue - b.mainValue : b.mainValue - a.mainValue;
      if (sortKey === 'totalSL') return sortDirection === 'asc' ? a.mainValue_sl - b.mainValue_sl : b.mainValue_sl - a.mainValue_sl;
      if (sortKey === 'totalDTQD') return sortDirection === 'asc' ? a.mainValue_dtqd - b.mainValue_dtqd : b.mainValue_dtqd - a.mainValue_dtqd;

      if (sortKey.includes('|')) {
          const [colHeader, type] = sortKey.split('|');
          const valA = a.columns[colHeader]?.[type] || 0;
          const valB = b.columns[colHeader]?.[type] || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc' ? a.mainValue - b.mainValue : b.mainValue - a.mainValue;
  });

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
    
    {#if !config.isSystem || $isAdmin}
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
                <thead class="bg-gray-50 text-xs uppercase text-gray-600 font-bold sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th 
                            class="px-4 py-2 pl-5 min-w-[180px] sticky left-0 z-30 bg-gray-100 border-r border-b border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-gray-200 transition select-none text-left"
                            rowspan="2"
                            on:click={() => handleManualSort('hoTen')}
                        >
                            <div class="flex items-center gap-1 justify-start">
                                <span class="font-bold uppercase text-xs {sortKey === 'hoTen' ? 'text-blue-800' : 'text-slate-700'}">Nhân viên</span>
                                <span class="flex flex-col items-center justify-center w-4 h-4">
                                    {#if sortKey !== 'hoTen'}
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-gray-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                                    {:else if sortDirection === 'asc'}
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg>
                                    {:else}
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                    {/if}
                                </span>
                            </div>
                        </th>
                        
                        {#if totalColSpan > 0}
                            <th colspan={totalColSpan} class="px-2 py-2 text-center border-b border-r border-gray-300 text-gray-900 bg-gray-200">
                                TỔNG HỢP
                            </th>
                        {/if}

                        {#each config.subColumns as col, index}
                            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                            {@const colSpan = (metrics.sl ? 1 : 0) + (metrics.dt ? 1 : 0) + (metrics.dtqd ? 1 : 0)}
                            {#if colSpan > 0}
                                <th colspan={colSpan} class="px-2 py-2 text-center border-b border-r border-gray-200 {getSubHeaderColor(index)}">
                                    {col.header}
                                </th>
                            {/if}
                        {/each}
                    </tr>

                    <tr>
                        {#if tableMetrics.sl}
                            <SortableTh key="totalSL" label="SL" align="right" className="min-w-[60px] text-gray-700 bg-gray-100 border-r border-gray-300 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
                        {/if}
                        {#if tableMetrics.dt}
                             <SortableTh key="mainValue" label="DT" align="right" className="min-w-[80px] text-blue-800 bg-gray-100 border-r border-gray-300 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
                        {/if}
                        {#if tableMetrics.dtqd}
                              <SortableTh key="totalDTQD" label="QĐ" align="right" className="min-w-[80px] text-purple-800 bg-gray-100 border-r border-gray-300 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
                        {/if}

                        {#each config.subColumns as col}
                            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                            {#if metrics.sl}
                                <SortableTh key={`${col.header}|sl`} label="SL" align="right" className="min-w-[60px] text-gray-500 bg-white border-r border-gray-200 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
                            {/if}
                            {#if metrics.dt}
                                <SortableTh key={`${col.header}|dt`} label="DT" align="right" className="min-w-[80px] text-blue-600 bg-white border-r border-gray-200 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
                            {/if}
                            {#if metrics.dtqd}
                                <SortableTh key={`${col.header}|dtqd`} label="QĐ" align="right" className="min-w-[80px] text-purple-600 bg-white border-r border-gray-200 border-b" {sortKey} {sortDirection} on:sort={handleSort} />
                            {/if}
                        {/each}
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-100">
                    {#each sortedData as item (item.maNV)}
                        <tr class="hover:bg-blue-50/50 transition-colors group">
                            <td class="px-5 py-2 font-semibold text-gray-700 border-r border-b border-gray-300 bg-white group-hover:bg-blue-50/50 sticky left-0 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span class="text-blue-700">{formatters.getShortEmployeeName(item.hoTen, item.maNV)}</span>
                            </td>
                            
                            {#if tableMetrics.sl}
                                <td class="px-2 py-2 text-right font-bold text-gray-800 bg-gray-50/50 border-r border-gray-300 border-b">{formatters.formatNumber(item.mainValue_sl)}</td>
                            {/if}
                            {#if tableMetrics.dt}
                                <td class="px-2 py-2 text-right font-bold text-blue-800 bg-gray-50/50 border-r border-gray-300 border-b">{formatters.formatRevenue(item.mainValue)}</td>
                            {/if}
                            {#if tableMetrics.dtqd}
                                <td class="px-2 py-2 text-right font-bold text-purple-800 bg-gray-50/50 border-r border-gray-300 border-b">{formatters.formatRevenue(item.mainValue_dtqd)}</td>
                            {/if}

                            {#each config.subColumns as col}
                                {@const cell = item.columns[col.header]}
                                {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                                {#if metrics.sl}
                                    <td class="px-2 py-2 text-right border-r border-gray-200 border-b text-gray-600">{formatters.formatNumber(cell?.sl)}</td>
                                {/if}
                                {#if metrics.dt}
                                    <td class="px-2 py-2 text-right border-r border-gray-200 border-b font-medium text-gray-800">{formatters.formatRevenue(cell?.dt)}</td>
                                {/if}
                                {#if metrics.dtqd}
                                    <td class="px-2 py-2 text-right border-r border-gray-200 border-b font-medium text-purple-600">{formatters.formatRevenue(cell?.dtqd)}</td>
                                {/if}
                            {/each}
                        </tr>
                    {/each}
                </tbody>

                <tfoot class="bg-gray-100 font-bold text-gray-800 border-t border-gray-300 sticky bottom-0 z-20">
                    <tr>
                        <td class="px-5 py-2 sticky left-0 bg-gray-200 z-30 border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TỔNG</td>
                        
                        {#if tableMetrics.sl}
                             <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-200">{formatters.formatNumber(totals.mainValue_sl)}</td>
                        {/if}
                        {#if tableMetrics.dt}
                             <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-200 text-blue-800">{formatters.formatRevenue(totals.mainValue)}</td>
                        {/if}
                        {#if tableMetrics.dtqd}
                             <td class="px-2 py-2 text-right border-r border-gray-300 bg-gray-200 text-purple-800">{formatters.formatRevenue(totals.mainValue_dtqd)}</td>
                        {/if}

                        {#each config.subColumns as col}
                            {@const total = totals.columns[col.header]}
                            {@const metrics = col.metrics || { sl: false, dt: true, dtqd: false }}
                            {#if metrics.sl}
                                <td class="px-2 py-2 text-right border-r border-gray-300">{formatters.formatNumber(total?.sl)}</td>
                            {/if}
                            {#if metrics.dt}
                                <td class="px-2 py-2 text-right border-r border-gray-300 text-blue-700">{formatters.formatRevenue(total?.dt)}</td>
                            {/if}
                            {#if metrics.dtqd}
                                <td class="px-2 py-2 text-right border-r border-gray-300 text-purple-700">{formatters.formatRevenue(total?.dtqd)}</td>
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