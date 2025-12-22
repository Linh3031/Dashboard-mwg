<script>
    import { formatters } from '../../../utils/formatters.js';
    import { datasyncService } from '../../../services/datasync.service.js';
    import { selectedWarehouse, localCompetitionConfigs } from '../../../stores.js';
  
    // Nhận dữ liệu từ component cha
    export let competitionResult;
  
    // Destructure dữ liệu để dễ dùng
    $: competition = competitionResult.competition;
    $: employeeData = competitionResult.employeeData;
    $: brands = competition.brands || [];
  
    // --- [1] LOGIC MỤC TIÊU & TÔ MÀU (NEW) ---
    
    // Biến lưu mục tiêu người dùng nhập (Mặc định 0)
    let localTarget = 0;
    let isSaving = false;
  
    // Tự động load mục tiêu cũ đã lưu (nếu có) khi mở trang
    $: if ($localCompetitionConfigs && competition) {
        const savedConfig = $localCompetitionConfigs.find(c => c.id === competition.id);
        if (savedConfig && !isSaving) {
            localTarget = savedConfig.target || 0;
        }
    }
  
    // Xử lý dữ liệu hiển thị & Tính màu sắc
    $: processedData = sortedData.map(item => {
        // Quy đổi mục tiêu từ % (VD: 80) sang số thập phân (0.8) để so sánh
        const targetDecimal = localTarget > 0 ? localTarget / 100 : 0;
        const hasTarget = localTarget > 0;
  
        // Logic kiểm tra: Chỉ so sánh nếu có đặt mục tiêu
        const isLowSL = hasTarget && item.tyLeSL < targetDecimal;
        const isLowDT = hasTarget && item.tyLeDT < targetDecimal;
  
        return {
            ...item,
            // Nếu dưới mục tiêu -> Tô đỏ & In đậm. Ngược lại -> Màu xám thường
            classSL: isLowSL ? 'text-red-600 font-bold bg-red-50' : 'text-gray-600',
            classDT: isLowDT ? 'text-red-600 font-bold bg-red-50' : 'text-gray-900 font-medium'
        };
    });
  
    // --- [2] LOGIC LƯU TRỮ ---
    let saveTimer;
    let saveStatus = '';
  
    function handleInput() {
        isSaving = true;
        saveStatus = 'saving';
        
        // Debounce: Chờ người dùng gõ xong 0.8s mới lưu
        if (saveTimer) clearTimeout(saveTimer);
        
        saveTimer = setTimeout(async () => {
            try {
                if (!$selectedWarehouse) return;
  
                // Cập nhật Store (để các tab khác thấy ngay)
                let currentConfigs = $localCompetitionConfigs ? [...$localCompetitionConfigs] : [];
                const idx = currentConfigs.findIndex(c => c.id === competition.id);
                
                if (idx >= 0) {
                    currentConfigs[idx] = { ...currentConfigs[idx], target: localTarget };
                } else {
                    currentConfigs.push({ id: competition.id, target: localTarget });
                }
                localCompetitionConfigs.set(currentConfigs);
  
                // Lưu xuống Database
                await datasyncService.saveCompetitionConfigs($selectedWarehouse, currentConfigs);
                
                saveStatus = 'success';
                setTimeout(() => { saveStatus = ''; isSaving = false; }, 2000);
            } catch (error) {
                console.error(error);
                saveStatus = 'error';
                isSaving = false;
            }
        }, 800);
    }
  
    // --- [3] LOGIC SẮP XẾP & UI KHÁC (GIỮ NGUYÊN) ---
    let sortKey = 'tyLeDT';
    let sortDirection = 'desc';
  
    function handleSort(key) {
        if (sortKey === key) {
            sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            sortKey = key;
            sortDirection = 'desc';
        }
    }
  
    $: sortedData = [...employeeData].sort((a, b) => {
        let valA = 0, valB = 0;
        // Logic lấy giá trị sắp xếp
        if (sortKey === 'hoTen') {
            return sortDirection === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
        } else if (sortKey.includes('_quantity') || sortKey.includes('_revenue')) {
            const [brandName, type] = sortKey.split('_');
            valA = (a.performanceByBrand[brandName] || {})[type] || 0;
            valB = (b.performanceByBrand[brandName] || {})[type] || 0;
        } else {
            valA = Number(a[sortKey]) || 0;
            valB = Number(b[sortKey]) || 0;
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  
    // Tính tổng chân trang
    $: totals = employeeData.reduce((acc, item) => {
        acc.baseCategoryQuantity += item.baseCategoryQuantity;
        acc.baseCategoryRevenue += item.baseCategoryRevenue;
        brands.forEach(brand => {
            if (!acc.performanceByBrand[brand]) acc.performanceByBrand[brand] = { quantity: 0, revenue: 0 };
            acc.performanceByBrand[brand].quantity += item.performanceByBrand[brand]?.quantity || 0;
            acc.performanceByBrand[brand].revenue += item.performanceByBrand[brand]?.revenue || 0;
        });
        return acc;
    }, { baseCategoryQuantity: 0, baseCategoryRevenue: 0, performanceByBrand: {} });
  
    $: totalTyLeDT = totals.baseCategoryRevenue > 0 ? 
        Object.values(totals.performanceByBrand).reduce((sum, b) => sum + b.revenue, 0) / totals.baseCategoryRevenue : 0;
  
    const headerClass = (key) => `px-2 py-3 cursor-pointer select-none transition text-xs font-bold uppercase ${sortKey === key ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-200'}`;
  </script>
  
  <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col h-full">
      <div class="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div>
              <h3 class="text-base font-bold text-gray-800 uppercase">{competition.name}</h3>
              <p class="text-[11px] text-gray-500 mt-0.5">
                  Phạm vi: <span class="font-semibold text-indigo-600">{brands.join(', ')}</span>
              </p>
          </div>
          
          <div class="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-300 shadow-sm relative">
              <span class="text-xs font-semibold text-gray-600">Mục tiêu:</span>
              <input 
                  type="number" 
                  bind:value={localTarget}
                  on:input={handleInput}
                  on:focus={(e) => e.target.select()}
                  class="w-10 text-center font-bold text-indigo-700 border-b border-gray-300 focus:border-indigo-500 outline-none text-sm p-0"
                  placeholder="0"
              />
              <span class="text-xs font-bold text-gray-500">%</span>
  
              {#if saveStatus === 'saving'}
                  <span class="absolute -bottom-4 right-0 text-[9px] text-orange-500 animate-pulse">Lưu...</span>
              {:else if saveStatus === 'success'}
                  <span class="absolute -bottom-4 right-0 text-[9px] text-green-600">Đã lưu</span>
              {/if}
          </div>
      </div>
  
      <div class="overflow-x-auto flex-grow">
          <table class="min-w-full text-sm text-left border-collapse">
              <thead class="text-xs text-slate-700 bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                      <th rowspan="2" class="{headerClass('hoTen')} bg-gray-200 min-w-[160px] border-r border-gray-300" on:click={() => handleSort('hoTen')}>
                          Nhân viên {sortKey === 'hoTen' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      {#each brands as brand}
                          <th colspan="2" class="px-2 py-1 text-center border-l border-gray-300 bg-purple-50 text-purple-900 font-bold">{brand}</th>
                      {/each}
                      <th colspan="2" class="px-2 py-1 text-center border-l border-gray-300 bg-blue-50 text-blue-900 font-bold">Tổng Nhóm</th>
                      <th colspan="2" class="px-2 py-1 text-center border-l border-gray-300 bg-orange-50 text-orange-900 font-bold">Tỷ lệ</th>
                  </tr>
                  <tr>
                      {#each brands as brand}
                          <th class="{headerClass(`${brand}_quantity`)} text-right border-l border-gray-200" on:click={() => handleSort(`${brand}_quantity`)}>SL</th>
                          <th class="{headerClass(`${brand}_revenue`)} text-right" on:click={() => handleSort(`${brand}_revenue`)}>DT</th>
                      {/each}
                      
                      <th class="{headerClass('baseCategoryQuantity')} text-right border-l border-gray-200" on:click={() => handleSort('baseCategoryQuantity')}>SL</th>
                      <th class="{headerClass('baseCategoryRevenue')} text-right" on:click={() => handleSort('baseCategoryRevenue')}>DT</th>
                      
                      <th class="{headerClass('tyLeSL')} text-right border-l border-gray-200 text-orange-800" on:click={() => handleSort('tyLeSL')}>% SL</th>
                      <th class="{headerClass('tyLeDT')} text-right text-orange-800" on:click={() => handleSort('tyLeDT')}>% DT</th>
                  </tr>
              </thead>
              
              <tbody class="divide-y divide-gray-100">
                  {#each processedData as item}
                      <tr class="hover:bg-indigo-50/50 transition-colors">
                          <td class="px-3 py-2 font-semibold text-indigo-900 whitespace-nowrap sticky left-0 bg-white hover:bg-indigo-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                              {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                          </td>
                          
                          {#each brands as brand}
                              {@const perf = item.performanceByBrand[brand] || {quantity: 0, revenue: 0}}
                              <td class="px-2 py-2 text-right border-l border-gray-100 text-gray-500">{formatters.formatNumberOrDash(perf.quantity)}</td>
                              <td class="px-2 py-2 text-right text-gray-700">{formatters.formatRevenue(perf.revenue)}</td>
                          {/each}
  
                          <td class="px-2 py-2 text-right border-l border-gray-200 font-medium bg-blue-50/20">{formatters.formatNumberOrDash(item.baseCategoryQuantity)}</td>
                          <td class="px-2 py-2 text-right font-medium bg-blue-50/20">{formatters.formatRevenue(item.baseCategoryRevenue)}</td>
                          
                          <td class="px-2 py-2 text-right border-l border-gray-200 {item.classSL}">
                              {formatters.formatPercentage(item.tyLeSL)}
                          </td>
  
                          <td class="px-2 py-2 text-right {item.classDT}">
                              {formatters.formatPercentage(item.tyLeDT)}
                          </td>
                      </tr>
                  {/each}
              </tbody>
              
              <tfoot class="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300 text-xs">
                  <tr>
                      <td class="px-3 py-2 sticky left-0 bg-gray-100 border-r border-gray-300">Tổng Cộng</td>
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