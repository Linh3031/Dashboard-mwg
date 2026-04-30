<script>
  /* global feather */
  import { onMount, onDestroy } from 'svelte';
  
  import { 
      warehouseList,
      selectedWarehouse,
      notificationStore,
      danhSachNhanVien,
      homeConfig,
      fileSyncState,        // [NEW] Cập nhật UI ô dán
      clusterSummaryData    // [NEW] Lưu data tổng hợp
  } from '../stores.js';
  
  import { dataService } from '../services/dataService.js';
  import { clusterService } from '../services/cluster.service.js';
  import { datasyncService } from '../services/datasync.service.js'; // [NEW] Đẩy lên Cloud
  import { luykeParser } from '../services/processing/parsers/luyke.parser.js'; // [NEW] Bộ giải mã

  import TourGuide from './common/TourGuide.svelte';
  import DataHeader from './data-section/DataHeader.svelte';
  import DailyDataBlock from './data-section/DailyDataBlock.svelte';
  import ProductivityDataBlock from './data-section/ProductivityDataBlock.svelte';
  import MonthlyDataBlock from './data-section/MonthlyDataBlock.svelte';
  
  export let activeTab;
  let isSyncing = false;
  let dsnvUnsubscribe; 

  let isClusterMode = false;
  let currentClusterCode = '';

  let isTourActive = false;
  const dataTourSteps = [
        { id: 'danh-sach-nv', title: 'Bước 1: Danh sách nhân viên', content: 'Việc đầu tiên cần làm mỗi tháng!\nBạn hãy tải file mẫu về, điền danh sách nhân sự của kho và upload lên đây để hệ thống nhận diện.', openDetails: 'block-yellow' },
        { id: 'general-overview', title: 'Tổng quan Dữ liệu', content: 'Dữ liệu tại trang này được chia làm 3 khối chính tương ứng với tần suất bạn phải thao tác: Mỗi ngày, Khi cần thiết, và Mỗi tháng.' },
        { id: 'block-blue', title: 'Khối 1: Sử dụng nhanh mỗi ngày', content: 'Chứa 90% dữ liệu bạn sẽ cần thao tác.\nMỗi ngày bạn chỉ cần đổ 1 file Excel (YCX) và dán 2 bảng dữ liệu từ BI vào đây là xong.' },
        { id: 'input-ycx', title: 'Yêu cầu xuất lũy kế (File Excel)', content: 'Dùng để xem Doanh thu thực tế, chi tiết từng ngành hàng, địa chỉ khách hàng và theo dõi sức bán (Velocity).' },
        { id: 'input-data-lk', title: 'Data lũy kế (Copy từ BI)', content: 'Dùng để xem xếp hạng Thi đua siêu thị, Doanh thu hệ thống ghi nhận từ BI và tỷ lệ hoàn thành Target.' },
        { id: 'input-thidua-nv', title: 'Thi đua nhân viên (Copy từ BI)', content: 'Để theo dõi điểm thi đua và thứ hạng cá nhân của từng nhân viên theo ghi nhận của hệ thống.' },
        { id: 'block-green', title: 'Khối 2: Chi tiết Năng suất', content: 'Khu vực này dùng để xem giờ công, thưởng nóng, thưởng ERP.\nHệ thống sẽ tự động tổng hợp để ước tính thu nhập dự kiến.', openDetails: 'block-green' },
        { id: 'block-yellow', title: 'Khối 3: Cập nhật 1 tháng 1 lần', content: 'Chứa các file cũ dùng để đối chiếu dữ liệu.', openDetails: 'block-yellow' },
        { id: 'input-ycx-thang-truoc', title: 'YCX Lũy kế tháng trước', content: 'Dùng để so sánh sự tăng giảm với cùng kỳ tháng trước.\nBạn có thể tải lên nhiều file để xem dữ liệu nhiều tháng.', openDetails: 'block-yellow' },
        { id: 'input-ycx-nam-truoc', title: 'YCX Lũy kế năm trước', content: 'Dùng để so sánh tăng trưởng SSG 1 tháng hoặc đối chiếu lũy kế nguyên năm.', openDetails: 'block-yellow' }
  ];

  $: if ($danhSachNhanVien && $danhSachNhanVien.length > 0) {
      checkClusterStatus($danhSachNhanVien);
  } else {
      isClusterMode = false;
      currentClusterCode = '';
  }

  function checkClusterStatus(employees) {
      const clusters = [...new Set(employees.map(e => e.maCum || e.clusterId).filter(c => c))];
      const warehouses = [...new Set(employees.map(e => e.maKho || e.storeId).filter(w => w))];
      if (clusters.length > 0 && (warehouses.length > 1 || clusters.includes($selectedWarehouse))) {
          isClusterMode = true;
          currentClusterCode = clusters[0]; 
          
          warehouseList.update(list => {
               if (!list.includes(currentClusterCode)) return [currentClusterCode, ...list];
               return list;
          });
          if (!$selectedWarehouse || $selectedWarehouse !== currentClusterCode) {
               console.log(`[Cluster] Detected cluster: ${currentClusterCode}`);
          }
          clusterService.loadSavedData(currentClusterCode);
      } else {
          isClusterMode = false;
          currentClusterCode = '';
          clusterService.reset();
      }
  }

// --- [NEW LOGIC]: Xử lý dán Báo Cáo Tổng Hợp Cụm ---
  async function handlePasteClusterSummary(event) {
      const text = event.detail;
      if (!text) return;

      // Cập nhật UI ô PasteInput sang trạng thái "Đang xử lý"
      fileSyncState.update(s => ({
          ...s,
          'cluster_summary_data': { status: 'uploading', message: 'Đang trích xuất dữ liệu...' }
      }));

      try {
          const parsedData = luykeParser.parseClusterSummaryData(text);
          console.log("[DataSection] Trích xuất thành công BC Cụm:", parsedData);
          
          clusterSummaryData.set(parsedData);
          await datasyncService.savePastedDataToFirestore('CLUSTER_ALL', 'clusterSummary', parsedData, { timestamp: Date.now() });

          // [FIX] Đếm số lượng chỉ số trích xuất được để báo cáo lên UI
          const count = Object.keys(parsedData).length;

          // Cập nhật UI ô PasteInput sang màu XANH (Thành công)
          fileSyncState.update(s => ({
              ...s,
              'cluster_summary_data': { status: 'synced', message: `✓ Đã trích xuất (${count} chỉ số)` }
          }));
          notificationStore.set({ message: '✅ Đã trích xuất Báo cáo Cụm thành công!', type: 'success' });
          
      } catch (error) {
          console.error(error);
          fileSyncState.update(s => ({
              ...s,
              'cluster_summary_data': { status: 'error', message: `Lỗi: ${error.message}` }
          }));
          notificationStore.set({ message: error.message || 'Lỗi xử lý dữ liệu cụm!', type: 'error' });
      }
  }

  function handlePasteCompetition(event) {
      const text = event.detail;
      if (isClusterMode && currentClusterCode) {
          try {
              clusterService.processCompetitionInput(text, currentClusterCode);
              notificationStore.set({ message: `✅ Đã cập nhật thi đua cho Cụm ${currentClusterCode}!`, type: 'success' });
          } catch (e) {
              console.error(e);
              notificationStore.set({ message: 'Lỗi xử lý dữ liệu thi đua! Kiểm tra format.', type: 'error' });
          }
      }
  }

  function handlePasteCumulative(event) {
      const payload = event.detail;
      // Payload giờ là object: { text: "...", kho: "908" }
      const text = payload.text || payload; 
      const kho = payload.kho || currentClusterCode;

      if (kho) {
          try {
              // Cập nhật hàm này tùy theo cách clusterService đang viết
              clusterService.processCumulativeInput(text, kho);
              notificationStore.set({ message: `✅ Đã cập nhật Lũy kế kho ${kho}!`, type: 'success' });
          } catch (e) {
              console.error(e);
              notificationStore.set({ message: `Lỗi xử lý Data Lũy kế kho ${kho}!`, type: 'error' });
          }
      }
  }

  let latestVersion = '';
  let tickerStatus = 'none';
  $: if ($homeConfig && $homeConfig.changelogs && $homeConfig.changelogs.length > 0) {
      const serverVer = $homeConfig.changelogs[0].version;
      const clientVer = localStorage.getItem('app_client_version') || '';
      latestVersion = serverVer;
      tickerStatus = (serverVer && serverVer !== clientVer) ? 'new' : 'current';
  }

  onMount(async () => {
    if (typeof feather !== 'undefined') feather.replace();

    const savedWh = localStorage.getItem('selectedWarehouse');
    if (savedWh) {
        selectedWarehouse.set(savedWh);
        await dataService.loadWarehouseSettings(savedWh); 

        dsnvUnsubscribe = danhSachNhanVien.subscribe(async (data) => {
            if (data && data.length > 0) {
                checkClusterStatus(data);
                if (!isClusterMode) await triggerSync(savedWh);
                if (dsnvUnsubscribe) {
                    dsnvUnsubscribe();
                    dsnvUnsubscribe = null;
                }
            }
        });
    }
  });

  onDestroy(() => {
      if (dsnvUnsubscribe) dsnvUnsubscribe();
  });

  async function triggerSync(warehouse) {
      if (!warehouse || warehouse === 'ALL') return;
      isSyncing = true;
      try {
          await Promise.all([
              dataService.syncDownFromCloud(warehouse),
              dataService.loadWarehouseSettings(warehouse)
          ]);
          notificationStore.set({ message: 'Đồng bộ thành công!', type: 'success' });
      } catch (error) {
            console.error("SYNC ERROR:", error);
      } finally {
            isSyncing = false;
      }
  }

  async function handleWarehouseChange(event) {
      const newWarehouse = event.detail; 
      selectedWarehouse.set(newWarehouse);
      if (newWarehouse) {
          localStorage.setItem('selectedWarehouse', newWarehouse);
          if (newWarehouse === 'ALL') {
               notificationStore.set({ message: `Đang mở giao diện Quản lý Cụm`, type: 'info' });
          } else if (isClusterMode && newWarehouse === currentClusterCode) {
               notificationStore.set({ message: `Chế độ Cụm: ${newWarehouse}`, type: 'info' });
               clusterService.loadSavedData(newWarehouse);
          } else {
               notificationStore.set({ message: `Đang đồng bộ ${newWarehouse}...`, type: 'info' });
               await triggerSync(newWarehouse);
          }
      } else {
          localStorage.removeItem('selectedWarehouse');
      }
  }

  let hasSeenTour = true;
  function handleManualTourStart() {
      isTourActive = true;
      localStorage.setItem('has_seen_tour_data_section', 'true');
  }

  $: if (activeTab === 'data-section') {
      Promise.resolve().then(() => {
          if (typeof window.feather !== 'undefined') window.feather.replace();
      });
      if (typeof localStorage !== 'undefined') {
          const seen = localStorage.getItem('has_seen_tour_data_section');
          if (!seen) {
              setTimeout(() => {
                  if (!isTourActive && activeTab === 'data-section') {
                      isTourActive = true;
                      localStorage.setItem('has_seen_tour_data_section', 'true');
                  }
              }, 1000);
          }
      }
  }
</script>

<section id="data-section" class="page-section {activeTab === 'data-section' ? '' : 'hidden'}"> 
    
    <DataHeader 
        {isClusterMode}
        {isSyncing}
        {tickerStatus}
        {latestVersion}
        {hasSeenTour}
        on:warehouseChange={handleWarehouseChange}
        on:startTour={handleManualTourStart}
    />
   
    <div class="flex flex-col gap-1 mb-1"> 
        <DailyDataBlock 
            {isClusterMode}
            {currentClusterCode}
            on:pasteClusterSummary={handlePasteClusterSummary}
            on:pasteCumulative={handlePasteCumulative}
            on:pasteCompetition={handlePasteCompetition}
        />
        
        <ProductivityDataBlock />
    </div>
    
    <MonthlyDataBlock />

    <TourGuide bind:isActive={isTourActive} steps={dataTourSteps} />
</section>