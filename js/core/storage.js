function loadLocalData() {
    try {
        let saved = localStorage.getItem("projectx_data");
        if (!saved) {
            const legacyKey = `study_dashboard_data_${window.appId}`;
            saved = localStorage.getItem(legacyKey);
        }
        if (saved) {
            const data = JSON.parse(saved);
            
            if (data.updatedAt) window.updatedAt = data.updatedAt;
            else window.updatedAt = 0;

            if (data.customTracks) window.customTracks = data.customTracks;
            if (data.customPrograms) window.customPrograms = data.customPrograms;
            if (data.customActions) window.customActions = data.customActions;
            if (window.updateTrackDropdowns) window.updateTrackDropdowns();

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
                if (typeof window.recalculateTotals === 'function') {
                    window.recalculateTotals();
                }
            }

            if (data.tasks && data.tasks.length > 0) {
                window.tasks = data.tasks.map(t => {
                    const formatted = { ...t };
                    if (window.customActions) {
                        window.customActions.forEach(a => { formatted[a.id] = formatted[a.id] === true; });
                    }
                    if (formatted.type === 'study' && !formatted.trackTasks) {
                        formatted.trackTasks = {};
                    }
                    return formatted;
                });

                const lastTask = window.tasks[window.tasks.length - 1];
                if (lastTask && lastTask.id) {
                    const newEndDate = new Date(window.PLAN_START_DATE.getTime());
                    newEndDate.setDate(newEndDate.getDate() + (lastTask.id - 1));
                    window.PLAN_END_DATE = newEndDate;
                }
            }
            
            window.localDataJSON = JSON.stringify(data);
            return true;
        }
    } catch (err) {
        console.error("Error loading from localStorage:", err);
    }
    return false;
}

window.loadLocalData = loadLocalData;

export { loadLocalData };
