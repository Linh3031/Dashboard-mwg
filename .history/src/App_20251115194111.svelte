<script>
  import { onMount } from 'svelte';
  import Sidebar from './components/Sidebar.svelte';
  import DataSection from './components/DataSection.svelte';

  let activeTab = 'data-section';

  onMount(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });

  function switchTab(targetId) {
    activeTab = targetId;
  }

  // Hàm xử lý sự kiện chuyển tab
  function handleNavigation(event) {
    console.log('App.svelte nhận được tín hiệu NAVIGATE:', event.detail.target);
    switchTab(event.detail.target);
  }

  // <-- THÊM MỚI: Hàm xử lý sự kiện mở Drawer -->
  function handleOpenDrawer(event) {
    console.log('App.svelte nhận được tín hiệu OPEN DRAWER:', event.detail.target);
    // Tạm thời chúng ta chỉ log ra, bước sau sẽ tạo component drawer
    alert('Bắt được tín hiệu mở: ' + event.detail.target);
  }

  function updateIcons() {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }

  $: if (activeTab) {
    Promise.resolve().then(updateIcons);
  }

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

        <section id="home-section" class="page-section {activeTab === 'home-section' ? '' : 'hidden'}">
          <div class="page-header">
            <h2 class="page-header__title">Hướng Dẫn & Góp Ý</h2>
            <div id="usage-counter-display" class="text-sm font-semibold">
              <span class="text-blue-600">Người dùng:</span>
              <span id="user-count" class="text-red-600 font-bold">-</span>
              </div>
          </div>
          <div class="content-card">
            <h3 class="content-card__header">Chào mừng (Đây là Tab Hướng Dẫn)</h3>
          </div>
        </section>

        <DataSection {activeTab} />

        <section id="health-section" class="page-section {activeTab === 'health-section' ? '' : 'hidden'}">
          <div class="page-header">
            <h2 class="page-header__title">Sức khỏe siêu thị</h2>
          </div>
          <div class="content-card">
            <h3 class="content-card__header">Báo cáo Lũy kế (Đây là Tab Sức khỏe ST)</h3>
          </div>
        </section>

        <section id="health-employee-section" class="page-section {activeTab === 'health-employee-section' ? '' : 'hidden'}">
          <div class="page-header">
            <h2 class="page-header__title">Sức khỏe nhân viên</h2>
          </div>
          <div class="content-card">
            <h3 class="content-card__header">Báo cáo SKNV (Đây là Tab Sức khỏe NV)</h3>
          </div>
        </section>

        <section id="realtime-section" class="page-section {activeTab === 'realtime-section' ? '' : 'hidden'}">
          <div class="page-header">
            <h2 class="page-header__title">Doanh thu realtime</h2>
          </div>
          <div class="content-card">
            <h3 class="content-card__header">Báo cáo Realtime (Đây là Tab Realtime)</h3>
          </div>
        </section>

        <section id="declaration-section" class="page-section {activeTab === 'declaration-section' ? '' : 'hidden'}">
          <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Khai báo dữ liệu</h2>
          <div class="content-card">
            <h3 class="content-card__header">Khu vực Admin (Đây là Tab Khai báo)</h3>
          </div>
        </section>

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
  /* :global() là một cú pháp của Svelte để nói rằng:
    "Hãy áp dụng style này cho #main-content ở BẤT CỨ ĐÂU, 
    không chỉ riêng bên trong component này."
  */
  :global(#main-content) { 
    transition: margin-left 0.3s ease-in-out; 
    margin-left: 68px; 
    min-width: 0; /* Ngăn flex item co giãn theo nội dung con (cái bảng rộng) */
    
    /* Lấy phần còn lại của CSS từ layout.css cũ */
    display: flex; /* Thêm flex để <div> con bên trong co giãn */
    flex-direction: column; /* Xếp <div> con theo chiều dọc */
    flex: 1 1 0%; /* Đảm bảo <main> chiếm phần còn lại */
  }

  /* Chúng ta cũng cần định nghĩa lại các class cho page-header
    vì chúng ta đã xóa chúng khỏi layout.css trong dự án Svelte
    (CSS này được lấy từ layout.css cũ)
  */
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