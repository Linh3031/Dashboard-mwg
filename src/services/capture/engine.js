import { notificationStore } from '../../stores.js';

export const injectCaptureStyles = () => {
    const styleId = 'dynamic-capture-styles';
    document.getElementById(styleId)?.remove();

    const styles = `
        /* CORE CONTAINER */
        .capture-container { 
            padding: 20px; 
            background-color: #f3f4f6; 
            box-sizing: border-box; 
            width: fit-content !important; 
            height: fit-content !important;
            position: absolute;
            left: -9999px;
            top: 0;
            z-index: -1;
            font-family: 'Segoe UI', Roboto, sans-serif;
        }

        .capture-title { 
            font-size: 26px; 
            font-weight: 800; 
            color: #1e3a8a; 
            margin-bottom: 20px; 
            text-align: center; 
            text-transform: uppercase;
        }

        /* --- PRESETS CŨ --- */
        .prepare-for-kpi-capture {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
        }
        .prepare-for-grid-4-capture .luyke-cat-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
        }
        .prepare-for-competition-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
        }
        .force-mobile-width {
            width: 800px !important;
            max-width: 800px !important;
        }

        /* --- [UPDATED] MOBILE VIEW --- */
        .preset-mobile-view {
            /* [UPDATE] Tăng lên 1000px theo yêu cầu */
            width: 1000px !important; 
            min-width: 1000px !important;
            max-width: 1000px !important;
        }
        
        /* FIX 1: KPI vẫn giữ 3 cột cho gọn (3x2) */
        .preset-mobile-view .lg\\:grid-cols-6 {
            grid-template-columns: repeat(3, 1fr) !important;
        }

        /* FIX 2: [UPDATE] Biểu đồ ép về 2 cột (Side-by-side) để ảnh không bị dài */
        .preset-mobile-view .lg\\:grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
        }

        /* Ẩn các thành phần thừa */
        .preset-mobile-view button, 
        .preset-mobile-view .feather,
        .preset-mobile-view i[data-feather] {
            display: none !important;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    return styleElement;
};

// Hàm copyCanvasState giữ nguyên
export const copyCanvasState = (originalEl, clonedEl) => {
    const originalCanvases = originalEl.querySelectorAll('canvas');
    const clonedCanvases = clonedEl.querySelectorAll('canvas');

    if (originalCanvases.length !== clonedCanvases.length) return;

    originalCanvases.forEach((origCanvas, index) => {
        try {
            const cloneCanvas = clonedCanvases[index];
            const img = document.createElement('img');
            img.src = origCanvas.toDataURL('image/png');
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.display = 'block';
            img.style.objectFit = 'contain';

            if (cloneCanvas.parentNode) {
                cloneCanvas.parentNode.insertBefore(img, cloneCanvas);
                cloneCanvas.remove();
            }
        } catch (e) {
            console.warn('Canvas copy failed:', e);
        }
    });
};

export const swapCanvasToImage = (container) => {
    const canvases = container.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        if (canvas.style.display !== 'none') canvas.style.display = 'none';
    });
};

export const coreCapture = async (elementToCapture, title, presetClass = '', options = {}) => {
    const { isPreview = false, scale = 2, windowWidth = null } = options;
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
        contentClone.classList.add(presetClass);
        captureWrapper.classList.add(presetClass);
    }
    
    captureWrapper.appendChild(contentClone);
    document.body.appendChild(captureWrapper);

    await new Promise(resolve => setTimeout(resolve, 300)); 

    try {
        const canvas = await window.html2canvas(captureWrapper, {
            scale: isPreview ? 1 : scale,
            useCORS: true,
            backgroundColor: '#f3f4f6',
            logging: false,
            windowWidth: windowWidth, 
            windowHeight: null
        });

        const imageDataUrl = canvas.toDataURL('image/png');
        if (isPreview) {
            return { title: finalTitle, url: imageDataUrl };
        } else {
            const safeFileName = finalTitle.replace(/[^a-zA-Z0-9]/g, '_');
            const link = document.createElement('a');
            link.download = `${safeFileName}.png`;
            link.href = imageDataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            notificationStore.update(s => ({ ...s, visible: true, type: 'success', message: 'Đã tải ảnh xuống thành công!' }));
            setTimeout(() => notificationStore.update(s => ({ ...s, visible: false })), 3000);
            return null;
        }
    } finally {
        if (document.body.contains(captureWrapper)) document.body.removeChild(captureWrapper);
    }
};