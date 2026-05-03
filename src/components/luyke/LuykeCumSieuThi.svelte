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
  
  // [NEW] Gắn Module KpiBoard vào
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

    if (cluster.chiTietKho && Array.isArray(cluster.chiTietKho)) {
        const seenNames = new Set();
        uniqueChiTietKho = cluster.chiTietKho.filter(kho => {
            const normalizedName = kho.tenKho.trim().toLowerCase();
            if (seenNames.has(normalizedName)) return false;
            seenNames.add(normalizedName);
            return true;
        });
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

      <!-- [SỰ KỲ DIỆU Ở ĐÂY]: Gắn vật tư vào Module KpiBoard -->
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

  <DailyTargetSimulator 
    totalTarget={luykeCardData.targetQD || 0}
    currentRevenue={luykeCardData.dtQdLK || 0}
    warehouseId={'ALL'}
  />

  {#if uniqueChiTietKho && uniqueChiTietKho.length > 0}
    <div class="mt-4 mb-6" data-capture-group="kpi" data-capture-filename="ChiTietCacKho">
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <i data-feather="list" class="text-indigo-600 w-5 h-5"></i>
            Chi Tiết Từng Kho
        </h3>
        
        <div class="flex flex-col gap-3">
            {#each uniqueChiTietKho as kho}
                <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
                    
                    <div class="font-bold text-indigo-700 text-base md:w-1/4 break-words">{kho.tenKho}</div>
                    
                    <div class="flex-grow grid grid-cols-2 md:grid-cols-5 gap-y-3 gap-x-2 w-full text-sm">
                        <div class="flex flex-col"><span class="text-gray-400 font-semibold text-[10px] uppercase">DT Hôm Qua</span><span class="font-bold text-gray-800">{formatters.formatNumber(kho.dtHomQua, 0)}</span></div>
                        <div class="flex flex-col"><span class="text-gray-400 font-semibold text-[10px] uppercase">DTQĐ Lũy Kế</span><span class="font-black text-blue-700">{formatters.formatNumber(kho.dtqdLK, 0)}</span></div>
                        <div class="flex flex-col"><span class="text-gray-400 font-semibold text-[10px] uppercase">DT Thực LK</span><span class="font-bold text-gray-700">{formatters.formatNumber(kho.dtThucLK, 0)}</span></div>
                        <div class="flex flex-col"><span class="text-gray-400 font-semibold text-[10px] uppercase">Trả Chậm</span><span class="font-bold text-orange-600">{kho.tyTrongTraCham}</span></div>
                        <div class="flex flex-col"><span class="text-gray-400 font-semibold text-[10px] uppercase">Tăng trưởng Cùng kỳ QĐ</span>
                            <span class="font-bold {kho.tangTruongDTQDCungKy.includes('-') ? 'text-red-500' : 'text-green-600'} flex items-center gap-1">
                                {#if kho.tangTruongDTQDCungKy.includes('-')}<i data-feather="trending-down" class="w-3 h-3"></i>{:else}<i data-feather="trending-up" class="w-3 h-3"></i>{/if}
                                {kho.tangTruongDTQDCungKy}
                            </span>
                        </div>
                    </div>

                    <div class="flex-shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 pl-0 md:pl-6 mt-1 md:mt-0">
                        <span class="text-xs text-gray-500 font-bold uppercase tracking-wider">Tỷ lệ HT (QĐ)</span>
                        <span class="text-2xl lg:text-3xl font-black {kho.tyLeTargetDuKien.includes('-') ? 'text-red-600' : 'text-green-600'}">{kho.tyLeTargetDuKien}</span>
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
    :global(.capture-container .exclusive-sieuthi-capture) { display: flex !important; flex-direction: column !important; gap: 16px !important; width: 450px !important; min-width: 450px !important; max-width: 450px !important; margin: 0 auto !important; }
    :global(.capture-container .exclusive-sieuthi-capture .luyke-widget) { height: auto !important; min-height: max-content !important; display: block !important; }
    :global(.capture-container .exclusive-sieuthi-capture .h-full) { height: auto !important; }
    :global(.capture-container .exclusive-sieuthi-capture .custom-scrollbar), :global(.capture-container .exclusive-sieuthi-capture .luyke-widget-body) { max-height: none !important; height: auto !important; overflow: visible !important; }
</style>