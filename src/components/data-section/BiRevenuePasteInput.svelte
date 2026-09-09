<script>
  /* global feather */
  import { onMount, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import { danhSachNhanVien, doanhThuBIData, fileSyncState, selectedWarehouse } from '../../stores.js';
  import { processDoanhThuBiPaste } from '../../services/data/biPasteHandler.js';
  import { parseDoanhThuBiPasted } from '../../services/processing/parsers/biPaste.parser.js';
  import { dataService } from '../../services/dataService.js';

  const RAW_TEXT_KEY = 'saved_doanhthu_bi_paste_text';
  const BASE_KEY = 'saved_doanhthu_bi';

  let pastedText = '';
  let isLoading = false;
  let localError = '';
  let unresolvedMaKho = [];
  let totalMismatch = false;

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

  // [FIX] Cơ chế kiểm tra đồng bộ có sẵn của app (syncHandler.js) lưu trạng thái dưới key khác
  // nhau tuỳ đang lọc "Tất cả kho" hay 1 kho cụ thể (`saved_doanhthu_bi` vs `saved_doanhthu_bi_{kho}`),
  // trong khi ô này gộp nhiều kho nên luôn đọc key gộp — dễ lệch. Dự phòng đọc thẳng meta lưu máy
  // (đúng kiểu FileInput.svelte đã làm) để không hiện trống dù dữ liệu vẫn còn nguyên.
  let localMetaFallback = null;
  function reloadLocalMeta() {
      try {
          const wh = get(selectedWarehouse) || 'ALL';
          const metaStr = localStorage.getItem(`_meta_${wh}_${BASE_KEY}`);
          localMetaFallback = metaStr ? JSON.parse(metaStr) : null;
      } catch (e) { localMetaFallback = null; }
  }
  $: $selectedWarehouse, reloadLocalMeta();

  $: rawSyncState = $fileSyncState[BASE_KEY];
  $: syncState = (!rawSyncState || !rawSyncState.metadata) && localMetaFallback
      ? { status: 'synced', message: `✓ Đã đồng bộ ${formatTimeAgo(localMetaFallback.timestamp || localMetaFallback.updatedAt)}`, metadata: localMetaFallback }
      : rawSyncState;
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

  // [FIX] Không xử lý ngay lúc mount nữa — lúc đó DSNV có thể chưa tải xong nên so khớp mã kho ra
  // rỗng, im lặng bỏ qua. Chờ đúng lúc DSNV thật sự có dữ liệu ($danhSachNhanVien đổi từ rỗng
  // sang có) mới thử nạp lại cục bộ, và chỉ khi store hiển thị vẫn đang trống.
  $: if ($danhSachNhanVien && $danhSachNhanVien.length > 0 && pastedText && $doanhThuBIData.length === 0) {
      const { results } = parseDoanhThuBiPasted(pastedText);
      if (results.length > 0) {
          const uploadedKho = new Set(results.map(r => r.maKho));
          doanhThuBIData.update(curr => [...(curr || []).filter(d => !uploadedKho.has(d.maKho)), ...results]);
      }
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
        <span><a href="https://baocao.dienmayxanh.com/dashboard/revenue-consolidated" target="_blank" rel="noopener noreferrer" class="hover:underline">Doanh thu BI</a>: <span class="font-normal text-xs text-gray-500 ml-1">(Copy từ BI)</span></span>
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
