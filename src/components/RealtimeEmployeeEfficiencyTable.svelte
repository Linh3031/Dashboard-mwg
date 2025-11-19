<script>
  import { formatters } from '../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../utils.js';

  export let reportData = [];

  // Cấu hình các cột dữ liệu (Hardcode dựa trên logic cũ để đảm bảo chính xác)
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

  // State: Quản lý các cột đang hiển thị (Mặc định hiện tất cả)
  let visibleColumnIds = ALL_COLUMNS.map(c => c.id);
  
  // State: Sắp xếp
  let sortKey = 'dtICT';
  let sortDirection = 'desc';

  // Nhóm dữ liệu theo bộ phận
  let groupedData = {};
  let departmentOrder = [];

  $: {
    groupedData = {};
    reportData.forEach(item => {
      const dept = item.boPhan || 'Khác';
      if (!groupedData[dept]) groupedData[dept] = [];
      groupedData[dept].push(item);
    });
    departmentOrder = getSortedDepartmentList(reportData);
  }

  // Logic sắp xếp
  function handleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }

  function sortEmployees(employees) {
    return [...employees].sort((a, b) => {
      let valA = a[sortKey] || 0;
      let valB = b[sortKey] || 0;
      
      if (sortKey === 'hoTen') {
        valA = a.hoTen || '';
        valB = b.hoTen || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }

  // Logic bật/tắt cột
  function toggleColumn(columnId) {
    if (visibleColumnIds.includes(columnId)) {
      visibleColumnIds = visibleColumnIds.filter(id => id !== columnId);
    } else {
      visibleColumnIds = [...visibleColumnIds, columnId];
    }
  }
  
  // Helper: Tô màu đỏ nếu dưới mục tiêu, xanh nếu đạt
  function getCellClass(item, colDef) {
    if (!colDef.isRate) return 'text-gray-900';
    
    const value = item[colDef.id] || 0;
    // Lấy mục tiêu từ item.mucTieu (được gán trong reportService)
    const target = (item.mucTieu?.[colDef.targetKey] || 0) / 100;
    
    if (target > 0 && value < target) {
        return 'text-red-600 bg-red-50 font-bold';
    }
    return 'text-green-600 font-bold';
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
          class="px-3 py-1 rounded-full text-xs font-medium border transition-colors select-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
                 {visibleColumnIds.includes(col.id) 
                   ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                   : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}"
          on:click={() => toggleColumn(col.id)}
          aria-pressed={visibleColumnIds.includes(col.id)}
        >
          {col.label}
        </button>
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
                <th class="px-4 py-3 cursor-pointer hover:bg-slate-300 transition sticky left-0 bg-slate-200 z-30 min-w-[200px]" on:click={() => handleSort('hoTen')}>
                  Nhân viên {sortKey === 'hoTen' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                {#each ALL_COLUMNS as col}
                  {#if visibleColumnIds.includes(col.id)}
                    <th class="px-4 py-3 text-right cursor-pointer hover:bg-slate-300 transition whitespace-nowrap" on:click={() => handleSort(col.id)}>
                      {col.label} {sortKey === col.id ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  {/if}
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each sortEmployees(groupedData[deptName]) as item (item.maNV)}
                <tr class="hover:bg-blue-50 transition">
                  <td class="px-4 py-2 font-semibold text-blue-600 sticky left-0 bg-white hover:bg-blue-50 z-10 border-r border-gray-200">
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