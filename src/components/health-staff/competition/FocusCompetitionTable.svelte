<script>
    import { createEventDispatcher } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';
    import { datasyncService } from '../../../services/datasync.service.js';
    import { selectedWarehouse, localCompetitionConfigs } from '../../../stores.js';
  
    export let competitionResult;
    export let colorTheme = 'blue'; 
  
    const dispatch = createEventDispatcher();

    $: competition = competitionResult.competition;
    $: employeeData = competitionResult.employeeData || [];
    
    $: mainColumn = competition.mainColumn || { header: 'Tổng Nhóm', show: true, type: 'DT', showSL: false };
    $: subColumns = competition.subColumns || (competition.brands || []).map((b, i) => ({ id: `col_${i}`, header: b, brands: [b], type: 'DT', showSL: false }));
    
    // [QUY TẮC 2]: Định tuyến chuẩn xác loại dữ liệu của Cột Tổng làm hệ quy chiếu
    $: mainColType = mainColumn.type || (competition.type === 'soluong' ? 'SL' : (competition.type === 'dtqd' ? 'DTQD' : 'DT'));
    $: isDTQD = mainColType === 'DTQD' || competition.type === 'dtqd'; 

    $: allBrands = [...new Set(subColumns.flatMap(c => c.brands || competition.brands || []))];
    $: allGroups = competition.groups || mainColumn.items || [];
  
    const themeStyles = {
        blue:    { headerBg: 'bg-[#e0f2fe]', titleText: 'text-[#0369a1]', border: 'border-[#bae6fd]' },
        emerald: { headerBg: 'bg-[#dcfce7]', titleText: 'text-[#15803d]', border: 'border-[#bbf7d0]' },
        pink:    { headerBg: 'bg-[#fce7f3]', titleText: 'text-[#be185d]', border: 'border-[#fbcfe8]' },
        amber:   { headerBg: 'bg-[#fef3c7]', titleText: 'text-[#b45309]', border: 'border-[#fde68a]' },
        purple:  { headerBg: 'bg-[#f3e8ff]', titleText: 'text-[#7e22ce]', border: 'border-[#e9d5ff]' }
    };
    $: currentTheme = themeStyles[colorTheme] || themeStyles.blue;

    let localTarget = 0;
    let isSaving = false;
  
    $: if ($localCompetitionConfigs && competition) {
        const savedConfig = $localCompetitionConfigs.find(c => c.id === competition.id);
        if (savedConfig && !isSaving) localTarget = savedConfig.target || 0;
    }
  
    $: processedData = sortedData.map(item => {
        const targetDecimal = localTarget > 0 ? localTarget / 100 : 0;
        const hasTarget = localTarget > 0;
        const tyLeChinh = isDTQD ? (item.tyLeDTQD || 0) : (item.tyLeDT || 0);
  
        return {
            ...item,
            classSL: (hasTarget && item.tyLeSL < targetDecimal) ? 'text-red-600 font-black bg-red-50/60' : 'text-gray-700 font-bold',
            classDT: (hasTarget && tyLeChinh < targetDecimal) ? 'text-red-600 font-black bg-red-50/60' : 'text-blue-600 font-bold'
        };
    });
  
    let saveTimer;
    let saveStatus = '';
  
    function handleInput() {
        isSaving = true; saveStatus = 'saving';
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            try {
                if (!$selectedWarehouse) return;
                let currentConfigs = $localCompetitionConfigs ? [...$localCompetitionConfigs] : [];
                const idx = currentConfigs.findIndex(c => c.id === competition.id);
                if (idx >= 0) currentConfigs[idx] = { ...currentConfigs[idx], target: localTarget };
                else currentConfigs.push({ id: competition.id, target: localTarget });
                localCompetitionConfigs.set(currentConfigs);
                await datasyncService.saveCompetitionConfigs($selectedWarehouse, currentConfigs);
                saveStatus = 'success';
                setTimeout(() => { saveStatus = ''; isSaving = false; }, 2000);
            } catch (error) { console.error(error); saveStatus = 'error'; isSaving = false; }
        }, 800);
    }
  
    let sortKey = 'baseCategoryRevenue';
    let sortDirection = 'desc';
  
    function handleSort(key) {
        if (sortKey === key) sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        else { sortKey = key; sortDirection = 'desc'; }
    }
  
    $: sortedData = [...employeeData].sort((a, b) => {
        let valA = 0, valB = 0;
        if (sortKey === 'hoTen') {
            return sortDirection === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen);
        } else if (sortKey.startsWith('SUB||')) {
            const [, colId, metric] = sortKey.split('||');
            const colA = (a.dynamicColumns && a.dynamicColumns[colId]) || (a.performanceByBrand && a.performanceByBrand[colId]) || {};
            const colB = (b.dynamicColumns && b.dynamicColumns[colId]) || (b.performanceByBrand && b.performanceByBrand[colId]) || {};
            valA = metric === 'SL' ? (colA.sl || colA.quantity || 0) : (metric === 'DTQD' ? (colA.dtqd || colA.revenueQD || 0) : (colA.dt || colA.revenue || 0));
            valB = metric === 'SL' ? (colB.sl || colB.quantity || 0) : (metric === 'DTQD' ? (colB.dtqd || colB.revenueQD || 0) : (colB.dt || colB.revenue || 0));
        } else {
            valA = Number(a[sortKey]) || 0; valB = Number(b[sortKey]) || 0;
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  
    $: totals = employeeData.reduce((acc, item) => {
        acc.baseCategoryQuantity += (item.baseCategoryQuantity || 0);
        acc.baseCategoryRevenue += (item.baseCategoryRevenue || 0);
        acc.baseCategoryRevenueQD += (item.baseCategoryRevenueQD || 0);
        
        subColumns.forEach(col => {
            if (!col.id) return;
            if (!acc.dyn[col.id]) acc.dyn[col.id] = { dt: 0, sl: 0, dtqd: 0 };
            const colData = (item.dynamicColumns && item.dynamicColumns[col.id]) || (item.performanceByBrand && item.performanceByBrand[col.header]) || { dt: 0, sl: 0, dtqd: 0, revenue: 0, quantity: 0, revenueQD: 0 };
            acc.dyn[col.id].dt += (colData.dt || colData.revenue || 0);
            acc.dyn[col.id].sl += (colData.sl || colData.quantity || 0);
            acc.dyn[col.id].dtqd += (colData.dtqd || colData.revenueQD || 0);
        });
        return acc;
    }, { baseCategoryQuantity: 0, baseCategoryRevenue: 0, baseCategoryRevenueQD: 0, dyn: {} });
  
    const getSortIcon = (key) => {
        if (sortKey !== key) return '↑↓';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    // Tính tổng số cột để làm colspan khi hiển thị trạng thái bảng rỗng
    $: totalColspan = 1 + (mainColumn.show ? (mainColumn.showSL ? 2 : 1) : 0) + subColumns.reduce((sum, c) => sum + (c.showSL ? 2 : 1), 0) + 2;
</script>
  
<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col h-full group/table relative">
    <div class="p-3 {currentTheme.headerBg} border-b {currentTheme.border} flex justify-between items-center transition-colors">
        <div>
            <div class="flex items-center gap-2">
                <h3 class="text-base font-bold {currentTheme.titleText} uppercase tracking-tight">{competition.name}</h3>
                <!-- [QUY TẮC 2]: Huy hiệu động phản ánh chính xác cấu hình mainColType -->
                <span class="text-[10px] uppercase px-2 py-0.5 rounded-full font-bold bg-white/90 text-gray-800 shadow-sm border border-gray-300">
                    {mainColType === 'SL' ? 'Số lượng' : (mainColType === 'DTQD' ? 'DT Quy đổi' : 'Doanh thu')}
                </span>
            </div>
            <div class="text-[11px] text-gray-700 mt-1 font-medium space-y-0.5">
                <p>🏷️ <span class="text-gray-500">Hãng:</span> <span class="font-bold">{allBrands.join(', ') || 'Tất cả'}</span></p>
                <p>📦 <span class="text-gray-500">Nhóm:</span> <span class="font-bold">{allGroups.join(', ') || 'Toàn bộ'}</span></p>
            </div>
        </div>
        
        <div class="flex items-center gap-2">
            <div class="opacity-0 group-hover/table:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 p-1 rounded-lg shadow-sm border border-gray-200 mr-2">
                <button type="button" on:click={() => dispatch('edit', competition)} class="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Sửa bảng này"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                <button type="button" on:click={() => dispatch('delete', competition)} class="p-1 text-red-600 hover:bg-red-50 rounded" title="Xóa bảng này"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </div>

            <div class="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-gray-300 shadow-sm relative self-start">
                <span class="text-xs font-semibold text-gray-600">Target:</span>
                <input type="number" bind:value={localTarget} on:input={handleInput} on:focus={(e) => e.target.select()} class="w-10 text-center font-bold text-blue-700 border-b border-gray-300 focus:border-blue-500 outline-none text-sm p-0" placeholder="0" />
                <span class="text-xs font-bold text-gray-500">%</span>
                {#if saveStatus === 'saving'}<span class="absolute -bottom-4 right-0 text-[9px] text-orange-500 font-medium animate-pulse">Lưu...</span>
                {:else if saveStatus === 'success'}<span class="absolute -bottom-4 right-0 text-[9px] text-green-600 font-bold">Đã lưu</span>{/if}
            </div>
        </div>
    </div>

    <div class="overflow-x-auto flex-grow">
        <table class="min-w-full text-sm text-left border-collapse">
            <thead class="text-xs text-slate-700 bg-slate-100 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th rowspan="2" class="px-3 py-3 bg-gray-200 min-w-[150px] border-r border-gray-300 cursor-pointer select-none" on:click={() => handleSort('hoTen')}>
                        Nhân viên <span class="text-[10px] text-gray-500 font-normal">{getSortIcon('hoTen')}</span>
                    </th>

                    {#if mainColumn.show}
                        <th colspan={mainColumn.showSL ? 2 : 1} class="px-2 py-1 text-center border-l border-gray-300 bg-slate-200 text-slate-800 font-bold uppercase">
                            {mainColumn.header}
                        </th>
                    {/if}

                    {#each subColumns as col}
                        <th colspan={col.showSL ? 2 : 1} class="px-2 py-1 text-center border-l border-gray-300 font-bold" style="background-color: {col.color || '#e2e8f0'}22; color: {col.color || '#1e293b'}">
                            {col.header}
                        </th>
                    {/each}

                    <th colspan="2" class="px-2 py-1 text-center border-l border-gray-300 bg-orange-100 text-orange-900 font-bold uppercase">Tỷ lệ %</th>
                </tr>
                <tr>
                    {#if mainColumn.show}
                        {#if mainColumn.showSL}<th class="px-2 py-1 text-right border-l border-gray-200 text-[10px] cursor-pointer hover:bg-gray-200 select-none" on:click={() => handleSort('baseCategoryQuantity')}>SL <span class="text-[9px]">{getSortIcon('baseCategoryQuantity')}</span></th>{/if}
                        <th class="px-2 py-1 text-right border-l border-gray-200 text-[10px] cursor-pointer hover:bg-gray-200 select-none" on:click={() => handleSort(mainColType === 'SL' ? 'baseCategoryQuantity' : 'baseCategoryRevenue')}>{mainColType === 'SL' ? 'SL' : (isDTQD ? 'DTQĐ' : 'DT')} <span class="text-[9px]">{getSortIcon(mainColType === 'SL' ? 'baseCategoryQuantity' : 'baseCategoryRevenue')}</span></th>
                    {/if}

                    {#each subColumns as col}
                        {#if col.showSL}<th class="px-2 py-1 text-right border-l border-gray-200 text-[10px] cursor-pointer hover:bg-gray-200 select-none" on:click={() => handleSort(`SUB||${col.id}||SL`)}>SL <span class="text-[9px]">{getSortIcon(`SUB||${col.id}||SL`)}</span></th>{/if}
                        <th class="px-2 py-1 text-right border-l border-gray-200 text-[10px] cursor-pointer hover:bg-gray-200 select-none" on:click={() => handleSort(`SUB||${col.id}||${col.type}`)}>{col.type === 'SL' ? 'SL' : (col.type === 'DTQD' ? 'DTQĐ' : 'DT')} <span class="text-[9px]">{getSortIcon(`SUB||${col.id}||${col.type}`)}</span></th>
                    {/each}

                    <th class="px-2 py-1 text-right border-l border-gray-200 text-orange-800 text-[10px] cursor-pointer hover:bg-gray-200 select-none" on:click={() => handleSort('tyLeSL')}>% SL <span class="text-[9px]">{getSortIcon('tyLeSL')}</span></th>
                    <th class="px-2 py-1 text-right text-orange-800 text-[10px] cursor-pointer hover:bg-gray-200 select-none" on:click={() => handleSort('tyLeDT')}>{isDTQD ? '% DTQĐ' : '% DT'} <span class="text-[9px]">{getSortIcon('tyLeDT')}</span></th>
                </tr>
            </thead>
            
            <tbody class="divide-y divide-gray-100">
                <!-- [QUY TẮC 1]: Xử lý trạng thái trống, bảo đảm bảng luôn hiển thị rõ ràng -->
                {#if processedData.length === 0}
                    <tr>
                        <td colspan={totalColspan} class="p-8 text-center text-gray-400 bg-gray-50/50 italic font-medium">
                            Chưa có phát sinh doanh số cho tiêu chí thi đua này trong kỳ báo cáo hiện tại.
                        </td>
                    </tr>
                {:else}
                    {#each processedData as item}
                        <tr class="hover:bg-blue-50/40 transition-colors">
                            <td class="px-3 py-2 font-semibold text-blue-600 whitespace-nowrap sticky left-0 bg-white hover:bg-blue-50/80 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                {formatters.getShortEmployeeName(item.hoTen, item.maNV)}
                            </td>
                            
                            {#if mainColumn.show}
                                {#if mainColumn.showSL}<td class="px-2 py-2 text-right border-l border-gray-200 font-medium text-gray-700 bg-gray-50/60">{formatters.formatNumberOrDash(item.baseCategoryQuantity)}</td>{/if}
                                <td class="px-2 py-2 text-right font-bold text-blue-700 bg-gray-50/60 border-l border-gray-100">
                                    {#if mainColType === 'SL'}{formatters.formatNumberOrDash(item.baseCategoryQuantity)}
                                    {:else}{formatters.formatRevenue(isDTQD ? item.baseCategoryRevenueQD : item.baseCategoryRevenue)}{/if}
                                </td>
                            {/if}

                            {#each subColumns as col}
                                {@const colData = (item.dynamicColumns && item.dynamicColumns[col.id]) || (item.performanceByBrand && item.performanceByBrand[col.header]) || { dt: 0, sl: 0, dtqd: 0, revenue: 0, quantity: 0, revenueQD: 0 }}
                                {#if col.showSL}<td class="px-2 py-2 text-right border-l border-gray-100 text-gray-600 font-medium">{formatters.formatNumberOrDash(colData.sl || colData.quantity)}</td>{/if}
                                <td class="px-2 py-2 text-right font-bold text-gray-800 border-l border-gray-100">
                                    {#if col.type === 'SL'}{formatters.formatNumberOrDash(colData.sl || colData.quantity)}
                                    {:else if col.type === 'DTQD'}{formatters.formatRevenue(colData.dtqd || colData.revenueQD)}
                                    {:else}{formatters.formatRevenue(colData.dt || colData.revenue)}{/if}
                                </td>
                            {/each}

                            <td class="px-2 py-2 text-right border-l border-gray-200 {item.classSL}">{formatters.formatPercentage(item.tyLeSL)}</td>
                            <td class="px-2 py-2 text-right {item.classDT}">{formatters.formatPercentage(isDTQD ? item.tyLeDTQD : item.tyLeDT)}</td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
            
            <tfoot class="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300 text-xs">
                <tr>
                    <td class="px-3 py-2 sticky left-0 bg-gray-100 border-r border-gray-300">Tổng Cộng</td>
                    {#if mainColumn.show}
                        {#if mainColumn.showSL}<td class="px-2 py-2 text-right border-l border-gray-200 text-gray-700">{formatters.formatNumberOrDash(totals.baseCategoryQuantity)}</td>{/if}
                        <td class="px-2 py-2 text-right border-l border-gray-200 text-blue-800">
                            {#if mainColType === 'SL'}{formatters.formatNumberOrDash(totals.baseCategoryQuantity)}
                            {:else}{formatters.formatRevenue(isDTQD ? totals.baseCategoryRevenueQD : totals.baseCategoryRevenue)}{/if}
                        </td>
                    {/if}
                    {#each subColumns as col}
                        {@const totCol = totals.dyn[col.id] || { dt: 0, sl: 0, dtqd: 0 }}
                        {#if col.showSL}<td class="px-2 py-2 text-right border-l border-gray-200 text-gray-700">{formatters.formatNumberOrDash(totCol.sl)}</td>{/if}
                        <td class="px-2 py-2 text-right border-l border-gray-200 text-blue-800">
                            {#if col.type === 'SL'}{formatters.formatNumberOrDash(totCol.sl)}
                            {:else if col.type === 'DTQD'}{formatters.formatRevenue(totCol.dtqd)}
                            {:else}{formatters.formatRevenue(totCol.dt)}{/if}
                        </td>
                    {/each}
                    <td class="px-2 py-2 text-right border-l border-gray-200">-</td>
                    <td class="px-2 py-2 text-right text-blue-700 font-black">-</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>