import { coreCapture } from '../engine.js';

export const processKpiGrid = async (elements, baseTitle, options = {}) => {
    // Xác định chế độ Grid (2 cột mặc định hoặc 4 cột)
    const isGrid4 = options.mode === 'grid-4';
    
    // Tên class để ép giao diện (CSS này đã nằm trong engine.js)
    let presetClass = 'prepare-for-kpi-capture'; 
    if (isGrid4) {
        presetClass = 'prepare-for-grid-4-capture';
        // Grid 4 cột cần độ phân giải cao hơn
        if (!options.isPreview) options.scale = 4;
    }

    // --- [FIX] Sửa lỗi Tên File: Ưu tiên lấy tên từ attribute hoặc thẻ H3/H4 ---
    let captureTitle = baseTitle;
    if (elements && elements.length > 0) {
        const firstEl = elements[0];
        const manualName = firstEl.dataset?.captureFilename;
        const foundTitle = firstEl.querySelector('h3, h4')?.textContent?.trim();
        captureTitle = manualName || foundTitle || baseTitle;
    }

    let elementToCapture;
    let finalPresetClass = presetClass;

    if (elements.length === 1) {
        // TRƯỜNG HỢP 1: Người dùng gom nhóm cả bảng (Container)
        elementToCapture = elements[0].cloneNode(true);
        elementToCapture.classList.add(...presetClass.split(' '));
        finalPresetClass = ''; 
    } else {
        // TRƯỜNG HỢP 2: Người dùng chọn từng thẻ rời rạc
        const container = document.createElement('div');
        container.className = presetClass; 
        elements.forEach(el => container.appendChild(el.cloneNode(true)));
        elementToCapture = container;
        finalPresetClass = ''; 
    }

    // Gọi Core Engine với tên file đã được bóc tách
    return await coreCapture(elementToCapture, captureTitle, finalPresetClass, options);
};