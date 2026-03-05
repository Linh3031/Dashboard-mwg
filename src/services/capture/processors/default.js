import { coreCapture } from '../engine.js';

export const processDefault = async (elements, baseTitle, options = {}) => {
    const container = document.createElement('div');
    container.className = 'capture-layout-container';
    
    // [FIX] Sửa lỗi Tên File: Ưu tiên lấy tên từ bảng đầu tiên (custom attribute hoặc thẻ H3/H4)
    let captureTitle = baseTitle;
    if (elements && elements.length > 0) {
        const firstEl = elements[0];
        const manualName = firstEl.dataset?.captureFilename;
        const foundTitle = firstEl.querySelector('h3, h4')?.textContent?.trim();
        captureTitle = manualName || foundTitle || baseTitle;
    }
    
    elements.forEach(el => {
        container.appendChild(el.cloneNode(true));
    });

    return await coreCapture(container, captureTitle, '', options);
};