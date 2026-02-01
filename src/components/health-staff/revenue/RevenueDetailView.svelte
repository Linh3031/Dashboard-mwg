<script>
  import { createEventDispatcher } from 'svelte';
  import { masterReportData, ycxData, modalState } from '../../../stores.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  import { formatters } from '../../../utils/formatters.js';
  import DetailHeader from '../detail/DetailHeader.svelte';
  import RevenueKpiBoard from './RevenueKpiBoard.svelte';
  import DailyPerfChart from './DailyPerfChart.svelte';
  import RevenueTopGroups from './RevenueTopGroups.svelte';

  export let employeeId;
  const dispatch = createEventDispatcher();

  let detailData = null;
  let employeeData = null;
  let goals = {};
  $: if (employeeId && $ycxData.length > 0) {
      employeeData = $masterReportData.sknv.find(e => String(e.maNV) === String(employeeId));
      if (employeeData) {
          const settings = settingsService.getLuykeGoalSettings(employeeData.maKho);
          goals = settings.goals || {};
          detailData = reportService.generateLuyKeEmployeeDetailReport(employeeId, $ycxData);
      }
  }

  function goBack() { 
      dispatch('back');
  }

  function openUnexportedModal() {
      if (detailData) {
          modalState.update(s => ({ 
              ...s, 
              activeModal: 'unexported-detail-modal',
              payload: { unexportedDetails: detailData.unexportedDetails || [] }
          }));
      }
  }

  function openOrdersModal() {
      if (detailData) {
          modalState.update(s => ({ 
              ...s, 
              activeModal: 'customer-detail-modal',
              payload: { 
                  customers: detailData.byCustomer || [],
                  mucTieu: employeeData ? employeeData.mucTieu : {}
              }
          }));
      }
  }
</script>

<div 
    class="animate-fade-in pb-10 max-w-7xl mx-auto"
    data-capture-group="revenue-detail-mobile"
    data-capture-filename={employeeData ? `DTLK_ChiTiet_${employeeData.hoTen}_${employeeData.maNV}` : 'ChiTietNhanVien'}
>
    <div class="mb-4 flex justify-between items-center">
        <button on:click={goBack} class="text-blue-600 hover:underline font-semibold flex items-center gap-1">
            <i data-feather="chevron-left" class="w-4 h-4"></i> Quay lại bảng tổng hợp
        </button>
    </div>

    {#if employeeData && detailData}
        <DetailHeader employee={employeeData} showStats={false} />
        
        <RevenueKpiBoard 
            summary={detailData.summary} 
            {goals} 
            on:viewUnexported={openUnexportedModal}
            on:viewOrders={openOrdersModal}
        />
        
        <DailyPerfChart dailyStats={detailData.dailyStats} />
        
        <RevenueTopGroups 
            topProductGroups={detailData.topProductGroups} 
            categoryChartData={detailData.categoryChartData} 
        />

    {:else}
        <div class="p-12 text-center bg-red-50 rounded-lg border border-red-200">
            <p class="text-red-600 font-semibold">Không tìm thấy dữ liệu chi tiết cho nhân viên này.</p>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>