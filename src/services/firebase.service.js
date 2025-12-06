// src/services/firebase.service.js
// Version 2.2 - Update Firebase Config with user provided credentials
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseStore } from '../stores.js';

// Cấu hình Firebase mới của bạn
const firebaseConfig = {
  apiKey: "AIzaSyD-006CUo_l9AjUgK-2JI1VEdGWaKVGoRQ",
  authDomain: "dashboard-svelte-new.firebaseapp.com",
  projectId: "dashboard-svelte-new",
  storageBucket: "dashboard-svelte-new.firebasestorage.app",
  messagingSenderId: "1073291821920",
  appId: "1:1073291821920:web:5b1a44ca639e6229a3d405"
};

export const firebaseService = {
    initCore() {
        try {
            console.log("[FirebaseService] Initializing Firebase...");
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);
            const storage = getStorage(app);

            // Cập nhật store để các service khác sử dụng
            firebaseStore.set({
                app,
                auth,
                db,
                storage
            });

            console.log("[FirebaseService] Firebase initialized successfully!");
            return { app, auth, db, storage };
        } catch (error) {
            console.error("[FirebaseService] Initialization failed:", error);
            // Không throw error để app vẫn chạy được các tính năng offline
            return null;
        }
    }
};