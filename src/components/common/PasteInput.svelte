<script>
  /* global feather */
  import { onMount } from 'svelte';
  import * as dataService from '../../services/dataService.js';
  import { 
    competitionData,
    pastedThiDuaReportData,
    thuongERPData,
    thuongERPDataThangTruoc
  } from '../../stores.js';

  export let label = "Chưa có nhãn";
  export let icon = "clipboard";
  export let link = "#"; 
  export let saveKeyPaste = ""; 
  export let saveKeyRaw = ""; 
  export let saveKeyProcessed = ""; 

  let pasteStatus = "";
  let pastedText = "";

  const storeMap = {
    'daily_paste_luyke': competitionData,
    'daily_paste_thiduanv': pastedThiDuaReportData,
    'daily_paste_thuongerp': thuongERPData,
    'saved_thuongerp_thangtruoc': thuongERPDataThangTruoc
  };
  
  const textLoadKey = saveKeyRaw || saveKeyPaste;
  const countStore = storeMap[saveKeyProcessed || saveKeyPaste];

  onMount(() => {
    pastedText = localStorage.getItem(textLoadKey) || "";
    
    if (pastedText && countStore) {
        const unsubscribe = countStore.subscribe(data => {
             let count = data?.length || 0;
             if (saveKeyPaste === 'daily_paste_luyke' && count > 0) {
                pasteStatus = `✅ Đã tải. Tìm thấy ${count} CT thi đua.`;
             } else if (count > 0) {
                pasteStatus = `✅ Đã tải ${count} nhân viên.`;
             }
        });
        return () => unsubscribe();
    }
  });

  let pasteTimer;
  function handleInput(event) {
      const text = event.target.value;
      clearTimeout(pasteTimer);
      
      if (!text || text.trim().length < 10) {
        pasteStatus = "";
        return;
      }
      
      pasteStatus = "Đang xử lý...";
      pasteTimer = setTimeout(() => {
          try {
            const result = dataService.handlePasteChange(
                text, 
                saveKeyPaste, 
                saveKeyRaw, 
                saveKeyProcessed
            );
            pasteStatus = result.message;
            pastedText = text; 
          } catch (err) {
            console.error(`Lỗi gọi dataService cho ${label}:`, err);
            pasteStatus = `❌ Lỗi: ${err.message}`;
          }
      }, 500);
  }
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
            on:input={handleInput}
            value={pastedText}
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