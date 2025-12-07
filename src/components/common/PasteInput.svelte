<script>
  /* global feather */
  import { onMount } from 'svelte';
  import { dataService } from '../../services/dataService.js';
  import { 
    competitionData,
    pastedThiDuaReportData,
    thuongERPData,
    thuongERPDataThangTruoc,
    fileSyncState 
  } from '../../stores.js';

  export let label = "Chưa có nhãn";
  export let icon = "clipboard";
  export let link = "#"; 
  export let saveKeyPaste = ""; 
  export let saveKeyRaw = ""; 
  export let saveKeyProcessed = ""; 

  let textareaEl;
  let pastedText = "";
  let localError = "";

  const storeMap = {
    'daily_paste_luyke': competitionData,
    'daily_paste_thiduanv': pastedThiDuaReportData,
    'daily_paste_thuongerp': thuongERPData,
    'saved_thuongerp_thangtruoc': thuongERPDataThangTruoc
  };
  
  const unitMap = {
    'daily_paste_luyke': 'CT thi đua',
    'daily_paste_thiduanv': 'nhân viên',
    'daily_paste_thuongerp': 'nhân viên',
    'saved_thuongerp_thangtruoc': 'nhân viên'
  };

  const countStore = storeMap[saveKeyProcessed || saveKeyPaste];

  $: syncState = $fileSyncState[saveKeyPaste];
  $: dataCount = countStore ? $countStore?.length || 0 : 0;

  let statusHTML = "";
  let statusClass = "text-gray-500";
  let isLoading = false;

  $: {
      const unit = unitMap[saveKeyPaste] || 'dòng';
      const countDisplay = `(${dataCount} ${unit})`;

      if (isLoading) {
          statusHTML = "Đang xử lý...";
          statusClass = "text-blue-600 font-semibold";
      } else if (localError) {
          statusHTML = localError;
          statusClass = "text-red-600 font-bold";
      } else if (syncState) {
          if (syncState.status === 'update_available') {
              statusClass = "text-orange-600 font-semibold";
              const msg = syncState.message || "Có dữ liệu mới";
              statusHTML = `
                  <span class="mr-2">${msg}</span>
                  <button class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 border border-blue-300 font-bold btn-download-cloud pointer-events-auto shadow-sm">
                      Tải & Xử lý
                  </button>
              `;
          } else if (syncState.status === 'downloading') {
              statusClass = "text-blue-600";
              statusHTML = syncState.message || "Đang tải...";
          } else if (syncState.status === 'error') {
              statusClass = "text-red-600";
              statusHTML = syncState.message;
          } else if (syncState.status === 'synced' || syncState.status === 'cached') {
              // [FIX LOGIC] Chỉ báo lỗi 0 NV nếu ĐÃ CÓ TEXT (pastedText > 0)
              // Nếu pastedText trống, nghĩa là chưa tải nội dung về, thì không coi là lỗi
              if (dataCount === 0 && saveKeyPaste === 'daily_paste_thiduanv' && pastedText.length > 0) {
                  statusClass = "text-red-600 font-bold";
                  statusHTML = `⚠ Đã xử lý 0 NV. Vui lòng kiểm tra DSNV!`;
              } else {
                  statusClass = "text-green-600 font-medium";
                  const prefix = syncState.status === 'synced' ? '✓ Đã đồng bộ' : '✓ Đã tải';
                  let cleanMsg = syncState.message
                      .replace('✓ Đã đồng bộ', '')
                      .replace('✓ Đã tải', '')
                      .replace('(Local)', '')
                      .trim();
                  
                  // Logic hiển thị thông minh: Nếu chưa có text, gợi ý tải
                  if (pastedText.length === 0 && syncState.status === 'synced') {
                      // Đã đồng bộ metadata nhưng chưa có text -> Hiển thị nút tải lại cho chắc
                       statusHTML = `
                          <span class="mr-2 text-gray-500">✓ Đã biết có dữ liệu trên Cloud.</span>
                          <button class="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded hover:bg-green-100 border border-green-200 font-bold btn-download-cloud pointer-events-auto shadow-sm">
                              Tải về máy
                          </button>
                      `;
                  } else {
                       // Hiển thị bình thường
                       if (cleanMsg.includes('dòng') || cleanMsg.includes('nhân viên') || cleanMsg.includes('CT')) {
                           if(cleanMsg.includes('trước') || cleanMsg.includes('vừa xong')) {
                               statusHTML = `${prefix} ${countDisplay} ${cleanMsg}`;
                           } else {
                               statusHTML = `${prefix} ${countDisplay}`;
                           }
                      } else {
                           statusHTML = `${prefix} ${countDisplay} ${cleanMsg}`;
                      }
                  }
              }
          } else if (syncState.status === 'checking') {
               statusClass = "text-gray-500 italic";
               statusHTML = "Đang kiểm tra đồng bộ...";
          }
      } else if (dataCount > 0) {
          statusClass = "text-green-600";
          statusHTML = `✓ Đã tải ${countDisplay} (Local)`;
      } else {
          statusHTML = "";
      }
  }

  onMount(() => {
    const textLoadKey = saveKeyRaw || saveKeyPaste;
    pastedText = localStorage.getItem(textLoadKey) || "";
    
    window.addEventListener('cloud-paste-loaded', (e) => {
        if (e.detail.key === saveKeyPaste) {
            pastedText = e.detail.text;
        }
    });

    if (typeof feather !== 'undefined') feather.replace();
  });

  let pasteTimer;
  function handleInput(event) {
      const text = event.target.value;
      pastedText = text;
      localError = "";
      clearTimeout(pasteTimer);
      
      if (!text || text.trim().length < 5) return;
      
      isLoading = true;
      pasteTimer = setTimeout(async () => {
          try {
            const result = await dataService.handlePasteChange(
                text, 
                saveKeyPaste, 
                saveKeyRaw, 
                saveKeyProcessed
            );
            if (!result.success) localError = result.message;
          } catch (err) {
            console.error(`Lỗi paste ${label}:`, err);
            localError = `Lỗi: ${err.message}`;
          } finally {
            isLoading = false;
          }
      }, 500);
  }

  function handleContainerClick(e) {
      if (e.target.closest('.btn-download-cloud')) {
          e.preventDefault();
          e.stopPropagation();
          dataService.downloadFileFromCloud(saveKeyPaste);
      }
  }
</script>

<div class="data-input-group input-group--blue h-full" on:click={handleContainerClick}>
    <a href={link} target="_blank" class="data-input-group__label data-input-group__label--link">
        <i data-feather={icon} class="h-5 w-5 feather"></i>
        <span>{label}: <span class="font-normal text-xs text-gray-500 ml-1">(Copy từ BI)</span></span>
    </a>
    <div class="data-input-group__content flex flex-col flex-grow">
        <textarea 
            bind:this={textareaEl}
            rows="5" 
            class="data-textarea flex-grow mb-1" 
            placeholder="Dán dữ liệu đã sao chép vào đây..."
            on:input={handleInput}
            value={pastedText}
            disabled={isLoading}
        ></textarea>
        
        <div class="data-input-group__status-wrapper min-h-[20px]">
            <span class="data-input-group__status-text {statusClass} flex items-center gap-1">
                {@html statusHTML}
            </span>
        </div>
        
        {#if isLoading || (syncState && syncState.status === 'downloading')}
             <div class="progress-bar-container mt-1">
                <div class="progress-bar" style="width: 100%; background-color: #3b82f6;"></div>
            </div>
        {/if}
    </div>
</div>