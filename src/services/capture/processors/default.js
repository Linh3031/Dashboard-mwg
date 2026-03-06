import { coreCapture } from '../engine.js';

export const processDefault = async (elements, baseTitle, options = {}) => {
    const container = document.createElement('div');
    container.className = 'capture-layout-container';
    
    // [FIX GENESIS] Phẫu thuật Logic: Chỉ lấy tên h3/h4 nếu là mảnh nhỏ (có data-capture-group)
    let captureTitle = baseTitle;
    if (elements && elements.length > 0) {
        const firstEl = elements[0];
        const manualName = firstEl.dataset?.captureFilename;
        
        let foundTitle = '';
        if (firstEl.hasAttribute('data-capture-group')) {
            foundTitle = firstEl.querySelector('h3, h4')?.textContent?.trim() || '';
        }
        
        captureTitle = manualName || foundTitle || baseTitle;
    }
    
    elements.forEach(el => {
        container.appendChild(el.cloneNode(true));
    });

    return await coreCapture(container, captureTitle, '', options);
};