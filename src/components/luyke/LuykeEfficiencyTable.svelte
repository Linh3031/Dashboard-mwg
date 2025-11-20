<script>
  import { afterUpdate } from 'svelte';
  import { sortState } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  import { settingsService } from '../../modules/settings.service.js';
  // FIX: Đường dẫn đúng
  import SortableTh from '../common/SortableTh.svelte';

  export let items = [];
  
  const tableType = 'luyke_efficiency';

  function handleSort(event) {
    const sortKey = event.detail;
    const currentState = $sortState[tableType] || { key: 'label', direction: 'asc' };
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

  $: currentSortKey = $sortState[tableType]?.key || 'label';
  $: currentSortDirection = $sortState[tableType]?.direction || 'asc';

  $: sortedItems = [...items].sort((a, b) => {
    const key = currentSortKey;
    const direction = currentSortDirection;
    let valA, valB;
    if (key === 'label') {
      valA = a.label || ''; valB = b.label || '';
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (key === 'value') {
      valA = a.value || 0; valB = b.value || 0;
    } else { 
      valA = (a.target || 0) / 100; valB = (b.target || 0) / 100;
    }
    return direction === 'asc' ? valA - valB : valB - valA;
  });

  function showEfficiencySettingsModal() {
    alert("Chức năng Cài đặt sẽ được kích hoạt sau.");
  }
</script>

<div data-capture-group="1" class="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 h-full flex flex-col">
  <div class="flex items-center justify-between mb-4 border-b pb-2">
    <h3 class="text-xl font-bold text-gray-700 uppercase">Hiệu quả khai thác</h3>
    <button on:click={showEfficiencySettingsModal} class="settings-trigger-btn" title="Tùy chỉnh hiển thị">
      <i data-feather="settings"></i>
    </button>
  </div>

  {#if sortedItems.length === 0}
     <div class="flex-grow flex items-center justify-center">
        <p class="text-gray-500 font-bold p-4 text-center">Không có dữ liệu hiệu quả.</p>
     </div>
  {:else}
    <div id="luyke-efficiency-content" class="overflow-x-auto flex-grow">
        <table class="min-w-full text-sm table-bordered" data-table-type={tableType}>
        <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10 shadow-sm"> 
            <tr>
            <SortableTh key="label" label="Chỉ số" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="value" label="Thực hiện" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            <SortableTh key="target" label="Mục tiêu" align="right" sortKey={currentSortKey} sortDirection={currentSortDirection} on:sort={handleSort} />
            </tr>
        </thead>
        <tbody>
            {#each sortedItems as item (item.id)}
            <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-2 font-semibold text-gray-800">{item.label}</td>
                <td class="px-4 py-2 text-right font-bold text-lg {item.value < ((item.target || 0) / 100) ? 'bg-red-100 text-red-700' : 'text-green-600'}">
                {formatters.formatPercentage(item.value || 0)}
                </td> 
                <td class="px-4 py-2 text-right text-gray-600">{item.target || 0}%</td> 
            </tr>
            {/each}
        </tbody>
        </table>
    </div>
  {/if}
</div>