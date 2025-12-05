<script>
    import { onMount } from 'svelte';
    import { categoryStructure, brandList } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    // Import toàn bộ module dataService để sử dụng các hàm handle
    import * as dataService from '../../services/dataService.js';

    let isLoading = false;
    let showRawData = false;

    // Reactive variables từ store
    $: categories = $categoryStructure || [];
    $: brands = $brandList || [];

    async function handleCategoryUpload(event) {
        isLoading = true;
        try {
            // Gọi hàm xử lý file từ service (đã được refactor ở các bước trước)
            await dataService.handleCategoryFile(event);
        } catch (error) {
            alert(error.message);
        } finally {
            isLoading = false;
        }
    }

    async function saveToCloud() {
        if (categories.length === 0) {
            alert("Chưa có dữ liệu để lưu!");
            return;
        }
        isLoading = true;
        try {
            await adminService.saveCategoryDataToFirestore({
                categories: categories,
                brands: brands
            });
            // Alert tạm thời, sau này sẽ dùng notification store
            // alert("Đã lưu cấu trúc ngành hàng lên Cloud thành công!"); 
        } catch (error) {
            console.error(error);
            alert("Lỗi khi lưu dữ liệu: " + error.message);
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Cấu Trúc Ngành Hàng & Hãng
        </h2>
        
        <div class="flex gap-2">
            <button 
                class="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                on:click={() => dataService.handleTemplateDownload()}
            >
                Tải File Mẫu
            </button>
            <button 
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                on:click={saveToCloud}
                disabled={isLoading}
            >
                {#if isLoading}
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                {/if}
                Lưu Lên Cloud
            </button>
        </div>
    </div>

    <div class="mb-8 p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors text-center">
        <input 
            type="file" 
            id="category-upload" 
            class="hidden" 
            accept=".xlsx, .xls"
            on:change={handleCategoryUpload}
        />
        <label for="category-upload" class="cursor-pointer flex flex-col items-center gap-3">
            <div class="p-3 bg-white rounded-full shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>
            <div>
                <span class="text-blue-600 font-medium hover:underline">Tải lên file Excel</span>
                <span class="text-slate-500"> chứa cấu trúc ngành hàng</span>
            </div>
            <p class="text-xs text-slate-400">Hỗ trợ định dạng .xlsx, .xls</p>
        </label>
    </div>

    {#if categories.length > 0}
        <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-green-50 rounded-lg border border-green-100">
                    <div class="text-sm text-green-600 font-medium">Tổng Nhóm Hàng</div>
                    <div class="text-2xl font-bold text-green-700">{categories.length}</div>
                </div>
                <div class="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div class="text-sm text-purple-600 font-medium">Tổng Hãng</div>
                    <div class="text-2xl font-bold text-purple-700">{brands.length}</div>
                </div>
            </div>

            <div class="border rounded-lg overflow-hidden">
                <div class="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                    <h3 class="font-bold text-slate-700 text-sm">Xem trước dữ liệu</h3>
                    <button 
                        class="text-xs text-blue-600 hover:underline"
                        on:click={() => showRawData = !showRawData}
                    >
                        {showRawData ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                    </button>
                </div>
                
                {#if showRawData}
                <div class="overflow-x-auto max-h-96">
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-3">ID Nhóm</th>
                                <th class="px-4 py-3">Tên Nhóm</th>
                                <th class="px-4 py-3">Ngành Hàng</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            {#each categories as item}
                                <tr class="bg-white hover:bg-slate-50">
                                    <td class="px-4 py-2 font-mono text-xs">{item.id || '-'}</td>
                                    <td class="px-4 py-2 font-medium text-slate-800">{item.nhomHang || item.name}</td>
                                    <td class="px-4 py-2 text-slate-600">{item.nganhHang || '-'}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
                {/if}
            </div>
        </div>
    {/if}
</div>