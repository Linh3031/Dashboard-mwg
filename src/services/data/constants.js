import { 
    danhSachNhanVien, rawGioCongData, ycxData, thuongNongData,
    ycxDataThangTruoc, thuongNongDataThangTruoc, thuongERPData, 
    thuongERPDataThangTruoc, competitionData, pastedThiDuaReportData
} from '../../stores.js';
import { dataProcessing } from '../dataProcessing.js';

export const LOCAL_DSNV_FILENAME_KEY = '_localDsnvFilename';

export const FILE_MAPPING = {
    'saved_danhsachnv': { store: danhSachNhanVien, normalizeType: 'danhsachnv', name: 'DS Nhân viên', localOnly: true },
    'saved_giocong': { store: rawGioCongData, normalizeType: 'giocong', name: 'Giờ công' },
    'saved_ycx': { store: ycxData, normalizeType: 'ycx', name: 'YCX Lũy kế' },
    'saved_thuongnong': { store: thuongNongData, normalizeType: 'thuongnong', name: 'Thưởng nóng' },
    'saved_ycx_thangtruoc': { store: ycxDataThangTruoc, normalizeType: 'ycx', name: 'YCX Tháng trước' },
    'saved_thuongnong_thangtruoc': { store: thuongNongDataThangTruoc, normalizeType: 'thuongnong', name: 'Thưởng nóng TT' }
};

export const PASTE_MAPPING = {
    'daily_paste_luyke': { 
        processFunc: dataProcessing.parseCompetitionDataFromLuyKe, 
        store: competitionData,
        isThiDuaNV: false,
        name: 'Data Lũy Kế'
    },
    'daily_paste_thuongerp': { 
        processFunc: dataProcessing.processThuongERP, 
        store: thuongERPData,
        isThiDuaNV: false,
        name: 'Thưởng ERP'
    },
    'saved_thuongerp_thangtruoc': { 
        processFunc: dataProcessing.processThuongERP, 
        store: thuongERPDataThangTruoc,
        isThiDuaNV: false,
        name: 'Thưởng ERP (TT)'
    },
    'daily_paste_thiduanv': { 
        processFunc: dataProcessing.processThiDuaNhanVienData, 
        store: pastedThiDuaReportData,
        isThiDuaNV: true,
        name: 'Thi đua NV'
    }
};