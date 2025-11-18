<script>
  import { onMount, afterUpdate } from 'svelte';
  import { sortState } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';

  // --- 1. PROPS (Nhận từ LuykeSiuThi.svelte) ---
  export let items = []; // Nhận mảng chuaXuatReport

  // --- 2. LOGIC NỘI BỘ ---
  const tableType = 'luyke_chuaxuat';
  let totals = { soLuong: 0, doanhThuThuc: 0, doanhThuQuyDoi: 0 };

  function handleSort(sortKey) {
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

  // Reactive Sorter
  $: sortedItems = [...items].sort((a, b) => {
    const { key, direction } = $sortState[tableType] || { key: 'doanhThuQuyDoi', direction: 'desc' };
    let valA, valB;
     if (key === 'nganhHang') {
      valA = a.nganhHang || ''; valB = b.nganhHang || '';
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      valA = a[key] || 0; valB = b[key] || 0;
    }
    return direction === 'asc' ? valA - valB : valB - valA;
  });
  
  // Tính tổng
  $: totals = items.reduce((acc, item) => {
      acc.soLuong += item.soLuong; 
      acc.doanhThuThuc += item.doanhThuThuc; 
      acc.doanhThuQuyDoi += item.doanhThuQuyDoi; 
      return acc; 
  }, { soLuong: 0, doanhThuThuc: 0, doanhThuQuyDoi: 0 });

</script>

<div data-capture-group="2" class="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
  <h3 class="text-xl font-bold uppercase mb-4">Doanh thu chưa xuất</h3>
  <div id="luyke-unexported-revenue-content" class="overflow-x-auto">
    <table class="min-w-full text-sm table-bordered table-striped" data-table-type={tableType}>
      <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold">
        <tr>
          <th class="px-4 py-3 sortable text-left" data-sort="nganhHang" on:click={() => handleSort('nganhHang')}>Ngành hàng</th>
          <th class="px-4 py-3 sortable text-right" data-sort="soLuong" on:click={() => handleSort('soLuong')}>Số lượng</th>
          <th class="px-4 py-3 sortable text-right" data-sort="doanhThuThuc" on:click={() => handleSort('doanhThuThuc')}>Doanh thu thực</th>
          <th class="px-4 py-3 sortable text-right" data-sort="doanhThuQuyDoi" on:click={() => handleSort('doanhThuQuyDoi')}>Doanh thu QĐ</th>
        </tr>
      </thead>
      <tbody>
        {#if sortedItems.length > 0}
          {#each sortedItems as item (item.nganhHang)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-semibold">{item.nganhHang}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.soLuong)}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatRevenue(item.doanhThuThuc)}</td> 
              <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.doanhThuQuyDoi)}</td> 
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="4" class="p-4 text-center text-gray-500">Không có đơn hàng nào chưa xuất.</td>
          </tr>
        {/if}
      </tbody>
      <tfoot class="table-footer font-bold">
         <tr>
            <td class="px-4 py-2">Tổng</td>
            <td class="px-4 py-2 text-right">{formatters.formatNumber(totals.soLuong)}</td>
            <td class="px-4 py-2 text-right">{formatters.formatRevenue(totals.doanhThuThuc)}</td> 
            <td class="px-4 py-2 text-right">{formatters.formatRevenue(totals.doanhThuQuyDoi)}</td> 
        </tr>
      </tfoot>
    </table>
  </div>
</div>