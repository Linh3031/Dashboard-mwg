<script>
  import { onMount, afterUpdate, tick } from 'svelte';
  import { 
    sortState, 
    competitionData, 
    selectedWarehouse 
  } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  import { reportService } from '../../services/reportService.js';
  // [FIX] Cập nhật đường dẫn đúng: modules -> services
  import { settingsService } from '../../services/settings.service.js';
  import { dataProcessing } from '../../services/dataProcessing.js';
  
  import LuykeEfficiencyTable from './LuykeEfficiencyTable.svelte';
  import LuykeQdcTable from './LuykeQdcTable.svelte';
  import LuykeCategoryTable from './LuykeCategoryTable.svelte';
  import LuykeUnexportedTable from './LuykeUnexportedTable.svelte';

  export let supermarketReport = {};
  export let filteredYCXData = [];
  export let goals = {};
  export let numDays = 1;

  let localSupermarketReport = {};
  let localGoals = {};
  
  let luykeCardData = {};
  let competitionSummary = { dat: 0, total: 0 };
  let comparisonData = { value: 0, percentage: 'N/A' };
  let luotKhachData = { value: 0, percentage: 'N/A' };
  
  let chuaXuatReport = [];
  let efficiencyItems = [];
  let qdcItems = []; 
  let categoryItems = []; 

  const cleanValue = (str) => {
      if (typeof str === 'number') return str;
      if (!str || typeof str !== 'string') return 0;
      const cleanStr = str.replace(/,|%/g, '').trim();
      const val = parseFloat(cleanStr);
      return isNaN(val) ? 0 : val;
  };

  $: {
    localSupermarketReport = supermarketReport || {};
    localGoals = goals || {};

    const pastedText = typeof localStorage !== 'undefined' ? localStorage.getItem('daily_paste_luyke') : '';
    const pastedData = dataProcessing.parseLuyKePastedData(pastedText || '');
    const { mainKpis, dtDuKien, dtqdDuKien, dtTraCham, tyLeTraCham } = pastedData;
    
    const hasPasteData = mainKpis && mainKpis['Thực hiện DT thực'];

    comparisonData = pastedData.comparisonData || { value: 0, percentage: 'N/A' };
    luotKhachData = pastedData.luotKhachData || { value: 0, percentage: 'N/A' };

    const excelData = {
        dtThuc: localSupermarketReport.doanhThu || 0,
        dtQd: localSupermarketReport.doanhThuQuyDoi || 0,
        dtGop: localSupermarketReport.doanhThuTraGop || 0,
        tyLeGop: localSupermarketReport.tyLeTraCham || 0,
        tyLeQd: localSupermarketReport.hieuQuaQuyDoi || 0,
        chuaXuatQd: localSupermarketReport.doanhThuQuyDoiChuaXuat || 0
    };

    let finalDtThuc, finalDtQd, finalDtGop, finalTyLeGop, finalTyLeQd;

    if (hasPasteData) {
        finalDtThuc = cleanValue(mainKpis['Thực hiện DT thực']) * 1000000;
        finalDtQd = cleanValue(mainKpis['Thực hiện DTQĐ']) * 1000000;
        finalDtGop = dtTraCham * 1000000;
        finalTyLeGop = tyLeTraCham / 100;
        finalTyLeQd = finalDtThuc > 0 ? ((finalDtQd / finalDtThuc) - 1) : 0;
    } else {
        finalDtThuc = excelData.dtThuc;
        finalDtQd = excelData.dtQd;
        finalDtGop = excelData.dtGop;
        finalTyLeGop = excelData.tyLeGop;
        finalTyLeQd = excelData.tyLeQd;
    }

    const targetThuc = parseFloat(localGoals?.doanhThuThuc || 0) * 1000000;
    const targetQD = parseFloat(localGoals?.doanhThuQD || 0) * 1000000;
    
    let phanTramTargetQd = 0;
    if (hasPasteData && mainKpis['% HT Target Dự Kiến (QĐ)']) {
         phanTramTargetQd = cleanValue(mainKpis['% HT Target Dự Kiến (QĐ)']) / 100;
    } else {
         phanTramTargetQd = targetQD > 0 ? ((dtqdDuKien * 1000000) / targetQD) : 0;
    }

    const phanTramTargetThuc = targetThuc > 0 ? ((dtDuKien * 1000000) / targetThuc) : 0;
    
    const compData = $competitionData || [];
    competitionSummary.total = compData.length;
    competitionSummary.dat = compData.filter(d => (parseFloat(String(d.hoanThanh).replace('%','')) || 0) >= 100).length;
    const tyLeThiDuaDat = competitionSummary.total > 0 ? competitionSummary.dat / competitionSummary.total : 0;

    luykeCardData = {
      dtThucLK: finalDtThuc,
      dtQdLK: finalDtQd,
      phanTramQd: finalTyLeQd,
      dtGop: finalDtGop,
      phanTramGop: finalTyLeGop,
      dtThucDuKien: dtDuKien * 1000000, 
      dtQdDuKien: dtqdDuKien * 1000000, 
      phanTramTargetQd: phanTramTargetQd, 
      phanTramTargetThuc: phanTramTargetThuc, 
      chuaXuatQuyDoi: excelData.chuaXuatQd,
      tyLeThiDuaDat: tyLeThiDuaDat
    };

    chuaXuatReport = reportService.generateLuyKeChuaXuatReport(filteredYCXData);
    
    const efficiencySettings = settingsService.loadEfficiencyViewSettings();
    const qdcSettings = settingsService.loadQdcViewSettings(Object.values(localSupermarketReport.qdc || {}).map(item => item.name));
    const categorySettings = settingsService.loadCategoryViewSettings(Object.keys(localSupermarketReport.nganhHangChiTiet || {}));

    const goalKeyMap = {
      pctPhuKien: 'phanTramPhuKien', 
      pctGiaDung: 'phanTramGiaDung', 
      pctMLN: 'phanTramMLN', 
      pctSim: 'phanTramSim', 
      pctVAS: 'phanTramVAS', 
      pctBaoHiem: 'phanTramBaoHiem' 
    };

    efficiencyItems = efficiencySettings
      .filter(item => item.id.startsWith('pct') && item.visible)
      .map(config => ({
        ...config, 
        value: localSupermarketReport[config.id], 
        target: localGoals[goalKeyMap[config.id]] 
      }));

    qdcItems = Object.entries(localSupermarketReport.qdc || {})
      .map(([key, value]) => ({ id: key, ...value }))
      .filter(item => qdcSettings.includes(item.name));

    categoryItems = Object.entries(localSupermarketReport.nganhHangChiTiet || {})
      .map(([name, values]) => ({ name, ...values }))
      .filter(item => categorySettings.includes(item.name));
  }

  afterUpdate(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });
</script>

<div class="space-y-8">
  
  <h2 id="luyke-supermarket-title" class="text-2xl font-bold text-center text-gray-700">
    Báo cáo lũy kế {$selectedWarehouse ? 'kho ' + $selectedWarehouse : 'toàn bộ'} - Tính đến {new Date().toLocaleDateString('vi-VN')}
  </h2>

  <div id="luyke-kpi-cards-container" data-capture-group="kpi" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    
    <div class="kpi-card p-6 rounded-2xl shadow-lg">
      <h4 class="kpi-card-title">Doanh thu thực</h4>
      <p id="luyke-kpi-dt-thuc-main" class="font-bold mt-2 mb-3">{formatters.formatNumber((luykeCardData.dtThucLK || 0) / 1000000, 0)}</p>
      <p id="luyke-kpi-dt-thuc-sub1" class="text-sm">
        DK: <span class="font-bold">{formatters.formatNumber((luykeCardData.dtThucDuKien || 0) / 1000000, 0)}</span> / Target: <span class="font-bold">{formatters.formatNumber(localGoals?.doanhThuThuc || 0)}</span>
      </p>
    </div>
    
    <div class="kpi-card p-6 rounded-2xl shadow-lg">
      <h4 class="kpi-card-title">Doanh thu Quy đổi</h4>
      <p id="luyke-kpi-dt-qd-main" class="font-bold mt-2 mb-3">{formatters.formatNumber((luykeCardData.dtQdLK || 0) / 1000000, 0)}</p>
      <p id="luyke-kpi-dt-qd-sub1" class="text-sm">
        DK: <span class="font-bold">{formatters.formatNumber((luykeCardData.dtQdDuKien || 0) / 1000000, 0)}</span> / Target: <span class="font-bold">{formatters.formatNumber(localGoals?.doanhThuQD || 0)}</span>
      </p>
    </div>

    <div class="kpi-card p-6 rounded-2xl shadow-lg">
      <h4 class="kpi-card-title">Tỷ lệ hoàn thành Target</h4>
      <p id="luyke-kpi-ht-target-qd-main" class="font-bold mt-2 mb-3">{formatters.formatPercentage(luykeCardData.phanTramTargetQd || 0)}</p>
      <p id="luyke-kpi-ht-target-thuc-sub" class="text-sm">DT Thực: <span class="font-bold">{formatters.formatPercentage(luykeCardData.phanTramTargetThuc || 0)}</span></p>
    </div>

    <div class="kpi-card p-6 rounded-2xl shadow-lg">
      <h4 class="kpi-card-title">Tỷ lệ quy đổi</h4>
      <p id="luyke-kpi-tl-qd-main" class="font-bold mt-2 mb-3">{formatters.formatPercentage(luykeCardData.phanTramQd || 0)}</p>
      <p id="luyke-kpi-tl-qd-sub" class="text-sm">Mục tiêu: <span class="font-bold">{formatters.formatNumber(localGoals?.phanTramQD || 0)}%</span></p>
    </div>

    <div class="kpi-card p-6 rounded-2xl shadow-lg">
      <h4 class="kpi-card-title">Doanh thu trả chậm</h4>
      <p id="luyke-kpi-dt-tc-main" class="font-bold mt-2 mb-3">{formatters.formatNumber((luykeCardData.dtGop || 0) / 1000000, 0)}</p>
      <p id="luyke-kpi-dt-tc-sub" class="text-sm">% trả chậm: <span class="font-bold">{formatters.formatPercentage(luykeCardData.phanTramGop || 0)}</span></p>
    </div>

    <div id="lk-summary-unexported-trigger" class="kpi-card p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl">
      <h4 class="kpi-card-title">DTQĐ Chưa xuất</h4>
      <p id="luyke-kpi-dtqd-chua-xuat-main" class="font-bold mt-2 mb-3">{formatters.formatNumber((luykeCardData.chuaXuatQuyDoi || 0) / 1000000, 0)}</p>
    </div>

    <div class="kpi-card p-6 rounded-2xl shadow-lg">
      <h4 class="kpi-card-title">Thi đua ngành hàng</h4>
      <p id="luyke-kpi-thidua-main" class="font-bold mt-2 mb-3">{formatters.formatPercentage(luykeCardData.tyLeThiDuaDat)}</p>
      <p id="luyke-kpi-thidua-sub" class="text-sm"><span class="font-bold">{competitionSummary.dat}/{competitionSummary.total}</span> Ngành</p>
    </div>

    <div class="kpi-card p-6 rounded-2xl shadow-lg">
      <h4 class="kpi-card-title">Tăng/giảm cùng kỳ</h4>
      <p id="luyke-kpi-dtck-main" class="font-bold mt-2 mb-3">{comparisonData.percentage || 'N/A'}</p>
      <p id="luyke-kpi-dtck-sub" class="text-sm">Doanh thu: <span class="font-bold">{formatters.formatNumber(comparisonData.value || 0)} | {comparisonData.percentage || 'N/A'}</span></p>
      <p id="luyke-kpi-lkck-sub" class="text-sm">Lượt khách: <span class="font-bold">{formatters.formatNumber(luotKhachData.value || 0)} | {luotKhachData.percentage || 'N/A'}</span></p>
    </div>

  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
    <LuykeEfficiencyTable items={efficiencyItems} />
    <LuykeQdcTable items={qdcItems} {numDays} />
  </div> 

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
    <LuykeCategoryTable items={categoryItems} {numDays} />
    <LuykeUnexportedTable items={chuaXuatReport} />
  </div>
</div>