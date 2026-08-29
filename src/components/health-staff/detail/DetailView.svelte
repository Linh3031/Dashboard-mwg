<script>
  import { afterUpdate, createEventDispatcher } from 'svelte';
  import { 
      masterReportData, selectedWarehouse, warehouseCustomMetrics, modalState, 
      luykeGoalSettings, ycxDataThangTruoc, danhSachNhanVien, pastedThiDuaReportData, competitionNameMappings 
  } from '../../../stores.js';
  import { sknvService } from '../../../services/sknv.service.js';
  import { datasyncService } from '../../../services/datasync.service.js';
  
  // Import logic Lịch sử đa tháng
  import { multiMonthReportLogic } from '../../../services/reports/multiMonth.report.js';
  
  import ProfileSidebar from './cv/ProfileSidebar.svelte';
  import DynamicStats from './cv/DynamicStats.svelte';

  export let employeeId;
  const dispatch = createEventDispatcher();

  let employeeData = null;
  let rawEmployeeData = null;
  let detailStats = {};
  
  let totalAbove = 0;
  let totalCriteria = 0;
  let targetCaNhan = 0;
  let percentTargetValue = 0;
  
  let thiDuaSummary = { dat: 0, ganDat: 0, canCoGang: 0, listDat: [] };
  
  $: filename = employeeData ? `${employeeData.hoTen} - ${employeeData.maNV}_CV` : 'Chi_tiet_nhan_vien';

  $: if ($selectedWarehouse) loadMetricsFromCloud($selectedWarehouse);
  async function loadMetricsFromCloud(kho) {
      const data = await datasyncService.loadCustomMetrics(kho);
      warehouseCustomMetrics.set(data);
  }

  // --- LOGIC TIME & TARGET ---
  let currentDay = 1;
  let daysInMonth = 30;
  $: {
      const today = new Date();
      if (today.getDate() === 1) {
          const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          currentDay = lastMonth.getDate(); daysInMonth = lastMonth.getDate();
      } else {
          currentDay = Math.max(today.getDate() - 1, 1);
          daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      }
  }

  $: {
      const currentGoals = ($luykeGoalSettings && $selectedWarehouse) ? $luykeGoalSettings[$selectedWarehouse] || {} : {};
      const shopTargetQD = (parseFloat(currentGoals.doanhThuQD || 0) * 1000000);
      const empCount = $masterReportData.sknv ? $masterReportData.sknv.filter(e => String(e.maKho) === String($selectedWarehouse)).length || 1 : 1;
      targetCaNhan = shopTargetQD / empCount;
      if (rawEmployeeData && targetCaNhan > 0) {
          percentTargetValue = (((rawEmployeeData.doanhThuQuyDoi / currentDay) * daysInMonth) / targetCaNhan) * 100;
      } else { percentTargetValue = 0; }
  }

  // --- LOGIC DOANH THU ĐA THÁNG ---
  $: monthlyRevenue = (() => {
      if (!rawEmployeeData) return [];
      const history = multiMonthReportLogic.generateMultiMonthReport($ycxDataThangTruoc, $danhSachNhanVien);
      const cleanCode = String(rawEmployeeData.maNV).trim();
      const empHistory = history.processedMap.get(cleanCode);
      
      const result = [];
      if (empHistory && empHistory.months) {
          const sortedMonths = Object.keys(empHistory.months).sort((a,b) => {
              const [ma, ya] = a.split('/'); const [mb, yb] = b.split('/');
              return new Date(ya, ma-1) - new Date(yb, mb-1);
          });
          sortedMonths.forEach(m => {
              if (empHistory.months[m].dtqd > 0) {
                  result.push({ month: m, dtqd: empHistory.months[m].dtqd });
              }
          });
      }
      
      const currMonthName = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`;
      result.push({ month: currMonthName, dtqd: rawEmployeeData.doanhThuQuyDoi || 0 });
      return result;
  })();

  // --- LOGIC THI ĐUA NHÂN VIÊN ---
  $: {
      if (rawEmployeeData && $pastedThiDuaReportData) {
          const cleanCode = String(rawEmployeeData.maNV).trim();
          const thiDuaEmp = $pastedThiDuaReportData.find(e => String(e.maNV).trim() === cleanCode);
          let dat = 0, ganDat = 0, canCoGang = 0, listDat = [];
          
          if (thiDuaEmp && thiDuaEmp.competitions) {
              thiDuaEmp.competitions.forEach(comp => {
                  if(comp.giaTri > 0) {
                      const projected = (comp.giaTri / currentDay) * daysInMonth;
                      const target = 0; // Tạm thời assume target = 0 nếu ko map, hoặc bạn có thể mở rộng logic map target sau
                      const pct = target > 0 ? (projected / target) * 100 : (comp.giaTri > 0 ? 100 : 0);
                      
                      const labelName = $competitionNameMappings[comp.tenGoc] || comp.tenGoc;
                      
                      if (target > 0 && projected >= target || target === 0) { dat++; listDat.push(labelName); }
                      else if (pct >= 70) ganDat++;
                      else canCoGang++;
                  }
              });
          }
          thiDuaSummary = { dat, ganDat, canCoGang, listDat };
      }
  }

  // --- HÀM TÍNH TOÁN LÕI ---
  $: calculateEmployeeData(employeeId, $masterReportData, $warehouseCustomMetrics);
  function calculateEmployeeData(id, masterData, metrics) {
      if (!id || masterData.sknv.length === 0) return;
      const rawEmployee = masterData.sknv.find(e => String(e.maNV) === String(id));
      
      if (rawEmployee) {
          rawEmployeeData = rawEmployee;
          const deptAvg = sknvService.calculateDepartmentAverages(rawEmployee.boPhan, masterData.sknv);
          
          if(metrics && metrics.length > 0) {
              const departmentEmployees = masterData.sknv.filter(e => e.boPhan === rawEmployee.boPhan);
              metrics.forEach(m => {
                  let totalVal = 0; let count = 0;
                  departmentEmployees.forEach(emp => { totalVal += sknvService.calculateDynamicMetricValue(emp, m); count++; });
                  deptAvg[`custom_${m.id}`] = count > 0 ? totalVal / count : 0;
              });
          }

          employeeData = rawEmployee;
          detailStats = sknvService.getDetailStats(rawEmployee, deptAvg, metrics);
          const evaluatedData = sknvService.evaluateEmployee(rawEmployee, deptAvg);
          totalAbove = evaluatedData.totalAbove || 0;
          totalCriteria = evaluatedData.totalCriteria || 0;
      }
  }

  function goBack() { dispatch('back'); }
  afterUpdate(() => { if (window.feather) window.feather.replace(); });
</script>

<div class="animate-fade-in pb-10 max-w-7xl mx-auto" data-capture-group="sknv-detail-view" data-capture-filename={filename}>
    <div class="mb-4 capture-hide">
        <button on:click={goBack} class="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors">
           <i data-feather="chevron-left" class="w-4 h-4"></i> Quay lại bảng tổng hợp
        </button>
    </div>

    {#if employeeData}
        <div class="flex flex-col md:flex-row w-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl min-h-[700px] sknv-cv-container overflow-hidden">
            
            <div class="w-full md:w-[35%] xl:w-[30%] shrink-0">
                <ProfileSidebar 
                    employee={employeeData} 
                    {totalAbove} 
                    {totalCriteria} 
                    {monthlyRevenue}
                />
            </div>

            <div class="w-full md:w-[65%] xl:w-[70%]">
                <DynamicStats 
                    {detailStats}
                    {rawEmployeeData}
                    {totalAbove}
                    {totalCriteria}
                    {targetCaNhan}
                    {percentTargetValue}
                    {thiDuaSummary}
                />
            </div>
            
        </div>
    {:else}
        <div class="p-12 text-center bg-red-50 rounded-lg border border-red-200">
            <p class="text-red-600 font-semibold">Không tìm thấy dữ liệu cho nhân viên này.</p>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

    :global(.capture-container [data-capture-group="sknv-detail-view"]) {
        width: 1200px !important; max-width: 1200px !important; margin: 0 !important; padding: 20px !important; background-color: #f8fafc;
    }
    :global(.capture-container .sknv-cv-container) { display: flex !important; flex-direction: row !important; }
    :global(.capture-container .sknv-cv-container > div:first-child) { width: 35% !important; }
    :global(.capture-container .sknv-cv-container > div:last-child) { width: 65% !important; }
</style>