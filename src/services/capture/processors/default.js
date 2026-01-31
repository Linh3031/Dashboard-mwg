import { coreCapture } from '../engine.js';

export const processDefault = async (elements, baseTitle, options = {}) => {
    // Logic gộp dọc đơn giản
    const container = document.createElement('div');
    container.className = 'capture-layout-container';
    
    elements.forEach(el => {
        container.appendChild(el.cloneNode(true));
    });

    return await coreCapture(container, baseTitle, '', options);
};