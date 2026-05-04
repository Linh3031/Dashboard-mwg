<script>
  import { onMount, afterUpdate } from 'svelte';
  import { 
    competitionData, 
    selectedWarehouse,
    macroCategoryConfig,
    macroProductGroupConfig, 
    efficiencyConfig,
    qdcConfigStore,
    modalState,
    warehouseCustomMetrics,
    clusterSummaryData
  } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';
  import { reportService } from '../../services/reportService.js';
  import { adminService } from '../../services/admin.service.js';
  import { datasyncService } from '../../services/datasync.service.js';
  
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

  // Hàm tiện ích cắt đuôi số lẻ cho %
  const roundPct = (str) => {
      if (!str || str.includes('undefined')) return '0%';
      const num = parseFloat(str.replace(/,/g, '').replace('%', ''));
      return isNaN(num) ? '0%' : Math.round(num) + '%';
  };

  $: {
    localSupermarketReport = supermarketReport || {};
    localGoals = goals || {};

    const cluster = $clusterSummaryData || {};
    
    const finalDtThuc = (cluster.doanhThuThuc || 0) * 1000000;
    const finalDtQd = (cluster.doanhThuQuyDoi || 0) * 1000000;
    const finalDtGop = (cluster.dtTraCham || 0) * 1000000;
    const dtDuKienRaw = (cluster.doanhThuThucDuKien || 0) * 1000000;
    const dtQdDuKienRaw = (cluster.doanhThuQuyDoiDuKien || 0) * 1000000;
    
    const finalTyLeQd = finalDtThuc > 0 ? (finalDtQd / finalDtThuc) - 1 : 0;
    const finalTyLeGop = parseFloat(String(cluster.tyLeTraCham || '0').replace('%', '')) / 100;
    
    const targetThuc = parseFloat(localGoals?.doanhThuThuc || 0) * 1000000;
    const targetQD = (cluster.targetDTQD || 0) * 1000000; 

    const phanTramTargetQd = parseFloat(String(cluster.tyLeHoanThanh || '0').replace('%', '')) / 100;
    const phanTramTargetThuc = targetThuc > 0 ? (dtDuKienRaw / targetThuc) : 0;

    const compData = $competitionData || [];
    competitionSummary.total = compData.length;
    competitionSummary.dat = compData.filter(d => (parseFloat(String(d.hoanThanh).replace('%','')) || 0) >= 100).length;
    const tyLeThiDuaDat = competitionSummary.total > 0 ? competitionSummary.dat / competitionSummary.total : 0;

    luykeCardData = {
      dtThucLK: finalDtThuc, dtQdLK: finalDtQd, phanTramQd: finalTyLeQd, dtGop: finalDtGop,
      phanTramGop: finalTyLeGop, dtThucDuKien: dtDuKienRaw, dtQdDuKien: dtQdDuKienRaw, 
      phanTramTargetQd: phanTramTargetQd, phanTramTargetThuc: phanTramTargetThuc, 
      chuaXuatQuyDoi: localSupermarketReport.doanhThuQuyDoiChuaXuat || 0,
      tyLeThiDuaDat: tyLeThiDuaDat, targetQD: targetQD 
    };

    comparisonData = { value: cluster.dtckThangGiaTri || 0, percentage: cluster.dtckThangTangTruong || '0%' };
    luotKhachData = { value: cluster.luotKhachCKGiaTri || 0, percentage: cluster.luotKhachCKTangTruong || '0%' };

    // Lọc trùng và Cắt số lẻ
    if (cluster.chiTietKho && Array.isArray(cluster.chiTietKho)) {
        const seenNames = new Set();
        uniqueChiTietKho = cluster.chiTietKho.filter(kho => {
            const normalizedName = kho.tenKho.trim().toLowerCase();
            if (seenNames.has(normalizedName)) return false;
            seenNames.add(normalizedName);
            return true;
        }).map(kho => ({
            ...kho,
            tyTrongTraCham: roundPct(kho.tyTrongTraCham),
            tangTruongDTQDCungKy: roundPct(kho.tangTruongDTQDCungKy),
            tyLeTargetDuKien: roundPct(kho.tyLeTargetDuKien)
        }));
    } else {
        uniqueChiTietKho = [];
    }

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
                    <div class="flex-grow grid grid-cols-2 md:grid-cols-5 gap-y-3 gap-x-2 w-full text-sm capture-kho-stats">
                        <div class="flex flex-col">
                            <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">DT Hôm Qua</span>
                            <span class="font-bold text-gray-800 text-sm">{formatters.formatNumber(kho.dtHomQua, 0)}</span>
                        </div>
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
                            <span class="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Tăng trưởng CK</span>
                            <span class="font-bold text-sm {kho.tangTruongDTQDCungKy.includes('-') ? 'text-red-500' : 'text-green-600'} flex items-center gap-1">
                                {#if kho.tangTruongDTQDCungKy.includes('-')}<i data-feather="trending-down" class="w-3 h-3"></i>{:else}<i data-feather="trending-up" class="w-3 h-3"></i>{/if}
                                {kho.tangTruongDTQDCungKy}
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