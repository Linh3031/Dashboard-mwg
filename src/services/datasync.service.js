// src/services/datasync.service.js
import { doc, setDoc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore"; 
import { 
    firebaseStore, 
    currentUser,
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

const getCurrentUserEmail = () => {
    const user = get(currentUser);
    return user ? user.email : 'unknown';
};

export const datasyncService = {
    async saveGoalSettings(kho, type, settings) {
        const db = getDB();
        if (!db || !kho) return;
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

    async saveQdcConfig(kho, config) {
        const db = getDB();
        if (!db || !kho) return;
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

    async saveCustomMetrics(kho, metrics) {
        const db = getDB();
        if (!db || !kho) return;
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
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = { [dataType]: { ...metadata, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch(e) { throw e; }
    },

    async savePastedDataToFirestore(kho, dataType, content, versionInfo) {
        const db = getDB();
        if (!db || !kho) throw new Error("Invalid parameters.");
        const khoRef = doc(db, "warehouseData", kho);
        const dataToSave = { [dataType]: { content, ...versionInfo, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
        try { await setDoc(khoRef, dataToSave, { merge: true }); } catch(e) { throw e; }
    },

    async saveCompetitionConfigs(kho, configs) {
        const db = getDB();
        if (!db || !kho) return;
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
        const khoRef = doc(db, "warehouseData", kho);
        try { await setDoc(khoRef, { specialPrograms: programs, updatedAt: serverTimestamp() }, { merge: true }); } catch (error) { throw error; }
    },

    async saveWarehouseMetadata(kho, key, metadata) {
        const db = getDB();
        if (!db || !kho) return;
        const khoRef = doc(db, "warehouseData", kho);
        const multiModeKeys = ['saved_ycx', 'saved_ycx_cungkynam', 'saved_ycx_thangtruoc'];
        try {
            if (multiModeKeys.includes(key)) {
                const docSnap = await getDoc(khoRef);
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
                const dataToSave = { [key]: { files: existingFiles, isMulti: true, timestamp: Date.now(), updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
                await setDoc(khoRef, dataToSave, { merge: true });
            } else {
                const dataToSave = { [key]: { ...metadata, updatedAt: serverTimestamp(), updatedBy: getCurrentUserEmail() } };
                await setDoc(khoRef, dataToSave, { merge: true });
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

// =========================================================================
    // [CodeGenesis V4] HÀM ĐỒNG BỘ CHI TIẾT SÂU - CÂY PHÂN CẤP NGÀNH HÀNG
    // =========================================================================
    async deepSyncToMobile(onProgress) {
        const db = getDB();
        if (!db) {
            if (onProgress) onProgress(0, 0, 'error', 'Không kết nối được Firestore Database');
            return;
        }

        const masterReport = get(masterReportData);
        const employeeList = masterReport?.sknv || [];
        const currentYcx = get(ycxData) || []; // Lấy YCX hiện tại để build cây ngành hàng
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
            // 1. Tính toán thời gian
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

            // 2. Tính Doanh thu tháng trước
            const lastMonthDataMap = {};
            const hinhThucXuatTinhDoanhThu = dataProcessing.getHinhThucXuatTinhDoanhThu(); 
            const targetDate = new Date(today.getFullYear(), today.getMonth() - (today.getDate() === 1 ? 2 : 1), 1); 
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();

            lastMonthYcx.forEach(row => { 
                if (!row.ngayTao || !(row.ngayTao instanceof Date)) return; 
                if (row.ngayTao.getMonth() !== targetMonth || row.ngayTao.getFullYear() !== targetYear) return;

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

            // 3. Cấu hình Thi Đua
            let targetRatio = 100;
            try { targetRatio = await this.loadPersonalTargetRatio(wh) || 100; } catch(e){}

            const filteredEmps = wh && wh !== 'ALL' ? allEmps.filter(e => String(e.maKho) === String(wh) || String(e.MAKHO) === String(wh)) : allEmps; 
            const totalEmployeesCount = filteredEmps.length > 0 ? filteredEmps.length : 1; 

            const stMappedData = {};
            compDataStore.forEach(item => { 
                const luykeMap = luykeNameMaps && luykeNameMaps[item.name]; 
                let linkedEmpProg = (typeof luykeMap === 'object' && luykeMap !== null) ? luykeMap.linkedEmpProgram : '';
                if (linkedEmpProg) {
                    const rawTarget = (parseFloat(item.target) || 0) * (targetRatio / 100); 
                    const isQty = item.type === 'soLuong'; 
                    const pTarget = totalEmployeesCount > 0 ? (isQty ? Math.ceil(rawTarget / totalEmployeesCount) : Math.round(rawTarget / totalEmployeesCount)) : 0; 
                    stMappedData[linkedEmpProg] = pTarget; 
                }
            });

            let columnSettings = settingsService.loadPastedCompetitionViewSettings() || []; 
            const categoryTargets = {};
            columnSettings.forEach(col => { categoryTargets[col.tenGoc] = stMappedData[col.tenGoc] || 0; });
            const activeColumns = columnSettings.filter(col => col.visible); 

            // 4. TIỀN XỬ LÝ ĐỂ XẾP HẠNG & BUILD CÂY NGÀNH HÀNG
            let enrichedList = [...employeeList].map(emp => {
                const cleanCode = String(emp.maNV || emp.ma_nv || '').trim();
                const dtqdCK = lastMonthDataMap[cleanCode] || 0;
                const duKienSoCK = ((emp.doanhThuQuyDoi || 0) / currentDay) * daysInMonth - dtqdCK;

                const empThiDua = thiDuaData.find(t => String(t.maNV).trim() === cleanCode);
                let thiDuaDetailCooked = [];
                let thiDuaScore = 0;

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

// [CodeGenesis] BUILD CÂY NGÀNH HÀNG -> NHÓM HÀNG (BẢN CHỐNG MẤT DỮ LIỆU)
                let categoryHierarchy = [];
                let totalCat = { sl: 0, dt: 0, dtqd: 0 };
                
                try {
                    // BƯỚC 1: Cố gắng build từ file YCX gốc (Nếu file còn trên RAM)
                    if (currentYcx && currentYcx.length > 0) {
                        const empTxs = currentYcx.filter(tx => {
                            const txNv = String(tx.ma_nv || tx.maNV || '').trim();
                            const txTao = String(tx.nguoiTao || '');
                            return txNv === cleanCode || txTao.includes(cleanCode);
                        });

                        const hierarchyMap = {};
                        // Lấy Set hình thức xuất an toàn, chống crash
                        const hinhThucSet = (typeof dataProcessing?.getHinhThucXuatTinhDoanhThu === 'function') 
                                            ? dataProcessing.getHinhThucXuatTinhDoanhThu() 
                                            : new Set();

                        empTxs.forEach(tx => {
                            // Xử lý linh hoạt mọi định dạng key của Excel
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

                    // BƯỚC 2: PHAO CỨU SINH (Nếu YCX bị xóa do F5 trình duyệt)
                    // Bốc dữ liệu từ bản tóm tắt đã lưu cứng để dựng cây
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

                    // TÍNH LẠI TỔNG CHỐT HẠ
                    totalCat = categoryHierarchy.reduce((acc, curr) => {
                        acc.sl += curr.sl; acc.dt += curr.dt; acc.dtqd += curr.dtqd;
                        return acc;
                    }, {sl: 0, dt: 0, dtqd: 0});

                } catch(e) { console.error("Lỗi build hierarchy", e); }

                return { ...emp, cleanCode, dtqdCK, duKienSoCK, thiDuaScore, thiDuaDetailCooked, categoryHierarchy, totalCat };
            });

            // 5. CHẤM ĐIỂM 5 LOẠI XẾP HẠNG

            enrichedList.sort((a, b) => (b.doanhThu || 0) - (a.doanhThu || 0));
            enrichedList.forEach((e, i) => e.rankDtThuc = i + 1);

            enrichedList.sort((a, b) => (b.doanhThuQuyDoi || 0) - (a.doanhThuQuyDoi || 0));
            enrichedList.forEach((e, i) => e.rankDtqd = i + 1);

            enrichedList.sort((a, b) => (b.hieuQuaQuyDoi || 0) - (a.hieuQuaQuyDoi || 0));
            enrichedList.forEach((e, i) => e.rankTyLe = i + 1);

            enrichedList.sort((a, b) => (a.tyLeTraCham || 0) - (b.tyLeTraCham || 0)); // Trả chậm: Thấp là tốt (Hạng 1)
            enrichedList.forEach((e, i) => e.rankTraCham = i + 1);

            enrichedList.sort((a, b) => (b.duKienSoCK || 0) - (a.duKienSoCK || 0));
            enrichedList.forEach((e, i) => e.rankDuKien = i + 1);

            enrichedList.sort((a, b) => (b.thiDuaScore || 0) - (a.thiDuaScore || 0));
            enrichedList.forEach((e, i) => e.rankThiDua = i + 1);

            // 6. ĐẨY LÊN FIREBASE (CHUNKING)
            const CHUNK_SIZE = 10;
            const total = enrichedList.length;

            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = enrichedList.slice(i, i + CHUNK_SIZE);
                const batch = writeBatch(db);

                for (const emp of chunk) {
                    if (!emp.cleanCode) continue;

                    const mobileData = {
                        maNV: emp.cleanCode,
                        hoTen: emp.hoTen || emp.ten_nv || '',
                        maKho: emp.maKho || emp.ma_kho || '',
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
                        },
                        autoSyncedAt: serverTimestamp()
                    };

                    const docRef = doc(db, 'sknv_final_data', emp.cleanCode);
                    batch.set(docRef, mobileData, { merge: true });
                }

await batch.commit();
                const processedCount = Math.min(i + CHUNK_SIZE, total);
                if (onProgress) onProgress(processedCount, total, 'processing', `Đang đồng bộ chi tiết: ${processedCount}/${total} nhân viên...`);
                await new Promise(resolve => setTimeout(resolve, 100)); // Nghỉ 100ms
            }

            // [CodeGenesis] BẮN TÍN HIỆU METADATA (VERSION CONTROL) CHO APP STAFF
            try {
                if (wh && wh !== 'ALL') { // Đảm bảo chỉ ghi meta khi đồng bộ 1 kho cụ thể
                    const metaRef = doc(db, 'sknv_metadata', String(wh));
                    await setDoc(metaRef, {
                        lastUpdated: Date.now(), // Timestamp số nguyên dễ so sánh
                        rowCount: total,
                        updatedBy: getCurrentUserEmail()
                    }, { merge: true });
                    console.log(`[DataSync] Đã bắn tín hiệu Metadata cho Kho ${wh}`);
                }
            } catch (metaErr) {
                console.error("[DataSync] Lỗi cập nhật Metadata:", metaErr);
                // Lỗi này không làm gián đoạn thông báo thành công chính
            }

            if (onProgress) onProgress(total, total, 'success', '✓ Đã đồng bộ chi tiết và xếp hạng xuống App!');
        } catch (error) {
            console.error("[DataSync] Lỗi luồng Deep Sync:", error);
            if (onProgress) onProgress(0, 0, 'error', `Thất bại: ${error.message}`);
        }
    }
};