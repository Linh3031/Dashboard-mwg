<script>
  import { onMount, tick } from 'svelte';
  // [SỬA LỖI]: Dùng ../../../ thay vì ../../../../
  import { 
    modalState, composerTemplates, realtimeYCXData, ycxData, 
    selectedWarehouse, competitionData, notificationStore 
  } from '../../../stores.js'; 
  
  // [SỬA LỖI]: Dùng ../../../ cho services
  import { composerService } from '../../../services/composerService.js';
  import { reportService } from '../../../services/reportService.js';
  import { settingsService } from '../../../services/settings.service.js';
  
  import ComposerEditor from './ComposerEditor.svelte';
  import ComposerSidebar from './ComposerSidebar.svelte';

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

  $: isOpen = $modalState.activeModal === 'composer-modal';
  $: context = $modalState.context || 'luyke';
  
  let activeSubTabId = '';
  let editorContent = '';
  let saveStatus = '';
  let isLoading = false; 
  
  let supermarketReport = {};
  let rankingReportData = [];
  let compData = [];
  let currentGoals = {};

  let editorComponent;

  // --- LOGIC ANTI-FREEZE ---
  $: if (isOpen && context) {
      isLoading = true; 
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
      saveStatus = '';

      await tick(); 
      setTimeout(async () => {
          try {
              await calculateReportData();
          } catch (e) {
              console.error("Lỗi tính toán báo cáo:", e);
              notificationStore.show('Lỗi tải dữ liệu báo cáo', 'error');
          } finally {
              isLoading = false; 
          }
      }, 50);
  }

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
      rankingReportData = warehouse ? masterReport.filter(nv => nv.maKho == warehouse) : masterReport;
      supermarketReport = reportService.aggregateReport(rankingReportData, warehouse);
      compData = (context === 'luyke' || context === 'sknv') ? $competitionData : [];
  }

  function updateTemplateStore() {
      composerTemplates.update(s => {
          if (!s[context]) s[context] = {};
          s[context][activeSubTabId] = editorContent;
          if (typeof localStorage !== 'undefined') {
             localStorage.setItem('composerTemplates', JSON.stringify(s));
          }
          return s;
      });
  }

  function handleSwitchSubTab(event) {
      updateTemplateStore();
      const newTabId = event.detail;
      activeSubTabId = newTabId;
      editorContent = $composerTemplates[context]?.[newTabId] || '';
      saveStatus = '';
  }

  function handleSave() {
      updateTemplateStore();
      const now = new Date();
      saveStatus = `Đã lưu lúc ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function handleRequestPreview(event) {
      const { content, callback } = event.detail;
      const processedText = composerService.processComposerTemplate(
          content, supermarketReport, currentGoals, rankingReportData, compData, context
      );
      if (callback) callback(processedText);
  }

  function handleInsertTag(event) {
      const tag = event.detail;
      if (editorComponent) {
          editorComponent.insertText(tag);
      }
  }

  function close() {
      modalState.update(s => ({ ...s, activeModal: null }));
  }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1100] backdrop-blur-sm" on:click={close} role="button" tabindex="0">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col h-[90vh]" on:click|stopPropagation>
            
            <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
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

            <div class="flex-grow flex flex-col md:flex-row overflow-hidden relative">
                
                {#if isLoading}
                    <div class="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
                        <span class="text-sm font-medium text-indigo-700 animate-pulse">Đang xử lý dữ liệu báo cáo...</span>
                    </div>
                {/if}

                <ComposerEditor 
                    bind:this={editorComponent}
                    bind:editorContent
                    subTabs={CONFIG[context]?.subTabs || []}
                    {activeSubTabId}
                    {saveStatus}
                    on:changeSubTab={handleSwitchSubTab}
                    on:save={handleSave}
                    on:requestPreview={handleRequestPreview}
                />

                <ComposerSidebar 
                    {supermarketReport}
                    on:insertTag={handleInsertTag}
                />
            </div>
        </div>
    </div>
{/if}