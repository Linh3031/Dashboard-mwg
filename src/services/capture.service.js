/* global html2canvas, Chart */
import { notificationStore } from '../stores.js'; // [FIX]
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';
import { currentUser, charts } from '../stores.js'; // Thêm charts vào đây nếu cần dùng trong utils, hoặc pass từ component

// --- CÁC HÀM UTILS ĐỂ TRONG CÙNG FILE HOẶC IMPORT TỪ UTILS ---
// Để đơn giản và tránh lỗi import vòng, tôi sẽ giữ helper injection ở đây hoặc bạn có thể giữ nguyên import nếu đã tách utils.
// Dưới đây là code giả định bạn đã tách utils/capture.utils.js như bước trước, nếu chưa thì báo tôi.
import { injectCaptureStyles, swapCanvasToImage } from '../utils/capture.utils.js'; 

export const captureService = {
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        const date = new Date();
        const timeString = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateString = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        const finalTitle = `${title.replace(/_/g, ' ')} - ${timeString} ${dateString}`;
    
        const captureWrapper = document.createElement('div');
        captureWrapper.className = 'capture-container';
    
        const titleEl = document.createElement('h2');
        titleEl.className = 'capture-title';
        titleEl.textContent = finalTitle;
        captureWrapper.appendChild(titleEl);
        
        const contentClone = elementToCapture.cloneNode(true);
        if (presetClass) { contentClone.classList.add(presetClass); }

        captureWrapper.appendChild(contentClone);
        document.body.appendChild(captureWrapper);
    
        if (typeof Chart !== 'undefined') {
            Chart.defaults.animation = false;
        }
        
        swapCanvasToImage(contentClone);

        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const canvas = await html2canvas(captureWrapper, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#f3f4f6'
            });
    
            const link = document.createElement('a');
            link.download = `${title}_${dateString.replace(/\//g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            notificationStore.show('Đã chụp và tải xuống hình ảnh!', 'success'); // [FIX]
        } catch (err) {
            console.error('Lỗi chụp màn hình:', err);
            notificationStore.show(`Lỗi khi chụp ảnh: ${err.message}.`, 'error'); // [FIX]
        } finally {
            if (document.body.contains(captureWrapper)) {
                document.body.removeChild(captureWrapper);
            }
            if (typeof Chart !== 'undefined') {
                Chart.defaults.animation = {};
            }
        }
    },
    
    async captureDashboardInParts(contentContainer, baseTitle) {
        if (!contentContainer) {
            notificationStore.show('Không tìm thấy vùng nội dung để chụp.', 'error'); // [FIX]
            return;
        }

        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        
        notificationStore.show(`Bắt đầu chụp báo cáo ${baseTitle}...`, 'success'); // [FIX]
    
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
        
        const styleElement = injectCaptureStyles();
        
        if (typeof Chart !== 'undefined') {
            Chart.defaults.animation = false;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            if (captureGroups.size === 0) {
                if (contentContainer.offsetParent !== null) {
                    const preset = contentContainer.dataset.capturePreset;
                    const presetClass = preset ? `preset-${preset}` : '';
                    await this.captureAndDownload(contentContainer, baseTitle, presetClass);
                } else {
                     notificationStore.show('Không tìm thấy đối tượng hiển thị để chụp.', 'error'); // [FIX]
                }
                return;
            }

            for (const [group, elements] of captureGroups.entries()) {
                const targetElement = elements[0];
                let foundTitle = '';
                if (targetElement) {
                    foundTitle = targetElement.querySelector('h3, h4')?.textContent?.trim() || '';
                }
                
                const captureTitle = (foundTitle || baseTitle)
                                        .replace(/[^a-zA-Z0-9\sÁ-ỹ]/g, '')
                                        .replace(/\s+/g, '_');
                
                const preset = targetElement.dataset.capturePreset;
                const isKpiGroup = group === 'kpi';
                
                let elementToCapture;
                let presetClass = '';

                if (isKpiGroup) {
                    presetClass = 'prepare-for-kpi-capture';
                } else if (preset) {
                    presetClass = `preset-${preset}`;
                }

                if (elements.length > 1 && !isKpiGroup) {
                    const tempContainer = document.createElement('div');
                    tempContainer.className = 'capture-layout-container';
                    elements.forEach(el => tempContainer.appendChild(el.cloneNode(true)));
                    elementToCapture = tempContainer;
                } else {
                    elementToCapture = targetElement;
                }
    
                await this.captureAndDownload(elementToCapture, captureTitle, presetClass);
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        } finally {
            styleElement.remove();
            if (typeof Chart !== 'undefined') {
                Chart.defaults.animation = {};
            }
        }

        notificationStore.show(`Đã hoàn tất chụp ảnh báo cáo ${baseTitle}!`, 'success'); // [FIX]
    },
};