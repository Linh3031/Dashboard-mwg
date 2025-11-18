<script>
  /* global feather */
  // === START: TÁI CẤU TRÚC (V1.5) - Kích hoạt LuykeThiDuaVung ===
  import { onMount, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import {
      danhSachNhanVien,
      ycxData,
      masterReportData,
      selectedWarehouse,
      luykeGoalSettings,
      competitionData,
      thiDuaVungChiTiet, 
      thiDuaVungTong, 
      choices 
  } from '../stores.js';
  import { reportService } from '../services/reportService.js';
  import { dataProcessing } from '../services/dataProcessing.js';
  // Import các component con "View"
  import LuykeSieuThi from './luyke/LuykeSieuThi.svelte';
  import LuykeThiDua from './luyke/LuykeThiDua.svelte';
  import LuykeThiDuaVung from './luyke/LuykeThiDuaVung.svelte'; // <-- ĐÃ KÍCH HOẠT
  
  // Nhận 'activeTab' từ App.svelte
  export let activeTab;
  // Trạng thái cho sub-tab nội bộ
  let activeSubTabId = 'subtab-luyke-sieu-thi';
  // --- BẮT ĐẦU: Logic tái cấu trúc từ tab-luyke.js ---
  let showPlaceholder = true;
  $: showPlaceholder = ($danhSachNhanVien.length === 0);

  let selectedDept = '';
  let selectedNames = [];
  let selectedDates = [];
  let goals = {};
  $: goals = ($luykeGoalSettings && $selectedWarehouse) 
      ? $luykeGoalSettings[$selectedWarehouse] || {} 
      : {};

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
      if (!showPlaceholder) {
          const newMasterReport = reportService.generateMasterReportData(
              filteredYCXData, 
              goals, 
              false // isRealtime = false
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
  
  // Logic Đọc dữ liệu Dán (cho tab Thi Đua) - ĐÃ XÓA Ở V1.4 ĐỂ TRÁNH LỖI GHI ĐÈ
  // --- KẾT THÚC: Logic tái cấu trúc ---

  function handleSubTabClick(event) {
      const button = event.currentTarget;
      activeSubTabId = button.dataset.target;
      
      const nav = button.closest('nav');
      if (!nav) return;

      nav.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
  }

  $: if (activeTab === 'health-section') {
    Promise.resolve().then(() => {
      if (typeof window.feather !== 'undefined') {
        window.feather.replace();
      }
    });
  }
  // === KẾT THÚC: TÁI CẤU TRÚC (V1.5) ===
</script>

<section id="health-section" class="page-section {activeTab === 'health-section' ? '' : 'hidden'}">
    <div id="health-section-placeholder" class="placeholder-message" class:hidden={!showPlaceholder}>
        Vui lòng cập nhật danh sách nhân viên để xem kết quả.
    </div> 
    
    <div id="health-section-content" class:hidden={showPlaceholder}> 
        <div class="content-card"> 
            <div class="page-header border-b pb-4 mb-6"> 
                <h2 class="page-header__title">Sức khỏe siêu thị</h2> 
                <button class="page-header__help-btn" 
                    data-help-id="luyke" title="Xem hướng dẫn"> 
                    <i data-feather="help-circle"></i> 
                </button> 
            </div> 
            <button class="toggle-filters-btn" data-target="luyke-filter-container"> 
                <span class="text">Hiện bộ lọc nâng cao</span> 
                <i data-feather="chevron-down" class="icon"></i> 
            </button> 
            <div id="luyke-filter-container" class="advanced-filters hidden"> 
                <div id="luyke-filter-bar" class="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4"> 
                    <p class="text-sm text-gray-500 italic">Bộ lọc chi tiết (Ngày, Bộ phận, Nhân viên) sẽ được thêm vào đây sau.</p>
                </div> 
            </div> 
         </div>

        <div class="flex justify-between items-center mb-8"> 
            <nav id="luyke-subtabs-nav" class="border-b border-gray-200 -mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs" data-content-container="luyke-subtabs-content"> 
                <button 
                    class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-luyke-sieu-thi' ? 'active' : ''}" 
                    data-target="subtab-luyke-sieu-thi" 
                    data-title="SieuThiLuyKe"
                    on:click={handleSubTabClick}
                > 
                    <i data-feather="home"></i> 
                    <span>Siêu thị Lũy kế</span> 
                </button>
                <button 
                    class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-luyke-thi-dua' ? 'active' : ''}" 
                    data-target="subtab-luyke-thi-dua" 
                    data-title="ThiDuaLuyKe"
                    on:click={handleSubTabClick}
                > 
                    <i data-feather="award"></i> 
                    <span>Thi đua Lũy kế</span> 
                </button>
                <button 
                    class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm {activeSubTabId === 'subtab-luyke-thidua-vung' ? 'active' : ''}" 
                    data-target="subtab-luyke-thidua-vung" 
                    data-title="ThiDuaVung"
                    on:click={handleSubTabClick}
                > 
                    <i data-feather="map"></i> 
                    <span>Thi Đua Vùng TNB</span> 
                </button>
            </nav> 
            <div class="flex items-center gap-x-2"> 
                <button id="compose-luyke-notification-btn" class="action-btn action-btn--composer" title="Nhận xét"> 
                    <i data-feather="pen-tool"></i> 
                    <span>Nhận xét</span> 
                </button> 
                <button id="export-luyke-btn" class="action-btn action-btn--export" title="Xuất Excel tab hiện tại"> 
                    <i data-feather="download"></i> 
                    <span>Xuất Excel</span> 
                </button>
                <button id="capture-luyke-btn" class="action-btn action-btn--capture" title="Chụp ảnh tab hiện tại"> 
                    <i data-feather="camera"></i> 
                    <span>Chụp màn hình</span> 
                </button> 
            </div>
        </div>

        <div id="luyke-subtabs-content"> 
            {#if activeSubTabId === 'subtab-luyke-sieu-thi'}
                <LuykeSieuThi 
                    supermarketReport={supermarketReport} 
                    filteredYCXData={filteredYCXData} 
                    goals={goals} 
                    numDays={numDays}
                />
            {:else if activeSubTabId === 'subtab-luyke-thi-dua'}
                <LuykeThiDua />
            {:else if activeSubTabId === 'subtab-luyke-thidua-vung'}
                <LuykeThiDuaVung />
            {/if}
        </div>
    </div>
</section>