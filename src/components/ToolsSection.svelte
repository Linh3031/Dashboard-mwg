<script>
    import { onMount } from 'svelte';
    import { isAdmin } from '../stores.js';
    import { toolsService } from '../services/tools.service.js';

    export let activeTab;

    let toolsList = [];
    let isEditing = false;
    let isLoading = true;
    let isSaving = false;

    // Quản lý state UI
    let currentSlides = {}; 
    let expandedViews = {}; // Trạng thái "Xem thêm" của người dùng { [tIndex]: boolean }
    let contentHeights = {}; // Đo chiều cao nội dung thực tế { [tIndex]: number }
    let expandedEdits = {}; // Trạng thái "Thu gọn/Mở rộng" form Admin { [tIndex]: boolean }

    $: if (activeTab === 'tools-section') {
        loadData();
    }

    async function loadData() {
        isLoading = true;
        const rawData = await toolsService.getTools();
        
        // [TÍNH TƯƠNG THÍCH NGƯỢC] Chuyển đổi data ảnh thành dạng Object có caption
        toolsList = rawData.map((t, index) => {
            currentSlides[index] = 0;
            expandedViews[index] = false;
            expandedEdits[index] = false; // Mặc định thu gọn tất cả form Edit
            
            let parsedImages = [];
            if (t.images && t.images.length > 0) {
                parsedImages = t.images.map(img => {
                    if (typeof img === 'string') return { url: img, caption: '' };
                    return img; 
                });
            } else if (t.imageUrl) {
                parsedImages = [{ url: t.imageUrl, caption: '' }];
            }

            return {
                title: t.title || '',
                link: t.link || '',
                images: parsedImages,
                features: t.features && t.features.length > 0 ? t.features : 
                          (t.description ? [{ main: t.description, subs: [] }] : [])
            };
        });
        isLoading = false;
    }

    // --- CÁC HÀM XỬ LÝ SLIDER ---
    function nextSlide(tIndex, max) {
        if (max <= 1) return;
        currentSlides[tIndex] = (currentSlides[tIndex] + 1) % max;
    }

    function prevSlide(tIndex, max) {
        if (max <= 1) return;
        currentSlides[tIndex] = (currentSlides[tIndex] - 1 + max) % max;
    }

    // --- CÁC HÀM XỬ LÝ FORM (ADMIN) ---
    function addTool() {
        const newIndex = toolsList.length;
        toolsList = [...toolsList, { title: '', link: '', images: [{ url: '', caption: '' }], features: [{ main: '', subs: [''] }] }];
        currentSlides[newIndex] = 0;
        
        // Tự động mở form mới, thu gọn các form cũ
        Object.keys(expandedEdits).forEach(k => expandedEdits[k] = false);
        expandedEdits[newIndex] = true;
    }

    function removeTool(index) {
        if(confirm('Bạn có chắc muốn xóa toàn bộ công cụ này?')) {
            toolsList = toolsList.filter((_, i) => i !== index);
        }
    }

    function toggleEditForm(tIndex) {
        expandedEdits[tIndex] = !expandedEdits[tIndex];
    }

    function addImage(tIndex) {
        toolsList[tIndex].images = [...toolsList[tIndex].images, { url: '', caption: '' }];
    }

    function removeImage(tIndex, imgIndex) {
        toolsList[tIndex].images = toolsList[tIndex].images.filter((_, i) => i !== imgIndex);
    }

    function addFeature(tIndex) {
        toolsList[tIndex].features = [...toolsList[tIndex].features, { main: '', subs: [''] }];
    }

    function removeFeature(tIndex, fIndex) {
        toolsList[tIndex].features = toolsList[tIndex].features.filter((_, i) => i !== fIndex);
    }

    function addSubFeature(tIndex, fIndex) {
        toolsList[tIndex].features[fIndex].subs = [...toolsList[tIndex].features[fIndex].subs, ''];
    }

    function removeSubFeature(tIndex, fIndex, subIndex) {
        toolsList[tIndex].features[fIndex].subs = toolsList[tIndex].features[fIndex].subs.filter((_, i) => i !== subIndex);
    }

    async function saveChanges() {
        isSaving = true;
        // Clean up data trước khi lưu
        const cleanData = toolsList.map(t => ({
            ...t,
            images: t.images.filter(img => img.url && img.url.trim() !== ''),
            features: t.features.filter(f => f.main && f.main.trim() !== '').map(f => ({
                main: f.main,
                subs: f.subs.filter(s => s && s.trim() !== '')
            }))
        }));

        const success = await toolsService.saveTools(cleanData);
        if (success) {
            isEditing = false;
            await loadData();
        } else {
            alert("Có lỗi xảy ra khi lưu. Vui lòng thử lại!");
        }
        isSaving = false;
    }

    async function cancelEdit() {
        isEditing = false;
        await loadData();
    }
</script>

{#if activeTab === 'tools-section'}
<div class="w-full h-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-y-auto">
    
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-20">
        <div>
            <h2 class="text-2xl font-bold text-gray-800">Hệ sinh thái Công cụ</h2>
            <p class="text-sm text-gray-500 mt-1">Danh sách các phần mềm và liên kết hỗ trợ nội bộ</p>
        </div>
        
        {#if $isAdmin}
            <div class="flex items-center gap-2">
                {#if isEditing}
                    <button class="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors" on:click={cancelEdit} disabled={isSaving}>
                        Hủy
                    </button>
                    <button class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm" on:click={saveChanges} disabled={isSaving}>
                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                {:else}
                    <button class="px-4 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-2" on:click={() => isEditing = true}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Chỉnh sửa liên kết
                    </button>
                {/if}
            </div>
        {/if}
    </div>

    {#if isLoading}
        <div class="flex justify-center items-center py-20 text-gray-400">
            <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span class="ml-3 font-medium">Đang tải dữ liệu...</span>
        </div>
    {:else}
        {#if isEditing}
            <div class="space-y-4">
                {#each toolsList as tool, tIndex}
                    <div class="border border-blue-200 bg-blue-50/20 rounded-xl overflow-hidden shadow-sm transition-all">
                        
                        <div class="flex justify-between items-center p-4 bg-blue-50/50 cursor-pointer hover:bg-blue-100/50 transition-colors" on:click={() => toggleEditForm(tIndex)}>
                            <div class="flex items-center gap-3">
                                <span class="bg-blue-600 text-white font-bold text-xs px-2 py-1 rounded">#{tIndex + 1}</span>
                                <h3 class="font-bold text-gray-800 text-lg">{tool.title || '(Chưa có tiêu đề)'}</h3>
                            </div>
                            <div class="flex items-center gap-4">
                                <button class="text-red-500 hover:text-red-700 font-semibold text-sm px-2 py-1 hover:bg-red-50 rounded transition-colors" on:click|stopPropagation={() => removeTool(tIndex)}>Xóa bỏ</button>
                                <svg class="w-6 h-6 text-gray-500 transform transition-transform duration-300 {expandedEdits[tIndex] ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        {#if expandedEdits[tIndex]}
                            <div class="p-5 border-t border-blue-100 bg-white">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-1">Tên công cụ (Tiêu đề)</label>
                                        <input type="text" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" bind:value={tool.title} placeholder="VD: Check list work" />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-1">Đường dẫn Link</label>
                                        <input type="text" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" bind:value={tool.link} placeholder="https://checklistwork.netlify.app/" />
                                    </div>
                                </div>

                                <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div class="flex justify-between items-center mb-3">
                                        <label class="block text-sm font-bold text-gray-700">Hình ảnh minh họa</label>
                                        <button class="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 font-bold shadow-sm" on:click={() => addImage(tIndex)}>+ Thêm Ảnh</button>
                                    </div>
                                    <div class="space-y-3">
                                        {#each tool.images as img, imgIndex}
                                            <div class="flex flex-col md:flex-row gap-2 bg-white p-2 rounded border border-gray-100 shadow-sm relative">
                                                <input type="text" class="flex-1 p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" bind:value={tool.images[imgIndex].url} placeholder="URL ảnh (https://...)" />
                                                <input type="text" class="flex-1 p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500" bind:value={tool.images[imgIndex].caption} placeholder="Chú thích ảnh (Tùy chọn)" />
                                                <button class="p-2 text-gray-400 hover:text-red-500 md:w-10 flex justify-center items-center" on:click={() => removeImage(tIndex, imgIndex)}><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                            </div>
                                        {/each}
                                        {#if tool.images.length === 0}
                                            <div class="text-sm text-gray-400 italic">Chưa có ảnh nào.</div>
                                        {/if}
                                    </div>
                                </div>

                                <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div class="flex justify-between items-center mb-3">
                                        <label class="block text-sm font-bold text-gray-700">Nội dung / Tính năng</label>
                                        <button class="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-bold shadow-sm" on:click={() => addFeature(tIndex)}>+ Thêm Tiêu đề chính</button>
                                    </div>
                                    
                                    <div class="space-y-4">
                                        {#each tool.features as feature, fIndex}
                                            <div class="p-4 border border-gray-200 bg-white rounded-lg relative shadow-sm">
                                                <button class="absolute top-2 right-2 text-gray-300 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-1 rounded transition-colors" on:click={() => removeFeature(tIndex, fIndex)}><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                                
                                                <div class="pr-8 mb-3">
                                                    <input type="text" class="w-full p-2 border-b-2 border-gray-200 bg-transparent text-sm font-bold outline-none focus:border-green-500 text-gray-800" bind:value={feature.main} placeholder="Tiêu đề chính (VD: Phân ca all in one tự động)" />
                                                </div>

                                                <div class="pl-4 space-y-2 border-l-2 border-green-200 ml-2">
                                                    {#each feature.subs as sub, subIndex}
                                                        <div class="flex gap-2 items-center">
                                                            <span class="text-green-500 text-xs font-bold">+</span>
                                                            <input type="text" class="flex-1 p-2 border border-gray-200 rounded text-sm outline-none focus:border-green-400 bg-gray-50 focus:bg-white transition-colors" bind:value={feature.subs[subIndex]} placeholder="Ý phụ (VD: Chia đều và xoay vòng ca...)" />
                                                            <button class="text-gray-400 hover:text-red-500 p-1" on:click={() => removeSubFeature(tIndex, fIndex, subIndex)}>
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                            </button>
                                                        </div>
                                                    {/each}
                                                    <button class="text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2 py-1 rounded mt-2 block" on:click={() => addSubFeature(tIndex, fIndex)}>+ Thêm dòng chi tiết</button>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
                
                <button class="w-full py-5 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm" on:click={addTool}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    THÊM CÔNG CỤ MỚI VÀO HỆ SINH THÁI
                </button>
            </div>

        {:else}
            {#if toolsList.length === 0}
                <div class="text-center py-10 text-gray-500 italic border-2 border-dashed border-gray-200 rounded-xl">Hiện chưa có công cụ nào được liên kết.</div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {#each toolsList as tool, tIndex}
                        <div class="flex flex-col border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-white">
                            
                            <div class="relative w-full h-56 bg-gray-100 group">
                                {#if tool.images && tool.images.length > 0}
                                    <img src={tool.images[currentSlides[tIndex] || 0].url} alt={tool.title} class="w-full h-full object-cover" on:error={(e) => e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5M4buXaSB04bqjaSDhuqNuaDwvdGV4dD48L3N2Zz4='} />
                                    
                                    {#if tool.images[currentSlides[tIndex] || 0].caption}
                                        <div class="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-2 text-center font-medium">
                                            {tool.images[currentSlides[tIndex] || 0].caption}
                                        </div>
                                    {/if}

                                    {#if tool.images.length > 1}
                                        <button class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" on:click={(e) => { e.preventDefault(); prevSlide(tIndex, tool.images.length); }}>
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
                                        </button>
                                        <button class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" on:click={(e) => { e.preventDefault(); nextSlide(tIndex, tool.images.length); }}>
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                                        </button>
                                        <div class="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {(currentSlides[tIndex] || 0) + 1}/{tool.images.length}
                                        </div>
                                    {/if}
                                {:else}
                                    <div class="w-full h-full flex items-center justify-center text-gray-400">
                                        <svg class="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    </div>
                                {/if}
                            </div>
                            
                            <div class="p-5 flex flex-col flex-1">
                                <a href={tool.link || '#'} target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-lg font-extrabold text-blue-700 hover:text-blue-900 transition-colors mb-3 group/link">
                                    {tool.title || 'Chưa có tiêu đề'}
                                    <svg class="w-4 h-4 ml-1.5 transform group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                </a>
                                
                                <div class="relative transition-all duration-300 overflow-hidden" style={!expandedViews[tIndex] ? 'max-height: 140px;' : ''}>
                                    <div bind:clientHeight={contentHeights[tIndex]} class="space-y-3 text-sm text-gray-700 pb-1">
                                        {#each tool.features as feature}
                                            {#if feature.main}
                                                <div class="font-bold text-gray-800 flex gap-2">
                                                    <span class="text-blue-500 mt-0.5">■</span>
                                                    {feature.main}
                                                </div>
                                            {/if}
                                            
                                            {#if feature.subs && feature.subs.length > 0}
                                                <ul class="pl-6 space-y-1.5 list-none">
                                                    {#each feature.subs as sub}
                                                        <li class="relative before:content-['+'] before:absolute before:-left-4 before:text-gray-400 before:font-bold text-gray-600">
                                                            {sub}
                                                        </li>
                                                    {/each}
                                                </ul>
                                            {/if}
                                        {/each}
                                    </div>
                                    
                                    {#if !expandedViews[tIndex] && contentHeights[tIndex] > 140}
                                        <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                    {/if}
                                </div>

                                {#if contentHeights[tIndex] > 140}
                                    <div class="mt-3 text-center border-t border-gray-100 pt-2">
                                        <button class="text-blue-600 text-sm font-bold hover:underline bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full transition-colors" on:click={() => expandedViews[tIndex] = !expandedViews[tIndex]}>
                                            {expandedViews[tIndex] ? 'Thu gọn lại ↑' : 'Xem chi tiết ↓'}
                                        </button>
                                    </div>
                                {/if}
                            </div>

                        </div>
                    {/each}
                </div>
            {/if}
        {/if}
    {/if}
</div>
{/if}