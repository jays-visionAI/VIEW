import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase variables
let app: any;
let db: any;
let auth: any;
let functions: any;

try {
    // Check if config is still placeholder
    if (firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
        console.warn("Firebase config is missing. Please update firebase.ts");
    } else {
        console.log("Firebase Config Loading:", {
            apiKeyExists: !!firebaseConfig.apiKey,
            apiKeyLength: firebaseConfig.apiKey?.length,
            projectId: firebaseConfig.projectId
        });

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        functions = getFunctions(app);

        // Connect to emulators if running locally
        // if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        //     console.log('🔗 Connecting to Firebase Emulators...');
        //     connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        //     connectFirestoreEmulator(db, 'localhost', 8080);
        //     connectFunctionsEmulator(functions, 'localhost', 5001);
        // }
    }
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

export { app, db, auth, functions };
