<script>
    import { tick } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';

    export let weeklyData = [];
    export let dailyData = [];

    let chartInstanceBar = null;
    let chartInstanceLine = null;

    $: if (weeklyData.length > 0 || dailyData.length > 0) {
        tick().then(() => renderCharts());
    }

    function renderCharts() {
        if (typeof Chart === 'undefined') return;

        const ctxBar = document.getElementById('dt-ck-weekly-chart');
        if (ctxBar) {
            if (chartInstanceBar) chartInstanceBar.destroy();
            chartInstanceBar = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: weeklyData.map(d => d.week),
                    datasets: [{
                        label: 'Doanh thu Thực (Triệu)',
                        data: weeklyData.map(d => d.rev / 1000000),
                        backgroundColor: '#3b82f6', borderRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        datalabels: {
                            anchor: 'end', align: 'top',
                            formatter: (value) => formatters.formatNumber(value, 0),
                            color: '#1e3a8a', font: { weight: 'bold', size: 10 }
                        }
                    },
                    scales: { y: { beginAtZero: true } }
                },
                plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}]
            });
        }

        const ctxLine = document.getElementById('dt-ck-daily-line-chart');
        if (ctxLine) {
            if (chartInstanceLine) chartInstanceLine.destroy();
            chartInstanceLine = new Chart(ctxLine, {
                type: 'line',
                data: {
                    // [FIX] Cắt chuỗi lấy chuẩn Ngày/Tháng (VD: 15/4)
                    labels: dailyData.map(d => {
                        const parts = d.date.split('/');
                        return `${parts[0]}/${parts[1]}`;
                    }), 
                    datasets: [{
                        label: 'Doanh thu Thực',
                        data: dailyData.map(d => d.rev / 1000000),
                        borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        borderWidth: 2, pointBackgroundColor: '#fff', pointBorderColor: '#0ea5e9',
                        pointRadius: 4, pointHoverRadius: 6, fill: true, tension: 0.3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        datalabels: { display: false },
                        tooltip: { callbacks: { label: (ctx) => 'DT Thực: ' + formatters.formatRevenue(ctx.raw * 1000000, 0) } }
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
        <h4 class="text-sm font-bold text-gray-700 mb-4 text-center">Doanh thu Thực theo Tuần (ĐVT: Triệu)</h4>
        <div class="relative h-[250px] w-full"><canvas id="dt-ck-weekly-chart"></canvas></div>
    </div>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h4 class="text-sm font-bold text-gray-700 mb-4 text-center">Tăng trưởng DT Thực theo Ngày</h4>
        <div class="relative h-[250px] w-full">
            {#if dailyData.length === 0}
                <div class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm italic">Chưa có dữ liệu ngày</div>
            {/if}
            <canvas id="dt-ck-daily-line-chart"></canvas>
        </div>
    </div>
</div>