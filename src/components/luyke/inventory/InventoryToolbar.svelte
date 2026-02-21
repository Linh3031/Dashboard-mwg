<script>
    import { createEventDispatcher } from 'svelte';
    export let isVelocityMode = false;

    const dispatch = createEventDispatcher();
    let fileInput;
    let alertDays = 3; // Mặc định 3 ngày
    let fileName = '';

    const PRESET_ALERT_DAYS = [3, 5, 7, 10, 15, 30];

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            fileName = file.name;
            dispatch('upload', file);
        }
    }

    function triggerUpload() {
        fileInput.click();
    }

    function handleDaysChange() {
        dispatch('settingsChange', { alertDays });
    }
</script>

{#if isVelocityMode}
    <div class="flex items-center gap-3 border-l border-gray-300 ml-3 pl-3 animate-fade-in">
        <input 
            type="file" 
            accept=".xlsx, .xls" 
            class="hidden" 
            bind:this={fileInput} 
            on:change={handleFileSelect}
        />

        <a 
            href="https://report.mwgroup.vn/home/dashboard/6" 
            target="_blank"
            class="flex items-center gap-1 text-xs text-blue-600 hover:underline hover:text-blue-800"
            title="Tải file mẫu tồn kho chi tiết"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Mẫu
        </a>

        <button 
            on:click={triggerUpload}
            class="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors text-xs font-bold"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {fileName ? 'Đã tải file' : 'Up Tồn kho'}
        </button>

        <div class="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1">
            <span class="text-[10px] font-bold text-gray-500 uppercase">Cảnh báo:</span>
            <select 
                bind:value={alertDays} 
                on:change={handleDaysChange}
                class="text-xs font-bold text-red-600 outline-none bg-transparent cursor-pointer"
            >
                {#each PRESET_ALERT_DAYS as d}
                    <option value={d}>{d} ngày</option>
                {/each}
            </select>
        </div>
    </div>
{/if}

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>