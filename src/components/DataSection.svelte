<script>
  /* global feather */
  import { onMount, onDestroy } from 'svelte';
  
  import { 
      warehouseList,
      selectedWarehouse,
      notificationStore,
      danhSachNhanVien,
      homeConfig,
      fileSyncState,        
      clusterSummaryData,
      currentUser
  } from '../stores.js';
  
  import { dataService } from '../services/dataService.js';
  import { clusterService } from '../services/cluster.service.js';
  import { datasyncService } from '../services/datasync.service.js'; 
  import { storageService } from '../services/storage.service.js'; 
  import { luykeParser } from '../services/processing/parsers/luyke.parser.js'; 

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

  async function handlePasteClusterSummary(event) {
      const text = event.detail;
      if (!text) return;

      fileSyncState.update(s => ({
          ...s,
          'cluster_summary_data': { status: 'uploading', message: 'Đang trích xuất & lưu Cloud...' }
      }));

      try {
          const parsedData = luykeParser.parseClusterSummaryData(text);
          clusterSummaryData.set(parsedData);
          localStorage.setItem('cluster_summary_data', text);
          const count = Object.keys(parsedData).length;
          const now = Date.now();

          // [PHẪU THUẬT LOGIC]: Tự động sinh ID cụm theo quyền quản lý hiện tại
          const targetClusterId = currentClusterCode ? `CLUSTER_${currentClusterCode}` : 'CLUSTER_UNKNOWN';

          const blob = new Blob([text], { type: 'text/plain' });
          const path = `warehouse_data/${targetClusterId}/cluster_summary_data_${now}.txt`;
          const downloadUrl = await storageService.uploadFileToStorage(blob, path);

          const metaToSave = {
              downloadURL: downloadUrl,
              fileName: 'du_lieu_dan_cum.txt',
              fileType: 'text',
              rowCount: count,
              updatedAt: new Date(now),
              timestamp: now,
              updatedBy: $currentUser?.email || 'Tôi'
          };

          // [PHẪU THUẬT LOGIC]: Lưu chính xác vào Document của Cụm này, không đè lên ALL
          await datasyncService.saveWarehouseMetadata(targetClusterId, 'cluster_summary_data', metaToSave);
          localStorage.setItem(`_meta_${targetClusterId}_cluster_summary_data`, JSON.stringify(metaToSave));

          fileSyncState.update(s => ({
              ...s,
              'cluster_summary_data': { 
                  status: 'synced', 
                  message: `✓ Đã đồng bộ (${count} dòng)`, 
                  metadata: metaToSave 
              }
          }));
          notificationStore.set({ message: '✅ Đã trích xuất và đồng bộ Báo cáo Cụm!', type: 'success' });
          
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
      const text = payload.text || payload; 
      const kho = payload.kho || currentClusterCode;

      if (kho) {
          try {
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

    const savedClusterText = localStorage.getItem('cluster_summary_data');
    if (savedClusterText) {
        try {
            const parsedData = luykeParser.parseClusterSummaryData(savedClusterText);
            clusterSummaryData.set(parsedData);
            const count = Object.keys(parsedData).length;
            
            // [PHẪU THUẬT LOGIC]: Tự động dò tìm Meta của cụm trên LocalStorage (vì ID cụm có thể là bất kỳ)
            let restoreMeta = null;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('_meta_CLUSTER_') && k.endsWith('_cluster_summary_data')) {
                    try { restoreMeta = JSON.parse(localStorage.getItem(k)); break; } catch(e){}
                }
            }
            
            fileSyncState.update(s => ({
                ...s,
                'cluster_summary_data': { 
                    status: 'synced', 
                    message: `✓ Đã đồng bộ (${count} dòng)`,
                    metadata: restoreMeta
                }
            }));
        } catch(e) {
            console.error("Lỗi phục hồi Báo cáo cụm từ LocalStorage:", e);
        }
    }

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
      if (!warehouse) return; 
      isSyncing = true;
      try {
          if (warehouse === 'ALL') {
              const validWarehouses = $warehouseList.filter(k => k && k !== 'ALL');
              
              if (validWarehouses.length > 0) {
                  const syncPromises = [];
                  
                  syncPromises.push(dataService.syncDownFromCloud('ALL'));
                  
                  // [PHẪU THUẬT LOGIC]: Gọi chính xác ID Cụm để đồng bộ (nếu người dùng thuộc về 1 Cụm)
                  if (isClusterMode && currentClusterCode) {
                      syncPromises.push(dataService.syncDownFromCloud(`CLUSTER_${currentClusterCode}`));
                  }
                  
                  validWarehouses.forEach(kho => {
                      syncPromises.push(dataService.syncDownFromCloud(kho));
                      syncPromises.push(dataService.loadWarehouseSettings(kho));
                  });
                  
                  await Promise.all(syncPromises);
              }
          } else {
              await Promise.all([
                  dataService.syncDownFromCloud(warehouse),
                  dataService.loadWarehouseSettings(warehouse)
              ]);
          }
          notificationStore.set({ message: 'Đồng bộ thành công!', type: 'success' });
      } catch (error) {
            console.error("SYNC ERROR:", error);
            notificationStore.set({ message: 'Đồng bộ bị lỗi!', type: 'error' });
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
               notificationStore.set({ message: `Đang đồng bộ dữ liệu tất cả các kho...`, type: 'info' });
               await triggerSync(newWarehouse);
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