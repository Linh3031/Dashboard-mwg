<script>
  import { formatters } from '../../../utils/formatters.js';
  // [NEW] Import Service và Store để xử lý lưu theo Kho
  import { datasyncService } from '../../../services/datasync.service.js';
  import { selectedWarehouse, localCompetitionConfigs } from '../../../stores.js';
  
  // Nhận dữ liệu của 1 chương trình đã được tính toán
  export let competitionResult; 
  
  // Destructure dữ liệu
  $: competition = competitionResult.competition;
  $: employeeData = competitionResult.employeeData;
  $: brands = competition.brands || [];
  
  // [LOGIC TÔ MÀU TỨC THÌ & UX]
  // 1. Tạo biến cục bộ để bind vào input -> Gõ là đổi số ngay
  let localTarget = 0;
  
  // 2. Đồng bộ giá trị ban đầu từ props vào biến cục bộ
  $: if (competition) {
      // Chỉ cập nhật nếu người dùng không đang gõ (để tránh giật)
      if (!isSaving) {
          localTarget = competition.target || 0;
      }
  }

  // 3. Tính toán màu sắc dựa trên localTarget (Phản hồi tức thì)
  $: targetDecimal = localTarget / 100;
  
  $: processedData = sortedData.map(item => {
      // Nếu localTarget > 0 thì mới so sánh, ngược lại mặc định là Đạt (hoặc logic tùy chọn)
      const isTargetSet = localTarget > 0;
      
      const isSLDat = isTargetSet ? item.tyLeSL >= targetDecimal : true;
      const isDTDat = isTargetSet ? item.tyLeDT >= targetDecimal : true;

      return {
          ...item,
          // Class màu sắc tính toán sẵn
          colorSL: isTargetSet ? (isSLDat ? 'text-green-600 font-bold' : 'text-red-500 font-bold') : 'text-gray-500',
          colorDT: isTargetSet ? (isDTDat ? 'text-green-600 font-bold' : 'text-red-500 font-bold') : 'font-bold'
      };
  });

  // State sắp xếp
  let sortKey = 'tyLeDT';
  let sortDirection = 'desc';
  
  // Biến trạng thái lưu
  let saveTimer;
  let isSaving = false;
  let saveStatus = ''; // 'saving', 'success', 'error'

  function handleSort(key) {
      if (sortKey === key) {
          sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      } else {
          sortKey = key;
          sortDirection = 'desc';
      }
  }

  // [LOGIC LƯU THEO KHO - CHUẨN DATASYNC]
  function handleInput() {
      // Đánh dấu đang nhập liệu để không bị props đè lại
      isSaving = true;
      saveStatus = 'saving';
      
      if (saveTimer) clearTimeout(saveTimer);
      
      saveTimer = setTimeout(async () => {
          try {
              console.log(`[AutoSave] Đang lưu mục tiêu: ${localTarget}% cho kho: ${$selectedWarehouse}`);
              
              if (!$selectedWarehouse) {
                  throw new Error("Chưa chọn kho làm việc");
              }

              // 1. Lấy danh sách cấu hình hiện tại từ Store (đã load từ dataService)
              // Clone ra mảng mới để xử lý
              let currentConfigs = $localCompetitionConfigs ? [...$localCompetitionConfigs] : [];
              
              // 2. Tìm xem chương trình này đã có cấu hình chưa
              const existingIndex = currentConfigs.findIndex(c => c.id === competition.id);
              
              if (existingIndex >= 0) {
                  // Update nếu đã có
                  currentConfigs[existingIndex] = { 
                      ...currentConfigs[existingIndex], 
                      target: localTarget 
                  };
              } else {
                  // Thêm mới nếu chưa có
                  currentConfigs.push({
                      id: competition.id,
                      name: competition.name, // Lưu thêm tên để dễ quản lý
                      target: localTarget
                  });
              }

              // 3. Gọi hàm saveCompetitionConfigs chuẩn trong datasyncService
              await datasyncService.saveCompetitionConfigs($selectedWarehouse, currentConfigs);
              
              // Cập nhật ngược lại store client để các màn hình khác cũng thấy
              localCompetitionConfigs.set(currentConfigs);
              
              console.log('[AutoSave] Đã đồng bộ về Kho thành công!');
              saveStatus = 'success';
              setTimeout(() => { 
                  saveStatus = ''; 
                  isSaving = false; 
              }, 2000);
              
          } catch (error) {
              console.error('[AutoSave] LỖI:', error);
              saveStatus = 'error';
              isSaving = false; 
          }
      }, 800); // Debounce 800ms
  }

  // Logic sắp xếp dữ liệu (Giữ nguyên)
  $: sortedData = [...employeeData].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortKey === 'hoTen') {
          return sortDirection === 'asc' 
              ? a.hoTen.localeCompare(b.hoTen) 
              : b.hoTen.localeCompare(a.hoTen);
      } 
      // Sort động cho các cột hãng (VD: samsung_quantity)
      else if (sortKey.includes('_quantity') || sortKey.includes('_revenue')) {
          const [brandName, type] = sortKey.split('_');
          const perfA = a.performanceByBrand[brandName] || { quantity: 0, revenue: 0 };
          const perfB = b.performanceByBrand[brandName] || { quantity: 0, revenue: 0 };
          valA = perfA[type] || 0;
          valB = perfB[type] || 0;
      } 
      else {
          valA = Number(a[sortKey]) || 0;
          valB = Number(b[sortKey]) || 0;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  // Tính tổng footer (Giữ nguyên)
  $: totals = employeeData.reduce((acc, item) => {
      acc.baseCategoryQuantity += item.baseCategoryQuantity;
      acc.baseCategoryRevenue += item.baseCategoryRevenue;
      brands.forEach(brand => {
          if (!acc.performanceByBrand[brand]) acc.performanceByBrand[brand] = { quantity: 0, revenue: 0 };
          const perf = item.performanceByBrand[brand] || { quantity: 0, revenue: 0 };
          acc.performanceByBrand[brand].quantity += perf.quantity;
          acc.performanceByBrand[brand].revenue += perf.revenue;
      });
      return acc;
  }, { baseCategoryQuantity: 0, baseCategoryRevenue: 0, performanceByBrand: {} });

  $: totalTyLeDT = totals.baseCategoryRevenue > 0 ? 
     Object.values(totals.performanceByBrand).reduce((sum, b) => sum + b.revenue, 0) / totals.baseCategoryRevenue : 0;

  // Helper class
  const headerClass = (key) => `px-2 py-3 cursor-pointer select-none hover:bg-indigo-100 transition ${sortKey === key ? 'bg-indigo-50 text-indigo-700' : ''}`;
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full">
    <div class="p-4 bg-gray-50 border-b-2 border-indigo-200 flex justify-between items-center">
        <div>
            <h3 class="text-lg font-bold text-indigo-800 uppercase">{competition.name}</h3>
            <p class="text-xs text-indigo-600 font-medium mt-1">
                Hãng: <span class="font-bold">{brands.join(', ')}</span>
            </p>
        </div>
        
        <div class="bg-white px-3 py-1 rounded border border-indigo-100 text-xs font-medium text-gray-500 flex items-center gap-1 shadow-sm hover:border-indigo-300 transition-colors relative">
            <span>Mục tiêu:</span>
            <input 
                type="number" 
                bind:value={localTarget}
                on:input={handleInput}
                on:focus={(e) => e.target.select()}
                class="w-12 text-center font-bold text-indigo-700 focus:outline-none focus:text-indigo-900 bg-transparent p-0 border-b border-dashed border-gray-300 focus:border-indigo-500 transition-all placeholder-indigo-200"
                placeholder="0"
            />
            <span>%</span>
            
            {#if saveStatus === 'saving'}
                <span class="absolute -bottom-5 right-0 text-[10px] text-orange-500 font-bold animate-pulse">Đang lưu...</span>
            {:else if saveStatus === 'success'}
                <span class="absolute -bottom-5 right-0 text-[10px] text-green-600 font-bold">Đã lưu!</span>
            {:else if saveStatus === 'error'}
                <span class="absolute -bottom-5 right-0 text-[10px] text-red-600 font-bold">Lỗi lưu!</span>
            {/if}
        </div>
    </div>

    <div class="overflow-x-auto flex-grow">
        <table class="min-w-full text-sm text-left border-collapse">
            <thead class="text-xs text-slate-700 uppercase bg-slate-100 font-bold sticky top-0 z-10">
                <tr>
                    <th rowspan="2" class="{headerClass('hoTen')} bg-gray-200 min-w-[180px]" on:click={() => handleSort('hoTen')}>
                        Nhân viên {sortKey === 'hoTen' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    {#each brands as brand}
                        <th colspan="2" class="px-2 py-1 text-center border-l border-gray-300 bg-purple-100 text-purple-900">{brand}</th>
                    {/each}
                    <th colspan="2" class="px-2 py-1 text-center border-l border-gray-300 bg-blue-100 text-blue-900">Tổng Nhóm</th>
                    <th colspan="2" class="px-2 py-1 text-center border-l border-gray-300 bg-orange-100 text-orange-900">Tỷ lệ</th>
                </tr>
                <tr>
                    {#each brands as brand}
                        <th class="{headerClass(`${brand}_quantity`)} text-right border-l border-gray-200" on:click={() => handleSort(`${brand}_quantity`)}>SL</th>
                        <th class="{headerClass(`${brand}_revenue`)} text-right" on:click={() => handleSort(`${brand}_revenue`)}>DT</th>
                    {/each}
                    
                    <th class="{headerClass('baseCategoryQuantity')} text-right border-l border-gray-200" on:click={() => handleSort('baseCategoryQuantity')}>SL</th>
                    <th class="{headerClass('baseCategoryRevenue')} text-right" on:click={() => handleSort('baseCategoryRevenue')}>DT</th>
                    
                    <th class="{headerClass('tyLeSL')} text-right border-l border-gray-200" on:click={() => handleSort('tyLeSL')}>% SL</th>
                    <th class="{headerClass('tyLeDT')} text-right" on:click={() => handleSort('tyLeDT')}>% DT</th>
                </tr>
            </thead>
            
            <tbody class="divide-y divide-gray-100">
                {#each processedData as item}
                    <tr class="hover:bg-indigo-50 transition-colors">
                        <td class="px-4 py-2 font-semibold text-indigo-900 whitespace-nowrap sticky left-0 bg-white hover:bg-indigo-50 border-r border-gray-200">
                            {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                        </td>
                        
                        {#each brands as brand}
                            {@const perf = item.performanceByBrand[brand] || {quantity: 0, revenue: 0}}
                            <td class="px-2 py-2 text-right border-l border-gray-100 text-gray-500">{formatters.formatNumberOrDash(perf.quantity)}</td>
                            <td class="px-2 py-2 text-right font-medium">{formatters.formatRevenue(perf.revenue)}</td>
                        {/each}

                        <td class="px-2 py-2 text-right border-l border-gray-200 font-bold bg-blue-50/30">{formatters.formatNumberOrDash(item.baseCategoryQuantity)}</td>
                        <td class="px-2 py-2 text-right font-bold bg-blue-50/30">{formatters.formatRevenue(item.baseCategoryRevenue)}</td>
                        
                        <td class="px-2 py-2 text-right border-l border-gray-200 {item.colorSL}">
                            {formatters.formatPercentage(item.tyLeSL)}
                        </td>

                        <td class="px-2 py-2 text-right {item.colorDT}">
                            {formatters.formatPercentage(item.tyLeDT)}
                        </td>
                    </tr>
                {/each}
            </tbody>
            
            <tfoot class="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300">
                <tr>
                    <td class="px-4 py-2">Tổng</td>
                    {#each brands as brand}
                        {@const perf = totals.performanceByBrand[brand] || {quantity: 0, revenue: 0}}
                        <td class="px-2 py-2 text-right border-l border-gray-200">{formatters.formatNumberOrDash(perf.quantity)}</td>
                        <td class="px-2 py-2 text-right">{formatters.formatRevenue(perf.revenue)}</td>
                    {/each}
                    <td class="px-2 py-2 text-right border-l border-gray-200">{formatters.formatNumberOrDash(totals.baseCategoryQuantity)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatRevenue(totals.baseCategoryRevenue)}</td>
                    <td class="px-2 py-2 text-right border-l border-gray-200">-</td>
                    <td class="px-2 py-2 text-right text-blue-700">{formatters.formatPercentage(totalTyLeDT)}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>