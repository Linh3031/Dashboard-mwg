<script>
  import { 
    realtimeYCXData, 
    selectedWarehouse, 
    efficiencyConfig, 
    warehouseCustomMetrics,
    modalState,
    realtimeGoalSettings,
    danhSachNhanVien
  } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  import { adminService } from '../../../services/admin.service.js';
  
  import QdcTable from './QdcTable.svelte';
  import CategoryTable from './CategoryTable.svelte';
  import EfficiencyTable from '../efficiency/EfficiencyTable.svelte';

  import { onMount, afterUpdate } from 'svelte';
  
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

  // --- [PHẪU THUẬT NGUYÊN TỬ]: TỪ ĐIỂN QUÉT TRUY VẾT TÊN SIÊU THỊ TOÀN DIỆN ---
  $: warehouseMap = {};
  $: {
      if ($danhSachNhanVien && $danhSachNhanVien.length > 0) {
          const newMap = {};
          $danhSachNhanVien.forEach(nv => {
              // Quét tìm mã kho linh hoạt dựa trên mọi biến thể key có thể xuất hiện
              let mk = nv.maKho || nv['Mã kho'] || nv.makho || nv.storeId || '';
              if (!mk) {
                  for (const key in nv) {
                      if (key.toLowerCase().replace(/\s+/g, '') === 'makho' || key.toLowerCase() === 'mã kho') {
                          mk = nv[key];
                          break;
                      }
                  }
              }
              const cleanMk = String(mk || '').trim();

              if (cleanMk) {
                  // Ưu tiên quét trường 'Tên kho' từ file CSV thô vừa tải lên
                  let tk = nv.tenKho || nv['Tên kho'] || nv.tenkho || nv.storeName || '';
                  if (!tk) {
                      for (const key in nv) {
                          const val = String(nv[key] || '').trim();
                          if (['ĐML', 'ĐMM', 'ĐMS', 'ĐMS3', 'TGD', 'TGDD', 'DMX', 'ARR'].some(kw => val.toUpperCase().includes(kw))) {
                              tk = val;
                              break; 
                          }
                      }
                  }
                  const cleanTk = String(tk || '').trim();
                  if (cleanTk) {
                      newMap[cleanMk] = cleanTk;
                  }
              }
          });
          warehouseMap = newMap;
      }
  }

  $: currentWarehouse = $selectedWarehouse ? $selectedWarehouse : 'ALL';
  let storeDetails = [];

  $: {
    const settings = $realtimeGoalSettings[currentWarehouse] || { goals: {}, timing: {} };
    const clusterGoals = settings.goals || {};

    const masterReport = reportService.generateMasterReportData($realtimeYCXData, clusterGoals, true);
    
    let filteredReport = masterReport;
    let filteredRawData = $realtimeYCXData;

    if (currentWarehouse && currentWarehouse !== 'ALL') {
      filteredReport = masterReport.filter(nv => String(nv.maKho) === String(currentWarehouse));
      const visibleEmployees = new Set(filteredReport.map(nv => String(nv.maNV)));
      filteredRawData = $realtimeYCXData.filter(row => {
          const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/);
          return msnvMatch && visibleEmployees.has(msnvMatch[1].trim());
      });
    }
    
    rawSourceData = filteredRawData;
    supermarketReport = reportService.aggregateReport(filteredReport, currentWarehouse);

    if (currentWarehouse === 'ALL') {
        const whSet = new Set(filteredReport.map(nv => String(nv.maKho)));
        let sumDTThuc = 0;
        let sumDTQD = 0;

        storeDetails = Array.from(whSet).filter(Boolean).sort().map(wh => {
            const cleanWhKey = String(wh).trim();
            const whReport = filteredReport.filter(nv => String(nv.maKho) === wh);
            const aggregated = reportService.aggregateReport(whReport, wh);
            
            const whSettings = $realtimeGoalSettings[wh] || { goals: {} };
            const whGoals = whSettings.goals || {};
            
            const targetDTT = parseFloat(whGoals.doanhThuThuc) || 0;
            const targetDTQD = parseFloat(whGoals.doanhThuQD) || 0;
            
            const targetTLTC = parseFloat(whGoals.phanTramTC) > 0 ? parseFloat(whGoals.phanTramTC) : (parseFloat(clusterGoals.phanTramTC) || 0);
            const targetTLQD = parseFloat(whGoals.phanTramQD) > 0 ? parseFloat(whGoals.phanTramQD) : (parseFloat(clusterGoals.phanTramQD) || 0);

            sumDTThuc += targetDTT;
            sumDTQD += targetDTQD;

            const tyLeHoanThanh = targetDTQD > 0 ? (aggregated.doanhThuQuyDoi / 1000000) / targetDTQD : 0;

            return {
                maKho: cleanWhKey,
                tenKho: warehouseMap[cleanWhKey] || `Siêu thị ${cleanWhKey}`,
                doanhThuQuyDoi: aggregated.doanhThuQuyDoi || 0,
                doanhThuTraGop: aggregated.doanhThuTraGop || 0,
                tyLeTraCham: aggregated.tyLeTraCham || 0,
                tyLeQuyDoi: aggregated.hieuQuaQuyDoi || 0,
                targetDTQD: targetDTQD,
                targetTLTC: targetTLTC,
                targetTLQD: targetTLQD,
                tyLeHoanThanh: tyLeHoanThanh
            };
        });

        const clusterDTT = parseFloat(clusterGoals.doanhThuThuc) || 0;
        const clusterDTQD = parseFloat(clusterGoals.doanhThuQD) || 0;

        goals = {
            ...clusterGoals,
            doanhThuThuc: clusterDTT > 0 ? clusterDTT : sumDTThuc,
            doanhThuQD: clusterDTQD > 0 ? clusterDTQD : sumDTQD
        };
    } else {
        goals = { ...clusterGoals };
        storeDetails = [];
    }

    qdcItems = supermarketReport.nhomHangChiTiet 
        ? Object.entries(supermarketReport.nhomHangChiTiet)
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
        ? Object.values(supermarketReport.nganhHangChiTiet).filter(i => i.revenue > 0 || i.quantity > 0)
        : [];

    unexportedItems = reportService.generateRealtimeChuaXuatReport(filteredRawData);
  }

  $: pctDTT = (parseFloat(goals?.doanhThuThuc) || 0) > 0 ? (supermarketReport.doanhThu / 1000000) / parseFloat(goals.doanhThuThuc) : 0;
  $: pctDTQD = (parseFloat(goals?.doanhThuQD) || 0) > 0 ? (supermarketReport.doanhThuQuyDoi / 1000000) / parseFloat(goals.doanhThuQD) : 0;

  function openQuickGoal(fieldId, title, currentValue, targetKho = null) {
      modalState.update(s => ({
          ...s,
          activeModal: 'quick-goal-modal',
          payload: { 
              fieldId, 
              title, 
              currentValue: currentValue || 0, 
              type: 'realtime',
              warehouse: targetKho ? String(targetKho) : String(currentWarehouse)
          }
      }));
  }

  afterUpdate(() => {
      if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="luyke-dashboard-container pb-10">
  
  <h2 id="realtime-supermarket-title" class="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
    <i data-feather="zap" class="text-yellow-500 fill-current"></i>
    Báo cáo Realtime {currentWarehouse !== 'ALL' ? `- Kho ${currentWarehouse}` : '(Toàn bộ Cụm)'}
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
              <span class="transition-colors">MT: {formatters.formatNumber(goals?.doanhThuThuc || 0)} <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
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
              <span class="transition-colors">MT: {formatters.formatNumber(goals?.doanhThuQD || 0)} <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
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

  {#if currentWarehouse === 'ALL' && storeDetails.length > 0}
  <div class="mt-4 mb-6 animate-fade-in w-full">
      <h3 class="text-sm sm:text-base font-bold text-white uppercase p-3 rounded-lg bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 shadow-md w-full flex items-center gap-2 tracking-wider">
          <i data-feather="server" class="w-4 h-4 text-indigo-200 fill-indigo-100/20"></i>
          Chi Tiết Từng Siêu Thị
      </h3>
      
      <div class="flex flex-col gap-2 w-full mt-3">
          {#each storeDetails as kho}
              {@const isBadTLTC = kho.targetTLTC > 0 && kho.tyLeTraCham < (kho.targetTLTC / 100)}
              {@const isBadTLQD = kho.targetTLQD > 0 && kho.tyLeQuyDoi < (kho.targetTLQD / 100)}
              
              <div class="bg-blue-50/40 border border-blue-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full capture-kho-card">
                  
                  <div class="font-bold text-indigo-900 text-sm md:w-1/4 break-words leading-tight capture-kho-name">
                      {kho.tenKho}
                  </div>
                  
                  <div class="flex-grow flex flex-row flex-nowrap justify-between items-center w-full text-sm capture-kho-stats">
                      
                      <div class="flex flex-col relative group cursor-pointer" on:click={() => openQuickGoal('doanhThuQD', `Mục tiêu DTQĐ - ${kho.tenKho}`, kho.targetDTQD, kho.maKho)} role="button" tabindex="0" title="Click sửa">
                          <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Target DTQĐ <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100 text-blue-500"></i></span>
                          <span class="font-bold text-gray-800 text-sm">{formatters.formatNumber(kho.targetDTQD, 1)}</span>
                      </div>
                      
                      <div class="flex flex-col">
                          <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">DT Quy Đổi</span>
                          <span class="font-black text-blue-700 text-sm">{formatters.formatNumber(kho.doanhThuQuyDoi / 1000000, 1)}</span>
                      </div>
  
                      <div class="flex flex-col">
                          <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">% Hoàn Thành</span>
                          <span class="font-bold text-sm {kho.tyLeHoanThanh >= 1 ? 'text-green-600' : 'text-orange-500'}">
                              {formatters.formatPercentage(kho.tyLeHoanThanh)}
                          </span>
                      </div>
                    
                      <div class="flex flex-col">
                          <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">DT Trả Chậm</span>
                          <span class="font-bold text-gray-700 text-sm">{formatters.formatNumber(kho.doanhThuTraGop / 1000000, 1)}</span>
                      </div>
                      
                      <div class="flex flex-col relative group cursor-pointer" on:click={() => openQuickGoal('phanTramTC', `Mục tiêu % Trả chậm - ${kho.tenKho}`, kho.targetTLTC, kho.maKho)} role="button" tabindex="0" title="Click sửa">
                          <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">TL Trả chậm <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100 text-blue-500"></i></span>
                          <span class="font-bold text-sm px-1.5 rounded {isBadTLTC ? 'text-red-600 bg-red-50 border border-red-100' : 'text-green-600'}">{formatters.formatPercentage(kho.tyLeTraCham)}</span>
                      </div>

                      <div class="flex flex-col relative group cursor-pointer" on:click={() => openQuickGoal('phanTramQD', `Mục tiêu % Quy Đổi - ${kho.tenKho}`, kho.targetTLQD, kho.maKho)} role="button" tabindex="0" title="Click sửa">
                          <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">TL Quy Đổi <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100 text-blue-500"></i></span>
                          <span class="font-bold text-sm px-1.5 rounded {isBadTLQD ? 'text-red-600 bg-red-50 border border-red-100' : 'text-green-600'}">{formatters.formatPercentage(kho.tyLeQuyDoi)}</span>
                      </div>
                      
                  </div>
              </div>
          {/each}
      </div>
  </div>
  {/if}

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
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    :global(.capture-container:has(.realtime-override)) {
        width: max-content !important;
        min-width: 932px !important; 
        padding: 16px !important;
        margin: 0 auto !important;
        background-color: #f8fafc !important;
        box-sizing: border-box !important;
    }

    :global(.capture-container .preset-mobile-optimized) {
        width: 900px !important;
        min-width: 900px !important;
        max-width: 900px !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
    }

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

    :global(.capture-container .rt-cat-grid) {
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important; 
        margin: 0 !important;
    }

    /* =========================================================================
       [PHẪU THUẬT LAYOUT SANITY]: ÉP DÒNG TUYỆT ĐỐI CHO KHỐI CỤM KHI CHỤP ẢNH 
       ========================================================================= */
    :global(.capture-container .capture-kho-card) {
        display: flex !important;
        flex-direction: row !important;      /* Xếp ngang */
        align-items: center !important;       /* Căn giữa dọc */
        justify-content: flex-start !important;
        flex-wrap: nowrap !important;         /* KHÔNG CHO PHÉP XUỐNG DÒNG */
        gap: 12px !important;
        background-color: #f0f7ff !important; /* Đổi màu nền pastel dịu mắt */
        padding: 8px 12px !important;
    }
    
    :global(.capture-container .capture-kho-name) {
        width: 200px !important;              /* Giới hạn chặt chiều rộng cột Tên kho */
        min-width: 200px !important;
        max-width: 200px !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        color: #1e40af !important;
        white-space: normal !important;
        word-break: break-all !important;
    }
    
    :global(.capture-container .capture-kho-stats) {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;         /* Ép các thông số nằm trên một hàng dọc */
        justify-content: space-between !important;
        align-items: center !important;
        flex-grow: 1 !important;
        gap: 4px !important;                  /* Thu gọn tối đa khoảng trống thừa giữa các chỉ số */
    }

    :global(.capture-container .capture-kho-stats > div) {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
    }

    :global(.capture-container .capture-kho-stats span) {
        white-space: nowrap !important;       /* Cấm chữ nội dung chỉ số tự ngắt dòng xuống dưới */
    }
</style>