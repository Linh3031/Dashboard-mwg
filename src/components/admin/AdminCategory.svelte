<script>
    import { onMount } from 'svelte';
    import { adminService } from '../../services/admin.service.js';
    
    // Import các component con
    import CategoryUploader from './category/CategoryUploader.svelte';
    import NameMappingEditor from './category/NameMappingEditor.svelte';
    import MacroGroupEditor from './category/MacroGroupEditor.svelte';

    onMount(() => {
        // Tải dữ liệu cần thiết khi vào component
        adminService.loadCategoryDataFromFirestore();
    });
</script>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
    <details class="group declaration-group" open>
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
        <div class="declaration-content bg-white border-t border-slate-100">
            <CategoryUploader />
        </div>
    </details>

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
        <div class="declaration-content bg-white border-t border-slate-100">
            <MacroGroupEditor />
        </div>
    </details>

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
        <div class="declaration-content bg-white border-t border-slate-100">
            <NameMappingEditor type="category" />
        </div>
    </details>

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
        <div class="declaration-content bg-white border-t border-slate-100">
            <NameMappingEditor type="group" />
        </div>
    </details>

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
        <div class="declaration-content bg-white border-t border-slate-100">
            <NameMappingEditor type="brand" />
        </div>
    </details>
</div>