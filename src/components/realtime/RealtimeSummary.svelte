<script>
  import { realtimeYCXData, realtimeGoalSettings } from '../../stores.js';
  import { reportService } from '../../services/reportService.js';
  import { settingsService } from '../../modules/settings.service.js';
  import { dataProcessing } from '../../services/dataProcessing.js'; 
  
  // Import Components con
  import RealtimeKpiCards from './RealtimeKpiCards.svelte';
  import RealtimeQdcTable from './RealtimeQdcTable.svelte';
  import RealtimeCategoryTable from './RealtimeCategoryTable.svelte';
  import RealtimeEfficiencyTable from './RealtimeEfficiencyTable.svelte';
  import RealtimeUnexportedTable from './RealtimeUnexportedTable.svelte';

  export let selectedWarehouse = '';

  // Reactive Variables
  let supermarketReport = {};
  let goals = {};
  
  // Biến dữ liệu cho các bảng con
  let qdcItems = [];
  let categoryItems = [];
  let efficiencyItems = [];
  let unexportedItems = [];

  $: {
    // 1. Lấy mục tiêu & Dữ liệu
    const settings = settingsService.getRealtimeGoalSettings(selectedWarehouse);
    goals = settings.goals || {};
    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);

    // 2. Lọc theo Kho
    let filteredReport = masterReport;
    let filteredRawData = $realtimeYCXData;

    if (selectedWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == selectedWarehouse);
      
      // Lọc dữ liệu thô cho bảng Chưa Xuất (dựa trên MSNV trong filteredReport)
      const visibleEmployees = new Set(filteredReport.map(nv => String(nv.maNV)));
      filteredRawData = $realtimeYCXData.filter(row => {
          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          return msnvMatch && visibleEmployees.has(msnvMatch[1].trim());
      });
    }

    // 3. Tổng hợp báo cáo Siêu thị
    supermarketReport = reportService.aggregateReport(filteredReport, selectedWarehouse);

    // --- CHUẨN BỊ DỮ LIỆU CHO CÁC BẢNG CON ---

    // A. Bảng QĐC (Sắp xếp theo DTQĐ giảm dần)
    if (supermarketReport.qdc) {
      qdcItems = Object.values(supermarketReport.qdc)
        .filter(item => item.sl > 0)
        .sort((a, b) => b.dtqd - a.dtqd);
    } else {
      qdcItems = [];
    }

    // B. Bảng Ngành hàng (Sắp xếp theo Doanh thu giảm dần)
    if (supermarketReport.nganhHangChiTiet) {
      categoryItems = Object.values(supermarketReport.nganhHangChiTiet)
        .filter(item => item.quantity > 0 || item.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);
    } else {
      categoryItems = [];
    }

    // C. Bảng Hiệu quả (Map từ Goals config)
    const allEfficiencyConfigs = settingsService.loadEfficiencyViewSettings();
    const goalKeyMap = {
            pctPhuKien: 'phanTramPhuKien', 
            pctGiaDung: 'phanTramGiaDung', 
            pctMLN: 'phanTramMLN', 
            pctSim: 'phanTramSim', 
            pctVAS: 'phanTramVAS', 
            pctBaoHiem: 'phanTramBaoHiem' 
    };
    // Lọc lấy các chỉ số % (bắt đầu bằng 'pct')
    efficiencyItems = allEfficiencyConfigs
        .filter(item => item.id.startsWith('pct'))
        .map(config => ({
            ...config,
            value: supermarketReport[config.id] || 0,
            target: goals[goalKeyMap[config.id]] || 0
        }));

    // D. Bảng Chưa Xuất (Tính toán riêng từ raw data)
    // Cần gọi services.generateRealtimeChuaXuatReport (đã có trong reportService.js)
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

  <RealtimeKpiCards {supermarketReport} {goals} />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <RealtimeQdcTable items={qdcItems} />
      <RealtimeCategoryTable items={categoryItems} />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <RealtimeEfficiencyTable items={efficiencyItems} />
      <RealtimeUnexportedTable items={unexportedItems} />
  </div>
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>