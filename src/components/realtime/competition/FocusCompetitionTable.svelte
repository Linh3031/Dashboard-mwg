<script>
  import { formatters } from '../../../utils/formatters.js';
  // Không cần import SortableTh nữa vì ta sẽ viết trực tiếp để kiểm soát layout tốt hơn

  export let competitionResult;

  const { competition, employeeData } = competitionResult;
  const brands = competition.brands || [];
  
  let targetDisplay = competition.target || 0;
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

  // Helper tạo class cho header
  const getHeaderClass = (key) => {
      const base = "px-2 py-2 text-center text-xs cursor-pointer hover:bg-gray-200 transition select-none";
      const active = sortKey === key ? (sortDirection === 'asc' ? 'sorted-asc bg-gray-200' : 'sorted-desc bg-gray-200') : '';
      return `${base} ${active}`;
  };

  $: sortedData = [...employeeData].sort((a, b) => {
    let valA = 0;
    let valB = 0;

    if (sortKey === 'hoTen') {
        const nameA = a.hoTen || '';
        const nameB = b.hoTen || '';
        return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    } 
    // Logic sort động cho các cột Hãng (VD: samsung_quantity)
    else if (sortKey.includes('_quantity') || sortKey.includes('_revenue')) {
        const [brandName, type] = sortKey.split('_'); // Tách tên hãng và loại (quantity/revenue)
        const perfA = a.performanceByBrand[brandName] || { quantity: 0, revenue: 0 };
        const perfB = b.performanceByBrand[brandName] || { quantity: 0, revenue: 0 };
        valA = perfA[type] || 0;
        valB = perfB[type] || 0;
    }
    // Logic sort cho các cột Tổng
    else {
        valA = Number(a[sortKey]) || 0;
        valB = Number(b[sortKey]) || 0;
    }
    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  // Tính tổng
  $: totals = employeeData.reduce((acc, item) => {
      acc.baseCategoryQuantity += item.baseCategoryQuantity;
      acc.baseCategoryRevenue += item.baseCategoryRevenue;
      acc.targetBrandsQuantity += item.targetBrandsQuantity;
      acc.targetBrandsRevenue += item.targetBrandsRevenue;

      for (const brandName of brands) {
          if (!acc.performanceByBrand[brandName]) {
              acc.performanceByBrand[brandName] = { quantity: 0, revenue: 0 };
          }
          const brandPerf = item.performanceByBrand[brandName];
          if (brandPerf) {
              acc.performanceByBrand[brandName].quantity += brandPerf.quantity;
              acc.performanceByBrand[brandName].revenue += brandPerf.revenue;
          }
      }
      return acc;
  }, { 
      baseCategoryQuantity: 0, baseCategoryRevenue: 0,
      targetBrandsQuantity: 0, targetBrandsRevenue: 0,
      performanceByBrand: {}
  });

  $: totalTyLeSL = totals.baseCategoryQuantity > 0 ? (totals.targetBrandsQuantity / totals.baseCategoryQuantity) : 0;
  $: totalTyLeDT = totals.baseCategoryRevenue > 0 ? (totals.targetBrandsRevenue / totals.baseCategoryRevenue) : 0;
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full" data-capture-group="competition-focus">
    <div class="p-4 bg-gray-50 border-b-2 border-indigo-200 flex justify-between items-center">
        <div>
            <h3 class="text-lg font-bold text-indigo-800 uppercase">{competition.name}</h3>
            <p class="text-xs text-indigo-600 font-medium mt-1">Hãng: {brands.join(', ')}</p>
        </div>
        <div class="flex items-center gap-2 bg-white px-2 py-1 rounded border border-indigo-100">
            <label for="target-{competition.id}" class="text-xs font-bold text-gray-500 uppercase">Mục tiêu %:</label>
            <input 
                type="number" 
                id="target-{competition.id}"
                class="w-16 p-1 text-sm border border-gray-300 rounded text-center focus:border-indigo-500 outline-none"
                bind:value={targetDisplay}
                placeholder="0"
            >
        </div>
    </div>

    <div class="overflow-x-auto flex-grow">
        <table class="min-w-full text-sm text-left text-gray-600 table-bordered table-striped">
            <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10">
                <tr>
                    <th rowspan="2" class="px-4 py-2 bg-gray-100 border border-gray-300 cursor-pointer min-w-[150px]" on:click={() => handleSort('hoTen')}>
                        NHÂN VIÊN {sortKey === 'hoTen' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    {#each brands as brand}
                        <th colspan="2" class="px-4 py-2 text-center bg-purple-100 text-purple-900 border border-purple-200">{brand}</th>
                    {/each}
                    <th colspan="2" class="px-4 py-2 text-center bg-blue-100 text-blue-900 border border-blue-200">TỔNG NHÓM</th>
                    <th colspan="2" class="px-4 py-2 text-center bg-orange-100 text-orange-900 border border-orange-200">TỶ LỆ KHAI THÁC</th>
                </tr>
                
                <tr>
                    {#each brands as brand}
                        <th class="{getHeaderClass(`${brand}_quantity`)} bg-purple-50" on:click={() => handleSort(`${brand}_quantity`)}>
                            SL {sortKey === `${brand}_quantity` ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th class="{getHeaderClass(`${brand}_revenue`)} bg-purple-50" on:click={() => handleSort(`${brand}_revenue`)}>
                            DT {sortKey === `${brand}_revenue` ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                    {/each}
                    
                    <th class="{getHeaderClass('baseCategoryQuantity')} bg-blue-50" on:click={() => handleSort('baseCategoryQuantity')}>
                        SL {sortKey === 'baseCategoryQuantity' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th class="{getHeaderClass('baseCategoryRevenue')} bg-blue-50" on:click={() => handleSort('baseCategoryRevenue')}>
                        DT {sortKey === 'baseCategoryRevenue' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    
                    <th class="{getHeaderClass('tyLeSL')} bg-orange-50" on:click={() => handleSort('tyLeSL')}>
                        % SL {sortKey === 'tyLeSL' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th class="{getHeaderClass('tyLeDT')} bg-orange-50" on:click={() => handleSort('tyLeDT')}>
                        % DT {sortKey === 'tyLeDT' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                {#each sortedData as item (item.maNV)}
                    {@const isBelowSL = targetDisplay > 0 && (item.tyLeSL * 100) < targetDisplay}
                    {@const isBelowDT = targetDisplay > 0 && (item.tyLeDT * 100) < targetDisplay}
                    
                    <tr class="hover:bg-indigo-50 transition">
                        <td class="px-4 py-2 font-semibold text-indigo-900 sticky left-0 bg-white hover:bg-indigo-50 border-r">
                            {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                        </td>
                        {#each brands as brand}
                            {@const brandPerf = item.performanceByBrand[brand] || { quantity: 0, revenue: 0 }}
                            <td class="px-2 py-2 text-right font-medium">{formatters.formatNumber(brandPerf.quantity)}</td>
                            <td class="px-2 py-2 text-right font-medium">{formatters.formatRevenue(brandPerf.revenue)}</td>
                        {/each}
                        <td class="px-2 py-2 text-right font-bold bg-blue-50/30">{formatters.formatNumber(item.baseCategoryQuantity)}</td>
                        <td class="px-2 py-2 text-right font-bold bg-blue-50/30">{formatters.formatRevenue(item.baseCategoryRevenue)}</td>
                        
                        <td class="px-2 py-2 text-right font-bold bg-orange-50/30 {isBelowSL ? 'text-red-600' : 'text-green-600'}">
                            {formatters.formatPercentage(item.tyLeSL)}
                        </td>
                        <td class="px-2 py-2 text-right font-bold bg-orange-50/30 {isBelowDT ? 'text-red-600' : 'text-green-600'}">
                            {formatters.formatPercentage(item.tyLeDT)}
                        </td>
                    </tr>
                {/each}
            </tbody>
            <tfoot class="table-footer font-bold bg-gray-100 border-t-2 border-gray-300">
                <tr>
                    <td class="px-4 py-2">Tổng</td>
                    {#each brands as brand}
                        {@const brandTotals = totals.performanceByBrand[brand] || { quantity: 0, revenue: 0 }}
                        <td class="px-2 py-2 text-right">{formatters.formatNumber(brandTotals.quantity)}</td>
                        <td class="px-2 py-2 text-right">{formatters.formatRevenue(brandTotals.revenue)}</td>
                    {/each}
                    <td class="px-2 py-2 text-right">{formatters.formatNumber(totals.baseCategoryQuantity)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatRevenue(totals.baseCategoryRevenue)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatPercentage(totalTyLeSL)}</td>
                    <td class="px-2 py-2 text-right">{formatters.formatPercentage(totalTyLeDT)}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>