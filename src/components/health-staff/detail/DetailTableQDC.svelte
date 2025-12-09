<script>
  import { formatters } from '../../../utils/formatters.js';
  import { cleanCategoryName } from '../../../utils.js';
  import { categoryStructure, macroProductGroupConfig } from '../../../stores.js'; 
  import CardFilter from './CardFilter.svelte';

  export let data = []; 
  export let rawEmployee = null; 

  const headerClass = "bg-[#4f46e5]"; 

  const normalizeKey = (str) => {
      if (!str) return '';
      return String(str).trim().toLowerCase();
  };

  let displayData = [];
  let filterItems = [];
  let visibleKeys = new Set();
  let isInitialized = false;

  $: {
      const source1 = ($macroProductGroupConfig || []).map(m => m.name);
      const source2 = ($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean);
      const source3 = data.map(i => i.name);
      const allRawNames = [...source1, ...source2, ...source3];

      const mergedMap = new Map();

      allRawNames.forEach(rawName => {
          const key = normalizeKey(rawName);
          if (!key) return;

          if (!mergedMap.has(key)) {
              let existingItem = data.find(i => normalizeKey(i.name) === key);
              
              if (!existingItem) {
                  // Thử tìm trong nhomHangChiTiet
                  if (rawEmployee?.doanhThuTheoNhomHang) {
                      const rawKey = Object.keys(rawEmployee.doanhThuTheoNhomHang).find(k => normalizeKey(k) === key);
                      if (rawKey) existingItem = rawEmployee.doanhThuTheoNhomHang[rawKey];
                  }
                  // Nếu không thấy, thử tìm trong qdc (vì QĐC cũng là nhóm hàng)
                  if (!existingItem && rawEmployee?.qdc) {
                      const rawKey = Object.keys(rawEmployee.qdc).find(k => normalizeKey(k) === key);
                      if (rawKey) existingItem = rawEmployee.qdc[rawKey];
                  }
              }

              mergedMap.set(key, {
                  id: key,
                  name: rawName,
                  sl: existingItem ? (existingItem.sl || existingItem.quantity || 0) : 0,
                  dtqd: existingItem ? (existingItem.dtqd || existingItem.revenueQuyDoi || 0) : 0
              });
          }
      });

      if (!isInitialized && mergedMap.size > 0) {
          mergedMap.forEach((val, key) => {
              if (val.dtqd > 0 || val.sl > 0) visibleKeys.add(key);
          });
          visibleKeys = new Set(visibleKeys);
          isInitialized = true;
      }

      displayData = Array.from(mergedMap.values())
          .filter(item => visibleKeys.has(item.id))
          .sort((a, b) => b.dtqd - a.dtqd);

      filterItems = Array.from(mergedMap.values())
          .map(item => ({
              id: item.id,
              label: item.name,
              visible: visibleKeys.has(item.id)
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
  }

  function handleFilterChange(event) {
      const id = event.detail;
      if (visibleKeys.has(id)) visibleKeys.delete(id);
      else visibleKeys.add(id);
      visibleKeys = new Set(visibleKeys);
  }
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full">
    <div class="{headerClass} flex justify-between items-center p-3 text-white">
        <div class="flex items-center gap-2">
            <i data-feather="star" class="w-5 h-5"></i>
            <h4 class="text-lg font-bold">Nhóm hàng Quy đổi cao</h4>
        </div>
        <CardFilter items={filterItems} on:change={handleFilterChange} />
    </div>
    
    <div class="overflow-x-auto max-h-96">
        <table class="w-full text-sm table-bordered table-striped">
            <thead class="bg-gray-50 font-bold text-gray-700 sticky top-0 z-10">
                <tr>
                    <th class="px-3 py-2 text-left">Nhóm hàng</th>
                    <th class="px-3 py-2 text-right">SL</th>
                    <th class="px-3 py-2 text-right">DTQĐ (Tr)</th>
                </tr>
            </thead>
            <tbody>
                {#if displayData.length === 0}
                    <tr><td colspan="3" class="p-4 text-center text-gray-500">Đã ẩn hết dữ liệu.</td></tr>
                {:else}
                    {#each displayData as item (item.id)}
                        <tr class="border-t hover:bg-slate-50 transition-colors">
                            <td class="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                            <td class="px-3 py-2 text-right font-bold text-gray-600">{formatters.formatNumber(item.sl)}</td>
                            <td class="px-3 py-2 text-right font-bold text-blue-600">{formatters.formatRevenue(item.dtqd)}</td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>