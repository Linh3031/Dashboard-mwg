// src/services.js
// MODULE: SERVICES FACADE
// File này đóng vai trò trung gian để gom các service logic lại, giúp các component gọi gọn hơn.

// Import các service con hiện có trong dự án Svelte
import { dataProcessing } from './services/dataProcessing.js'; 
import { reportService } from './services/reportService.js';
import { composerService } from './services/composerService.js';

// Gộp tất cả vào object services để export
// Các component có thể gọi: services.calculateSpecialProductReport(...)
export const services = {
    ...dataProcessing,
    ...reportService,
    ...composerService
};