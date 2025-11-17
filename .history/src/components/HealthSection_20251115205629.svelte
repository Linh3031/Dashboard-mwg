<script>
  /* global feather */ // <-- THÊM MỚI (V1.1)
  import { afterUpdate } from 'svelte';
  export let activeTab;

  $: if (activeTab === 'health-section') {
    Promise.resolve().then(() => {
      // SỬA LỖI: Thêm 'window.'
      if (typeof window.feather !== 'undefined') {
        window.feather.replace();
      }
    });
  }
</script>

<section id="health-section" class="page-section {activeTab === 'health-section' ? '' : 'hidden'}">
    <div id="health-section-placeholder" class="placeholder-message hidden">Vui lòng cập nhật danh sách nhân viên để xem kết quả.</div> 
    <div id="health-section-content"> 
        <div class="content-card"> 
            <div class="page-header border-b pb-4 mb-6"> 
                <h2 class="page-header__title">Sức khỏe siêu thị</h2> 
                <button class="page-header__help-btn" data-help-id="luyke" title="Xem hướng dẫn"> 
                    <i data-feather="help-circle"></i> 
                </button> 
            </div> 
            <button class="toggle-filters-btn" data-target="luyke-filter-container"> 
                <span class="text">Hiện bộ lọc nâng cao</span> 
                 <i data-feather="chevron-down" class="icon"></i> 
            </button> 
            <div id="luyke-filter-container" class="advanced-filters hidden"> 
                <div id="luyke-filter-bar" class="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4"> 
                    </div> 
            </div> 
         </div>

        <div class="flex justify-between items-center mb-8"> 
            <nav id="luyke-subtabs-nav" class="border-b border-gray-200 -mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs" data-content-container="luyke-subtabs-content"> 
                <button class="sub-tab-btn active whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-luyke-sieu-thi" data-title="SieuThiLuyKe"> 
                    <i data-feather="home"></i> 
                     <span>Siêu thị Lũy kế</span> 
                </button>
                <button class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-luyke-thi-dua" data-title="ThiDuaLuyKe"> 
                    <i data-feather="award"></i> 
                    <span>Thi đua Lũy kế</span> 
                </button>
                <button class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-luyke-thidua-vung" data-title="ThiDuaVung"> 
                    <i data-feather="map"></i> 
                    <span>Thi Đua Vùng TNB</span> 
                 </button>
            </nav> 
            <div class="flex items-center gap-x-2"> 
                <button id="compose-luyke-notification-btn" class="action-btn action-btn--composer" title="Nhận xét"> 
                    <i data-feather="pen-tool"></i> 
                    <span>Nhận xét</span> 
                </button> 
                <button id="export-luyke-btn" class="action-btn action-btn--export" title="Xuất Excel tab hiện tại"> 
                    <i data-feather="download"></i> 
                    <span>Xuất Excel</span> 
                </button>
                <button id="capture-luyke-btn" class="action-btn action-btn--capture" title="Chụp ảnh tab hiện tại"> 
                    <i data-feather="camera"></i> 
                    <span>Chụp màn hình</span> 
                </button> 
             </div>
        </div>

        <div id="luyke-subtabs-content"> 
            <div id="subtab-luyke-sieu-thi" class="sub-tab-content space-y-8">
                <p>Đang tải nội dung Siêu thị Lũy kế...</p>
            </div>
            <div id="subtab-luyke-thi-dua" class="sub-tab-content hidden space-y-4">
                 <p>Đang tải nội dung Thi đua Lũy kế...</p>
            </div>
            <div id="subtab-luyke-thidua-vung" class="sub-tab-content hidden">
                <p>Đang tải nội dung Thi đua Vùng...</p>
            </div>
        </div>
    </div>
</section>