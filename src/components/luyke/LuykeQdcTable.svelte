<script>
  import { afterUpdate } from 'svelte';
  import { sortState } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  // [FIX] Cập nhật đường dẫn đúng: modules -> services
  import { settingsService } from '../../services/settings.service.js';
  import SortableTh from '../common/SortableTh.svelte';

  export let items = [];
  export let numDays = 1;

  const tableType = 'luyke_qdc';

  function handleSort(event) {
    const sortKey = event.detail;
    const currentState = $sortState[tableType] || { key: 'dtqd', direction: 'desc' };
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

  $: currentSortKey = $sortState[tableType]?.key || 'dtqd';
  $: currentSortDirection = $sortState[tableType]?.direction || 'desc';

  $: sortedItems = [...items].sort((a, b) => {
    const key = currentSortKey;
    const direction = currentSortDirection;
    let valA, valB;
    if (key === 'name') {
      valA = a.name || ''; valB = b.name || '';
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      valA = a[key] || 0; valB = b[key] || 0;
    }
    return direction === 'asc' ? valA - valB : valB - valA;
  });

  function showQdcSettingsModal() {
    alert("Chức năng Cài đặt sẽ được kích hoạt sau.");
  }
</script>

<div data-capture-group="1" class="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 h-full flex flex-col">
  <div class="flex items-center justify-between mb-4 border-b pb-2">
    <h3 class="text-xl font-bold text-gray-700 uppercase">Nhóm hàng quy đổi cao</h3>
    <button on:click={showQdcSettingsModal} class="settings-trigger-btn" title="Tùy chỉnh hiển thị">
      <i data-feather="settings"></i>
    </button>
  </div>

  {#if sortedItems.length === 0}
     <div class="flex-grow flex items-center justify-center">
        <p class="text-gray-500 font-bold p-4 text-center">Không có dữ liệu QĐC.</p>
     </div>
  {:else}
    <div id="luyke-qdc-content" class="overflow-x-auto flex-grow">
        <table class="min-w-full text-sm table-bordered table-striped" data-table-type={tableType}>
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10 shadow-sm">
            <tr>
            <SortableTh key="name" label="Nhóm hàng" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="sl" label="SL" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="dtqd" label="DTQĐ" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="avgSl" label="SL TB/Ngày" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            </tr>
        </thead>
        <tbody>
            {#each sortedItems as item (item.id)}
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-semibold">{item.name}</td>
                <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.sl)}</td> 
                <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.dtqd)}</td> 
                <td class="px-4 py-2 text-right font-bold text-green-600">{formatters.formatNumber(item.sl / numDays, 1)}</td>
            </tr>
            {/each}
        </tbody>
        </table>
    </div>
  {/if}
</div>