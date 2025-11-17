<script>
  /* global feather */
  import { onMount } from 'svelte';
  // === SỬA LỖI: Đổi { dataService } thành * as dataService ===
  import * as dataService from '../services/dataService.js';
  import { 
    competitionData,
    pastedThiDuaReportData,
    thuongERPData,
    thuongERPDataThangTruoc
  } from '../stores.js';

  // Props
  export let label = "Chưa có nhãn";
  export let icon = "clipboard";
  export let link = "#"; // Link cho "Lấy file tại đây"
  export let saveKeyPaste = ""; // Key cho localStorage (text thô)
  export let saveKeyRaw = ""; // Key đặc biệt cho Thi đua NV
  export let saveKeyProcessed = ""; // Key đặc biệt cho Thi đua NV

  // Internal State
  let pasteStatus = "";
  let pastedText = "";

  // Lấy store Svelte tương ứng
  const storeMap = {
    'daily_paste_luyke': competitionData,
    'daily_paste_thiduanv': pastedThiDuaReportData,
    'daily_paste_thuongerp': thuongERPData,
    'saved_thuongerp_thangtruoc': thuongERPDataThangTruoc
  };
  
  // Xác định key nào dùng để tải text
  const textLoadKey = saveKeyRaw || saveKeyPaste;
  // Xác định store nào dùng để đếm
  const countStore = storeMap[saveKeyProcessed || saveKeyPaste];

  onMount(() => {
    // Tải text đã lưu từ localStorage
    pastedText = localStorage.getItem(textLoadKey) || "";
    
    // Cập nhật status nếu có dữ liệu
    if (pastedText && countStore) {
      const data = $countStore; // Đọc giá trị store
      let count = data.length || 0;
      
      if (saveKeyPaste === 'daily_paste_luyke') {
        pasteStatus = `✅ Đã tải. Tìm thấy ${count} CT thi đua.`;
      } else if (count > 0) {
        pasteStatus = `✅ Đã tải ${count} nhân viên.`;
      }
    }
    
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });

  // Debounce logic
  let pasteTimer;
  function debounce(func, delay = 500) {
    return function(event) {
      clearTimeout(pasteTimer);
      const text = event.target.value;
      pasteTimer = setTimeout(() => {
        func(text);
      }, delay);
    }
  }

  // Hàm xử lý
  function handleInput(pastedText) {
    if (!pastedText || pastedText.trim().length < 10) {
      pasteStatus = "";
      return;
    }
    pasteStatus = "Đang xử lý...";
    try {
      const result = dataService.handlePasteChange(
        pastedText, 
        saveKeyPaste, 
        saveKeyRaw, 
        saveKeyProcessed
      );
      pasteStatus = result.message;
    } catch (err) {
      console.error(`Lỗi gọi dataService cho ${label}:`, err);
      pasteStatus = `❌ Lỗi: ${err.message}`;
    }
  }
  
  // Tạo hàm debounced
  const debouncedHandleInput = debounce(handleInput);

</script>

<div class="data-input-group input-group--blue h-full">
    <a href={link} target="_blank" class="data-input-group__label data-input-group__label--link">
        <i data-feather={icon} class="h-5 w-5 feather"></i>
        <span>{label}: <span class="font-normal">(Copy từ BI)</span></span>
    </a>
    <div class="data-input-group__content">
        <textarea 
            rows="5" 
            class="data-textarea" 
            placeholder="Dán dữ liệu đã sao chép..."
            on:input={debouncedHandleInput}
            bind:value={pastedText}
        ></textarea>
        <div class="data-input-group__status-wrapper">
            <span class="data-input-group__status-text"
                class:text-green-600={pasteStatus.startsWith('✅')}
                class:text-red-600={pasteStatus.startsWith('❌')}
            >
                {pasteStatus}
            </span>
        </div>
    </div>
</div>