<script>
  import { formatters } from '../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../utils.js';
  import { efficiencyConfig } from '../../stores.js'; // [MỚI] Import để lấy config động

  export let reportData = [];

  // [FIX] Cấu hình cột CỐ ĐỊNH (Hardcoded) khớp với key trong master.report.js
  const FIXED_COLUMNS = [
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

  // [MỚI] Merge cột cố định + cột động từ Admin
  $: ALL_COLUMNS = [
      ...FIXED_COLUMNS,
      ...($efficiencyConfig || []).map(conf => ({
          id: conf.id, // ID động (VD: eff_12345)
          label: conf.label,
          isRate: true,
          targetKey: conf.id, // Key mục tiêu trùng với ID chỉ số
          isDynamic: true,
          headerClass: 'bg-purple-100 text-purple-900'
      }))
  ];

  let visibleColumnIds = [];
  // Init visible columns
  $: if (visibleColumnIds.length === 0 && ALL_COLUMNS.length > 0) {
      visibleColumnIds = ALL_COLUMNS.map(c => c.id);
  }

  let sortKey = 'dtICT';
  let sortDirection = 'desc';
  let groupedData = {};
  let departmentOrder = [];

  $: {
    const groups = {}; 
    if (reportData && reportData.length > 0) {
        reportData.forEach(item => {
          const dept = item.boPhan || 'Khác';
          if (!groups[dept]) groups[dept] = []; 
          groups[dept].push(item);
        });
        groupedData = groups; 
        departmentOrder = getSortedDepartmentList(reportData);
    } else { 
        groupedData = {};
        departmentOrder = [];
    }
  }

  function handleSort(key) {
    if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    else { sortKey = key; sortDirection = 'desc'; }
  }

  // Logic lấy giá trị an toàn
  const getValue = (item, colId, isDynamic) => {
      if (isDynamic) {
          // Với chỉ số động, giá trị nằm trong dynamicMetrics
          return item.dynamicMetrics?.[colId]?.value || 0;
      }
      return item[colId] || 0;
  };

  $: sortEmployees = (dept) => {
      const items = groupedData[dept] || [];
      return [...items].sort((a, b) => {
          if (sortKey === 'hoTen') {
             const nameA = a.hoTen || '';
             const nameB = b.hoTen || '';
             return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
          }
          
          // Check xem sort key là động hay tĩnh để lấy giá trị đúng
          const isDynamicSort = $efficiencyConfig.some(c => c.id === sortKey);
          let valA = getValue(a, sortKey, isDynamicSort);
          let valB = getValue(b, sortKey, isDynamicSort);
          
          return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  };

  function toggleColumn(columnId) {
      if (visibleColumnIds.includes(columnId)) visibleColumnIds = visibleColumnIds.filter(id => id !== columnId);
      else visibleColumnIds = [...visibleColumnIds, columnId];
  }

  // [FIX] Logic Tô màu ô
  function getCellClass(item, colDef) {
    const value = getValue(item, colDef.id, colDef.isDynamic);
    
    if (colDef.isRate) {
        // Lấy target: Nếu là cột động, lấy từ settings, nếu tĩnh lấy từ mucTieu
        let target = 0;
        if (colDef.isDynamic) {
             // Target động được lưu trong mucTieu với key chính là ID chỉ số
             target = (item.mucTieu?.[colDef.targetKey] || 0) / 100;
             // Fallback: Nếu user chưa set mục tiêu riêng, lấy default từ config
             if (target === 0) {
                 const cfg = $efficiencyConfig.find(c => c.id === colDef.id);
                 target = (cfg?.target || 0) / 100;
             }
        } else {
             target = (item.mucTieu?.[colDef.targetKey] || 0) / 100;
        }

        if (target > 0 && value < target) return 'text-red-600 font-bold bg-red-50'; // Không đạt
        return 'text-red-800 font-bold'; // Mặc định % là đỏ đậm
    } 
    
    if (colDef.id.startsWith('dt')) return 'text-blue-700 font-medium';
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
              {#each sortEmployees(deptName) as item (item.maNV)}
                <tr class="hover:bg-blue-50 transition-colors duration-150">
                  <td class="px-4 py-2 font-semibold text-blue-700 sticky left-0 bg-white hover:bg-blue-50 z-10 border-r border-gray-200 whitespace-nowrap">
                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                  </td>
                  {#each ALL_COLUMNS as col}
                    {#if visibleColumnIds.includes(col.id)}
                       {@const val = getValue(item, col.id, col.isDynamic)}
                       <td class="px-4 py-2 text-right border-l border-gray-100 {getCellClass(item, col)}">
                          {#if col.isRate}
                            {formatters.formatPercentage(val)}
                         {:else}
                            {formatters.formatRevenue(val)}
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