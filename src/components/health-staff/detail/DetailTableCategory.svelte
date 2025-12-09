<script>
  import { formatters } from '../../../utils/formatters.js';
  import { cleanCategoryName } from '../../../utils.js';
  import { categoryStructure, macroCategoryConfig } from '../../../stores.js'; 
  import CardFilter from './CardFilter.svelte';

  export let data = []; 
  export let rawEmployee = null; 

  const headerClass = "bg-[#7e22ce]";

  // Hàm chuẩn hóa key để so sánh (viết thường + bỏ khoảng trắng thừa)
  const normalizeKey = (str) => {
      if (!str) return '';
      return String(str).trim().toLowerCase();
  };

  let displayData = [];
  let filterItems = [];
  
  // State hiển thị (Lưu danh sách các KEY đã chuẩn hóa)
  let visibleKeys = new Set();
  let isInitialized = false;

  // Logic xử lý dữ liệu chính
  $: {
      // 1. Thu thập tất cả các tên ngành hàng từ mọi nguồn
      const source1 = ($macroCategoryConfig || []).map(m => m.name);
      const source2 = ($categoryStructure || []).map(c => cleanCategoryName(c.nganhHang)).filter(Boolean);
      const source3 = data.map(i => i.name);
      
      // Danh sách tên gốc để hiển thị
      const allRawNames = [...source1, ...source2, ...source3];

      // 2. Gộp dữ liệu vào Map để khử trùng lặp dựa trên key chuẩn hóa
      const mergedMap = new Map();

      allRawNames.forEach(rawName => {
          const key = normalizeKey(rawName);
          if (!key) return;

          // Nếu chưa có trong Map, tạo mới
          if (!mergedMap.has(key)) {
              // Ưu tiên lấy số liệu từ 'data' (đã tính toán)
              let existingItem = data.find(i => normalizeKey(i.name) === key);
              
              // Nếu không có, lấy từ rawEmployee (tra cứu an toàn)
              if (!existingItem && rawEmployee?.doanhThuTheoNganhHang) {
                  // Cần tìm key gốc trong object rawEmployee khớp với key chuẩn hóa
                  const rawKey = Object.keys(rawEmployee.doanhThuTheoNganhHang).find(k => normalizeKey(k) === key);
                  if (rawKey) {
                      existingItem = rawEmployee.doanhThuTheoNganhHang[rawKey];
                  }
              }

              // Tạo object hiển thị
              mergedMap.set(key, {
                  id: key, // Dùng key chuẩn hóa làm ID duy nhất cho vòng lặp
                  name: rawName, // Tên hiển thị (lấy cái đầu tiên tìm thấy)
                  quantity: existingItem ? existingItem.quantity : 0,
                  revenue: existingItem ? existingItem.revenue : 0,
                  revenueQuyDoi: existingItem ? existingItem.revenueQuyDoi : 0
              });
          }
      });

      // 3. Khởi tạo trạng thái filter (chỉ chạy 1 lần đầu)
      if (!isInitialized && mergedMap.size > 0) {
          // Mặc định hiện những cái có số liệu > 0
          mergedMap.forEach((val, key) => {
              if (val.revenue > 0 || val.quantity > 0) {
                  visibleKeys.add(key);
              }
          });
          // Nếu nhân viên không có dữ liệu gì, hiện tất cả hoặc top 10 (tuỳ chọn), ở đây ta để trống
          visibleKeys = new Set(visibleKeys);
          isInitialized = true;
      }

      // 4. Tạo danh sách hiển thị cuối cùng
      displayData = Array.from(mergedMap.values())
          .filter(item => visibleKeys.has(item.id))
          .sort((a, b) => b.revenue - a.revenue);

      // 5. Tạo danh sách cho bộ lọc
      // Sort bộ lọc theo tên A-Z để dễ tìm
      filterItems = Array.from(mergedMap.values())
          .map(item => ({
              id: item.id,
              label: item.name,
              visible: visibleKeys.has(item.id)
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
  }

  function handleFilterChange(event) {
      const id = event.detail; // id nhận được là key đã chuẩn hóa
      if (visibleKeys.has(id)) {
          visibleKeys.delete(id);
      } else {
          visibleKeys.add(id);
      }
      visibleKeys = new Set(visibleKeys); // Trigger reactivity
  }
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full">
    <div class="{headerClass} flex justify-between items-center p-3 text-white">
        <div class="flex items-center gap-2">
            <i data-feather="list" class="w-5 h-5"></i>
            <h4 class="text-lg font-bold">Doanh thu ngành hàng</h4>
        </div>
        <CardFilter items={filterItems} on:change={handleFilterChange} />
    </div>
    
    <div class="overflow-x-auto max-h-96">
        <table class="w-full text-sm table-bordered table-striped">
            <thead class="bg-gray-50 font-bold text-gray-700 sticky top-0 z-10">
                <tr>
                    <th class="px-3 py-2 text-left">Ngành hàng</th>
                    <th class="px-3 py-2 text-right">SL</th>
                    <th class="px-3 py-2 text-right">Doanh thu</th>
                    <th class="px-3 py-2 text-right">DTQĐ</th>
                </tr>
            </thead>
            <tbody>
                {#if displayData.length === 0}
                    <tr><td colspan="4" class="p-4 text-center text-gray-500">Đã ẩn hết dữ liệu.</td></tr>
                {:else}
                    {#each displayData as item (item.id)}
                        <tr class="border-t hover:bg-slate-50 transition-colors">
                            <td class="px-3 py-2 font-medium capitalize text-gray-800">{item.name}</td>
                            <td class="px-3 py-2 text-right font-bold text-gray-600">{formatters.formatNumber(item.quantity)}</td>
                            <td class="px-3 py-2 text-right font-bold text-gray-800">{formatters.formatRevenue(item.revenue, 0)}</td>
                            <td class="px-3 py-2 text-right font-bold text-purple-600">{formatters.formatRevenue(item.revenueQuyDoi, 0)}</td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>