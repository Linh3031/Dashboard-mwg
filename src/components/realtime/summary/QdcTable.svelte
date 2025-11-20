<script>
  import { formatters } from '../../../utils/formatters.js';
  import SortableTh from '../../common/SortableTh.svelte';

  export let items = []; 

  // State sắp xếp mặc định
  let sortKey = 'dtqd';
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

<div class="bg-white rounded-xl shadow-md p-4 border border-gray-200 h-full flex flex-col">
  <h3 class="text-lg font-bold text-gray-700 mb-4 uppercase border-b pb-2 flex items-center gap-2">
    <span>NHÓM HÀNG QUY ĐỔI CAO</span>
  </h3>
  
  {#if items.length === 0}
    <div class="flex-grow flex items-center justify-center">
      <p class="text-gray-500 font-bold p-4 text-center">Vui lòng tải file realtime để xem chi tiết.</p>
    </div>
  {:else}
    <div class="overflow-x-auto flex-grow max-h-[400px]">
      <table class="min-w-full text-sm table-bordered table-striped">
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10 shadow-sm">
          <tr>
            <SortableTh key="name" label="Nhóm hàng" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="sl" label="SL" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="dtqd" label="DTQĐ (Tr)" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
            <SortableTh key="donGia" label="Đơn giá (Tr)" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {#each sortedItems as item (item.name)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium">{item.name}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.sl)}</td>
              <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.dtqd)}</td>
              <td class="px-4 py-2 text-right font-bold text-green-600">{formatters.formatRevenue(item.donGia)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>