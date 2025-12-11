// src/services/admin.service.js
import { get } from 'svelte/store';
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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
    competitionNameMappings // [MỚI] Import store này
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
                const data = docSnap.data().data;
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
        
        await this.loadMappingsGlobal();

        try {
            const catRef = doc(db, "declarations", "categoryStructure");
            const brandRef = doc(db, "declarations", "brandList");
            
            const [catSnap, brandSnap] = await Promise.all([getDoc(catRef), getDoc(brandRef)]);
            
            const categories = catSnap.exists() ? (catSnap.data().data || []) : [];
            const brands = brandSnap.exists() ? (brandSnap.data().data || []) : [];

            categoryStructure.set(categories);
            brandList.set(brands);

            return { categories, brands };
        } catch (error) {
            console.error("Error loading category data:", error);
            return { categories: [], brands: [] };
        }
    },

    // --- 4. SYSTEM REVENUE TABLES ---
    async loadSystemRevenueTables() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "systemRevenueTables");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().tables || []) : [];
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
            notify(`Đã lưu ${systemTables.length} bảng mẫu hệ thống lên Cloud!`, 'success');
        } catch (error) { 
            console.error("Firebase Error Full:", error); 
            notify('Lỗi lưu bảng hệ thống: ' + error.message, 'error'); 
        }
    },

    // --- 5. MAPPINGS & CONFIGS GLOBAL ---
    async loadMappingsGlobal() {
        const db = getDB();
        if (!db) return;
        
        try {
            console.log("[admin.service] Đang tải cấu hình Mapping từ Cloud...");
            const docsToLoad = [
                "macroCategoryConfig", 
                "macroProductGroupConfig", 
                "categoryNameMapping", 
                "groupNameMapping", 
                "brandNameMapping",
                "efficiencyConfig", 
                "qdcConfig",
                "competitionNameMappings" // [MỚI] Load thêm mapping thi đua
            ];
            const promises = docsToLoad.map(id => getDoc(doc(db, "declarations", id)));
            
            const results = await Promise.all(promises);
            
            if (results[0].exists()) macroCategoryConfig.set(results[0].data().data || []);
            if (results[1].exists()) macroProductGroupConfig.set(results[1].data().data || []);
            if (results[2].exists()) categoryNameMapping.set(results[2].data().data || {});
            if (results[3].exists()) groupNameMapping.set(results[3].data().data || {});
            if (results[4].exists()) brandNameMapping.set(results[4].data().data || {});
            if (results[5].exists()) efficiencyConfig.set(results[5].data().data || []);
            if (results[6].exists()) qdcConfigStore.set(results[6].data().data || []);
            
            // [MỚI] Set store mapping thi đua
            if (results[7].exists()) competitionNameMappings.set(results[7].data().mappings || {});

            console.log("[admin.service] Đã tải xong Mapping & Configs.");
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

    // [MỚI] Hàm lưu Mapping tên thi đua
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
            return docSnap.exists() ? (docSnap.data().configs || []) : [];
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
            return docSnap.exists() ? (docSnap.data().products || []) : [];
        } catch (error) { console.error("Error loading SPĐQ:", error); return []; }
    },

    async loadGlobalSpecialPrograms() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "globalSpecialPrograms");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().programs || []) : [];
        } catch (error) { return []; }
    },

    // --- 9. EFFICIENCY & QDC CONFIGS ---
    async saveEfficiencyConfig(config) {
        const db = getDB();
        if (!db || !get(isAdmin)) return;
        try {
            const docRef = doc(db, "declarations", "efficiencyConfig");
            await setDoc(docRef, { data: sanitizeForFirestore(config) });
            efficiencyConfig.set(config);
            notify('Đã lưu cấu hình bảng Hiệu quả!', 'success');
        } catch (e) { console.error(e); notify('Lỗi lưu config: ' + e.message, 'error'); }
    },

    async loadEfficiencyConfig() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "efficiencyConfig");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().data || []) : [];
        } catch (e) { return []; }
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
            return docSnap.exists() ? (docSnap.data().data || []) : [];
        } catch (e) { return []; }
    }
};