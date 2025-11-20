<script>
  import { formatters } from '../../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../../utils.js';

  export let reportData = [];
  
  const HEADER_COLORS = {
    'dtICT': 'bg-blue-100 text-blue-900', 'dtPhuKien': 'bg-blue-100 text-blue-900', 'pctPhuKien': 'bg-blue-100 text-blue-900',
    'dtCE': 'bg-green-100 text-green-900', 'dtGiaDung': 'bg-green-100 text-green-900', 'pctGiaDung': 'bg-green-100 text-green-900',
    'pctMLN': 'bg-yellow-100 text-yellow-900', 'pctSim': 'bg-yellow-100 text-yellow-900', 'pctVAS': 'bg-yellow-100 text-yellow-900', 'pctBaoHiem': 'bg-yellow-100 text-yellow-900'
  };

  const ALL_COLUMNS = [
    { id: 'dtICT', label: 'DT ICT', isRate: false },
    { id: 'dtPhuKien', label: 'DT Phụ kiện', isRate: false },
    { id: 'pctPhuKien', label: '% Phụ kiện', isRate: true, targetKey: 'phanTramPhuKien' },
    { id: 'dtCE', label: 'DT CE', isRate: false },
    { id: 'dtGiaDung', label: 'DT Gia dụng', isRate: false },
    { id: 'pctGiaDung', label: '% Gia dụng', isRate: true, targetKey: 'phanTramGiaDung' },
    { id: 'pctMLN', label: '% MLN', isRate: true, targetKey: 'phanTramMLN' },
    { id: 'pctSim', label: '% Sim', isRate: true, targetKey: 'phanTramSim' },
    { id: 'pctVAS', label: '% VAS', isRate: true, targetKey: 'phanTramVAS' },
    { id: 'pctBaoHiem', label: '% Bảo hiểm', isRate: true, targetKey: 'phanTramBaoHiem' }
  ];

  let visibleColumnIds = ALL_COLUMNS.map(c => c.id);
  let sortKey = 'dtICT';
  let sortDirection = 'desc';
  let groupedData = {};
  let departmentOrder = [];

  $: {
    groupedData = {};
    if (reportData && reportData.length > 0) {
        reportData.forEach(item => {
          const dept = item.boPhan || 'Khác';
          if (!groupedData[dept]) groupedData[dept] = []; 
          groupedData[dept].push(item);
        });
        departmentOrder = getSortedDepartmentList(reportData);
    } else { 
        departmentOrder = []; 
    }
  }

  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }
  
  // SỬA LỖI: Thêm tham số key và dir vào hàm để Svelte nhận biết sự thay đổi
  function sortEmployees(employees, key, dir) {
      return [...employees].sort((a, b) => {
          if (key === 'hoTen') {
             const nameA = a.hoTen || '';
             const nameB = b.hoTen || '';
             return dir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
          }
  
          let valA = Number(a[key]) || 0;
          let valB = Number(b[key]) || 0;
          return dir === 'asc' ? valA - valB : valB - valA;
      });
  }

  function toggleColumn(columnId) {
      if (visibleColumnIds.includes(columnId)) {
          visibleColumnIds = visibleColumnIds.filter(id => id !== columnId);
      } else {
          visibleColumnIds = [...visibleColumnIds, columnId];
      }
  }
  
  function getCellClass(item, colDef) {
    const value = item[colDef.id] || 0;
    
    if (!colDef.isRate) return 'text-gray-900';

    const target = (item.mucTieu?.[colDef.targetKey] || 0) / 100;
    if (target > 0 && value < target) return 'text-red-600 bg-red-50';
    return 'text-green-600';
  }
  
  function getHeaderClass(deptName) {
    if (deptName.includes('Tư Vấn')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (deptName.includes('Kho')) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
</script>

<div class="space-y-6">
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
     <span class="text-sm font-bold text-gray-700 mr-2 block mb-2">Tùy chỉnh cột hiển thị:</span>
     <div class="flex flex-wrap gap-2">
      {#each ALL_COLUMNS as col}
        <button 
          class="px-3 py-1 rounded-full text-xs font-medium border transition-colors select-none focus:outline-none
                 {visibleColumnIds.includes(col.id) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}"
          on:click={() => toggleColumn(col.id)}
        >{col.label}</button>
      {/each}
    </div>
  </div>

  {#each departmentOrder as deptName}
    {#if groupedData[deptName]}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-4 border-b {getHeaderClass(deptName)}">
          <h4 class="text-lg font-bold uppercase">{deptName}</h4>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm text-left text-gray-600 table-bordered">
            <thead class="text-xs text-slate-800 uppercase bg-slate-200 font-bold sticky top-0 z-20">
               <tr>
                <th class="px-4 py-3 cursor-pointer hover:bg-slate-300 transition sticky left-0 bg-slate-200 z-30 min-w-[200px] select-none" on:click={() => handleSort('hoTen')}>
                  <div class="flex items-center gap-1">
                    <span>Nhân viên</span>
                    <svg class="w-3 h-3 {sortKey === 'hoTen' ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-50'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="{sortKey === 'hoTen' && sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}" />
                    </svg>
                  </div>
                </th>

                {#each ALL_COLUMNS as col}
                  {#if visibleColumnIds.includes(col.id)}
                    <th class="px-4 py-3 cursor-pointer hover:opacity-80 transition whitespace-nowrap select-none {HEADER_COLORS[col.id] || ''}" on:click={() => handleSort(col.id)}>
                       <div class="flex items-center justify-end gap-1">
                         <span>{col.label}</span>
                         <svg class="w-3 h-3 {sortKey === col.id ? 'opacity-100' : 'opacity-40'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="{sortKey === col.id ? 3 : 2}" d="{sortKey === col.id && sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}" />
                         </svg>
                       </div>
                    </th>
                  {/if}
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each sortEmployees(groupedData[deptName], sortKey, sortDirection) as item (item.maNV)}
                <tr class="hover:bg-blue-50 transition">
                  <td class="px-4 py-2 font-semibold text-blue-600 sticky left-0 bg-white hover:bg-blue-50 z-10 border-r border-gray-200">
                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                  </td>
                  {#each ALL_COLUMNS as col}
                    {#if visibleColumnIds.includes(col.id)}
                      <td class="px-4 py-2 text-right border-l border-gray-100 font-bold {getCellClass(item, col)}">
                         {#if col.isRate}
                            {formatters.formatPercentage(item[col.id])}
                         {:else}
                            {formatters.formatRevenue(item[col.id])}
                         {/if}
                      </td>
                    {/if}
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/each}
</div>