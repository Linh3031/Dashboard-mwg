<script>
  import { createEventDispatcher } from 'svelte';
  import DtCkNamRow from './DtCkNamRow.svelte';

  export let data = [];
  export let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0 };
  export let totalDays = 1;
  export let allDimensions = [];
  export let activeIds = [];
  export let filterOptions = {}; 
  export let currentFilters = {};
  export let sortConfig = { key: 'revenue', direction: 'desc' };
  export let expandedRows = new Set(); 

  const dispatch = createEventDispatcher();
  let openFilterId = null;
  let filterSearchQuery = '';

  const fmtQty = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n || 0);
  const fmtRev = (n) => new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format((n || 0) / 1000000);
  
  const LEVEL_COLORS = ['text-red-700 font-bold', 'text-blue-700 font-semibold', 'text-purple-700 font-medium', 'text-emerald-700', 'text-orange-700'];

  function toggleRow(id) {
      if (expandedRows.has(id)) expandedRows.delete(id);
      else expandedRows.add(id);
      expandedRows = expandedRows;
  }
  function expandAll(nodes) {
      if (!nodes) return;
      nodes.forEach(node => { expandedRows.add(node.id); if (node.children) expandAll(node.children); });
      expandedRows = expandedRows;
  }
  function collapseAll() { expandedRows = new Set(); }

  function toggleFilterDropdown(dimId) {
      if (openFilterId === dimId) openFilterId = null;
      else { openFilterId = dimId; filterSearchQuery = ''; }
  }

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
      if (newIds.includes(dimId)) newIds = newIds.filter(id => id !== dimId);
      else newIds.push(dimId);
      dispatch('configChange', newIds);
  }

  function handleSort(key) { dispatch('sort', key); }

  function SortIcon({ active, direction }) {
      return `<svg class="w-3 h-3 ml-1 ${active ? 'text-blue-600' : 'text-gray-300'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            ${direction === 'asc' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />'}
        </svg>`;
  }
</script>

<div class="p-3 border-b border-gray-200">
    <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold text-gray-700 mr-2">Cấu hình Cột & Cây dữ liệu:</span>
        {#each allDimensions as dim (dim.id)}
            {@const activeIndex = activeIds.indexOf(dim.id)}
            {@const isActive = activeIndex > -1}
            {@const hasFilter = currentFilters[dim.id] !== undefined}
          
            <div class="relative group">
                <div class="flex items-center rounded-md border {isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} hover:shadow-md transition-all">
                    <button class="px-3 py-1.5 text-sm flex items-center gap-2 {isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}" on:click={() => handleDimensionToggle(dim.id)}>
                        {#if isActive}
                             <span class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-sm">{activeIndex + 1}</span>
                        {:else}
                            <span class="w-4 h-4 rounded border border-gray-400"></span>
                        {/if}
                        {dim.label}
                    </button>
                    <button class="px-2 py-1.5 border-l border-gray-200 hover:bg-gray-100 {hasFilter ? 'text-blue-600' : 'text-gray-400'}" on:click|stopPropagation={() => toggleFilterDropdown(dim.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        {#if hasFilter}<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>{/if}
                    </button>
                </div>
                {#if openFilterId === dim.id}
                    <div class="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xs font-bold text-gray-500 uppercase">Lọc {dim.label}</span>
                            <div class="flex items-center gap-3">
                                <button on:click={() => dispatch('filterChange', { key: dim.id, selected: [] })} class="text-[11px] font-bold text-orange-600 hover:text-orange-800">Bỏ chọn hết</button>
                                {#if hasFilter}<button on:click={() => dispatch('filterChange', { key: dim.id, selected: undefined })} class="text-[11px] font-bold text-red-500 hover:text-red-700">Xóa lọc</button>{/if}
                            </div>
                        </div>
                        <input type="text" bind:value={filterSearchQuery} placeholder="Tìm kiếm..." class="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-2 focus:outline-none focus:border-blue-500"/>
                        <div class="max-h-56 overflow-y-auto space-y-1">
                            {#each getDisplayOptions(dim.id) as option (option)}
                                {@const isSelected = currentFilters[dim.id] === undefined || currentFilters[dim.id].includes(option)}
                                <label class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer" on:click|preventDefault={() => toggleFilterItem(dim.id, option)}>
                                    <input type="checkbox" checked={isSelected} class="rounded text-blue-600 pointer-events-none" tabindex="-1"/>
                                    <span class="text-sm text-gray-700 truncate {isSelected ? 'font-bold text-blue-800' : ''}">{option}</span>
                                </label>
                            {/each}
                        </div>
                        <div class="mt-2 pt-2 border-t text-right"><button on:click={() => openFilterId = null} class="text-xs font-bold bg-slate-100 px-4 py-1.5 rounded-md">Đóng</button></div>
                    </div>
                    <div class="fixed inset-0 z-40" on:click={() => openFilterId = null}></div>
                {/if}
            </div>
        {/each}
    </div>
</div>

<div class="overflow-x-auto dtcknam-table-wrapper">
    <table class="w-full text-sm text-left">
        <thead class="text-gray-700 uppercase font-bold sticky top-0 z-10 shadow-sm border-b-2 border-gray-300">
            <tr>
                <th class="py-3 px-4 border-r min-w-[200px] cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors" on:click={() => handleSort('name')}>
                    <div class="flex items-center gap-2">
                        <span>Danh mục</span> {@html SortIcon({ active: sortConfig.key === 'name', direction: sortConfig.direction })}
                        <div class="flex gap-1 ml-auto" on:click|stopPropagation>
                            <button on:click={() => expandAll(data)} class="p-1 bg-white hover:bg-gray-300 rounded shadow-sm" title="Mở rộng"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg></button>
                            <button on:click={collapseAll} class="p-1 bg-white hover:bg-gray-300 rounded shadow-sm" title="Thu gọn"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg></button>
                        </div>
                    </div>
                </th>
                <th class="py-3 px-4 text-right border-r w-28 cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors" on:click={() => handleSort('quantity')}>
                    <div class="flex items-center justify-end">SL {@html SortIcon({ active: sortConfig.key === 'quantity', direction: sortConfig.direction })}</div>
                </th>
                <th class="py-3 px-4 text-right border-r w-36 cursor-pointer bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors" on:click={() => handleSort('revenue')}>
                    <div class="flex items-center justify-end">DT Thực {@html SortIcon({ active: sortConfig.key === 'revenue', direction: sortConfig.direction })}</div>
                </th>
                <th class="py-3 px-4 text-right border-r w-36 cursor-pointer bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors" on:click={() => handleSort('revenueQD')}>
                    <div class="flex items-center justify-end">DT QĐ {@html SortIcon({ active: sortConfig.key === 'revenueQD', direction: sortConfig.direction })}</div>
                </th>
                <th class="py-3 px-4 text-right border-r w-32 cursor-pointer bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors" on:click={() => handleSort('avgQty')}>
                    <div class="flex items-center justify-end">TB SL/Ngày {@html SortIcon({ active: sortConfig.key === 'avgQty', direction: sortConfig.direction })}</div>
                </th>
                <th class="py-3 px-4 text-right border-r w-36 cursor-pointer bg-teal-100 text-teal-900 hover:bg-teal-200 transition-colors" on:click={() => handleSort('avgRev')}>
                    <div class="flex items-center justify-end">TB DT/Ngày {@html SortIcon({ active: sortConfig.key === 'avgRev', direction: sortConfig.direction })}</div>
                </th>
                <th class="py-3 px-4 text-right w-36 cursor-pointer bg-rose-100 text-rose-900 hover:bg-rose-200 transition-colors" on:click={() => handleSort('avgRevQD')}>
                    <div class="flex items-center justify-end">TB DTQĐ/Ngày {@html SortIcon({ active: sortConfig.key === 'avgRevQD', direction: sortConfig.direction })}</div>
                </th>
            </tr>
            
            <tr class="font-black text-[15px] border-b-4 border-gray-300 bg-gray-50">
                <td class="py-3 px-4 border-r text-gray-800 bg-slate-200/50">TỔNG CỘNG</td>
                <td class="py-3 px-4 border-r text-right text-blue-700 bg-blue-50">{fmtQty(totalMetrics.quantity)}</td>
                <td class="py-3 px-4 border-r text-right text-emerald-700 bg-emerald-50">{fmtRev(totalMetrics.revenue)}</td>
                <td class="py-3 px-4 border-r text-right text-purple-700 bg-purple-50">{fmtRev(totalMetrics.revenueQD)}</td>
                <td class="py-3 px-4 border-r text-right text-amber-700 bg-amber-50">{fmtQty(totalMetrics.quantity / totalDays)}</td>
                <td class="py-3 px-4 border-r text-right text-teal-700 bg-teal-50">{fmtRev(totalMetrics.revenue / totalDays)}</td>
                <td class="py-3 px-4 text-right text-rose-700 bg-rose-50">{fmtRev(totalMetrics.revenueQD / totalDays)}</td>
            </tr>
        </thead>
        <tbody>
            {#if data.length === 0}
                <tr><td colspan="7" class="text-center py-10 text-gray-500">Chưa có dữ liệu</td></tr>
            {:else}
                {#each data as group (group.id)}
                    <DtCkNamRow {group} {expandedRows} {toggleRow} {LEVEL_COLORS} {fmtQty} {fmtRev} />
                {/each}
            {/if}
        </tbody>
    </table>
</div>

<style>
    /* [PHẪU THUẬT]: Đồng bộ Style trị bệnh cắt chữ từ tab LuykeCategoryTreeTable */
    :global(.capture-container .dtcknam-table-wrapper) {
        width: 1050px !important; min-width: 1050px !important; max-width: 1050px !important;
        margin: 0 auto !important; border-radius: 0 !important; border: none !important; box-shadow: none !important;
    }
    :global(.capture-container .dtcknam-table-wrapper) { overflow: visible !important; }
    
    :global(.capture-container .dtcknam-table-wrapper table) { width: 100% !important; font-family: 'Segoe UI', sans-serif !important; }
    :global(.capture-container .dtcknam-table-wrapper th),
    :global(.capture-container .dtcknam-table-wrapper td) {
        padding: 8px 6px !important;
        white-space: normal !important; overflow: visible !important;
        height: auto !important; line-height: 1.5 !important; font-size: 14px !important;
    }

    /* Mở khóa giới hạn của class 'truncate' có trong file DtCkNamRow */
    :global(.capture-container .dtcknam-table-wrapper .truncate) {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        max-width: none !important;
    }
</style>