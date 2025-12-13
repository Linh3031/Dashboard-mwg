<script>
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';

  export let items = []; 
  export let dynamicItems = [];
  export let supermarketData = {}; 
  export let goals = {}; // Nhận goals từ component cha
  
  const dispatch = createEventDispatcher();

  // --- PHẦN STATE XỬ LÝ ẨN/HIỆN CỘT (FILTER) ---
  let isSettingsOpen = false;
  let filterSearch = '';
  let hiddenIds = new Set(); 
  const STORAGE_KEY = 'realtime_efficiency_hidden_ids';

  onMount(() => {
      // Load trạng thái ẩn hiện từ localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { 
          try { hiddenIds = new Set(JSON.parse(saved)); } catch (e) {} 
      }
      if (typeof feather !== 'undefined') feather.replace();
  });

  afterUpdate(() => { 
      if (typeof feather !== 'undefined') feather.replace(); 
  });

  function saveHiddenState() { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenIds])); 
  }

  // Map icon cho các chỉ số cố định
  const iconMap = { 
      'pctPhuKien': 'headphones', 
      'pctGiaDung': 'home', 
      'pctMLN': 'droplet', 
      'pctSim': 'cpu', 
      'pctVAS': 'layers', 
      'pctBaoHiem': 'shield', 
      'tyLeTraCham': 'credit-card' 
  };

  // Map key để lấy mục tiêu tương ứng từ settings
  const targetMap = {
      'pctPhuKien': 'phanTramPhuKien', 
      'pctGiaDung': 'phanTramGiaDung', 
      'pctMLN': 'phanTramMLN',
      'pctSim': 'phanTramSim', 
      'pctVAS': 'phanTramVAS', 
  
     'pctBaoHiem': 'phanTramBaoHiem', 
      'tyLeTraCham': 'phanTramTC'
  };

  // Gộp items cố định và dynamic items lại thành danh sách hiển thị
  $: displayItems = [
      // Các chỉ số cố định (Hardcoded)
      ...items.map(i => ({
          ...i,
          // Lấy target từ goals truyền vào, nếu không có thì bằng 0
          target: goals?.[targetMap[i.id]] || 0 
      })),
      // Các chỉ số động từ Admin Config
      ...(dynamicItems || []).map(cfg => {
          const metric = 
            supermarketData.dynamicMetrics?.[cfg.id];
          return {
              id: cfg.id,
              label: cfg.label,
              value: metric ? metric.value : 0,
              // Ưu tiên target trong Goals (User setting)
              target: goals?.[cfg.id] || cfg.target,
              isDynamic: true,
              rawConfig: cfg
          };
      })
  ];

  // Logic lọc danh sách trong dropdown filter
  $: filterList = displayItems.filter(item => item.label.toLowerCase().includes(filterSearch.toLowerCase()));

  // Danh sách 
  // các item thực sự được hiển thị ra ngoài (đã trừ các item bị ẩn)
  $: visibleItems = displayItems.filter(item => !hiddenIds.has(item.id));

  // Hàm toggle ẩn/hiện 1 item
  function toggleVisibility(id) {
      if (hiddenIds.has(id)) hiddenIds.delete(id); 
      else hiddenIds.add(id);
      hiddenIds = new Set(hiddenIds); // Trigger reactivity
      saveHiddenState();
  }

  // Hàm ẩn/hiện tất cả
  function toggleAllVisibility(show) {
      if (show) {
          hiddenIds = new Set();
      } else {
          hiddenIds = new Set(displayItems.map(i => i.id));
      }
      saveHiddenState();
  }

  // --- LOGIC MÀU SẮC & CẢNH BÁO ---
  // [CẬP NHẬT] Xanh dương cho Đạt, Đỏ cho Rớt
  function getProgressColor(val, target) {
      const t = (target || 0) / 100;
      if (t <= 0) return '#3b82f6'; // Xanh dương mặc định nếu không có target
      return val >= t ? '#2563eb' : '#ef4444'; // Đạt -> Xanh dương, Rớt -> Đỏ
  }
  
  // Đóng dropdown khi click ra ngoài
  function handleWindowClick(e) { 
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) {
          isSettingsOpen = false;
      }
  }

  function handleDelete(id) { 
      if(confirm('Bạn có chắc muốn xóa chỉ số này?')) {
          dispatch('delete', id);
      }
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="luyke-widget h-full bg-white border border-gray-200 rounded-xl shadow-sm">
  <div class="luyke-widget-header">
    <div class="luyke-widget-title">
      <div class="p-1.5 bg-blue-100 rounded text-blue-600 mr-2">
     
           <i data-feather="bar-chart-2" class="w-4 h-4"></i>
      </div>
      <span>HIỆU QUẢ KHAI THÁC</span>
    </div>
    
    <div class="flex items-center gap-2">
        <button class="text-blue-600 hover:bg-blue-50 p-1.5 rounded text-xs font-bold flex items-center gap-1 border border-blue-200" on:click={() => dispatch('add')}>
            <i data-feather="plus" class="w-3 h-3"></i> Thêm
        </button>
        
        <div class="relative filter-wrapper">
            <button class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" on:click={() => isSettingsOpen = !isSettingsOpen}>
                <i 
 data-feather="filter" class="w-4 h-4"></i>
            </button>
            
            {#if isSettingsOpen}
                <div class="filter-dropdown">
                    <div class="filter-header">
                        <input type="text" class="filter-search" placeholder="Tìm chỉ số..." bind:value={filterSearch} />
                    </div>
              
                     <div class="filter-body custom-scrollbar" style="max-height: 250px;">
                        {#each filterList as item (item.id)}
                            <div class="filter-item" on:click={() => toggleVisibility(item.id)}>
                                <input type="checkbox" checked={!hiddenIds.has(item.id)} /> 
                                <label>{item.label}</label>
    
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

  <div class="luyke-widget-body custom-scrollbar p-0">
    {#if visibleItems.length === 0}
       <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
           <p class="text-sm">Đã ẩn hết dữ liệu.</p>
       </div>
    {:else}
      <div class="flex flex-col gap-0">
        {#each visibleItems 
 as item (item.id)}
          {@const targetVal = (item.target || 0) / 100}
          {@const color = getProgressColor(item.value, item.target)}
          {@const percent = Math.min((item.value * 100), 100)}
          
          <div class="eff-item-compact group relative hover:bg-gray-50 transition-colors px-4">
            <div class="eff-icon-compact">
                <i data-feather={iconMap[item.id] || 'activity'} class="w-4 h-4"></i>
            </div>
            
         
            <div class="eff-content-compact">
                <div class="eff-row-top">
                    <span class="eff-label-text">{item.label}</span>
                    <div class="flex items-center gap-2">
                        {#if item.target > 0}
                             <span class="text-[10px] text-gray-400 font-medium whitespace-nowrap">- Mục tiêu : {item.target}%</span>
                        {/if}
                        <span class="eff-value-text" style="color: {color}">
                            {formatters.formatPercentage(item.value)}
                        </span>
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
                     <button on:click|stopPropagation={() => dispatch('edit', item.rawConfig)} class="text-gray-500 hover:text-blue-600 p-1" title="Sửa">
                         <i data-feather="edit-2" class="w-3 h-3"></i>
                     </button>
                    <button on:click|stopPropagation={() => handleDelete(item.id)} class="text-gray-500 hover:text-red-600 p-1" title="Xóa">
               
                         <i data-feather="trash-2" class="w-3 h-3"></i>
                    </button>
                </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>