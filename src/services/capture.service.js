/* global Chart */
import { notificationStore, currentUser } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';
// Import từ Config và Strategies
import { SPLIT_GROUPS, KPI_GROUPS, GRID_4_GROUPS } from './capture.config.js';
import { swapCanvasToImage, strategySplit, strategyMerge, strategySingle } from './capture.strategies.js';

// --- HELPER for Screenshot CSS Injection (SERVICE VERSION) ---
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

        /* --- [FIX QUAN TRỌNG] XỬ LÝ LỖI DÍNH DÒNG BẢNG TOP NHÓM HÀNG --- */
        .capture-container .luyke-widget-body .mb-2 {
            margin-bottom: 12px !important; 
            display: flex !important;
        }
        .capture-container .luyke-widget-body .w-full.h-2 {
            margin-top: 8px !important;
            margin-bottom: 8px !important;
            position: relative !important;
            z-index: 1 !important;
        }
        .capture-container .luyke-widget-body .py-2 {
            padding-top: 10px !important;
            padding-bottom: 10px !important;
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

        /* --- GRID LAYOUT FIXES --- */

        /* 1. KPI Grid (2 cột) */
        .prepare-for-kpi-capture {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
        }

        /* 2. Category Grid (4 cột) - [WIDTH 800px] */
        .prepare-for-grid-4-capture {
            width: 800px !important;
            max-width: none !important;
        }
        .prepare-for-grid-4-capture .luyke-cat-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 16px !important;
        }

        /* Mobile Portrait Preset */
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
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    return styleElement;
};

export const captureService = {
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        await strategySingle(elementToCapture, title);
    },
    
    async captureDashboardInParts(contentContainer, baseTitle) {
       if (!contentContainer) {
            alert('Lỗi: Không tìm thấy nội dung để chụp.');
            return;
        }

        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        notificationStore.update(s => ({ ...s, visible: true, type: 'info', message: `Đang xử lý ảnh: ${baseTitle}...` }));

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
            if (captureGroups.size === 0) {
                if (contentContainer.offsetParent !== null) {
                    await strategySingle(contentContainer, baseTitle);
                } else {
                     alert('Không có nội dung hiển thị để chụp.');
                }
                return;
            }

            for (const [group, elements] of captureGroups.entries()) {
                if (SPLIT_GROUPS.includes(group)) {
                    await strategySplit(elements, baseTitle);
                    continue; 
                }

                let mergeMode = false;
                if (GRID_4_GROUPS.includes(group)) {
                    mergeMode = 'grid-4';
                } else if (KPI_GROUPS.includes(group)) {
                    mergeMode = true;
                }

                await strategyMerge(elements, baseTitle, mergeMode);
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
        const options = { isPreview: true, scale: 1 }; 

        try {
            if (captureGroups.size === 0) {
                 const res = await strategySingle(contentContainer, baseTitle, options);
                 if (res) previewImages.push(res);
            }

            for (const [group, elements] of captureGroups.entries()) {
                if (SPLIT_GROUPS.includes(group)) {
                     const results = await strategySplit(elements, baseTitle, options);
                     previewImages = [...previewImages, ...results];
                     continue;
                }
                
                let mergeMode = false;
                if (GRID_4_GROUPS.includes(group)) {
                    mergeMode = 'grid-4';
                } else if (KPI_GROUPS.includes(group)) {
                    mergeMode = true;
                }

                const results = await strategyMerge(elements, baseTitle, mergeMode, options);
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