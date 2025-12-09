<script>
  import { afterUpdate } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { cleanCategoryName } from '../../utils.js';
  import { qdcConfigStore, categoryStructure, macroProductGroupConfig } from '../../stores.js';
  import { adminService } from '../../services/admin.service.js';

  export let items = []; // Dữ liệu Nhóm hàng chi tiết
  export let numDays = 1;

  let isSettingsOpen = false;
  let filterSearch = '';
  let saveTimer;

  // Lấy danh sách để tạo bộ lọc: Gộp từ Cấu trúc + Nhóm lớn + Dữ liệu thực tế
  // Chuẩn hóa tất cả về tên sạch để tránh trùng lặp
  $: allGroupsFromStructure = ($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean);
  $: allMacroGroups = ($macroProductGroupConfig || []).map(m => m.name); // Tên macro thường do admin đặt chuẩn rồi
  $: allPresentGroups = items.map(i => i.name);
  
  // Gộp và Unique
  $: allGroups = [...new Set([...allGroupsFromStructure, ...allMacroGroups, ...allPresentGroups])].sort();

  $: filterList = allGroups.filter(name => 
      name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  function toggleQdcSelection(name) {
      qdcConfigStore.update(current => {
          if (current.includes(name)) return current.filter(n => n !== name);
          return [...current, name];
      });
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
          adminService.saveQdcConfig($qdcConfigStore);
      }, 1000);
  }

  function toggleAllVisibility(show) {
      if (show) {
          qdcConfigStore.set([...allGroups]);
      } else {
          qdcConfigStore.set([]);
      }
      adminService.saveQdcConfig($qdcConfigStore);
  }

  $: activeConfig = $qdcConfigStore;
  
  let sortedItems = [];
  $: {
      // 1. Tính toán danh sách hiển thị
      let candidates = [];

      if (!activeConfig || activeConfig.length === 0) {
          // [FIX] Nếu chưa chọn gì -> Lấy Top 10 theo Doanh Thu
          candidates = [...items].sort((a, b) => (b.dt || 0) - (a.dt || 0)).slice(0, 10);
      } else {
          // [FIX] Nếu đã chọn -> Lọc theo tên (So sánh chính xác vì items đã được clean name từ Master Report)
          candidates = items.filter(item => activeConfig.includes(item.name));
          
          // [FIX] Nếu chọn Macro Group mà items chưa có (do chưa phát sinh doanh thu), ta vẫn nên hiển thị nó nếu muốn? 
          // Hiện tại items chỉ chứa những gì có trong report.
          // Nếu muốn hiện cả row = 0, cần logic merge với activeConfig. 
          // Tuy nhiên theo thiết kế dashboard, thường chỉ hiện cái có số.
      }

      // 2. Sắp xếp giảm dần theo DTQD
      sortedItems = candidates.sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
  }

  $: maxVal = sortedItems.length > 0 ? (sortedItems[0].dtqd || 1) : 1;

  function handleWindowClick(e) {
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) {
          isSettingsOpen = false;
      }
  }

  afterUpdate(() => {
    if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<svelte:window on:click={handleWindowClick} />

<div class="luyke-widget h-full flex flex-col">
  <div class="luyke-widget-header">
    <div class="luyke-widget-title">
      <div class="p-1.5 bg-yellow-100 rounded text-yellow-600 mr-2">
          <i data-feather="star" class="w-4 h-4"></i>
      </div>
      <span>TOP NHÓM HÀNG</span>
    </div>

    <div class="relative filter-wrapper">
        <button class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" on:click={() => isSettingsOpen = !isSettingsOpen} title="Chọn nhóm hàng">
            <i data-feather="filter" class="w-4 h-4"></i>
        </button>
        {#if isSettingsOpen}
            <div class="filter-dropdown">
                <div class="filter-header">
                    <input type="text" class="filter-search" placeholder="Tìm nhóm hàng..." bind:value={filterSearch} />
                </div>
                <div class="filter-body custom-scrollbar" style="max-height: 250px;">
                    {#if filterList.length === 0}
                        <p class="text-xs text-gray-500 text-center p-2">Không tìm thấy.</p>
                    {:else}
                        {#each filterList as name}
                            {@const isChecked = $qdcConfigStore.includes(name)}
                            <div class="filter-item" on:click={() => toggleQdcSelection(name)}>
                                <input type="checkbox" checked={isChecked} />
                                <label class="{isChecked ? 'font-bold text-blue-700' : ''}">{name}</label>
                            </div>
                        {/each}
                    {/if}
                </div>
                <div class="filter-actions">
                    <button class="filter-btn-link" on:click={() => toggleAllVisibility(true)}>Hiện tất cả</button>
                    <button class="filter-btn-link text-red-600" on:click={() => toggleAllVisibility(false)}>Ẩn tất cả</button>
                </div>
            </div>
        {/if}
    </div>
  </div>

  <div class="luyke-widget-body custom-scrollbar">
    {#if sortedItems.length === 0}
       <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
          <p class="text-sm">Không có dữ liệu hiển thị.</p>
       </div>
    {:else}
      <div class="flex flex-col gap-0">
        {#each sortedItems as item, index (item.name)}
          {@const percent = maxVal > 0 ? (item.dtqd / maxVal) * 100 : 0}
          <div class="py-2 border-b border-dashed border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-1">
            <div class="flex items-center gap-3">
               <div class="w-6 text-center font-bold text-gray-400 text-xs">#{index + 1}</div>
               <div class="flex-grow min-w-0">
                   <div class="flex justify-between items-center mb-1">
                       <span class="text-sm font-semibold text-gray-700 truncate pr-2" title={item.name}>{item.name}</span>
                       <span class="text-sm font-bold text-blue-600 whitespace-nowrap">{formatters.formatRevenue(item.dtqd)}</span>
                   </div>
                   <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                       <div class="h-full bg-yellow-400 rounded-full" style="width: {percent}%"></div>
                   </div>
                   <div class="flex justify-between mt-1 text-[10px] text-gray-400">
                       <span>SL: {formatters.formatNumber(item.quantity || item.sl)}</span>
                       <span>TB: {formatters.formatNumber((item.quantity || item.sl) / numDays, 1)}/ngày</span>
                   </div>
               </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>