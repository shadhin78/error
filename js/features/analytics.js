function renderHeatmap() {
    const container = document.getElementById('yearly-daily-grid');
    if (!container) return;
    let html = '';
    for (let i = window.tasks.length - 1; i >= 0; i--) {
        const t = window.tasks[i];
        if (window.getTaskDate(t) > new Date()) continue;
        let c = 0; window.customActions.forEach(a => { if (t[a.id]) c++; });
        const pct = window.customActions.length > 0 ? Math.round((c / window.customActions.length) * 100) : 0;
        let bg = 'bg-white dark:bg-slate-800/60 text-slate-400 border border-slate-200 dark:border-slate-700/60 opacity-70';
        if (pct > 0 && pct <= 25) bg = 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)] border-transparent opacity-100';
        if (pct > 25 && pct <= 50) bg = 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)] border-transparent opacity-100';
        if (pct > 50 && pct <= 75) bg = 'bg-gradient-to-br from-lime-400 to-lime-500 text-white shadow-[0_2px_8px_rgba(132,204,22,0.3)] border-transparent opacity-100';
        if (pct > 75) bg = 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-[0_2px_8px_rgba(34,197,94,0.4)] border-transparent opacity-100';
        html += `<div class="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${bg} w-[42px] sm:w-[50px] md:w-[55px] h-[52px] sm:h-[60px] md:h-[65px] shrink-0 font-black hover:-translate-y-1 transition-all cursor-default"><span class="text-[7px] sm:text-[8px] uppercase opacity-90 mb-0.5">${t.date.split(' ')[0]}</span><span class="text-[10px] sm:text-xs md:text-sm">${t.date.split(' ')[1]}</span></div>`;
    }
    container.innerHTML = html;
}

function setDailyState(type, state) {
    const todayStr = window.formatDate(new Date());
    const idx = window.tasks.findIndex(t => t.date === todayStr);

    if (idx > -1) {
        window.tasks[idx][type] = state;
        if (typeof window.saveTasks === 'function') window.saveTasks();
        if (typeof window.renderDailyTracker === 'function') window.renderDailyTracker();
        if (typeof window.renderDailyLogs === 'function') window.renderDailyLogs();

        const dbModal = document.getElementById('daily-actions-db-modal');
        if (dbModal && !dbModal.classList.contains('hidden')) {
            if (typeof window.openDailyActionsDBModal === 'function') window.openDailyActionsDBModal();
        }

        if (window.chartDebounce) clearTimeout(window.chartDebounce);
        window.chartDebounce = setTimeout(() => {
            if (typeof window.renderTrendCharts === 'function') {
                requestAnimationFrame(window.renderTrendCharts);
            }
        }, 500);
    }
}

function populateAnalyticsModal(typeKey) {
    window.currentAnalyticsAction = typeKey;
    const cfgAct = window.customActions.find(a => a.id === typeKey);
    if (!cfgAct) return;
    const cMap = window.twColors[cfgAct.color];

    window.safeSetText('am-title', cfgAct.title + " Analytics");
    window.safeSetClass('am-icon-box', `p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl shadow-inner shrink-0 ${cMap.bgLt} ${cMap.text}`);

    const statBoxes = ['am-stat-box-1', 'am-stat-box-2', 'am-stat-box-3'];
    statBoxes.forEach(id => window.safeSetClass(id, `p-2.5 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-3xl border shadow-sm flex flex-col justify-center ${cMap.bgLt} ${cMap.borderLt}`));

    const statLabels = ['am-stat-label-1', 'am-stat-label-2', 'am-stat-label-3'];
    statLabels.forEach(id => window.safeSetClass(id, `block text-[7px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 md:mb-1.5 leading-tight ${cMap.text}`));

    const todayStr = window.formatDate(new Date());
    let idx = window.tasks.findIndex(t => t.date === todayStr); if (idx === -1) idx = window.tasks.length - 1;

    let total = 0; window.tasks.forEach((t, i) => { if (i <= idx && t[typeKey]) total++; });
    let streak = 0; for (let i = idx; i >= 0; i--) { if (window.tasks[i][typeKey]) streak++; else break; }

    window.safeSetText('am-total', total); window.safeSetText('am-streak', streak + ' Days');
    const pct = Math.round((total / (idx + 1)) * 100) || 0;
    window.safeSetText('am-percent', pct + '%');
    const valClass = `text-base sm:text-2xl md:text-5xl font-black drop-shadow-sm mt-0.5 sm:mt-1 ${cMap.text}`;
    window.safeSetClass('am-total', valClass);
    window.safeSetClass('am-streak', valClass);
    window.safeSetClass('am-percent', valClass);

    const sYear = window.globalStartDate ? window.globalStartDate.getFullYear() : window.PLAN_START_DATE.getFullYear();
    const sMonth = window.globalStartDate ? window.globalStartDate.getMonth() : window.PLAN_START_DATE.getMonth();
    const eYear = window.globalEndDate ? window.globalEndDate.getFullYear() : window.PLAN_END_DATE.getFullYear();
    const eMonth = window.globalEndDate ? window.globalEndDate.getMonth() : window.PLAN_END_DATE.getMonth();
    const totalMonths = Math.max(1, (eYear - sYear) * 12 + (eMonth - sMonth) + 1);

    const months = [];
    for (let i = 0; i < totalMonths; i++) {
        const d = new Date(sYear, sMonth + i, 1);
        months.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }

    let data = Array(totalMonths).fill(0);
    window.tasks.forEach(t => {
        const taskDate = window.getTaskDate(t);
        const tYear = taskDate.getFullYear();
        const tMonth = taskDate.getMonth();
        const mIdx = (tYear - sYear) * 12 + (tMonth - sMonth);
        if (mIdx >= 0 && mIdx < totalMonths && t[typeKey]) data[mIdx]++;
    });

    const canvas = document.getElementById('masterLineChart');
    if (canvas) {
        if (window.masterLineChart) {
            window.masterLineChart.data.datasets[0].data = data;
            window.masterLineChart.data.datasets[0].borderColor = cMap.hex;
            window.masterLineChart.data.datasets[0].backgroundColor = cMap.hex + '25';
            window.masterLineChart.data.datasets[0].pointBackgroundColor = cMap.hex;
            window.masterLineChart.update('none');
        } else {
            window.masterLineChart = new Chart(canvas.getContext('2d'), {
                type: 'line', data: { labels: months, datasets: [{ data, borderColor: cMap.hex, tension: 0.4, fill: true, backgroundColor: cMap.hex + '25', borderWidth: window.innerWidth < 640 ? 2 : 3, pointBackgroundColor: cMap.hex, pointRadius: window.innerWidth < 640 ? 0 : 3, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', cornerRadius: 8, padding: 10 } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.08)', drawBorder: false, borderDash: [5, 5] }, ticks: { font: { size: window.innerWidth < 640 ? 8 : 10 }, color: '#64748b' } }, x: { grid: { display: false, drawBorder: false }, ticks: { font: { size: window.innerWidth < 640 ? 8 : 10 }, color: '#64748b', maxTicksLimit: window.innerWidth < 640 ? 6 : 12 } } } }
            });
        }
    }

    const grid = document.getElementById('am-grid');
    if (grid) {
        let gHtml = '';
        for (let i = idx; i >= Math.max(0, idx - 179); i--) {
            const t = window.tasks[i]; const done = t[typeKey];
            const btnClass = done ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-[0_2px_8px_rgba(34,197,94,0.4)] border-transparent' : 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] border-transparent';
            gHtml += `<button onclick="toggleModalDay(${t.id}, '${typeKey}')" class="flex flex-col items-center justify-center p-1 sm:p-1.5 md:p-2 rounded-lg sm:rounded-xl ${btnClass} transition-all duration-300 w-full aspect-square shrink-0 hover:scale-105 active:scale-90 focus:outline-none snap-start"><span class="text-[6px] sm:text-[7px] md:text-[9px] uppercase font-black opacity-90 mb-0.5">${t.date.split(' ')[0]}</span><span class="text-[9px] sm:text-[11px] md:text-sm font-black leading-none">${t.date.split(' ')[1]}</span></button>`;
        }
        grid.innerHTML = gHtml;
    }
}

function openGoalDetailsModal(goalId) {
    const goal = window.paceGoals.find(g => g.id === goalId);
    if (!goal || !window.lastSubjectStats) return;

    const subjectStats = window.lastSubjectStats;
    let targetedSubjects = new Set();
    let scopeHtml = '';

    if (goal.type === 'global') {
        const isManual = goal.subjects || goal.secondaryPaces;
        if (isManual) {
            if (goal.subjects) goal.subjects.forEach(s => targetedSubjects.add(s));
            if (goal.secondaryPaces) {
                goal.secondaryPaces.forEach(pid => {
                    const g = window.paceGoals.find(x => x.id === pid);
                    if (g) {
                        if (g.type === 'bundle') {
                            if (g.subjects) g.subjects.forEach(s => targetedSubjects.add(s));
                            if (g.programs) {
                                window.customTracks.forEach(track => (window.syllabusStructure[track.id] || []).forEach(s => { if (g.programs.includes(s.program)) targetedSubjects.add(s.subject); }));
                            }
                        } else if (g.type === 'subject') {
                            targetedSubjects.add(g.target);
                        } else if (g.type === 'program') {
                            window.customTracks.forEach(track => (window.syllabusStructure[track.id] || []).forEach(s => { if (g.target === s.program) targetedSubjects.add(s.subject); }));
                        }
                    }
                });
            }
            let detailText = `Manually mapped ${goal.subjects ? goal.subjects.length : 0} explicit Subjects and ${goal.secondaryPaces ? goal.secondaryPaces.length : 0} Secondary Paces.`;
            scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-xl shadow-sm">${detailText}</div>`;
        } else {
            window.paceGoals.forEach(g => {
                if (g.id === goal.id) return;
                const gStart = g.startDate ? window.parseDateSafe(g.startDate) : new Date(window.globalStartDate);
                const gEnd = g.deadline ? window.parseDateSafe(g.deadline) : new Date(window.globalEndDate);
                gStart.setHours(0, 0, 0, 0); gEnd.setHours(23, 59, 59, 999);
                if (gEnd < window.globalStartDate || gStart > window.globalEndDate) return;

                if (g.type === 'bundle') {
                    if (g.subjects) g.subjects.forEach(s => targetedSubjects.add(s));
                    if (g.programs) {
                        window.customTracks.forEach(track => (window.syllabusStructure[track.id] || []).forEach(s => { if (g.programs.includes(s.program)) targetedSubjects.add(s.subject); }));
                    }
                } else if (g.type === 'subject') targetedSubjects.add(g.target);
                else if (g.type === 'program') {
                    window.customTracks.forEach(track => (window.syllabusStructure[track.id] || []).forEach(s => { if (g.target === s.program) targetedSubjects.add(s.subject); }));
                }
            });
            scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-xl shadow-sm">Aggregates mapped subjects intersecting with the Global Timeline bounds.</div>`;
        }
    } else if (goal.type === 'bundle') {
        if (goal.subjects) {
            goal.subjects.forEach(s => targetedSubjects.add(s));
            scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-3 rounded-xl shadow-sm">Custom explicit selection of ${goal.subjects.length} subjects.</div>`;
        } else if (goal.programs) {
            let pList = goal.programs.join(', ');
            scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 p-3 rounded-xl shadow-sm">Programs Scoped: <span class="text-violet-600 dark:text-violet-400">${pList}</span></div>`;
            window.customTracks.forEach(track => {
                (window.syllabusStructure[track.id] || []).forEach(s => {
                    if (goal.programs.includes(s.program)) targetedSubjects.add(s.subject);
                });
            });
        }
    } else if (goal.type === 'subject') {
        targetedSubjects.add(goal.target);
    } else if (goal.type === 'program') {
        scopeHtml = `<div class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 p-3 rounded-xl shadow-sm">Program Scoped: <span class="text-violet-600 dark:text-violet-400">${goal.target}</span></div>`;
        window.customTracks.forEach(track => { (window.syllabusStructure[track.id] || []).forEach(s => { if (s.program === goal.target) targetedSubjects.add(s.subject); }); });
    }

    let total = 0; let completed = 0;
    let subjectsListHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">';
    targetedSubjects.forEach(sub => {
        if (subjectStats[sub]) {
            total += subjectStats[sub].totalChapters;
            completed += subjectStats[sub].effectiveChapters;

            let sChTotal = subjectStats[sub].totalChapters;
            let sChDone = Math.round(subjectStats[sub].effectiveChapters);
            let sPct = sChTotal > 0 ? Math.round((sChDone / sChTotal) * 100) : 0;
            let color = window.getSubjectColor(sub);

            let sObj = null;
            window.customTracks.forEach(t => {
                const m = (window.syllabusStructure[t.id] || []).find(s => s.subject === sub);
                if (m) sObj = m;
            });
            let progName = sObj ? sObj.program : '';
            let displaySub = sub.replace(progName + ' - ', '').replace(progName + ' ', '');

            subjectsListHtml += `
            <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-1.5 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
                <div class="flex justify-between items-start mb-0.5">
                    <div class="flex flex-col pr-2">
                        <span class="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">${progName}</span>
                        <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight" title="${sub}"><div class="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-[1px]" style="background-color: ${color}"></div>${displaySub}</span>
                    </div>
                    <span class="text-[9px] md:text-[10px] font-black text-slate-500 shrink-0 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-sm border border-slate-100 dark:border-slate-700">${sChDone} / ${sChTotal}</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-auto">
                    <div class="h-full rounded-full transition-all duration-700 shadow-sm" style="width: ${sPct}%; background-color: ${color}"></div>
                </div>
            </div>`;
        }
    });
    subjectsListHtml += '</div>';

    if (targetedSubjects.size === 0) subjectsListHtml = '<div class="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl"><p class="text-xs font-bold text-slate-400">No subjects currently mapped or active in this scope.</p></div>';

    const startDate = goal.startDate ? window.parseDateSafe(goal.startDate) : new Date(window.PLAN_START_DATE);
    const targetDate = window.parseDateSafe(goal.deadline);
    startDate.setHours(0, 0, 0, 0); targetDate.setHours(23, 59, 59, 999);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    const remaining = Math.max(0, total - completed);
    const totalDays = Math.max(1, Math.ceil((targetDate - startDate) / msPerDay));
    const daysElapsed = Math.max(0, Math.floor((today - startDate) / msPerDay));
    const daysRemaining = Math.max(0, Math.ceil((targetDate - today) / msPerDay));

    let reqPaceVal = 0; let curPaceVal = 0;
    if (total > 0) {
        if (today < startDate || today > targetDate) {
            reqPaceVal = today < startDate ? total / totalDays : (remaining > 0 ? remaining : 0);
            curPaceVal = 0;
        } else {
            reqPaceVal = remaining > 0 ? remaining / Math.max(1, daysRemaining) : 0;
            curPaceVal = daysElapsed > 0 ? completed / daysElapsed : (completed > 0 ? completed : 0);
        }
    }

    window.safeSetText('gdm-title', goal.target);
    window.safeSetText('gdm-dates', `Timeline: ${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} - ${targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`);

    window.safeSetText('gdm-stat-req', reqPaceVal.toFixed(2));
    window.safeSetText('gdm-stat-cur', curPaceVal.toFixed(2));
    window.safeSetText('gdm-stat-rem', remaining.toFixed(1));

    document.getElementById('gdm-scope-list').innerHTML = scopeHtml + subjectsListHtml;

    if (typeof window.openModal === 'function') window.openModal('goal-details-modal');
}

function openGlobalHistoryModal() {
    window.renderGlobalHistoryContent();
    if (typeof window.openModal === 'function') window.openModal('global-history-modal');
}

function renderGlobalHistoryContent() {
    const container = document.getElementById('ghm-list');
    if (!container) return;

    const scrollViews = {
        timeline: document.getElementById('ghm-view-timeline')?.scrollTop || 0,
        subject: document.getElementById('ghm-view-subject')?.scrollTop || 0,
        trend: document.getElementById('ghm-view-trend')?.scrollTop || 0
    };

    let subjectLogs = {};
    let allEvents = [];

    window.customTracks.forEach(track => {
        (window.syllabusStructure[track.id] || []).forEach(s => {
            subjectLogs[s.subject] = {
                program: s.program,
                total: s.chapters,
                passed: window.passedItems.subjects.includes(s.subject) || window.passedItems.programs.includes(s.program),
                chapters: [],
                revisions: []
            };
        });
    });

    window.tasks.forEach(t => {
        if (t.type === 'study' && t.trackTasks) {
            const fallbackDate = window.getTaskDate(t);
            Object.values(t.trackTasks).forEach(items => {
                items.forEach(item => {
                    if (item.completed && subjectLogs[item.subject]) {
                        let actualDate = item.completedAt ? new Date(item.completedAt) : fallbackDate;
                        if (isNaN(actualDate.getTime())) actualDate = fallbackDate;
                        let displayDate = actualDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        let ts = actualDate.getTime();
                        subjectLogs[item.subject].chapters.push({ ch: item.chapter, date: displayDate, ts: ts });
                        allEvents.push({ type: 'Chapter', subject: item.subject, item: item.chapter, date: displayDate, ts: ts });
                    }
                });
            });
        }
    });

    Object.values(subjectLogs).forEach(log => {
        log.chapters.sort((a, b) => a.ts - b.ts);
    });

    Object.keys(window.revisionData?.progress || {}).forEach(sub => {
        if (subjectLogs[sub]) {
            Object.keys(window.revisionData.progress[sub]).forEach(chNum => {
                const val = window.revisionData.progress[sub][chNum];
                if (val) {
                    let actualDate = (typeof val === 'string' && val.includes('T')) ? new Date(val) : new Date();
                    if (isNaN(actualDate.getTime())) actualDate = new Date();
                    let ts = actualDate.getTime();
                    let dStr = actualDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    subjectLogs[sub].revisions.push({ ch: 'Ch. ' + chNum, date: dStr, ts: ts });
                    allEvents.push({ type: 'Revision', subject: sub, item: 'Ch. ' + chNum, date: dStr, ts: ts });
                }
            });
            subjectLogs[sub].revisions.sort((a, b) => a.ts - b.ts);
        }
    });

    allEvents.sort((a, b) => b.ts - a.ts);

    let subjectHtml = '';
    Object.keys(subjectLogs).forEach(sub => {
        const log = subjectLogs[sub];
        if (log.chapters.length === 0 && log.revisions.length === 0 && !log.passed) return;

        const isSubjectComplete = log.chapters.length >= log.total && log.total > 0;
        const completionDate = isSubjectComplete ? log.chapters[log.chapters.length - 1].date : null;

        const color = window.getSubjectColor(sub);
        let subDisplay = sub.replace(log.program + ' - ', '').replace(log.program + ' ', '');

        let statusBadges = '';
        if (log.passed) statusBadges += `<span class="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">Frozen/Passed</span>`;
        else if (isSubjectComplete) statusBadges += `<span class="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">Completed: ${completionDate.split(',')[0]}</span>`;
        else statusBadges += `<span class="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">In Progress (${log.chapters.length}/${log.total})</span>`;

        subjectHtml += `
        <details class="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group mb-3">
            <summary class="cursor-pointer p-4 outline-none select-none list-none flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-[0.99] rounded-xl transition-all [&::-webkit-details-marker]:hidden">
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center space-x-2">
                        <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background-color: ${color}"></div>
                        <span class="font-black text-xs md:text-sm text-slate-800 dark:text-slate-200">${subDisplay}</span>
                    </div>
                    <div class="flex gap-2 items-center pl-4.5">${statusBadges}</div>
                </div>
                <svg class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </summary>
            <div class="p-4 pt-0 border-t border-slate-200 dark:border-slate-700/60 pl-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <h5 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">First Pass Database</h5>
                        <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            ${log.chapters.length > 0 ? log.chapters.map(c => `
                                <div class="flex justify-between items-center text-xs bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                    <span class="font-bold text-slate-700 dark:text-slate-300">${c.ch}</span>
                                    <span class="text-[9px] font-black text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-inner whitespace-nowrap">${c.date}</span>
                                </div>
                            `).join('') : '<span class="text-[10px] text-slate-500 italic">No chapters completed yet.</span>'}
                        </div>
                    </div>
                    <div>
                        <h5 class="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Revision Database</h5>
                        <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            ${log.revisions.length > 0 ? log.revisions.map(r => `
                                <div class="flex justify-between items-center text-xs bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                    <span class="font-bold text-blue-700 dark:text-blue-400">${r.ch}</span>
                                    <span class="text-[9px] font-black text-blue-500/70 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded shadow-inner whitespace-nowrap">${r.date}</span>
                                </div>
                            `).join('') : '<span class="text-[10px] text-slate-500 italic">No revisions completed yet.</span>'}
                        </div>
                    </div>
                </div>
            </div>
        </details>
        `;
    });

    let timelineHtml = allEvents.map(e => `
        <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center space-x-3">
                <div class="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style="background-color: ${window.getSubjectColor(e.subject)}"></div>
                <div class="flex flex-col">
                    <span class="text-xs md:text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">${e.subject}</span>
                    <span class="text-[10px] font-bold text-slate-500 mt-0.5">${e.item}</span>
                </div>
            </div>
            <div class="flex flex-col items-end shrink-0 ml-4">
                <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm ${e.type === 'Revision' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}">${e.type}</span>
                <span class="text-[10px] font-bold text-slate-400 mt-1 whitespace-nowrap">${e.date}</span>
            </div>
        </div>
    `).join('');

    // Data mapping for Trend Chart
    let chartStart = new Date(window.PLAN_START_DATE.getTime());
    let chartEnd = new Date(window.PLAN_END_DATE.getTime());
    const todayObj = new Date();
    if (todayObj > chartEnd) chartEnd = new Date(todayObj);

    const sYear = chartStart.getFullYear();
    const sMonth = chartStart.getMonth();
    const eYear = chartEnd.getFullYear();
    const eMonth = chartEnd.getMonth();
    const totalMonths = Math.max(1, (eYear - sYear) * 12 + (eMonth - sMonth) + 1);

    const months = [];
    for (let i = 0; i < totalMonths; i++) {
        const d = new Date(sYear, sMonth + i, 1);
        months.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }

    let studyData = Array(totalMonths).fill(0);
    let revData = Array(totalMonths).fill(0);

    allEvents.forEach(e => {
        let d = new Date(e.ts);
        let mIdx = (d.getFullYear() - sYear) * 12 + (d.getMonth() - sMonth);

        // Snap any historically early completions into the first month's baseline
        if (mIdx < 0) mIdx = 0;

        if (mIdx >= 0 && mIdx < totalMonths) {
            if (e.type === 'Chapter') studyData[mIdx]++;
            if (e.type === 'Revision') revData[mIdx]++;
        }
    });

    for (let i = 1; i < totalMonths; i++) {
        studyData[i] += studyData[i - 1];
        revData[i] += revData[i - 1];
    }

    const todayMidx = (todayObj.getFullYear() - sYear) * 12 + (todayObj.getMonth() - sMonth);

    // Prevent future timelines from resolving negative and wiping out index 0 (breaking the chart)
    const safeTodayMidx = Math.max(0, todayMidx);

    for (let i = safeTodayMidx + 1; i < totalMonths; i++) {
        studyData[i] = null;
        revData[i] = null;
    }

    container.innerHTML = `
        <div class="sticky top-0 z-10 bg-white dark:bg-slate-800 flex space-x-2 md:space-x-4 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 pt-1 shrink-0 overflow-x-auto scrollbar-hide">
            <button id="ghm-tab-btn-timeline" onclick="window.switchGhmTab('timeline')" class="px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${window.currentGhmTab === 'timeline' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'} whitespace-nowrap">Timeline Entry</button>
            <button id="ghm-tab-btn-subject" onclick="window.switchGhmTab('subject')" class="px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${window.currentGhmTab === 'subject' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'} whitespace-nowrap">Subject Folder</button>
            <button id="ghm-tab-btn-trend" onclick="window.switchGhmTab('trend')" class="px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${window.currentGhmTab === 'trend' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'} whitespace-nowrap">Trend Chart</button>
        </div>
        <div id="ghm-view-timeline" class="flex-1 flex flex-col gap-2 relative ${window.currentGhmTab !== 'timeline' ? 'hidden' : ''}">
            ${timelineHtml || '<div class="p-8 text-center text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mt-2">No timeline data available. Complete tasks to build history.</div>'}
        </div>
        <div id="ghm-view-subject" class="flex-1 flex flex-col relative ${window.currentGhmTab !== 'subject' ? 'hidden' : ''}">
            ${subjectHtml || '<div class="p-8 text-center text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mt-2">No subject data generated yet. Complete tasks to build the database.</div>'}
        </div>
        <div id="ghm-view-trend" class="flex-1 flex flex-col relative min-h-[300px] ${window.currentGhmTab !== 'trend' ? 'hidden' : ''}">
            <div class="relative w-full h-[300px] sm:h-[400px] mt-2"><canvas id="globalDatabaseChart"></canvas></div>
        </div>
    `;

    // Render Chart
    const ctxChart = document.getElementById('globalDatabaseChart');
    if (ctxChart) {
        if (window.globalHistoryChartInstance) window.globalHistoryChartInstance.destroy();

        Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';
        window.globalHistoryChartInstance = new Chart(ctxChart.getContext('2d'), {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Study Chapters (Burn-up)',
                        data: studyData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        tension: 0.4, borderWidth: 3, fill: true,
                        pointBackgroundColor: '#3b82f6', pointRadius: 4, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff'
                    },
                    {
                        label: 'Revision Chapters (Burn-up)',
                        data: revData,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        tension: 0.4, borderWidth: 3, fill: true,
                        pointBackgroundColor: '#8b5cf6', pointRadius: 4, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff'
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { weight: 'bold' } } },
                    tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#fff', bodyColor: '#cbd5e1', cornerRadius: 8, padding: 12, callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y}` } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false }, ticks: { font: { weight: 'bold' } } },
                    x: { grid: { display: false, drawBorder: false }, ticks: { font: { weight: 'bold' } } }
                }
            }
        });
    }

    if (window.currentGhmTab === 'trend' && window.globalHistoryChartInstance) {
        setTimeout(() => window.globalHistoryChartInstance.resize(), 50);
    }

    requestAnimationFrame(() => {
        const tlView = document.getElementById('ghm-view-timeline');
        const subView = document.getElementById('ghm-view-subject');
        const trendView = document.getElementById('ghm-view-trend');
        if (tlView) tlView.scrollTop = scrollViews.timeline;
        if (subView) subView.scrollTop = scrollViews.subject;
        if (trendView) trendView.scrollTop = scrollViews.trend;
    });
}

function switchGhmTab(tab) {
    window.currentGhmTab = tab;
    ['timeline', 'subject', 'trend'].forEach(t => {
        const view = document.getElementById('ghm-view-' + t);
        const btn = document.getElementById('ghm-tab-btn-' + t);
        if (!view || !btn) return;

        if (t === tab) {
            view.classList.remove('hidden');
            btn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-blue-600 text-white shadow-md whitespace-nowrap";
        } else {
            view.classList.add('hidden');
            btn.className = "px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap";
        }
    });

    if (tab === 'trend' && window.globalHistoryChartInstance) {
        setTimeout(() => window.globalHistoryChartInstance.resize(), 50);
    }
}

// Bind to window
window.renderHeatmap = renderHeatmap;
window.setDailyState = setDailyState;
window.populateAnalyticsModal = populateAnalyticsModal;
window.openGoalDetailsModal = openGoalDetailsModal;
window.openGlobalHistoryModal = openGlobalHistoryModal;
window.renderGlobalHistoryContent = renderGlobalHistoryContent;
window.switchGhmTab = switchGhmTab;

export { renderHeatmap, setDailyState, populateAnalyticsModal, openGoalDetailsModal, openGlobalHistoryModal, renderGlobalHistoryContent, switchGhmTab };
