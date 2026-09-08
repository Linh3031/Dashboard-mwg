<script>
  /* global feather */
  import { onMount, afterUpdate } from 'svelte';
  import { doanhThuBIData, fileSyncState } from '../../stores.js';
  import { processDoanhThuBiPaste } from '../../services/data/biPasteHandler.js';

  const RAW_TEXT_KEY = 'saved_doanhthu_bi_paste_text';
  const BASE_KEY = 'saved_doanhthu_bi';

  let pastedText = '';
  let isLoading = false;
  let localError = '';
  let unresolvedMaKho = [];
  let totalMismatch = false;

  $: syncState = $fileSyncState[BASE_KEY];
  $: uniqueWarehouses = [...new Set(($doanhThuBIData || []).map(d => d.maKho).filter(Boolean).map(c => String(c).trim()))];

  let pasteTimer;
  function processText(text) {
      pastedText = text;
      localError = '';
      unresolvedMaKho = [];
      totalMismatch = false;
      localStorage.setItem(RAW_TEXT_KEY, text);
      clearTimeout(pasteTimer);
      if (!text || text.trim().length < 10) return;

      isLoading = true;
      pasteTimer = setTimeout(async () => {
          try {
              const result = await processDoanhThuBiPaste(text);
              if (!result.success) {
                  localError = result.message;
              } else {
                  unresolvedMaKho = result.unresolvedMaKho || [];
                  totalMismatch = !!result.totalMismatch;
              }
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

  onMount(() => {
      pastedText = localStorage.getItem(RAW_TEXT_KEY) || '';
      if (typeof feather !== 'undefined') feather.replace();
  });

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="data-input-group input-group--blue h-full">
    <div class="data-input-group__label">
        <i data-feather="bar-chart-2" class="h-5 w-5 feather"></i>
        <span>Doanh thu BI: <span class="font-normal text-xs text-gray-500 ml-1">(Copy từ BI)</span></span>
    </div>
    <div class="data-input-group__content flex flex-col flex-grow">
        <textarea
            rows="5"
            class="data-textarea flex-grow mb-1"
            placeholder="Dán dữ liệu Doanh thu BI đã copy vào đây..."
            on:input={handleInput}
            value={pastedText}
            disabled={isLoading}
        ></textarea>

        <div class="data-input-group__status-wrapper min-h-[20px]">
            {#if isLoading}
                <span class="data-input-group__status-text text-blue-600 font-semibold">Đang xử lý...</span>
            {:else if localError}
                <span class="data-input-group__status-text text-red-600 font-bold">{localError}</span>
            {:else if syncState?.message}
                <span class="data-input-group__status-text text-green-600 font-medium">{syncState.message}</span>
            {/if}
        </div>

        {#if totalMismatch}
            <div class="text-[11px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                <i data-feather="alert-triangle" class="w-3 h-3"></i> Số tổng cụm không khớp — kiểm tra lại dữ liệu đã dán.
            </div>
        {/if}
        {#if unresolvedMaKho.length > 0}
            <div class="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                <i data-feather="alert-circle" class="w-3 h-3"></i> Mã kho chưa khớp DSNV: {unresolvedMaKho.join(', ')}
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
