<script>
  import { createEventDispatcher } from 'svelte';
  import TableRowRecursive from './TableRowRecursive.svelte';

  export let data = [];
  export let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
  export let allDimensions = [];
  export let activeIds = [];
  export let filterOptions = {}; 
  export let currentFilters = {};
  export let sortConfig = { key: 'revenue', direction: 'desc' };
  export let expandedRows = new Set(); 

  const dispatch = createEventDispatcher();
  let openFilterId = null;
  let filterSearchQuery = '';

  const fmtQty = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
  const fmtRev = (n) => {
      const val = (n || 0) / 1000000;
      return new Intl.NumberFormat('vi-VN', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 1 
      }).format(val);
  };
  const fmtPct = (n) => (n || 0).toFixed(1) + '%';
  const LEVEL_COLORS = [
      'text-red-700 font-bold',     
      'text-blue-700 font-semibold',
      'text-purple-700 font-medium',
      'text-emerald-700',           
      'text-orange-700'             
  ];

  function toggleRow(id) {
      if (expandedRows.has(id)) expandedRows.delete(id);
      else expandedRows.add(id);
      expandedRows = expandedRows;
  }

  function expandAll(nodes) {
      if (!nodes) return;
      nodes.forEach(node => {
          expandedRows.add(node.id);
          if (node.children) expandAll(node.children);
      });
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

  function clearFilter(dimId) { 
      dispatch('filterChange', { key: dimId, selected: undefined });
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
      return `
        <svg class="w-3 h-3 ml-1 ${active ? 'text-blue-600' : 'text-gray-300'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            ${direction === 'asc' 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />' 
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />'}
        </svg>
      `;
  }
</script>

<div class="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200 brand-filter-section">
    <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold text-gray-700 mr-2">Cấu hình & Lọc:</span>
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
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {#if hasFilter}
                             <span class="absolute -top-1 -right-1 flex h-3 w-3">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                             </span>
                        {/if}
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

<div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200 brand-table-wrapper">
    <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
            <thead class="bg-gray-100 text-gray-700 uppercase font-bold sticky top-0 z-10">
                <tr>
                    <th class="py-3 px-4 border-b border-r min-w-[200px] cursor-pointer hover:bg-gray-200" on:click={() => handleSort('name')}>
                         <div class="flex items-center gap-2">
                            <span>Danh mục</span>
                            {@html SortIcon({ active: sortConfig.key === 'name', direction: sortConfig.direction })}
                            <div class="flex gap-1 ml-auto" on:click|stopPropagation>
                                <button on:click={() => expandAll(data)} class="p-1 hover:bg-gray-300 rounded" title="Mở rộng">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                                </button>
                                <button on:click={collapseAll} class="p-1 hover:bg-gray-300 rounded" title="Thu gọn">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                                </button>
                            </div>
                         </div>
                    </th>
                    
                    <th class="py-3 px-4 text-right border-b w-32 cursor-pointer hover:bg-gray-200" on:click={() => handleSort('quantity')}>
                         <div class="flex items-center justify-end">
                            SL {@html SortIcon({ active: sortConfig.key === 'quantity', direction: sortConfig.direction })}
                        </div>
                    </th>
                    
                    <th class="py-3 px-4 text-right border-b w-40 cursor-pointer hover:bg-gray-200" on:click={() => handleSort('revenue')}>
                         <div class="flex items-center justify-end">
                            DT thực {@html SortIcon({ active: sortConfig.key === 'revenue', direction: sortConfig.direction })}
                         </div>
                    </th>

                    <th class="py-3 px-4 text-right border-b w-32 cursor-pointer hover:bg-amber-100 bg-amber-50/50" on:click={() => handleSort('donGia')}>
                         <div class="flex items-center justify-end text-amber-800">
                            Đơn giá {@html SortIcon({ active: sortConfig.key === 'donGia', direction: sortConfig.direction })}
                         </div>
                    </th>
                    
                    <th class="py-3 px-4 text-right border-b w-40 cursor-pointer hover:bg-gray-200" on:click={() => handleSort('revenueQD')}>
                         <div class="flex items-center justify-end">
                            DTQĐ {@html SortIcon({ active: sortConfig.key === 'revenueQD', direction: sortConfig.direction })}
                        </div>
                    </th>
                    
                    <th class="py-3 px-4 text-center border-b w-24 cursor-pointer hover:bg-gray-200" on:click={() => handleSort('percentQD')}>
                        <div class="flex items-center justify-center">
                             % QĐ {@html SortIcon({ active: sortConfig.key === 'percentQD', direction: sortConfig.direction })}
                        </div>
                    </th>

                    <th class="py-3 px-4 text-right border-b w-40 bg-yellow-50 cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('revenueTraCham')}>
                         <div class="flex items-center justify-end">
                            DT Trả chậm {@html SortIcon({ active: sortConfig.key === 'revenueTraCham', direction: sortConfig.direction })}
                        </div>
                    </th>
                    
                    <th class="py-3 px-4 text-center border-b w-24 bg-yellow-50 cursor-pointer hover:bg-yellow-100" on:click={() => handleSort('percentTraCham')}>
                        <div class="flex items-center justify-center">
                             % Trả chậm {@html SortIcon({ active: sortConfig.key === 'percentTraCham', direction: sortConfig.direction })}
                        </div>
                    </th>
                </tr>
                
                <tr class="bg-blue-50 font-bold text-blue-800 border-b-2 border-blue-200">
                    <td class="py-3 px-4 border-r">TỔNG CỘNG</td>
                    <td class="py-3 px-4 text-right">{fmtQty(totalMetrics.quantity)}</td>
                    <td class="py-3 px-4 text-right">{fmtRev(totalMetrics.revenue)}</td>
                    
                    <td class="py-3 px-4 text-right bg-amber-50/50 text-amber-800">
                        {totalMetrics.quantity > 0 ? fmtRev(totalMetrics.revenue / totalMetrics.quantity) : '-'}
                    </td>

                    <td class="py-3 px-4 text-right">{fmtRev(totalMetrics.revenueQD)}</td>
                    
                    <td class="py-3 px-4 text-center">
                        {totalMetrics.revenue > 0 ? fmtPct(((totalMetrics.revenueQD / totalMetrics.revenue) * 100) - 100) : '0%'}
                    </td>
                    
                    <td class="py-3 px-4 text-right bg-yellow-100">{fmtRev(totalMetrics.revenueTraCham)}</td>
                    <td class="py-3 px-4 text-center bg-yellow-100">
                         {totalMetrics.revenue > 0 ? fmtPct((totalMetrics.revenueTraCham / totalMetrics.revenue) * 100) : '0%'}
                    </td>
                </tr>
            </thead>
            
            <tbody>
                {#if data.length === 0}
                    <tr><td colspan="8" class="text-center py-10 text-gray-500">Chưa có dữ liệu</td></tr>
                {:else}
                    {#each data as group (group.id)}
                        <TableRowRecursive 
                            {group} 
                            {expandedRows} 
                            {toggleRow} 
                            {LEVEL_COLORS}
                            {fmtQty} 
                            {fmtRev}
                            {fmtPct}
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

    /* [FIX GENESIS v3.0]: BỘ CSS CHỐNG CẮT CHỮ CHO CAPTURE */
    :global(.capture-container .brand-filter-section) { display: none !important; }
    :global(.capture-container .brand-table-wrapper) {
        width: 850px !important; /* Tăng xíu width để chứa cột mới */
        min-width: 850px !important;
        max-width: 850px !important;
        margin: 0 auto !important;
        border-radius: 0 !important;
        border: none !important;
        box-shadow: none !important;
    }
    :global(.capture-container .brand-table-wrapper table) {
        width: 100% !important;
        font-family: 'Segoe UI', sans-serif !important;
    }
    :global(.capture-container .brand-table-wrapper th),
    :global(.capture-container .brand-table-wrapper td) {
        padding: 8px 6px !important;
        white-space: normal !important;
        overflow: visible !important;
        height: auto !important;
        line-height: 1.5 !important;
        font-size: 14px !important;
    }
    :global(.capture-container .brand-table-wrapper td > div),
    :global(.capture-container .brand-table-wrapper td span),
    :global(.capture-container .brand-table-wrapper td p) {
         overflow: visible !important;
         white-space: normal !important;
         height: auto !important;
         line-height: 1.5 !important; 
         padding-bottom: 2px !important;
         margin-bottom: 0 !important;
    }
    :global(.capture-container .brand-table-wrapper th:first-child) {
        min-width: 150px !important;
        width: auto !important;
    }
</style>