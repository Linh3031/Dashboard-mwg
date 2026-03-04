/* global Chart */
import { notificationStore, currentUser } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';

import { injectCaptureStyles } from './capture/engine.js';
import { getProcessor, SPLIT_GROUPS } from './capture/registry.js';
import { processDefault } from './capture/processors/default.js';

export const captureService = {
    // 1. Chụp lẻ
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        const styleElement = injectCaptureStyles();
        try {
            await processDefault([elementToCapture], title, { presetClass: presetClass });
        } catch (error) {
            console.error('Capture Single Error:', error);
            alert('Lỗi khi chụp ảnh: ' + error.message);
        } finally {
            styleElement.remove();
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
            if (typeof Chart !== 'undefined') Chart.defaults.animation = {};
        }
        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: 'Hoàn tất quá trình chụp!' }));
        setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
    },

    // 3. [MỚI] Tách Elements cực nhanh cho việc Clone DOM (0.1 giây)
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
            if (typeof Chart !== 'undefined') Chart.defaults.animation = {};
        }

        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: `Đã lưu thành công ${selectedIndices.length} ảnh!` }));
    }
};