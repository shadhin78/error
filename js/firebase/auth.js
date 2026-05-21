import { auth, db } from "./config.js";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Global auth state values
window.currentUser = null;

// Render the Authentication / Profile widget dynamically
function renderAuthWidget() {
    const container = document.getElementById('auth-widget');
    if (!container) return;

    if (window.currentUser) {
        const user = window.currentUser;
        container.innerHTML = `
            <div class="flex items-center gap-2.5 sm:gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all animate-fade-in">
                <img src="${user.photoURL || 'https://lh3.googleusercontent.com/a/default-user'}" alt="User Avatar" class="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-blue-500/50 object-cover shadow-sm">
                <div class="flex flex-col text-left">
                    <span class="text-[9px] sm:text-[10px] font-black text-slate-700 dark:text-slate-200 leading-tight">${user.displayName || 'Google User'}</span>
                    <span class="text-[7px] sm:text-[8px] font-medium text-slate-400 dark:text-slate-500 leading-none">${user.email || ''}</span>
                </div>
                <button onclick="window.logoutUser()" class="ml-1 sm:ml-2 px-2.5 py-1 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white font-black text-[8px] sm:text-[9px] uppercase tracking-wider rounded-lg border border-red-500/20 transition-all active:scale-95">
                    Logout
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="window.loginWithGoogle()" class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[10px] sm:text-xs rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all active:scale-95 shadow-sm animate-fade-in">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign in with Google
            </button>
        `;
    }
}

// Sign in with Google Popup
async function loginWithGoogle() {
    const firebaseAuth = auth || window.auth;
    if (!firebaseAuth) {
        console.error("Firebase Auth is not available.");
        if (window.showToast) window.showToast("Authentication is currently unavailable.", "error");
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
        if (window.showToast) window.showToast("Opening Google Sign-In...", "info");
        await signInWithPopup(firebaseAuth, provider);
        if (window.showToast) window.showToast("Logged in successfully!", "success");
    } catch (error) {
        console.error("Google authentication error:", error);
        if (window.showToast) {
            if (error.code === "auth/popup-closed-by-user") {
                window.showToast("Sign-in cancelled by user.", "warning");
            } else {
                window.showToast("Google authentication failed. Please try again.", "error");
            }
        }
    }
}

// Log out user
async function logoutUser() {
    const firebaseAuth = auth || window.auth;
    if (!firebaseAuth) return;
    try {
        if (window.showToast) window.showToast("Signing out...", "info");
        await signOut(firebaseAuth);
        if (window.showToast) window.showToast("Logged out successfully.", "success");
    } catch (error) {
        console.error("Logout error:", error);
        if (window.showToast) window.showToast("Failed to sign out.", "error");
    }
}

// Initialize Auth Listener
function initAuthListener() {
    const firebaseAuth = auth || window.auth;
    if (!firebaseAuth) {
        console.warn("Firebase Auth not initialized, skipping listener.");
        return;
    }
    onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
            window.userId = user.uid;
            if (user.isAnonymous) {
                window.currentUser = null;
            } else {
                window.currentUser = {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL
                };
            }
            renderAuthWidget();

            const loader = document.getElementById('loading-message');
            if (loader) { loader.textContent = 'Syncing Data...'; loader.classList.remove('hidden'); }
            if (typeof window.loadTasks === 'function') {
                await window.loadTasks();
            }
        } else {
            window.currentUser = null;
            window.userId = null;
            renderAuthWidget();

            if (window.isInitialLoad) {
                // Defer anonymous sign in to avoid interrupting Google session recovery
                setTimeout(async () => {
                    const currentAuthUser = firebaseAuth.currentUser;
                    if (!currentAuthUser && !window.userId) {
                        console.log("No user session recovered after delay. Signing in anonymously...");
                        try {
                            await signInAnonymously(firebaseAuth);
                        } catch (e) {
                            console.error("Fallback anonymous auth failed:", e);
                        }
                    }
                }, 1500);
            } else {
                try {
                    await signInAnonymously(firebaseAuth);
                } catch (e) {
                    console.error("Fallback anonymous auth failed:", e);
                }
            }
        }
    });
}

// Orchestrator initialization
async function initializeFirebase() {
    window.isHydrating = true;
    window.isInitialLoad = true;
    window.isAppLoading = true;

    // Populate UI from local backup first for instant hydration
    window.loadLocalData();

    // Render initial empty / guest auth widget before Auth state resolves
    renderAuthWidget();

    // Safety timeout: auto-unlock and render from localStorage if Firebase/network is taking too long
    setTimeout(() => {
        if (window.isAppLoading) {
            console.warn("Firebase snapshot took too long or offline. Falling back to local data and unlocking UI.");
            const hasLocal = typeof window.hasLocalDataLoaded === 'function' && window.hasLocalDataLoaded();
            if (!hasLocal) {
                console.log("[DEBUG 9] WHEN initializing default state");
                window.tasks = [];
                window.customTracks = [];
                console.log("[DEBUG 10] WHEN assigning syllabusStructure/customPrograms");
                window.customPrograms = {};
                window.syllabusStructure = {};
            }
            if (typeof window.renderUI === 'function') {
                window.renderUI();
            }
            window.isHydrating = false;
            window.isInitialLoad = false;
            window.isAppLoading = false;
        }
    }, 3500);

    try {
        const firebaseAuth = auth || window.auth;
        if (firebaseAuth) {
            initAuthListener();

            if (window.initialAuthToken) {
                await signInWithCustomToken(firebaseAuth, window.initialAuthToken);
            }
        } else {
            // Local-only mode
            const hasLocal = typeof window.hasLocalDataLoaded === 'function' && window.hasLocalDataLoaded();
            if (!hasLocal) {
                console.log("[DEBUG 9] WHEN initializing default state");
                window.tasks = [];
                window.customTracks = [];
                console.log("[DEBUG 10] WHEN assigning syllabusStructure/customPrograms");
                window.customPrograms = {};
                window.syllabusStructure = {};
            }
            if (typeof window.renderUI === 'function') {
                window.renderUI();
            }
            window.isHydrating = false;
            window.isInitialLoad = false;
            window.isAppLoading = false;
        }
    } catch (error) {
        console.error("Firebase auth initialization failed, falling back to local-only mode:", error);
        const hasLocal = typeof window.hasLocalDataLoaded === 'function' && window.hasLocalDataLoaded();
        if (!hasLocal) {
            console.log("[DEBUG 9] WHEN initializing default state");
            window.tasks = [];
            window.customTracks = [];
            console.log("[DEBUG 10] WHEN assigning syllabusStructure/customPrograms");
            window.customPrograms = {};
            window.syllabusStructure = {};
        }
        if (typeof window.renderUI === 'function') {
            window.renderUI();
        }
        window.isHydrating = false;
        window.isInitialLoad = false;
        window.isAppLoading = false;
    }
}

// Bind to window for global templates and layout accessibility
window.loginWithGoogle = loginWithGoogle;
window.logoutUser = logoutUser;
window.initAuthListener = initAuthListener;
window.initializeFirebase = initializeFirebase;
window.renderAuthWidget = renderAuthWidget;

export { initializeFirebase, loginWithGoogle, logoutUser, initAuthListener, renderAuthWidget };
