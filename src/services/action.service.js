import { get } from 'svelte/store';
import { viewingDetailFor } from '../stores.js';
import { captureService } from './capture.service.js';
import { excelService } from './excel.service.js';

export const actionService = {
    // Helper: Xác định tab đang active và container chứa nội dung
    _getActiveTabInfo(sectionId) {
        const navIdMap = {
            'luyke': 'luyke-subtabs-nav',
            'sknv': 'employee-subtabs-nav',
            'realtime': 'realtime-subtabs-nav'
        };
        const contentIdMap = {
            'luyke': 'luyke-subtabs-content',
            'sknv': 'employee-subtabs-content',
            'realtime': 'realtime-subtabs-content'
        };

        const navId = navIdMap[sectionId];
        const contentContainerId = contentIdMap[sectionId];

        if (!navId || !contentContainerId) {
            console.warn(`[ActionService] Không tìm thấy map ID cho section: ${sectionId}`);
            return null;
        }

        const navEl = document.getElementById(navId);
        if (!navEl) return null;

        const activeBtn = navEl.querySelector('.sub-tab-btn.active'); 
        if (!activeBtn) return null;

        // [SAFETY] Fallback title nếu thiếu
        const title = activeBtn.dataset.title || activeBtn.innerText.replace(/\s/g, '') || 'BaoCao';

        return {
            button: activeBtn,
            targetId: activeBtn.dataset.target,
            title: title,
            contentContainerId: contentContainerId
        };
    },

    // [FIX CRITICAL] Hàm Capture được viết lại để chống treo và xử lý logic view phức tạp
    async handleCapture(sectionId) {
        console.log(`[ActionService] ➤ Bắt đầu chụp ảnh section: ${sectionId}`);
        
        try {
            const tabInfo = this._getActiveTabInfo(sectionId);
            if (!tabInfo) {
                throw new Error('Không xác định được Tab đang mở. Vui lòng tải lại trang.');
            }

            // 1. Logic xác định phần tử cần chụp (Element Resolution)
            const currentDetail = get(viewingDetailFor);
            let elementToCapture = null;
            let title = tabInfo.title;

            if (currentDetail) {
                // Ưu tiên 1: Đang xem chi tiết nhân viên
                console.log('[ActionService] Mode: Detail View');
                elementToCapture = document.getElementById('health-staff-detail-view');
                title = `${tabInfo.title}_ChiTiet_${currentDetail.maNV}`;
            } else {
                // Ưu tiên 2: Xử lý các view đặc biệt (Ví dụ: Tab Thi Đua có view switcher)
                if (sectionId === 'sknv' && tabInfo.targetId === 'subtab-thidua') {
                    const activeViewBtn = document.querySelector('#sknv-thidua-view-selector .view-switcher__btn.active');
                    const viewType = activeViewBtn ? activeViewBtn.dataset.view : 'program';
                    
                    console.log(`[ActionService] Mode: ThiDua View (${viewType})`);
                    
                    if (viewType === 'program') {
                        elementToCapture = document.getElementById('competition-report-container-lk');
                    } else {
                        elementToCapture = document.getElementById('pasted-competition-report-container');
                    }
                } else {
                    // Ưu tiên 3: View mặc định theo tab
                    elementToCapture = document.getElementById(tabInfo.targetId);
                }
            }

            // 2. Validate Element
            if (!elementToCapture) {
                console.error(`[ActionService] Element not found. TargetID: ${tabInfo.targetId}`);
                throw new Error('Không tìm thấy bảng dữ liệu để chụp.');
            }

            // [SAFETY] Kiểm tra kích thước thật (Tránh chụp vùng trắng/ẩn)
            if (elementToCapture.offsetWidth === 0 || elementToCapture.offsetHeight === 0) {
                console.warn('[ActionService] Element kích thước 0x0. Đang bị ẩn?');
                throw new Error('Bảng dữ liệu đang bị ẩn hoặc chưa tải xong.');
            }

            // 3. Thực thi chụp (Safe Call)
            console.log(`[ActionService] Gọi service chụp cho element:`, elementToCapture);
            
            // [DEBUG & FIX] Kiểm tra method nào khả dụng trong captureService
            if (typeof captureService.captureDashboardInParts === 'function') {
                await captureService.captureDashboardInParts(elementToCapture, title);
            } 
            else if (typeof captureService.capture === 'function') {
                // Fallback nếu code cũ dùng .capture
                console.warn('[ActionService] captureDashboardInParts không tồn tại, dùng fallback .capture()');
                await captureService.capture(elementToCapture, title);
            }
            else {
                console.error('[ActionService] Available methods:', Object.keys(captureService));
                throw new Error('Service chụp ảnh lỗi: Không tìm thấy hàm captureDashboardInParts hoặc capture.');
            }
            
            console.log('[ActionService] ➤ Chụp ảnh hoàn tất.');

        } catch (error) {
            console.error('[ActionService] Lỗi chụp ảnh:', error);
            alert('Lỗi: ' + (error.message || 'Không thể chụp ảnh.'));
        } finally {
            // [QUAN TRỌNG] Đảm bảo luôn chạy để UI component tắt loading
            console.log('[ActionService] ➤ Kết thúc luồng Capture.');
            return; // Resolve promise
        }
    },

    // Hàm Export giữ nguyên logic nhưng thêm log safety
    async handleExport(sectionId) {
        console.log(`[ActionService] ➤ Bắt đầu xuất Excel section: ${sectionId}`);
        try {
            const tabInfo = this._getActiveTabInfo(sectionId);
            if (!tabInfo) return;

            let activeTabContent;
            
            // Logic tìm nội dung tương tự capture
            if (sectionId === 'sknv' && tabInfo.targetId === 'subtab-thidua') {
                 const activeViewBtn = document.querySelector('#sknv-thidua-view-selector .view-switcher__btn.active');
                 const viewType = activeViewBtn ? activeViewBtn.dataset.view : 'program';
                 activeTabContent = viewType === 'program' ? 
                    document.getElementById('competition-report-container-lk') : 
                    document.getElementById('pasted-competition-report-container');
            } else {
                // Logic cũ: tìm .sub-tab-content không hidden
                activeTabContent = document.querySelector(`#${tabInfo.contentContainerId} .sub-tab-content:not(.hidden)`);
                // Fallback nếu logic trên không tìm thấy (đôi khi active class nằm ở chỗ khác)
                if (!activeTabContent && tabInfo.targetId) {
                    activeTabContent = document.getElementById(tabInfo.targetId);
                }
            }

            if (activeTabContent) {
                const timestamp = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
                await excelService.exportTableToExcel(activeTabContent, `${tabInfo.title}_${timestamp}`);
            } else {
                 alert('Không tìm thấy nội dung để xuất Excel.');
            }
        } catch (error) {
            console.error('[ActionService] Lỗi xuất Excel:', error);
            alert('Lỗi xuất Excel: ' + error.message);
        }
    }
};