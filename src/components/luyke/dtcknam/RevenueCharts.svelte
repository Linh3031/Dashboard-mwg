<script>
    import { tick } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';
    export let weeklyData = [];
    export let dailyData = [];
    export let warehouseTitle = '';

    let chartInstanceBar = null;
    let chartInstanceLine = null;

    // Tính toán số liệu trung bình ngày bằng reactive block để đổ trực tiếp lên giao diện HTML phía trên biểu đồ
    $: totalActual = dailyData.reduce((sum, d) => sum + (d.rev || 0), 0);
    $: totalQD = dailyData.reduce((sum, d) => sum + (d.revQD || 0), 0);
    $: totalDaysCount = dailyData.length || 1;
    $: avgActualValue = (totalActual / totalDaysCount) / 1000000;
    $: avgQDValue = (totalQD / totalDaysCount) / 1000000;

    $: if (weeklyData.length > 0 || dailyData.length > 0) {
        tick().then(() => renderCharts());
    }

    function renderCharts() {
        if (typeof Chart === 'undefined') return;

        // --- 1. BIỂU ĐỒ CỘT THEO TUẦN (ĐỒNG BỘ MÀU SẮC BIỂU ĐỒ LINE) ---
        const ctxBar = document.getElementById('dt-ck-weekly-chart');
        if (ctxBar) {
            if (chartInstanceBar) chartInstanceBar.destroy();
            chartInstanceBar = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: weeklyData.map(d => d.week),
                    datasets: [
                        {
                            label: 'Doanh thu Thực (Triệu)',
                            data: weeklyData.map(d => d.rev / 1000000),
                            backgroundColor: '#0ea5e9', // Màu xanh dương đồng bộ tuyến tính
                            borderRadius: 4
                        },
                        {
                            label: 'Doanh thu Quy đổi (Triệu)',
                            data: weeklyData.map(d => (d.revQD || 0) / 1000000),
                            backgroundColor: '#e11d48', // Màu đỏ hồng đồng bộ tuyến tính
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: true, position: 'top' },
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            formatter: (value) => formatters.formatNumber(value, 0),
                            color: '#1e3a8a',
                            font: { weight: 'bold', size: 10 }
                        }
                    },
                    scales: { y: { beginAtZero: true } }
                },
                plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}]
            });
        }

        // --- 2. BIỂU ĐỒ ĐƯỜNG THEO NGÀY (TINH GỌN LƯỚI & ẨN LEGEND) ---
        const ctxLine = document.getElementById('dt-ck-daily-line-chart');
        if (ctxLine) {
            if (chartInstanceLine) chartInstanceLine.destroy();

            chartInstanceLine = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: dailyData.map(d => {
                        const parts = d.date.split('/');
                        return `${parts[0]}/${parts[1]}`;
                    }), 
                    datasets: [
                        {
                            label: 'Doanh thu Thực',
                            data: dailyData.map(d => d.rev / 1000000),
                            borderColor: '#0ea5e9',
                            backgroundColor: 'rgba(14, 165, 233, 0.05)',
                            borderWidth: 2,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#0ea5e9',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: 'Doanh thu Quy đổi',
                            data: dailyData.map(d => (d.revQD || 0) / 1000000),
                            borderColor: '#e11d48',
                            backgroundColor: 'rgba(225, 29, 72, 0.03)',
                            borderWidth: 2,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#e11d48',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            fill: true,
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }, // Loại bỏ hoàn toàn phần ghi chú màu thừa theo yêu cầu
                        datalabels: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (ctx) => {
                                    const datasetLabel = ctx.dataset.label || '';
                                    return datasetLabel + ': ' + formatters.formatRevenue(ctx.raw * 1000000, 0);
                                }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h4 class="text-sm font-bold text-gray-700 mb-4 text-center">Doanh thu theo Tuần 2025 (ĐVT: Triệu) <span class="text-indigo-600">{warehouseTitle}</span></h4>
        <div class="relative h-[250px] w-full"><canvas id="dt-ck-weekly-chart"></canvas></div>
    </div>
    
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h4 class="text-sm font-bold text-gray-700 mb-1 text-center">Biểu đồ Doanh thu theo Ngày 2025 <span class="text-indigo-600">{warehouseTitle}</span></h4>
        
        <div class="text-xs text-gray-500 text-center mb-3 font-medium flex justify-center gap-4">
            <div>TB Ngày Thực: <span class="text-sky-600 font-black">{formatters.formatNumber(avgActualValue, 1)}M</span></div>
            <div class="text-gray-300 font-light">|</div>
            <div>TB Ngày Quy đổi: <span class="text-rose-600 font-black">{formatters.formatNumber(avgQDValue, 1)}M</span></div>
        </div>

        <div class="relative h-[230px] w-full">
            {#if dailyData.length === 0}
                <div class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm italic">Chưa có dữ liệu ngày</div>
            {/if}
            <canvas id="dt-ck-daily-line-chart"></canvas>
        </div>
    </div>
</div>