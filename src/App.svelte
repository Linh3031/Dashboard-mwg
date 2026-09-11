<script>
  import { onMount, afterUpdate, tick } from 'svelte';
  import { 
      activeTab, 
      modalState, 
      efficiencyConfig,
      customPerformanceTables,
      isAdmin, 
      warehouseCustomMetrics,
      selectedWarehouse,
      danhSachNhanVien,
      warehouseList,
      isDemoMode,
      declarations,
      masterReportData,
      currentUser,
      userProfile
  } from './stores.js';
  import { get } from 'svelte/store';
  import { config } from './config.js';
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

  import ToolsSection from './components/ToolsSection.svelte';

  // --- COMMON UI ---
  import GlobalNotification from './components/common/GlobalNotification.svelte';
  import VersionManager from './components/common/VersionManager.svelte';
  import FastTagPicker from './components/common/FastTagPicker.svelte';

  // --- DRAWERS ---
  import InterfaceDrawer from './components/drawers/InterfaceDrawer.svelte';
  import GoalDrawer from './components/drawers/GoalDrawer.svelte';

  // --- MODALS ---
  import QuickGoalModal from './components/modals/QuickGoalModal.svelte';
  import AdminModal from './components/modals/AdminModal.svelte';
  import LoginModal from './components/modals/LoginModal.svelte';
  import UserCompetitionModal from './components/modals/UserCompetitionModal.svelte';
  import UserSpecialProgramModal from './components/modals/UserSpecialProgramModal.svelte';
  import ComposerModal from './components/modals/composer/ComposerModal.svelte';
  import UnexportedDetailModal from './components/modals/UnexportedDetailModal.svelte';
  import CustomerDetailModal from './components/modals/CustomerDetailModal.svelte';
  import StEmpCompetitionModal from './components/modals/StEmpCompetitionModal.svelte';

  import UnifiedConfigModal from './components/modals/UnifiedConfigModal.svelte';
  import AddDailyTrendModal from './components/modals/dailytrend/AddDailyTrendModal.svelte';
  import CapturePreviewModal from './components/modals/CapturePreviewModal.svelte';
  
  let isBootingDemo = false;
  let isAppReady = !isBootingDemo;
  let isAuthChecking = true; 
  let hasLoadedSystemConfig = false;

  onMount(async () => {
    if (isBootingDemo) {
        await initDemoMode();
    } else {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('isDemoMode');
        await initRealMode();
    }
  });

  async function initDemoMode() {
      console.log("🚀 [Bootloader] Đang khởi động chế độ Demo...");
      isDemoMode.set(true);
      
      try {
          await demoService.loadSnapshot(DEMO_SNAPSHOT);
          await tick();
          const currentList = get(danhSachNhanVien);
          if (currentList && currentList.length > 0) {
              const firstWarehouse = currentList[0].maKho || "908";
              selectedWarehouse.set(firstWarehouse);
              warehouseList.set([firstWarehouse]);
          } else {
              selectedWarehouse.set("908");
          }
          
          isAppReady = true;
          isAuthChecking = false;
          console.log("✅ [Bootloader] Demo Ready -> Unlocking UI");

          setTimeout(() => {
              activeTab.set('realtime-section');
          }, 200);
      } catch (e) {
          console.error("❌ Lỗi nạp Demo:", e);
          alert("Không thể nạp dữ liệu Demo. Vui lòng thử lại.");
          localStorage.removeItem('isDemoMode');
          window.location.reload();
      }
  }

  async function initRealMode() {
      if (config.REQUIRE_LOGIN === false) {
          try {
              await authService.ensureAnonymousAuth();
          } catch (e) {
              console.error("[App] Lỗi đăng nhập ẩn danh:", e);
          }
      }

      authService.initAuthListener(async () => {
          // [PHẪU THUẬT LOGIC]: Giải phóng giao diện mạng lập tức (Tắt màn hình đen)
          isAuthChecking = false; 

          // Dữ liệu vẫn sẽ chạy ngầm, lúc này giao diện đã hiện ra với spinner nhỏ bên trong
          const user = get(currentUser);
          const hasSession = user || config.REQUIRE_LOGIN === false;
          if (hasSession && !hasLoadedSystemConfig) {
              // [FIX] Đánh dấu đã tải TRƯỚC khi await, tránh 2 lượt onResolved() gọi sát nhau
              // (vd đăng nhập thất bại rồi thành công ngay sau) cùng lọt qua điều kiện này và
              // gọi loadGlobalSystemConfig() chồng nhau.
              hasLoadedSystemConfig = true;
              await loadGlobalSystemConfig();
              await loadInitialTables();
          }
          
          // Khi data kéo xong, giải phóng nốt spinner nội dung
          isAppReady = true;
      });
  }

  async function loadGlobalSystemConfig() {
      try {
          const declData = await adminService.loadDeclarationsFromFirestore();
          if (declData) {
              declarations.set(declData);
          }

          await Promise.all([
              adminService.loadCategoryDataFromFirestore(),
              adminService.loadEfficiencyConfig(),
              adminService.loadSpecialProductList(),
              adminService.loadHomeConfig(),
              (typeof adminService.loadHelpContent === 'function') ? adminService.loadHelpContent() : Promise.resolve()
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
          // Chỉ số cá nhân lưu theo TỪNG kho -> cần đích danh 1 kho, không phải "Tất cả"/Cụm
          if (wh && wh !== 'ALL' && !String(wh).startsWith('CLUSTER_')) {
               datasyncService.saveCustomMetrics(wh, currentLocal);
          } else {
              alert("Vui lòng chọn đích danh 1 Kho (không phải Tất cả/Cụm) để lưu chỉ số này.");
          }
      }
  }

  async function handleSavePerformanceTable(event) {
      const newItem = event.detail;
      // [PHẪU THUẬT] Nơi lưu quyết định bởi bối cảnh (đang ở trang Admin hay không),
      // không dựa vào newItem.isSystem — để user sửa 1 bảng hệ thống từ tab Lũy kế/Realtime
      // sẽ tạo bản ghi đè cá nhân theo kho, không đụng bảng gốc của Admin (giống chỉ số hiệu quả).
      const isAdminContext = get(activeTab) === 'declaration-section';
      newItem.isSystem = isAdminContext;
      customPerformanceTables.update(items => {
          const idx = items.findIndex(i => i.id === newItem.id);
          if (idx >= 0) {
              items[idx] = { ...items[idx], ...newItem };
              return [...items];
          } else {
             return [...items, newItem];
          }
      });
      if (isAdminContext) {
          const systemTables = get(customPerformanceTables).filter(t => t.isSystem);
          await adminService.saveSystemPerformanceTables(systemTables);
      } else {
          const wh = get(selectedWarehouse);
          // Bảng cá nhân lưu theo TỪNG kho -> cần đích danh 1 kho, không phải "Tất cả"/Cụm
          if (wh && wh !== 'ALL' && !String(wh).startsWith('CLUSTER_')) {
              const personalTables = get(customPerformanceTables).filter(t => !t.isSystem);
              await datasyncService.savePersonalPerformanceTables(wh, personalTables);
          } else {
              alert("Vui lòng chọn đích danh 1 Kho (không phải Tất cả/Cụm) để lưu bảng cá nhân.");
          }
      }
  }

  function handleUnifiedSave(event) {
      const { type, payload } = event.detail;
      const activeModal = get(modalState).activeModal;

      const fakeEvent = { detail: payload };

      if (type === 'INDICATOR' || activeModal === 'add-efficiency-modal' || activeModal === 'add-metric-modal') {
          handleSaveEffConfig(fakeEvent);
      } else {
          handleSavePerformanceTable(fakeEvent);
      }

      closeModal();
  }

  const closeModal = () => modalState.update(s => ({ ...s, activeModal: null, payload: null }));

  // Đăng nhập thật thành công qua overlay tự chọn (khi REQUIRE_LOGIN=false) thì tự đóng overlay
  $: if ($currentUser && $modalState.activeModal === 'login-overlay') closeModal();

  $: {
      $userProfile;
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

{#if isAuthChecking}
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
        <div class="flex flex-col items-center">
            <svg class="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span class="text-white text-sm font-semibold tracking-wide">Đang xác thực phiên đăng nhập...</span>
        </div>
    </div>
{:else if config.REQUIRE_LOGIN && !$currentUser}
    <LoginModal />
{:else}
    <VersionManager />
    <FastTagPicker />

    <InterfaceDrawer />
    <GoalDrawer />

    <AdminModal />
    <QuickGoalModal />
    <UserCompetitionModal />
    <UserSpecialProgramModal />
    <ComposerModal /> 
    <StEmpCompetitionModal />

    {#if $modalState.activeModal === 'login-overlay'}
        <LoginModal dismissable on:close={closeModal} />
    {/if}

    {#if $modalState.activeModal === 'capture-preview'}
        <CapturePreviewModal payload={$modalState.payload} />
    {/if}

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

    <UnifiedConfigModal
        isOpen={['add-performance-table-modal', 'add-efficiency-modal', 'add-metric-modal'].includes($modalState.activeModal)}
        editItem={$modalState.payload}
        isSystem={$modalState.isSystem || $activeTab === 'declaration-section'}
        on:close={closeModal}
        on:save={handleUnifiedSave}
    />

    <AddDailyTrendModal />

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
                
                <ToolsSection activeTab={$activeTab} />
            {:else}
                <div class="flex flex-col items-center justify-center h-[80vh] text-gray-400">
                    <svg class="animate-spin h-10 w-10 mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="font-medium">Đang thiết lập môi trường...</p>
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
{/if}

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