<script>
  import { formatters } from '../../utils/formatters.js';
  export let items = [];

  // State sắp xếp
  let sortKey = 'revenue'; 
  let sortDirection = 'desc';

  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  // Helper để tạo class cho th (Active sort indicator)
  function getSortClass(key) {
    if (sortKey === key) {
      return sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc';
    }
    return '';
  }

  $: sortedItems = [...items].sort((a, b) => {
    let valA = a[sortKey] || 0;
    let valB = b[sortKey] || 0;

    if (sortKey === 'name') {
        valA = a.name || '';
        valB = b.name || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
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
            <th 
              class="px-4 py-3 text-left sortable {getSortClass('name')}" 
              on:click={() => handleSort('name')}
            >
              Ngành hàng <span class="sort-indicator"></span>
            </th>

            <th 
              class="px-4 py-3 text-right sortable header-highlight {getSortClass('quantity')}" 
              on:click={() => handleSort('quantity')}
            >
              SL <span class="sort-indicator"></span>
            </th>

            <th 
              class="px-4 py-3 text-right sortable header-highlight {getSortClass('revenue')}" 
              on:click={() => handleSort('revenue')}
            >
              DT Thực <span class="sort-indicator"></span>
            </th>

            <th 
              class="px-4 py-3 text-right sortable {getSortClass('revenueQuyDoi')}" 
              on:click={() => handleSort('revenueQuyDoi')}
            >
              DT QĐ <span class="sort-indicator"></span>
            </th>

            <th 
              class="px-4 py-3 text-right sortable {getSortClass('donGia')}" 
              on:click={() => handleSort('donGia')}
            >
              Đơn giá TB <span class="sort-indicator"></span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each sortedItems as item (item.name)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium">{item.name}</td>
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