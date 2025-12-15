<script>
  /* global feather */
  import { onMount, onDestroy } from 'svelte'; 
  
  import FileInput from './common/FileInput.svelte';
  import PasteInput from './common/PasteInput.svelte';

  import { 
      warehouseList,
      selectedWarehouse,
      notificationStore,
      danhSachNhanVien
  } from '../stores.js';
  
  import { dataService } from '../services/dataService.js';

  export let activeTab;
  
  let isSyncing = false;
  let dsnvUnsubscribe; 

  onMount(async () => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }

    const savedWh = localStorage.getItem('selectedWarehouse');
    if (savedWh) {
        console.log(`[DataSection] Phát hiện kho đã lưu: ${savedWh}. Đang chờ DSNV...`);
        selectedWarehouse.set(savedWh);
        
        // Load settings ngay lập tức khi khôi phục kho từ localStorage
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
          // [UPDATED] Gọi song song: Đồng bộ file và Tải cấu hình
          await Promise.all([
              dataService.syncDownFromCloud(warehouse),
              dataService.loadWarehouseSettings(warehouse)
          ]);
          
          notificationStore.show(`Đã đồng bộ dữ liệu cho kho ${warehouse}`, 'success');
      } catch (error) {
          console.error("Lỗi nghiêm trọng khi đồng bộ:", error);
          notificationStore.show(`Lỗi đồng bộ: ${error.message}`, 'error');
      } finally {
          isSyncing = false;
      }
  }

  async function handleWarehouseChange(event) {
      const newWarehouse = event.target.value;
      selectedWarehouse.set(newWarehouse);
      
      if (newWarehouse) {
          localStorage.setItem('selectedWarehouse', newWarehouse);
          notificationStore.show(`Đang đồng bộ dữ liệu cho ${newWarehouse}...`, 'info');
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
         <div class="flex flex-wrap items-center gap-4">
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
        </div>
        <div id="version-marquee-container" class="marquee-container flex-grow min-w-[200px]">
             <p class="marquee-text"></p>
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