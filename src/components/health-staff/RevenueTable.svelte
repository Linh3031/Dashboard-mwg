<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { kpiStore, ycxDataThangTruoc } from '../../stores.js';
  import { batchCaptureService } from '../../services/batchCapture.service.js';
  import RevenueDetailView from './revenue/RevenueDetailView.svelte';
  import { dataProcessing } from '../../services/dataProcessing.js';

  // Import Sub-Components
  import ColumnConfig from './revenue/table/ColumnConfig.svelte';
  import TableToolbar from './revenue/table/TableToolbar.svelte';
  import TableHeader from './revenue/table/TableHeader.svelte';
  import TableRow from './revenue/table/TableRow.svelte';
  import TableFooter from './revenue/table/TableFooter.svelte';
  
  export let reportData = [];
  const dispatch = createEventDispatcher();

  // --- THỜI GIAN ĐỂ TÍNH DỰ KIẾN ---
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

  // --- TỔNG HỢP DATA CÙNG KỲ (LỌC THEO THÁNG LIỀN KỀ) ---
  $: lastMonthDataMap = (() => {
      const map = {};
      const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
      const today = new Date();
      const d = today.getDate();
      const activeMonthDate = d === 1 ? new Date(today.getFullYear(), today.getMonth() - 1, 1) : today;
      const targetDate = new Date(activeMonthDate.getFullYear(), activeMonthDate.getMonth() - 1, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      ($ycxDataThangTruoc || []).forEach(row => {
          if (!row.ngayTao || !(row.ngayTao instanceof Date)) return;
          if (row.ngayTao.getMonth() !== targetMonth || row.ngayTao.getFullYear() !== targetYear) return;

          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          if (!msnvMatch) return;
          const maNV = msnvMatch[1].trim();
          const hinhThucXuat = row.hinhThucXuat;
          const trangThaiXuat = (row.trangThaiXuat || '').trim();
          const isBaseValid = (row.trangThaiThuTien || '').trim() === 'Đã thu' &&
                              (row.trangThaiHuy || '').trim() === 'Chưa hủy' &&
                              (row.tinhTrangTra || '').trim() === 'Chưa trả';
          const isDaXuat = !trangThaiXuat || trangThaiXuat === 'Đã xuất' || trangThaiXuat === 'Đã giao';

          if (dataProcessing.getHinhThucXuatTinhDoanhThu().has(hinhThucXuat) && isDaXuat && isBaseValid) {
              map[maNV] = (map[maNV] || 0) + (row.revenueQuyDoi || 0);
          }
      });
      return map;
  })();

  // --- MERGE VÀ TÍNH TOÁN DỰ KIẾN SO CK + DT/GC ---
  $: enrichedReportData = reportData.map(item => {
      const dtqd = item.doanhThuQuyDoi || 0;
      const dtqdCK = lastMonthDataMap[item.maNV] || 0;
      const projectedDTQD = (dtqd / currentDay) * daysInMonth;
      const duKienSoCK = projectedDTQD - dtqdCK;
      const dtTrenGc = item.gioCong > 0 ? (dtqd / item.gioCong) : 0;
      return { ...item, dtqdCK, duKienSoCK, dtTrenGc };
  });

  // --- QUẢN LÝ CẤU TRÚC CỘT DYNAMIC ---
  let columnSettings = [
      { key: 'doanhThu', label: 'DT Thực', group: 'dt', visible: true },
      { key: 'doanhThuQuyDoi', label: 'DT Quy Đổi', group: 'dt', visible: true },
      { key: 'hieuQuaQuyDoi', label: '% QĐ', group: 'dt', visible: true },
      { key: 'dtqdCK', label: 'DTQĐ Cùng Kỳ', group: 'ck', visible: true },
      { key: 'duKienSoCK', label: 'Dự Kiến So CK', group: 'ck', visible: true },
      { key: 'doanhThuTraGop', label: 'DT Trả Chậm', group: 'tc', visible: true },
      { key: 'tyLeTraCham', label: '% Trả Chậm', group: 'tc', visible: true },
      { key: 'doanhThuQuyDoiChuaXuat', label: 'DTQĐ Chưa Xuất', group: 'cx', visible: true },
      { key: 'dtTrenGc', label: 'DT/GC', group: 'ns', visible: true }
  ];

  onMount(() => {
      const saved = localStorage.getItem('sknv_revenue_table_cols_v5');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              columnSettings = columnSettings.map(c => {
                  const s = parsed.find(p => p.key === c.key);
                  return s ? { ...c, visible: s.visible } : c;
              });
          } catch(e){}
      }
  });

  function handleToggleColumn(event) {
      const key = event.detail;
      columnSettings = columnSettings.map(c => c.key === key ? { ...c, visible: !c.visible } : c);
      localStorage.setItem('sknv_revenue_table_cols_v5', JSON.stringify(columnSettings));
  }

  $: visibleColumns = columnSettings.filter(c => c.visible).map((c, index, arr) => {
      const isLast = index === arr.length - 1 || arr[index + 1].group !== c.group;
      const isFirst = index === 0 || arr[index - 1].group !== c.group;
      return { ...c, isLastInGroup: isLast, isFirstInGroup: isFirst };
  });

  // --- LOGIC SẮP XẾP ---
  let sortKey = 'doanhThuQuyDoi';
  let sortDirection = 'desc';
  function handleSort(event) {
      const key = event.detail;
      if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDirection = 'desc'; }
  }

  $: sortedData = [...enrichedReportData].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (sortKey === 'hoTen') return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      return sortDirection === 'asc' ? (Number(valA)||0) - (Number(valB)||0) : (Number(valB)||0) - (Number(valA)||0);
  });

  $: topCount = sortedData.length <= 15 ? 3 : 5;

  // --- TỔNG CỘNG SIÊU THỊ ---
  $: totals = enrichedReportData.reduce((acc, item) => {
      acc.doanhThu += item.doanhThu || 0;
      acc.doanhThuQuyDoi += item.doanhThuQuyDoi || 0;
      acc.doanhThuTraGop += item.doanhThuTraGop || 0;
      acc.doanhThuQuyDoiChuaXuat += item.doanhThuQuyDoiChuaXuat || 0;
      acc.dtqdCK += item.dtqdCK || 0;
      acc.duKienSoCK += item.duKienSoCK || 0;
      acc.gioCong += item.gioCong || 0;
      return acc;
  }, { doanhThu: 0, doanhThuQuyDoi: 0, doanhThuTraGop: 0, doanhThuQuyDoiChuaXuat: 0, dtqdCK: 0, duKienSoCK: 0, gioCong: 0 });

  $: totalPctQD = totals.doanhThu > 0 ? (totals.doanhThuQuyDoi / totals.doanhThu) - 1 : 0;
  $: totalPctTC = totals.doanhThu > 0 ? totals.doanhThuTraGop / totals.doanhThu : 0;
  $: avgSupermarketDtTrenGc = totals.gioCong > 0 ? (totals.doanhThuQuyDoi / totals.gioCong) : 0;

  // Store variables for KPI colors
  $: kpiTargets = $kpiStore.targets || {};
  $: kpiGlobalSettings = $kpiStore.globalSettings || {};

  function handleViewDetail(event) {
      dispatch('viewDetail', { employeeId: event.detail });
  }

  function handleBatchCapture(event) {
      const mode = event.detail;
      if (!mode) return;
      let targetData = [];
      if (mode === 'top5') targetData = sortedData.slice(0, 5);
      else if (mode === 'bot5') targetData = sortedData.slice(-5);
      else if (mode === 'all') targetData = sortedData;
      
      const ids = targetData.map(item => item.maNV);
      batchCaptureService.captureBatch(RevenueDetailView, ids, "DTLK_ChiTiet", (id) => ({ employeeId: id }));
  }
</script>

<div class="space-y-4">
    <ColumnConfig {columnSettings} on:toggle={handleToggleColumn} />

    <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fade-in" data-capture-group="revenue-table">
        <TableToolbar on:toggleMode={() => dispatch('toggleMode')} on:batchCapture={handleBatchCapture} />

        <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left border-collapse table-auto">
                <TableHeader {visibleColumns} {sortKey} {sortDirection} on:sort={handleSort} />
                
                <tbody class="divide-y divide-gray-200 bg-white">
                    {#if sortedData.length === 0}
                        <tr><td colspan={visibleColumns.length + 2} class="p-12 text-center text-gray-400 italic bg-gray-50">Chưa có dữ liệu hiển thị.</td></tr>
                    {:else}
                        {#each sortedData as item, index (item.maNV)}
                            <TableRow 
                                {item} 
                                {index} 
                                {visibleColumns} 
                                {topCount} 
                                {avgSupermarketDtTrenGc}
                                {kpiTargets}
                                {kpiGlobalSettings}
                                on:viewDetail={handleViewDetail} 
                            />
                        {/each}
                    {/if}
                </tbody>
                
                <TableFooter {totals} {visibleColumns} {totalPctQD} {totalPctTC} {avgSupermarketDtTrenGc} />
            </table>
        </div>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; } 
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>