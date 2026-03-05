<script>
    import { onMount, tick } from 'svelte';
    import { fade, scale } from 'svelte/transition';
    import { captureService } from '../../services/capture.service.js';
    import { modalState, notificationStore } from '../../stores.js';

    export let payload; 

    let previewItems = [];
    let isLoading = true;
    let isDownloading = false;
    let selectedIndices = new Set();

    onMount(async () => {
        if (!payload || !payload.container) {
            closeModal();
            return;
        }

        try {
            // Lấy trực tiếp Element siêu tốc
            previewItems = captureService.getPreviewElements(payload.container, payload.baseTitle);
           
            // [TÍNH NĂNG MỚI]: Nếu chỉ có 1 bảng, tự động chụp luôn và không hiển thị Modal
            if (previewItems.length === 1) {
                // Gọi tiến trình chụp chạy ngầm
                captureService.captureSelectedItems(payload.container, payload.baseTitle, [0]).catch(error => {
                    console.error("Lỗi khi chụp ảnh nét cao:", error);
                    notificationStore.update(s => ({ ...s, visible: true, type: 'error', message: 'Lỗi khi tải ảnh chất lượng cao.' }));
                });
                closeModal();
                return;
            }

            previewItems.forEach((_, index) => selectedIndices.add(index));
            selectedIndices = selectedIndices; 
            isLoading = false;

            // Chờ Svelte vẽ xong các thẻ <div>
            await tick();

            // Clone DOM nhúng vào thẻ Div để làm Thumbnail
            previewItems.forEach((item, index) => {
                const wrapper = document.getElementById(`preview-clone-${index}`);
                if (wrapper) {
                    item.elements.forEach(originalEl => {
                        const clone = originalEl.cloneNode(true);
                        
                        // [MẸO] Chuyển nhanh Canvas biểu đồ thành ảnh để Preview
                        const originalCanvases = originalEl.querySelectorAll('canvas');
                        const clonedCanvases = clone.querySelectorAll('canvas');
                        originalCanvases.forEach((origCanvas, i) => {
                            try {
                                const img = document.createElement('img');
                                img.src = origCanvas.toDataURL();
                                img.style.width = '100%';
                                img.style.height = '100%';
                                clonedCanvases[i].parentNode.replaceChild(img, clonedCanvases[i]);
                            } catch(e){}
                        });
                        wrapper.appendChild(clone);
                    });
                }
            });
        } catch (error) {
            console.error("Lỗi khi tạo ảnh xem trước:", error);
            notificationStore.update(s => ({ ...s, visible: true, type: 'error', message: 'Không thể tạo bản xem trước.' }));
            closeModal();
        }
    });

    function closeModal() {
        if (isDownloading) return;
        modalState.update(s => ({ ...s, activeModal: null, payload: null }));
    }

    function toggleSelection(index) {
        if (isDownloading) return;
        if (selectedIndices.has(index)) {
            selectedIndices.delete(index);
        } else {
            selectedIndices.add(index);
        }
        selectedIndices = selectedIndices;
    }

    function toggleAll() {
        if (isDownloading) return;
        if (selectedIndices.size === previewItems.length) {
            selectedIndices.clear();
        } else {
            previewItems.forEach((_, index) => selectedIndices.add(index));
        }
        selectedIndices = selectedIndices;
    }

    // [TÍNH NĂNG MỚI]: Lắng nghe sự kiện Enter
    function handleKeydown(event) {
        if (event.key === 'Enter' && !isLoading && !isDownloading && selectedIndices.size > 0) {
            event.preventDefault();
            downloadSelected();
        }
    }

    function downloadSelected() {
        if (selectedIndices.size === 0 || isDownloading) return;
        
        // [TÍNH NĂNG MỚI]: Tắt Modal ngay lập tức khi bấm tải xuống
        const selectedArray = Array.from(selectedIndices);
        const container = payload.container;
        const baseTitle = payload.baseTitle;
        
        closeModal(); // Đóng modal luôn để user làm việc khác

        // Chạy tiến trình chụp ảnh ngầm
        captureService.captureSelectedItems(container, baseTitle, selectedArray).catch(error => {
            console.error("Lỗi khi chụp ảnh nét cao:", error);
            notificationStore.update(s => ({ ...s, visible: true, type: 'error', message: 'Lỗi khi tải ảnh chất lượng cao.' }));
        });
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm" transition:fade={{ duration: 200 }}>
    <div class="bg-white rounded-2xl shadow-2xl w-11/12 max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" transition:scale={{ start: 0.95, duration: 200 }}>
        
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
                <h3 class="text-xl font-bold text-gray-800">Chọn bảng để tải xuống</h3>
                <p class="text-sm text-gray-500 mt-1">Hệ thống sẽ tái tạo lại ảnh Nét Cao cho các mục được chọn. (Bấm Enter để tải nhanh)</p>
            </div>
            <button class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" on:click={closeModal} disabled={isDownloading}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div class="p-6 overflow-y-auto flex-grow bg-gray-50/30 relative">
            {#if isLoading}
                <div class="flex flex-col items-center justify-center py-20">
                    <svg class="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-gray-600 font-medium">Đang nạp dữ liệu siêu tốc...</p>
                </div>
            {:else if previewItems.length === 0}
                <div class="text-center py-20 text-gray-500">
                    <p>Không tìm thấy nội dung nào để chụp.</p>
                </div>
            {:else}
                <div class="flex justify-between items-center mb-4">
                    <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 hover:text-blue-600">
                        <input type="checkbox" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" 
                               checked={selectedIndices.size === previewItems.length} 
                               on:change={toggleAll} disabled={isDownloading}>
                        Chọn tất cả ({previewItems.length} mục)
                     </label>
                    <span class="text-sm text-gray-500">Đã chọn: <strong class="text-blue-600">{selectedIndices.size}</strong></span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each previewItems as item, index}
                        <div class="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all {selectedIndices.has(index) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 opacity-70'} {isDownloading ? 'pointer-events-none opacity-50' : ''}"
                             on:click={() => toggleSelection(index)}>
                            
                            <div class="h-40 bg-gray-100 flex items-start justify-center relative overflow-hidden">
                                <div class="w-full h-full relative overflow-hidden flex justify-center p-2">
                                     <div id="preview-clone-{index}" class="absolute top-2 origin-top pointer-events-none" style="transform: scale(0.35); width: 280%;">
                                     </div>
                                </div>
                                
                                <div class="absolute top-2 left-2 bg-white rounded-full p-0.5 shadow z-10">
                                    <input type="checkbox" class="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none" 
                                           checked={selectedIndices.has(index)}>
                                </div>
                            </div>
                            
                            <div class="p-3 border-t border-gray-100 bg-gray-50">
                                <p class="text-xs font-bold text-gray-700 truncate" title={item.title}>{item.title}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
            
            {#if isDownloading}
                <div class="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl">
                    <svg class="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h4 class="text-lg font-bold text-blue-800">Đang xuất ảnh Nét Cao...</h4>
                    <p class="text-sm text-gray-600 font-medium mt-1">Đang tái tạo Layout và sửa lỗi font chữ.</p>
                </div>
            {/if}
        </div>

        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
            <button class="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors" on:click={closeModal} disabled={isDownloading}>
                Hủy bỏ
            </button>
            <button class="px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 {selectedIndices.size > 0 && !isDownloading ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : 'bg-gray-400 cursor-not-allowed'}" 
                    disabled={selectedIndices.size === 0 || isLoading || isDownloading}
                    on:click={downloadSelected}>
                {#if isDownloading}
                    Đang xử lý...
                {:else}
                    Tải xuống ({selectedIndices.size})
                {/if}
            </button>
        </div>
    </div>
</div>