<script>
  import { formatters } from '../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../utils.js';

  export let reportData = [];

  // Cấu hình cột chuẩn theo thiết kế gốc
  const ALL_COLUMNS = [
      { id: 'dtICT', label: 'DT ICT', isRate: false, headerClass: 'bg-blue-100 text-blue-900' },
      { id: 'dtPhuKien', label: 'DT Phụ kiện', isRate: false, headerClass: 'bg-blue-100 text-blue-900' },
      { id: 'pctPhuKien', label: '% Phụ kiện', isRate: true, targetKey: 'phanTramPhuKien', headerClass: 'bg-blue-100 text-blue-900' },
      
      { id: 'dtCE', label: 'DT CE', isRate: false, headerClass: 'bg-green-100 text-green-900' },
      { id: 'dtGiaDung', label: 'DT Gia dụng', isRate: false, headerClass: 'bg-green-100 text-green-900' },
      { id: 'pctGiaDung', label: '% Gia dụng', isRate: true, targetKey: 'phanTramGiaDung', headerClass: 'bg-green-100 text-green-900' },
      { id: 'pctMLN', label: '% MLN', isRate: true, targetKey: 'phanTramMLN', headerClass: 'bg-green-100 text-green-900' },
      
      { id: 'pctSim', label: '% Sim', isRate: true, targetKey: 'phanTramSim', headerClass: 'bg-yellow-100 text-yellow-900' },
      { id: 'pctVAS', label: '% VAS', isRate: true, targetKey: 'phanTramVAS', headerClass: 'bg-yellow-100 text-yellow-900' },
      { id: 'pctBaoHiem', label: '% Bảo hiểm', isRate: true, targetKey: 'phanTramBaoHiem', headerClass: 'bg-yellow-100 text-yellow-900' }
  ];

  let visibleColumnIds = ALL_COLUMNS.map(c => c.id);
  let sortKey = 'dtICT';
  let sortDirection = 'desc';
  let groupedData = {};
  let departmentOrder = [];

  // --- FIX LỖI TẠI ĐÂY ---
  $: {
    const groups = {}; // Dùng biến cục bộ trước
    if (reportData && reportData.length > 0) {
        reportData.forEach(item => {
          const dept = item.boPhan || 'Khác';
          if (!groups[dept]) groups[dept] = []; 
          groups[dept].push(item);
        });
        groupedData = groups; // Gán lại cho biến state
        departmentOrder = getSortedDepartmentList(reportData);
    } else { 
        groupedData = {};
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

  function sortEmployees(employees) {
      if (!employees) return [];
      return [...employees].sort((a, b) => {
          if (sortKey === 'hoTen') {
             const nameA = a.hoTen || '';
             const nameB = b.hoTen || '';
             return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
          }
          let valA = Number(a[sortKey]) || 0;
          let valB = Number(b[sortKey]) || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
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
    
    if (colDef.isRate) {
        const target = (item.mucTieu?.[colDef.targetKey] || 0) / 100;
        if (target <= 0) return 'text-gray-900';
        if (value < target) return 'text-red-600 bg-red-50 font-bold';
        return 'text-green-600 font-bold';
    }
    return 'text-gray-900 font-medium';
  }

  function getHeaderClass(deptName) {
    if (deptName.includes('Tư Vấn')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (deptName.includes('Kho')) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
</script>

<div class="space-y-8 mt-4 animate-fade-in">
  <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-2 items-center">
     <span class="text-xs font-bold text-gray-500 uppercase mr-2">Hiển thị cột:</span>
     {#each ALL_COLUMNS as col}
        <button 
          class="px-3 py-1 rounded-full text-xs font-medium border transition-colors select-none
                 {visibleColumnIds.includes(col.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}"
          on:click={() => toggleColumn(col.id)}
        >
            {col.label}
        </button>
     {/each}
  </div>

  {#each departmentOrder as deptName}
    {#if groupedData[deptName]}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-4 border-b {getHeaderClass(deptName)}">
          <h4 class="text-lg font-bold uppercase">{deptName}</h4>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm text-left border-collapse">
            <thead class="text-xs text-gray-700 uppercase font-bold sticky top-0 z-20 shadow-sm">
               <tr>
                <th class="px-4 py-3 bg-gray-200 cursor-pointer hover:bg-gray-300 transition sticky left-0 z-30 min-w-[200px]" on:click={() => handleSort('hoTen')}>
                  <div class="flex items-center gap-1">
                    <span>Nhân viên</span>
                    {#if sortKey === 'hoTen'}<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                  </div>
                </th>

                {#each ALL_COLUMNS as col}
                  {#if visibleColumnIds.includes(col.id)}
                    <th class="px-4 py-3 cursor-pointer hover:opacity-80 transition whitespace-nowrap text-right {col.headerClass}" on:click={() => handleSort(col.id)}>
                       <div class="flex items-center justify-end gap-1">
                         <span>{col.label}</span>
                         {#if sortKey === col.id}<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>{/if}
                       </div>
                    </th>
                  {/if}
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each sortEmployees(groupedData[deptName]) as item (item.maNV)}
                <tr class="hover:bg-blue-50 transition-colors duration-150">
                  <td class="px-4 py-2 font-semibold text-blue-700 sticky left-0 bg-white hover:bg-blue-50 z-10 border-r border-gray-200 whitespace-nowrap">
                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                  </td>
                  {#each ALL_COLUMNS as col}
                    {#if visibleColumnIds.includes(col.id)}
                       <td class="px-4 py-2 text-right border-l border-gray-100 {getCellClass(item, col)}">
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

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>