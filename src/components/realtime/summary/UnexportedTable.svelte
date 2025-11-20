<script>
  import { formatters } from '../../../utils/formatters.js';
  import SortableTh from '../../common/SortableTh.svelte';

  export let items = [];

  // State sắp xếp
  let sortKey = 'doanhThuQuyDoi';
  let sortDirection = 'desc';

  function handleSort(event) {
    const key = event.detail;
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  $: sortedItems = [...items].sort((a, b) => {
    let valA = a[sortKey] || 0;
    let valB = b[sortKey] || 0;

    if (sortKey === 'nganhHang') {
        valA = a.nganhHang || '';
        valB = b.nganhHang || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });
</script>

<div class="bg-white rounded-xl shadow-md p-4 border border-gray-200 h-full flex flex-col">
  <h3 class="text-lg font-bold text-gray-700 mb-4 uppercase border-b pb-2 bg-red-50 p-2 rounded">Doanh thu chưa xuất</h3>

  {#if items.length === 0}
    <div class="flex-grow flex items-center justify-center">
       <p class="text-gray-500 font-bold p-4 text-center">Không có đơn hàng nào chưa xuất trong ngày.</p>
    </div>
  {:else}
    <div class="overflow-x-auto flex-grow max-h-[400px]">
      <table class="min-w-full text-sm table-bordered table-striped">
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10 shadow-sm">
          <tr>
            <SortableTh key="nganhHang" label="Ngành hàng" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="soLuong" label="SL" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="doanhThuThuc" label="DT Thực" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="doanhThuQuyDoi" label="DTQĐ (Tr)" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {#each sortedItems as item (item.nganhHang)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium">{item.nganhHang}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.soLuong)}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatRevenue(item.doanhThuThuc)}</td>
              <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.doanhThuQuyDoi)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>