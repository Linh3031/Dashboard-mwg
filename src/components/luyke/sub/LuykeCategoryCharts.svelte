<script>
    import { tick, afterUpdate } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';
    import { getRandomBrightColor } from '../../../utils.js';

    export let pieData = [];
    export let barData = [];
    export let showUnexported = false;

    let chartInstancePie = null;
    let chartInstanceBar = null;

    async function renderCharts() {
        if (typeof Chart === 'undefined') return;
        await tick();

        // 1. Pie Chart
        const ctxPie = document.getElementById('luyke-cat-pie-chart');
        if (ctxPie) {
            if (chartInstancePie) chartInstancePie.destroy();
            const totalPieRevenue = pieData.reduce((sum, item) => sum + item.revenue, 0);

            chartInstancePie = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: pieData.map(d => d.name),
                    datasets: [{
                        data: pieData.map(d => d.revenue),
                        backgroundColor: pieData.map(() => getRandomBrightColor()),
                        borderWidth: 1
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { 
                        legend: { 
                            position: 'right', 
                            labels: { 
                                boxWidth: 10,
                                font: { size: 11 },
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            const formattedValue = formatters.formatRevenue(value, 0);
                                            const pct = totalPieRevenue > 0 ? (value / totalPieRevenue * 100).toFixed(1) + "%" : "0%";
                                            return {
                                                text: `${label} (${pct}) - ${formattedValue}`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                hidden: isNaN(data.datasets[0].data[i]),
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            } 
                        },
                        datalabels: {
                            formatter: (value, ctx) => {
                                const percentage = totalPieRevenue > 0 ? (value / totalPieRevenue * 100).toFixed(1) + "%" : "0%";
                                if ((value / totalPieRevenue) < 0.03) return "";
                                return percentage;
                            },
                            color: '#fff',
                            font: { weight: 'bold', size: 10 }
                        }
                    } 
                },
                plugins: [ChartDataLabels]
            });
        }

        // 2. Bar Chart
        const ctxBar = document.getElementById('luyke-brand-bar-chart');
        if (ctxBar) {
            if (chartInstanceBar) chartInstanceBar.destroy();
            chartInstanceBar = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: barData.map(d => d.name),
                    datasets: [{
                        label: 'Doanh thu',
                        data: barData.map(d => d.revenue / 1000000),
                        backgroundColor: barData.map(() => getRandomBrightColor()),
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        datalabels: {
                            anchor: 'end',
                            align: 'end',
                            formatter: (value) => formatters.formatNumber(value, 0),
                            color: '#4b5563',
                            font: { weight: 'bold', size: 10 }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => formatters.formatRevenue(ctx.raw * 1000000)
                            }
                        }
                    },
                    scales: { x: { beginAtZero: true } }
                },
                plugins: [ChartDataLabels]
            });
        }
    }

    // Tự động render khi data thay đổi
    $: if (pieData.length > 0 || barData.length > 0) {
        setTimeout(renderCharts, 0);
    }

    afterUpdate(() => {
        // Đảm bảo render lại khi chuyển tab hoặc resize
        setTimeout(renderCharts, 0);
    });
</script>

<div class="luyke-charts-container p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
    <div class="chart-box">
        <h4 class="text-sm font-bold text-gray-700 mb-2 text-center">Tỷ trọng Doanh Thu (ĐVT: Triệu)</h4>
        <div class="relative h-full w-full"><canvas id="luyke-cat-pie-chart"></canvas></div>
    </div>
    <div class="chart-box">
        <h4 class="text-sm font-bold text-gray-700 mb-2 text-center">Top 15 Hãng (ĐVT: Triệu)</h4>
        <div class="relative h-full w-full"><canvas id="luyke-brand-bar-chart"></canvas></div>
    </div>
</div>