<script>
    // Version 2.2 - Larger Textarea and Template Insert for Changelog
    import { onMount, afterUpdate } from 'svelte';
    import { homeConfig } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let localConfig = {
        videoUrl: '',
        timeline: [],
        sliderImages: [],
        changelogs: []
    };

    $: if ($homeConfig) {
        localConfig = JSON.parse(JSON.stringify($homeConfig));
    }

    let activeTab = 'video'; 
    let isSaving = false;

    // --- LOGIC TIMELINE VIDEO ---
    function addTimelineItem() {
        localConfig.timeline = [...localConfig.timeline, { time: '00:00', label: 'Mốc mới' }];
    }
    function removeTimelineItem(index) {
        localConfig.timeline = localConfig.timeline.filter((_, i) => i !== index);
    }

    // --- LOGIC SLIDER ẢNH ---
    function addSliderItem() {
        localConfig.sliderImages = [...localConfig.sliderImages, { url: '', title: '' }];
    }
    function removeSliderItem(index) {
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
    
    // [MỚI] Hàm chèn mẫu soạn thảo
    function insertTemplate(index) {
        const template = `<ul>
    <li><strong>Tính năng chính 1:</strong>
        <ul style="list-style-type: circle; margin-left: 20px;">
            <li>Chi tiết A</li>
            <li>Chi tiết B</li>
        </ul>
    </li>
    <li><strong>Sửa lỗi:</strong> Mô tả lỗi đã sửa.</li>
</ul>`;
        localConfig.changelogs[index].content = template;
    }

    // --- HÀM LƯU CHUNG ---
    async function saveAllConfig() {
        console.log("Đang lưu cấu hình...", localConfig);
        isSaving = true;
        try {
            await adminService.saveHomeConfig(localConfig);
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
    <details class="group" open> <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
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
                <button 
                    class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors {activeTab === 'video' ? 'bg-white text-pink-600 border-x border-t border-gray-200' : 'text-gray-500 hover:text-gray-700'}"
                    on:click={() => activeTab = 'video'}
                >
                    Video & Timeline
                </button>
                <button 
                    class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors {activeTab === 'slider' ? 'bg-white text-pink-600 border-x border-t border-gray-200' : 'text-gray-500 hover:text-gray-700'}"
                    on:click={() => activeTab = 'slider'}
                >
                    Slide Ảnh
                </button>
                <button 
                    class="px-4 py-2 font-medium text-sm rounded-t-lg transition-colors {activeTab === 'changelog' ? 'bg-white text-pink-600 border-x border-t border-gray-200' : 'text-gray-500 hover:text-gray-700'}"
                    on:click={() => activeTab = 'changelog'}
                >
                    Lịch sử cập nhật
                </button>
            </div>

            {#if activeTab === 'video'}
                <div class="space-y-4 animate-fade-in">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Youtube Embed URL</label>
                        <input type="text" bind:value={localConfig.videoUrl} class="w-full p-2 border rounded-md text-sm" placeholder="https://www.youtube.com/embed/...">
                        <p class="text-xs text-gray-400 mt-1">Lưu ý: Phải là link "Embed" (Nhúng) của Youtube.</p>
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
                <div class="space-y-4 animate-fade-in">
                    <p class="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                        Mẹo: Sử dụng link trực tiếp của ảnh (đuôi .jpg, .png). Hoặc đường dẫn nội bộ (VD: /slides/anh1.jpg).
                    </p>
                    <div class="space-y-4">
                        {#each localConfig.sliderImages as img, index}
                            <div class="flex flex-col gap-2 p-3 border rounded-lg bg-white shadow-sm">
                                <div class="flex justify-between items-center">
                                    <span class="text-xs font-bold text-gray-400">Slide #{index + 1}</span>
                                    <button on:click={() => removeSliderItem(index)} class="text-red-500 text-xs hover:underline">Xóa</button>
                                </div>
                                <input type="text" bind:value={img.url} class="w-full p-2 border rounded-md text-sm" placeholder="Link ảnh (URL)...">
                                <input type="text" bind:value={img.title} class="w-full p-2 border rounded-md text-sm" placeholder="Tiêu đề ảnh (hiển thị đè lên ảnh)...">
                            </div>
                        {/each}
                    </div>
                    <button on:click={addSliderItem} class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-pink-500 hover:text-pink-500 transition">
                        + Thêm Slide Mới
                    </button>
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
                                        <button 
                                            class="text-xs text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                                            on:click={() => insertTemplate(index)}
                                        >
                                            <i data-feather="code" class="w-3 h-3"></i> Chèn mẫu chuẩn
                                        </button>
                                    </div>
                                    <textarea 
                                        bind:value={log.content} 
                                        rows="12" 
                                        class="w-full p-3 border rounded text-sm font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none" 
                                        placeholder="Nhập nội dung cập nhật..."
                                    ></textarea>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <div class="mt-6 flex justify-end pt-4 border-t border-slate-200">
                <button 
                    on:click={saveAllConfig} 
                    disabled={isSaving} 
                    class="bg-pink-600 text-white px-5 py-2.5 rounded-lg hover:bg-pink-700 transition font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
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