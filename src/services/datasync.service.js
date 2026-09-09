// src/services/datasync.service.js
import { doc, setDoc, getDoc, getDocFromServer, serverTimestamp, writeBatch, runTransaction } from "firebase/firestore";
import {
    firebaseStore,
    currentUser,
    userProfile,
    masterReportData,
    ycxData,
    ycxDataThangTruoc,
    pastedThiDuaReportData,
    globalCompetitionConfigs,
    localCompetitionConfigs,
    competitionData,
    luykeNameMappings,
    competitionNameMappings,
    selectedWarehouse,
    danhSachNhanVien
} from '../stores.js'; 
import { get } from 'svelte/store';
import { reportService } from './reportService.js';
import { settingsService } from './settings.service.js';
import { dataProcessing } from './dataProcessing.js';

const getDB = () => {
    const fb = get(firebaseStore);
    return fb.db;
};

// [FIX] Danh sách khoá "gộp nhiều tháng" — dùng chung giữa saveWarehouseMetadata (ghi) và
// syncHandler.js (đọc, để biết khi nào cần chặn ghi đè ít dữ liệu hơn). Trước đây khai báo
// riêng lẻ trong từng hàm, dễ quên đồng bộ khi thêm loại dữ liệu mới.
export const MULTI_MODE_KEYS = ['saved_ycx_cungkynam', 'saved_ycx_thangtruoc', 'saved_dt_ck_nam', 'saved_ycx'];

const getCurrentUserEmail = () => {
    const user = get(currentUser);
    return user ? user.email : 'unknown';
};

// [Phòng thủ phụ phía client] Đối chiếu mã kho sắp ghi với allowedWarehouses của user đang đăng nhập.
// Đây chỉ là lớp cảnh báo/skip sớm cho gọn UI - chốt chặn thật nằm ở Firestore Security Rules.
const isWarehouseAllowed = (kho) => {
    const profile = get(userProfile);
    // Chưa đăng nhập (khách vãng lai, hoặc đang tắt tạm yêu cầu đăng nhập qua config.REQUIRE_LOGIN)
    // -> không có hồ sơ để đối chiếu, không chặn, giữ đúng hành vi trước khi có lớp phòng thủ này.
    if (!profile) return true;
    if (profile.role === 'admin') return true;
    return (profile.allowedWarehouses || []).includes(kho);
};

// [Chống hồ sơ cache cũ ngay sau F5] userProfile có thể đang là bản cache cũ trong localStorage
// (từ trước khi role/allowedWarehouses được cập nhật), trong lúc bản mới thật từ Firestore chưa
// kịp tải xong ở nền. Trước khi thực sự CHẶN ghi (isWarehouseAllowed trả về false), xác nhận lại
// 1 lần trực tiếp với Firestore để tránh chặn nhầm chỉ vì cache tạm thời chưa đồng bộ kịp.
// Chỉ dùng cho saveWarehouseMetadata - không thay isWarehouseAllowed ở các chỗ gọi đồng bộ khác.
const isWarehouseAllowedFresh = async (kho) => {
    if (isWarehouseAllowed(kho)) return true;
    const user = get(currentUser);
    const db = getDB();
    if (!user || !db) return false;
    try {
        // [FIX] getDocFromServer để tránh nhận nhầm bản xem cục bộ tạm thời của 1 lệnh ghi
        // (vd upsertUserRecord ở fast-boot) đang chờ server xác nhận - xem chi tiết trong
        // auth.service.js.
        const snap = await getDocFromServer(doc(db, "users", user.email));
        if (snap.exists()) {
            const freshProfile = snap.data();
            userProfile.set(freshProfile);
            if (freshProfile.role === 'admin') return true;
            return (freshProfile.allowedWarehouses || []).includes(kho);
        }
    } catch (e) {
        console.error('[DataSync] Lỗi xác nhận lại quyền kho:', e);
    }
    return false;
};

// [PHẪU THUẬT LOGIC]: Hàm vũ khí chuẩn hóa ngày tháng đa năng chống lỗi Serialize từ Cloud
const parseSafeDate = (d) => {
    if (!d) return null;
    if (d instanceof Date && !isNaN(d)) return d;
    if (!isNaN(d) && Number(d) > 30000 && Number(d) < 60000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        return new Date(excelEpoch.getTime() + Number(d) * 86400000);
    }
    if (typeof d === 'string' || typeof d === 'number') {
        const dDate = new Date(d);
        if (!isNaN(dDate.getTime())) return dDate;
        
        const str = String(d).trim();
        const parts = str.split(/[-/ ]/);
        if (parts.length >= 3) {
            if (parts[0].length === 4) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            else return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    return null;
};

export const datasyncService = {
    async saveGoalSettings(kho, type, settings) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const fieldName = type === 'luyke' ? 'luykeGoals' : 'realtimeGoals';
        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                [fieldName]: settings,
                [`${fieldName}UpdatedAt`]: serverTimestamp(),
                [`${fieldName}UpdatedBy`]: getCurrentUserEmail()
            }, { merge: true });
            console.log(`[DataSync] Đã lưu mục tiêu ${type} cho kho ${kho}`);
        } catch (error) { console.error(`[DataSync] Lỗi lưu mục tiêu ${type}:`, error); }
    },

    async loadGoalSettings(kho) {
        const db = getDB();
        if (!db || !kho) return { luyke: {}, realtime: {} };
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return { luyke: data.luykeGoals || {}, realtime: data.realtimeGoals || {} };
            }
            return { luyke: {}, realtime: {} };
        } catch (e) { return { luyke: {}, realtime: {} }; }
    },

    async savePersonalTargetRatio(kho, ratio) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                personalTargetRatio: ratio,
                personalTargetRatioUpdatedAt: serverTimestamp(),
                personalTargetRatioUpdatedBy: getCurrentUserEmail()
            }, { merge: true });
        } catch (error) { console.error(error); }
    },

    async loadPersonalTargetRatio(kho) {
        const db = getDB();
        if (!db || !kho) return 100;
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists() && docSnap.data().personalTargetRatio !== undefined) {
                return docSnap.data().personalTargetRatio;
            }
            return 100;
        } catch (e) { return 100; }
    },

    async loadAllTargetRatios(kho) {
        const db = getDB();
        if (!db || !kho) return { global: 100, categories: {} };
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    global: data.personalTargetRatio !== undefined ? data.personalTargetRatio : 100,
                    categories: data.categoryTargetRatios || {}
                };
            }
            return { global: 100, categories: {} };
        } catch (e) { return { global: 100, categories: {} }; }
    },

    async saveCategoryTargetRatio(kho, category, ratio) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                [`categoryTargetRatios.${category}`]: ratio,
                categoryTargetRatiosUpdatedAt: serverTimestamp(),
                categoryTargetRatiosUpdatedBy: getCurrentUserEmail()
            }, { merge: true });
        } catch (error) { console.error(error); }
    },

    async saveQdcConfig(kho, config) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { qdcConfig: config, qdcConfigUpdatedAt: serverTimestamp(), qdcConfigUpdatedBy: getCurrentUserEmail() }, { merge: true }); } catch (error) { console.error(error); }
    },

    async loadQdcConfig(kho) {
        const db = getDB();
        if (!db || !kho) return null;
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return (docSnap.exists() && docSnap.data().qdcConfig) ? docSnap.data().qdcConfig : null; } catch (e) { return null; }
    },

    async saveRealtimeHiddenCategories(kho, hiddenList) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { realtimeConfig: { hiddenCategories: hiddenList, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } }, { merge: true }); } catch (error) { console.error(error); }
    },

    async loadRealtimeHiddenCategories(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return (docSnap.exists() && docSnap.data().realtimeConfig) ? docSnap.data().realtimeConfig.hiddenCategories || [] : []; } catch (e) { return []; }
    },

    async savePersonalRevenueTables(kho, tables) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const personalTables = tables.filter(t => !t.isSystem);
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { personalRevenueTables: personalTables, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async loadPersonalRevenueTables(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? (docSnap.data().personalRevenueTables || []) : []; } catch(e) { return []; }
    },

    async savePersonalPerformanceTables(kho, tables) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const personalTables = tables.filter(t => !t.isSystem);
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { personalPerformanceTables: personalTables, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async loadPersonalPerformanceTables(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? (docSnap.data().personalPerformanceTables || []) : []; } catch(e) { return []; }
    },
    
    async saveDailyTrendConfigs(kho, configs) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const khoRef = doc(db, "warehouseData", kho);
        try {
            await setDoc(khoRef, {
                dailyTrendConfigs: configs,
                dailyTrendConfigsUpdatedAt: serverTimestamp(),
                dailyTrendConfigsUpdatedBy: getCurrentUserEmail()
            }, { merge: true });
        } catch (error) {
            console.error("[DataSync] Lỗi lưu cấu hình Xu Hướng Ngày:", error);
            throw error;
        }
    },
    
    async loadDailyTrendConfigs(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists() && docSnap.data().dailyTrendConfigs) {
                return docSnap.data().dailyTrendConfigs;
            }
            return [];
        } catch (error) {
            console.error("[DataSync] Lỗi tải cấu hình Xu Hướng Ngày:", error);
            return [];
        }
    },

    async saveCustomMetrics(kho, metrics) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { customMetrics: metrics, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async loadCustomMetrics(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? (docSnap.data().customMetrics || []) : []; } catch(e) { return []; }
    },

    async saveMetadataToFirestore(kho, dataType, metadata) {
        const db = getDB();
        if (!db || !kho) throw new Error("Invalid parameters.");
        if (!isWarehouseAllowed(kho)) throw new Error("Không có quyền thao tác với mã kho này.");
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = { [dataType]: { ...metadata, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch(e) { throw e; }
    },

    async savePastedDataToFirestore(kho, dataType, content, versionInfo) {
        const db = getDB();
        if (!db || !kho) throw new Error("Invalid parameters.");
        if (!isWarehouseAllowed(kho)) throw new Error("Không có quyền thao tác với mã kho này.");
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = { [dataType]: { content, ...versionInfo, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch(e) { throw e; }
    },

    async saveCompetitionConfigs(kho, configs) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { competitionConfigs: configs, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async loadCompetitionConfigs(kho) {
        const db = getDB();
        if (!db || !kho) return [];
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? (docSnap.data().competitionConfigs || []) : []; } catch(e) { return []; }
    },

    async saveSpecialPrograms(kho, programs) {
        const db = getDB();
        if (!db || !kho) return;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return; }
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { specialPrograms: programs, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async saveWarehouseMetadata(kho, key, metadata) {
        const db = getDB();
        if (!db || !kho) return false;
        if (!(await isWarehouseAllowedFresh(kho))) { console.warn(`[DataSync] Bỏ qua ghi dữ liệu: không có quyền với kho ${kho}`); return false; }
        const khoRef = doc(db, "warehouseData", kho);

        try {
            if (MULTI_MODE_KEYS.includes(key)) {
                if (metadata.isDeleted) {
                    const dataToSave = {
                        [key]: {
                            files: [],
                            isDeleted: true,
                            isMulti: true,
                            timestamp: Date.now(),
                            updatedAt: serverTimestamp(),
                            updatedBy: getCurrentUserEmail()
                        }
                    };
                    await setDoc(khoRef, dataToSave, { merge: true });
                    return true;
                }

                // [FIX] Đọc-sửa-ghi mảng `files` giờ chạy trong 1 giao dịch (transaction): nếu có
                // lượt ghi khác xen vào giữa lúc đọc và ghi (2 tab/2 người test gần nhau), Firestore
                // tự đọc lại bản mới nhất và chạy lại hàm này thay vì để 1 bên ghi đè mất tháng của bên kia.
                await runTransaction(db, async (transaction) => {
                    const docSnap = await transaction.get(khoRef);
                    let existingFiles = [];
                    if (docSnap.exists() && docSnap.data()[key]) {
                        const existingData = docSnap.data()[key];
                        if (Array.isArray(existingData.files)) existingFiles = existingData.files;
                        else if (existingData.downloadURL) existingFiles = [existingData];
                    }

                    if (metadata.uploadedMonths && metadata.uploadedMonths.length > 0) {
                        existingFiles = existingFiles.filter(f => {
                            if (!f.uploadedMonths) return f.fileName !== metadata.fileName;
                            return !f.uploadedMonths.some(m => metadata.uploadedMonths.includes(m));
                        });
                    } else {
                        existingFiles = existingFiles.filter(f => f.fileName !== metadata.fileName);
                    }

                    existingFiles.push({ ...metadata, updatedAt: new Date().toISOString(), updatedBy: getCurrentUserEmail() });

                    const dataToSave = {
                        [key]: {
                            files: existingFiles,
                            isMulti: true,
                            isDeleted: false,
                            timestamp: Date.now(),
                            updatedAt: serverTimestamp(),
                            updatedBy: getCurrentUserEmail()
                        }
                    };
                    transaction.set(khoRef, dataToSave, { merge: true });
                });
                return true;

            } else {
                // [FIX] Loại "ghi đè" (giờ công, thưởng nóng, doanh thu BI, thi đua NV...): ít dòng hơn
                // lần trước là bình thường nên không chặn, nhưng nếu phát hiện bản đang có trên Cloud
                // MỚI hơn bản sắp ghi (dấu hiệu 1 lượt ghi cũ đến muộn do độ trễ mạng), vẫn ghi theo
                // đúng thao tác người dùng vừa làm nhưng trả thêm cảnh báo để hiển thị minh bạch.
                let warning = null;
                try {
                    const existingSnap = await getDoc(khoRef);
                    const existingData = existingSnap.exists() ? existingSnap.data()[key] : null;
                    if (existingData && typeof existingData.timestamp === 'number' && typeof metadata.timestamp === 'number' && existingData.timestamp > metadata.timestamp) {
                        warning = `Đã ghi đè, nhưng phát hiện bản cập nhật lúc ${new Date(existingData.timestamp).toLocaleString('vi-VN')} bởi ${existingData.updatedBy || '?'} mới hơn bản vừa tải lên. Kiểm tra lại nếu cần.`;
                    }
                } catch (e) { /* không chặn ghi chỉ vì lỗi đọc kiểm tra thêm */ }

                const dataToSave = {
                    [key]: {
                        ...metadata,
                        isDeleted: metadata.isDeleted || false,
                        updatedAt: serverTimestamp(),
                        updatedBy: getCurrentUserEmail()
                    }
                };
                await setDoc(khoRef, dataToSave, { merge: true });
                return warning ? { success: true, warning } : true;
            }
        } catch (error) { throw error; }
    },

    async loadWarehouseData(kho) {
        const db = getDB();
        if (!db || !kho) return null;
        const khoRef = doc(db, "warehouseData", kho);
        try { const docSnap = await getDoc(khoRef); return docSnap.exists() ? docSnap.data() : null; } catch (error) { throw error; }
    },

    async deleteMonthFromMultiMetadata(kho, key, targetMonth) {
        const db = getDB();
        if (!db || !kho) return null;
        if (!isWarehouseAllowed(kho)) { console.warn(`[DataSync] Bỏ qua xóa dữ liệu: không có quyền với kho ${kho}`); return null; }
        const khoRef = doc(db, "warehouseData", kho);
        try {
            const docSnap = await getDoc(khoRef);
            if (docSnap.exists() && docSnap.data()[key]) {
                const existingData = docSnap.data()[key];
                if (Array.isArray(existingData.files)) {
                    const updatedFiles = existingData.files.filter(f => {
                        if (f.uploadedMonths) return !f.uploadedMonths.includes(targetMonth);
                        const [m, y] = targetMonth.split('/');
                        const regex = new RegExp(`(${parseInt(m, 10)}|${m})[\\s_\\-\\/]*${y}`, 'i');
                        return !regex.test(f.fileName);
                    });
                    const dataToSave = { [key]: { files: updatedFiles, isMulti: true, timestamp: Date.now(), updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
                    await setDoc(khoRef, dataToSave, { merge: true });
                    return dataToSave[key];
                }
            }
            return null;
        } catch (error) { throw error; }
    },

    async deepSyncToMobile(onProgress) {
        const db = getDB();
        if (!db) {
            if (onProgress) onProgress(0, 0, 'error', 'Không kết nối được Firestore Database');
            return;
        }

        const masterReport = get(masterReportData);
        const employeeList = masterReport?.sknv || [];
        const currentYcx = get(ycxData) || []; 
        const lastMonthYcx = get(ycxDataThangTruoc) || [];
        const thiDuaData = get(pastedThiDuaReportData) || [];
        const compDataStore = get(competitionData) || [];
        const luykeNameMaps = get(luykeNameMappings) || {};
        const compNameMaps = get(competitionNameMappings) || {};
        const wh = get(selectedWarehouse);
        const allEmps = get(danhSachNhanVien) || [];

        if (employeeList.length === 0) {
            if (onProgress) onProgress(0, 0, 'error', 'Chưa có dữ liệu tính toán để đồng bộ');
            return;
        }

        if (onProgress) onProgress(0, employeeList.length, 'processing', 'Đang thiết lập cấu hình xếp hạng...');

        try {
            const today = new Date();
            const d = today.getDate();
            let currentDay = 1, daysInMonth = 30;
            if (d === 1) {
                const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                currentDay = lastMonth.getDate(); daysInMonth = lastMonth.getDate();
            } else {
                currentDay = Math.max(d - 1, 1);
                daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            }

            const lastMonthDataMap = {};
            const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu(); 
            const targetDate = new Date(today.getFullYear(), today.getMonth() - (today.getDate() === 1 ? 2 : 1), 1); 
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();

            lastMonthYcx.forEach(row => { 
                // [PHẪU THUẬT LOGIC]: Sửa lỗi mất dữ liệu Cùng Kỳ do Cloud Serialize Date thành String. Dùng parseSafeDate thay vì instanceof
                const rowDate = parseSafeDate(row.ngayTao || row.ngay_tao || row['Ngày tạo']);
                if (!rowDate) return; 
                if (rowDate.getMonth() !== targetMonth || rowDate.getFullYear() !== targetYear) return;

                const msnvMatch = String(row.nguoiTao || '').match(/(\d+)/); 
                if (!msnvMatch) return;
                
                const isDaXuat = !row.trangThaiXuat || ['Đã xuất', 'Đã giao'].includes(row.trangThaiXuat.trim()); 
                const isBaseValid = (row.trangThaiThuTien || '').trim() === 'Đã thu' && 
                                    (row.trangThaiHuy || '').trim() === 'Chưa hủy' && 
                                    (row.tinhTrangTra || '').trim() === 'Chưa trả'; 

                if (hinhThucXuatTinhDoanhThu.has(row.hinhThucXuat) && isDaXuat && isBaseValid) { 
                    const cleanId = msnvMatch[1].trim(); 
                    lastMonthDataMap[cleanId] = (lastMonthDataMap[cleanId] || 0) + (row.revenueQuyDoi || 0); 
                }
            });

            let globalRatio = 100;
            let catRatios = {};
            try {
                const ratios = await this.loadAllTargetRatios(wh);
                globalRatio = ratios.global || 100;
                catRatios = ratios.categories || {};
            } catch(e){}

            const getWarehouseEmpCount = (empWh) => {
                const filtered = allEmps.filter(e => String(e.maKho || e.MAKHO || '').trim() === String(empWh).trim());
                return filtered.length > 0 ? filtered.length : 1;
            };

            let columnSettings = settingsService.loadPastedCompetitionViewSettings() || []; 
            const activeColumns = columnSettings.filter(col => col.visible); 

            let enrichedList = [...employeeList].map(emp => {
                const cleanCode = String(emp.maNV || emp.ma_nv || '').trim();
                const empWh = String(emp.maKho || emp.ma_kho || wh || '').trim();
                const storeEmpCount = getWarehouseEmpCount(empWh);

                const dtqdCK = lastMonthDataMap[cleanCode] || 0;
                const duKienSoCK = ((emp.doanhThuQuyDoi || 0) / currentDay) * daysInMonth - dtqdCK;

                const empThiDua = thiDuaData.find(t => String(t.maNV).trim() === cleanCode);
                let thiDuaDetailCooked = [];
                let thiDuaScore = 0;

                const stMappedData = {};
                compDataStore.forEach(item => { 
                    if (item.maKho && String(item.maKho).trim() !== empWh) return;

                    const luykeMap = luykeNameMaps && luykeNameMaps[item.name]; 
                    let linkedEmpProg = (typeof luykeMap === 'object' && luykeMap !== null) ? luykeMap.linkedEmpProgram : '';
                    if (linkedEmpProg) {
                        const specificRatio = catRatios[item.name] || globalRatio;
                        const rawTarget = (parseFloat(item.target) || 0) * (specificRatio / 100); 
                        const isQty = item.type === 'soLuong'; 
                        const pTarget = (isQty ? Math.ceil(rawTarget / storeEmpCount) : Math.round(rawTarget / storeEmpCount)); 
                        stMappedData[linkedEmpProg] = pTarget; 
                    }
                });

                const categoryTargets = {};
                columnSettings.forEach(col => { categoryTargets[col.tenGoc] = stMappedData[col.tenGoc] || 0; });

                if (empThiDua && empThiDua.competitions) {
                    activeColumns.forEach(col => { 
                        const compData = empThiDua.competitions.find(c => c.tenGoc === col.tenGoc); 
                        const val = compData?.giaTri || 0; 
                        const target = categoryTargets[col.tenGoc] || 0; 
                        const projectedVal = (val / currentDay) * daysInMonth; 

                        const isCompleted = (target > 0 && projectedVal >= target) || (target === 0 && val > 0); 
                        if (isCompleted) thiDuaScore++;

                        thiDuaDetailCooked.push({
                            name: compNameMaps[col.tenGoc] || col.label || col.tenGoc,
                            luyKe: val,
                            target: target,
                            hoanThanhValue: target > 0 ? (projectedVal / target) * 100 : (val > 0 ? 100 : 0)
                        });
                    });
                }

                let categoryHierarchy = [];
                let totalCat = { sl: 0, dt: 0, dtqd: 0 };
                
                try {
                    if (currentYcx && currentYcx.length > 0) {
                        const empTxs = currentYcx.filter(tx => {
                            const txNv = String(tx.ma_nv || tx.maNV || '').trim();
                            const txTao = String(tx.nguoiTao || '');
                            return txNv === cleanCode || txTao.includes(cleanCode);
                        });

                        const hierarchyMap = {};
                        const hinhThucSet = (typeof dataProcessing?.getHinhThucXuatTinhDoanhThu === 'function') 
                                            ? dataProcessing.getHinhThucXuatTinhDoanhThu() 
                                            : new Set();

                        empTxs.forEach(tx => {
                            const tXuat = String(tx.trangThaiXuat || tx.trang_thai_xuat || '').trim();
                            const isDaXuat = !tXuat || ['Đã xuất', 'Đã giao'].includes(tXuat);
                            
                            const tThu = String(tx.trangThaiThuTien || tx.trang_thai_thu_tien || '').trim();
                            const tHuy = String(tx.trangThaiHuy || tx.trang_thai_huy || '').trim();
                            const tTra = String(tx.tinhTrangTra || tx.tinh_trang_tra || '').trim();
                            const isBaseValid = (tThu === 'Đã thu' && tHuy === 'Chưa hủy' && tTra === 'Chưa trả');
                            
                            const hThuc = String(tx.hinhThucXuat || tx.hinh_thuc_xuat || '');
                            const isHinhThucValid = hinhThucSet.size === 0 || hinhThucSet.has(hThuc);

                            if (isDaXuat && isBaseValid && isHinhThucValid) {
                                const nganhStr = String(tx.nganh_hang || tx.nganhHang || tx['Ngành hàng'] || tx.NganhHang || 'Khác');
                                const nhomStr = String(tx.nhom_hang || tx.nhomHang || tx['Nhóm hàng'] || tx.NhomHang || 'Khác');
                                
                                const sl = Number(tx.soLuong || tx.so_luong || tx['Số lượng'] || tx.quantity) || 0;
                                let dt = Number(tx.revenue || tx.doanhThu || tx.doanh_thu || tx['Doanh thu']) || 0;
                                let dtqd = Number(tx.revenueQuyDoi || tx.doanhThuQuyDoi || tx['Doanh thu quy đổi']) || 0;

                                if (!hierarchyMap[nganhStr]) hierarchyMap[nganhStr] = { name: nganhStr, sl: 0, dt: 0, dtqd: 0, childrenMap: {} };
                                
                                hierarchyMap[nganhStr].sl += sl;
                                hierarchyMap[nganhStr].dt += dt;
                                hierarchyMap[nganhStr].dtqd += dtqd;

                                if (!hierarchyMap[nganhStr].childrenMap[nhomStr]) hierarchyMap[nganhStr].childrenMap[nhomStr] = { name: nhomStr, sl: 0, dt: 0, dtqd: 0 };
                                
                                hierarchyMap[nganhStr].childrenMap[nhomStr].sl += sl;
                                hierarchyMap[nganhStr].childrenMap[nhomStr].dt += dt;
                                hierarchyMap[nganhStr].childrenMap[nhomStr].dtqd += dtqd;
                            }
                        });

                        categoryHierarchy = Object.values(hierarchyMap).map(nganh => ({
                            name: nganh.name, sl: nganh.sl, dt: nganh.dt, dtqd: nganh.dtqd,
                            children: Object.values(nganh.childrenMap).sort((a, b) => b.dt - a.dt)
                        })).sort((a, b) => b.dt - a.dt);
                    }

                    if (categoryHierarchy.length === 0 && emp.doanhThuTheoNhomHang) {
                        categoryHierarchy = Object.entries(emp.doanhThuTheoNhomHang)
                            .filter(([name, data]) => (data.revenue || 0) > 0 || (data.quantity || 0) > 0)
                            .map(([name, data]) => {
                                const dt = data.revenue || 0;
                                const dtqd = data.revenueQuyDoi || 0;
                                const sl = data.quantity || 0;
                                return {
                                    name: name, sl: sl, dt: dt, dtqd: dtqd,
                                    children: [{ name: name, sl: sl, dt: dt, dtqd: dtqd }]
                                };
                            }).sort((a,b) => b.dt - a.dt);
                    }

                    totalCat = categoryHierarchy.reduce((acc, curr) => {
                        acc.sl += curr.sl; acc.dt += curr.dt; acc.dtqd += curr.dtqd;
                        return acc;
                    }, {sl: 0, dt: 0, dtqd: 0});

                } catch(e) { console.error("Lỗi build hierarchy", e); }

                return { ...emp, cleanCode, dtqdCK, duKienSoCK, thiDuaScore, thiDuaDetailCooked, categoryHierarchy, totalCat };
            });

            const total = enrichedList.length;

            enrichedList.sort((a, b) => (b.doanhThu || 0) - (a.doanhThu || 0));
            enrichedList.forEach((e, i) => e.rankDtThuc = i + 1);

            enrichedList.sort((a, b) => (b.doanhThuQuyDoi || 0) - (a.doanhThuQuyDoi || 0));
            enrichedList.forEach((e, i) => e.rankDtqd = i + 1);

            enrichedList.sort((a, b) => (b.hieuQuaQuyDoi || 0) - (a.hieuQuaQuyDoi || 0));
            enrichedList.forEach((e, i) => e.rankTyLe = i + 1);

            enrichedList.sort((a, b) => (a.tyLeTraCham || 0) - (b.tyLeTraCham || 0)); 
            enrichedList.forEach((e, i) => e.rankTraCham = i + 1);

            enrichedList.sort((a, b) => (b.duKienSoCK || 0) - (a.duKienSoCK || 0));
            enrichedList.forEach((e, i) => e.rankDuKien = i + 1);

            enrichedList.sort((a, b) => (b.thiDuaScore || 0) - (a.thiDuaScore || 0));
            enrichedList.forEach((e, i) => e.rankThiDua = i + 1);

            const warehouseGroups = {};
            enrichedList.forEach(emp => {
                const empWh = String(emp.maKho || emp.ma_kho || wh || 'UNKNOWN').trim();
                if (empWh === 'UNKNOWN' || empWh === 'ALL') return;
                
                if (!warehouseGroups[empWh]) warehouseGroups[empWh] = [];
                
                warehouseGroups[empWh].push({
                    maNV: emp.cleanCode,
                    hoTen: emp.hoTen || emp.ten_nv || '',
                    maKho: empWh,
                    data: {
                        doanhThu: emp.doanhThu || 0,
                        doanhThuQuyDoi: emp.doanhThuQuyDoi || 0,
                        hieuQuaQuyDoi: emp.hieuQuaQuyDoi || 0,
                        tyLeTraCham: emp.tyLeTraCham || 0,
                        dtqdCK: emp.dtqdCK || 0,
                        duKienSoCK: emp.duKienSoCK || 0,
                        
                        rankDtThuc: emp.rankDtThuc, 
                        rankDtqd: emp.rankDtqd,
                        rankTyLe: emp.rankTyLe,
                        rankTraCham: emp.rankTraCham,
                        rankDuKien: emp.rankDuKien,
                        rankThiDua: emp.rankThiDua,
                        totalEmployees: total,

                        categoryHierarchy: emp.categoryHierarchy,
                        totalCat: emp.totalCat,
                        
                        thiDuaDetail: emp.thiDuaDetailCooked,
                        thiDuaScore: emp.thiDuaScore
                    }
                });
            });

            const targetWarehouseCodes = Object.keys(warehouseGroups).filter(code => {
                const allowed = isWarehouseAllowed(code);
                if (!allowed) console.warn(`[DataSync] Bỏ qua đồng bộ kho ${code}: không có quyền.`);
                return allowed;
            });
            let index = 0;

            for (const currentWhCode of targetWarehouseCodes) {
                const empsInStore = warehouseGroups[currentWhCode];
                
                const finalStoreDocRef = doc(db, 'sknv_final_data', currentWhCode);
                await setDoc(finalStoreDocRef, {
                    maKho: currentWhCode,
                    employees: empsInStore,
                    autoSyncedAt: serverTimestamp()
                }, { merge: true });

                const metaRef = doc(db, 'sknv_metadata', currentWhCode);
                await setDoc(metaRef, {
                    lastUpdated: Date.now(), 
                    rowCount: empsInStore.length,
                    updatedBy: getCurrentUserEmail()
                }, { merge: true });

                index++;
                if (onProgress) onProgress(index, targetWarehouseCodes.length, 'processing', `Đang đồng bộ gói dữ liệu kho ${currentWhCode} (${index}/${targetWarehouseCodes.length})...`);
            }

            if (onProgress) onProgress(targetWarehouseCodes.length, targetWarehouseCodes.length, 'success', '✓ Đã hoàn tất đóng gói và đồng bộ siêu tiết kiệm xuống App!');
        } catch (error) {
            console.error("[DataSync] Lỗi luồng Deep Sync Phương án B:", error);
            if (onProgress) onProgress(0, 0, 'error', `Thất bại: ${error.message}`);
        }
    }
};