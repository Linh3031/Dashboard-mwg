<script>
    import { onMount, afterUpdate } from 'svelte';
    import { adminService } from '../../services/admin.service.js';
    
    // Import các component con
    import CategoryUploader from './category/CategoryUploader.svelte';
    import NameMappingEditor from './category/NameMappingEditor.svelte';
    import MacroGroupEditor from './category/MacroGroupEditor.svelte';
    import MacroProductGroupEditor from './category/MacroProductGroupEditor.svelte';

    // [MỚI] Prop điều khiển chế độ hiển thị: 'full' | 'upload' | 'config'
    export let viewMode = 'full';

    onMount(() => {
        // Tải dữ liệu cần thiết khi vào component
        adminService.loadCategoryDataFromFirestore();
    });

    afterUpdate(() => {
        if (typeof feather !== 'undefined') feather.replace();
    });
</script>

<div class="space-y-6">
    {#if viewMode === 'full' || viewMode === 'upload'}
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <details class="group declaration-group">
                <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <i data-feather="upload-cloud"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-700 text-lg">Nạp dữ liệu Cấu trúc</h3>
                            <p class="text-xs text-slate-500">Tải lên file Excel cấu trúc (Ngành hàng, Nhóm hàng, Hãng)</p>
                        </div>
                    </div>
                    <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                        <i data-feather="chevron-down"></i>
                    </span>
                </summary>
                <div class="declaration-content bg-white border-t border-slate-100 p-6">
                    <CategoryUploader />
                </div>
            </details>
        </div>
    {/if}

    {#if viewMode === 'full' || viewMode === 'config'}
        
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <details class="group declaration-group">
                <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <i data-feather="layers"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-700 text-lg">Khai báo Nhóm Ngành Hàng Lớn</h3>
                            <p class="text-xs text-slate-500">Tạo nhóm gộp (VD: ICT, CE) từ các nhóm hàng con</p>
                        </div>
                    </div>
                    <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                        <i data-feather="chevron-down"></i>
                    </span>
                </summary>
                <div class="declaration-content bg-white border-t border-slate-100 p-6">
                    <MacroGroupEditor />
                </div>
            </details>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <details class="group declaration-group">
                <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-teal-50 rounded-lg text-teal-600">
                            <i data-feather="package"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-700 text-lg">Khai báo Nhóm Hàng Lớn</h3>
                            <p class="text-xs text-slate-500">Tạo nhóm gộp (VD: Gia dụng lớn) từ các nhóm hàng nhỏ</p>
                        </div>
                    </div>
                    <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                        <i data-feather="chevron-down"></i>
                    </span>
                </summary>
                <div class="declaration-content bg-white border-t border-slate-100 p-6">
                    <MacroProductGroupEditor />
                </div>
            </details>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <details class="group declaration-group">
                <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-green-50 rounded-lg text-green-600">
                            <i data-feather="tag"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-700 text-lg">Khai báo Tên Ngành Hàng</h3>
                            <p class="text-xs text-slate-500">Chỉnh sửa tên hiển thị cho Ngành Hàng</p>
                        </div>
                    </div>
                    <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                        <i data-feather="chevron-down"></i>
                    </span>
                </summary>
                <div class="declaration-content bg-white border-t border-slate-100 p-6">
                    <NameMappingEditor type="category" />
                </div>
            </details>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <details class="group declaration-group">
                <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <i data-feather="package"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-700 text-lg">Khai báo Tên Nhóm Hàng</h3>
                            <p class="text-xs text-slate-500">Chỉnh sửa tên hiển thị cho Nhóm Hàng</p>
                        </div>
                    </div>
                    <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                        <i data-feather="chevron-down"></i>
                    </span>
                </summary>
                <div class="declaration-content bg-white border-t border-slate-100 p-6">
                    <NameMappingEditor type="group" />
                </div>
            </details>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <details class="group declaration-group">
                <summary class="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors list-none select-none">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-red-50 rounded-lg text-red-600">
                            <i data-feather="briefcase"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-700 text-lg">Khai báo Tên Hãng</h3>
                            <p class="text-xs text-slate-500">Chỉnh sửa tên hiển thị cho Nhà sản xuất</p>
                        </div>
                    </div>
                    <span class="transform transition-transform duration-200 group-open:rotate-180 text-slate-400">
                        <i data-feather="chevron-down"></i>
                    </span>
                </summary>
                <div class="declaration-content bg-white border-t border-slate-100 p-6">
                    <NameMappingEditor type="brand" />
                </div>
            </details>
        </div>
    {/if}
</div>