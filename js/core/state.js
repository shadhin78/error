// Global State Objects
window.db = null;
window.auth = null;
window.userId = null;
window.tasks = [];
window.progressChart = null;
window.masterLineChart = null;
window.localDataJSON = "";
window.saveTimeout = null;
window.isSaving = false;
window.needsSave = false;

// Navigation & State globals
window.mainChartPrograms = null;
window.monthlyChartActions = null;
window.yearlyChartActions = null;
window.subjectTrendChart = null;
window.paceTrendChartInstance = null;
window.revisionTrendChartInstance = null;
window.globalHistoryChartInstance = null;
window.dadbTrendChartInstance = null;
window.resultsTrendChartInstance = null;
window.latestPaceData = null;

// Dynamic State Objects
window.chartVisibility = { prog: {}, monthly: {}, yearly: {}, subjects: {}, revSubjects: {} };
window.latestChartStats = { prog: {}, monthly: {}, yearly: {}, subjects: {}, revSubjects: {} };
window.editingTask = null;
window.editingPaceId = null;
window.trendTimeFilter = 'ALL';
window.subjectTimeLinks = {};
window.subjectDetailsState = {};
window.currentDadbTab = 'date';
window.hasShownCongrats = false;
window.successResults = [];
window.editingResultId = null;

window.dashboardConfig = {
    topTag: "",
    mainTitle: "Study Dashboard",
    subTitle: ""
};

// Pass/Freeze & Revision System State
window.passedItems = { programs: [], subjects: [] };
window.revisionData = { active: [], progress: {} };
window.currentGhmTab = 'timeline';

window.subjectColors = {};

window.customActions = [];
window.customTracks = []; // Default empty track list

window.paceGoals = [];
window.globalStartDate = null;
window.globalEndDate = null;

window.isAppLoading = true;
window.updatedAt = 0;
window.isInitialLoad = true;
window.isHydrating = true;
window.currentFilter = 'All';

window.PLAN_START_DATE = new Date();
window.PLAN_START_DATE.setHours(0, 0, 0, 0);
window.PLAN_END_DATE = new Date();
window.PLAN_END_DATE.setDate(window.PLAN_END_DATE.getDate() + 29);
window.PLAN_END_DATE.setHours(23, 59, 59, 999);

console.log("[DEBUG 9] WHEN initializing default state");
console.log("[DEBUG 10] WHEN assigning syllabusStructure/customPrograms");
window.syllabusStructure = {};
window.customPrograms = {};
window.totalStaticChapters = 0;
