<script>
  /* global feather */
  import { onMount } from 'svelte';
  // === SỬA LỖI: Đổi { dataService } thành * as dataService ===
  import * as dataService from '../services/dataService.js';
  import { 
    danhSachNhanVien,
    rawGioCongData,
    ycxData,
    thuongNongData,
    ycxDataThangTruoc,
    thuongNongDataThangTruoc
  } from '../stores.js';

  // Props (Inputs) - Sẽ được truyền từ DataSection
  export let label = "Chưa có nhãn";
  export let icon = "file";
  export let saveKey = ""; // Rất quan trọng, ví dụ: "saved_danhsachnv"

  // Internal State (Trạng thái nội bộ)
  let fileName = "Chưa thêm file";
  let fileStatus = "";
  let isLoading = false;
  let store = null;

  // Lấy store Svelte tương ứng dựa trên saveKey
  const storeMap = {
    'saved_danhsachnv': danhSachNhanVien,
    'saved_giocong': rawGioCongData,
    'saved_ycx': ycxData,
    'saved_thuongnong': thuongNongData,
    'saved_ycx_thangtruoc': ycxDataThangTruoc,
    'saved_thuongnong_thangtruoc': thuongNongDataThangTruoc
  };
  store = storeMap[saveKey];

  // Khi component được tải, kiểm tra cache
  onMount(() => {
    if (store) {
      // Đọc giá trị store một lần (dùng $store)
      const data = $store;
      if (data && data.length > 0) {
        if (saveKey === 'saved_danhsachnv') {
          fileName = localStorage.getItem('_localDsnvFilename') || "Đã tải từ cache";
          fileStatus = `✅ Đã tải ${data.length} nhân viên.`;
        } else {
          fileName = "Đã tải từ cache";
          fileStatus = `✅ Đã tải ${data.length} dòng.`;
        }
      }
    }
    // Chạy feather cho icon của riêng card này
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });

  // Hàm xử lý sự kiện
  async function handleChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    isLoading = true;
    fileName = file.name;
    fileStatus = "Đang đọc và xử lý file...";

    try {
      // Gọi service chung, truyền file và saveKey
      const result = await dataService.handleFileChange(file, saveKey);
      fileStatus = result.message;
    } catch (err) {
      console.error(`Lỗi gọi dataService cho ${saveKey}:`, err);
      fileStatus = `❌ Lỗi: ${err.message}`;
    } finally {
      isLoading = false;
      event.target.value = null;
    }
  }
</script>

<div class="data-input-group input-group--yellow"> 
    <div class="data-input-group__label"> 
        <i data-feather={icon} class="h-5 w-5 feather"></i>
        <span>{label}:</span>
    </div> 
    <div class="data-input-group__content"> 
        <div class="flex items-center gap-2"> 
            <label for="file-{saveKey}" class="data-input-group__file-trigger" class:opacity-50={isLoading}>
                {isLoading ? 'Đang xử lý...' : 'Thêm file'}
            </label> 
            <span class="data-input-group__file-name">{fileName}</span> 
        </div> 
        
        {#if saveKey === 'saved_danhsachnv'}
            <button on:click={() => dataService.handleTemplateDownload()} class="data-input-group__link text-left">Tải file mẫu</button> 
        {/if}

        <input 
            type="file" 
            id="file-{saveKey}" 
            class="hidden" 
            accept=".xlsx, .xls, .csv"
            on:change={handleChange}
            disabled={isLoading}
        > 
        <div class="data-input-group__status-wrapper"> 
            <span class="data-input-group__status-text"
                class:text-green-600={fileStatus.startsWith('✅')}
                class:text-red-600={fileStatus.startsWith('❌')}
            >
                {fileStatus}
            </span> 
        </div> 
        <div class="progress-bar-container" class:hidden={!isLoading}>
            <div class="progress-bar" style="width: 100%; background-color: #3b82f6;"></div>
        </div> 
    </div> 
</div>