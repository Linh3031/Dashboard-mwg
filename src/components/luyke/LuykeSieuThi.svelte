<script>
  import { onMount, afterUpdate } from 'svelte';
  import { 
    competitionData, 
    selectedWarehouse,
    interfaceSettings,
    macroCategoryConfig,
    macroProductGroupConfig, 
    efficiencyConfig,
    qdcConfigStore,
    modalState,
    categoryNameMapping,
    warehouseCustomMetrics
  } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  import { reportService } from '../../services/reportService.js';
  import { settingsService } from '../../services/settings.service.js';
  import { dataProcessing } from '../../services/dataProcessing.js';
  import { adminService } from '../../services/admin.service.js';
  import { datasyncService } from '../../services/datasync.service.js';
  import * as utils from '../../utils.js';
  
  import LuykeEfficiencyTable from './LuykeEfficiencyTable.svelte';
  import LuykeQdcTable from './LuykeQdcTable.svelte';
  import LuykeCategoryTable from './LuykeCategoryTable.svelte';

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
  let categoryItems = []; 
  let qdcItems = []; 

  let channelStats = {
      dxm: { val: 0, pct: 0 },
      tgdd: { val: 0, pct: 0 }
  };

  let combinedEfficiencyItems = [];

  onMount(async () => {
      const savedEffConfig = await adminService.loadEfficiencyConfig();
      if(savedEffConfig.length > 0) efficiencyConfig.set(savedEffConfig);
      
      const savedQdcConfig = await adminService.loadQdcConfig();
      if(savedQdcConfig.length > 0) qdcConfigStore.set(savedQdcConfig);
  });

  $: if ($selectedWarehouse) {
      loadLocalMetrics($selectedWarehouse);
  }

  async function loadLocalMetrics(kho) {
      const localData = await datasyncService.loadCustomMetrics(kho);
      warehouseCustomMetrics.set(localData);
  }

  // [CẬP NHẬT] Map target từ goals vào combined items
  $: combinedEfficiencyItems = [
      ...($efficiencyConfig || []).map(i => ({ 
          ...i, 
          isSystem: true,
          target: goals?.[i.id] || i.target // Ưu tiên target từ Goal Setting
      })),
      ...($warehouseCustomMetrics || []).map(i => ({ 
          ...i, 
          isSystem: false,
          target: goals?.[i.id] || i.target // Ưu tiên target từ Goal Setting
      }))
  ];

  const cleanValue = (str) => {
      if (typeof str === 'number') return str;
      if (!str || typeof str !== 'string') return 0;
      const cleanStr = str.replace(/,|%/g, '').trim();
      const val = parseFloat(cleanStr);
      return isNaN(val) ? 0 : val;
  };

  // ... (Giữ nguyên phần logic tính toán $: ở giữa không thay đổi) ...
  // Để tiết kiệm không gian, tôi chỉ paste lại phần thay đổi ở template bên dưới
  $: {
    const _triggerMacroCat = $macroCategoryConfig;
    const _triggerMacroProd = $macroProductGroupConfig;
    const _triggerEff = $efficiencyConfig;
    const _triggerMap = $categoryNameMapping;
    const _triggerLocalEff = $warehouseCustomMetrics;

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

    const calcChannelStat = (keywords) => {
        const groupConfig = ($macroCategoryConfig || []).find(g => {
            if (!g.name) return false;
            const normName = g.name.trim().toLowerCase().normalize("NFC");
            return keywords.some(k => normName.includes(k));
        });

        if (!groupConfig || !groupConfig.items) return 0;

        const details = localSupermarketReport.nganhHangChiTiet || {};
        let totalVal = 0;

        groupConfig.items.forEach(rawName => {
            const cleanKey = utils.cleanCategoryName(rawName);
            if (details[cleanKey]) {
                totalVal += (details[cleanKey].revenueQuyDoi || 0);
            }
        });
        return totalVal;
    };

    const valDXM = calcChannelStat(['đmx', 'dmx', 'dien may xanh']);
    const valTGDD = calcChannelStat(['tgdd', 'the gioi di dong']);
    const totalChannelRevenue = (valDXM + valTGDD) || 1; 

    channelStats = {
        dxm: { val: valDXM, pct: valDXM / totalChannelRevenue },
        tgdd: { val: valTGDD, pct: valTGDD / totalChannelRevenue }
    };

    chuaXuatReport = reportService.generateLuyKeChuaXuatReport(filteredYCXData);
    
    qdcItems = Object.entries(localSupermarketReport.nhomHangChiTiet || {})
      .map(([name, values]) => ({ 
          id: name,
          name, 
          dtqd: values.revenueQuyDoi, 
          sl: values.quantity, 
          dt: values.revenue, 
          ...values 
      }));

    categoryItems = Object.entries(localSupermarketReport.nganhHangChiTiet || {})
      .map(([name, values]) => ({ name, dtqd: values.revenueQuyDoi, ...values }));
  }

  function openAddEffModal() {
      modalState.update(s => ({ ...s, activeModal: 'add-efficiency-modal', payload: null }));
  }

  function handleEditEffConfig(event) {
      modalState.update(s => ({ ...s, activeModal: 'add-efficiency-modal', payload: event.detail }));
  }

  async function handleDeleteEffConfig(event) {
      const id = event.detail;
      const isSystem = $efficiencyConfig.some(i => i.id === id);
      
      if (isSystem) {
         
  alert("Đây là chỉ số hệ thống, bạn không thể xóa. Hãy dùng bộ lọc để ẩn nó đi.");
          return;
      }

      if (confirm("Xóa chỉ số cá nhân này?")) {
          const newLocalMetrics = $warehouseCustomMetrics.filter(i => i.id !== id);
          warehouseCustomMetrics.set(newLocalMetrics);
          if ($selectedWarehouse) {
              await datasyncService.saveCustomMetrics($selectedWarehouse, newLocalMetrics);
          }
      }
  }

  afterUpdate(() => {
    if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="luyke-dashboard-container">
  
  <div>
      <h2 id="luyke-supermarket-title" class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <i data-feather="bar-chart" class="text-blue-600"></i>
        Báo cáo Lũy kế {$selectedWarehouse ? '- ' + $selectedWarehouse 
: '(Toàn bộ)'}
      </h2>

      <div id="luyke-kpi-cards-container" data-capture-group="kpi" class="kpi-grid-fixed">
        
        <div class="kpi-card-solid card-1">
            <div class="kpi-solid-header">Doanh Thu Thực <i data-feather="dollar-sign"></i></div>
            <div class="kpi-solid-value">{formatters.formatNumber((luykeCardData.dtThucLK || 0) / 1000000, 0)}</div>
            <div class="kpi-solid-sub">
                <span>DK: {formatters.formatNumber((luykeCardData.dtThucDuKien || 0) / 1000000, 0)}</span>
                <span>MT: {formatters.formatNumber(localGoals?.doanhThuThuc || 0)}</span>
            </div>
      
       <div class="kpi-bg-icon"><i data-feather="dollar-sign"></i></div>
        </div>

        <div class="kpi-card-solid card-2">
            <div class="kpi-solid-header">DT Quy Đổi <i data-feather="refresh-cw"></i></div>
            <div class="kpi-solid-value">{formatters.formatNumber((luykeCardData.dtQdLK || 0) / 1000000, 0)}</div>
            <div class="kpi-solid-sub">
                <span>DK: {formatters.formatNumber((luykeCardData.dtQdDuKien || 0) / 1000000, 0)}</span>
                <span>MT: {formatters.formatNumber(localGoals?.doanhThuQD || 0)}</span>
            </div>
            <div class="kpi-bg-icon"><i data-feather="refresh-cw"></i></div>
 
        </div>

        <div class="kpi-card-solid card-3">
            <div class="kpi-solid-header">% HT Target (QĐ) <i data-feather="target"></i></div>
            <div class="kpi-solid-value">{formatters.formatPercentage(luykeCardData.phanTramTargetQd || 0)}</div>
            <div class="kpi-solid-sub">
                <span>% HT DT Thực: {formatters.formatPercentage(luykeCardData.phanTramTargetThuc || 0)}</span>
            </div>
            <div class="kpi-bg-icon"><i data-feather="target"></i></div>
        </div>

        <div class="kpi-card-solid card-4">
            <div 
 class="kpi-solid-header">Hiệu quả QĐ <i data-feather="trending-up"></i></div>
            <div class="kpi-solid-value">{formatters.formatPercentage(luykeCardData.phanTramQd || 0)}</div>
            <div class="kpi-solid-sub">
                <span>Mục tiêu: {formatters.formatNumber(localGoals?.phanTramQD || 0)}%</span>
            </div>
            <div class="kpi-bg-icon"><i data-feather="trending-up"></i></div>
        </div>

        <div class="kpi-card-solid card-5">
            <div class="kpi-solid-header">Tỷ lệ Trả chậm <i data-feather="credit-card"></i></div>
            <div class="kpi-solid-value">{formatters.formatPercentage(luykeCardData.phanTramGop || 0)}</div>
            <div 
 class="kpi-solid-sub">
                <span>Doanh số: {formatters.formatNumber((luykeCardData.dtGop || 0) / 1000000, 0)}</span>
            </div>
            <div class="kpi-bg-icon"><i data-feather="credit-card"></i></div>
        </div>

        <div class="kpi-card-solid card-6">
            <div class="kpi-solid-header">Thi đua đạt <i data-feather="award"></i></div>
            <div class="kpi-solid-value">{competitionSummary.dat}/{competitionSummary.total}</div>
            <div class="kpi-solid-sub">
                <span>Tỷ lệ đạt: {formatters.formatPercentage(luykeCardData.tyLeThiDuaDat)}</span>
            </div>
 
            <div class="kpi-bg-icon"><i data-feather="award"></i></div>
        </div>

        <div class="kpi-card-solid card-7">
            <div class="kpi-solid-header">Tăng trưởng CK <i data-feather="activity"></i></div>
            <div class="kpi-solid-value">{comparisonData.percentage || 'N/A'}</div>
            <div class="kpi-solid-sub">
                <span>Lượt khách: {luotKhachData.percentage || 'N/A'}</span>
            </div>
            <div class="kpi-bg-icon"><i data-feather="activity"></i></div>
        </div>

        <div class="kpi-card-solid card-8">
  
           <div class="kpi-solid-header">Tỷ trọng kênh <i data-feather="pie-chart"></i></div>
            <div class="flex flex-col gap-1 mt-1">
                <div class="flex justify-between items-baseline border-b border-white/20 pb-1">
                    <span class="text-sm font-semibold opacity-90">ĐMX</span>
                    <div class="text-right">
                        <span class="text-lg font-bold">{formatters.formatRevenue(channelStats.dxm.val, 0)}</span>
                  
       <span class="text-xs opacity-90 ml-1 font-bold">({formatters.formatPercentage(channelStats.dxm.pct)})</span>
                    </div>
                </div>
                <div class="flex justify-between items-baseline pt-1">
                    <span class="text-sm font-semibold opacity-90">TGDD</span>
                    <div class="text-right">
                        <span class="text-lg font-bold">{formatters.formatRevenue(channelStats.tgdd.val, 0)}</span>
     
                    <span class="text-xs opacity-90 ml-1 font-bold">({formatters.formatPercentage(channelStats.tgdd.pct)})</span>
                    </div>
                </div>
            </div>
            <div class="kpi-bg-icon"><i data-feather="pie-chart"></i></div>
        </div>

      </div>
  </div>

  <div class="luyke-tier-1-grid" data-capture-group="tier1">
      <LuykeEfficiencyTable 
          items={[]} 
          dynamicItems={combinedEfficiencyItems} 
          supermarketData={localSupermarketReport}
          goals={localGoals} 
          on:add={openAddEffModal}
          on:edit={handleEditEffConfig}
          on:delete={handleDeleteEffConfig}
      />
      <LuykeQdcTable 
          items={qdcItems} 
          numDays={numDays} 
      />
  </div>

  <div data-capture-group="tier2">
      <LuykeCategoryTable 
          items={categoryItems} 
          unexportedItems={chuaXuatReport}
          rawSource={filteredYCXData} 
          {numDays} 
      />
  </div>

</div>