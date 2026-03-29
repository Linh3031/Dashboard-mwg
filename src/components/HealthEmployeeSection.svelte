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
  import InstallmentView from './health-staff/installment/InstallmentView.svelte';

  export let activeTab;
  let activeSubTab = 'sknv';
  let viewingDetailId = null;
  let processedReport = [];
  
  // State Bộ lọc ngày
  let selectedStartDate = '';
  let selectedEndDate = '';
  let showDateFilter = false;

  const tabs = [
      { id: 'sknv', label: 'SKNV', icon: 'users', title: 'SucKhoeNhanVien' },
      { id: 'doanhthu', label: 'Doanh thu LK', icon: 'dollar-sign', title: 'DoanhThuLuyKe' },
      { id: 'thunhap', label: 'Thu nhập', icon: 'briefcase', title: 'ThuNhapNhanVien' },
      { id: 'hieuqua', label: 'Hiệu quả NV LK', icon: 'bar-chart-2', title: 'HieuQuaKhaiThac' },
      { id: 'nganhhang', label: 'DT ngành hàng', icon: 'layers', title: 'DoanhThuNganhHang' },
      { id: 'thidua', label: 'Thi đua NV LK', icon: 'award', title: 'ThiDuaNhanVien' },
      { id: 'tragop', label: 'Trả chậm', icon: 'credit-card', title: 'ThongKeTraCham' }
  ];

  let lastDataHash = '';

  // [CODEGENESIS] VÁ LỖI: Thuật toán Parser đa năng (Universal Date Parser)
  function parseUniversalDate(val) {
      if (val === null || val === undefined || val === '') return null;

      // 1. Nếu XLSX tự convert ra JS Date Object
      if (val instanceof Date) {
          return new Date(val.getFullYear(), val.getMonth(), val.getDate()).getTime();
      }

      // 2. Nếu XLSX convert ra số (Excel Serial Date, vd: 45744.54)
      if (typeof val === 'number') {
          // Ép Epoch từ 1/1/1900 của Excel về 1/1/1970 của JavaScript (-25569 ngày)
          const jsEpoch = Math.round((val - 25569) * 86400 * 1000);
          const tempDate = new Date(jsEpoch);
          // Bắt buộc dùng getUTC để tránh bị lùi ngày do múi giờ VN (GMT+7)
          return new Date(tempDate.getUTCFullYear(), tempDate.getUTCMonth(), tempDate.getUTCDate()).getTime();
      }

      // 3. Nếu nó thực sự là dạng Text (Chuỗi)
      const str = String(val).trim();
      const parts = str.split(/[\s,T]+/); 
      const datePart = parts[0]; 

      if (datePart.includes('/')) {
          const dParts = datePart.split('/');
          if (dParts.length >= 3) {
              const p1 = parseInt(dParts[0], 10);
              const p2 = parseInt(dParts[1], 10);
              const p3 = parseInt(dParts[2], 10);
              // Tự nhận diện YYYY/MM/DD hay DD/MM/YYYY dựa vào độ lớn của số
              if (p1 > 1000) return new Date(p1, p2 - 1, p3).setHours(0,0,0,0);
              return new Date(p3, p2 - 1, p1).setHours(0,0,0,0);
          }
      } else if (datePart.includes('-')) {
          const dParts = datePart.split('-');
          if (dParts.length >= 3) {
              const p1 = parseInt(dParts[0], 10);
              const p2 = parseInt(dParts[1], 10);
              const p3 = parseInt(dParts[2], 10);
              if (p1 > 1000) return new Date(p1, p2 - 1, p3).setHours(0,0,0,0);
              return new Date(p3, p2 - 1, p1).setHours(0,0,0,0);
          }
      }

      // 4. Đường cùng: Để JS tự lo
      const fallbackDate = new Date(val);
      if (!isNaN(fallbackDate.getTime())) {
          return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate()).setHours(0,0,0,0);
      }

      return null;
  }

  function selectQuickDays(days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days + 1);
      
      const pad = (n) => (n < 10 ? '0' + n : n);
      selectedEndDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      selectedStartDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      showDateFilter = false;
  }

  function clearDateFilter() {
      selectedStartDate = '';
      selectedEndDate = '';
      showDateFilter = false;
  }

  function formatDisplayDate(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}`;
  }

  function handleGlobalClick(e) {
      if (showDateFilter && !e.target.closest('.date-filter-container')) {
          showDateFilter = false;
      }
  }

  // [CODEGENESIS] VÁ LỖI: Bộ lọc diệt trùng Key ẩn
  $: filteredYcxData = $ycxData.filter(item => {
      if (!selectedStartDate && !selectedEndDate) return true;
      
      let dateVal = null;
      // Quét toàn bộ key trong object, tìm mọi thứ tương đồng với "Ngày tạo"
      for (const key of Object.keys(item)) {
          const normKey = key.toLowerCase().replace(/[\s_]/g, ''); 
          if (normKey === 'ngàytạo' || normKey === 'ngaytao' || normKey === 'createdate' || key.includes('Ngày tạo')) {
              dateVal = item[key];
              break;
          }
      }
      
      const itemTime = parseUniversalDate(dateVal);
      
      // Cơ chế an toàn (Fail-Safe): Nếu dòng này không giải mã được ngày -> GIỮ LẠI tránh mất oan.
      if (!itemTime) return true; 
      
      let isValid = true;
      if (selectedStartDate) {
          const start = new Date(selectedStartDate).setHours(0,0,0,0);
          if (itemTime < start) isValid = false;
      }
      if (selectedEndDate) {
          const end = new Date(selectedEndDate).setHours(23,59,59,999);
          if (itemTime > end) isValid = false;
      }
      return isValid;
  });

  // Re-generate report dựa trên Data đã lọc chuẩn
  $: {
      if ($danhSachNhanVien.length > 0 && filteredYcxData.length > 0) {
          const currentHash = `${$danhSachNhanVien.length}-${filteredYcxData.length}-${$selectedWarehouse}-${selectedStartDate}-${selectedEndDate}`;
          if (currentHash !== lastDataHash) {
              lastDataHash = currentHash;
              const goals = ($luykeGoalSettings && $selectedWarehouse) ? $luykeGoalSettings[$selectedWarehouse] || {} : {};
              const newMasterReport = reportService.generateMasterReportData(filteredYcxData, goals, false);
              masterReportData.update(current => ({ ...current, sknv: newMasterReport }));
          }
      } else if (filteredYcxData.length === 0 && lastDataHash !== 'empty') {
          lastDataHash = 'empty';
          masterReportData.update(current => ({ ...current, sknv: [] }));
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
  function handleWarehouseChange(event) { selectedWarehouse.set(event.target.value); }
  function handleCompose() { modalState.update(s => ({ ...s, activeModal: 'composer-modal', context: 'sknv' })); }
  function handleExport() { actionService.handleExport('sknv'); }
  function handleCapture() { actionService.handleCapture('sknv'); }

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<svelte:window on:click={handleGlobalClick} />

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
                        class="p-2 border rounded-lg text-sm shadow-sm min-w-[100px] font-bold text-blue-700 bg-white border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-blue-50 transition" 
                        value={$selectedWarehouse}
                        on:change={handleWarehouseChange}
                    >
                        <option value="">-- Toàn bộ --</option>
                        {#each $warehouseList as kho}
                            <option value={kho}>{kho}</option>
                        {/each}
                    </select>
                </div>

                <div class="date-filter-container relative flex items-center gap-2 pl-2 md:pl-4 border-l-2 border-blue-100 ml-1 md:ml-2">
                    <button 
                        class="p-2 border rounded-lg text-sm shadow-sm font-semibold text-gray-700 bg-white border-gray-200 hover:bg-gray-50 flex items-center gap-2 transition"
                        on:click={() => showDateFilter = !showDateFilter}
                        title="Lọc theo ngày"
                    >
                        <i data-feather="calendar" class="w-4 h-4"></i>
                        {#if selectedStartDate && selectedEndDate}
                            <span class="text-xs text-blue-600 font-bold">{formatDisplayDate(selectedStartDate)} - {formatDisplayDate(selectedEndDate)}</span>
                        {:else if selectedStartDate}
                            <span class="text-xs text-blue-600 font-bold">Từ {formatDisplayDate(selectedStartDate)}</span>
                        {:else if selectedEndDate}
                            <span class="text-xs text-blue-600 font-bold">Đến {formatDisplayDate(selectedEndDate)}</span>
                        {:else}
                            <span class="hidden xl:inline text-xs">Lọc ngày</span>
                        {/if}
                    </button>

                    {#if showDateFilter}
                        <div class="absolute top-full left-0 mt-2 bg-white border border-gray-200 shadow-xl rounded-lg p-4 z-50 w-64 md:w-72">
                            <div class="flex flex-col gap-3">
                                <div class="flex flex-col gap-1">
                                    <label class="text-xs text-gray-500 font-semibold">Từ ngày</label>
                                    <input type="date" bind:value={selectedStartDate} class="border p-1.5 rounded text-sm w-full outline-none focus:ring-1 focus:ring-blue-500">
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-xs text-gray-500 font-semibold">Đến ngày</label>
                                    <input type="date" bind:value={selectedEndDate} class="border p-1.5 rounded text-sm w-full outline-none focus:ring-1 focus:ring-blue-500">
                                </div>
                                <div class="flex flex-wrap gap-1 mt-2">
                                    <button class="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition" on:click={() => selectQuickDays(3)}>3 Ngày</button>
                                    <button class="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition" on:click={() => selectQuickDays(5)}>5 Ngày</button>
                                    <button class="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition" on:click={() => selectQuickDays(7)}>7 Ngày</button>
                                    <button class="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition" on:click={() => selectQuickDays(10)}>10 Ngày</button>
                                </div>
                                <div class="border-t mt-1 pt-2 flex justify-end">
                                    <button class="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded text-xs font-semibold transition" on:click={clearDateFilter}>Xóa lọc</button>
                                </div>
                            </div>
                        </div>
                    {/if}
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