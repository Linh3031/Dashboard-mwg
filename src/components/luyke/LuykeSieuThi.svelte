<script>
  import { onMount, afterUpdate } from 'svelte';
  import { 
    competitionData, 
    selectedWarehouse,
    warehouseList,
    interfaceSettings,
    macroCategoryConfig,
    macroProductGroupConfig, 
    efficiencyConfig,
    qdcConfigStore,
    modalState,
    categoryNameMapping,
    warehouseCustomMetrics,
    clusterSummaryData,
    doanhThuBIData 
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

  // [id, deleted:true] trong warehouseCustomMetrics = đã xóa hẳn 1 chỉ số hệ thống khỏi kho này
  // -> loại hoàn toàn khỏi danh sách hiển thị, không lẫn vào chỉ số cá nhân.
  $: deletedSystemIds = new Set(($warehouseCustomMetrics || []).filter(i => i.deleted).map(i => i.id));
  $: combinedEfficiencyItems = [
      ...($efficiencyConfig || []).filter(i => !deletedSystemIds.has(i.id)).map(i => ({
          ...i,
          isSystem: true,
          target: goals?.[i.id] || i.target
      })),
      ...($warehouseCustomMetrics || []).filter(i => !i.deleted).map(i => ({
          ...i,
          isSystem: false,
          target: goals?.[i.id] || i.target
      }))
  ];

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

    let dtThuc = 0;
    let dtQd = 0;
    let dtGop = 0;
    let tb3ThangQD = 0;

    const currentKho = $selectedWarehouse === 'ALL' ? null : $selectedWarehouse;

    if ($doanhThuBIData && $doanhThuBIData.length > 0) {
        $doanhThuBIData.forEach(row => {
            if (currentKho && String(row.maKho) !== String(currentKho)) return;
            // [FIX] Mẫu file mới (1 dòng/siêu thị, không còn cột Cấp dòng) — cộng thẳng; mẫu file
            // cũ (nhiều dòng Cấp dòng=CATEGORY cộng dồn thành tổng siêu thị) vẫn tương thích ngược.
            if (!row.capDong || String(row.capDong).toUpperCase() === 'CATEGORY') {
                dtThuc += parseFloat(row.doanhThu || 0);
                dtQd += parseFloat(row.doanhThuQD || 0);
                dtGop += parseFloat(row.dtTraGop || 0);
                tb3ThangQD += parseFloat(row.tb3ThangQD || 0);
            }
        });
    }

    finalDtThuc = dtThuc;
    finalDtQd = dtQd;
    finalDtGop = dtGop;
    
    finalTyLeQd = finalDtThuc > 0 ? (finalDtQd / finalDtThuc) - 1 : 0;
    finalTyLeGop = finalDtThuc > 0 ? (finalDtGop / finalDtThuc) : 0;

    // [PHẪU THUẬT LOGIC]: Tự động tính toán Dự kiến dựa trên số ngày chạy thực tế
    const now = new Date();
    const pastDays = now.getDate() > 1 ? now.getDate() - 1 : 1;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let agg_DtDuKien = (finalDtThuc / pastDays) * daysInMonth;
    let agg_DtQdDuKien = (finalDtQd / pastDays) * daysInMonth;

    // [SỬA LỖI] % HT Target giờ lấy theo Dự báo hoàn thành (agg_..DuKien / target), không lấy lũy kế thô / target
    const targetQD = parseFloat(localGoals?.doanhThuQD || 0);
    const phanTramTargetQd = targetQD > 0 ? (agg_DtQdDuKien / targetQD) : 0;

    const targetThuc = parseFloat(localGoals?.doanhThuThuc || 0);
    const phanTramTargetThuc = targetThuc > 0 ? (agg_DtDuKien / targetThuc) : 0;

    let tangTruongTB3T = tb3ThangQD > 0 ? (finalDtQd / tb3ThangQD) - 1 : 0;
    comparisonData = {
        value: finalDtQd - tb3ThangQD,
        percentage: tb3ThangQD > 0 ? ((tangTruongTB3T * 100).toFixed(1) + '%') : '0.0%'
    };

    const compData = ($competitionData || []).filter(d => String(d.maKho || '').trim() === String($selectedWarehouse).trim());
    competitionSummary.total = compData.length;
    competitionSummary.dat = compData.filter(d => (parseFloat(String(d.hoanThanhDuKien || '0').replace('%','')) || 0) >= 100).length;

    const tyLeThiDuaDat = competitionSummary.total > 0 ? competitionSummary.dat / competitionSummary.total : 0;

    luykeCardData = {
      dtThucLK: finalDtThuc,
      dtQdLK: finalDtQd,
      phanTramQd: finalTyLeQd,
      dtGop: finalDtGop,
      phanTramGop: finalTyLeGop,
      dtThucDuKien: agg_DtDuKien, 
      dtQdDuKien: agg_DtQdDuKien, 
      phanTramTargetQd: phanTramTargetQd, 
      phanTramTargetThuc: phanTramTargetThuc, 
      chuaXuatQuyDoi: localSupermarketReport.doanhThuQuyDoiChuaXuat || 0,
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

  // Chỉ số cá nhân lưu theo TỪNG kho -> phải chọn đích danh 1 kho, không phải "Tất cả"/Cụm
  function isSpecificWarehouse(wh) { return !!wh && wh !== 'ALL' && !String(wh).startsWith('CLUSTER_'); }

  function openAddEffModal() {
      if (!isSpecificWarehouse($selectedWarehouse)) return alert("Vui lòng chọn đích danh 1 Kho (không phải Tất cả/Cụm) để tạo chỉ số riêng.");
      modalState.update(s => ({ ...s, activeModal: 'add-efficiency-modal', payload: null }));
  }

  function handleEditEffConfig(event) {
      if (!isSpecificWarehouse($selectedWarehouse)) return alert("Vui lòng chọn đích danh 1 Kho (không phải Tất cả/Cụm) để sửa chỉ số này.");
      modalState.update(s => ({ ...s, activeModal: 'add-efficiency-modal', payload: event.detail }));
  }

  async function handleDeleteEffConfig(event) {
      const id = event.detail;
      const isSystem = $efficiencyConfig.some(i => i.id === id);
      if (!isSpecificWarehouse($selectedWarehouse)) return alert("Vui lòng chọn đích danh 1 Kho (không phải Tất cả/Cụm) để xóa chỉ số này.");

      if (isSystem) {
          // Chỉ số hệ thống gốc (chưa có bản ghi đè cá nhân) -> xóa hẳn khỏi hiển thị của kho này
          // bằng 1 bản ghi đánh dấu "deleted", không đụng cấu hình gốc của Admin. Chỉ "Khôi phục
          // mặc định" mới đưa nó hiện lại.
          if (!confirm("Xóa chỉ số này khỏi hiển thị? Dùng nút \"Khôi phục mặc định\" nếu sau này cần xem lại.")) return;
          const newLocalMetrics = [...$warehouseCustomMetrics.filter(i => i.id !== id), { id, deleted: true }];
          warehouseCustomMetrics.set(newLocalMetrics);
          await datasyncService.saveCustomMetrics($selectedWarehouse, newLocalMetrics);
          return;
      }

      if (confirm("Xóa chỉ số cá nhân này?")) {
          const newLocalMetrics = $warehouseCustomMetrics.filter(i => i.id !== id);
          warehouseCustomMetrics.set(newLocalMetrics);
          await datasyncService.saveCustomMetrics($selectedWarehouse, newLocalMetrics);
      }
  }

  async function handleRestoreDefaultMetrics() {
      if (!isSpecificWarehouse($selectedWarehouse)) return alert("Vui lòng chọn đích danh 1 Kho (không phải Tất cả/Cụm) để khôi phục.");
      if (!confirm("Khôi phục các chỉ số hệ thống về đúng cấu hình Admin? Chỉ số cá nhân bạn tự tạo mới vẫn được giữ nguyên.")) return;
      // Chỉ gỡ các bản ghi cá nhân TRÙNG id với chỉ số hệ thống (override/đánh dấu xóa) — giữ
      // nguyên các chỉ số cá nhân hoàn toàn tự tạo (id không trùng chỉ số hệ thống nào).
      const sysIds = new Set(($efficiencyConfig || []).map(i => i.id));
      const kept = ($warehouseCustomMetrics || []).filter(i => !sysIds.has(i.id));
      warehouseCustomMetrics.set(kept);
      await datasyncService.saveCustomMetrics($selectedWarehouse, kept);
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
          targetQdValue={parseFloat(localGoals?.doanhThuQD || 0)} 
      />
  </div>

  <DailyTargetSimulator 
    totalTarget={parseFloat(localGoals?.doanhThuQD || 0)}
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
          on:restore={handleRestoreDefaultMetrics}
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