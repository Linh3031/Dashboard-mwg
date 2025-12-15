<script>
    import { categoryStructure, brandList } from '../../../stores.js';
    import { dataService } from '../../../services/dataService.js';
    // [NEW] Import adminService để lưu
    import { adminService } from '../../../services/admin.service.js';

    let isLoading = false;
    let isSaving = false;
    let showRawData = false;

    // Tính toán số liệu thống kê từ Store
    $: uniqueCategories = $categoryStructure ? [...new Set($categoryStructure.map(i => i.nganhHang).filter(Boolean))] : [];
    $: uniqueGroups = $categoryStructure ? [...new Set($categoryStructure.map(i => i.nhomHang).filter(Boolean))] : [];
    $: totalBrands = $brandList ? $brandList.length : 0;
    
    // Check xem có dữ liệu không để hiển thị bảng
    $: hasData = $categoryStructure.length > 0;

    async function handleCategoryUpload(event) {
        isLoading = true;
        try {
            await dataService.handleCategoryFile(event);
        } catch (error) {
            alert(error.message);
        } finally {
            isLoading = false;
        }
    }

    // [NEW] Hàm lưu dữ liệu lên Cloud
    async function saveToCloud() {
        if (!hasData) return;
        isSaving = true;
        try {
            await adminService.saveCategoryDataToFirestore({
                categories: $categoryStructure,
                brands: $brandList
            });
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu: " + e.message);
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="space-y-6">
    <div class="flex justify-between items-center">
        <div class="text-sm text-gray-500 italic">
            Bước 1: Tải lên file Excel cấu trúc (Bắt buộc 3 cột: Ngành hàng, Nhóm hàng, Nhà sản xuất).
        </div>
        <div class="flex gap-2">
            <button 
                class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                on:click={() => dataService.handleTemplateDownload()}
            >
                Tải File Mẫu
            </button>
            
            <button 
                class="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                on:click={saveToCloud}
                disabled={!hasData || isSaving || isLoading}
            >
                {#if isSaving}
                    <svg class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Đang lưu...
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    Lưu Lên Cloud
                {/if}
            </button>
        </div>
    </div>

    <div class="p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors text-center">
        <input 
            type="file" 
            id="category-upload-input" 
            class="hidden" 
            accept=".xlsx, .xls"
            on:change={handleCategoryUpload}
            disabled={isLoading}
        />
        <label for="category-upload-input" class="cursor-pointer flex flex-col items-center gap-3">
            <div class="p-3 bg-white rounded-full shadow-sm">
                {#if isLoading}
                    <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                {/if}
            </div>
            <div>
                <span class="text-blue-600 font-medium hover:underline">Tải lên file Excel</span>
                <span class="text-slate-500"> cấu trúc ngành hàng</span>
            </div>
        </label>
    </div>

    {#if hasData}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                <span class="text-sm text-blue-700 font-medium">Tổng Ngành Hàng</span>
                <span class="text-xl font-bold text-blue-700">{uniqueCategories.length}</span>
            </div>
            <div class="p-3 bg-green-50 rounded-lg border border-green-100 flex justify-between items-center">
                <span class="text-sm text-green-700 font-medium">Tổng Nhóm Hàng</span>
                <span class="text-xl font-bold text-green-700">{uniqueGroups.length}</span>
            </div>
            <div class="p-3 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
                <span class="text-sm text-purple-700 font-medium">Tổng Hãng</span>
                <span class="text-xl font-bold text-purple-700">{totalBrands}</span>
            </div>
        </div>

        <div class="border rounded-lg overflow-hidden">
            <div class="bg-slate-100 px-4 py-2 border-b flex justify-between items-center">
                <h3 class="font-bold text-slate-700 text-xs uppercase">Dữ liệu thô (Preview)</h3>
                <button 
                    class="text-xs text-blue-600 hover:underline"
                    on:click={() => showRawData = !showRawData}
                >
                    {showRawData ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                </button>
            </div>
            
            {#if showRawData}
            <div class="overflow-x-auto max-h-60">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                        <tr>
                            <th class="px-4 py-2">Ngành Hàng</th>
                            <th class="px-4 py-2">Nhóm Hàng</th>
                            <th class="px-4 py-2">Nhà Sản Xuất</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                        {#each $categoryStructure.slice(0, 100) as item}
                            <tr class="bg-white hover:bg-slate-50">
                                <td class="px-4 py-1 text-slate-600">{item.nganhHang}</td>
                                <td class="px-4 py-1 font-medium text-slate-700">{item.nhomHang}</td>
                                <td class="px-4 py-1 text-slate-500 italic">{item.nhaSanXuat}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            {/if}
        </div>
    {/if}
</div>