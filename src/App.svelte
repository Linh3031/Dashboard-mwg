<script>
  import { onMount, afterUpdate } from 'svelte';
  
  import { activeTab, modalState, efficiencyConfig, customRevenueTables, isAdmin } from './stores.js'; // Import isAdmin
  import { authService } from './services/auth.service.js';
  import { adminService } from './services/admin.service.js';

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

  onMount(async () => {
    try { await authService.ensureAnonymousAuth(); } catch (e) { console.error("Firebase Auth Error:", e); }
    const isLoggedIn = authService.initAuth();
    if (!isLoggedIn) modalState.update(s => ({ ...s, activeModal: 'login-modal' }));
  });

  afterUpdate(() => {
    if (window.feather) window.feather.replace();
  });

  function handleSaveEffConfig(event) {
      const newItem = event.detail;
      efficiencyConfig.update(items => {
          const idx = items.findIndex(i => i.id === newItem.id);
          if (idx >= 0) { items[idx] = newItem; return [...items]; } 
          else { return [...items, newItem]; }
      });
      adminService.saveEfficiencyConfig($efficiencyConfig);
  }

  // [CẬP NHẬT] Xử lý lưu bảng doanh thu (Local + Cloud)
  async function handleSaveCustomTable(event) {
      const newItem = event.detail;
      let currentTables = [];
      
      customRevenueTables.update(items => {
          const idx = items.findIndex(i => i.id === newItem.id);
          if (idx >= 0) { items[idx] = newItem; return [...items]; } 
          else { return [...items, newItem]; }
      });
      
      // Lấy giá trị mới nhất để lưu
      customRevenueTables.subscribe(val => currentTables = val)();

      // Lưu LocalStorage (cho User)
      localStorage.setItem('customRevenueTables', JSON.stringify(currentTables));

      // [QUAN TRỌNG] Nếu là bảng hệ thống (isSystem) và có quyền Admin -> Lưu lên Cloud
      if (newItem.isSystem) {
          await adminService.saveSystemRevenueTables(currentTables);
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

<AddEfficiencyColumnModal 
    isOpen={$modalState.activeModal === 'add-efficiency-modal'} 
    editItem={$modalState.payload}
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