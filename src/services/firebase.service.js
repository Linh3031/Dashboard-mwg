// File: src/services/firebase.service.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseStore } from '../stores.js';

// Config từ dự án cũ (Firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyAQ3TWcpa4AnTN-32igGseYDlXrCf1BVew",
  authDomain: "qlst-9e6bd.firebaseapp.com",
  projectId: "qlst-9e6bd",
  storageBucket: "qlst-9e6bd.firebasestorage.app",
  messagingSenderId: "2316705291",
  appId: "1:2316705291:web:ebec2963816aea7585b10e",
  measurementId: "G-M0SM0XHCEK"
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
            throw error;
        }
    }
};