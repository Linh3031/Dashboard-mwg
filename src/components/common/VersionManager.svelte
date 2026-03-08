<script context="module">
    // Store đơn giản để các component khác có thể gọi popup chi tiết
    import { writable } from 'svelte/store';
    export const showVersionDetails = writable(false);
</script>

<script>
    import { onMount, onDestroy } from 'svelte';
    import { homeConfig, latestSystemVersion } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let showForceUpdateModal = false;
    let latestVersionData = null;
    let clientVersion = '';

    let showDetails = false;
    showVersionDetails.subscribe(val => showDetails = val);

    onMount(async () => {
        clientVersion = localStorage.getItem('app_client_version') || '0.0';
        await adminService.loadHomeConfig();

        // [TẤN CÔNG CHỦ ĐỘNG] Dùng Visibility API (Cảm biến Thức dậy)
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);
    });

    onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
    });

    async function handleVisibilityChange() {
        // Chỉ gọi server khi user thực sự quay lại Tab
        if (document.visibilityState === 'visible' || document.hasFocus()) {
            console.log("[VersionManager] 👤 User hoạt động lại. Cảm biến đang quét version...");
            await adminService.loadHomeConfig(); 
        }
    }

    $: if ($homeConfig && $homeConfig.changelogs && $homeConfig.changelogs.length > 0) {
        latestVersionData = $homeConfig.changelogs[0];
        
        // [CẤP ĐẠN CHO LƯỚI ĐÁNH CHẶN] Bơm version mới nhất vào Store
        latestSystemVersion.set(latestVersionData.version);

        checkVersion(latestVersionData.version);
    }

    function checkVersion(serverVersion) {
        if (!serverVersion) return;

        if (clientVersion === '0.0') {
            localStorage.setItem('app_client_version', serverVersion);
            clientVersion = serverVersion;
            return;
        }

        if (serverVersion !== clientVersion) {
            showForceUpdateModal = true;
        }
    }

    function forceUpdate() {
        if (latestVersionData && latestVersionData.version) {
            localStorage.setItem('app_client_version', latestVersionData.version);
        }
        window.location.reload(true);
    }

    function closeDetails() {
        showVersionDetails.set(false);
    }
</script>

{#if showForceUpdateModal && latestVersionData}
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md p-6 flex flex-col items-center text-center animate-bounce-in">
            <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Đã có phiên bản mới!</h3>
            <p class="text-gray-600 mb-2">Hệ thống vừa được nâng cấp lên phiên bản <strong class="text-blue-600">{latestVersionData.version}</strong>.</p>
            <p class="text-sm text-gray-500 mb-6">Để đảm bảo tính năng hoạt động ổn định và không bị lỗi, vui lòng tải lại trang.</p>
            <button class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2" on:click={forceUpdate}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Cập nhật hệ thống ngay
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
    .animate-spin-slow { animation: spin 3s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    
    /* Style cho nội dung HTML từ CkEditor */
    :global(.custom-content ul) { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; }
    :global(.custom-content p) { margin-bottom: 0.5rem; }
    :global(.custom-content strong) { color: #1e293b; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>