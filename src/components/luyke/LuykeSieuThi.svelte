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
  
  import KpiBoard from './KpiBoard.svelte';
  import LuykeEfficiencyTable from './LuykeEfficiencyTable.svelte';
  import LuykeQdcTable from './LuykeQdcTable.svelte';
  import LuykeCategoryTable from './LuykeCategoryTable.svelte';
  import DailyTargetSimulator from './sub/DailyTargetSimulator.svelte';

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

  $: combinedEfficiencyItems = [
      ...($efficiencyConfig || []).map(i => ({ 
          ...i, 
          isSystem: true,
          target: goals?.[i.id] || i.target 
      })),
      ...($warehouseCustomMetrics || []).map(i => ({ 
          ...i, 
          isSystem: false,
          target: goals?.[i.id] || i.target 
      }))
  ];

  const cleanValue = (str) => {
      if (typeof str === 'number') return str;
      if (!str || typeof str !== 'string') return 0;
      const cleanStr = str.replace(/,|%/g, '').trim();
      const val = parseFloat(cleanStr);
      return isNaN(val) ? 0 : val;
  };

  let finalDtThuc = 0;
  let finalDtQd = 0; 
  let finalDtGop, finalTyLeGop, finalTyLeQd;

  $: {
    const _triggerMacroCat = $macroCategoryConfig;
    const _triggerMacroProd = $macroProductGroupConfig;
    const _triggerEff = $efficiencyConfig;
    const _triggerMap = $categoryNameMapping;
    const _triggerLocalEff = $warehouseCustomMetrics;

    localSupermarketReport = supermarketReport || {};
    localGoals = goals || {};

    // [PHẪU THUẬT LOGIC]: CHẶN ĐỨT ĐƯỜNG LÙI ẢO (NO GHOST FALLBACK)
    let pastedText = '';
    if (typeof localStorage !== 'undefined') {
        if ($selectedWarehouse && $selectedWarehouse !== 'ALL') {
            // Nếu đang chọn 1 kho cụ thể, CHỈ ĐƯỢC PHÉP lấy data của kho đó. 
            // Không có thì chấp nhận rỗng để nhường sân cho số liệu Excel.
            pastedText = localStorage.getItem(`daily_paste_luyke_${$selectedWarehouse}`) || '';
        } else {
            pastedText = localStorage.getItem('daily_paste_luyke') || '';
        }
    }

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

    if (hasPasteData) {
        finalDtThuc = cleanValue(mainKpis['Thực hiện DT thực']) * 1000000;
        finalDtQd = cleanValue(mainKpis['Thực hiện DTQĐ']) * 1000000;
        finalDtGop = dtTraCham * 1000000;
        finalTyLeGop = tyLeTraCham / 100;
        finalTyLeQd = finalDtThuc > 0 ? ((finalDtQd / finalDtThuc) - 1) : 0;
    } else {
        // [CƠ CHẾ FALLBACK 2]: Kích hoạt khi Kho ảo không có data paste.
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
        groupConfig.items.forEach(itemId => {
            if (details[itemId]) {
                totalVal += (details[itemId].revenueQuyDoi || 0);
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
      .map(([id, values]) => ({ 
          id: id,
          name: values.name,
          dtqd: values.revenueQuyDoi, 
          sl: values.quantity, 
          dt: values.revenue, 
          ...values 
      }));

    categoryItems = Object.entries(localSupermarketReport.nganhHangChiTiet || {})
      .map(([id, values]) => ({ 
          id: id,
          name: values.name,
          dtqd: values.revenueQuyDoi, 
          ...values 
      }));
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
        Báo cáo Lũy kế {$selectedWarehouse ? '- ' + $selectedWarehouse : '(Toàn bộ)'}
      </h2>

      <KpiBoard 
          {luykeCardData}
          {localGoals}
          {competitionSummary}
          {comparisonData}
          {luotKhachData}
          {channelStats}
          captureFilename="SieuThiLuyKe {$selectedWarehouse ? '- ' + $selectedWarehouse : ''}"
          targetQdValue={(localGoals?.doanhThuQD || 0) * 1000000} 
      />
  </div>

  <DailyTargetSimulator 
    totalTarget={parseFloat(localGoals?.doanhThuQD || 0) * 1000000}
    currentRevenue={finalDtQd || 0}
    warehouseId={$selectedWarehouse}
  />

  <div class="luyke-tier-1-grid exclusive-sieuthi-capture" data-capture-group="tier1" data-capture-filename="HIỆU QUẢ KHAI THÁC">
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

  <div data-capture-group="tier2" data-capture-filename="CHI TIẾT NGÀNH HÀNG">
      <LuykeCategoryTable 
          items={categoryItems} 
          unexportedItems={chuaXuatReport}
          rawSource={filteredYCXData} 
          {numDays} 
      />
  </div>

</div>

<style>
    /* Ép bề ngang chuẩn Form Mobile (450px) và gộp dọc chống vỡ layout khi Capture */
    :global(.capture-container .exclusive-sieuthi-capture) {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        width: 450px !important; 
        min-width: 450px !important;
        max-width: 450px !important;
        margin: 0 auto !important; 
    }

    :global(.capture-container .exclusive-sieuthi-capture .luyke-widget) {
        height: auto !important;
        min-height: max-content !important;
        display: block !important; 
    }
    
    :global(.capture-container .exclusive-sieuthi-capture .h-full) {
        height: auto !important;
    }

    :global(.capture-container .exclusive-sieuthi-capture .custom-scrollbar),
    :global(.capture-container .exclusive-sieuthi-capture .luyke-widget-body) {
        max-height: none !important;
        height: auto !important;
        overflow: visible !important;
    }
</style>