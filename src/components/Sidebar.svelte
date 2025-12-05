<script>
  /* global feather */
  import { onMount } from 'svelte';
  import { activeTab, drawerState } from '../stores.js';

  // Hàm chuyển tab (Cập nhật store global)
  function navigateTo(targetId) {
    activeTab.set(targetId);
  }

  // Hàm mở Drawer (Cập nhật store global)
  function openDrawer(drawerId) {
    drawerState.update(state => ({ ...state, activeDrawer: drawerId }));
  }

  // Reactive: Helper để kiểm tra tab nào đang active (để tô màu)
  // $activeTab là cú pháp auto-subscription của Svelte
  $: currentTab = $activeTab;

  onMount(() => {
    if (typeof window.feather !== 'undefined') {
      window.feather.replace();
    }
  });
</script>

<nav id="sidebar" class="bg-white/80 backdrop-blur-sm shadow-lg fixed top-0 left-0 h-full z-30 p-3 flex flex-col justify-between">
    <div>
        <button 
           class="nav-link flex items-center p-3 rounded-lg font-semibold mb-4 w-full transition-colors
                  {currentTab === 'home-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
           on:click={() => navigateTo('home-section')}
         >
            <i data-feather="home"></i>
            <span class="menu-text">Hướng Dẫn & Góp Ý</span>
         </button>

        <ul class="space-y-2">
            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                         {currentTab === 'data-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('data-section')}
                >
                    <i data-feather="file-text"></i>
                    <span class="menu-text">Cập nhật dữ liệu</span>
                </button>
            </li>

            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                         {currentTab === 'health-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('health-section')}
                >
                    <i data-feather="activity"></i>
                    <span class="menu-text">Sức khỏe siêu thị</span>
                </button>
            </li>

            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                         {currentTab === 'health-employee-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('health-employee-section')}
                >
                    <i data-feather="users"></i>
                    <span class="menu-text">Sức khỏe nhân viên</span>
                </button>
            </li>

            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                         {currentTab === 'realtime-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('realtime-section')}
                >
                    <i data-feather="trending-up"></i>
                    <span class="menu-text">Doanh thu realtime</span>
                </button>
            </li>
        </ul>
    </div>

    <div>
        <ul class="space-y-2">
            <li>
                 <button 
                   id="interface-settings-btn" 
                   class="w-full flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                   on:click={() => openDrawer('interface-drawer')}
                >
                    <i data-feather="settings"></i>
                    <span class="menu-text">Cài đặt giao diện</span>
                </button>
            </li>

            <li>
                 <button 
                  id="goal-settings-btn" 
                  class="w-full flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                  on:click={() => openDrawer('goal-drawer')}
                >
                    <i data-feather="target"></i>
                    <span class="menu-text">Thiết lập mục tiêu</span>
                </button>
            </li>

            <li>
                <button 
                  id="admin-access-btn" 
                  class="w-full flex items-center p-3 rounded-lg font-semibold transition-colors
                         {currentTab === 'declaration-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('declaration-section')}
                >
                    <i data-feather="edit"></i>
                    <span class="menu-text">Khai báo</span>
                </button>
            </li>
        </ul>
    </div>
</nav>

<style>
  #sidebar { 
    width: 68px;
    transition: width 0.3s ease-in-out; 
    overflow-x: hidden; 
  }
  #sidebar:hover { 
    width: 256px;
  }
  #sidebar.menu-locked:hover { 
    width: 68px;
  }

  #sidebar .nav-link, #sidebar button {
    white-space: nowrap;
    gap: 1rem;
    justify-content: flex-start;
  }

  .menu-text {
    transition: opacity 0.2s ease-in-out, width 0.3s ease-in-out;
    opacity: 0;
    white-space: nowrap;
    width: 0;
    overflow: hidden;
  }
  #sidebar:hover .menu-text {
    opacity: 1;
    transition-delay: 0.1s;
    width: auto;
  }
  #sidebar.menu-locked:hover .menu-text {
    opacity: 0;
    width: 0;
  }

  #sidebar :global(.feather) {
    width: 1.5rem;
    height: 1.5rem;
    stroke-width: 2;
    flex-shrink: 0;
  }
</style>