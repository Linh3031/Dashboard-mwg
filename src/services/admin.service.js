// src/services/admin.service.js
// Version 3.4 - Fix: Load Category & Brand globally
import { get } from 'svelte/store';
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
// [MỚI] Thêm import cho Firebase Storage
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { 
    firebaseStore, 
    isAdmin, 
    homeConfig, 
    macroCategoryConfig, 
    macroProductGroupConfig, 
    categoryNameMapping, 
    groupNameMapping,
    brandNameMapping,
    categoryStructure, 
    brandList,
    efficiencyConfig,
    qdcConfigStore,
    competitionNameMappings,
    customPerformanceTables
} from '../stores.js';

const getDB = () => {
    const fb = get(firebaseStore);
    if (!fb.db) {
        console.warn("Firestore chưa được khởi tạo.");
        return null;
    }
    return fb.db;
};

const notify = (msg, type='info') => {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    if(type === 'success' || type === 'error') alert(msg);
};

const sanitizeForFirestore = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        return value === undefined ? null : value;
    }));
};

export const adminService = {
    // --- 1. HELP CONTENT ---
    async saveHelpContent(contents) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin để thực hiện thao tác này!", "error"); return; }
        try {
            await Promise.all([
                setDoc(doc(db, "help_content", "data"), { content: contents.data }),
                setDoc(doc(db, "help_content", "luyke"), { content: contents.luyke }),
                setDoc(doc(db, "help_content", "sknv"), { content: contents.sknv }),
                setDoc(doc(db, "help_content", "realtime"), { content: contents.realtime })
            ]);
            notify('Đã cập nhật nội dung hướng dẫn thành công!', 'success');
        } catch (error) { 
            console.error("Error saving help content:", error); 
            notify('Lỗi khi lưu nội dung hướng dẫn.', 'error'); 
        }
    },

    // --- 2. HOME CONFIG ---
    async saveHomeConfig(configData) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "homeConfig");
            await setDoc(docRef, { data: sanitizeForFirestore(configData) });
            homeConfig.set(configData);
            notify('Đã lưu cấu hình Trang chủ thành công!', 'success');
        } catch (error) { 
            console.error("Error saving home config:", error); 
            notify('Lỗi khi lưu cấu hình trang chủ: ' + error.message, 'error'); 
        }
    },

    async loadHomeConfig() {
        const db = getDB();
        if (!db) return;
        try {
            const docRef = doc(db, "declarations", "homeConfig");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const raw = docSnap.data();
                const data = raw.data || raw.config || raw;
                if (data) homeConfig.set(data);
            }
        } catch (error) { console.error("Error loading home config:", error); }
    },

    // --- 3. CATEGORY & BRAND STRUCTURE ---
    async saveCategoryDataToFirestore(data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const categoryRef = doc(db, "declarations", "categoryStructure");
            await setDoc(categoryRef, { data: sanitizeForFirestore(data.categories || []) });
            const brandRef = doc(db, "declarations", "brandList");
            await setDoc(brandRef, { data: sanitizeForFirestore(data.brands || []) });
            notify('Đồng bộ dữ liệu khai báo thành công!', 'success');
        } catch (error) { 
            console.error("Error saving category data:", error); 
            notify('Lỗi khi đồng bộ dữ liệu lên cloud.', 'error'); 
        }
    },

    async loadCategoryDataFromFirestore() {
        const db = getDB();
        if (!db) return { categories: [], brands: [] };
        
        try {
            const catRef = doc(db, "declarations", "categoryStructure");
            const brandRef = doc(db, "declarations", "brandList");
            const [catSnap, brandSnap] = await Promise.all([getDoc(catRef), getDoc(brandRef)]);
            const getArray = (snap) => {
                if (!snap.exists()) return [];
                const d = snap.data();
                return d.data || d.items || d.list || [];
            };
            const categories = getArray(catSnap);
            const brands = getArray(brandSnap);
            
            categoryStructure.set(categories);
            brandList.set(brands);
            return { categories, brands };
        } catch (error) {
            console.error("Error loading category data:", error);
            return { categories: [], brands: [] };
        }
    },

    // --- 4. SYSTEM REVENUE TABLES (BẢNG DOANH THU) ---
    async loadSystemRevenueTables() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "systemRevenueTables");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                const tables = d.tables || d.data || d.items || [];
                console.log(`[AdminService] Loaded ${tables.length} system revenue tables.`);
                return tables;
            }
            return [];
        } catch (e) {
            console.error("Lỗi tải bảng hệ thống:", e);
            return [];
        }
    },

    async saveSystemRevenueTables(tables) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        const systemTables = tables.filter(t => t.isSystem).map(t => sanitizeForFirestore(t));
        try {
            const docRef = doc(db, "declarations", "systemRevenueTables");
            await setDoc(docRef, { 
                tables: systemTables,
                updatedAt: serverTimestamp() 
            });
            notify(`Đã lưu ${systemTables.length} bảng doanh thu hệ thống lên Cloud!`, 'success');
        } catch (error) { 
            console.error("Firebase Error Full:", error); 
            notify('Lỗi lưu bảng hệ thống: ' + error.message, 'error'); 
        }
    },

    // --- 4.5. SYSTEM PERFORMANCE TABLES (BẢNG HIỆU QUẢ) ---
    async loadSystemPerformanceTables() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "systemPerformanceTables");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                const tables = d.tables || d.data || [];
                console.log(`[AdminService] Loaded ${tables.length} system performance tables.`);
                return tables;
            }
            return [];
        } catch (e) {
            console.error("Lỗi tải bảng hiệu quả hệ thống:", e);
            return [];
        }
    },

    async saveSystemPerformanceTables(tables) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        
        const systemTables = tables.filter(t => t.isSystem).map(t => sanitizeForFirestore(t));
        
        try {
            const docRef = doc(db, "declarations", "systemPerformanceTables");
            await setDoc(docRef, { 
                tables: systemTables,
                updatedAt: serverTimestamp() 
            });
            notify(`Đã lưu ${systemTables.length} bảng hiệu quả hệ thống lên Cloud!`, 'success');
        } catch (error) { 
            console.error("Lỗi lưu bảng hiệu quả hệ thống:", error);
            notify('Lỗi lưu bảng hiệu quả hệ thống: ' + error.message, 'error'); 
        }
    },

    // --- 5. MAPPINGS & CONFIGS GLOBAL ---
    async loadMappingsGlobal() {
        const db = getDB();
        if (!db) return;
        try {
            console.log("[admin.service] Đang tải cấu hình Mapping & Data từ Cloud...");
            const safeGet = (docSnap, defaultVal = []) => {
                if (!docSnap.exists()) return defaultVal;
                const d = docSnap.data();
                return d.data || d.items || d.mappings || d.configs || d.list || defaultVal;
            };

            const docsToLoad = [
                "macroCategoryConfig", 
                "macroProductGroupConfig", 
                "categoryNameMapping", 
                "groupNameMapping", 
                "brandNameMapping",
                "efficiencyConfig", 
                "qdcConfig",
                "competitionNameMappings",
                "categoryStructure",
                "brandList"
            ];
            
            const promises = docsToLoad.map(id => getDoc(doc(db, "declarations", id)));
            const results = await Promise.all(promises);
            
            macroCategoryConfig.set(safeGet(results[0]));
            macroProductGroupConfig.set(safeGet(results[1]));
            categoryNameMapping.set(safeGet(results[2], {}));
            groupNameMapping.set(safeGet(results[3], {}));
            brandNameMapping.set(safeGet(results[4], {}));
            efficiencyConfig.set(safeGet(results[5])); 
            qdcConfigStore.set(safeGet(results[6]));
            competitionNameMappings.set(safeGet(results[7], {}));
            categoryStructure.set(safeGet(results[8]));
            brandList.set(safeGet(results[9]));

            console.log("[admin.service] Đã tải xong Mapping & Configs (bao gồm Cấu trúc).");
        } catch (error) {
            console.error("Error loading mappings:", error);
        }
    },

    async saveMacroCategoryConfig(data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "macroCategoryConfig");
            await setDoc(docRef, { data: sanitizeForFirestore(data) });
            notify('Đã lưu Cấu hình Nhóm Ngành Hàng lớn!', 'success');
        } catch (error) { console.error(error); notify('Lỗi lưu cấu hình: ' + error.message, 'error'); }
    },

    async loadMacroCategoryConfig() {
        const db = getDB();
        const defaultData = [
            { id: 'macro_dt', name: 'ĐIỆN TỬ', items: ['dt_tivi', 'dt_loa', 'Tivi', 'Loa', 'Dàn âm thanh', 'Tivi - Loa - Dàn máy'] },
            { id: 'macro_dl', name: 'ĐIỆN LẠNH', items: ['dl_maylanh', 'dl_tulanh', 'dl_maygiat', 'Tủ lạnh', 'Máy lạnh', 'Máy giặt', 'Tủ đông', 'Tủ mát'] },
            { id: 'macro_gd', name: 'GIA DỤNG', items: ['gd_quat', 'gd_noi', 'Gia dụng', 'Quạt', 'Nồi cơm', 'Bếp', 'Máy xay', 'Máy ép'] },
            { id: 'macro_ict', name: 'ICT', items: ['ict_laptop', 'ict_phone', 'Laptop', 'Điện thoại', 'Tablet', 'Phụ kiện', 'Máy tính bảng'] }
        ];

        if (!db) return defaultData;
        try {
            const docRef = doc(db, "declarations", "macroCategoryConfig");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                const data = d.data || d.items || d.config || [];
                if (data.length > 0) return data;
            }
            return defaultData;
        } catch (e) {
            console.error("Lỗi tải macroCategoryConfig:", e);
            return defaultData;
        }
    },

    async saveMacroProductGroupConfig(data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "macroProductGroupConfig");
            await setDoc(docRef, { data: sanitizeForFirestore(data) });
            notify('Đã lưu Cấu hình Nhóm Hàng Lớn!', 'success');
        } catch (error) { console.error(error); notify('Lỗi lưu cấu hình: ' + error.message, 'error'); }
    },

    async loadMacroProductGroupConfig() {
        const db = getDB();
        const defaultData = [];

        if (!db) return defaultData;
        try {
            const docRef = doc(db, "declarations", "macroProductGroupConfig");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                const data = d.data || d.items || d.config || [];
                if (data.length > 0) return data;
            }
            return defaultData;
        } catch (e) {
            console.error("Lỗi tải macroProductGroupConfig:", e);
            return defaultData;
        }
    },

    async saveNameMapping(type, data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        let docId = '';
        if (type === 'category') docId = 'categoryNameMapping';
        else if (type === 'group') docId = 'groupNameMapping';
        else if (type === 'brand') docId = 'brandNameMapping';
        try {
            const docRef = doc(db, "declarations", docId);
            await setDoc(docRef, { data: sanitizeForFirestore(data) });
            notify(`Đã lưu Mapping tên ${type}!`, 'success');
        } catch (error) { console.error(error); notify('Lỗi lưu mapping: ' + error.message, 'error'); }
    },

    async saveCompetitionNameMappings(mappings) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "competitionNameMappings");
            await setDoc(docRef, { mappings: sanitizeForFirestore(mappings) });
            notify('Đã lưu Bảng Ánh Xạ Tên Thi Đua thành công!', 'success');
        } catch (error) {
            console.error("Lỗi khi lưu Bảng Ánh Xạ Tên Thi Đua:", error);
            notify('Lỗi khi lưu tên rút gọn lên cloud.', 'error');
        }
    },

    // --- 6. LOGIC & CALCULATION ---
    async loadDeclarationsFromFirestore() {
        const db = getDB();
        if (!db) return {}; 
        try {
            const declarationIds = ['hinhThucXuat', 'hinhThucXuatGop', 'heSoQuyDoi'];
            const declarations = {};
            await Promise.all(declarationIds.map(async (id) => {
                const docRef = doc(db, "declarations", id);
                const docSnap = await getDoc(docRef);
                declarations[id] = docSnap.exists() ? (docSnap.data().content || '') : '';
            }));
            return declarations;
        } catch (error) { console.error("Error loading declarations:", error); return {}; }
    },

    async saveDeclarationsToFirestore(declarations) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            await Promise.all([
                setDoc(doc(db, "declarations", "hinhThucXuat"), { content: declarations.ycx }),
                setDoc(doc(db, "declarations", "hinhThucXuatGop"), { content: declarations.ycxGop }),
                setDoc(doc(db, "declarations", "heSoQuyDoi"), { content: declarations.heSo })
            ]);
            notify('Đồng bộ khai báo tính toán thành công!', 'success');
        } catch (error) { console.error("Error saving declarations:", error); notify('Lỗi khi đồng bộ khai báo tính toán.', 'error'); }
    },

    // --- 7. COMPETITION CONFIGS ---
    async saveGlobalCompetitionConfigs(configs) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            await setDoc(docRef, { configs: sanitizeForFirestore(configs) });
        } catch (error) { console.error("Error saving global comps:", error); }
    },

    async loadGlobalCompetitionConfigs() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                return d.configs || d.data || [];
            }
            return [];
        } catch (error) { return []; }
    },

    // --- 8. SPECIAL PRODUCTS ---
    async saveSpecialProductList(products) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "specialProductList");
            await setDoc(docRef, { products: sanitizeForFirestore(products) });
            notify('Đã lưu Danh sách SPĐQ thành công!', 'success');
        } catch (error) { console.error("Error saving special product list:", error); notify('Lỗi khi lưu danh sách SPĐQ.', 'error'); }
    },

    async loadSpecialProductList() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "specialProductList");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                return d.products || d.data || [];
            }
            return [];
        } catch (error) { console.error("Error loading SPĐQ:", error); return []; }
    },

    async loadGlobalSpecialPrograms() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "globalSpecialPrograms");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                return d.programs || d.configs || d.data || [];
            }
            return [];
        } catch (error) { return []; }
    },

    // --- 9. EFFICIENCY & QDC CONFIGS ---
    async saveEfficiencyConfig(config) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        
        try {
            const docRef = doc(db, "declarations", "efficiencyConfig");
            await setDoc(docRef, { 
                data: sanitizeForFirestore(config),
                updatedAt: serverTimestamp() 
            });
            efficiencyConfig.set(config);
            notify('Đã lưu cấu hình Bảng Hiệu quả hệ thống!', 'success');
        } catch (e) { 
            console.error(e); 
            notify('Lỗi lưu config: ' + e.message, 'error'); 
        }
    },

    async loadEfficiencyConfig() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "efficiencyConfig");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                const data = d.data || d.items || d.config || [];
                console.log(`[AdminService] Loaded efficiency config: ${data.length} items`);
                return data;
            }
            return [];
        } catch (e) { 
            console.error("Lỗi tải efficiency config:", e);
            return []; 
        }
    },
    
    async saveQdcConfig(selectedGroups) {
         const db = getDB();
        if (!db || !get(isAdmin)) return;
        try {
            const docRef = doc(db, "declarations", "qdcConfig");
            await setDoc(docRef, { data: sanitizeForFirestore(selectedGroups) });
            qdcConfigStore.set(selectedGroups);
        } catch (e) { console.error(e); }
    },
    
    async loadQdcConfig() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "qdcConfig");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                return d.data || d.config || d.items || [];
            }
            return [];
        } catch (e) { return []; }
    },

    // [MỚI] Hàm upload ảnh sử dụng Firebase Storage
    async uploadImage(file, folder = 'slides') {
        const fb = get(firebaseStore);
        // Kiểm tra storage đã được khởi tạo trong firebaseStore chưa
        if (!fb.storage) {
            console.warn("Firebase Storage chưa được khởi tạo trong firebaseStore.");
            // Fallback: Nếu không có storage, trả về null để code bên ngoài xử lý
            return null;
        }

        try {
            // Tạo tên file unique
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(fb.storage, `${folder}/${fileName}`);
            
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Upload failed:", error);
            throw error;
        }
    }
};