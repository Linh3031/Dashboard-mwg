<script>
  /* global feather */
  import { onMount, onDestroy } from 'svelte';
  import FileInput from './common/FileInput.svelte';
  import PasteInput from './common/PasteInput.svelte';
  import { 
      warehouseList,
      selectedWarehouse,
      notificationStore,
      danhSachNhanVien,
      homeConfig
  } from '../stores.js';
  import { dataService } from '../services/dataService.js';
  import { clusterService } from '../services/cluster.service.js';
  import { showVersionDetails } from './common/VersionManager.svelte';

  export let activeTab;
  let isSyncing = false;
  let dsnvUnsubscribe; 

  let isClusterMode = false;
  let currentClusterCode = '';

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
               if (!list.includes(currentClusterCode)) {
                   return [currentClusterCode, ...list];
               }
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
      const text = event.detail;
      if (isClusterMode && currentClusterCode) {
          try {
              clusterService.processCumulativeInput(text, currentClusterCode);
              notificationStore.set({ message: `✅ Đã cập nhật Lũy kế cho Cụm ${currentClusterCode}!`, type: 'success' });
          } catch (e) {
              console.error(e);
              notificationStore.set({ message: 'Lỗi xử lý Data Lũy kế Cụm!', type: 'error' });
          }
      } else {
          console.log('[DataSection] Mode Kho đơn: Dữ liệu đã được lưu vào Storage.');
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
                if (!isClusterMode) {
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
                    <select id="data-warehouse-selector" class="p-2 border rounded-lg text-sm shadow-sm min-w-[200px] font-semibold text-indigo-800 bg-indigo-50 border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50" disabled={$warehouseList.length === 0 || isSyncing} value={$selectedWarehouse} on:change={handleWarehouseChange}>
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
                <div id="version-marquee-container" class="flex-grow min-w-[200px] rounded-lg px-4 py-2 cursor-pointer shadow-sm border transition-all flex items-center overflow-hidden relative group {tickerStatus === 'new' ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}" on:click={() => showVersionDetails.set(true)} role="button" tabindex="0">
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
                                <span class="text-base font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">{latestVersion}</span>
                             </span>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
   
    <div class="flex flex-col gap-1 mb-1"> 
        <div class="content-card data-card--blue flex flex-col gap-4 !mb-3"> 
             <h3 class="content-card__header data-header--blue flex items-center">
                <i data-feather="zap" class="h-5 w-5 feather mr-2"></i>
                <span>SỬ DỤNG NHANH MỖI NGÀY</span>
                <span class="ml-2 text-sm font-normal italic opacity-100 pt-0">(Đủ 90% dữ liệu cần thiết)</span>
            </h3>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                 <FileInput 
                    label="Yêu cầu xuất lũy kế"
                    icon="file-text"
                    link="https://report.mwgroup.vn/home/dashboard/077"
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
                    <div class="animate-fade-in p-3 bg-indigo-50 border border-indigo-200 rounded-lg relative">
                         <div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">MỚI</div>
                         <PasteInput label="Thi đua siêu thị lũy kế" icon="layers" link="#" placeholder="Paste dữ liệu thi đua cụm..." saveKeyPaste={`cluster_paste_comp_${currentClusterCode}`} on:paste={handlePasteCompetition} />
                        <p class="text-xs text-indigo-600 mt-2 flex items-center gap-1"><i data-feather="info" class="w-3 h-3"></i>Dành cho quản lý Cụm {currentClusterCode}</p>
                    </div>
                {/if}
                
                <PasteInput label="Thi đua nhân viên" icon="clipboard" link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=bcdtnv&rt=2&dm=1" saveKeyPaste="daily_paste_thiduanv" saveKeyRaw="raw_paste_thiduanv" saveKeyProcessed="daily_paste_thiduanv"/>
            </div>
         </div>
        
        <details class="content-card data-card--green group !mb-2 !mt-2"> 
            <summary class="content-card__header data-header--green flex items-center justify-between cursor-pointer list-none select-none !mb-0">
                <div class="flex items-center flex-wrap">
                    <i data-feather="users" class="h-5 w-5 feather mr-2"></i>
                    <span>CHI TIẾT NĂNG SUẤT NHÂN VIÊN</span>
                    <span class="ml-2 text-sm font-normal italic pt-0 opacity-90 hidden sm:inline">(Cập nhật khi cần theo dõi lương thưởng, năng suất)</span>
                </div>
                <i data-feather="chevron-down" class="feather transform transition-transform duration-200 group-open:rotate-180"></i>
            </summary>
           
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 border-t border-green-200/50 pt-4">
                <FileInput label="Giờ công" icon="clock" link="https://reports.thegioididong.com/#/viewreport/168754" saveKey="saved_giocong"/>
                <FileInput label="Thưởng nóng" icon="gift" link="https://report.mwgroup.vn/home/dashboard/105" saveKey="saved_thuongnong"/>
                <PasteInput label="Thưởng ERP" icon="clipboard" link="https://bi.thegioididong.com/reward?id=-1&tab=1" saveKeyPaste="daily_paste_thuongerp"/>
            </div>
        </details>
    </div>
    
    <details class="content-card data-card--yellow group"> 
         <summary class="content-card__header data-header--yellow flex items-center justify-between cursor-pointer list-none select-none !mb-0">
             <div class="flex items-center flex-wrap">
                 <i data-feather="calendar" class="h-5 w-5 feather mr-2"></i>
                 <span>DỮ LIỆU CẬP NHẬT 1 THÁNG 1 LẦN</span>
                 <span class="ml-2 text-sm font-normal italic pt-0 opacity-90 hidden sm:inline">(Cập nhật nếu cần xem so cùng kỳ)</span>
             </div>
             <i data-feather="chevron-down" class="feather transform transition-transform duration-200 group-open:rotate-180"></i>
         </summary>
         
         <div class="mt-4 border-t border-yellow-200/50 pt-4">
            <p class="text-sm text-yellow-800 bg-yellow-100 p-3 rounded-lg mb-4">Lưu ý: Dữ liệu sẽ được đồng bộ tự động lên cloud.</p> 
            
            <div class="grid md:grid-cols-3 gap-4"> 
                 <div class="space-y-4"> 
                     <FileInput label="Danh sách nhân viên" icon="users" saveKey="saved_danhsachnv" />
                </div> 
                 <div class="space-y-4"> 
                     <FileInput label="YCX Lũy Kế tháng trước" icon="file-text" link="https://report.mwgroup.vn/home/dashboard/077" saveKey="saved_ycx_thangtruoc" isMultiMode={true} />
                     <FileInput label="Thưởng nóng tháng trước" icon="gift" link="https://report.mwgroup.vn/home/dashboard/105" saveKey="saved_thuongnong_thangtruoc" />
                 </div> 
                 <div class="space-y-4"> 
                     <FileInput label="YCX Cùng kỳ năm" icon="file-text" link="https://report.mwgroup.vn/home/dashboard/077" saveKey="saved_ycx_cungkynam" isMultiMode={true} />
                     <PasteInput label="Thưởng ERP tháng trước" icon="clipboard" link="https://bi.thegioididong.com/reward?id=-1&tab=1" saveKeyPaste="saved_thuongerp_thangtruoc" />
                </div> 
            </div>
        </div>
    </details> 
</section>

<style>
    summary::-webkit-details-marker { display: none; }
    .marquee-content { animation: marquee 12s linear infinite; }
    .group:hover .marquee-content { animation-play-state: paused; }
    @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
</style>