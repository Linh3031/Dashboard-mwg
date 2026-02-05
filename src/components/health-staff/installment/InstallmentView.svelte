<script>
    import { ycxData, selectedWarehouse, danhSachNhanVien } from '../../../stores.js';
    import { processInstallmentReport } from '../../../services/reports/installment.report.js';
    import { formatters } from '../../../utils/formatters.js';
    import InstallmentDetailModal from './InstallmentDetailModal.svelte';

    export let reportData = [];
    export let inputData = undefined;
    // Input cho Realtime

    let viewData = {
        kpi: { totalOrders: 0, totalInstallment: 0, totalSuccess: 0, approvalRate: 0 },
        employees: []
    };
    let isModalOpen = false;
    let selectedEmployee = null;
    let sortKey = 'installmentTotal';
    let sortDirection = 'desc';

    const smartMapOrders = (rawOrders, employees) => {
        const empMap = {};
        employees.forEach(e => {
            const empObj = {
                ...e,
                orders: [],
                stats: { 
                    ...e.stats, 
                    totalRevenue: 0,
                    installmentTotal: 0, installmentSuccess: 0, installmentFail: 0, 
                    installmentRevenueRaw: 0, installmentRevenueWeighted: 0 
                }
            };
            
            if (e.maNV) {
                const key = e.maNV.toString().trim();
                empMap[key] = empObj;
            }
        });

        rawOrders.forEach(order => {
            const creator = order.nguoiTao || '';
            let foundEmp = null;
            const matchId = creator.match(/(\d+)/); 
            if (matchId && matchId[1]) {
                const extractedId = matchId[1];
                if (empMap[extractedId]) foundEmp = empMap[extractedId];
            }
            if (foundEmp) {
                foundEmp.orders.push(order);
            }
        });

        return Object.values(empMap).filter(e => e.orders.length > 0);
    };

    function handleSort(key) {
        if (sortKey === key) {
            sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            sortKey = key;
            sortDirection = 'desc';
        }
    }

    // Reactive Logic
    $: {
        const sourceData = inputData !== undefined ? inputData : $ycxData;
        if (sourceData.length > 0 && $danhSachNhanVien.length > 0) {
            let targetEmployees = $danhSachNhanVien;
            if ($selectedWarehouse) {
                targetEmployees = targetEmployees.filter(e => (e.maKho || e.boPhan || '') == $selectedWarehouse);
            }
            const employeesWithOrders = smartMapOrders(sourceData, targetEmployees);
            viewData = processInstallmentReport(employeesWithOrders);
        } else {
            viewData = { kpi: { totalOrders: 0, totalInstallment: 0, totalSuccess: 0, approvalRate: 0 }, employees: [] };
        }
    }

    // [GENESIS FIX] Sửa logic tính %: Dùng doanh thu ĐÃ QUY ĐỔI (Weighted) chia cho Tổng doanh thu
    const calcInstallmentPercent = (emp) => {
        if (!emp.stats.totalRevenue || emp.stats.totalRevenue === 0) return 0;
        return (emp.stats.installmentRevenueWeighted / emp.stats.totalRevenue) * 100;
    };

    $: sortedEmployees = [...viewData.employees].sort((a, b) => {
        let valA, valB;
        switch (sortKey) {
            case 'hoTen': 
                valA = a.hoTen || ''; valB = b.hoTen || ''; break;
            case 'totalOrders':
                valA = a.processedCustomers.reduce((sum, c) => sum + c.totalOrders, 0); 
                valB = b.processedCustomers.reduce((sum, c) => sum + c.totalOrders, 0); break;
            case 'totalRevenue': 
                valA = a.stats.totalRevenue; valB = b.stats.totalRevenue; break;
            case 'installmentRevenueWeighted': 
                valA = a.stats.installmentRevenueWeighted; valB = b.stats.installmentRevenueWeighted; break;
            case 'installmentPercent': 
                valA = calcInstallmentPercent(a); valB = calcInstallmentPercent(b); break;
            case 'approvalRate':
                valA = parseFloat(a.stats.approvalRate); valB = parseFloat(b.stats.approvalRate); break;
            default:
                valA = a.stats[sortKey] || 0; valB = b.stats[sortKey] || 0;
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    function openDetail(employee) {
        selectedEmployee = {
            ...employee,
            name: formatters.getShortEmployeeName(employee.hoTen, employee.maNV)
        };
        isModalOpen = true;
    }
    function closeDetail() { isModalOpen = false; selectedEmployee = null; }
</script>

<div class="space-y-6" data-capture-preset="mobile-portrait">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div class="text-gray-500 text-sm font-medium uppercase">Tổng đơn hàng</div>
            <div class="mt-2 text-3xl font-bold text-gray-800">{viewData.kpi.totalOrders}</div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div class="text-gray-500 text-sm font-medium uppercase">Hồ sơ Trả chậm</div>
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
            <div class="text-xs text-gray-400 mt-1">trên tổng hồ sơ trả chậm</div>
        </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 class="font-bold text-gray-700">Chi tiết theo nhân viên</h3>
            <span class="text-xs text-gray-500 italic">* Click tiêu đề để sắp xếp</span>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left border-collapse">
                <thead class="bg-gray-100 text-gray-600 font-semibold uppercase text-xs sticky top-0">
                    <tr>
                        <th class="p-3 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('hoTen')}>
                            Nhân viên {sortKey === 'hoTen' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b border-r border-gray-200 text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('totalOrders')}>
                            Tổng đơn {sortKey === 'totalOrders' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b border-r border-gray-200 text-center bg-purple-50 cursor-pointer hover:bg-purple-100 transition select-none" on:click={() => handleSort('installmentTotal')}>
                            SL Trả chậm {sortKey === 'installmentTotal' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b border-r border-gray-200 text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('installmentSuccess')}>
                            SL Đậu {sortKey === 'installmentSuccess' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b border-r border-gray-200 text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('installmentFail')}>
                            Rớt/Hủy {sortKey === 'installmentFail' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b border-r border-gray-200 text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('approvalRate')}>
                            Tỷ lệ duyệt {sortKey === 'approvalRate' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('totalRevenue')}>
                            DT Thực {sortKey === 'totalRevenue' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('installmentRevenueWeighted')}>
                            DT Trả chậm (130%) {sortKey === 'installmentRevenueWeighted' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th class="p-3 border-b border-gray-200 text-center cursor-pointer hover:bg-gray-200 transition select-none" on:click={() => handleSort('installmentPercent')}>
                            % Trả chậm {sortKey === 'installmentPercent' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    {#each sortedEmployees as emp}
                        <tr class="hover:bg-blue-50 transition-colors group">
                            <td class="p-3 font-medium text-blue-700 cursor-pointer border-r border-gray-200" on:click={() => openDetail(emp)}>
                                {formatters.getShortEmployeeName(emp.hoTen, emp.maNV)}
                            </td>
                            <td class="p-3 text-center text-gray-600 border-r border-gray-200">
                                {emp.processedCustomers.reduce((sum, c) => sum + c.totalOrders, 0)}
                            </td>
                            <td class="p-3 text-center bg-purple-50 font-bold text-purple-700 border-r border-gray-200">{emp.stats.installmentTotal}</td>
                            <td class="p-3 text-center text-green-600 font-bold border-r border-gray-200">{emp.stats.installmentSuccess}</td>
                            <td class="p-3 text-center text-red-500 border-r border-gray-200">{emp.stats.installmentFail}</td>
                            <td class="p-3 text-center border-r border-gray-200">
                                <span class="px-2 py-1 rounded text-xs font-bold {parseFloat(emp.stats.approvalRate) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                    {emp.stats.approvalRate}%
                                </span>
                            </td>
                            <td class="p-3 text-right text-gray-800 font-medium border-r border-gray-200">
                                {(emp.stats.totalRevenue / 1000000).toFixed(1)}
                            </td>
                            <td class="p-3 text-right font-medium text-gray-800 border-r border-gray-200">
                                {(emp.stats.installmentRevenueWeighted / 1000000).toFixed(1)}
                            </td>
                            <td class="p-3 text-center font-bold text-blue-600">
                                {calcInstallmentPercent(emp).toFixed(1)}%
                            </td>
                        </tr>
                    {/each}
                    {#if sortedEmployees.length === 0}
                    <tr><td colspan="9" class="p-8 text-center text-gray-400">Không có dữ liệu</td></tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</div>

<InstallmentDetailModal isOpen={isModalOpen} employee={selectedEmployee} on:close={closeDetail} />