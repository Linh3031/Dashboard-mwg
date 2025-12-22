import { get } from 'svelte/store';
import { viewingDetailFor } from '../stores.js'; // [FIX] Bỏ notificationStore
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

        if (!navId || !contentContainerId) return null;

        const navEl = document.getElementById(navId);
        if (!navEl) return null;

        const activeBtn = navEl.querySelector('.sub-tab-btn.active'); 
        if (!activeBtn) return null;

        return {
            button: activeBtn,
            targetId: activeBtn.dataset.target,
            title: activeBtn.dataset.title || 'BaoCao',
            contentContainerId: contentContainerId
        };
    },

    async handleCapture(sectionId) {
        const tabInfo = this._getActiveTabInfo(sectionId);
        if (!tabInfo) {
            alert('Lỗi: Không xác định được tab hiện tại.');
            return;
        }

        // --- 1. ƯU TIÊN: TÌM CÁC BẢNG LẺ ĐỂ CHỤP TÁCH (Cho tab SKNV) ---
        // Tìm các bảng có attribute data-capture-table="true" (đã thêm vào DynamicRevenueTable)
        const revenueTables = document.querySelectorAll('[data-capture-table="true"]');

        if (sectionId === 'sknv' && revenueTables.length > 0) {
            try {
                // [FIX] Không dùng notificationStore để tránh crash
                // Chạy vòng lặp chụp từng bảng
                for (let i = 0; i < revenueTables.length; i++) {
                    const tableContainer = revenueTables[i];
                    
                    // Lấy tiêu đề làm tên file
                    const titleEl = tableContainer.querySelector('h4');
                    const title = titleEl ? titleEl.innerText.trim().replace(/\s+/g, '_') : `Bang_${i+1}`;
                    
                    // 1. CLONE (Tạo bản sao)
                    const clone = tableContainer.cloneNode(true);
                    
                    // 2. STYLE ẨN (Dùng z-index thấp thay vì top âm để tránh lỗi render trắng)
                    Object.assign(clone.style, {
                        position: 'fixed', 
                        top: '0', 
                        left: '0', 
                        zIndex: '-9999', 
                        background: 'white',
                        width: '750px', // Ép chiều rộng Mobile
                        minWidth: '750px', 
                        maxWidth: '750px',
                        height: 'auto', 
                        overflow: 'visible', // Hiện nội dung cuộn
                        visibility: 'visible'
                    });

                    // 3. TỐI ƯU CSS CHO MOBILE
                    const allCells = clone.querySelectorAll('th, td');
                    allCells.forEach(cell => {
                        cell.style.padding = '4px 2px'; 
                        cell.style.fontSize = '11px'; 
                        cell.style.whiteSpace = 'normal';
                        cell.style.wordBreak = 'break-word';
                    });
                    
                    // Bỏ sticky header
                    clone.querySelectorAll('.sticky').forEach(el => el.style.position = 'static');

                    document.body.appendChild(clone);

                    // 4. CHỤP
                    await new Promise(r => setTimeout(r, 200)); // Chờ render
                    await captureService.captureDashboardInParts(clone, title);
                    
                    // Delay nhẹ để tránh trình duyệt chặn download liên tiếp
                    await new Promise(r => setTimeout(r, 500));

                    document.body.removeChild(clone);
                }
            } catch (e) {
                console.error("Lỗi chụp tách bảng:", e);
                alert("Có lỗi khi xử lý hình ảnh (Xem Console).");
            }
            return; // Xong, thoát luôn
        }

        // --- 2. LOGIC CŨ & FALLBACK (Nếu không tìm thấy bảng lẻ) ---
        try {
            const $viewingDetailFor = get(viewingDetailFor);
            let elementToCapture = null;
            let title = tabInfo.title;

            // A. Logic chụp View Chi tiết (Detail)
            if (sectionId === 'sknv' && $viewingDetailFor) {
                 const { employeeId, sourceTab } = $viewingDetailFor;
                 const activeTabTarget = tabInfo.targetId;
                 
                 if (sourceTab === 'sknv' && activeTabTarget === 'subtab-sknv') {
                     elementToCapture = document.getElementById('sknv-detail-capture-area');
                     title = `SKNV_ChiTiet_${employeeId}`;
                 } else if (sourceTab === 'dtnv-lk' && activeTabTarget === 'subtab-doanhthu-lk') {
                     elementToCapture = document.getElementById('dtnv-lk-capture-area');
                     title = `DTLK_ChiTiet_${employeeId}`;
                 } else if (sourceTab === 'dtnv-rt' && activeTabTarget === 'subtab-realtime-nhan-vien') {
                     elementToCapture = document.getElementById('dtnv-rt-capture-area');
                     title = `DTRT_ChiTiet_${employeeId}`;
                 }
            } 
            // B. Các trường hợp View Tổng quát đặc biệt
            else if (sectionId === 'luyke' && tabInfo.targetId === 'subtab-luyke-thidua-vung') {
                elementToCapture = document.getElementById('thidua-vung-infographic-container');
            } else if (sectionId === 'sknv' && tabInfo.targetId === 'subtab-thidua') {
                 const activeViewBtn = document.querySelector('#sknv-thidua-view-selector .view-switcher__btn.active');
                 const viewType = activeViewBtn ? activeViewBtn.dataset.view : 'program';
                 elementToCapture = viewType === 'program' ? 
                    document.getElementById('competition-report-container-lk') : 
                    document.getElementById('pasted-competition-report-container');
            } 
            // C. Mặc định: Tìm content trong container
            else {
                // [FIX] Cải tiến tìm kiếm: Tìm .sub-tab-content HOẶC .tab-pane HOẶC div con trực tiếp
                const container = document.getElementById(tabInfo.contentContainerId);
                if (container) {
                    // Ưu tiên tìm class chuẩn
                    elementToCapture = container.querySelector('.sub-tab-content:not(.hidden)');
                    
                    // Fallback: Nếu không thấy, lấy đại div đầu tiên đang hiển thị (Fix cho trường hợp DT Ngành hàng k có class chuẩn)
                    if (!elementToCapture && sectionId === 'sknv') {
                        elementToCapture = container.firstElementChild; 
                        // Kiểm tra xem có bị hidden không
                        if (elementToCapture && elementToCapture.classList.contains('hidden')) {
                            elementToCapture = null;
                        }
                    }
                }
            }

            if (!elementToCapture || elementToCapture.children.length === 0) {
                console.error("Capture Target Null/Empty:", elementToCapture);
                alert('Không tìm thấy nội dung để chụp.');
                return;
            }

            // Chụp
            await captureService.captureDashboardInParts(elementToCapture, title);

        } catch (error) {
            console.error("Lỗi chụp mặc định:", error);
            alert("Lỗi khi chụp ảnh.");
        }
    },

    handleExport(sectionId) {
        const tabInfo = this._getActiveTabInfo(sectionId);
        if (!tabInfo) return;

        let activeTabContent;
        if (sectionId === 'sknv' && tabInfo.targetId === 'subtab-thidua') {
             const activeViewBtn = document.querySelector('#sknv-thidua-view-selector .view-switcher__btn.active');
             const viewType = activeViewBtn ? activeViewBtn.dataset.view : 'program';
             activeTabContent = viewType === 'program' ? 
                document.getElementById('competition-report-container-lk') : 
                document.getElementById('pasted-competition-report-container');
        } else {
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