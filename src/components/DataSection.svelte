<script>
  /* global feather */
  import { onMount, onDestroy } from 'svelte';
  
  // Import các component con
  import FileInput from './common/FileInput.svelte';
  import PasteInput from './common/PasteInput.svelte';
  
  // Import Stores
  import { 
      warehouseList,
      selectedWarehouse,
      notificationStore,
      danhSachNhanVien,
      homeConfig
  } from '../stores.js';
  
  // Import Services
  import { dataService } from '../services/dataService.js';
  import { clusterService } from '../services/cluster.service.js'; // [NEW] Service xử lý cụm
  
  // Import để mở Popup chi tiết phiên bản
  import { showVersionDetails } from './common/VersionManager.svelte';

  export let activeTab;
  let isSyncing = false;
  let dsnvUnsubscribe; 

  // --- LOGIC MỚI: CLUSTER MODE (CHẾ ĐỘ CỤM) ---
  let isClusterMode = false;
  let currentClusterCode = '';

  // Theo dõi sự thay đổi của danh sách nhân viên để kích hoạt chế độ Cụm
  $: if ($danhSachNhanVien && $danhSachNhanVien.length > 0) {
      checkClusterStatus($danhSachNhanVien);
  } else {
      isClusterMode = false;
      currentClusterCode = '';
  }

  function checkClusterStatus(employees) {
      // 1. Lấy danh sách các mã cụm duy nhất
      const clusters = [...new Set(employees.map(e => e.maCum).filter(c => c))];
      // 2. Lấy danh sách kho duy nhất
      const warehouses = [...new Set(employees.map(e => e.maKho).filter(w => w))];

      // Điều kiện kích hoạt: Có cột Mã Cụm VÀ (Có > 1 kho HOẶC user đang chọn xem Cụm)
      if (clusters.length > 0 && (warehouses.length > 1 || clusters.includes($selectedWarehouse))) {
          isClusterMode = true;
          currentClusterCode = clusters[0]; // Mặc định lấy cụm đầu tiên tìm thấy
          
          // [REQ 3] Cập nhật bộ lọc kho hiển thị Mã Cụm
          // Nếu danh sách kho hiện tại chưa có mã cụm, ta thêm vào hoặc thay thế
          if (!$warehouseList.includes(currentClusterCode)) {
               // Logic: Nếu là chế độ cụm, danh sách chọn chỉ cần hiện Mã Cụm là chính
               warehouseList.update(list => {
                   const newList = list.filter(item => !warehouses.includes(item)); // Bỏ các kho lẻ
                   if (!newList.includes(currentClusterCode)) newList.unshift(currentClusterCode);
                   return newList;
               });
               
               // Tự động chọn mã cụm nếu chưa chọn
               if ($selectedWarehouse !== currentClusterCode) {
                   selectedWarehouse.set(currentClusterCode);
               }
          }
          
          // Load dữ liệu cũ của cụm (nếu có)
          clusterService.loadSavedData(currentClusterCode);
          console.log(`[DataSection] Cluster Mode Activated: ${currentClusterCode}`);
      } else {
          isClusterMode = false;
          currentClusterCode = '';
          clusterService.reset();
      }
  }

  // --- XỬ LÝ PASTE DỮ LIỆU (LOGIC MỚI) ---
  
  // 1. Xử lý "Thi đua siêu thị lũy kế" (Chỉ hiện khi isClusterMode = true)
  function handlePasteCompetition(event) {
      const text = event.detail; // Nội dung text paste
      if (isClusterMode && currentClusterCode) {
          try {
              clusterService.processCompetitionInput(text, currentClusterCode);
              notificationStore.set(`Đã cập nhật thi đua cho Cụm ${currentClusterCode}!`, 'success');
          } catch (e) {
              console.error(e);
              notificationStore.set('Lỗi xử lý dữ liệu thi đua! Vui lòng kiểm tra format.', 'error');
          }
      }
  }

  // 2. Xử lý "Data lũy kế" (Rẽ nhánh: Cụm vs Kho lẻ)
  function handlePasteCumulative(event) {
      const text = event.detail;
      
      if (isClusterMode && currentClusterCode) {
          // [REQ 4] Cơ chế lấy dữ liệu khác cho Cụm
          try {
              clusterService.processCumulativeInput(text, currentClusterCode);
              notificationStore.set(`Đã cập nhật Lũy kế cho Cụm ${currentClusterCode}!`, 'success');
          } catch (e) {
              console.error(e);
              notificationStore.set('Lỗi xử lý Data Lũy kế Cụm!', 'error');
          }
      } else {
          // Logic cũ: Data Section không cần làm gì vì PasteInput đã lưu vào LocalStorage
          // và dataService/luykeParser sẽ tự động detect change qua 'saveKeyPaste'.
          console.log('[DataSection] Paste Lũy kế (Chế độ đơn kho) - Handled by reactive store.');
      }
  }

  // --- LOGIC PHIÊN BẢN (GIỮ NGUYÊN) ---
  let latestVersion = '';
  let tickerStatus = 'none';

  $: if ($homeConfig && $homeConfig.changelogs && $homeConfig.changelogs.length > 0) {
      const serverVer = $homeConfig.changelogs[0].version;
      const clientVer = localStorage.getItem('app_client_version') || '';
      latestVersion = serverVer;
      tickerStatus = (serverVer && serverVer !== clientVer) ? 'new' : 'current';
  }

  // --- LOGIC ĐỒNG BỘ CŨ (GIỮ NGUYÊN) ---
  onMount(async () => {
    if (typeof feather !== 'undefined') feather.replace();

    const savedWh = localStorage.getItem('selectedWarehouse');
    if (savedWh) {
        console.log(`[DataSection] Phát hiện kho đã lưu: ${savedWh}.`);
        selectedWarehouse.set(savedWh);
        await dataService.loadWarehouseSettings(savedWh); 

        dsnvUnsubscribe = danhSachNhanVien.subscribe(async (data) => {
            if (data && data.length > 0) {
                // Kiểm tra lại cluster status khi load xong
                checkClusterStatus(data);
                
                // Nếu không phải cluster mode thì sync bình thường
                if (!isClusterMode) {
                    console.log(`[DataSection] Đồng bộ kho đơn: ${savedWh}`);
                    await triggerSync(savedWh);
                }
                
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
      const newWarehouse = event.target.value;
      selectedWarehouse.set(newWarehouse);
      
      if (newWarehouse) {
          localStorage.setItem('selectedWarehouse', newWarehouse);
          
          if (isClusterMode && newWarehouse === currentClusterCode) {
               notificationStore.set(`Đã chuyển sang chế độ quản lý Cụm ${newWarehouse}`, 'info');
               clusterService.loadSavedData(newWarehouse);
          } else {
               notificationStore.set(`Đang đồng bộ dữ liệu cho ${newWarehouse}...`, 'info');
               await triggerSync(newWarehouse);
          }
      } else {
          localStorage.removeItem('selectedWarehouse');
      }
  }

  $: if (activeTab === 'data-section') {
    Promise.resolve().then(() => {
      if (typeof window.feather !== 'undefined') window.feather.replace();
    });
  }
</script>

<section id="data-section" class="page-section {activeTab === 'data-section' ? '' : 'hidden'}"> 
    <div class="page-header">
         <div class="flex flex-wrap items-center gap-4 w-full">
            <div class="flex items-center gap-x-3">
                <h2 class="page-header__title">Cập nhật dữ liệu</h2>
                <button class="page-header__help-btn" data-help-id="data" title="Xem hướng dẫn">
                     <i data-feather="help-circle" class="feather"></i>
                </button>
            </div>
            
            <div id="data-warehouse-selector-container" class="flex-shrink-0 flex items-center gap-2">
                  <label for="data-warehouse-selector" class="text-sm font-semibold text-gray-700">
                      {isClusterMode ? 'Cụm/Kho:' : 'Kho:'}
                  </label>
              
                  <div class="relative">
                    <select 
                      id="data-warehouse-selector" 
                      class="p-2 border rounded-lg text-sm shadow-sm min-w-[200px] 
                            font-semibold text-indigo-800 bg-indigo-50 border-indigo-200 
                            focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50" 
                      disabled={$warehouseList.length === 0 || isSyncing}
                      value={$selectedWarehouse}
                      on:change={handleWarehouseChange}
                    >
                        {#if $warehouseList.length === 0}
                              <option>Vui lòng tải file DSNV...</option>
                        {:else}
                            <option value="">-- Chọn --</option>
                             {#each $warehouseList as kho}
                                 <option value={kho}>{kho}</option>
                            {/each}
                        {/if}
                    </select>
                    {#if isSyncing}
                        <div class="absolute right-8 top-1/2 -translate-y-1/2">
                             <svg class="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                         </div>
                    {/if}
                </div>
            </div>

            {#if tickerStatus !== 'none'}
                <div 
                    id="version-marquee-container" 
                    class="flex-grow min-w-[200px] rounded-lg px-4 py-2 cursor-pointer shadow-sm border transition-all flex items-center overflow-hidden relative group
                    {tickerStatus === 'new' 
                        ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                        : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}"
                    on:click={() => showVersionDetails.set(true)}
                    role="button"
                    tabindex="0"
                >
                    <div class="marquee-content whitespace-nowrap text-sm flex items-center gap-4">
                        {#if tickerStatus === 'new'}
                            <span class="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider animate-pulse border border-red-200">
                                <i data-feather="zap" class="w-3 h-3"></i> Mới
                            </span>
                            <span class="text-red-900 font-bold">
                               Đã có phiên bản <span class="bg-red-200 text-red-800 px-1.5 rounded font-bold mx-1">{latestVersion}</span> - Bấm cập nhật ngay!
                            </span>
                        {:else}
                             <span class="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-green-200">
                                <i data-feather="check-circle" class="w-3 h-3"></i> Đã cập nhật
                             </span>
                            <span class="text-indigo-900 font-bold flex items-center gap-1">
                                Hệ thống đang chạy phiên bản 
                                <span class="text-base font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">
                                    {latestVersion}
                                </span>
                             </span>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
   
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"> 
        <div class="content-card data-card--blue flex flex-col gap-4"> 
             <h3 class="content-card__header data-header--blue">
                <i data-feather="zap" class="h-5 w-5 feather"></i>SỬ DỤNG NHANH MỖI NGÀY
            </h3>
            
            <FileInput 
                label="Yêu cầu xuất lũy kế"
                icon="file-text"
                saveKey="saved_ycx"
            />
            
            <PasteInput
                label={isClusterMode ? `Data Lũy kế (Cụm ${currentClusterCode})` : "Data lũy kế"}
                icon="clipboard"
                link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=1"
                saveKeyPaste={isClusterMode ? `cluster_paste_luyke_${currentClusterCode}` : "daily_paste_luyke"}
                on:paste={handlePasteCumulative}
            />
            
            {#if isClusterMode}
                <div class="animate-fade-in p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                     <PasteInput
                        label="Thi đua siêu thị lũy kế (Mới)"
                        icon="layers"
                        link="#"
                        placeholder="Paste dữ liệu thi đua cụm..."
                        saveKeyPaste={`cluster_paste_comp_${currentClusterCode}`}
                        on:paste={handlePasteCompetition}
                    />
                    <p class="text-xs text-indigo-600 mt-1 italic pl-1">* Dành cho quản lý cụm {currentClusterCode}</p>
                </div>
            {/if}
            
            <PasteInput
                label="Thi đua nhân viên"
                icon="clipboard"
                link="https://bi.thegioididong.com/sieu-thi-con?id=16758&tab=bcdtnv&rt=2&dm=1"
                saveKeyPaste="daily_paste_thiduanv"
                saveKeyRaw="raw_paste_thiduanv"
                saveKeyProcessed="daily_paste_thiduanv"
            />
        </div>
        
         <div class="content-card data-card--green flex flex-col gap-4"> 
            <h3 class="content-card__header data-header--green">
                  <i data-feather="users" class="h-5 w-5 feather"></i>CHI TIẾT NĂNG SUẤT NHÂN VIÊN
            </h3>
           
            <FileInput
                label="Giờ công"
                icon="clock"
                saveKey="saved_giocong"
             />
             
            <FileInput
                 label="Thưởng nóng"
                icon="gift"
                saveKey="saved_thuongnong"
            />
             
            <PasteInput
                label="Thưởng ERP"
                icon="clipboard"
                link="https://bi.thegioididong.com/reward?id=-1&tab=1"
                saveKeyPaste="daily_paste_thuongerp"
             />
        </div>
    </div>
    
    <div class="content-card data-card--yellow"> 
         <h3 class="content-card__header data-header--yellow">
            <i data-feather="calendar" class="h-5 w-5 feather"></i>DỮ LIỆU CẬP NHẬT 1 THÁNG 1 LẦN
         </h3>
        <p class="text-sm text-yellow-800 bg-yellow-100 p-3 rounded-lg mb-4">Lưu ý: Dữ liệu trong phần này sẽ được lưu vào trình duyệt của bạn. Dữ liệu sẽ tồn tại cho đến khi bạn cập nhật lại.</p> 
        
        <div class="grid md:grid-cols-3 gap-4"> 
             <div class="space-y-4"> 
                 <FileInput
                    label="Danh sách nhân viên"
                    icon="users"
                    saveKey="saved_danhsachnv"
                />
                <FileInput
                    label="YCX Lũy Kế tháng trước"
                    icon="file-text"
                    saveKey="saved_ycx_thangtruoc"
                />
            </div> 
             <div class="space-y-4"> 
                  <FileInput
                    label="Thưởng nóng tháng trước"
                    icon="gift"
                     saveKey="saved_thuongnong_thangtruoc"
                />
             </div> 
             <div class="space-y-4"> 
                 <PasteInput
                    label="Thưởng ERP tháng trước"
                    icon="clipboard"
                    link="https://bi.thegioididong.com/reward?id=-1&tab=1"
                     saveKeyPaste="saved_thuongerp_thangtruoc"
                 />
            </div> 
        </div> 
    </div> 
</section>

<style>
    /* Animation cho dòng chữ chạy */
    .marquee-content {
        animation: marquee 12s linear infinite;
    }
    .group:hover .marquee-content {
        animation-play-state: paused;
    }
    @keyframes marquee {
        0% { transform: translateX(100%); }
        100% { transform: translateX(-100%); }
    }
    
    .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>