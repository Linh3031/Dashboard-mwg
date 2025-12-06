<script>
  import { onMount, afterUpdate } from 'svelte';
  
  import { 
      activeTab, 
      modalState, 
      declarations, 
      categoryStructure, 
      brandList, 
      specialProductList,
      competitionNameMappings, 
      globalCompetitionConfigs, 
      globalSpecialPrograms 
  } from './stores.js';
  
  import { authService } from './services/auth.service.js';
  import * as dataService from './services/dataService.js';
  import { adminService } from './services/admin.service.js';
  import { config } from './config.js';

  // Import các thành phần giao diện chính
  import Sidebar from './components/Sidebar.svelte';
  import HomeSection from './components/HomeSection.svelte';
  import DataSection from './components/DataSection.svelte';
  import HealthSection from './components/HealthSection.svelte';
  import HealthEmployeeSection from './components/HealthEmployeeSection.svelte';
  import RealtimeSection from './components/realtime/RealtimeSection.svelte';
  import DeclarationSection from './components/DeclarationSection.svelte';

  // Import các Drawer
  import InterfaceDrawer from './components/drawers/InterfaceDrawer.svelte';
  import GoalDrawer from './components/drawers/GoalDrawer.svelte';

  // Import các Modal hiện có
  import AdminModal from './components/modals/AdminModal.svelte';
  import LoginModal from './components/modals/LoginModal.svelte';
  import UserCompetitionModal from './components/modals/UserCompetitionModal.svelte';
  import UserSpecialProgramModal from './components/modals/UserSpecialProgramModal.svelte';
  
  // [MỚI] Import 2 Modal chi tiết vừa tạo
  import CustomerDetailModal from './components/modals/CustomerDetailModal.svelte';
  import UnexportedDetailModal from './components/modals/UnexportedDetailModal.svelte';

  let isAppReady = false;

  // Hàm tải dữ liệu khởi tạo (Để đảm bảo dữ liệu sẵn sàng trước khi render sâu)
  async function loadInitialData() {
      console.log("[App.svelte] Bắt đầu tải dữ liệu nền...");
      
      // 1. Tải dữ liệu Cache (Nặng nhất - chạy song song)
      await dataService.loadAllFromCache();

      // 2. Tải các cấu hình từ Cloud (Nhẹ hơn)
      try {
          const cloudDecl = await adminService.loadDeclarationsFromFirestore();
          declarations.set({
              hinhThucXuat: cloudDecl.hinhThucXuat || config.DEFAULT_DATA.HINH_THUC_XUAT_TINH_DOANH_THU.join('\n'),
              hinhThucXuatGop: cloudDecl.hinhThucXuatGop || config.DEFAULT_DATA.HINH_THUC_XUAT_TRA_GOP.join('\n'),
              heSoQuyDoi: cloudDecl.heSoQuyDoi || Object.entries(config.DEFAULT_DATA.HE_SO_QUY_DOI).map(([k, v]) => `${k},${v}`).join('\n')
          });
      } catch (e) { console.warn("Load Declarations error:", e); }

      // Load các danh mục khác song song để tăng tốc
      Promise.all([
          adminService.loadCategoryDataFromFirestore().then(({categories, brands}) => {
              if (categories.length) categoryStructure.set(categories);
              if (brands.length) brandList.set(brands);
          }),
          adminService.loadSpecialProductList().then(p => { if(p.length) specialProductList.set(p); }),
          adminService.loadCompetitionNameMappings().then(m => competitionNameMappings.set(m)),
          adminService.loadGlobalCompetitionConfigs().then(c => { if(c.length) globalCompetitionConfigs.set(c); }),
          adminService.loadGlobalSpecialPrograms().then(p => { if(p.length) globalSpecialPrograms.set(p); })
      ]).then(() => {
          console.log("[App.svelte] Hoàn tất tải dữ liệu nền.");
      });
  }

  onMount(async () => {
    // 1. Kiểm tra Auth
    const isLoggedIn = authService.initAuth();
    if (!isLoggedIn) {
        modalState.update(s => ({ ...s, activeModal: 'login-modal' }));
    }

    // 2. Bắt đầu tải dữ liệu (Không chặn UI render lần đầu nếu muốn fast load, nhưng ở đây ta await để đảm bảo data consistency)
    await loadInitialData();
    isAppReady = true;
  });

  afterUpdate(() => {
    if (window.feather) window.feather.replace();
  });
</script>

<InterfaceDrawer />
<GoalDrawer />
<AdminModal />
<LoginModal />
<UserCompetitionModal />
<UserSpecialProgramModal />

<CustomerDetailModal />
<UnexportedDetailModal />

<div class="flex min-h-screen bg-gray-50">
  <div id="sidebar-container">
    <Sidebar />
  </div>

  <main id="main-content">
    <div class="flex-1 p-6">
      <div class="max-w-full mx-auto">
        {#if !isAppReady}
            <div class="p-10 text-center text-gray-500 animate-pulse">
                <p>Đang khởi động ứng dụng...</p>
            </div>
        {:else}
            <HomeSection activeTab={$activeTab} />
            <DataSection activeTab={$activeTab} />
            <HealthSection activeTab={$activeTab} />
            <HealthEmployeeSection activeTab={$activeTab} />
            <RealtimeSection activeTab={$activeTab} />
            <DeclarationSection activeTab={$activeTab} />
        {/if}
      </div>
    </div>
  </main>
</div> 

<div id="modal-force-update-container"></div>
<div id="notification"></div>
<div id="modal-help-container"></div>
<div id="modal-chart-container"></div>
<div id="modal-composer-container"></div>
<div id="modal-preview-container"></div>
<div id="modal-selection-container"></div>
<div id="modal-customer-detail-container"></div>
<div id="modal-unexported-detail-container"></div>

<style>
  :global(#main-content) { 
    transition: margin-left 0.3s ease-in-out;
    margin-left: 68px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    flex: 1 1 0%;
  }

  :global(.page-header) { 
    display: flex; 
    flex-wrap: wrap; 
    justify-content: space-between; 
    align-items: center; 
    gap: 1rem; 
    margin-bottom: 1.5rem;
  }

  :global(.page-header__title) { 
    font-size: 1.75rem; 
    font-weight: 700; 
    color: #1f2937;
  }
</style>