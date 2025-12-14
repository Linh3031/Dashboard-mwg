<script>
  import { onMount, afterUpdate } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { cleanCategoryName } from '../../../utils.js';
  import { 
      categoryStructure, 
      macroProductGroupConfig, 
      selectedWarehouse 
  } from '../../../stores.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  import { adminService } from '../../../services/admin.service.js';

  export let items = []; 
  export let numDays = 1;

  let isSettingsOpen = false;
  let filterSearch = '';
  let saveTimer;
  let localConfig = []; 

  // Bảng màu rực rỡ cho thanh tiến trình
  const BAR_COLORS = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-400',
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
      'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
  ];

  // 1. Load config Nhóm Hàng Lớn nếu chưa có
  onMount(async () => {
      if (!$macroProductGroupConfig || $macroProductGroupConfig.length === 0) {
          try {
              const configs = await adminService.loadMacroProductGroupConfig();
              macroProductGroupConfig.set(configs);
          } catch (e) {
              console.error("Lỗi load Macro Product Groups:", e);
          }
      }
  });

  // 2. Tạo danh sách Filter (Ưu tiên Nhóm Lớn lên đầu)
  $: allGroups = (() => {
      // A. Nhóm Lớn
      const macroNames = ($macroProductGroupConfig || []).map(m => ({
          name: m.name,
          type: 'macro'
      })).sort((a, b) => a.name.localeCompare(b.name));

      // B. Nhóm Thường
      const structureNames = new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean));
      const presentNames = new Set(items.map(i => i.name).filter(Boolean));
      
      const simpleNames = [...new Set([...structureNames, ...presentNames])]
          .sort()
          .map(name => ({
              name: name,
              type: 'simple'
          }));

      return [...macroNames, ...simpleNames];
  })();

  $: filterList = allGroups.filter(g => 
      g.name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  // 3. Logic Load/Save Config (Dùng chung config với Lũy kế để đồng bộ trải nghiệm)
  $: if ($selectedWarehouse) {
      loadConfigForWarehouse($selectedWarehouse);
  } else {
      localConfig = allGroups.map(g => g.name);
  }

  async function loadConfigForWarehouse(kho) {
      try {
          const savedConfig = await datasyncService.loadQdcConfig(kho);
          if (savedConfig && Array.isArray(savedConfig)) {
              localConfig = savedConfig;
          } else {
              localConfig = allGroups.map(g => g.name);
          }
      } catch (e) {
          localConfig = allGroups.map(g => g.name);
      }
  }

  function toggleQdcSelection(name) {
      if (localConfig.includes(name)) {
          localConfig = localConfig.filter(n => n !== name);
      } else {
          localConfig = [...localConfig, name];
      }
      
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
          if ($selectedWarehouse) {
              datasyncService.saveQdcConfig($selectedWarehouse, localConfig);
          }
      }, 500); 
  }

  function toggleAllVisibility(show) {
      if (show) {
          localConfig = allGroups.map(g => g.name);
      } else {
          localConfig = [];
      }
      if ($selectedWarehouse) {
         datasyncService.saveQdcConfig($selectedWarehouse, localConfig);
      }
  }

  // 4. Aggregation Logic (Cộng gộp Nhóm Lớn)
  $: sortedItems = (() => {
      if (localConfig.length === 0) return [];

      let finalResults = [];
      const macroConfigs = $macroProductGroupConfig || [];
      
      const selectedMacros = localConfig.filter(name => macroConfigs.some(m => m.name === name));
      const selectedSimples = localConfig.filter(name => !macroConfigs.some(m => m.name === name));

      // A. Xử lý Macro Group
      selectedMacros.forEach(macroName => {
          const config = macroConfigs.find(m => m.name === macroName);
          if (!config) return;

          const childIds = new Set(config.items || []);
          const childItems = items.filter(i => childIds.has(i.id));

          if (childItems.length > 0) {
              // Tính tổng (Hỗ trợ cả field Realtime và Luyke)
              const aggregatedItem = {
                  id: config.id, 
                  name: config.name,
                  isMacro: true, 
                  dtqd: childItems.reduce((sum, i) => sum + (i.dtqd || i.revenueQuyDoi || 0), 0),
                  dt: childItems.reduce((sum, i) => sum + (i.dt || i.revenue || 0), 0),
                  quantity: childItems.reduce((sum, i) => sum + (i.quantity || i.soLuong || i.sl || 0), 0),
                  _children: childItems 
              };
              finalResults.push(aggregatedItem);
          } 
      });

      // B. Xử lý Simple Items
      selectedSimples.forEach(simpleName => {
          const item = items.find(i => i.name === simpleName);
          if (item) {
              // Chuẩn hóa data field nếu cần để hiển thị thống nhất
              finalResults.push({ 
                  ...item, 
                  dtqd: (item.dtqd || item.revenueQuyDoi || 0),
                  dt: (item.dt || item.revenue || 0),
                  quantity: (item.quantity || item.soLuong || item.sl || 0),
                  isMacro: false 
              });
          }
      });

      // Sắp xếp giảm dần theo doanh thu QĐ
      return finalResults.sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
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

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden h-full flex flex-col">
  <div class="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
    <div class="flex items-center gap-2 font-bold text-slate-700 text-sm uppercase">
      <div class="p-1.5 bg-blue-100 rounded text-blue-600">
          <i data-feather="zap" class="w-4 h-4"></i>
      </div>
      <span>TOP NHÓM HÀNG</span>
    </div>

    <div class="relative filter-wrapper">
        <button class="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors {isSettingsOpen ? 'bg-blue-50 text-blue-600' : ''}" on:click={() => isSettingsOpen = !isSettingsOpen} title="Chọn nhóm hàng">
             <i data-feather="filter" class="w-4 h-4"></i>
        </button>
        {#if isSettingsOpen}
            <div class="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col overflow-hidden">
                <div class="p-2 border-b border-gray-100 bg-gray-50">
                    <input type="text" class="w-full p-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none" placeholder="Tìm nhóm hàng..." bind:value={filterSearch} />
                </div>
                <div class="overflow-y-auto custom-scrollbar p-1" style="max-height: 250px;">
                    {#if filterList.length === 0}
                         <p class="text-xs text-gray-500 text-center p-2">Không tìm thấy.</p>
                    {:else}
                        {#each filterList as group}
                            {@const isChecked = localConfig.includes(group.name)}
                            <div class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer" on:click={() => toggleQdcSelection(group.name)}>
                                 <input type="checkbox" checked={isChecked} class="rounded text-blue-600 focus:ring-blue-500" />
                                 {#if group.type === 'macro'}
                                    <label class="{isChecked ? 'font-bold text-teal-700' : 'text-teal-600 font-semibold'} text-xs flex items-center gap-1 cursor-pointer flex-1">
                                        <i data-feather="layers" class="w-3 h-3"></i>
                                        {group.name}
                                    </label>
                                 {:else}
                                    <label class="{isChecked ? 'font-bold text-blue-700' : 'text-gray-700'} text-xs cursor-pointer flex-1">{group.name}</label>
                                 {/if}
                            </div>
                        {/each}
                    {/if}
                 </div>
                <div class="p-2 border-t border-gray-100 bg-gray-50 flex justify-between text-xs">
                    <button class="text-blue-600 font-semibold hover:underline" on:click={() => toggleAllVisibility(true)}>Hiện tất cả</button>
                    <button class="text-red-600 font-semibold hover:underline" on:click={() => toggleAllVisibility(false)}>Ẩn tất cả</button>
                </div>
            </div>
        {/if}
    </div>
  </div>

  <div class="custom-scrollbar flex-1 overflow-y-auto p-2">
    {#if sortedItems.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
          <p class="text-sm">Không có dữ liệu hiển thị.</p>
          {#if items.length > 0}
             <p class="text-xs mt-1">Hãy kiểm tra bộ lọc nhóm hàng.</p>
          {/if}
       </div>
    {:else}
      <div class="flex flex-col gap-0">
        {#each sortedItems as item, index (item.name)}
          {@const percent = maxVal > 0 ? (item.dtqd / maxVal) * 100 : 0}
          
          {@const barColor = BAR_COLORS[index % BAR_COLORS.length]}
          
          <div class="py-2.5 border-b border-dashed border-gray-100 last:border-0 transition-colors px-1.5 rounded
                      {item.isMacro ? 'bg-teal-50/40 hover:bg-teal-50/60' : 'hover:bg-gray-50'}">
            
            <div class="flex items-center gap-3">
               <div class="w-6 text-center font-bold text-gray-400 text-xs">#{index + 1}</div>
               
               <div class="flex-grow min-w-0">
                   <div class="flex justify-between items-center mb-1.5">
                       <span class="text-sm font-semibold truncate pr-2 flex items-center gap-1.5 {item.isMacro ? 'text-teal-800' : 'text-slate-700'}" title={item.name}>
                           {#if item.isMacro}
                                <i data-feather="layers" class="w-3.5 h-3.5 text-teal-600"></i>
                           {/if}
                           {item.name}
                       </span>
                       <span class="text-sm font-bold whitespace-nowrap text-slate-800">
                           {formatters.formatRevenue(item.dtqd)}
                       </span>
                   </div>
                   
                   <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5 shadow-inner">
                        <div class="h-full rounded-full {barColor} shadow-sm transition-all duration-500 ease-out" style="width: {percent}%"></div>
                   </div>
                   
                   <div class="flex justify-between text-[10px] text-gray-500 flex-wrap gap-y-1 font-medium">
                       <div class="flex gap-3">
                           <span>DT: <strong class="text-slate-600">{formatters.formatRevenue(item.dt)}</strong></span>
                           <span class="{item.isMacro ? 'text-teal-600' : 'text-blue-600'}">QĐ: <strong>{formatters.formatRevenue(item.dtqd)}</strong></span>
                       </div>
                       <div class="flex gap-3">
                           <span>SL: {formatters.formatNumber(item.quantity)}</span>
                           {#if numDays > 1}
                                <span>TB: <strong>{formatters.formatNumber(item.quantity / numDays, 0)}</strong>/ngày</span>
                           {/if}
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
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>