<script>
  /* global feather */
  import { onMount, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import { danhSachNhanVien, fileSyncState, pastedThiDuaReportData } from '../../stores.js';
  import { processThiDuaNvPaste } from '../../services/data/thiDuaNvPasteHandler.js';
  import { parseThiDuaNvPasted } from '../../services/processing/parsers/thiduaNvPaste.parser.js';
  import { dataService } from '../../services/dataService.js';

  export let targetKho = '';

  $: rawTextKey = `saved_thiduanv_excel_paste_text_${targetKho}`;
  $: baseKey = 'saved_thiduanv_excel';
  $: stateKey = `${baseKey}_${targetKho}`;

  let pastedText = '';
  let isLoading = false;
  let localError = '';
  let unresolvedMaNV = [];
  let wrongKhoEmployees = [];
  let loadedForKho = '';

  function formatTimeAgo(dateInput) {
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
      } catch (e) { return ''; }
  }

  // [FIX] Lúc lọc "Tất cả kho", syncHandler.js kiểm tra đồng bộ theo lô và lưu trạng thái dưới key
  // gộp `saved_thiduanv_excel` (không có hậu tố kho), khác với key riêng từng kho ô này đang đọc
  // (`saved_thiduanv_excel_{kho}`) — nên đổi bộ lọc mới thấy khác nhau dù dữ liệu vẫn còn nguyên.
  // Dự phòng đọc thẳng meta lưu máy theo đúng kho của ô này (đúng kiểu FileInput.svelte đã làm).
  $: localMetaStr = (() => { try { return localStorage.getItem(`_meta_${targetKho}_${baseKey}`); } catch (e) { return null; } })();
  $: localMetaFallback = (() => { try { return localMetaStr ? JSON.parse(localMetaStr) : null; } catch (e) { return null; } })();

  $: rawSyncState = $fileSyncState[stateKey];
  $: syncState = (!rawSyncState || !rawSyncState.metadata) && localMetaFallback
      ? { status: 'synced', message: `✓ Đã đồng bộ ${formatTimeAgo(localMetaFallback.timestamp || localMetaFallback.updatedAt)}`, metadata: localMetaFallback }
      : rawSyncState;

  let pasteTimer;
  function processText(text) {
      pastedText = text;
      localError = '';
      unresolvedMaNV = [];
      wrongKhoEmployees = [];
      localStorage.setItem(rawTextKey, text);
      clearTimeout(pasteTimer);
      if (!text || text.trim().length < 10) return;

      isLoading = true;
      pasteTimer = setTimeout(async () => {
          try {
              const result = await processThiDuaNvPaste(text, targetKho);
              if (!result.success) {
                  localError = result.message;
              }
              unresolvedMaNV = result.unresolvedMaNV || [];
              wrongKhoEmployees = result.wrongKhoEmployees || [];
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
          await dataService.downloadFileFromCloud(stateKey);
          // [FIX] downloadFileFromCloud chỉ nạp dữ liệu vào store, không tự điền lại ô dán —
          // tải luôn nội dung gốc từ downloadURL để ô dán không trông như "chưa tải được".
          const downloadURL = get(fileSyncState)[stateKey]?.metadata?.downloadURL;
          if (downloadURL) {
              const res = await fetch(downloadURL);
              const text = await res.text();
              pastedText = text;
              localStorage.setItem(rawTextKey, text);
          }
      } finally {
          isDownloading = false;
      }
  }

  $: if (targetKho && targetKho !== loadedForKho) {
      loadedForKho = targetKho;
      pastedText = localStorage.getItem(rawTextKey) || '';
  }

  // [FIX] Không xử lý ngay lúc đổi kho/mount nữa — lúc đó DSNV có thể chưa tải xong nên so khớp
  // MSNV↔kho ra rỗng, im lặng bỏ qua. Chờ đúng lúc DSNV thật sự có dữ liệu ($danhSachNhanVien đổi
  // từ rỗng sang có) mới thử nạp lại cục bộ, và chỉ khi store hiển thị vẫn đang trống đúng kho này.
  $: if ($danhSachNhanVien && $danhSachNhanVien.length > 0 && targetKho && pastedText &&
         $pastedThiDuaReportData.filter(e => String(e.maKho) === String(targetKho)).length === 0) {
      const { results } = parseThiDuaNvPasted(pastedText, targetKho);
      if (results.length > 0) {
          pastedThiDuaReportData.update(curr => [...(curr || []).filter(e => String(e.maKho) !== String(targetKho)), ...results]);
      }
  }

  onMount(() => {
      if (typeof feather !== 'undefined') feather.replace();
  });

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="data-input-group input-group--blue h-full">
    <div class="data-input-group__label">
        <i data-feather="file-text" class="h-5 w-5 feather"></i>
        <span>Thi đua nhân viên ({targetKho}): <span class="font-normal text-xs text-gray-500 ml-1">(Copy từ BI)</span></span>
    </div>
    <div class="data-input-group__content flex flex-col flex-grow">
        <textarea
            rows="5"
            class="data-textarea flex-grow mb-1"
            placeholder="Dán dữ liệu Thi đua nhân viên đã copy vào đây..."
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

        {#if wrongKhoEmployees.length > 0}
            <div class="text-[11px] text-red-600 font-bold mt-1">
                <div class="flex items-center gap-1"><i data-feather="alert-circle" class="w-3 h-3"></i> Nhân viên không thuộc kho {targetKho}:</div>
                <ul class="ml-4 list-disc">
                    {#each wrongKhoEmployees as e}
                        <li>{e.maNV} - {e.hoTen} (thuộc kho {e.actualKho})</li>
                    {/each}
                </ul>
            </div>
        {/if}
        {#if unresolvedMaNV.length > 0}
            <div class="text-[11px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                <i data-feather="alert-triangle" class="w-3 h-3"></i> MSNV chưa có trong DSNV: {unresolvedMaNV.join(', ')}
            </div>
        {/if}
    </div>
</div>
