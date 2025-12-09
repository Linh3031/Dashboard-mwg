<script>
    import { createEventDispatcher } from 'svelte';
    import { categoryStructure, macroCategoryConfig, macroProductGroupConfig } from '../../stores.js';
    import { cleanCategoryName } from '../../utils.js';

    export let isOpen = false;
    export let type = 'DONGIA'; // 'DONGIA' hoặc 'HIEUQUA'

    const dispatch = createEventDispatcher();

    // Form state
    let label = '';
    let selectedGroupA = []; // Tử số
    let selectedGroupB = []; // Mẫu số
    let search = '';
    let step = 1; // 1: Tên, 2: Tử số, 3: Mẫu số

    // Chuẩn bị dữ liệu danh sách chọn (Gộp Ngành hàng, Nhóm hàng, Macro)
    $: uniqueCategories = [...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nganhHang)).filter(Boolean))];
    $: uniqueGroups = [...new Set(($categoryStructure || []).map(c => cleanCategoryName(c.nhomHang)).filter(Boolean))];
    $: macroCats = ($macroCategoryConfig || []).map(m => m.name);
    $: macroProds = ($macroProductGroupConfig || []).map(m => m.name);

    $: allItems = [...new Set([...macroCats, ...macroProds, ...uniqueCategories, ...uniqueGroups])].sort();

    $: filteredItems = allItems.filter(i => i.toLowerCase().includes(search.toLowerCase()));

    // Reset khi mở modal
    $: if (isOpen && step === 1) {
        label = '';
        selectedGroupA = [];
        selectedGroupB = [];
        search = '';
    }

    function toggleItem(list, item) {
        if (list.includes(item)) return list.filter(i => i !== item);
        return [...list, item];
    }

    function handleNext() {
        if (step === 1) {
            if (!label.trim()) return alert("Vui lòng nhập tên chỉ số (ví dụ: ĐG Tivi Sony).");
            step = 2;
        } else if (step === 2) {
            if (selectedGroupA.length === 0) return alert("Vui lòng chọn ít nhất 1 nhóm cho Tử số.");
            step = 3;
            search = ''; // Reset search cho bước sau
        } else if (step === 3) {
            if (selectedGroupB.length === 0) return alert("Vui lòng chọn ít nhất 1 nhóm cho Mẫu số.");
            handleSubmit();
        }
    }

    function handleBack() {
        if (step > 1) step--;
    }

    function handleSubmit() {
        // Cấu hình metric mới
        const metric = {
            id: `custom_${Date.now()}`,
            label: label,
            groupA: selectedGroupA,
            groupB: selectedGroupB,
            type: type, 
            // Định nghĩa kiểu dữ liệu cho Tử/Mẫu
            // DONGIA: Tử = Doanh thu (DTTL), Mẫu = Số lượng (SL)
            // HIEUQUA: Tử = Doanh thu (DTTL), Mẫu = Doanh thu (DTTL) - thường là tỷ trọng
            typeA: 'DTTL', 
            typeB: type === 'DONGIA' ? 'SL' : 'DTTL'
        };
        dispatch('save', metric);
        dispatch('close');
        // Reset sau khi lưu
        setTimeout(() => { step = 1; label = ''; }, 300);
    }

    function close() {
        dispatch('close');
        setTimeout(() => { step = 1; }, 300);
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-900 bg-opacity-60 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm" on:click={close} role="button" tabindex="0">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden" on:click|stopPropagation>
            
            <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">
                        Thêm {type === 'DONGIA' ? 'Đơn giá' : 'Chỉ số Hiệu quả'} Mới
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5">Bước {step}/3</p>
                </div>
                <button on:click={close} class="text-gray-400 hover:text-red-500 transition-colors text-2xl leading-none">&times;</button>
            </div>

            <div class="p-5 overflow-y-auto flex-grow bg-white">
                {#if step === 1}
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Tên hiển thị</label>
                            <input 
                                type="text" 
                                bind:value={label} 
                                class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                                placeholder={type === 'DONGIA' ? "VD: ĐG Tivi Sony" : "VD: % Tivi Sony"}
                                autoFocus
                            >
                        </div>
                        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                            <p class="font-bold mb-1">Công thức tính:</p>
                            {#if type === 'DONGIA'}
                                <p class="font-mono text-xs bg-white p-2 rounded border border-blue-200 text-center">
                                    (Tổng Doanh Thu Nhóm A) / (Tổng Số Lượng Nhóm B)
                                </p>
                                <p class="mt-2 text-xs opacity-80">Dùng để tính đơn giá trung bình bán ra.</p>
                            {:else}
                                <p class="font-mono text-xs bg-white p-2 rounded border border-blue-200 text-center">
                                    (Tổng Doanh Thu Nhóm A) / (Tổng Doanh Thu Nhóm B)
                                </p>
                                <p class="mt-2 text-xs opacity-80">Dùng để tính tỷ trọng đóng góp doanh thu.</p>
                            {/if}
                        </div>
                    </div>

                {:else}
                    <div class="flex flex-col h-full">
                        <div class="mb-3">
                            <label class="block text-sm font-bold text-gray-700 mb-1">
                                {step === 2 ? 'Chọn Nhóm A (Tử số)' : 'Chọn Nhóm B (Mẫu số)'}
                            </label>
                            <p class="text-xs text-gray-500 mb-2">
                                {step === 2 ? 'Các nhóm hàng/ngành hàng để tính tổng Doanh thu.' : (type === 'DONGIA' ? 'Các nhóm hàng/ngành hàng để tính tổng Số lượng.' : 'Các nhóm hàng/ngành hàng để tính tổng Doanh thu (làm mốc so sánh).')}
                            </p>
                            <input 
                                type="text" 
                                bind:value={search} 
                                class="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" 
                                placeholder="Tìm kiếm nhóm hàng..."
                            >
                        </div>

                        <div class="flex-grow border rounded-lg overflow-y-auto p-2 bg-slate-50 custom-scrollbar max-h-60">
                            {#if filteredItems.length === 0}
                                <p class="text-center text-gray-400 text-xs py-4">Không tìm thấy kết quả.</p>
                            {:else}
                                {#each filteredItems as item}
                                    {@const list = step === 2 ? selectedGroupA : selectedGroupB}
                                    <label class="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200 mb-1">
                                        <input 
                                            type="checkbox" 
                                            checked={list.includes(item)} 
                                            on:change={() => step === 2 ? selectedGroupA = toggleItem(selectedGroupA, item) : selectedGroupB = toggleItem(selectedGroupB, item)} 
                                            class="mr-3 w-4 h-4 accent-blue-600 rounded border-gray-300"
                                        >
                                        <span class="text-sm text-gray-700 font-medium">{item}</span>
                                    </label>
                                {/each}
                            {/if}
                        </div>
                        
                        <div class="mt-2 text-right text-xs text-gray-500">
                            Đã chọn: <span class="font-bold text-blue-600">{(step === 2 ? selectedGroupA : selectedGroupB).length}</span> mục
                        </div>
                    </div>
                {/if}
            </div>

            <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                {#if step > 1}
                    <button on:click={handleBack} class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors">
                        Quay lại
                    </button>
                {/if}
                <button on:click={handleNext} class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md transition-colors">
                    {step === 3 ? 'Hoàn tất' : 'Tiếp tục'}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>