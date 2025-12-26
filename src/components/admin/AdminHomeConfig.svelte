<script>
    import { onMount, afterUpdate } from 'svelte';
    import { homeConfig } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';

    let localConfig = {
        videoUrl: '',
        timeline: [],
        sliderImages: [], // { url, title, fileName, fileRaw }
        changelogs: []
    };

    let activeTab = 'video'; 
    let isSaving = false;
    let isUploading = false;
    let fileInput; 

    // --- BIẾN CHO TRÌNH SOẠN THẢO MỚI ---
    let mainTitle = ''; // Tiêu đề chính (VD: Cập nhật tháng 12)
    let editorSections = []; // Danh sách các mục nhỏ

    $: if ($homeConfig) {
        localConfig = JSON.parse(JSON.stringify($homeConfig));
    }

    // --- LOGIC TIMELINE VIDEO ---
    function addTimelineItem() { localConfig.timeline = [...localConfig.timeline, { time: '00:00', label: 'Mốc mới' }]; }
    function removeTimelineItem(index) { localConfig.timeline = localConfig.timeline.filter((_, i) => i !== index); }

    // --- LOGIC UPLOAD ẢNH CLOUD ---
    function triggerUpload() { fileInput.click(); }
    
    async function handleFilesSelect(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        isUploading = true;
        const newImages = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            newImages.push({ url: URL.createObjectURL(file), fileName: file.name, title: '', fileRaw: file });
        }
        localConfig.sliderImages = [...localConfig.sliderImages, ...newImages];
        event.target.value = '';
        isUploading = false;
    }
    function removeSlide(index) {
        if(!confirm("Xóa ảnh này?")) return;
        localConfig.sliderImages = localConfig.sliderImages.filter((_, i) => i !== index);
    }

    // --- LOGIC CHANGELOG (NÂNG CẤP - KHÔNG CẦN HTML) ---
    function addChangelogItem() {
        const today = new Date().toLocaleDateString('vi-VN');
        // Tạo bản ghi mới
        localConfig.changelogs = [{ version: '', date: today, content: '' }, ...localConfig.changelogs];
        
        // Mở trình soạn thảo ngay
        mainTitle = 'Cập nhật tính năng mới';
        editorSections = [{ title: 'Thay đổi chính', content: '' }];
    }

    function removeChangelogItem(index) {
        localConfig.changelogs = localConfig.changelogs.filter((_, i) => i !== index);
    }
    
    // Thêm một mục soạn thảo
    function addEditorSection() {
        editorSections = [...editorSections, { title: '', content: '' }];
    }

    function removeEditorSection(idx) {
        editorSections = editorSections.filter((_, i) => i !== idx);
    }

    // [QUAN TRỌNG] Chuyển đổi từ Form nhập liệu -> HTML để lưu
    function applyEditorContent(logIndex) {
        let html = '';
        
        // 1. Tiêu đề chính (Màu xanh đậm, in hoa)
        if (mainTitle) {
            html += `<h3 style="color:#1d4ed8; font-size:1.1em; font-weight:800; margin-bottom:10px; text-transform:uppercase;">${mainTitle}</h3>`;
        }

        // 2. Các mục con
        editorSections.forEach(sec => {
            if (sec.title) {
                // Tiêu đề phụ (Màu xám đậm)
                html += `<h4 style="color:#334155; font-weight:700; margin-top:8px; margin-bottom:4px;">${sec.title}:</h4>`;
            }
            if (sec.content) {
                html += '<ul style="margin-bottom:12px;">';
                // Tách dòng
                const lines = sec.content.split('\n').map(l => l.trim()).filter(l => l);
                lines.forEach(line => {
                    html += `<li>${line}</li>`;
                });
                html += '</ul>';
            }
        });
        
        localConfig.changelogs[logIndex].content = html;
        
        // Xóa editor sau khi apply (để tránh nhầm lẫn)
        mainTitle = '';
        editorSections = [];
        
        alert("Đã cập nhật nội dung! Hãy bấm 'Lưu Cấu Hình' ở dưới cùng để hoàn tất.");
    }

    // --- HÀM LƯU CHUNG ---
    async function saveAllConfig() {
        console.log("Đang lưu...", localConfig);
        isSaving = true;
        try {
            // 1. Fix link Youtube
            if (localConfig.videoUrl) {
                let url = localConfig.videoUrl;
                if (url.includes('watch?v=')) {
                    url = url.replace('watch?v=', 'embed/');
                    const ampersandIndex = url.indexOf('&');
                    if (ampersandIndex !== -1) url = url.substring(0, ampersandIndex);
                } else if (url.includes('youtu.be/')) {
                    url = url.replace('youtu.be/', 'www.youtube.com/embed/');
                }
                localConfig.videoUrl = url;
            }

            // 2. Upload ảnh mới lên Cloud
            const uploadPromises = localConfig.sliderImages.map(async (img) => {
                if (img.fileRaw) {
                    try {
                        const cloudUrl = await adminService.uploadImage(img.fileRaw, 'slides');
                        return { ...img, url: cloudUrl, fileRaw: null };
                    } catch (err) {
                        console.error("Lỗi upload:", err);
                        return img; 
                    }
                }
                return img;
            });
            localConfig.sliderImages = await Promise.all(uploadPromises);

            // 3. Lưu Firestore
            await adminService.saveHomeConfig(localConfig);
            alert("Đã lưu thành công! Dữ liệu đã được đồng bộ.");
            
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
                        <input type="text" bind:value={localConfig.videoUrl} class="w-full p-2 border border-blue-300 rounded-md text-sm outline-none" placeholder="Dán link Youtube...">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Timeline</label>
                        <div class="space-y-2">
                            {#each localConfig.timeline as item, index}
                                <div class="flex items-center gap-2">
                                    <input type="text" bind:value={item.time} class="w-20 p-2 border rounded-md text-sm text-center" placeholder="00:00">
                                    <input type="text" bind:value={item.label} class="flex-grow p-2 border rounded-md text-sm" placeholder="Mô tả...">
                                    <button on:click={() => removeTimelineItem(index)} class="text-red-500 hover:bg-red-50 p-2 rounded"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                                </div>
                            {/each}
                        </div>
                        <button on:click={addTimelineItem} class="mt-2 text-sm text-blue-600 hover:underline flex items-center gap-1"><i data-feather="plus" class="w-3 h-3"></i> Thêm mốc</button>
                    </div>
                </div>
            {/if}

            {#if activeTab === 'slider'}
                <div class="space-y-6 animate-fade-in">
                    <div class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 hover:bg-blue-50 transition-colors">
                        <input type="file" multiple accept="image/*" class="hidden" bind:this={fileInput} on:change={handleFilesSelect} />
                        <button on:click={triggerUpload} class="flex flex-col items-center gap-2 group/btn" disabled={isUploading}>
                            <div class="p-3 bg-white rounded-full shadow-md text-blue-600 group-hover/btn:scale-110 transition-transform"><i data-feather="cloud-upload" class="w-8 h-8"></i></div>
                            <span class="text-blue-700 font-bold text-sm">{isUploading ? 'Đang xử lý...' : 'Nhấn để chọn ảnh từ máy tính'}</span>
                        </button>
                    </div>
                    {#if localConfig.sliderImages.length > 0}
                        <div class="border rounded-xl overflow-hidden shadow-sm bg-white">
                            <div class="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                                <h4 class="font-bold text-slate-700 text-sm uppercase">Danh sách ảnh ({localConfig.sliderImages.length})</h4>
                                <button class="text-xs text-red-500 hover:underline" on:click={() => localConfig.sliderImages = []}>Xóa tất cả</button>
                            </div>
                            <div class="divide-y divide-slate-100">
                                {#each localConfig.sliderImages as img, index}
                                    <div class="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors">
                                        <div class="w-24 h-16 bg-slate-200 rounded-lg border overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                                            <img src={img.url} alt="Thumbnail" class="w-full h-full object-contain" />
                                        </div>
                                        <div class="flex-grow flex flex-col gap-2">
                                            <input type="text" bind:value={img.title} class="w-full p-2 border border-slate-200 rounded text-sm outline-none" placeholder="Ghi chú...">
                                        </div>
                                        <button on:click={() => removeSlide(index)} class="p-2 text-slate-300 hover:text-red-500 rounded-lg"><i data-feather="trash-2" class="w-5 h-5"></i></button>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            {#if activeTab === 'changelog'}
                <div class="space-y-4 animate-fade-in">
                    <button on:click={addChangelogItem} class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md font-bold flex justify-center items-center gap-2">
                        <i data-feather="plus-circle" class="w-5 h-5"></i> Soạn bản cập nhật mới
                    </button>
                    
                    <div class="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                        {#each localConfig.changelogs as log, index}
                            <div class="flex flex-col gap-3 p-4 border rounded-xl bg-white shadow-sm relative group">
                                <button on:click={() => removeChangelogItem(index)} class="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-1.5 rounded"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                                
                                <div class="flex gap-4 pr-10 border-b border-gray-100 pb-3 mb-2">
                                    <div class="flex flex-col gap-1 w-1/3">
                                        <label class="text-xs font-bold text-gray-500 uppercase">Phiên bản (VD: 2.5)</label>
                                        <input type="text" bind:value={log.version} class="w-full p-2 border rounded text-sm font-bold text-blue-700 font-mono" placeholder="2.5">
                                    </div>
                                    <div class="flex flex-col gap-1 w-1/3">
                                        <label class="text-xs font-bold text-gray-500 uppercase">Ngày</label>
                                        <input type="text" bind:value={log.date} class="w-full p-2 border rounded text-sm" placeholder="dd/mm/yyyy">
                                    </div>
                                </div>

                                {#if index === 0 && editorSections.length > 0}
                                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-inner">
                                        <div class="mb-4">
                                            <label class="block text-xs font-bold text-blue-800 mb-1 uppercase">Tiêu đề chính phiên bản</label>
                                            <input type="text" bind:value={mainTitle} class="w-full p-2 border border-blue-200 rounded text-sm font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-300" placeholder="VD: Cập nhật tháng 12">
                                        </div>

                                        <div class="space-y-3">
                                            <label class="block text-xs font-bold text-slate-500 uppercase">Nội dung chi tiết</label>
                                            {#each editorSections as sec, secIdx}
                                                <div class="bg-white p-3 rounded border border-slate-200 relative shadow-sm">
                                                    <button on:click={() => removeEditorSection(secIdx)} class="absolute -top-2 -right-2 bg-white text-red-400 hover:text-red-600 rounded-full border border-gray-200 p-1 shadow-sm"><i data-feather="x" class="w-3 h-3"></i></button>
                                                    
                                                    <input type="text" bind:value={sec.title} class="w-full p-1.5 border-b border-gray-100 text-sm font-bold text-slate-700 outline-none placeholder-slate-400 mb-2" placeholder="Tiêu đề phụ (VD: Tính năng mới)">
                                                    <textarea bind:value={sec.content} rows="3" class="w-full p-1.5 text-sm text-slate-600 outline-none resize-none placeholder-slate-300" placeholder="- Gạch đầu dòng 1&#10;- Gạch đầu dòng 2..."></textarea>
                                                </div>
                                            {/each}
                                        </div>
                                        
                                        <div class="flex justify-between items-center pt-4">
                                            <button on:click={addEditorSection} class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><i data-feather="plus" class="w-3 h-3"></i> Thêm mục</button>
                                            <button on:click={() => applyEditorContent(index)} class="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 shadow-sm flex items-center gap-2">
                                                <i data-feather="check" class="w-3 h-3"></i> Áp dụng & Đóng gói
                                            </button>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="flex flex-col gap-1">
                                        <div class="flex justify-between items-end">
                                            <label class="text-xs font-bold text-gray-400 italic">Nội dung (HTML đã đóng gói)</label>
                                            {#if index === 0}
                                                <button class="text-xs text-blue-500 hover:underline" on:click={() => { mainTitle='Sửa đổi'; editorSections=[{title:'',content:''}] }}>Sửa lại bằng bộ soạn thảo</button>
                                            {/if}
                                        </div>
                                        <textarea bind:value={log.content} rows="4" class="w-full p-3 border rounded text-xs font-mono bg-slate-50 text-slate-500 leading-relaxed outline-none"></textarea>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <div class="mt-6 flex justify-end pt-4 border-t border-slate-200">
                <button on:click={saveAllConfig} disabled={isSaving} class="bg-pink-600 text-white px-5 py-2.5 rounded-lg hover:bg-pink-700 transition font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50">
                    {#if isSaving}
                        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang lưu & Upload...
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