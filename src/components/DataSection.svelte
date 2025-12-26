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
  
  // Import để mở Popup chi tiết phiên bản
  import { showVersionDetails } from './common/VersionManager.svelte';

  export let activeTab;
  
  let isSyncing = false;
  let dsnvUnsubscribe; 

  // --- LOGIC MỚI: KIỂM TRA PHIÊN BẢN ---
  let latestVersion = '';
  let tickerStatus = 'none'; // 'none' | 'new' | 'current'

  $: if ($homeConfig && $homeConfig.changelogs && $homeConfig.changelogs.length > 0) {
      const serverVer = $homeConfig.changelogs[0].version;
      const clientVer = localStorage.getItem('app_client_version') || '';
      
      latestVersion = serverVer; // Luôn hiển thị version mới nhất

      if (serverVer && serverVer !== clientVer) {
          tickerStatus = 'new'; // Có bản mới -> Hiện màu đỏ/vàng
      } else {
          tickerStatus = 'current'; // Đã update -> Hiện màu xanh/trắng
      }
  }

  // --- LOGIC CŨ: ĐỒNG BỘ DỮ LIỆU ---
  onMount(async () => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }

    const savedWh = localStorage.getItem('selectedWarehouse');
    if (savedWh) {
        console.log(`[DataSection] Phát hiện kho đã lưu: ${savedWh}. Đang chờ DSNV...`);
        selectedWarehouse.set(savedWh);
        
        await dataService.loadWarehouseSettings(savedWh); 

        dsnvUnsubscribe = danhSachNhanVien.subscribe(async (data) => {
            if (data && data.length > 0) {
                console.log(`[DataSection] DSNV đã sẵn sàng (${data.length} dòng). Tiến hành đồng bộ kho ${savedWh}.`);
                await triggerSync(savedWh);
                
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
          notificationStore.set({ message: 'Thành công!', type: 'success' });
      } catch (error) {
            console.error("CRITICAL SYNC ERROR:", error);
            // Không set error notification để tránh spam lỗi nếu mạng chập chờn
      } finally {
            isSyncing = false;
      }
  }

  async function handleWarehouseChange(event) {
      const newWarehouse = event.target.value;
      selectedWarehouse.set(newWarehouse);
      if (newWarehouse) {
          localStorage.setItem('selectedWarehouse', newWarehouse);
          notificationStore.set(`Đang đồng bộ dữ liệu cho ${newWarehouse}...`, 'info');
          await triggerSync(newWarehouse);
      } else {
          localStorage.removeItem('selectedWarehouse');
      }
  }

  $: if (activeTab === 'data-section') {
    Promise.resolve().then(() => {
      if (typeof window.feather !== 'undefined') {
        window.feather.replace();
      }
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
                  <label for="data-warehouse-selector" class="text-sm font-semibold text-gray-700">Kho:</label>
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
                            <option value="">-- Chọn Kho --</option>
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
                    class="flex-grow min-w-[200px] {tickerStatus === 'new' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'} text-white font-bold rounded-lg px-4 py-2 cursor-pointer shadow-lg border border-white/20 transition-all flex items-center overflow-hidden relative group"
                    on:click={() => showVersionDetails.set(true)}
                    role="button"
                    tabindex="0"
                >
                    <div class="marquee-content whitespace-nowrap text-sm flex items-center gap-4">
                        {#if tickerStatus === 'new'}
                            <span class="flex items-center gap-1 bg-yellow-400 text-red-900 px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider animate-pulse shadow-sm border border-yellow-500">
                                <i data-feather="zap" class="w-3 h-3"></i> Mới
                            </span>
                            <span class="drop-shadow-md text-white">Đã có phiên bản <span class="text-yellow-300 font-mono text-base bg-black/20 px-1.5 rounded border border-white/10">{latestVersion}</span> - Bấm để xem chi tiết!</span>
                        {:else}
                            <span class="flex items-center gap-1 bg-white/20 text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-white/30">
                                <i data-feather="check-circle" class="w-3 h-3"></i> Đã cập nhật
                            </span>
                            <span class="drop-shadow-md text-blue-50">Hệ thống đang chạy phiên bản <span class="font-mono text-base text-white bg-blue-900/30 px-1.5 rounded border border-white/10">{latestVersion}</span></span>
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
                label="Data lũy kế"
                icon="clipboard"
                link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=1"
                saveKeyPaste="daily_paste_luyke"
            />
            
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
</style>