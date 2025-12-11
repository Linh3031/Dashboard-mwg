<script>
  import { onMount, afterUpdate } from 'svelte';
  import { pastedThiDuaReportData, competitionNameMappings } from '../../../stores.js'; 
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  import { getSortedDepartmentList } from '../../../utils.js'; 
  
  // [YÊU CẦU] SortableTh đã có sẵn tính năng sort, ta tận dụng lại
  import SortableTh from '../../common/SortableTh.svelte'; 

  export let reportData = []; 

  // State
  let columnSettings = [];
  let sortKey = 'hoTen';
  let sortDirection = 'asc';
  let groupedData = {};
  let departmentOrder = [];
  let deptAverages = {}; 

  // Palette màu cho header (YÊU CẦU: Mỗi tiêu đề 1 màu)
  const headerColors = [
      'bg-red-100 text-red-900 border-red-200',
      'bg-orange-100 text-orange-900 border-orange-200',
      'bg-amber-100 text-amber-900 border-amber-200',
      'bg-green-100 text-green-900 border-green-200',
      'bg-teal-100 text-teal-900 border-teal-200',
      'bg-cyan-100 text-cyan-900 border-cyan-200',
      'bg-blue-100 text-blue-900 border-blue-200',
      'bg-indigo-100 text-indigo-900 border-indigo-200',
      'bg-violet-100 text-violet-900 border-violet-200',
      'bg-purple-100 text-purple-900 border-purple-200',
      'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
      'bg-pink-100 text-pink-900 border-pink-200',
      'bg-rose-100 text-rose-900 border-rose-200'
  ];

  function getHeaderColor(index) {
      return headerColors[index % headerColors.length];
  }

  // Reactive: Xử lý dữ liệu khi input thay đổi
  $: {
      if (reportData && reportData.length > 0) {
          // Load setting hiển thị cột
          columnSettings = settingsService.loadPastedCompetitionViewSettings();
          
          // Fallback nếu chưa có setting
          if (columnSettings.length === 0) {
             columnSettings = settingsService.loadPastedCompetitionViewSettings();
          }

          // [YÊU CẦU] Cập nhật label từ competitionNameMappings
          columnSettings = columnSettings.map(col => {
              const shortName = $competitionNameMappings[col.tenGoc];
              return {
                  ...col,
                  label: shortName || col.label || col.tenGoc // Ưu tiên tên rút gọn -> tên hiện tại -> tên gốc
              };
          });

          // Gom nhóm theo bộ phận
          const groups = {};
          reportData.forEach(item => {
              const dept = item.boPhan || 'Chưa phân loại';
              if (!groups[dept]) groups[dept] = [];
              groups[dept].push(item);
          });
          groupedData = groups;
          departmentOrder = getSortedDepartmentList(reportData);

          // Tính trung bình bộ phận (để tính điểm đạt)
          const avgs = {};
          departmentOrder.forEach(deptName => {
              const deptData = groups[deptName];
              const deptAvg = {};
              columnSettings.forEach(col => {
                  let total = 0;
                  let count = 0;
                  deptData.forEach(emp => {
                      const compData = emp.competitions.find(c => c.tenGoc === col.tenGoc);
                      const giaTri = compData?.giaTri || 0;
                      if (giaTri > 0) { 
                          total += giaTri;
                          count++;
                      }
                  });
                  deptAvg[col.tenGoc] = count > 0 ? total / count : 0;
              });
              avgs[deptName] = deptAvg;
          });
          deptAverages = avgs;
      } else {
          groupedData = {};
          departmentOrder = [];
      }
  }

  $: visibleColumns = columnSettings.filter(col => col.visible);

  function handleSort(event) {
      // SortableTh dispatch sự kiện 'sort' với detail là key
      const key = event.detail; 
      if (sortKey === key) {
          sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      } else {
          sortKey = key;
          sortDirection = 'desc'; // Mặc định desc cho số liệu
      }
  }

  function sortEmployees(employees, deptName) {
      return [...employees].sort((a, b) => {
          let valA, valB;
          
          if (sortKey.startsWith('comp_')) {
               const sortCol = columnSettings.find(c => c.id === sortKey);
               if (!sortCol) return 0;
               valA = a.competitions.find(c => c.tenGoc === sortCol.tenGoc)?.giaTri || 0;
               valB = b.competitions.find(c => c.tenGoc === sortCol.tenGoc)?.giaTri || 0;
               return sortDirection === 'asc' ? valA - valB : valB - valA;

          } else if (sortKey === 'totalScore') {
               const avgScores = deptAverages[deptName];
               const getScore = (emp) => {
                   let score = 0;
                   emp.competitions.forEach(comp => {
                       if (avgScores[comp.tenGoc] > 0 && comp.giaTri >= avgScores[comp.tenGoc]) score++;
                   });
                   return score;
               };
               valA = getScore(a);
               valB = getScore(b);
               return sortDirection === 'asc' ? valA - valB : valB - valA;

          } else {
               valA = a[sortKey] || '';
               valB = b[sortKey] || '';
               return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
      });
  }

  function toggleColumn(col) {
      const newSettings = columnSettings.map(c => 
          c.tenGoc === col.tenGoc ? { ...c, visible: !c.visible } : c
      );
      columnSettings = newSettings;
      settingsService.savePastedCompetitionViewSettings(newSettings);
  }

  function calculateFooter(deptData, type = 'total') {
      const results = {};
      visibleColumns.forEach(col => {
          let total = 0;
          let count = 0;
          deptData.forEach(emp => {
              const compData = emp.competitions.find(c => c.tenGoc === col.tenGoc);
              const giaTri = compData?.giaTri || 0;
              if (giaTri > 0) {
                  total += giaTri;
                  count++;
              }
          });
          
          if (type === 'total') {
              results[col.tenGoc] = total;
          } else {
              results[col.tenGoc] = count > 0 ? total / count : 0;
          }
      });
      return results;
  }
</script>

<div class="space-y-6 animate-fade-in">
    {#if reportData.length === 0}
        <div class="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <p class="text-gray-500">Vui lòng dán dữ liệu "Thi đua nhân viên" ở tab "Cập nhật dữ liệu".</p>
        </div>
    {:else}
        <div class="bg-white p-3 rounded-lg border border-gray-200 flex flex-wrap gap-2 items-center">
            <span class="text-xs font-bold text-gray-500 uppercase mr-2">Hiển thị cột:</span>
            {#each columnSettings as col, index}
                <button 
                    class="px-3 py-1 rounded-full text-xs font-medium border transition-colors select-none flex items-center gap-1
                            {col.visible ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}"
                    on:click={() => toggleColumn(col)}
                    title={col.loaiSoLieu}
                >
                    {#if col.visible}
                        <span class="w-2 h-2 rounded-full {getHeaderColor(index).split(' ')[0].replace('bg-', 'bg-white/80 ')}"></span>
                    {/if}
                    {col.label}
                </button>
            {/each}
        </div>

        {#each departmentOrder as deptName}
            {#if groupedData[deptName]}
                <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-gray-50 border-b border-gray-200">
                        <h4 class="text-lg font-bold text-gray-800">{deptName}</h4>
                    </div>
                    
                    <div class="overflow-x-auto sknv-pasted-competition-scroller relative" style="max-height: 600px;">
                        <table class="min-w-full text-sm text-left border-separate border-spacing-0">
                            <thead class="text-xs uppercase font-bold sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <SortableTh 
                                        key="hoTen" 
                                        label="Nhân viên" 
                                        className="bg-gray-100 border-b border-r border-gray-200 min-w-[180px] sticky left-0 z-30" 
                                        {sortKey} {sortDirection} 
                                        on:sort={handleSort} 
                                    />
                                    
                                    <SortableTh 
                                        key="totalScore" 
                                        label="Tổng đạt" 
                                        align="center"
                                        className="bg-gray-100 border-b border-r border-gray-200 w-[80px] sticky left-[180px] z-30" 
                                        {sortKey} {sortDirection} 
                                        on:sort={handleSort} 
                                    />

                                    {#each visibleColumns as col, index}
                                        <SortableTh 
                                            key={col.id} 
                                            label={col.label} 
                                            align="right" 
                                            className="min-w-[120px] border-b border-gray-200 whitespace-normal {getHeaderColor(index)}" 
                                            {sortKey} {sortDirection} 
                                            on:sort={handleSort} 
                                        />
                                    {/each}
                                </tr>
                            </thead>
                            
                            <tbody class="divide-y divide-gray-100">
                                {#each sortEmployees(groupedData[deptName], deptName) as item (item.maNV)}
                                    {@const avgScores = deptAverages[deptName]}
                                    {@const score = item.competitions.reduce((acc, c) => (avgScores[c.tenGoc] > 0 && c.giaTri >= avgScores[c.tenGoc]) ? acc + 1 : acc, 0)}
                                    
                                    <tr class="hover:bg-blue-50 transition-colors group">
                                        <td class="px-4 py-2 font-semibold text-blue-700 bg-white group-hover:bg-blue-50 sticky left-0 z-10 border-r border-gray-200 whitespace-nowrap">
                                            {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                                        </td>
                                        <td class="px-2 py-2 text-center font-bold text-green-600 bg-white group-hover:bg-blue-50 sticky left-[180px] z-10 border-r border-gray-200">
                                            {score}
                                        </td>

                                        {#each visibleColumns as col}
                                            {@const comp = item.competitions.find(c => c.tenGoc === col.tenGoc)}
                                            {@const val = comp?.giaTri || 0}
                                            {@const avg = avgScores[col.tenGoc] || 0}
                                            {@const isBelow = avg > 0 && val < avg}
                                            
                                            {@const isRevenue = col.loaiSoLieu && col.loaiSoLieu.includes('DT')}
                                            {@const valueColorClass = isRevenue ? 'text-blue-600' : 'text-gray-900'}
                                            {@const cellClass = isBelow ? 'text-red-600 bg-red-50' : valueColorClass}

                                            <td class="px-2 py-2 text-right border-l border-gray-50 font-bold {cellClass}">
                                                {#if val === 0}
                                                    <span class="text-gray-300 font-normal">-</span>
                                                {:else}
                                                    {formatters.formatNumber(val)}
                                                {/if}
                                            </td>
                                        {/each}
                                    </tr>
                                {/each}
                            </tbody>
                            
                            <tfoot class="bg-gray-100 font-bold text-gray-700 text-xs uppercase sticky bottom-0 z-20 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
                                <tr>
                                    <td class="px-4 py-2 sticky left-0 bg-gray-100 border-r border-gray-300 z-30">Tổng</td>
                                    <td class="px-2 py-2 sticky left-[180px] bg-gray-100 border-r border-gray-300 z-30"></td>
                                    {#each visibleColumns as col}
                                        {@const isRevenue = col.loaiSoLieu && col.loaiSoLieu.includes('DT')}
                                        <td class="px-2 py-2 text-right border-l border-gray-200 {isRevenue ? 'text-blue-800' : 'text-gray-800'}">
                                            {formatters.formatNumber(calculateFooter(groupedData[deptName], 'total')[col.tenGoc])}
                                        </td>
                                    {/each}
                                </tr>
                                <tr class="bg-gray-200">
                                    <td class="px-4 py-2 sticky left-0 bg-gray-200 border-r border-gray-300 z-30">Trung Bình</td>
                                    <td class="px-2 py-2 sticky left-[180px] bg-gray-200 border-r border-gray-300 z-30"></td>
                                    {#each visibleColumns as col}
                                        <td class="px-2 py-2 text-right border-l border-gray-300 text-gray-600">
                                            {formatters.formatNumber(calculateFooter(groupedData[deptName], 'average')[col.tenGoc])}
                                        </td>
                                    {/each}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            {/if}
        {/each}
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .sticky { position: sticky; }
</style>