const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : (typeof __app_id !== 'undefined' ? __app_id : 'default-study-plan-2026');

// User's concrete Firebase configuration
const defaultFirebaseConfig = {
    apiKey: "AIzaSyAQclePrRzsnvsZSPF9s3c2pqXzy8gJpNo",
    authDomain: "project-error-78.firebaseapp.com",
    projectId: "project-error-78",
    storageBucket: "project-error-78.firebasestorage.app",
    messagingSenderId: "757218203491",
    appId: "1:757218203491:web:8e1c66ecf2c26d57b7a556"
};

let firebaseConfig = defaultFirebaseConfig;

try {
    const dynamicConfigStr = typeof window.__firebase_config !== 'undefined'
        ? window.__firebase_config
        : (typeof __firebase_config !== 'undefined' ? __firebase_config : null);

    if (dynamicConfigStr && dynamicConfigStr !== '{}') {
        firebaseConfig = JSON.parse(dynamicConfigStr);
    }
} catch (e) {
    console.error("Failed to parse dynamic Firebase config, falling back to default.", e);
}

const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : (typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null);

window.appId = appId;
window.firebaseConfig = firebaseConfig;
window.initialAuthToken = initialAuthToken;

export { appId, firebaseConfig, initialAuthToken };

