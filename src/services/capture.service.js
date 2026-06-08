// File: src/services/capture.service.js
/* global Chart */
import { notificationStore, currentUser } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';

import { injectCaptureStyles } from './capture/engine.js';
import { getProcessor, SPLIT_GROUPS } from './capture/registry.js';
import { processDefault } from './capture/processors/default.js';

// --- [FIX GENESIS V4]: CÔ LẬP, CO GIÃN THÔNG MINH & XÓA VẠCH TRẮNG ---
const _injectCaptureFixes = () => {
    const styleId = 'genesis-capture-fixes';
    document.getElementById(styleId)?.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* 1. Trị bệnh cắt nội dung (Mất 80% phần dưới) */
        body .capture-container .luyke-tier-1-grid,
        body .capture-container .luyke-widget,
        body .capture-container .luyke-widget-body,
        body .capture-container .capture-layout-container {
            display: block !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
        }

        /* 2. Ép Mobile cho các khối chỉ định */
        body .capture-container .preset-mobile-portrait,
        body .capture-container.preset-mobile-portrait {
            transform: none !important; 
            width: 480px !important;
            min-width: 480px !important;
            max-width: 480px !important;
        }
        body .capture-container .luyke-tier-1-grid {
            width: 480px !important;
            min-width: 480px !important;
            max-width: 480px !important;
            margin: 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 16px !important;
        }

        /* 3. Tắt thuộc tính sticky */
        body .capture-container .sticky {
            position: static !important;
        }

        /* 4. CHỐNG THỪA KHOẢNG TRỐNG & XÓA VẠCH TRẮNG 2 BÊN RÌA */
        /* Lột bỏ viền, bóng và nền trắng của cái vỏ Wrapper bên ngoài */
        body .capture-container [data-capture-group="revenue-table"],
        body .capture-container [data-capture-group="revenue-table"] > div,
        body .capture-container [data-capture-group="pasted-competition"],
        body .capture-container [data-capture-group="pasted-competition"] > div,
        body .capture-container [data-capture-group="revenue-detail-mobile"],
        body .capture-container [data-capture-group="revenue-detail-mobile"] > div {
            width: fit-content !important;
            min-width: fit-content !important;
            max-width: fit-content !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            background-color: transparent !important; /* Khóa vạch trắng lộ ra do nền */
            border-radius: 0 !important;
        }
        
        /* Bơm nền trắng thẳng vào Table để ôm sát nút */
        body .capture-container [data-capture-group="revenue-table"] table,
        body .capture-container [data-capture-group="pasted-competition"] table,
        body .capture-container [data-capture-group="revenue-detail-mobile"] table {
            width: max-content !important;
            min-width: max-content !important;
            max-width: max-content !important;
            table-layout: auto !important;
            background-color: #ffffff !important;
        }

        /* 5. CÔ LẬP HOÀN TOÀN: Khóa cột Hạng 45px không vạ lây (Dành cho bảng cũ) */
        body .capture-container [data-capture-group="revenue-table"] table th:first-child,
        body .capture-container [data-capture-group="revenue-table"] table td:first-child,
        body .capture-container [data-capture-group="pasted-competition"] table th:first-child,
        body .capture-container [data-capture-group="pasted-competition"] table td:first-child {
            width: 45px !important;
            min-width: 45px !important;
            max-width: 45px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }

        /* 6. CÔ LẬP DÀNH RIÊNG CHO BẢNG REALTIME: Khóa cột Hạng 50px */
        body .capture-container [data-capture-group="revenue-detail-mobile"] table th:first-child,
        body .capture-container [data-capture-group="revenue-detail-mobile"] table td:first-child {
            width: 50px !important;
            min-width: 50px !important;
            max-width: 50px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
    `;
    document.head.appendChild(style);
    return style;
};

export const captureService = {
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        
        const styleElement = injectCaptureStyles();
        const fixElement = _injectCaptureFixes(); 
        
        try {
            await processDefault([elementToCapture], title, { presetClass: presetClass });
        } catch (error) {
            console.error('Capture Single Error:', error);
            alert('Lỗi khi chụp ảnh: ' + error.message);
        } finally {
            styleElement.remove();
            fixElement.remove(); 
        }
    },
    
    async captureDashboardInParts(contentContainer, baseTitle) {
       if (!contentContainer) return alert('Lỗi: Không tìm thấy nội dung để chụp.');
        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        notificationStore.update(s => ({ ...s, visible: true, type: 'info', message: `Đang xử lý ảnh: ${baseTitle}...` }));

        const captureGroups = new Map();
        contentContainer.querySelectorAll('[data-capture-group]').forEach(el => {
            if (el.offsetParent !== null) {
                const group = el.dataset.captureGroup;
                if (!captureGroups.has(group)) captureGroups.set(group, []);
                captureGroups.get(group).push(el);
            }
        });

        const styleElement = injectCaptureStyles();
        const fixElement = _injectCaptureFixes();
        
        if (typeof Chart !== 'undefined') Chart.defaults.animation = false;
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            if (captureGroups.size === 0) {
                if (contentContainer.offsetParent !== null) await processDefault([contentContainer], baseTitle);
                return;
            }
            for (const [group, elements] of captureGroups.entries()) {
                if (SPLIT_GROUPS.includes(group)) {
                    for (const el of elements) {
                        let customName = el.dataset.captureFilename;
                        let subTitle = customName || el.querySelector('h3, h4')?.textContent?.trim() || baseTitle;
                        await processDefault([el], subTitle);
                        await new Promise(r => setTimeout(r, 300));
                    }
                    continue; 
                }
                const processor = getProcessor(group);
                if (processor) {
                    await processor(elements, baseTitle);
                } else {
                    for (const el of elements) {
                         let customName = el.dataset.captureFilename;
                         let subTitle = customName || baseTitle;
                         await processDefault([el], subTitle);
                         await new Promise(r => setTimeout(r, 300));
                    }
                }
            }
        } finally {
            styleElement.remove();
            fixElement.remove();
            if (typeof Chart !== 'undefined') Chart.defaults.animation = {};
        }
        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: 'Hoàn tất quá trình chụp!' }));
        setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
    },

    getPreviewElements(contentContainer, baseTitle) {
        if (!contentContainer) return [];

        const captureGroups = new Map();
        contentContainer.querySelectorAll('[data-capture-group]').forEach(el => {
            if (el.offsetParent !== null) {
                const group = el.dataset.captureGroup;
                if (!captureGroups.has(group)) captureGroups.set(group, []);
                captureGroups.get(group).push(el);
            }
        });

        let previewItems = [];
        if (captureGroups.size === 0) {
            previewItems.push({ title: baseTitle, elements: [contentContainer] });
        }

        for (const [group, elements] of captureGroups.entries()) {
            if (SPLIT_GROUPS.includes(group)) {
                 for (const el of elements) {
                    let customName = el.dataset.captureFilename;
                    let subTitle = customName || el.querySelector('h3, h4')?.textContent?.trim() || baseTitle;
                    previewItems.push({ title: subTitle, elements: [el] });
                 }
                 continue;
            }
            
            const processor = getProcessor(group);
            if (processor) {
                previewItems.push({ title: baseTitle, elements: elements });
            } else {
                 for (const el of elements) {
                    let customName = el.dataset.captureFilename;
                    let subTitle = customName || baseTitle;
                    previewItems.push({ title: subTitle, elements: [el] });
                 }
            }
        }
        return previewItems;
    },

    async captureSelectedItems(contentContainer, baseTitle, selectedIndices) {
        if (!contentContainer || !selectedIndices || selectedIndices.length === 0) return;

        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);

        const captureGroups = new Map();
        contentContainer.querySelectorAll('[data-capture-group]').forEach(el => {
            if (el.offsetParent !== null) {
                const group = el.dataset.captureGroup;
                if (!captureGroups.has(group)) captureGroups.set(group, []);
                captureGroups.get(group).push(el);
            }
        });

        const styleElement = injectCaptureStyles();
        const fixElement = _injectCaptureFixes();
        
        if (typeof Chart !== 'undefined') Chart.defaults.animation = false;
        await new Promise(resolve => setTimeout(resolve, 100));

        let currentIndex = 0;

        try {
            if (captureGroups.size === 0) {
                 if (selectedIndices.includes(currentIndex)) {
                     await processDefault([contentContainer], baseTitle);
                 }
                 currentIndex++;
            }

            for (const [group, elements] of captureGroups.entries()) {
                if (SPLIT_GROUPS.includes(group)) {
                     for (const el of elements) {
                        if (selectedIndices.includes(currentIndex)) {
                            let customName = el.dataset.captureFilename;
                            let subTitle = customName || el.querySelector('h3, h4')?.textContent?.trim() || baseTitle;
                            await processDefault([el], subTitle);
                            await new Promise(r => setTimeout(r, 400));
                        }
                        currentIndex++;
                     }
                     continue;
                }
                
                const processor = getProcessor(group);
                if (processor) {
                    if (selectedIndices.includes(currentIndex)) {
                        await processor(elements, baseTitle);
                        await new Promise(r => setTimeout(r, 400));
                    }
                    currentIndex++;
                } else {
                     for (const el of elements) {
                        if (selectedIndices.includes(currentIndex)) {
                            let customName = el.dataset.captureFilename;
                            let subTitle = customName || baseTitle;
                            await processDefault([el], subTitle);
                            await new Promise(r => setTimeout(r, 400));
                        }
                        currentIndex++;
                     }
                }
            }
        } catch (e) {
            console.error('Capture Selected Error:', e);
            throw e; 
        } finally {
            styleElement.remove();
            fixElement.remove();
            if (typeof Chart !== 'undefined') Chart.defaults.animation = {};
        }

        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: `Đã lưu thành công ${selectedIndices.length} ảnh!` }));
    }
};