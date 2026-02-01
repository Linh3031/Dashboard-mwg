<script>
  import { afterUpdate, tick, onMount } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { cleanCategoryName, getRandomBrightColor } from '../../../utils.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  import { selectedWarehouse, macroCategoryConfig } from '../../../stores.js';
  import { adminService } from '../../../services/admin.service.js';

  export let items = []; 
  export let unexportedItems = [];
  export let rawSource = []; 

  let showUnexported = false;
  let viewMode = 'grid'; 
  let sortMode = 'revenue_desc';
  let searchText = '';
  
  let isSettingsOpen = false;
  let filterSearch = '';
  let hiddenCategories = new Set();
  let isLoadingConfig = false;

  let chartInstancePie = null;
  let chartInstanceBar = null;
  onMount(async () => {
      if (!$macroCategoryConfig || $macroCategoryConfig.length === 0) {
          try {
              if (typeof adminService.loadMacroCategoryConfig === 'function') {
                  const configs = await adminService.loadMacroCategoryConfig();
                  macroCategoryConfig.set(configs);
              }
          } catch (e) { console.error(e); }
      }
  });
  // --- THEME ---
  $: titleText = showUnexported ? "CHI TIẾT CHƯA XUẤT (QĐ)" : "CHI TIẾT NGÀNH HÀNG";
  $: titleIcon = showUnexported ? "alert-circle" : "layers";
  $: titleClass = showUnexported ? "text-red-700" : "text-blue-700";
  $: iconClass = showUnexported ? "text-red-600" : "text-blue-600";

  function getCategoryTheme(name) {
      const n = name ? name.toLowerCase() : '';
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

  // --- CLOUD SYNC ---
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

  // --- LOGIC AGGREGATION TRỰC TIẾP ---
  $: sourceData = showUnexported ? unexportedItems : items;
  $: allGroups = (() => {
      const macroItems = ($macroCategoryConfig || []).map(m => ({
          key: m.name, 
          label: m.name,
          type: 'macro'
      })).sort((a, b) => a.label.localeCompare(b.label));

      const simpleItemsMap = new Map();
      sourceData.forEach((i, index) => {
          const name = i.name || i.nganhHang;
          const safeKey = i.id || name || `unknown_${index}`;
          if (name) {
              simpleItemsMap.set(safeKey, { key: safeKey, label: name, type: 'simple' });
          }
      });
      const simpleItems = Array.from(simpleItemsMap.values()).sort((a, b) => a.label.localeCompare(b.label));

      return [...macroItems, ...simpleItems];
  })();
  $: filterList = allGroups.filter(g => 
      g.label.toLowerCase().includes(filterSearch.toLowerCase())
  );
  function toggleCategoryVisibility(key) {
      if (hiddenCategories.has(key)) hiddenCategories.delete(key);
      else hiddenCategories.add(key);
      hiddenCategories = new Set(hiddenCategories);
      saveCloudConfig();
  }

  function toggleAllVisibility(show) {
      hiddenCategories = show ? new Set() : new Set(allGroups.map(g => g.key));
      saveCloudConfig();
  }

  $: aggregatedItems = (() => {
      const result = [];
      const macroConfigs = $macroCategoryConfig || [];

      // A. Macro (Luôn hiện nếu không ẩn)
      macroConfigs.forEach(macro => {
          if (!hiddenCategories.has(macro.name)) {
              const keywords = (macro.items || []).map(k => k.toLowerCase());
              const childItems = sourceData.filter(item => {
                  const iName = (item.name || item.nganhHang || '').toLowerCase();
                  const iId = (item.id || '').toLowerCase();
                  return keywords.some(k => iName.includes(k) || iId === k);
              });

              if (childItems.length > 0) {
                  result.push({
                      id: `MACRO_${macro.name}`,
                      name: macro.name,
                      isMacro: true,
                      revenue: childItems.reduce((sum, i) => sum + (i.revenue || 0), 0),
                      doanhThuQuyDoi: childItems.reduce((sum, i) => sum + (i.doanhThuQuyDoi || 0), 0),
                      quantity: childItems.reduce((sum, i) => sum + (i.quantity || i.soLuong || 0), 0),
                      soLuong: childItems.reduce((sum, i) => sum + (i.soLuong || 0), 0)
                  });
              }
          }
      });
      // B. Simple (Luôn hiện nếu không ẩn)
      sourceData.forEach((item, index) => {
          const name = item.name || item.nganhHang || 'Chưa đặt tên';
          const safeId = item.id || name || `ITEM_${index}`;
          
          if (!hiddenCategories.has(safeId) && !hiddenCategories.has(name)) {
              result.push({ 
                  ...item, 
                  id: safeId,
                  name: name,
                  isMacro: false 
              });
          }
      });
      return result;
  })();

  $: filteredItems = aggregatedItems.filter(item => {
      const name = item.name || '';
      return !searchText || name.toLowerCase().includes(searchText.toLowerCase());
  });
  $: sortedItems = [...filteredItems].sort((a, b) => {
      const getRev = (i) => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0);
      const getQty = (i) => showUnexported ? (i.soLuong || 0) : (i.quantity || 0);
      if (sortMode === 'revenue_desc') return getRev(b) - getRev(a);
      if (sortMode === 'quantity_desc') return getQty(b) - getQty(a);
      return 0;
  });
  $: totalRevenue = sourceData.reduce((sum, item) => sum + (showUnexported ? (item.doanhThuQuyDoi || 0) : (item.revenue || 0)), 0);
  $: maxVal = Math.max(...sortedItems.map(i => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0)), 1);
  // --- CHART LOGIC ---
  $: pieData = (() => {
      const sorted = sortedItems.slice(); 
      if (sorted.length <= 14) return sorted;
      const top13 = sorted.slice(0, 13);
      const others = sorted.slice(13);
      const otherRevenue = others.reduce((sum, item) => sum + (showUnexported ? item.doanhThuQuyDoi : item.revenue), 0);
      return [...top13, { name: 'Khác', revenue: otherRevenue, doanhThuQuyDoi: otherRevenue }];
  })();
  // [FIX CHART]
  $: barData = calculateBrandData(rawSource, aggregatedItems, $macroCategoryConfig);
  function calculateBrandData(source, visibleItems, configs) {
      if (!source || source.length === 0) return [];
      // Bung nén danh sách được phép
      const allowedNames = new Set();
      visibleItems.forEach(item => {
          if (item.isMacro) {
              const conf = (configs || []).find(c => c.name === item.name);
              if (conf && conf.items) conf.items.forEach(k => allowedNames.add(cleanCategoryName(k)));
          } else {
              allowedNames.add(cleanCategoryName(item.name || item.nganhHang));
          }
      });

      const brands = {};
      source.forEach(row => {
          const rowCatName = cleanCategoryName(row.nganhHang || '');
          if (allowedNames.has(rowCatName)) {
              const brandName = row.nhaSanXuat || 'Khác';
              const revenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
              if (!brands[brandName]) brands[brandName] = { name: brandName, revenue: 0 };
              brands[brandName].revenue += revenue;
          }
      });
      return Object.values(brands).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
  }

  async function renderCharts() {
      if (typeof Chart === 'undefined') return;
      await tick();

      const ctxPie = document.getElementById('rt-cat-chart');
      if (ctxPie) {
          if (chartInstancePie) chartInstancePie.destroy();
          const totalPieRev = pieData.reduce((sum, d) => sum + (showUnexported ? d.doanhThuQuyDoi : d.revenue), 0);
          chartInstancePie = new Chart(ctxPie, {
              type: 'doughnut',
              data: {
                  labels: pieData.map(d => d.name),
                  datasets: [{
                      data: pieData.map(d => showUnexported ? d.doanhThuQuyDoi : d.revenue),
                      backgroundColor: pieData.map(() => getRandomBrightColor()), borderWidth: 1
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
                      backgroundColor: barData.map(() => getRandomBrightColor()), borderRadius: 4
                  }]
              },
              options: {
                  indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                  plugins: {
                      legend: { display: false },
                      datalabels: { anchor: 'end', align: 'end', formatter: (val) => formatters.formatNumber(val, 0), color: '#4b5563', font: { weight: 'bold', size: 10 } },
                      tooltip: { callbacks: { label: (ctx) => formatters.formatRevenue(ctx.raw * 1000000) } }
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

<style>
    :global(.filter-dropdown) {
        display: flex;
        flex-direction: column;
        max-height: 400px;
    }
    :global(.filter-body) {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }
    :global(.filter-actions) {
        flex-shrink: 0;
        border-top: 1px solid #eee;
    }

    /* [FIX GENESIS]: Ép lưới 4 cột khi Capture */
    :global(.capture-container .luyke-cat-grid) {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 12px !important;
    }
</style>

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
                <button class="view-mode-btn {viewMode === 'grid' ? 'active' : ''}" on:click={() => viewMode = 'grid'}><i data-feather="grid" class="w-4 h-4"></i></button>
                <button class="view-mode-btn {viewMode === 'table' ? 'active' : ''}" on:click={() => viewMode = 'table'}><i data-feather="list" class="w-4 h-4"></i></button>
                <button class="view-mode-btn {viewMode === 'chart' ? 'active' : ''}" on:click={() => viewMode = 'chart'}><i data-feather="pie-chart" class="w-4 h-4"></i></button>
            </div>

            <div class="toggle-wrapper {showUnexported ? 'active' : ''}" on:click={() => showUnexported = !showUnexported} style="padding: 4px 8px;">
                <div class="toggle-switch" style="width: 28px; height: 16px;"></div>
                <span class="toggle-label text-xs whitespace-nowrap">Chưa xuất</span>
            </div>

            <div class="relative filter-wrapper">
                <button class="luyke-icon-btn {isSettingsOpen ? 'active' : ''}" on:click={() => isSettingsOpen = !isSettingsOpen}>
                    {#if isLoadingConfig}<div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>{:else}<i data-feather="filter" class="w-4 h-4"></i>{/if}
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
                                {#each filterList as group (group.key)}
                                    <div class="filter-item" on:click={() => toggleCategoryVisibility(group.key)}>
                                         <input type="checkbox" checked={!hiddenCategories.has(group.key)} />
                                        {#if group.type === 'macro'}
                                            <label class="text-teal-700 font-bold text-xs flex items-center gap-1 flex-1">
                                                <i data-feather="layers" class="w-3 h-3"></i> {group.label}
                                            </label>
                                        {:else}
                                            <label class="text-gray-700 text-xs flex-1 truncate" title={group.label}>{group.label}</label>
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
    </div>

    <div class="luyke-widget-body bg-white border-t border-gray-100 p-4">
        {#if sortedItems.length === 0}
            <div class="text-center py-10 text-gray-400 italic">Không có dữ liệu hiển thị.</div>
        
        {:else if viewMode === 'grid'}
            <div class="luyke-cat-grid">
                {#each sortedItems as item (item.id)}
                    {@const name = item.name}
                    {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                    {@const quantity = showUnexported ? item.soLuong : item.quantity}
                    {@const style = getCategoryTheme(name)}
                    {@const percent = maxVal > 0 ? (revenue / maxVal) * 100 : 0}
                    
                    {@const finalTheme = showUnexported ? 'theme-warning' : (item.isMacro ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : style.theme)}
                    {@const iconName = item.isMacro ? 'layers' : style.icon}
                    {@const textColor = item.isMacro ? 'text-indigo-800' : ''}

                    <div class="cat-card-colorful {finalTheme}">
                        <div class="cat-top-row">
                            <div class="cat-icon-box {item.isMacro ? 'bg-indigo-100 text-indigo-600' : ''}">
                                <i data-feather={iconName} class="w-5 h-5"></i>
                            </div>
                            {#if !showUnexported && totalRevenue > 0}
                                <span class="cat-percent-text text-xs {item.isMacro ? 'text-indigo-600' : ''}">
                                    {formatters.formatPercentage(revenue/totalRevenue)}
                                </span>
                            {/if}
                        </div>
                        
                        <h4 class="cat-name-text {textColor}" title={name}>
                             {name} 
                            {#if item.isMacro}<span class="text-[10px] bg-white border px-1 rounded text-gray-500 ml-1 font-normal">GỘP</span>{/if}
                        </h4>
                        
                        <div class="cat-value-text {textColor}">{formatters.formatRevenue(revenue, 0)}</div>
                        
                        <div class="cat-footer-row">
                            <span>SL: <strong>{formatters.formatNumber(quantity)}</strong></span>
                        </div>
                        
                        <div class="cat-bar-bg">
                            <div class="cat-bar-fill {item.isMacro ? 'bg-indigo-500' : ''}" style="width: {percent}%"></div>
                        </div>
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
                        {#each sortedItems as item (item.id)}
                            <tr class="hover:bg-gray-50 {item.isMacro ? 'bg-indigo-50/50' : ''}">
                                <td class="px-3 py-2 {item.isMacro ? 'font-bold text-indigo-800' : ''}">{item.name}</td>
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