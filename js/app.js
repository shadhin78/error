// 1. Core Modules
import './core/constants.js';
import './core/state.js';
import './core/helpers.js';
import './core/storage.js';

// 2. Firebase Sync Modules
import './firebase/config.js';
import './firebase/auth.js';
import './firebase/database.js';

// 3. UI Utility Modules (Toast, Filters)
import './ui/toast.js';
import './ui/filters.js';

// 4. Feature Modules
import './features/tasks.js';
import './features/pace.js';
import './features/countdown.js';
import './features/analytics.js';

// 5. UI Complex Modules (Charts, Revision, Modals, Render)
import './ui/charts.js';
import './ui/revision.js';
import './ui/modals.js';
import './ui/render.js';

// Orchestrator and bootstrapping
window.addEventListener('resize', () => {
    const charts = [
        window.progressChart, window.mainChartPrograms, window.monthlyChartActions,
        window.yearlyChartActions, window.subjectTrendChart, window.paceTrendChartInstance,
        window.revisionTrendChartInstance, window.globalHistoryChartInstance, window.masterLineChart,
        window.dadbTrendChartInstance, window.resultsTrendChartInstance
    ];
    charts.forEach(c => { if (c && typeof c.resize === 'function') c.resize(); });
});

// Since database.js and auth.js bind everything to window, we initialize when the DOM is fully loaded or straight away.
window.addEventListener('load', () => {
    if (typeof window.initializeFirebase === 'function') {
        window.initializeFirebase();
    }
});
