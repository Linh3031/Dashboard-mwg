<script>
    import { fade } from 'svelte/transition';
    
    // --- IMPORT TỪ FILE A (TÍNH NĂNG MỚI) ---
    // [QUAN TRỌNG] Component quản lý bảng hiệu quả mà bạn đã xây dựng
    import AdminPerformanceTables from './admin/AdminPerformanceTables.svelte';

    // --- IMPORT TỪ FILE B (LOGIC CỐT LÕI) ---
    import AdminHomeConfig from './admin/AdminHomeConfig.svelte';
    import AdminRevenueTables from './admin/AdminRevenueTables.svelte';
    import AdminEfficiency from './admin/AdminEfficiency.svelte';
    import AdminCategory from './admin/AdminCategory.svelte';
    import AdminMappings from './admin/AdminMappings.svelte';
    import AdminCompetition from './admin/AdminCompetition.svelte';
    import AdminSpecialProducts from './admin/AdminSpecialProducts.svelte';
    import AdminCalculation from './admin/AdminCalculation.svelte';
    import AdminUserStats from './admin/AdminUserStats.svelte';
    import AdminHelp from './admin/AdminHelp.svelte';

    export let activeTab;

    // Menu Item đã được sắp xếp lại hợp lý
    let activeMenu = 'home'; 

    const menuItems = [
        { id: 'home', label: 'Quản lý trang chủ', icon: 'layout' },
        { id: 'config', label: 'Cấu hình Bảng & Chỉ số', icon: 'sliders' },
        { id: 'competition', label: 'Khai báo Thi đua', icon: 'award' },
        { id: 'structure', label: 'Nạp dữ liệu Cấu trúc', icon: 'database' },
        { id: 'logic', label: 'Thiết lập Logic', icon: 'cpu' },
        { id: 'users', label: 'Quản lý Người dùng', icon: 'users' }
    ];

    function switchMenu(id) {
        activeMenu = id;
    }
</script>

<section id="declaration-section" class="page-section {activeTab === 'declaration-section' ? '' : 'hidden'}">
    <div class="content-card !p-0 min-h-[600px] flex flex-col md:flex-row overflow-hidden">
        
        <div class="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex-shrink-0">
            <div class="p-4 border-b border-slate-200">
                <h2 class="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                    Hệ thống Quản trị
                </h2>
            </div>
            <nav class="p-2 space-y-1">
                {#each menuItems as item}
                    <button 
                        class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all
                        {activeMenu === item.id ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
                        on:click={() => switchMenu(item.id)}
                    >
                        <div class="{activeMenu === item.id ? 'text-blue-600' : 'text-slate-400'}">
                            {#if item.icon === 'layout'}
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                            {:else if item.icon === 'sliders'}
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            {:else if item.icon === 'award'}
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {:else if item.icon === 'database'}
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                            {:else if item.icon === 'cpu'}
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                            {:else if item.icon === 'users'}
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            {/if}
                        </div>
                        {item.label}
                    </button>
                {/each}
            </nav>
        </div>

        <div class="flex-1 bg-white p-6 md:p-8 overflow-y-auto h-[800px] custom-scrollbar">
            
            {#if activeMenu === 'home'}
                <div in:fade={{ duration: 200 }}>
                    <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">Quản lý Trang Chủ</h3>
                    <div class="space-y-8">
                        <AdminHomeConfig />
                        <AdminHelp />
                    </div>
                </div>
            {/if}

            {#if activeMenu === 'config'}
                <div in:fade={{ duration: 200 }}>
                    <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">Cấu hình Bảng & Chỉ số</h3>
                    <div class="space-y-8">
                        <AdminRevenueTables />

                        <AdminPerformanceTables />

                        <AdminEfficiency />
                        
                        <AdminCategory viewMode="config" />
                    </div>
                </div>
            {/if}

            {#if activeMenu === 'competition'}
                <div in:fade={{ duration: 200 }}>
                    <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">Khai báo Thi đua</h3>
                    <div class="space-y-8">
                        <AdminMappings />
                        <AdminCompetition />
                    </div>
                </div>
            {/if}

            {#if activeMenu === 'structure'}
                <div in:fade={{ duration: 200 }}>
                    <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">Nạp dữ liệu Cấu trúc</h3>
                    <div class="space-y-8">
                        <AdminCategory viewMode="upload" />
                        <AdminSpecialProducts />
                    </div>
                </div>
            {/if}

            {#if activeMenu === 'logic'}
                <div in:fade={{ duration: 200 }}>
                    <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">Thiết lập Logic & Tính toán</h3>
                    <div class="space-y-8">
                        <AdminCalculation />
                    </div>
                </div>
            {/if}

            {#if activeMenu === 'users'}
                <div in:fade={{ duration: 200 }}>
                    <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">Quản lý Người dùng</h3>
                    <div class="space-y-8">
                        <AdminUserStats />
                    </div>
                </div>
            {/if}

        </div>
    </div>
</section>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>