<script>
  /* global XLSX, feather */
  import { onMount } from 'svelte';
  import { 
    thiDuaVungChiTiet, 
    thiDuaVungTong 
  } from '../../stores.js';
  import { regionalProcessor } from '../../services/processing/logic/regional.processor.js';
  import TdvInfographic from './TdvInfographic.svelte';

  let fileStatus = "";
  let isLoading = false;
  
  // Đổi tên biến để quản lý rõ ràng: Danh sách gốc vs Danh sách đã lọc
  let allSupermarketNames = []; 
  
  let selectedSupermarket = ""; 
  let reportData = null;
  let localTongData = [];

  // --- LOGIC LỌC NGHIÊM NGẶT (STRICT FILTER) ---
  // Chỉ hiển thị những siêu thị có tên CHỨA ĐÚNG cụm từ khóa (theo thứ tự)
  $: filteredSupermarketNames = selectedSupermarket
      ? allSupermarketNames.filter(name => 
          name.toLowerCase().includes(selectedSupermarket.trim().toLowerCase())
        )
      : allSupermarketNames;

  // --- HÀM XỬ LÝ FILE ---
  async function _handleFileRead(file) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const data = new Uint8Array(e.target.result);
                  const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: true });
                 resolve(workbook);
              } catch (err) { reject(err); }
          };
          reader.onerror = (err) => reject(new Error("Lỗi đọc file: " + err));
          reader.readAsArrayBuffer(file);
      });
  }

  async function handleFileInput(event) {
    const file = event.target.files[0];
    const fileNameEl = document.getElementById('file-name-thidua-vung');
    if (!file) return;

    isLoading = true;
    if (fileNameEl) fileNameEl.textContent = file.name;
    fileStatus = "Đang xử lý...";
    reportData = null;
    selectedSupermarket = "";

    try {
      const workbook = await _handleFileRead(file);
      const { chiTietData, tongData } = regionalProcessor.processThiDuaVungFile(workbook);
      
      if (!tongData || tongData.length === 0) throw new Error('File rỗng.');
      
      thiDuaVungChiTiet.set(chiTietData);
      thiDuaVungTong.set(tongData);
      localTongData = tongData;

      // Lưu vào danh sách gốc
      allSupermarketNames = tongData
          .map(row => row.sieuThi)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      
      fileStatus = `✅ Đã xử lý ${allSupermarketNames.length} siêu thị.`;

    } catch (error) {
      console.error(error);
      fileStatus = `❌ Lỗi: ${error.message}`;
      allSupermarketNames = [];
    } finally {
      isLoading = false;
      event.target.value = null;
    }
  }

  // --- HÀM XỬ LÝ CHỌN VỚI AN TOÀN DỮ LIỆU ---
  function handleSelectChange() {
      // Tìm chính xác trong data gốc
      const row = localTongData.find(r => r.sieuThi === selectedSupermarket);
      if (row) {
          reportData = {
              sieuThi: row.sieuThi || 'Không tên',
              kenh: row.kenh || 'N/A',
              tongThuong: row.tongThuong || 0,
              soNganhHang: row.soNganhHang || 0,
              soNganhHangDat: row.soNganhHangDat || 0,
              rankCutoff: row.rankCutoff || 0,
              details: (Array.isArray(row.details) ? row.details : []).map(d => ({
                  ...d,
                  nganhHang: d.nganhHang || 'N/A',
                  duKienHoanThanh: d.duKienHoanThanh || 0,
                  duKienVuot: d.duKienVuot || 0,
                  bestRank: d.bestRank || 9999,
                  tongThuong: d.tongThuong || 0,
                  potentialPrize: d.potentialPrize || 0
              }))
          };
      } else {
          reportData = null;
      }
  }

  function selectAllText(e) {
      if (e && e.target) {
          e.target.select();
      }
  }

  onMount(() => {
    if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="content-card"> 
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-end"> 
        <div class="data-input-group input-group--blue"> 
            <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4"> 
                <label class="data-input-group__label !mb-2 sm:!mb-0 flex-shrink-0">File Thi Đua Vùng:</label> 
                <div class="flex items-center gap-2"> 
                    <label 
                        for="file-thidua-vung" 
                        class="data-input-group__file-trigger"
                        class:opacity-50={isLoading}
                    >
                        {isLoading ? 'Đang xử lý...' : 'Thêm file'}
                    </label> 
                    <span id="file-name-thidua-vung" class="data-input-group__file-name">Chưa thêm file</span> 
                </div>
            </div> 
            <input 
                type="file" 
                id="file-thidua-vung" 
                class="hidden" 
                accept=".xlsx, .xls, .csv"
                on:change={handleFileInput}
                disabled={isLoading}
            > 
            <div class="data-input-group__status-wrapper mt-2">
                <span class="data-input-group__status-text font-medium" 
                      class:text-green-600={fileStatus.includes('✅')}
                      class:text-red-600={fileStatus.includes('❌')}>
                      {fileStatus}
                </span>
            </div> 
        </div>
        
        <div class="data-input-group input-group--yellow h-full" style="min-height: 104px;"> 
             <label class="data-input-group__label">Chọn Siêu thị:</label> 
             <div class="data-input-group__content text-black w-full">
                <input 
                    list="supermarket-list" 
                    type="text"
                    class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-yellow-500 bg-white"
                    placeholder={allSupermarketNames.length > 0 ? "Gõ mã hoặc tên siêu thị..." : "Vui lòng tải file..."}
                    bind:value={selectedSupermarket}
                    on:input={handleSelectChange}
                    on:change={handleSelectChange}
                    on:click={selectAllText}
                    on:focus={selectAllText}
                    disabled={allSupermarketNames.length === 0}
                />
                <datalist id="supermarket-list">
                    {#each filteredSupermarketNames as name}
                        <option value={name}></option>
                    {/each}
                </datalist>
             </div>
        </div> 
    </div>
</div> 

<div id="thidua-vung-infographic-container" class="mt-6"> 
    {#if reportData}
        {#key reportData.sieuThi}
            <TdvInfographic {reportData} />
        {/key}
    {:else}
        <div class="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 w-full">
             {#if isLoading}
                <p class="text-gray-500">⏳ Đang xử lý dữ liệu...</p>
            {:else if allSupermarketNames.length > 0}
                 <p class="text-blue-600 font-medium">↑ Hãy nhập tên siêu thị vào ô tìm kiếm.</p>
            {:else}
                <p class="text-gray-400">Vui lòng tải file Excel để xem báo cáo.</p>
            {/if}
        </div> 
    {/if}
</div>

<style>
    /* XỬ LÝ CHẾ ĐỘ CHỤP ẢNH (CAPTURE MODE) */
    :global(.capture-container) .content-card {
        display: none !important;
    }

    :global(.capture-container) #thidua-vung-infographic-container {
        width: 960px !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
    }
</style>