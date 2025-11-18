<script>
  import { onMount, afterUpdate } from 'svelte';
  import { sortState } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  import { settingsService } from '../../modules/settings.service.js';
  
  // Tạm thời vô hiệu hóa import modal để chờ tái cấu trúc ui-reports.js
  // import { modalManager } from '../../modules/ui-modal-manager.js';
  // import { uiReports } from '../../ui-reports.js'; 

  // --- 1. PROPS (Nhận từ LuykeSiuThi.svelte) ---
  export let items = []; // Nhận mảng efficiencyItems
  
  // --- 2. LOGIC SẮP XẾP (Chỉ phục vụ bảng này) ---
  const tableType = 'luyke_efficiency';

  function handleSort(sortKey) {
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

  // Reactive Sorter
  $: sortedItems = [...items].sort((a, b) => {
    const { key, direction } = $sortState[tableType] || { key: 'label', direction: 'asc' };
    let valA, valB;
    if (key === 'label') {
      valA = a.label || ''; valB = b.label || '';
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (key === 'value') {
      valA = a.value || 0; valB = b.value || 0;
    } else { // key === 'target'
      valA = (a.target || 0) / 100; valB = (b.target || 0) / 100;
    }
    return direction === 'asc' ? valA - valB : valB - valA;
  });

  // --- 3. LOGIC MODAL CÀI ĐẶT ---
  function showEfficiencySettingsModal() {
    console.warn("showEfficiencySettingsModal: Cần tái cấu trúc ui-reports.js (chứa renderSelectionModal)");
    alert("Chức năng Cài đặt sẽ được kích hoạt sau khi tái cấu trúc ui-reports.js");
    
    // Logic đúng (sẽ dùng sau):
    // const allItemsConfig = settingsService.loadEfficiencyViewSettings();
    // uiReports.renderSelectionModal(
    //   'Tùy chỉnh hiển thị Hiệu quả khai thác',
    //   'efficiencyView',
    //   allItemsConfig.map(item => ({ id: `lk-eff-${item.id}`, value: item.id, label: item.label, checked: item.visible }))
    // );
  }

  // --- 4. FEATHER ICONS ---
  afterUpdate(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });
</script>

<div data-capture-group="1" class="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
  <div class="flex items-center justify-between">
    <h3 class="text-xl font-bold text-gray-700 mb-4 uppercase">Hiệu quả khai thác</h3>
    <button on:click={showEfficiencySettingsModal} class="settings-trigger-btn" title="Tùy chỉnh hiển thị">
      <i data-feather="settings"></i>
    </button>
  </div>
  <div id="luyke-efficiency-content" class="overflow-x-auto">
    <table class="min-w-full text-sm table-bordered" data-table-type={tableType}>
      <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold"> 
        <tr>
          <th class="px-4 py-3 sortable text-left" data-sort="label" on:click={() => handleSort('label')}>
            Chỉ số <span class="sort-indicator"></span>
          </th>
          <th class="px-4 py-3 sortable text-right" data-sort="value" on:click={() => handleSort('value')}>
            Thực hiện <span class="sort-indicator"></span>
          </th>
          <th class="px-4 py-3 sortable text-right" data-sort="target" on:click={() => handleSort('target')}>
            Mục tiêu <span class="sort-indicator"></span>
          </th> 
        </tr>
      </thead>
      <tbody>
        {#if sortedItems.length > 0}
          {#each sortedItems as item (item.id)}
            <tr class="border-t">
              <td class="px-4 py-2 font-semibold text-gray-800">{item.label}</td>
              <td class="px-4 py-2 text-right font-bold text-lg {item.value < ((item.target || 0) / 100) ? 'cell-performance is-below' : 'text-green-600'}">
                {formatters.formatPercentage(item.value || 0)}
              </td> 
              <td class="px-4 py-2 text-right text-gray-600">{item.target || 0}%</td> 
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="3" class="p-4 text-center text-gray-500">Không có dữ liệu hiệu quả.</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>