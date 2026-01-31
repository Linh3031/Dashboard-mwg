import { notificationStore } from '../../stores.js';

export const injectCaptureStyles = () => {
    const styleId = 'dynamic-capture-styles';
    document.getElementById(styleId)?.remove();

    const styles = `
        /* 1. CONTAINER GỐC (TRẢ VỀ FIT-CONTENT NHƯ CODE CŨ) */
        .capture-container { 
            padding: 20px; 
            background-color: #f3f4f6; 
            box-sizing: border-box; 
            
            /* QUAN TRỌNG: Để fit-content để container tự ôm sát thẻ KPI -> Không bị thừa viền trắng */
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
            white-space: nowrap; /* Tiêu đề không xuống dòng bậy */
        }

        /* Reset Table */
        .capture-container th, 
        .capture-container td,
        .capture-container h3, 
        .capture-container h4 {
            white-space: normal !important;
            overflow: visible !important;
            height: auto !important;
        }

        /* 2. CÁC PRESET LAYOUT */

        /* KPI Lũy Kế (Thẻ màu): Grid 2 cột tự nhiên */
        .prepare-for-kpi-capture {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
            /* Không set width cứng, để nó tự ăn theo content */
        }

        /* KPI Tier 2: Grid 4 cột */
        .prepare-for-grid-4-capture {
            /* Nhóm này thường to, có thể set min-width để khỏi bị ép */
            min-width: 800px !important;
        }
        .prepare-for-grid-4-capture .luyke-cat-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
        }

        /* 3. FIX RIÊNG CHO THI ĐUA VÙNG (Thẻ trắng) */
        /* Nhóm này cần ép rộng 800px để chữ không bị nát xuống dòng xấu */
        .force-mobile-width {
            width: 800px !important;
            max-width: 800px !important;
        }
        
        .prepare-for-competition-grid {
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

export const swapCanvasToImage = (container) => {
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
        } catch (e) { console.warn(e); }
    });
};

export const coreCapture = async (elementToCapture, title, presetClass = '', options = {}) => {
    const { isPreview = false, scale = 2 } = options; 
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
    if (presetClass) contentClone.className = presetClass;
    
    // Logic mới: Nếu là nhóm Thi đua vùng, thêm class ép width
    if (presetClass.includes('prepare-for-competition-grid')) {
        contentClone.classList.add('force-mobile-width');
    }

    captureWrapper.appendChild(contentClone);
    document.body.appendChild(captureWrapper);

    if (typeof Chart !== 'undefined') Chart.defaults.animation = false;
    swapCanvasToImage(contentClone);
    await new Promise(resolve => setTimeout(resolve, 300)); 

    try {
        const canvas = await window.html2canvas(captureWrapper, {
            scale: isPreview ? 1 : scale,
            useCORS: true,
            backgroundColor: '#f3f4f6',
            logging: false,
            // Xóa bỏ windowWidth cứng, để html2canvas tự đo theo fit-content
            windowWidth: captureWrapper.scrollWidth,
            windowHeight: captureWrapper.scrollHeight
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
        if (typeof Chart !== 'undefined') Chart.defaults.animation = {}; 
    }
};