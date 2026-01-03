<script>
    import { createEventDispatcher } from 'svelte';
    // Đảm bảo đường dẫn import đúng cấp
    import { ycxData } from '../../stores.js';

    // Props nhận vào từ cha
    export let isOpen = false;
    export let employeeCode = '';
    export let employeeName = '';
    export let employeeDept = '';
    export let rawData = [];

    const dispatch = createEventDispatcher();
    
    // Biến nội bộ
    let history = [];
    let summary = {
        totalErrors: 0,
        totalDeducted: 0,
        totalBonus: 0,
        finalScore: 100 
    };

    let displayInfo = {
        name: '',
        dept: ''
    };

    // Reactive: Chạy khi mở modal
    $: if (isOpen && employeeCode) {
        debugGenesis(); // Gọi hàm debug tách biệt cho gọn
        
        const cleanCode = String(employeeCode).trim();
        let found = false;

        // 1. LOGIC TRA CỨU
        if ($ycxData && $ycxData.length) {
             const emp = $ycxData.find(e => {
                // Check kỹ cả String/Number
                const codeInDb = String(e.ma_nv || e.maNV || '').trim();
                const codeInCreator = e.nguoiTao ? String(e.nguoiTao) : '';
                return codeInDb === cleanCode || codeInCreator.includes(cleanCode);
             });
             
             if (emp) {
                 const fullName = emp.ten_nv || emp.hoTen || employeeName;
                 const dept = emp.ma_kho || emp.boPhan || emp.vi_tri || employeeDept;
                 
                 displayInfo.name = fullName;
                 displayInfo.dept = dept;
                 found = true;
                 console.log('[GENESIS] -> Tìm thấy trong DB:', { fullName, dept });
             } 
        } 
        
        if (!found) {
             displayInfo.name = employeeName || '';
             displayInfo.dept = employeeDept || '';
             console.log('[GENESIS] -> Không tìm thấy, dùng Fallback:', displayInfo);
        }

        // 2. LOGIC LÀM SẠCH (Cải tiến)
        if (displayInfo.name && cleanCode) {
             let rawName = displayInfo.name;
             
             // Log trước khi clean
             console.log(`[GENESIS] -> Trước khi Clean: "${rawName}" (Code: "${cleanCode}")`);

             // Thay thế Code bằng rỗng
             if (rawName.includes(cleanCode)) {
                 rawName = rawName.replace(cleanCode, '');
             }
             
             // Xóa dấu gạch ngang ở cuối chuỗi (lặp lại nhiều lần để chắc ăn)
             // VD: "Tên - - " -> "Tên"
             rawName = rawName.replace(/[-–—\s]+$/, '');

             displayInfo.name = rawName.trim();
             console.log(`[GENESIS] -> Sau khi Clean: "${displayInfo.name}"`);
        }
        
        if (displayInfo.dept === 'Nhân viên không tìm thấy') {
            displayInfo.dept = '';
        }

        if (rawData.length > 0) {
            analyzeEmployeeData();
        } else {
            history = [];
            summary = { totalErrors: 0, totalDeducted: 0, totalBonus: 0, finalScore: 100 };
        }
    }
    
    // Hàm Debug riêng để in log
    function debugGenesis() {
        console.log("=== 🔍 DEBUG MODAL GENESIS ===");
        console.log("1. Props đầu vào:", { employeeCode, employeeName, employeeDept });
        console.log("2. Store ycxData:", { 
            exists: !!$ycxData, 
            length: $ycxData ? $ycxData.length : 0,
            sample: $ycxData && $ycxData.length > 0 ? $ycxData[0] : 'Empty'
        });
    }

    function analyzeEmployeeData() {
        const records = rawData.filter(item => item.maNV === employeeCode);
        history = records.sort((a, b) => {
            const dateA = new Date(a.ngayViPham.split('/').reverse().join('-'));
            const dateB = new Date(b.ngayViPham.split('/').reverse().join('-'));
            return dateB - dateA;
        });
        
        let errors = 0;
        let deducted = 0;
        let bonus = 0;

        history.forEach(item => {
            const point = parseFloat(item.diemTru) || 0;
            if (item.loaiViPham === 'Điểm cộng' || (item.ghiChu && item.ghiChu.includes('Điểm cộng'))) {
                 bonus += Math.abs(point);
            } else {
                 errors++;
                 deducted += Math.abs(point);
            }
        });
        summary = {
            totalErrors: errors,
            totalDeducted: deducted,
            totalBonus: bonus,
            finalScore: 100 - deducted + bonus 
        };
    }

    function close() {
        dispatch('close');
    }
</script>

{#if isOpen}
<div class="fixed top-0 left-0 z-[9999] bg-red-600 text-white p-5 text-2xl font-bold">
        CODE MỚI ĐÃ CHẠY!
    </div>
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" on:click={close}>
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" on:click|stopPropagation>
            
            <div class="bg-blue-600 text-white p-4 flex justify-between items-center">
                <div>
                    <h3 class="text-xl font-bold uppercase">{displayInfo.name} - {employeeCode}</h3>
                    {#if displayInfo.dept}
                        <p class="text-sm opacity-90">{displayInfo.dept}</p>
                    {/if}
                </div>
                <button on:click={close} class="text-white hover:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div class="p-4 bg-gray-50 border-b flex flex-wrap gap-4 justify-around text-center">
                <div class="bg-white p-3 rounded shadow-sm border border-gray-200 min-w-[150px]">
                    <span class="block text-gray-500 text-xs uppercase">Số lỗi vi phạm</span>
                    <span class="block text-2xl font-bold text-red-500">{summary.totalErrors}</span>
                </div>
                <div class="bg-white p-3 rounded shadow-sm border border-gray-200 min-w-[150px]">
                    <span class="block text-gray-500 text-xs uppercase">Tổng điểm trừ</span>
                    <span class="block text-2xl font-bold text-red-600">-{summary.totalDeducted}</span>
                </div>
                <div class="bg-white p-3 rounded shadow-sm border border-gray-200 min-w-[150px]">
                    <span class="block text-gray-500 text-xs uppercase">Tổng điểm cộng</span>
                    <span class="block text-2xl font-bold text-green-600">+{summary.totalBonus}</span>
                </div>
                 </div>

            <div class="flex-1 overflow-y-auto p-4">
                {#if history.length === 0}
                    <div class="text-center text-gray-500 py-10">Nhân viên này chưa có ghi nhận thi đua nào.</div>
                {:else}
                    <table class="min-w-full text-sm border-collapse border border-gray-200">
                        <thead class="bg-gray-100 sticky top-0 shadow-sm">
                            <tr>
                                <th class="border p-2 text-left">Ngày</th>
                                <th class="border p-2 text-left">Loại/Vi phạm</th>
                                <th class="border p-2 text-left">Nội dung chi tiết</th>
                                <th class="border p-2 text-center text-nowrap">Điểm</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each history as item}
                                <tr class="hover:bg-gray-50">
                                    <td class="border p-2 whitespace-nowrap">{item.ngayViPham}</td>
                                    <td class="border p-2 font-medium">
                                        {#if item.loaiViPham === 'Điểm cộng'}
                                            <span class="text-green-600">Điểm cộng</span>
                                        {:else}
                                            <span class="text-red-600">{item.loaiViPham || 'Vi phạm'}</span>
                                        {/if}
                                    </td>
                                    <td class="border p-2">{item.noiDung || item.tenLoi}</td>
                                    <td class="border p-2 text-center font-bold" 
                                        class:text-red-600={parseFloat(item.diemTru) < 0 || (item.loaiViPham !== 'Điểm cộng')}
                                        class:text-green-600={item.loaiViPham === 'Điểm cộng'}
                                    >
                                        {item.diemTru}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div>

            <div class="p-4 border-t bg-gray-50 text-right">
                <button on:click={close} class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-medium">
                    Đóng
                </button>
            </div>
        </div>
    </div>
{/if}