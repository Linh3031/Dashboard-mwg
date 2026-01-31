/* global Chart */
import { notificationStore, currentUser } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';
// Import từ Config và Strategies
import { SPLIT_GROUPS, KPI_GROUPS } from './capture.config.js';
import { swapCanvasToImage, strategySplit, strategyMerge, strategySingle } from './capture.strategies.js';

// --- HELPER for Screenshot CSS Injection (SERVICE VERSION) ---
// Giữ nguyên phiên bản này vì nó khác phiên bản Strategies (Scale 2 vs Scale 5)
const _injectCaptureStyles = () => {
    const styleId = 'dynamic-capture-styles';
    document.getElementById(styleId)?.remove();

    const styles = `
        /* Container gốc */
        .capture-container { 
            padding: 24px; 
            background-color: #f3f4f6; 
            box-sizing: border-box; 
            width: fit-content; 
            position: absolute;
            left: -9999px;
            top: 0;
            z-index: -1;
        }
        
        /* [UPDATED FIX] Xử lý triệt để lỗi cắt chữ */
        .capture-container th,
        .capture-container td {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            line-height: 1.5 !important;
            height: auto !important;
        }

        .capture-container td > div,
        .capture-container td > span,
        .capture-container td > p,
        .capture-container th > div,
        .capture-container th > span {
            overflow: visible !important;
            padding-bottom: 4px !important;
            line-height: 1.5 !important;
            height: auto !important;
            white-space: normal !important;
        }

        .capture-container h3, 
        .capture-container h4,
        .capture-container .font-bold {
            padding-bottom: 6px !important;
            line-height: 1.5 !important;
            overflow: visible !important;
        }

        .force-desktop-mode {
            min-width: 1600px !important;
            width: fit-content !important;
        }

        .capture-layout-container { 
            display: flex; 
            flex-direction: column; 
            gap: 24px; 
        }
        
        .capture-title { 
            font-size: 28px; 
            font-weight: bold; 
            color: #1e3a8a; 
            margin-bottom: 20px; 
            text-align: center; 
            font-family: 'Segoe UI', sans-serif;
            text-transform: uppercase;
            line-height: 1.5 !important;
            padding-bottom: 10px !important;
        }

        /* Mobile Portrait Preset - Service Version (Scale 2) */
        .preset-mobile-portrait {
            width: 450px !important;
            min-width: 450px !important;
            max-width: 450px !important;
            padding: 10px !important;
            margin: 0 auto;
            transform: scale(2) !important;
        }
        .preset-mobile-portrait .capture-title {
            font-size: 18px !important;
        }
        
        /* KPI Grid Fix */
        .prepare-for-kpi-capture {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    return styleElement;
};

export const captureService = {
    // Hàm chụp thật (Download)
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        // ... Logic này tôi giữ nguyên, thực tế nó sẽ gọi coreCapture trong strategies
        // Để tránh sửa nhiều, ta dùng lại hàm strategySingle
        await strategySingle(elementToCapture, title);
    },
    
    // Hàm chụp toàn bộ Dashboard (Logic gốc)
    async captureDashboardInParts(contentContainer, baseTitle) {
       if (!contentContainer) {
            alert('Lỗi: Không tìm thấy nội dung để chụp.');
            return;
        }

        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        notificationStore.update(s => ({ ...s, visible: true, type: 'info', message: `Đang xử lý ảnh: ${baseTitle}...` }));

        // Gom nhóm các phần tử
        const captureGroups = new Map();
        contentContainer.querySelectorAll('[data-capture-group]').forEach(el => {
            if (el.offsetParent !== null) {
                const group = el.dataset.captureGroup;
                if (!captureGroups.has(group)) {
                     captureGroups.set(group, []);
                }
                captureGroups.get(group).push(el);
            }
        });

        const styleElement = _injectCaptureStyles();
        if (typeof Chart !== 'undefined') {
            Chart.defaults.animation = false;
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Case 1: Không có group
            if (captureGroups.size === 0) {
                if (contentContainer.offsetParent !== null) {
                    await strategySingle(contentContainer, baseTitle);
                } else {
                     alert('Không có nội dung hiển thị để chụp.');
                }
                return;
            }

            // Case 2: Xử lý từng group
            for (const [group, elements] of captureGroups.entries()) {
                if (SPLIT_GROUPS.includes(group)) {
                    await strategySplit(elements, baseTitle);
                    continue; 
                }

                // Logic Gộp
                const isKpiGroup = KPI_GROUPS.includes(group);
                await strategyMerge(elements, baseTitle, isKpiGroup);
            }
        } finally {
            styleElement.remove();
            if (typeof Chart !== 'undefined') {
                Chart.defaults.animation = {};
            }
        }

        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: 'Hoàn tất!' }));
        setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
    },

    // [NEW] Hàm chuyên dụng cho nút Review
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

        const styleElement = _injectCaptureStyles();
        if (typeof Chart !== 'undefined') Chart.defaults.animation = false;
        
        let previewImages = [];
        const options = { isPreview: true, scale: 1 }; // Scale 1 để render siêu nhanh

        try {
            if (captureGroups.size === 0) {
                 // Nếu không có group, chụp nguyên cục
                 const res = await strategySingle(contentContainer, baseTitle, options);
                 if (res) previewImages.push(res);
            }

            for (const [group, elements] of captureGroups.entries()) {
                if (SPLIT_GROUPS.includes(group)) {
                     const results = await strategySplit(elements, baseTitle, options);
                     previewImages = [...previewImages, ...results];
                     continue;
                }

                const isKpiGroup = KPI_GROUPS.includes(group);
                const results = await strategyMerge(elements, baseTitle, isKpiGroup, options);
                previewImages = [...previewImages, ...results];
            }
        } catch (e) {
            console.error(e);
        } finally {
            styleElement.remove();
            if (typeof Chart !== 'undefined') Chart.defaults.animation = {};
        }

        return previewImages;
    }
};