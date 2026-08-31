<script>
    import { helpContent } from '../../stores.js';
    import { afterUpdate, createEventDispatcher } from 'svelte';

    let isOpen = false;
    let videoData = null;
    let isLoading = true;
    let fallbackMessage = '';

    export function open(id) {
        if ($helpContent && $helpContent[id] && $helpContent[id].youtubeUrl) {
            videoData = $helpContent[id];
            fallbackMessage = '';
        } else {
            videoData = null;
            fallbackMessage = 'Chưa có video hướng dẫn cho mục này. Vui lòng vào Admin -> Quản lý Trang chủ -> Quản lý Video Hướng Dẫn để cấu hình.';
        }
        isOpen = true;
        isLoading = true;
        setTimeout(() => { if (typeof feather !== 'undefined') feather.replace(); }, 50);
    }

    export function close() {
        isOpen = false;
        videoData = null; 
    }

    function onIframeLoad() {
        isLoading = false;
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

{#if isOpen}
<div class="fixed inset-0 z-[9999] flex items-center justify-center">
    <!-- Lớp phủ (Overlay) -->
    <div 
        class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        on:click={close}
    ></div>
    
    <!-- Khung Modal -->
    <div class="relative bg-white rounded-xl shadow-2xl w-[90%] max-w-3xl overflow-hidden flex flex-col animate-slide-up">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b bg-slate-50">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">
                <i data-feather="youtube" class="text-red-500 w-5 h-5"></i>
                <span>{videoData?.title || 'Video Hướng Dẫn'}</span>
            </h3>
            <button on:click={close} class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <i data-feather="x" class="w-5 h-5"></i>
            </button>
        </div>
        
        <!-- Khu vực Video -->
        <div class="relative bg-black aspect-video flex items-center justify-center w-full overflow-hidden">
            {#if videoData && videoData.youtubeUrl}
                {#if isLoading}
                    <div class="absolute text-white animate-spin">
                        <i data-feather="loader" class="w-8 h-8 text-blue-400"></i>
                    </div>
                {/if}
                <iframe 
                    class="w-full h-full {isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}" 
                    src={videoData.youtubeUrl} 
                    frameborder="0" 
                    allow="autoplay; encrypted-media" 
                    allowfullscreen
                    on:load={onIframeLoad}
                ></iframe>
            {:else}
                <div class="flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-100 w-full h-full">
                    <i data-feather="video-off" class="w-12 h-12 mb-3 opacity-50"></i>
                    <p class="text-sm font-semibold text-slate-600">{fallbackMessage}</p>
                </div>
            {/if}
        </div>
        
        <!-- Footer Description -->
        {#if videoData && videoData.desc}
            <div class="p-4 bg-white text-sm text-slate-600 border-t flex items-start gap-2">
                <i data-feather="info" class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"></i>
                <p class="leading-relaxed">{videoData.desc}</p>
            </div>
        {/if}
    </div>
</div>
{/if}

<style>
    .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
    .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>