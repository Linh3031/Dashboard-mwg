<script>
  import { onMount, afterUpdate } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  
  export let dailyStats = []; // Dữ liệu: [{ date, revenue, convertedRevenue }]

  let chartInstanceDTQD;
  let chartInstanceTLQD;
  let filterDays = 7; // Mặc định 7 ngày

  // Lọc dữ liệu dựa trên số ngày
  $: filteredData = filterDays === 'all' 
      ? dailyStats 
      : dailyStats.slice(-filterDays);

  $: labels = filteredData.map(d => new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }));
  $: dtqdData = filteredData.map(d => d.convertedRevenue / 1000000);
  $: tlqdData = filteredData.map(d => (d.revenue > 0 ? (d.convertedRevenue / d.revenue) - 1 : 0));

  const chartOptions = (title, isPercent = false) => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          legend: { display: false },
          tooltip: {
              callbacks: {
                  label: (context) => {
                      const val = context.raw;
                      return isPercent ? formatters.formatPercentage(val) : `${formatters.formatRevenue(val * 1000000)} Tr`;
                  }
              }
          },
          datalabels: {
              anchor: 'end', align: 'end',
              formatter: (val) => isPercent ? formatters.formatPercentage(val) : formatters.formatRevenue(val * 1000000),
              color: '#4b5563', font: { weight: 'bold', size: 10 }
          }
      },
      scales: { y: { beginAtZero: true, grace: '10%' } }
  });

  function renderCharts() {
      if (typeof Chart === 'undefined') return;

      // 1. Biểu đồ DTQĐ
      const ctxDTQD = document.getElementById('daily-dtqd-chart');
      if (ctxDTQD) {
          if (chartInstanceDTQD) chartInstanceDTQD.destroy();
          chartInstanceDTQD = new Chart(ctxDTQD, {
              type: 'bar',
              data: {
                  labels: labels,
                  datasets: [{ label: 'DTQĐ', data: dtqdData, backgroundColor: '#3b82f6', borderRadius: 4 }]
              },
              options: chartOptions('Doanh thu QĐ', false),
              plugins: [ChartDataLabels]
          });
      }

      // 2. Biểu đồ Tỷ lệ QĐ
      const ctxTLQD = document.getElementById('daily-tlqd-chart');
      if (ctxTLQD) {
          if (chartInstanceTLQD) chartInstanceTLQD.destroy();
          chartInstanceTLQD = new Chart(ctxTLQD, {
              type: 'bar',
              data: {
                  labels: labels,
                  datasets: [{ label: 'Tỷ lệ', data: tlqdData, backgroundColor: '#16a34a', borderRadius: 4 }]
              },
              options: chartOptions('Tỷ lệ QĐ', true),
              plugins: [ChartDataLabels]
          });
      }
  }

  // Render lại khi dữ liệu thay đổi
  $: if (filteredData.length > 0) {
      // Dùng setTimeout để đợi DOM cập nhật xong canvas
      setTimeout(renderCharts, 0);
  }

  function setFilter(days) {
      filterDays = days;
  }
</script>

<div class="mb-6">
    <div class="flex items-center justify-center flex-wrap gap-2 mb-4">
        <span class="text-sm font-medium text-gray-600">Xem theo:</span>
        {#each [3, 5, 7, 10, 'all'] as days}
            <button 
                class="px-3 py-1 text-xs font-medium rounded-full transition-colors 
                       {filterDays === days ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                on:click={() => setFilter(days)}
            >
                {days === 'all' ? 'Tất cả' : `${days} ngày`}
            </button>
        {/each}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white p-4 rounded-lg shadow-md border h-[300px]">
            <h4 class="text-md font-bold text-gray-700 mb-2 text-center">Doanh thu QĐ theo ngày (Tr)</h4>
            <div class="relative h-[240px] w-full">
                <canvas id="daily-dtqd-chart"></canvas>
            </div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-md border h-[300px]">
            <h4 class="text-md font-bold text-gray-700 mb-2 text-center">Tỷ lệ QĐ theo ngày</h4>
            <div class="relative h-[240px] w-full">
                <canvas id="daily-tlqd-chart"></canvas>
            </div>
        </div>
    </div>
</div>