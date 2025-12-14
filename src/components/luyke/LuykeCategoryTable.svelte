<script>
  import { onMount, afterUpdate } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { cleanCategoryName } from '../../utils.js';
  import { macroCategoryConfig } from '../../stores.js'; 
  import { adminService } from '../../services/admin.service.js';
  
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

  const STORAGE_KEY = 'luyke_category_direct_v1';

  onMount(async () => {
      // 1. Load Filter State
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          try { hiddenCategories = new Set(JSON.parse(saved)); } 
          catch (e) { console.error(e); }
      }

      // 2. Load Config
      if (!$macroCategoryConfig || $macroCategoryConfig.length === 0) {
          try {
              if (typeof adminService.loadMacroCategoryConfig === 'function') {
                  const configs = await adminService.loadMacroCategoryConfig();
                  macroCategoryConfig.set(configs);
              }
          } catch (e) { console.error("Lỗi load config:", e); }
      }
  });

  function saveHiddenState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenCategories]));
  }

  // --- THEME ---
  $: titleText = showUnexported ? "CHI TIẾT CHƯA XUẤT (QĐ)" : (viewMode === 'grid' ? "CHI TIẾT NGÀNH HÀNG" : "TỶ TRỌNG NGÀNH HÀNG");
  $: titleIcon = showUnexported ? "alert-circle" : (viewMode === 'grid' ? "grid" : "pie-chart");
  $: titleClass = showUnexported ? "text-orange-700" : "text-gray-700";
  $: iconClass = showUnexported ? "text-orange-600" : "text-blue-600";

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

  // --- LOGIC MỚI: TRỰC TIẾP & SONG SONG ---
  $: sourceData = showUnexported ? unexportedItems : items;

  // 1. Tạo danh sách Filter (Gộp cả Macro và Simple)
  $: allGroups = (() => {
      // Macro Items
      const macroItems = ($macroCategoryConfig || []).map(m => ({
          key: m.name, // Key là tên nhóm lớn
          label: m.name,
          type: 'macro'
      })).sort((a, b) => a.label.localeCompare(b.label));

      // Simple Items
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

  function toggleCategoryVisibility(event) {
      const key = event.detail;
      if (hiddenCategories.has(key)) hiddenCategories.delete(key);
      else hiddenCategories.add(key);
      hiddenCategories = new Set(hiddenCategories);
      saveHiddenState();
  }

  function toggleAllVisibility(event) {
      const show = event.detail;
      hiddenCategories = show ? new Set() : new Set(allGroups.map(g => g.key));
      saveHiddenState();
  }

  // 2. Logic Aggregation: KHÔNG BÙ TRỪ. Có gì hiện nấy.
  $: aggregatedItems = (() => {
      const result = [];
      const macroConfigs = $macroCategoryConfig || [];

      // A. Tính toán Nhóm Lớn (Macro) - Luôn tính toán và thêm vào nếu không bị ẩn
      macroConfigs.forEach(macro => {
          if (!hiddenCategories.has(macro.name)) {
              // Tìm con khớp
              const keywords = (macro.items || []).map(k => k.toLowerCase());
              const childItems = sourceData.filter(item => {
                  const iName = (item.name || item.nganhHang || '').toLowerCase();
                  const iId = (item.id || '').toLowerCase();
                  return keywords.some(k => iName.includes(k) || iId === k);
              });

              if (childItems.length > 0) {
                  result.push({
                      id: `MACRO_${macro.name}`, // ID riêng
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

      // B. Thêm Ngành Hàng Lẻ (Simple) - Luôn thêm vào nếu không bị ẩn
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

  $: gridDisplayItems = aggregatedItems.filter(item => {
      const name = item.name || '';
      return !searchText || name.toLowerCase().includes(searchText.toLowerCase());
  });

  $: sortedItems = [...gridDisplayItems].sort((a, b) => {
      const getRev = (i) => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0);
      const getQty = (i) => showUnexported ? (i.soLuong || 0) : (i.quantity || 0);
      
      if (sortMode === 'revenue_desc') return getRev(b) - getRev(a);
      if (sortMode === 'quantity_desc') return getQty(b) - getQty(a);
      if (sortMode === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
  });

  $: totalRevenue = sourceData.reduce((sum, item) => sum + (showUnexported ? (item.doanhThuQuyDoi || 0) : (item.revenue || 0)), 0);
  $: maxVal = Math.max(...sortedItems.map(i => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0)), 1);

  // --- CHART DATA (Sửa lại logic Top Hãng theo Filter) ---
  $: pieData = (() => {
      const sorted = aggregatedItems
          .filter(i => (showUnexported ? i.doanhThuQuyDoi : i.revenue) > 0)
          .sort((a, b) => (showUnexported ? b.doanhThuQuyDoi - a.doanhThuQuyDoi : b.revenue - a.revenue));
      if (sorted.length <= 14) return sorted;
      const top13 = sorted.slice(0, 13);
      const others = sorted.slice(13);
      const otherRevenue = others.reduce((sum, item) => sum + (showUnexported ? item.doanhThuQuyDoi : item.revenue), 0);
      return [...top13, { name: 'Khác', revenue: otherRevenue }];
  })();

  // [FIX CHART] Truyền config vào để bung nhóm lớn ra khi lọc
  $: barData = calculateBrandData(rawSource, aggregatedItems, $macroCategoryConfig); 

  function calculateBrandData(source, visibleItems, configs) {
      if (!source || source.length === 0) return [];
      
      // 1. Xây dựng tập hợp các tên ngành hàng con "được phép hiện"
      const allowedNames = new Set();
      
      visibleItems.forEach(item => {
          if (item.isMacro) {
              // Nếu là nhóm lớn, tìm config và thêm tất cả các con của nó vào list cho phép
              const conf = (configs || []).find(c => c.name === item.name);
              if (conf && conf.items) {
                  conf.items.forEach(k => allowedNames.add(cleanCategoryName(k)));
              }
          } else {
              // Nếu là ngành lẻ, thêm chính nó
              allowedNames.add(cleanCategoryName(item.name || item.nganhHang));
          }
      });

      // 2. Lọc Source và tính Brand
      const brands = {};
      source.forEach(row => {
          const rowCatName = cleanCategoryName(row.nganhHang || '');
          // Chỉ lấy nếu ngành hàng của row này nằm trong danh sách cho phép
          if (allowedNames.has(rowCatName)) {
              const brandName = row.nhaSanXuat || 'Khác';
              const revenue = parseFloat(String(row.thanhTien || "0").replace(/,/g, '')) || 0;
              if (!brands[brandName]) brands[brandName] = { name: brandName, revenue: 0 };
              brands[brandName].revenue += revenue;
          }
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

    <style>
        /* Tăng max-height và thêm scroll cho body của dropdown */
        :global(.filter-dropdown) {
            display: flex;
            flex-direction: column;
            max-height: 400px; /* Giới hạn chiều cao tổng */
        }
        :global(.filter-body) {
            flex: 1;
            overflow-y: auto; /* Cho phép cuộn nội dung */
            min-height: 0;
        }
        :global(.filter-actions) {
            flex-shrink: 0; /* Nút bottom không bị co lại */
            border-top: 1px solid #eee;
        }
    </style>

    {#if viewMode === 'grid'}
        {#if sortedItems.length === 0}
            <div class="p-12 text-center bg-white border border-gray-200 border-t-0 rounded-b-xl">
                <p class="text-gray-500">{showUnexported ? 'Không có đơn hàng chưa xuất.' : 'Không có dữ liệu hiển thị.'}</p>
            </div>
        {:else}
            <div class="luyke-cat-grid p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
                {#each sortedItems as item (item.id)}
                    {@const name = item.name}
                    {@const revenue = showUnexported ? item.doanhThuQuyDoi : item.revenue}
                    {@const quantity = showUnexported ? item.soLuong : item.quantity}
                    {@const style = getCategoryTheme(name)}
                    {@const marketSharePercent = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0}
                    {@const barPercent = maxVal > 0 ? (revenue / maxVal) * 100 : 0}
                    
                    {@const finalTheme = showUnexported ? 'theme-warning' : (item.isMacro ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : style.theme)}
                    {@const iconName = item.isMacro ? 'layers' : style.icon}
                    {@const textColor = item.isMacro ? 'text-indigo-800' : ''}

                    <div class="cat-card-colorful {finalTheme}">
                        <div class="cat-top-row">
                            <div class="cat-icon-box {item.isMacro ? 'bg-indigo-100 text-indigo-600' : ''}">
                                <i data-feather={iconName} class="w-5 h-5"></i>
                            </div>
                            {#if !showUnexported}
                                <span class="cat-percent-text text-xs {item.isMacro ? 'text-indigo-600' : ''}">
                                    {formatters.formatPercentage(marketSharePercent/100)}
                                </span>
                            {/if}
                        </div>
                        
                        <h4 class="cat-name-text {textColor}" title={name}>
                            {name} 
                            {#if item.isMacro}<span class="text-[10px] bg-white border px-1 rounded text-gray-500 ml-1 font-normal">GỘP</span>{/if}
                        </h4>
                        
                        <div class="cat-value-text {textColor}">{formatters.formatRevenue(revenue,0)}</div>
                        
                        <div class="cat-footer-row">
                            <span>SL: <strong>{formatters.formatNumber(quantity)}</strong></span>
                            {#if !showUnexported}
                                <span>TB: <strong>{formatters.formatNumber(quantity/numDays, 0)}</strong>/ngày</span>
                            {/if}
                        </div>
                        
                        <div class="cat-bar-bg">
                            <div class="cat-bar-fill {item.isMacro ? 'bg-indigo-500' : ''}" style="width: {barPercent}%"></div>
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