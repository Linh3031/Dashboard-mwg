<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
</script>

<div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
    <div class="flex items-center gap-2">
        <div class="p-2 bg-blue-100 rounded-lg text-blue-600"><i data-feather="dollar-sign" class="w-5 h-5"></i></div>
        <div>
            <h3 class="font-bold text-gray-800 text-lg uppercase">Chi tiết Doanh Thu Lũy Kế</h3>
            <p class="text-xs text-gray-500">Dữ liệu được cập nhật từ file YCX mới nhất</p>
        </div>
    </div>
    <div class="flex items-center gap-3">
        <span class="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full shadow-sm">Đơn vị: Triệu</span>
        
        <div class="flex items-center gap-2 ml-1 border-l border-gray-300 pl-4" title="Chuyển sang chế độ xem nhiều tháng">
            <span class="text-xs font-semibold text-gray-500 cursor-pointer" on:click={() => dispatch('toggleMode')}>Xem nhiều tháng</span>
            <button class="bg-gray-300 relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none" on:click={() => dispatch('toggleMode')}>
                <span class="translate-x-0 pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
            </button>
        </div>

        <div class="relative flex items-center border-l border-gray-300 pl-4 ml-1">
            <div class="absolute left-6 text-blue-600 pointer-events-none flex items-center justify-center">
                <i data-feather="camera" class="w-4 h-4"></i>
            </div>
            <select class="text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm py-1.5 pl-8 pr-6 focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    on:change={(e) => { dispatch('batchCapture', e.target.value); e.target.value = ''; }}>
                <option value="" disabled selected>Chụp Hàng Loạt</option>
                <option value="top5">Chụp Top 5 NV</option>
                <option value="bot5">Chụp Bot 5 NV</option>
                <option value="all">Chụp Tất Cả</option>
            </select>
        </div>
    </div>
</div>