<script>
  import { formatters } from '../../../utils/formatters.js';
  
  // Nhận dữ liệu của 1 chương trình đã được tính toán
  export let competitionResult; 
  
  // Destructure dữ liệu
  $: competition = competitionResult.competition;
  $: employeeData = competitionResult.employeeData;
  $: brands = competition.brands || [];
  
  // State sắp xếp
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

  // Logic sắp xếp dữ liệu
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

  // Tính tổng footer
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
        <div class="bg-white px-3 py-1 rounded border border-indigo-100 text-xs font-medium text-gray-500">
            Mục tiêu: {competition.target || 0}%
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
                {#each sortedData as item}
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
                        
                        <td class="px-2 py-2 text-right border-l border-gray-200 text-gray-500">{formatters.formatPercentage(item.tyLeSL)}</td>
                        <td class="px-2 py-2 text-right font-bold {item.tyLeDT >= (competition.target/100) ? 'text-green-600' : 'text-red-500'}">{formatters.formatPercentage(item.tyLeDT)}</td>
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