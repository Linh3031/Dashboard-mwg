// src/services/reportService.js
// Version 3.0 - Modular Facade
// File này chỉ đóng vai trò điều phối, logic đã được tách ra thư mục reports/

import { masterReportLogic } from './reports/master.report.js';
import { competitionReportLogic } from './reports/competition.report.js';
import { detailReportLogic } from './reports/detail.report.js';
import { generalReportLogic } from './reports/general.report.js';

export const reportService = {
    ...masterReportLogic,
    ...competitionReportLogic,
    ...detailReportLogic,
    ...generalReportLogic
};