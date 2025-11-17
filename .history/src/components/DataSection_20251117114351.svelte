<script>
  /* global feather */
  import { onMount } from 'svelte';
  
  // === SỬA LỖI: Đổi { dataService } thành * as dataService ===
  import FileInput from '../modules/FileInput.svelte';
  import PasteInput from '../modules/PasteInput.svelte';
  
  // Service không cần import ở đây nữa, vì component con đã import rồi
  // import * as dataService from '../services/dataService.js'; 

  // Logic feather icon (đã có)
  export let activeTab;
  
  // onMount BÂY GIỜ CHỈ CÒN LÀM 1 VIỆC: Chạy Feather
  onMount(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  });

  $: if (activeTab === 'data-section') {
    Promise.resolve().then(() => {
      if (typeof window.feather !== 'undefined') {
        window.feather.replace();
      }
    });
  }
</script>

<section id="data-section" class="page-section {activeTab === 'data-section' ? '' : 'hidden'}"> 
    <div class="page-header">
        <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-x-3">
                <h2 class="page-header__title">Cập nhật dữ liệu</h2>
                <button class="page-header__help-btn" data-help-id="data" title="Xem hướng dẫn">
                  <i data-feather="help-circle" class="feather"></i>
                </button>
            </div>
            
            <div id="data-warehouse-selector-container" class="flex-shrink-0 flex items-center gap-2">
                </div>
        </div>
        <div id="version-marquee-container" class="marquee-container flex-grow min-w-[200px]">
            <p class="marquee-text"></p>
         </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"> 
        
        <div class="content-card data-card--blue flex flex-col gap-4"> 
            <h3 class="content-card__header data-header--blue">
                <i data-feather="zap" class="h-5 w-5 feather"></i>SỬ DỤNG NHANH MỖI NGÀY
            </h3>
            
            <FileInput 
                label="Yêu cầu xuất lũy kế"
                icon="file-text"
                saveKey="saved_ycx"
            />
            
            <PasteInput
                label="Data lũy kế"
                icon="clipboard"
                link="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=1"
                saveKeyPaste="daily_paste_luyke"
            />
            
            <PasteInput
                label="Thi đua nhân viên"
                icon="clipboard"
                link="https://bi.thegioididong.com/sieu-thi-con?id=16758&tab=bcdtnv&rt=2&dm=1"
                saveKeyRaw="raw_paste_thiduanv"
                saveKeyProcessed="daily_paste_thiduanv"
            />
        </div>
        
        <div class="content-card data-card--green flex flex-col gap-4"> 
            <h3 class="content-card__header data-header--green">
                 <i data-feather="users" class="h-5 w-5 feather"></i>CHI TIẾT NĂNG SUẤT NHÂN VIÊN
            </h3>
            
            <FileInput
                label="Giờ công"
                icon="clock"
                saveKey="saved_giocong"
            />
             
            <FileInput
                label="Thưởng nóng"
                icon="gift"
                saveKey="saved_thuongnong"
            />
            
            <PasteInput
                label="Thưởng ERP"
                icon="clipboard"
                link="https://bi.thegioididong.com/reward?id=-1&tab=1"
                saveKeyPaste="daily_paste_thuongerp"
            />
        </div>
    </div>
    
    <div class="content-card data-card--yellow"> 
         <h3 class="content-card__header data-header--yellow">
            <i data-feather="calendar" class="h-5 w-5 feather"></i>DỮ LIỆU CẬP NHẬT 1 THÁNG 1 LẦN
        </h3>
        <p class="text-sm text-yellow-800 bg-yellow-100 p-3 rounded-lg mb-4">Lưu ý: Dữ liệu trong phần này sẽ được lưu vào trình duyệt của bạn. Dữ liệu sẽ tồn tại cho đến khi bạn cập nhật lại.</p> 
        
        <div class="grid md:grid-cols-3 gap-4"> 
            <div class="space-y-4"> 
                <FileInput
                    label="Danh sách nhân viên"
                    icon="users"
                    saveKey="saved_danhsachnv"
                />
                <FileInput
                    label="YCX Lũy Kế tháng trước"
                    icon="file-text"
                    saveKey="saved_ycx_thangtruoc"
                />
            </div> 
            <div class="space-y-4"> 
                 <FileInput
                    label="Thưởng nóng tháng trước"
                    icon="gift"
                    saveKey="saved_thuongnong_thangtruoc"
                />
             </div> 
            <div class="space-y-4"> 
                <PasteInput
                    label="Thưởng ERP tháng trước"
                    icon="clipboard"
                    link="httpsa://bi.thegioididong.com/reward?id=-1&tab=1"
                    saveKeyPaste="saved_thuongerp_thangtruoc"
                />
            </div> 
        </div> 
    </div> 
</section>

<style>
    /* ... (toàn bộ style giữ nguyên như file gốc) ... */
    .content-card {
        transition: all 0.2s ease-in-out;
    }
    .content-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .content-card__header { 
        display: flex;
        align-items: center; 
        justify-content: flex-start;
        gap: 0.5rem;
        font-size: 1.125rem; 
        font-weight: 600; 
        color: #374151; 
        margin-bottom: 1rem; 
        padding-bottom: 0.5rem; 
        border-bottom: 1px solid #e5e7eb;
    }
    .page-header__help-btn { 
        background-color: #fee2e2; 
        color: #991b1b; 
        border-radius: 9999px;
        width: 2rem; 
        height: 2rem; 
        display: inline-flex; 
        align-items: center; 
        justify-content: center; 
        border: none;
        transition: all 0.2s ease-in-out;
    }
    .page-header__help-btn:hover {
        transform: scale(1.1) translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .data-input-group {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.75rem;
        background-color: #f9fafb;
        display: flex;
        flex-direction: column;
        border-top: 4px solid #9ca3af;
        transition: all 0.2s ease-in-out;
    }
    .data-input-group:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .data-card--blue { background-color: #f0f9ff; border-color: #bae6fd; }
    .data-card--green { background-color: #f0fdf4; border-color: #bbf7d0; }
    .data-card--yellow { background-color: #fefce8; border-color: #fef08a; }
    
    .data-header--blue { color: #0369a1; border-bottom-color: #7dd3fc; }
    .data-header--green { color: #15803d; border-bottom-color: #86efac; }
    .data-header--yellow { color: #854d0e; border-bottom-color: #fde047; }
    
    .input-group--blue { background-color: #ffffff; border-top-color: #3b82f6; border-color: #dbeafe; }
    .input-group--green { background-color: #ffffff; border-top-color: #22c55e; border-color: #dcfce7; }
    .input-group--yellow { background-color: #ffffff; border-top-color: #f59e0b; border-color: #fef3c7; }
    
    .input-group--blue .data-input-group__label { color: #1d4ed8; }
    .input-group--green .data-input-group__label { color: #166534; }
    .input-group--yellow .data-input-group__label { color: #92400e; }

    .data-input-group__label { 
        font-weight: 600; 
        margin-bottom: 0.75rem; 
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .data-input-group__label .feather {
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0;
    }
    .data-input-group__label--link { text-decoration: none; display: inline-flex; }
    .data-input-group__label--link:hover { text-decoration: underline; }
    .data-input-group__label--link > .font-normal { font-weight: 400; }
    .data-input-group__content { display: flex; flex-direction: column; gap: 0.5rem; flex-grow: 1; }
    .data-input-group__file-trigger { 
        cursor: pointer; 
        background-color: #e5e7eb; 
        color: #374151;
        padding: 0.5rem 1rem; 
        border-radius: 0.375rem; 
        font-size: 0.875em; 
        font-weight: 500; 
        white-space: nowrap; 
    }
    .data-input-group__file-trigger:hover { background-color: #d1d5db; }
    .data-input-group__file-name { 
        font-size: 0.875em; 
        color: #6b7280; 
        overflow: hidden;
        text-overflow: ellipsis; 
        white-space: nowrap; 
    }
    .data-input-group__link { 
        color: #2563eb;
        text-decoration: none; 
        font-size: 0.875em; 
    }
    .data-input-group__link:hover { text-decoration: underline; }
    .data-input-group__status-wrapper { min-height: 1rem; margin-top: 0.25rem; }
    .data-input-group__status-text { font-size: 0.875em; font-weight: 500; }
    /* svelte-ignore css-unused-selector */ .data-input-group__status-text--default { color: #6b7280; }
    /* svelte-ignore css-unused-selector */ .data-input-group__status-text--success { color: #16a34a; }
    /* svelte-ignore css-unused-selector */ .data-input-group__status-text--error { color: #dc2626; }
    .data-textarea { 
        width: 100%; 
        padding: 0.5rem;
        border: 1px solid #d1d5db; 
        border-radius: 0.375rem; 
        font-size: 0.875em; 
        font-family: 'Inter', sans-serif;
    }
    .data-textarea:focus { 
        outline: 2px solid transparent; 
        outline-offset: 2px;
        border-color: #3b82f6; 
        box-shadow: 0 0 0 1px #3b82f6; 
    }
    .progress-bar-container { overflow: hidden; }
    .progress-bar { 
        background-image: linear-gradient(45deg, rgba(255, 255, 255, .15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .15) 50%, rgba(255, 255, 255, .15) 75%, transparent 75%, transparent);
        background-size: 1rem 1rem; 
        animation: progress-bar-stripes 1s linear infinite; 
    }
    @keyframes progress-bar-stripes { 
        from { background-position: 1rem 0; } 
        to { background-position: 0 0; } 
    }
    
    #version-marquee-container {
        flex-grow: 1;
        margin: 0 1.5rem;
        overflow: hidden;
        position: relative;
        background-color: #eef2ff;
        border: 1px solid #c7d2fe;
        border-radius: 9999px;
        cursor: pointer;
        height: 38px;
    }
    #version-marquee-container:hover .marquee-text {
        animation-play-state: paused;
        color: #312e81;
    }
    .marquee-text {
        position: absolute;
        white-space: nowrap;
        will-change: transform;
        animation: marquee-scroll 25s linear infinite;
        font-weight: 600;
        color: #4338ca;
        line-height: 36px;
    }
    @keyframes marquee-scroll {
        from { transform: translateX(100%); }
        to { transform: translateX(-100%); }
    }
</style>