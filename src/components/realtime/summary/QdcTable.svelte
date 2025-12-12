<script>
  import { afterUpdate } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { cleanCategoryName } from '../../../utils.js';
  import { categoryStructure, macroProductGroupConfig } from '../../../stores.js';
  import { adminService } from '../../../services/admin.service.js';

  export let items = []; // Dữ liệu hiện tại (có số liệu)
  export let activeConfig = []; // Config từ store

  let isSettingsOpen = false;
  let filterSearch = '';
  let localFilter = [...activeConfig]; 
  let saveTimer;

  // [LOGIC MỚI] Lấy danh sách đầy đủ từ cấu trúc để làm bộ lọc
  $: allGroupsFromStructure = [...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean))].sort();
  $: allMacroGroups = ($macroProductGroupConfig || []).map(m => m.name);
  $: allPresentGroups = items.map(i => i.name).sort();
  
  // Gộp tất cả lại -> Danh sách cho bộ lọc
  $: allGroups = [...new Set([...allGroupsFromStructure, ...allMacroGroups, ...allPresentGroups])].sort();

  $: filterList = allGroups.filter(name => 
      name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  // Cập nhật filter khi store thay đổi
  $: if (activeConfig && !isSettingsOpen) {
      localFilter = [...activeConfig];
  }

  // Danh sách hiển thị (Sort theo DTQĐ)
  let sortedItems = [];
  $: {
      let candidates = [];
      if (!localFilter || localFilter.length === 0) {
          // Mặc định Top 10
          candidates = [...items].sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0)).slice(0, 10);
      } else {
          // Lọc theo config
          candidates = items.filter(item => localFilter.includes(item.name));
      }
      sortedItems = candidates.sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
  }

  $: maxVal = sortedItems.length > 0 ? (sortedItems[0].dtqd || 1) : 1;

  function toggleQdcSelection(name) {
      if (localFilter.includes(name)) {
          localFilter = localFilter.filter(n => n !== name);
      } else {
          localFilter = [...localFilter, name];
      }
      // Lưu lại thay đổi (Debounce)
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
          adminService.saveQdcConfig(localFilter);
      }, 1000);
  }

  function toggleAllVisibility(show) {
      if (show) {
          localFilter = [...allGroups];
      } else {
          localFilter = [];
      }
      adminService.saveQdcConfig(localFilter);
  }

  function handleWindowClick(e) {
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) {
          isSettingsOpen = false;
      }
  }

  afterUpdate(() => { if (window.feather) feather.replace(); });
</script>

<svelte:window on:click={handleWindowClick} />

<div class="luyke-widget h-full">
  <div class="luyke-widget-header">
    <div class="luyke-widget-title">
      <div class="p-1.5 bg-yellow-100 rounded text-yellow-600 mr-2">
          <i data-feather="star" class="w-4 h-4"></i>
      </div>
      <span>TOP NHÓM HÀNG (REALTIME)</span>
    </div>

    <div class="relative filter-wrapper">
        <button class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" on:click={() => isSettingsOpen = !isSettingsOpen} title="Chọn nhóm hàng hiển thị">
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
                            {@const isChecked = localFilter.includes(name)}
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
          <p class="text-sm">Chưa có dữ liệu.</p>
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
                   <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                       <div class="h-full bg-yellow-400 rounded-full" style="width: {percent}%"></div>
                   </div>
                   <div class="flex justify-between text-[10px] text-gray-500">
                       <span>DT: <strong>{formatters.formatRevenue(item.dt || item.revenue)}</strong></span>
                       <span>SL: <strong>{formatters.formatNumber(item.sl || item.quantity)}</strong></span>
                   </div>
               </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>