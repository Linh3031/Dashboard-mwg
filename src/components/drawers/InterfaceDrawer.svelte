<script>
    import { drawerState, interfaceSettings } from '../../stores.js';
    // [FIX] Cập nhật đường dẫn settings service
    import { settingsService } from '../../services/settings.service.js';
    import { onMount } from 'svelte';

    // ... (Giữ nguyên phần code còn lại)
    $: isOpen = $drawerState.activeDrawer === 'interface-drawer';

    function close() {
        drawerState.update(s => ({ ...s, activeDrawer: null }));
    }

    function onContrastChange(event) {
        const level = event.target.value;
        settingsService.updateContrast(level);
    }

    function onSettingChange() {
        settingsService.updateInterface($interfaceSettings);
    }
    
    onMount(() => {
        settingsService.loadInterfaceSettings();
    });
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 bg-black/40 z-40 transition-opacity"
        on:click={close}
        role="button"
        tabindex="0"
    ></div>
{/if}

<div 
    class="fixed top-0 left-0 h-full bg-white shadow-2xl z-50 p-6 overflow-y-auto w-[400px] max-w-[90vw] transition-transform duration-300 ease-in-out transform {isOpen ? 'translate-x-0' : '-translate-x-full'}"
>
    <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-gray-800">Cài đặt giao diện</h3>
        <button 
            class="text-gray-500 hover:text-gray-800 text-3xl leading-none"
            on:click={close}
        >&times;</button>
    </div>
    <div class="space-y-6">
        <div>
            <label for="contrast-selector" class="block text-sm font-medium text-gray-700 mb-2">Độ tương phản</label>
            <select 
                id="contrast-selector" 
                class="w-full p-2 border rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={$interfaceSettings.contrastLevel || '3'}
                on:change={onContrastChange}
            >
                <option value="1">Rất nhẹ</option>
                <option value="2">Nhẹ</option>
                <option value="3">Bình thường</option>
                <option value="4">Cao</option>
                <option value="5">Rất cao</option>
                <option value="6">Cao nhất</option>
            </select>
        </div>

        <div>
            <label for="global-font-size-slider" class="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Cỡ chữ toàn trang</span>
                <span class="font-bold text-blue-600">{$interfaceSettings.globalFontSize}px</span>
            </label>
            <input 
                type="range" 
                id="global-font-size-slider" 
                min="12" max="25" step="1" 
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                bind:value={$interfaceSettings.globalFontSize}
                on:input={onSettingChange}
            >
        </div>

        <div>
             <label for="kpi-font-size-slider" class="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Cỡ chữ thẻ KPI</span>
                <span class="font-bold text-blue-600">{$interfaceSettings.kpiFontSize}px</span>
            </label>
            <input 
                type="range" 
                id="kpi-font-size-slider" 
                min="24" max="48" step="2" 
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                bind:value={$interfaceSettings.kpiFontSize}
                on:input={onSettingChange}
            >
        </div>

        <div>
            <h4 class="text-sm font-medium text-gray-700 mb-2">Màu sắc thẻ KPI</h4>
            <div class="grid grid-cols-2 gap-4">
                {#each [1, 2, 3, 4, 5, 6, 7, 8] as num}
                    <div class="flex items-center gap-2">
                        <input 
                            type="color" 
                            id="kpi-color-{num}" 
                            class="p-1 h-10 w-14 block bg-white border border-gray-300 cursor-pointer rounded-lg"
                            bind:value={$interfaceSettings[`kpiCard${num}Bg`]}
                            on:input={onSettingChange}
                        >
                        <label for="kpi-color-{num}" class="text-sm">Thẻ {num}</label>
                    </div>
                {/each}
            </div>
        </div>

        <div>
            <h4 class="text-sm font-medium text-gray-700 mb-2">Màu chữ thẻ KPI</h4>
             <div class="space-y-2">
                 <div class="flex items-center gap-2">
                    <input 
                        type="color" 
                        id="kpi-title-color" 
                        class="p-1 h-10 w-14 block bg-white border border-gray-300 cursor-pointer rounded-lg"
                        bind:value={$interfaceSettings.kpiTitleColor}
                        on:input={onSettingChange}
                    >
                    <label for="kpi-title-color" class="text-sm">Tiêu đề thẻ</label>
                </div>
                <div class="flex items-center gap-2">
                    <input 
                        type="color" 
                        id="kpi-main-color" 
                        class="p-1 h-10 w-14 block bg-white border border-gray-300 cursor-pointer rounded-lg"
                        bind:value={$interfaceSettings.kpiMainColor}
                        on:input={onSettingChange}
                    >
                    <label for="kpi-main-color" class="text-sm">Giá trị chính</label>
                </div>
                <div class="flex items-center gap-2">
                    <input 
                        type="color" 
                        id="kpi-sub-color" 
                        class="p-1 h-10 w-14 block bg-white border border-gray-300 cursor-pointer rounded-lg"
                        bind:value={$interfaceSettings.kpiSubColor}
                        on:input={onSettingChange}
                    >
                    <label for="kpi-sub-color" class="text-sm">Giá trị phụ</label>
                </div>
            </div>
        </div>
    </div>
</div>