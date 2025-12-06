// src/services/admin.service.js
// Version 1.2 - Add LocalStorage backup for offline testing
import { get } from 'svelte/store';
import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore"; 
import { firebaseStore, isAdmin } from '../stores.js';

const getDB = () => {
    const fb = get(firebaseStore);
    if (!fb.db) {
        // console.warn("Firestore chưa được khởi tạo."); // Tắt log này để đỡ rối khi dev
        return null;
    }
    return fb.db;
};

const notify = (msg, type='info') => {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    if(type === 'success' || type === 'error') {
        // Có thể dùng store notification sau này
        // alert(msg); 
    }
};

// Helper để lưu/tải LocalStorage
const saveToLocal = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`[AdminService] Đã sao lưu ${key} vào LocalStorage.`);
    } catch (e) {
        console.error(`Lỗi lưu LocalStorage ${key}:`, e);
    }
};

const loadFromLocal = (key, defaultValue) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            console.log(`[AdminService] Đã tải ${key} từ LocalStorage.`);
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error(`Lỗi đọc LocalStorage ${key}:`, e);
    }
    return defaultValue;
};

export const adminService = {
    async saveHelpContent(contents) {
        saveToLocal('backup_helpContent', contents); // Backup
        
        const db = getDB();
        if (!db || !get(isAdmin)) return;
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

    async saveCategoryDataToFirestore(data) {
        // 1. Luôn lưu vào LocalStorage trước (cho chế độ Test)
        saveToLocal('backup_categoryData', data);

        // 2. Lưu lên Cloud nếu có thể
        const db = getDB();
        if (!db || !get(isAdmin)) {
            notify('Đã lưu cấu trúc ngành hàng vào trình duyệt (Chế độ Offline).', 'success');
            return;
        }

        try {
            const categoryRef = doc(db, "declarations", "categoryStructure");
            await setDoc(categoryRef, { data: data.categories || [] });
            
            const brandRef = doc(db, "declarations", "brandList");
            await setDoc(brandRef, { data: data.brands || [] });
            
            notify('Đồng bộ dữ liệu khai báo thành công!', 'success');
        } catch (error) {
            console.error("Error saving category data:", error);
            notify('Lỗi khi đồng bộ dữ liệu lên cloud, nhưng đã lưu cục bộ.', 'error');
        }
    },

    async loadCategoryDataFromFirestore() {
        const db = getDB();
        let categories = [];
        let brands = [];
        let loadedFromCloud = false;

        if (db) {
            try {
                const declarationsCollection = collection(db, "declarations");
                const querySnapshot = await getDocs(declarationsCollection);
                querySnapshot.forEach((doc) => {
                    if (doc.id === "categoryStructure") categories = doc.data().data || [];
                    else if (doc.id === "brandList") brands = doc.data().data || [];
                });
                if (categories.length > 0 || brands.length > 0) loadedFromCloud = true;
            } catch (error) {
                console.error("Error loading category data:", error);
            }
        }

        // Fallback: Nếu Cloud rỗng hoặc lỗi, lấy từ LocalStorage
        if (!loadedFromCloud) {
            const localData = loadFromLocal('backup_categoryData', { categories: [], brands: [] });
            if (localData.categories.length > 0) {
                console.warn("[AdminService] Sử dụng dữ liệu Ngành hàng/Hãng từ LocalStorage.");
                return localData;
            }
        }

        return { categories, brands };
    },

    async loadDeclarationsFromFirestore() {
        const db = getDB();
        // Tải LocalStorage trước làm mặc định
        let declarations = loadFromLocal('backup_declarations', {});
        
        if (!db) return declarations; 

        try {
            const declarationIds = ['hinhThucXuat', 'hinhThucXuatGop', 'heSoQuyDoi'];
            const cloudDeclarations = {};
            let hasCloudData = false;

            await Promise.all(declarationIds.map(async (id) => {
                const docRef = doc(db, "declarations", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    cloudDeclarations[id] = docSnap.data().content || '';
                    hasCloudData = true;
                }
            }));

            if (hasCloudData) return { ...declarations, ...cloudDeclarations };
            return declarations;

        } catch (error) {
            console.error("Error loading declarations:", error);
            return declarations;
        }
    },

    async saveDeclarationsToFirestore(declarations) {
        saveToLocal('backup_declarations', declarations);

        const db = getDB();
        if (!db || !get(isAdmin)) {
            notify('Đã lưu khai báo tính toán vào trình duyệt.', 'success');
            return;
        }
        try {
            await Promise.all([
                setDoc(doc(db, "declarations", "hinhThucXuat"), { content: declarations.ycx }),
                setDoc(doc(db, "declarations", "hinhThucXuatGop"), { content: declarations.ycxGop }),
                setDoc(doc(db, "declarations", "heSoQuyDoi"), { content: declarations.heSo })
            ]);
            notify('Đồng bộ khai báo tính toán thành công!', 'success');
        } catch (error) {
            console.error("Error saving declarations:", error);
            notify('Lỗi đồng bộ cloud, đã lưu cục bộ.', 'error');
        }
    },

    async loadCompetitionNameMappings() {
        const localMappings = loadFromLocal('backup_competitionNameMappings', {});

        const db = getDB();
        if (!db) return localMappings;

        try {
            const docRef = doc(db, "declarations", "competitionNameMappings");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().mappings || {};
            }
            return localMappings;
        } catch (error) {
            console.error("Error loading mappings:", error);
            return localMappings;
        }
    },

    async saveCompetitionNameMappings(mappings) {
        saveToLocal('backup_competitionNameMappings', mappings);

        const db = getDB();
        if (!db || !get(isAdmin)) return;
        try {
            const docRef = doc(db, "declarations", "competitionNameMappings");
            await setDoc(docRef, { mappings: mappings });
        } catch (error) {
            console.error("Error saving mappings:", error);
        }
    },

    async saveSpecialProductList(products) {
        saveToLocal('backup_specialProductList', products);

        const db = getDB();
        if (!db || !get(isAdmin)) {
            notify('Đã lưu SPĐQ vào trình duyệt.', 'success');
            return;
        }
        try {
            const docRef = doc(db, "declarations", "specialProductList");
            await setDoc(docRef, { products: products });
            notify('Đã lưu Danh sách SPĐQ thành công!', 'success');
        } catch (error) {
            console.error("Error saving special product list:", error);
            notify('Lỗi lưu cloud, đã lưu cục bộ.', 'error');
        }
    },

    async loadSpecialProductList() {
        const db = getDB();
        let loadedFromCloud = false;
        let products = [];

        if (db) {
            try {
                const docRef = doc(db, "declarations", "specialProductList");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    products = docSnap.data().products || [];
                    loadedFromCloud = true;
                }
            } catch (error) {
                console.error("Error loading SPĐQ:", error);
            }
        }

        if (!loadedFromCloud) {
            const localProducts = loadFromLocal('backup_specialProductList', []);
            if (localProducts.length > 0) {
                console.warn("[AdminService] Sử dụng SPĐQ từ LocalStorage.");
                return localProducts;
            }
        }
        return products;
    },

    async loadGlobalSpecialPrograms() {
        const localProgs = loadFromLocal('backup_globalSpecialPrograms', []);

        const db = getDB();
        if (!db) return localProgs;

        try {
            const docRef = doc(db, "declarations", "globalSpecialPrograms");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) return docSnap.data().programs || [];
            return localProgs;
        } catch (error) { return localProgs; }
    },

    async loadGlobalCompetitionConfigs() {
        const localConfigs = loadFromLocal('backup_globalCompetitionConfigs', []);

        const db = getDB();
        if (!db) return localConfigs;

        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().configs || [];
            }
            return localConfigs;
        } catch (error) { return localConfigs; }
    },

    async saveGlobalCompetitionConfigs(configs) {
        saveToLocal('backup_globalCompetitionConfigs', configs);

        const db = getDB();
        if (!db || !get(isAdmin)) {
            notify('Đã lưu Cấu hình Thi đua vào trình duyệt.', 'success');
            return;
        }
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            await setDoc(docRef, { configs: configs });
            notify('Đã lưu Cấu hình Thi Đua Chung lên cloud!', 'success');
        } catch (error) {
            console.error("Error saving global comps:", error);
            notify('Lỗi lưu cloud, đã lưu cục bộ.', 'error');
        }
    }
};