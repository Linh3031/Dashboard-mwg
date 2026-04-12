<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store'; // [GENESIS FIX]
  import { dataService } from '../../services/dataService.js';
  import { datasyncService } from '../../services/datasync.service.js'; // [GENESIS FIX]
  import { storage } from '../../services/storage.service.js'; // [GENESIS FIX]
  import { 
      danhSachNhanVien, rawGioCongData, ycxData, thuongNongData,
      ycxDataThangTruoc, thuongNongDataThangTruoc,
      ycxDataCungKyNam,
      fileSyncState,
      selectedWarehouse // [GENESIS FIX]
  } from '../../stores.js';

  export let label = "Chưa có nhãn";
  export let icon = "file";
  export let saveKey = "";
  export let link = "";
  export let isMultiMode = false; 

  let fileName = "Chưa thêm file";
  let statusHTML = "";
  let isLoading = false;
  let statusClass = "text-gray-500";
  let localError = "";

  const storeMap = {
      'saved_danhsachnv': danhSachNhanVien,
      'saved_giocong': rawGioCongData,
      'saved_ycx': ycxData,
      'saved_thuongnong': thuongNongData,
      'saved_ycx_thangtruoc': ycxDataThangTruoc,
      'saved_thuongnong_thangtruoc': thuongNongDataThangTruoc,
      'saved_ycx_cungkynam': ycxDataCungKyNam
  };

  let dataStore = storeMap[saveKey];

  $: syncState = $fileSyncState[saveKey];
  $: dataCount = $dataStore ? $dataStore.length : 0;

  // Chỉ điểm chính xác từ khóa "maKhoTao"
  $: uniqueWarehouses = (isMultiMode && $dataStore) 
        ? [...new Set($dataStore.map(d => d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo']).filter(Boolean))] 
        : [];

  // Tự động nội soi "Tháng" từ cột "Ngày tạo"
  $: uniqueMonths = (isMultiMode && $dataStore)
        ? [...new Set($dataStore.map(d => {
            const dateVal = d.ngayTao || d['Ngày tạo'];
            if (!dateVal) return null;
            try {
                const dateObj = new Date(dateVal);
                if (isNaN(dateObj)) return null;
                const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                const y = dateObj.getFullYear();
                return `${m}/${y}`; // Format ra 03/2026
            } catch(e) { return null; }
        }).filter(Boolean))].sort()
        : [];

  // Tìm ngày cập nhật gần nhất
  $: maxDateStr = (() => {
        if (!$dataStore || $dataStore.length === 0) return '';
        let maxTs = 0;
        $dataStore.forEach(d => {
            const dateVal = d.ngayTao || d['Ngày tạo'] || d.NGAY_TAO;
            if (!dateVal) return;
            const ts = new Date(dateVal).getTime();
            if (!isNaN(ts) && ts > maxTs) maxTs = ts;
        });
        if (maxTs === 0) return '';
        const d = new Date(maxTs);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  })();

  $: {
      if (isLoading) {
          statusHTML = "Đang xử lý...";
          statusClass = "text-blue-600 font-semibold";
      } else if (localError) {
          statusHTML = localError;
          statusClass = "text-red-600 font-bold text-xs";
      } else if (syncState) {
          if (syncState.status === 'update_available') {
              statusClass = "text-orange-600 font-semibold";
              statusHTML = `<span>${syncState.message}</span> <button class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded btn-download-cloud pointer-events-auto">Tải & Xử lý</button>`;
          } else if (syncState.status === 'downloading' || syncState.status === 'error') {
              statusClass = syncState.status === 'error' ? "text-red-600 text-xs" : "text-blue-600";
              statusHTML = syncState.message;
          } else {
              statusClass = "text-green-600 font-medium";
              let dateInfo = maxDateStr ? ` <span class="text-[11px] text-blue-600 ml-1 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">(Đến: ${maxDateStr})</span>` : '';
              statusHTML = isMultiMode ? `✓ Dữ liệu tổng hợp (${dataCount} dòng)${dateInfo}` : `${syncState.message}${dateInfo}`;
              if (syncState.metadata?.fileName && !isMultiMode) fileName = syncState.metadata.fileName;
          }
      } else if (dataCount > 0) {
          statusClass = "text-green-600";
          let dateInfo = maxDateStr ? ` <span class="text-[11px] text-blue-600 ml-1 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">(Đến: ${maxDateStr})</span>` : '';
          statusHTML = isMultiMode ? `✓ Dữ liệu tổng hợp (${dataCount} dòng)${dateInfo}` : `✓ Đã tải ${dataCount} dòng (Local)${dateInfo}`;
      } else {
          statusHTML = "";
      }
  }

  async function handleChange(event) {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;

      isLoading = true;
      localError = "";
      if (!dataStore) {
          localError = `Hệ thống chưa map key '${saveKey}'.`;
          isLoading = false;
          return;
      }

      try {
          for (const file of files) {
              fileName = file.name;
              const result = await dataService.handleFileChange(file, saveKey, isMultiMode);
              if (!result.success) {
                  localError += `Lỗi file ${file.name}: ${result.message}<br/>`;
              }
          }
          if (!localError) fileName = files.length > 1 ? `Đã nạp ${files.length} file dữ liệu` : files[0].name;
      } catch (err) {
          console.error(err);
          localError += `Lỗi hệ thống: ${err.message}`;
      } finally {
          isLoading = false;
          event.target.value = null; 
      }
  }

  function removeWarehouse(whCode) {
      if (!dataStore) return;
      dataStore.update(currentData => {
          return currentData.filter(d => {
              const code = d.maKhoTao || d.maKho || d['Mã kho tạo'] || d['Kho tạo'];
              return code !== whCode;
          });
      });
  }

  // --- [GENESIS FIX]: NỐI DÂY ĐIỆN CHO NÚT "X" XÓA THEO THÁNG ---
  async function removeMonth(targetMonth) {
      if (!dataStore) return;
      if (!confirm(`Bạn có chắc chắn muốn xóa dữ liệu của tháng ${targetMonth} không?`)) return;

      const kho = get(selectedWarehouse);
      
      isLoading = true; 

      // 1. DIỆT TRÊN CLOUD (Để máy khác và lần sau F5 không bị tải lại)
      if (isMultiMode && kho) {
          try {
              await datasyncService.deleteMonthFromMultiMetadata(kho, saveKey, targetMonth);
          } catch (e) {
              alert("Lỗi khi xóa trên Cloud: " + e.message);
              isLoading = false;
              return;
          }
      }

      // 2. DIỆT TRÊN RAM (Để UI của bạn giật mất cái file đó ngay lập tức)
      dataStore.update(currentData => {
          return currentData.filter(d => {
              const dateVal = d.ngayTao || d['Ngày tạo'];
              if (!dateVal) return true; 
              try {
                  const dateObj = new Date(dateVal);
                  if (isNaN(dateObj)) return true;
                  const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                  const y = dateObj.getFullYear();
                  const rowMonth = `${m}/${y}`;
                  return rowMonth !== targetMonth; 
              } catch(e) { return true; }
          });
      });

      // 3. DIỆT TRÊN Ổ CỨNG MÁY BẠN (IndexedDB - Để F5 không lấy rác ở Local lên)
      try {
          await storage.setItem(saveKey, get(dataStore));
      } catch (e) {
          console.error("Lỗi cập nhật Local Storage:", e);
      }

      isLoading = false;
  }

  function clearAllData() {
      if (!dataStore) return;
      if (confirm(`Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu của "${label}" không?`)) {
          dataStore.set([]);
          fileName = "Chưa thêm file";
      }
  }

  function handleContainerClick(e) {
      if (e.target.closest('a') || e.target.closest('button.remove-wh-btn')) return;
      if (e.target.closest('.btn-download-cloud')) {
          e.preventDefault();
          e.stopPropagation();
          dataService.downloadFileFromCloud(saveKey);
      }
  }
  
  onMount(() => {
     if (typeof feather !== 'undefined') feather.replace();
  });
</script>

<div class="data-input-group input-group--yellow" on:click={handleContainerClick}> 
    <div class="data-input-group__label relative z-10 flex justify-between items-center w-full"> 
       <div class="flex items-center">
           <i data-feather={icon} class="h-5 w-5 feather"></i>
           {#if link}
                <a href={link} target="_blank" class="text-blue-700 underline font-bold cursor-pointer relative z-50 hover:text-blue-900 pointer-events-auto" on:click|stopPropagation title="Mở báo cáo nguồn">
                    {label}: <i class="w-3 h-3 inline-block ml-1" data-feather="external-link"></i>
                </a>
           {:else}
                <span>{label}:</span>
           {/if}
       </div>
       
       {#if isMultiMode}
           <span class="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase" title="Có thể kéo thả nhiều file cùng lúc">Gộp file</span>
       {/if}
    </div> 
    
    <div class="data-input-group__content mt-1"> 
        <div class="flex items-center gap-2"> 
            <label for="file-{saveKey}" class="data-input-group__file-trigger whitespace-nowrap" class:opacity-50={isLoading}>
                {#if isLoading}
                    Đang chạy...
                {:else}
                    Thêm file
                {/if}
            </label>
            <span class="data-input-group__file-name truncate" title={fileName}>{fileName}</span> 
        </div> 
      
        {#if saveKey === 'saved_danhsachnv'}
            <button on:click={() => dataService.handleTemplateDownload()} class="data-input-group__link text-left pointer-events-auto relative z-50">Tải file mẫu</button> 
        {/if}

        <input type="file" id="file-{saveKey}" class="hidden" accept=".xlsx, .xls, .csv" on:change={handleChange} disabled={isLoading} multiple={isMultiMode}> 
      
        <div class="data-input-group__status-wrapper"> 
            <span class="data-input-group__status-text {statusClass}">{@html statusHTML}</span> 
        </div> 

        {#if isMultiMode && (uniqueWarehouses.length > 0 || uniqueMonths.length > 0)}
            <div class="mt-3 flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-inner pointer-events-auto relative z-50">
                
                <div class="flex justify-between items-center border-b border-slate-200 pb-2">
                    <div class="flex flex-col gap-1">
                        <div class="text-[11px] text-slate-500 font-bold uppercase flex items-center gap-1">
                            <i data-feather="database" class="w-3 h-3"></i> Tóm tắt dữ liệu Gộp:
                        </div>
                        {#if maxDateStr}
                            <div class="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-1 shadow-sm w-max mt-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                                Dữ liệu đến: {maxDateStr}
                            </div>
                        {/if}
                    </div>
                    <button class="text-[10px] bg-red-100 text-red-600 hover:bg-red-600 hover:text-white font-bold px-2 py-1 rounded transition-colors remove-wh-btn shadow-sm h-max" on:click|stopPropagation={clearAllData} title="Xóa trắng toàn bộ dữ liệu này">
                        Xóa tất cả
                    </button>
                </div>

                {#if uniqueWarehouses.length > 0}
                <div>
                    <div class="text-[10px] text-indigo-500 w-full font-bold uppercase mb-1.5 flex items-center gap-1">
                        <i data-feather="home" class="w-3 h-3"></i> Mã Kho ({uniqueWarehouses.length}):
                    </div>
                    <div class="flex flex-wrap gap-2">
                        {#each uniqueWarehouses as whCode}
                            <div class="flex items-center gap-1 bg-white border border-indigo-200 pl-2 pr-1 py-1 rounded shadow-sm text-xs font-bold text-indigo-800">
                                {whCode}
                                <button class="remove-wh-btn ml-1 text-red-400 hover:text-white hover:bg-red-500 transition-colors rounded p-0.5 cursor-pointer" on:click|stopPropagation={() => removeWarehouse(whCode)} title="Xóa dữ liệu kho {whCode}">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>
                {/if}

                {#if uniqueMonths.length > 0}
                <div class="{uniqueWarehouses.length > 0 ? 'pt-2 border-t border-slate-200' : ''}">
                    <div class="text-[10px] text-emerald-600 w-full font-bold uppercase mb-1.5 flex items-center gap-1">
                        <i data-feather="calendar" class="w-3 h-3"></i> Tháng ({uniqueMonths.length}):
                    </div>
                  
                    <div class="flex flex-wrap gap-2">
                        {#each uniqueMonths as monthStr}
                            <div class="flex items-center gap-1 bg-white border border-emerald-200 pl-2 pr-1 py-1 rounded shadow-sm text-xs font-bold text-emerald-800">
                                {monthStr}
                                <button class="remove-wh-btn ml-1 text-red-400 hover:text-white hover:bg-red-500 transition-colors rounded p-0.5 cursor-pointer" on:click|stopPropagation={() => removeMonth(monthStr)} title="Xóa toàn bộ dữ liệu của tháng {monthStr}">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>
                {/if}
            </div>
        {/if}
        
        {#if isLoading || (syncState && syncState.status === 'downloading')}
            <div class="progress-bar-container mt-2">
                <div class="progress-bar" style="width: 100%; background-color: #3b82f6;"></div>
            </div>
        {/if}
    </div> 
</div>