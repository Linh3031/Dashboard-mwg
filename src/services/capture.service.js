/* global Chart */
import { notificationStore, currentUser } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';

// Import từ hệ thống Capture mới
import { injectCaptureStyles } from './capture/engine.js';
import { getProcessor, SPLIT_GROUPS } from './capture/registry.js';
import { processDefault } from './capture/processors/default.js';

export const captureService = {
    // 1. Chụp một phần tử đơn lẻ (Dùng cho nút chụp lẻ)
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        
        const styleElement = injectCaptureStyles();
        
        try {
            // Dùng processor mặc định cho chụp lẻ
            await processDefault([elementToCapture], title, { 
                presetClass: presetClass 
            });
        } catch (error) {
            console.error('Capture Single Error:', error);
            alert('Lỗi khi chụp ảnh: ' + error.message);
        } finally {
            styleElement.remove();
        }
    },
    
    // 2. Chụp toàn bộ Dashboard (Nút chụp tổng)
    async captureDashboardInParts(contentContainer, baseTitle) {
       if (!contentContainer) {
            alert('Lỗi: Không tìm thấy nội dung để chụp.');
            return;
        }

        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        notificationStore.update(s => ({ ...s, visible: true, type: 'info', message: `Đang xử lý ảnh: ${baseTitle}...` }));

        // Phân loại các nhóm (Grouping)
        const captureGroups = new Map();
        contentContainer.querySelectorAll('[data-capture-group]').forEach(el => {
            if (el.offsetParent !== null) { // Chỉ lấy element đang hiển thị
                const group = el.dataset.captureGroup;
                if (!captureGroups.has(group)) {
                     captureGroups.set(group, []);
                }
                captureGroups.get(group).push(el);
            }
        });

        const styleElement = injectCaptureStyles();
        if (typeof Chart !== 'undefined') {
            Chart.defaults.animation = false;
        }
        
        // Đợi một chút để style ăn vào DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            if (captureGroups.size === 0) {
                if (contentContainer.offsetParent !== null) {
                    // Nếu không có nhóm nào, chụp toàn bộ container bằng processor mặc định
                    await processDefault([contentContainer], baseTitle);
                } else {
                     alert('Không có nội dung hiển thị để chụp.');
                }
                return;
            }

            // Duyệt qua từng nhóm để xử lý
            for (const [group, elements] of captureGroups.entries()) {
                // TRƯỜNG HỢP 1: Nhóm cần tách lẻ (Split)
                // Ví dụ: Doanh thu ngành hàng (Mỗi bảng 1 ảnh)
                if (SPLIT_GROUPS.includes(group)) {
                    for (const el of elements) {
                        // Lấy tiêu đề con từ thẻ h3/h4 nếu có
                        let subTitle = el.querySelector('h3, h4')?.textContent?.trim() || baseTitle;
                        // Gọi processor mặc định cho từng phần tử
                        await processDefault([el], subTitle);
                        // Delay nhẹ để trình duyệt không bị đơ
                        await new Promise(r => setTimeout(r, 300));
                    }
                    continue; 
                }

                // TRƯỜNG HỢP 2: Nhóm gộp (Merge)
                // Lấy processor tương ứng từ Registry (KPI, Competition, Default...)
                const processor = getProcessor(group);
                if (processor) {
                    await processor(elements, baseTitle);
                }
            }
        } catch (error) {
            console.error('Capture Dashboard Error:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            styleElement.remove();
            if (typeof Chart !== 'undefined') {
                Chart.defaults.animation = {};
            }
        }

        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: 'Hoàn tất quá trình chụp!' }));
        setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
    },

    // 3. Lấy ảnh xem trước (Preview)
    async getPreviewImages(contentContainer, baseTitle) {
        if (!contentContainer) return [];

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
        
        let previewImages = [];
        const options = { isPreview: true, scale: 1 }; 

        try {
            if (captureGroups.size === 0) {
                 const res = await processDefault([contentContainer], baseTitle, options);
                 if (res) previewImages.push(res);
            }

            for (const [group, elements] of captureGroups.entries()) {
                // Xử lý SPLIT cho Preview
                if (SPLIT_GROUPS.includes(group)) {
                     for (const el of elements) {
                        let subTitle = el.querySelector('h3, h4')?.textContent?.trim() || baseTitle;
                        const res = await processDefault([el], subTitle, options);
                        if (res) previewImages.push(res);
                     }
                     continue;
                }
                
                // Xử lý MERGE cho Preview
                const processor = getProcessor(group);
                if (processor) {
                    const result = await processor(elements, baseTitle, options);
                    // Processor có thể trả về 1 object (ảnh gộp) hoặc null
                    if (result) {
                        // Nếu kết quả là mảng (trong trường hợp processor trả về nhiều ảnh), nối vào
                        if (Array.isArray(result)) {
                            previewImages = [...previewImages, ...result];
                        } else {
                            previewImages.push(result);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Preview Error:', e);
        } finally {
            styleElement.remove();
            if (typeof Chart !== 'undefined') Chart.defaults.animation = {};
        }

        return previewImages;
    }
};