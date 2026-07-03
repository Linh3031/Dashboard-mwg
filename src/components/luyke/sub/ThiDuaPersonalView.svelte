<script>
    import { afterUpdate, onDestroy, onMount } from 'svelte';
    import PersonalTargetCard from './PersonalTargetCard.svelte';
    import { selectedWarehouse } from '../../../stores.js';
    import { datasyncService } from '../../../services/datasync.service.js';
    
    export let sortedData = [];
    export let totalEmployees = 1;

    let globalRatio = 100;
    let categoryRatios = {};
    let saveTimeout;
    let lastLoadedWarehouse = null;

    $: sortedAndGroupedData = [...sortedData].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'doanhThu' ? -1 : 1;
        const targetA = parseFloat(a.target) || 0;
        const targetB = parseFloat(b.target) || 0;
        return targetB - targetA;
    });

    // Bắt sóng khi Đóng Modal để cập nhật UI ngay lập tức
    onMount(() => {
        const syncListener = (e) => { 
            const { category, ratio } = e.detail;
            categoryRatios[category] = ratio;
            categoryRatios = { ...categoryRatios }; // Kích hoạt Reactivity của Svelte
            
            const cacheKey = `allTargetRatios_${$selectedWarehouse}`;
            sessionStorage.setItem(cacheKey, JSON.stringify({ global: globalRatio, categories: categoryRatios }));
        };
        window.addEventListener('sync-category-ratio', syncListener);
        return () => window.removeEventListener('sync-category-ratio', syncListener);
    });

    // Chỉ tải từ Cloud 1 lần duy nhất khi đổi kho
    $: if ($selectedWarehouse && $selectedWarehouse !== lastLoadedWarehouse) {
        loadRatios();
    }

    async function loadRatios() {
        if (!$selectedWarehouse) return;
        const cacheKey = `allTargetRatios_${$selectedWarehouse}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                globalRatio = parsed.global || 100;
                categoryRatios = parsed.categories || {};
            } catch(e) {}
        }
        
        lastLoadedWarehouse = $selectedWarehouse; 
        const ratios = await datasyncService.loadAllTargetRatios($selectedWarehouse);
        globalRatio = ratios.global;
        categoryRatios = ratios.categories;
        sessionStorage.setItem(cacheKey, JSON.stringify(ratios));
    }

    // Kéo thanh tổng thì lưu vào Global
    function handleSliderChange() {
        clearTimeout(saveTimeout);
        const cacheKey = `allTargetRatios_${$selectedWarehouse}`;
        sessionStorage.setItem(cacheKey, JSON.stringify({ global: globalRatio, categories: categoryRatios }));
        
        saveTimeout = setTimeout(async () => {
            if ($selectedWarehouse) {
                await datasyncService.savePersonalTargetRatio($selectedWarehouse, globalRatio);
            }
        }, 500);
    }

    onDestroy(() => {
        clearTimeout(saveTimeout);
    });

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
    const today = new Date();
    const currentMonthStr = `${today.getMonth() + 1}/${today.getFullYear()}`;
</script>

<div class="mb-5 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row flex-nowrap justify-between items-center shadow-sm gap-4">
    <div class="flex items-center gap-3 min-w-0 flex-grow capture-target-header-left">
        <div class="bg-indigo-600 w-8 h-8 rounded-lg text-white shadow-md flex items-center justify-center shrink-0 capture-target-icon-box">
            <i data-feather="target" class="w-4 h-4"></i>
        </div>
        <div class="capture-target-text-group">
            <div class="text-sm sm:text-base font-black text-indigo-900 uppercase capture-target-title truncate">
                Target thi đua NV Tháng {currentMonthStr} <span class="text-indigo-300 mx-1">|</span> <span class="text-orange-600">{sortedData.length} Chương trình</span>
            </div>
            <p class="text-[11px] sm:text-xs text-indigo-600/80 mt-0.5 font-medium truncate capture-target-sub">Chia đều cho tổng nhân sự.</p>
        </div>
    </div>
    
    <div class="text-center bg-white px-4 py-2 rounded-lg border border-indigo-200 shadow-sm flex flex-col items-center shrink-0 min-w-[100px]">
        <span class="text-[9px] uppercase font-bold text-gray-400">Tổng nhân sự</span>
        <span class="text-2xl font-black text-indigo-700 leading-none">{totalEmployees} <span class="text-xs font-bold text-gray-500">NV</span></span>
    </div>

    <div class="flex flex-col items-end justify-center px-4 py-2 rounded-lg bg-white border border-indigo-200 shadow-sm shrink-0 capture-hide">
        <div class="flex items-center gap-2 text-indigo-800 mb-1">
            <i data-feather="crosshair" class="w-3.5 h-3.5"></i>
            <span class="text-[10px] font-black uppercase tracking-wider">Mục tiêu chung (%)</span>
        </div>
        <div class="flex items-center gap-2 w-full max-w-[200px]">
            <input 
                type="range" 
                min="50" max="500" step="5"
                bind:value={globalRatio}
                on:input={handleSliderChange}
                class="flex-grow h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            >
            <div class="relative flex-shrink-0">
                <input 
                    type="number" 
                    bind:value={globalRatio}
                    on:input={handleSliderChange}
                    class="w-12 py-0.5 px-1 text-center font-bold text-indigo-700 bg-white border border-indigo-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm"
                >
                <span class="absolute right-0.5 top-0.5 text-[9px] text-gray-400 font-bold">%</span>
            </div>
        </div>
    </div>
</div>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 personal-target-grid">
    {#each sortedAndGroupedData as item}
        <!-- [PHẪU THUẬT LOGIC]: Bơm ưu tiên Tỷ lệ của riêng Ngành hàng (nếu có), không có thì lấy Global -->
        <PersonalTargetCard {item} empCount={totalEmployees} targetRatio={categoryRatios[item.name] || globalRatio} />
    {/each}
</div>

<style>
    :global(.capture-container .capture-hide) { display: none !important; }
</style>