// File: src/services/capture.service.js
/* global Chart */
import { notificationStore, currentUser } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';

// Lấy logic chụp ảnh từ cấu trúc hệ thống mới của bạn
import { injectCaptureStyles } from './capture/engine.js';
import { getProcessor, SPLIT_GROUPS } from './capture/registry.js';
import { processDefault } from './capture/processors/default.js';

// --- [FIX GENESIS]: GHI ĐÈ CSS LỖI TỪ ENGINE ---
// Hàm này có nhiệm vụ "Chữa cháy", ghi đè lên các style lỗi từ file engine.js
const _injectCaptureFixes = () => {
    const styleId = 'genesis-capture-fixes';
    document.getElementById(styleId)?.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* 1. Trị bệnh cắt nội dung (Mất 80% phần dưới) */
        /* Ép các widget phải hiển thị đầy đủ chiều cao, tắt thanh cuộn */
        body .capture-container .luyke-tier-1-grid,
        body .capture-container .luyke-widget,
        body .capture-container .luyke-widget-body,
        body .capture-container .capture-layout-container {
            display: block !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
        }

        /* 2. Trị bệnh phình to (Vô hiệu hóa transform scale(5) cũ) */
        body .capture-container .preset-mobile-portrait,
        body .capture-container.preset-mobile-portrait {
            transform: none !important; 
            width: 480px !important;
            min-width: 480px !important;
            max-width: 480px !important;
        }

        /* 3. Ép cứng nhóm Hiệu quả & Top Nhóm hàng (tier1) thành giao diện Mobile dọc */
        body .capture-container .luyke-tier-1-grid {
            width: 480px !important;
            min-width: 480px !important;
            max-width: 480px !important;
            margin: 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 16px !important;
        }
    `;
    document.head.appendChild(style);
    return style;
};

export const captureService = {
    // 1. Chụp lẻ
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        
        const styleElement = injectCaptureStyles();
        const fixElement = _injectCaptureFixes(); // Kích hoạt Fix
        
        try {
            await processDefault([elementToCapture], title, { presetClass: presetClass });
        } catch (error) {
            console.error('Capture Single Error:', error);
            alert('Lỗi khi chụp ảnh: ' + error.message);
        } finally {
            styleElement.remove();
            fixElement.remove(); // Dọn dẹp Fix
        }
    },
    
    // 2. Chụp tổng cũ
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
        const fixElement = _injectCaptureFixes(); // Kích hoạt Fix
        
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
            fixElement.remove(); // Dọn dẹp Fix
            if (typeof Chart !== 'undefined') Chart.defaults.animation = {};
        }
        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: 'Hoàn tất quá trình chụp!' }));
        setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
    },

    // 3. Tách Elements cực nhanh cho việc Clone DOM
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

    // 4. [HÀM ĐÍCH] Chụp nét cao khi người dùng bấm Tải xuống
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
        const fixElement = _injectCaptureFixes(); // Kích hoạt Fix
        
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
            fixElement.remove(); // Dọn dẹp Fix
            if (typeof Chart !== 'undefined') Chart.defaults.animation = {};
        }

        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: `Đã lưu thành công ${selectedIndices.length} ảnh!` }));
    }
};