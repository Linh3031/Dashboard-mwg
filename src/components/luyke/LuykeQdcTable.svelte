<script>
  import { afterUpdate } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { cleanCategoryName } from '../../utils.js';
  import { categoryStructure, macroProductGroupConfig, selectedWarehouse } from '../../stores.js';
  import { datasyncService } from '../../services/datasync.service.js';

  export let items = []; 
  export let numDays = 1;

  let isSettingsOpen = false;
  let filterSearch = '';
  let saveTimer;
  let localConfig = []; // Danh sách các nhóm ĐƯỢC CHỌN

  // 1. Data Sources: Tạo danh sách tất cả nhóm hàng có thể có
  $: allGroupsFromStructure = [...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean))].sort();
  $: allMacroGroups = ($macroProductGroupConfig || []).map(m => m.name);
  $: allPresentGroups = items.map(i => i.name).sort();
  $: allGroups = [...new Set([...allGroupsFromStructure, ...allMacroGroups, ...allPresentGroups])].sort();

  $: filterList = allGroups.filter(name => 
      name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  // 2. Logic Load Config theo Kho
  $: if ($selectedWarehouse) {
      loadConfigForWarehouse($selectedWarehouse);
  } else {
      // Nếu không có kho (view toàn bộ), mặc định hiện tất cả
      localConfig = [...allGroups];
  }

  async function loadConfigForWarehouse(kho) {
      console.log(`[LuykeQdc] Loading config for warehouse: ${kho}`);
      try {
          const savedConfig = await datasyncService.loadQdcConfig(kho);
          if (savedConfig && Array.isArray(savedConfig)) {
              localConfig = savedConfig;
          } else {
              // [QUAN TRỌNG] Nếu chưa có config (null), mặc định chọn TẤT CẢ
              localConfig = [...allGroups];
          }
      } catch (e) {
          console.error("Error loading config:", e);
          localConfig = [...allGroups];
      }
  }

  // 3. Logic Lưu Config theo Kho
  function toggleQdcSelection(name) {
      if (localConfig.includes(name)) {
          localConfig = localConfig.filter(n => n !== name);
      } else {
          localConfig = [...localConfig, name];
      }
      
      // Debounce lưu cloud để tránh spam request
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
          if ($selectedWarehouse) {
              console.log(`[LuykeQdc] Saving config for ${$selectedWarehouse}...`);
              datasyncService.saveQdcConfig($selectedWarehouse, localConfig);
          }
      }, 500); 
  }

  function toggleAllVisibility(show) {
      if (show) {
          localConfig = [...allGroups];
      } else {
          localConfig = [];
      }
      
      if ($selectedWarehouse) {
          datasyncService.saveQdcConfig($selectedWarehouse, localConfig);
      }
  }

  // 4. Logic Hiển thị
  $: sortedItems = (() => {
      // Lọc danh sách items dựa trên localConfig
      let candidates = items.filter(item => localConfig.includes(item.name));
      return candidates.sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
  })();

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
                            {@const isChecked = localConfig.includes(name)}
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
          {#if items.length > 0}
             <p class="text-xs mt-1">Bạn đã ẩn tất cả nhóm hàng.</p>
          {/if}
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
                   <div class="flex justify-between text-[10px] text-gray-500 flex-wrap gap-y-1">
                       <div class="flex gap-2">
                           <span>DT: <strong>{formatters.formatRevenue(item.dt)}</strong></span>
                           <span class="text-blue-600">QĐ: <strong>{formatters.formatRevenue(item.dtqd)}</strong></span>
                       </div>
                       <div class="flex gap-2">
                           <span>SL: {formatters.formatNumber(item.quantity || item.sl)}</span>
                           <span>TB: <strong>{formatters.formatNumber((item.quantity || item.sl) / numDays, 0)}</strong>/ngày</span>
                       </div>
                    </div>
               </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>