import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// O'zingizning Firebase konfiguratsiyangizni bu yerga joylashtiring
// Firebase Console -> Project Settings -> General -> Web Apps
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Check if Firebase is configured (not placeholder values)
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.warn("Firebase initialization failed:", error.message);
    }
} else {
    console.warn("Firebase is not configured. Running in offline/local mode only.");
}

export { auth, db };
export default app;
