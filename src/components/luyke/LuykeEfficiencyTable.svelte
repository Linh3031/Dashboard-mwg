<script>
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte';
  import { formatters } from '../../utils/formatters.js';

  export let items = []; 
  export let dynamicItems = [];
  export let supermarketData = {}; 
  
  const dispatch = createEventDispatcher();

  let isSettingsOpen = false;
  let filterSearch = '';
  let hiddenIds = new Set(); 

  const STORAGE_KEY = 'luyke_efficiency_hidden_ids';

  onMount(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          try { hiddenIds = new Set(JSON.parse(saved)); } catch (e) {}
      }
  });

  function saveHiddenState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenIds]));
  }

  const iconMap = {
      'pctPhuKien': 'headphones', 'pctGiaDung': 'home', 'pctMLN': 'droplet',
      'pctSim': 'cpu', 'pctVAS': 'layers', 'pctBaoHiem': 'shield', 'tyLeTraCham': 'credit-card'
  };

  $: displayItems = [
     
      ...items,
      ...(dynamicItems || []).map(cfg => {
          const metric = supermarketData.dynamicMetrics?.[cfg.id];
          return {
              id: cfg.id,
              label: cfg.label,
              value: metric ? metric.value : 0,
              target: cfg.target, // Target từ config admin
              isDynamic: true,
              rawConfig: cfg
        
          };
      })
  ];

  $: filterList = displayItems.filter(item => item.label.toLowerCase().includes(filterSearch.toLowerCase()));
  $: visibleItems = displayItems.filter(item => !hiddenIds.has(item.id));

  function toggleVisibility(id) {
      if (hiddenIds.has(id)) hiddenIds.delete(id); else hiddenIds.add(id);
      hiddenIds = new Set(hiddenIds);
      saveHiddenState();
  }

  function toggleAllVisibility(show) {
      hiddenIds = show ? new Set() : new Set(displayItems.map(i => i.id));
      saveHiddenState();
  }

  // [LOGIC MỚI] Màu sắc dựa trên Mục tiêu: Xanh dương (Đạt) - Đỏ (Không đạt)
  function getProgressColor(val, target) {
      const t = (target || 0) / 100;
      if (t <= 0) return '#3b82f6'; // Mặc định xanh dương nếu ko có target
      return val >= t ? '#2563eb' : '#ef4444'; // Blue-600 nếu đạt, Red-500 nếu rớt
  }

  function handleWindowClick(e) {
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) 
        isSettingsOpen = false;
  }
  
  function handleDelete(id) {
      if(confirm('Bạn có chắc muốn xóa chỉ số này?')) dispatch('delete', id);
  }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<svelte:window on:click={handleWindowClick} />
<div class="luyke-widget h-full">
  <div class="luyke-widget-header">
    <div class="luyke-widget-title">
      <div class="p-1.5 bg-blue-100 rounded text-blue-600 mr-2">
          <i data-feather="bar-chart-2" class="w-4 h-4"></i>
      </div>
      <span>Hiệu Quả Khai Thác</span>
    </div>
    <div class="flex items-center gap-2">
        <button class="text-blue-600 hover:bg-blue-50 p-1.5 rounded text-xs font-bold flex items-center gap-1 border border-blue-200" on:click={() => dispatch('add')} title="Thêm chỉ số mới">
            <i data-feather="plus" class="w-3 h-3"></i> Thêm
 
        </button>
        <div class="relative filter-wrapper">
            <button class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" on:click={() => isSettingsOpen = !isSettingsOpen}><i data-feather="filter" class="w-4 h-4"></i></button>
            {#if isSettingsOpen}
                <div class="filter-dropdown">
                    <div class="filter-header"><input type="text" class="filter-search" placeholder="Tìm chỉ số..." bind:value={filterSearch} /></div>
                    <div class="filter-body custom-scrollbar" style="max-height: 250px;">
                 
                        {#each filterList as item (item.id)}
                            <div class="filter-item" on:click={() => toggleVisibility(item.id)}>
                                <input type="checkbox" checked={!hiddenIds.has(item.id)} /> <label>{item.label}</label>
                            </div>
                        {/each}
           
                    </div>
                    <div class="filter-actions">
                        <button class="filter-btn-link" on:click={() => toggleAllVisibility(true)}>Hiện tất cả</button>
                        <button class="filter-btn-link text-red-600" on:click={() => toggleAllVisibility(false)}>Ẩn tất cả</button>
                    </div>
                </div>
            {/if}
   
        </div>
    </div>
  </div>

  <div class="luyke-widget-body custom-scrollbar">
    {#if visibleItems.length === 0}
       <div class="flex flex-col items-center justify-center h-full text-gray-400"><p class="text-sm">Đã ẩn hết dữ liệu.</p></div>
    {:else}
      <div class="flex flex-col gap-0">
        {#each visibleItems as item (item.id)}
          {@const targetVal = (item.target || 0) / 100}
          {@const color = getProgressColor(item.value, item.target)}
          {@const percent = Math.min((item.value * 100), 100)}
          
          <div class="eff-item-compact group relative hover:bg-gray-50 transition-colors">
     
            <div class="eff-icon-compact"><i data-feather={iconMap[item.id] || 'activity'} class="w-4 h-4"></i></div>
            <div class="eff-content-compact">
                <div class="eff-row-top">
                    <span class="eff-label-text">{item.label}</span>
                    <div class="flex items-center gap-2">
                        {#if item.target > 0}
                            <span class="text-[10px] text-gray-400 font-medium whitespace-nowrap">- Mục tiêu : {item.target}%</span>
                        {/if}
                        <span class="eff-value-text" style="color: {color}">{formatters.formatPercentage(item.value)}</span>
                    </div>
                </div>
                <div class="eff-row-bottom">
                    <div class="eff-bar-container">
 
                        <div class="eff-bar-fill" style="width: {percent}%; background-color: {color};"></div>
                    </div>
                    </div>
 
            </div>
            {#if item.isDynamic}
                <div class="absolute right-2 top-2 hidden group-hover:flex gap-1 bg-white shadow-sm border border-gray-200 rounded p-1 z-10">
                    <button on:click|stopPropagation={() => dispatch('edit', item.rawConfig)} class="text-gray-500 hover:text-blue-600 p-1"><i data-feather="edit-2" class="w-3 h-3"></i></button>
                    <button on:click|stopPropagation={() => handleDelete(item.id)} class="text-gray-500 hover:text-red-600 p-1"><i data-feather="trash-2" class="w-3 h-3"></i></button>
                </div>
            {/if}
  
         </div>
        {/each}
      </div>
    {/if}
  </div>
</div>