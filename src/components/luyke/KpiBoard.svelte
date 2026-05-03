<script>
    import { formatters } from '../../utils/formatters.js';

    // Khai báo các cổng nhận vật tư (Props) từ component cha
    export let luykeCardData = {};
    export let localGoals = {};
    export let competitionSummary = { dat: 0, total: 0 };
    export let comparisonData = { value: 0, percentage: 'N/A' };
    export let luotKhachData = { value: 0, percentage: 'N/A' };
    export let channelStats = { dxm: { val: 0, pct: 0 }, tgdd: { val: 0, pct: 0 } };
    export let captureFilename = "BaoCaoLuyKe";
    export let targetQdValue = 0; // Xử lý vi sai giữa ST đơn và Cụm
</script>

<div id="luyke-kpi-cards-container" data-capture-group="kpi" class="kpi-grid-fixed" data-capture-filename={captureFilename}>
      
    <div class="kpi-card-solid card-1">
        <div class="kpi-solid-header">Doanh Thu Thực <i data-feather="dollar-sign"></i></div>
        <div class="kpi-solid-value">{formatters.formatNumber((luykeCardData.dtThucLK || 0) / 1000000, 0)}</div>
        <div class="kpi-solid-sub">
            <span>DK: {formatters.formatNumber((luykeCardData.dtThucDuKien || 0) / 1000000, 0)}</span>
            <span>MT: {formatters.formatNumber(localGoals?.doanhThuThuc || 0)}</span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="dollar-sign"></i></div>
    </div>

    <div class="kpi-card-solid card-2">
        <div class="kpi-solid-header">DT Quy Đổi <i data-feather="refresh-cw"></i></div>
        <div class="kpi-solid-value">{formatters.formatNumber((luykeCardData.dtQdLK || 0) / 1000000, 0)}</div>
        <div class="kpi-solid-sub">
            <span>DK: {formatters.formatNumber((luykeCardData.dtQdDuKien || 0) / 1000000, 0)}</span>
            <span>MT: {formatters.formatNumber(targetQdValue / 1000000, 0)}</span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="refresh-cw"></i></div>
    </div>

    <div class="kpi-card-solid card-3">
        <div class="kpi-solid-header">% HT Target (QĐ) <i data-feather="target"></i></div>
        <div class="kpi-solid-value">{formatters.formatPercentage(luykeCardData.phanTramTargetQd || 0)}</div>
        <div class="kpi-solid-sub">
            <span>% HT DT Thực: {formatters.formatPercentage(luykeCardData.phanTramTargetThuc || 0)}</span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="target"></i></div>
    </div>

    <div class="kpi-card-solid card-4">
        <div class="kpi-solid-header">Hiệu quả QĐ <i data-feather="trending-up"></i></div>
        <div class="kpi-solid-value">{formatters.formatPercentage(luykeCardData.phanTramQd || 0)}</div>
        <div class="kpi-solid-sub">
            <span>Mục tiêu: {formatters.formatNumber(localGoals?.phanTramQD || 0)}%</span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="trending-up"></i></div>
    </div>

    <div class="kpi-card-solid card-5">
        <div class="kpi-solid-header">Tỷ lệ Trả chậm <i data-feather="credit-card"></i></div>
        <div class="kpi-solid-value">{formatters.formatPercentage(luykeCardData.phanTramGop || 0)}</div>
        <div class="kpi-solid-sub">
            <span>Doanh số: {formatters.formatNumber((luykeCardData.dtGop || 0) / 1000000, 0)}</span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="credit-card"></i></div>
    </div>

    <div class="kpi-card-solid card-6">
        <div class="kpi-solid-header">Thi đua đạt <i data-feather="award"></i></div>
        <div class="kpi-solid-value">{competitionSummary.dat}/{competitionSummary.total}</div>
        <div class="kpi-solid-sub">
            <span>Tỷ lệ đạt: {formatters.formatPercentage(luykeCardData.tyLeThiDuaDat)}</span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="award"></i></div>
    </div>

    <div class="kpi-card-solid card-7">
        <div class="kpi-solid-header">Tăng trưởng CK <i data-feather="activity"></i></div>
        <div class="kpi-solid-value">{comparisonData.percentage || 'N/A'}</div>
        <div class="kpi-solid-sub">
            <span>Lượt khách: {luotKhachData.percentage || 'N/A'}</span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="activity"></i></div>
    </div>

    <div class="kpi-card-solid card-8">
       <div class="kpi-solid-header">Tỷ trọng kênh <i data-feather="pie-chart"></i></div>
        <div class="flex flex-col gap-1 mt-1">
            <div class="flex justify-between items-baseline border-b border-white/20 pb-1">
                <span class="text-sm font-semibold opacity-90">ĐMX</span>
                <div class="text-right">
                    <span class="text-lg font-bold">{formatters.formatRevenue(channelStats.dxm.val, 0)}</span>
                    <span class="text-xs opacity-90 ml-1 font-bold">({formatters.formatPercentage(channelStats.dxm.pct)})</span>
                </div>
            </div>
            <div class="flex justify-between items-baseline pt-1">
                <span class="text-sm font-semibold opacity-90">TGDD</span>
                <div class="text-right">
                    <span class="text-lg font-bold">{formatters.formatRevenue(channelStats.tgdd.val, 0)}</span>
                    <span class="text-xs opacity-90 ml-1 font-bold">({formatters.formatPercentage(channelStats.tgdd.pct)})</span>
                </div>
            </div>
        </div>
        <div class="kpi-bg-icon"><i data-feather="pie-chart"></i></div>
    </div>

</div>