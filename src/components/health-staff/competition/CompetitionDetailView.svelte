<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';
    import { competitionNameMappings, ycxData, competitionData, danhSachNhanVien, selectedWarehouse, luykeNameMappings } from '../../../stores.js';
    import { settingsService } from '../../../services/settings.service.js';
    import { datasyncService } from '../../../services/datasync.service.js';

    export let employeeId;
    export let allReportData = []; 

    const dispatch = createEventDispatcher();
    let employee = null;
    let displayInfo = { name: '', code: '', dept: '' };
    
    // Đã thêm 'chuaCoTarget' vào stats
    let stats = {
        dat: [], ganDat: [], canCoGang: [], chuaCoTarget: [],
        summary: { total: 0, dat: 0, rate: 0, ganDat: 0, canCoGang: 0, chuaCoTarget: 0 }
    };

    // --- KHỐI LOGIC: TARGET CÁ NHÂN (LINKED MAPPING) ---
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
            
            let linkedEmpProg = '';
            if (typeof luykeMap === 'object' && luykeMap !== null) {
                linkedEmpProg = luykeMap.linkedEmpProgram;
            }
            
            if (linkedEmpProg) {
                const rawTarget = (parseFloat(item.target) || 0) * (targetRatio / 100);
                const isQty = item.type === 'soLuong';
                const pTarget = totalEmployees > 0 ? (isQty ? Math.ceil(rawTarget / totalEmployees) : Math.round(rawTarget / totalEmployees)) : 0;
                
                stMappedData[linkedEmpProg] = pTarget;
            }
        });

        let columnSettings = settingsService.loadPastedCompetitionViewSettings();
        if (!columnSettings || columnSettings.length === 0) columnSettings = settingsService.loadPastedCompetitionViewSettings();
        
        const newTargets = {};
        (columnSettings || []).forEach(col => {
            newTargets[col.tenGoc] = stMappedData[col.tenGoc] || 0;
        });
        categoryTargets = newTargets;
    }

    // --- LOGIC PHÂN TÍCH NHÂN VIÊN ---
    $: {
        if (employeeId && allReportData.length > 0 && Object.keys(categoryTargets).length >= 0) {
            let rawEmp = allReportData.find(e => e.maNV === employeeId);
            if (rawEmp) {
                employee = { ...rawEmp };
                const cleanCode = String(employeeId).trim();
                let realName = employee.hoTen || employee.name || '';
                let realDept = employee.boPhan || '';

                if ($ycxData && $ycxData.length) {
                    const dbEmp = $ycxData.find(e => String(e.ma_nv || e.maNV || '').trim() === cleanCode || (e.nguoiTao && String(e.nguoiTao).includes(cleanCode)));
                    if (dbEmp) {
                        realName = dbEmp.ten_nv || dbEmp.hoTen || realName;
                        if (!realDept || realDept === 'Chưa phân loại' || realDept === 'Nhân viên không tìm thấy') {
                            realDept = dbEmp.ma_kho || dbEmp.boPhan || dbEmp.vi_tri || '';
                        }
                    }
                }

                if (realName.includes(cleanCode)) realName = realName.replace(cleanCode, '');
                realName = realName.replace(/[-–—\s]+$/, '').trim();
                displayInfo = { name: realName, code: cleanCode, dept: realDept };

                let columnSettings = settingsService.loadPastedCompetitionViewSettings();
                if (!columnSettings || columnSettings.length === 0) columnSettings = settingsService.loadPastedCompetitionViewSettings();
                
                const activeColumns = columnSettings
                    .filter(col => col.visible)
                    .map(col => ({
                        ...col,
                        label: $competitionNameMappings[col.tenGoc] || col.label || col.tenGoc
                    }));

                let datList = [], ganDatList = [], canCoGangList = [], chuaCoTargetList = [];

                activeColumns.forEach(col => {
                    const compData = employee.competitions.find(c => c.tenGoc === col.tenGoc);
                    const val = compData ? compData.giaTri : 0;
                    const target = categoryTargets[col.tenGoc] || 0;
                    
                    const item = {
                        name: col.label,
                        value: val,
                        target: target,
                        diff: val - target,
                        percentOfAvg: target > 0 ? (val / target) * 100 : (val > 0 ? 100 : 0)
                    };

                    // BẢNG CHÂN LÝ 4 KỊCH BẢN
                    if ((target > 0 && val >= target) || (target === 0 && val > 0)) {
                        datList.push(item);
                    } 
                    else if (target > 0 && val < target) {
                        if (item.percentOfAvg >= 70) {
                            ganDatList.push(item);
                        } else {
                            canCoGangList.push(item);
                        }
                    } 
                    else {
                        // Target = 0 VÀ Val = 0
                        chuaCoTargetList.push(item);
                    }
                });

                stats = {
                    dat: datList.sort((a,b) => b.percentOfAvg - a.percentOfAvg),
                    ganDat: ganDatList.sort((a,b) => b.percentOfAvg - a.percentOfAvg),
                    canCoGang: canCoGangList.sort((a,b) => a.percentOfAvg - b.percentOfAvg),
                    chuaCoTarget: chuaCoTargetList,
                    summary: {
                        total: activeColumns.length, // Đủ số lượng cột BI
                        dat: datList.length,
                        ganDat: ganDatList.length,
                        canCoGang: canCoGangList.length,
                        chuaCoTarget: chuaCoTargetList.length,
                        rate: 0
                    }
                };
                stats.summary.rate = stats.summary.total > 0 ? (stats.summary.dat / stats.summary.total) * 100 : 0;
            }
        }
    }

    function goBack() {
        dispatch('back');
    }

    afterUpdate(() => {
        if (typeof feather !== 'undefined') feather.replace();
    });
</script>

<div class="animate-fade-in pb-10 bg-gray-50 min-h-screen p-4 sm:p-6">
  
    <button on:click={goBack} class="mb-4 flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-semibold">
        <i data-feather="arrow-left" class="w-5 h-5"></i> Quay lại bảng tổng hợp
    </button>

    {#if employee}
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 flex items-center gap-5">
            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200 shadow-inner">
                <i data-feather="user" class="w-8 h-8"></i>
            </div>
            <div>
                <h2 class="text-2xl font-bold text-gray-800">{displayInfo.name} <span class="text-gray-400 font-medium text-lg">- {displayInfo.code}</span></h2>
                {#if displayInfo.dept}
                    <span class="inline-block mt-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                        {displayInfo.dept}
                    </span>
                {/if}
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">Ngành hàng Đạt</p>
                <p class="text-3xl font-extrabold text-gray-800">
                    <span class="text-blue-600">{stats.summary.dat}</span>
                    <span class="text-gray-300 text-xl">/ {stats.summary.total}</span>
                </p>
            </div>

            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">Tỷ lệ hoàn thành KPI</p>
                <p class="text-3xl font-extrabold text-red-500">
                    {formatters.formatNumber(stats.summary.rate, 0)}%
                </p>
            </div>

            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">Gần Đạt (>=70%)</p>
                <p class="text-3xl font-extrabold text-yellow-500">{stats.summary.ganDat}</p>
            </div>

            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">Cần Cố Gắng</p>
                <p class="text-3xl font-extrabold text-red-600">{stats.summary.canCoGang}</p>
            </div>
        </div>

        <div class="space-y-8">
            
            <div class="bg-blue-50/50 rounded-xl border border-blue-100 overflow-hidden">
                <div class="px-5 py-3 bg-blue-100/50 border-b border-blue-200 flex items-center gap-2">
                    <i data-feather="check-circle" class="w-5 h-5 text-blue-600"></i>
                    <h3 class="font-bold text-blue-800 uppercase text-lg">Nhóm Đạt ({stats.dat.length})</h3>
                </div>
                <div class="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {#each stats.dat as item}
                        <div class="bg-white p-4 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                            {#if item.target === 0 && item.value > 0}
                                <div class="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">Mặc định Đạt</div>
                            {/if}
                            <h4 class="font-bold text-gray-800 mb-2 truncate pr-6" title={item.name}>{item.name}</h4>
                            <div class="w-full bg-gray-100 rounded-full h-2 mb-3">
                                <div class="bg-blue-500 h-2 rounded-full" style="width: 100%"></div>
                            </div>
                            <div class="text-xs space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Thực hiện:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.value)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Target cá nhân:</span>
                                    <span class="font-bold text-gray-800">{item.target > 0 ? formatters.formatNumber(item.target) : 'Chưa có'}</span>
                                </div>
                                <div class="flex justify-between border-t border-dashed border-gray-200 pt-1 mt-1">
                                    <span class="text-gray-500">Vượt:</span>
                                    <span class="font-bold text-green-600">+{item.target > 0 ? formatters.formatNumber(item.diff) : formatters.formatNumber(item.value)}</span>
                                </div>
                            </div>
                        </div>
                    {/each}
                    {#if stats.dat.length === 0}
                        <p class="text-sm text-gray-400 italic col-span-full text-center py-4">Không có ngành hàng nào đạt.</p>
                    {/if}
                </div>
            </div>

            <div class="bg-yellow-50/50 rounded-xl border border-yellow-100 overflow-hidden">
                <div class="px-5 py-3 bg-yellow-100/50 border-b border-yellow-200 flex items-center gap-2">
                    <i data-feather="trending-up" class="w-5 h-5 text-yellow-600"></i>
                    <h3 class="font-bold text-yellow-800 uppercase text-lg">Nhóm Gần Đạt ({stats.ganDat.length})</h3>
                </div>
                <div class="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {#each stats.ganDat as item}
                        <div class="bg-white p-4 rounded-lg border border-yellow-100 shadow-sm hover:shadow-md transition-shadow">
                            <h4 class="font-bold text-gray-800 mb-2 truncate" title={item.name}>{item.name}</h4>
                            <div class="w-full bg-gray-100 rounded-full h-2 mb-3">
                                <div class="bg-yellow-400 h-2 rounded-full" style="width: {item.percentOfAvg}%"></div>
                            </div>
                            <div class="text-xs space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Thực hiện:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.value)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Target cá nhân:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.target)}</span>
                                </div>
                                <div class="flex justify-between border-t border-dashed border-gray-200 pt-1 mt-1">
                                    <span class="text-gray-500">Chênh lệch:</span>
                                    <span class="font-bold text-red-500">{formatters.formatNumber(item.diff)}</span>
                                </div>
                            </div>
                        </div>
                    {/each}
                    {#if stats.ganDat.length === 0}
                        <p class="text-sm text-gray-400 italic col-span-full text-center py-4">Không có ngành hàng nào.</p>
                    {/if}
                </div>
            </div>

            <div class="bg-red-50/50 rounded-xl border border-red-100 overflow-hidden">
                <div class="px-5 py-3 bg-red-100/50 border-b border-red-200 flex items-center gap-2">
                    <i data-feather="alert-circle" class="w-5 h-5 text-red-600"></i>
                    <h3 class="font-bold text-red-800 uppercase text-lg">Nhóm Cần Cố Gắng ({stats.canCoGang.length})</h3>
                </div>
                <div class="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {#each stats.canCoGang as item}
                        <div class="bg-white p-4 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                            <h4 class="font-bold text-gray-800 mb-2 truncate" title={item.name}>{item.name}</h4>
                            <div class="w-full bg-gray-100 rounded-full h-2 mb-3">
                                <div class="bg-red-400 h-2 rounded-full" style="width: {Math.max(item.percentOfAvg, 5)}%"></div>
                            </div>
                            <div class="text-xs space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Thực hiện:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.value)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Target cá nhân:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.target)}</span>
                                </div>
                                <div class="flex justify-between border-t border-dashed border-gray-200 pt-1 mt-1">
                                    <span class="text-gray-500">Chênh lệch:</span>
                                    <span class="font-bold text-red-600">{formatters.formatNumber(item.diff)}</span>
                                </div>
                            </div>
                        </div>
                    {/each}
                    {#if stats.canCoGang.length === 0}
                        <p class="text-sm text-gray-400 italic col-span-full text-center py-4">Tuyệt vời! Không có ngành hàng yếu kém.</p>
                    {/if}
                </div>
            </div>

            {#if stats.chuaCoTarget.length > 0}
                <div class="bg-gray-100/50 rounded-xl border border-gray-200 overflow-hidden">
                    <div class="px-5 py-3 bg-gray-200/50 border-b border-gray-300 flex items-center gap-2 opacity-80">
                        <i data-feather="help-circle" class="w-5 h-5 text-gray-500"></i>
                        <h3 class="font-bold text-gray-600 uppercase text-lg">Chưa có Target ({stats.chuaCoTarget.length})</h3>
                    </div>
                    <div class="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 opacity-70 hover:opacity-100 transition-opacity">
                        {#each stats.chuaCoTarget as item}
                            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <h4 class="font-bold text-gray-600 mb-2 truncate" title={item.name}>{item.name}</h4>
                                <div class="w-full bg-gray-200 rounded-full h-2 mb-3"></div>
                                <div class="text-xs space-y-1">
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Thực hiện:</span>
                                        <span class="font-bold text-gray-500">0</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Target cá nhân:</span>
                                        <span class="font-bold text-gray-400 italic">Chưa có</span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

        </div>

    {:else}
        <div class="p-10 text-center">
            <p class="text-gray-500">Đang tải dữ liệu chi tiết...</p>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>