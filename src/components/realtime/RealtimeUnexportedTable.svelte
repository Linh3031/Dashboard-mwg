<script>
  import { formatters } from '../../utils/formatters.js';
  export let items = [];

  // State sắp xếp
  let sortKey = 'doanhThuQuyDoi'; // Mặc định theo DTQĐ cao nhất
  let sortDirection = 'desc';

  function handleSort(key) {
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
       <p class="text-gray-500 font-bold p-4 text-center">Vui lòng tải file realtime để xem chi tiết.</p>
    </div>
  {:else}
    <div class="overflow-x-auto flex-grow max-h-[400px]">
      <table class="min-w-full text-sm table-bordered table-striped">
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0">
          <tr>
            <th class="px-4 py-2 text-left cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => handleSort('nganhHang')}>
              Ngành hàng {sortKey === 'nganhHang' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th class="px-4 py-2 text-right cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => handleSort('soLuong')}>
              SL {sortKey === 'soLuong' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th class="px-4 py-2 text-right cursor-pointer hover:bg-slate-300 transition select-none" on:click={() => handleSort('doanhThuQuyDoi')}>
              DTQĐ (Tr) {sortKey === 'doanhThuQuyDoi' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {#each sortedItems as item (item.nganhHang)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium">{item.nganhHang}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.soLuong)}</td>
              <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.doanhThuQuyDoi)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>