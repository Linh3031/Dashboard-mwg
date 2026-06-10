<script>
  /* global feather */
  import { onMount, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { dataService } from '../../services/dataService.js';
  import { 
    competitionData,
    pastedThiDuaReportData,
    thuongERPData,
    thuongERPDataThangTruoc,
    fileSyncState,
    selectedWarehouse,
    clusterSummaryData
  } from '../../stores.js';

  export let label = "Chưa có nhãn";
  export let icon = "clipboard";
  export let link = "#";
  export let saveKeyPaste = ""; 
  export let saveKeyRaw = ""; 
  export let saveKeyProcessed = ""; 

  const dispatch = createEventDispatcher();
  let textareaEl;
  let pastedText = "";
  let localError = "";

  const storeMap = {
    'daily_paste_luyke': competitionData,
    'cluster_paste_luyke': competitionData,
    'daily_paste_thiduanv': pastedThiDuaReportData,
    'daily_paste_thuongerp': thuongERPData,
    'saved_thuongerp_thangtruoc': thuongERPDataThangTruoc,
    'cluster_summary_data': clusterSummaryData
  };

  const unitMap = {
    'daily_paste_luyke': 'CT thi đua',
    'cluster_paste_luyke': 'CT thi đua',
    'daily_paste_thiduanv': 'nhân viên',
    'daily_paste_thuongerp': 'nhân viên',
    'saved_thuongerp_thangtruoc': 'nhân viên',
    'cluster_summary_data': 'dòng'
  };

  // [PHẪU THUẬT LOGIC]: Ép sắp xếp key theo độ dài chuỗi giảm dần để chấm dứt tình trạng trùng lặp prefix (ví dụ: daily_paste_luyke gối đầu lên cluster_paste_luyke)
  $: baseKey = (() => {
      const pk = saveKeyProcessed || saveKeyPaste;
      const sortedKeys = Object.keys(storeMap).sort((a, b) => b.length - a.length);
      for (const k of sortedKeys) {
          if (pk.startsWith(k)) return k;
      }
      return pk;
  })();

  $: countStore = storeMap[baseKey];
  $: unit = unitMap[baseKey] || unitMap[saveKeyPaste] || 'dòng';
  
  $: syncState = $fileSyncState[saveKeyPaste];
  $: dataCount = syncState?.metadata?.rowCount ?? (countStore ? $countStore?.length || 0 : 0);

  let statusHTML = "";
  let statusClass = "text-gray-500";
  let isLoading = false;

  export function formatTimeAgo(dateInput) {
      if (!dateInput) return '';
      try {
          const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
          if (isNaN(date.getTime())) return ''; 
          const seconds = Math.floor((new Date() - date) / 1000);
          
          let interval = seconds / 3600;
          if (interval > 1) return Math.floor(interval) + " giờ trước";
          interval = seconds / 60;
          if (interval > 1) return Math.floor(interval) + " phút trước";
          return "vừa xong";
      } catch (e) {
          return '';
      }
  }

  $: {
      const countDisplay = dataCount > 0 ? `(${dataCount} ${unit})` : '';
      
      if (isLoading) {
          statusHTML = "Đang xử lý...";
          statusClass = "text-blue-600 font-semibold";
      } else if (localError) {
          statusHTML = localError;
          statusClass = "text-red-600 font-bold";
      } else if (syncState) {
          if (syncState.status === 'update_available') {
              statusClass = "text-orange-600 font-semibold";
              const timeAgo = syncState.metadata ? formatTimeAgo(syncState.metadata.timestamp || syncState.metadata.updatedAt) : '';
              const sender = syncState.metadata?.updatedBy || 'người khác';
              statusHTML = `
                  <span class="mr-2">Có cập nhật mới từ ${sender} ${timeAgo}</span>
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
              if (dataCount === 0 && baseKey === 'daily_paste_thiduanv' && pastedText.trim().length > 0) {
                  statusClass = "text-red-600 font-bold";
                  statusHTML = `⚠ Đã xử lý 0 NV. Vui lòng kiểm tra DSNV!`;
              } else {
                  statusClass = "text-green-600 font-medium";
                  const prefix = syncState.status === 'synced' ? '✓ Đã đồng bộ' : '✓ Đã tải (Local)';
                  const timeAgo = syncState.metadata ? formatTimeAgo(syncState.metadata.timestamp || syncState.metadata.updatedAt) : '';
                  const timeDisplay = timeAgo ? ` ${timeAgo}` : '';
                  if (pastedText.trim().length === 0 && syncState.status === 'synced') {
                       statusHTML = `
                          <span class="mr-2 text-gray-500">✓ Có dữ liệu mới trên Cloud.</span>
                          <button class="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded hover:bg-green-100 border border-green-200 font-bold btn-download-cloud pointer-events-auto shadow-sm">
                              Tải về máy
                          </button>
                      `;
                  } else {
                       statusHTML = `${prefix} ${countDisplay}${timeDisplay}`;
                  }
              }
          } else if (syncState.status === 'checking') {
               statusClass = "text-gray-500 italic";
               statusHTML = "Đang kiểm tra đồng bộ...";
          }
      } 
      else if (dataCount > 0 && pastedText.trim().length > 0) {
          statusClass = "text-green-600";
          statusHTML = `✓ Đã tải ${countDisplay} (Local)`;
      } else {
          statusHTML = "";
      }
  }

  let currentSaveKey = "";
  $: if (saveKeyPaste && saveKeyPaste !== currentSaveKey) {
      currentSaveKey = saveKeyPaste;
      const textLoadKey = saveKeyRaw || saveKeyPaste;
      pastedText = localStorage.getItem(textLoadKey) || "";
      if (!$fileSyncState[saveKeyPaste]) {
          let targetWh = null;
          let baseKeyForMeta = saveKeyPaste;
          for (const k of Object.keys(storeMap)) {
              if (saveKeyPaste.startsWith(k + '_')) {
                  targetWh = saveKeyPaste.replace(k + '_', '');
                  baseKeyForMeta = k;
                  break;
              }
          }
          let wh = targetWh || get(selectedWarehouse);
          if (saveKeyPaste === 'cluster_summary_data') wh = 'CLUSTER_ALL';

          if (wh) {
              const metaStr = localStorage.getItem(`_meta_${wh}_${baseKeyForMeta}`);
              if (metaStr) {
                  try {
                      const meta = JSON.parse(metaStr);
                      fileSyncState.update(s => ({
                          ...s,
                          [saveKeyPaste]: { status: 'synced', message: `✓ Đã đồng bộ`, metadata: meta }
                      }));
                  } catch(e){}
              }
          }
      }
  }

  let pasteTimer;
  function processText(text) {
      pastedText = text;
      localError = "";
      clearTimeout(pasteTimer);
      dispatch('paste', text);
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

  onMount(() => {
    window.addEventListener('cloud-paste-loaded', (e) => {
        if (e.detail.key === saveKeyPaste) {
            processText(e.detail.text);
        }
    });

    if (typeof feather !== 'undefined') feather.replace();
  });

  function handleInput(event) {
      processText(event.target.value);
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