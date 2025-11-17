<script>
  import { afterUpdate } from 'svelte';
  
  export let activeTab;

  $: if (activeTab === 'realtime-section') {
    Promise.resolve().then(() => {
      // SỬA LỖI: Thêm 'window.'
      if (typeof window.feather !== 'undefined') {
        window.feather.replace();
      }
    });
  }
</script>

<section id="realtime-section" class="page-section {activeTab === 'realtime-section' ? '' : 'hidden'}">
    <div id="realtime-section-placeholder" class="placeholder-message hidden">Vui lòng cập nhật danh sách nhân viên để xem kết quả.</div> 
    <div id="realtime-section-content"> 
        <div class="content-card"> 
            <div class="page-header border-b pb-4 mb-6"> 
                <div class="flex items-center gap-x-3"> 
                    <h2 class="page-header__title">Phân Tích Doanh Thu Realtime</h2> 
                    <button class="page-header__help-btn" data-help-id="realtime" title="Xem hướng dẫn"> 
                        <i data-feather="help-circle"></i> 
                    </button> 
                </div> 
                <div class="flex-shrink-0 flex items-center gap-x-4 ml-auto"> 
                    <label for="realtime-file-input" class="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap">Thêm file Realtime</label> 
                    <input type="file" id="realtime-file-input" class="hidden" accept=".xlsx, .xls, .csv"> 
                    <a href="https://report.mwgroup.vn/home/dashboard/077" target="_blank" class="text-blue-600 hover:underline whitespace-nowrap text-sm">Lấy file tại đây</a> 
                </div> 
            </div>

            <button class="toggle-filters-btn" data-target="realtime-filter-container"> 
                <span class="text">Hiện bộ lọc nâng cao</span> 
                <i data-feather="chevron-down" class="icon"></i> 
            </button>
            <div id="realtime-filter-container" class="advanced-filters hidden"> 
                </div>
        </div>

        <div class="flex justify-between items-center mb-8"> 
            <nav id="realtime-subtabs-nav" class="border-b border-gray-200 -mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs" data-content-container="realtime-subtabs-content"> 
                <button class="sub-tab-btn active whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-realtime-sieu-thi" data-title="SieuThiRealtime"> 
                    <i data-feather="zap"></i> 
                    <span>Siêu thị Realtime</span> 
                </button> 
                <button class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-realtime-nhan-vien" data-title="DTNVRealtime"> 
                    <i data-feather="pie-chart"></i> 
                    <span>DT NV Realtime</span> 
                </button> 
                </nav>

            <div class="flex items-center gap-x-2"> 
                <button id="compose-realtime-notification-btn" class="action-btn action-btn--composer" title="Nhận xét"> 
                    <i data-feather="pen-tool"></i> 
                    <span>Nhận xét</span> 
                </button> 
                <button id="export-realtime-btn" class="action-btn action-btn--export" title="Xuất Excel tab hiện tại"> 
                    <i data-feather="download"></i> 
                    <span>Xuất Excel</span> 
                </button> 
                <button id="capture-realtime-btn" class="action-btn action-btn--capture" title="Chụp ảnh tab hiện tại"> 
                    <i data-feather="camera"></i> 
                    <span>Chụp màn hình</span> 
                </button>
            </div> 
        </div>

        <div id="realtime-subtabs-content"> 
            <div id="subtab-realtime-sieu-thi" class="sub-tab-content space-y-8"> 
                <p>Đang tải nội dung Siêu thị Realtime...</p>
            </div>
            <div id="subtab-realtime-nhan-vien" class="sub-tab-content hidden space-y-4"> 
                <p>Đang tải nội dung DT NV Realtime...</p>
            </div>
        </div> 
    </div>
</section>