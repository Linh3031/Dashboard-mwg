<script>
  import { afterUpdate } from 'svelte';
  import { competitionData, luykeNameMappings, modalState, danhSachNhanVien, selectedWarehouse } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';

  let viewType = 'completion'; // 'completion' | 'summary' | 'personal_target'
  let sortedData = [];
  let summary = {
      total: 0, achieved: 0, revenueTotal: 0, revenueAchieved: 0, quantityTotal: 0, quantityAchieved: 0, overallRate: 0
  };

  // --- TÍNH TỔNG NHÂN VIÊN ---
  let totalEmployees = 1;

  $: {
      let emps = $danhSachNhanVien || [];
      if ($selectedWarehouse) {
          emps = emps.filter(e => String(e.maKho) === String($selectedWarehouse) || String(e.MAKHO) === String($selectedWarehouse));
      }
      totalEmployees = emps.length > 0 ? emps.length : 1;
  }

  $: {
    const data = ($competitionData || []).map(item => { 
      const hoanThanhValue = (parseFloat(String(item.hoanThanh).replace('%','')) || 0); 
      return { ...item, hoanThanhValue: hoanThanhValue }; 
    });

    summary = data.reduce((acc, d) => {
      acc.total++;
      if (d.hoanThanhValue >= 100) acc.achieved++;
      if (d.type === 'doanhThu') { acc.revenueTotal++; if (d.hoanThanhValue >= 100) acc.revenueAchieved++; }
      if (d.type === 'soLuong') { acc.quantityTotal++; if (d.hoanThanhValue >= 100) acc.quantityAchieved++; }
      return acc;
    }, { total: 0, achieved: 0, revenueTotal: 0, revenueAchieved: 0, quantityTotal: 0, quantityAchieved: 0 });

    summary.overallRate = summary.total > 0 ? (summary.achieved / summary.total) * 100 : 0;
    sortedData = data;
  }

  function setViewType(newType) { viewType = newType; }
  function sortData(items) { return [...items].sort((a, b) => b.hoanThanhValue - a.hoanThanhValue); };
  
  function getRateColor(rate) {
      if (rate >= 80) return 'text-green-600';
      if (rate >= 50) return 'text-yellow-600';
      return 'text-red-600';
  }

  function truncateTextSimple(text, maxLength = 50) {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
  }

  const COLOR_MAP = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-500', border: 'border-blue-500' },
    yellow: { text: 'text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-500' },
    red: { text: 'text-red-600', bg: 'bg-red-500', border: 'border-red-500' }
  };

  $: rateStyle = getRateColor(summary.overallRate);

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
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
                <div class="text-[11px] font-semibold text-gray-400 leading-snug">{@html subText}</div>
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
    {@const colorKey = isProjectedCompleted ? 'blue' : (item.hoanThanhValue >= 80 ? 'yellow' : 'red')}
    {@const colors = COLOR_MAP[colorKey]}
    {@const targetRemaining = (item.target || 0) - (item.luyKe || 0)}
    {@const daysLeft = Math.max(30 - (new Date().getDate()), 1)}
    {@const dailyTarget = (item.target > 0 && targetRemaining > 0) ? (targetRemaining / daysLeft) : 0}

    {@const mappingData = $luykeNameMappings && $luykeNameMappings[item.name]}
    {@const displayTitle = (typeof mappingData === 'object' && mappingData !== null) ? (mappingData.shortName || item.name) : (mappingData || item.name)}
    {@const linkedProgram = (typeof mappingData === 'object' && mappingData !== null) ? mappingData.linkedEmpProgram : null}

    <div class="bg-white border border-t-4 {colors.border} rounded-lg p-3 shadow-sm transition-all flex flex-col h-full 
                {linkedProgram ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-blue-400' : 'hover:shadow-sm'}"
         on:click={() => {
             if (linkedProgram) {
                 modalState.update(s => ({ 
                     ...s, 
                     activeModal: 'st-emp-competition-modal', 
                     payload: { 
                         targetProgram: linkedProgram, 
                         title: displayTitle,
                         totalTarget: item.target || 0 
                     } 
                 }));
             }
         }}
    >
        <div class="flex justify-between items-start gap-3 mb-4 relative">
            <div class="font-bold text-gray-800 text-sm leading-snug flex-grow overflow-hidden" 
                title={item.name}
                style="height: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                {truncateTextSimple(displayTitle)}
            </div>
            
            <span class="text-2xl font-extrabold {colors.text} leading-none flex-shrink-0">
               {formatters.formatPercentage(item.hoanThanhValue / 100)}
            </span>
        </div>

        <div class="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
             <div class="h-1.5 rounded-full {colors.bg} transition-all duration-500" style="width: {Math.min(item.hoanThanhValue, 100)}%"></div>
        </div>

        <div class="mt-auto pt-2 border-t border-dashed border-gray-100 flex items-end justify-between gap-1 text-xs">
            <div class="flex-shrink-0">
                <span class="block text-[10px] text-gray-400 uppercase font-semibold">TH / MT</span>
                <div class="text-gray-700 font-bold whitespace-nowrap">
                    <span>{formatters.formatNumberOrDash(item.luyKe)}</span>
                    <span class="text-gray-300 font-normal mx-0.5">/</span>
                    <span>{formatters.formatNumberOrDash(item.target)}</span>
                </div>
            </div>
            
            <div class="text-right flex-shrink-0">
                 {#if !isActualCompleted}
                    <div class="inline-block bg-red-50 text-red-600 px-1.5 py-1 rounded text-[10px] font-bold border border-red-200 whitespace-nowrap">
                        Cần: {formatters.formatNumberOrDash(dailyTarget)}/ngày
                    </div>
                 {:else}
                    <div class="inline-block bg-blue-50 text-blue-600 px-1.5 py-1 rounded text-[10px] font-bold border border-blue-200 flex items-center justify-end gap-1 whitespace-nowrap">
                        <i data-feather="check-circle" class="w-3 h-3"></i> Đã đạt
                    </div>
                 {/if}
            </div>
        </div>
    </div>
{/snippet}

{#snippet personalTargetCard(item, empCount)}
    {@const type = item.type}
    {@const rawTarget = parseFloat(item.target) || 0}
    {@const pTarget = empCount > 0 ? (type === 'soLuong' ? Math.ceil(rawTarget / empCount) : Math.round(rawTarget / empCount)) : 0}
    
    {@const formattedTarget = new Intl.NumberFormat('vi-VN').format(pTarget) + (type === 'doanhThu' ? ' Tr' : '')}
    {@const formattedTotal = new Intl.NumberFormat('vi-VN').format(rawTarget) + (type === 'doanhThu' ? ' Tr' : '')}
    
    {@const isQty = type === 'soLuong'}
    {@const bgClass = isQty ? 'bg-orange-50' : 'bg-blue-50'}
    {@const borderClass = isQty ? 'border-orange-200' : 'border-blue-200'}
    {@const textClass = isQty ? 'text-orange-700' : 'text-blue-700'}
    {@const icon = isQty ? 'box' : 'dollar-sign'}
    
    {@const mappingData = $luykeNameMappings && $luykeNameMappings[item.name]}
    {@const displayTitle = (typeof mappingData === 'object' && mappingData !== null) ? (mappingData.shortName || item.name) : (mappingData || item.name)}

    <div class="flex items-center justify-between p-3.5 rounded-xl border {bgClass} {borderClass} shadow-sm group">
        <div class="flex flex-col flex-1 pr-2 min-w-0">
            <div class="flex items-center gap-1.5 mb-1 {textClass}">
                <i data-feather={icon} class="w-3.5 h-3.5"></i>
                <span class="text-[9px] font-black uppercase tracking-wider opacity-80">
                    {isQty ? 'Số Lượng' : 'Doanh Thu'}
                </span>
            </div>
            <div class="text-[14px] font-bold text-gray-800 line-clamp-2 leading-[1.3] pb-1 capture-pt-title" title={displayTitle}>
                {displayTitle}
            </div>
            <div class="mt-auto pt-1.5">
                <span class="text-[10px] text-gray-500 font-semibold tracking-wide bg-white/60 px-2 py-0.5 rounded border border-black/5 shadow-sm inline-block">
                    Tổng: <b class="text-gray-700">{formattedTotal}</b>
                </span>
            </div>
        </div>
        
        <div class="flex flex-col items-end justify-center shrink-0 border-l border-black/10 pl-4 py-2">
            <span class="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Target 1 NV</span>
            <span class="text-3xl font-black {textClass} leading-[1.1] tracking-tighter drop-shadow-sm capture-pt-value pb-1">
                {formattedTarget}
            </span>
        </div>
    </div>
{/snippet}


<div class="luyke-dashboard-container" data-capture-group="kpi-thidua">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {@render flatKpiCard('Tổng Chương trình', summary.total, `DT: <strong class="text-blue-600">${summary.revenueTotal}</strong> • SL: <strong class="text-orange-600">${summary.quantityTotal}</strong>`, 'layers', 'text-gray-700')}
        {@render flatKpiCard('Tỷ lệ Đạt', formatters.formatPercentage(summary.overallRate / 100), `Đã đạt: <strong class="${getRateColor(summary.overallRate)}">${summary.achieved}</strong> / ${summary.total}`, 'target', getRateColor(summary.overallRate), summary.overallRate)}
        {@render flatKpiCard('Thi đua Doanh thu', `${summary.revenueAchieved}/${summary.revenueTotal}`, `Tỷ lệ đạt: <strong>${summary.revenueTotal > 0 ? formatters.formatPercentage(summary.revenueAchieved / summary.revenueTotal) : '0%'}</strong>`, 'dollar-sign', 'text-blue-600', summary.revenueTotal > 0 ? (summary.revenueAchieved / summary.revenueTotal) * 100 : 0)}
        {@render flatKpiCard('Thi đua Số lượng', `${summary.quantityAchieved}/${summary.quantityTotal}`, `Tỷ lệ đạt: <strong>${summary.quantityTotal > 0 ? formatters.formatPercentage(summary.quantityAchieved / summary.quantityTotal) : '0%'}</strong>`, 'box', 'text-orange-600', summary.quantityTotal > 0 ? (summary.quantityAchieved / summary.quantityTotal) * 100 : 0)}
    </div>

    <div class="luyke-tier-2-container">
        <div class="luyke-toolbar">
            <div class="luyke-toolbar-left">
                <div class="text-lg font-bold uppercase flex items-center gap-2 text-gray-700">
                    {#if viewType === 'personal_target'}
                        <span class="flex items-center"><i data-feather="target" class="text-indigo-600"></i></span> Target Cá Nhân ({summary.total})
                    {:else}
                        <span class="flex items-center"><i data-feather="list" class="text-blue-600"></i></span> Chi tiết ({summary.total})
                        <span class="text-[11px] text-red-500 font-normal normal-case italic ml-2 mt-1">* bấm vào ngành hàng để xem theo nhân viên</span>
                    {/if}
                </div>
            </div>
            
            <div class="luyke-toolbar-right flex items-center gap-2">
                <div class="inline-flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button class="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center whitespace-nowrap transition-colors {viewType === 'completion' ? 'bg-white text-blue-600 shadow-sm pointer-events-none' : 'text-gray-500 hover:text-gray-900'}" on:click={() => setViewType('completion')}>
                        <i data-feather="check-circle" class="w-4 h-4 mr-1.5"></i><span class="hidden sm:inline">Tiến độ</span>
                    </button>
                    <button class="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center whitespace-nowrap transition-colors {viewType === 'summary' ? 'bg-white text-blue-600 shadow-sm pointer-events-none' : 'text-gray-500 hover:text-gray-900'}" on:click={() => setViewType('summary')}>
                        <i data-feather="grid" class="w-4 h-4 mr-1.5"></i><span class="hidden sm:inline">Theo Loại</span>
                    </button>
                    <button class="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center whitespace-nowrap transition-colors {viewType === 'personal_target' ? 'bg-indigo-600 text-white shadow-sm pointer-events-none' : 'text-gray-500 hover:text-gray-900'}" on:click={() => setViewType('personal_target')}>
                        <i data-feather="target" class="w-4 h-4 mr-1.5"></i><span class="hidden sm:inline">Giao Việc NV</span>
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
                                <div class="text-sm font-bold text-blue-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-blue-100">
                                    <span class="bg-blue-100 p-1 rounded"><i data-feather="dollar-sign" class="w-4 h-4"></i></span> Thi Đua Doanh Thu ({dataDoanhThu.length})
                                </div>
                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {#each dataDoanhThu as item} {@render competitionCard(item)} {/each}
                                </div>
                            </div>
                        {/if}
                        {#if dataSoLuong.length > 0}
                            <div>
                                <div class="text-sm font-bold text-orange-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-orange-100">
                                    <span class="bg-orange-100 p-1 rounded"><i data-feather="box" class="w-4 h-4"></i></span> Thi Đua Số Lượng ({dataSoLuong.length})
                                </div>
                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {#each dataSoLuong as item} {@render competitionCard(item)} {/each}
                                </div>
                            </div>
                         {/if}

                    {:else if viewType === 'completion'}
                        {@const completed = sortData(sortedData.filter(d => d.hoanThanhValue >= 100))}
                        {@const pending = sortData(sortedData.filter(d => d.hoanThanhValue < 100))}

                        {#if completed.length > 0}
                            <div>
                                <div class="text-sm font-bold text-blue-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-blue-100">
                                    <span class="bg-blue-100 p-1 rounded"><i data-feather="check" class="w-4 h-4"></i></span> Đã hoàn thành ({completed.length})
                                </div>
                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {#each completed as item} {@render competitionCard(item)} {/each}
                                </div>
                             </div>
                        {/if}
                        {#if pending.length > 0}
                            <div>
                                 <div class="text-sm font-bold text-red-800 uppercase flex items-center gap-2 mb-4 pb-2 border-b border-red-100">
                                      <span class="bg-red-100 p-1 rounded"><i data-feather="clock" class="w-4 h-4"></i></span> Cần nỗ lực thêm ({pending.length})
                                 </div>
                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                     {#each pending as item} {@render competitionCard(item)} {/each}
                                </div>
                            </div>
                        {/if}

                    {:else if viewType === 'personal_target'}
                        <div class="mb-5 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 flex flex-nowrap justify-between items-center shadow-sm gap-4">
                            <div class="flex items-center gap-3 min-w-0 capture-target-header-left">
                                <div class="bg-indigo-600 w-8 h-8 rounded-lg text-white shadow-md flex items-center justify-center shrink-0 capture-target-icon-box">
                                    <i data-feather="target" class="w-4 h-4"></i>
                                </div>
                                <div class="capture-target-text-group">
                                    <div class="text-sm sm:text-base font-black text-indigo-900 uppercase capture-target-title">
                                        Target cá nhân
                                    </div>
                                    <p class="text-[11px] sm:text-xs text-indigo-600/80 mt-0.5 font-medium truncate capture-target-sub">Chia đều cho tổng nhân sự.</p>
                                </div>
                            </div>
                            
                            <div class="text-center bg-white px-4 py-2 rounded-lg border border-indigo-200 shadow-sm flex flex-col items-center shrink-0 min-w-[100px]">
                                <span class="text-[9px] uppercase font-bold text-gray-400">Tổng nhân sự</span>
                                <span class="text-2xl font-black text-indigo-700 leading-none">{totalEmployees} <span class="text-xs font-bold text-gray-500">NV</span></span>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 personal-target-grid">
                            {#each sortedData as item}
                                {@render personalTargetCard(item, totalEmployees)}
                            {/each}
                        </div>
                     {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Tổng quan container khi capture */
    :global(.capture-container .luyke-dashboard-container) { width: 1100px !important; min-width: 1100px !important; background-color: white; padding: 20px !important; }
    
    /* Lưới của 2 mode cũ */
    :global(.capture-container .grid:not(.personal-target-grid)) { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 16px !important; }
    
    /* ÉP LƯỚI CHO MODE GIAO VIỆC (3 CỘT HOÀN HẢO ĐỂ XEM MOBILE MÀ KHÔNG TRỐNG LỀ PHẢI) */
    :global(.capture-container .personal-target-grid) {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        width: 100% !important;
        gap: 16px !important;
    }
    :global(.capture-container .personal-target-grid > div) { page-break-inside: avoid; }
    
    /* Xử lý font chống rớt chữ khi chụp ảnh chung */
    :global(.capture-container .capture-pt-title) { font-size: 17px !important; line-height: 1.35 !important; padding-bottom: 3px !important;}
    :global(.capture-container .capture-pt-value) { font-size: 34px !important; line-height: 1.1 !important; padding-bottom: 4px !important;}
    :global(.capture-container h4) { font-size: 16px !important; }
    :global(.capture-container .luyke-toolbar-right) { display: none !important; }

    /* --- FIX LỖI RỚT ICON VÀ TEXT TRONG HEADER CỦA CHẾ ĐỘ GIAO TARGET --- */
    :global(.capture-container .capture-target-header-left) { 
        align-items: flex-start !important; 
        padding-top: 4px !important; 
    }
    :global(.capture-container .capture-target-icon-box) { 
        display: flex !important; 
        align-items: flex-start !important; 
        padding-top: 8px !important; /* Đẩy tay icon xuống giữa thay vì dùng align center bị lỗi html2canvas */
        justify-content: center !important;
    }
    :global(.capture-container .capture-target-text-group) { 
        display: block !important; 
    }
    :global(.capture-container .capture-target-title) { 
        line-height: 1.2 !important; 
        margin-bottom: 2px !important; 
    }
    :global(.capture-container .capture-target-sub) { 
        line-height: 1.2 !important; 
        display: block !important; 
        height: auto !important; 
        overflow: visible !important; 
    }
</style>