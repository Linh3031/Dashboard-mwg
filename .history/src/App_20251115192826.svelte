<script>
  import { onMount } from 'svelte';
  import Sidebar from './components/Sidebar.svelte'; // <-- BƯỚC 2: Thêm dòng này

  // Biến để theo dõi tab đang hoạt động
  let activeTab = 'data-section'; // Bắt đầu ở tab "Cập nhật dữ liệu"

  // Chạy sau khi component được tải lên DOM
  onMount(() => {
    // Rất quan trọng: Chạy Feather Icons để vẽ các icon
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });

  // Hàm để chuyển tab (chúng ta sẽ lập trình nó sau)
  function switchTab(targetId) {
    activeTab = targetId;
  }

  // Hàm để kích hoạt các icon sau khi Svelte cập nhật DOM
  function updateIcons() {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }

  // $: ... là một "reactive statement" của Svelte.
  // Nó sẽ tự động chạy lại mỗi khi biến activeTab thay đổi.
  $: if (activeTab) {
    // Đảm bảo các icon được vẽ lại khi chuyển tab
    // (Bây giờ Sidebar tự quản lý icon của nó, 
    // nhưng chúng ta sẽ giữ cái này cho các icon trong <main>)
    Promise.resolve().then(updateIcons);
  }

</script>

<div id="interface-drawer-container"></div>
<div id="goal-drawer-container"></div>
<div id="drawer-overlay" class="hidden fixed inset-0 bg-black bg-opacity-40 z-40"></div>

<div class="flex min-h-screen">
  
  <div id="sidebar-container">
    <Sidebar /> </div>

  <main id="main-content" class="flex-1 p-6">
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

      <section id="data-section" class="page-section {activeTab === 'data-section' ? '' : 'hidden'}">
        <div class="page-header">
          <h2 class="page-header__title">Cập nhật dữ liệu</h2>
        </div>
        <div class="content-card">
          <h3 class="content-card__header">Nơi nhập liệu (Đây là Tab Cập nhật dữ liệu)</h3>
        </div>
      </section>

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