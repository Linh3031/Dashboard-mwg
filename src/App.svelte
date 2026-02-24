<script>
  import { onMount, afterUpdate, tick } from 'svelte';
  import { 
      activeTab, 
      modalState, 
      efficiencyConfig, 
      customRevenueTables, 
      customPerformanceTables,
      isAdmin, 
      warehouseCustomMetrics,
      selectedWarehouse,
      danhSachNhanVien,
      warehouseList,
      isDemoMode
  } from './stores.js';
  import { get } from 'svelte/store';
  import { authService } from './services/auth.service.js';
  import { adminService } from './services/admin.service.js';
  import { datasyncService } from './services/datasync.service.js';
  import { demoService } from './services/demo.service.js';
  import { DEMO_SNAPSHOT } from './data/demoFixtures.js';

  // --- COMPONENTS CHÍNH ---
  import Sidebar from './components/Sidebar.svelte';
  import HomeSection from './components/HomeSection.svelte';
  import DataSection from './components/DataSection.svelte';
  import HealthSection from './components/HealthSection.svelte';
  import HealthEmployeeSection from './components/HealthEmployeeSection.svelte';
  import RealtimeSection from './components/realtime/RealtimeSection.svelte';
  import DeclarationSection from './components/DeclarationSection.svelte';
  // --- COMMON UI ---
  import GlobalNotification from './components/common/GlobalNotification.svelte';
  import VersionManager from './components/common/VersionManager.svelte';
  // --- DRAWERS ---
  import InterfaceDrawer from './components/drawers/InterfaceDrawer.svelte';
  import GoalDrawer from './components/drawers/GoalDrawer.svelte';
  // --- MODALS ---
  import AdminModal from './components/modals/AdminModal.svelte';
  import LoginModal from './components/modals/LoginModal.svelte';
  import UserCompetitionModal from './components/modals/UserCompetitionModal.svelte';
  import UserSpecialProgramModal from './components/modals/UserSpecialProgramModal.svelte';
  import ComposerModal from './components/modals/composer/ComposerModal.svelte';
  import AddEfficiencyColumnModal from './components/modals/AddEfficiencyColumnModal.svelte';
  import AddRevenueTableModal from './components/modals/AddRevenueTableModal.svelte';
  import AddPerformanceTableModal from './components/modals/AddPerformanceTableModal.svelte';
  import UnexportedDetailModal from './components/modals/UnexportedDetailModal.svelte';
  import CustomerDetailModal from './components/modals/CustomerDetailModal.svelte';
  import StEmpCompetitionModal from './components/modals/StEmpCompetitionModal.svelte';
  // import DemoWelcomeModal from './components/modals/DemoWelcomeModal.svelte'; // <-- [TẮT DEMO] Comment import

  // Kiểm tra localStorage ngay khi khởi tạo
  // let isBootingDemo = typeof localStorage !== 'undefined' && localStorage.getItem('isDemoMode') === 'true';
  let isBootingDemo = false; // <-- [TẮT DEMO] Luôn ép về false để chạy chế độ thật
  
  // Nếu đang boot demo thì chưa sẵn sàng (false)
  let isAppReady = !isBootingDemo;

  onMount(async () => {
    // [LOGIC PHÂN LUỒNG]
    if (isBootingDemo) {
        // --- LUỒNG 1: CHẾ ĐỘ DEMO (OFFLINE FIRST) ---
        await initDemoMode();
    } else {
        // --- LUỒNG 2: CHẾ ĐỘ THỰC (ONLINE) ---
        // Đảm bảo xóa cờ demo nếu lỡ còn lưu
        if (typeof localStorage !== 'undefined') localStorage.removeItem('isDemoMode');
        await initRealMode();
    }
  });

  // [FIX] Hàm khởi tạo riêng cho Demo - Bỏ qua Auth và Fetch Server
  async function initDemoMode() {
      console.log("🚀 [Bootloader] Đang khởi động chế độ Demo...");
      isDemoMode.set(true);
      
      try {
          // 1. Nạp Snapshot
          await demoService.loadSnapshot(DEMO_SNAPSHOT);
          
          // 2. Chờ Store cập nhật
          await tick();

          // 3. Chọn kho mặc định từ dữ liệu vừa nạp
          const currentList = get(danhSachNhanVien);
          if (currentList && currentList.length > 0) {
              const firstWarehouse = currentList[0].maKho || "908";
              selectedWarehouse.set(firstWarehouse);
              // Cập nhật danh sách kho cho Select Box
              warehouseList.set([firstWarehouse]); 
          } else {
              selectedWarehouse.set("908");
          }
          
          // 4. Mở khóa giao diện
          isAppReady = true;
          console.log("✅ [Bootloader] Demo Ready -> Unlocking UI");

          // 5. Chuyển Tab (Delay nhẹ để UI render xong)
          setTimeout(() => {
              activeTab.set('realtime-section');
          }, 200);

      } catch (e) {
          console.error("❌ Lỗi nạp Demo:", e);
          alert("Không thể nạp dữ liệu Demo. Vui lòng thử lại.");
          // Fallback về chế độ thật nếu lỗi
          localStorage.removeItem('isDemoMode');
          window.location.reload();
      }
  }

  // [FIX] Hàm khởi tạo cho App thật
  async function initRealMode() {
      try { 
          await authService.ensureAnonymousAuth(); 
      } catch (e) { 
          console.error("Firebase Auth Error:", e); 
      }
      
      const isLoggedIn = authService.initAuth();
      if (!isLoggedIn) modalState.update(s => ({ ...s, activeModal: 'login-modal' }));

      // Load cấu hình từ Server (Chỉ chạy ở chế độ thật)
      await loadGlobalSystemConfig();
      await loadInitialTables();
      
      // Mở khóa giao diện ngay lập tức
      isAppReady = true;
  }

  // Hàm tải cấu hình hệ thống (CHỈ DÙNG CHO REAL MODE)
  async function loadGlobalSystemConfig() {
      try {
          await Promise.all([
              adminService.loadCategoryDataFromFirestore(),
              adminService.loadEfficiencyConfig(),
              adminService.loadSpecialProductList(),
              adminService.loadHomeConfig()       
          ]);
      } catch (error) {
          console.error("[App] Lỗi tải cấu hình hệ thống:", error);
      }
  }

  async function loadInitialTables() {
     const sysTables = await adminService.loadSystemPerformanceTables();
     customPerformanceTables.set(sysTables);
  }

  afterUpdate(() => {
    if (window.feather) window.feather.replace();
  });

  function handleSaveEffConfig(event) {
      const newItem = { ...event.detail };
      if ($activeTab === 'declaration-section') {
          newItem.isSystem = true;
          efficiencyConfig.update(items => {
              const idx = items.findIndex(i => i.id === newItem.id);
              if (idx >= 0) { items[idx] = newItem; return [...items]; } 
              else { return [...items, newItem]; }
          });
          adminService.saveEfficiencyConfig(get(efficiencyConfig));
      } 
      else {
          newItem.isSystem = false;
          let currentLocal = get(warehouseCustomMetrics) || [];
          const idx = currentLocal.findIndex(i => i.id === newItem.id);
          if (idx >= 0) {
              currentLocal[idx] = newItem;
          } else {
              currentLocal = [...currentLocal, newItem];
          }
          warehouseCustomMetrics.set(currentLocal);
          const wh = get(selectedWarehouse);
          if(wh) {
               datasyncService.saveCustomMetrics(wh, currentLocal);
          } else {
              alert("Vui lòng chọn Kho để lưu chỉ số này.");
          }
      }
  }

  async function handleSaveCustomTable(event) {
      const newItem = event.detail;
      customRevenueTables.update(items => {
          const idx = items.findIndex(i => i.id === newItem.id);
          if (idx >= 0) { 
              items[idx] = { ...items[idx], ...newItem }; 
              return [...items]; 
          } else { 
              return [...items, newItem]; 
          }
      });
      if (newItem.isSystem) {
          const currentSystemTables = get(customRevenueTables).filter(t => t.isSystem);
          await adminService.saveSystemRevenueTables(currentSystemTables);
          console.log("Đã lưu bảng hệ thống lên Admin Cloud");
      } else {
          const currentPersonalTables = get(customRevenueTables).filter(t => !t.isSystem);
          localStorage.setItem('customRevenueTables', JSON.stringify(currentPersonalTables));
          const wh = get(selectedWarehouse);
          if (wh) {
              await datasyncService.savePersonalRevenueTables(wh, currentPersonalTables);
          }
          console.log("Đã lưu bảng cá nhân");
      }
  }

  async function handleSavePerformanceTable(event) {
      const newItem = event.detail;
      customPerformanceTables.update(items => {
          const idx = items.findIndex(i => i.id === newItem.id);
          if (idx >= 0) {
              items[idx] = { ...items[idx], ...newItem };
              return [...items];
          } else {
             return [...items, newItem];
          }
      });
      if (newItem.isSystem) {
          const systemTables = get(customPerformanceTables).filter(t => t.isSystem);
          await adminService.saveSystemPerformanceTables(systemTables);
      } else {
          const personalTables = get(customPerformanceTables).filter(t => !t.isSystem);
          const wh = get(selectedWarehouse);
          if (wh) {
              await datasyncService.savePersonalPerformanceTables(wh, personalTables);
          } else {
              alert("Vui lòng chọn Kho để lưu bảng cá nhân.");
          }
      }
  }

  const closeModal = () => modalState.update(s => ({ ...s, activeModal: null, payload: null }));

  $: {
      if ($danhSachNhanVien && $danhSachNhanVien.length > 0) {
          const uniqueWarehouses = [...new Set($danhSachNhanVien
              .map(nv => nv.maKho)
              .filter(k => k && String(k).trim() !== '')
          )].sort();
          warehouseList.set(uniqueWarehouses);
      }
  }

  function exitDemoMode() {
    if(confirm('Bạn có chắc muốn thoát chế độ Demo?')) {
        isDemoMode.set(false);
        localStorage.removeItem('isDemoMode');
        window.location.reload();
    }
  }
</script>

<GlobalNotification />
<VersionManager />

<InterfaceDrawer />
<GoalDrawer />

<AdminModal />
<LoginModal />
<UserCompetitionModal />
<UserSpecialProgramModal />
<ComposerModal /> 
<StEmpCompetitionModal />

{#if $modalState.activeModal === 'unexported-detail-modal'}
    <UnexportedDetailModal 
        unexportedDetails={$modalState.payload?.unexportedDetails || []}
        on:close={closeModal}
    />
{/if}

{#if $modalState.activeModal === 'customer-detail-modal'}
    <CustomerDetailModal 
        customers={$modalState.payload?.customers || []}
        mucTieu={$modalState.payload?.mucTieu || {}}
        on:close={closeModal}
    />
{/if}

<AddRevenueTableModal 
    isOpen={$modalState.activeModal === 'add-revenue-table-modal'} 
    editItem={$modalState.payload}
    on:close={closeModal}
    on:save={handleSaveCustomTable}
/>

<AddPerformanceTableModal
    isOpen={$modalState.activeModal === 'add-performance-table-modal'}
    editItem={$modalState.payload}
    isSystem={$modalState.isSystem || false}
    on:close={closeModal}
    on:save={handleSavePerformanceTable}
/>

<AddEfficiencyColumnModal 
    isOpen={$modalState.activeModal === 'add-efficiency-modal'} 
    editItem={$modalState.payload}
    isAdmin={$activeTab === 'declaration-section'}
    on:close={closeModal}
    on:save={handleSaveEffConfig}
/>

{#if $isDemoMode}
<div class="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 bg-indigo-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-indigo-500 animate-bounce-in">
    <div class="flex flex-col">
        <span class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Môi trường</span>
        <span class="font-bold">ĐANG CHẠY DEMO</span>
    </div>
    <div class="h-8 w-[1px] bg-indigo-700 mx-1"></div>
    <button 
        on:click={exitDemoMode}
        class="bg-white text-indigo-900 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
    >
        Thoát
    </button>
</div>
{/if}

<div class="flex min-h-screen">
  <div id="sidebar-container">
    <Sidebar />
  </div>

  <main id="main-content">
    <div class="flex-1 p-6">
      <div class="max-w-full mx-auto">
        {#if isAppReady}
            <HomeSection activeTab={$activeTab} />
            <DataSection activeTab={$activeTab} />
            <HealthSection activeTab={$activeTab} />
            <HealthEmployeeSection activeTab={$activeTab} />
            <RealtimeSection activeTab={$activeTab} />
            <DeclarationSection activeTab={$activeTab} />
        {:else}
            <div class="flex flex-col items-center justify-center h-[80vh] text-gray-400">
                <svg class="animate-spin h-10 w-10 mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="font-medium">Đang thiết lập môi trường Demo...</p>
            </div>
        {/if}
      </div>
    </div>
  </main>
</div> 

<div id="modal-force-update-container"></div>
<div id="modal-help-container"></div>
<div id="modal-chart-container"></div>
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
  
  @keyframes bounceIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
  }
  .animate-bounce-in {
      animation: bounceIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
  }
</style>