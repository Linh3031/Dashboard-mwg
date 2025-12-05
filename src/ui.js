// src/ui.js
// MODULE: UI FACADE

// 1. Các file đã có (Active)
import { uiAdmin } from './ui-admin.js';
import { formatters } from './ui-formatters.js';
import { notifications } from './ui-notifications.js';

// 2. Các file CHƯA CÓ (Tạm thời comment lại để không lỗi Build)
// import { uiComponents } from './ui-components.js';
// import { uiLuyke } from './ui-luyke.js';
// import { uiSknv } from './ui-sknv.js';
// import { uiRealtime } from './ui-realtime.js';
// import { uiThiDuaVung } from './ui-thidua-vung.js';
// import { uiCompetition } from './ui-competition.js';
// import { uiReports } from './ui-reports.js';
// import { uiFilters } from './ui-filters.js'; 
// import { uiHome } from './ui-home.js';

const ui = {
    // Mở rộng các module đã có
    ...uiAdmin,
    ...formatters,
    ...notifications,
    
    // Placeholder cho các module chưa có (để tránh lỗi 'undefined' khi gọi)
    // Ví dụ: Nếu code gọi ui.populateAllFilters() mà chưa có thì nó sẽ không crash
};

export { ui };