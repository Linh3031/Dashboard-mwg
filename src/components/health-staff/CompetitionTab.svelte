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
  // [NEW] Import view chi tiết mới
  import CompetitionDetailView from './competition/CompetitionDetailView.svelte';

  // [YÊU CẦU] Mặc định vào là xem theo nhân viên
  let activeView = 'employee'; 
  let programReportData = [];
  
  // [NEW] State cho view chi tiết
  let isDetailView = false;
  let selectedEmployeeId = null;

  // Logic tính toán cho Program View (Tự động khi YCX hoặc Config thay đổi)
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
      // Reset về list khi đổi tab con
      isDetailView = false;
      selectedEmployeeId = null;
  }

  // [NEW] Xử lý khi click vào nhân viên
  function handleViewDetail(event) {
      selectedEmployeeId = event.detail.employeeId;
      isDetailView = true;
  }

  // [NEW] Xử lý quay lại
  function handleBackToList() {
      isDetailView = false;
      selectedEmployeeId = null;
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
        
        <CompetitionModeSelector {activeView} on:change={handleViewChange} />
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