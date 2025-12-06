<script>
  import { formatters } from '../../utils/formatters.js';
  import SortableTh from '../common/SortableTh.svelte';
  
  // Props cấu hình cho từng bảng nhỏ
  export let title = '';
  export let headerClass = ''; // Class màu header (vd: category-header-ict)
  export let reportData = [];
  export let mainRevenueKey = '';   // VD: dtICT
  export let mainQuantityKey = '';  // VD: slICT
  export let subQuantityKeys = [];  // VD: ['slDienThoai', 'slLaptop']
  export let subQuantityLabels = []; // VD: ['SL ĐT', 'SL Laptop']

  let sortKey = mainRevenueKey;
  let sortDirection = 'desc';

  // Lọc dữ liệu: Chỉ hiện nhân viên có phát sinh doanh thu/số lượng ở nhóm này
  // (Logic gốc: line 1468 ui-reports.js)
  $: filteredData = reportData.filter(item => (item[mainRevenueKey] || 0) > 0 || (item[mainQuantityKey] || 0) > 0);

  // Tính tổng footer
  $: totals = filteredData.reduce((acc, item) => {
      acc[mainRevenueKey] = (acc[mainRevenueKey] || 0) + (item[mainRevenueKey] || 0);
      acc[mainQuantityKey] = (acc[mainQuantityKey] || 0) + (item[mainQuantityKey] || 0);
      subQuantityKeys.forEach(subKey => {
          acc[subKey] = (acc[subKey] || 0) + (item[subKey] || 0);
      });
      return acc;
  }, {});

  // Logic sắp xếp
  function handleSort(event) {
      const key = event.detail;
      if (sortKey === key) {
          sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      } else {
          sortKey = key;
          sortDirection = 'desc';
      }
  }

  $: sortedData = [...filteredData].sort((a, b) => {
      let valA = Number(a[sortKey]) || 0;
      let valB = Number(b[sortKey]) || 0;

      if (sortKey === 'hoTen') {
          const nameA = a.hoTen || '';
          const nameB = b.hoTen || '';
          return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
  
      return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  // Map class màu từ logic cũ sang Tailwind để đảm bảo hiển thị đúng màu
  const titleClasses = {
    'category-header-ict': 'bg-blue-100 text-blue-800 border-blue-200',
    'category-header-phukien': 'bg-red-100 text-red-800 border-red-200',
    'category-header-giadung': 'bg-orange-100 text-orange-800 border-orange-200',
    'category-header-ce': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'category-header-baohiem': 'bg-purple-100 text-purple-800 border-purple-200'
  };
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden h-full flex flex-col animate-fade-in">
    <h4 class="text-lg font-bold p-3 border-b {titleClasses[headerClass] || 'bg-gray-100'} uppercase">{title}</h4>
    
    {#if sortedData.length === 0}
        <div class="flex-grow flex items-center justify-center p-6">
            <p class="text-gray-400 italic text-sm">Không có dữ liệu.</p>
        </div>
    {:else}
        <div class="overflow-x-auto flex-grow">
            <table class="min-w-full text-sm table-bordered table-striped">
                <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                        <SortableTh key="hoTen" label="Nhân viên" className="min-w-[150px]" {sortKey} {sortDirection} on:sort={handleSort} />
                        <SortableTh key={mainRevenueKey} label="DT" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                        <SortableTh key={mainQuantityKey} label="Tổng SL" align="right" {sortKey} {sortDirection} on:sort={handleSort} />
                        
                        {#each subQuantityKeys as subKey, index}
                            <SortableTh 
                                key={subKey} 
                                label={subQuantityLabels[index]} 
                                align="right" 
                                className="whitespace-nowrap text-gray-600"
                                {sortKey} {sortDirection} 
                                on:sort={handleSort} 
                            />
                        {/each}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    {#each sortedData as item (item.maNV)}
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-3 py-2 font-semibold text-blue-600 border-r border-gray-200">
                                {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                            </td>
                            <td class="px-3 py-2 text-right font-bold text-gray-900">{formatters.formatRevenue(item[mainRevenueKey])}</td>
                            <td class="px-3 py-2 text-right font-bold text-gray-900">{formatters.formatNumberOrDash(item[mainQuantityKey])}</td>
                            
                            {#each subQuantityKeys as subKey}
                                <td class="px-3 py-2 text-right text-gray-500 font-medium">{formatters.formatNumberOrDash(item[subKey])}</td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
                <tfoot class="table-footer font-bold bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                        <td class="px-3 py-2">Tổng</td>
                        <td class="px-3 py-2 text-right text-blue-800">{formatters.formatRevenue(totals[mainRevenueKey] || 0)}</td>
                        <td class="px-3 py-2 text-right">{formatters.formatNumberOrDash(totals[mainQuantityKey] || 0)}</td>
                        {#each subQuantityKeys as subKey}
                            <td class="px-3 py-2 text-right text-gray-600">{formatters.formatNumberOrDash(totals[subKey] || 0)}</td>
                        {/each}
                    </tr>
                </tfoot>
            </table>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>