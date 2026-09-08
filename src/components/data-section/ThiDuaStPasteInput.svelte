<script>
  /* global feather */
  import { onMount, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import { competitionData, fileSyncState } from '../../stores.js';
  import { processThiDuaStPaste } from '../../services/data/thiDuaStPasteHandler.js';
  import { dataService } from '../../services/dataService.js';

  const RAW_TEXT_KEY = 'saved_thidua_st_paste_text';
  const BASE_KEY = 'saved_thidua_st_excel';

  let pastedText = '';
  let isLoading = false;
  let localError = '';
  let unresolvedTenKho = [];

  $: syncState = $fileSyncState[BASE_KEY];
  $: uniqueWarehouses = [...new Set(($competitionData || []).map(d => d.maKho).filter(Boolean).map(c => String(c).trim()))];

  let pasteTimer;
  function processText(text) {
      pastedText = text;
      localError = '';
      unresolvedTenKho = [];
      localStorage.setItem(RAW_TEXT_KEY, text);
      clearTimeout(pasteTimer);
      if (!text || text.trim().length < 10) return;

      isLoading = true;
      pasteTimer = setTimeout(async () => {
          try {
              const result = await processThiDuaStPaste(text);
              if (!result.success) {
                  localError = result.message;
              }
              unresolvedTenKho = result.unresolvedTenKho || [];
          } catch (err) {
              localError = `Lỗi: ${err.message}`;
          } finally {
              isLoading = false;
          }
      }, 500);
  }

  function handleInput(event) {
      processText(event.target.value);
  }

  let isDownloading = false;
  async function handleDownloadFromCloud() {
      isDownloading = true;
      try {
          await dataService.downloadFileFromCloud(BASE_KEY);
          // [FIX] downloadFileFromCloud chỉ nạp dữ liệu vào store, không tự điền lại ô dán —
          // tải luôn nội dung gốc từ downloadURL để ô dán không trông như "chưa tải được".
          const downloadURL = get(fileSyncState)[BASE_KEY]?.metadata?.downloadURL;
          if (downloadURL) {
              const res = await fetch(downloadURL);
              const text = await res.text();
              pastedText = text;
              localStorage.setItem(RAW_TEXT_KEY, text);
          }
      } finally {
          isDownloading = false;
      }
  }

  onMount(() => {
      pastedText = localStorage.getItem(RAW_TEXT_KEY) || '';
      // [FIX] Chỉ hiện lại chữ đã lưu không tự nạp lại dữ liệu — nếu sau F5 mà store đang trống
      // (cacheHandler chưa kịp/không nạp được), xử lý lại ngay text đã có, không bắt gõ tay mới chạy.
      if (pastedText && get(competitionData).length === 0) {
          processText(pastedText);
      }
      if (typeof feather !== 'undefined') feather.replace();
  });

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="data-input-group input-group--blue h-full">
    <div class="data-input-group__label">
        <i data-feather="layers" class="h-5 w-5 feather"></i>
        <span>Thi đua ST: <span class="font-normal text-xs text-gray-500 ml-1">(Copy từ BI)</span></span>
    </div>
    <div class="data-input-group__content flex flex-col flex-grow">
        <textarea
            rows="5"
            class="data-textarea flex-grow mb-1"
            placeholder="Dán dữ liệu Thi đua siêu thị đã copy vào đây..."
            on:input={handleInput}
            value={pastedText}
            disabled={isLoading}
        ></textarea>

        <div class="data-input-group__status-wrapper min-h-[20px]">
            {#if isLoading || isDownloading}
                <span class="data-input-group__status-text text-blue-600 font-semibold">Đang xử lý...</span>
            {:else if localError}
                <span class="data-input-group__status-text text-red-600 font-bold">{localError}</span>
            {:else if syncState?.status === 'update_available'}
                <span class="data-input-group__status-text text-orange-600 font-semibold flex items-center gap-2 flex-wrap">
                    <span>{syncState.message}</span>
                    <button type="button" on:click={handleDownloadFromCloud} class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 border border-blue-300 font-bold shadow-sm">Tải & Xử lý</button>
                </span>
            {:else if syncState?.message}
                <span class="data-input-group__status-text text-green-600 font-medium">{syncState.message}</span>
            {/if}
        </div>

        {#if unresolvedTenKho.length > 0}
            <div class="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                <i data-feather="alert-circle" class="w-3 h-3"></i> Tên kho chưa khớp DSNV: {unresolvedTenKho.join(', ')}
            </div>
        {/if}

        {#if uniqueWarehouses.length > 0}
            <div class="mt-2">
                <div class="text-[10px] text-indigo-500 w-full font-bold uppercase mb-1.5 flex items-center gap-1">
                    <i data-feather="home" class="w-3 h-3"></i> Mã Kho ({uniqueWarehouses.length}):
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each uniqueWarehouses as whCode}
                        <div class="flex items-center gap-1 bg-white border border-indigo-200 px-2 py-1 rounded shadow-sm text-xs font-bold text-indigo-800">
                            {whCode}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>
