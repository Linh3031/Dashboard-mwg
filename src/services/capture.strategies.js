// File: src/services/capture.strategies.js
/* global Chart */
import { notificationStore } from '../stores.js';

// --- HELPER: CSS Injection (Đã Fix lỗi mờ & Cắt chữ) ---
export const injectCaptureStyles = () => {
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
        
        /* Fix lỗi cắt chữ (Padding & Line-height) */
        .capture-container th, .capture-container td {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            line-height: 1.5 !important;
            height: auto !important;
        }
        .capture-container td > div, .capture-container td > span,
        .capture-container td > p, .capture-container th > div, .capture-container th > span {
            overflow: visible !important;
            padding-bottom: 4px !important;
            line-height: 1.5 !important;
            height: auto !important;
            white-space: normal !important;
        }
        .capture-container h3, .capture-container h4, .capture-container .font-bold {
            padding-bottom: 6px !important;
            line-height: 1.5 !important;
            overflow: visible !important;
        }

        /* Layout Helpers */
        .capture-layout-container { 
            display: flex; 
            flex-direction: column; 
            gap: 24px; 
        }
        .prepare-for-kpi-capture {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
        }

        /* Tiêu đề */
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

        /* [CRITICAL FIX] Mobile Portrait Preset - Chìa khóa độ nét */
        .preset-mobile-portrait {
            width: 450px !important;
            min-width: 450px !important;
            max-width: 450px !important;
            padding: 10px !important;
            margin: 0 auto;
            transform: scale(5) !important;
            transform-origin: top center !important; /* QUAN TRỌNG: Giữ nội dung không bị trôi */
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

// --- CORE FUNCTION ---
const _coreCapture = async (elementToCapture, title, presetClass = '') => {
    if (typeof window.html2canvas === 'undefined') throw new Error("Thư viện html2canvas chưa tải xong.");

    const date = new Date();
    const dateString = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const timeString = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const finalTitle = `${title.replace(/_/g, ' ')} - ${timeString} ${dateString}`;

    const captureWrapper = document.createElement('div');
    captureWrapper.className = 'capture-container';

    const titleEl = document.createElement('h2');
    titleEl.className = 'capture-title';
    titleEl.textContent = finalTitle;
    captureWrapper.appendChild(titleEl);
    
    const contentClone = elementToCapture.cloneNode(true);
    if (presetClass) { 
        const classes = presetClass.split(' ').filter(c => c);
        contentClone.classList.add(...classes); 
    }
    captureWrapper.appendChild(contentClone);
    document.body.appendChild(captureWrapper);

    if (typeof Chart !== 'undefined') Chart.defaults.animation = false;
    swapCanvasToImage(contentClone);
    await new Promise(resolve => setTimeout(resolve, 300)); // Đợi render ổn định

    try {
        const canvas = await window.html2canvas(captureWrapper, {
            scale: 2, // Độ phân giải cao (High Res)
            useCORS: true,
            backgroundColor: '#f3f4f6',
            logging: false,
            windowWidth: captureWrapper.scrollWidth, 
            windowHeight: captureWrapper.scrollHeight
        });

        const link = document.createElement('a');
        link.download = `${title}_${dateString.replace(/\//g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: 'Đã tải ảnh xuống thành công!' }));
        setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
    } finally {
        if (document.body.contains(captureWrapper)) document.body.removeChild(captureWrapper);
        if (typeof Chart !== 'undefined') Chart.defaults.animation = {}; 
    }
};

// --- STRATEGIES ---

export const strategySingle = async (element, baseTitle) => {
    const preset = element.dataset.capturePreset;
    let presetClass = preset ? `preset-${preset}` : '';
    await _coreCapture(element, baseTitle, presetClass);
};

export const strategySplit = async (elements, baseTitle) => {
    for (const targetElement of elements) {
        let foundTitle = targetElement.querySelector('h3, h4')?.textContent?.trim() || '';
        const captureTitle = (foundTitle || baseTitle)
                                .replace(/[^a-zA-Z0-9\sÁ-ỹ]/g, '')
                                .replace(/\s+/g, '_');
        
        const preset = targetElement.dataset.capturePreset;
        let presetClass = (preset ? `preset-${preset}` : '');

        await _coreCapture(targetElement, captureTitle, presetClass);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};

export const strategyMerge = async (elements, baseTitle, isKpiMode = false) => {
    const targetElement = elements[0];
    let foundTitle = '';
    if (targetElement) {
        foundTitle = targetElement.querySelector('h3, h4')?.textContent?.trim() || '';
    }
    const captureTitle = (foundTitle || baseTitle)
                            .replace(/[^a-zA-Z0-9\sÁ-ỹ]/g, '')
                            .replace(/\s+/g, '_');

    const preset = targetElement.dataset.capturePreset;
    let presetClass = '';

    if (isKpiMode) {
        presetClass = 'prepare-for-kpi-capture';
    } else if (preset) {
        presetClass = `preset-${preset}`;
    }

    let elementToCapture;
    
    // Logic gộp
    if (elements.length > 1 || isKpiMode) {
        const tempContainer = document.createElement('div');
        tempContainer.className = 'capture-layout-container'; 
        elements.forEach(el => tempContainer.appendChild(el.cloneNode(true)));
        elementToCapture = tempContainer;
    } else {
        // Nếu chỉ có 1 phần tử (VD: Doanh thu NV LK), lấy trực tiếp để preset áp dụng đúng
        elementToCapture = targetElement;
    }

    await _coreCapture(elementToCapture, captureTitle, presetClass);
    await new Promise(resolve => setTimeout(resolve, 300));
};

export const captureAndDownload = _coreCapture;