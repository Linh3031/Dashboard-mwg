<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { kpiStore, ycxDataThangTruoc } from '../../stores.js';
  import { batchCaptureService } from '../../services/batchCapture.service.js';
  import RevenueDetailView from './revenue/RevenueDetailView.svelte';
  import { dataProcessing } from '../../services/dataProcessing.js';

  import ColumnConfig from './revenue/table/ColumnConfig.svelte';
  import TableToolbar from './revenue/table/TableToolbar.svelte';
  import TableHeader from './revenue/table/TableHeader.svelte';
  import TableRow from './revenue/table/TableRow.svelte';
  import TableFooter from './revenue/table/TableFooter.svelte';
  
  export let reportData = [];
  export let shopTargetQD = 0; // [PHẪU THUẬT LOGIC]: Nhận Target Tổng DTQĐ từ component cha
  
  const dispatch = createEventDispatcher();

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

  $: lastMonthDataMap = (() => {
      const map = {};
      const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu();
      const today = new Date();
      const targetDate = new Date(today.getFullYear(), today.getMonth() - (today.getDate() === 1 ? 2 : 1), 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      ($ycxDataThangTruoc || []).forEach(row => {
          if (!row.ngayTao || !(row.ngayTao instanceof Date)) return;
          if (row.ngayTao.getMonth() !== targetMonth || row.ngayTao.getFullYear() !== targetYear) return;

          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          if (!msnvMatch) return;
          
          const isDaXuat = !row.trangThaiXuat || ['Đã xuất', 'Đã giao'].includes(row.trangThaiXuat.trim());
          const isBaseValid = (row.trangThaiThuTien || '').trim() === 'Đã thu' &&
                              (row.trangThaiHuy || '').trim() === 'Chưa hủy' &&
                              (row.tinhTrangTra || '').trim() === 'Chưa trả';

          if (hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat) && isDaXuat && isBaseValid) {
              map[msnvMatch[1].trim()] = (map[msnvMatch[1].trim()] || 0) + (row.revenueQuyDoi || 0);
          }
      });
      return map;
  })();

  $: employeeCount = reportData.length || 1;
  $: targetCaNhan = shopTargetQD / employeeCount;

  $: enrichedReportData = reportData.map(item => {
      const dtqd = item.doanhThuQuyDoi || 0;
      const dtqdCK = lastMonthDataMap[item.maNV] || 0;
      const duKienCuoiThang = (dtqd / currentDay) * daysInMonth;
      
      return { 
          ...item, 
          dtqdCK, 
          duKienSoCK: duKienCuoiThang - dtqdCK, 
          dtTrenGc: item.gioCong > 0 ? (dtqd / item.gioCong) / 1000 : 0,
          targetCaNhan: targetCaNhan,
          tyLeDuKien: targetCaNhan > 0 ? (duKienCuoiThang / targetCaNhan) : 0
      };
  });

  // [PHẪU THUẬT LOGIC]: Chèn 2 cột Mục Tiêu (mt) lên đầu để tự động bọc viền chung
  let columnSettings = [
      { key: 'targetCaNhan', label: 'Target QĐ', group: 'mt', visible: true },
      { key: 'tyLeDuKien', label: '% Dự Kiến HT', group: 'mt', visible: true },
      { key: 'doanhThu', label: 'DT Thực', group: 'dt', visible: true },
      { key: 'doanhThuQuyDoi', label: 'DT Quy Đổi', group: 'dt', visible: true },
      { key: 'hieuQuaQuyDoi', label: '% QĐ', group: 'dt', visible: true },
      { key: 'dtqdCK', label: 'DTQĐ Cùng Kỳ', group: 'ck', visible: true },
      { key: 'duKienSoCK', label: 'Dự Kiến So CK', group: 'ck', visible: true },
      { key: 'doanhThuTraGop', label: 'DT Trả Chậm', group: 'tc', visible: true },
      { key: 'tyLeTraCham', label: '% Trả Chậm', group: 'tc', visible: true },
      { key: 'doanhThuQuyDoiChuaXuat', label: 'DTQĐ Chưa Xuất', group: 'cx', visible: true },
      { key: 'dtTrenGc', label: 'DTQĐ/GC', group: 'ns', visible: true }
  ];

  onMount(() => {
      const saved = localStorage.getItem('sknv_revenue_table_cols_v6');
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
      columnSettings = columnSettings.map(c => c.key === event.detail ? { ...c, visible: !c.visible } : c);
      localStorage.setItem('sknv_revenue_table_cols_v6', JSON.stringify(columnSettings));
  }

  $: visibleColumns = columnSettings.filter(c => c.visible).map((c, index, arr) => ({
      ...c, 
      isLastInGroup: index === arr.length - 1 || arr[index + 1].group !== c.group, 
      isFirstInGroup: index === 0 || arr[index - 1].group !== c.group 
  }));

  let sortKey = 'doanhThuQuyDoi';
  let sortDirection = 'desc';
  function handleSort(event) {
      if (sortKey === event.detail) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      else { sortKey = event.detail; sortDirection = 'desc'; }
  }

  $: sortedData = [...enrichedReportData].sort((a, b) => {
      if (sortKey === 'hoTen') return sortDirection === 'asc' ? String(a[sortKey]).localeCompare(String(b[sortKey])) : String(b[sortKey]).localeCompare(String(a[sortKey]));
      return sortDirection === 'asc' ? (Number(a[sortKey])||0) - (Number(b[sortKey])||0) : (Number(b[sortKey])||0) - (Number(a[sortKey])||0);
  });

  $: topCount = sortedData.length <= 15 ? 3 : 5;

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
  $: avgSupermarketDtTrenGc = totals.gioCong > 0 ? (totals.doanhThuQuyDoi / totals.gioCong) / 1000 : 0;
  
  $: totalTyLeDuKien = shopTargetQD > 0 ? (((totals.doanhThuQuyDoi / currentDay) * daysInMonth) / shopTargetQD) : 0;

  $: averages = {
      targetCaNhan: targetCaNhan,
      tyLeDuKien: totalTyLeDuKien,
      doanhThu: totals.doanhThu / employeeCount,
      doanhThuQuyDoi: totals.doanhThuQuyDoi / employeeCount,
      hieuQuaQuyDoi: totalPctQD,
      dtqdCK: totals.dtqdCK / employeeCount,
      duKienSoCK: totals.duKienSoCK / employeeCount,
      doanhThuTraGop: totals.doanhThuTraGop / employeeCount,
      tyLeTraCham: totalPctTC,
      doanhThuQuyDoiChuaXuat: totals.doanhThuQuyDoiChuaXuat / employeeCount,
      dtTrenGc: avgSupermarketDtTrenGc
  };

  $: kpiTargets = $kpiStore.targets || {};
  $: kpiGlobalSettings = $kpiStore.globalSettings || {};

  function handleBatchCapture(event) {
      if (!event.detail) return;
      let targetData = event.detail === 'top5' ? sortedData.slice(0, 5) : event.detail === 'bot5' ? sortedData.slice(-5) : sortedData;
      batchCaptureService.captureBatch(RevenueDetailView, targetData.map(i => i.maNV), "DTLK_ChiTiet", (id) => ({ employeeId: id }));
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
                                {item} {index} {visibleColumns} {topCount} {avgSupermarketDtTrenGc}
                                {kpiTargets} {kpiGlobalSettings} {averages}
                                on:viewDetail={(e) => dispatch('viewDetail', { employeeId: e.detail })} 
                            />
                        {/each}
                    {/if}
                </tbody>
                <TableFooter {totals} {visibleColumns} {totalPctQD} {totalPctTC} {avgSupermarketDtTrenGc} {averages} {shopTargetQD} {totalTyLeDuKien} />
            </table>
            
        </div>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; } 
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>