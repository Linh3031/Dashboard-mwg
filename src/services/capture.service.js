/* global Chart */
import { notificationStore, currentUser } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';
// Import các hàm utils đã được sửa ở trên
import { injectCaptureStyles, swapCanvasToImage } from '../utils/capture.utils.js';

export const captureService = {
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        // 1. Kiểm tra thư viện
        if (typeof window.html2canvas === 'undefined') {
            alert("Lỗi: Thư viện html2canvas chưa tải xong. Vui lòng F5 lại trang.");
            return;
        }

        const date = new Date();
        const dateString = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        // Format tiêu đề chuẩn: Title - HH:MM dd/mm
        const timeString = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const finalTitle = `${title.replace(/_/g, ' ')} - ${timeString} ${dateString}`;
    
        // 2. Tạo wrapper tạm thời (dùng class CSS từ utils để ẩn nó đi)
        const captureWrapper = document.createElement('div');
        captureWrapper.className = 'capture-container'; // Class này có left: -9999px
    
        // 3. Thêm tiêu đề vào ảnh
        const titleEl = document.createElement('h2');
        titleEl.className = 'capture-title';
        titleEl.textContent = finalTitle;
        captureWrapper.appendChild(titleEl);
        
        // 4. Clone nội dung
        const contentClone = elementToCapture.cloneNode(true);
        if (presetClass) { contentClone.classList.add(presetClass); }

        captureWrapper.appendChild(contentClone);
        document.body.appendChild(captureWrapper);
    
        // 5. Tắt animation của Chart.js (nếu có) để chụp không bị mờ
        if (typeof Chart !== 'undefined') {
            Chart.defaults.animation = false;
        }
        
        // 6. [QUAN TRỌNG] Chuyển đổi Canvas thành Ảnh tĩnh
        swapCanvasToImage(contentClone);

        // 7. Đợi render (Delay 200ms) - Cần thiết để browser vẽ ảnh xong
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // 8. Chụp bằng html2canvas
            const canvas = await window.html2canvas(captureWrapper, {
                scale: 2, // Tăng chất lượng ảnh
                useCORS: true, // Cho phép ảnh từ domain khác
                backgroundColor: '#f3f4f6', // Màu nền xám nhạt
                logging: false,
                windowWidth: captureWrapper.scrollWidth,
                windowHeight: captureWrapper.scrollHeight
            });
    
            // 9. Tải xuống
            const link = document.createElement('a');
            link.download = `${title}_${dateString.replace(/\//g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: 'Đã tải ảnh xuống thành công!' }));
            setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);

        } catch (err) {
            console.error('Lỗi captureService:', err);
            alert(`Lỗi khi chụp ảnh: ${err.message}`);
        } finally {
            // 10. Dọn dẹp
            if (document.body.contains(captureWrapper)) {
                document.body.removeChild(captureWrapper);
            }
            if (typeof Chart !== 'undefined') {
                Chart.defaults.animation = {}; // Bật lại animation
            }
        }
    },
    
    async captureDashboardInParts(contentContainer, baseTitle) {
       if (!contentContainer) {
            alert('Lỗi: Không tìm thấy nội dung để chụp.');
            return;
        }

        const user = get(currentUser);
        analyticsService.incrementCounter('actionsTaken', user?.email);
        
        notificationStore.update(s => ({ ...s, visible: true, type: 'info', message: `Đang xử lý ảnh: ${baseTitle}...` }));
    
        // Gom nhóm các phần tử cần chụp (data-capture-group)
        const captureGroups = new Map();
        contentContainer.querySelectorAll('[data-capture-group]').forEach(el => {
            // Chỉ lấy các phần tử đang hiển thị (có offsetParent)
            if (el.offsetParent !== null) {
                const group = el.dataset.captureGroup;
                if (!captureGroups.has(group)) {
                     captureGroups.set(group, []);
                }
                captureGroups.get(group).push(el);
            }
        });
        
        // Inject CSS (QUAN TRỌNG: Để định dạng bảng, mobile preset, v.v.)
        const styleElement = injectCaptureStyles();
        
        if (typeof Chart !== 'undefined') {
            Chart.defaults.animation = false;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            // Case 1: Không có group nào, chụp nguyên container
            if (captureGroups.size === 0) {
                if (contentContainer.offsetParent !== null) {
                    const preset = contentContainer.dataset.capturePreset;
                    const presetClass = preset ? `preset-${preset}` : '';
                    await this.captureAndDownload(contentContainer, baseTitle, presetClass);
                } else {
                     alert('Không có nội dung hiển thị để chụp.');
                }
                return;
            }

            // Case 2: Chụp từng group
            for (const [group, elements] of captureGroups.entries()) {
                const targetElement = elements[0];
                
                // Tìm tiêu đề con (h3, h4) để đặt tên file cho đẹp
                let foundTitle = '';
                if (targetElement) {
                    foundTitle = targetElement.querySelector('h3, h4')?.textContent?.trim() || '';
                }
                
                const captureTitle = (foundTitle || baseTitle)
                                        .replace(/[^a-zA-Z0-9\sÁ-ỹ]/g, '')
                                        .replace(/\s+/g, '_');
                
                const preset = targetElement.dataset.capturePreset;
                const isKpiGroup = group === 'kpi'; // KPI Group cần xử lý grid đặc biệt
                
                let elementToCapture;
                let presetClass = '';

                if (isKpiGroup) {
                    presetClass = 'prepare-for-kpi-capture';
                } else if (preset) {
                    presetClass = `preset-${preset}`;
                }

                // Nếu group có nhiều element (ví dụ 2 bảng ngang nhau), gom vào container chung
                if (elements.length > 1 && !isKpiGroup) {
                    const tempContainer = document.createElement('div');
                    tempContainer.className = 'capture-layout-container'; // CSS flex column gap 24px
                    elements.forEach(el => tempContainer.appendChild(el.cloneNode(true)));
                    elementToCapture = tempContainer;
                } else {
                    elementToCapture = targetElement;
                }
    
                await this.captureAndDownload(elementToCapture, captureTitle, presetClass);
                
                // Delay nhỏ giữa các lần chụp để không treo trình duyệt
                await new Promise(resolve => setTimeout(resolve, 300));
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
};