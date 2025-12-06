<script>
  // Version 1.1 - Fix import paths (modules -> services)
  import { realtimeYCXData, realtimeGoalSettings } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  // [FIX] Cập nhật đường dẫn đúng
  import { settingsService } from '../../../services/settings.service.js';
  import { dataProcessing } from '../../../services/dataProcessing.js';
  
  import KpiCards from './KpiCards.svelte';
  import QdcTable from './QdcTable.svelte';
  import CategoryTable from './CategoryTable.svelte';
  import EfficiencyTable from './EfficiencyTable.svelte';
  import UnexportedTable from './UnexportedTable.svelte';

  export let selectedWarehouse = '';
  
  let supermarketReport = {};
  let goals = {};
  let qdcItems = [];
  let categoryItems = [];
  let efficiencyItems = [];
  let unexportedItems = [];

  $: {
    const settings = settingsService.getRealtimeGoalSettings(selectedWarehouse);
    goals = settings.goals || {};
    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    
    let filteredReport = masterReport;
    let filteredRawData = $realtimeYCXData;

    if (selectedWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == selectedWarehouse);
      const visibleEmployees = new Set(filteredReport.map(nv => String(nv.maNV)));
      filteredRawData = $realtimeYCXData.filter(row => {
          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          return msnvMatch && visibleEmployees.has(msnvMatch[1].trim());
      });
    }

    supermarketReport = reportService.aggregateReport(filteredReport, selectedWarehouse);

    // A. Bảng QĐC
    if (supermarketReport.qdc) {
      qdcItems = Object.values(supermarketReport.qdc)
        .filter(item => item.sl > 0)
        .sort((a, b) => b.dtqd - a.dtqd);
    } else {
      qdcItems = [];
    }

    // B. Bảng Ngành hàng
    if (supermarketReport.nganhHangChiTiet) {
      categoryItems = Object.values(supermarketReport.nganhHangChiTiet)
        .filter(item => item.quantity > 0 || item.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);
    } else {
      categoryItems = [];
    }

    // C. Bảng Hiệu quả
    const allEfficiencyConfigs = settingsService.loadEfficiencyViewSettings();
    const goalKeyMap = {
            pctPhuKien: 'phanTramPhuKien', 
            pctGiaDung: 'phanTramGiaDung', 
            pctMLN: 'phanTramMLN', 
            pctSim: 'phanTramSim', 
            pctVAS: 'phanTramVAS', 
            pctBaoHiem: 'phanTramBaoHiem' 
    };
    efficiencyItems = allEfficiencyConfigs
        .filter(item => item.id.startsWith('pct'))
        .map(config => ({
            ...config,
            value: supermarketReport[config.id] || 0,
            target: goals[goalKeyMap[config.id]] || 0
        }));

    // D. Bảng Chưa Xuất
    unexportedItems = reportService.generateRealtimeChuaXuatReport(filteredRawData);
  }
</script>

<div class="space-y-8 animate-fade-in pb-10">
  <h2 class="text-2xl font-bold text-center text-gray-700">
    Báo cáo Realtime {selectedWarehouse ? `kho ${selectedWarehouse}` : 'toàn bộ'}
    <span class="block text-sm font-normal text-gray-500 mt-1">
      - {new Date().toLocaleTimeString()} {new Date().toLocaleDateString('vi-VN')}
    </span>
  </h2>

  <KpiCards {supermarketReport} {goals} />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <QdcTable items={qdcItems} />
      <CategoryTable items={categoryItems} />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <EfficiencyTable items={efficiencyItems} />
      <UnexportedTable items={unexportedItems} />
  </div>
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.5s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>