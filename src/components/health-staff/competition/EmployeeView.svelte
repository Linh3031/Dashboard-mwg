<script>
  import { createEventDispatcher, afterUpdate } from 'svelte';
  import { pastedThiDuaReportData, competitionNameMappings, ycxData, competitionData, danhSachNhanVien, selectedWarehouse, luykeNameMappings } from '../../../stores.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  
  export let reportData = [];
  const dispatch = createEventDispatcher();

  // --- HÀM TÌM MAPPING TÊN CỘT THEO ADMIN ---
  function findSmartMapping(tenGoc, mappings) {
      if (!mappings) return tenGoc;
      if (mappings[tenGoc]) return mappings[tenGoc];
      return tenGoc;
  }

  // --- THỜI GIAN ĐỂ TÍNH TIẾN ĐỘ DỰ KIẾN ---
  // Sử dụng Math.max(..., 1) để tránh lỗi chia cho 0 vào ngày mùng 1 đầu tháng
  $: today = new Date();
  $: currentDay = Math.max(today.getDate() - 1, 1);
  $: daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // --- STATE ---
  let columnSettings = [];
  let sortKey = 'totalScore';
  let sortDirection = 'desc';

  let allEmployees = [];
  
  // --- KHỐI LOGIC: TARGET CÁ NHÂN (LINKED MAPPING) ---
  let targetRatio = 100;
  let categoryTargets = {};
  
  // 1. Lấy tỷ lệ % giao target từ Firebase
  $: if ($selectedWarehouse) {
      datasyncService.loadPersonalTargetRatio($selectedWarehouse)
        .then(ratio => targetRatio = ratio)
        .catch(() => targetRatio = 100);
  }

  // 2. Tính tổng nhân viên hiện tại của Siêu Thị
  $: emps = $danhSachNhanVien || [];
  $: filteredEmps = $selectedWarehouse ? emps.filter(e => String(e.maKho) === String($selectedWarehouse) || String(e.MAKHO) === String($selectedWarehouse)) : emps;
  $: totalEmployees = filteredEmps.length > 0 ? filteredEmps.length : 1;

  // 3. Tra cứu Target qua 'linkedEmpProgram'
  $: {
      const stMappedData = {};
      ($competitionData || []).forEach(item => {
          const luykeMap = $luykeNameMappings && $luykeNameMappings[item.name];
          
          let linkedEmpProg = '';
          if (typeof luykeMap === 'object' && luykeMap !== null) {
              linkedEmpProg = luykeMap.linkedEmpProgram;
          }
          
          if (linkedEmpProg) {
              const rawTarget = (parseFloat(item.target) || 0) * (targetRatio / 100);
              const isQty = item.type === 'soLuong';
              const pTarget = totalEmployees > 0 ? (isQty ? Math.ceil(rawTarget / totalEmployees) : Math.round(rawTarget / totalEmployees)) : 0;
              
              stMappedData[linkedEmpProg] = pTarget;
          }
      });

      const newTargets = {};
      (columnSettings || []).forEach(col => {
          newTargets[col.tenGoc] = stMappedData[col.tenGoc] || 0;
      });
      categoryTargets = newTargets;
  }

  const headerColors = [
      'bg-red-100 text-red-900 border-red-200', 'bg-orange-100 text-orange-900 border-orange-200',
      'bg-amber-100 text-amber-900 border-amber-200', 'bg-lime-100 text-lime-900 border-lime-200',
      'bg-teal-100 text-teal-900 border-teal-200', 'bg-cyan-100 text-cyan-900 border-cyan-200',
      'bg-sky-100 text-sky-900 border-sky-200', 'bg-indigo-100 text-indigo-900 border-indigo-200',
      'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200', 'bg-rose-100 text-rose-900 border-rose-200'
  ];
  function getHeaderColor(index) {
      return headerColors[index % headerColors.length];
  }

  // --- REACTIVE PROCESSING ---
  $: {
      if (reportData && reportData.length > 0) {
          const infoMap = {};
          if ($ycxData && $ycxData.length) {
              $ycxData.forEach(nv => {
                  const code = String(nv.ma_nv || nv.maNV || '').trim();
                  const name = nv.ten_nv || nv.hoTen || '';
                  const dept = nv.ma_kho || nv.boPhan || nv.vi_tri || '';
                  if (code) infoMap[code] = { name, dept };
                  if (nv.nguoiTao) {
                      const msnvMatch = String(nv.nguoiTao).match(/(\d+)/);
                      if (msnvMatch) {
                          const extractedCode = msnvMatch[1].trim();
                          if (!infoMap[extractedCode]) infoMap[extractedCode] = { name: nv.hoTen || nv.nguoiTao, dept: dept };
                      }
                  }
              });
          }

          const mappedReportData = reportData.map(item => {
             let rawCode = item.maNV;
             if (!rawCode && item.name && /^\d+$/.test(item.name)) rawCode = item.name;
             const lookupCode = String(rawCode || '').trim();
             const info = infoMap[lookupCode];
   
             let realName = item.hoTen || item.name;
             let realDept = item.boPhan;

             if (info) {
                 if (info.name) realName = info.name;
                 if (!realDept || realDept === 'Chưa phân loại' || realDept === lookupCode) realDept = info.dept;
             }
             if (realName && realName.includes('-')) {
                  const parts = realName.split('-');
                  if (parts.length > 1 && /\d/.test(parts[parts.length-1])) realName = parts[0].trim();
             }
             return { ...item, maNV: rawCode || item.maNV, hoTen: realName, boPhan: realDept || 'Chưa phân loại' };
          });

          let savedSettings = settingsService.loadPastedCompetitionViewSettings();
          if (!savedSettings || savedSettings.length === 0) savedSettings = settingsService.loadPastedCompetitionViewSettings();
          
          columnSettings = savedSettings.map(col => ({
              ...col, label: findSmartMapping(col.tenGoc, $competitionNameMappings) || col.label || col.tenGoc
          }));

          allEmployees = [...mappedReportData];
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
                let score = 0;
                emp.competitions.forEach(comp => {
                    const val = comp.giaTri || 0;
                    const pTarget = categoryTargets[comp.tenGoc] || 0;
                    
                    // --- ÁP DỤNG SỐ DỰ KIẾN VÀO BẢNG CHÂN LÝ ---
                    const projectedVal = (val / currentDay) * daysInMonth;
                    
                    if ((pTarget > 0 && projectedVal >= pTarget) || (pTarget === 0 && val > 0)) {
                        score++;
                    }
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

  $: topCount = sortedEmployees.length <= 15 ? 3 : 5;
  function getRowStyle(index) {
      if (index === 0) return 'bg-yellow-50/80 hover:bg-yellow-100';
      if (index === 1) return 'bg-slate-100 hover:bg-slate-200'; 
      if (index === 2) return 'bg-orange-50/60 hover:bg-orange-100';
      if (index < topCount) return 'bg-blue-50/50 hover:bg-blue-100'; 
      return index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-slate-50/50 hover:bg-gray-100';
  }

  function getStickyClass(index) {
      if (index === 0) return 'bg-yellow-50 group-hover:bg-yellow-100';
      if (index === 1) return 'bg-slate-100 group-hover:bg-slate-200'; 
      if (index === 2) return 'bg-orange-50 group-hover:bg-orange-100';
      if (index < topCount) return 'bg-blue-50 group-hover:bg-blue-100'; 
      return index % 2 === 0 ? 'bg-white group-hover:bg-gray-50' : 'bg-slate-50 group-hover:bg-gray-100';
  }

  function getRankIcon(index) {
      if (index === 0) return '🏆';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      if (index < topCount) return '⭐';
      return `#${index + 1}`;
  }

  function toggleColumn(col) {
      const newSettings = columnSettings.map(c => c.tenGoc === col.tenGoc ? { ...c, visible: !c.visible } : c);
      columnSettings = newSettings;
      settingsService.savePastedCompetitionViewSettings(newSettings);
  }

  function calculateTotal(col) {
      return allEmployees.reduce((sum, emp) => {
          const comp = emp.competitions.find(c => c.tenGoc === col.tenGoc);
          return sum + (comp?.giaTri || 0);
      }, 0);
  }

  function calculateTotalScore() {
      return allEmployees.reduce((total, item) => {
          const score = item.competitions.reduce((acc, c) => {
              const val = c.giaTri || 0;
              const pTarget = categoryTargets[c.tenGoc] || 0;
              const projectedVal = (val / currentDay) * daysInMonth;
              
              return ((pTarget > 0 && projectedVal >= pTarget) || (pTarget === 0 && val > 0)) ? acc + 1 : acc;
          }, 0);
          return total + score;
      }, 0);
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
            </div>
            
            <div class="overflow-x-auto sknv-pasted-competition-scroller relative" style="max-height: 700px;">
                <table class="w-full text-sm text-left border-separate border-spacing-0">
                    <thead class="text-xs uppercase font-bold text-gray-700 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th class="bg-gray-100 border-b border-r border-gray-200 w-[50px] min-w-[50px] sticky left-0 z-30 px-1 py-2 text-center align-middle text-sm">Hạng</th>
                            <th class="bg-gray-100 border-b border-r border-gray-200 min-w-[150px] w-[150px] sticky left-[50px] z-30 px-2 py-2 cursor-pointer hover:bg-gray-200 transition select-none align-middle text-sm" on:click={() => handleSort('hoTen')}>Nhân viên</th>
                            <th class="bg-gray-100 border-b border-r border-gray-200 w-[100px] min-w-[100px] sticky left-[200px] z-30 px-1 py-2 text-center cursor-pointer hover:bg-gray-200 transition select-none align-middle" on:click={() => handleSort('totalScore')}>Đạt</th>
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
                        {#each sortedEmployees as item, index (item.maNV)}
                            {@const score = item.competitions.reduce((acc, c) => {
                                const val = c.giaTri || 0;
                                const pTarget = categoryTargets[c.tenGoc] || 0;
                                const projectedVal = (val / currentDay) * daysInMonth;
                                return ((pTarget > 0 && projectedVal >= pTarget) || (pTarget === 0 && val > 0)) ? acc + 1 : acc;
                            }, 0)}
                            
                            <tr 
                                class="transition-colors group cursor-pointer {getRowStyle(index)}"
                                on:click={() => dispatch('viewDetail', { employeeId: item.maNV })}
                            >
                                <td class="px-1 py-1.5 text-center font-bold border-r border-gray-200 z-10 sticky left-0 transition-colors {getStickyClass(index)} {index <= 2 ? 'text-lg' : 'text-sm text-slate-400'}">
                                    {getRankIcon(index)}
                                </td>
                                <td class="px-2 py-1.5 font-semibold text-blue-700 sticky left-[50px] z-10 border-r border-gray-200 whitespace-nowrap text-[13px] truncate max-w-[150px] transition-colors {getStickyClass(index)}" title="{item.hoTen} - {item.maNV}">
                                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                                </td>
                                <td class="px-1 py-1.5 w-[100px] min-w-[100px] text-center font-bold text-green-600 border-r border-gray-200 text-[14px] sticky left-[200px] z-10 transition-colors {getStickyClass(index)}">
                                    {score}
                                </td>

                                {#each visibleColumns as col}
                                    {@const comp = item.competitions.find(c => c.tenGoc === col.tenGoc)}
                                    {@const val = comp?.giaTri || 0}
                                    {@const pTarget = categoryTargets[col.tenGoc] || 0}
                                    {@const projectedVal = (val / currentDay) * daysInMonth}
                                    
                                    {@const isBelow = pTarget > 0 && projectedVal < pTarget}
                                    {@const isNoTarget = pTarget === 0 && val === 0}
                                    {@const isRevenue = col.loaiSoLieu && col.loaiSoLieu.includes('DT')}
                                    {@const textColorClass = isBelow ? 'text-yellow-900' : (isRevenue ? 'text-blue-700' : 'text-gray-900')}

<td class="px-1 py-1.5 text-right border-r border-gray-100 font-bold text-[13px] {isBelow ? 'bg-red-100' : ''} {textColorClass} whitespace-nowrap overflow-hidden" title={isNoTarget ? "Chưa có target cá nhân" : `Dự kiến: ${formatters.formatNumber(projectedVal)}`}>
                                    
                                        {#if val === 0}
                                            <span class="text-gray-300 font-normal">{isNoTarget ? '0' : '-'}</span>
                                        {:else}
                                            {formatters.formatNumber(val)}
                                        {/if}
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                    
                    <tfoot class="text-xs uppercase sticky bottom-0 z-20 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
                        <tr class="bg-indigo-50 text-indigo-800 font-semibold border-t-2 border-indigo-300">
                            <td colspan="2" class="px-2 py-2 sticky left-0 bg-indigo-100 border-r border-indigo-200 z-30 text-center text-[13px]">
                                TARGET CÁ NHÂN
                            </td>
                            <td class="px-2 py-2 border-r border-indigo-200 bg-indigo-100 sticky left-[200px] z-30 text-center text-[13px] font-bold text-indigo-700">
                                -
                            </td>
                            {#each visibleColumns as col}
                                {@const pTarget = categoryTargets[col.tenGoc] || 0}
                                <td class="px-1 py-2 text-right border-r border-indigo-200 text-[13px] bg-indigo-50 text-indigo-700" title={pTarget === 0 ? "Chưa link dữ liệu hoặc Target bằng 0" : ""}>
                                    {pTarget > 0 ? formatters.formatNumber(pTarget) : '0'}
                                </td>
                            {/each}
                        </tr>

                        <tr class="bg-yellow-50 text-yellow-800 font-semibold border-t border-gray-300">
                            <td colspan="2" class="px-2 py-2 sticky left-0 bg-yellow-100 border-r border-gray-300 z-30 text-center text-[13px]">
                                TRUNG BÌNH
                            </td>
                            <td class="px-2 py-2 border-r border-gray-300 bg-yellow-100 sticky left-[200px] z-30 text-center text-[13px] font-bold text-green-700">
                                {allEmployees.length > 0 ? formatters.formatNumber(calculateTotalScore() / allEmployees.length, 1) : 0}
                            </td>
                            {#each visibleColumns as col}
                                <td class="px-1 py-2 text-right border-r border-gray-300 text-[13px] bg-yellow-50">
                                    {allEmployees.length > 0 ? formatters.formatNumber(calculateTotal(col) / allEmployees.length, 0) : 0}
                                </td>
                            {/each}
                        </tr>

                        <tr class="bg-gray-200 text-gray-900 font-bold border-t border-gray-300">
                            <td colspan="2" class="px-2 py-2 sticky left-0 bg-gray-300 border-r border-gray-300 z-30 text-center text-[13px]">
                                TỔNG
                            </td>
                            <td class="px-2 py-2 border-r border-gray-300 bg-gray-300 sticky left-[200px] z-30 text-center text-[13px]">
                                {calculateTotalScore()}
                            </td>
                            {#each visibleColumns as col}
                                <td class="px-1 py-2 text-right border-r border-gray-300 text-[13px] bg-gray-200">
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
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>