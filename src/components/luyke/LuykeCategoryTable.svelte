<script>
  import { onMount, afterUpdate } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { cleanCategoryName } from '../../utils.js';
  
  // Import components con
  import LuykeCategoryCharts from './sub/LuykeCategoryCharts.svelte';
  import LuykeCategoryToolbar from './sub/LuykeCategoryToolbar.svelte';

  export let items = []; 
  export let unexportedItems = []; 
  export let rawSource = []; 
  export let numDays = 1;

  // --- STATE ---
  let showUnexported = false;
  let viewMode = 'grid'; 
  let searchText = '';
  let sortMode = 'revenue_desc';
  
  let isSettingsOpen = false;
  let filterSearch = '';
  let hiddenCategories = new Set(); 

  // --- PERSISTENT FILTER ---
  const STORAGE_KEY = 'luyke_category_hidden_items';

  onMount(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          try {
              hiddenCategories = new Set(JSON.parse(saved));
          } catch (e) { console.error(e); }
      }
  });

  function saveHiddenState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenCategories]));
  }

  // --- REACTIVE TITLE ---
  $: titleText = showUnexported 
      ? "CHI TIẾT CHƯA XUẤT (QĐ)" 
      : (viewMode === 'grid' ? "CHI TIẾT NGÀNH HÀNG" : "TỶ TRỌNG NGÀNH HÀNG");
  
  $: titleIcon = showUnexported ? "alert-circle" : (viewMode === 'grid' ? "grid" : "pie-chart");
  $: titleClass = showUnexported ? "text-orange-700" : "text-gray-700";
  $: iconClass = showUnexported ? "text-orange-600" : "text-blue-600";

  function getCategoryTheme(name) {
      const n = name.toLowerCase();
      if (n.includes('điện tử') || n.includes('tivi')) return { icon: 'tv', theme: 'theme-teal' };
      if (n.includes('máy giặt') || n.includes('sấy')) return { icon: 'disc', theme: 'theme-blue' };
      if (n.includes('máy lạnh') || n.includes('nước nóng') || n.includes('điều hòa')) return { icon: 'wind', theme: 'theme-blue' };
      if (n.includes('tủ lạnh') || n.includes('tủ đông') || n.includes('tủ mát')) return { icon: 'server', theme: 'theme-blue' };
      if (n.includes('lọc nước')) return { icon: 'droplet', theme: 'theme-blue' };
      if (n.includes('tablet') || n.includes('máy tính bảng')) return { icon: 'tablet', theme: 'theme-green' };
      if (n.includes('laptop') || n.includes('máy tính')) return { icon: 'monitor', theme: 'theme-teal' };
      if (n.includes('điện thoại') || n.includes('smartphone')) return { icon: 'smartphone', theme: 'theme-blue' };
      if (n.includes('vas') || n.includes('software') || n.includes('phần mềm')) return { icon: 'command', theme: 'theme-gray' };
      if (n.includes('it') || n.includes('máy in')) return { icon: 'printer', theme: 'theme-gray' };
      if (n.includes('dụng cụ') || n.includes('bếp') || n.includes('dao') || n.includes('kéo')) return { icon: 'scissors', theme: 'theme-orange' };
      if (n.includes('gia dụng') || n.includes('nồi')) return { icon: 'home', theme: 'theme-orange' };
      if (n.includes('thẻ cào')) return { icon: 'credit-card', theme: 'theme-green' };
      if (n.includes('sim')) return { icon: 'cpu', theme: 'theme-green' };
      if (n.includes('phụ kiện') || n.includes('cáp') || n.includes('sạc')) return { icon: 'headphones', theme: 'theme-purple' };
      if (n.includes('đồng hồ')) return { icon: 'watch', theme: 'theme-gray' };
      if (n.includes('bảo hiểm') || n.includes('bh')) return { icon: 'shield', theme: 'theme-green' };
      return { icon: 'tag', theme: 'theme-gray' };
  }

  // --- FILTER & DATA LOGIC ---
  $: allCategoryNames = items.map(i => i.name || i.nganhHang).sort();
  $: filterList = allCategoryNames.filter(name => name.toLowerCase().includes(filterSearch.toLowerCase()));

  function toggleCategoryVisibility(event) {
      const name = event.detail;
      if (hiddenCategories.has(name)) hiddenCategories.delete(name);
      else hiddenCategories.add(name);
      hiddenCategories = new Set(hiddenCategories);
      saveHiddenState();
  }

  function toggleAllVisibility(event) {
      const show = event.detail;
      hiddenCategories = show ? new Set() : new Set(allCategoryNames);
      saveHiddenState();
  }

  $: sourceData = showUnexported ? unexportedItems : items;

  $: filteredItems = sourceData.filter(item => {
      const name = item.name || item.nganhHang || '';
      const visibilityMatch = !hiddenCategories.has(name);
      const valueMatch = showUnexported ? (item.soLuong > 0) : true;
      return visibilityMatch && valueMatch;
  });

  $: gridDisplayItems = filteredItems.filter(item => {
      const name = item.name || item.nganhHang || '';
      return !searchText || name.toLowerCase().includes(searchText.toLowerCase());
  });

  $: sortedItems = [...gridDisplayItems].sort((a, b) => {
      const getRev = (i) => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0);
      const getQty = (i) => showUnexported ? (i.soLuong || 0) : (i.quantity || 0);
      const getName = (i) => (i.name || i.nganhHang || '');

      if (sortMode === 'revenue_desc') return getRev(b) - getRev(a);
      if (sortMode === 'quantity_desc') return getQty(b) - getQty(a);
      if (sortMode === 'name_asc') return getName(a).localeCompare(getName(b));
      return 0;
  });

  $: totalRevenue = sourceData.reduce((sum, item) => sum + (showUnexported ? (item.doanhThuQuyDoi || 0) : (item.revenue || 0)), 0);
  $: maxVal = Math.max(...sourceData.map(i => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0)), 1);

  // --- CHART DATA PREP ---
  $: pieData = (() => {
      const sorted = filteredItems
          .filter(i => (i.revenue || 0) > 0)
          .sort((a, b) => b.revenue - a.revenue);
      if (sorted.length <= 14) return sorted;
      const top13 = sorted.slice(0, 13);
      const others = sorted.slice(13);
      const otherRevenue = others.reduce((sum, item) => sum + item.revenue, 0);
      return [...top13, { name: 'Khác', revenue: otherRevenue }];
  })();

  $: barData = calculateBrandData(rawSource, filteredItems);

  function calculateBrandData(source, visibleItems) {
      if (!source || source.length === 0) return [];
      const visibleCategoryNames = new Set(visibleItems.map(i => cleanCategoryName(i.name || i.nganhHang)));
      const brands = {};
      source.forEach(row => {
          const rowCategoryName = cleanCategoryName(row.nganhHang);
          if (!visibleCategoryNames.has(rowCategoryName)) return;
          const brandName = row.nhaSanXuat || 'Khác';
          const revenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
          if (!brands[brandName]) brands[brandName] = { name: brandName, revenue: 0 };
          brands[brandName].revenue += revenue;
      });
      return Object.values(brands).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
  }

  function handleWindowClick(e) {
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) {
          isSettingsOpen = false;
      }
  }
  
  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<svelte:window on:click={handleWindowClick} />

<div class="luyke-tier-2-container">
    
    <LuykeCategoryToolbar
        {titleText} {titleIcon} {titleClass} {iconClass}
        bind:viewMode
        bind:showUnexported
        bind:sortMode
        bind:searchText
        bind:isSettingsOpen
        bind:filterSearch
        {filterList}
        {hiddenCategories}
        on:toggleCategory={toggleCategoryVisibility}
        on:toggleAll={toggleAllVisibility}
    />

    {#if viewMode === 'grid'}
        {#if sortedItems.length === 0}
            <div class="p-12 text-center bg-white border border-gray-200 border-t-0 rounded-b-xl">
                <p class="text-gray-500">{showUnexported ? 'Không có đơn hàng chưa xuất.' : 'Không có dữ liệu hiển thị.'}</p>
            </div>
        {:else}
            <div class="luyke-cat-grid p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
                {#each sortedItems as item (item.name || item.nganhHang)}
                    {@const name = item.name || item.nganhHang}
                    {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                    {@const quantity = showUnexported ? item.soLuong : item.quantity}
                    {@const style = getCategoryTheme(name)}
                    {@const marketSharePercent = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0}
                    {@const barPercent = maxVal > 0 ? (revenue / maxVal) * 100 : 0}
                    {@const finalTheme = showUnexported ? 'theme-warning' : style.theme}

                    <div class="cat-card-colorful {finalTheme}">
                        <div class="cat-top-row">
                            <div class="cat-icon-box">
                                <i data-feather={style.icon} class="w-5 h-5"></i>
                            </div>
                            {#if !showUnexported}
                                <span class="cat-percent-text text-xs" title="Tỷ trọng đóng góp">
                                    {formatters.formatPercentage(marketSharePercent/100)}
                                </span>
                            {/if}
                        </div>
                        <h4 class="cat-name-text" title={name}>{name}</h4>
                        <div class="cat-value-text">{formatters.formatRevenue(revenue,0)}</div>
                        <div class="cat-footer-row">
                            <span>SL: <strong>{formatters.formatNumber(quantity)}</strong></span>
                            {#if !showUnexported}
                                <span>TB: <strong>{formatters.formatNumber(quantity/numDays, 0)}</strong>/ngày</span>
                            {/if}
                        </div>
                        <div class="cat-bar-bg">
                            <div class="cat-bar-fill" style="width: {barPercent}%"></div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {:else}
        <LuykeCategoryCharts 
            {pieData} 
            {barData} 
            {showUnexported} 
        />
    {/if}
</div>