<script>
  import { onMount } from 'svelte';
  import { formatters } from '../../utils/formatters.js';
  import { cleanCategoryName } from '../../utils.js';
  import { macroCategoryConfig } from '../../stores.js'; 
  import { adminService } from '../../services/admin.service.js';
  
  // Import Sub-Components đã được module hóa
  import LuykeCategoryToolbar from './sub/LuykeCategoryToolbar.svelte';
  import LuykeCategoryGrid from './sub/LuykeCategoryGrid.svelte';
  import LuykeCategoryList from './sub/LuykeCategoryList.svelte';
  import LuykeCategoryCharts from './sub/LuykeCategoryCharts.svelte';

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
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          try { hiddenCategories = new Set(JSON.parse(saved)); } 
          catch (e) {}
      }
      if (!$macroCategoryConfig || $macroCategoryConfig.length === 0) {
          try {
              if (typeof adminService.loadMacroCategoryConfig === 'function') {
                  const configs = await adminService.loadMacroCategoryConfig();
                  macroCategoryConfig.set(configs);
              }
          } catch (e) {}
      }
  });

  function saveHiddenState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenCategories]));
  }

  // --- DATA AGGREGATION ---
  $: sourceData = showUnexported ? unexportedItems : items;
  $: totalRevenue = sourceData.reduce((sum, item) => sum + (showUnexported ? (item.doanhThuQuyDoi || item.revenueQuyDoi || 0) : (item.revenue || 0)), 0);

  $: titleText = showUnexported 
      ? `CHI TIẾT CHƯA XUẤT - TỔNG DTQĐ: ${formatters.formatRevenue(totalRevenue, 0)}` 
      : (viewMode === 'grid' ? "CHI TIẾT NGÀNH HÀNG" : (viewMode === 'list' ? "BẢNG DỮ LIỆU" : "TỶ TRỌNG NGÀNH HÀNG"));
  
  $: titleIcon = showUnexported ? "alert-circle" : (viewMode === 'grid' ? "grid" : (viewMode === 'list' ? "list" : "pie-chart"));
  $: titleClass = showUnexported ? "text-orange-700 font-bold" : "text-gray-700";
  $: iconClass = showUnexported ? "text-orange-600" : "text-blue-600";

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
                      doanhThuQuyDoi: childItems.reduce((sum, i) => sum + (i.doanhThuQuyDoi || i.revenueQuyDoi || 0), 0),
                      quantity: childItems.reduce((sum, i) => sum + (i.quantity || i.soLuong || 0), 0),
                      soLuong: childItems.reduce((sum, i) => sum + (i.soLuong || 0), 0)
                  });
              }
          }
      });

      sourceData.forEach((item, index) => {
          const name = item.name || item.nganhHang || 'Chưa đặt tên';
          const safeId = item.id || name || `ITEM_${index}`;
          if (!hiddenCategories.has(safeId) && !hiddenCategories.has(name)) {
              const dtqd = item.doanhThuQuyDoi || item.revenueQuyDoi || 0;
              result.push({ ...item, id: safeId, name: name, isMacro: false, doanhThuQuyDoi: dtqd });
          }
      });
      return result;
  })();

  $: gridDisplayItems = aggregatedItems.filter(item => {
      const name = item.name || '';
      return !searchText || name.toLowerCase().includes(searchText.toLowerCase());
  });

  // --- SORTING ---
  $: sortedItems = [...gridDisplayItems].sort((a, b) => {
      const getRev = (i) => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0);
      const getQty = (i) => showUnexported ? (i.soLuong || 0) : (i.quantity || 0);
      
      const revA = getRev(a); const revB = getRev(b);
      const qtyA = getQty(a); const qtyB = getQty(b);
      const dtqdA = a.doanhThuQuyDoi || 0; const dtqdB = b.doanhThuQuyDoi || 0;
      const priceA = qtyA > 0 ? revA / qtyA : 0;
      const priceB = qtyB > 0 ? revB / qtyB : 0;
      const days = numDays || 1;

      if (sortMode === 'revenue_desc') return revB - revA;
      if (sortMode === 'revenue_asc') return revA - revB;
      if (sortMode === 'quantity_desc') return qtyB - qtyA;
      if (sortMode === 'quantity_asc') return qtyA - qtyB;
      if (sortMode === 'dtqd_desc') return dtqdB - dtqdA;
      if (sortMode === 'dtqd_asc') return dtqdA - dtqdB;
      if (sortMode === 'price_desc') return priceB - priceA;
      if (sortMode === 'price_asc') return priceA - priceB;
      if (sortMode === 'avg_qty_desc') return (qtyB/days) - (qtyA/days);
      if (sortMode === 'avg_qty_asc') return (qtyA/days) - (qtyB/days);
      if (sortMode === 'avg_rev_desc') return (revB/days) - (revA/days);
      if (sortMode === 'avg_rev_asc') return (revA/days) - (revB/days);
      if (sortMode === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortMode === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
  });

  function handleListSort(event) {
      const mode = event.detail;
      if (sortMode === mode) {
          sortMode = mode.endsWith('_desc') ? mode.replace('_desc', '_asc') : mode.replace('_asc', '_desc');
      } else sortMode = mode;
  }

  $: maxVal = Math.max(...sortedItems.map(i => showUnexported ? (i.doanhThuQuyDoi || 0) : (i.revenue || 0)), 1);

  // --- CHART DATA ---
  $: pieData = (() => {
      const sorted = aggregatedItems.filter(i => (showUnexported ? i.doanhThuQuyDoi : i.revenue) > 0)
          .sort((a, b) => (showUnexported ? b.doanhThuQuyDoi - a.doanhThuQuyDoi : b.revenue - a.revenue));
      if (sorted.length <= 14) return sorted;
      const top13 = sorted.slice(0, 13);
      const otherRevenue = sorted.slice(13).reduce((sum, item) => sum + (showUnexported ? item.doanhThuQuyDoi : item.revenue), 0);
      return [...top13, { name: 'Khác', revenue: otherRevenue }];
  })();

  $: barData = calculateBrandData(rawSource, aggregatedItems, $macroCategoryConfig);

  function calculateBrandData(source, visibleItems, configs) {
      if (!source || source.length === 0) return [];
      const allowedNames = new Set();
      visibleItems.forEach(item => {
          if (item.isMacro) {
              const conf = (configs || []).find(c => c.name === item.name);
              if (conf && conf.items) conf.items.forEach(k => allowedNames.add(cleanCategoryName(k)));
          } else allowedNames.add(cleanCategoryName(item.name || item.nganhHang));
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

  function handleWindowClick(e) {
      if (isSettingsOpen && !e.target.closest('.filter-wrapper')) isSettingsOpen = false;
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="luyke-tier-2-container relative">
    <h3 style="display: none;">{titleText}</h3>

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
        <LuykeCategoryGrid 
            {sortedItems} 
            {showUnexported} 
            {totalRevenue} 
            {maxVal} 
            {numDays} 
        />
    {:else if viewMode === 'list'}
        <LuykeCategoryList 
            {sortedItems} 
            {showUnexported} 
            {numDays} 
            {sortMode} 
            on:sort={handleListSort}
        />
    {:else}
        <LuykeCategoryCharts {pieData} {barData} {showUnexported} />
    {/if}
</div>

<style>
    :global(.capture-container .luyke-toolbar) { display: none !important; }
</style>