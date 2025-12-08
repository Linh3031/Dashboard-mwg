<script>
  import { onMount, afterUpdate, tick } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { cleanCategoryName, getRandomBrightColor } from '../../utils.js';

  export let items = []; // Danh sách ngành hàng tổng hợp
  export let unexportedItems = []; 
  export let rawSource = []; // Dữ liệu thô
  export let numDays = 1;

  // --- STATE ---
  let showUnexported = false;
  let viewMode = 'grid'; // 'grid' | 'chart'
  let searchText = '';
  let sortMode = 'revenue_desc';
  
  // State cho Filter Hiển thị (Settings)
  let isSettingsOpen = false;
  let filterSearch = '';
  let hiddenCategories = new Set(); 

  // State cho Chart
  let selectedGroupFilter = 'All'; 
  let chartInstancePie = null;
  let chartInstanceBar = null;

  // --- REACTIVE TITLE ---
  $: titleText = showUnexported ? "CHI TIẾT CHƯA XUẤT (QĐ)" : "TỶ TRỌNG NGÀNH HÀNG";
  $: titleIcon = showUnexported ? "alert-circle" : "grid";
  $: titleClass = showUnexported ? "text-orange-700" : "text-gray-700";
  $: iconClass = showUnexported ? "text-orange-600" : "text-blue-600";

  // --- 1. LOGIC ICON MỚI (THEO YÊU CẦU) ---
  function getCategoryTheme(name) {
      const n = name.toLowerCase();
      
      // Điện tử -> Hình tivi
      if (n.includes('điện tử') || n.includes('tivi')) return { icon: 'tv', theme: 'theme-teal' };
      
      // Máy giặt, Sấy -> Hình tròn xoay
      if (n.includes('máy giặt') || n.includes('sấy')) return { icon: 'disc', theme: 'theme-blue' };
      
      // Máy lạnh, nước nóng -> Hình gió
      if (n.includes('máy lạnh') || n.includes('nước nóng') || n.includes('điều hòa')) return { icon: 'wind', theme: 'theme-blue' };
      
      // Tủ lạnh, Đông, mát -> Hình server (hộp xếp chồng)
      if (n.includes('tủ lạnh') || n.includes('tủ đông') || n.includes('tủ mát')) return { icon: 'server', theme: 'theme-blue' };
      
      // Máy lọc nước -> Hình giọt nước
      if (n.includes('lọc nước')) return { icon: 'droplet', theme: 'theme-blue' };
      
      // Tablet -> Hình tablet
      if (n.includes('tablet') || n.includes('máy tính bảng')) return { icon: 'tablet', theme: 'theme-green' };
      
      // Laptop -> Hình màn hình
      if (n.includes('laptop') || n.includes('máy tính')) return { icon: 'monitor', theme: 'theme-teal' };
      
      // Điện thoại
      if (n.includes('điện thoại') || n.includes('smartphone')) return { icon: 'smartphone', theme: 'theme-blue' };
      
      // VAS, Software -> Hình lệnh/code
      if (n.includes('vas') || n.includes('software') || n.includes('phần mềm')) return { icon: 'command', theme: 'theme-gray' };
      
      // IT -> Hình máy in
      if (n.includes('it') || n.includes('máy in')) return { icon: 'printer', theme: 'theme-gray' };
      
      // Dụng cụ nhà bếp -> Hình kéo
      if (n.includes('dụng cụ') || n.includes('bếp') || n.includes('dao') || n.includes('kéo')) return { icon: 'scissors', theme: 'theme-orange' };
      
      // Gia dụng (chung) -> Hình nhà
      if (n.includes('gia dụng') || n.includes('nồi')) return { icon: 'home', theme: 'theme-orange' };
      
      // Thẻ cào -> Hình thẻ
      if (n.includes('thẻ cào')) return { icon: 'credit-card', theme: 'theme-green' };
      
      // SIM -> Hình chip
      if (n.includes('sim')) return { icon: 'cpu', theme: 'theme-green' };
      
      // Phụ kiện -> Tai nghe
      if (n.includes('phụ kiện') || n.includes('cáp') || n.includes('sạc')) return { icon: 'headphones', theme: 'theme-purple' };
      
      // Đồng hồ
      if (n.includes('đồng hồ')) return { icon: 'watch', theme: 'theme-gray' };
      
      // Bảo hiểm
      if (n.includes('bảo hiểm') || n.includes('bh')) return { icon: 'shield', theme: 'theme-green' };

      return { icon: 'tag', theme: 'theme-gray' };
  }

  // --- LOGIC FILTER HIỂN THỊ ---
  $: allCategoryNames = items.map(i => i.name || i.nganhHang).sort();
  
  $: filterList = allCategoryNames.filter(name => 
      name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  function toggleCategoryVisibility(name) {
      if (hiddenCategories.has(name)) {
          hiddenCategories.delete(name);
      } else {
          hiddenCategories.add(name);
      }
      hiddenCategories = new Set(hiddenCategories);
  }

  function toggleAllVisibility(show) {
      if (show) {
          hiddenCategories = new Set();
      } else {
          hiddenCategories = new Set(allCategoryNames);
      }
  }

  // --- LOGIC GRID DATA ---
  $: sourceData = showUnexported ? unexportedItems : items;

  $: filteredItems = sourceData.filter(item => {
      const name = item.name || item.nganhHang || '';
      const nameMatch = !searchText || name.toLowerCase().includes(searchText.toLowerCase());
      const valueMatch = showUnexported ? (item.soLuong > 0) : true;
      const visibilityMatch = !hiddenCategories.has(name);
      return nameMatch && valueMatch && visibilityMatch;
  });

  $: sortedItems = [...filteredItems].sort((a, b) => {
      const getRev = (i) => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0);
      const getQty = (i) => showUnexported ? (i.soLuong || 0) : (i.quantity || 0);
      const getName = (i) => (i.name || i.nganhHang || '');

      if (sortMode === 'revenue_desc') return getRev(b) - getRev(a);
      if (sortMode === 'quantity_desc') return getQty(b) - getQty(a);
      if (sortMode === 'name_asc') return getName(a).localeCompare(getName(b));
      return 0;
  });

  // --- 2. TÍNH TOÁN % (MARKET SHARE) ---
  // Tổng doanh thu của TẤT CẢ các mục đang hiển thị (để tính tỷ trọng đóng góp)
  $: totalRevenue = sourceData.reduce((sum, item) => sum + (showUnexported ? (item.doanhThuQuyDoi || 0) : (item.revenue || 0)), 0);
  
  // Giá trị lớn nhất (để vẽ thanh sparkline cho đẹp)
  $: maxVal = Math.max(...sourceData.map(i => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0)), 1);

  // --- LOGIC CHART ---
  $: uniqueGroups = [...new Set(rawSource.map(r => cleanCategoryName(r.nhomHang)).filter(Boolean))].sort();

  $: pieData = items.filter(i => i.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  $: barData = calculateBrandData(rawSource, selectedGroupFilter);

  function calculateBrandData(source, groupFilter) {
      if (!source || source.length === 0) return [];
      const brands = {};
      source.forEach(row => {
          const groupName = cleanCategoryName(row.nhomHang);
          if (groupFilter !== 'All' && groupName !== groupFilter) return;
          const brandName = row.nhaSanXuat || 'Khác';
          const revenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
          if (!brands[brandName]) brands[brandName] = { name: brandName, revenue: 0 };
          brands[brandName].revenue += revenue;
      });
      return Object.values(brands).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
  }

  async function renderCharts() {
      if (typeof Chart === 'undefined') return;
      await tick();

      const ctxPie = document.getElementById('luyke-cat-pie-chart');
      if (ctxPie) {
          if (chartInstancePie) chartInstancePie.destroy();
          chartInstancePie = new Chart(ctxPie, {
              type: 'doughnut',
              data: {
                  labels: pieData.map(d => d.name),
                  datasets: [{
                      data: pieData.map(d => d.revenue),
                      backgroundColor: pieData.map(() => getRandomBrightColor()),
                      borderWidth: 1
                  }]
              },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } }
          });
      }

      const ctxBar = document.getElementById('luyke-brand-bar-chart');
      if (ctxBar) {
          if (chartInstanceBar) chartInstanceBar.destroy();
          chartInstanceBar = new Chart(ctxBar, {
              type: 'bar',
              data: {
                  labels: barData.map(d => d.name),
                  datasets: [{
                      label: 'Doanh thu',
                      data: barData.map(d => d.revenue),
                      backgroundColor: barData.map(() => getRandomBrightColor()),
                      borderRadius: 4
                  }]
              },
              options: {
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { beginAtZero: true } }
              }
          });
      }
  }

  $: if (viewMode === 'chart') { renderCharts(); }

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

<div class="luyke-tier-2-container">
    
    <div class="luyke-toolbar" style="flex-wrap: nowrap; gap: 8px;">
        <div class="luyke-toolbar-left" style="flex-grow: 1; min-width: 0;">
            <h3 class="text-lg font-bold uppercase flex items-center gap-2 {titleClass} truncate">
                <i data-feather={titleIcon} class="{iconClass} flex-shrink-0"></i>
                <span class="truncate">{titleText}</span>
            </h3>
        </div>

        <div class="luyke-toolbar-right" style="flex-shrink: 0; display: flex; align-items: center; gap: 8px;">
            
            <div class="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button 
                    class="view-mode-btn {viewMode === 'grid' ? 'active' : ''}" 
                    on:click={() => viewMode = 'grid'}
                    title="Xem dạng thẻ"
                >
                    <i data-feather="grid" class="w-4 h-4"></i>
                </button>
                <button 
                    class="view-mode-btn {viewMode === 'chart' ? 'active' : ''}" 
                    on:click={() => viewMode = 'chart'}
                    title="Xem biểu đồ"
                >
                    <i data-feather="pie-chart" class="w-4 h-4"></i>
                </button>
            </div>

            {#if viewMode === 'grid'}
                <div 
                    class="toggle-wrapper {showUnexported ? 'active' : ''}" 
                    on:click={() => showUnexported = !showUnexported}
                    title="Xem doanh thu chưa xuất"
                    style="padding: 4px 8px;"
                >
                    <div class="toggle-switch" style="width: 28px; height: 16px;"></div>
                    <span class="toggle-label text-xs whitespace-nowrap">Chưa xuất</span>
                </div>
            {/if}

            {#if viewMode === 'grid'}
                <div class="relative filter-wrapper">
                    <button 
                        class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" 
                        on:click={() => isSettingsOpen = !isSettingsOpen}
                        title="Lọc hiển thị ngành hàng"
                    >
                        <i data-feather="filter" class="w-4 h-4"></i>
                    </button>

                    {#if isSettingsOpen}
                        <div class="filter-dropdown">
                            <div class="filter-header">
                                <input type="text" class="filter-search" placeholder="Tìm để ẩn/hiện..." bind:value={filterSearch} />
                            </div>
                            <div class="filter-body custom-scrollbar">
                                {#if filterList.length === 0}
                                    <p class="text-xs text-gray-500 text-center p-2">Không tìm thấy.</p>
                                {:else}
                                    {#each filterList as name}
                                        <div class="filter-item" on:click={() => toggleCategoryVisibility(name)}>
                                            <input type="checkbox" checked={!hiddenCategories.has(name)} />
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
            {/if}

            {#if viewMode === 'grid'}
                <div class="relative hidden lg:block">
                    <input type="text" placeholder="Tìm nhanh..." class="luyke-search-input" style="width: 140px;" bind:value={searchText} />
                </div>
            {/if}
            
            {#if viewMode === 'grid'}
                <select class="p-1.5 border rounded text-xs bg-white outline-none cursor-pointer max-w-[100px]" bind:value={sortMode}>
                    <option value="revenue_desc">DT ↓</option>
                    <option value="quantity_desc">SL ↓</option>
                </select>
            {/if}

            {#if viewMode === 'chart'}
                <select class="p-1.5 border rounded text-xs bg-white outline-none max-w-[150px]" bind:value={selectedGroupFilter}>
                    <option value="All">Tất cả nhóm hàng</option>
                    {#each uniqueGroups as group}
                        <option value={group}>{group}</option>
                    {/each}
                </select>
            {/if}
        </div>
    </div>

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
                        
                        <div class="cat-value-text">
                            {formatters.formatRevenue(revenue)}
                        </div>
                        
                        <div class="cat-footer-row">
                            <span>SL: <strong>{formatters.formatNumber(quantity)}</strong></span>
                            {#if !showUnexported}
                                 <span>TB: <strong>{formatters.formatNumber(quantity/numDays, 1)}</strong>/ngày</span>
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
        <div class="luyke-charts-container p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
            <div class="chart-box">
                <h4 class="text-sm font-bold text-gray-700 mb-2 text-center">Top 10 Tỷ trọng Doanh Thu</h4>
                <div class="relative h-full w-full"><canvas id="luyke-cat-pie-chart"></canvas></div>
            </div>
            <div class="chart-box">
                <h4 class="text-sm font-bold text-gray-700 mb-2 text-center">Top 15 Nhà Sản Xuất ({selectedGroupFilter})</h4>
                <div class="relative h-full w-full"><canvas id="luyke-brand-bar-chart"></canvas></div>
            </div>
        </div>
    {/if}
</div>