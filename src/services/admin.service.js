// src/services/admin.service.js
// Version 1.0 - Ported from old project (Firestore Interactions)
import { get } from 'svelte/store';
import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore"; 
import { firebaseStore, isAdmin, currentUser } from '../stores.js';

// Helper để lấy DB từ store
const getDB = () => {
    const fb = get(firebaseStore);
    if (!fb.db) {
        console.warn("Firestore chưa được khởi tạo.");
        return null;
    }
    return fb.db;
};

// Helper thông báo (Tạm thời dùng alert, sau này sẽ hook vào notification store)
const notify = (msg, type='info') => {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    // Sau này sẽ gọi notification store
    if(type === 'error') alert(msg);
};

export const adminService = {
    // --- HƯỚNG DẪN SỬ DỤNG ---
    async saveHelpContent(contents) {
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

    // --- DANH MỤC & CẤU TRÚC ---
    async saveCategoryDataToFirestore(data) {
        const db = getDB();
        if (!db || !get(isAdmin)) return;
        
        try {
            const categoryRef = doc(db, "declarations", "categoryStructure");
            await setDoc(categoryRef, { data: data.categories || [] });
            
            const brandRef = doc(db, "declarations", "brandList");
            await setDoc(brandRef, { data: data.brands || [] });
            
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
            const declarationsCollection = collection(db, "declarations");
            const querySnapshot = await getDocs(declarationsCollection);
            let categories = [];
            let brands = [];
            
            querySnapshot.forEach((doc) => {
                if (doc.id === "categoryStructure") categories = doc.data().data || [];
                else if (doc.id === "brandList") brands = doc.data().data || [];
            });
            
            console.log(`Loaded ${categories.length} categories and ${brands.length} brands from Firestore.`);
            return { categories, brands };
        } catch (error) {
            console.error("Error loading category data:", error);
            return { categories: [], brands: [] };
        }
    },

    // --- KHAI BÁO TÍNH TOÁN ---
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
        } catch (error) {
            console.error("Error loading declarations:", error);
            return {};
        }
    },

    async saveDeclarationsToFirestore(declarations) {
        const db = getDB();
        if (!db || !get(isAdmin)) return;

        try {
            await Promise.all([
                setDoc(doc(db, "declarations", "hinhThucXuat"), { content: declarations.ycx }),
                setDoc(doc(db, "declarations", "hinhThucXuatGop"), { content: declarations.ycxGop }),
                setDoc(doc(db, "declarations", "heSoQuyDoi"), { content: declarations.heSo })
            ]);
            notify('Đồng bộ khai báo tính toán thành công!', 'success');
        } catch (error) {
            console.error("Error saving declarations:", error);
            notify('Lỗi khi đồng bộ khai báo tính toán.', 'error');
        }
    },

    // --- TÊN RÚT GỌN THI ĐUA ---
    async loadCompetitionNameMappings() {
        const db = getDB();
        if (!db) return {};

        try {
            const docRef = doc(db, "declarations", "competitionNameMappings");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().mappings || {}) : {};
        } catch (error) {
            console.error("Error loading competition mappings:", error);
            return {};
        }
    },

    async saveCompetitionNameMappings(mappings) {
        const db = getDB();
        if (!db || !get(isAdmin)) return;

        try {
            const docRef = doc(db, "declarations", "competitionNameMappings");
            await setDoc(docRef, { mappings: mappings });
            console.log("Saved competition mappings.");
        } catch (error) {
            console.error("Error saving competition mappings:", error);
        }
    },

    // --- CẤU HÌNH THI ĐUA CHUNG (GLOBAL) ---
    async loadGlobalCompetitionConfigs() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().configs || []) : [];
        } catch (error) {
            console.error("Error loading global competition configs:", error);
            return [];
        }
    },

    async saveGlobalCompetitionConfigs(configs) {
        const db = getDB();
        if (!db || !get(isAdmin)) return;
        try {
            const docRef = doc(db, "declarations", "globalCompetitionConfigs");
            await setDoc(docRef, { configs: configs });
            notify('Đã lưu Cấu hình Thi Đua Chung!', 'success');
        } catch (error) {
            console.error("Error saving global competition configs:", error);
            notify('Lỗi khi lưu cấu hình thi đua chung.', 'error');
        }
    },

    // --- SẢN PHẨM ĐẶC QUYỀN (SPĐQ) ---
    async loadSpecialProductList() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "specialProductList");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().products || []) : [];
        } catch (error) {
            console.error("Error loading special product list:", error);
            return [];
        }
    },

    async saveSpecialProductList(products) {
        const db = getDB();
        if (!db || !get(isAdmin)) return;
        try {
            const docRef = doc(db, "declarations", "specialProductList");
            await setDoc(docRef, { products: products });
            notify('Đã lưu Danh sách SPĐQ!', 'success');
        } catch (error) {
            console.error("Error saving special product list:", error);
            notify('Lỗi khi lưu danh sách SPĐQ.', 'error');
        }
    },

    async loadGlobalSpecialPrograms() {
        const db = getDB();
        if (!db) return [];
        try {
            const docRef = doc(db, "declarations", "globalSpecialPrograms");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data().programs || []) : [];
        } catch (error) {
            console.error("Error loading special programs:", error);
            return [];
        }
    },

    async saveGlobalSpecialPrograms(programs) {
        const db = getDB();
        if (!db || !get(isAdmin)) return;
        try {
            const docRef = doc(db, "declarations", "globalSpecialPrograms");
            await setDoc(docRef, { programs: programs });
            notify('Đã lưu Cấu hình CT SPĐQ!', 'success');
        } catch (error) {
            console.error("Error saving special programs:", error);
            notify('Lỗi khi lưu cấu hình CT SPĐQ.', 'error');
        }
    }
};