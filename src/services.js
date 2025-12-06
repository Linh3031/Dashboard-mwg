// MODULE: SERVICES FACADE
// File này đóng vai trò điều phối, nhập khẩu các module logic con và export chúng ra ngoài.

// Không import config, appState, ui, utils ở đây để tránh vòng lặp
// Các service con sẽ tự import những thứ chúng cần từ 'stores.js'

import { dataProcessing } from './services/dataProcessing.js'; 
import { reportService } from './services/reportService.js';
import { composerService } from './services/composerService.js';

// Gộp tất cả vào object services
export const services = {
    ...dataProcessing,
    ...reportService,
    ...composerService
};