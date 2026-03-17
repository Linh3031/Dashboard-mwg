<script>
    import { modalState, pastedThiDuaReportData, danhSachNhanVien, selectedWarehouse } from '../../stores.js';
    import { formatters } from '../../utils/formatters.js';
    import { afterUpdate } from 'svelte';
    import { captureService } from '../../services/capture.service.js';

    $: isOpen = $modalState.activeModal === 'st-emp-competition-modal';
    $: payload = $modalState.payload || {};
    $: targetProgram = payload.targetProgram || ''; 
    $: displayTitle = payload.title || targetProgram;
    $: totalTarget = payload.totalTarget || 0;
    
    let currentEmployeeCount = 1;
    let currentPersonalTarget = 0;
    
    let captureNode;

    // 1. Logic xử lý Data (Tính Target & Lấy Lũy kế Thực tế)
    $: employeeList = (() => {
        if (!isOpen || !targetProgram) return [];

        let validEmployees = $danhSachNhanVien || [];
        if ($selectedWarehouse) {
            validEmployees = validEmployees.filter(nv => nv.maKho === $selectedWarehouse);
        }
        
        currentEmployeeCount = validEmployees.length > 0 ? validEmployees.length : 1; 
        currentPersonalTarget = Math.round(totalTarget / currentEmployeeCount);

        if (!$pastedThiDuaReportData || $pastedThiDuaReportData.length === 0) return [];

        let results = [];
        const searchKey = String(targetProgram).normalize('NFC').trim().toLowerCase();

        $pastedThiDuaReportData.forEach((emp) => {
            let progData = null;

            if (Array.isArray(emp.competitions)) {
                progData = emp.competitions.find(p => 
                    (p.tenNganhHang && String(p.tenNganhHang).normalize('NFC').trim().toLowerCase() === searchKey) ||
                    (p.tenGoc && String(p.tenGoc).normalize('NFC').trim().toLowerCase() === searchKey)
                );
            }
            if (!progData && Array.isArray(emp.programs)) {
                progData = emp.programs.find(p => p.name && String(p.name).normalize('NFC').trim().toLowerCase() === searchKey);
            }
            else if (!progData && emp.programs && typeof emp.programs === 'object') {
                const key = Object.keys(emp.programs).find(k => String(k).normalize('NFC').trim().toLowerCase() === searchKey);
                if (key) progData = emp.programs[key];
            }
            if (!progData) {
                const key = Object.keys(emp).find(k => String(k).normalize('NFC').trim().toLowerCase() === searchKey);
                if (key) progData = emp[key];
            }
            if (!progData && Array.isArray(emp.competitions)) {
                 progData = emp.competitions.find(p => 
                    (p.tenNganhHang && String(p.tenNganhHang).normalize('NFC').trim().toLowerCase().includes(searchKey)) ||
                    (p.tenGoc && String(p.tenGoc).normalize('NFC').trim().toLowerCase().includes(searchKey))
                 );
            }
            
            if (progData) {
                const normData = {};
                if (typeof progData === 'object' && progData !== null) {
                    Object.keys(progData).forEach(k => { normData[k.toLowerCase()] = progData[k]; });
                }

                const luyKe = parseFloat(normData['thuchien'] ?? normData['luyke'] ?? normData['doanhthu'] ?? normData['soluong'] ?? normData['actual'] ?? progData[0] ?? 0);
                let tyLe = 0;
                if (currentPersonalTarget > 0) {
                    tyLe = (luyKe / currentPersonalTarget) * 100;
                } else if (luyKe > 0) {
                    tyLe = 100;
                }

                if (currentPersonalTarget > 0 || luyKe > 0) {
                    // [FIXED] Chặt bỏ phần mã nhân viên bị dính vào đuôi tên từ file data dán
                    let rawHoTen = emp.hoTen || emp.name || emp.ten || 'Chưa cập nhật';
                    let cleanHoTen = rawHoTen.split(' - ')[0].trim();
                    results.push({
                        maNV: emp.maNV || emp.id || 'N/A',
                        hoTen: cleanHoTen,
                        luyKe, 
                        target: currentPersonalTarget, 
                        tyLe
                    });
                }
            }
        });
        return results.sort((a, b) => b.tyLe - a.tyLe);
    })();

    // 2. Phân tách danh sách theo UI/Gamification
    $: topCount = employeeList.length <= 15 ? 3 : 5;
    $: topPerformers = employeeList.slice(0, topCount);
    $: restOfList = employeeList.slice(topCount);
    // Tự động chia 2 hoặc 3 cột cho danh sách còn lại
    $: gridClass = employeeList.length <= 10 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

    function close() {
        modalState.update(s => ({ ...s, activeModal: null, payload: null }));
    }

    async function handleCapture() {
        if (!captureNode) return;
        
        // preset-mobile-portrait ép chiều rộng 480px (giao diện điện thoại)
        // capture-layout-container giúp tương thích với engine mở rộng chiều cao
        const presetClasses = 'preset-mobile-portrait capture-layout-container';
        const fileName = `ThiDua_${displayTitle}`;
        
        await captureService.captureAndDownload(captureNode, fileName, presetClasses);
    }

    // Style cho các thẻ Compact (Danh sách dưới)
    function getCompactRowColor(tyLe) {
        if (tyLe >= 100) return 'bg-emerald-50 text-emerald-800 border-emerald-100';
        if (tyLe >= 80) return 'bg-blue-50 text-blue-800 border-blue-100';
        if (tyLe >= 50) return 'bg-yellow-50 text-yellow-800 border-yellow-100';
        return 'bg-red-50 text-red-800 border-red-100';
    }

    // Style cho thẻ Vinh Danh Top (Danh sách trên)
    function getRankStyle(index) {
        if (index === 0) return { bg: 'bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-300 shadow-sm', text: 'text-yellow-700', icon: '🏆', rankText: 'text-yellow-600' };
        if (index === 1) return { bg: 'bg-gradient-to-br from-slate-200 to-slate-100 border-slate-300 shadow-sm', text: 'text-slate-700', icon: '🥈', rankText: 'text-slate-500' };
        if (index === 2) return { bg: 'bg-gradient-to-br from-orange-100 to-orange-50 border-orange-300 shadow-sm', text: 'text-orange-800', icon: '🥉', rankText: 'text-orange-600' };
        return { bg: 'bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm', text: 'text-blue-700', icon: '⭐', rankText: 'text-blue-500' };
    }

    afterUpdate(() => { if (typeof feather !== 'undefined' && isOpen) feather.replace(); });
</script>

{#if isOpen}
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in" on:click={close}>
       <div bind:this={captureNode} class="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] mx-4 st-emp-capture-node" on:click|stopPropagation>
           
           <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
               <div class="flex items-center gap-3">
                   <div class="p-2 bg-blue-100 text-blue-600 rounded-lg">
                       <i data-feather="users" class="w-5 h-5"></i>
                   </div>
                   <div>
                       <h3 class="text-xl font-bold text-slate-800 leading-tight">
                           Thi Đua: <span class="text-blue-700">{displayTitle}</span>
                       </h3>
                       <p class="text-xs text-slate-500 mt-0.5">
                           Chỉ tiêu chia đều cho <strong>{currentEmployeeCount} nhân sự</strong> (Target: <span class="text-blue-600 font-bold">{formatters.formatNumberOrDash(currentPersonalTarget)}</span>/người)
                       </p>
                   </div>
               </div>
               
               <div class="flex items-center gap-2" data-html2canvas-ignore="true">
                   <button on:click={handleCapture} class="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-full transition-colors" title="Chụp ảnh (Mobile)">
                       <i data-feather="camera" class="w-5 h-5"></i>
                   </button>
                   <button on:click={close} class="p-2 hover:bg-slate-200 rounded-full transition-colors" title="Đóng">
                       <i data-feather="x" class="w-5 h-5 text-slate-500"></i>
                   </button>
               </div>
           </div>
           
           <div class="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-grow">
                {#if employeeList.length === 0}
                    <div class="py-12 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                        <i data-feather="inbox" class="w-10 h-10 mx-auto mb-3 opacity-50"></i>
                        <p class="font-medium text-slate-600">Chưa trích xuất được dữ liệu nhân viên.</p>
                        <p class="text-sm mt-2">Đảm bảo bạn đã dán Data ở Tab Thi Đua NV Lũy Kế.</p>
                    </div>
                {:else}
                    {#if topPerformers.length > 0}
                        <div class="mb-6">
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <i data-feather="award" class="w-4 h-4 text-yellow-500"></i> Vinh danh dẫn đầu
                            </h4>
                            <div class="grid gap-3 {topCount === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}">
                                {#each topPerformers as emp, index}
                                    {@const rankConfig = getRankStyle(index)}
                                    <div class="flex flex-col p-4 rounded-xl border {rankConfig.bg} transition-transform hover:-translate-y-1 relative overflow-hidden group">
                                        <div class="absolute -right-2 -bottom-4 text-6xl font-black opacity-10 {rankConfig.rankText} select-none">#{index + 1}</div>
                                        
                                        <div class="flex items-start justify-between mb-2 relative z-10">
                                            <span class="text-lg" title="Hạng {index + 1}">{rankConfig.icon}</span>
                                            <div class="text-2xl font-black {rankConfig.text} leading-none">{formatters.formatPercentage(emp.tyLe / 100)}</div>
                                        </div>
                                        
                                        <div class="relative z-10 mt-auto">
                                            <div class="font-bold text-sm text-slate-800 truncate" title="{emp.hoTen}">
                                                {formatters.getShortEmployeeName(emp.hoTen, emp.maNV)}
                                            </div>
                                            <div class="text-[11px] font-semibold text-slate-500 mt-1">
                                                <span class="text-slate-700">{formatters.formatNumberOrDash(emp.luyKe)}</span> / {formatters.formatNumberOrDash(emp.target)}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if restOfList.length > 0}
                        <div>
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <i data-feather="list" class="w-4 h-4"></i> Danh sách chi tiết
                            </h4>
                            <div class="grid gap-2 {gridClass}">
                                {#each restOfList as emp, index}
                                    {@const actualIndex = index + topCount}
                                    {@const style = getCompactRowColor(emp.tyLe)}
                                    <div class="flex items-center justify-between p-2.5 px-3 rounded-lg border shadow-sm {style} hover:brightness-95 transition-all">
                                        <div class="flex items-center gap-3 overflow-hidden">
                                            <div class="font-black text-sm opacity-40 w-5 text-left shrink-0">#{actualIndex + 1}</div>
                                            <div class="truncate">
                                                <div class="font-bold text-xs truncate" title="{emp.hoTen}">
                                                    {formatters.getShortEmployeeName(emp.hoTen, emp.maNV)}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="text-right shrink-0 ml-2">
                                            <div class="text-base font-black leading-none">{formatters.formatPercentage(emp.tyLe / 100)}</div>
                                            <div class="text-[10px] font-semibold opacity-80 mt-0.5">
                                                {formatters.formatNumberOrDash(emp.luyKe)} <span class="opacity-50">/</span> {formatters.formatNumberOrDash(emp.target)}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/if}
           </div>

           <div class="px-6 py-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs text-slate-500">
               <span>Tổng cộng: <strong>{employeeList.length}</strong> nhân sự tham gia</span>
               <button data-html2canvas-ignore="true" on:click={close} class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors">Đóng</button>
           </div>
       </div>
    </div>
{/if}

<style>
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    /* --- GHI ĐÈ CSS ĐỂ CHỤP FULL NỘI DUNG (ĐÃ THÊM MỎ NEO st-emp-capture-node ĐỂ CHỐNG LỖI CHÉO) --- */
    :global(.capture-container .st-emp-capture-node.max-h-\[90vh\]) {
        max-height: none !important;
        height: auto !important;
    }
    :global(.capture-container .st-emp-capture-node .overflow-y-auto),
    :global(.capture-container .st-emp-capture-node .overflow-hidden),
    :global(.capture-container .st-emp-capture-node.overflow-hidden) {
        overflow: visible !important; /* Mở khóa toàn bộ cuộn */
    }

    /* --- [FIX] SỬA LỖI BỊ XÉN ĐÁY CHỮ VÀ SỐ --- */
    /* 1. Nới lỏng khoảng cách dòng đang bị ép sát (leading-none, leading-tight) */
    :global(.capture-container .st-emp-capture-node .leading-none), 
    :global(.capture-container .st-emp-capture-node .leading-tight) {
        line-height: 1.3 !important; 
        padding-bottom: 2px !important;
    }
    
    /* 2. Tắt chế độ truncate (cắt chữ thêm dấu 3 chấm) làm ẩn mất đuôi chữ */
    :global(.capture-container .st-emp-capture-node .truncate) {
        overflow: visible !important; 
        white-space: normal !important; 
        word-break: break-word !important;
    }
    
    /* 3. Bơm thêm một chút đệm (padding) cho phần trăm và số liệu để nét vẽ không bị chạm đáy */
    :global(.capture-container .st-emp-capture-node .text-2xl),
    :global(.capture-container .st-emp-capture-node .text-base),
    :global(.capture-container .st-emp-capture-node .text-\[11px\]),
    :global(.capture-container .st-emp-capture-node .text-\[10px\]) {
        padding-bottom: 3px !important;
        display: block !important;
    }
</style>