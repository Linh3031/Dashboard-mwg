import { get } from 'svelte/store';
import { viewingDetailFor, notificationStore } from '../stores.js';
import { captureService } from './capture.service.js';
import { excelService } from './excel.service.js';

export const actionService = {
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
            console.error(`[ActionService] Invalid sectionId: ${sectionId}`);
            return null;
        }

        const navEl = document.getElementById(navId);
        if (!navEl) {
            console.error(`[ActionService] Nav element not found: ${navId}`);
            return null;
        }

        const activeBtn = navEl.querySelector('.sub-tab-btn.active'); 
        
        if (!activeBtn) {
            console.warn(`[ActionService] No active button found in ${navId}`);
            return null;
        }

        return {
            button: activeBtn,
            targetId: activeBtn.dataset.target,
            title: activeBtn.dataset.title || 'BaoCao',
            contentContainerId: contentContainerId
        };
    },

    handleCapture(sectionId) {
        // [FIX] Thêm log để debug
        console.log(`[ActionService] Trigger capture for: ${sectionId}`);
        
        const tabInfo = this._getActiveTabInfo(sectionId);
        if (!tabInfo) {
            alert('Lỗi: Không xác định được tab hiện tại. Vui lòng tải lại trang.');
            return;
        }

        const $viewingDetailFor = get(viewingDetailFor);
        
        // --- LOGIC CHỤP CHI TIẾT (Detail View) ---
        if (sectionId === 'sknv' && $viewingDetailFor) {
            const { employeeId, sourceTab } = $viewingDetailFor;
            const activeTabTarget = tabInfo.targetId;

            let elementToCapture = null;
            let title = '';
            const preset = 'preset-mobile-portrait';

            if (sourceTab === 'sknv' && activeTabTarget === 'subtab-sknv') {
                 elementToCapture = document.getElementById('sknv-detail-capture-area');
                title = `SKNV_ChiTiet_${employeeId}`;
            } else if (sourceTab === 'dtnv-lk' && activeTabTarget === 'subtab-doanhthu-lk') {
                elementToCapture = document.getElementById('dtnv-lk-capture-area');
                title = `DTLK_ChiTiet_${employeeId}`;
            } else if (sourceTab === 'sknv-thidua-pasted' && activeTabTarget === 'subtab-hieu-qua-thi-dua-lk') {
                elementToCapture = document.getElementById('sknv-thidua-detail-capture-area');
                title = `ThiDuaLK_ChiTiet_${employeeId}`;
            } else if (sourceTab === 'dtnv-rt' && activeTabTarget === 'subtab-realtime-nhan-vien') {
                 elementToCapture = document.getElementById('dtnv-rt-capture-area');
                 title = `DTRT_ChiTiet_${employeeId}`;
            }

            if (elementToCapture) {
                if (elementToCapture.children.length === 0) {
                   alert('Không có nội dung chi tiết để chụp.');
                    return;
                }
                captureService.captureAndDownload(elementToCapture, title, preset);
                return;
            }
        }

        // --- LOGIC CHỤP TỔNG QUÁT (Summary View) ---
        let elementToCapture;
        
        // Xử lý đặc biệt cho tab Thi đua vùng (nơi dùng infographic riêng)
        if (sectionId === 'luyke' && tabInfo.targetId === 'subtab-luyke-thidua-vung') {
            elementToCapture = document.getElementById('thidua-vung-infographic-container');
        } 
        // Xử lý đặc biệt cho Thi đua Lũy kế (View Chương trình vs Nhân viên)
        else if (sectionId === 'luyke' && tabInfo.targetId === 'subtab-luyke-thi-dua') {
             elementToCapture = document.getElementById('luyke-competition-content');
        }
        else if (sectionId === 'sknv' && tabInfo.targetId === 'subtab-thidua') {
             const activeViewBtn = document.querySelector('#sknv-thidua-view-selector .view-switcher__btn.active');
             const viewType = activeViewBtn ? activeViewBtn.dataset.view : 'program';
             if (viewType === 'program') {
                 elementToCapture = document.getElementById('competition-report-container-lk');
             } else { 
                 elementToCapture = document.getElementById('pasted-competition-report-container');
             }
        }
        else {
            // Mặc định: Tìm content div đang hiển thị
            elementToCapture = document.querySelector(`#${tabInfo.contentContainerId} .sub-tab-content:not(.hidden)`);
        }

        if (!elementToCapture || elementToCapture.children.length === 0) {
            console.error('Capture target is empty or null', elementToCapture);
            alert('Lỗi: Không tìm thấy nội dung để chụp trong tab này.');
            return;
        }

        captureService.captureDashboardInParts(elementToCapture, tabInfo.title);
    },

    handleExport(sectionId) {
        const tabInfo = this._getActiveTabInfo(sectionId);
        if (!tabInfo) {
            alert('Lỗi: Không tìm thấy tab đang hoạt động.');
            return;
        }

        let activeTabContent;

        if (sectionId === 'sknv' && tabInfo.targetId === 'subtab-thidua') {
            const activeViewBtn = document.querySelector('#sknv-thidua-view-selector .view-switcher__btn.active');
            const viewType = activeViewBtn ? activeViewBtn.dataset.view : 'program';

            if (viewType === 'program') {
                activeTabContent = document.getElementById('competition-report-container-lk');
            } else { 
                activeTabContent = document.getElementById('pasted-competition-report-container');
            }
        } 
        else {
            activeTabContent = document.querySelector(`#${tabInfo.contentContainerId} .sub-tab-content:not(.hidden)`);
        }

        if (activeTabContent) {
            const timestamp = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
            excelService.exportTableToExcel(activeTabContent, `${tabInfo.title}_${timestamp}`);
        } else {
             alert('Không tìm thấy nội dung để xuất Excel.');
        }
    }
};