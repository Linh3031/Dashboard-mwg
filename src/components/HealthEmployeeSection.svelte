<script>
  import { onMount, afterUpdate } from 'svelte';
  import { 
    masterReportData, 
    ycxData, 
    danhSachNhanVien, 
    luykeGoalSettings, 
    selectedWarehouse,
    warehouseList,
    modalState
  } from '../stores.js';
  import { sknvService } from '../services/sknv.service.js';
  import { reportService } from '../services/reportService.js';
  import { actionService } from '../services/action.service.js';
  import * as XLSX from 'xlsx';

  import SummaryView from './health-staff/summary/SummaryView.svelte';
  import DetailView from './health-staff/detail/DetailView.svelte';
  import RevenueTable from './health-staff/RevenueTable.svelte';
  import RevenueDetailView from './health-staff/revenue/RevenueDetailView.svelte';
  import IncomeTable from './health-staff/IncomeTable.svelte';
  import PerformanceView from './health-staff/performance/PerformanceView.svelte';
  import CategoryRevenueView from './health-staff/CategoryRevenueView.svelte';
  import CompetitionTab from './health-staff/CompetitionTab.svelte';
  import ProgramGoalTables from './health-staff/ProgramGoalTables.svelte';
  
  // [CODEGENESIS] Import Component Trả Góp mới
  import InstallmentView from './health-staff/installment/InstallmentView.svelte';

  export let activeTab;

  let activeSubTab = 'sknv';
  let viewingDetailId = null;
  let processedReport = [];
  
  // [CODEGENESIS] Cập nhật danh sách Tab
  const tabs = [
      { id: 'sknv', label: 'SKNV', icon: 'users', title: 'SucKhoeNhanVien' },
      { id: 'doanhthu', label: 'Doanh thu LK', icon: 'dollar-sign', title: 'DoanhThuLuyKe' },
      { id: 'thunhap', label: 'Thu nhập', icon: 'briefcase', title: 'ThuNhapNhanVien' },
      { id: 'hieuqua', label: 'Hiệu quả NV LK', icon: 'bar-chart-2', title: 'HieuQuaKhaiThac' },
      { id: 'nganhhang', label: 'DT ngành hàng', icon: 'layers', title: 'DoanhThuNganhHang' },
      { id: 'thidua', label: 'Thi đua NV LK', icon: 'award', title: 'ThiDuaNhanVien' },
      { id: 'tragop', label: 'Trả góp', icon: 'credit-card', title: 'ThongKeTraGop' } // Tab Mới
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

  // Đây là biến quan trọng nhất: processedReport chứa danh sách nhân viên ĐÃ CÓ orders
  $: {
      let rawData = $masterReportData.sknv || [];
      if ($selectedWarehouse) rawData = rawData.filter(nv => nv.maKho === $selectedWarehouse);
      processedReport = sknvService.processReportData(rawData);
  }

  function switchSubTab(tabId) { activeSubTab = tabId; viewingDetailId = null; }
  function handleEmployeeClick(event) { viewingDetailId = event.detail.employeeId; }
  function handleBackToSummary() { viewingDetailId = null; }
  
  function handleWarehouseChange(event) {
      selectedWarehouse.set(event.target.value);
  }

  function handleCompose() { 
      modalState.update(s => ({ ...s, activeModal: 'composer-modal', context: 'sknv' }));
  }
  function handleExport() { 
      actionService.handleExport('sknv');
  }
  function handleCapture() { 
      actionService.handleCapture('sknv');
  }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<section id="health-employee-section" class="page-section {activeTab === 'health-employee-section' ? '' : 'hidden'}">
    
    <div class="content-card mb-6 !p-0">
        <div class="modern-page-header flex flex-wrap justify-between items-center">
            
            <div class="title-wrapper flex items-center gap-4 flex-wrap">
                <i data-feather="users" class="main-icon hidden sm:block"></i>
                
                <div class="flex items-center gap-2">
                    <h2 class="page-title text-xl sm:text-2xl font-bold text-blue-800">Sức Khỏe Nhân Viên</h2>
                    <button class="page-header__help-btn" data-help-id="sknv" title="Xem hướng dẫn">
                        <i data-feather="help-circle"></i>
                    </button>
                </div>

                <div class="flex items-center gap-2 pl-4 border-l-2 border-blue-100 ml-2">
                    <label for="sknv-warehouse-selector" class="text-sm font-semibold text-gray-600 whitespace-nowrap">Kho:</label>
                    <select 
                        id="sknv-warehouse-selector" 
                        class="p-2 border rounded-lg text-sm shadow-sm min-w-[120px] font-bold text-blue-700 bg-white border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-blue-50 transition" 
                        value={$selectedWarehouse}
                        on:change={handleWarehouseChange}
                    >
                        <option value="">-- Toàn bộ --</option>
                        {#each $warehouseList as kho}
                            <option value={kho}>{kho}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="flex items-center gap-2 ml-auto mt-2 sm:mt-0">
                <button id="compose-sknv-notification-btn" class="action-btn action-btn--composer" title="Nhận xét" on:click={handleCompose}>
                    <i data-feather="pen-tool" class="w-4 h-4"></i>
                    <span class="hidden lg:inline">Nhận xét</span>
                </button>
                <button id="export-sknv-btn" class="action-btn action-btn--export" title="Xuất Excel" on:click={handleExport}>
                    <i data-feather="download" class="w-4 h-4"></i>
                    <span class="hidden lg:inline">Xuất Excel</span>
                </button>
                <button id="capture-sknv-btn" class="action-btn action-btn--capture" title="Chụp ảnh" on:click={handleCapture}>
                    <i data-feather="camera" class="w-4 h-4"></i>
                    <span class="hidden lg:inline">Chụp</span>
                </button>
            </div>
        </div>
        
        <div class="content-card__body p-4">
            <div class="mb-6 overflow-x-auto pb-2">
                <nav id="employee-subtabs-nav" class="flex space-x-2 border-b border-gray-100 pb-1 w-full min-w-max" aria-label="Tabs">
                    {#each tabs as tab}
                        <button 
                            class="sub-tab-btn {activeSubTab === tab.id ? 'active' : ''}"
                            data-target="subtab-{tab.id}" 
                            data-title={tab.title} 
                            on:click={() => switchSubTab(tab.id)}
                        >
                            <i data-feather={tab.icon}></i>
                            <span>{tab.label}</span>
                        </button>
                    {/each}
                </nav>
            </div>

            <div id="employee-subtabs-content" class="min-h-[500px]">
                {#if activeSubTab === 'sknv'}
                    <div id="subtab-sknv" class="sub-tab-content">
                        {#if !viewingDetailId}
                            <div id="sknv-summary-container">
                                <SummaryView reportData={processedReport} on:click={handleEmployeeClick} />
                            </div>
                        {:else}
                            <div id="sknv-detail-capture-area">
                                <DetailView employeeId={viewingDetailId} on:back={handleBackToSummary} />
                            </div>
                        {/if}
                    </div>

                {:else if activeSubTab === 'doanhthu'}
                    <div id="subtab-doanhthu" class="sub-tab-content">
                        {#if !viewingDetailId}
                            <div id="revenue-report-container-lk">
                                <RevenueTable reportData={processedReport} on:viewDetail={handleEmployeeClick} />
                            </div>
                        {:else}
                            <div id="dtnv-lk-capture-area">
                                <RevenueDetailView employeeId={viewingDetailId} on:back={handleBackToSummary} />
                            </div>
                        {/if}
                    </div>

                {:else if activeSubTab === 'thunhap'}
                    <div id="subtab-thunhap" class="sub-tab-content">
                        <div id="income-report-container">
                            <IncomeTable reportData={processedReport} />
                        </div>
                    </div>

                {:else if activeSubTab === 'hieuqua'}
                    <div id="subtab-hieuqua" class="sub-tab-content" data-capture-preset="landscape-table">
                        <div id="efficiency-report-container">
                            <PerformanceView reportData={processedReport} />
                        </div>
                    </div>

                {:else if activeSubTab === 'nganhhang'}
                    <div id="subtab-nganhhang" class="sub-tab-content" data-capture-preset="mobile-portrait">
                        <div id="category-revenue-report-container">
                            <CategoryRevenueView reportData={processedReport} />
                        </div>
                    </div>
                
                {:else if activeSubTab === 'thidua'}
                    <div id="subtab-thidua" class="sub-tab-content">
                        <div id="competition-report-container-lk">
                            <CompetitionTab />
                        </div>
                        
                        <div class="mt-8">
                             {#if $luykeGoalSettings && $luykeGoalSettings.programTables}
                                <ProgramGoalTables 
                                    programTables={$luykeGoalSettings.programTables} 
                                    on:update={(e) => {
                                        luykeGoalSettings.update(s => ({ ...s, programTables: e.detail }));
                                    }}
                                />
                             {/if}
                        </div>
                        
                        <div id="pasted-competition-report-container" class="hidden"></div>
                    </div>

                {:else if activeSubTab === 'tragop'}
                    <div id="subtab-tragop" class="sub-tab-content">
                        <InstallmentView reportData={processedReport} />
                    </div>

                {:else}
                    <div class="p-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
                        <p class="text-gray-500">Nội dung đang cập nhật.</p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</section>