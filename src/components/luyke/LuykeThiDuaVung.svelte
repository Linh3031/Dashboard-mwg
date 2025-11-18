<script>
  /* global XLSX, feather */
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { 
    thiDuaVungChiTiet, 
    thiDuaVungTong, 
    choices 
  } from '../../stores.js';
  import { dataProcessing } from '../../services/dataProcessing.js';
  import { reportService } from '../../services/reportService.js';
  import TdvInfographic from './TdvInfographic.svelte';

  let fileStatus = "";
  let isLoading = false;
  let supermarketNames = [];
  let selectedSupermarket = "";
  let reportData = null;
  let choicesInstance = null;
  let selectElement = null; 

  async function _handleFileRead(file) {
      return new Promise((resolve, reject) => {
          if (!file) return reject(new Error("No file provided."));
          const reader = new FileReader();
          reader.onload = (event) => {
              try {
                  const data = new Uint8Array(event.target.result);
                  const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: true });
                 resolve(workbook);
              } catch (err) { reject(err); }
          };
          reader.onerror = (err) => reject(new Error("Could not read the file: " + err));
          reader.readAsArrayBuffer(file);
      });
  }

  async function handleFileInput(event) {
    const file = event.target.files[0];
    const fileNameEl = document.getElementById('file-name-thidua-vung');
    if (!file) {
      if (fileNameEl) fileNameEl.textContent = "Chưa thêm file";
      fileStatus = "";
      return;
    }

    isLoading = true;
    if (fileNameEl) fileNameEl.textContent = file.name;
    fileStatus = "Đang xử lý file...";

    try {
      const workbook = await _handleFileRead(file);
      const { chiTietData, tongData } = dataProcessing.processThiDuaVungFile(workbook);
      
      if (!tongData || tongData.length === 0) {
        throw new Error('Không tìm thấy dữ liệu hợp lệ trong file.');
      }

      thiDuaVungChiTiet.set(chiTietData);
      thiDuaVungTong.set(tongData);
 
      const supermarketKey = Object.keys(tongData[0]).find(k => k.trim().toLowerCase().includes('siêu thị'));
      supermarketNames = [...new Set(tongData.map(row => row[supermarketKey]).filter(Boolean))].sort();

      if (choicesInstance) {
        choicesInstance.clearStore();
        choicesInstance.setChoices(
          supermarketNames.map(name => ({ value: name, label: name })),
          'value',
          'label',
          true
        );
      }
      
      fileStatus = `✅ Đã xử lý ${supermarketNames.length} siêu thị.`;
    } catch (error) {
      console.error("Lỗi xử lý file Thi Đua Vùng:", error);
      fileStatus = `❌ Lỗi: ${error.message}`;
    } finally {
      isLoading = false;
      event.target.value = null; 
    }
  }

  function handleFilterChange() {
    if (!choicesInstance) return;
    const selectedValue = choicesInstance.getValue(true);
    selectedSupermarket = selectedValue;
 
    if (selectedValue) {
      reportData = reportService.generateThiDuaVungReport(selectedValue);
    } else {
      reportData = null;
    }
  }

  onMount(() => {
    if (typeof Choices !== 'undefined' && selectElement) {
      choicesInstance = new Choices(selectElement, {
        searchEnabled: true,
        removeItemButton: false,
        itemSelectText: 'Chọn',
        searchPlaceholderValue: 'Tìm kiếm siêu thị...'
      });
      choices.update(c => ({ ...c, thiDuaVung_sieuThi: choicesInstance }));
    }
    
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
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
                data-name="Thi đua vùng" 
                accept=".xlsx, .xls, .csv"
                on:change={handleFileInput}
                disabled={isLoading}
            > 
            <div class="data-input-group__status-wrapper mt-2">
                <span 
                    class="data-input-group__status-text"
                    class:text-green-600={fileStatus.startsWith('✅')}
                    class:text-red-600={fileStatus.startsWith('❌')}
                >
                    {fileStatus}
                </span>
            </div> 
        </div>
        
        <div class="data-input-group input-group--yellow h-full" style="min-height: 104px;"> 
             <label class="data-input-group__label">Chọn Siêu thị:</label> 
             <div class="data-input-group__content">
                <select 
                    id="thidua-vung-filter-supermarket" 
                    bind:this={selectElement}
                    on:change={handleFilterChange}
                >
                    <option value="">Vui lòng tải file...</option>
                </select> 
             </div>
        </div> 
    </div>
</div> 

<div id="thidua-vung-infographic-container" class="mt-6"> 
    {#if reportData}
        <TdvInfographic {reportData} />
    {:else}
        <div class="placeholder-message">Vui lòng tải file và chọn một siêu thị để xem báo cáo.</div> 
    {/if}
</div>