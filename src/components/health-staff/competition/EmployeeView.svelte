<script>
  import { createEventDispatcher, afterUpdate } from 'svelte';
  import { pastedThiDuaReportData, competitionNameMappings } from '../../../stores.js'; 
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  
  export let reportData = []; 
  const dispatch = createEventDispatcher();

  // --- STATE ---
  let columnSettings = [];
  let sortKey = 'hoTen';
  let sortDirection = 'asc';
  
  // Dữ liệu phẳng
  let allEmployees = [];
  let deptAverages = {}; 

  // Palette màu cho header
  const headerColors = [
      'bg-red-100 text-red-900 border-red-200',
      'bg-orange-100 text-orange-900 border-orange-200',
      'bg-amber-100 text-amber-900 border-amber-200',
      'bg-lime-100 text-lime-900 border-lime-200',
      'bg-teal-100 text-teal-900 border-teal-200',
      'bg-cyan-100 text-cyan-900 border-cyan-200',
      'bg-sky-100 text-sky-900 border-sky-200',
      'bg-indigo-100 text-indigo-900 border-indigo-200',
      'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
      'bg-rose-100 text-rose-900 border-rose-200'
  ];

  function getHeaderColor(index) {
      return headerColors[index % headerColors.length];
  }

  // --- REACTIVE PROCESSING ---
  $: {
      if (reportData && reportData.length > 0) {
          const savedSettings = settingsService.loadPastedCompetitionViewSettings();
          if (savedSettings.length > 0) {
              columnSettings = savedSettings;
          } else {
              columnSettings = settingsService.loadPastedCompetitionViewSettings();
          }

          // Map tên hiển thị
          columnSettings = columnSettings.map(col => ({
              ...col,
              label: $competitionNameMappings[col.tenGoc] || col.label || col.tenGoc
          }));

          const groups = {};
          reportData.forEach(item => {
              const dept = item.boPhan || 'Chưa phân loại';
              if (!groups[dept]) groups[dept] = [];
              groups[dept].push(item);
          });

          const avgs = {};
          Object.keys(groups).forEach(deptName => {
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

          allEmployees = [...reportData];
      } else {
          allEmployees = [];
      }
  }

  $: visibleColumns = columnSettings.filter(col => col.visible);

  // --- SORT LOGIC ---
  function handleSort(key) {
      if (sortKey === key) {
          sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      } else {
          sortKey = key;
          sortDirection = key.startsWith('comp_') || key === 'totalScore' ? 'desc' : 'asc';
      }
  }

  $: sortedEmployees = [...allEmployees].sort((a, b) => {
      let valA, valB;
      
      if (sortKey.startsWith('comp_')) {
            const sortCol = columnSettings.find(c => c.id === sortKey);
            if (!sortCol) return 0;
            valA = a.competitions.find(c => c.tenGoc === sortCol.tenGoc)?.giaTri || 0;
            valB = b.competitions.find(c => c.tenGoc === sortCol.tenGoc)?.giaTri || 0;
            return sortDirection === 'asc' ? valA - valB : valB - valA;

      } else if (sortKey === 'totalScore') {
            const getScore = (emp) => {
                const deptAvg = deptAverages[emp.boPhan] || {};
                let score = 0;
                emp.competitions.forEach(comp => {
                    if (deptAvg[comp.tenGoc] > 0 && comp.giaTri >= deptAvg[comp.tenGoc]) score++;
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

  // --- TOGGLE LOGIC ---
  function toggleColumn(col) {
      const newSettings = columnSettings.map(c => 
          c.tenGoc === col.tenGoc ? { ...c, visible: !c.visible } : c
      );
      columnSettings = newSettings;
      settingsService.savePastedCompetitionViewSettings(newSettings);
  }

  // --- FOOTER CALCULATION ---
  function calculateTotal(col) {
      return allEmployees.reduce((sum, emp) => {
          const comp = emp.competitions.find(c => c.tenGoc === col.tenGoc);
          return sum + (comp?.giaTri || 0);
      }, 0);
  }

  function calculateTotalScore() {
      return allEmployees.reduce((total, item) => {
          const avgScores = deptAverages[item.boPhan] || {};
          const score = item.competitions.reduce((acc, c) => (avgScores[c.tenGoc] > 0 && c.giaTri >= avgScores[c.tenGoc]) ? acc + 1 : acc, 0);
          return total + score;
      }, 0);
  }

  // --- VIEW SWITCHING ---
  function switchToProgram() {
      dispatch('viewChange', 'program');
  }

  afterUpdate(() => {
    if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="space-y-4 animate-fade-in">
    {#if reportData.length === 0}
        <div class="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <p class="text-gray-500">Vui lòng dán dữ liệu "Thi đua nhân viên" ở tab "Cập nhật dữ liệu".</p>
        </div>
    {:else}
        
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p class="text-xs font-bold text-gray-500 uppercase mb-2">Hiển thị cột:</p>
            <div class="flex flex-wrap gap-2">
                {#each columnSettings as col}
                    <button 
                        type="button"
                        class="px-3 py-1 rounded-full text-xs font-medium border transition-all select-none
                                {col.visible ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}"
                        on:click={() => toggleColumn(col)}
                        title={col.loaiSoLieu}
                    >
                        {col.label}
                    </button>
                {/each}
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden" data-capture-group="pasted-competition">
            
            <div class="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-bold text-purple-800 uppercase flex items-center gap-2">
                        <i data-feather="award" class="w-5 h-5"></i>
                        Thi Đua Lũy Kế
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5 ml-7">Theo dõi tiến độ các chương trình thi đua</p>
                </div>

                <div class="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                    <button 
                        type="button"
                        class="px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm bg-white text-blue-700 cursor-default"
                    >
                        Nhân viên
                    </button>
                    <button 
                        type="button"
                        class="px-4 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
                        on:click={switchToProgram}
                    >
                        Chương trình
                    </button>
                </div>
            </div>
            
            <div class="overflow-x-auto sknv-pasted-competition-scroller relative" style="max-height: 700px;">
                <table class="w-full text-sm text-left border-separate border-spacing-0">
                    <thead class="text-xs uppercase font-bold text-gray-700 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th class="bg-gray-100 border-b border-r border-gray-200 min-w-[150px] w-[150px] sticky left-0 z-30 px-2 py-2 cursor-pointer hover:bg-gray-200 transition select-none align-middle text-sm" on:click={() => handleSort('hoTen')}>
                                Nhân viên
                            </th>
                            
                            <th class="bg-gray-100 border-b border-r border-gray-200 w-[100px] min-w-[100px] sticky left-[150px] z-30 px-1 py-2 text-center cursor-pointer hover:bg-gray-200 transition select-none align-middle" on:click={() => handleSort('totalScore')}>
                                Đạt
                            </th>

                            {#each visibleColumns as col, index}
                                <th 
                                    class="px-1 py-1 w-auto min-w-[60px] max-w-[90px] whitespace-normal break-words border-b border-r border-gray-200 {getHeaderColor(index)} align-middle cursor-pointer hover:opacity-80 transition select-none"
                                    on:click={() => handleSort(col.id)}
                                    title="{col.label} (Bấm để sắp xếp)"
                                >
                                    <div class="text-[10px] font-bold leading-3 text-center whitespace-normal break-words min-h-[32px] flex items-center justify-center">
                                        {col.label}
                                    </div>
                                </th>
                            {/each}
                        </tr>
                    </thead>
                    
                    <tbody class="divide-y divide-gray-100">
                        {#each sortedEmployees as item (item.maNV)}
                            {@const avgScores = deptAverages[item.boPhan] || {}}
                            {@const score = item.competitions.reduce((acc, c) => (avgScores[c.tenGoc] > 0 && c.giaTri >= avgScores[c.tenGoc]) ? acc + 1 : acc, 0)}
                            
                            <tr class="hover:bg-blue-50 transition-colors group">
                                <td class="px-2 py-1.5 font-semibold text-blue-700 bg-white group-hover:bg-blue-50 sticky left-0 z-10 border-r border-gray-200 whitespace-nowrap text-[13px] truncate max-w-[150px]" title="{item.hoTen} - {item.maNV}">
                                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                                </td>
                                
                                <td class="px-1 py-1.5 w-[100px] min-w-[100px] text-center font-bold text-green-600 bg-white group-hover:bg-blue-50 border-r border-gray-200 text-[14px] sticky left-[150px] z-10">
                                    {score}
                                </td>

                                {#each visibleColumns as col}
                                    {@const comp = item.competitions.find(c => c.tenGoc === col.tenGoc)}
                                    {@const val = comp?.giaTri || 0}
                                    {@const avg = avgScores[col.tenGoc] || 0}
                                    {@const isBelow = avg > 0 && val < avg}
                                    {@const isRevenue = col.loaiSoLieu && col.loaiSoLieu.includes('DT')}
                                    {@const textColorClass = isRevenue ? 'text-blue-700' : 'text-gray-900'}
                                    
                                    <td class="px-1 py-1.5 text-right border-r border-gray-100 font-bold text-[13px] {isBelow ? 'bg-red-50' : ''} {textColorClass} whitespace-nowrap overflow-hidden">
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
                    
                    <tfoot class="text-xs uppercase sticky bottom-0 z-20 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
                        <tr class="bg-yellow-50 text-yellow-800 font-semibold border-t-2 border-gray-300">
                            <td class="px-2 py-2 sticky left-0 bg-yellow-100 border-r border-gray-300 z-30 text-center text-[13px]">
                                TRUNG BÌNH
                            </td>
                            <td class="px-2 py-2 border-r border-gray-300 bg-yellow-100 sticky left-[150px] z-30 text-center text-[13px] font-bold text-green-700">
                                {allEmployees.length > 0 ? formatters.formatNumber(calculateTotalScore() / allEmployees.length, 1) : 0}
                            </td>
                            {#each visibleColumns as col}
                                <td class="px-1 py-2 text-right border-r border-gray-300 text-[13px]">
                                    {allEmployees.length > 0 ? formatters.formatNumber(calculateTotal(col) / allEmployees.length, 0) : 0}
                                </td>
                            {/each}
                        </tr>

                        <tr class="bg-gray-200 text-gray-900 font-bold border-t border-gray-300">
                            <td class="px-2 py-2 sticky left-0 bg-gray-300 border-r border-gray-300 z-30 text-center text-[13px]">
                                TỔNG
                            </td>
                            <td class="px-2 py-2 border-r border-gray-300 bg-gray-300 sticky left-[150px] z-30 text-center text-[13px]">
                                {calculateTotalScore()}
                            </td>
                            {#each visibleColumns as col}
                                <td class="px-1 py-2 text-right border-r border-gray-300 text-[13px]">
                                    {formatters.formatNumber(calculateTotal(col))}
                                </td>
                            {/each}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .sticky { position: sticky; }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

    table { border-spacing: 0; }
    /* CSS cho Line Clamp 2 dòng */
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>