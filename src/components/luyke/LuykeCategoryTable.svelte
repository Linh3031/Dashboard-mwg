<script>
  import { afterUpdate } from 'svelte';
  import { sortState } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  // FIX: Đường dẫn đúng cho thư mục luyke
  import SortableTh from '../common/SortableTh.svelte';

  export let items = [];
  export let numDays = 1;

  const tableType = 'luyke_nganhhang';

  function handleSort(event) {
    const sortKey = event.detail;
    const currentState = $sortState[tableType] || { key: 'revenue', direction: 'desc' };
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

  $: currentSortKey = $sortState[tableType]?.key || 'revenue';
  $: currentSortDirection = $sortState[tableType]?.direction || 'desc';

  $: sortedItems = [...items].sort((a, b) => {
    const key = currentSortKey;
    const direction = currentSortDirection;
    let valA, valB;
    if (key === 'name') {
      valA = a.name || ''; valB = b.name || '';
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (key === 'avgPrice') {
      valA = a.donGia || 0; valB = b.donGia || 0;
    } else if (key === 'avgQuantity') {
      valA = (a.quantity || 0) / numDays; valB = (b.quantity || 0) / numDays;
    } else {
      valA = a[key] || 0; valB = b[key] || 0;
    }
    return direction === 'asc' ? valA - valB : valB - valA;
  });

  function showCategorySettingsModal() {
    alert("Chức năng Cài đặt sẽ được kích hoạt sau.");
  }
</script>

<div data-capture-group="2" class="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 h-full flex flex-col">
  <div class="flex items-center justify-between mb-4 border-b pb-2">
    <h3 class="text-xl font-bold text-gray-700 uppercase">Ngành hàng chi tiết</h3>
    <button on:click={showCategorySettingsModal} class="settings-trigger-btn" title="Tùy chỉnh hiển thị">
      <i data-feather="settings"></i>
    </button>
  </div>
  
  {#if sortedItems.length === 0}
     <div class="flex-grow flex items-center justify-center">
        <p class="text-gray-500 font-bold p-4 text-center">Không có dữ liệu.</p>
     </div>
  {:else}
    <div id="luyke-category-details-content" class="overflow-x-auto flex-grow">
        <table class="min-w-full text-sm table-bordered table-striped" data-table-type={tableType}>
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10 shadow-sm">
            <tr>
            <SortableTh key="name" label="Ngành hàng" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="quantity" label="Số lượng" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="revenue" label="Doanh thu" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="avgQuantity" label="SL TB/ngày" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="avgPrice" label="Đơn giá TB" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            </tr>
        </thead>
        <tbody>
            {#each sortedItems as item (item.name)}
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-semibold">{item.name}</td>
                <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.quantity)}</td>
                <td class="px-4 py-2 text-right font-bold">{formatters.formatRevenue(item.revenue)}</td> 
                <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatNumberOrDash(item.quantity / numDays, 1)}</td> 
                <td class="px-4 py-2 text-right font-bold text-green-600">{formatters.formatRevenue(item.donGia)}</td> 
            </tr>
            {/each}
        </tbody>
        </table>
    </div>
  {/if}
</div>