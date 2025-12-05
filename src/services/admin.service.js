// src/services/admin.service.js
import { get } from 'svelte/store';
import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore"; 
import { firebaseStore, isAdmin } from '../stores.js';

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
    // ... (Giữ nguyên saveHelpContent) ...
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
            return { categories, brands };
        } catch (error) {
            console.error("Error loading category data:", error);
            return { categories: [], brands: [] };
        }
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

    async saveSpecialProductList(products) {
        const db = getDB();
        if (!db || !get(isAdmin)) return;
        try {
            const docRef = doc(db, "declarations", "specialProductList");
            await setDoc(docRef, { products: products });
            notify('Đã lưu Danh sách SPĐQ thành công!', 'success');
        } catch (error) {
            console.error("Error saving special product list:", error);
            notify('Lỗi khi lưu danh sách SPĐQ.', 'error');
        }
    },
};