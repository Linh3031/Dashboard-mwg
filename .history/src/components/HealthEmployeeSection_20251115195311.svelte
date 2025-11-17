<script>
  import { afterUpdate } from 'svelte';
  
  export let activeTab;

  $: if (activeTab === 'health-employee-section') {
    Promise.resolve().then(() => {
      // SỬA LỖI: Thêm 'window.'
      if (typeof window.feather !== 'undefined') {
        window.feather.replace();
      }
    });
  }
</script>

<section id="health-employee-section" class="page-section {activeTab === 'health-employee-section' ? '' : 'hidden'}"> 
    <div id="health-employee-section-placeholder" class="placeholder-message hidden">Vui lòng cập nhật danh sách nhân viên để xem kết quả.</div> 
    <div id="health-employee-section-content"> 
        <div class="content-card"> 
            <div class="page-header border-b pb-4 mb-6"> 
                <h2 class="page-header__title">Sức khỏe nhân viên</h2> 
                <button class="page-header__help-btn" data-help-id="sknv" title="Xem hướng dẫn"> 
                    <i data-feather="help-circle"></i> 
                </button> 
            </div>
            <button class="toggle-filters-btn" data-target="sknv-filter-container"> 
                <span class="text">Hiện bộ lọc nâng cao</span> 
                <i data-feather="chevron-down" class="icon"></i> 
            </button> 
            <div id="sknv-filter-container" class="advanced-filters hidden"> 
                <div id="sknv-filter-bar" class="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4"> 
                    </div>
            </div> 
        </div>

        <div class="content-card"> 
            <div class="flex justify-between items-center mb-8">
                <nav id="employee-subtabs-nav" class="border-b border-gray-200 -mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs" data-content-container="employee-subtabs-content"> 
                    <button class="sub-tab-btn active whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-sknv" data-title="SKNV"> 
                        <i data-feather="users"></i> 
                        <span>SKNV</span> 
                    </button> 
                    <button class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-doanhthu-lk" data-title="DoanhThuLK"> 
                        <i data-feather="dollar-sign"></i> 
                        <span>Doanh thu LK</span> 
                    </button> 
                    <button class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-thunhap" data-title="ThuNhap"> 
                        <i data-feather="briefcase"></i> 
                        <span>Thu nhập</span> 
                    </button>
                    <button class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-hieu-qua-khai-thac-luy-ke" data-title="HieuQuaKhaiThacLuyKe"> 
                        <i data-feather="bar-chart-2"></i> 
                        <span>Hiệu quả NV LK</span>
                    </button> 
                    <button class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-doanhthu-nganhhang" data-title="DTNganhHang"> 
                        <i data-feather="layers"></i> 
                        <span>DT ngành hàng</span> 
                    </button> 
                    <button class="sub-tab-btn whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" data-target="subtab-hieu-qua-thi-dua-lk" data-title="HieuQuaThiDuaLK"> 
                        <i data-feather="award"></i> 
                        <span>Thi đua NV LK</span> 
                    </button>
                </nav> 
                <div class="flex items-center gap-x-2"> 
                    <button id="compose-sknv-notification-btn" class="action-btn action-btn--composer" title="Nhận xét"> 
                        <i data-feather="pen-tool"></i> 
                        <span>Nhận xét</span> 
                    </button>
                    <button id="export-sknv-btn" class="action-btn action-btn--export" title="Xuất Excel tab hiện tại"> 
                        <i data-feather="download"></i> 
                        <span>Xuất Excel</span> 
                    </button>
                    <button id="capture-sknv-btn" class="action-btn action-btn--capture" title="Chụp ảnh tab hiện tại"> 
                        <i data-feather="camera"></i> 
                        <span>Chụp màn hình</span> 
                    </button> 
                </div>
            </div>

            <div id="employee-subtabs-content"> 
                <div id="subtab-sknv" class="sub-tab-content">
                    <p>Đang tải nội dung SKNV...</p>
                </div>
                <div id="subtab-doanhthu-lk" class="sub-tab-content hidden space-y-6">
                    <p>Đang tải nội dung Doanh thu LK...</p>
                </div>
            </div>
        </div>
    </div>
</section>