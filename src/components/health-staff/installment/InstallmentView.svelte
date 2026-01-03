<script>
    import { ycxData, selectedWarehouse, danhSachNhanVien } from '../../../stores.js';
    import { processInstallmentReport } from '../../../services/reports/installment.report.js';
    import InstallmentDetailModal from './InstallmentDetailModal.svelte';

    // Props nhận từ cha (nhưng dùng Store để lấy data thô đầy đủ)
    export let reportData = [];

    // State nội bộ
    let viewData = {
        kpi: { totalOrders: 0, totalInstallment: 0, totalSuccess: 0, approvalRate: 0 },
        employees: []
    };
    
    // State UI
    let isModalOpen = false;
    let selectedEmployee = null;
    let sortKey = 'installmentTotal'; // Mặc định sort theo số lượng đơn trả góp
    let sortDirection = 'desc';       // Mặc định giảm dần

    // --- LOGIC MAPPING (Giữ nguyên từ bước trước) ---
    const smartMapOrders = (rawOrders, employees) => {
        const empMap = {}; 
        
        employees.forEach(e => {
            const empObj = {
                ...e,
                orders: [],
                stats: { 
                    ...e.stats, 
                    installmentTotal: 0, installmentSuccess: 0, installmentFail: 0, installmentRevenue: 0 
                }
            };
            if (e.maNV) empMap[e.maNV.toString().trim()] = empObj;
            if (e.hoTen) empMap[e.hoTen.toString().trim().toLowerCase()] = empObj;
        });

        rawOrders.forEach(order => {
            const creator = order.nguoiTao || '';
            let foundEmp = null;
            const matchId = creator.match(/(\d+)/); 
            
            if (matchId && matchId[1]) {
                const extractedId = matchId[1];
                if (empMap[extractedId]) foundEmp = empMap[extractedId];
            }
            if (!foundEmp) {
                const cleanName = creator.trim().toLowerCase();
                if (empMap[cleanName]) foundEmp = empMap[cleanName];
            }

            if (foundEmp) foundEmp.orders.push(order);
        });

        return Object.values(empMap).filter((e, index, self) => 
            index === self.findIndex(t => t.maNV === e.maNV)
        );
    };

    // --- LOGIC SORT ---
    function handleSort(key) {
        if (sortKey === key) {
            sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            sortKey = key;
            sortDirection = 'desc';
        }
    }

    // Reactive: Tính toán dữ liệu
    $: {
        if ($ycxData.length > 0 && $danhSachNhanVien.length > 0) {
            let targetEmployees = $danhSachNhanVien;
            if ($selectedWarehouse) {
                targetEmployees = targetEmployees.filter(e => e.maKho == $selectedWarehouse);
            }

            const employeesWithOrders = smartMapOrders($ycxData, targetEmployees);
            viewData = processInstallmentReport(employeesWithOrders);
        } else {
            viewData = { kpi: { totalOrders: 0, totalInstallment: 0, totalSuccess: 0, approvalRate: 0 }, employees: [] };
        }
    }

    // Reactive: Sắp xếp danh sách hiển thị
    $: sortedEmployees = [...viewData.employees].sort((a, b) => {
        let valA, valB;

        // Map key sang giá trị thực tế
        switch (sortKey) {
            case 'name':
                valA = a.name; valB = b.name;
                break;
            case 'totalOrders':
                valA = a.orders.length; valB = b.orders.length;
                break;
            case 'approvalRate':
                valA = parseFloat(a.stats.approvalRate); valB = parseFloat(b.stats.approvalRate);
                break;
            default: // Các trường số trong stats
                valA = a.stats[sortKey] || 0; valB = b.stats[sortKey] || 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    function openDetail(employee) {
        selectedEmployee = employee;
        isModalOpen = true;
    }

    function closeDetail() {
        isModalOpen = false;
        selectedEmployee = null;
    }
</script>

<div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div class="text-gray-500 text-sm font-medium uppercase">Tổng đơn hàng</div>
            <div class="mt-2 text-3xl font-bold text-gray-800">{viewData.kpi.totalOrders}</div>
        </div>

        <div class="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div class="text-gray-500 text-sm font-medium uppercase">Hồ sơ Trả góp</div>
            <div class="mt-2 text-3xl font-bold text-purple-600">{viewData.kpi.totalInstallment}</div>
        </div>

        <div class="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div class="text-gray-500 text-sm font-medium uppercase">Đậu / Đã thu</div>
            <div class="mt-2 text-3xl font-bold text-green-600">{viewData.kpi.totalSuccess}</div>
            <div class="text-xs text-gray-400 mt-1">Đã trừ đơn hủy</div>
        </div>

        <div class="bg-white p-4 rounded-lg shadow border-l-4 {parseFloat(viewData.kpi.approvalRate) >= 50 ? 'border-teal-500' : 'border-red-500'}">
            <div class="text-gray-500 text-sm font-medium uppercase">Tỷ lệ duyệt</div>
            <div class="mt-2 flex items-baseline gap-2">
                <span class="text-3xl font-bold {parseFloat(viewData.kpi.approvalRate) >= 50 ? 'text-teal-600' : 'text-red-600'}">
                    {viewData.kpi.approvalRate}%
                </span>
            </div>
            <div class="text-xs text-gray-400 mt-1">trên tổng hồ sơ trả góp</div>
        </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 class="font-bold text-gray-700">Chi tiết theo nhân viên</h3>
            <span class="text-xs text-gray-500 italic">* Click tiêu đề để sắp xếp</span>
        </div>
        
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-100 text-gray-600 font-semibold uppercase text-xs sticky top-0">
                    <tr>
                        <th class="p-3 border-b cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('name')}>
                            Nhân viên {sortKey === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        
                        <th class="p-3 border-b text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('totalOrders')}>
                            Tổng đơn {sortKey === 'totalOrders' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b text-center bg-purple-50 cursor-pointer hover:bg-purple-100 transition select-none" on:click={() => handleSort('installmentTotal')}>
                            SL Trả góp {sortKey === 'installmentTotal' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('installmentSuccess')}>
                            SL Đậu {sortKey === 'installmentSuccess' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('installmentFail')}>
                            SL Rớt/Hủy {sortKey === 'installmentFail' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('approvalRate')}>
                            Tỷ lệ duyệt {sortKey === 'approvalRate' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        
                        <th class="p-3 border-b text-right cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('installmentRevenue')}>
                            Doanh thu TG (Thực) {sortKey === 'installmentRevenue' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    {#each sortedEmployees as emp}
                        <tr class="hover:bg-blue-50 transition-colors group">
                            <td class="p-3 font-medium text-blue-700 cursor-pointer" on:click={() => openDetail(emp)}>
                                {emp.name} 
                                <span class="text-xs text-gray-400 ml-1 font-normal">- {emp.id}</span>
                            </td>
                            
                            <td class="p-3 text-center text-gray-600">{emp.orders.length}</td>
                            <td class="p-3 text-center bg-purple-50 font-bold text-purple-700">{emp.stats.installmentTotal}</td>
                            <td class="p-3 text-center text-green-600 font-bold">{emp.stats.installmentSuccess}</td>
                            <td class="p-3 text-center text-red-500">{emp.stats.installmentFail}</td>
                            <td class="p-3 text-center">
                                <span class="px-2 py-1 rounded text-xs font-bold {parseFloat(emp.stats.approvalRate) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                    {emp.stats.approvalRate}%
                                </span>
                            </td>
                            
                            <td class="p-3 text-right font-mono font-medium text-gray-800">
                                {new Intl.NumberFormat('vi-VN').format(emp.stats.installmentRevenue)}
                            </td>
                        </tr>
                    {/each}
                    {#if sortedEmployees.length === 0}
                        <tr>
                            <td colspan="7" class="p-8 text-center text-gray-400">
                                Không có dữ liệu
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</div>

<InstallmentDetailModal isOpen={isModalOpen} employee={selectedEmployee} on:close={closeDetail} />