<script>
  /* global XLSX */
  import { parseHcmExcelData } from './hcmTdv.logic.js';
  import HcmTdvInfographic from './HcmTdvInfographic.svelte';

  export let selectedRegion; // Nhận biến từ Router

  let fileStatus = "";
  let isLoading = false;
  let allSupermarketNames = []; 
  let selectedSupermarket = ""; 
  let hcmDataDict = {};
  let reportDataHCM = null;

  $: filteredSupermarketNames = selectedSupermarket
      ? allSupermarketNames.filter(name => name.toLowerCase().includes(selectedSupermarket.trim().toLowerCase()))
      : allSupermarketNames;

  async function _handleFileRead(file) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(XLSX.read(new Uint8Array(e.target.result), { type: 'array' }));
          reader.onerror = (err) => reject(new Error("Lỗi đọc file: " + err));
          reader.readAsArrayBuffer(file);
      });
  }

  async function handleFileInput(event) {
    const file = event.target.files[0];
    const fileNameEl = document.getElementById('file-name-thidua-hcm');
    if (!file) return;
    isLoading = true;
    if (fileNameEl) fileNameEl.textContent = file.name;
    fileStatus = "Đang xử lý...";
    reportDataHCM = null;
    selectedSupermarket = "";
    
    try {
      const workbook = await _handleFileRead(file);
      const result = parseHcmExcelData(workbook, XLSX);
      hcmDataDict = result.hcmDataDict;
      allSupermarketNames = result.allSupermarketNames;
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

  function handleSelectChange() {
      if (selectedSupermarket && hcmDataDict[selectedSupermarket]) {
          reportDataHCM = hcmDataDict[selectedSupermarket];
      } else {
          reportDataHCM = null;
      }
  }
</script>

<div class="content-card tdv-controls-card mb-6"> 
    <div class="flex flex-col lg:flex-row gap-4 items-stretch justify-between"> 
        
        <div class="data-input-group input-group--blue flex-1 !m-0 flex flex-col justify-center py-2 px-4 rounded-lg"> 
            <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-2"> 
                <label class="data-input-group__label !mb-0 flex-shrink-0 text-sm">File Thi Đua HCM:</label> 
                <div class="flex items-center gap-2"> 
                    <label for="file-thidua-hcm" class="data-input-group__file-trigger" class:opacity-50={isLoading}>
                        {isLoading ? 'Đang xử lý...' : 'Thêm file'}
                    </label> 
                    <span id="file-name-thidua-hcm" class="data-input-group__file-name text-xs truncate max-w-[120px]">Chưa có</span> 
                </div>
            </div> 
            <input type="file" id="file-thidua-hcm" class="hidden" accept=".xlsx, .xls, .csv" on:change={handleFileInput} disabled={isLoading}> 
            <div class="data-input-group__status-wrapper mt-1">
                <span class="data-input-group__status-text font-medium text-xs" class:text-green-600={fileStatus.includes('✅')} class:text-red-600={fileStatus.includes('❌')}>{fileStatus}</span>
            </div> 
        </div>
        
        <div class="data-input-group input-group--yellow flex-1 !m-0 flex flex-col justify-center py-2 px-4 rounded-lg"> 
             <label class="data-input-group__label mb-2 text-sm">Bộ lọc Siêu thị:</label> 
             <div class="data-input-group__content text-black w-full">
                <input list="supermarket-list-hcm" type="text"
                    class="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-yellow-500 bg-white"
                    placeholder={allSupermarketNames.length > 0 ? "Gõ mã hoặc tên ST..." : "Vui lòng tải file..."}
                    bind:value={selectedSupermarket} on:input={handleSelectChange} on:change={handleSelectChange}
                    disabled={allSupermarketNames.length === 0}
                />
                <datalist id="supermarket-list-hcm">
                    {#each filteredSupermarketNames as name}<option value={name}></option>{/each}
                </datalist>
             </div>
        </div> 

        <div class="flex items-center shrink-0">
            <div class="bg-gray-100 p-1.5 rounded-lg inline-flex border border-gray-200 shadow-inner h-full flex items-center">
                <button class="px-5 py-2 text-sm font-bold rounded-md transition-all duration-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50" on:click={() => selectedRegion = 'TNB'}>TNB</button>
                <button class="px-5 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-white shadow-sm text-blue-600 cursor-default">HCM</button>
            </div>
        </div>

    </div> 
</div> 

<div id="thidua-vung-infographic-container" data-capture-filename="THI_DUA_VUNG_HCM"> 
    {#if reportDataHCM}
        {#key reportDataHCM.sieuThi}
            <HcmTdvInfographic data={reportDataHCM} />
        {/key}
    {:else}
        <div class="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 w-full">
             {#if isLoading} <p class="text-gray-500">⏳ Đang xử lý dữ liệu HCM...</p>
             {:else if allSupermarketNames.length > 0} <p class="text-blue-600 font-medium">↑ Hãy nhập tên siêu thị vào ô tìm kiếm.</p>
             {:else} <p class="text-gray-400">Vui lòng tải file Excel HCM để xem báo cáo.</p> {/if}
        </div> 
    {/if}
</div>

<style>
    :global(.capture-container .tdv-controls-card) { display: none !important; }
    :global(.capture-container #thidua-vung-infographic-container) {
        width: 1100px !important; margin: 0 !important; padding: 0 !important; background: transparent !important;
    }
</style>