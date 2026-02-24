<script>
    import { modalState, pastedThiDuaReportData, danhSachNhanVien, selectedWarehouse } from '../../stores.js';
    import { formatters } from '../../utils/formatters.js';
    import { afterUpdate } from 'svelte';

    $: isOpen = $modalState.activeModal === 'st-emp-competition-modal';
    $: payload = $modalState.payload || {};
    $: targetProgram = payload.targetProgram || ''; 
    $: displayTitle = payload.title || targetProgram;
    $: totalTarget = payload.totalTarget || 0;

    // Biến lưu trạng thái đếm nhân sự để hiển thị ra UI
    let currentEmployeeCount = 1;
    let currentPersonalTarget = 0;

    // [MODIFIED] Logic tính Target và lấy Lũy kế thực tế
    $: employeeList = (() => {
        if (!isOpen || !targetProgram) return [];

        // 1. TÍNH TOÁN "MẪU SỐ" (SỐ LƯỢNG NHÂN SỰ VÀ TARGET CÁ NHÂN)
        let validEmployees = $danhSachNhanVien || [];
        if ($selectedWarehouse) {
            validEmployees = validEmployees.filter(nv => nv.maKho === $selectedWarehouse);
        }
        
        currentEmployeeCount = validEmployees.length > 0 ? validEmployees.length : 1; 
        currentPersonalTarget = Math.round(totalTarget / currentEmployeeCount);

        if (!$pastedThiDuaReportData || $pastedThiDuaReportData.length === 0) return [];

        let results = [];
        const searchKey = String(targetProgram).normalize('NFC').trim().toLowerCase();

        // 2. TÌM LŨY KẾ THỰC TẾ TRONG DATA DÁN
        $pastedThiDuaReportData.forEach((emp) => {
            let progData = null;

            // Quét array emp.competitions
            if (Array.isArray(emp.competitions)) {
                progData = emp.competitions.find(p => 
                    (p.tenNganhHang && String(p.tenNganhHang).normalize('NFC').trim().toLowerCase() === searchKey) ||
                    (p.tenGoc && String(p.tenGoc).normalize('NFC').trim().toLowerCase() === searchKey)
                );
            }

            // Quét array emp.programs
            if (!progData && Array.isArray(emp.programs)) {
                progData = emp.programs.find(p => p.name && String(p.name).normalize('NFC').trim().toLowerCase() === searchKey);
            }
            
            // Quét object emp.programs
            else if (!progData && emp.programs && typeof emp.programs === 'object') {
                const key = Object.keys(emp.programs).find(k => String(k).normalize('NFC').trim().toLowerCase() === searchKey);
                if (key) progData = emp.programs[key];
            }
            
            // Quét thẳng ở root object
            if (!progData) {
                const key = Object.keys(emp).find(k => String(k).normalize('NFC').trim().toLowerCase() === searchKey);
                if (key) progData = emp[key];
            }
            
            // Quét mờ (contains)
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

                // 3. CHỈ LẤY "THỰC TẾ", BỎ "TARGET" VÀ "TYLE" CỦA DATA DÁN
                const luyKe = parseFloat(normData['thuchien'] ?? normData['luyke'] ?? normData['doanhthu'] ?? normData['soluong'] ?? normData['actual'] ?? progData[0] ?? 0);
                
                // 4. TỰ ĐỘNG TÍNH LẠI % HOÀN THÀNH
                let tyLe = 0;
                if (currentPersonalTarget > 0) {
                    tyLe = (luyKe / currentPersonalTarget) * 100;
                } else if (luyKe > 0) {
                    tyLe = 100;
                }

                // Chỉ đưa người này vào bảng xếp hạng nếu họ có làm phát sinh Lũy kế HOẶC Target lớn hơn 0
                if (currentPersonalTarget > 0 || luyKe > 0) {
                    results.push({
                        maNV: emp.maNV || emp.id || 'N/A',
                        hoTen: emp.hoTen || emp.name || emp.ten || 'Chưa cập nhật',
                        luyKe, 
                        target: currentPersonalTarget, // Target đã được chia tự động
                        tyLe
                    });
                }
            }
        });

        // 5. SẮP XẾP LẠI THEO % MỚI TÍNH TỪ CAO XUỐNG THẤP
        return results.sort((a, b) => b.tyLe - a.tyLe);
    })();

    function close() {
        modalState.update(s => ({ ...s, activeModal: null, payload: null }));
    }

    function getRowColor(tyLe) {
        if (tyLe >= 100) return 'bg-emerald-50 text-emerald-800 border-emerald-100';
        if (tyLe >= 80) return 'bg-blue-50 text-blue-800 border-blue-100';
        if (tyLe >= 50) return 'bg-yellow-50 text-yellow-800 border-yellow-100';
        return 'bg-red-50 text-red-800 border-red-100';
    }

    afterUpdate(() => { if (typeof feather !== 'undefined' && isOpen) feather.replace(); });
</script>

{#if isOpen}
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in" on:click={close}>
       <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] mx-4" on:click|stopPropagation>
           
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
               <button on:click={close} class="p-2 hover:bg-slate-200 rounded-full transition-colors">
                   <i data-feather="x" class="w-5 h-5 text-slate-500"></i>
               </button>
           </div>
           
           <div class="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-grow">
                {#if employeeList.length === 0}
                    <div class="py-12 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                        <i data-feather="inbox" class="w-10 h-10 mx-auto mb-3 opacity-50"></i>
                        <p class="font-medium text-slate-600">Chưa trích xuất được dữ liệu nhân viên.</p>
                        <p class="text-sm mt-2">Đảm bảo bạn đã dán Data ở Tab Thi Đua NV Lũy Kế.</p>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {#each employeeList as emp, index}
                            {@const style = getRowColor(emp.tyLe)}
                            <div class="flex items-center justify-between p-3 rounded-lg border shadow-sm {style} transition-transform hover:-translate-y-0.5">
                                <div class="flex items-center gap-3">
                                    <div class="font-black text-lg opacity-40 w-6 text-center">#{index + 1}</div>
                                    <div>
                                        <div class="font-bold text-sm">{emp.hoTen}</div>
                                        <div class="text-xs opacity-80 uppercase tracking-wider font-semibold">{emp.maNV}</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-xl font-black">{formatters.formatPercentage(emp.tyLe / 100)}</div>
                                    <div class="text-[10px] font-semibold opacity-80">
                                        {formatters.formatNumberOrDash(emp.luyKe)} / {formatters.formatNumberOrDash(emp.target)}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
           </div>

           <div class="px-6 py-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs text-slate-500">
               <span>Tổng cộng: <strong>{employeeList.length}</strong> nhân sự tham gia</span>
               <button on:click={close} class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors">Đóng</button>
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
</style>