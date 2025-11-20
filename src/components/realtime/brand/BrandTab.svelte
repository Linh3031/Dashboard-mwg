<script>
  import { onMount } from 'svelte';
  import { realtimeYCXData } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { cleanCategoryName } from '../../../utils.js';
  import BrandTable from './BrandTable.svelte';

  export let selectedWarehouse = '';

  let viewType = 'brand'; // 'brand' | 'employee'
  let selectedCategory = '';
  let selectedBrand = '';
  
  let categories = [];
  let brands = [];
  let reportData = [];

  // 1. Lấy danh sách Ngành hàng từ dữ liệu (Reactive)
  $: {
      if ($realtimeYCXData.length > 0) {
          categories = [...new Set($realtimeYCXData
              .map(row => cleanCategoryName(row.nganhHang))
              .filter(Boolean))
          ].sort();
      }
  }

  // 2. Lấy danh sách Hãng dựa trên Ngành hàng đã chọn (Reactive)
  $: {
      let filteredData = $realtimeYCXData;
      if (selectedCategory) {
          filteredData = filteredData.filter(row => cleanCategoryName(row.nganhHang) === selectedCategory);
      }
      
      if (filteredData.length > 0) {
          brands = [...new Set(filteredData
              .map(row => row.nhaSanXuat || 'Hãng khác')
              .filter(Boolean))
          ].sort();
      } else {
          brands = [];
      }
      
      // Reset selectedBrand nếu nó không còn trong danh sách mới
      if (selectedBrand && !brands.includes(selectedBrand)) {
          selectedBrand = '';
      }
  }

  // 3. Tính toán dữ liệu báo cáo (Reactive)
  $: {
      // Lọc theo kho trước (Logic đơn giản hóa, sử dụng dữ liệu đã tải về)
      // Lưu ý: Nếu cần lọc chính xác theo kho của user, cần đảm bảo realtimeYCXData đã được lọc hoặc lọc lại ở đây
      // Hiện tại service sẽ xử lý việc tính toán tổng hợp.
      
      const result = reportService.generateRealtimeBrandReport(
          $realtimeYCXData, 
          selectedCategory,
          selectedBrand
      );
      
      if (viewType === 'brand') {
          reportData = result.byBrand;
      } else {
          reportData = result.byEmployee;
      }
  }
</script>

<div class="animate-fade-in pb-10">
    <div class="content-card mb-6">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-4 border-b pb-4">
            <h3 class="text-xl font-bold text-gray-700 uppercase">Thống kê theo Hãng</h3>
            <div class="view-switcher bg-gray-200 p-1 rounded-lg flex">
                <button 
                    class="px-4 py-2 rounded-md text-sm font-medium transition-all {viewType === 'brand' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-300'}"
                    on:click={() => viewType = 'brand'}
                >
                    Theo Hãng
                </button>
                <button 
                    class="px-4 py-2 rounded-md text-sm font-medium transition-all {viewType === 'employee' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-300'}"
                    on:click={() => viewType = 'employee'}
                >
                    Theo Nhân viên
                </button>
            </div>
        </div>
        
        <div class="flex flex-wrap items-center gap-4">
            <div class="flex flex-col">
                <label for="rt-brand-cat-select" class="text-sm font-semibold text-gray-600 mb-1">Ngành hàng:</label>
                <select 
                    id="rt-brand-cat-select"
                    class="p-2 border rounded-lg text-sm shadow-sm bg-white min-w-[200px] focus:ring-2 focus:ring-blue-500 outline-none"
                    bind:value={selectedCategory}
                >
                    <option value="">-- Tất cả ngành hàng --</option>
                    {#each categories as cat}
                        <option value={cat}>{cat}</option>
                    {/each}
                </select>
            </div>

            <div class="flex flex-col">
                <label for="rt-brand-select" class="text-sm font-semibold text-gray-600 mb-1">Hãng:</label>
                <select 
                    id="rt-brand-select"
                    class="p-2 border rounded-lg text-sm shadow-sm bg-white min-w-[200px] focus:ring-2 focus:ring-blue-500 outline-none"
                    bind:value={selectedBrand}
                >
                    <option value="">-- Tất cả các hãng --</option>
                    {#each brands as brand}
                        <option value={brand}>{brand}</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>

    <BrandTable {viewType} {reportData} />
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>