<script>
    import { globalSpecialPrograms, specialProductList } from '../../stores.js';
    import { adminService } from '../../services/admin.service.js';
    // SỬA LỖI: Import toàn bộ module
    import * as dataService from '../../services/dataService.js';

    let isLoading = false;
    let showList = false;

    // Subscribe to store
    let products = [];
    $: products = $specialProductList || [];

    async function handleFileUpload(event) {
        isLoading = true;
        try {
            await dataService.handleSpecialProductFileUpload(event);
        } catch (error) {
            alert(error.message);
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-6">
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Sản Phẩm Đặc Quyền
        </h2>
        <button 
            class="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            on:click={() => dataService.handleTemplateDownload()}
        >
            Tải File Mẫu
        </button>
    </div>

    <div class="mb-8 p-6 bg-purple-50 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 transition-colors text-center">
        <input 
            type="file" 
            id="special-product-upload" 
            class="hidden" 
            accept=".xlsx, .xls"
            on:change={handleFileUpload}
        />
        <label for="special-product-upload" class="cursor-pointer flex flex-col items-center gap-3">
            <div class="p-3 bg-white rounded-full shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
            </div>
            <div>
                <span class="text-purple-600 font-medium hover:underline">Tải lên danh sách SP</span>
                <span class="text-slate-500"> (Mã SP, Tên SP, Chương trình)</span>
            </div>
        </label>
    </div>

    {#if products.length > 0}
        <div class="border rounded-lg overflow-hidden">
            <div class="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-700">Đã tải:</span>
                    <span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">{products.length} sản phẩm</span>
                </div>
                <button 
                    class="text-xs text-blue-600 hover:underline"
                    on:click={() => showList = !showList}
                >
                    {showList ? 'Thu gọn' : 'Xem danh sách'}
                </button>
            </div>

            {#if showList}
                <div class="overflow-x-auto max-h-96">
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-2">Mã SP</th>
                                <th class="px-4 py-2">Tên Sản Phẩm</th>
                                <th class="px-4 py-2">Nhóm / CT</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            {#each products as item}
                                <tr class="bg-white hover:bg-slate-50">
                                    <td class="px-4 py-2 font-mono text-xs">{item.masp}</td>
                                    <td class="px-4 py-2">{item.tensp}</td>
                                    <td class="px-4 py-2 text-slate-500 text-xs">{item.chuongtrinh || '-'}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    {/if}
</div>