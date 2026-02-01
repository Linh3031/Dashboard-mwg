<script>
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte';
  import { masterReportData, selectedWarehouse, warehouseCustomMetrics } from '../../../stores.js';
  import { sknvService } from '../../../services/sknv.service.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  
  import DetailHeader from './DetailHeader.svelte';
  import MetricGrid from './MetricGrid.svelte';
  import DetailTableQDC from './DetailTableQDC.svelte';
  import DetailTableCategory from './DetailTableCategory.svelte';
  
  import AddEfficiencyColumnModal from '../../modals/AddEfficiencyColumnModal.svelte';
  import AddMetricModal from '../../modals/AddMetricModal.svelte';

  export let employeeId;
  const dispatch = createEventDispatcher();

  let employeeData = null;
  let rawEmployeeData = null;
  let detailStats = {};
  let qdcData = [];
  let nganhHangData = [];
  
  let kpiCounts = {
      'Doanh thu': { above: 0, total: 0 },
      'Hiệu quả khai thác': { above: 0, total: 0 },
      'Năng suất': { above: 0, total: 0 },
      'Đơn giá': { above: 0, total: 0 }
  };
  // State quản lý hiển thị Modal
  let isEffModalOpen = false;
  let isMetricModalOpen = false;
  let itemToEdit = null;
  
  // [KHÔI PHỤC] Logic cũ giữ nguyên
  $: totalAbove = Object.values(kpiCounts).reduce((sum, item) => sum + item.above, 0);
  $: totalCriteria = Object.values(kpiCounts).reduce((sum, item) => sum + item.total, 0);
  
  // [GENESIS FIX 1]: Tạo tên file dynamic dựa trên nhân viên đang xem
  $: filename = employeeData 
      ? `${employeeData.hoTen} - ${employeeData.maNV}` 
      : 'Chi_tiet_nhan_vien';

  // Logic tải dữ liệu từ Cloud khi Warehouse thay đổi
  $: if ($selectedWarehouse) {
      loadMetricsFromCloud($selectedWarehouse);
  }

  async function loadMetricsFromCloud(kho) {
      const data = await datasyncService.loadCustomMetrics(kho);
      warehouseCustomMetrics.set(data);
  }

  // Reactive: Tính toán lại khi Store metrics thay đổi HOẶC employeeId thay đổi
  $: calculateEmployeeData(employeeId, $masterReportData, $warehouseCustomMetrics);
  
  function calculateEmployeeData(id, masterData, metrics) {
      if (!id || masterData.sknv.length === 0) return;
      const rawEmployee = masterData.sknv.find(e => String(e.maNV) === String(id));
      
      if (rawEmployee) {
          rawEmployeeData = rawEmployee;
          const deptAvg = sknvService.calculateDepartmentAverages(rawEmployee.boPhan, masterData.sknv);
          
          // Tính toán các chỉ số custom (Lấy từ Store)
          if(metrics && metrics.length > 0) {
              const departmentEmployees = masterData.sknv.filter(e => e.boPhan === rawEmployee.boPhan);
              metrics.forEach(m => {
                  let totalVal = 0;
                  let count = 0;
                  departmentEmployees.forEach(emp => {
                      totalVal += sknvService.calculateDynamicMetricValue(emp, m);
                      count++;
                  });
                  deptAvg[`custom_${m.id}`] = count > 0 ? totalVal / count : 0;
              });
          }

          // Gán dữ liệu
          employeeData = rawEmployee;
          detailStats = sknvService.getDetailStats(rawEmployee, deptAvg, metrics);

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
          } else { nganhHangData = [];
          }
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

  function handleEditMetric(event) {
      const metricItem = event.detail;
      if (metricItem && metricItem.rawConfig) {
          itemToEdit = metricItem.rawConfig;
          if (metricItem.rawConfig.type === 'UNIT_PRICE') {
              isMetricModalOpen = true;
          } else {
              isEffModalOpen = true;
          }
      }
  }

  async function handleDeleteMetric(event) {
      const idToDelete = event.detail;
      if (confirm("Bạn có chắc chắn muốn xóa chỉ số này không?")) {
          // Xóa khỏi Store và Cloud
          const newMetrics = $warehouseCustomMetrics.filter(m => m.id !== idToDelete);
          warehouseCustomMetrics.set(newMetrics);
          
          if ($selectedWarehouse) {
              await datasyncService.saveCustomMetrics($selectedWarehouse, newMetrics);
          }
      }
  }

  async function handleSaveMetric(event) {
      const savedMetric = event.detail;
      let currentMetrics = [...$warehouseCustomMetrics]; 
      
      const existingIndex = currentMetrics.findIndex(m => m.id === savedMetric.id);
      if (existingIndex >= 0) {
          currentMetrics[existingIndex] = savedMetric;
      } else {
          currentMetrics = [...currentMetrics, savedMetric];
      }
      
      // Cập nhật Store và Lưu Cloud
      warehouseCustomMetrics.set(currentMetrics);
      if ($selectedWarehouse) {
          await datasyncService.saveCustomMetrics($selectedWarehouse, currentMetrics);
      }
      
      itemToEdit = null;
  }

  function handleCloseModal() {
      isEffModalOpen = false;
      isMetricModalOpen = false;
      itemToEdit = null;
  }

  function goBack() { dispatch('back'); }

  afterUpdate(() => { if (window.feather) window.feather.replace(); });
</script>

<div 
    class="animate-fade-in pb-10 max-w-7xl mx-auto" 
    data-capture-group="sknv-detail-view"
    data-capture-filename={filename}
>
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
                    on:add={() => { itemToEdit = null; isEffModalOpen = true; }} 
                    on:edit={handleEditMetric}
                    on:delete={handleDeleteMetric}
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
                    on:add={() => { itemToEdit = null; isMetricModalOpen = true; }} 
                    on:edit={handleEditMetric}
                    on:delete={handleDeleteMetric}
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
    isOpen={isEffModalOpen} 
    editItem={itemToEdit} 
    on:close={handleCloseModal}
    on:save={handleSaveMetric}
/>

<AddMetricModal
    isOpen={isMetricModalOpen}
    editItem={itemToEdit}
    on:close={handleCloseModal}
    on:save={handleSaveMetric}
/>

<style>
    :global(.sknv-header-blue) { background-color: #2563eb; }
    :global(.sknv-header-green) { background-color: #16a34a; }
    :global(.sknv-header-orange) { background-color: #f97316; }
    :global(.sknv-header-yellow) { background-color: #ca8a04; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

    /* [GENESIS FIX]: CSS RIÊNG CHO CHẾ ĐỘ CHỤP ẢNH CỦA CHI TIẾT NHÂN VIÊN */
    :global(.capture-container [data-capture-group="sknv-detail-view"]) {
        width: 1050px !important;
        max-width: 1050px !important;
        margin: 0 !important;
        padding: 20px !important;
        background-color: white;
    }

    /* 1. Ép Layout Grid 2 cột */
    :global(.capture-container [data-capture-group="sknv-detail-view"] .grid) {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 24px !important;
        width: 100% !important;
    }

    /* 2. [QUAN TRỌNG]: BUNG LỤA TABLE (Expand Scrollable Content)
       Tìm tất cả các thẻ có thanh cuộn (overflow) và ép nó hiện hết nội dung
    */
    :global(.capture-container [data-capture-group="sknv-detail-view"] .overflow-y-auto),
    :global(.capture-container [data-capture-group="sknv-detail-view"] .overflow-x-auto),
    :global(.capture-container [data-capture-group="sknv-detail-view"] [class*="max-h-"]) {
        max-height: none !important;      /* Hủy giới hạn chiều cao */
        height: auto !important;          /* Chiều cao tự động theo nội dung */
        overflow: visible !important;     /* Hiển thị phần bị che */
        display: block !important;
    }

    /* Đảm bảo table chiếm hết chiều rộng */
    :global(.capture-container [data-capture-group="sknv-detail-view"] table) {
        width: 100% !important;
        min-width: 100% !important;
    }
</style>