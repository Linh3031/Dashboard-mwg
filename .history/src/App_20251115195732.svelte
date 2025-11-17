<script>
  /* global feather */ // <-- THÊM DÒNG NÀY
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
    // Sửa thành 'window.feather' để an toàn
    if (typeof window.feather !== 'undefined') {
      window.feather.replace();
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
    alert('Bắt được tín hiệu mở: ' + event.detail.target);
  }
</script>