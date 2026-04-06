<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';
    import { competitionNameMappings, ycxData, competitionData, danhSachNhanVien, selectedWarehouse, luykeNameMappings } from '../../../stores.js';
    import { settingsService } from '../../../services/settings.service.js';
    import { datasyncService } from '../../../services/datasync.service.js';

    export let employeeId;
    export let allReportData = []; 

    const dispatch = createEventDispatcher();
    
    // --- STATE ---
    let viewMode = 'rut_gon'; 
    let employee = null;
    let displayInfo = { name: '', code: '' }; 
    
    let stats = {
        compactList: [],
        dat: [], 
        ganDat: [], 
        canCoGang: [], 
        chuaCoSoBan: [], 
        summary: { total: 0, dat: 0, rate: 0, ganDat: 0, canCoGang: 0 }
    };

    // --- LOGIC TIẾN ĐỘ DỰ KIẾN ---
    $: today = new Date();
    $: currentDay = Math.max(today.getDate() - 1, 1);
    $: daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // --- LOGIC TARGET CÁ NHÂN ---
    let targetRatio = 100;
    let categoryTargets = {};

    $: if ($selectedWarehouse) {
        datasyncService.loadPersonalTargetRatio($selectedWarehouse)
            .then(ratio => targetRatio = ratio)
            .catch(() => targetRatio = 100);
    }

    $: emps = $danhSachNhanVien || [];
    $: filteredEmps = $selectedWarehouse ? emps.filter(e => String(e.maKho) === String($selectedWarehouse) || String(e.MAKHO) === String($selectedWarehouse)) : emps;
    $: totalEmployees = filteredEmps.length > 0 ? filteredEmps.length : 1;

    $: {
        const stMappedData = {};
        ($competitionData || []).forEach(item => {
            const luykeMap = $luykeNameMappings && $luykeNameMappings[item.name];
            let linkedEmpProg = (typeof luykeMap === 'object' && luykeMap !== null) ? luykeMap.linkedEmpProgram : '';
            
            if (linkedEmpProg) {
                const rawTarget = (parseFloat(item.target) || 0) * (targetRatio / 100);
                const isQty = item.type === 'soLuong';
                const pTarget = totalEmployees > 0 ? (isQty ? Math.ceil(rawTarget / totalEmployees) : Math.round(rawTarget / totalEmployees)) : 0;
                stMappedData[linkedEmpProg] = pTarget;
            }
        });

        let columnSettings = settingsService.loadPastedCompetitionViewSettings() || [];
        const newTargets = {};
        columnSettings.forEach(col => {
            newTargets[col.tenGoc] = stMappedData[col.tenGoc] || 0;
        });
        categoryTargets = newTargets;
    }

    function getColorClass(percent) {
        if (percent >= 100) return 'text-blue-600';
        if (percent >= 80) return 'text-green-600';
        return 'text-red-600';
    }

    $: {
        if (employeeId && allReportData.length > 0) {
            let rawEmp = allReportData.find(e => e.maNV === employeeId);
            if (rawEmp) {
                employee = { ...rawEmp };
                const cleanCode = String(employeeId).trim();
                let realName = employee.hoTen || employee.name || '';

                if ($ycxData?.length) {
                    const dbEmp = $ycxData.find(e => String(e.ma_nv || e.maNV || '').trim() === cleanCode || (e.nguoiTao && String(e.nguoiTao).includes(cleanCode)));
                    if (dbEmp) {
                        realName = dbEmp.ten_nv || dbEmp.hoTen || realName;
                    }
                }
                realName = realName.replace(cleanCode, '').replace(/[-–—\s]+$/, '').trim();
                displayInfo = { name: realName, code: cleanCode };

                let columnSettings = settingsService.loadPastedCompetitionViewSettings() || [];
                const activeColumns = columnSettings.filter(col => col.visible).map(col => ({
                    ...col, label: $competitionNameMappings[col.tenGoc] || col.label || col.tenGoc
                }));

                let datList = [], ganDatList = [], canCoGangList = [], chuaCoSoBanList = [];

                activeColumns.forEach(col => {
                    const compData = employee.competitions.find(c => c.tenGoc === col.tenGoc);
                    const val = compData?.giaTri || 0;
                    const target = categoryTargets[col.tenGoc] || 0;
                    const projectedVal = (val / currentDay) * daysInMonth;
                    
                    const item = {
                        name: col.label, value: val, projected: projectedVal, target,
                        diff: projectedVal - target,
                        percentOfAvg: target > 0 ? (projectedVal / target) * 100 : (val > 0 ? 100 : 0)
                    };

                    if (val === 0) {
                        chuaCoSoBanList.push(item);
                    } else {
                        if (target > 0 && projectedVal >= target || target === 0) datList.push(item);
                        else if (item.percentOfAvg >= 70) ganDatList.push(item);
                        else canCoGangList.push(item);
                    }
                });

                datList.sort((a,b) => b.percentOfAvg - a.percentOfAvg);
                ganDatList.sort((a,b) => b.percentOfAvg - a.percentOfAvg);
                canCoGangList.sort((a,b) => b.percentOfAvg - a.percentOfAvg);
                
                let allCompact = [...datList, ...ganDatList, ...canCoGangList].sort((a,b) => b.percentOfAvg - a.percentOfAvg);

                stats = {
                    compactList: allCompact, dat: datList, ganDat: ganDatList, canCoGang: canCoGangList, chuaCoSoBan: chuaCoSoBanList,
                    summary: { total: activeColumns.length, dat: datList.length, ganDat: ganDatList.length, canCoGang: canCoGangList.length, rate: 0 }
                };
                stats.summary.rate = stats.summary.total > 0 ? (stats.summary.dat / stats.summary.total) * 100 : 0;
            }
        }
    }

    afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="animate-fade-in pb-10 bg-slate-50 min-h-screen p-4 sm:p-6" data-capture-group="thidua-nhanvien-detail">
  
    <button on:click={() => dispatch('back')} class="mb-4 flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm capture-hide">
        <i data-feather="arrow-left" class="w-4 h-4"></i> QUAY LẠI BẢNG TỔNG HỢP
    </button>

    {#if employee}
        <div class="bg-blue-50 border border-blue-200 rounded-2xl shadow-sm p-4 sm:p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-4 w-full md:w-auto">
                <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center text-blue-500 border border-blue-100 shadow-sm shrink-0">
                    <i data-feather="user" class="w-7 h-7"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-yellow-600 drop-shadow-sm">{displayInfo.name} <span class="text-blue-400 font-bold text-lg ml-1">- {displayInfo.code}</span></h2>
                </div>
            </div>

            <div class="bg-white p-1 rounded-xl border border-blue-100 shadow-sm flex items-center w-full md:w-auto shrink-0 capture-hide">
                <button on:click={() => viewMode = 'rut_gon'} class="flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors {viewMode === 'rut_gon' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-slate-600'}">Rút gọn</button>
                <button on:click={() => viewMode = 'chi_tiet'} class="flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors {viewMode === 'chi_tiet' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-slate-600'}">Chi tiết</button>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 capture-kpi-grid">
            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-full min-h-[110px] flex justify-between items-center">
                <div class="flex flex-col h-full justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><i data-feather="check-circle" class="w-4 h-4"></i></div>
                        <span class="text-xs font-bold uppercase text-gray-500">Ngành hàng Đạt</span>
                    </div>
                    <div class="mt-3 text-[11px] font-semibold text-gray-400">Đã đạt: <strong class="text-gray-700">{stats.summary.dat}</strong> / {stats.summary.total}</div>
                </div>
                <span class="text-5xl font-black text-gray-800">{stats.summary.dat}</span>
            </div>

            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-full min-h-[110px] flex justify-between items-center">
                <div class="flex flex-col h-full justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500"><i data-feather="target" class="w-4 h-4"></i></div>
                        <span class="text-xs font-bold uppercase text-gray-500">Tỷ lệ Hoàn thành</span>
                    </div>
                    <div class="mt-3 text-[11px] font-semibold text-gray-400">Dựa trên tiến độ dự kiến</div>
                </div>
                <span class="text-4xl font-black text-rose-500">{formatters.formatNumber(stats.summary.rate, 0)}%</span>
            </div>

            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-full min-h-[110px] flex justify-between items-center">
                <div class="flex flex-col h-full justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500"><i data-feather="trending-up" class="w-4 h-4"></i></div>
                        <span class="text-xs font-bold uppercase text-gray-500">Gần Đạt (>=70%)</span>
                    </div>
                </div>
                <span class="text-5xl font-black text-amber-500">{stats.summary.ganDat}</span>
            </div>

            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-full min-h-[110px] flex justify-between items-center">
                <div class="flex flex-col h-full justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600"><i data-feather="alert-circle" class="w-4 h-4"></i></div>
                        <span class="text-xs font-bold uppercase text-gray-500">Cần Cố Gắng</span>
                    </div>
                </div>
                <span class="text-5xl font-black text-red-600">{stats.summary.canCoGang}</span>
            </div>
        </div>

        <div class="space-y-8 capture-main-content">
            {#if viewMode === 'rut_gon'}
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 class="font-bold text-gray-700 uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
                        <i data-feather="grid" class="w-4 h-4"></i> Tổng quan các ngành hàng có số liệu
                    </h3>
                    {#if stats.compactList.length > 0}
                        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 capture-grid-view">
                            {#each stats.compactList as item}
                                <div class="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                                    <span class="text-[11px] font-bold text-gray-600 line-clamp-1 w-full mb-0.5 capture-text" title={item.name}>{item.name}</span>
                                    <span class="text-[17px] font-black {getColorClass(item.percentOfAvg)} capture-text">
                                        {formatters.formatNumber(item.percentOfAvg, 0)}%
                                    </span>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-sm text-gray-400 italic">Không có ngành hàng nào phát sinh số liệu.</p>
                    {/if}
                </div>
            {:else}
                <div class="space-y-6">
                    {#each [
                        { id: 'dat', title: 'Nhóm Đạt', data: stats.dat, color: 'blue', icon: 'check-circle' },
                        { id: 'ganDat', title: 'Nhóm Gần Đạt', data: stats.ganDat, color: 'amber', icon: 'trending-up' },
                        { id: 'canCoGang', title: 'Nhóm Cần Cố Gắng', data: stats.canCoGang, color: 'red', icon: 'alert-triangle' }
                    ] as group}
                        {#if group.data.length > 0}
                            <div class="bg-{group.color}-50/30 rounded-2xl border border-{group.color}-100 overflow-hidden">
                                <div class="px-5 py-3 bg-{group.color}-50/80 border-b border-{group.color}-100 flex items-center gap-2">
                                    <i data-feather={group.icon} class="w-5 h-5 text-{group.color}-600"></i>
                                    <h3 class="font-black text-{group.color}-900 uppercase text-sm tracking-wide">{group.title} ({group.data.length})</h3>
                                </div>
                                <div class="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 capture-grid-view">
                                    {#each group.data as item}
                                        <div class="bg-white p-3.5 rounded-xl border border-{group.color}-200 shadow-sm relative">
                                            <div class="flex justify-between items-start gap-2 mb-3">
                                                <h4 class="font-black text-slate-800 text-[14px] leading-snug line-clamp-2 capture-text" title={item.name}>{item.name}</h4>
                                                {#if item.target > 0}
                                                    <span class="font-black {getColorClass(item.percentOfAvg)} text-[16px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 whitespace-nowrap capture-text">
                                                        {formatters.formatNumber(item.percentOfAvg, 0)}%
                                                    </span>
                                                {/if}
                                            </div>
                                            <div class="w-full bg-slate-100 rounded-full h-1.5 mb-3 capture-bar-bg"><div class="bg-{group.color}-500 h-1.5 rounded-full capture-bar" style="width: {Math.min(item.percentOfAvg, 100)}%"></div></div>
                                            <div class="space-y-1.5 text-[12px]">
                                                <div class="flex justify-between items-center"><span class="text-slate-500 font-medium">Thực / Target:</span><span class="font-bold text-slate-800 capture-text">{formatters.formatNumber(item.value)} <span class="text-slate-300 font-normal mx-0.5">/</span> {item.target > 0 ? formatters.formatNumber(item.target) : '-'}</span></div>
                                                <div class="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                                    <span class="text-slate-600 font-medium capture-text">{item.diff >= 0 ? 'Vượt' : 'Thiếu'}: <strong class="{item.diff >= 0 ? 'text-green-600' : 'text-red-500'}">{formatters.formatNumber(Math.abs(item.diff))}</strong></span>
                                                    <span class="text-slate-300">|</span>
                                                    <span class="text-slate-600 font-medium capture-text">Dự kiến: <strong class="text-blue-600">{formatters.formatNumber(item.projected)}</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            {/if}

            {#if stats.chuaCoSoBan.length > 0}
                <div class="pt-6 border-t border-slate-200/60 mt-6">
                    <h3 class="font-bold text-slate-500 uppercase text-xs mb-3 flex items-center gap-1.5"><i data-feather="inbox" class="w-4 h-4"></i> Chưa có số bán ({stats.chuaCoSoBan.length})</h3>
                    <div class="flex flex-wrap gap-2 capture-pill-group">
                        {#each stats.chuaCoSoBan as item}
                            <span class="bg-red-600 text-yellow-300 px-3.5 py-1.5 rounded-full text-[11px] font-black shadow-sm uppercase tracking-wide capture-pill">
                                {item.name}
                            </span>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    /* ==========================================================================
       OVERRIDE CAPTURE LOGIC (SYNCED FROM MASTER LUYKE)
       ========================================================================== */
    :global(.capture-container .capture-hide) { display: none !important; }
    
    /* [cite: 429] Ép chiều ngang khung hình capture cho cả 2 mode */
    :global(.capture-container [data-capture-group="thidua-nhanvien-detail"]) { 
        width: 900px !important; min-width: 900px !important; 
        background-color: #f8fafc !important; padding: 25px !important; 
    }

    /* [cite: 500] Tắt animation để html2canvas không chụp dở dang */
    :global(.capture-container *) { transition: none !important; animation: none !important; }

    /* [cite: 430, 431] Dàn lại lưới cho 2 chế độ khi chụp ảnh */
    :global(.capture-container .capture-kpi-grid) { grid-template-columns: repeat(4, 1fr) !important; gap: 15px !important; }
    
    /* Mode rút gọn dàn 5 cột, mode chi tiết dàn 3 cột để không bị hẹp */
    :global(.capture-container .capture-grid-view) { 
        display: grid !important; 
        grid-template-columns: repeat(5, 1fr) !important; 
        gap: 12px !important; 
    }
    :global(.capture-container .capture-detail-grid) { grid-template-columns: repeat(3, 1fr) !important; }

    /* [cite: 434, 435, 443] Xử lý che chân chữ và rớt dòng */
    :global(.capture-container .capture-text) { 
        line-height: 1.5 !important; 
        padding-bottom: 3px !important; 
        display: block !important;
        white-space: normal !important;
    }
    :global(.capture-container .line-clamp-1), 
    :global(.capture-container .line-clamp-2) { 
        display: block !important; -webkit-line-clamp: unset !important; overflow: visible !important; height: auto !important; 
    }

    /* ĐẶC TRỊ CHE CHÂN CHỮ NHÓM VIÊN THUỐC */
    :global(.capture-container .capture-pill-group) { gap: 10px !important; }
    :global(.capture-container .capture-pill) { 
        padding: 8px 14px !important; 
        line-height: 1.2 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 32px !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    /* [cite: 501] Bảo toàn màu thanh progress khi chụp */
    :global(.capture-container .capture-bar-bg),
    :global(.capture-container .capture-bar) { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; height: 6px !important; }
</style>