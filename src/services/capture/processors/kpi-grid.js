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

    // --- SỬA LỖI LOGIC TẠI ĐÂY ---
    let elementToCapture;
    let finalPresetClass = presetClass;

    if (elements.length === 1) {
        // TRƯỜNG HỢP 1: Người dùng gom nhóm cả bảng (Container)
        // -> Clone trực tiếp, áp dụng class ép Grid thẳng vào nó.
        elementToCapture = elements[0].cloneNode(true);
        
        // Lưu ý: Nếu phần tử gốc đã có class, ta phải merge thêm class preset vào
        elementToCapture.classList.add(...presetClass.split(' '));
        finalPresetClass = ''; // Đã add trực tiếp rồi nên không cần pass vào coreCapture nữa
    } else {
        // TRƯỜNG HỢP 2: Người dùng chọn từng thẻ rời rạc
        // -> Tạo container bao ngoài, ép container thành Grid.
        const container = document.createElement('div');
        // Class 'capture-layout-container' cũ dùng flex-col, ta không dùng ở đây để tránh conflict với Grid
        container.className = presetClass; 
        
        elements.forEach(el => container.appendChild(el.cloneNode(true)));
        elementToCapture = container;
        finalPresetClass = ''; // Class đã nằm ở container
    }

    // Gọi Core Engine
    return await coreCapture(elementToCapture, baseTitle, finalPresetClass, options);
};