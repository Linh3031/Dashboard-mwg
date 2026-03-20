<script>
  /* global XLSX, feather */
  import { onMount, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import { thiDuaVungChiTiet, thiDuaVungTong } from '../../stores.js';
  import { regionalProcessor } from '../../services/processing/logic/regional.processor.js';
  import TdvInfographic from './TdvInfographic.svelte';
  import TdvTop20Modal from './TdvTop20Modal.svelte';

  export let selectedRegion; // Nhận biến từ Router

  let fileStatus = "";
  let isLoading = false;
  let allSupermarketNames = []; 
  let selectedSupermarket = ""; 
  let reportData = null;
  let localTongData = [];
  
  // States cho Modal Top 20
  let showTop20Modal = false;
  let modalCategoryTitle = "";
  let modalTop20Data = [];
  let modalCriteria = "";

  $: filteredSupermarketNames = selectedSupermarket
      ? allSupermarketNames.filter(name => name.toLowerCase().includes(selectedSupermarket.trim().toLowerCase()))
      : allSupermarketNames;

  async function _handleFileRead(file) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const data = new Uint8Array(e.target.result);
                  resolve(XLSX.read(data, { type: 'array', cellDates: true, cellText: true }));
              } catch (err) { reject(err); }
          };
          reader.onerror = (err) => reject(new Error("Lỗi đọc file: " + err));
          reader.readAsArrayBuffer(file);
      });
  }

  async function handleFileInput(event) {
    const file = event.target.files[0];
    const fileNameEl = document.getElementById('file-name-thidua-tnb');
    if (!file) return;
    isLoading = true;
    if (fileNameEl) fileNameEl.textContent = file.name;
    fileStatus = "Đang xử lý...";
    reportData = null;
    selectedSupermarket = "";
    localStorage.removeItem('tdv_selected_st_tnb');
    
    try {
      const workbook = await _handleFileRead(file);
      const { chiTietData, tongData } = regionalProcessor.processThiDuaVungFile(workbook);
      if (!tongData || tongData.length === 0) throw new Error('File rỗng.');
      
      thiDuaVungChiTiet.set(chiTietData);
      thiDuaVungTong.set(tongData);
      localTongData = tongData;
      allSupermarketNames = tongData.map(row => row.sieuThi).filter(Boolean).sort((a, b) => a.localeCompare(b));
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
      if (selectedSupermarket) localStorage.setItem('tdv_selected_st_tnb', selectedSupermarket);

      const row = localTongData.find(r => r.sieuThi === selectedSupermarket);
      if (row) {
          const prizeDict = {};
          const chiTiet = get(thiDuaVungChiTiet) || [];
          
          chiTiet.forEach(item => {
              if (item.tongThuong > 0) {
                  const key = `${item.kenh}_${item.nganhHang}`;
                  if (!prizeDict[key] || item.tongThuong < prizeDict[key]) prizeDict[key] = item.tongThuong;
              }
          });
          
          let tongTienTiemNang = 0;
          reportData = {
              sieuThi: row.sieuThi || 'Không tên', kenh: row.kenh || 'N/A',
              tongThuong: row.tongThuong || 0, soNganhHang: row.soNganhHang || 0,
              soNganhHangDat: row.soNganhHangDat || 0, rankCutoff: row.rankCutoff || 0,
              details: (Array.isArray(row.details) ? row.details : []).map(d => {
                  let potentialPrize = d.potentialPrize || 0;
                  const gap = (d.bestRank || 9999) - (row.rankCutoff || 0);
                  if ((d.tongThuong || 0) === 0 && gap > 0 && gap < 10) {
                      const key = `${row.kenh}_${d.nganhHang}`;
                      potentialPrize = prizeDict[key] || 0;
                      tongTienTiemNang += potentialPrize; 
                  }
                  return { ...d, nganhHang: d.nganhHang || 'N/A', potentialPrize: potentialPrize };
              })
          };
          reportData.tongThuongTiemNang = tongTienTiemNang;
      } else {
          reportData = null;
      }
  }

  function handleOpenCategoryModal(event) {
      const categoryName = event.detail;
      if (!categoryName || !reportData || !reportData.kenh) return;

      const currentKenh = reportData.kenh;
      const currentST = reportData.sieuThi;
      const allChiTiet = get(thiDuaVungChiTiet) || [];

      let filteredData = allChiTiet.filter(item => item.kenh === currentKenh && item.nganhHang === categoryName);
      if (filteredData.length === 0) return;

      let processedList = filteredData.map(item => ({
          sieuThi: item.sieuThi || 'N/A', duKienHoanThanh: Number(item.duKienHoanThanh) || 0,
          duKienVuot: Number(item.duKienVuot) || 0, hangTarget: Number(item.rankTarget) || 9999,      
          hangVuotTroi: Number(item.rankVuotTroi) || 9999, tongThuong: Number(item.tongThuong) || 0
      }));

      let criteria = 'target';
      let targetRowOfCurrentST = processedList.find(r => r.sieuThi === currentST);
      if (targetRowOfCurrentST && targetRowOfCurrentST.hangVuotTroi < targetRowOfCurrentST.hangTarget) criteria = 'vuot';

      processedList = processedList.map(item => {
          item.primaryRank = criteria === 'target' ? item.hangTarget : item.hangVuotTroi;
          return item;
      });

      processedList.sort((a, b) => a.primaryRank - b.primaryRank);
      modalTop20Data = processedList.slice(0, 20);
      modalCategoryTitle = categoryName;
      modalCriteria = criteria === 'target' ? 'Hạng Target' : 'Hạng Vượt Trội';
      showTop20Modal = true;
  }

  onMount(() => {
    if (typeof feather !== 'undefined') feather.replace();
    const savedTong = get(thiDuaVungTong);
    if (savedTong && savedTong.length > 0) {
        localTongData = savedTong;
        allSupermarketNames = savedTong.map(row => row.sieuThi).filter(Boolean).sort((a, b) => a.localeCompare(b));
        fileStatus = `✅ Đã tải ${allSupermarketNames.length} ST từ bộ nhớ.`;

        const savedST = localStorage.getItem('tdv_selected_st_tnb');
        if (savedST && allSupermarketNames.includes(savedST)) {
            selectedSupermarket = savedST;
            handleSelectChange(); 
        }
    }
  });

  afterUpdate(() => { if (typeof feather !== 'undefined') feather.replace(); });
</script>

<div class="content-card tdv-controls-card mb-6"> 
    <div class="flex flex-col lg:flex-row gap-4 items-stretch justify-between"> 
        
        <div class="data-input-group input-group--blue flex-1 !m-0 flex flex-col justify-center py-2 px-4 rounded-lg"> 
            <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-2"> 
                <label class="data-input-group__label !mb-0 flex-shrink-0 text-sm">File Thi Đua TNB:</label> 
                <div class="flex items-center gap-2"> 
                    <label for="file-thidua-tnb" class="data-input-group__file-trigger" class:opacity-50={isLoading}>
                        {isLoading ? 'Đang xử lý...' : 'Thêm file'}
                    </label> 
                    <span id="file-name-thidua-tnb" class="data-input-group__file-name text-xs truncate max-w-[120px]">Chưa có</span> 
                </div>
            </div> 
            <input type="file" id="file-thidua-tnb" class="hidden" accept=".xlsx, .xls, .csv" on:change={handleFileInput} disabled={isLoading}> 
            <div class="data-input-group__status-wrapper mt-1">
                <span class="data-input-group__status-text font-medium text-xs" class:text-green-600={fileStatus.includes('✅')} class:text-red-600={fileStatus.includes('❌')}>{fileStatus}</span>
            </div> 
        </div>
        
        <div class="data-input-group input-group--yellow flex-1 !m-0 flex flex-col justify-center py-2 px-4 rounded-lg"> 
             <label class="data-input-group__label mb-2 text-sm">Bộ lọc Siêu thị:</label> 
             <div class="data-input-group__content text-black w-full">
                <input list="supermarket-list-tnb" type="text"
                    class="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-yellow-500 bg-white"
                    placeholder={allSupermarketNames.length > 0 ? "Gõ mã hoặc tên ST..." : "Vui lòng tải file..."}
                    bind:value={selectedSupermarket} on:input={handleSelectChange} on:change={handleSelectChange}
                    disabled={allSupermarketNames.length === 0}
                />
                <datalist id="supermarket-list-tnb">
                    {#each filteredSupermarketNames as name}<option value={name}></option>{/each}
                </datalist>
             </div>
        </div> 

        <div class="flex items-center shrink-0">
            <div class="bg-gray-100 p-1.5 rounded-lg inline-flex border border-gray-200 shadow-inner h-full flex items-center">
                <button class="px-5 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-white shadow-sm text-blue-600 cursor-default">TNB</button>
                <button class="px-5 py-2 text-sm font-bold rounded-md transition-all duration-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50" on:click={() => selectedRegion = 'HCM'}>HCM</button>
            </div>
        </div>

    </div> 
</div> 

<div id="thidua-vung-infographic-container" data-capture-filename="THI_DUA_VUNG_TNB"> 
    {#if reportData}
        <p class="text-sm text-red-500 italic mb-3 text-center font-medium">* Bấm vào ngành hàng để xem chi tiết bảng xếp hạng</p>
        {#key reportData.sieuThi}
            <TdvInfographic {reportData} on:openCategoryModal={handleOpenCategoryModal} />
        {/key}
    {:else}
        <div class="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 w-full">
             {#if isLoading} <p class="text-gray-500">⏳ Đang xử lý dữ liệu TNB...</p>
             {:else if allSupermarketNames.length > 0} <p class="text-blue-600 font-medium">↑ Hãy nhập tên siêu thị vào ô tìm kiếm.</p>
             {:else} <p class="text-gray-400">Vui lòng tải file Excel Miền Tây để xem báo cáo.</p> {/if}
        </div> 
    {/if}
</div>

<TdvTop20Modal 
    show={showTop20Modal} title={modalCategoryTitle} data={modalTop20Data} 
    {selectedSupermarket} criteriaName={modalCriteria} on:close={() => showTop20Modal = false} 
/>

<style>
    :global(.capture-container .tdv-controls-card) { display: none !important; }
    :global(.capture-container #thidua-vung-infographic-container) {
        width: 1100px !important; margin: 0 !important; padding: 0 !important; background: transparent !important;
    }
</style>