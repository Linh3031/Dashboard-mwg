<script>
  import { onMount } from 'svelte';
  import { formatters } from '../../../utils/formatters.js';
  import { getRandomBrightColor } from '../../../utils.js';

  export let topProductGroups = [];
  export let categoryChartData = [];

  let chartInstance;

  // 1. Top 5 Nhóm hàng
  $: top5Groups = topProductGroups.slice(0, 5);
  $: maxRevenue = top5Groups.length > 0 ? top5Groups[0].realRevenue : 0;

  // 2. Biểu đồ
  function renderPieChart() {
      const ctx = document.getElementById('revenue-category-chart');
      if (!ctx || !categoryChartData.length) return;

      if (chartInstance) chartInstance.destroy();

      // Sort và lấy top 10 cho biểu đồ
      const sortedChartData = [...categoryChartData].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      chartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
              labels: sortedChartData.map(d => d.name),
              datasets: [{
                  label: 'Doanh thu',
                  data: sortedChartData.map(d => d.revenue / 1000000),
                  backgroundColor: sortedChartData.map(() => getRandomBrightColor()),
                  borderRadius: 4,
              }]
          },
          options: {
              indexAxis: 'x',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                  legend: { display: false },
                  tooltip: {
                      callbacks: { label: ctx => `${ctx.label}: ${formatters.formatRevenue(ctx.raw * 1000000)}` }
                  },
                  datalabels: {
                      anchor: 'end', align: 'end',
                      formatter: (val) => formatters.formatRevenue(val * 1000000),
                      color: '#4b5563', font: { weight: 'bold', size: 10 }
                  }
              },
              scales: { y: { beginAtZero: true, grace: '10%' } }
          },
          plugins: [ChartDataLabels]
      });
  }

  $: if (categoryChartData.length > 0) {
      setTimeout(renderPieChart, 0);
  }
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <div class="bg-white p-4 rounded-lg shadow-md border">
        <h4 class="text-md font-bold text-gray-700 border-b pb-2 mb-3">Top 5 Nhóm Hàng Doanh Thu Cao</h4>
        {#if top5Groups.length === 0}
            <p class="text-sm text-gray-500">Không có dữ liệu.</p>
        {:else}
            <div class="space-y-4">
                {#each top5Groups as group}
                    {@const percent = maxRevenue > 0 ? (group.realRevenue / maxRevenue) * 100 : 0}
                    <div>
                        <div class="flex justify-between items-end mb-1">
                            <div>
                                <span class="font-semibold text-sm block">{group.name}</span>
                                <span class="text-xs text-gray-500">SL: {formatters.formatNumber(group.quantity)} | %QĐ: {formatters.formatPercentage(group.conversionRate)}</span>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-bold text-gray-800">{formatters.formatRevenue(group.realRevenue)}</div>
                                <div class="text-xs text-blue-600 font-medium">{formatters.formatRevenue(group.convertedRevenue)} (QĐ)</div>
                            </div>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" style="width: {percent}%"></div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div class="bg-white p-4 rounded-lg shadow-md border">
        <h4 class="text-md font-bold text-gray-700 mb-2">Tỷ Trọng Doanh Thu Ngành Hàng</h4>
        <div class="relative h-[300px] w-full">
            <canvas id="revenue-category-chart"></canvas>
        </div>
    </div>
</div>