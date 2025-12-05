<script>
  import { onMount, afterUpdate } from 'svelte';
  import { competitionData, modalState } from '../../stores.js';
  import { formatters } from '../../utils/formatters.js';

  let viewType = 'summary';
  let summary = { total: 0, dat: 0, doanhThuCount: 0, soLuongCount: 0 };
  let sortedData = [];

  $: {
    const data = ($competitionData || []).map(item => { 
      const hoanThanhValue = (parseFloat(String(item.hoanThanh).replace('%','')) || 0); 
      return { ...item, hoanThanhValue: hoanThanhValue }; 
    });
    summary = data.reduce((acc, d) => {
      acc.total++;
      if (d.hoanThanhValue >= 100) acc.dat++;
      if (d.type === 'doanhThu') acc.doanhThuCount++;
      if (d.type === 'soLuong') acc.soLuongCount++;
      return acc;
    }, { total: 0, dat: 0, doanhThuCount: 0, soLuongCount: 0 });
    sortedData = data; 
  }

  function setViewType(newType) {
    viewType = newType;
  }
  
  function sortData(items) {
    return [...items].sort((a, b) => b.hoanThanhValue - a.hoanThanhValue); 
  };

  // Hàm mở modal
  function openCompetitionManager() {
    modalState.update(s => ({ ...s, activeModal: 'user-competition-modal' }));
  }

  afterUpdate(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
    <div class="flex flex-wrap items-center gap-4"> 
      <h3 class="text-xl font-bold text-gray-800 uppercase flex items-center gap-2">
         <i data-feather="award" class="text-purple-600"></i> Thi đua lũy kế
      </h3> 
      <div id="luyke-thidua-view-selector" class="view-switcher"> 
        <button 
          data-view="summary" 
          class="view-switcher__btn {viewType === 'summary' ? 'active' : ''}"
          on:click={() => setViewType('summary')}
        >
           Theo Phân Loại
        </button> 
        <button 
          data-view="completion" 
          class="view-switcher__btn {viewType === 'completion' ? 'active' : ''}"
          on:click={() => setViewType('completion')}
        >
          Theo % Hoàn Thành
        </button> 
      </div> 
    </div>
    
    <button 
        class="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors border border-blue-200"
        on:click={openCompetitionManager}
    >
        <i data-feather="settings" class="w-4 h-4"></i>
        Quản lý chương trình
    </button>
  </div>
  
  <div id="luyke-competition-summary" class="text-sm px-2 competition-summary-counter">
      (
      <span class="font-normal text-gray-500">Tổng:</span> <strong class="text-blue-600">{summary.total}</strong>, 
      <span class="font-normal text-gray-500">Đạt:</span> <strong class="text-blue-600">{summary.dat}</strong>, 
      <span class="font-normal text-gray-500">Chưa đạt:</span> <strong class="text-red-600">{summary.total - summary.dat}</strong>, 
      <span class="font-normal text-gray-500">DT:</span> <strong class="text-blue-600">{summary.doanhThuCount}</strong>, 
      <span class="font-normal text-gray-500">SL:</span> <strong class="text-blue-600">{summary.soLuongCount}</strong>
      )
  </div> 

  <div id="luyke-competition-infographic-container" class="mt-4">
    {#if sortedData.length === 0}
      <p class="text-gray-500 font-bold col-span-2 p-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
        Vui lòng dán "Data lũy kế" ở tab Data để xem chi tiết hoặc tạo chương trình mới.
      </p>
    {:else}
        <div class="tdv-rows-container space-y-6">
            {#if viewType === 'summary'}
              {@const dataDoanhThu = sortData(sortedData.filter(d => d.type === 'doanhThu'))}
              {@const dataSoLuong = sortData(sortedData.filter(d => d.type === 'soLuong'))}
              
              {#if dataDoanhThu.length > 0}
                {@const achievedCount = dataDoanhThu.filter(item => item.hoanThanhValue >= 100).length}
                <div class="tdv-row" data-capture-group="comp-row-doanhthu" data-capture-columns="2">
                  <h3 class="tdv-row-title tdv-row-title--prize">
                    Thi Đua Doanh Thu
                    <span class="text-sm font-normal text-gray-700">
                      (Đạt: <strong class="text-blue-600">{achievedCount}</strong> / Cần nỗ lực: <strong class="text-red-600">{dataDoanhThu.length - achievedCount}</strong>)
                    </span>
                  </h3>
                  <div class="tdv-row-body grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each dataDoanhThu as item (item.name)}
                      {@const targetRemaining = item.target - item.luyKe}
                      {@const daysLeft = Math.max(30 - (new Date().getDate()), 1)}
                      {@const dailyTarget = (item.target > 0 && targetRemaining > 0) ? (targetRemaining / daysLeft) : 0}
                      <div class="tdv-item-card">
                        <p class="tdv-item-card__title">{item.name}</p>
                        <div class="tdv-progress-bar-container">
                          <div class="tdv-progress-bar {item.hoanThanhValue >= 100 ? 'tdv-progress-bar--blue' : 'tdv-progress-bar--yellow'}" style="width: {Math.min(item.hoanThanhValue, 100)}%;"></div>
                          <span class="tdv-progress-bar__text">{formatters.formatPercentage(item.hoanThanhValue / 100)}</span>
                        </div>
                        <div class="tdv-item-card__details">
                          <span>Lũy kế: <strong>{formatters.formatNumberOrDash(item.luyKe)}</strong></span>
                          <span>Target: <strong>{formatters.formatNumberOrDash(item.target)}</strong></span>
                          <span class="font-bold {dailyTarget > 0 ? 'text-red-600' : 'text-green-600'}">Mục tiêu/ngày: <strong>{formatters.formatNumberOrDash(dailyTarget)}</strong></span>
                        </div>
                      </div>
                    {/each}
                   </div>
                </div>
              {/if}

              {#if dataSoLuong.length > 0}
                {@const achievedCount = dataSoLuong.filter(item => item.hoanThanhValue >= 100).length}
                <div class="tdv-row" data-capture-group="comp-row-soluong" data-capture-columns="2">
                  <h3 class="tdv-row-title tdv-row-title--soon-prize">
                     Thi Đua Số Lượng
                    <span class="text-sm font-normal text-gray-700">
                      (Đạt: <strong class="text-blue-600">{achievedCount}</strong> / Cần nỗ lực: <strong class="text-red-600">{dataSoLuong.length - achievedCount}</strong>)
                    </span>
                  </h3>
                  <div class="tdv-row-body grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each dataSoLuong as item (item.name)}
                      {@const targetRemaining = item.target - item.luyKe}
                      {@const daysLeft = Math.max(30 - (new Date().getDate()), 1)}
                      {@const dailyTarget = (item.target > 0 && targetRemaining > 0) ? (targetRemaining / daysLeft) : 0}
                      <div class="tdv-item-card">
                        <p class="tdv-item-card__title">{item.name}</p>
                        <div class="tdv-progress-bar-container">
                          <div class="tdv-progress-bar {item.hoanThanhValue >= 100 ? 'tdv-progress-bar--blue' : 'tdv-progress-bar--yellow'}" style="width: {Math.min(item.hoanThanhValue, 100)}%;"></div>
                          <span class="tdv-progress-bar__text">{formatters.formatPercentage(item.hoanThanhValue / 100)}</span>
                        </div>
                        <div class="tdv-item-card__details">
                          <span>Lũy kế: <strong>{formatters.formatNumberOrDash(item.luyKe)}</strong></span>
                          <span>Target: <strong>{formatters.formatNumberOrDash(item.target)}</strong></span>
                          <span class="font-bold {dailyTarget > 0 ? 'text-red-600' : 'text-green-600'}">Mục tiêu/ngày: <strong>{formatters.formatNumberOrDash(dailyTarget)}</strong></span>
                        </div>
                      </div>
                     {/each}
                  </div>
                </div>
              {/if}

            {:else if viewType === 'completion'}
              {@const completed = sortData(sortedData.filter(d => d.hoanThanhValue >= 100))}
              {@const pending = sortData(sortedData.filter(d => d.hoanThanhValue < 100))}

              {#if completed.length > 0}
                <div class="tdv-row" data-capture-group="comp-row-dat" data-capture-columns="2">
                  <h3 class="tdv-row-title tdv-row-title--prize">
                    Các Chương Trình Đã Đạt Mục Tiêu
                    <span class="text-sm font-normal text-gray-700">({completed.length})</span>
                  </h3>
                  <div class="tdv-row-body grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each completed as item (item.name)}
                      <div class="tdv-item-card">
                        <p class="tdv-item-card__title">{item.name}</p>
                        <div class="tdv-progress-bar-container">
                          <div class="tdv-progress-bar tdv-progress-bar--blue" style="width: {Math.min(item.hoanThanhValue, 100)}%;"></div>
                          <span class="tdv-progress-bar__text">{formatters.formatPercentage(item.hoanThanhValue / 100)}</span>
                        </div>
                        <div class="tdv-item-card__details">
                           <span>Lũy kế: <strong>{formatters.formatNumberOrDash(item.luyKe)}</strong></span>
                          <span>Target: <strong>{formatters.formatNumberOrDash(item.target)}</strong></span>
                          <span class="font-bold text-green-600">Đạt</span>
                        </div>
                      </div>
                     {/each}
                  </div>
                </div>
              {/if}

              {#if pending.length > 0}
                <div class="tdv-row" data-capture-group="comp-row-no-luc" data-capture-columns="2">
                  <h3 class="tdv-row-title tdv-row-title--effort">
                     Các Chương Trình Cần Nỗ Lực Thêm
                    <span class="text-sm font-normal text-gray-700">({pending.length})</span>
                  </h3>
                  <div class="tdv-row-body grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each pending as item (item.name)}
                       <div class="tdv-item-card">
                        <p class="tdv-item-card__title">{item.name}</p>
                        <div class="tdv-progress-bar-container">
                          <div class="tdv-progress-bar tdv-progress-bar--yellow" style="width: {Math.min(item.hoanThanhValue, 100)}%;"></div>
                          <span class="tdv-progress-bar__text">{formatters.formatPercentage(item.hoanThanhValue / 100)}</span>
                        </div>
                        <div class="tdv-item-card__details">
                          <span>Lũy kế: <strong>{formatters.formatNumberOrDash(item.luyKe)}</strong></span>
                          <span>Target: <strong>{formatters.formatNumberOrDash(item.target)}</strong></span>
                          <span class="font-bold text-red-600">Chưa đạt</span>
                        </div>
                      </div>
                    {/each}
                   </div>
                </div>
              {/if}
            {/if}
      </div>
    {/if}
  </div>
</div>