<script>
  import { formatters } from '../../../utils/formatters.js';
  // Import component mới
  import SortableTh from '../../common/SortableTh.svelte';

  export let items = [];

  let sortKey = 'revenue'; 
  let sortDirection = 'desc';

  // Hàm xử lý sự kiện sort từ component con
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
    let valA = Number(a[sortKey]) || 0;
    let valB = Number(b[sortKey]) || 0;
    
    if (sortKey === 'name') {
        return sortDirection === 'asc' 
          ? (a.name || '').localeCompare(b.name || '') 
          : (b.name || '').localeCompare(a.name || '');
    }
 
    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });
</script>

<div class="bg-white rounded-xl shadow-md p-4 border border-gray-200 h-full">
  <h3 class="text-lg font-bold text-gray-700 mb-4 uppercase border-b pb-2">Ngành hàng chi tiết</h3>

  {#if items.length === 0}
    <p class="text-gray-500 font-bold p-4 text-center">Vui lòng tải file realtime để xem chi tiết.</p>
  {:else}
    <div class="overflow-x-auto max-h-[400px]">
      <table class="min-w-full text-sm table-bordered table-striped">
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10">
          <tr>
            <SortableTh key="name" label="Ngành hàng" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="quantity" label="SL" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="revenue" label="Doanh thu Thực" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="revenueQuyDoi" label="DT QĐ" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="donGia" label="Đơn giá TB" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {#each sortedItems as item (item.name)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium capitalize">{item.name}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.quantity)}</td>
              <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.revenue)}</td>
              <td class="px-4 py-2 text-right font-bold text-purple-600">{formatters.formatRevenue(item.revenueQuyDoi)}</td>
              <td class="px-4 py-2 text-right font-bold text-green-600">{formatters.formatRevenue(item.donGia)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>