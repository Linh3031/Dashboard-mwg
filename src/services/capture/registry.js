import { processDefault } from './processors/default.js';
import { processKpiGrid } from './processors/kpi-grid.js';
import { processCompetitionGrid } from './processors/competition-grid.js';

// CẤU HÌNH LOGIC TẠI ĐÂY
export const getProcessor = (groupName) => {
    // 1. Nhóm KPI Màu (Lũy kế) -> Grid Cứng
    if (['kpi', 'supermarket-kpi'].includes(groupName)) {
        return (els, title, opts) => processKpiGrid(els, title, { ...opts, mode: 'normal' });
    }
    
    // 2. Nhóm Grid 4 Cột (Tier 2)
    if (['tier2'].includes(groupName)) {
        return (els, title, opts) => processKpiGrid(els, title, { ...opts, mode: 'grid-4' });
    }

    // 3. Nhóm Thi đua & Chi tiết (SKNV, Realtime) -> Grid Linh hoạt
    // Đã thêm 'detail-category' và 'regional-competition' vào đây
    if (['regional-competition', 'detail-category', 'competition-detail'].includes(groupName)) {
        return processCompetitionGrid;
    }

    // 4. Mặc định (Gộp dọc)
    return processDefault;
};

// Danh sách các nhóm cần tách ảnh (Split)
export const SPLIT_GROUPS = [
    'category-revenue', 'competition-program', 'efficiency-program'
];