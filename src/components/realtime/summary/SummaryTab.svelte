<script>
  import { 
    realtimeYCXData, 
    selectedWarehouse, 
    efficiencyConfig, 
    warehouseCustomMetrics,
    modalState,
    // [SỬA LỖI ĐIỂM CHẾT]: Import trực tiếp Store để Svelte kích hoạt cơ chế Reactivity lắng nghe thay đổi mục tiêu
    realtimeGoalSettings 
  } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  import { adminService } from '../../../services/admin.service.js';
  
  import QdcTable from './QdcTable.svelte';
  import CategoryTable from './CategoryTable.svelte';
  import EfficiencyTable from '../efficiency/EfficiencyTable.svelte';

  import { onMount } from 'svelte';
  let supermarketReport = {};
  let goals = {};
  let qdcItems = [];
  let categoryItems = [];
  let unexportedItems = [];
  let rawSourceData = [];

  let combinedEfficiencyItems = [];
  onMount(async () => {
      const globalConfig = await adminService.loadEfficiencyConfig();
      efficiencyConfig.set(globalConfig);
  });
  $: if ($selectedWarehouse) {
      loadLocalMetrics($selectedWarehouse);
  }

  async function loadLocalMetrics(kho) {
      const localData = await datasyncService.loadCustomMetrics(kho);
      warehouseCustomMetrics.set(localData);
  }

  $: combinedEfficiencyItems = [
      ...($efficiencyConfig || []).map(i => ({ ...i, isSystem: true })),
      ...($warehouseCustomMetrics || []).map(i => ({ ...i, isSystem: false }))
  ];
  async function handleDeleteMetric(event) {
      const id = event.detail;
      const item = combinedEfficiencyItems.find(i => i.id === id);
      
      if (item && item.isSystem) {
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

  $: {
    // Nếu $selectedWarehouse rỗng (Toàn bộ) thì chuyển về key 'ALL' để đồng bộ đích danh dữ liệu cụm
    const currentWarehouse = $selectedWarehouse ? $selectedWarehouse : 'ALL';
    
    // [SỬA LỖI ĐIỂM CHẾT]: Thay vì gọi hàm ẩn qua service, ta dùng tiền tố $ đọc trực tiếp từ Store để kích hoạt lắng nghe thay đổi tự động
    const settings = $realtimeGoalSettings[currentWarehouse] || { goals: {}, timing: {} };
    goals = settings.goals || {};

    const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
    
    let filteredReport = masterReport;
    let filteredRawData = $realtimeYCXData;

    if ($selectedWarehouse) {
      filteredReport = masterReport.filter(nv => nv.maKho == currentWarehouse);
      const visibleEmployees = new Set(filteredReport.map(nv => String(nv.maNV)));
      filteredRawData = $realtimeYCXData.filter(row => {
          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          return msnvMatch && visibleEmployees.has(msnvMatch[1].trim());
      });
    }
    
    rawSourceData = filteredRawData;

    supermarketReport = reportService.aggregateReport(filteredReport, $selectedWarehouse);
    qdcItems = supermarketReport.nhomHangChiTiet 
        ?
        Object.entries(supermarketReport.nhomHangChiTiet)
            .map(([name, values]) => ({
                id: name,
                name,
                dtqd: values.revenueQuyDoi,
                sl: values.quantity,
                dt: values.revenue,
                ...values
            }))
            .filter(i => i.sl > 0 || i.dt > 0) 
        : [];
    categoryItems = supermarketReport.nganhHangChiTiet 
        ?
        Object.values(supermarketReport.nganhHangChiTiet).filter(i => i.revenue > 0 || i.quantity > 0)
        : [];
    unexportedItems = reportService.generateRealtimeChuaXuatReport(filteredRawData);
  }

  $: pctDTT = (parseFloat(goals?.doanhThuThuc) || 0) > 0 ?
    (supermarketReport.doanhThu / 1000000) / parseFloat(goals.doanhThuThuc) : 0;
  $: pctDTQD = (parseFloat(goals?.doanhThuQD) || 0) > 0 ?
    (supermarketReport.doanhThuQuyDoi / 1000000) / parseFloat(goals.doanhThuQD) : 0;

  // Hàm gọi Modal Quick Goal cho Realtime
  function openQuickGoal(fieldId, title, currentValue) {
      modalState.update(s => ({
          ...s,
          activeModal: 'quick-goal-modal',
          payload: { fieldId, title, currentValue: currentValue || 0, type: 'realtime' }
      }));
  }
</script>

<div class="luyke-dashboard-container pb-10">
  
  <h2 id="realtime-supermarket-title" class="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
    <i data-feather="zap" class="text-yellow-500 fill-current"></i>
    Báo cáo Realtime {$selectedWarehouse ? `- Kho ${$selectedWarehouse}` : '(Toàn bộ)'}
    <span class="text-sm font-normal text-gray-500 ml-2 pt-1">
      (Cập nhật: {new Date().toLocaleTimeString('vi-VN')})
    </span>
  </h2>

  <div id="realtime-kpi-cards-container" class="kpi-grid-fixed">
      
      <div 
          class="kpi-card-solid card-1 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform relative group"
          on:click={() => openQuickGoal('doanhThuThuc', 'Target DT Thực Realtime', goals?.doanhThuThuc)}
          role="button" tabindex="0" title="Click để sửa mục tiêu"
      >
          <div class="kpi-solid-header">Doanh Thu Thực <i data-feather="dollar-sign"></i></div>
          <div class="kpi-solid-value">{formatters.formatNumber((supermarketReport.doanhThu || 0) / 1000000, 1)}</div>
          <div class="kpi-solid-sub">
              <span>% HT: {formatters.formatPercentage(pctDTT)}</span>
              <span class="group-hover:text-yellow-300 transition-colors">MT: {formatters.formatNumber(goals?.doanhThuThuc || 0)} <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
          </div>
          <div class="kpi-bg-icon"><i data-feather="dollar-sign"></i></div>
      </div>

      <div 
          class="kpi-card-solid card-2 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform relative group"
          on:click={() => openQuickGoal('doanhThuQD', 'Target DT Quy Đổi Realtime', goals?.doanhThuQD)}
          role="button" tabindex="0" title="Click để sửa mục tiêu"
      >
          <div class="kpi-solid-header">DT Quy Đổi <i data-feather="refresh-cw"></i></div>
          <div class="kpi-solid-value">{formatters.formatNumber((supermarketReport.doanhThuQuyDoi || 0) / 1000000, 1)}</div>
          <div class="kpi-solid-sub">
              <span>% HT: {formatters.formatPercentage(pctDTQD)}</span>
              <span class="group-hover:text-yellow-300 transition-colors">MT: {formatters.formatNumber(goals?.doanhThuQD || 0)} <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
          </div>
          <div class="kpi-bg-icon"><i data-feather="refresh-cw"></i></div>
      </div>

      <div 
          class="kpi-card-solid card-3 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform relative group"
          on:click={() => openQuickGoal('phanTramQD', 'Mục tiêu % Quy Đổi Realtime', goals?.phanTramQD)}
          role="button" tabindex="0" title="Click để sửa mục tiêu"
      >
          <div class="kpi-solid-header">Tỷ lệ Quy Đổi <i data-feather="trending-up"></i></div>
          <div class="kpi-solid-value">{formatters.formatPercentage(supermarketReport.hieuQuaQuyDoi || 0)}</div>
          <div class="kpi-solid-sub">
              <span class="group-hover:text-yellow-300 transition-colors">Mục tiêu: {formatters.formatNumber(goals?.phanTramQD || 0)}% <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
          </div>
          <div class="kpi-bg-icon"><i data-feather="trending-up"></i></div>
      </div>

      <div 
          class="kpi-card-solid card-4 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform relative group"
          on:click={() => openQuickGoal('phanTramTC', 'Mục tiêu % Trả chậm Realtime', goals?.phanTramTC)}
          role="button" tabindex="0" title="Click để sửa mục tiêu"
      >
          <div class="kpi-solid-header">Trả Chậm <i data-feather="credit-card"></i></div>
          <div class="kpi-solid-value">{formatters.formatPercentage(supermarketReport.tyLeTraCham || 0)}</div>
          <div class="kpi-solid-sub">
              <span>Doanh số: {formatters.formatNumber((supermarketReport.doanhThuTraGop || 0) / 1000000, 1)}</span>
              <span class="group-hover:text-yellow-300 transition-colors">MT: {formatters.formatNumber(goals?.phanTramTC || 0)}% <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
          </div>
          <div class="kpi-bg-icon"><i data-feather="credit-card"></i></div>
      </div>
  </div>

  <div class="luyke-tier-1-grid realtime-override">
      <EfficiencyTable 
          supermarketData={supermarketReport} 
          dynamicItems={combinedEfficiencyItems} 
          items={[]} 
          goals={goals}
          on:delete={handleDeleteMetric}
      />
      <QdcTable items={qdcItems} />
  </div>

  <div>
      <CategoryTable 
          items={categoryItems} 
          unexportedItems={unexportedItems}
          rawSource={rawSourceData}
      />
  </div>

</div>

<style>
    /* --- [FIX GENESIS] XỬ LÝ DỨT ĐIỂM LỖI CẮT XÉN ẢNH VÀ ĐỒNG BỘ 900PX --- */
    
    /* 1. Trả lại không gian cho máy ảnh (tạo lề nhỏ 16px cho viền ảnh đẹp, không bị lẹm) */
    :global(.capture-container:has(.realtime-override)) {
        width: max-content !important;
        min-width: 932px !important; /* 900px nội dung + 32px lề 2 bên */
        padding: 16px !important;
        margin: 0 auto !important;
        background-color: #f8fafc !important;
        box-sizing: border-box !important;
    }

    /* 2. Định hình khung nội dung chính chuẩn xác 900px */
    :global(.capture-container .preset-mobile-optimized) {
        width: 900px !important;
        min-width: 900px !important;
        max-width: 900px !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
    }

   /* 3. Ép 4 thẻ KPI vừa khít 900px, không rớt dòng */
    :global(.capture-container:has(.realtime-override) .kpi-grid-fixed) {
        width: 100% !important;
        display: flex !important;
        gap: 16px !important;
        margin: 0 auto 16px auto !important;
        box-sizing: border-box !important;
    }
    :global(.capture-container:has(.realtime-override) .kpi-grid-fixed > div) {
        flex: 1 !important;
    }

    /* 4. Ép 2 bảng giữa (Hiệu quả & Nhóm hàng) vừa khít 900px - ĐÃ MỞ KHÓA 480PX */
    :global(.capture-container .luyke-tier-1-grid.realtime-override) {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        gap: 16px !important;
        margin: 0 auto 16px auto !important;
        box-sizing: border-box !important;
        flex-direction: row !important;
    }

    /* 5. Khóa chặt bảng Ngành hàng bên dưới, bắt buộc ôm sát 100% (900px), không được phình to */
    :global(.capture-container .rt-cat-grid) {
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important; 
        margin: 0 !important;
    }
</style>