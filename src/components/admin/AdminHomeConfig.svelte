<script>
    import { onMount, afterUpdate } from 'svelte';
    import { homeConfig } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let localConfig = {
        videoUrl: '',
        timeline: [],
        sliderImages: [], // Cấu trúc: { url: '...', fileName: '...', title: '...' }
        changelogs: []
    };

    let activeTab = 'video'; 
    let isSaving = false;
    let isUploading = false;
    let fileInput; 

    $: if ($homeConfig) {
        localConfig = JSON.parse(JSON.stringify($homeConfig));
    }

    // --- LOGIC TIMELINE VIDEO ---
    function addTimelineItem() {
        localConfig.timeline = [...localConfig.timeline, { time: '00:00', label: 'Mốc mới' }];
    }
    function removeTimelineItem(index) {
        localConfig.timeline = localConfig.timeline.filter((_, i) => i !== index);
    }

    // --- LOGIC UPLOAD ẢNH CLOUD ---
    function triggerUpload() {
        fileInput.click();
    }

    async function handleFilesSelect(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        isUploading = true;
        const newImages = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const imageObj = {
                url: URL.createObjectURL(file), 
                fileName: file.name,
                title: '', 
                fileRaw: file 
            };
            newImages.push(imageObj);
        }

        localConfig.sliderImages = [...localConfig.sliderImages, ...newImages];
        event.target.value = '';
        isUploading = false;
    }

    function removeSlide(index) {
        if(!confirm("Bạn muốn xóa ảnh này khỏi danh sách?")) return;
        localConfig.sliderImages = localConfig.sliderImages.filter((_, i) => i !== index);
    }

    // --- LOGIC CHANGELOG ---
    function addChangelogItem() {
        const today = new Date().toLocaleDateString('vi-VN');
        localConfig.changelogs = [{ version: '', date: today, content: '' }, ...localConfig.changelogs];
    }
    function removeChangelogItem(index) {
        localConfig.changelogs = localConfig.changelogs.filter((_, i) => i !== index);
    }
    
    function insertTemplate(index) {
        const template = `<ul>
    <li><strong>Tính năng chính:</strong>
        <ul style="list-style-type: circle; margin-left: 20px;">
            <li>Chi tiết A</li>
        </ul>
    </li>
    <li><strong>Sửa lỗi:</strong> ...</li>
</ul>`;
        localConfig.changelogs[index].content = template;
    }

    // --- HÀM LƯU CHUNG (CÓ FIX LỖI VIDEO) ---
    async function saveAllConfig() {
        console.log("Đang xử lý dữ liệu...", localConfig);
        
        // [FIX] Tự động chuyển link Youtube thường thành link Embed
        // Ví dụ: watch?v=ABC -> embed/ABC
        if (localConfig.videoUrl) {
            let url = localConfig.videoUrl;
            if (url.includes('watch?v=')) {
                url = url.replace('watch?v=', 'embed/');
                // Xử lý trường hợp có thêm tham số &t=... (nếu có)
                const ampersandIndex = url.indexOf('&');
                if (ampersandIndex !== -1) {
                    url = url.substring(0, ampersandIndex);
                }
            } else if (url.includes('youtu.be/')) {
                // Xử lý link rút gọn: youtu.be/ABC -> youtube.com/embed/ABC
                url = url.replace('youtu.be/', 'www.youtube.com/embed/');
            }
            localConfig.videoUrl = url;
        }

        isSaving = true;
        try {
            await adminService.saveHomeConfig(localConfig);
            alert("Đã lưu thành công! Link Video đã được tự động chuẩn hóa.");
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu: " + e.message);
        } finally {
            isSaving = false;
        }
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <details class="group" open> 
        <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-pink-50 rounded-lg text-pink-600">
                    <i data-feather="layout"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-700 text-lg">Quản lý Trang chủ</h3>
                    <p class="text-xs text-slate-500">Cấu hình Video, Slide ảnh & Lịch sử cập nhật</p>
                </div>
            </div>
            <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                <i data-feather="chevron-down"></i>
            </span>
        </summary>
        
        <div class="p-6 border-t border-slate-100 bg-slate-50/50">
            
            <div class="flex space-x-2 mb-6 border-b border-gray-200 pb-1">
                <button class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors {activeTab === 'video' ? 'bg-white text-pink-600 border-x border-t border-gray-200' : 'text-gray-500 hover:text-gray-700'}" on:click={() => activeTab = 'video'}>Video & Timeline</button>
                <button class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors {activeTab === 'slider' ? 'bg-white text-pink-600 border-x border-t border-gray-200' : 'text-gray-500 hover:text-gray-700'}" on:click={() => activeTab = 'slider'}>Slide Ảnh (Cloud)</button>
                <button class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors {activeTab === 'changelog' ? 'bg-white text-pink-600 border-x border-t border-gray-200' : 'text-gray-500 hover:text-gray-700'}" on:click={() => activeTab = 'changelog'}>Lịch sử cập nhật</button>
            </div>

            {#if activeTab === 'video'}
                <div class="space-y-4 animate-fade-in">
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-2">
                        <label class="block text-sm font-bold text-blue-800 mb-1">Youtube Link</label>
                        <p class="text-xs text-blue-600 mb-2">Bạn có thể dán link trực tiếp (VD: https://www.youtube.com/watch?v=...) code sẽ tự động sửa lỗi hiển thị.</p>
                        <input type="text" bind:value={localConfig.videoUrl} class="w-full p-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Dán link Youtube vào đây...">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Timeline (Mục lục video)</label>
                        <div class="space-y-2">
                            {#each localConfig.timeline as item, index}
                                <div class="flex items-center gap-2">
                                    <input type="text" bind:value={item.time} class="w-20 p-2 border rounded-md text-sm text-center" placeholder="00:00">
                                    <input type="text" bind:value={item.label} class="flex-grow p-2 border rounded-md text-sm" placeholder="Mô tả...">
                                    <button on:click={() => removeTimelineItem(index)} class="text-red-500 hover:bg-red-50 p-2 rounded"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                                </div>
                            {/each}
                        </div>
                        <button on:click={addTimelineItem} class="mt-2 text-sm text-blue-600 hover:underline flex items-center gap-1">
                            <i data-feather="plus" class="w-3 h-3"></i> Thêm mốc thời gian
                        </button>
                    </div>
                </div>
            {/if}

            {#if activeTab === 'slider'}
                <div class="space-y-6 animate-fade-in">
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm text-blue-800">
                        <p class="font-bold mb-1 flex items-center gap-2"><i data-feather="info" class="w-4 h-4"></i> Mẹo hiển thị:</p>
                        <ul class="list-disc ml-5 space-y-1 text-blue-700">
                            <li>Ảnh sẽ được hiển thị <strong>trọn vẹn theo chiều rộng</strong>.</li>
                            <li>Hỗ trợ kéo thả hoặc chọn nhiều ảnh cùng lúc.</li>
                        </ul>
                    </div>

                    <div class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 hover:bg-blue-50 transition-colors">
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            class="hidden" 
                            bind:this={fileInput}
                            on:change={handleFilesSelect}
                        />
                        <button 
                            on:click={triggerUpload}
                            class="flex flex-col items-center gap-2 group/btn"
                            disabled={isUploading}
                        >
                            <div class="p-3 bg-white rounded-full shadow-md text-blue-600 group-hover/btn:scale-110 transition-transform">
                                <i data-feather="cloud-upload" class="w-8 h-8"></i>
                            </div>
                            <span class="text-blue-700 font-bold text-sm">
                                {isUploading ? 'Đang xử lý...' : 'Nhấn để chọn ảnh từ máy tính'}
                            </span>
                            <span class="text-xs text-blue-400">Hỗ trợ JPG, PNG (Có thể chọn nhiều ảnh)</span>
                        </button>
                    </div>

                    {#if localConfig.sliderImages.length > 0}
                        <div class="border rounded-xl overflow-hidden shadow-sm bg-white">
                            <div class="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                                <h4 class="font-bold text-slate-700 text-sm uppercase">Danh sách ảnh đã chọn ({localConfig.sliderImages.length})</h4>
                                <button class="text-xs text-red-500 hover:underline" on:click={() => localConfig.sliderImages = []}>Xóa tất cả</button>
                            </div>
                            
                            <div class="divide-y divide-slate-100">
                                {#each localConfig.sliderImages as img, index}
                                    <div class="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors group/row">
                                        
                                        <div class="w-1/3 flex gap-3">
                                            <div class="w-32 h-20 bg-slate-800 rounded-lg border overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                                                <img 
                                                    src={img.url} 
                                                    alt="Thumbnail" 
                                                    class="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div class="flex flex-col justify-center overflow-hidden">
                                                <span class="text-sm font-bold text-slate-700 truncate block w-full" title={img.fileName}>
                                                    {img.fileName || `Slide #${index + 1}`}
                                                </span>
                                                <span class="text-xs text-slate-400">
                                                    {img.fileRaw ? 'Sẵn sàng upload' : 'Đã có trên Cloud'}
                                                </span>
                                            </div>
                                        </div>

                                        <div class="flex-grow flex items-center gap-3">
                                            <div class="flex-grow">
                                                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ghi chú hiển thị</label>
                                                <input 
                                                    type="text" 
                                                    bind:value={img.title} 
                                                    class="w-full p-2 border border-slate-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" 
                                                    placeholder="Nhập ghi chú..."
                                                >
                                            </div>
                                            <button 
                                                on:click={() => removeSlide(index)} 
                                                class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition mt-4"
                                                title="Xóa ảnh này"
                                            >
                                                <i data-feather="trash-2" class="w-5 h-5"></i>
                                            </button>
                                        </div>

                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            {#if activeTab === 'changelog'}
                <div class="space-y-4 animate-fade-in">
                    <button on:click={addChangelogItem} class="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm">
                        + Thêm bản cập nhật mới
                    </button>
                    <div class="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                        {#each localConfig.changelogs as log, index}
                            <div class="flex flex-col gap-3 p-4 border rounded-xl bg-white shadow-sm relative">
                                <button on:click={() => removeChangelogItem(index)} class="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1.5 rounded"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                                <div class="flex gap-4 pr-10">
                                    <div class="flex flex-col gap-1 w-1/4">
                                        <label class="text-xs font-bold text-gray-500 uppercase">Phiên bản</label>
                                        <input type="text" bind:value={log.version} class="w-full p-2 border rounded text-sm font-bold text-blue-700" placeholder="4.2">
                                    </div>
                                    <div class="flex flex-col gap-1 w-1/4">
                                        <label class="text-xs font-bold text-gray-500 uppercase">Ngày</label>
                                        <input type="text" bind:value={log.date} class="w-full p-2 border rounded text-sm" placeholder="dd/mm/yyyy">
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <div class="flex justify-between items-end">
                                        <label class="text-xs font-bold text-gray-500 uppercase">Nội dung (Hỗ trợ HTML)</label>
                                        <button class="text-xs text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded" on:click={() => insertTemplate(index)}>
                                            <i data-feather="code" class="w-3 h-3"></i> Chèn mẫu chuẩn
                                        </button>
                                    </div>
                                    <textarea bind:value={log.content} rows="12" class="w-full p-3 border rounded text-sm font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nhập nội dung cập nhật..."></textarea>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <div class="mt-6 flex justify-end pt-4 border-t border-slate-200">
                <button on:click={saveAllConfig} disabled={isSaving} class="bg-pink-600 text-white px-5 py-2.5 rounded-lg hover:bg-pink-700 transition font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50">
                    {#if isSaving}
                        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang lưu...
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        Lưu Cấu Hình
                    {/if}
                </button>
            </div>
        </div>
    </details>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>