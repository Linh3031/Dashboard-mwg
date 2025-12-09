<script>
  import { afterUpdate } from 'svelte';
  import { competitionData } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';

  let viewType = 'summary'; // 'summary' | 'completion'
  let sortedData = [];
  
  // Stats calculation
  let summary = {
      total: 0,
      achieved: 0,
      revenueTotal: 0,
      revenueAchieved: 0,
      quantityTotal: 0,
      quantityAchieved: 0,
      overallRate: 0
  };

  $: {
    const data = ($competitionData || []).map(item => { 
      const hoanThanhValue = (parseFloat(String(item.hoanThanh).replace('%','')) || 0); 
      return { ...item, hoanThanhValue: hoanThanhValue }; 
    });

    summary = data.reduce((acc, d) => {
      acc.total++;
      if (d.hoanThanhValue >= 100) acc.achieved++;
      
      if (d.type === 'doanhThu') {
          acc.revenueTotal++;
          if (d.hoanThanhValue >= 100) acc.revenueAchieved++;
      }
      if (d.type === 'soLuong') {
          acc.quantityTotal++;
          if (d.hoanThanhValue >= 100) acc.quantityAchieved++;
      }
      return acc;
    }, { total: 0, achieved: 0, revenueTotal: 0, revenueAchieved: 0, quantityTotal: 0, quantityAchieved: 0 });

    summary.overallRate = summary.total > 0 ? (summary.achieved / summary.total) * 100 : 0;
    sortedData = data; 
  }

  function setViewType(newType) {
    viewType = newType;
  }
  
  function sortData(items) {
    return [...items].sort((a, b) => b.hoanThanhValue - a.hoanThanhValue); 
  };

  function getRateColor(rate) {
      if (rate >= 80) return 'text-green-600'; 
      if (rate >= 50) return 'text-yellow-600'; 
      return 'text-red-600';
  }

  $: rateStyle = getRateColor(summary.overallRate);

  afterUpdate(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });
</script>

{#snippet flatKpiCard(title, value, subText, icon, colorClass, barPercent = 0)}
    <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all h-full min-h-[120px] flex items-stretch justify-between relative overflow-hidden group">
        
        <div class="flex flex-col justify-between items-start z-10 mr-4 flex-grow">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200 group-hover:bg-white group-hover:{colorClass} transition-colors">
                    <i data-feather={icon} class="w-4 h-4"></i>
                </div>
                <span class="text-xs font-extrabold uppercase text-gray-600 tracking-wider leading-tight">{title}</span>
            </div>

            <div class="w-full mt-auto pt-3">
                {#if barPercent > 0}
                    <div class="w-full bg-gray-100 rounded-full h-1.5 mb-2 max-w-[100px]">
                        <div class="h-1.5 rounded-full {colorClass.replace('text-', 'bg-')}" style="width: {Math.min(barPercent, 100)}%"></div>
                    </div>
                {/if}
                <div class="text-[11px] font-semibold text-gray-400 leading-snug">
                    {@html subText}
                </div>
            </div>
        </div>

        <div class="flex items-center justify-end z-10 flex-shrink-0">
            <span class="text-5xl font-black {colorClass} tracking-tighter leading-none drop-shadow-sm">{value}</span>
        </div>
    </div>
{/snippet}

{#snippet competitionCard(item)}
    {@const isProjectedCompleted = item.hoanThanhValue >= 100}
    {@const isActualCompleted = item.luyKe >= item.target}
    {@const colorBase = isProjectedCompleted ? 'green' : (item.hoanThanhValue >= 80 ? 'yellow' : 'red')}
    {@const textColor = `text-${colorBase}-600`}
    {@const barColor = `bg-${colorBase}-500`}
    {@const topBorderColor = `border-${colorBase}-500`}
    {@const targetRemaining = (item.target || 0) - (item.luyKe || 0)}
    {@const daysLeft = Math.max(30 - (new Date().getDate()), 1)}
    {@const dailyTarget = (item.target > 0 && targetRemaining > 0) ? (targetRemaining / daysLeft) : 0}

    <div class="bg-white border border-gray-200 border-t-4 {topBorderColor} rounded-lg p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col h-full">
        <div class="flex justify-between items-start gap-3 mb-2">
            <h4 class="font-bold text-gray-800 text-sm leading-snug line-clamp-2 flex-grow" title={item.name}>
                {item.name}
            </h4>
            <span class="text-2xl font-extrabold {textColor} leading-none flex-shrink-0">
                {formatters.formatPercentage(item.hoanThanhValue / 100)}
            </span>
        </div>

        <div class="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <div class="h-1.5 rounded-full {barColor} transition-all duration-500" style="width: {Math.min(item.hoanThanhValue, 100)}%"></div>
        </div>

        <div class="mt-auto pt-2 border-t border-dashed border-gray-100 grid grid-cols-2 gap-2 text-xs items-end">
            <div>
                <span class="block text-[10px] text-gray-400 uppercase font-semibold">TH / MT</span>
                <div class="text-gray-700 font-bold whitespace-nowrap">
                    <span>{formatters.formatNumberOrDash(item.luyKe)}</span>
                    <span class="text-gray-300 font-normal mx-0.5">/</span>
                    <span>{formatters.formatNumberOrDash(item.target)}</span>
                </div>
            </div>
            <div class="text-right">
                {#if !isActualCompleted}
                    <div class="inline-block bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold border border-red-100">
                        Cần: {formatters.formatNumberOrDash(dailyTarget)}/ngày
                    </div>
                {:else}
                    <span class="text-green-600 font-bold text-[10px] flex items-center justify-end gap-1">
                        <i data-feather="check-circle" class="w-3 h-3"></i> Đã đạt
                    </span>
                {/if}
            </div>
        </div>
    </div>
{/snippet}

<div class="luyke-dashboard-container">
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-capture-group="kpi-thidua">
        
        {@render flatKpiCard(
            'Tổng Chương trình', 
            summary.total, 
            `DT: <strong class="text-blue-600">${summary.revenueTotal}</strong> • SL: <strong class="text-orange-600">${summary.quantityTotal}</strong>`,
            'layers',
            'text-gray-700'
        )}

        {@render flatKpiCard(
            'Tỷ lệ Đạt', 
            formatters.formatPercentage(summary.overallRate / 100), 
            `Đã đạt: <strong class="${getRateColor(summary.overallRate)}">${summary.achieved}</strong> / ${summary.total}`,
            'target',
            getRateColor(summary.overallRate),
            summary.overallRate
        )}

        {@render flatKpiCard(
            'Thi đua Doanh thu', 
            `${summary.revenueAchieved}/${summary.revenueTotal}`, 
            `Tỷ lệ đạt: <strong>${summary.revenueTotal > 0 ? formatters.formatPercentage(summary.revenueAchieved / summary.revenueTotal) : '0%'}</strong>`,
            'dollar-sign',
            'text-blue-600',
            summary.revenueTotal > 0 ? (summary.revenueAchieved / summary.revenueTotal) * 100 : 0
        )}

        {@render flatKpiCard(
            'Thi đua Số lượng', 
            `${summary.quantityAchieved}/${summary.quantityTotal}`, 
            `Tỷ lệ đạt: <strong>${summary.quantityTotal > 0 ? formatters.formatPercentage(summary.quantityAchieved / summary.quantityTotal) : '0%'}</strong>`,
            'box',
            'text-orange-600',
            summary.quantityTotal > 0 ? (summary.quantityAchieved / summary.quantityTotal) * 100 : 0
        )}

    </div>

    <div class="luyke-tier-2-container">
        
        <div class="luyke-toolbar">
            <div class="luyke-toolbar-left">
                <h3 class="text-lg font-bold uppercase flex items-center gap-2 text-gray-700">
                    <i data-feather="list" class="text-blue-600"></i>
                    Chi tiết ({summary.total})
                </h3>
            </div>

            <div class="luyke-toolbar-right flex items-center gap-2">
                <div class="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button 
                        class="view-mode-btn {viewType === 'summary' ? 'active' : ''}" 
                        on:click={() => setViewType('summary')}
                    >
                        <i data-feather="grid" class="w-4 h-4"></i>
                        <span class="hidden sm:inline text-xs ml-1">Theo Loại</span>
                    </button>
                    <button 
                        class="view-mode-btn {viewType === 'completion' ? 'active' : ''}" 
                        on:click={() => setViewType('completion')}
                    >
                        <i data-feather="check-circle" class="w-4 h-4"></i>
                        <span class="hidden sm:inline text-xs ml-1">Tiến độ</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl min-h-[400px]">
            {#if sortedData.length === 0}
                <div class="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p class="text-gray-500 font-bold mb-2">Chưa có dữ liệu hiển thị.</p>
                    <p class="text-xs text-gray-400">Vui lòng dán "Data lũy kế" ở tab Cập nhật dữ liệu.</p>
                </div>
            {:else}
                
                <div class="flex flex-col gap-8">
                    {#if viewType === 'summary'}
                        {@const dataDoanhThu = sortData(sortedData.filter(d => d.type === 'doanhThu'))}
                        {@const dataSoLuong = sortData(sortedData.filter(d => d.type === 'soLuong'))}

                        {#if dataDoanhThu.length > 0}
                            <div>
                                <h4 class="text-sm font-bold text-blue-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-blue-100">
                                    <span class="bg-blue-100 p-1 rounded"><i data-feather="dollar-sign" class="w-4 h-4"></i></span>
                                    Thi Đua Doanh Thu ({dataDoanhThu.length})
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {#each dataDoanhThu as item}
                                        {@render competitionCard(item)}
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        {#if dataSoLuong.length > 0}
                            <div>
                                <h4 class="text-sm font-bold text-orange-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-orange-100">
                                    <span class="bg-orange-100 p-1 rounded"><i data-feather="box" class="w-4 h-4"></i></span>
                                    Thi Đua Số Lượng ({dataSoLuong.length})
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {#each dataSoLuong as item}
                                        {@render competitionCard(item)}
                                    {/each}
                                </div>
                            </div>
                        {/if}

                    {:else if viewType === 'completion'}
                        {@const completed = sortData(sortedData.filter(d => d.hoanThanhValue >= 100))}
                        {@const pending = sortData(sortedData.filter(d => d.hoanThanhValue < 100))}

                        {#if completed.length > 0}
                            <div>
                                <h4 class="text-sm font-bold text-green-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-green-100">
                                    <span class="bg-green-100 p-1 rounded"><i data-feather="check" class="w-4 h-4"></i></span>
                                    Đã hoàn thành ({completed.length})
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {#each completed as item}
                                        {@render competitionCard(item)}
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        {#if pending.length > 0}
                            <div>
                                <h4 class="text-sm font-bold text-red-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-red-100">
                                    <span class="bg-red-100 p-1 rounded"><i data-feather="clock" class="w-4 h-4"></i></span>
                                    Cần nỗ lực thêm ({pending.length})
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {#each pending as item}
                                        {@render competitionCard(item)}
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>