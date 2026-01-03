<script>
  /* global feather */
  import { onMount } from 'svelte';
  // [FIX] Import đúng object dataService
  import { dataService } from '../../services/dataService.js';
  import { 
    danhSachNhanVien, rawGioCongData, ycxData, thuongNongData,
    ycxDataThangTruoc, thuongNongDataThangTruoc,
    fileSyncState 
  } from '../../stores.js';
  
  export let label = "Chưa có nhãn";
  export let icon = "file";
  export let saveKey = "";
  // [ADD] Thêm prop link để nhận đường dẫn từ cha
  export let link = "";

  let fileName = "Chưa thêm file";
  let statusHTML = ""; 
  let isLoading = false;
  let statusClass = "text-gray-500";
  let localError = ""; // [FIX] Biến lưu lỗi cục bộ
  
  const storeMap = {
    'saved_danhsachnv': danhSachNhanVien,
    'saved_giocong': rawGioCongData,
    'saved_ycx': ycxData,
    'saved_thuongnong': thuongNongData,
    'saved_ycx_thangtruoc': ycxDataThangTruoc,
    'saved_thuongnong_thangtruoc': thuongNongDataThangTruoc
  };
  let dataStore = storeMap[saveKey];

  $: syncState = $fileSyncState[saveKey];
  $: dataCount = $dataStore ? $dataStore.length : 0;
  // Logic hiển thị trạng thái (Reactive)
  $: {
      if (isLoading) {
          statusHTML = "Đang xử lý...";
          statusClass = "text-blue-600 font-semibold";
      } else if (localError) {
          // [FIX] Ưu tiên hiển thị lỗi nếu có
          statusHTML = localError;
          statusClass = "text-red-600 font-bold";
      } else if (syncState) {
          if (syncState.status === 'update_available') {
              statusClass = "text-orange-600 font-semibold";
              statusHTML = `
                  <span>${syncState.message}</span>
                  <button class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 border border-blue-300 font-bold btn-download-cloud pointer-events-auto">
                      Tải & Xử lý
                  </button>
      
              `;
          } else if (syncState.status === 'downloading') {
              statusClass = "text-blue-600";
              statusHTML = syncState.message;
          } else if (syncState.status === 'error') {
              statusClass = "text-red-600";
              statusHTML = syncState.message;
          } else {
              // Synced hoặc Cached
              statusClass = "text-green-600 font-medium";
              statusHTML = syncState.message;
              if (syncState.metadata?.fileName) fileName = syncState.metadata.fileName;
          }
      } else if (dataCount > 0) {
          // Fallback khi chưa có syncState nhưng có data trong store
          statusClass = "text-green-600";
          statusHTML = `✓ Đã tải ${dataCount} dòng (Local)`;
          
          if (saveKey === 'saved_danhsachnv') {
               const savedName = localStorage.getItem('_localDsnvFilename');
               if(savedName) fileName = savedName;
          }
      } else {
          statusHTML = "";
      }
  }

  async function handleChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    isLoading = true;
    localError = ""; // Reset lỗi cũ
    fileName = file.name;
    try {
      // Gọi service
      const result = await dataService.handleFileChange(file, saveKey);
      if (!result.success) {
          localError = result.message;
      }
    } catch (err) {
      console.error(err);
      localError = `Lỗi: ${err.message}`;
    } finally {
      isLoading = false;
      event.target.value = null;
    }
  }

  function handleContainerClick(e) {
      // Nếu click vào thẻ a (link) thì không làm gì cả, để trình duyệt mở tab mới
      if (e.target.closest('a')) return;

      if (e.target.closest('.btn-download-cloud')) {
          e.preventDefault();
          e.stopPropagation();
          dataService.downloadFileFromCloud(saveKey);
      }
  }
  
  onMount(() => {
     if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="data-input-group input-group--yellow" on:click={handleContainerClick}> 
    <div class="data-input-group__label relative z-10"> 
       <i data-feather={icon} class="h-5 w-5 feather"></i>
       
       {#if link}
            <a 
                href={link} 
                target="_blank" 
                class="text-blue-700 underline font-bold cursor-pointer relative z-50 hover:text-blue-900 pointer-events-auto"
                on:click|stopPropagation={() => console.log('Link clicked')}
                title="Mở báo cáo nguồn"
            >
                {label}: <i class="w-3 h-3 inline-block ml-1" data-feather="external-link"></i>
            </a>
       {:else}
            <span>{label}:</span>
       {/if}
    </div> 
    
    <div class="data-input-group__content"> 
        <div class="flex items-center gap-2"> 
            <label for="file-{saveKey}" class="data-input-group__file-trigger" class:opacity-50={isLoading}>
                {isLoading ?
                'Đang chạy...' : 'Thêm file'}
            </label>
            <span class="data-input-group__file-name" title={fileName}>{fileName}</span> 
        </div> 
        
        {#if saveKey === 'saved_danhsachnv'}
            <button on:click={() => dataService.handleTemplateDownload()} class="data-input-group__link text-left">Tải file mẫu</button> 
        {/if}

        <input type="file" id="file-{saveKey}" class="hidden" accept=".xlsx, 
        .xls, .csv" on:change={handleChange} disabled={isLoading}> 
        
        <div class="data-input-group__status-wrapper"> 
            <span class="data-input-group__status-text {statusClass}">{@html statusHTML}</span> 
        </div> 
        
        {#if isLoading ||
        (syncState && syncState.status === 'downloading')}
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: 100%; background-color: #3b82f6;"></div>
            </div>
        {/if}
    </div> 
</div>