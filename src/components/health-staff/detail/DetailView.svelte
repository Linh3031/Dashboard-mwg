<script>
  import { afterUpdate, createEventDispatcher } from 'svelte';
  import { masterReportData } from '../../../stores.js';
  import { sknvService } from '../../../services/sknv.service.js';
  
  import DetailHeader from './DetailHeader.svelte';
  import MetricGrid from './MetricGrid.svelte';
  import DetailTableQDC from './DetailTableQDC.svelte';
  import DetailTableCategory from './DetailTableCategory.svelte';
  import AddEfficiencyColumnModal from '../../modals/AddEfficiencyColumnModal.svelte';

  export let employeeId;

  const dispatch = createEventDispatcher();

  let employeeData = null;
  let rawEmployeeData = null; // Biến này quan trọng để truyền xuống bảng con
  let detailStats = {};
  let qdcData = [];
  let nganhHangData = [];
  
  let kpiCounts = {
      'Doanh thu': { above: 0, total: 0 },
      'Hiệu quả khai thác': { above: 0, total: 0 },
      'Năng suất': { above: 0, total: 0 },
      'Đơn giá': { above: 0, total: 0 }
  };
  
  let customMetrics = []; 
  let isAddModalOpen = false;
  let addModalMode = 'EFFICIENCY'; 

  $: totalAbove = Object.values(kpiCounts).reduce((sum, item) => sum + item.above, 0);
  $: totalCriteria = Object.values(kpiCounts).reduce((sum, item) => sum + item.total, 0);

  $: if (employeeId && $masterReportData.sknv.length > 0) {
      // Tìm nhân viên trong Master Data
      const rawEmployee = $masterReportData.sknv.find(e => String(e.maNV) === String(employeeId));
      
      if (rawEmployee) {
          // Lưu rawEmployee để truyền xuống 2 bảng dưới cùng
          rawEmployeeData = rawEmployee; 

          const deptAvg = sknvService.calculateDepartmentAverages(rawEmployee.boPhan, $masterReportData.sknv);
          
          if(customMetrics.length > 0) {
              const departmentEmployees = $masterReportData.sknv.filter(e => e.boPhan === rawEmployee.boPhan);
              customMetrics.forEach(m => {
                  let totalVal = 0;
                  let count = 0;
                  departmentEmployees.forEach(emp => {
                      totalVal += sknvService.calculateDynamicMetricValue(emp, m);
                      count++;
                  });
                  deptAvg[`custom_${m.id}`] = count > 0 ? totalVal / count : 0;
              });
          }

          employeeData = rawEmployee;
          detailStats = sknvService.getDetailStats(rawEmployee, deptAvg, customMetrics);

          // Data tính toán sẵn (để hiển thị mặc định)
          if (rawEmployee.qdc) {
              qdcData = Object.entries(rawEmployee.qdc)
                  .map(([id, val]) => ({ id, ...val }))
                  .filter(item => (item.sl || 0) > 0)
                  .sort((a, b) => b.dtqd - a.dtqd);
          } else { qdcData = []; }

          if (rawEmployee.doanhThuTheoNganhHang) {
              nganhHangData = Object.entries(rawEmployee.doanhThuTheoNganhHang)
                  .map(([name, val]) => ({ name, ...val }))
                  .filter(item => (item.revenue || 0) > 0)
                  .sort((a, b) => b.revenue - a.revenue);
          } else { nganhHangData = []; }
      }
  }

  function handleCountUpdate(event) {
      const { title, above, total } = event.detail;
      let key = title;
      if (title === 'Hiệu quả') key = 'Hiệu quả khai thác'; 
      if (kpiCounts[key]) {
          kpiCounts[key] = { above, total };
          kpiCounts = { ...kpiCounts };
      }
  }

  function openAddModal(mode) {
      addModalMode = mode;
      isAddModalOpen = true;
  }

  function handleSaveMetric(event) {
      const newMetric = event.detail;
      customMetrics = [...customMetrics, newMetric];
      // Gán lại để trigger reactive block chạy lại
      employeeData = { ...employeeData }; 
  }

  function goBack() { dispatch('back'); }

  afterUpdate(() => { if (window.feather) window.feather.replace(); });
</script>

<div class="animate-fade-in pb-10 max-w-7xl mx-auto">
    <div class="mb-4">
        <button on:click={goBack} class="text-blue-600 hover:underline font-semibold flex items-center gap-1">
           <i data-feather="chevron-left" class="w-4 h-4"></i> Quay lại bảng tổng hợp
        </button>
    </div>

    {#if employeeData}
        <DetailHeader employee={employeeData} {totalAbove} {totalCriteria} showStats={true} />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
            <div class="space-y-6">
                <MetricGrid 
                    title="Doanh thu" icon="trending-up" colorClass="sknv-header-blue" 
                    data={detailStats.doanhThu || []} 
                    on:updateCount={handleCountUpdate} 
                />
                
                <MetricGrid 
                    title="Hiệu quả khai thác" icon="award" colorClass="sknv-header-orange" 
                    data={detailStats.hieuQua || []} 
                    allowAdd={true}
                    on:add={() => openAddModal('EFFICIENCY')}
                    on:updateCount={handleCountUpdate} 
                />
            </div>
            <div class="space-y-6">
                <MetricGrid 
                    title="Năng suất" icon="dollar-sign" colorClass="sknv-header-green" 
                    data={detailStats.nangSuat || []} 
                    on:updateCount={handleCountUpdate} 
                />
                
                <MetricGrid 
                    title="Đơn giá" icon="tag" colorClass="sknv-header-yellow" 
                    data={detailStats.donGia || []}
                    allowAdd={true}
                    on:add={() => openAddModal('UNIT_PRICE')} 
                    on:updateCount={handleCountUpdate} 
                />
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
            <DetailTableQDC data={qdcData} rawEmployee={rawEmployeeData} />
            <DetailTableCategory data={nganhHangData} rawEmployee={rawEmployeeData} />
        </div>

    {:else}
        <div class="p-12 text-center bg-red-50 rounded-lg border border-red-200">
            <p class="text-red-600 font-semibold">Không tìm thấy dữ liệu cho nhân viên này.</p>
        </div>
    {/if}
</div>

<AddEfficiencyColumnModal 
    isOpen={isAddModalOpen} 
    mode={addModalMode}
    on:close={() => isAddModalOpen = false}
    on:save={handleSaveMetric}
/>

<style>
    :global(.sknv-header-blue) { background-color: #2563eb; }
    :global(.sknv-header-green) { background-color: #16a34a; }
    :global(.sknv-header-orange) { background-color: #f97316; }
    :global(.sknv-header-yellow) { background-color: #ca8a04; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>