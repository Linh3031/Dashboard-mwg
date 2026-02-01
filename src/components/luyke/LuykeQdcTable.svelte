<script>
  import { onMount, afterUpdate } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { cleanCategoryName } from '../../utils.js';
  import { 
      categoryStructure, 
      macroProductGroupConfig, 
      selectedWarehouse 
  } from '../../stores.js';
  import { datasyncService } from '../../services/datasync.service.js';
  import { adminService } from '../../services/admin.service.js';

  export let items = [];
  export let numDays = 1;

  let isSettingsOpen = false;
  let filterSearch = '';
  let saveTimer;
  let localConfig = [];
  const BAR_COLORS = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-400',
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
      'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
  ];

  onMount(async () => {
      if (!$macroProductGroupConfig || $macroProductGroupConfig.length === 0) {
          try {
              const configs = await adminService.loadMacroProductGroupConfig();
              macroProductGroupConfig.set(configs);
          } catch (e) { console.error("Lỗi load Macro Product Groups:", e); }
      }
  });

  $: allGroups = (() => {
      const macroNames = ($macroProductGroupConfig || []).map(m => ({ name: m.name, type: 'macro' })).sort((a, b) => a.name.localeCompare(b.name));
      const structureNames = new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean));
      const presentNames = new Set(items.map(i => i.name).filter(Boolean));
      const simpleNames = [...new Set([...structureNames, ...presentNames])].sort().map(name => ({ name: name, type: 'simple' }));
      return [...macroNames, ...simpleNames];
  })();

  $: filterList = allGroups.filter(g => g.name.toLowerCase().includes(filterSearch.toLowerCase()));

  $: if ($selectedWarehouse) { loadConfigForWarehouse($selectedWarehouse); } 
  else { localConfig = allGroups.map(g => g.name); }

  async function loadConfigForWarehouse(kho) {
      try {
          const savedConfig = await datasyncService.loadQdcConfig(kho);
          if (savedConfig && Array.isArray(savedConfig)) { localConfig = savedConfig; } 
          else { localConfig = allGroups.map(g => g.name); }
      } catch (e) { localConfig = allGroups.map(g => g.name); }
  }

  function toggleQdcSelection(name) {
      if (localConfig.includes(name)) { localConfig = localConfig.filter(n => n !== name); } 
      else { localConfig = [...localConfig, name]; }
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
          if ($selectedWarehouse) { datasyncService.saveQdcConfig($selectedWarehouse, localConfig); }
      }, 500);
  }

  function toggleAllVisibility(show) {
      if (show) { localConfig = allGroups.map(g => g.name); } 
      else { localConfig = []; }
      if ($selectedWarehouse) { datasyncService.saveQdcConfig($selectedWarehouse, localConfig); }
  }

  $: sortedItems = (() => {
      if (localConfig.length === 0) return [];
      let finalResults = [];
      const macroConfigs = $macroProductGroupConfig || [];
      const selectedMacros = localConfig.filter(name => macroConfigs.some(m => m.name === name));
      const selectedSimples = localConfig.filter(name => !macroConfigs.some(m => m.name === name));

      selectedMacros.forEach(macroName => {
          const config = macroConfigs.find(m => m.name === macroName);
          if (!config) return;
          const childIds = new Set(config.items || []);
          const childItems = items.filter(i => childIds.has(i.id));
          if (childItems.length > 0) {
              finalResults.push({
                  id: config.id, name: config.name, isMacro: true, 
                  dtqd: childItems.reduce((sum, i) => sum + (i.dtqd || 0), 0),
                  dt: childItems.reduce((sum, i) => sum + (i.dt || 0), 0),
                  quantity: childItems.reduce((sum, i) => sum + (i.quantity || i.sl || 0), 0),
                  _children: childItems 
              });
          } 
      });

      selectedSimples.forEach(simpleName => {
          const item = items.find(i => i.name === simpleName);
          if (item) { finalResults.push({ ...item, isMacro: false }); }
      });
      return finalResults.sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
  })();

  $: maxVal = sortedItems.length > 0 ? (sortedItems[0].dtqd || 1) : 1;

  function handleWindowClick(e) {
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) { isSettingsOpen = false; }
  }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
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
                        {#each filterList as group}
                            {@const isChecked = localConfig.includes(group.name)}
                            <div class="filter-item" on:click={() => toggleQdcSelection(group.name)}>
                                 <input type="checkbox" checked={isChecked} />
                                 {#if group.type === 'macro'}
                                  <label class="{isChecked ? 'font-bold text-teal-700' : 'text-teal-600 font-semibold'} flex items-center gap-1">
                                        <i data-feather="layers" class="w-3 h-3"></i> {group.name}
                                    </label>
                                 {:else}
                                     <label class="{isChecked ? 'font-bold text-blue-700' : ''}">{group.name}</label>
                                 {/if}
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
          {#if items.length > 0} <p class="text-xs mt-1">Hãy kiểm tra bộ lọc nhóm hàng.</p> {/if}
       </div>
    {:else}
      <div class="flex flex-col gap-0">
        {#each sortedItems as item, index (item.name)}
          {@const percent = maxVal > 0 ? (item.dtqd / maxVal) * 100 : 0}
          {@const barColor = BAR_COLORS[index % BAR_COLORS.length]}
          
          <div class="py-2 border-b border-dashed border-gray-100 last:border-0 transition-colors px-1 
                      {item.isMacro ? 'bg-teal-50/30 hover:bg-teal-50/50' : 'hover:bg-gray-50'}">
           <div class="flex items-center gap-3">
               <div class="w-6 text-center font-bold text-gray-400 text-xs">#{index + 1}</div>
               
               <div class="flex-grow min-w-0 relative qdc-content-wrapper">
                   
                   <div class="flex justify-between items-center mb-1 relative z-10 qdc-info-row">
                       <span class="text-sm font-semibold truncate pr-2 flex items-center gap-1 {item.isMacro ? 'text-teal-800' : 'text-gray-700'}" title={item.name}>
                           {#if item.isMacro} <i data-feather="layers" class="w-3 h-3 text-teal-600"></i> {/if}
                           {item.name}
                       </span>
                       <span class="text-sm font-bold whitespace-nowrap text-gray-800">
                        {formatters.formatRevenue(item.dtqd)}
                       </span>
                   </div>
                   
                   <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1 shadow-inner relative z-0 qdc-bar-row">
                       <div class="h-full rounded-full {barColor} shadow-sm transition-all duration-500 ease-out" style="width: {percent}%"></div>
                   </div>
                   
                   <div class="flex justify-between text-[10px] text-gray-500 flex-wrap gap-y-1">
                      <div class="flex gap-2">
                           <span>DT: <strong>{formatters.formatRevenue(item.dt)}</strong></span>
                           <span class="{item.isMacro ? 'text-teal-600' : 'text-blue-600'}">QĐ: <strong>{formatters.formatRevenue(item.dtqd)}</strong></span>
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

<style>
    /* [FIX GENESIS] - Giải pháp Layout bảo vệ hiển thị khi Capture */
    
    :global(.capture-container .qdc-content-wrapper) {
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        gap: 6px !important; 
    }

    :global(.capture-container .qdc-info-row) {
        margin-bottom: 0 !important;
        flex: 0 0 auto !important;
        position: relative !important;
        z-index: 50 !important; 
        width: 100% !important;
    }

    :global(.capture-container .qdc-info-row span:first-child) {
        overflow: visible !important;
        white-space: normal !important; 
        flex: 1 !important;
    }

    :global(.capture-container .qdc-bar-row) {
        margin-top: 0 !important;
        position: relative !important;
        z-index: 1 !important;
        width: 100% !important;
        min-height: 8px !important;
    }

    :global(.capture-container .qdc-info-row span:last-child) {
        flex-shrink: 0 !important;
        margin-left: 8px !important;
    }
</style>