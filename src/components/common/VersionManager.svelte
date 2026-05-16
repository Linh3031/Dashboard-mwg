<script context="module">
    import { writable } from 'svelte/store';
    export const showVersionDetails = writable(false);
</script>

<script>
    import { onMount, onDestroy } from 'svelte';
    import { homeConfig, firebaseStore } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    
    // [CODEGENESIS] Nhúng Core API từ Firebase
    import { doc, onSnapshot } from "firebase/firestore";

    let showForceUpdateModal = false;
    let latestVersionData = null;
    let showDetails = false;
    let clientVersion = ''; 
    let serverVersionString = '';
    
    // [CODEGENESIS] Biến ngắt kết nối
    let unsubRealtime = null;

    showVersionDetails.subscribe(val => showDetails = val);

    onMount(async () => {
        clientVersion = localStorage.getItem('app_client_version') || '0.0';
        await fetchLatestConfig();
    });

    // [CODEGENESIS] Phản ứng thiết lập kết nối Real-time (Zero delay)
    $: if ($firebaseStore && $firebaseStore.db && !unsubRealtime) {
        const docRef = doc($firebaseStore.db, 'declarations', 'homeConfig'); 
        unsubRealtime = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const raw = docSnap.data();
                homeConfig.set(raw.data || raw.config || raw);
            }
        });
    }

    onDestroy(() => {
        if (unsubRealtime) unsubRealtime();
    });

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
        if (serverVersionString) {
            localStorage.setItem('app_client_version', serverVersionString);
        }

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
        
        window.location.href = window.location.pathname + "?v=" + new Date().getTime();
    }

    function closeDetails() {
        showVersionDetails.set(false);
    }
</script>

{#if showForceUpdateModal}
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/85 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-bounce-in">
            
            <div class="bg-blue-600 p-6 text-center relative overflow-hidden shrink-0">
                <div class="absolute -right-4 -top-4 opacity-20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-32 w-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h3 class="text-2xl font-black text-white mb-2 relative z-10 uppercase tracking-wide">Cập Nhật Hệ Thống</h3>
                <span class="inline-block bg-white text-blue-800 px-4 py-1 rounded-full text-sm font-black tracking-widest relative z-10 shadow-md">
                    Phiên bản {serverVersionString}
                </span>
            </div>
            
            <div class="p-5 flex flex-col flex-grow overflow-hidden">
                {#if latestVersionData && latestVersionData.content}
                    <div class="flex-grow flex flex-col border-2 border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden mb-4 shadow-sm">
                        <div class="bg-amber-100 px-4 py-2 border-b border-amber-200 flex items-center gap-2 text-amber-800 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span class="font-bold text-sm uppercase tracking-wider">Chi tiết nội dung mới</span>
                        </div>
                        <div class="p-4 overflow-y-auto max-h-[35vh] custom-scrollbar">
                            <div class="text-sm text-slate-800 leading-relaxed custom-content">
                                {@html latestVersionData.content}
                            </div>
                        </div>
                    </div>
                {/if}

                <p class="text-[13px] shrink-0 text-center text-gray-500 mb-5 italic">Hệ thống yêu cầu tải lại trang để áp dụng các tính năng mới nhất.</p>
                
                <button class="w-full shrink-0 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2" on:click={forceUpdateApp}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Đồng ý cập nhật ngay
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showDetails && latestVersionData}
    <div class="fixed inset-0 z-[9998] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm" on:click={closeDetails}>
        <div class="bg-white rounded-2xl shadow-xl w-11/12 max-w-2xl max-h-[85vh] flex flex-col animate-bounce-in" on:click|stopPropagation>
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50/50 rounded-t-2xl shrink-0">
                <h3 class="text-xl font-bold text-blue-900 flex items-center gap-2">
                    <i data-feather="info" class="w-5 h-5"></i>
                    Thông tin phiên bản
                </h3>
                <button class="text-gray-400 hover:text-red-500 transition-colors" on:click={closeDetails}>
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto custom-scrollbar flex-grow">
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
            
            <div class="p-4 bg-gray-50 rounded-b-xl border-t border-gray-100 text-right shrink-0">
                <button class="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition" on:click={closeDetails}>Đóng</button>
            </div>
        </div>
    </div>
{/if}

<style>
    .animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
    @keyframes bounceIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    
    /* Tối ưu định dạng nội dung HTML trả về từ server */
    :global(.custom-content ul) { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; }
    :global(.custom-content p) { margin-bottom: 0.5rem; }
    :global(.custom-content strong) { color: #1e293b; }
    :global(.custom-content h1), 
    :global(.custom-content h2), 
    :global(.custom-content h3), 
    :global(.custom-content h4) {
        color: #1d4ed8; /* blue-700 */
        font-weight: 800;
        text-transform: uppercase;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
    }
    :global(.custom-content h1:first-child), 
    :global(.custom-content h2:first-child), 
    :global(.custom-content h3:first-child), 
    :global(.custom-content h4:first-child) {
        margin-top: 0;
    }

    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>