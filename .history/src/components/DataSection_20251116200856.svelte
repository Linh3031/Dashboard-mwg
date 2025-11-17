<script>
  /* global feather, XLSX */
  import { onMount } from 'svelte';
  
  // === START: CẬP NHẬT (v1.1) ===
  // Import TẤT CẢ các store cần thiết
  import { 
    danhSachNhanVien, 
    ycxData,
    rawGioCongData, // Dùng cho dataProcessing.normalizeData('giocong')
    thuongNongData,
    thuongERPData,
    luyKePastedData,
    thiDuaNVPastedData,
    ycxDataThangTruoc,
    thuongNongDataThangTruoc,
    thuongERPDataThangTruoc
  } from '../stores.js';
  // === END: CẬP NHẬT (v1.1) ===

  // Import logic chuẩn hóa
  import { dataProcessing } from '../services/dataProcessing.js';

  // --- State cho DSNV (đã có) ---
  let dsnvFileName = "Chưa thêm file";
  let dsnvFileStatus = "";
  let isLoadingDSNV = false;

  // --- State cho YCX (đã có) ---
  let ycxFileName = "Chưa thêm file";
  let ycxFileStatus = "";
  let isLoadingYCX = false;

  // === START: THÊM MỚI (v1.1) - State cho các input còn lại ===
  // Giờ công
  let gioCongFileName = "Chưa thêm file";
  let gioCongFileStatus = "";
  let isLoadingGioCong = false;

  // Thưởng nóng
  let thuongNongFileName = "Chưa thêm file";
  let thuongNongFileStatus = "";
  let isLoadingThuongNong = false;

  // Thưởng ERP (Paste)
  let thuongERPStatus = "";
  let isLoadingThuongERP = false;

  // Data Lũy Kế (Paste)
  let luyKeStatus = "";
  let isLoadingLuyKe = false;

  // Thi Đua NV (Paste)
  let thiDuaNVStatus = "";
  let isLoadingThiDuaNV = false;

  // YCX Tháng Trước
  let ycxTTFileName = "Chưa thêm file";
  let ycxTTFileStatus = "";
  let isLoadingYCXTT = false;

  // Thưởng Nóng Tháng Trước
  let thuongNongTTFileName = "Chưa thêm file";
  let thuongNongTTFileStatus = "";
  let isLoadingThuongNongTT = false;

  // Thưởng ERP Tháng Trước (Paste)
  let thuongERPTTStatus = "";
  let isLoadingThuongERPTT = false;
  // === END: THÊM MỚI (v1.1) ===


  /**
   * Xử lý khi người dùng chọn file DSNV.
   */
  async function handleFileDSNV(event) {
    if (typeof XLSX === 'undefined') {
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
      if (!rawData || rawData.length === 0) throw new Error("File không có dữ liệu.");

      const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'danhsachnv');
      if (success) {
        danhSachNhanVien.set(normalizedData);
        dsnvFileStatus = `✅ Tải thành công ${normalizedData.length} nhân viên.`;
      } else {
        throw new Error(`File thiếu cột: ${missingColumns.join(', ')}`);
      }
    } catch (err) {
      dsnvFileStatus = `❌ Lỗi: ${err.message}`;
      danhSachNhanVien.set([]);
    } finally {
      isLoadingDSNV = false;
      event.target.value = null;
    }
  }

  /**
   * Xử lý khi người dùng chọn file YCX.
   */
  async function handleFileYCX(event) {
    if (typeof XLSX === 'undefined') {
      ycxFileStatus = "Lỗi: Thư viện XLSX chưa tải.";
      return;
    }
    const file = event.target.files[0];
    if (!file) return;
    isLoadingYCX = true;
    ycxFileName = file.name;
    ycxFileStatus = "Đang đọc và xử lý file...";
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      if (!rawData || rawData.length === 0) throw new Error("File không có dữ liệu.");

      const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, 'ycx');
      if (success) {
        ycxData.set(normalizedData);
        ycxFileStatus = `✅ Tải thành công ${normalizedData.length} dòng.`;
      } else {
        throw new Error(`File thiếu cột: ${missingColumns.join(', ')}`);
      }
    } catch (err) {
      ycxFileStatus = `❌ Lỗi: ${err.message}`;
      ycxData.set([]);
    } finally {
      isLoadingYCX = false;
      event.target.value = null;
    }
  }

  // === START: THÊM MỚI (v1.1) - Các hàm xử lý (handler) mới ===

  /**
   * Hàm chung để xử lý các file Excel chuẩn hóa
   * @param {Event} event - Sự kiện file
   * @param {string} fileType - Key từ config.js (vd: 'giocong', 'thuongnong')
   * @param {import('svelte/store').Writable} store - Store Svelte để cập nhật
   * @param {Object} state - Object chứa các biến state (fileName, fileStatus, isLoading)
   */
  async function handleGenericFile(event, fileType, store, state) {
    if (typeof XLSX === 'undefined') {
      state.fileStatus = "Lỗi: Thư viện XLSX chưa tải.";
      return;
    }
    const file = event.target.files[0];
    if (!file) return;
    
    state.isLoading = true;
    state.fileName = file.name;
    state.fileStatus = "Đang đọc và xử lý file...";

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      if (!rawData || rawData.length === 0) throw new Error("File không có dữ liệu.");

      // normalizeData('giocong') sẽ tự động cập nhật store 'rawGioCongData'
      // Các file khác cần cập nhật thủ công
      const { normalizedData, success, missingColumns } = dataProcessing.normalizeData(rawData, fileType);
      
      if (success) {
        if (fileType !== 'giocong') {
          store.set(normalizedData);
        }
        state.fileStatus = `✅ Tải thành công ${normalizedData.length} dòng.`;
      } else {
        throw new Error(`File thiếu cột: ${missingColumns.join(', ')}`);
      }
    } catch (err) {
      state.fileStatus = `❌ Lỗi: ${err.message}`;
      if (store) store.set([]);
    } finally {
      state.isLoading = false;
      event.target.value = null;
    }
  }

  /**
   * Hàm chung để xử lý dữ liệu dán (paste)
   * @param {Event} event - Sự kiện paste
   * @param {function}- (text) => result
   * @param {import('svelte/store').Writable} store - Store Svelte để cập nhật
   * @param {Object} state - Object chứa các biến state (status, isLoading)
   */
  async function handleGenericPaste(event, parseFunction, store, state) {
    state.isLoading = true;
    state.status = "Đang xử lý dữ liệu dán...";
    
    try {
      const text = (event.clipboardData || window.clipboardData).getData('text');
      if (!text || !text.trim()) {
        throw new Error("Không có dữ liệu trong clipboard.");
      }
      
      // Chờ 1 chút để UI update
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = parseFunction(text);

      // Xử lý hàm parsePastedThiDuaTableData (trả về object)
      if (result && typeof result.success === 'boolean') {
        if (result.success) {
          store.set(result); // Lưu { success, mainHeaders, subHeaders, dataRows }
          state.status = `✅ Phân tích thành công ${result.dataRows.length} nhân viên.`;
        } else {
          throw new Error(result.error || "Lỗi phân tích cú pháp.");
        }
      } 
      // Xử lý các hàm parse/process khác (thường trả về mảng)
      else if (result && Array.isArray(result)) {
        store.set(result);
        state.status = `✅ Xử lý thành công ${result.length} dòng.`;
      } 
      // Xử lý parseLuyKePastedData (trả về object)
      else if (result && result.mainKpis) {
         store.set(result);
         state.status = `✅ Xử lý thành công.`;
      }
      else {
        throw new Error("Hàm xử lý không trả về dữ liệu hợp lệ.");
      }

    } catch (err) {
      state.status = `❌ Lỗi: ${err.message}`;
      store.set(null);
    } finally {
      state.isLoading = false;
    }
  }

  // --- Wrapper functions cho từng input ---
  
  function handleFileGioCong(event) {
    handleGenericFile(event, 'giocong', null, { 
      get fileName() { return gioCongFileName }, set fileName(val) { gioCongFileName = val },
      get fileStatus() { return gioCongFileStatus }, set fileStatus(val) { gioCongFileStatus = val },
      get isLoading() { return isLoadingGioCong }, set isLoading(val) { isLoadingGioCong = val }
    });
  }
  
  function handleFileThuongNong(event) {
    handleGenericFile(event, 'thuongnong', thuongNongData, {
      get fileName() { return thuongNongFileName }, set fileName(val) { thuongNongFileName = val },
      get fileStatus() { return thuongNongFileStatus }, set fileStatus(val) { thuongNongFileStatus = val },
      get isLoading() { return isLoadingThuongNong }, set isLoading(val) { isLoadingThuongNong = val }
    });
  }

  function handleFileYCXThangTruoc(event) {
    handleGenericFile(event, 'ycx', ycxDataThangTruoc, {
      get fileName() { return ycxTTFileName }, set fileName(val) { ycxTTFileName = val },
      get fileStatus() { return ycxTTFileStatus }, set fileStatus(val) { ycxTTFileStatus = val },
      get isLoading() { return isLoadingYCXTT }, set isLoading(val) { isLoadingYCXTT = val }
    });
  }

  function handleFileThuongNongThangTruoc(event) {
    handleGenericFile(event, 'thuongnong', thuongNongDataThangTruoc, {
      get fileName() { return thuongNongTTFileName }, set fileName(val) { thuongNongTTFileName = val },
      get fileStatus() { return thuongNongTTFileStatus }, set fileStatus(val) { thuongNongTTFileStatus = val },
      get isLoading() { return isLoadingThuongNongTT }, set isLoading(val) { isLoadingThuongNongTT = val }
    });
  }

  function handlePasteLuyKe(event) {
    handleGenericPaste(event, dataProcessing.parseLuyKePastedData, luyKePastedData, {
      get status() { return luyKeStatus }, set status(val) { luyKeStatus = val },
      get isLoading() { return isLoadingLuyKe }, set isLoading(val) { isLoadingLuyKe = val }
    });
  }

  function handlePasteThiDuaNV(event) {
    handleGenericPaste(event, dataProcessing.parsePastedThiDuaTableData, thiDuaNVPastedData, {
      get status() { return thiDuaNVStatus }, set status(val) { thiDuaNVStatus = val },
      get isLoading() { return isLoadingThiDuaNV }, set isLoading(val) { isLoadingThiDuaNV = val }
    });
  }

  function handlePasteThuongERP(event) {
    handleGenericPaste(event, dataProcessing.processThuongERP, thuongERPData, {
      get status() { return thuongERPStatus }, set status(val) { thuongERPStatus = val },
      get isLoading() { return isLoadingThuongERP }, set isLoading(val) { isLoadingThuongERP = val }
    });
  }

  function handlePasteThuongERPThangTruoc(event) {
    handleGenericPaste(event, dataProcessing.processThuongERP, thuongERPDataThangTruoc, {
      get status() { return thuongERPTTStatus }, set status(val) { thuongERPTTStatus = val },
      get isLoading() { return isLoadingThuongERPTT }, set isLoading(val) { isLoadingThuongERPTT = val }
    });
  }

  // === END: THÊM MỚI (v1.1) ===

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
                    <i data-feather="help-circle" class="feather"></i>
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
            <h3 class="content-card__header data-header--blue">
                <i data-feather="zap" class="h-5 w-5 feather"></i>SỬ DỤNG NHANH MỖI NGÀY
            </h3>
        
            <div class="data-input-group input-group--blue">
                <label for="file-ycx" class="data-input-group__label">
                    <i data-feather="file-text" class="h-5 w-5 feather"></i>
                    <span>Yêu cầu xuất lũy kế:</span>
                    <a href="https://report.mwgroup.vn/home/dashboard/077" target="_blank" class="data-input-group__label--link ml-auto text-xs font-normal underline">(Lấy file)</a>
                </label>
                 <div class="data-input-group__content">
                    <div class="flex items-center gap-2">
                        <label for="file-ycx" class="data-input-group__file-trigger" class:opacity-50={isLoadingYCX}>
                           {isLoadingYCX ? 'Đang xử lý...' : 'Thêm file'}
                        </label>
                        <span id="file-name-ycx" class="data-input-group__file-name">{ycxFileName}</span>
                    </div>
                    <input type="file" id="file-ycx" class="hidden file-input" accept=".xlsx, .xls, .csv"
                           on:change={handleFileYCX}
                           disabled={isLoadingYCX}
                    >
                    <div class="data-input-group__status-wrapper">
                        <span id="file-status-ycx" class="data-input-group__status-text"
                            class:text-green-600={ycxFileStatus.startsWith('✅')}
                            class:text-red-600={ycxFileStatus.startsWith('❌')}
                        >
                        {ycxFileStatus}
                      </span>
                    </div>
                    <div id="progress-ycx" class="progress-bar-container" class:hidden={!isLoadingYCX}>
                        <div class="progress-bar" style="width: 100%; background-color: #3b82f6;"></div>
                 </div>
            </div>
            </div>
            
            <div class="data-input-group input-group--blue h-full">
                <label for="paste-luyke" class="data-input-group__label">
                    <i data-feather="clipboard" class="h-5 w-5 feather"></i>
                     <span>Data lũy kế: 
                        <span class="font-normal">
                            (<a href="https://bi.thegioididong.com/sieu-thi-con?id=16612&tab=1" target="_blank" class="data-input-group__label--link">Copy từ BI</a>)
                        </span>
                    </span>
                </label>
                <div class="data-input-group__content">
                    <textarea id="paste-luyke" rows="5" class="data-textarea" placeholder="Dán dữ liệu đã sao chép..."
                        on:paste={handlePasteLuyKe}
                        disabled={isLoadingLuyKe}
                    ></textarea>
                    <div class="data-input-group__status-wrapper">
                        <span id="status-luyke" class="data-input-group__status-text"
                            class:text-green-600={luyKeStatus.startsWith('✅')}
                            class:text-red-600={luyKeStatus.startsWith('❌')}
                        >
                            {luyKeStatus}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="data-input-group input-group--blue h-full">
                <label for="paste-thiduanv" class="data-input-group__label">
                    <i data-feather="clipboard" class="h-5 w-5 feather"></i>
                    <span>Thi đua nhân viên: 
                        <span class="font-normal">
                            (<a href="https://bi.thegioididong.com/sieu-thi-con?id=16758&tab=bcdtnv&rt=2&dm=1" target="_blank" class="data-input-group__label--link">Copy từ BI</a>)
                        </span>
                    </span>
                </label>
                <div class="data-input-group__content">
                    <textarea id="paste-thiduanv" rows="5" class="data-textarea" placeholder="Dán dữ liệu đã sao chép..."
                        on:paste={handlePasteThiDuaNV}
                        disabled={isLoadingThiDuaNV}
                    ></textarea>
                    <div class="data-input-group__status-wrapper">
                        <span id="status-thiduanv" class="data-input-group__status-text"
                            class:text-green-600={thiDuaNVStatus.startsWith('✅')}
                            class:text-red-600={thiDuaNVStatus.startsWith('❌')}
                        >
                            {thiDuaNVStatus}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="content-card data-card--green flex flex-col gap-4"> 
            <h3 class="content-card__header data-header--green">
              <i data-feather="users" class="h-5 w-5 feather"></i>CHI TIẾT NĂNG SUẤT NHÂN VIÊN
            </h3>
            
            <div class="data-input-group input-group--green">
                <label for="file-giocong" class="data-input-group__label">
                    <i data-feather="clock" class="h-5 w-5 feather"></i>
                     <span>Giờ công:</span>
                    <a href="https://reports.thegioididong.com/#/viewreport/168754" target="_blank" class="data-input-group__label--link ml-auto text-xs font-normal underline">(Lấy file)</a>
                </label>
                <div class="data-input-group__content">
                    <div class="flex items-center gap-2">
                        <label for="file-giocong" class="data-input-group__file-trigger" class:opacity-50={isLoadingGioCong}>
                            {isLoadingGioCong ? 'Đang xử lý...' : 'Thêm file'}
                        </label>
                         <span id="file-name-giocong" class="data-input-group__file-name">{gioCongFileName}</span>
                    </div>
                    <input type="file" id="file-giocong" class="hidden file-input" accept=".xlsx, .xls, .csv"
                        on:change={handleFileGioCong}
                        disabled={isLoadingGioCong}
                    >
                    <div class="data-input-group__status-wrapper">
                         <span id="file-status-giocong" class="data-input-group__status-text"
                            class:text-green-600={gioCongFileStatus.startsWith('✅')}
                            class:text-red-600={gioCongFileStatus.startsWith('❌')}
                         >
                            {gioCongFileStatus}
                         </span>
                    </div>
                    <div id="progress-giocong" class="progress-bar-container" class:hidden={!isLoadingGioCong}>
                        <div class="progress-bar" style="width: 100%; background-color: #22c55e;"></div>
                    </div>
                </div>
            </div>
             
            <div class="data-input-group input-group--green">
                <label for="file-thuongnong" class="data-input-group__label">
                    <i data-feather="gift" class="h-5 w-5 feather"></i>
                    <span>Thưởng nóng:</span>
                    <a href="https://report.mwgroup.vn/home/dashboard/105" target="_blank" class="data-input-group__label--link ml-auto text-xs font-normal underline">(Lấy file)</a>
                </label>
                 <div class="data-input-group__content">
                    <div class="flex items-center gap-2">
                        <label for="file-thuongnong" class="data-input-group__file-trigger" class:opacity-50={isLoadingThuongNong}>
                            {isLoadingThuongNong ? 'Đang xử lý...' : 'Thêm file'}
                        </label>
                        <span id="file-name-thuongnong" class="data-input-group__file-name">{thuongNongFileName}</span>
                     </div>
                    <input type="file" id="file-thuongnong" class="hidden file-input" accept=".xlsx, .xls, .csv"
                        on:change={handleFileThuongNong}
                        disabled={isLoadingThuongNong}
                    >
                    <div class="data-input-group__status-wrapper">
                        <span id="file-status-thuongnong" class="data-input-group__status-text"
                            class:text-green-600={thuongNongFileStatus.startsWith('✅')}
                            class:text-red-600={thuongNongFileStatus.startsWith('❌')}
                        >
                            {thuongNongFileStatus}
                        </span>
                     </div>
                    <div id="progress-thuongnong" class="progress-bar-container" class:hidden={!isLoadingThuongNong}>
                        <div class="progress-bar" style="width: 100%; background-color: #22c55e;"></div>
                    </div>
                </div>
            </div>
            
            <div class="data-input-group input-group--green h-full">
                 <label for="paste-thuongerp" class="data-input-group__label">
                    <i data-feather="clipboard" class="h-5 w-5 feather"></i>
                    <span>Thưởng ERP: 
                        <span class="font-normal">
                            (<a href="https://bi.thegioididong.com/reward?id=-1&tab=1" target="_blank" class="data-input-group__label--link">Copy từ BI</a>)
                        </span>
                    </span>
                </label>
                <div class="data-input-group__content">
                     <textarea id="paste-thuongerp" rows="5" class="data-textarea" placeholder="Dán toàn bộ dữ liệu thưởng ERP..."
                        on:paste={handlePasteThuongERP}
                        disabled={isLoadingThuongERP}
                     ></textarea>
                    <div class="data-input-group__status-wrapper">
                        <span id="status-thuongerp" class="data-input-group__status-text"
                            class:text-green-600={thuongERPStatus.startsWith('✅')}
                            class:text-red-600={thuongERPStatus.startsWith('❌')}
                        >
                            {thuongERPStatus}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div> <div class="content-card data-card--yellow"> 
        <h3 class="content-card__header data-header--yellow">
            <i data-feather="calendar" class="h-5 w-5 feather"></i>DỮ LIỆU CẬP NHẬT 1 THÁNG 1 LẦN
        </h3>
        <p class="text-sm text-yellow-800 bg-yellow-100 p-3 rounded-lg mb-4">Lưu ý: Dữ liệu trong phần này sẽ được lưu vào trình duyệt của bạn. Dữ liệu sẽ tồn tại cho đến khi bạn cập nhật lại.</p> 
        
        <div class="grid md:grid-cols-3 gap-4"> 
            <div class="space-y-4"> 
                
                <div class="data-input-group input-group--yellow"> 
                    <div class="data-input-group__label"> 
                         <i data-feather="users" class="h-5 w-5 feather"></i>
                         <span>Danh sách nhân viên:</span>
                    </div> 
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
                         <div id="progress-danhsachnv" class="progress-bar-container" class:hidden={!isLoadingDSNV}>
                            <div class="progress-bar" style="width: 100%; background-color: #3b82f6;"></div>
                         </div> 
                     </div> 
                </div> 

                <div class="data-input-group input-group--yellow"> 
                    <div class="data-input-group__label">
                        <i data-feather="file-text" class="h-5 w-5 feather"></i>
                         <span>YCX Lũy Kế tháng trước:</span>
                    </div> 
                    <div class="data-input-group__content"> 
                        <div class="flex items-center gap-2"> 
                             <label for="file-ycx-thangtruoc" class="data-input-group__file-trigger" class:opacity-50={isLoadingYCXTT}>
                                {isLoadingYCXTT ? 'Đang xử lý...' : 'Thêm file'}
                             </label> 
                            <span id="file-name-ycx-thangtruoc" class="data-input-group__file-name">{ycxTTFileName}</span> 
                        </div> 
                        <input type="file" id="file-ycx-thangtruoc" class="hidden file-input" accept=".xlsx, .xls, .csv"
                            on:change={handleFileYCXThangTruoc}
                            disabled={isLoadingYCXTT}
                        > 
                        <div class="data-input-group__status-wrapper"> 
                            <span id="file-status-ycx-thangtruoc" class="data-input-group__status-text"
                                class:text-green-600={ycxTTFileStatus.startsWith('✅')}
                                class:text-red-600={ycxTTFileStatus.startsWith('❌')}
                            >
                                {ycxTTFileStatus}
                            </span> 
                        </div> 
                         <div id="progress-ycx-thangtruoc" class="progress-bar-container" class:hidden={!isLoadingYCXTT}>
                            <div class="progress-bar" style="width: 100%; background-color: #f59e0b;"></div>
                         </div> 
                    </div> 
                </div> 
            </div> 

            <div class="space-y-4"> 
                <div class="data-input-group input-group--yellow"> 
                    <div class="data-input-group__label">
                        <i data-feather="gift" class="h-5 w-5 feather"></i>
                        <span>Thưởng nóng tháng trước:</span>
                     </div> 
                    <div class="data-input-group__content"> 
                        <div class="flex items-center gap-2"> 
                            <label for="file-thuongnong-thangtruoc" class="data-input-group__file-trigger" class:opacity-50={isLoadingThuongNongTT}>
                                {isLoadingThuongNongTT ? 'Đang xử lý...' : 'Thêm file'}
                            </label> 
                             <span id="file-name-thuongnong-thangtruoc" class="data-input-group__file-name">{thuongNongTTFileName}</span> 
                        </div> 
                         <input type="file" id="file-thuongnong-thangtruoc" class="hidden file-input" accept=".xlsx, .xls, .csv"
                            on:change={handleFileThuongNongThangTruoc}
                            disabled={isLoadingThuongNongTT}
                         > 
                         <div class="data-input-group__status-wrapper"> 
                            <span id="file-status-thuongnong-thangtruoc" class="data-input-group__status-text"
                                class:text-green-600={thuongNongTTFileStatus.startsWith('✅')}
                                class:text-red-600={thuongNongTTFileStatus.startsWith('❌')}
                            >
                                {thuongNongTTFileStatus}
                            </span> 
                        </div> 
                        <div id="progress-thuongnong-thangtruoc" class="progress-bar-container" class:hidden={!isLoadingThuongNongTT}>
                            <div class="progress-bar" style="width: 100%; background-color: #f59e0b;"></div>
                        </div> 
                     </div> 
                </div> 
            </div> 

            <div class="space-y-4"> 
                <div class="data-input-group input-group--yellow h-full"> 
                    <label for="paste-thuongerp-thangtruoc" class="data-input-group__label">
                        <i data-feather="clipboard" class="h-5 w-5 feather"></i>
                        <span>Thưởng ERP tháng trước:</span>
                    </label> 
                    <div class="data-input-group__content"> 
                         <textarea id="paste-thuongerp-thangtruoc" rows="5" class="data-textarea" placeholder="Dán dữ liệu thưởng ERP tháng trước..."
                            on:paste={handlePasteThuongERPThangTruoc}
                            disabled={isLoadingThuongERPTT}
                         ></textarea> 
                        <div class="data-input-group__status-wrapper"> 
                             <span id="status-thuongerp-thangtruoc" class="data-input-group__status-text"
                                class:text-green-600={thuongERPTTStatus.startsWith('✅')}
                                class:text-red-600={thuongERPTTStatus.startsWith('❌')}
                             >
                                {thuongERPTTStatus}
                             </span> 
                         </div> 
                    </div> 
               </div> 
            </div> 
        </div> 
    </div> 
</section>

<style>
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
    .data-card--blue { background-color: #f0f9ff; border-color: #bae6fd;
}
    .data-card--green { background-color: #f0fdf4; border-color: #bbf7d0; }
    .data-card--yellow { background-color: #fefce8; border-color: #fef08a;
}
    
    .data-header--blue { color: #0369a1; border-bottom-color: #7dd3fc;
}
    .data-header--green { color: #15803d; border-bottom-color: #86efac; }
    .data-header--yellow { color: #854d0e; border-bottom-color: #fde047;
}
    
    .input-group--blue { background-color: #ffffff; border-top-color: #3b82f6; border-color: #dbeafe;
}
    .input-group--green { background-color: #ffffff; border-top-color: #22c55e; border-color: #dcfce7; }
    .input-group--yellow { background-color: #ffffff;
        border-top-color: #f59e0b; border-color: #fef3c7; }
    
    .input-group--blue .data-input-group__label { color: #1d4ed8;
}
    .input-group--green .data-input-group__label { color: #166534; }
    .input-group--yellow .data-input-group__label { color: #92400e;
}

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
    .data-input-group__label--link { text-decoration: none; display: inline-flex;
}
    .data-input-group__label--link:hover { text-decoration: underline; }
    /* *** CSS FIX: Đổi từ > (con) thành ' ' (cháu) *** */
    .data-input-group__label .font-normal { font-weight: 400;
}
    .data-input-group__content { display: flex; flex-direction: column; gap: 0.5rem; flex-grow: 1;
}
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
    .data-input-group__file-trigger:hover { background-color: #d1d5db;
}
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
    .data-input-group__status-wrapper { min-height: 1rem;
        margin-top: 0.25rem; }
    .data-input-group__status-text { font-size: 0.875em; font-weight: 500;
}
    /* svelte-ignore css-unused-selector */ .data-input-group__status-text--default { color: #6b7280;
}
    /* svelte-ignore css-unused-selector */ .data-input-group__status-text--success { color: #16a34a;
}
    /* svelte-ignore css-unused-selector */ .data-input-group__status-text--error { color: #dc2626;
}
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
    .progress-bar-container { overflow: hidden;
}
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
        to { transform: translateX(-100%);
        }
    }
</style>