<script>
  import { formatters } from '../../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../../utils.js';
  import { settingsService } from '../../../services/settings.service.js';
  import SortableTh from '../../common/SortableTh.svelte';

  export let reportData = [];
  
  // [CẬP NHẬT] Đổi label % MLN -> % Máy lọc nước
  const ALL_COLUMNS = [
    { id: 'dtICT', label: 'DT ICT', isRate: false, headerClass: 'bg-blue-100 text-blue-900' },
    { id: 'dtPhuKien', label: 'DT Phụ kiện', isRate: false, headerClass: 'bg-blue-100 text-blue-900' },
    { id: 'pctPhuKien', label: '% Phụ kiện', isRate: true, targetKey: 'phanTramPhuKien', headerClass: 'bg-blue-100 text-blue-900' },
    { id: 'dtCE', label: 'DT CE', isRate: false, headerClass: 'bg-green-100 text-green-900' },
    { id: 'dtGiaDung', label: 'DT Gia dụng', isRate: false, headerClass: 'bg-green-100 text-green-900' },
    { id: 'pctGiaDung', label: '% Gia dụng', isRate: true, targetKey: 'phanTramGiaDung', headerClass: 'bg-green-100 text-green-900' },
    { id: 'pctMLN', label: '% Máy lọc nước', isRate: true, targetKey: 'phanTramMLN', headerClass: 'bg-green-100 text-green-900' }, // Đã sửa
    { id: 'pctSim', label: '% Sim', isRate: true, targetKey: 'phanTramSim', headerClass: 'bg-yellow-100 text-yellow-900' },
    { id: 'pctVAS', label: '% VAS', isRate: true, targetKey: 'phanTramVAS', headerClass: 'bg-yellow-100 text-yellow-900' },
    { id: 'pctBaoHiem', label: '% Bảo hiểm', isRate: true, targetKey: 'phanTramBaoHiem', headerClass: 'bg-yellow-100 text-yellow-900' }
  ];

  let allItemsConfig = settingsService.loadEfficiencyViewSettings();
  let visibleColumnIds = allItemsConfig.filter(c => c.visible).map(c => c.id);

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

  function handleSort(event) {
    const key = event.detail;
    if (sortKey === key) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDirection = 'desc';
    }
  }
  
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
  
  // [FIX] Cập nhật logic màu sắc: Xanh dương cho đạt, Đỏ cho không đạt
  function getCellClass(item, colDef) {
    const value = item[colDef.id] || 0;
    
    if (!colDef.isRate) return 'text-gray-900';

    const target = (item.mucTieu?.[colDef.targetKey] || 0) / 100;
    
    // Nếu có mục tiêu > 0 và giá trị < mục tiêu -> Đỏ
    if (target > 0 && value < target) return 'text-red-600 bg-red-50 font-bold';
    
    // Ngược lại (Đạt hoặc không có mục tiêu) -> Xanh dương
    return 'text-blue-600 font-bold'; 
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
                <SortableTh key="hoTen" label="Nhân viên" className="min-w-[200px] sticky left-0 z-30" {sortKey} {sortDirection} on:sort={handleSort} />

                {#each ALL_COLUMNS as col}
                  {#if visibleColumnIds.includes(col.id)}
                    <SortableTh 
                        key={col.id} 
                        label={col.label} 
                        align="right" 
                        className="whitespace-nowrap {col.headerClass || ''}"
                        {sortKey} {sortDirection} 
                        on:sort={handleSort} 
                    />
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