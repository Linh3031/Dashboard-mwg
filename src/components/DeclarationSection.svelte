<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { isAdmin, modalState } from '../stores.js';
    import { authService } from '../services/auth.service.js';

    // Import Admin Components
    import AdminRevenueTables from './admin/AdminRevenueTables.svelte';
    // [NEW] Component quản lý bảng hiệu quả
    import AdminPerformanceTables from './admin/AdminPerformanceTables.svelte';
    
    import AdminEfficiency from './admin/AdminEfficiency.svelte';
    import AdminCategory from './admin/AdminCategory.svelte';
    import AdminGoalSettings from './admin/AdminGoalSettings.svelte';
    import AdminCompetition from './admin/AdminCompetition.svelte';
    import AdminSpecialProgram from './admin/AdminSpecialProgram.svelte';
    import AdminConfig from './admin/AdminConfig.svelte';

    // [FIX] Nhận prop activeTab từ App.svelte để xử lý ẩn/hiện
    export let activeTab;

    // State quản lý menu con bên trái
    let activeMenu = 'config'; // config | data | goals | competition | special

    // Menu items
    const menuItems = [
        { id: 'config', label: 'Cấu hình Bảng & Chỉ số', icon: 'layout' },
        { id: 'data', label: 'Dữ liệu & Tính toán', icon: 'database' },
        { id: 'goals', label: 'Thiết lập Mục tiêu', icon: 'target' },
        { id: 'competition', label: 'Thi đua & Khen thưởng', icon: 'award' },
        { id: 'special', label: 'Chương trình Độc quyền', icon: 'star' }
    ];

    onMount(() => {
        // Kiểm tra quyền admin lại một lần nữa khi mount
        if (!$isAdmin) {
            // Nếu không phải admin, có thể redirect hoặc hiện thông báo (đã xử lý ở AdminModal)
        }
    });

    function handleLogin() {
        modalState.update(s => ({ ...s, activeModal: 'admin-modal' }));
    }

    function switchMenu(id) {
        activeMenu = id;
    }
</script>

<section id="declaration-section" class="page-section {activeTab === 'declaration-section' ? '' : 'hidden'}">
    <div class="content-card !p-0 min-h-[600px] flex flex-col md:flex-row overflow-hidden">
        
        {#if !$isAdmin}
            <div class="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
                <div class="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-md w-full text-center">
                    <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 class="text-xl font-bold text-slate-800 mb-2">Yêu cầu quyền Quản trị</h2>
                    <p class="text-slate-500 mb-6 text-sm">Khu vực này dành riêng cho quản trị viên để thiết lập cấu hình hệ thống.</p>
                    <button 
                        on:click={handleLogin}
                        class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all transform hover:scale-[1.02]"
                    >
                        Đăng nhập Admin
                    </button>
                </div>
            </div>
        {:else}
            <div class="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex-shrink-0">
                <div class="p-4 border-b border-slate-200">
                    <h2 class="font-bold text-slate-700 uppercase text-xs tracking-wider">Danh mục quản lý</h2>
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
                                {:else if item.icon === 'database'}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                {:else if item.icon === 'target'}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {:else if item.icon === 'award'}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {:else if item.icon === 'star'}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                {/if}
                            </div>
                            {item.label}
                        </button>
                    {/each}
                </nav>
                
                <div class="mt-auto p-4 border-t border-slate-200">
                    <button class="w-full py-2 border border-slate-300 rounded text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors" on:click={() => authService.logout()}>
                        Đăng xuất Admin
                    </button>
                </div>
            </div>

            <div class="flex-1 bg-white p-6 md:p-8 overflow-y-auto h-[800px] custom-scrollbar">
                
                {#if activeMenu === 'config'}
                    <div in:fade={{ duration: 200 }}>
                        <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200 flex items-center gap-2">
                            <span class="bg-blue-100 text-blue-600 p-1.5 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg></span>
                            Cấu hình Bảng hiển thị & Chỉ số
                        </h3>
                        <div class="space-y-8">
                            <AdminRevenueTables />

                            <AdminPerformanceTables />

                            <AdminEfficiency />

                            <AdminCategory viewMode="config" />
                        </div>
                    </div>
                {/if}

                {#if activeMenu === 'data'}
                    <div in:fade={{ duration: 200 }}>
                        <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200 flex items-center gap-2">
                            <span class="bg-indigo-100 text-indigo-600 p-1.5 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg></span>
                            Khai báo Dữ liệu & Công thức
                        </h3>
                        <AdminConfig />
                    </div>
                {/if}

                {#if activeMenu === 'goals'}
                    <div in:fade={{ duration: 200 }}>
                        <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200 flex items-center gap-2">
                            <span class="bg-green-100 text-green-600 p-1.5 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                            Thiết lập Mục tiêu & KPI
                        </h3>
                        <AdminGoalSettings />
                    </div>
                {/if}

                {#if activeMenu === 'competition'}
                    <div in:fade={{ duration: 200 }}>
                        <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200 flex items-center gap-2">
                            <span class="bg-yellow-100 text-yellow-600 p-1.5 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                            Cấu hình Thi đua & Khen thưởng
                        </h3>
                        <AdminCompetition />
                    </div>
                {/if}

                {#if activeMenu === 'special'}
                    <div in:fade={{ duration: 200 }}>
                        <h3 class="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200 flex items-center gap-2">
                            <span class="bg-purple-100 text-purple-600 p-1.5 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></span>
                            Chương trình Độc quyền
                        </h3>
                        <AdminSpecialProgram />
                    </div>
                {/if}

            </div>
        {/if}
    </div>
</section>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>