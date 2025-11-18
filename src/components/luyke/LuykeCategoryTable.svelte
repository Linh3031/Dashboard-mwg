<script>
  import { onMount, afterUpdate } from 'svelte';
  import { sortState } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  import { settingsService } from '../../modules/settings.service.js';

  // Tạm thời vô hiệu hóa import modal
  // import { modalManager } from '../../modules/ui-modal-manager.js';
  // import { uiReports } from '../../ui-reports.js'; 

  // --- 1. PROPS (Nhận từ LuykeSiuThi.svelte) ---
  export let items = []; // Nhận mảng categoryItems
  export let numDays = 1; // Nhận số ngày để tính SL TB/Ngày

  // --- 2. LOGIC SẮP XẾP (Chỉ phục vụ bảng này) ---
  const tableType = 'luyke_nganhhang';

  function handleSort(sortKey) {
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

  // Reactive Sorter
  $: sortedItems = [...items].sort((a, b) => {
    const { key, direction } = $sortState[tableType] || { key: 'revenue', direction: 'desc' };
    let valA, valB;
    if (key === 'name') {
      valA = a.name || ''; valB = b.name || '';
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (key === 'avgPrice') {
      valA = a.donGia || 0;
      valB = b.donGia || 0;
    } else if (key === 'avgQuantity') {
      valA = (a.quantity || 0) / numDays;
      valB = (b.quantity || 0) / numDays;
    } else {
      valA = a[key] || 0; valB = b[key] || 0;
    }
    return direction === 'asc' ? valA - valB : valB - valA;
  });

  // --- 3. LOGIC MODAL CÀI ĐẶT ---
  function showCategorySettingsModal() {
    console.warn("showCategorySettingsModal: Cần tái cấu trúc ui-reports.js (chứa renderSelectionModal)");
    alert("Chức năng Cài đặt sẽ được kích hoạt sau khi tái cấu trúc ui-reports.js");
    
    // Logic đúng (sẽ dùng sau):
    // const allItems = items.map(item => item.name).sort();
    // const savedSettings = settingsService.loadCategoryViewSettings(allItems);
    // uiReports.renderSelectionModal(
    //   'Tùy chỉnh hiển thị Ngành hàng chi tiết',
    //   'categoryView',
    //   allItems.map(item => ({ id: `lk-cat-${item.replace(/[^a-zA-Z0-9]/g, '')}`, value: item, label: item, checked: savedSettings.includes(item) }))
    // );
  }

  // --- 4. FEATHER ICONS ---
  afterUpdate(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });
</script>

<div data-capture-group="2" class="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
  <div class="flex items-center justify-between">
    <h3 class="text-xl font-bold text-gray-700 mb-4 uppercase">Ngành hàng chi tiết</h3>
    <button on:click={showCategorySettingsModal} class="settings-trigger-btn" title="Tùy chỉnh hiển thị">
      <i data-feather="settings"></i>
    </button>
  </div>
  <div id="luyke-category-details-content" class="overflow-x-auto">
    <table class="min-w-full text-sm table-bordered table-striped" data-table-type={tableType}>
      <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold">
        <tr>
          <th class="px-4 py-3 sortable text-left" data-sort="name" on:click={() => handleSort('name')}>Ngành hàng</th>
          <th class="px-4 py-3 sortable text-right" data-sort="quantity" on:click={() => handleSort('quantity')}>Số lượng</th>
          <th class="px-4 py-3 sortable text-right" data-sort="revenue" on:click={() => handleSort('revenue')}>Doanh thu</th>
          <th class="px-4 py-3 sortable text-right" data-sort="avgQuantity" on:click={() => handleSort('avgQuantity')}>SL TB/ngày</th>
          <th class="px-4 py-3 sortable text-right" data-sort="avgPrice" on:click={() => handleSort('avgPrice')}>Đơn giá TB</th>
        </tr>
      </thead>
      <tbody>
        {#if sortedItems.length > 0}
          {#each sortedItems as item (item.name)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 font-semibold">{item.name}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatNumber(item.quantity)}</td>
              <td class="px-4 py-2 text-right font-bold">{formatters.formatRevenue(item.revenue)}</td> 
              <td class="px-4 py-2 text-right font-bold text-blue-600">{formatters.formatNumberOrDash(item.quantity / numDays, 1)}</td> 
              <td class="px-4 py-2 text-right font-bold text-green-600">{formatters.formatRevenue(item.donGia)}</td> 
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="5" class="p-4 text-center text-gray-500">Không có dữ liệu ngành hàng.</td>
          </tr>
        {/if}
      </tbody>
      <tfoot class="table-footer font-bold">
        </tfoot>
    </table>
  </div>
</div>