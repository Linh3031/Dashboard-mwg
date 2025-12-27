import { get } from 'svelte/store';
import { firebaseStore, isAdmin } from '../../stores.js'; // Lưu ý: ../../ vì đang ở trong services/declarations

export const getDB = () => {
    const fb = get(firebaseStore);
    if (!fb.db) {
        console.warn("Firestore chưa được khởi tạo.");
        return null;
    }
    return fb.db;
};

export const notify = (msg, type='info') => {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    if(type === 'success' || type === 'error') alert(msg);
};

export const sanitizeForFirestore = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        return value === undefined ? null : value;
    }));
};

export const checkAdmin = () => {
    if (!get(isAdmin)) {
        notify("Bạn cần quyền Admin để thực hiện thao tác này!", "error");
        return false;
    }
    return true;
};
