<script>
  import { onMount } from 'svelte';
  
  import * as dataService from '../../services/dataService.js';
  import { warehouseList, modalState } from '../../stores.js'; // Import modalState
  import { actionService } from '../../services/action.service.js'; // Import actionService

  // Import các Tab con
  import SummaryTab from './summary/SummaryTab.svelte';
  import EmployeeTab from './employee/EmployeeTab.svelte';
  import EfficiencyTab from './efficiency/EfficiencyTab.svelte';
  import CategoryTab from './category/CategoryTab.svelte';
  import BrandTab from './brand/BrandTab.svelte';
  import CompetitionTab from './competition/CompetitionTab.svelte';

  export let activeTab;
  let activeSubTabId = 'subtab-realtime-sieu-thi'; 
  let selectedWarehouse = '';

  function handleSubTabClick(event) {
      const button = event.currentTarget;
      activeSubTabId = button.dataset.target;
  }

  async function handleFileUpload(event) {
    await dataService.handleRealtimeFileInput(event);
  }

  // === CÁC HÀM XỬ LÝ HÀNH ĐỘNG (ACTIONS) ===
  
  function handleCompose() {
    // Mở modal Composer và set context là 'realtime'
    modalState.update(s => ({ ...s, activeModal: 'composer-modal', context: 'realtime' }));
  }

  function handleExport() {
    // Gọi service để xuất Excel cho section 'realtime'
    actionService.handleExport('realtime');
  }

  function handleCapture() {
    // Gọi service để chụp ảnh cho section 'realtime'
    actionService.handleCapture('realtime');
  }

  // Tự động chạy Feather Icons khi tab này được active
  $: if (activeTab === 'realtime-section') {
    Promise.resolve().then(() => {
      if (typeof window.feather !== 'undefined') window.feather.replace();
    });
  }
</script>

<section id="realtime-section" class="page-section {activeTab === 'realtime-section' ? '' : 'hidden'}">
    
    <div class="content-card mb-6">
        <div class="page-header border-b pb-4 mb-6 flex flex-wrap justify-between items-center gap-4">
            <div class="flex items-center gap-x-3">
                <h2 class="page-header__title">Phân Tích Doanh Thu Realtime</h2>
                <button class="page-header__help-btn" data-help-id="realtime" title="Xem hướng dẫn">
                   <i data-feather="help-circle"></i>
                </button>
            </div>

            <div class="flex-shrink-0 flex items-center gap-x-4 ml-auto">
                <label for="realtime-file-input" class="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap flex items-center gap-2 shadow-sm">
                     <i data-feather="upload" class="w-4 h-4"></i>
                    <span>Thêm file Realtime</span>
                </label>
                <input 
                    type="file" 
                    id="realtime-file-input" 
                    class="hidden" 
                    accept=".xlsx, .xls, .csv"
                    on:change={handleFileUpload}
                >
                 <a href="https://report.mwgroup.vn/home/dashboard/077" target="_blank" class="text-blue-600 hover:underline whitespace-nowrap text-sm font-medium">Lấy file tại đây</a>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-4 mb-4">
             <div class="flex items-center gap-2">
                <label for="realtime-filter-warehouse" class="text-sm font-semibold text-gray-700">Kho:</label>
                 <select 
                   id="realtime-filter-warehouse" 
                   class="p-2 border rounded-lg text-sm shadow-sm bg-white min-w-[150px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                   bind:value={selectedWarehouse}
                 >
                    <option value="">Toàn bộ</option>
                   {#each $warehouseList as kho}
                      <option value={kho}>{kho}</option>
                   {/each}
                </select>
               </div>
             
             <button class="toggle-filters-btn ml-auto md:ml-0">
                <span class="text">Hiện bộ lọc nâng cao</span>
                <i data-feather="chevron-down" class="icon"></i>
            </button>
        </div>
      
         <div id="realtime-filter-container" class="advanced-filters hidden"></div>
    </div>

    <div class="flex justify-between items-center mb-8 overflow-x-auto pb-2">
        <nav id="realtime-subtabs-nav" class="border-b border-gray-200 -mb-px flex space-x-6" aria-label="Tabs">
            <button 
                class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-realtime-sieu-thi' ? 'active' : ''}" 
                data-target="subtab-realtime-sieu-thi"
                data-title="SieuThiRealtime"
                on:click={handleSubTabClick}
            >
                <i data-feather="zap"></i>
                <span>Siêu thị Realtime</span>
            </button>
               
             <button 
                class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-realtime-nhan-vien' ? 'active' : ''}" 
                data-target="subtab-realtime-nhan-vien"
                data-title="DTNVRealtime"
                on:click={handleSubTabClick}
            >
                <i data-feather="pie-chart"></i>
                <span>DT NV Realtime</span>
            </button>

             <button 
                class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-realtime-hieu-qua-nhan-vien' ? 'active' : ''}" 
                data-target="subtab-realtime-hieu-qua-nhan-vien"
                data-title="HieuQuaKhaiThacRealtime"
                on:click={handleSubTabClick}
            >
                <i data-feather="bar-chart-2"></i>
                <span>Hiệu quả NV Realtime</span>
            </button>

              <button 
                class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-realtime-nganh-hang' ? 'active' : ''}" 
                data-target="subtab-realtime-nganh-hang"
                data-title="NganhHangRealtime"
                on:click={handleSubTabClick}
            >
                <i data-feather="layers"></i>
                <span>Ngành hàng Realtime</span>
            </button>

            <button 
                class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-realtime-hang-ban' ? 'active' : ''}" 
                data-target="subtab-realtime-hang-ban"
                data-title="HangRealtime"
                on:click={handleSubTabClick}
            >
                <i data-feather="tag"></i>
                <span>DT Hãng Realtime</span>
            </button>

            <button 
                class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-realtime-thi-dua' ? 'active' : ''}" 
                data-target="subtab-realtime-thi-dua"
                data-title="ThiDuaNhanVienRealtime"
                on:click={handleSubTabClick}
            >
                <i data-feather="award"></i>
                <span>Thi đua NV Realtime</span>
            </button>
           </nav>

        <div class="flex items-center gap-x-2 flex-shrink-0 ml-4">
             <button id="compose-realtime-notification-btn" class="action-btn action-btn--composer" title="Nhận xét" on:click={handleCompose}>
                <i data-feather="pen-tool"></i>
                <span>Nhận xét</span>
            </button>
            <button id="export-realtime-btn" class="action-btn action-btn--export" title="Xuất Excel" on:click={handleExport}>
                 <i data-feather="download"></i>
                <span>Xuất Excel</span>
            </button>
            <button id="capture-realtime-btn" class="action-btn action-btn--capture" title="Chụp ảnh" on:click={handleCapture}>
                <i data-feather="camera"></i>
                <span>Chụp màn hình</span>
             </button>
        </div>
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
            
        {:else}
            <div class="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                 <p class="text-gray-500 font-medium">Chức năng tab <strong>{activeSubTabId}</strong> đang được phát triển.</p>
            </div>
        {/if}
    </div>

</section>