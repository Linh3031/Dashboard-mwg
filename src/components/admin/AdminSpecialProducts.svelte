<script>
    import { specialProductList } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    import * as dataService from '../../services/dataService.js';
    import { onMount } from 'svelte';

    let isLoading = false;
    let showList = false;

    // Subscribe to store
    $: products = $specialProductList || [];

    async function handleFileUpload(event) {
        isLoading = true;
        try {
            await dataService.handleSpecialProductFileUpload(event);
            // Auto-save to localStorage for testing persistence
            localStorage.setItem('temp_specialProductList', JSON.stringify($specialProductList));
        } catch (error) {
            alert(error.message);
        } finally {
            isLoading = false;
        }
    }

    async function saveToCloud() {
        if (products.length === 0) return alert("Chưa có dữ liệu để lưu!");
        isLoading = true;
        try {
            await adminService.saveSpecialProductList(products);
            // Backup to localStorage
            localStorage.setItem('temp_specialProductList', JSON.stringify(products));
        } catch (error) {
            console.error(error);
            alert("Lỗi lưu: " + error.message);
        } finally {
            isLoading = false;
        }
    }

    // Load backup on mount if store is empty (Test mode)
    onMount(() => {
        if (products.length === 0) {
            const backup = localStorage.getItem('temp_specialProductList');
            if (backup) specialProductList.set(JSON.parse(backup));
        }
    });
</script>

<div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 transition-all hover:shadow-md">
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div class="p-2 bg-purple-50 rounded-lg text-purple-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            </div>
            Sản Phẩm Đặc Quyền
        </h2>
        
        <div class="flex gap-2">
            <button 
                class="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                on:click={() => dataService.handleTemplateDownload()}
            >
                Tải File Mẫu
            </button>
            <button 
                class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                on:click={saveToCloud}
                disabled={isLoading}
            >
                {#if isLoading}
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" /></svg>
                {/if}
                Lưu Lên Cloud
            </button>
        </div>
    </div>

    <div class="mb-8 p-6 bg-purple-50/50 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 transition-colors text-center group">
        <input 
            type="file" 
            id="special-product-upload" 
            class="hidden" 
            accept=".xlsx, .xls"
            on:change={handleFileUpload}
        />
        <label for="special-product-upload" class="cursor-pointer flex flex-col items-center gap-3">
            <div class="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
            </div>
            <div>
                <span class="text-purple-600 font-bold hover:underline">Nhấn để tải file Excel</span>
                <span class="text-slate-500 block text-sm mt-1">Yêu cầu cột: Mã SP, Tên SP, Nhóm hàng</span>
            </div>
        </label>
    </div>

    {#if products.length > 0}
        <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                        Đã tải {products.length} sản phẩm
                    </span>
                </div>
                <button 
                    class="text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline"
                    on:click={() => showList = !showList}
                >
                    {showList ? 'Thu gọn danh sách' : 'Xem chi tiết danh sách'}
                </button>
            </div>

            {#if showList}
                <div class="overflow-x-auto max-h-96">
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-2 w-32">Mã SP</th>
                                <th class="px-4 py-2">Tên Sản Phẩm</th>
                                <th class="px-4 py-2 w-48">Nhóm Hàng</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            {#each products as item}
                                <tr class="bg-white hover:bg-purple-50 transition-colors">
                                    <td class="px-4 py-2 font-mono text-xs text-slate-500">{item.maSanPham}</td>
                                    <td class="px-4 py-2 font-medium text-slate-700">{item.tenSanPham}</td>
                                    <td class="px-4 py-2 text-slate-500 text-xs">{item.nhomHang}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    {/if}
</div>