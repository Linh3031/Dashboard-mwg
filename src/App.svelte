<script>
  import { onMount, afterUpdate } from 'svelte';
  
  import { 
      activeTab, 
      modalState, 
      efficiencyConfig, 
      customRevenueTables, 
      // [NEW] Store cho bảng hiệu quả
      customPerformanceTables,
      isAdmin, 
      warehouseCustomMetrics,
      selectedWarehouse
  } from './stores.js'; 
  import { get } from 'svelte/store';
  import { authService } from './services/auth.service.js';
  import { adminService } from './services/admin.service.js';
  import { datasyncService } from './services/datasync.service.js';

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

  // --- DRAWERS ---
  import InterfaceDrawer from './components/drawers/InterfaceDrawer.svelte';
  import GoalDrawer from './components/drawers/GoalDrawer.svelte';

  // --- MODALS ---
  import AdminModal from './components/modals/AdminModal.svelte';
  import LoginModal from './components/modals/LoginModal.svelte';
  import UserCompetitionModal from './components/modals/UserCompetitionModal.svelte';
  import UserSpecialProgramModal from './components/modals/UserSpecialProgramModal.svelte';
  import ComposerModal from './components/modals/ComposerModal.svelte';
  import AddEfficiencyColumnModal from './components/modals/AddEfficiencyColumnModal.svelte';
  import AddRevenueTableModal from './components/modals/AddRevenueTableModal.svelte';
  // [NEW] Import Modal mới
  import AddPerformanceTableModal from './components/modals/AddPerformanceTableModal.svelte';

  onMount(async () => {
    try { await authService.ensureAnonymousAuth(); } catch (e) { console.error("Firebase Auth Error:", e); }
    const isLoggedIn = authService.initAuth();
    if (!isLoggedIn) modalState.update(s => ({ ...s, activeModal: 'login-modal' }));
    
    // [NEW] Load bảng hiệu quả khi khởi động (User bảng sẽ load khi chọn kho)
    loadInitialTables();
  });

  async function loadInitialTables() {
     const sysTables = await adminService.loadSystemPerformanceTables();
     customPerformanceTables.set(sysTables);
  }

  afterUpdate(() => {
    if (window.feather) window.feather.replace();
  });

  // [FIX] Tách biệt logic lưu Admin vs User
  function handleSaveEffConfig(event) {
      // Clone object để tránh tham chiếu
      const newItem = { ...event.detail };
      
      // LOGIC ADMIN (Tab Khai Báo)
      if ($activeTab === 'declaration-section') {
          // Admin thì đánh dấu isSystem = true (nếu chưa có)
          newItem.isSystem = true;
          
          efficiencyConfig.update(items => {
              const idx = items.findIndex(i => i.id === newItem.id);
              if (idx >= 0) { items[idx] = newItem; return [...items]; } 
              else { return [...items, newItem]; }
          });
          adminService.saveEfficiencyConfig(get(efficiencyConfig));
      } 
      // LOGIC USER (Tab Lũy kế / Realtime)
      else {
      
          // User thì đánh dấu isSystem = false
          newItem.isSystem = false;

          let currentLocal = get(warehouseCustomMetrics) || [];
          const idx = currentLocal.findIndex(i => i.id === newItem.id);
          
          if (idx >= 0) {
              // Sửa
              currentLocal[idx] = newItem;
          } else {
              // Thêm mới
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

  // [CẬP NHẬT] Xử lý lưu bảng doanh thu (Phân quyền Admin vs User)
  async function handleSaveCustomTable(event) {
      const newItem = event.detail;
      
      // 1. Cập nhật Store hiển thị tức thì
      customRevenueTables.update(items => {
          const idx = items.findIndex(i => i.id === newItem.id);
          if (idx >= 0) { 
              items[idx] = { ...items[idx], ...newItem }; // Merge để giữ các props khác
              return [...items]; 
          } else { 
              return [...items, newItem]; 
          }
      });
      
      // 2. Phân loại nơi lưu trữ
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

  // [NEW] Xử lý lưu Bảng Hiệu Quả (Performance Table)
  async function handleSavePerformanceTable(event) {
      const newItem = event.detail;
      
      // 1. Cập nhật Store hiển thị
      customPerformanceTables.update(items => {
          const idx = items.findIndex(i => i.id === newItem.id);
          if (idx >= 0) {
              items[idx] = { ...items[idx], ...newItem };
              return [...items];
          } else {
              return [...items, newItem];
          }
      });

      // 2. Phân luồng lưu trữ
      if (newItem.isSystem) {
          // Admin System Table
          const systemTables = get(customPerformanceTables).filter(t => t.isSystem);
          await adminService.saveSystemPerformanceTables(systemTables);
      } else {
          // User Personal Table
          const personalTables = get(customPerformanceTables).filter(t => !t.isSystem);
          const wh = get(selectedWarehouse);
          if (wh) {
              await datasyncService.savePersonalPerformanceTables(wh, personalTables);
          } else {
              alert("Vui lòng chọn Kho để lưu bảng cá nhân.");
          }
      }
  }
</script>

<GlobalNotification />
<InterfaceDrawer />
<GoalDrawer />

<AdminModal />
<LoginModal />
<UserCompetitionModal />
<UserSpecialProgramModal />
<ComposerModal /> 

<AddRevenueTableModal 
    isOpen={$modalState.activeModal === 'add-revenue-table-modal'} 
    editItem={$modalState.payload}
    on:close={() => modalState.update(s => ({ ...s, activeModal: null, payload: null }))}
    on:save={handleSaveCustomTable}
/>

<AddPerformanceTableModal
    isOpen={$modalState.activeModal === 'add-performance-table-modal'}
    editItem={$modalState.payload}
    isSystem={$modalState.isSystem || false}
    on:close={() => modalState.update(s => ({ ...s, activeModal: null, payload: null }))}
    on:save={handleSavePerformanceTable}
/>

<AddEfficiencyColumnModal 
    isOpen={$modalState.activeModal === 'add-efficiency-modal'} 
    editItem={$modalState.payload}
    isAdmin={$activeTab === 'declaration-section'}
    on:close={() => modalState.update(s => ({ ...s, activeModal: null, payload: null }))}
    on:save={handleSaveEffConfig}
/>

<div class="flex min-h-screen">
  <div id="sidebar-container">
    <Sidebar />
  </div>

  <main id="main-content">
    <div class="flex-1 p-6">
      <div class="max-w-full mx-auto">
        <HomeSection activeTab={$activeTab} />
        <DataSection activeTab={$activeTab} />
        <HealthSection activeTab={$activeTab} />
        <HealthEmployeeSection activeTab={$activeTab} />
        <RealtimeSection activeTab={$activeTab} />
        <DeclarationSection activeTab={$activeTab} />
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
</style>