<script>
  import { onMount } from 'svelte';
  
  // Import các component con
  import Sidebar from './components/Sidebar.svelte';
  import HomeSection from './components/HomeSection.svelte';
  import DataSection from './components/DataSection.svelte';
  import HealthSection from './components/HealthSection.svelte';
  import HealthEmployeeSection from './components/HealthEmployeeSection.svelte';
  import RealtimeSection from './components/RealtimeSection.svelte';
  import DeclarationSection from './components/DeclarationSection.svelte';

  // Biến state chính
  let activeTab = 'data-section';

  onMount(() => {
    // Chỉ chạy Feather Icons cho các icon bên ngoài <main>
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });

  // Hàm xử lý sự kiện chuyển tab
  function handleNavigation(event) {
    console.log('App.svelte nhận được tín hiệu NAVIGATE:', event.detail.target);
    activeTab = event.detail.target;
  }

  // Hàm xử lý sự kiện mở Drawer
  function handleOpenDrawer(event) {
    console.log('App.svelte nhận được tín hiệu OPEN DRAWER:', event.detail.target);
    // Tạm thời chúng ta chỉ log ra, bước sau sẽ tạo component drawer
    alert('Bắt được tín hiệu mở: ' + event.detail.target);
  }

  /* Chúng ta không cần $: activeTab nữa vì mỗi component
    con sẽ tự xử lý việc chạy feather.replace() khi
    thuộc tính 'activeTab' của nó thay đổi.
  */

</script>

<div id="interface-drawer-container"></div>
<div id="goal-drawer-container"></div>
<div id="drawer-overlay" class="hidden fixed inset-0 bg-black bg-opacity-40 z-40"></div>

<div class="flex min-h-screen">
  
  <div id="sidebar-container">
    <Sidebar 
      on:navigate={handleNavigation} 
      on:openDrawer={handleOpenDrawer}
    />
  </div>

  <main id="main-content">
    <div class="flex-1 p-6">
      <div class="max-w-full mx-auto">

        <HomeSection {activeTab} />
        <DataSection {activeTab} />
        <HealthSection {activeTab} />
        <HealthEmployeeSection {activeTab} />
        <RealtimeSection {activeTab} />
        <DeclarationSection {activeTab} />

      </div>
    </div>
  </main>

</div> <div id="modal-force-update-container"></div>
<div id="notification"></div>
<div id="modal-admin-container"></div>
<div id="modal-login-container"></div>
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