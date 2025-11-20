<script>
  import { afterUpdate } from 'svelte';
  import { sortState } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  // FIX: Đường dẫn đúng
  import SortableTh from '../common/SortableTh.svelte';

  export let items = [];

  const tableType = 'luyke_chuaxuat';
  
  let totals = { soLuong: 0, doanhThuThuc: 0, doanhThuQuyDoi: 0 };

  function handleSort(event) {
    const sortKey = event.detail;
    const currentState = $sortState[tableType] || { key: 'doanhThuQuyDoi', direction: 'desc' };
    let newDirection;
    if (currentState.key === sortKey) {
      newDirection = currentState.direction === 'desc' ? 'asc' : 'desc';
    } else {
      newDirection = 'desc';
    }
    sortState.update(current => {
      current[tableType] = { key: sortKey, direction: newDirection };
      return current;
    });
  }

  $: currentSortKey = $sortState[tableType]?.key || 'doanhThuQuyDoi';
  $: currentSortDirection = $sortState[tableType]?.direction || 'desc';

  $: sortedItems = [...items].sort((a, b) => {
    const key = currentSortKey;
    const direction = currentSortDirection;
    let valA, valB;
     if (key === 'nganhHang') {
      valA = a.nganhHang || ''; valB = b.nganhHang || '';
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      valA = a[key] || 0; valB = b[key] || 0;
    }
    return direction === 'asc' ? valA - valB : valB - valA;
  });

  $: totals = items.reduce((acc, item) => {
      acc.soLuong += item.soLuong; 
      acc.doanhThuThuc += item.doanhThuThuc; 
      acc.doanhThuQuyDoi += item.doanhThuQuyDoi; 
      return acc; 
  }, { soLuong: 0, doanhThuThuc: 0, doanhThuQuyDoi: 0 });
</script>

<div data-capture-group="2" class="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 h-full flex flex-col">
  <h3 class="text-xl font-bold uppercase mb-4 border-b pb-2">Doanh thu chưa xuất</h3>
  
  {#if sortedItems.length === 0}
     <div class="flex-grow flex items-center justify-center">
        <p class="text-gray-500 font-bold p-4 text-center">Không có đơn hàng nào chưa xuất.</p>
     </div>
  {:else}
    <div id="luyke-unexported-revenue-content" class="overflow-x-auto flex-grow">
        <table class="min-w-full text-sm table-bordered table-striped" data-table-type={tableType}>
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10 shadow-sm">
            <tr>
            <SortableTh key="nganhHang" label="Ngành hàng" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="soLuong" label="Số lượng" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="doanhThuThuc" label="Doanh thu thực" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="doanhThuQuyDoi" label="Doanh thu QĐ" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            </tr>
        </thead>
        <tbody>
            {#each sortedItems as item (item.nganhHang)}
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-semibold">{item.nganhHang}</td>
                <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.soLuong)}</td>
                <td class="px-4 py-2 text-right font-bold">{formatters.formatRevenue(item.doanhThuThuc)}</td> 
                <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.doanhThuQuyDoi)}</td> 
            </tr>
            {/each}
        </tbody>
        <tfoot class="table-footer font-bold bg-gray-100 border-t-2 border-gray-300 sticky bottom-0">
            <tr>
                <td class="px-4 py-2">Tổng</td>
                <td class="px-4 py-2 text-right">{formatters.formatNumber(totals.soLuong)}</td>
                <td class="px-4 py-2 text-right">{formatters.formatRevenue(totals.doanhThuThuc)}</td> 
                <td class="px-4 py-2 text-right">{formatters.formatRevenue(totals.doanhThuQuyDoi)}</td> 
            </tr>
        </tfoot>
        </table>
    </div>
  {/if}
</div>