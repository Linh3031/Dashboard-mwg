<script>
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import { formatters } from '../../../utils/formatters.js';
    // [FIX GENESIS] Import ycxData để tra cứu thông tin chuẩn
    import { competitionNameMappings, ycxData } from '../../../stores.js';
    import { settingsService } from '../../../services/settings.service.js';

    export let employeeId;
    export let allReportData = []; 

    const dispatch = createEventDispatcher();

    // --- LOGIC TÍNH TOÁN ---
    let employee = null;
    // [FIX GENESIS] Biến hiển thị đã được làm sạch
    let displayInfo = {
        name: '',
        code: '',
        dept: ''
    };

    let stats = {
        dat: [],
        ganDat: [],
        canCoGang: [],
        summary: { total: 0, dat: 0, rate: 0, ganDat: 0, canCoGang: 0 }
    };

    // [FIX GENESIS] Thêm $ycxData vào dependency
    $: {
        if (employeeId && allReportData.length > 0) {
            let rawEmp = allReportData.find(e => e.maNV === employeeId);

            if (rawEmp) {
                // Clone object để xử lý hiển thị
                employee = { ...rawEmp };
                
                // --- LOGIC FIX TÊN & BỘ PHẬN ---
                const cleanCode = String(employeeId).trim();
                let realName = employee.hoTen || employee.name || '';
                let realDept = employee.boPhan || '';

                // 1. Tra cứu ngược trong danh sách nhân viên chuẩn (ycxData)
                if ($ycxData && $ycxData.length) {
                    const dbEmp = $ycxData.find(e => 
                        String(e.ma_nv || e.maNV || '').trim() === cleanCode ||
                        (e.nguoiTao && String(e.nguoiTao).includes(cleanCode))
                    );
                    if (dbEmp) {
                        realName = dbEmp.ten_nv || dbEmp.hoTen || realName;
                        // Ưu tiên lấy bộ phận từ DB nếu báo cáo bị thiếu hoặc lỗi
                        if (!realDept || realDept === 'Chưa phân loại' || realDept === 'Nhân viên không tìm thấy') {
                            realDept = dbEmp.ma_kho || dbEmp.boPhan || dbEmp.vi_tri || '';
                        }
                    }
                }

                // 2. Làm sạch tên (Loại bỏ mã nhân viên thừa trong tên)
                // VD: "Phan Mai Thị Ái Trâm - 12277" -> Xóa "12277"
                if (realName.includes(cleanCode)) {
                    realName = realName.replace(cleanCode, '');
                }
                // Xóa dấu gạch ngang/khoảng trắng thừa ở cuối chuỗi
                realName = realName.replace(/[-–—\s]+$/, '').trim();

                // Cập nhật biến hiển thị
                displayInfo = {
                    name: realName,
                    code: cleanCode,
                    dept: realDept
                };
                // -------------------------------

                // Lấy cấu hình tên cột hiển thị
                let columnSettings = settingsService.loadPastedCompetitionViewSettings();
                if (!columnSettings || columnSettings.length === 0) {
                     columnSettings = settingsService.loadPastedCompetitionViewSettings(); 
                }
                
                const activeColumns = columnSettings
                    .filter(col => col.visible)
                    .map(col => ({
                        ...col,
                        label: $competitionNameMappings[col.tenGoc] || col.label || col.tenGoc
                    }));

                // Tính Trung bình bộ phận
                const deptEmployees = allReportData.filter(e => e.boPhan === rawEmp.boPhan);
                const deptAvgs = {};
                
                activeColumns.forEach(col => {
                    let sum = 0;
                    let count = 0;
                    deptEmployees.forEach(e => {
                        const comp = e.competitions.find(c => c.tenGoc === col.tenGoc);
                        if (comp && comp.giaTri > 0) {
                            sum += comp.giaTri;
                            count++;
                        }
                    });
                    deptAvgs[col.tenGoc] = count > 0 ? sum / count : 0;
                });

                // Phân loại chỉ số
                let datList = [], ganDatList = [], canCoGangList = [];
                activeColumns.forEach(col => {
                    const compData = employee.competitions.find(c => c.tenGoc === col.tenGoc);
                    const val = compData ? compData.giaTri : 0;
                    const avg = deptAvgs[col.tenGoc] || 0;
                    
                    if (avg > 0 || val > 0) {
                        const item = {
                            name: col.label,
                            value: val,
                            avg: avg,
                            diff: val - avg,
                            percentOfAvg: avg > 0 ? (val / avg) * 100 : 0
                        };

                        if (val >= avg) {
                            datList.push(item);
                        } else if (item.percentOfAvg >= 70) {
                            ganDatList.push(item);
                        } else {
                            canCoGangList.push(item);
                        }
                    }
                });

                stats = {
                    dat: datList.sort((a,b) => b.percentOfAvg - a.percentOfAvg),
                    ganDat: ganDatList.sort((a,b) => b.percentOfAvg - a.percentOfAvg),
                    canCoGang: canCoGangList.sort((a,b) => a.percentOfAvg - b.percentOfAvg),
                    summary: {
                        total: datList.length + ganDatList.length + canCoGangList.length,
                        dat: datList.length,
                        ganDat: ganDatList.length,
                        canCoGang: canCoGangList.length,
                        rate: 0
                    }
                };
                stats.summary.rate = stats.summary.total > 0 
                    ? (stats.summary.dat / stats.summary.total) * 100 
                    : 0;
            }
        }
    }

    function goBack() {
        dispatch('back');
    }

    // [QUAN TRỌNG] Kích hoạt icon sau khi render
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
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">Tỷ lệ đạt (trên nhóm có TB)</p>
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
                        <div class="bg-white p-4 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                            <h4 class="font-bold text-gray-800 mb-2 truncate" title={item.name}>{item.name}</h4>
                            <div class="w-full bg-gray-100 rounded-full h-2 mb-3">
                                <div class="bg-blue-500 h-2 rounded-full" style="width: 100%"></div>
                            </div>
                            <div class="text-xs space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Thực hiện:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.value)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">TB Bộ phận:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.avg)}</span>
                                </div>
                                <div class="flex justify-between border-t border-dashed border-gray-200 pt-1 mt-1">
                                    <span class="text-gray-500">Chênh lệch:</span>
                                    <span class="font-bold text-green-600">+{formatters.formatNumber(item.diff)}</span>
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
                                    <span class="text-gray-500">TB Bộ phận:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.avg)}</span>
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
                                    <span class="text-gray-500">TB Bộ phận:</span>
                                    <span class="font-bold text-gray-800">{formatters.formatNumber(item.avg)}</span>
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