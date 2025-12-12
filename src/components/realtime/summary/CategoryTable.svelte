<script>
  import { afterUpdate, tick, onMount } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { cleanCategoryName, getRandomBrightColor } from '../../../utils.js';
  // [MỚI] Import service để lưu cloud
  import { datasyncService } from '../../../services/datasync.service.js';
  import { selectedWarehouse } from '../../../stores.js';

  export let items = []; 
  export let unexportedItems = []; 
  export let rawSource = []; 

  // --- STATE ---
  let showUnexported = false;
  let viewMode = 'grid'; 
  let sortMode = 'revenue_desc';
  let searchText = '';
  
  // State cho bộ lọc
  let isSettingsOpen = false;
  let filterSearch = '';
  let hiddenCategories = new Set(); 
  let isLoadingConfig = false;

  let chartInstancePie = null;
  let chartInstanceBar = null;

  // --- LOGIC TITLE & THEME ---
  $: titleText = showUnexported 
      ? "CHI TIẾT CHƯA XUẤT (QĐ)" 
      : "CHI TIẾT NGÀNH HÀNG";
  
  $: titleIcon = showUnexported ? "alert-circle" : "layers";
  $: titleClass = showUnexported ? "text-red-700" : "text-blue-700";
  $: iconClass = showUnexported ? "text-red-600" : "text-blue-600";

  function getCategoryTheme(name) {
      const n = name.toLowerCase();
      if (n.includes('điện tử') || n.includes('tivi')) return { icon: 'tv', theme: 'theme-teal' };
      if (n.includes('máy giặt') || n.includes('sấy')) return { icon: 'disc', theme: 'theme-blue' };
      if (n.includes('máy lạnh') || n.includes('điều hòa')) return { icon: 'wind', theme: 'theme-blue' };
      if (n.includes('tủ lạnh') || n.includes('tủ đông')) return { icon: 'server', theme: 'theme-blue' };
      if (n.includes('lọc nước')) return { icon: 'droplet', theme: 'theme-blue' };
      if (n.includes('laptop') || n.includes('pc')) return { icon: 'monitor', theme: 'theme-teal' };
      if (n.includes('điện thoại') || n.includes('smartphone')) return { icon: 'smartphone', theme: 'theme-blue' };
      if (n.includes('gia dụng') || n.includes('bếp')) return { icon: 'home', theme: 'theme-orange' };
      if (n.includes('phụ kiện')) return { icon: 'headphones', theme: 'theme-purple' };
      if (n.includes('đồng hồ')) return { icon: 'watch', theme: 'theme-gray' };
      return { icon: 'tag', theme: 'theme-gray' };
  }

  // --- [MỚI] LOGIC LOAD/SAVE TỪ CLOUD ---
  // Tự động tải cấu hình khi chọn kho
  $: if ($selectedWarehouse) {
      loadCloudConfig($selectedWarehouse);
  }

  async function loadCloudConfig(kho) {
      isLoadingConfig = true;
      const hiddenList = await datasyncService.loadRealtimeHiddenCategories(kho);
      hiddenCategories = new Set(hiddenList);
      isLoadingConfig = false;
  }

  async function saveCloudConfig() {
      if ($selectedWarehouse) {
          await datasyncService.saveRealtimeHiddenCategories($selectedWarehouse, [...hiddenCategories]);
      }
  }

  // --- FILTER LOGIC ---
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
      saveCloudConfig(); // Lưu lên Cloud ngay lập tức
  }

  function toggleAllVisibility(show) {
      if (show) {
          hiddenCategories = new Set();
      } else {
          hiddenCategories = new Set(allCategoryNames);
      }
      saveCloudConfig(); // Lưu lên Cloud ngay lập tức
  }

  // --- DATA LOGIC ---
  $: sourceData = showUnexported ? unexportedItems : items;

  $: filteredItems = sourceData.filter(item => {
      const name = item.name || item.nganhHang || '';
      const matchSearch = !searchText || name.toLowerCase().includes(searchText.toLowerCase());
      const hasValue = showUnexported ? (item.doanhThuQuyDoi > 0) : (item.revenue > 0 || item.quantity > 0);
      
      // Kiểm tra ẩn/hiện
      const isVisible = !hiddenCategories.has(name);

      return matchSearch && hasValue && isVisible;
  });

  $: sortedItems = [...filteredItems].sort((a, b) => {
      const getRev = (i) => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0);
      const getQty = (i) => showUnexported ? (i.soLuong || 0) : (i.quantity || 0);
      
      if (sortMode === 'revenue_desc') return getRev(b) - getRev(a);
      if (sortMode === 'quantity_desc') return getQty(b) - getQty(a);
      return 0;
  });

  $: totalRevenue = sourceData.reduce((sum, item) => sum + (showUnexported ? (item.doanhThuQuyDoi || 0) : (item.revenue || 0)), 0);
  $: maxVal = Math.max(...sourceData.map(i => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0)), 1);

  // --- CHART LOGIC ---
  // (Logic biểu đồ giữ nguyên)
  $: pieData = (() => {
      const sorted = sortedItems.slice(); 
      if (sorted.length <= 14) return sorted;
      const top13 = sorted.slice(0, 13);
      const others = sorted.slice(13);
      const otherRevenue = others.reduce((sum, item) => sum + (showUnexported ? item.doanhThuQuyDoi : item.revenue), 0);
      return [...top13, { name: 'Khác', revenue: otherRevenue, doanhThuQuyDoi: otherRevenue }];
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

  async function renderCharts() {
      if (typeof Chart === 'undefined') return;
      await tick();

      // Pie Chart
      const ctxPie = document.getElementById('rt-cat-chart');
      if (ctxPie) {
          if (chartInstancePie) chartInstancePie.destroy();
          const totalPieRev = pieData.reduce((sum, d) => sum + (showUnexported ? d.doanhThuQuyDoi : d.revenue), 0);

          chartInstancePie = new Chart(ctxPie, {
              type: 'doughnut',
              data: {
                  labels: pieData.map(d => d.name || d.nganhHang),
                  datasets: [{
                      data: pieData.map(d => showUnexported ? d.doanhThuQuyDoi : d.revenue),
                      backgroundColor: pieData.map(() => getRandomBrightColor()),
                      borderWidth: 1
                  }]
              },
              options: { 
                  responsive: true, maintainAspectRatio: false,
                  plugins: { 
                      legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
                      datalabels: {
                          formatter: (value) => {
                              const pct = totalPieRev > 0 ? (value / totalPieRev * 100) : 0;
                              return pct > 3 ? pct.toFixed(1) + "%" : "";
                          },
                          color: '#fff', font: { weight: 'bold', size: 10 }
                      }
                  } 
              },
              plugins: [ChartDataLabels]
          });
      }

      // Bar Chart
      const ctxBar = document.getElementById('rt-brand-chart');
      if (ctxBar) {
          if (chartInstanceBar) chartInstanceBar.destroy();
          chartInstanceBar = new Chart(ctxBar, {
              type: 'bar',
              data: {
                  labels: barData.map(d => d.name),
                  datasets: [{
                      label: 'Doanh thu (Tr)',
                      data: barData.map(d => d.revenue / 1000000),
                      backgroundColor: barData.map(() => getRandomBrightColor()),
                      borderRadius: 4
                  }]
              },
              options: {
                  indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                  plugins: {
                      legend: { display: false },
                      datalabels: {
                          anchor: 'end', align: 'end',
                          formatter: (val) => formatters.formatNumber(val, 0),
                          color: '#4b5563', font: { weight: 'bold', size: 10 }
                      },
                      tooltip: {
                          callbacks: { label: (ctx) => formatters.formatRevenue(ctx.raw * 1000000) }
                      }
                  },
                  scales: { x: { beginAtZero: true } }
              },
              plugins: [ChartDataLabels]
          });
      }
  }

  $: if (viewMode === 'chart') setTimeout(renderCharts, 0);

  function handleWindowClick(e) {
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) {
          isSettingsOpen = false;
      }
  }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<svelte:window on:click={handleWindowClick} />

<div class="luyke-widget h-full">
    <div class="luyke-toolbar">
        <div class="luyke-toolbar-left flex-grow min-w-0">
            <h3 class="text-base sm:text-lg font-bold uppercase flex items-center gap-2 {titleClass} truncate">
                <i data-feather={titleIcon} class="{iconClass} flex-shrink-0"></i>
                <span class="truncate">{titleText}</span>
            </h3>
        </div>

        <div class="luyke-toolbar-right flex items-center gap-2">
            <div class="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button class="view-mode-btn {viewMode === 'grid' ? 'active' : ''}" on:click={() => viewMode = 'grid'} title="Thẻ">
                    <i data-feather="grid" class="w-4 h-4"></i>
                </button>
                <button class="view-mode-btn {viewMode === 'table' ? 'active' : ''}" on:click={() => viewMode = 'table'} title="Bảng">
                    <i data-feather="list" class="w-4 h-4"></i>
                </button>
                <button class="view-mode-btn {viewMode === 'chart' ? 'active' : ''}" on:click={() => viewMode = 'chart'} title="Biểu đồ">
                    <i data-feather="pie-chart" class="w-4 h-4"></i>
                </button>
            </div>

            <div 
                class="toggle-wrapper {showUnexported ? 'active' : ''}" 
                on:click={() => showUnexported = !showUnexported}
                title="Xem đơn hàng chưa xuất"
                style="padding: 4px 8px;"
            >
                <div class="toggle-switch" style="width: 28px; height: 16px;"></div>
                <span class="toggle-label text-xs whitespace-nowrap">Chưa xuất</span>
            </div>

            <div class="relative filter-wrapper">
                <button 
                    class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" 
                    on:click={() => isSettingsOpen = !isSettingsOpen}
                    title="Lọc hiển thị ngành hàng"
                >
                    {#if isLoadingConfig}
                        <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    {:else}
                        <i data-feather="filter" class="w-4 h-4"></i>
                    {/if}
                </button>

                {#if isSettingsOpen}
                    <div class="filter-dropdown">
                        <div class="filter-header">
                             <input type="text" class="filter-search" placeholder="Tìm ngành hàng..." bind:value={filterSearch} />
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

            <div class="hidden sm:block">
                <input type="text" placeholder="Tìm nhanh..." class="luyke-search-input" style="width: 120px;" bind:value={searchText} />
            </div>
        </div>
    </div>

    <div class="luyke-widget-body bg-white border-t border-gray-100 p-4">
        {#if sortedItems.length === 0}
            <div class="text-center py-10 text-gray-400 italic">Không có dữ liệu hiển thị.</div>
        
        {:else if viewMode === 'grid'}
            <div class="luyke-cat-grid">
                {#each sortedItems as item}
                    {@const name = item.name || item.nganhHang}
                    {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                    {@const quantity = showUnexported ? item.soLuong : item.quantity}
                    {@const style = getCategoryTheme(name)}
                    {@const percent = maxVal > 0 ? (revenue / maxVal) * 100 : 0}
                    {@const finalTheme = showUnexported ? 'theme-warning' : style.theme}

                    <div class="cat-card-colorful {finalTheme}">
                        <div class="cat-top-row">
                            <div class="cat-icon-box"><i data-feather={style.icon} class="w-5 h-5"></i></div>
                            {#if !showUnexported && totalRevenue > 0}
                                <span class="cat-percent-text text-xs">{formatters.formatPercentage(revenue/totalRevenue)}</span>
                            {/if}
                        </div>
                        <h4 class="cat-name-text" title={name}>{name}</h4>
                        <div class="cat-value-text">{formatters.formatRevenue(revenue, 0)}</div>
                        <div class="cat-footer-row">
                            <span>SL: <strong>{formatters.formatNumber(quantity)}</strong></span>
                        </div>
                        <div class="cat-bar-bg"><div class="cat-bar-fill" style="width: {percent}%"></div></div>
                    </div>
                {/each}
            </div>

        {:else if viewMode === 'table'}
            <div class="overflow-x-auto">
                <table class="w-full text-sm table-bordered">
                    <thead class="bg-gray-100 font-bold text-gray-700">
                        <tr>
                            <th class="px-3 py-2 text-left">Ngành hàng</th>
                            <th class="px-3 py-2 text-right">SL</th>
                            <th class="px-3 py-2 text-right">Doanh thu</th>
                            {#if showUnexported}<th class="px-3 py-2 text-right">DT Thực</th>{/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each sortedItems as item}
                            <tr class="hover:bg-gray-50">
                                <td class="px-3 py-2">{item.name || item.nganhHang}</td>
                                <td class="px-3 py-2 text-right font-bold">{formatters.formatNumber(showUnexported ? item.soLuong : item.quantity)}</td>
                                <td class="px-3 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(showUnexported ? item.doanhThuQuyDoi : item.revenue)}</td>
                                {#if showUnexported}
                                    <td class="px-3 py-2 text-right text-gray-500">{formatters.formatRevenue(item.doanhThuThuc)}</td>
                                {/if}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

        {:else}
            <div class="luyke-charts-container p-0 border-0 rounded-none">
                <div class="chart-box">
                    <h4 class="text-sm font-bold text-gray-700 mb-2 text-center">Tỷ trọng Doanh Thu (Triệu)</h4>
                    <div class="relative h-full w-full"><canvas id="rt-cat-chart"></canvas></div>
                </div>
                <div class="chart-box">
                    <h4 class="text-sm font-bold text-gray-700 mb-2 text-center">Top 15 Hãng (Triệu)</h4>
                    <div class="relative h-full w-full"><canvas id="rt-brand-chart"></canvas></div>
                </div>
            </div>
        {/if}
    </div>
</div>