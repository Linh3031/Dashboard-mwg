<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let label = '';
    export let type = 'PERCENT'; 
    export let metricBase = 'REAL'; 
    export let target = 0;
    
    export let activeContext = 'numerator'; 
    export let numeratorCount = 0;
    export let denominatorCount = 0;

    function setContext(ctx) {
        activeContext = ctx;
        dispatch('contextChange', ctx);
    }
</script>

<div class="flex flex-col gap-4">
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div class="bg-gray-800 px-4 py-2 text-white font-bold text-sm">1. Cấu hình cơ bản</div>
        <div class="p-4 space-y-4">
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Tên chỉ số <span class="text-red-500">*</span></label>
                <input type="text" bind:value={label} placeholder="VD: % Doanh thu Điện Máy..." class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-blue-900 bg-blue-50/50" />
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Dữ liệu lấy từ</label>
                    <select bind:value={metricBase} class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium">
                        <option value="REAL">Doanh thu Thực</option>
                        <option value="CONVERTED">Doanh thu Quy đổi</option>
                        <option value="SL">Số lượng</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">Mục tiêu {type === 'PERCENT' ? '(%)' : '(VNĐ)'}</label>
                    <input type="number" bind:value={target} class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-bold text-green-700" />
                </div>
            </div>
        </div>
    </div>

    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div class="bg-blue-600 px-4 py-2 text-white font-bold text-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            2. Xây dựng công thức
        </div>
        
        <div class="p-5 flex flex-col items-center">
            
            <button 
                on:click={() => setContext('numerator')}
                class="w-full p-4 rounded-xl border-2 transition-all text-center relative
                {activeContext === 'numerator' ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]' : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-300'}"
            >
                <div class="text-xs font-bold uppercase tracking-wider {activeContext === 'numerator' ? 'text-blue-700' : 'text-gray-500'}">Tử số (Nhóm cần theo dõi)</div>
                <div class="mt-1 text-lg font-bold {numeratorCount > 0 ? 'text-blue-900' : 'text-gray-400'}">
                    {numeratorCount > 0 ? `Đã chọn ${numeratorCount} mục` : 'Bấm để chọn bên phải 👉'}
                </div>
                {#if activeContext === 'numerator'}
                    <div class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rotate-45 rounded-sm"></div>
                {/if}
            </button>

            <div class="w-full flex items-center my-3 relative">
                <div class="flex-1 border-t-4 border-gray-300"></div>
                <div class="mx-4 w-10 h-10 rounded-full bg-gray-800 text-white font-bold text-xl flex items-center justify-center shadow-lg">÷</div>
                <div class="flex-1 border-t-4 border-gray-300"></div>
            </div>

            <button 
                on:click={() => setContext('denominator')}
                class="w-full p-4 rounded-xl border-2 transition-all text-center relative
                {activeContext === 'denominator' ? 'border-orange-500 bg-orange-50 shadow-md transform scale-[1.02]' : 'border-dashed border-gray-300 bg-gray-50 hover:border-orange-300'}"
            >
                <div class="text-xs font-bold uppercase tracking-wider {activeContext === 'denominator' ? 'text-orange-700' : 'text-gray-500'}">Mẫu số (Tổng để chia)</div>
                <div class="mt-1 text-lg font-bold {denominatorCount > 0 ? 'text-orange-900' : 'text-gray-400'}">
                    {denominatorCount > 0 ? `Đã chọn ${denominatorCount} mục` : 'Bấm để chọn bên phải 👉'}
                </div>
                {#if activeContext === 'denominator'}
                    <div class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-orange-500 rotate-45 rounded-sm"></div>
                {/if}
            </button>

        </div>
    </div>
</div>