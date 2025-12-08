<script>
  import { realtimeYCXData, categoryNameMapping, macroCategoryConfig } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  import CategoryRevenueTable from './CategoryRevenueTable.svelte';

  export let selectedWarehouse = '';

  let filteredReport = [];
  let hasAnyData = false;

  $: {
      // [FIX] Lắng nghe thay đổi của mapping
      const _triggerMap = $categoryNameMapping;
      const _triggerMacro = $macroCategoryConfig;

      const settings = settingsService.getRealtimeGoalSettings(selectedWarehouse);
      const goals = settings.goals || {};
      const masterReport = reportService.generateMasterReportData($realtimeYCXData, goals, true);
      
      if (selectedWarehouse) {
          filteredReport = masterReport.filter(nv => nv.maKho == selectedWarehouse);
      } else {
          filteredReport = masterReport;
      }

      hasAnyData = filteredReport.some(item => 
          (item.dtICT || 0) > 0 || 
          (item.dtPhuKien || 0) > 0 || 
          (item.dtGiaDung || 0) > 0 || 
          (item.dtCE || 0) > 0 || 
          (item.dtBaoHiem || 0) > 0
      );
  }
</script>

<div class="animate-fade-in pb-10">
    {#if !hasAnyData}
        <div class="p-12 text-center bg-yellow-50 rounded-lg border border-yellow-200">
             <p class="text-yellow-700 font-semibold text-lg">Không tìm thấy doanh thu cho các ngành hàng chính.</p>
        </div>
    {:else}
     
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div data-capture-group="1">
                <CategoryRevenueTable 
                    title="ICT (Điện thoại - Laptop)" 
                    headerClass="category-header-ict"
                    reportData={filteredReport}
                    mainRevenueKey="dtICT"
                    mainQuantityKey="slICT"
                    subQuantityKeys={['slDienThoai', 'slLaptop']}
                    subQuantityLabels={['SL Điện thoại', 'SL Laptop']}
                />
            </div>

            <div data-capture-group="1">
                <CategoryRevenueTable 
                    title="PHỤ KIỆN" 
                    headerClass="category-header-phukien"
                    reportData={filteredReport}
                    mainRevenueKey="dtPhuKien"
                    mainQuantityKey="slPhuKien"
                    subQuantityKeys={['slPinSDP', 'slCamera', 'slTaiNgheBLT']}
                    subQuantityLabels={['SL Pin SDP', 'SL Camera', 'SL Tai nghe']}
                />
            </div>

            <div data-capture-group="2">
                <CategoryRevenueTable 
                    title="GIA DỤNG" 
                    headerClass="category-header-giadung"
                    reportData={filteredReport}
                    mainRevenueKey="dtGiaDung"
                    mainQuantityKey="slGiaDung"
                    subQuantityKeys={['slNoiChien', 'slMLN', 'slRobotHB']}
                    subQuantityLabels={['SL Nồi chiên', 'SL MLN', 'SL Robot HB']}
                />
            </div>

            <div data-capture-group="2">
                <CategoryRevenueTable 
                    title="CE (Điện tử - Điện lạnh)" 
                    headerClass="category-header-ce"
                    reportData={filteredReport}
                    mainRevenueKey="dtCE"
                    mainQuantityKey="slCE"
                    subQuantityKeys={['slTivi', 'slTuLanh', 'slMayGiat', 'slMayLanh']}
                    subQuantityLabels={['SL Tivi', 'SL Tủ lạnh', 'SL Máy giặt', 'SL Máy lạnh']}
                />
            </div>

            <div class="lg:col-span-2" data-capture-group="3">
                <CategoryRevenueTable 
                    title="DỊCH VỤ & BẢO HIỂM" 
                    headerClass="category-header-baohiem"
                    reportData={filteredReport}
                    mainRevenueKey="dtBaoHiem"
                    mainQuantityKey="slBaoHiem"
                    subQuantityKeys={['slBH1d1', 'slBHXM', 'slBHRV', 'slBHMR']}
                    subQuantityLabels={['BH 1 đổi 1', 'BH Xe máy', 'BH Rơi vỡ', 'BH Mở rộng']}
                />
            </div>
        </div>
    {/if}
</div>

<style>
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>