<script>
  import { afterUpdate } from 'svelte';
  
  // Import các component con
  import AdminCategory from './admin/AdminCategory.svelte';
  import AdminSpecialProducts from './admin/AdminSpecialProducts.svelte';
  import AdminCalculation from './admin/AdminCalculation.svelte';
  import AdminMappings from './admin/AdminMappings.svelte';
  import AdminHelp from './admin/AdminHelp.svelte';
  import AdminUserStats from './admin/AdminUserStats.svelte';
  import AdminCompetition from './admin/AdminCompetition.svelte';
  import AdminHomeConfig from './admin/AdminHomeConfig.svelte';
  import AdminRevenueTables from './admin/AdminRevenueTables.svelte';
  import AdminEfficiency from './admin/AdminEfficiency.svelte';

  export let activeTab;

  let activeMenu = 'home'; // Default tab

  const menuItems = [
      { id: 'home', label: 'Quản lý trang chủ', icon: 'layout' },
      { id: 'config', label: 'Cấu hình bảng & chỉ số', icon: 'sliders' },
      { id: 'competition', label: 'Khai báo thi đua', icon: 'award' },
      { id: 'structure', label: 'Nạp dữ liệu cấu trúc', icon: 'database' },
      { id: 'logic', label: 'Thiết lập logic', icon: 'cpu' },
      { id: 'users', label: 'Quản lý người dùng', icon: 'users' }
  ];

  function setActiveMenu(id) {
      activeMenu = id;
  }

  // Hook replace icon mỗi khi tab hoặc menu con thay đổi
  $: if (activeTab === 'declaration-section') {
      // Delay nhỏ để DOM render xong mới replace icon
      setTimeout(() => {
          if (typeof feather !== 'undefined') feather.replace();
      }, 50);
  }
  
  afterUpdate(() => {
      if (activeTab === 'declaration-section') {
          if (typeof feather !== 'undefined') feather.replace();
      }
  });
</script>

<section id="declaration-section" class="page-section {activeTab === 'declaration-section' ? '' : 'hidden'}"> 
    <div class="max-w-[1600px] mx-auto pb-10">
        <div class="flex flex-col lg:flex-row gap-6">
            
            <div class="w-full lg:w-64 flex-shrink-0">
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-4">
                    <div class="p-4 bg-slate-50 border-b border-slate-200">
                        <h2 class="font-bold text-slate-800 flex items-center gap-2">
                            <i data-feather="settings" class="w-4 h-4 text-blue-600"></i>
                            Hệ thống
                        </h2>
                    </div>
                    <nav class="flex flex-col p-2 space-y-1">
                        {#each menuItems as item}
                            <button 
                                class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left
                                       {activeMenu === item.id 
                                            ? 'bg-blue-50 text-blue-700 shadow-sm' 
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}"
                                on:click={() => setActiveMenu(item.id)}
                            >
                                <i data-feather={item.icon} class="w-4 h-4 {activeMenu === item.id ? 'text-blue-600' : 'text-slate-400'}"></i>
                                {item.label}
                            </button>
                        {/each}
                    </nav>
                </div>
            </div>

            <div class="flex-grow min-w-0">
                <div class="lg:hidden mb-4 p-4 bg-blue-600 text-white rounded-xl shadow-sm">
                    <span class="uppercase text-xs font-bold opacity-80">Đang chọn:</span>
                    <h3 class="text-xl font-bold">{menuItems.find(i => i.id === activeMenu)?.label}</h3>
                </div>

                <div class="space-y-6 animate-fade-in">
                    
                    {#if activeMenu === 'home'}
                        <div>
                            <h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Quản lý Trang Chủ</h3>
                            <div class="space-y-6">
                                <AdminHomeConfig />
                                
                                <AdminHelp />
                            </div>
                        </div>
                    {/if}

                    {#if activeMenu === 'config'}
                        <div>
                            <h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Cấu hình Bảng & Chỉ số</h3>
                            <div class="space-y-6">
                                <AdminRevenueTables />

                                <div class="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                                    <div class="inline-flex p-3 bg-slate-200 rounded-full text-slate-500 mb-3">
                                        <i data-feather="layout" class="w-6 h-6"></i>
                                    </div>
                                    <h4 class="font-bold text-slate-600">Cấu hình Bảng Hiệu Quả</h4>
                                    <p class="text-sm text-slate-400 mt-1">Chức năng đang được phát triển...</p>
                                </div>

                                <AdminEfficiency />

                                <AdminCategory viewMode="config" />
                            </div>
                        </div>
                    {/if}

                    {#if activeMenu === 'competition'}
                        <div>
                            <h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Khai báo Thi đua</h3>
                            <div class="space-y-6">
                                <AdminMappings />
                                <AdminCompetition />
                            </div>
                        </div>
                    {/if}

                    {#if activeMenu === 'structure'}
                        <div>
                            <h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Nạp dữ liệu Cấu trúc</h3>
                            <div class="space-y-6">
                                <AdminCategory viewMode="upload" />
                                
                                <AdminSpecialProducts />
                            </div>
                        </div>
                    {/if}

                    {#if activeMenu === 'logic'}
                        <div>
                            <h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Thiết lập Logic & Tính toán</h3>
                            <div class="space-y-6">
                                <AdminCalculation />
                            </div>
                        </div>
                    {/if}

                    {#if activeMenu === 'users'}
                        <div>
                            <h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Quản lý Người dùng</h3>
                            <div class="space-y-6">
                                <AdminUserStats />
                            </div>
                        </div>
                    {/if}

                </div>
            </div>
        </div>
    </div>
</section>

<style>
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>