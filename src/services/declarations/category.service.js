import { doc, setDoc, getDoc } from "firebase/firestore";
import { 
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
    luykeNameMappings // [NEW] Import store mới
} from '../../stores.js';
import { getDB, notify, sanitizeForFirestore, checkAdmin } from './utils.js';

export const categoryService = {
    // --- CATEGORY & BRAND STRUCTURE ---
    async saveCategoryDataToFirestore(data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
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

    // --- MAPPINGS & CONFIGS GLOBAL (LOAD ALL) ---
    async loadMappingsGlobal() {
        const db = getDB();
        if (!db) return;
        try {
            console.log("[declarations.category] Đang tải cấu hình Mapping & Data từ Cloud...");
            const safeGet = (docSnap, defaultVal = []) => {
                if (!docSnap.exists()) return defaultVal;
                const d = docSnap.data();
                return d.data || d.items || d.mappings || d.configs || d.list || defaultVal;
            };
            const docsToLoad = [
                "macroCategoryConfig", "macroProductGroupConfig", "categoryNameMapping", 
                "groupNameMapping", "brandNameMapping", "efficiencyConfig", 
                "qdcConfig", "competitionNameMappings", "categoryStructure", "brandList",
                "luykeNameMappings" // [NEW] Thêm file cấu hình thi đua siêu thị vào tiến trình tải lúc khởi động
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
            luykeNameMappings.set(safeGet(results[10], {})); // [NEW] Nạp dữ liệu vào store

            console.log("[declarations.category] Đã tải xong Mapping & Configs.");
        } catch (error) {
            console.error("Error loading mappings:", error);
        }
    },

    // --- MACRO CONFIGS ---
    async saveMacroCategoryConfig(data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
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
        } catch (e) { console.error("Lỗi tải macroCategoryConfig:", e); return defaultData; }
    },

    async saveMacroProductGroupConfig(data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
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
        } catch (e) { console.error("Lỗi tải macroProductGroupConfig:", e); return defaultData; }
    },

    // --- NAME MAPPINGS ---
    async saveNameMapping(type, data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
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
        if (!checkAdmin()) return;
        try {
            const docRef = doc(db, "declarations", "competitionNameMappings");
            await setDoc(docRef, { mappings: sanitizeForFirestore(mappings) });
            notify('Đã lưu Bảng Ánh Xạ Tên Thi Đua thành công!', 'success');
        } catch (error) {
            console.error("Lỗi khi lưu Bảng Ánh Xạ Tên Thi Đua:", error);
            notify('Lỗi khi lưu tên rút gọn lên cloud.', 'error');
        }
    },

    // [NEW] Lưu và tải mapping riêng biệt cho Thi đua Siêu thị
    async saveLuykeNameMappings(mappings) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
        try {
            const docRef = doc(db, "declarations", "luykeNameMappings");
            await setDoc(docRef, { mappings: sanitizeForFirestore(mappings) });
            notify('Đã lưu Tên rút gọn Thi đua Siêu thị thành công!', 'success');
        } catch (error) {
            console.error("Lỗi khi lưu Tên rút gọn Thi đua Siêu thị:", error);
            notify('Lỗi khi lưu tên rút gọn lên cloud.', 'error');
        }
    },

    async loadLuykeNameMappings() {
        const db = getDB();
        if (!db) return {};
        try {
            const docRef = doc(db, "declarations", "luykeNameMappings");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const d = docSnap.data();
                return d.mappings || {};
            }
            return {};
        } catch (error) {
            console.error("Lỗi khi tải Tên rút gọn Thi đua Siêu thị:", error);
            return {};
        }
    },

    // --- SPECIAL PRODUCTS ---
    async saveSpecialProductList(products) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!checkAdmin()) return;
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
};