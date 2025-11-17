<script>
  /* global feather, XLSX */
  import { onMount } from 'svelte';
  
  // === BẮT ĐẦU THÊM MỚI (BƯỚC 2.2) ===
  
  // Import store để cập nhật
  import { danhSachNhanVien } from '../stores.js';
  // Import logic chuẩn hóa
  import { dataProcessing } from '../services/dataProcessing.js';

  // Biến state cục bộ để phản hồi UI
  let dsnvFileName = "Chưa thêm file";
  let dsnvFileStatus = "";
  let isLoadingDSNV = false;

  /**
   * Xử lý khi người dùng chọn file DSNV.
   * Logic được "Svelte-hóa" từ file main.js (cũ)
   */
  async function handleFileDSNV(event) {
    if (typeof XLSX === 'undefined') {
      console.error("Lỗi: Thư viện XLSX chưa được tải.");
      dsnvFileStatus = "Lỗi: Thư viện XLSX chưa tải.";
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    isLoadingDSNV = true;
    dsnvFileName = file.name;
    dsnvFileStatus = "Đang đọc và xử lý file...";

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (!rawData || rawData.length === 0) {
        throw new Error("File không có dữ liệu.");
      }

      // Gọi logic chuẩn hóa từ dataProcessing.js (mới)
      // với key 'danhsachnv' (từ config.js cũ)
      const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'danhsachnv');

      if (success) {
        // CẬP NHẬT STORE: Đây là bước quan trọng nhất
        danhSachNhanVien.set(normalizedData);
        
        // Phản hồi UI
        dsnvFileStatus = `✅ Tải thành công ${normalizedData.length} nhân viên.`;
        console.log("Store danhSachNhanVien đã được cập nhật:", normalizedData);
      } else {
        throw new Error(`File thiếu cột: ${missingColumns.join(', ')}`);
      }

    } catch (err) {
      console.error("Lỗi xử lý file DSNV:", err);
      dsnvFileStatus = `❌ Lỗi: ${err.message}`;
      danhSachNhanVien.set([]); // Reset store nếu lỗi
    } finally {
      isLoadingDSNV = false;
      // Reset input để có thể tải lại file y hệt
      event.target.value = null; 
    }
  }
  // === KẾT THÚC THÊM MỚI (BƯỚC 2.2) ===


  // Logic feather icon (đã có)
  export let activeTab;
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
                     <i data-feather="help-circle"></i>
                </button>
            </div>
            <div id="data-warehouse-selector-container" class="flex-shrink-0 flex items-center gap-2">
                <label for="data-warehouse-selector" class="text-sm font-semibold text-gray-700">Kho:</label>
                <select id="data-warehouse-selector" 
                         class="p-2 border rounded-lg text-sm shadow-sm min-w-[200px] 
                               font-semibold text-indigo-800 bg-indigo-50 border-indigo-200 
                               focus:ring-indigo-500 focus:border-indigo-500" 
                         disabled>
                    <option>Vui lòng tải file DSNV để chọn kho...</option>
                </select>
            </div>
        </div>
        <div id="version-marquee-container" class="marquee-container flex-grow min-w-[200px]">
            <p class="marquee-text"></p>
         </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"> 
        <div class="content-card data-card--blue flex flex-col gap-4"> 
            </div>
        
        <div class="content-card data-card--green flex flex-col gap-4"> 
            </div>
    </div>
    
    <div class="content-card data-card--yellow"> 
         <h3 class="content-card__header data-header--yellow">
            <i data-feather="calendar" class="h-5 w-5"></i>DỮ LIỆU CẬP NHẬT 1 THÁNG 1 LẦN
        </h3>
        <p class="text-sm text-yellow-800 bg-yellow-100 p-3 rounded-lg mb-4">Lưu ý: Dữ liệu trong phần này sẽ được lưu vào trình duyệt của bạn. Dữ liệu sẽ tồn tại cho đến khi bạn cập nhật lại.</p> 
        
        <div class="grid md:grid-cols-3 gap-4"> 
            <div class="space-y-4"> 
                
                <div class="data-input-group input-group--yellow"> 
                    <label class="data-input-group__label" for="file-danhsachnv"> <i data-feather="users" class="h-5 w-5"></i>
                         <span>Danh sách nhân viên:</span>
                    </label> 
                    <div class="data-input-group__content"> 
                         <div class="flex items-center gap-2"> 
                             <label for="file-danhsachnv" class="data-input-group__file-trigger" class:opacity-50={isLoadingDSNV}>
                                {isLoadingDSNV ? 'Đang xử lý...' : 'Thêm file'}
                             </label> 
                             <span id="file-name-danhsachnv" class="data-input-group__file-name">{dsnvFileName}</span> 
                         </div> 
                         <button id="download-danhsachnv-template-btn" class="data-input-group__link text-left">Tải file mẫu</button> 
                         <input 
                            type="file" 
                            id="file-danhsachnv" 
                            class="hidden" 
                            accept=".xlsx, .xls, .csv"
                            on:change={handleFileDSNV}
                            disabled={isLoadingDSNV}
                         > 
                         <div class="data-input-group__status-wrapper"> 
                             <span id="file-status-danhsachnv" class="data-input-group__status-text"
                                class:text-green-600={dsnvFileStatus.startsWith('✅')}
                                class:text-red-600={dsnvFileStatus.startsWith('❌')}
                             >
                                {dsnvFileStatus}
                             </span> 
                         </div> 
                         <div id="progress-danhsachnv" class="progress-bar-container {isLoadingDSNV ? '' : 'hidden'}">
                            <div class="progress-bar" style="width: 100%; background-color: #3b82f6;"></div>
                         </div> 
                     </div> 
                </div> 
                <div class="data-input-group input-group--yellow"> 
                    </div> 
            </div> 
            <div class="space-y-4"> 
                 <div class="data-input-group input-group--yellow"> 
                    </div> 
            </div> 
            <div class="space-y-4"> 
                <div class="data-input-group input-group--yellow h-full"> 
                    </div> 
            </div> 
        </div> 
    </div> 
</section>

<style>
    /* ... (toàn bộ CSS cũ của DataSection.svelte giữ nguyên) ... */
</style>