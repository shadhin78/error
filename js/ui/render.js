// UI Rendering Coordinator

function rebuildTaskDates() {
    if (!window.tasks || window.tasks.length === 0) return;
    const baseDate = new Date(window.PLAN_START_DATE.getTime());
    window.tasks.forEach(t => {
        const curDate = new Date(baseDate.getTime());
        curDate.setDate(curDate.getDate() + (t.id - 1));
        t.date = window.formatDate(curDate);
        t.day = curDate.toLocaleDateString('en-US', { weekday: 'short' });
    });
    const newEndDate = new Date(baseDate.getTime());
    newEndDate.setDate(newEndDate.getDate() + (window.tasks[window.tasks.length - 1].id - 1));
    window.PLAN_END_DATE = newEndDate;
    if (typeof window.saveTasks === 'function') window.saveTasks();
}

function updateGlobalDates() {
    const globalGoal = window.paceGoals.find(g => g.type === 'global');
    let dateChanged = false;

    if (globalGoal) {
        if (globalGoal.startDate) {
            const newStart = window.parseDateSafe(globalGoal.startDate);
            newStart.setHours(0, 0, 0, 0);
            const currentStart = new Date(window.PLAN_START_DATE.getTime());
            currentStart.setHours(0, 0, 0, 0);

            if (newStart.getTime() !== currentStart.getTime()) {
                window.PLAN_START_DATE = new Date(newStart.getTime());
                dateChanged = true;
            }
            window.globalStartDate = window.parseDateSafe(globalGoal.startDate);
        }
        if (globalGoal.deadline) window.globalEndDate = window.parseDateSafe(globalGoal.deadline);
    } else {
        window.globalStartDate = null;
        window.globalEndDate = null;
    }

    if (window.globalStartDate) window.globalStartDate.setHours(0, 0, 0, 0);
    if (window.globalEndDate) window.globalEndDate.setHours(23, 59, 59, 999);

    if (dateChanged) {
        rebuildTaskDates();
    }
}

function renderUI() {
    const loader = document.getElementById('loading-message');
    if (loader) loader.classList.add('hidden');
    const dashContent = document.getElementById('dashboard-content');
    if (dashContent) dashContent.classList.remove('hidden');

    window.safeSetText('dash-top-tag', window.dashboardConfig.topTag);
    window.safeSetText('dash-main-title', window.dashboardConfig.mainTitle);
    window.safeSetText('dash-sub-title', window.dashboardConfig.subTitle);
    document.title = `${window.dashboardConfig.topTag} - ${window.dashboardConfig.mainTitle}`;

    const tagInput = document.getElementById('edit-header-tag');
    if (tagInput) tagInput.value = window.dashboardConfig.topTag || '';
    const titleInput = document.getElementById('edit-header-title');
    if (titleInput) titleInput.value = window.dashboardConfig.mainTitle || '';
    const subInput = document.getElementById('edit-header-sub');
    if (subInput) subInput.value = window.dashboardConfig.subTitle || '';

    // Validate currentFilter to prevent cross-device deletion crashes
    if (window.currentFilter !== 'All') {
        const isValidProg = window.customTracks.some(t => (window.customPrograms[t.id] || []).includes(window.currentFilter));
        const isValidSub = window.customTracks.some(t => (window.syllabusStructure[t.id] || []).some(s => s.subject === window.currentFilter));
        if (!isValidProg && !isValidSub) window.currentFilter = 'All';
    }

    updateGlobalDates();
    setupFocusTodayButton();
    if (typeof window.updateCountdown === 'function') window.updateCountdown();
    if (typeof window.updateSuccessScore === 'function') window.updateSuccessScore();
    if (typeof window.renderFilterButtons === 'function') window.renderFilterButtons();
    if (typeof window.renderTaskList === 'function') window.renderTaskList();
    if (typeof window.renderChart === 'function') window.renderChart();
    if (typeof window.updateMetrics === 'function') window.updateMetrics();
    if (typeof window.renderDailyTracker === 'function') window.renderDailyTracker();
    if (typeof window.renderDailyLogs === 'function') window.renderDailyLogs();
    if (typeof window.renderTrendCharts === 'function') window.renderTrendCharts();
    if (typeof window.renderResults === 'function') window.renderResults();

    // Dynamic Form & Manage UI Syncs
    if (typeof window.updateTrackDropdowns === 'function') window.updateTrackDropdowns();
    if (typeof window.updateManageDropdown === 'function') window.updateManageDropdown();
    if (typeof window.renderPassConfig === 'function') window.renderPassConfig();
    if (typeof window.togglePaceBundleType === 'function') window.togglePaceBundleType();
    
    const activeSysTab = document.querySelector('[id^="sys-tab-"].bg-blue-600');
    if (activeSysTab) {
        const tabName = activeSysTab.id.replace('sys-tab-', '');
        if (tabName === 'chapter' && typeof window.updateChProgDropdown === 'function') window.updateChProgDropdown();
        if (tabName === 'subject' && typeof window.updateSubProgDropdown === 'function') window.updateSubProgDropdown();
    }
    if (document.getElementById('revision-manage-modal') && !document.getElementById('revision-manage-modal').classList.contains('hidden')) {
        if (typeof window.renderRevisionModalContent === 'function') window.renderRevisionModalContent();
    }
    if (document.getElementById('analytics-modal') && !document.getElementById('analytics-modal').classList.contains('hidden') && window.currentAnalyticsAction) {
        if (typeof window.populateAnalyticsModal === 'function') window.populateAnalyticsModal(window.currentAnalyticsAction);
    }
    if (document.getElementById('global-history-modal') && !document.getElementById('global-history-modal').classList.contains('hidden')) {
        if (typeof window.renderGlobalHistoryContent === 'function') window.renderGlobalHistoryContent();
    }
    if (document.getElementById('daily-actions-db-modal') && !document.getElementById('daily-actions-db-modal').classList.contains('hidden')) {
        if (typeof window.openDailyActionsDBModal === 'function') window.openDailyActionsDBModal();
    }
}

function setupFocusTodayButton() {
    const btn = document.getElementById('focus-today-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (window.currentFilter !== 'All') {
            window.currentFilter = 'All';
            if (typeof window.renderFilterButtons === 'function') window.renderFilterButtons();
            if (typeof window.renderTaskList === 'function') window.renderTaskList();
            if (typeof window.updateMetrics === 'function') window.updateMetrics();
        }
        const todayString = window.formatDate(new Date());
        const todayTask = window.tasks.find(t => t.date === todayString);
        if (todayTask && todayTask.type === 'study') {
            setTimeout(() => {
                const firstTaskCard = document.querySelector(`[id^="single-task-"][id$="-${todayTask.studyDay}"]`);
                if (firstTaskCard) {
                    firstTaskCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstTaskCard.classList.add('ring-4', 'ring-blue-500', 'ring-offset-4', 'dark:ring-offset-gray-900', 'scale-[1.02]');
                    setTimeout(() => firstTaskCard.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-4', 'dark:ring-offset-gray-900', 'scale-[1.02]'), 2500);
                }
            }, 100);
        }
    });
}

function renderSubjectProgress(subjectStats) {
    const container = document.getElementById('subject-progress-container');
    if (!container) return;
    container.innerHTML = '';

    const colorPairs = [
        { bg: "bg-gradient-to-r from-indigo-400 to-indigo-600", text: "text-indigo-500" },
        { bg: "bg-gradient-to-r from-emerald-400 to-emerald-600", text: "text-emerald-500" },
        { bg: "bg-gradient-to-r from-violet-400 to-violet-600", text: "text-violet-500" },
        { bg: "bg-gradient-to-r from-rose-400 to-rose-600", text: "text-rose-500" },
        { bg: "bg-gradient-to-r from-amber-400 to-amber-600", text: "text-amber-500" },
        { bg: "bg-gradient-to-r from-cyan-400 to-cyan-600", text: "text-cyan-500" }
    ];

    let pIdx = 0;
    window.customTracks.forEach(trackObj => {
        const track = trackObj.id;
        window.customPrograms[track].forEach(prog => {
            const subs = window.syllabusStructure[track].filter(s => s.program === prog);
            if (subs.length === 0) return;

            const cp = colorPairs[pIdx % colorPairs.length];
            container.innerHTML += `<h3 class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mt-5 mb-3 tracking-widest">${prog}</h3>`;

            subs.forEach(sub => {
                const stats = subjectStats[sub.subject];
                if (!stats) return;
                const perc = stats.totalChapters > 0 ? Math.min(100, (stats.effectiveChapters / stats.totalChapters) * 100) : 0;

                container.innerHTML += `<div class="mb-3.5 group"><div class="flex justify-between items-center text-[10px] md:text-[11px] font-black mb-1.5 transition-all group-hover:translate-x-1"><div class="flex items-center truncate pr-2"><span class="truncate text-slate-700 dark:text-slate-200">${sub.subject}</span></div><div class="flex items-center shrink-0"><span class="ml-1.5">${Math.round(stats.effectiveChapters)}/${stats.totalChapters} <span class="${cp.text} ml-0.5">(${Math.round(perc)}%)</span></span></div></div><div class="w-full bg-slate-100 dark:bg-slate-700/50 h-2 md:h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-200/40 dark:border-slate-600/30"><div class="${cp.bg} h-full rounded-full transition-all duration-700 ease-out shadow-sm" style="width: ${perc}%"></div></div></div>`;
            });
            pIdx++;
        });
    });
}

function renderCategoryProgress(subjectStats) {
    const container = document.getElementById('category-progress-container');
    if (!container) return;

    const colors = ['text-indigo-500', 'text-emerald-500', 'text-violet-500', 'text-rose-500', 'text-amber-500', 'text-cyan-500'];
    const shadows = ['shadow-[0_0_15px_rgba(99,102,241,0.3)]', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]', 'shadow-[0_0_15px_rgba(139,92,246,0.3)]', 'shadow-[0_0_15px_rgba(244,63,94,0.3)]', 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', 'shadow-[0_0_15px_rgba(6,182,212,0.3)]'];

    let html = ''; let catIdx = 0;

    window.customTracks.forEach(trackObj => {
        const track = trackObj.id;
        window.customPrograms[track].forEach(prog => {
            const subs = window.syllabusStructure[track].filter(s => s.program === prog);
            if (subs.length === 0) return;

            let totalChap = 0; let doneChap = 0;
            subs.forEach(sub => {
                const stats = subjectStats[sub.subject];
                if (stats) {
                    totalChap += stats.totalChapters;
                    doneChap += stats.effectiveChapters;
                }
            });
            const perc = totalChap > 0 ? Math.round((doneChap / totalChap) * 100) : 0;
            const color = colors[catIdx % colors.length]; const shadow = shadows[catIdx % shadows.length];

            html += `<div class="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-3xl md:rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between group"><div><h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:translate-x-1 transition-transform">${prog}</h3><p class="text-[10px] text-slate-400 uppercase font-black mt-1 tracking-widest">${Math.round(doneChap)} / ${totalChap} Chapters</p></div><div class="relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 ${shadow} rounded-full bg-white dark:bg-slate-800 shrink-0"><svg class="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 36 36"><path class="text-slate-100 dark:text-slate-700/50" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path class="${color}" stroke-width="3.5" stroke-dasharray="${perc}, 100" stroke="currentColor" fill="none" stroke-linecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg><span class="absolute text-[9px] md:text-[10px] font-black ${color}">${perc}%</span></div></div>`;
            catIdx++;
        });
    });
    container.innerHTML = html;
}

function renderDailyTracker() {
    const todayStr = window.formatDate(new Date());
    const todayTask = window.tasks.find(t => t.date === todayStr);
    let c = 0; window.customActions.forEach(a => { if (todayTask && todayTask[a.id]) c++; });
    const dailyPct = window.customActions.length > 0 ? Math.round((c / window.customActions.length) * 100) : 0;

    const bar = document.getElementById('daily-actions-progress');
    if (bar) {
        bar.style.width = dailyPct + '%'; window.safeSetText('daily-actions-percent', dailyPct + '%');
        let clr = 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]';
        if (dailyPct >= 25) clr = 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]';
        if (dailyPct >= 50) clr = 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]';
        if (dailyPct >= 75) clr = 'bg-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.8)]';
        if (dailyPct === 100) clr = 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]';
        bar.className = `h-full rounded-full transition-all duration-500 ease-out ${clr}`;
    }

    const gridContainer = document.getElementById('daily-actions-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    const getSVG = (id) => {
        if (id === 'track_a' || id === 'track_2') return `<path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6M12 20a11.95 11.95 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479M12 20a11.95 11.95 0 006.824-2.998 12.083 12.083 0 00-.665-6.479"></path>`;
        if (id === 'track_b' || id === 'track_1') return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>`;
        if (id === 'gym') return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"></path>`;
        if (id === 'fl') return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>`;
        return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>`;
    };

    const twColors = {
        indigo: { hex: '#6366f1', border: 'border-indigo-500', btn: 'bg-indigo-500', bgLt: 'bg-indigo-50 dark:bg-indigo-900/20', borderLt: 'border-indigo-100 dark:border-indigo-800/50', text: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-100 dark:bg-indigo-500/10', iconColor: 'text-indigo-500' },
        violet: { hex: '#8b5cf6', border: 'border-violet-500', btn: 'bg-violet-500', bgLt: 'bg-violet-50 dark:bg-violet-900/20', borderLt: 'border-violet-100 dark:border-violet-800/50', text: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-500/10', iconColor: 'text-violet-500' },
        orange: { hex: '#f97316', border: 'border-orange-500', btn: 'bg-orange-500', bgLt: 'bg-orange-50 dark:bg-orange-900/20', borderLt: 'border-orange-100 dark:border-orange-800/50', text: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-500/10', iconColor: 'text-orange-500' },
        purple: { hex: '#a855f7', border: 'border-purple-500', btn: 'bg-purple-500', bgLt: 'bg-purple-50 dark:bg-purple-900/20', borderLt: 'border-purple-100 dark:border-purple-800/50', text: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-500/10', iconColor: 'text-purple-500' },
        emerald: { hex: '#10b981', border: 'border-emerald-500', btn: 'bg-emerald-500', bgLt: 'bg-emerald-50 dark:bg-emerald-900/20', borderLt: 'border-emerald-100 dark:border-emerald-800/50', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/10', iconColor: 'text-emerald-500' },
        rose: { hex: '#f43f5e', border: 'border-rose-500', btn: 'bg-rose-500', bgLt: 'bg-rose-50 dark:bg-rose-900/20', borderLt: 'border-rose-100 dark:border-rose-800/50', text: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-500/10', iconColor: 'text-rose-500' },
        cyan: { hex: '#06b6d4', border: 'border-cyan-500', btn: 'bg-cyan-500', bgLt: 'bg-cyan-50 dark:bg-cyan-900/20', borderLt: 'border-cyan-100 dark:border-cyan-800/50', text: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-500/10', iconColor: 'text-cyan-500' },
        amber: { hex: '#f59e0b', border: 'border-amber-500', btn: 'bg-amber-500', bgLt: 'bg-amber-50 dark:bg-amber-900/20', borderLt: 'border-amber-100 dark:border-amber-800/50', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/10', iconColor: 'text-amber-500' }
    };

    window.customActions.forEach(cfg => {
        const state = todayTask ? todayTask[cfg.id] : false;
        const cMap = twColors[cfg.color] || twColors.indigo;

        const cardHtml = `
        <div class="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-3xl md:rounded-[2rem] shadow-sm flex flex-col transition-all duration-300 min-h-[300px] border-2 ${state === true ? cMap.border + ' shadow-lg' : (state === false ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-slate-200 dark:border-slate-700')}">
            <div class="flex justify-between items-start mb-3 sm:mb-4">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <div class="p-2 md:p-3 rounded-lg sm:rounded-xl md:rounded-2xl border ${cMap.iconBg} ${cMap.text} ${cMap.borderLt}">
                        <svg class="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${getSVG(cfg.icon)}</svg>
                    </div>
                    <div>
                        <h3 class="font-black text-xs sm:text-sm md:text-base tracking-tight">${cfg.title}</h3>
                        <p class="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">${cfg.desc}</p>
                    </div>
                </div>
                <button onclick="openModal('analytics-modal', '${cfg.id}')" class="group flex items-center justify-center p-2 md:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0"><svg class="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-hover:${cMap.iconColor} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></button>
            </div>
            <div class="flex gap-2 mb-3 sm:mb-4 p-1 md:p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <button class="flex-1 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-90 ${state === true ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.5)] scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}" onclick="setDailyState('${cfg.id}', true)">YES</button>
                <button class="flex-1 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-90 ${state === false ? 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.4)] scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}" onclick="setDailyState('${cfg.id}', false)">NO</button>
            </div>
            <div id="dt-log-${cfg.id}"></div>
        </div>`;
        gridContainer.innerHTML += cardHtml;
    });
}

function renderDailyLogs() {
    const todayStr = window.formatDate(new Date());
    let idx = window.tasks.findIndex(t => t.date === todayStr);
    if (idx === -1) idx = window.tasks.length - 1;

    const fill = (elId, key) => {
        const el = document.getElementById(elId); if (!el) return;
        let html = '<div class="grid grid-cols-4 gap-1.5 md:gap-2 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-1 content-start mt-2" style="max-height: 180px; min-height: 150px;">';
        for (let i = idx; i >= Math.max(0, idx - 179); i--) {
            const t = window.tasks[i]; if (!t) continue;
            const val = t[key];
            const bgClass = val ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)] border-transparent' : 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] border-transparent';
            html += `<button onclick="window.toggleModalDay(${t.id}, '${key}')" class="flex flex-col items-center justify-center p-1.5 md:p-2 rounded-xl border active:scale-90 transition-all duration-300 hover:scale-105 ${bgClass} w-full aspect-square focus:outline-none"><span class="text-[7px] md:text-[8px] uppercase font-black opacity-90 mb-0.5">${t.date.split(' ')[0]}</span><span class="text-xs md:text-sm font-black leading-none">${t.date.split(' ')[1]}</span></button>`;
        }
        html += '</div>'; el.innerHTML = html; el.className = "flex flex-col flex-1 min-h-0 pt-2 border-t border-slate-100 dark:border-slate-700/60 mt-2";
    };
    window.customActions.forEach(a => fill(`dt-log-${a.id}`, a.id));
}

function generateSingleTaskHtml(dayObj, taskObj, trackId, itemIndex) {
    const safeTaskId = taskObj.id || `legacy-${Math.random().toString(36).substr(2, 9)}`;

    return `
        <div id="single-task-${safeTaskId}-${dayObj.studyDay}" class="relative bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700 flex flex-col justify-between min-h-[110px] overflow-hidden group ${taskObj.completed ? 'ring-1 ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 !border-emerald-200 dark:!border-emerald-800' : ''}">
            
            <!-- Color Accent Bar -->
            <div class="absolute top-0 left-0 w-full h-1 ${taskObj.completed ? 'bg-emerald-500' : ''} transition-colors" style="${!taskObj.completed ? `background-color: ${window.getSubjectColor(taskObj.subject)}` : ''}"></div>
            
            <div class="flex justify-between items-start mb-3 mt-1">
                <span class="text-[9px] px-2.5 py-1 bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 rounded-md font-black tracking-widest uppercase">DAY ${dayObj.studyDay}</span>
                <button onclick="window.openEditModal(${dayObj.id}, '${trackId}', ${itemIndex})" class="text-slate-400 hover:text-blue-500 active:scale-90 transition-all opacity-0 group-hover:opacity-100 p-1.5 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700" title="Edit/Delete Task">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
            </div>

            <div class="flex items-end justify-between mt-auto gap-3">
                <div class="flex flex-col pr-1">
                    <span class="font-black text-slate-800 dark:text-slate-100 text-sm md:text-base tracking-tight leading-tight mb-0.5 ${taskObj.completed ? 'line-through text-emerald-700 dark:text-emerald-400 opacity-70' : ''}">${taskObj.chapter}</span>
                    <span class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 ${taskObj.completed ? 'line-through opacity-60' : ''}">${taskObj.title}</span>
                </div>
                <div class="shrink-0 mb-0.5">
                    <div class="relative flex items-center justify-center">
                        <input type="checkbox" data-stud-id="${dayObj.studyDay}" data-task-id="${taskObj.id}" data-track-id="${trackId}" class="task-checkbox peer relative appearance-none w-6 h-6 border-2 border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-800 checked:bg-emerald-500 checked:border-emerald-500 focus:outline-none cursor-pointer transition-all shadow-sm hover:border-emerald-400" ${taskObj.completed ? 'checked' : ''}>
                        <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderTaskList() {
    const list = document.getElementById('task-list');
    if (!list) return;
    list.className = 'flex flex-col space-y-6 md:space-y-8 w-full pb-4';

    let subjectsToRender = [];
    const allSubs = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []);

    if (window.currentFilter === 'All') {
        subjectsToRender = allSubs.map(s => s.subject);
    } else {
        const isProgram = window.customTracks.some(t => (window.customPrograms[t.id] || []).includes(window.currentFilter));
        if (isProgram) {
            subjectsToRender = allSubs.filter(s => s.program === window.currentFilter).map(s => s.subject);
        } else {
            subjectsToRender = [window.currentFilter];
        }
    }

    const grouped = {};
    subjectsToRender.forEach(sub => {
        const trackId = window.customTracks.find(t => (window.syllabusStructure[t.id] || []).some(s => s.subject === sub))?.id;
        const sObj = trackId ? window.syllabusStructure[trackId].find(s => s.subject === sub) : null;
        if (!sObj) return;

        grouped[sub] = {
            trackId: trackId,
            program: sObj.program,
            totalChapters: sObj.chapters,
            tasks: []
        };
    });

    window.tasks.forEach(t => {
        if (t.type === 'study' && t.trackTasks) {
            Object.keys(t.trackTasks).forEach(trackId => {
                t.trackTasks[trackId].forEach((item, itemIdx) => {
                    if (grouped[item.subject]) {
                        grouped[item.subject].tasks.push({ dayObj: t, taskObj: item, trackId: trackId, itemIndex: itemIdx });
                    }
                });
            });
        }
    });

    let html = '';
    const shadowMap = { indigo: 'shadow-[0_0_10px_rgba(99,102,241,0.6)]', emerald: 'shadow-[0_0_10px_rgba(16,185,129,0.6)]', violet: 'shadow-[0_0_10px_rgba(139,92,246,0.6)]' };

    subjectsToRender.forEach(sub => {
        const group = grouped[sub];
        if (!group || group.tasks.length === 0) return;

        const trackColors = ['indigo', 'emerald', 'violet', 'orange', 'purple', 'rose', 'cyan', 'amber'];
        const trackIdx = window.customTracks.findIndex(t => t.id === group.trackId);
        const colorClass = trackColors[trackIdx % trackColors.length] || 'slate';

        let displaySubName = sub;
        if (displaySubName.startsWith(group.program + ' - ')) displaySubName = displaySubName.replace(group.program + ' - ', '');
        else if (displaySubName.startsWith(group.program + ' ')) displaySubName = displaySubName.replace(group.program + ' ', '');
        const finalTitle = `${displaySubName} <span class="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 md:ml-2 font-normal whitespace-nowrap">- ${group.program}</span>`;

        const shadowClass = shadowMap[colorClass] || 'shadow-sm';
        const safeSubId = sub.replace(/[^a-zA-Z0-9]/g, '-');

        const isFrozen = (window.passedItems && window.passedItems.subjects && window.passedItems.subjects.includes(sub)) ||
            (window.passedItems && window.passedItems.programs && window.passedItems.programs.includes(group.program));

        const isRevising = window.revisionData && window.revisionData.active && window.revisionData.active.includes(sub);
        const safeSubQuotes = sub.replace(/'/g, "\\'");

        const editBtnHtml = `
            <button onclick="event.preventDefault(); event.stopPropagation(); window.openSubjectEditModal('${safeSubQuotes}');" class="p-1.5 shrink-0 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg shadow-sm transition-all border border-slate-200 dark:border-slate-600/50 active:scale-95" title="Edit Subject Details">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
        `;

        const formatDateStr = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        let targetDate = null;
        let startDate = null;
        let linkLabel = '';
        let hasTimeGoal = false;

        if (window.subjectTimeLinks && window.subjectTimeLinks[sub]) {
            const link = window.subjectTimeLinks[sub];
            if (link.type === 'date') {
                hasTimeGoal = true;
                if (link.startDate) startDate = window.parseDateSafe(link.startDate);
                targetDate = window.parseDateSafe(link.date);
                targetDate.setHours(23, 59, 59, 999);
                if (startDate) startDate.setHours(0, 0, 0, 0);
                linkLabel = '<span class="block text-[8px] text-orange-500 dark:text-orange-400 mt-1 uppercase tracking-widest font-black bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-800/50 inline-block">Custom Timeline</span>';
            } else if (link.type === 'goal') {
                const pg = window.paceGoals.find(g => g.id === link.id);
                if (pg) {
                    hasTimeGoal = true;
                    if (pg.startDate) startDate = window.parseDateSafe(pg.startDate);
                    targetDate = window.parseDateSafe(pg.deadline);
                    targetDate.setHours(23, 59, 59, 999);
                    if (startDate) startDate.setHours(0, 0, 0, 0);
                    linkLabel = `<span class="block text-[8px] text-indigo-500 dark:text-indigo-400 mt-1 truncate max-w-[120px] mx-auto uppercase tracking-widest font-black bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50 inline-block" title="${pg.target}">Link: ${pg.target}</span>`;
                }
            }
        }

        if (!hasTimeGoal) {
            let firstCompletedTask = group.tasks.find(x => x.taskObj.completed);
            if (firstCompletedTask) {
                if (firstCompletedTask.taskObj.completedAt) {
                    startDate = new Date(firstCompletedTask.taskObj.completedAt);
                } else {
                    startDate = window.getTaskDate(firstCompletedTask.dayObj);
                }
            }
        }

        const startDateStr = startDate ? formatDateStr(startDate) : '--';
        const endDateStr = targetDate ? formatDateStr(targetDate) : '--';
        const headerDatesStr = (hasTimeGoal || startDate) ? `${startDateStr} <span class="mx-1 opacity-50">&rarr;</span> ${endDateStr}` : "No Timeline Set";

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const msPerDay = 1000 * 60 * 60 * 24;

        const completedCount = group.tasks.filter(x => x.taskObj.completed).length;
        const progressPct = group.totalChapters > 0 ? Math.round((completedCount / group.totalChapters) * 100) : 100;

        let remainingCh = Math.max(0, group.totalChapters - completedCount);
        let actPaceRaw = 0;
        let reqPaceRaw = 0;

        let actualStartDateForPace = null;
        let firstCompletedTaskForPace = group.tasks.find(x => x.taskObj.completed);
        if (firstCompletedTaskForPace) {
            actualStartDateForPace = firstCompletedTaskForPace.taskObj.completedAt ? new Date(firstCompletedTaskForPace.taskObj.completedAt) : window.getTaskDate(firstCompletedTaskForPace.dayObj);
            actualStartDateForPace.setHours(0, 0, 0, 0);
        }

        if (group.totalChapters > 0) {
            if (completedCount > 0 && actualStartDateForPace && actualStartDateForPace <= today) {
                const daysElapsed = Math.max(0, Math.floor((today - actualStartDateForPace) / msPerDay));
                actPaceRaw = daysElapsed > 0 ? completedCount / daysElapsed : completedCount;
            } else if (startDate && startDate <= today) {
                const daysElapsed = Math.max(0, Math.floor((today - startDate) / msPerDay));
                actPaceRaw = daysElapsed > 0 ? completedCount / daysElapsed : (completedCount > 0 ? completedCount : 0);
            }

            if (hasTimeGoal && targetDate) {
                if (today > targetDate) {
                    reqPaceRaw = remainingCh > 0 ? remainingCh : 0;
                } else {
                    let baselineDateForReq = (startDate && startDate > today) ? startDate : today;
                    const daysRemaining = Math.max(1, Math.ceil((targetDate - baselineDateForReq) / msPerDay));
                    reqPaceRaw = remainingCh / daysRemaining;
                }
            }
        }

        const actPace = actPaceRaw.toFixed(2);
        const reqPace = hasTimeGoal ? reqPaceRaw.toFixed(2) : '--';

        let estFinishStr = '--';
        let estDaysNeededStr = '<span class="opacity-60">Unknown</span>';
        if (isFrozen || completedCount >= group.totalChapters) {
            estFinishStr = '<span class="text-emerald-500 font-black">Finished</span>';
            estDaysNeededStr = '<span class="text-emerald-500 font-bold">0 Days</span>';
        } else if (completedCount === 0) {
            estFinishStr = '<span class="text-slate-400 text-[10px]">No Data</span>';
        } else if (actPaceRaw > 0) {
            const daysLeft = remainingCh / actPaceRaw;
            const estDate = new Date(today.getTime() + (daysLeft * msPerDay));
            estFinishStr = formatDateStr(estDate);
            estDaysNeededStr = `${Math.ceil(daysLeft)} Days Needed`;
        }

        let timeGoalCountdownStr = '';
        if (isFrozen || completedCount >= group.totalChapters) {
            timeGoalCountdownStr = '<span class="text-emerald-500 font-bold">Done</span>';
        } else if (!hasTimeGoal) {
            timeGoalCountdownStr = '<span class="text-slate-400 font-bold">No Goal</span>';
        } else {
            let diffDaysTG = Math.ceil((targetDate - today) / msPerDay);
            if (diffDaysTG > 0) timeGoalCountdownStr = `${diffDaysTG} Days Left`;
            else if (diffDaysTG === 0) timeGoalCountdownStr = `<span class="text-orange-500 font-bold">Due Today</span>`;
            else timeGoalCountdownStr = `<span class="text-red-500 font-bold">${Math.abs(diffDaysTG)} Days Overdue</span>`;
        }

        let headerIcon = `<div class="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-${colorClass}-50 dark:bg-${colorClass}-500/10 border border-${colorClass}-100 dark:border-${colorClass}-500/20 shadow-sm shrink-0"><div class="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-${colorClass}-500 ${shadowClass}"></div></div>`;
        if (isFrozen) headerIcon = `<div class="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm shrink-0 text-base md:text-lg drop-shadow-md">🏆</div>`;

        let isDetailsOpen = window.subjectDetailsState[safeSubId] !== undefined ? window.subjectDetailsState[safeSubId] : (subjectsToRender.length === 1);
        let openAttr = isDetailsOpen ? 'open' : '';

        let blockHtml = '';

        if (isFrozen) {
            blockHtml = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50 p-4 md:p-5 rounded-[1.25rem] shadow-sm mb-4">
                    <div class="flex items-center space-x-3 md:space-x-4 w-full">
                        <div class="text-3xl drop-shadow-md">🏆</div>
                        <div class="flex flex-wrap items-center flex-1">
                            <div class="flex items-center w-full">
                                <h2 class="text-lg md:text-xl font-black text-emerald-800 dark:text-emerald-400 tracking-tight truncate flex-1">${displaySubName} <span class="text-[10px] md:text-xs font-bold opacity-70 ml-1 uppercase tracking-widest">- ${group.program}</span></h2>
                            </div>
                            <span class="w-full text-[9px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-500 mt-0.5">Status: Passed & Frozen</span>
                        </div>
                        ${editBtnHtml}
                    </div>
                </div>`;
        } else {
            blockHtml = `
                <details id="details-${safeSubId}" ontoggle="window.subjectDetailsState['${safeSubId}'] = this.open;" class="bg-white dark:bg-slate-800 rounded-[1.25rem] md:rounded-[2rem] shadow-sm border border-slate-200/80 dark:border-slate-700/60 mb-5 group overflow-hidden transition-all duration-300 hover:shadow-md" ${openAttr}>
                    <summary class="cursor-pointer p-4 md:p-6 outline-none select-none list-none flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/80 [&::-webkit-details-marker]:hidden relative z-10">
                        
                        <!-- Left side: Subject, Program, Time Period -->
                        <div class="flex flex-col gap-2.5 w-full lg:w-[40%] shrink-0">
                            <div class="flex items-center gap-3">
                                ${headerIcon}
                                <div class="flex flex-col overflow-hidden w-full pr-2">
                                    <div class="flex items-center w-full">
                                        <h2 class="text-base md:text-[1.1rem] font-black text-slate-800 dark:text-slate-100 tracking-tight truncate flex-1" title="${displaySubName}">${finalTitle}</h2>
                                    </div>
                                </div>
                            </div>
                            <div class="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 lg:ml-[3.25rem] uppercase tracking-widest bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md w-fit border border-slate-200 dark:border-slate-700/50">
                                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <span>${headerDatesStr}</span>
                            </div>
                        </div>

                        <!-- Middle: Progress Bar & Status -->
                        <div class="flex flex-col gap-2 w-full lg:w-[35%] lg:px-4">
                            <div class="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                                <span id="group-text-${safeSubId}" class="text-slate-500 dark:text-slate-400">${completedCount} <span class="opacity-60 text-[9px] mx-0.5">/</span> ${group.totalChapters} <span class="opacity-60">CH</span></span>
                                <span id="group-pct-${safeSubId}" class="text-${colorClass}-600 dark:text-${colorClass}-400 bg-${colorClass}-50 dark:bg-${colorClass}-900/30 px-1.5 py-0.5 rounded border border-${colorClass}-100 dark:border-${colorClass}-800/50 shadow-sm">${progressPct}%</span>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-700/50 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-600/30 relative">
                                <div id="group-bar-${safeSubId}" class="h-full bg-gradient-to-r from-${colorClass}-400 to-${colorClass}-600 transition-all duration-700 ease-out relative" style="width: ${progressPct}%">
                                    <div class="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: EST Finish & Dropdown Arrow -->
                        <div class="flex items-center justify-between lg:justify-end gap-4 lg:gap-6 w-full lg:w-[25%] lg:pl-0">
                            <div class="flex flex-col text-left lg:text-right flex-1 lg:flex-none">
                                <span class="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-0.5">EST. Finish</span>
                                <span id="header-est-${safeSubId}" class="text-xs md:text-sm font-black text-slate-700 dark:text-slate-200">${estFinishStr}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                ${editBtnHtml}
                                <div class="p-2 md:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 group-open:rotate-180 group-open:bg-${colorClass}-50 group-open:text-${colorClass}-600 dark:group-open:bg-${colorClass}-900/30 dark:group-open:text-${colorClass}-400 transition-all duration-300 shrink-0 shadow-sm border border-slate-200/50 dark:border-slate-600/30">
                                    <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </summary>

                    <div class="p-4 md:p-6 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10">
                        
                        <!-- Inside Expanded View: 4 Action Analytics Cards -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                            <div onclick="window.openSubjectTimeModal('${safeSubQuotes}')" class="relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center text-center hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 transition-all cursor-pointer group/tg scale-100 active:scale-[0.98]">
                                <div class="absolute top-2 right-2 opacity-0 group-hover/tg:opacity-100 transition-opacity"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></div>
                                <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time Goal</span>
                                <span class="text-sm md:text-[1.05rem] font-black text-slate-800 dark:text-slate-100 leading-tight">${endDateStr}</span>
                                <span id="tg-tg-days-${safeSubId}" class="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">${timeGoalCountdownStr}</span>
                                ${linkLabel}
                            </div>
                            <div class="relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm flex flex-col justify-center text-center">
                                <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-500/90 dark:text-blue-400/90 mb-1">Req Pace</span>
                                <span class="text-sm md:text-[1.1rem] font-black text-blue-700 dark:text-blue-400"><span id="tg-req-${safeSubId}">${reqPace}</span> <span class="text-[9px] opacity-70 font-bold uppercase tracking-widest">ch/d</span></span>
                            </div>
                            <div class="relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br from-${colorClass}-50/80 to-${colorClass}-100/50 dark:from-${colorClass}-900/20 dark:to-${colorClass}-900/30 rounded-2xl border border-${colorClass}-100 dark:border-${colorClass}-800/50 shadow-sm flex flex-col justify-center text-center">
                                <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-${colorClass}-500/90 dark:text-${colorClass}-400/90 mb-1">Actual Pace</span>
                                <span class="text-sm md:text-[1.1rem] font-black text-${colorClass}-700 dark:text-${colorClass}-400"><span id="tg-act-${safeSubId}">${actPace}</span> <span class="text-[9px] opacity-70 font-bold uppercase tracking-widest">ch/d</span></span>
                            </div>
                            <div class="relative overflow-hidden p-3.5 md:p-5 bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/30 rounded-2xl border border-orange-100 dark:border-orange-800/50 shadow-sm flex flex-col justify-center text-center">
                                <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-orange-500/90 dark:text-orange-400/90 mb-1">Est. Finish</span>
                                <span id="tg-est-${safeSubId}" class="text-sm md:text-[1.05rem] font-black text-orange-600 dark:text-orange-400">${estFinishStr}</span>
                                <span id="tg-est-days-${safeSubId}" class="text-[9px] text-orange-500/80 font-bold mt-0.5">${estDaysNeededStr}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                            ${group.tasks.map(x => generateSingleTaskHtml(x.dayObj, x.taskObj, x.trackId, x.itemIndex)).join('')}
                        </div>
            `;
        }

        if (isRevising) {
            if (isFrozen) {
                blockHtml += `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 p-4 md:p-5 rounded-[1.25rem] shadow-sm mb-4">
                    <div class="flex items-center space-x-3 md:space-x-4 w-full">
                        <div class="text-3xl drop-shadow-md">🏅</div>
                        <div class="flex flex-wrap items-center flex-1">
                            <h2 class="text-lg md:text-xl font-black text-blue-800 dark:text-blue-400 tracking-tight">${displaySubName} (Revision Phase)</h2>
                            <span class="w-full text-[9px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-500 mt-0.5">Status: Revision Passed & Frozen</span>
                        </div>
                    </div>
                </div>`;
            } else {
                let revCompletedCount = window.revisionData.progress[sub] ? Object.values(window.revisionData.progress[sub]).filter(Boolean).length : 0;
                let revPct = group.totalChapters > 0 ? Math.round((revCompletedCount / group.totalChapters) * 100) : 0;

                let revGridHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 mt-4">`;
                for (let i = 1; i <= group.totalChapters; i++) {
                    let isCompleted = window.revisionData.progress[sub] && window.revisionData.progress[sub][i];
                    if (typeof window.generateRevisionTaskHtml === 'function') {
                        revGridHtml += window.generateRevisionTaskHtml(sub, i, isCompleted);
                    }
                }
                revGridHtml += `</div>`;

                let revisionHeaderHtml = `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-blue-200 dark:border-blue-800/50 pb-3 gap-3">
                        <div class="flex flex-wrap items-center gap-y-2 space-x-3 w-full">
                            <div class="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse"></div>
                            <h2 class="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">${displaySubName} <span class="text-sm font-bold opacity-70 ml-1">- Revision Phase</span></h2>
                            <button onclick="window.openRevisionTrendModal()" class="ml-auto text-[9px] md:text-[10px] font-black text-white bg-blue-600 px-2.5 md:px-4 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg> Analytics</button>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50 w-fit mb-4">
                        <span id="rev-group-text-${safeSubId}" class="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">${revCompletedCount} <span class="opacity-60 text-[9px] mx-0.5">/</span> ${group.totalChapters} <span class="opacity-60">CH</span></span>
                        <span id="rev-group-pct-${safeSubId}" class="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-[10px] font-black border border-blue-100 dark:border-blue-800/50 shadow-sm">${revPct}%</span>
                        <div class="w-24 md:w-32 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-600/30">
                            <div id="rev-group-bar-${safeSubId}" class="h-full bg-blue-500 transition-all duration-500 ease-out relative" style="width: ${revPct}%"><div class="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full"></div></div>
                        </div>
                    </div>
                `;

                blockHtml += `<div class="mt-8 w-full bg-blue-50/40 dark:bg-blue-900/10 p-4 md:p-6 rounded-[2rem] border-2 border-blue-200 dark:border-blue-800/50 shadow-sm relative overflow-hidden"><div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>${revisionHeaderHtml}${revGridHtml}</div>`;
            }
        }

        if (!isFrozen) {
            blockHtml += `
                    </div>
                </details>
            `;
        }

        html += blockHtml;
    });

    if (html === '') html = `<div class="flex flex-col items-center py-12 text-slate-400"><span class="text-4xl mb-4">📭</span><p class="font-black uppercase tracking-widest text-sm">No tasks scheduled for this selection</p></div>`;

    list.innerHTML = html;
    document.querySelectorAll('.task-checkbox').forEach(cb => cb.onchange = window.handleTaskToggle);
}

// Bind to window
window.rebuildTaskDates = rebuildTaskDates;
window.updateGlobalDates = updateGlobalDates;
window.renderUI = renderUI;
window.setupFocusTodayButton = setupFocusTodayButton;
window.renderSubjectProgress = renderSubjectProgress;
window.renderCategoryProgress = renderCategoryProgress;
window.renderDailyTracker = renderDailyTracker;
window.renderDailyLogs = renderDailyLogs;
window.generateSingleTaskHtml = generateSingleTaskHtml;
window.renderTaskList = renderTaskList;

export { rebuildTaskDates, updateGlobalDates, renderUI, setupFocusTodayButton, renderSubjectProgress, renderCategoryProgress, renderDailyTracker, renderDailyLogs, generateSingleTaskHtml, renderTaskList };
