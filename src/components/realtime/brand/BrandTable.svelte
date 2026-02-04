<script>
  import { createEventDispatcher } from 'svelte';
  // IMPORT TRỰC TIẾP Ở ĐÂY (QUAN TRỌNG)
  import TableRowRecursive from './TableRowRecursive.svelte';
  
  export let data = [];
  export let totalMetrics = { quantity: 0, revenue: 0, revenueQD: 0, revenueTraCham: 0 };
  export let allDimensions = [];
  export let activeIds = [];
  export let filterOptions = {}; 
  export let currentFilters = {};

  const dispatch = createEventDispatcher();
  
  // Trạng thái UI
  let expandedRows = new Set(); 
  let openFilterId = null;
  let filterSearchQuery = ''; 

  // --- FORMATTERS ---
  // 1. Số lượng: Giữ nguyên
  const fmtQty = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
  // 2. Doanh thu: Chia 1 triệu, làm tròn (Thêm check n || 0 để tránh lỗi crash)
  const fmtRev = (n) => new Intl.NumberFormat('vi-VN').format(Math.round((n || 0) / 1000000));
  // 3. Phần trăm
  const fmtPct = (n) => (n || 0).toFixed(1) + '%';

  // Màu sắc phân cấp
  const LEVEL_COLORS = [
      'text-red-700 font-bold',     
      'text-blue-700 font-semibold',
      'text-purple-700 font-medium',
      'text-emerald-700',           
      'text-orange-700'             
  ];

  // --- LOGIC UI ---
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

  function collapseAll() {
      expandedRows = new Set();
  }

  function toggleFilterDropdown(dimId) {
      if (openFilterId === dimId) openFilterId = null;
      else {
          openFilterId = dimId;
          filterSearchQuery = '';
      }
  }

  function toggleFilterItem(dimId, value) {
      const current = currentFilters[dimId] || [];
      let newSelected;
      if (current.includes(value)) newSelected = current.filter(x => x !== value);
      else newSelected = [...current, value];
      dispatch('filterChange', { key: dimId, selected: newSelected });
  }

  function clearFilter(dimId) {
      dispatch('filterChange', { key: dimId, selected: [] });
  }

  $: getDisplayOptions = (dimId) => {
      const options = filterOptions[dimId] || [];
      const selected = currentFilters[dimId] || [];
      const query = filterSearchQuery.toLowerCase();
      let filtered = options.filter(opt => opt.toLowerCase().includes(query));
      return filtered.sort((a, b) => {
          const aSel = selected.includes(a);
          const bSel = selected.includes(b);
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
</script>

<div class="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200 brand-filter-section">
    <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold text-gray-700 mr-2">Cấu hình & Lọc:</span>
        
        {#each allDimensions as dim (dim.id)}
            {@const activeIndex = activeIds.indexOf(dim.id)}
            {@const isActive = activeIndex > -1}
            {@const hasFilter = (currentFilters[dim.id] || []).length > 0}
            
            <div class="relative group">
                <div class="flex items-center rounded-md border {isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} hover:shadow-md transition-all">
                    <button 
                        class="px-3 py-1.5 text-sm flex items-center gap-2 {isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}"
                        on:click={() => handleDimensionToggle(dim.id)}
                    >
                        {#if isActive}
                            <span class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-sm">
                                {activeIndex + 1}
                            </span>
                        {:else}
                            <span class="w-4 h-4 rounded border border-gray-400"></span>
                        {/if}
                        
                        {dim.label}
                    </button>

                    <button 
                        class="px-2 py-1.5 border-l border-gray-200 hover:bg-gray-100 {hasFilter ? 'text-blue-600' : 'text-gray-400'}"
                        on:click|stopPropagation={() => toggleFilterDropdown(dim.id)}
                    >
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
                    <div class="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3 animate-fade-in-down">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-xs font-bold text-gray-500 uppercase">Lọc {dim.label}</span>
                            {#if hasFilter}
                                <button on:click={() => clearFilter(dim.id)} class="text-xs text-red-500 hover:underline">Xóa lọc</button>
                            {/if}
                        </div>
                        <input type="text" bind:value={filterSearchQuery} placeholder="Tìm kiếm..." class="w-full text-sm border border-gray-300 rounded px-2 py-1 mb-2 focus:outline-none focus:border-blue-500"/>
                        <div class="max-h-48 overflow-y-auto space-y-1">
                            {#each getDisplayOptions(dim.id) as option}
                                {@const isSelected = (currentFilters[dim.id] || []).includes(option)}
                                <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                                    <input type="checkbox" checked={isSelected} on:change={() => toggleFilterItem(dim.id, option)} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                    <span class="text-sm text-gray-700 truncate {isSelected ? 'font-semibold' : ''}">{option}</span>
                                </label>
                            {/each}
                            {#if getDisplayOptions(dim.id).length === 0}
                                <div class="text-xs text-gray-400 text-center py-2">Không tìm thấy dữ liệu</div>
                            {/if}
                        </div>
                        <div class="mt-2 pt-2 border-t text-right">
                             <button on:click={() => openFilterId = null} class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Đóng</button>
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
                    <th class="py-3 px-4 border-b border-r min-w-[200px]">
                        <div class="flex items-center gap-2">
                            <span>Danh mục</span>
                            <div class="flex gap-1 ml-auto">
                                <button on:click={() => expandAll(data)} class="p-1 hover:bg-gray-200 rounded" title="Mở rộng">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                                </button>
                                <button on:click={collapseAll} class="p-1 hover:bg-gray-200 rounded" title="Thu gọn">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </th>
                    <th class="py-3 px-4 text-right border-b w-32">Số lượng</th>
                    <th class="py-3 px-4 text-right border-b w-40">Doanh thu <span class="text-[10px] lowercase font-normal">(Triệu)</span></th>
                    <th class="py-3 px-4 text-right border-b w-40">DT Quy đổi <span class="text-[10px] lowercase font-normal">(Triệu)</span></th>
                    <th class="py-3 px-4 text-right border-b w-40 bg-yellow-50">DT Trả chậm <span class="text-[10px] lowercase font-normal">(Triệu)</span></th>
                    <th class="py-3 px-4 text-center border-b w-24 bg-yellow-50">% Trả chậm</th>
                </tr>
                <tr class="bg-blue-50 font-bold text-blue-800 border-b-2 border-blue-200">
                    <td class="py-3 px-4 border-r">TỔNG CỘNG</td>
                    <td class="py-3 px-4 text-right">{fmtQty(totalMetrics.quantity)}</td>
                    <td class="py-3 px-4 text-right">{fmtRev(totalMetrics.revenue)}</td>
                    <td class="py-3 px-4 text-right">{fmtRev(totalMetrics.revenueQD)}</td>
                    <td class="py-3 px-4 text-right bg-yellow-100">{fmtRev(totalMetrics.revenueTraCham)}</td>
                    <td class="py-3 px-4 text-center bg-yellow-100">
                        {totalMetrics.revenue > 0 ? fmtPct((totalMetrics.revenueTraCham / totalMetrics.revenue) * 100) : '0%'}
                    </td>
                </tr>
            </thead>
            
            <tbody>
                {#if data.length === 0}
                    <tr><td colspan="6" class="text-center py-10 text-gray-500">Chưa có dữ liệu</td></tr>
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
    
    /* 1. Ẩn bộ lọc */
    :global(.capture-container .brand-filter-section) {
        display: none !important;
    }

    /* 2. Cố định chiều rộng bảng (Mobile Optimized) */
    :global(.capture-container .brand-table-wrapper) {
        width: 750px !important;
        min-width: 750px !important;
        max-width: 750px !important;
        margin: 0 auto !important;
        border-radius: 0 !important;
        border: none !important;
        box-shadow: none !important;
    }

    /* 3. Reset Table Core */
    :global(.capture-container .brand-table-wrapper table) {
        width: 100% !important;
        font-family: 'Segoe UI', sans-serif !important;
    }

    /* 4. Mở rộng ô bảng và line-height */
    :global(.capture-container .brand-table-wrapper th),
    :global(.capture-container .brand-table-wrapper td) {
        padding: 8px 6px !important;
        white-space: normal !important;
        overflow: visible !important;
        height: auto !important;
        line-height: 1.5 !important;
        font-size: 14px !important;
    }

    /* 5. [CRITICAL] Xuyên thấu vào thẻ con để chống cắt chữ g, y, p */
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

    /* 6. Fix cột đầu tiên */
    :global(.capture-container .brand-table-wrapper th:first-child) {
        min-width: 150px !important;
        width: auto !important;
    }
</style>