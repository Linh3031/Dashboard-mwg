<script>
  import { onMount, afterUpdate } from 'svelte';
  import {
    competitionData,
    selectedWarehouse,
    warehouseList,
    doanhThuBIData,
    danhSachNhanVien,
    luykeGoalSettings,
    macroCategoryConfig,
    macroProductGroupConfig,
    efficiencyConfig,
    qdcConfigStore,
    modalState,
    warehouseCustomMetrics
  } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  import { reportService } from '../../services/reportService.js';
  import { adminService } from '../../services/admin.service.js';
  import { datasyncService } from '../../services/datasync.service.js';
  import { settingsService } from '../../services/settings.service.js';
  
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
  let uniqueChiTietKho = [];
  let competitionBreakdown = [];

  let channelStats = { dxm: { val: 0, pct: 0 }, tgdd: { val: 0, pct: 0 } };
  let combinedEfficiencyItems = [];

  onMount(async () => {
      const savedEffConfig = await adminService.loadEfficiencyConfig();
      if(savedEffConfig.length > 0) efficiencyConfig.set(savedEffConfig);
      
      const savedQdcConfig = await adminService.loadQdcConfig();
      if(savedQdcConfig.length > 0) qdcConfigStore.set(savedQdcConfig);
  });

  $: if ($selectedWarehouse) loadLocalMetrics($selectedWarehouse);

  async function loadLocalMetrics(kho) {
      const localData = await datasyncService.loadCustomMetrics(kho);
      warehouseCustomMetrics.set(localData);
  }

  $: combinedEfficiencyItems = [
      ...($efficiencyConfig || []).map(i => ({ ...i, isSystem: true, target: goals?.[i.id] || i.target })),
      ...($warehouseCustomMetrics || []).map(i => ({ ...i, isSystem: false, target: goals?.[i.id] || i.target }))
  ];

  function getTenKho(maKho) {
      const found = ($danhSachNhanVien || []).find(e => String(e.maKho || e.ma_kho || '').trim() === String(maKho).trim());
      return (found && (found.tenKho || found.ten_kho)) || `Siêu thị ${maKho}`;
  }

  // Đảm bảo đã tải Mục tiêu (Target) của từng kho trong cụm — loadGoalsFromCloud ở component cha
  // chỉ tải theo $selectedWarehouse, mà ở đây $selectedWarehouse = 'ALL' không phải kho thật.
  $: {
      const khoList = ($warehouseList || []).filter(w => w && w !== 'ALL' && !String(w).startsWith('CLUSTER_'));
      khoList.forEach(kho => {
          if (!$luykeGoalSettings[kho]) settingsService.loadGoalsFromCloud(kho);
      });
  }

  $: {
    localSupermarketReport = supermarketReport || {};

    // [MỚI] Doanh thu BI thay thế Báo cáo Cụm dán tay (đã bỏ) — tổng hợp trực tiếp từng kho trong
    // cụm rồi cộng lại, dùng đúng công thức đã chạy đúng ở màn hình 1 siêu thị (LuykeSieuThi.svelte).
    const khoList = ($warehouseList || []).filter(w => w && w !== 'ALL' && !String(w).startsWith('CLUSTER_'));

    const now = new Date();
    const pastDays = now.getDate() > 1 ? now.getDate() - 1 : 1;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let sumDtThuc = 0, sumDtQd = 0, sumDtGop = 0, sumTb3ThangQD = 0;
    let sumTargetThuc = 0, sumTargetQD = 0, sumDtDuKien = 0, sumDtQdDuKien = 0;
    let compTotalAll = 0, compDatAll = 0;
    const chiTietList = [];
    const compBreakdownList = [];

    khoList.forEach(kho => {
        const rows = ($doanhThuBIData || []).filter(r => String(r.maKho) === String(kho));
        let dtThuc = 0, dtQd = 0, dtGop = 0, tb3ThangQD = 0;
        rows.forEach(row => {
            // Mẫu file mới (1 dòng/siêu thị, không cột Cấp dòng) cộng thẳng; mẫu cũ (nhiều dòng
            // Cấp dòng=CATEGORY) vẫn tương thích ngược — giống hệt LuykeSieuThi.svelte.
            if (!row.capDong || String(row.capDong).toUpperCase() === 'CATEGORY') {
                dtThuc += parseFloat(row.doanhThu || 0);
                dtQd += parseFloat(row.doanhThuQD || 0);
                dtGop += parseFloat(row.dtTraGop || 0);
                tb3ThangQD += parseFloat(row.tb3ThangQD || 0);
            }
        });

        const khoGoals = $luykeGoalSettings[kho] || {};
        const targetThuc = parseFloat(khoGoals.doanhThuThuc || 0);
        const targetQD = parseFloat(khoGoals.doanhThuQD || 0);

        const dtDuKien = (dtThuc / pastDays) * daysInMonth;
        const dtQdDuKien = (dtQd / pastDays) * daysInMonth;

        sumDtThuc += dtThuc; sumDtQd += dtQd; sumDtGop += dtGop; sumTb3ThangQD += tb3ThangQD;
        sumTargetThuc += targetThuc; sumTargetQD += targetQD;
        sumDtDuKien += dtDuKien; sumDtQdDuKien += dtQdDuKien;

        // Thi đua ngành hàng không cộng dồn được vì mỗi kho có chương trình khác nhau — chỉ cộng
        // số đạt/tổng để hiển thị 1 thẻ chung, đồng thời giữ riêng theo từng kho để tách thẻ.
        const compForKho = ($competitionData || []).filter(d => String(d.maKho || '').trim() === String(kho));
        const datForKho = compForKho.filter(d => (parseFloat(String(d.hoanThanhDuKien || '0').replace('%','')) || 0) >= 100).length;
        compTotalAll += compForKho.length;
        compDatAll += datForKho;
        compBreakdownList.push({
            maKho: kho,
            tenKho: getTenKho(kho),
            dat: datForKho,
            total: compForKho.length,
            tyLeDat: compForKho.length > 0 ? (datForKho / compForKho.length) : 0
        });

        const tangTruongTB3T = tb3ThangQD > 0 ? (dtQd / tb3ThangQD) - 1 : 0;
        chiTietList.push({
            maKho: kho,
            tenKho: getTenKho(kho),
            dtqdLK: dtQd,
            dtThucLK: dtThuc,
            tyTrongTraCham: dtThuc > 0 ? `${Math.round((dtGop / dtThuc) * 100)}%` : '0%',
            tangTruongTB3T: `${(tangTruongTB3T * 100).toFixed(1)}%`,
            tyLeTargetDuKien: targetQD > 0 ? `${Math.round((dtQdDuKien / targetQD) * 100)}%` : '0%'
        });
    });

    const finalTyLeQd = sumDtThuc > 0 ? (sumDtQd / sumDtThuc) - 1 : 0;
    const finalTyLeGop = sumDtThuc > 0 ? (sumDtGop / sumDtThuc) : 0;
    const phanTramTargetQd = sumTargetQD > 0 ? (sumDtQdDuKien / sumTargetQD) : 0;
    const phanTramTargetThuc = sumTargetThuc > 0 ? (sumDtDuKien / sumTargetThuc) : 0;

    // Mục tiêu % ngưỡng (Hiệu quả QĐ / Trả chậm) là cấu hình riêng theo từng kho — lấy trung bình
    // các kho đã cấu hình trong cụm để hiển thị tham chiếu chung.
    const avgGoalPct = (field) => {
        const vals = khoList.map(k => parseFloat(($luykeGoalSettings[k] || {})[field] || 0)).filter(v => v > 0);
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    localGoals = { ...(goals || {}), doanhThuThuc: sumTargetThuc, doanhThuQD: sumTargetQD, phanTramQD: avgGoalPct('phanTramQD'), phanTramTC: avgGoalPct('phanTramTC') };

    competitionSummary.total = compTotalAll;
    competitionSummary.dat = compDatAll;
    const tyLeThiDuaDat = compTotalAll > 0 ? compDatAll / compTotalAll : 0;

    luykeCardData = {
      dtThucLK: sumDtThuc, dtQdLK: sumDtQd, phanTramQd: finalTyLeQd, dtGop: sumDtGop,
      phanTramGop: finalTyLeGop, dtThucDuKien: sumDtDuKien, dtQdDuKien: sumDtQdDuKien,
      phanTramTargetQd: phanTramTargetQd, phanTramTargetThuc: phanTramTargetThuc,
      chuaXuatQuyDoi: localSupermarketReport.doanhThuQuyDoiChuaXuat || 0,
      tyLeThiDuaDat: tyLeThiDuaDat, targetQD: sumTargetQD
    };

    const tangTruongTB3TTotal = sumTb3ThangQD > 0 ? (sumDtQd / sumTb3ThangQD) - 1 : 0;
    comparisonData = {
        value: sumDtQd - sumTb3ThangQD,
        percentage: sumTb3ThangQD > 0 ? `${(tangTruongTB3TTotal * 100).toFixed(1)}%` : '0.0%'
    };

    uniqueChiTietKho = chiTietList;
    competitionBreakdown = compBreakdownList;

    const calcChannelStat = (keywords) => {
        const groupConfig = ($macroCategoryConfig || []).find(g => {
            if (!g.name) return false;
            const normName = g.name.trim().toLowerCase().normalize("NFC");
            return keywords.some(k => normName.includes(k));
        });
        if (!groupConfig || !groupConfig.items) return 0;
        const details = localSupermarketReport.nganhHangChiTiet || {};
        let totalVal = 0;
        groupConfig.items.forEach(itemId => { if (details[itemId]) totalVal += (details[itemId].revenueQuyDoi || 0); });
        return totalVal;
    };

    const valDXM = calcChannelStat(['đmx', 'dmx', 'dien may xanh']);
    const valTGDD = calcChannelStat(['tgdd', 'the gioi di dong']);
    const totalChannelRevenue = (valDXM + valTGDD) || 1; 

    channelStats = { dxm: { val: valDXM, pct: valDXM / totalChannelRevenue }, tgdd: { val: valTGDD, pct: valTGDD / totalChannelRevenue } };
    chuaXuatReport = reportService.generateLuyKeChuaXuatReport(filteredYCXData);
    
    qdcItems = Object.entries(localSupermarketReport.nhomHangChiTiet || {}).map(([id, values]) => ({ id: id, name: values.name, dtqd: values.revenueQuyDoi, sl: values.quantity, dt: values.revenue, ...values }));
    categoryItems = Object.entries(localSupermarketReport.nganhHangChiTiet || {}).map(([id, values]) => ({ id: id, name: values.name, dtqd: values.revenueQuyDoi, ...values }));
  }

  function openAddEffModal() { modalState.update(s => ({ ...s, activeModal: 'add-efficiency-modal', payload: null })); }
  function handleEditEffConfig(event) { modalState.update(s => ({ ...s, activeModal: 'add-efficiency-modal', payload: event.detail })); }
  async function handleDeleteEffConfig(event) {
      const id = event.detail;
      const isSystem = $efficiencyConfig.some(i => i.id === id);
      if (isSystem) return alert("Đây là chỉ số hệ thống, bạn không thể xóa. Hãy dùng bộ lọc để ẩn nó đi.");
      if (confirm("Xóa chỉ số cá nhân này?")) {
          const newLocalMetrics = $warehouseCustomMetrics.filter(i => i.id !== id);
          warehouseCustomMetrics.set(newLocalMetrics);
          if ($selectedWarehouse) await datasyncService.saveCustomMetrics($selectedWarehouse, newLocalMetrics);
      }
  }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="luyke-dashboard-container">
  
  <div>
      <h2 id="luyke-supermarket-title" class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <i data-feather="bar-chart" class="text-indigo-600"></i> Báo cáo Lũy kế Tổng Hợp Cụm
      </h2>

      <div class="exclusive-sieuthi-capture">
          <KpiBoard
              {luykeCardData}
              {localGoals}
              {competitionSummary}
              {comparisonData}
              {luotKhachData}
              {channelStats}
              {competitionBreakdown}
              captureFilename="TongHopCum"
              targetQdValue={luykeCardData.targetQD}
          />
      </div>
  </div>

  <div class="exclusive-sieuthi-capture">
      <DailyTargetSimulator 
        totalTarget={luykeCardData.targetQD || 0}
        currentRevenue={luykeCardData.dtQdLK || 0}
        warehouseId={'ALL'}
      />
  </div>

{#if uniqueChiTietKho && uniqueChiTietKho.length > 0}
    <!-- [UI REDESIGN]: Phân tách màu nền (bg-slate-100) để nổi khối danh sách ngang -->
    <!-- [PHẪU THUẬT LOGIC]: Đổi data-capture-group từ "kpi" thành "chi-tiet-kho" để ngắt liên kết ghép ảnh với KpiBoard -->
    <div class="mt-0 mb-6 bg-slate-100 border border-slate-200 rounded-xl p-4 md:p-5 exclusive-sieuthi-capture" data-capture-group="chi-tiet-kho" data-capture-filename="ChiTietCacKho">
        <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i data-feather="server" class="text-indigo-600 w-5 h-5"></i>
            Chi Tiết Từng Kho
        </h3>
        
        <div class="flex flex-col gap-3">
            {#each uniqueChiTietKho as kho}
                <!-- [PHẪU THUẬT LOGIC]: Gắn class capture-kho-card vào Wrapper -->
                <div class="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full capture-kho-card">
                    
                    <!-- Phân khu 1: Tên Kho (Trái) - Gắn class capture-kho-name -->
                    <div class="font-bold text-indigo-700 text-sm md:text-base md:w-1/4 break-words leading-tight capture-kho-name">
                        {kho.tenKho}
                    </div>
                    
                    <!-- Phân khu 2: Lưới Chỉ Số (Giữa) - Gắn class capture-kho-stats -->
                    <div class="flex-grow grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-2 w-full text-sm capture-kho-stats">
                        <div class="flex flex-col">
                            <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">DTQĐ Lũy Kế</span>
                            <span class="font-black text-blue-700 text-sm">{formatters.formatNumber(kho.dtqdLK, 0)}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">DT Thực LK</span>
                            <span class="font-bold text-gray-700 text-sm">{formatters.formatNumber(kho.dtThucLK, 0)}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Trả Chậm</span>
                            <span class="font-bold text-orange-600 text-sm">{kho.tyTrongTraCham}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Tăng trưởng TB3T</span>
                            <span class="font-bold text-sm {kho.tangTruongTB3T.includes('-') ? 'text-red-500' : 'text-green-600'} flex items-center gap-1">
                                {#if kho.tangTruongTB3T.includes('-')}<i data-feather="trending-down" class="w-3 h-3"></i>{:else}<i data-feather="trending-up" class="w-3 h-3"></i>{/if}
                                {kho.tangTruongTB3T}
                            </span>
                        </div>
                    </div>

                    <!-- Phân khu 3: Tỷ Lệ Hoàn Thành (Phải) - Gắn class capture-kho-percent -->
                    <div class="flex-shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 pl-0 md:pl-6 mt-1 md:mt-0 min-w-[100px] capture-kho-percent">
                        <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tỷ lệ HT</span>
                        <span class="text-2xl font-black {kho.tyLeTargetDuKien.includes('-') ? 'text-red-600' : 'text-green-600'}">
                            {kho.tyLeTargetDuKien}
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    </div>
  {/if}

  <div class="luyke-tier-1-grid exclusive-sieuthi-capture" data-capture-group="tier1" data-capture-filename="HIỆU QUẢ KHAI THÁC">
      <LuykeEfficiencyTable items={[]} dynamicItems={combinedEfficiencyItems} supermarketData={localSupermarketReport} goals={localGoals} on:add={openAddEffModal} on:edit={handleEditEffConfig} on:delete={handleDeleteEffConfig}/>
      <LuykeQdcTable items={qdcItems} numDays={numDays} />
  </div>

  <div data-capture-group="tier2" data-capture-filename="CHI TIẾT NGÀNH HÀNG">
      <LuykeCategoryTable items={categoryItems} unexportedItems={chuaXuatReport} rawSource={filteredYCXData} {numDays} />
  </div>

</div>

<style>
    /* BỘ GIÁP CHỐNG VỠ GIAO DIỆN KHI CHỤP ẢNH (HTML2CANVAS) */
    :global(.capture-container .exclusive-sieuthi-capture) { 
        display: flex !important; 
        flex-direction: column !important; 
        gap: 16px !important; 
        width: 450px !important; /* KHÓA CỨNG BỀ NGANG FORM MOBILE */
        min-width: 450px !important; 
        max-width: 450px !important; 
        margin: 0 auto !important; 
    }
    
    :global(.capture-container .exclusive-sieuthi-capture .luyke-widget) { height: auto !important; min-height: max-content !important; display: block !important; }
    :global(.capture-container .exclusive-sieuthi-capture .h-full) { height: auto !important; }
    :global(.capture-container .exclusive-sieuthi-capture .custom-scrollbar), :global(.capture-container .exclusive-sieuthi-capture .luyke-widget-body) { max-height: none !important; height: auto !important; overflow: visible !important; }

    /* [PHẪU THUẬT LOGIC]: TÁI CẤU TRÚC KHỐI "CHI TIẾT TỪNG KHO" KHI CHỤP ẢNH TRONG MÔI TRƯỜNG 450px */
    :global(.capture-container .capture-kho-card) {
        flex-direction: column !important; /* Ép dọc thẻ cha để tránh chèn ép ngang */
        gap: 12px !important;
    }
    
    :global(.capture-container .capture-kho-name) {
        width: 100% !important;
        border-bottom: 1px dashed #cbd5e1 !important;
        padding-bottom: 8px !important;
    }
    
    :global(.capture-container .capture-kho-stats) {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important; /* Chia đều 2 cột rộng rãi thay vì 5 cột */
        width: 100% !important;
        gap: 16px 8px !important;
    }
    
    :global(.capture-container .capture-kho-percent) {
        width: 100% !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        border-top: 1px solid #e2e8f0 !important;
        border-left: none !important;
        padding-top: 12px !important;
        padding-left: 0 !important;
        margin-top: 4px !important;
    }
</style>