<script>
  import { afterUpdate, tick, onMount } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { cleanCategoryName, getRandomBrightColor } from '../../../utils.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  import { selectedWarehouse, macroCategoryConfig } from '../../../stores.js';
  import { adminService } from '../../../services/admin.service.js';
  import SortableTh from '../../common/SortableTh.svelte';

  export let items = []; 
  export let unexportedItems = [];
  export let rawSource = []; 

  let showUnexported = false;
  let viewMode = 'grid'; 
  
  let sortKey = 'revenue';
  let sortDirection = 'desc';

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
  $: titleText = showUnexported ? "CHI TIẾT CHƯA XUẤT" : "CHI TIẾT NGÀNH HÀNG";
  $: titleIcon = showUnexported ? "alert-circle" : "layers";
  $: titleClass = showUnexported ? "text-red-700" : "text-blue-700";
  $: iconClass = showUnexported ? "text-red-600" : "text-blue-600";

  // Theme chuẩn như Lũy kế
  function getCategoryTheme(name) {
      const n = name ? name.toLowerCase() : '';
      if (n.includes('điện tử') || n.includes('tivi')) return { icon: 'tv', color: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-500' };
      if (n.includes('máy giặt') || n.includes('sấy')) return { icon: 'disc', color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' };
      if (n.includes('máy lạnh') || n.includes('điều hòa')) return { icon: 'wind', color: 'text-cyan-600', bg: 'bg-cyan-50', bar: 'bg-cyan-500' };
      if (n.includes('tủ lạnh') || n.includes('tủ đông')) return { icon: 'server', color: 'text-sky-600', bg: 'bg-sky-50', bar: 'bg-sky-500' };
      if (n.includes('lọc nước')) return { icon: 'droplet', color: 'text-teal-600', bg: 'bg-teal-50', bar: 'bg-teal-500' };
      if (n.includes('laptop') || n.includes('pc')) return { icon: 'monitor', color: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500' };
      if (n.includes('điện thoại') || n.includes('smartphone')) return { icon: 'smartphone', color: 'text-pink-600', bg: 'bg-pink-50', bar: 'bg-pink-500' };
      if (n.includes('gia dụng') || n.includes('bếp')) return { icon: 'home', color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500' };
      if (n.includes('phụ kiện')) return { icon: 'headphones', color: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-500' };
      if (n.includes('đồng hồ')) return { icon: 'watch', color: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-500' };
      return { icon: 'tag', color: 'text-slate-600', bg: 'bg-slate-100', bar: 'bg-slate-500' };
  }

  // --- CLOUD SYNC ---
  $: if ($selectedWarehouse) loadCloudConfig($selectedWarehouse);

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

  // --- LOGIC AGGREGATION ---
  $: sourceData = showUnexported ? unexportedItems : items;

  $: allGroups = (() => {
      const macroItems = ($macroCategoryConfig || []).map(m => ({
          key: m.name, label: m.name, type: 'macro'
      })).sort((a, b) => a.label.localeCompare(b.label));

      const simpleItemsMap = new Map();
      sourceData.forEach((i, index) => {
          const name = i.name || i.nganhHang;
          const safeKey = i.id || name || `unknown_${index}`;
          if (name) simpleItemsMap.set(safeKey, { key: safeKey, label: name, type: 'simple' });
      });
      const simpleItems = Array.from(simpleItemsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
      return [...macroItems, ...simpleItems];
  })();

  $: filterList = allGroups.filter(g => g.label.toLowerCase().includes(filterSearch.toLowerCase()));

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
                      id: `MACRO_${macro.name}`, name: macro.name, isMacro: true,
                      revenue: childItems.reduce((sum, i) => sum + (i.revenue || 0), 0),
                      doanhThuQuyDoi: childItems.reduce((sum, i) => sum + (i.doanhThuQuyDoi || 0), 0),
                      quantity: childItems.reduce((sum, i) => sum + (i.quantity || i.soLuong || 0), 0),
                      soLuong: childItems.reduce((sum, i) => sum + (i.soLuong || 0), 0),
                      doanhThuThuc: childItems.reduce((sum, i) => sum + (i.doanhThuThuc || 0), 0)
                  });
              }
          }
      });

      sourceData.forEach((item, index) => {
          const name = item.name || item.nganhHang || 'Chưa đặt tên';
          const safeId = item.id || name || `ITEM_${index}`;
          if (!hiddenCategories.has(safeId) && !hiddenCategories.has(name)) {
              result.push({ ...item, id: safeId, name: name, isMacro: false });
          }
      });

      return result;
  })();

  $: filteredItems = aggregatedItems.filter(item => {
      const name = item.name || '';
      return !searchText || name.toLowerCase().includes(searchText.toLowerCase());
  });

  function handleSort(event) {
      const key = event.detail;
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }

  $: sortedItems = [...filteredItems].sort((a, b) => {
      const getRev = (i) => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0);
      const getQty = (i) => showUnexported ? (i.soLuong || 0) : (i.quantity || 0);
      const getPrice = (i) => { const q = getQty(i); return q > 0 ? getRev(i) / q : 0; };

      let valA, valB;
      if (sortKey === 'name') {
          valA = a.name || ''; valB = b.name || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortKey === 'quantity') {
          valA = getQty(a); valB = getQty(b);
      } else if (sortKey === 'unitPrice') {
          valA = getPrice(a); valB = getPrice(b);
      } else {
          valA = getRev(a); valB = getRev(b);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
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

  $: barData = calculateBrandData(rawSource, aggregatedItems, $macroCategoryConfig);

  function calculateBrandData(source, visibleItems, configs) {
      if (!source || source.length === 0) return [];
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
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) isSettingsOpen = false;
  }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<svelte:window on:click={handleWindowClick} />

<div class="luyke-widget h-full">
    <div class="luyke-toolbar">
        <div class="luyke-toolbar-left flex-grow min-w-0">
            <h3 class="text-base sm:text-lg font-bold uppercase flex items-center gap-2 {titleClass} truncate">
                <i data-feather={titleIcon} class="{iconClass} flex-shrink-0"></i>
                <span class="truncate flex items-center gap-2">
                    {titleText}
                    {#if showUnexported && totalRevenue > 0}
                        <span class="px-2.5 py-0.5 bg-red-100 text-red-800 text-sm font-black rounded border border-red-200 shadow-sm whitespace-nowrap">
                            {formatters.formatRevenue(totalRevenue, 0)}
                        </span>
                    {/if}
                </span>
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
                    <div class="filter-dropdown z-50 absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col max-h-[400px]">
                        <div class="p-2 border-b">
                            <input type="text" class="w-full text-sm p-1.5 border rounded outline-none" placeholder="Tìm ngành hàng..." bind:value={filterSearch} />
                        </div>
                        <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {#if filterList.length === 0}
                                <p class="text-xs text-gray-500 text-center p-2">Không tìm thấy.</p>
                            {:else}
                                {#each filterList as group (group.key)}
                                    <label class="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                        <input type="checkbox" checked={!hiddenCategories.has(group.key)} on:change={() => toggleCategoryVisibility(group.key)} />
                                        {#if group.type === 'macro'}
                                            <span class="text-teal-700 font-bold text-xs flex items-center gap-1"><i data-feather="layers" class="w-3 h-3"></i> {group.label}</span>
                                        {:else}
                                            <span class="text-gray-700 text-xs truncate">{group.label}</span>
                                        {/if}
                                    </label>
                                {/each}
                            {/if}
                        </div>
                        <div class="p-2 border-t flex justify-between bg-gray-50 rounded-b-lg">
                            <button class="text-xs font-bold text-blue-600 hover:underline" on:click={() => toggleAllVisibility(true)}>Hiện tất cả</button>
                            <button class="text-xs font-bold text-red-600 hover:underline" on:click={() => toggleAllVisibility(false)}>Ẩn tất cả</button>
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
            <div class="rt-cat-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 bg-white">
                {#each sortedItems as item (item.id)}
                    {@const name = item.name}
                    {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                    {@const quantity = showUnexported ? item.soLuong : item.quantity}
                    {@const theme = getCategoryTheme(name)}
                    
                    {@const marketSharePercent = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0}
                    {@const barPercent = maxVal > 0 ? (revenue / maxVal) * 100 : 0}
                    
                    {@const isMacro = item.isMacro}
                    {@const cardBg = showUnexported ? 'bg-orange-50/80' : (isMacro ? 'bg-indigo-50/80' : theme.bg)}
                    {@const cardBorder = showUnexported ? 'border-orange-200 hover:border-orange-400' : (isMacro ? 'border-indigo-200 hover:border-indigo-400' : 'border-slate-200 hover:border-blue-300')}
                    {@const theIcon = isMacro ? 'layers' : theme.icon}
                    {@const accentColor = showUnexported ? 'text-orange-600' : (isMacro ? 'text-indigo-600' : theme.color)}
                    {@const barColor = showUnexported ? 'bg-orange-500' : (isMacro ? 'bg-indigo-500' : theme.bar)}

                    <div class="relative {cardBg} border {cardBorder} rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group capture-card-inner">
                        
                        <div class="absolute -right-3 -bottom-3 opacity-[0.06] transition-transform duration-500 group-hover:scale-110 z-0 {accentColor}">
                            <i data-feather={theIcon} style="width: 110px; height: 110px; stroke-width: 1.5px;"></i>
                        </div>

                        <div class="flex justify-between items-stretch gap-2 mb-2.5 relative z-10 flex-1">
                            <div class="flex flex-col flex-1 min-w-0 justify-between pr-1">
                                <div>
                                    <div class="flex items-center {accentColor} mb-1.5">
                                        <i data-feather={theIcon} class="w-4 h-4"></i>
                                    </div>
                                    <h4 class="text-[15px] sm:text-[16px] font-bold text-slate-800 line-clamp-2 leading-[1.25] pb-1 capture-text-title" title={name}>
                                        {name}
                                        {#if isMacro}<span class="ml-1 text-[10px] font-bold text-indigo-500 bg-white/70 px-1 py-0.5 rounded shadow-sm border border-indigo-100 translate-y-[-1px] inline-block">GỘP</span>{/if}
                                    </h4>
                                </div>
                                <div class="w-full h-1.5 bg-black/10 rounded-full overflow-hidden shadow-inner mt-1.5">
                                    <div class="h-full {barColor} rounded-full transition-all duration-700 ease-out" style="width: {barPercent}%"></div>
                                </div>
                            </div>

                            <div class="flex flex-col items-end justify-center flex-shrink-0 pl-1">
                                <span class="text-[1.6rem] sm:text-3xl xl:text-[2.1rem] font-black text-slate-800 tracking-tighter leading-none drop-shadow-sm capture-text-revenue">
                                    {formatters.formatRevenue(revenue, 0)}
                                </span>
                            </div>
                        </div>

                        <div class="mt-auto flex justify-between items-center pt-2.5 border-t border-black/5 relative z-10">
                            <div class="flex items-baseline gap-1.5">
                                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-tight capture-text-label">SL:</span>
                                <span class="text-[14px] sm:text-[15px] font-bold text-slate-800 capture-text-value">{formatters.formatNumber(quantity)}</span>
                            </div>
                            
                            {#if !showUnexported}
                            <div class="text-right">
                                <span class="text-[15px] sm:text-[16px] font-black {accentColor} bg-white/70 px-2 py-0.5 rounded shadow-sm border border-white/50 inline-block drop-shadow-sm capture-text-percent">
                                    {formatters.formatPercentage(marketSharePercent/100)}
                                </span>
                            </div>
                            {:else}
                            <div class="flex items-baseline gap-1.5 text-right">
                                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-tight capture-text-label">THỰC:</span>
                                <span class="text-[14px] sm:text-[15px] font-bold text-slate-800 capture-text-value">{formatters.formatRevenue(item.doanhThuThuc || 0, 0)}</span>
                            </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

        {:else if viewMode === 'table'}
            <div class="overflow-x-auto">
                <table class="w-full text-sm table-bordered table-striped">
                    <thead class="bg-slate-100 font-bold text-gray-700 sticky top-0 z-10">
                        <tr>
                            <SortableTh key="name" label="Ngành hàng" align="left" {sortKey} {sortDirection} on:sort={handleSort} />
                            <SortableTh key="quantity" label="SL" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                            <SortableTh key="revenue" label="Doanh thu" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                            <SortableTh key="unitPrice" label="Đơn giá (Tr)" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                            {#if showUnexported}
                                <th class="px-3 py-2 text-right">DT Thực</th>
                            {/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each sortedItems as item (item.id)}
                            {@const rev = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                            {@const qty = showUnexported ? item.soLuong : item.quantity}
                            {@const price = qty > 0 ? rev / qty : 0}

                            <tr class="hover:bg-gray-50 {item.isMacro ? 'bg-indigo-50/50' : ''}">
                                <td class="px-3 py-2 {item.isMacro ? 'font-bold text-indigo-800' : ''}">
                                    {item.name}
                                </td>
                                <td class="px-3 py-2 text-right font-bold">{formatters.formatNumber(qty)}</td>
                                <td class="px-3 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(rev)}</td>
                                <td class="px-3 py-2 text-right font-medium text-orange-600">{formatters.formatNumber(price / 1000000, 1)}</td>
                                
                                {#if showUnexported}
                                    <td class="px-3 py-2 text-right text-gray-500">{formatters.formatRevenue(item.doanhThuThuc || 0)}</td>
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

<style>
    /* =========================================
       CHỈ ÁP DỤNG KHI BẤM NÚT CHỤP ẢNH (CAPTURE)
       ========================================= */
    :global(.capture-container .rt-cat-grid) {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important; /* ÉP 3 CỘT */
        width: 900px !important; /* ÉP CHIỀU NGANG VỪA MÀN ĐIỆN THOẠI */
        max-width: 900px !important;
        margin: 0 auto !important;
        gap: 16px !important;
        padding: 16px !important;
        background: white !important;
    }
    
    :global(.capture-container .rt-cat-grid > div) { page-break-inside: avoid; }
    
    :global(.capture-container .line-clamp-2) {
        display: block !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: normal !important;
        max-height: 3.2em !important; 
    }

    /* Ép Font siêu to, chống gãy chân chữ chỉ dành cho xuất ảnh */
    :global(.capture-container .capture-text-title) { 
        font-size: 16px !important; 
        line-height: 1.4 !important; 
        padding-bottom: 4px !important; 
    }
    :global(.capture-container .capture-text-revenue) { 
        font-size: 32px !important; 
        line-height: 1.1 !important; 
        padding-bottom: 4px !important; 
    }
    :global(.capture-container .capture-text-label) { font-size: 10px !important; }
    :global(.capture-container .capture-text-value) { font-size: 15px !important; }
    :global(.capture-container .capture-text-percent) { font-size: 17px !important; padding: 4px 8px !important; }
</style>