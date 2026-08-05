<script>
    import { categoryStructure, brandList, virtualProductList } from '../../../stores.js';
    import { dataService } from '../../../services/dataService.js';
    import { adminService } from '../../../services/admin.service.js';
    import { fileHandler } from '../../../services/data/fileHandler.js';
    import { categoryService } from '../../../services/declarations/category.service.js';

    let isLoading = false;
    let isSaving = false;
    let isSavingVirtual = false;

    // --- LOGIC PHẪU THUẬT: QUẢN LÝ DỮ LIỆU CỤC BỘ ---
    let localData = [];
    let lastStructureRef = null;
    let searchQuery = '';

    // Khởi tạo/Đồng bộ dữ liệu khi file Excel vừa tải lên (hoặc lấy từ Store)
    $: if ($categoryStructure && $categoryStructure !== lastStructureRef) {
        lastStructureRef = $categoryStructure;
        localData = $categoryStructure.map(item => ({
            id: Math.random().toString(36).substr(2, 9),
            nganhHang: item.nganhHang || '',
            nhomHang: item.nhomHang || '',
            nhaSanXuat: item.nhaSanXuat || '',
            isEditing: false
        }));
    }

    // Tính toán Auto-Suggest & Thống kê theo Dữ liệu hiển thị (Real-time update)
    $: suggestCategories = [...new Set(localData.map(d => d.nganhHang).filter(Boolean))].sort();
    $: suggestGroups = [...new Set(localData.map(d => d.nhomHang).filter(Boolean))].sort();
    $: suggestBrands = [...new Set(localData.map(d => d.nhaSanXuat).filter(Boolean))].sort();
    
    $: hasData = localData.length > 0;

    // Bộ lọc hiển thị trên bảng
    $: filteredData = localData.filter(d => 
        (d.nganhHang && d.nganhHang.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.nhomHang && d.nhomHang.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.nhaSanXuat && d.nhaSanXuat.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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

    // --- CÁC HÀM THAO TÁC TRÊN BẢNG ---
    function addNewRow() {
        localData = [{
            id: Math.random().toString(36).substr(2, 9),
            nganhHang: '',
            nhomHang: '',
            nhaSanXuat: '',
            isEditing: true
        }, ...localData];
        searchQuery = ''; // Reset search để đảm bảo dòng mới hiện ở top
    }

    function deleteRow(id) {
        if(confirm('Bạn có chắc muốn xóa dòng này khỏi danh sách?')) {
            localData = localData.filter(d => d.id !== id);
        }
    }

    function toggleEdit(id, forceSave = false) {
        localData = localData.map(d => {
            if (d.id === id) {
                // Rời khỏi edit mode khi bấm Lưu
                return { ...d, isEditing: forceSave ? false : !d.isEditing };
            }
            return d;
        });
    }

    async function saveToCloud() {
        if (!hasData) return;
        isSaving = true;
        try {
            // Clean dữ liệu trắng thừa & chuẩn bị payload
            const cleanData = localData.map(d => ({
                nganhHang: (d.nganhHang || '').trim(),
                nhomHang: (d.nhomHang || '').trim(),
                nhaSanXuat: (d.nhaSanXuat || '').trim()
            }));
            const newBrandList = [...new Set(cleanData.map(d => d.nhaSanXuat).filter(Boolean))].sort();

            // Ghi đè vào Store trước để UI phản hồi ngay lập tức
            categoryStructure.set(cleanData);
            brandList.set(newBrandList);

            await adminService.saveCategoryDataToFirestore({
                categories: cleanData,
                brands: newBrandList
            });
            
            alert("Lưu Cấu trúc lên Cloud thành công!");
            
            lastStructureRef = cleanData; // Chống re-render thừa
            localData = localData.map(d => ({ ...d, isEditing: false })); // Đóng tất cả mode edit
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu: " + e.message);
        } finally {
            isSaving = false;
        }
    }

    async function handleVirtualUpload(e) {
        isLoading = true; 
        try { 
            await fileHandler.handleVirtualProductFileUpload(e); 
            alert('Tải file Sản phẩm đặc thù thành công!'); 
        } catch(err) { 
            alert(err.message); 
        } finally { 
            isLoading = false; 
        }
    }
    
    async function saveVirtualToCloud() {
        if (!$virtualProductList || $virtualProductList.length === 0) return;
        isSavingVirtual = true;
        try {
            await categoryService.saveVirtualProductList($virtualProductList);
            alert("Lưu sản phẩm đặc thù thành công!");
        } catch(e) {
            alert("Lỗi khi lưu SP đặc thù: " + e.message);
        } finally {
            isSavingVirtual = false;
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
            type="file" id="category-upload-input" class="hidden" accept=".xlsx, .xls"
            on:change={handleCategoryUpload} disabled={isLoading}
        />
        <label for="category-upload-input" class="cursor-pointer flex flex-col items-center gap-3">
            <div class="p-3 bg-white rounded-full shadow-sm">
                {#if isLoading}
                    <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                {/if}
            </div>
            <div>
                <span class="text-blue-600 font-medium hover:underline">Tải lên file Excel</span>
                <span class="text-slate-500"> cấu trúc ngành hàng</span>
            </div>
        </label>
    </div>

    {#if hasData}
        <!-- Datalist để tái sử dụng làm auto-suggest -->
        <datalist id="cat-list">
            {#each suggestCategories as cat} <option value={cat}></option> {/each}
        </datalist>
        <datalist id="group-list">
            {#each suggestGroups as grp} <option value={grp}></option> {/each}
        </datalist>
        <datalist id="brand-list">
            {#each suggestBrands as br} <option value={br}></option> {/each}
        </datalist>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                <span class="text-sm text-blue-700 font-medium">Tổng Ngành Hàng</span>
                <span class="text-xl font-bold text-blue-700">{suggestCategories.length}</span>
            </div>
            <div class="p-3 bg-green-50 rounded-lg border border-green-100 flex justify-between items-center">
                <span class="text-sm text-green-700 font-medium">Tổng Nhóm Hàng</span>
                <span class="text-xl font-bold text-green-700">{suggestGroups.length}</span>
            </div>
            <div class="p-3 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
                <span class="text-sm text-purple-700 font-medium">Tổng Hãng</span>
                <span class="text-xl font-bold text-purple-700">{suggestBrands.length}</span>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div class="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center">
                <div class="relative w-full md:w-64">
                    <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input type="text" bind:value={searchQuery} placeholder="Tìm ngành, nhóm, hãng..." class="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <button on:click={addNewRow} class="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Thêm Dòng Mới
                </button>
            </div>
            
            <div class="max-h-[400px] overflow-y-auto custom-scrollbar">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-100 text-slate-600 font-bold sticky top-0 shadow-sm z-10 text-xs uppercase">
                        <tr>
                            <th class="px-4 py-3">Ngành Hàng</th>
                            <th class="px-4 py-3">Nhóm Hàng</th>
                            <th class="px-4 py-3">Hãng (NSX)</th>
                            <th class="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        {#each filteredData as row (row.id)}
                            <tr class="hover:bg-blue-50/50 transition-colors group {row.isEditing ? 'bg-amber-50/30' : ''}">
                                <td class="px-4 py-2">
                                    {#if row.isEditing}
                                        <input list="cat-list" type="text" bind:value={row.nganhHang} class="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-blue-500 bg-white" placeholder="Ngành hàng..." />
                                    {:else}
                                        <span class="font-medium text-slate-700">{row.nganhHang}</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-2">
                                    {#if row.isEditing}
                                        <input list="group-list" type="text" bind:value={row.nhomHang} class="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-blue-500 bg-white" placeholder="Nhóm hàng..." />
                                    {:else}
                                        <span class="text-slate-600">{row.nhomHang}</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-2">
                                    {#if row.isEditing}
                                        <input list="brand-list" type="text" bind:value={row.nhaSanXuat} class="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-blue-500 bg-white" placeholder="Hãng sản xuất..." />
                                    {:else}
                                        <span class="text-slate-600 px-2 py-0.5 bg-slate-100 rounded text-xs border border-slate-200">{row.nhaSanXuat}</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-2 text-right">
                                    <div class="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        {#if row.isEditing}
                                            <button on:click={() => toggleEdit(row.id, true)} class="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded font-medium text-xs border border-green-200">
                                                Lưu
                                            </button>
                                        {:else}
                                            <button on:click={() => toggleEdit(row.id)} class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Sửa">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                            <button on:click={() => deleteRow(row.id)} class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        {/if}
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
                {#if filteredData.length === 0}
                    <div class="text-center py-8 text-slate-400 italic">Không tìm thấy dữ liệu khớp với từ khóa.</div>
                {/if}
            </div>
            <div class="p-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-right italic">
                * Nhấn "Lưu Lên Cloud" sau khi điều chỉnh xong để ghi nhận cấu trúc.
            </div>
        </div>
    {/if}

    <div class="mt-8 border-t border-slate-200 pt-8">
        <div class="flex justify-between items-center mb-4">
            <div>
                <h3 class="font-bold text-slate-700 text-lg flex items-center gap-2">
                    <span class="text-orange-500"><i data-feather="star"></i></span>
                    Khai báo Sản Phẩm Đặc Thù
                </h3>
                <p class="text-xs text-slate-500 mt-1">Tải lên file Excel để định nghĩa các sản phẩm lẻ (VD: Gói bảo dưỡng). Yêu cầu: Mã SP, Tên SP, Nhóm Hàng.</p>
            </div>
            <button 
                class="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 rounded hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                on:click={saveVirtualToCloud}
                disabled={!$virtualProductList?.length || isSavingVirtual}
            >
                {isSavingVirtual ? 'Đang lưu...' : 'Lưu Lên Cloud'}
            </button>
        </div>

        <div class="p-6 bg-orange-50 rounded-xl border-2 border-dashed border-orange-200 hover:border-orange-400 transition-colors text-center">
            <input 
                type="file" id="virtual-upload-input" class="hidden" accept=".xlsx, .xls"
                on:change={handleVirtualUpload}
                disabled={isLoading}
            />
            <label for="virtual-upload-input" class="cursor-pointer flex flex-col items-center gap-3">
                <div class="p-3 bg-white rounded-full shadow-sm text-orange-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
                <div>
                    <span class="text-orange-600 font-bold hover:underline">Nhấn để tải file Excel Sản Phẩm</span>
                    <span class="text-slate-500 block text-xs mt-1">Đã nạp: {$virtualProductList?.length || 0} sản phẩm</span>
                </div>
            </label>
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>