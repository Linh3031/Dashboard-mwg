<script>
  import { onMount, afterUpdate } from 'svelte';
  
  import { 
      activeTab, 
      modalState, 
      efficiencyConfig, 
      customRevenueTables, 
      customPerformanceTables,
      isAdmin, 
      warehouseCustomMetrics,
      selectedWarehouse,
      // [FIX] Thêm import store dữ liệu để xử lý bộ lọc kho
      danhSachNhanVien,
      warehouseList
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
  // [MỚI] Import trình quản lý phiên bản
  import VersionManager from './components/common/VersionManager.svelte';
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
  import AddPerformanceTableModal from './components/modals/AddPerformanceTableModal.svelte';
  // [FIX] Import 2 Modal chi tiết còn thiếu
  import UnexportedDetailModal from './components/modals/UnexportedDetailModal.svelte';
  import CustomerDetailModal from './components/modals/CustomerDetailModal.svelte';

  onMount(async () => {
    try { await authService.ensureAnonymousAuth(); } catch (e) { console.error("Firebase Auth Error:", e); }
    const isLoggedIn = authService.initAuth();
    if (!isLoggedIn) modalState.update(s => ({ ...s, activeModal: 'login-modal' }));
    
    // Load bảng hiệu quả khi khởi động
    loadInitialTables();
  });

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

  // Hàm đóng modal chung
  const closeModal = () => modalState.update(s => ({ ...s, activeModal: null, payload: null }));

  // [FIX] Logic tự động cập nhật danh sách kho khi có dữ liệu nhân viên
  $: {
      if ($danhSachNhanVien && $danhSachNhanVien.length > 0) {
          // Lọc danh sách mã kho duy nhất
          const uniqueWarehouses = [...new Set($danhSachNhanVien
              .map(nv => nv.maKho)
              .filter(k => k && String(k).trim() !== '')
          )].sort();
          
          warehouseList.set(uniqueWarehouses);
          // console.log("[App] Warehouse list updated:", uniqueWarehouses);
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