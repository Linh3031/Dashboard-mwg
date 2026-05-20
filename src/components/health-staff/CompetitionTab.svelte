<script>
  import { onMount } from 'svelte';
  import { 
      ycxData, 
      globalCompetitionConfigs, 
      localCompetitionConfigs,
      pastedThiDuaReportData 
  } from '../../stores.js';
  import { services } from '../../services.js';

  import CompetitionModeSelector from './competition/CompetitionModeSelector.svelte';
  import ProgramView from './competition/ProgramView.svelte';
  import EmployeeView from './competition/EmployeeView.svelte';
  import CompetitionDetailView from './competition/CompetitionDetailView.svelte';

  // Import dịch vụ Quản lý Hàng đợi Chụp ngầm vật lý
  import { batchCaptureService } from '../../services/batchCapture.service.js';

  let activeView = 'employee'; 
  let programReportData = [];
  let isDetailView = false;
  let selectedEmployeeId = null;

  $: {
      if ($ycxData.length > 0) {
          const allConfigs = [...$globalCompetitionConfigs, ...$localCompetitionConfigs];
          programReportData = services.calculateCompetitionFocusReport($ycxData, allConfigs);
      } else {
          programReportData = [];
      }
  }

  function handleViewChange(event) {
      activeView = event.detail;
      isDetailView = false;
      selectedEmployeeId = null;
  }

  function handleViewDetail(event) {
      selectedEmployeeId = event.detail.employeeId;
      isDetailView = true;
  }

  function handleBackToList() {
      isDetailView = false;
      selectedEmployeeId = null;
  }

  // LOGIC XỬ LÝ CHỤP HÀNG LOẠT THI ĐUA (Đã tiêm allReportData chống trắng trang)
  function handleBatchCapture(event) {
      const mode = event.target.value;
      if (!mode) return;

      const baseData = $pastedThiDuaReportData || [];
      let targetData = [];

      if (mode === 'top5') targetData = baseData.slice(0, 5);
      else if (mode === 'bot5') targetData = baseData.slice(-5);
      else if (mode === 'all') targetData = baseData;

      const ids = targetData.map(item => item.maNV || item.employeeCode || item.id);
      
      batchCaptureService.captureBatch(
          CompetitionDetailView, 
          ids, 
          "ThiDua_ChiTiet", 
          (id) => ({ 
              employeeId: id,
              allReportData: baseData
          })
      );

      event.target.value = ""; // Reset dropdown
  }
</script>

<div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-purple-100 rounded-lg text-purple-600">
                <i data-feather="award" class="w-5 h-5"></i>
            </div>
            <div>
                 <h3 class="text-lg font-bold text-gray-800 uppercase leading-tight">Thi Đua Lũy Kế</h3>
                <p class="text-xs text-gray-500">Theo dõi tiến độ các chương trình thi đua</p>
            </div>
        </div>
        
        <div class="flex items-center gap-4">
            {#if activeView === 'employee'}
                <div class="relative flex items-center">
                    <div class="absolute left-3 text-purple-600 pointer-events-none flex items-center justify-center">
                        <i data-feather="camera" class="w-4 h-4"></i>
                    </div>
                    <select class="text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm py-2 pl-9 pr-8 focus:outline-none focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
                            on:change={handleBatchCapture}>
                        <option value="" disabled selected>Chụp Hàng Loạt</option>
                        <option value="top5">Chụp Top 5 NV</option>
                        <option value="bot5">Chụp Bot 5 NV</option>
                        <option value="all">Chụp Tất Cả</option>
                    </select>
                </div>
            {/if}

            <CompetitionModeSelector {activeView} on:change={handleViewChange} />
        </div>
    </div>

    <div class="min-h-[400px]">
        {#if activeView === 'program'}
             <ProgramView reportData={programReportData} />
        {:else}
            {#if isDetailView && selectedEmployeeId}
                <CompetitionDetailView 
                    employeeId={selectedEmployeeId}
                    allReportData={$pastedThiDuaReportData}
                     on:back={handleBackToList}
                />
            {:else}
                <EmployeeView 
                    reportData={$pastedThiDuaReportData} 
                    on:viewChange={(e) => activeView = e.detail}
                    on:viewDetail={handleViewDetail} 
                />
            {/if}
        {/if}
    </div>
</div>