import { coreCapture } from '../engine.js';

export const processCompetitionGrid = async (elements, baseTitle, options = {}) => {
    // Với thẻ Thi đua vùng, ta cũng ép Grid 2 cột trên nền 720px
    // Điều này giúp ảnh trông gọn gàng như xem trên điện thoại
    const presetClass = 'prepare-for-competition-grid';

    const container = document.createElement('div');
    
    elements.forEach(el => {
        const clone = el.cloneNode(true);
        // Xóa các class width cũ của Tailwind nếu có (vd: w-1/4) để tránh xung đột
        clone.style.width = 'auto';
        clone.classList.remove('w-full', 'w-screen'); 
        
        // Tìm và xử lý tiêu đề bên trong để chắc chắn hiện dấu ...
        // (Dù engine đã có CSS, nhưng thêm class này để chắc chắn)
        const headers = clone.querySelectorAll('h3, h4, .font-bold');
        headers.forEach(h => h.classList.add('truncate-capture'));

        container.appendChild(clone);
    });

    return await coreCapture(container, baseTitle, presetClass, options);
};