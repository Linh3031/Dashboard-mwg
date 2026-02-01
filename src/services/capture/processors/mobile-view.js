import { coreCapture, copyCanvasState } from '../engine.js';

export const processMobileView = async (elements, baseTitle, options = {}) => {
    const presetClass = 'preset-mobile-view';

    // Lấy tên file từ attribute
    const customFileName = elements[0]?.dataset?.captureFilename;
    const captureTitle = customFileName || baseTitle;

    const container = document.createElement('div');
    container.className = 'capture-layout-container ' + presetClass;
    
    elements.forEach(originalEl => {
        const clone = originalEl.cloneNode(true);
        
        // Copy Canvas state
        copyCanvasState(originalEl, clone);

        // Reset height chart
        const chartContainers = clone.querySelectorAll('.h-\\[300px\\]');
        chartContainers.forEach(el => {
            el.style.height = 'auto'; 
            el.style.minHeight = '300px';
        });

        container.appendChild(clone);
    });

    // [UPDATE] Truyền windowWidth: 1000
    return await coreCapture(container, captureTitle, presetClass, { 
        ...options, 
        windowWidth: 1000 
    });
};