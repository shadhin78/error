import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

async function initializeFirebase() {
    // First load from localStorage to populate UI immediately in memory and ensure zero latency / offline support
    const hasLocalData = window.loadLocalData();

    try {
        if (Object.keys(window.firebaseConfig).length > 0) {
            const app = initializeApp(window.firebaseConfig);
            // Use pure memory cache for guaranteed instant cross-device WebSockets
            window.db = getFirestore(app);
            window.auth = getAuth(app);

            onAuthStateChanged(window.auth, async (user) => {
                if (user) {
                    window.userId = user.uid;
                    const loader = document.getElementById('loading-message');
                    if (loader) { loader.textContent = 'Syncing Data...'; loader.classList.remove('hidden'); }
                    if (typeof window.loadTasks === 'function') {
                        await window.loadTasks();
                    }
                } else {
                    if (!window.initialAuthToken) await signInAnonymously(window.auth);
                }
            });

            if (window.initialAuthToken) await signInWithCustomToken(window.auth, window.initialAuthToken);
        } else { 
            // Local-only mode
            window.isAppLoading = false;
            if (typeof window.renderUI === 'function') window.renderUI();
        }
    } catch (error) { 
        console.error("Firebase initialization failed, falling back to local-only mode:", error);
        window.isAppLoading = false;
        if (typeof window.renderUI === 'function') window.renderUI(); 
    }
}

window.initializeFirebase = initializeFirebase;

export { initializeFirebase };
