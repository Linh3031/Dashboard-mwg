<script>
    import { captureService } from '../services/capture.service.js';
    import { onMount } from 'svelte';

    export let containerId = 'dashboard-content'; // ID của div bao ngoài Dashboard
    export let baseTitle = 'DEBUG_PREVIEW';

    let showModal = false;
    let loading = false;
    let images = []; // Danh sách ảnh review

    const handlePreview = async () => {
        const container = document.getElementById(containerId);
        if (!container) {
            alert('Không tìm thấy container nội dung!');
            return;
        }

        loading = true;
        images = []; // Reset
        try {
            // Gọi service với chế độ Preview
            images = await captureService.getPreviewImages(container, baseTitle);
            if (images.length > 0) {
                showModal = true;
            } else {
                alert('Không tạo được ảnh nào.');
            }
        } catch (e) {
            alert('Lỗi: ' + e.message);
        } finally {
            loading = false;
        }
    };
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <button 
        on:click={handlePreview}
        disabled={loading}
        class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded shadow-lg transition-all"
    >
        {#if loading}
            ⏳ Đang chụp...
        {:else}
            📷 Review Ảnh ({images.length})
        {/if}
    </button>
</div>

{#if showModal}
    <div class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            <div class="p-4 border-b flex justify-between items-center bg-gray-100">
                <h3 class="font-bold text-lg text-gray-800">Kết quả Review ({images.length} ảnh)</h3>
                <button 
                    on:click={() => showModal = false}
                    class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Đóng
                </button>
            </div>

            <div class="flex-1 overflow-auto p-4 bg-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each images as img, index}
                    <div class="bg-white p-2 rounded shadow flex flex-col gap-2">
                        <span class="text-sm font-semibold text-blue-800 truncate" title={img.title}>
                            #{index + 1}: {img.title}
                        </span>
                        <div class="border rounded overflow-hidden bg-gray-50">
                            <img src={img.url} alt="Review" class="w-full h-auto object-contain" />
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}