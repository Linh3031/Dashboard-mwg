// File: src/services/capture.strategies.js
/* global Chart */
import { notificationStore } from '../stores.js';

// --- HELPER: Chuyển Tiếng Việt sang Không Dấu ---
const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
};

// --- HELPER: CSS Injection ---
export const injectCaptureStyles = () => {
    const styleId = 'dynamic-capture-styles';
    document.getElementById(styleId)?.remove();

    // CSS này áp dụng chung cho toàn bộ quá trình chụp
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
        
        /* Reset Table styles cho đẹp khi chụp */
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

        /* Layout Grid */
        .capture-layout-container { 
            display: flex; 
            flex-direction: column; 
            gap: 24px; 
        }
        
        .prepare-for-kpi-capture {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
            width: auto !important; 
        }

        .prepare-for-grid-4-capture {
            width: 800px !important;
            max-width: none !important;
        }
        .prepare-for-grid-4-capture .luyke-cat-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 16px !important;
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

        .preset-mobile-portrait {
            width: 450px !important;
            min-width: 450px !important;
            max-width: 450px !important;
            padding: 10px !important;
            margin: 0 auto;
            transform: scale(5) !important;
            transform-origin: top center !important; 
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
        } catch (e) {
            console.warn('Cannot convert canvas to image:', e);
        }
    });
};

// --- CORE FUNCTION ---
const _coreCapture = async (elementToCapture, title, presetClass = '', options = {}) => {
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
    
    if (presetClass) { 
        const classes = presetClass.split(' ').filter(c => c);
        contentClone.classList.add(...classes); 
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
            windowWidth: captureWrapper.scrollWidth, 
            windowHeight: captureWrapper.scrollHeight
        });

        const imageDataUrl = canvas.toDataURL('image/png');

        if (isPreview) {
            return { title: finalTitle, url: imageDataUrl };
        } else {
            const noToneTitle = removeVietnameseTones(title);
            const safeFileName = noToneTitle
                                    .replace(/[^a-zA-Z0-9]/g, '_')
                                    .replace(/_+/g, '_');
                                    
            const link = document.createElement('a');
            link.download = `${safeFileName}_${dateString.replace(/\//g, '-')}.png`;
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

export const strategySingle = async (element, baseTitle, options) => {
    const preset = element.dataset.capturePreset;
    let presetClass = preset ? `preset-${preset}` : '';
    return await _coreCapture(element, baseTitle, presetClass, options);
};

export const strategySplit = async (elements, baseTitle, options) => {
    const results = [];
    for (const targetElement of elements) {
        let foundTitle = targetElement.querySelector('h3, h4')?.textContent?.trim() || '';
        foundTitle = removeVietnameseTones(foundTitle); 
        const captureTitle = (foundTitle || baseTitle);
        
        const preset = targetElement.dataset.capturePreset;
        let presetClass = (preset ? `preset-${preset}` : '');

        const res = await _coreCapture(targetElement, captureTitle, presetClass, options);
        if (res) results.push(res);
        
        const delay = (options && options.isPreview) ? 50 : 500;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return results;
};

export const strategyMerge = async (elements, baseTitle, isKpiMode = false, options = {}) => {
    let elementToCapture;
    
    if (elements.length > 1) {
        const tempContainer = document.createElement('div');
        tempContainer.className = 'capture-layout-container'; 
        elements.forEach(el => tempContainer.appendChild(el.cloneNode(true)));
        elementToCapture = tempContainer;
    } else {
        elementToCapture = elements[0];
    }

    let foundTitle = '';
    if (elements[0]) {
        foundTitle = elements[0].querySelector('h3, h4')?.textContent?.trim() || '';
    }
    foundTitle = removeVietnameseTones(foundTitle);
    const captureTitle = (foundTitle || baseTitle);

    const preset = elements[0]?.dataset.capturePreset;
    let presetClass = '';

    if (isKpiMode === 'grid-4') {
        presetClass = 'prepare-for-grid-4-capture';
        if (!options.isPreview) options.scale = 4;
    } else if (isKpiMode === true) {
        presetClass = 'prepare-for-kpi-capture';
    } else if (preset) {
        presetClass = `preset-${preset}`;
    }

    const res = await _coreCapture(elementToCapture, captureTitle, presetClass, options);
    await new Promise(resolve => setTimeout(resolve, 300));
    return res ? [res] : [];
};

export const captureAndDownload = _coreCapture;