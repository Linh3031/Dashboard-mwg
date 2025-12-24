/* global Chart */
import { notificationStore, currentUser } from '../stores.js';
import { analyticsService } from './analytics.service.js';
import { get } from 'svelte/store';

// --- HELPER for Screenshot CSS Injection ---
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
        
        /* [UPDATED FIX] Xử lý triệt để lỗi cắt chữ (g, y, p...) ở mọi cấp độ */
        
        /* 1. Cấp độ ô bảng (TD/TH) */
        .capture-container th,
        .capture-container td {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            line-height: 1.5 !important;
            height: auto !important;      /* Bắt buộc chiều cao tự động giãn */
        }

        /* 2. Cấp độ nội dung bên trong (DIV/SPAN/P/STRONG) - Quan trọng cho Tên Nhân Viên */
        /* Nguyên nhân tên bị cắt là do thẻ bao bên trong td bị giới hạn chiều cao hoặc overflow */
        .capture-container td > div,
        .capture-container td > span,
        .capture-container td > p,
        .capture-container th > div,
        .capture-container th > span {
            overflow: visible !important;  /* Cấm ẩn nội dung thừa */
            padding-bottom: 4px !important; /* Nới đáy cho thẻ con */
            line-height: 1.5 !important;
            height: auto !important;
            white-space: normal !important; /* Cho phép xuống dòng nếu cần, tránh bị cắt ngang */
        }

        /* 3. Cấp độ Tiêu đề lớn */
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

        /* Mobile Portrait Preset */
        .preset-mobile-portrait {
            width: 450px !important;
            min-width: 450px !important;
            max-width: 450px !important;
            padding: 10px !important;
            margin: 0 auto;
            transform: scale(5) !important;
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

// --- HELPER: Swap Canvas to Image (Cho Chart.js) ---
const swapCanvasToImage = (container) => {
    const canvases = container.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        try {
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            img.style.width = canvas.style.width || '100%';
            img.style.height = canvas.style.height || 'auto';
            img.style.display = 'block';
            
            if (canvas.parentNode) {
                canvas.parentNode.insertBefore(img, canvas);
                canvas.style.display = 'none'; 
            }
        } catch (e) {
            console.warn('Cannot convert canvas to image:', e);
        }
    });
};

export const captureService = {
    async captureAndDownload(elementToCapture, title, presetClass = '') {
        // 1. Kiểm tra thư viện
        if (typeof window.html2canvas === 'undefined') {
            alert("Lỗi: Thư viện html2canvas chưa tải xong. Vui lòng F5 lại trang.");
            return;
        }

        const date = new Date();
        const dateString = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        const timeString = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const finalTitle = `${title.replace(/_/g, ' ')} - ${timeString} ${dateString}`;
    
        // 2. Tạo wrapper
        const captureWrapper = document.createElement('div');
        captureWrapper.className = 'capture-container';
    
        // 3. Thêm tiêu đề
        const titleEl = document.createElement('h2');
        titleEl.className = 'capture-title';
        titleEl.textContent = finalTitle;
        captureWrapper.appendChild(titleEl);
        
        // 4. Clone nội dung
        const contentClone = elementToCapture.cloneNode(true);
        if (presetClass) { 
            const classes = presetClass.split(' ').filter(c => c);
            contentClone.classList.add(...classes); 
        }

        captureWrapper.appendChild(contentClone);
        document.body.appendChild(captureWrapper);

        // 5. Tắt animation Chart.js
        if (typeof Chart !== 'undefined') {
            Chart.defaults.animation = false;
        }
        
        // 6. Chuyển đổi Canvas -> Ảnh
        swapCanvasToImage(contentClone);

        // 7. Đợi render 
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            // 8. Chụp bằng html2canvas
            const canvas = await window.html2canvas(captureWrapper, {
                scale: 5, 
                useCORS: true,
                backgroundColor: '#f3f4f6',
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
                Chart.defaults.animation = {}; 
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

        // --- CẤU HÌNH LOGIC CHỤP ẢNH ---
        
        const SPLIT_GROUPS = [
            'category-revenue',         
            'competition-program',      
            'competition-program-view', 
            'efficiency-program',       
            'efficiency-program-view',
            'regional-competition',
            'efficiency-luyke'
        ];

        try {
            // Case 1: Không có group
            if (captureGroups.size === 0) {
                if (contentContainer.offsetParent !== null) {
                    const preset = contentContainer.dataset.capturePreset;
                    let presetClass = preset ? `preset-${preset}` : '';
                    await this.captureAndDownload(contentContainer, baseTitle, presetClass);
                } else {
                     alert('Không có nội dung hiển thị để chụp.');
                }
                return;
            }

            // Case 2: Xử lý từng group
            for (const [group, elements] of captureGroups.entries()) {
                
                // --- A. LOGIC TÁCH ẢNH ---
                if (SPLIT_GROUPS.includes(group)) {
                    for (const targetElement of elements) {
                        let foundTitle = targetElement.querySelector('h3, h4')?.textContent?.trim() || '';
                        const captureTitle = (foundTitle || baseTitle)
                                                .replace(/[^a-zA-Z0-9\sÁ-ỹ]/g, '')
                                                .replace(/\s+/g, '_');
                        
                        const preset = targetElement.dataset.capturePreset;
                        let presetClass = (preset ? `preset-${preset}` : '');

                        await this.captureAndDownload(targetElement, captureTitle, presetClass);
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    continue; 
                }

                // --- B. LOGIC GỘP ---
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