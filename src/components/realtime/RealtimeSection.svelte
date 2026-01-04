<script>
  import { onMount } from 'svelte';
  
  import { dataService } from '../../services/dataService.js';
  // [GENESIS FIX] Thêm realtimeYCXData vào import để lấy dữ liệu upload
  import { warehouseList, modalState, selectedWarehouse, realtimeYCXData } from '../../stores.js';
  import { actionService } from '../../services/action.service.js';

  import SummaryTab from './summary/SummaryTab.svelte';
  import EmployeeTab from './employee/EmployeeTab.svelte';
  import EfficiencyTab from './efficiency/EfficiencyTab.svelte';
  import CategoryTab from './category/CategoryTab.svelte';
  import BrandTab from './brand/BrandTab.svelte';
  import CompetitionTab from './competition/CompetitionTab.svelte';
  // [GENESIS NEW] Import Component Trả chậm
  import InstallmentView from '../health-staff/installment/InstallmentView.svelte';

  export let activeTab;
  let activeSubTabId = 'subtab-realtime-sieu-thi'; 
  
  function handleSubTabClick(event) {
      const button = event.currentTarget;
      activeSubTabId = button.dataset.target;
  }

  function handleWarehouseChange(event) {
      selectedWarehouse.set(event.target.value);
  }

  async function handleFileUpload(event) {
    await dataService.handleRealtimeFileInput(event);
  }

  // === ACTIONS ===
  function handleCompose() {
    modalState.update(s => ({ ...s, activeModal: 'composer-modal', context: 'realtime' }));
  }
  function handleExport() {
    actionService.handleExport('realtime');
  }
  function handleCapture() {
    actionService.handleCapture('realtime');
  }

  $: if (activeTab === 'realtime-section') {
    Promise.resolve().then(() => {
      if (typeof window.feather !== 'undefined') window.feather.replace();
    });
  }
</script>

<section id="realtime-section" class="page-section {activeTab === 'realtime-section' ? '' : 'hidden'}">
    
    <div class="content-card mb-6 !p-0">
        <div class="modern-page-header flex flex-wrap justify-between items-center">
            
            <div class="title-wrapper flex items-center gap-4 flex-wrap">
                <i data-feather="trending-up" class="main-icon hidden sm:block"></i>
                
                <div class="flex items-center gap-2">
                    <h2 class="page-title text-xl sm:text-2xl font-bold text-blue-800">Doanh Thu Realtime</h2>
                    <button class="page-header__help-btn" data-help-id="realtime" title="Xem hướng dẫn">
                        <i data-feather="help-circle"></i>
                    </button>
                </div>

                <div class="flex items-center gap-2 pl-4 border-l-2 border-blue-100 ml-2">
                    <label for="realtime-filter-warehouse" class="text-sm font-semibold text-gray-600 whitespace-nowrap">Kho:</label>
                     <select 
                       id="realtime-filter-warehouse" 
                       class="p-2 border rounded-lg text-sm shadow-sm bg-white border-blue-200 text-blue-700 font-bold min-w-[120px] focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-blue-50 transition"
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

            <div class="flex flex-wrap items-center gap-3 ml-auto mt-2 sm:mt-0">
                <div class="flex items-center gap-2 pr-4 border-r border-blue-100">
                    <a href="https://report.mwgroup.vn/home/dashboard/077" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium flex items-center gap-1 bg-blue-50 px-2 py-1.5 rounded transition-colors">
                        <i data-feather="external-link" class="w-3 h-3"></i> 
                        Lấy file
                    </a>
                    <label for="realtime-file-input" class="cursor-pointer bg-white text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition text-sm font-bold flex items-center gap-2 shadow-sm border border-blue-200">
                         <i data-feather="upload" class="w-4 h-4"></i>
                         <span>Tải file</span>
                    </label>
                    <input 
                        type="file" 
                        id="realtime-file-input" 
                        class="hidden" 
                        accept=".xlsx, .xls, .csv"
                        on:change={handleFileUpload}
                    >
                </div>

                <div class="flex items-center gap-2">
                     <button id="compose-realtime-notification-btn" class="action-btn action-btn--composer" title="Nhận xét" on:click={handleCompose}>
                        <i data-feather="pen-tool" class="w-4 h-4"></i>
                        <span class="hidden lg:inline">Nhận xét</span>
                     </button>
                    <button id="export-realtime-btn" class="action-btn action-btn--export" title="Xuất Excel" on:click={handleExport}>
                         <i data-feather="download" class="w-4 h-4"></i>
                         <span class="hidden lg:inline">Xuất Excel</span>
                    </button>
                    <button id="capture-realtime-btn" class="action-btn action-btn--capture" title="Chụp ảnh" on:click={handleCapture}>
                        <i data-feather="camera" class="w-4 h-4"></i>
                        <span class="hidden lg:inline">Chụp</span>
                     </button>
                </div>
            </div>
        </div>

        <div class="content-card__body p-4">
            <div class="mb-6 overflow-x-auto pb-2">
                <nav id="realtime-subtabs-nav" class="flex space-x-2 border-b border-gray-100 pb-1 w-full min-w-max" aria-label="Tabs">
                    <button 
                        class="sub-tab-btn {activeSubTabId === 'subtab-realtime-sieu-thi' ? 'active' : ''}" 
                        data-target="subtab-realtime-sieu-thi"
                        data-title="SieuThiRealtime"
                        on:click={handleSubTabClick}
                    >
                         <i data-feather="zap"></i>
                        <span>Siêu thị Realtime</span>
                    </button>
                       
                    <button 
                        class="sub-tab-btn {activeSubTabId === 'subtab-realtime-nhan-vien' ? 'active' : ''}" 
                        data-target="subtab-realtime-nhan-vien"
                        data-title="DTNVRealtime"
                        on:click={handleSubTabClick}
                    >
                         <i data-feather="pie-chart"></i>
                        <span>DT NV Realtime</span>
                    </button>

                    <button 
                        class="sub-tab-btn {activeSubTabId === 'subtab-realtime-hieu-qua-nhan-vien' ? 'active' : ''}" 
                        data-target="subtab-realtime-hieu-qua-nhan-vien"
                        data-title="HieuQuaKhaiThacRealtime"
                        on:click={handleSubTabClick}
                    >
                         <i data-feather="bar-chart-2"></i>
                        <span>Hiệu quả NV Realtime</span>
                    </button>

                      <button 
                        class="sub-tab-btn {activeSubTabId === 'subtab-realtime-nganh-hang' ? 'active' : ''}" 
                        data-target="subtab-realtime-nganh-hang"
                        data-title="NganhHangRealtime"
                        on:click={handleSubTabClick}
                    >
                         <i data-feather="layers"></i>
                        <span>Ngành hàng Realtime</span>
                    </button>

                    <button 
                        class="sub-tab-btn {activeSubTabId === 'subtab-realtime-hang-ban' ? 'active' : ''}" 
                        data-target="subtab-realtime-hang-ban"
                        data-title="HangRealtime"
                        on:click={handleSubTabClick}
                    >
                         <i data-feather="tag"></i>
                        <span>DT Hãng Realtime</span>
                    </button>

                    <button 
                        class="sub-tab-btn {activeSubTabId === 'subtab-realtime-thi-dua' ? 'active' : ''}" 
                        data-target="subtab-realtime-thi-dua"
                        data-title="ThiDuaNhanVienRealtime"
                        on:click={handleSubTabClick}
                    >
                         <i data-feather="award"></i>
                        <span>Thi đua NV Realtime</span>
                    </button>

                    <button 
                        class="sub-tab-btn {activeSubTabId === 'subtab-realtime-tragop' ? 'active' : ''}" 
                        data-target="subtab-realtime-tragop"
                        data-title="TraChamRealtime"
                        on:click={handleSubTabClick}
                    >
                         <i data-feather="credit-card"></i>
                        <span>Trả chậm Realtime</span>
                    </button>
                </nav>
            </div>

            <div id="realtime-subtabs-content">
                {#if activeSubTabId === 'subtab-realtime-sieu-thi'}
                    <div id="subtab-realtime-sieu-thi" class="sub-tab-content">
                        <SummaryTab {selectedWarehouse} />
                    </div>
                 
                {:else if activeSubTabId === 'subtab-realtime-nhan-vien'}
                    <div id="subtab-realtime-nhan-vien" class="sub-tab-content" data-capture-preset="large-font-report">
                        <EmployeeTab {selectedWarehouse} />
                    </div>
                    
                {:else if activeSubTabId === 'subtab-realtime-hieu-qua-nhan-vien'}
                    <div id="subtab-realtime-hieu-qua-nhan-vien" class="sub-tab-content" data-capture-preset="landscape-table">
                        <EfficiencyTab {selectedWarehouse} />
                    </div>

                {:else if activeSubTabId === 'subtab-realtime-nganh-hang'}
                    <div id="subtab-realtime-nganh-hang" class="sub-tab-content" data-capture-preset="mobile-portrait">
                        <CategoryTab {selectedWarehouse} />
                    </div>

                {:else if activeSubTabId === 'subtab-realtime-hang-ban'}
                    <div id="subtab-realtime-hang-ban" class="sub-tab-content">
                        <BrandTab {selectedWarehouse} />
                    </div>

                {:else if activeSubTabId === 'subtab-realtime-thi-dua'}
                    <div id="subtab-realtime-thi-dua" class="sub-tab-content">
                        <CompetitionTab {selectedWarehouse} />
                    </div>

                {:else if activeSubTabId === 'subtab-realtime-tragop'}
                    <div id="subtab-realtime-tragop" class="sub-tab-content">
                        <InstallmentView inputData={$realtimeYCXData} />
                    </div>
                    
                {:else}
                    <div class="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p class="text-gray-500 font-medium">Chức năng tab <strong>{activeSubTabId}</strong> đang được phát triển.</p>
                    </div>
                {/if}
            </div>
        </div>
    </div>

</section>