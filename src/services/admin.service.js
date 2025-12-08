// src/services/admin.service.js
// Version 2.7 - Split Mapping Load Logic
import { get } from 'svelte/store';
import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore"; 
import { 
    firebaseStore, 
    isAdmin, 
    homeConfig, 
    macroCategoryConfig, 
    categoryNameMapping, 
    groupNameMapping,
    brandNameMapping,
    categoryStructure, 
    brandList          
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

export const adminService = {
    // ... [GIỮ NGUYÊN CÁC HÀM CŨ: saveHelpContent, saveHomeConfig, loadHomeConfig, saveCategoryDataToFirestore] ...
    
    // Hàm cũ (Giữ nguyên phần đầu, nhưng tham chiếu đến hàm dưới)
    async saveHelpContent(contents) { /* ... Giữ nguyên code cũ ... */ 
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
        } catch (error) { console.error("Error saving help content:", error); notify('Lỗi khi lưu nội dung hướng dẫn.', 'error'); }
    },

    async saveHomeConfig(configData) { /* ... Giữ nguyên code cũ ... */
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL (Firebase chưa sẵn sàng)!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần đăng nhập quyền Admin để lưu cấu hình!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "homeConfig");
            await setDoc(docRef, { data: configData });
            homeConfig.set(configData);
            notify('Đã lưu cấu hình Trang chủ thành công!', 'success');
        } catch (error) { console.error("Error saving home config:", error); notify('Lỗi khi lưu cấu hình trang chủ: ' + error.message, 'error'); }
    },

    async loadHomeConfig() { /* ... Giữ nguyên code cũ ... */
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

    async saveCategoryDataToFirestore(data) { /* ... Giữ nguyên code cũ ... */
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const categoryRef = doc(db, "declarations", "categoryStructure");
            await setDoc(categoryRef, { data: data.categories || [] });
            const brandRef = doc(db, "declarations", "brandList");
            await setDoc(brandRef, { data: data.brands || [] });
            notify('Đồng bộ dữ liệu khai báo thành công!', 'success');
        } catch (error) { console.error("Error saving category data:", error); notify('Lỗi khi đồng bộ dữ liệu lên cloud.', 'error'); }
    },

    // [MỚI] Hàm chỉ tải các Mapping (Nhẹ, dùng Global)
    async loadMappingsGlobal() {
        const db = getDB();
        if (!db) return;
        
        try {
            console.log("[admin.service] Đang tải cấu hình Mapping từ Cloud...");
            // Load song song các doc mapping để tối ưu tốc độ
            const docsToLoad = ["macroCategoryConfig", "categoryNameMapping", "groupNameMapping", "brandNameMapping"];
            const promises = docsToLoad.map(id => getDoc(doc(db, "declarations", id)));
            
            const results = await Promise.all(promises);
            
            if (results[0].exists()) macroCategoryConfig.set(results[0].data().data || []);
            if (results[1].exists()) categoryNameMapping.set(results[1].data().data || {});
            if (results[2].exists()) groupNameMapping.set(results[2].data().data || {});
            if (results[3].exists()) brandNameMapping.set(results[3].data().data || {});

            console.log("[admin.service] Đã tải xong Mapping.");
        } catch (error) {
            console.error("Error loading mappings:", error);
        }
    },

    // Hàm tải dữ liệu cho trang Admin (Nặng hơn, tải cả cấu trúc Excel)
    async loadCategoryDataFromFirestore() {
        const db = getDB();
        if (!db) return { categories: [], brands: [] };
        
        // Gọi hàm tải mapping trước
        await this.loadMappingsGlobal();

        try {
            // Chỉ tải phần cấu trúc nặng ở đây
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

    // ... [GIỮ NGUYÊN CÁC HÀM CÒN LẠI: saveMacroCategoryConfig, saveNameMapping, loadDeclarationsFromFirestore, saveDeclarationsToFirestore, loadCompetitionNameMappings, saveCompetitionNameMappings, saveSpecialProductList, loadSpecialProductList, loadGlobalSpecialPrograms, loadGlobalCompetitionConfigs, saveGlobalCompetitionConfigs] ...
    
    async saveMacroCategoryConfig(data) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "macroCategoryConfig");
            await setDoc(docRef, { data: data });
            notify('Đã lưu Cấu hình Nhóm Ngành Hàng lớn!', 'success');
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
            await setDoc(docRef, { data: data });
            notify(`Đã lưu Mapping tên ${type}!`, 'success');
        } catch (error) { console.error(error); notify('Lỗi lưu mapping: ' + error.message, 'error'); }
    },

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

    async loadCompetitionNameMappings() {
        const db = getDB();
        if (!db) return {};
        try {
            const docRef = doc(db, "declarations", "competitionNameMappings");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().mappings || {}) : {};
        } catch (error) { console.error("Error loading mappings:", error); return {}; }
    },

    async saveCompetitionNameMappings(mappings) {
        const db = getDB();
        if (!db) return; 
        if (!get(isAdmin)) return; 
        try {
            const docRef = doc(db, "declarations", "competitionNameMappings");
            await setDoc(docRef, { mappings: mappings });
        } catch (error) { console.error("Error saving mappings:", error); }
    },

    async saveSpecialProductList(products) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "specialProductList");
            await setDoc(docRef, { products: products });
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

    async loadGlobalCompetitionConfigs() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().configs || []) : [];
        } catch (error) { return []; }
    },

    async saveGlobalCompetitionConfigs(configs) {
        const db = getDB();
        if (!db) { notify("Lỗi kết nối CSDL!", "error"); return; }
        if (!get(isAdmin)) { notify("Bạn cần quyền Admin!", "error"); return; }
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            await setDoc(docRef, { configs: configs });
        } catch (error) { console.error("Error saving global comps:", error); }
    }
};