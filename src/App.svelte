<script>
  import { onMount, afterUpdate } from 'svelte';
  
  import { activeTab, modalState } from './stores.js';
  import { authService } from './services/auth.service.js';

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

  // --- DRAWERS (THANH TRƯỢT) ---
  import InterfaceDrawer from './components/drawers/InterfaceDrawer.svelte';
  import GoalDrawer from './components/drawers/GoalDrawer.svelte';

  // --- MODALS (CỬA SỔ BẬT LÊN) ---
  import AdminModal from './components/modals/AdminModal.svelte';
  import LoginModal from './components/modals/LoginModal.svelte';
  import UserCompetitionModal from './components/modals/UserCompetitionModal.svelte';
  import UserSpecialProgramModal from './components/modals/UserSpecialProgramModal.svelte';
  
  // [MỚI] Trình tạo nhận xét
  import ComposerModal from './components/modals/ComposerModal.svelte';

  onMount(async () => {
    // 1. Kích hoạt đăng nhập ẩn danh Firebase (Hạ tầng)
    try {
        await authService.ensureAnonymousAuth();
    } catch (e) {
        console.error("Lỗi kết nối Firebase Auth:", e);
        // Có thể hiển thị thông báo lỗi global ở đây nếu cần
    }

    // 2. Kiểm tra định danh Email (Ứng dụng)
    const isLoggedIn = authService.initAuth();
    if (!isLoggedIn) {
        modalState.update(s => ({ ...s, activeModal: 'login-modal' }));
    }
  });

  // Cập nhật icon Feather sau mỗi lần giao diện thay đổi
  afterUpdate(() => {
    if (window.feather) window.feather.replace();
  });
</script>

<GlobalNotification />
<InterfaceDrawer />
<GoalDrawer />

<AdminModal />
<LoginModal />
<UserCompetitionModal />
<UserSpecialProgramModal />
<ComposerModal /> 

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
  /* Style toàn cục cho layout chính */
  :global(#main-content) { 
    transition: margin-left 0.3s ease-in-out;
    margin-left: 68px; /* Chừa chỗ cho Sidebar thu gọn */
    min-width: 0;
    display: flex;
    flex-direction: column;
    flex: 1 1 0%;
  }

  /* Style chung cho tiêu đề trang */
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