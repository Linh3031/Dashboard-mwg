<script>
    import { formatters } from '../../utils/formatters.js';
    import { modalState } from '../../stores.js';

    export let luykeCardData = {};
    export let localGoals = {};
    export let competitionSummary = { dat: 0, total: 0 };
    export let comparisonData = { value: 0, percentage: 'N/A' };
    export let luotKhachData = { value: 0, percentage: 'N/A' };
    export let channelStats = { dxm: { val: 0, pct: 0 }, tgdd: { val: 0, pct: 0 } };
    export let captureFilename = "BaoCaoLuyKe";
    export let targetQdValue = 0;

    // Hàm gọi Modal Quick Goal
    function openQuickGoal(fieldId, title, currentValue) {
        modalState.update(s => ({
            ...s,
            activeModal: 'quick-goal-modal',
            payload: { fieldId, title, currentValue: currentValue || 0 }
        }));
    }
</script>

<div id="luyke-kpi-cards-container" data-capture-group="kpi" class="kpi-grid-fixed" data-capture-filename={captureFilename}>
      
    <div 
        class="kpi-card-solid card-1 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform relative group" 
        on:click={() => openQuickGoal('doanhThuThuc', 'Target DT Thực', localGoals?.doanhThuThuc)}
        role="button" tabindex="0" title="Click để sửa mục tiêu"
    >
        <div class="kpi-solid-header">Doanh Thu Thực <i data-feather="dollar-sign"></i></div>
        <div class="kpi-solid-value">{formatters.formatNumber((luykeCardData.dtThucLK || 0) / 1000000, 0)}</div>
        <div class="kpi-solid-sub">
            <span>DK: {formatters.formatNumber((luykeCardData.dtThucDuKien || 0) / 1000000, 0)}</span>
            <span class="group-hover:text-yellow-300 transition-colors">MT: {formatters.formatNumber(localGoals?.doanhThuThuc || 0)} <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="dollar-sign"></i></div>
    </div>

    <div 
        class="kpi-card-solid card-2 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform relative group" 
        on:click={() => openQuickGoal('doanhThuQD', 'Target DT Quy Đổi', localGoals?.doanhThuQD)}
        role="button" tabindex="0" title="Click để sửa mục tiêu"
    >
        <div class="kpi-solid-header">DT Quy Đổi <i data-feather="refresh-cw"></i></div>
        <div class="kpi-solid-value">{formatters.formatNumber((luykeCardData.dtQdLK || 0) / 1000000, 0)}</div>
        <div class="kpi-solid-sub">
            <span>DK: {formatters.formatNumber((luykeCardData.dtQdDuKien || 0) / 1000000, 0)}</span>
            <span class="group-hover:text-yellow-300 transition-colors">MT: {formatters.formatNumber(targetQdValue / 1000000, 0)} <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
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

    <div 
        class="kpi-card-solid card-4 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform relative group" 
        on:click={() => openQuickGoal('phanTramQD', 'Mục tiêu % Quy Đổi', localGoals?.phanTramQD)}
        role="button" tabindex="0" title="Click để sửa mục tiêu"
    >
        <div class="kpi-solid-header">Hiệu quả QĐ <i data-feather="trending-up"></i></div>
        <div class="kpi-solid-value">{formatters.formatPercentage(luykeCardData.phanTramQd || 0)}</div>
        <div class="kpi-solid-sub">
            <span class="group-hover:text-yellow-300 transition-colors">Mục tiêu: {formatters.formatNumber(localGoals?.phanTramQD || 0)}% <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
        </div>
        <div class="kpi-bg-icon"><i data-feather="trending-up"></i></div>
    </div>

    <div 
        class="kpi-card-solid card-5 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-transform relative group" 
        on:click={() => openQuickGoal('phanTramTC', 'Mục tiêu % Trả chậm', localGoals?.phanTramTC)}
        role="button" tabindex="0" title="Click để sửa mục tiêu"
    >
        <div class="kpi-solid-header">Tỷ lệ Trả chậm <i data-feather="credit-card"></i></div>
        <div class="kpi-solid-value">{formatters.formatPercentage(luykeCardData.phanTramGop || 0)}</div>
        <div class="kpi-solid-sub">
            <span class="group-hover:text-yellow-300 transition-colors">Mục tiêu: {formatters.formatNumber(localGoals?.phanTramTC || 0)}% <i data-feather="edit-2" class="w-3 h-3 inline opacity-0 group-hover:opacity-100"></i></span>
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