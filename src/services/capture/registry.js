import { processDefault } from './processors/default.js';
import { processKpiGrid } from './processors/kpi-grid.js';
import { processCompetitionGrid } from './processors/competition-grid.js';
import { processMobileView } from './processors/mobile-view.js';

export const getProcessor = (groupName) => {
    // 1. Nhóm Chi tiết nhân viên -> Mobile View (Grid 3 cột)
    if (groupName === 'revenue-detail-mobile') {
        return processMobileView;
    }

    // 2. Nhóm KPI Màu (Lũy kế) -> Grid Cứng
    if (['kpi', 'supermarket-kpi'].includes(groupName)) {
        return (els, title, opts) => processKpiGrid(els, title, { ...opts, mode: 'normal' });
    }
    
    // 3. Nhóm Grid 4 Cột (Tier 2)
    if (['tier2'].includes(groupName)) {
        return (els, title, opts) => processKpiGrid(els, title, { ...opts, mode: 'grid-4' });
    }

    // 4. Nhóm Thi đua & Chi tiết (SKNV, Realtime) -> Grid Linh hoạt
    // Đã loại bỏ 'regional-competition' để trả nó về processDefault (Gộp dọc, ôm sát 1100px)
    if (['detail-category', 'competition-detail'].includes(groupName)) {
        return processCompetitionGrid;
    }

    // 5. Mặc định (Gộp dọc)
    return processDefault;
};

export const SPLIT_GROUPS = [
    'category-revenue', 'competition-program', 'efficiency-program', 'performance-table'
];