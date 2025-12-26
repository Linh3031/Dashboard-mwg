<script context="module">
    // Store đơn giản để các component khác có thể gọi popup chi tiết
    import { writable } from 'svelte/store';
    export const showVersionDetails = writable(false);
</script>

<script>
    import { onMount } from 'svelte';
    import { homeConfig } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    // Biến trạng thái
    let showForceUpdateModal = false;
    let latestVersionData = null;
    let clientVersion = '';

    // Lấy trạng thái hiển thị popup chi tiết từ store
    let showDetails = false;
    showVersionDetails.subscribe(val => showDetails = val);

    onMount(async () => {
        // 1. Lấy version hiện tại của máy khách (trong LocalStorage)
        clientVersion = localStorage.getItem('app_client_version') || '0.0';

        // 2. Đảm bảo load config mới nhất từ Cloud
        await adminService.loadHomeConfig();
    });

    // 3. Theo dõi sự thay đổi của Config từ Server
    $: if ($homeConfig && $homeConfig.changelogs && $homeConfig.changelogs.length > 0) {
        // Lấy bản ghi mới nhất (phần tử đầu tiên)
        latestVersionData = $homeConfig.changelogs[0];
        
        // Kiểm tra version
        checkVersion(latestVersionData.version);
    }

    function checkVersion(serverVersion) {
        if (!serverVersion) return;
        
        // Nếu version server khác version client -> BẮT BUỘC CẬP NHẬT
        // (So sánh chuỗi đơn giản, nếu muốn chặt chẽ hơn có thể dùng semver)
        if (serverVersion !== clientVersion) {
            showForceUpdateModal = true;
        }
    }

    function performUpdate() {
        if (!latestVersionData) return;
        
        // 1. Lưu version mới vào máy khách
        localStorage.setItem('app_client_version', latestVersionData.version);
        
        // 2. Reload trang để tải code mới
        window.location.reload();
    }

    function closeDetails() {
        showVersionDetails.set(false);
    }
</script>

{#if showForceUpdateModal && latestVersionData}
    <div class="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-center">
                <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <i data-feather="download-cloud" class="w-8 h-8 text-white"></i>
                </div>
                <h2 class="text-2xl font-bold text-white mb-1">Cập nhật hệ thống</h2>
                <p class="text-blue-100 text-sm">Đã có phiên bản mới: <span class=" font-bold bg-white/20 px-2 py-0.5 rounded">{latestVersionData.version}</span></p>
            </div>
            
            <div class="p-6">
                <div class="mb-6">
                    <h3 class="text-sm font-bold text-gray-500 uppercase mb-2">Nội dung thay đổi:</h3>
                    <div class="bg-slate-50 p-4 rounded-lg border border-slate-100 max-h-40 overflow-y-auto text-sm text-slate-600 leading-relaxed custom-content">
                        {@html latestVersionData.content}
                    </div>
                </div>

                <button 
                    on:click={performUpdate}
                    class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                    <i data-feather="refresh-cw" class="w-4 h-4 animate-spin-slow"></i>
                    Cập nhật ngay
                </button>
                <p class="text-center text-xs text-slate-400 mt-3">Yêu cầu tải lại trang để áp dụng thay đổi.</p>
            </div>
        </div>
    </div>
{/if}

{#if showDetails && !showForceUpdateModal && latestVersionData}
    <div class="fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" on:click={closeDetails}>
        <div class="bg-white rounded-xl shadow-xl max-w-lg w-full relative animate-fade-in" on:click|stopPropagation>
            <button class="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition" on:click={closeDetails}>
                <i data-feather="x" class="w-6 h-6"></i>
            </button>

            <div class="p-6 border-b border-gray-100">
                <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span class="bg-green-100 text-green-700 p-1.5 rounded-lg"><i data-feather="info" class="w-5 h-5"></i></span>
                    Thông tin phiên bản
                </h3>
            </div>

            <div class="p-6 space-y-4">
                <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                        <p class="text-xs text-slate-500 uppercase font-bold">Phiên bản hiện tại</p>
                        <p class="text-lg font-bold text-blue-600 ">{latestVersionData.version}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-500 uppercase font-bold">Ngày cập nhật</p>
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
    
    /* Style cho nội dung HTML từ admin */
    :global(.custom-content ul) { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
    :global(.custom-content li) { margin-bottom: 0.25rem; }
    :global(.custom-content strong) { color: #1e293b; font-weight: 700; }
</style>