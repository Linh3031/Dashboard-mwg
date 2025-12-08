<script>
  import { afterUpdate } from 'svelte';
  import { formatters } from '../../utils/formatters.js';

  export let items = [];
  export let numDays = 1;

  // --- STATE FILTER ---
  let isSettingsOpen = false;
  let filterSearch = '';
  let hiddenNames = new Set(); 

  // --- LOGIC FILTER ---
  // Lấy danh sách tên duy nhất để tạo bộ lọc
  $: allNames = items.map(i => i.name).sort();

  $: filterList = allNames.filter(name => 
      name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  function toggleVisibility(name) {
      if (hiddenNames.has(name)) {
          hiddenNames.delete(name);
      } else {
          hiddenNames.add(name);
      }
      hiddenNames = new Set(hiddenNames);
  }

  function toggleAllVisibility(show) {
      if (show) {
          hiddenNames = new Set();
      } else {
          hiddenNames = new Set(allNames);
      }
  }

  // --- LOGIC SORT & DISPLAY ---
  // 1. Lọc trước
  $: filteredItems = items.filter(item => !hiddenNames.has(item.name));

  // 2. Sort sau
  $: sortedItems = [...filteredItems].sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
  
  // Max value để vẽ sparkline (tính trên tập dữ liệu ĐANG hiển thị)
  $: maxVal = sortedItems.length > 0 ? sortedItems[0].dtqd : 0;

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

<div class="luyke-widget h-full">
  <div class="luyke-widget-header">
    <div class="luyke-widget-title">
      <div class="p-1.5 bg-yellow-100 rounded text-yellow-600 mr-2">
          <i data-feather="star" class="w-4 h-4"></i>
      </div>
      <span>Top Quy Đổi Cao</span>
    </div>

    <div class="relative filter-wrapper">
        <button 
            class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" 
            on:click={() => isSettingsOpen = !isSettingsOpen}
            title="Lọc nhóm hàng hiển thị"
        >
            <i data-feather="filter" class="w-4 h-4"></i>
        </button>

        {#if isSettingsOpen}
            <div class="filter-dropdown">
                <div class="filter-header">
                    <input 
                        type="text" 
                        class="filter-search" 
                        placeholder="Tìm nhóm hàng..." 
                        bind:value={filterSearch} 
                    />
                </div>
                <div class="filter-body custom-scrollbar" style="max-height: 250px;">
                    {#if filterList.length === 0}
                        <p class="text-xs text-gray-500 text-center p-2">Không tìm thấy.</p>
                    {:else}
                        {#each filterList as name}
                            <div class="filter-item" on:click={() => toggleVisibility(name)}>
                                <input type="checkbox" checked={!hiddenNames.has(name)} />
                                <label>{name}</label>
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
       <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <p class="text-sm">{items.length === 0 ? 'Chưa có dữ liệu QĐC.' : 'Đã ẩn hết dữ liệu.'}</p>
       </div>
    {:else}
      <div class="flex flex-col gap-0">
        {#each sortedItems as item, index (item.id)}
          {@const percent = maxVal > 0 ? (item.dtqd / maxVal) * 100 : 0}
          
          <div class="py-2 border-b border-dashed border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-1">
            <div class="flex items-center gap-3">
               <div class="w-6 text-center font-bold text-gray-400 text-xs">#{index + 1}</div>
               
               <div class="flex-grow">
                   <div class="flex justify-between items-center mb-1">
                       <span class="text-sm font-semibold text-gray-700">{item.name}</span>
                       <span class="text-sm font-bold text-blue-600">{formatters.formatRevenue(item.dtqd)}</span>
                   </div>
                   
                   <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                       <div class="h-full bg-yellow-400 rounded-full" style="width: {percent}%"></div>
                   </div>
                   
                   <div class="flex justify-between mt-1 text-[10px] text-gray-400">
                       <span>SL: {formatters.formatNumber(item.sl)}</span>
                       <span>TB: {formatters.formatNumber(item.sl / numDays, 1)}/ngày</span>
                   </div>
               </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>