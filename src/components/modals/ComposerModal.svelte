<script>
  import { onMount, tick } from 'svelte';
  import { 
    modalState, 
    composerTemplates, 
    danhSachNhanVien, 
    ycxData, 
    realtimeYCXData, 
    luykeGoalSettings, 
    realtimeGoalSettings, 
    selectedWarehouse, 
    masterReportData,
    competitionData,
    globalCompetitionConfigs,
    localCompetitionConfigs,
    notificationStore
  } from '../../stores.js';
  
  import { composerService } from '../../services/composerService.js';
  import { reportService } from '../../services/reportService.js';
  
  // [SỬA LỖI]: Import từ services thay vì modules
  import { settingsService } from '../../services/settings.service.js';
  
  import { cleanCategoryName } from '../../utils.js';

  // --- CẤU HÌNH TAB ---
  const CONFIG = {
      luyke: {
          label: 'Sức khỏe Siêu thị (Lũy kế)',
          subTabs: [
              { id: 'subtab-luyke-sieu-thi', label: 'Siêu thị Lũy kế' },
              { id: 'subtab-luyke-thi-dua', label: 'Thi đua Lũy kế' },
              { id: 'subtab-luyke-thidua-vung', label: 'Thi Đua Vùng TNB' }
          ]
      },
      sknv: {
          label: 'Sức khỏe Nhân viên',
          subTabs: [
              { id: 'subtab-sknv', label: 'SKNV' },
              { id: 'subtab-doanhthu', label: 'Doanh thu LK' },
              { id: 'subtab-thunhap', label: 'Thu nhập' },
              { id: 'subtab-hieuqua', label: 'Hiệu quả NV LK' },
              { id: 'subtab-nganhhang', label: 'DT ngành hàng' },
              { id: 'subtab-thidua', label: 'Thi đua NV LK' }
          ]
      },
      realtime: {
          label: 'Doanh thu Realtime',
          subTabs: [
              { id: 'subtab-realtime-sieu-thi', label: 'Siêu thị Realtime' },
              { id: 'subtab-realtime-nhan-vien', label: 'DT NV Realtime' },
              { id: 'subtab-realtime-hieu-qua-nhan-vien', label: 'Hiệu quả NV Realtime' },
              { id: 'subtab-realtime-nganh-hang', label: 'Ngành hàng Realtime' },
              { id: 'subtab-realtime-hang-ban', label: 'DT Hãng Realtime' },
              { id: 'subtab-realtime-thi-dua', label: 'Thi đua NV Realtime' }
          ]
      }
  };

  // --- STATE ---
  $: isOpen = $modalState.activeModal === 'composer-modal';
  $: context = $modalState.context || 'luyke'; 
  
  let activeSubTabId = '';
  let activeTagTab = 'general'; 
  let editorContent = '';
  let textareaEl;
  
  // Filter Ranking
  let rankingDept = 'ALL';
  $: uniqueDepartments = [...new Set($danhSachNhanVien.map(nv => nv.boPhan).filter(Boolean))].sort();

  // Computed Data cho Tags
  let supermarketReport = {};
  let rankingReportData = [];
  let compData = [];
  let currentGoals = {};

  // --- LOGIC ---

  // 1. Khởi tạo khi mở Modal
  $: if (isOpen && context) {
      initializeData();
  }

  async function initializeData() {
      if (!activeSubTabId && CONFIG[context]) {
          activeSubTabId = CONFIG[context].subTabs[0].id;
      }
      
      if ($composerTemplates[context] && $composerTemplates[context][activeSubTabId]) {
          editorContent = $composerTemplates[context][activeSubTabId];
      } else {
          editorContent = '';
      }

      await calculateReportData();
  }

  // 2. Tính toán dữ liệu nền
  async function calculateReportData() {
      const warehouse = $selectedWarehouse;
      let sourceData = [];
      let isRealtime = false;

      if (context === 'realtime') {
          sourceData = $realtimeYCXData;
          const settings = settingsService.getRealtimeGoalSettings(warehouse);
          currentGoals = settings.goals || {};
          isRealtime = true;
      } else {
          sourceData = $ycxData;
          const settings = settingsService.getLuykeGoalSettings(warehouse);
          currentGoals = settings.goals || {};
      }

      const masterReport = reportService.generateMasterReportData(sourceData, currentGoals, isRealtime);
      
      if (warehouse) {
          rankingReportData = masterReport.filter(nv => nv.maKho == warehouse);
      } else {
          rankingReportData = masterReport;
      }

      supermarketReport = reportService.aggregateReport(rankingReportData, warehouse);
      
      if (context === 'luyke' || context === 'sknv') {
          compData = $competitionData; 
      } else {
           compData = []; 
      }
  }

  // 3. Chuyển đổi Subtab
  function switchSubTab(tabId) {
      if (activeSubTabId) {
          updateTemplateStore(activeSubTabId, editorContent);
      }
      
      activeSubTabId = tabId;
      editorContent = $composerTemplates[context]?.[tabId] || '';
  }

  function updateTemplateStore(tabId, content) {
      composerTemplates.update(s => {
          if (!s[context]) s[context] = {};
          s[context][tabId] = content;
          return s;
      });
      localStorage.setItem('composerTemplates', JSON.stringify($composerTemplates));
  }

  // 4. Chèn Tag
  function insertTag(tag, isTemplate = false) {
      if (!textareaEl) return;
      
      let textToInsert = tag;
      if (isTemplate) {
          textToInsert = tag.replace('{dept}', rankingDept);
      }

      const start = textareaEl.selectionStart;
      const end = textareaEl.selectionEnd;
      const value = textareaEl.value;

      editorContent = value.substring(0, start) + textToInsert + value.substring(end);
      
      tick().then(() => {
          const newCursorPos = start + textToInsert.length;
          textareaEl.selectionStart = newCursorPos;
          textareaEl.selectionEnd = newCursorPos;
          textareaEl.focus();
      });
  }

  // 5. Xử lý Save & Preview
  function handleSave() {
      updateTemplateStore(activeSubTabId, editorContent);
      notificationStore.show('Đã lưu mẫu nhận xét!', 'success');
  }

  function handlePreviewAndCopy() {
      if (!editorContent.trim()) {
          notificationStore.show('Nội dung trống.', 'error');
          return;
      }

      const processedText = composerService.processComposerTemplate(
          editorContent,
          supermarketReport,
          currentGoals,
          rankingReportData,
          compData,
          context
      );

      navigator.clipboard.writeText(processedText).then(() => {
          notificationStore.show('Đã sao chép nội dung (đã xử lý) vào bộ nhớ tạm!', 'success');
      }).catch(err => {
          console.error(err);
          notificationStore.show('Lỗi khi sao chép.', 'error');
      });
  }

  function close() {
      modalState.update(s => ({ ...s, activeModal: null }));
  }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1100] backdrop-blur-sm" on:click={close} role="button" tabindex="0">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col h-[90vh]" on:click|stopPropagation>
            
            <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <div>
                    <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <i data-feather="pen-tool" class="w-5 h-5 text-indigo-600"></i>
                        Trình tạo Nhận xét - {CONFIG[context]?.label}
                    </h3>
                </div>
                <button class="text-gray-400 hover:text-red-500" on:click={close}>
                    <i data-feather="x" class="w-6 h-6"></i>
                </button>
            </div>

            <div class="flex-grow flex flex-col md:flex-row overflow-hidden">
                
                <div class="flex-1 flex flex-col border-r border-gray-200 p-4">
                    <div class="flex space-x-2 overflow-x-auto mb-3 pb-2 border-b border-gray-100">
                        {#each CONFIG[context]?.subTabs || [] as tab}
                            <button 
                                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap
                                       {activeSubTabId === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                                on:click={() => switchSubTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        {/each}
                    </div>

                    <textarea 
                        bind:this={textareaEl}
                        bind:value={editorContent}
                        class="flex-grow w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-mono text-sm leading-relaxed"
                        placeholder="Soạn thảo nội dung tại đây... Sử dụng các thẻ bên phải để chèn dữ liệu tự động."
                    ></textarea>

                    <div class="mt-4 flex justify-between items-center">
                        <button on:click={handleSave} class="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 text-sm">
                            <i data-feather="save" class="w-4 h-4"></i> Lưu mẫu này
                        </button>
                        <button on:click={handlePreviewAndCopy} class="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md">
                            <i data-feather="copy" class="w-4 h-4"></i> Xử lý & Sao chép
                        </button>
                    </div>
                </div>

                <div class="w-full md:w-80 bg-slate-50 flex flex-col border-l border-gray-200">
                    <div class="flex border-b border-gray-200 bg-white">
                        {#each ['general', 'kpi', 'ranking', 'details'] as tab}
                            <button 
                                class="flex-1 py-3 text-xs font-bold uppercase tracking-wide text-center hover:bg-slate-50 transition-colors border-b-2 
                                       {activeTagTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}"
                                on:click={() => activeTagTab = tab}
                            >
                                {tab}
                            </button>
                        {/each}
                    </div>

                    <div class="flex-grow overflow-y-auto p-4 custom-scrollbar">
                        
                        {#if activeTagTab === 'general'}
                            <div class="space-y-4">
                                <div>
                                    <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Chung</h5>
                                    <div class="flex flex-wrap gap-2">
                                        <button class="tag-btn" on:click={() => insertTag('[NGAY]')}>Ngày</button>
                                        <button class="tag-btn" on:click={() => insertTag('[GIO]')}>Giờ</button>
                                    </div>
                                </div>
                                <div>
                                    <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Biểu tượng</h5>
                                    <div class="grid grid-cols-5 gap-2">
                                        {#each ['📊','💰','💥','🎯','📈','📦','⚠️','🔥','✅','🚀'] as icon}
                                            <button class="icon-btn" on:click={() => insertTag(icon)}>{icon}</button>
                                        {/each}
                                    </div>
                                </div>
                            </div>

                        {:else if activeTagTab === 'kpi'}
                            <div class="space-y-4">
                                <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">KPIs Chính</h5>
                                <div class="flex flex-col gap-2">
                                    <button class="tag-btn w-full text-left" on:click={() => insertTag('[DT_THUC]')}>Doanh thu Thực</button>
                                    <button class="tag-btn w-full text-left" on:click={() => insertTag('[DTQD]')}>Doanh thu Quy đổi</button>
                                    <button class="tag-btn w-full text-left" on:click={() => insertTag('[%HT_DTT]')}>% HT DT Thực</button>
                                    <button class="tag-btn w-full text-left" on:click={() => insertTag('[%HT_DTQD]')}>% HT DT QĐ</button>
                                    <button class="tag-btn w-full text-left" on:click={() => insertTag('[TLQD]')}>Tỷ lệ Quy đổi</button>
                                    <button class="tag-btn w-full text-left" on:click={() => insertTag('[DT_CHUAXUAT]')}>DT Chưa xuất</button>
                                    <button class="tag-btn w-full text-left" on:click={() => insertTag('[SS_CUNGKY]')}>So sánh Cùng kỳ</button>
                                </div>
                            </div>

                        {:else if activeTagTab === 'ranking'}
                            <div class="space-y-4">
                                <div>
                                    <label for="composer-dept" class="text-xs font-bold text-gray-500 uppercase mb-1 block">Lọc Bộ phận:</label>
                                    <select id="composer-dept" class="w-full p-2 text-sm border rounded bg-white" bind:value={rankingDept}>
                                        <option value="ALL">Toàn siêu thị</option>
                                        {#each uniqueDepartments as dept}
                                            <option value={dept}>{dept}</option>
                                        {/each}
                                    </select>
                                </div>
                                
                                <div>
                                    <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Xếp hạng (Top/Bot 3)</h5>
                                    <div class="grid grid-cols-2 gap-2">
                                        <button class="tag-btn" on:click={() => insertTag('[TOP3_DTQD_{dept}@msnv]', true)}>Top 3 DTQĐ</button>
                                        <button class="tag-btn" on:click={() => insertTag('[BOT3_DTQD_{dept}@msnv]', true)}>Bot 3 DTQĐ</button>
                                        <button class="tag-btn" on:click={() => insertTag('[TOP3_THUNHAP_{dept}@msnv]', true)}>Top 3 Thu nhập</button>
                                        <button class="tag-btn" on:click={() => insertTag('[BOT3_THUNHAP_{dept}@msnv]', true)}>Bot 3 Thu nhập</button>
                                        <button class="tag-btn" on:click={() => insertTag('[TOP3_TLQD_{dept}@msnv]', true)}>Top 3 %QĐ</button>
                                        <button class="tag-btn" on:click={() => insertTag('[BOT3_TLQD_{dept}@msnv]', true)}>Bot 3 %QĐ</button>
                                    </div>
                                </div>

                                <div>
                                    <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Dưới Mục tiêu (List)</h5>
                                    <div class="flex flex-wrap gap-2">
                                        <button class="tag-btn" on:click={() => insertTag('[BOT_TARGET_TLQD_{dept}@msnv]', true)}>% Quy đổi</button>
                                        <button class="tag-btn" on:click={() => insertTag('[BOT_TARGET_TLTC_{dept}@msnv]', true)}>% Trả chậm</button>
                                        <button class="tag-btn" on:click={() => insertTag('[BOT_TARGET_PK_{dept}@msnv]', true)}>% Phụ kiện</button>
                                        <button class="tag-btn" on:click={() => insertTag('[BOT_TARGET_GD_{dept}@msnv]', true)}>% Gia dụng</button>
                                    </div>
                                </div>
                            </div>

                        {:else if activeTagTab === 'details'}
                            <div class="space-y-4">
                                <div>
                                    <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Thi đua (Lũy kế)</h5>
                                    <div class="grid grid-cols-2 gap-2">
                                        <button class="tag-btn" on:click={() => insertTag('[TD_TONG_CT]')}>Tổng CT</button>
                                        <button class="tag-btn" on:click={() => insertTag('[TD_CT_DAT]')}>Số đạt</button>
                                        <button class="tag-btn" on:click={() => insertTag('[TD_CT_CHUADAT]')}>Số chưa đạt</button>
                                        <button class="tag-btn" on:click={() => insertTag('[TD_TYLE_DAT]')}>% Đạt</button>
                                    </div>
                                </div>

                                <div>
                                    <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Nhóm QĐC (Có số)</h5>
                                    <button class="tag-btn w-full mb-2 text-indigo-700 bg-indigo-50" on:click={() => insertTag('[TOP_QDC_INFO]')}>
                                        Chèn Top QĐC (SL & TB/Ngày)
                                    </button>
                                    <div class="flex flex-wrap gap-2">
                                        {#if supermarketReport.qdc}
                                            {#each Object.values(supermarketReport.qdc).filter(i=>i.sl>0).sort((a,b)=>b.dtqd-a.dtqd) as item}
                                                <button class="tag-btn text-xs" on:click={() => insertTag(`[QDC_INFO_${item.name}]`)}>{item.name}</button>
                                            {/each}
                                        {/if}
                                    </div>
                                </div>

                                <div>
                                    <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">Ngành hàng (Có số)</h5>
                                    <button class="tag-btn w-full mb-2 text-indigo-700 bg-indigo-50" on:click={() => insertTag('[TOP_NGANHHANG_SL]')}>
                                        Chèn Top SL Ngành hàng
                                    </button>
                                    <div class="flex flex-wrap gap-2">
                                        {#if supermarketReport.nganhHangChiTiet}
                                            {#each Object.values(supermarketReport.nganhHangChiTiet).filter(i=>i.quantity>0).sort((a,b)=>b.revenue-a.revenue).slice(0, 10) as item}
                                                <button class="tag-btn text-xs" on:click={() => insertTag(`[NH_INFO_${cleanCategoryName(item.name)}]`)}>{cleanCategoryName(item.name)}</button>
                                            {/each}
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .tag-btn {
        background-color: #eef2ff;
        color: #4338ca;
        border: 1px solid #c7d2fe;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
        transition: all 0.2s;
    }
    .tag-btn:hover {
        background-color: #e0e7ff;
        border-color: #818cf8;
    }
    .icon-btn {
        background-color: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        padding: 0.5rem;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    .icon-btn:hover {
        background-color: #f9fafb;
        border-color: #d1d5db;
        transform: scale(1.1);
    }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
</style>