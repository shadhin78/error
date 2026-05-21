import {
    doc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./config.js";

async function getTasksRef() {
    if (!window.userId) throw new Error("User not authenticated.");
    const firestoreDb = db || window.db;
    if (!firestoreDb) throw new Error("Firestore DB not initialized.");
    return doc(firestoreDb, 'artifacts', window.appId, 'users', window.userId, 'studyPlan', 'planData_2026_daily_reset_v5');
}

const showSync = (state) => {
    const el = document.getElementById('sync-status');
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    if (!el || !icon || !text) return;

    el.classList.remove('opacity-0', 'scale-95');
    el.classList.add('opacity-100', 'scale-100');

    if (state === 'saving') {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`;
        icon.classList.add('animate-spin', 'text-blue-500');
        icon.classList.remove('text-emerald-500', 'text-red-500');
        text.textContent = 'Saving...'; text.className = 'text-[9px] font-black uppercase tracking-widest text-blue-500';
    } else if (state === 'saved') {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />`;
        icon.classList.remove('animate-spin', 'text-blue-500', 'text-red-500');
        icon.classList.add('text-emerald-500');
        text.textContent = 'Saved'; text.className = 'text-[9px] font-black uppercase tracking-widest text-emerald-500';
        setTimeout(() => { el.classList.remove('opacity-100', 'scale-100'); el.classList.add('opacity-0', 'scale-95'); }, 2000);
    } else if (state === 'error') {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />`;
        icon.classList.remove('animate-spin', 'text-blue-500', 'text-emerald-500');
        icon.classList.add('text-red-500');
        text.textContent = 'Error'; text.className = 'text-[9px] font-black uppercase tracking-widest text-red-500';
    }
};

async function loadTasks() {
    const firestoreDb = db || window.db;
    if (!firestoreDb || !window.userId) { 
        window.isAppLoading = false;
        if (typeof window.renderUI === 'function') window.renderUI(); 
        return Promise.resolve(); 
    }
    try {
        const tasksRef = await getTasksRef();
        return new Promise((resolve) => {
            let isFirstSnapshot = true;
            onSnapshot(tasksRef, (docSnap) => {
                let newTasks = window.tasks;
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const cloudUpdatedAt = data.updatedAt || 0;
                    const localUpdatedAt = window.updatedAt || 0;

                    console.log(`Synchronization Sync Snapshot received. Cloud updatedAt: ${cloudUpdatedAt}, Local updatedAt: ${localUpdatedAt}`);

                    const hasCloudData = (
                        (data.customPrograms && Object.keys(data.customPrograms).length > 0) ||
                        (data.customTracks && data.customTracks.length > 0) ||
                        (data.customActions && data.customActions.length > 0) ||
                        (data.customSyllabus && Object.keys(data.customSyllabus).length > 0) ||
                        (data.tasks && data.tasks.length > 0)
                    );

                    const hasLocalData = typeof window.hasLocalDataLoaded === 'function' && window.hasLocalDataLoaded();

                    // Merge Conflict Resolution Engine
                    if (hasLocalData && !hasCloudData) {
                        console.log("Cloud state is empty/blank but active local state exists. Preserving local state and uploading upstream.");
                        window.isAppLoading = false; // Temporarily unlock to let saveTasks succeed
                        saveTasks(true);
                    } else if (cloudUpdatedAt >= localUpdatedAt || !hasLocalData) {
                        console.log("Cloud state is newer/equal or local state is empty. Merging cloud state into active state.");
                        window.updatedAt = cloudUpdatedAt;

                        if (data.customTracks) window.customTracks = data.customTracks;
                        if (data.customPrograms) window.customPrograms = data.customPrograms;
                        if (data.customActions) window.customActions = data.customActions;
                        if (typeof window.updateTrackDropdowns === 'function') window.updateTrackDropdowns();

                        if (data.paceGoals) window.paceGoals = data.paceGoals;
                        else window.paceGoals = [];

                        if (data.passedItems) window.passedItems = data.passedItems;
                        else window.passedItems = { programs: [], subjects: [] };

                        if (data.revisionData) window.revisionData = data.revisionData;
                        else window.revisionData = { active: [], progress: {} };

                        if (data.subjectTimeLinks) window.subjectTimeLinks = data.subjectTimeLinks;
                        else window.subjectTimeLinks = {};

                        if (data.successResults) window.successResults = data.successResults;
                        else window.successResults = [];

                        if (data.subjectColors) {
                            Object.assign(window.subjectColors, data.subjectColors);
                        }

                        if (data.dashboardConfig) {
                            window.dashboardConfig = data.dashboardConfig;
                            if (window.safeSetText) {
                                window.safeSetText('dash-top-tag', window.dashboardConfig.topTag || '');
                                window.safeSetText('dash-main-title', window.dashboardConfig.mainTitle || '');
                                window.safeSetText('dash-sub-title', window.dashboardConfig.subTitle || '');
                            }
                            document.title = `${window.dashboardConfig.topTag || ''} - ${window.dashboardConfig.mainTitle || ''}`;
                        }

                        if (data.customSyllabus) {
                            window.syllabusStructure = data.customSyllabus;
                            Object.keys(window.syllabusStructure).forEach(trackId => {
                                window.syllabusStructure[trackId].forEach(s => { if (!s.program) s.program = "Default"; });
                            });
                            if (typeof window.recalculateTotals === 'function') window.recalculateTotals();
                            if (window.isInitialLoad && typeof window.switchSysTab === 'function') window.switchSysTab('track');
                        }

                        if (data.tasks && data.tasks.length > 0) {
                            newTasks = data.tasks.map(t => {
                                const formatted = { ...t };
                                if (window.customActions) {
                                    window.customActions.forEach(a => { formatted[a.id] = formatted[a.id] === true; });
                                }
                                if (formatted.type === 'study' && !formatted.trackTasks) {
                                    formatted.trackTasks = {};
                                }
                                return formatted;
                            });

                            const lastTask = newTasks[newTasks.length - 1];
                            if (lastTask && lastTask.id) {
                                const newEndDate = new Date(window.PLAN_START_DATE.getTime());
                                newEndDate.setDate(newEndDate.getDate() + (lastTask.id - 1));
                                window.PLAN_END_DATE = newEndDate;
                            }
                        } else {
                            newTasks = [];
                        }
                        window.tasks = newTasks;
                    } else {
                        console.log("Local/InMemory state is newer than cloud state. Preserving local state and uploading upstream.");
                        window.isAppLoading = false; // Temporarily unlock to let saveTasks succeed
                        saveTasks(true);
                    }
                } else {
                    console.log("Cloud document does not exist yet.");
                    if (typeof window.hasLocalDataLoaded === 'function' && window.hasLocalDataLoaded()) {
                        console.log("Active local backup exists. Syncing local backup upstream...");
                        window.isAppLoading = false; // Temporarily unlock to let saveTasks succeed
                        saveTasks(true);
                    } else {
                        console.log("No cloud or local state exists. Initializing clean empty state.");
                        window.isAppLoading = false; // Temporarily unlock to let saveTasks succeed
                        saveTasks(true);
                    }
                }

                const currentPayload = {
                    updatedAt: window.updatedAt,
                    tasks: window.tasks,
                    customTracks: window.customTracks,
                    customSyllabus: window.syllabusStructure,
                    customPrograms: window.customPrograms,
                    customActions: window.customActions,
                    paceGoals: window.paceGoals,
                    passedItems: window.passedItems,
                    revisionData: window.revisionData,
                    subjectTimeLinks: window.subjectTimeLinks,
                    successResults: window.successResults,
                    dashboardConfig: window.dashboardConfig,
                    subjectColors: window.subjectColors
                };
                window.localDataJSON = JSON.stringify(currentPayload);

                // ALWAYS persist to localStorage under both standard and legacy keys
                try {
                    localStorage.setItem("projectx_data", window.localDataJSON);
                    const legacyKey = `study_dashboard_data_${window.appId}`;
                    localStorage.setItem(legacyKey, window.localDataJSON);
                } catch (err) {
                    console.error("Failed to update localStorage with Firebase data:", err);
                }

                // Release loading lock now that active state has been finalized and merged
                window.isAppLoading = false;

                if (window.isInitialLoad) {
                    if (typeof window.renderUI === 'function') window.renderUI();
                    window.isInitialLoad = false;
                } else {
                    requestAnimationFrame(() => {
                        const scrollPos = window.scrollY; // Preserve scroll position
                        if (typeof window.renderUI === 'function') window.renderUI();
                        window.scrollTo(0, scrollPos); // Seamlessly restore scroll
                        showSync('saved'); // Indicate remote fetch success
                    });
                }

                if (isFirstSnapshot) {
                    isFirstSnapshot = false;
                    resolve();
                }
            }, (error) => {
                console.error("Sync listener error:", error);
                window.isAppLoading = false;
                if (window.isInitialLoad) {
                    if (typeof window.renderUI === 'function') window.renderUI();
                    window.isInitialLoad = false;
                }
                if (isFirstSnapshot) {
                    isFirstSnapshot = false;
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error("Load tasks error:", error);
        window.isAppLoading = false;
        if (window.isInitialLoad) {
            if (typeof window.renderUI === 'function') window.renderUI();
            window.isInitialLoad = false;
        }
        return Promise.resolve();
    }
}

async function saveTasks(immediate = false) {
    if (window.isAppLoading) {
        console.log("Blocking saveTasks() because the app is still loading and syncing...");
        return;
    }

    // Update active timestamp
    window.updatedAt = Date.now();

    const payload = {
        updatedAt: window.updatedAt,
        tasks: window.tasks,
        customSyllabus: window.syllabusStructure,
        customPrograms: window.customPrograms,
        customActions: window.customActions,
        paceGoals: window.paceGoals,
        passedItems: window.passedItems,
        revisionData: window.revisionData,
        subjectTimeLinks: window.subjectTimeLinks,
        successResults: window.successResults,
        dashboardConfig: window.dashboardConfig,
        subjectColors: window.subjectColors
    };
    window.localDataJSON = JSON.stringify(payload);

    // ALWAYS persist to localStorage under both standard and legacy keys
    try {
        localStorage.setItem("projectx_data", window.localDataJSON);
        const legacyKey = `study_dashboard_data_${window.appId}`;
        localStorage.setItem(legacyKey, window.localDataJSON);
    } catch (err) {
        console.error("Failed to save to localStorage:", err);
    }

    const firestoreDb = db || window.db;
    if (!firestoreDb || !window.userId) {
        // Local only mode: show instant sync visual feedback
        showSync('saving');
        setTimeout(() => {
            showSync('saved');
        }, 300);
        return;
    }

    const executeSave = async () => {
        if (window.isSaving) { window.needsSave = true; return; }
        window.isSaving = true;
        try {
            showSync('saving');
            const tasksRef = await getTasksRef();
            // JSON parsing creates a clean object, bypassing Firebase's expensive deep object traversal on massive arrays
            await setDoc(tasksRef, JSON.parse(window.localDataJSON));
            showSync('saved');
        } catch (error) {
            console.error("Firebase sync error:", error);
            showSync('error');
        } finally {
            window.isSaving = false;
            if (window.needsSave) { window.needsSave = false; window.saveTimeout = setTimeout(executeSave, 300); }
        }
    };
    if (immediate) { if (window.saveTimeout) clearTimeout(window.saveTimeout); await executeSave(); }
    else { if (window.saveTimeout) clearTimeout(window.saveTimeout); window.saveTimeout = setTimeout(executeSave, 300); } // Increased debounce for 500+ chapter stability
}

// Bind to window
window.getTasksRef = getTasksRef;
window.loadTasks = loadTasks;
window.saveTasks = saveTasks;
window.showSync = showSync;

export { getTasksRef, loadTasks, saveTasks, showSync };
