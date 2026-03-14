<script context="module">
    import { writable } from 'svelte/store';
    export const showVersionDetails = writable(false);
</script>

<script>
    import { onMount, onDestroy } from 'svelte';
    import { homeConfig } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let showForceUpdateModal = false;
    let latestVersionData = null;
    let showDetails = false;
    
    // Lưu phiên bản hiện tại của máy khách
    let clientVersion = ''; 
    let serverVersionString = '';
    let pollingInterval;

    showVersionDetails.subscribe(val => showDetails = val);

    onMount(async () => {
        // Lấy version đang lưu trong máy người dùng
        clientVersion = localStorage.getItem('app_client_version') || '0.0';
        
        await fetchLatestConfig();

        // [POLLING KILLER] Trinh sát chạy ngầm mỗi 15 giây
        pollingInterval = setInterval(() => {
            fetchLatestConfig();
        }, 15000); 

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);
    });

    onDestroy(() => {
        if (pollingInterval) clearInterval(pollingInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
    });

    async function handleVisibilityChange() {
        if (document.visibilityState === 'visible' || document.hasFocus()) {
            await fetchLatestConfig();
        }
    }

    async function fetchLatestConfig() {
        try {
            await adminService.loadHomeConfig();
        } catch (e) {
            console.error("Lỗi kiểm tra phiên bản:", e);
        }
    }

    // Theo dõi phiên bản từ Server
    $: if ($homeConfig && $homeConfig.changelogs && $homeConfig.changelogs.length > 0) {
        latestVersionData = $homeConfig.changelogs[0];
        serverVersionString = latestVersionData.version;

        checkVersionMismatch(serverVersionString);
    }

    function checkVersionMismatch(serverVer) {
        if (!serverVer) return;

        // Nếu là lần đầu tiên vào app, lưu luôn version server và không làm phiền
        if (clientVersion === '0.0') {
            localStorage.setItem('app_client_version', serverVer);
            clientVersion = serverVer;
            return;
        }

        // Nếu Version Server KHÁC Version Máy Khách -> BÁO ĐỘNG ĐỎ
        if (serverVer !== clientVersion) {
            showForceUpdateModal = true;
        }
    }

    // [PWA NUKE] Hàm diệt Cache, lưu Version mới và ép tải lại
    async function forceUpdateApp() {
        // 1. Lưu version mới vào máy (Để triệt tiêu vòng lặp vô tận)
        if (serverVersionString) {
            localStorage.setItem('app_client_version', serverVersionString);
        }

        // 2. Diệt PWA và Cache
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            } catch (err) {}
        }
        if ('serviceWorker' in navigator) {
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (let reg of regs) await reg.unregister();
            } catch (err) {}
        }
        
        // 3. Tải lại trang với timestamp để phá cache trình duyệt
        window.location.href = window.location.pathname + "?v=" + new Date().getTime();
    }

    function closeDetails() {
        showVersionDetails.set(false);
    }
</script>

{#if showForceUpdateModal}
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md max-h-[90vh] p-6 flex flex-col items-center text-center animate-bounce-in">
            <div class="w-16 h-16 shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </div>
            
            <h3 class="text-xl shrink-0 font-bold text-gray-800 mb-2">Đã có bản cập nhật mới!</h3>
            <p class="text-gray-600 shrink-0 mb-4">Hệ thống vừa được nâng cấp lên phiên bản <strong class="text-blue-600">{serverVersionString}</strong>.</p>
            
            {#if latestVersionData && latestVersionData.content}
                <div class="w-full text-left bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4 overflow-y-auto max-h-52 custom-scrollbar">
                    <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Chi tiết thay đổi:</h4>
                    <div class="text-sm text-slate-700 leading-relaxed custom-content pl-2">
                        {@html latestVersionData.content}
                    </div>
                </div>
            {/if}

            <p class="text-sm shrink-0 text-gray-500 mb-6">Để đảm bảo tính năng hoạt động ổn định và không bị lỗi, vui lòng cập nhật.</p>
            
            <button class="w-full shrink-0 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2" on:click={forceUpdateApp}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tải lại Hệ thống ngay
            </button>
        </div>
    </div>
{/if}

{#if showDetails && latestVersionData}
    <div class="fixed inset-0 z-[9998] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm" on:click={closeDetails}>
        <div class="bg-white rounded-2xl shadow-xl w-11/12 max-w-2xl max-h-[85vh] flex flex-col animate-bounce-in" on:click|stopPropagation>
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50/50 rounded-t-2xl">
                <h3 class="text-xl font-bold text-blue-900 flex items-center gap-2">
                    <i data-feather="info" class="w-5 h-5"></i>
                    Thông tin phiên bản
                </h3>
                <button class="text-gray-400 hover:text-red-500 transition-colors" on:click={closeDetails}>
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto custom-scrollbar">
                <div class="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="flex-1">
                        <p class="text-[10px] text-slate-500 uppercase font-bold">Phiên bản</p>
                        <p class="text-lg font-black text-blue-600">{latestVersionData.version}</p>
                    </div>
                    <div class="w-px h-8 bg-slate-200"></div>
                    <div class="flex-1">
                        <p class="text-[10px] text-slate-500 uppercase font-bold">Ngày cập nhật</p>
                        <p class="text-sm font-medium text-slate-700">{latestVersionData.date}</p>
                    </div>
                </div>

                <div>
                    <h4 class="text-sm font-bold text-slate-700 mb-2">Chi tiết thay đổi:</h4>
                    <div class="text-sm text-slate-600 leading-relaxed custom-content pl-2">
                        {@html latestVersionData.content}
                    </div>
                </div>
            </div>
            
            <div class="p-4 bg-gray-50 rounded-b-xl border-t border-gray-100 text-right">
                <button class="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition" on:click={closeDetails}>Đóng</button>
            </div>
        </div>
    </div>
{/if}

<style>
    .animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
    @keyframes bounceIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    
    :global(.custom-content ul) { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; }
    :global(.custom-content p) { margin-bottom: 0.5rem; }
    :global(.custom-content strong) { color: #1e293b; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>