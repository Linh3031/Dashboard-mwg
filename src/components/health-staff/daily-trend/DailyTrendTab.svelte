<script>
    import { get } from 'svelte/store';
    import { ycxData, danhSachNhanVien, efficiencyConfig, warehouseCustomMetrics, luykeGoalSettings, selectedWarehouse } from '../../../stores.js';
    import { reportService } from '../../../services/reportService.js';
    import { dataProcessing } from '../../../services/dataProcessing.js';
    
    import DailyTrendToolbar from './DailyTrendToolbar.svelte';
    import DailyTrendPivotGrid from './DailyTrendPivotGrid.svelte';

    let isLoading = false;
    let matrixResult = null;

    let settings = {
        startDate: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        warehouse: $selectedWarehouse || 'ALL',
        viewMode: 'METRIC',
        metricId: 'TY_LE_QUY_DOI', // Default
        rawType: 'revenue', // Default
        filters: { nganhHang: [], nhomHang: [], nhaSanXuat: [], tenSanPham: '' } // Sửa thành Array chuẩn với FilterBar
    };

    $: allMetricsConfig = [...($efficiencyConfig || []), ...($warehouseCustomMetrics || [])];

    $: targetConfig = (() => {
        if (settings.viewMode !== 'METRIC') return 0;
        const goals = ($luykeGoalSettings && $selectedWarehouse) ? ($luykeGoalSettings[$selectedWarehouse] || {}) : {};
        if (goals[settings.metricId] !== undefined) return parseFloat(goals[settings.metricId]) / 100;
        
        const metricCfg = allMetricsConfig.find(m => m.id === settings.metricId);
        if (metricCfg && metricCfg.target) return parseFloat(metricCfg.target) / 100;
        return 0; 
    })();

    function generateMatrix() {
        isLoading = true;
        setTimeout(() => {
            try {
                settings.warehouse = $selectedWarehouse || 'ALL';
                const data = get(ycxData) || [];
                const employees = get(danhSachNhanVien) || [];
                const heSoMap = dataProcessing.getHeSoQuyDoi() || {}; // Lấy map hệ số từ config.js
                
                matrixResult = reportService.buildPivotMatrix(data, employees, settings, allMetricsConfig, heSoMap);
            } catch (err) {
                console.error("Lỗi Pivot Matrix:", err);
                alert("Đã xảy ra lỗi khi tính toán hệ thống!");
            } finally {
                isLoading = false;
            }
        }, 50);
    }
</script>

<div class="daily-trend-container animate-fade-in bg-white rounded-xl shadow-sm border border-gray-200">
    <DailyTrendToolbar bind:settings={settings} {allMetricsConfig} {isLoading} on:generate={generateMatrix} />
    <DailyTrendPivotGrid {matrixResult} {targetConfig} />
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>