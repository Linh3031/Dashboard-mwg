<script>
  /* global feather */
  import { onMount, afterUpdate } from 'svelte';
  import {
      danhSachNhanVien,
      ycxData,
      masterReportData,
      selectedWarehouse,
      warehouseList,
      luykeGoalSettings,
      modalState,
      categoryNameMapping,
      macroCategoryConfig
  } from '../stores.js';
  import { reportService } from '../services/reportService.js';
  import { actionService } from '../services/action.service.js';
  // [CODEGENESIS] Import settingsService để tải goal
  import { settingsService } from '../services/settings.service.js';
  
  import LuykeSieuThi from './luyke/LuykeSieuThi.svelte';
  import LuykeThiDua from './luyke/LuykeThiDua.svelte';
  import LuykeThiDuaVung from './luyke/LuykeThiDuaVung.svelte';

  export let activeTab;
  let activeSubTabId = 'subtab-luyke-sieu-thi';

  let showPlaceholder = true;
  $: showPlaceholder = ($danhSachNhanVien.length === 0);

  let selectedDept = '';
  let selectedDates = [];
  let goals = {};
  $: goals = ($luykeGoalSettings && $selectedWarehouse) 
      ? $luykeGoalSettings[$selectedWarehouse] || {} 
      : {};

  // [CODEGENESIS] Tự động tải Goal từ Cloud khi chọn kho
  $: if ($selectedWarehouse) {
      // Gọi hàm load ngầm, không cần await để tránh chặn UI
      settingsService.loadGoalsFromCloud($selectedWarehouse);
  }

  let filteredYCXData = [];
  $: {
      if (selectedDates && selectedDates.length > 0) {
          const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          const selectedDateSet = new Set(selectedDates.map(d => startOfDay(d)));
          filteredYCXData = $ycxData.filter(row => row.ngayTao instanceof Date && !isNaN(row.ngayTao) && selectedDateSet.has(startOfDay(row.ngayTao)));
      } else {
          filteredYCXData = $ycxData;
      }
  }

  $: {
      const _mappingTrigger = $categoryNameMapping;
      const _macroTrigger = $macroCategoryConfig;
      if (!showPlaceholder) {
          const newMasterReport = reportService.generateMasterReportData(
              filteredYCXData, 
              goals, 
              false 
          );
          masterReportData.update(current => ({ ...current, luyke: newMasterReport }));
      }
  }

  let filteredReport = [];
  $: filteredReport = ($masterReportData.luyke || []).filter(nv => {
      const whMatch = !$selectedWarehouse || nv.maKho == $selectedWarehouse;
      const deptMatch = !selectedDept || nv.boPhan === selectedDept;
      return whMatch && deptMatch;
  });
  let supermarketReport = {};
  $: supermarketReport = reportService.aggregateReport(filteredReport, $selectedWarehouse);

  let numDays = 1;
  $: numDays = selectedDates.length > 0 
      ? selectedDates.length 
      : (new Set($ycxData.map(row => row.ngayTao instanceof Date ? new Date(row.ngayTao).toDateString() : null).filter(Boolean)).size || 1);
  function handleSubTabClick(event) {
      const button = event.currentTarget;
      activeSubTabId = button.dataset.target;
  }

  function handleWarehouseChange(event) {
      selectedWarehouse.set(event.target.value);
  }

  function handleCompose() {
      modalState.update(s => ({ ...s, activeModal: 'composer-modal', context: 'luyke' }));
  }

  function handleExport() {
      actionService.handleExport('luyke');
  }

  function handleCapture() {
      actionService.handleCapture('luyke');
  }

  $: if (activeTab === 'health-section') {
    Promise.resolve().then(() => {
      if (typeof window.feather !== 'undefined') {
        window.feather.replace();
      }
    });
  }
</script>

<section id="health-section" class="page-section {activeTab === 'health-section' ? '' : 'hidden'}">
    <div id="health-section-placeholder" class="placeholder-message" class:hidden={!showPlaceholder}>
        Vui lòng cập nhật danh sách nhân viên để xem kết quả.
    </div> 
    
    <div id="health-section-content" class:hidden={showPlaceholder}> 
        <div class="content-card mb-6 !p-0"> 
            <div class="modern-page-header flex flex-wrap justify-between items-center"> 
                <div class="title-wrapper flex items-center gap-4 flex-wrap">
                    <i data-feather="activity" class="main-icon hidden sm:block"></i>
                    
                    <div class="flex items-center gap-2">
                        <h2 class="page-title text-xl sm:text-2xl font-bold text-blue-800">Sức Khỏe Siêu Thị</h2> 
                        <button class="page-header__help-btn" data-help-id="luyke" title="Xem hướng dẫn"> 
                              <i data-feather="help-circle"></i> 
                        </button>
                    </div>

                    <div class="flex items-center gap-2 pl-4 border-l-2 border-blue-100 ml-2">
                        <label for="luyke-warehouse-selector" class="text-sm font-semibold text-gray-600 whitespace-nowrap">Kho:</label>
                        <select 
                            id="luyke-warehouse-selector" 
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
                    <button id="compose-luyke-notification-btn" class="action-btn action-btn--composer" title="Nhận xét" on:click={handleCompose}> 
                        <i data-feather="pen-tool" class="w-4 h-4"></i> 
                        <span class="hidden lg:inline">Nhận xét</span> 
                    </button> 
                    <button id="export-luyke-btn" class="action-btn action-btn--export" title="Xuất Excel tab hiện tại" on:click={handleExport}> 
                        <i data-feather="download" class="w-4 h-4"></i> 
                        <span class="hidden lg:inline">Xuất Excel</span> 
                    </button>
                    <button id="capture-luyke-btn" class="action-btn action-btn--capture" title="Chụp ảnh tab hiện tại" on:click={handleCapture}> 
                        <i data-feather="camera" class="w-4 h-4"></i> 
                        <span class="hidden lg:inline">Chụp ảnh</span> 
                    </button> 
                </div>
            </div> 
            
            <div class="content-card__body p-4">
                <div class="mb-6 overflow-x-auto pb-2">
                    <nav id="luyke-subtabs-nav" class="flex space-x-2 border-b border-gray-100 pb-1 w-full min-w-max" aria-label="Tabs">
                        <button 
                            class="sub-tab-btn {activeSubTabId === 'subtab-luyke-sieu-thi' ? 'active' : ''}" 
                            data-target="subtab-luyke-sieu-thi" 
                            data-title="SieuThiLuyKe"
                            on:click={handleSubTabClick}
                        > 
                            <i data-feather="home"></i> 
                             <span>Siêu thị Lũy kế</span> 
                        </button>
                        <button 
                            class="sub-tab-btn {activeSubTabId === 'subtab-luyke-thi-dua' ? 'active' : ''}" 
                            data-target="subtab-luyke-thi-dua" 
                            data-title="ThiDuaLuyKe"
                            on:click={handleSubTabClick}
                        > 
                            <i data-feather="award"></i> 
                            <span>Thi đua ST Lũy kế</span> 
                        </button>
                        <button 
                            class="sub-tab-btn {activeSubTabId === 'subtab-luyke-thidua-vung' ? 'active' : ''}" 
                            data-target="subtab-luyke-thidua-vung" 
                            data-title="ThiDuaVung"
                            on:click={handleSubTabClick}
                        > 
                            <i data-feather="map"></i> 
                            <span>Thi Đua Vùng TNB</span> 
                        </button>
                    </nav>
                </div>

                <div id="luyke-subtabs-content"> 
                    {#if activeSubTabId === 'subtab-luyke-sieu-thi'}
                        
                        <div id="subtab-luyke-sieu-thi" class="sub-tab-content">
                            <LuykeSieuThi 
                                supermarketReport={supermarketReport} 
                                filteredYCXData={filteredYCXData} 
                                goals={goals} 
                                numDays={numDays}
                            />
                        </div>
                    
                    {:else if activeSubTabId === 'subtab-luyke-thi-dua'}
                        <div id="subtab-luyke-thi-dua" class="sub-tab-content">
                            <div id="luyke-competition-content">
                                <LuykeThiDua />
                            </div>
                        </div>
                    
                    {:else if activeSubTabId === 'subtab-luyke-thidua-vung'}
                        <div id="subtab-luyke-thidua-vung" class="sub-tab-content">
                             <LuykeThiDuaVung />
                        </div>
                    {/if}
                </div>
            </div>
         </div>
    </div>
</section>