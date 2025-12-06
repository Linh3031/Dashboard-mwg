<script>
  import { onMount, afterUpdate } from 'svelte';
  import { masterReportData, ycxData, danhSachNhanVien, luykeGoalSettings, selectedWarehouse } from '../stores.js';
  import { sknvService } from '../services/sknv.service.js';
  import { reportService } from '../services/reportService.js';
  
  import SummaryView from './health-staff/summary/SummaryView.svelte';
  import DetailView from './health-staff/detail/DetailView.svelte';
  import RevenueTable from './health-staff/RevenueTable.svelte';
  import RevenueDetailView from './health-staff/revenue/RevenueDetailView.svelte'; // [MỚI] Import Detail View
  import IncomeTable from './health-staff/IncomeTable.svelte';
  import EfficiencyTable from './health-staff/EfficiencyTable.svelte';
  import CategoryRevenueView from './health-staff/CategoryRevenueView.svelte';
  
  import CompetitionTab from './health-staff/CompetitionTab.svelte';

  export let activeTab;

  let activeSubTab = 'sknv';
  let viewingDetailId = null;
  let processedReport = [];

  const tabs = [
      { id: 'sknv', label: 'SKNV', icon: 'users' },
      { id: 'doanhthu', label: 'Doanh thu LK', icon: 'dollar-sign' },
      { id: 'thunhap', label: 'Thu nhập', icon: 'briefcase' },
      { id: 'hieuqua', label: 'Hiệu quả NV LK', icon: 'bar-chart-2' },
      { id: 'nganhhang', label: 'DT ngành hàng', icon: 'layers' },
      { id: 'thidua', label: 'Thi đua NV LK', icon: 'award' }
  ];

  let lastDataHash = ''; 
  $: {
      if ($danhSachNhanVien.length > 0 && $ycxData.length > 0) {
          const currentHash = `${$danhSachNhanVien.length}-${$ycxData.length}-${$selectedWarehouse}`;
          if (currentHash !== lastDataHash) {
              lastDataHash = currentHash;
              const goals = ($luykeGoalSettings && $selectedWarehouse) ? $luykeGoalSettings[$selectedWarehouse] || {} : {};
              const newMasterReport = reportService.generateMasterReportData($ycxData, goals, false);
              masterReportData.update(current => ({ ...current, sknv: newMasterReport }));
          }
      }
  }

  $: {
      let rawData = $masterReportData.sknv || [];
      if ($selectedWarehouse) rawData = rawData.filter(nv => nv.maKho === $selectedWarehouse);
      processedReport = sknvService.processReportData(rawData);
  }

  function switchSubTab(tabId) { activeSubTab = tabId; viewingDetailId = null; }
  function handleEmployeeClick(event) { viewingDetailId = event.detail.employeeId; }
  function handleBackToSummary() { viewingDetailId = null; }
  function handleCompose() { alert("Chức năng Nhận xét đang cập nhật."); }
  function handleExport() { alert("Chức năng Xuất Excel đang cập nhật."); }
  function handleCapture() { alert("Chức năng Chụp màn hình đang cập nhật."); }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<section id="health-employee-section" class="page-section {activeTab === 'health-employee-section' ? '' : 'hidden'}">
    
    <div class="content-card mb-6">
        <div class="page-header border-b pb-4 mb-4">
            <h2 class="page-header__title">Sức khỏe nhân viên</h2>
            <button class="page-header__help-btn" data-help-id="sknv" title="Xem hướng dẫn"><i data-feather="help-circle"></i></button>
        </div>
        
        <button class="toggle-filters-btn mb-4"><span class="text">Hiện bộ lọc nâng cao</span><i data-feather="chevron-down" class="icon"></i></button>
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <nav class="border-b border-gray-200 -mb-px flex space-x-4 overflow-x-auto w-full md:w-auto pb-1 md:pb-0" aria-label="Tabs">
                {#each tabs as tab}
                    <button 
                        class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm 
                               flex items-center gap-2 transition-colors
                               {activeSubTab === tab.id ? 'active border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                        on:click={() => switchSubTab(tab.id)}
                    >
                        <i data-feather={tab.icon} class="w-4 h-4"></i>
                        <span>{tab.label}</span>
                    </button>
                {/each}
            </nav>
            <div class="flex items-center gap-2 flex-shrink-0">
                <button class="action-btn action-btn--composer" title="Nhận xét" on:click={handleCompose}><i data-feather="pen-tool"></i><span class="hidden sm:inline">Nhận xét</span></button>
                <button class="action-btn action-btn--export" title="Xuất Excel" on:click={handleExport}><i data-feather="download"></i><span class="hidden sm:inline">Xuất Excel</span></button>
                <button class="action-btn action-btn--capture" title="Chụp ảnh" on:click={handleCapture}><i data-feather="camera"></i><span class="hidden sm:inline">Chụp</span></button>
            </div>
        </div>
    </div>

    <div id="employee-subtabs-content" class="min-h-[500px]">
        {#if activeSubTab === 'sknv'}
            {#if !viewingDetailId}
                <SummaryView reportData={processedReport} on:click={handleEmployeeClick} />
            {:else}
                <DetailView employeeId={viewingDetailId} on:back={handleBackToSummary} />
            {/if}

        {:else if activeSubTab === 'doanhthu'}
            {#if !viewingDetailId}
                <RevenueTable 
                    reportData={processedReport} 
                    on:viewDetail={handleEmployeeClick} 
                />
            {:else}
                <RevenueDetailView 
                    employeeId={viewingDetailId} 
                    on:back={handleBackToSummary} 
                />
            {/if}

        {:else if activeSubTab === 'thunhap'}
            <IncomeTable reportData={processedReport} />
        {:else if activeSubTab === 'hieuqua'}
            <EfficiencyTable reportData={processedReport} />
        {:else if activeSubTab === 'nganhhang'}
            <CategoryRevenueView reportData={processedReport} />
        {:else if activeSubTab === 'thidua'}
            <CompetitionTab />
        {:else}
            <div class="p-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
                <p class="text-gray-500">Nội dung đang cập nhật.</p>
            </div>
        {/if}
    </div>
</section>

<style>
    .sub-tab-btn.active i { color: #2563eb; }
</style>