<script>
  import { createEventDispatcher, afterUpdate } from 'svelte';
  import { 
      competitionNameMappings, 
      competitionData, 
      danhSachNhanVien, 
      selectedWarehouse, 
      luykeNameMappings,
      processedEmployeeCompetitionData 
  } from '../../../stores.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  import { helpers } from '../../../services/processing/helpers.js';
  
  export let reportData = [];
  const dispatch = createEventDispatcher();

  function findSmartMapping(tenGoc, mappings) {
      if (!mappings) return tenGoc;
      if (mappings[tenGoc]) return mappings[tenGoc];
      return tenGoc;
  }

  let currentDay = 1;
  let daysInMonth = 30;

  $: {
      const today = new Date();
      const d = today.getDate();
      if (d === 1) {
          const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          currentDay = lastMonth.getDate();
          daysInMonth = lastMonth.getDate();
      } else {
          currentDay = Math.max(d - 1, 1);
          daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      }
  }

  let columnSettings = [];
  let sortKey = 'totalScore';
  let sortDirection = 'desc';
  let allEmployees = [];
  let targetRatio = 100;

  let isTargetLoaded = false;

  function getCachedPersonalRatio(kho) {
      try {
          const cached = sessionStorage.getItem(`personalTargetRatio_${kho}`);
          if (cached !== null) return Number(cached);
      } catch (e) {}
      return null;
  }

  $: if ($selectedWarehouse !== undefined) {
      const kho = $selectedWarehouse || 'ALL';
      const cachedRatio = getCachedPersonalRatio(kho);
      if (cachedRatio !== null) targetRatio = cachedRatio;
      isTargetLoaded = cachedRatio !== null;
      datasyncService.loadPersonalTargetRatio(kho)
        .then(ratio => {
            targetRatio = ratio;
            isTargetLoaded = true;
            try { sessionStorage.setItem(`personalTargetRatio_${kho}`, String(ratio)); } catch (e) {}
        })
        .catch(() => { if (cachedRatio === null) targetRatio = 100; isTargetLoaded = true; });
  }

  $: emps = $danhSachNhanVien || [];
  $: filteredEmps = $selectedWarehouse && $selectedWarehouse !== 'ALL'
        ? emps.filter(e => String(e.maKho) === String($selectedWarehouse) || String(e.MAKHO) === String($selectedWarehouse))
        : emps;

  // [FIX] Số nhân viên để chia target phải tính RIÊNG theo từng kho (không phải theo bộ lọc
  // đang xem trên màn hình) — dùng để chia target đúng cho kho của từng người, kể cả khi đang
  // xem "ALL"/cả cụm. Luôn tính trên toàn bộ danh sách NV (emps), không dùng filteredEmps.
  $: employeeCountByKho = emps.reduce((acc, e) => {
      const kho = String(e.maKho || e.MAKHO || '').trim();
      if (kho) acc[kho] = (acc[kho] || 0) + 1;
      return acc;
  }, {});

  $: {
      let savedSettings = settingsService.loadPastedCompetitionViewSettings();
      if (!savedSettings || savedSettings.length === 0) savedSettings = settingsService.loadPastedCompetitionViewSettings();
      
      columnSettings = savedSettings.map(col => ({
          ...col, label: findSmartMapping(col.tenGoc, $competitionNameMappings) || col.label || col.tenGoc
      }));
  }

  // [FIX] Target giờ tính RIÊNG cho từng kho (map: mã kho -> {chương trình: target/người}),
  // thay vì 1 object dùng chung cho cả bảng — trước đây khi cụm có nhiều kho, dòng target của
  // kho đọc sau cùng ghi đè dòng trước cùng tên chương trình, khiến mọi nhân viên trong cụm
  // (bất kể kho nào) đều nhận chung 1 con số sai.
  $: categoryTargetsByKho = Object.keys(employeeCountByKho).reduce((acc, kho) => {
      acc[kho] = helpers.computeCategoryTargetsForStore($competitionData, $luykeNameMappings, kho, employeeCountByKho[kho], targetRatio);
      return acc;
  }, {});

  // Target hiển thị ở dòng tổng "TARGET CÁ NHÂN": chỉ có ý nghĩa là 1 con số duy nhất khi đang
  // xem đúng 1 kho cụ thể (mọi nhân viên hiển thị đều cùng kho đó). Khi xem "ALL"/cả cụm, mỗi
  // nhân viên có target riêng theo kho của họ (xem ở từng dòng), nên không hiển thị 1 số chung.
  $: footerCategoryTargets = ($selectedWarehouse && $selectedWarehouse !== 'ALL')
      ? (categoryTargetsByKho[String($selectedWarehouse).trim()] || {})
      : null;

  const headerColors = [
      'bg-red-100 text-red-900 border-red-200', 'bg-orange-100 text-orange-900 border-orange-200',
      'bg-amber-100 text-amber-900 border-amber-200', 'bg-lime-100 text-lime-900 border-lime-200',
      'bg-teal-100 text-teal-900 border-teal-200', 'bg-cyan-100 text-cyan-900 border-cyan-200',
      'bg-sky-100 text-sky-900 border-sky-200', 'bg-indigo-100 text-indigo-900 border-indigo-200',
      'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200', 'bg-rose-100 text-rose-900 border-rose-200'
  ];
  function getHeaderColor(index) { return headerColors[index % headerColors.length]; }

  // [PHẪU THUẬT LOGIC]: Ưu tiên loại SL/DT theo Link Data Nhân Viên admin đã xác nhận thủ công,
  // chỉ dùng cách so khớp tên .endsWith() làm dự phòng khi chương trình chưa được admin link.
  // [FIX] Key theo tên đã chuẩn hoá (xem lý do ở khối tính categoryTargets phía trên).
  $: linkedTypeMap = ($competitionData || []).reduce((acc, item) => {
      const luykeMap = $luykeNameMappings && $luykeNameMappings[item.name];
      const linkedEmpProg = (typeof luykeMap === 'object' && luykeMap !== null) ? luykeMap.linkedEmpProgram : null;
      if (linkedEmpProg) acc[helpers.normalizeCompetitionKey(linkedEmpProg)] = item.type;
      return acc;
  }, {});

  // Hash map xác định kiểu dữ liệu từ gốc (chính xác hơn .loaiSoLieu)
  $: isQuantityMap = (columnSettings || []).reduce((acc, col) => {
      const key = helpers.normalizeCompetitionKey(col.tenGoc);
      if (linkedTypeMap.hasOwnProperty(key)) {
          acc[col.tenGoc] = linkedTypeMap[key] === 'soLuong';
      } else {
          acc[col.tenGoc] = ($competitionData || []).some(c => c.name.endsWith(col.tenGoc) && c.type === 'soLuong');
      }
      return acc;
  }, {});

  function getDynamicMetricValue(comp, colTenGoc, qtyMap) {
      if (!comp) return 0;
      if (comp.giaTri !== undefined) return comp.giaTri;
      // [FIX] Ưu tiên đọc trực tiếp Loại TĐ của chính dòng dữ liệu (file Excel Thi đua NV có
      // cột LOẠI TĐ) thay vì đoán qua liên kết chéo với Thi đua ST — chính xác hơn và không
      // phụ thuộc việc admin đã link đúng chương trình ST↔NV hay chưa. Dữ liệu cũ chưa có
      // Loại TĐ (upload từ trước khi có cột này) vẫn dùng cách đoán cũ làm dự phòng.
      if (comp.loaiTd !== undefined && comp.loaiTd !== null) {
          return helpers.isQuantityCompetitionType(comp.loaiTd) ? (comp.soLuong || 0) : (comp.doanhThu || 0);
      }
      return qtyMap[colTenGoc] ? (comp.soLuong || 0) : (comp.doanhThu || 0);
  }

  // [FIX] Tìm bản ghi thi đua của nhân viên cho 1 cột theo tên đã chuẩn hoá (không phân biệt
  // hoa/thường/dấu) — nếu nhân viên có nhiều bản ghi trùng tên do lệch cách viết hoa/thường,
  // ưu tiên bản ghi có số liệu khác 0.
  function findCompForColumn(competitions, colTenGoc, qtyMap) {
      const key = helpers.normalizeCompetitionKey(colTenGoc);
      const matches = (competitions || []).filter(c => helpers.normalizeCompetitionKey(c.tenGoc) === key);
      if (matches.length <= 1) return matches[0];
      return matches.find(c => getDynamicMetricValue(c, colTenGoc, qtyMap) > 0) || matches[0];
  }

  // Chặn hiển thị nhân viên không có trong DSNV hiện tại
  $: {
      if ($processedEmployeeCompetitionData && $processedEmployeeCompetitionData.length > 0) {
          
          const validEmpCodes = new Set(filteredEmps.map(e => String(e.maNV || e.ma_nv || e.id).trim()));

          let tempEmployees = $processedEmployeeCompetitionData
              .filter(emp => validEmpCodes.has(String(emp.maNV).trim()))
              .map(emp => {
                  let score = 0;
                  emp._staticMetrics = {};

                  // [FIX] Lấy target theo ĐÚNG kho của chính nhân viên này, không phải theo kho
                  // đang chọn trên bộ lọc màn hình.
                  const empKho = String(emp.maKho || emp.MAKHO || '').trim();
                  const empTargets = categoryTargetsByKho[empKho] || {};
                  emp._categoryTargets = empTargets;

                  (columnSettings || []).forEach(col => {
                      const comp = findCompForColumn(emp.competitions, col.tenGoc, isQuantityMap);
                      const val = getDynamicMetricValue(comp, col.tenGoc, isQuantityMap);
                      emp._staticMetrics[col.tenGoc] = val;

                      const pTarget = empTargets[helpers.normalizeCompetitionKey(col.tenGoc)] || 0;
                      const projectedVal = (val / currentDay) * daysInMonth;
                      if ((pTarget > 0 && projectedVal >= pTarget) || (pTarget === 0 && val > 0)) {
                          score++;
                      }
                  });
                  emp._cachedScore = score;

                  const dsnvMatch = filteredEmps.find(e => String(e.maNV || e.ma_nv).trim() === String(emp.maNV).trim());
                  if (dsnvMatch) {
                      emp.hoTen = dsnvMatch.hoTen || dsnvMatch.tenNV || dsnvMatch.ten_nv || emp.hoTen;
                  }

                  return { ...emp };
              });

          allEmployees = tempEmployees;
      } else {
          allEmployees = [];
      }
  }

  $: visibleColumns = columnSettings.filter(col => col.visible);

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
            valA = a._staticMetrics ? (a._staticMetrics[sortCol.tenGoc] || 0) : 0;
            valB = b._staticMetrics ? (b._staticMetrics[sortCol.tenGoc] || 0) : 0;
      } else if (sortKey === 'totalScore') {
            valA = a._cachedScore || 0; 
            valB = b._cachedScore || 0;
      } else {
            valA = a[sortKey] || ''; valB = b[sortKey] || '';
      }

      if ($selectedWarehouse === 'ALL') {
          const khoA = String(a.maKho || '').toUpperCase();
          const khoB = String(b.maKho || '').toUpperCase();
          if (khoA !== khoB) return khoA.localeCompare(khoB);
      }

      if (sortKey.startsWith('comp_') || sortKey === 'totalScore') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
      } else {
          return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      }
  });

  $: processedEmployees = (() => {
      if ($selectedWarehouse === 'ALL') {
          let currentKho = null;
          let currentRank = 0;
          return sortedEmployees.map(emp => {
              if (emp.maKho !== currentKho) {
                  currentKho = emp.maKho;
                  currentRank = 0;
              }
              const result = { ...emp, _displayRank: currentRank };
              currentRank++;
              return result;
          });
      } else {
          return sortedEmployees.map((emp, i) => ({ ...emp, _displayRank: i }));
      }
  })();

  $: topCount = processedEmployees.length <= 15 ? 3 : 5;

  function getRowStyle(rank) {
      if (rank === 0) return 'bg-yellow-50/80 hover:bg-yellow-100';
      if (rank === 1) return 'bg-slate-100 hover:bg-slate-200'; 
      if (rank === 2) return 'bg-orange-50/60 hover:bg-orange-100';
      if (rank < topCount) return 'bg-blue-50/50 hover:bg-blue-100'; 
      return rank % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-slate-50/50 hover:bg-gray-100';
  }

  function getStickyClass(rank) {
      if (rank === 0) return 'bg-yellow-50 group-hover:bg-yellow-100';
      if (rank === 1) return 'bg-slate-100 group-hover:bg-slate-200'; 
      if (rank === 2) return 'bg-orange-50 group-hover:bg-orange-100';
      if (rank < topCount) return 'bg-blue-50 group-hover:bg-blue-100'; 
      return rank % 2 === 0 ? 'bg-white group-hover:bg-gray-50' : 'bg-slate-50 group-hover:bg-gray-100';
  }

  function getRankIcon(rank) {
      if (rank === 0) return '🏆';
      if (rank === 1) return '🥈';
      if (rank === 2) return '🥉';
      if (rank < topCount) return '⭐';
      return `#${rank + 1}`;
  }

  function toggleColumn(col) {
      const newSettings = columnSettings.map(c => c.tenGoc === col.tenGoc ? { ...c, visible: !c.visible } : c);
      columnSettings = newSettings;
      settingsService.savePastedCompetitionViewSettings(newSettings);
  }

  function calculateTotal(col) {
      return allEmployees.reduce((sum, emp) => {
          return sum + (emp._staticMetrics ? (emp._staticMetrics[col.tenGoc] || 0) : 0);
      }, 0);
  }

  function calculateTotalScore() {
      return allEmployees.reduce((total, item) => {
          return total + (item._cachedScore || 0);
      }, 0);
  }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="space-y-4 animate-fade-in">
    {#if reportData.length === 0}
        <div class="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <p class="text-gray-500">Vui lòng tải file "Thi đua nhân viên" ở tab "Cập nhật dữ liệu".</p>
        </div>
    {:else}
        
        <details class="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 capture-hide" style="cursor: pointer;">
            <summary class="text-xs font-bold text-gray-500 uppercase select-none outline-none flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                Cấu hình ẩn / hiện cột dữ liệu báo cáo
            </summary>
            <div class="flex flex-wrap gap-2 mt-2.5" on:click|stopPropagation>
                {#each columnSettings as col}
                    <button 
                        type="button"
                        class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all select-none {col.visible ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}"
                        on:click={() => toggleColumn(col)}
                        title={col.loaiSoLieu}
                    >
                        {col.visible ? '✓ ' : '+ '} {col.label}
                    </button>
                {/each}
            </div>
        </details>

        <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden" data-capture-group="pasted-competition">
            <div class="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-bold text-purple-800 uppercase flex items-center gap-2">
                        <i data-feather="award" class="w-5 h-5"></i> Thi Đua Lũy Kế
                        <span class="text-xs font-semibold text-gray-500 normal-case">({columnSettings.length} chương trình)</span>
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5 ml-7">Theo dõi tiến độ các chương trình thi đua</p>
                </div>
            </div>
            
            <div class="overflow-x-auto sknv-pasted-competition-scroller relative" style="max-height: 700px;">
                <table class="w-full text-sm text-left border-separate border-spacing-0">
                    <thead class="text-xs uppercase font-bold text-gray-700 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th class="bg-gray-100 border-b border-r border-gray-200 w-[50px] min-w-[50px] sticky px-1 py-2 text-center align-middle text-sm z-30" style="left: 0px;">Hạng</th>
                            
                            {#if $selectedWarehouse === 'ALL'}
                                <th class="bg-gray-100 border-b border-r border-gray-200 w-[60px] min-w-[60px] sticky px-1 py-2 text-center align-middle text-sm z-30 font-bold text-purple-700" style="left: 50px;">Kho</th>
                            {/if}
                            
                            <th class="bg-gray-100 border-b border-r border-gray-200 min-w-[150px] w-[150px] sticky z-30 px-2 py-2 cursor-pointer hover:bg-gray-200 transition select-none align-middle text-sm" style="left: {$selectedWarehouse === 'ALL' ? '110px' : '50px'};" on:click={() => handleSort('hoTen')}>Nhân viên</th>
                            <th class="bg-gray-100 border-b border-r border-gray-200 w-[100px] min-w-[100px] sticky z-30 px-1 py-2 text-center cursor-pointer hover:bg-gray-200 transition select-none align-middle" style="left: {$selectedWarehouse === 'ALL' ? '260px' : '200px'};" on:click={() => handleSort('totalScore')}>Đạt</th>
                            
                            {#each visibleColumns as col, index}
                                <th class="px-1 py-1 w-auto min-w-[60px] max-w-[90px] whitespace-normal break-words border-b border-r border-gray-200 {getHeaderColor(index)} align-middle cursor-pointer hover:opacity-80 transition select-none" on:click={() => handleSort(col.id)} title="{col.label} (Bấm để sắp xếp)">
                                    <div class="text-[10px] font-bold leading-3 text-center whitespace-normal break-words min-h-[32px] flex items-center justify-center">
                                        {col.label}
                                    </div>
                                </th>
                            {/each}
                        </tr>
                    </thead>
                    
                    <tbody class="divide-y divide-gray-100">
                        {#each processedEmployees as item, loopIndex (item.maNV + '_' + (item.maKho || '') + '_' + loopIndex)}
                            
                            <tr class="transition-colors group cursor-pointer {getRowStyle(item._displayRank)}" on:click={() => dispatch('viewDetail', { employeeId: item.maNV })}>
                                <td class="px-1 py-1.5 text-center font-bold border-r border-gray-200 z-10 sticky transition-colors {getStickyClass(item._displayRank)} {item._displayRank <= 2 ? 'text-lg' : 'text-sm text-slate-400'}" style="left: 0px;">
                                    {getRankIcon(item._displayRank)}
                                </td>
                                
                                {#if $selectedWarehouse === 'ALL'}
                                    <td class="px-1 py-1.5 text-center font-bold border-r border-purple-200 text-purple-700 z-10 sticky text-[12px] uppercase transition-colors {getStickyClass(item._displayRank)}" style="left: 50px;">
                                        {item.maKho}
                                    </td>
                                {/if}
                                
                                <td class="px-2 py-1.5 font-semibold text-blue-700 sticky z-10 border-r border-gray-200 whitespace-nowrap text-[13px] truncate max-w-[150px] transition-colors {getStickyClass(item._displayRank)}" style="left: {$selectedWarehouse === 'ALL' ? '110px' : '50px'};" title="{item.hoTen} - {item.maNV}">
                                    {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                                </td>
                                
                                <td class="px-1 py-1.5 w-[100px] min-w-[100px] text-center font-bold text-green-600 border-r border-gray-200 text-[14px] sticky z-10 transition-colors {getStickyClass(item._displayRank)}" style="left: {$selectedWarehouse === 'ALL' ? '260px' : '200px'};">
                                    {item._cachedScore || 0}
                                </td>

                                {#each visibleColumns as col}
                                    {@const val = item._staticMetrics ? (item._staticMetrics[col.tenGoc] || 0) : 0}
                                    {@const pTarget = item._categoryTargets ? (item._categoryTargets[helpers.normalizeCompetitionKey(col.tenGoc)] || 0) : 0}
                                    {@const projectedVal = (val / currentDay) * daysInMonth}
                                    {@const isBelow = pTarget > 0 && projectedVal < pTarget}
                                    
                                    <!-- [PHẪU THUẬT LOGIC]: Tận dụng trực tiếp isQuantityMap làm Source of Truth thay vì col.loaiSoLieu -->
                                    {@const isRevenue = !isQuantityMap[col.tenGoc]}
                                    {@const textColorClass = isBelow ? 'text-red-600' : (isRevenue ? 'text-blue-700' : 'text-gray-900')}

                                    <td class="px-1 py-1.5 text-right border-r border-gray-100 font-bold text-[13px] {isBelow ? 'bg-red-100' : ''} {textColorClass} whitespace-nowrap overflow-hidden">
                                        {#if val === 0}
                                            <span class="text-gray-300 font-normal">0</span>
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
                            <td colspan={$selectedWarehouse === 'ALL' ? 3 : 2} class="px-2 py-2 sticky bg-indigo-100 border-r border-indigo-200 z-30 text-center text-[13px]" style="left: 0px;">
                                TARGET CÁ NHÂN
                            </td>
                            <td class="px-2 py-2 border-r border-indigo-200 bg-indigo-100 sticky z-30 text-center text-[13px] font-bold text-indigo-700" style="left: {$selectedWarehouse === 'ALL' ? '260px' : '200px'};">
                                -
                            </td>
                            {#each visibleColumns as col}
                                {@const pTarget = footerCategoryTargets ? (footerCategoryTargets[helpers.normalizeCompetitionKey(col.tenGoc)] || 0) : null}
                                <td class="px-1 py-2 text-right border-r border-indigo-200 text-[13px] bg-indigo-50 text-indigo-700" title={footerCategoryTargets === null ? 'Đang xem nhiều kho — mỗi nhân viên có target riêng theo kho, xem ở từng dòng' : ''}>
                                    {pTarget === null ? '-' : (pTarget > 0 ? formatters.formatNumber(pTarget) : '0')}
                                </td>
                            {/each}
                        </tr>

                        <tr class="bg-yellow-50 text-yellow-800 font-semibold border-t border-gray-300">
                            <td colspan={$selectedWarehouse === 'ALL' ? 3 : 2} class="px-2 py-2 sticky bg-yellow-100 border-r border-gray-300 z-30 text-center text-[13px]" style="left: 0px;">
                                TRUNG BÌNH
                            </td>
                            <td class="px-2 py-2 border-r border-gray-300 bg-yellow-100 sticky z-30 text-center text-[13px] font-bold text-green-700" style="left: {$selectedWarehouse === 'ALL' ? '260px' : '200px'};">
                                {allEmployees.length > 0 ? formatters.formatNumber(calculateTotalScore() / allEmployees.length, 1) : 0}
                            </td>
                            {#each visibleColumns as col}
                                <td class="px-1 py-2 text-right border-r border-gray-300 text-[13px] bg-yellow-50">
                                    {allEmployees.length > 0 ? formatters.formatNumber(calculateTotal(col) / allEmployees.length, 0) : 0}
                                </td>
                            {/each}
                        </tr>

                        <tr class="bg-gray-200 text-gray-900 font-bold border-t border-gray-300">
                            <td colspan={$selectedWarehouse === 'ALL' ? 3 : 2} class="px-2 py-2 sticky bg-gray-300 border-r border-gray-300 z-30 text-center text-[13px]" style="left: 0px;">
                                TỔNG
                            </td>
                            <td class="px-2 py-2 border-r border-gray-300 bg-gray-300 sticky z-30 text-center text-[13px]" style="left: {$selectedWarehouse === 'ALL' ? '260px' : '200px'};">
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
    details > summary::-webkit-details-marker { display: none; }
</style>