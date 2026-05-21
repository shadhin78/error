function updateMetrics() {
    const subjectStats = {};
    window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []).forEach(sub => {
        subjectStats[sub.subject] = { totalChapters: sub.chapters, tasksAssigned: 0, tasksCompleted: 0 };
    });

    window.tasks.filter(t => t.type === 'study' && t.trackTasks).forEach(task => {
        Object.keys(task.trackTasks).forEach(trackId => {
            task.trackTasks[trackId].forEach(item => {
                if (subjectStats[item.subject]) {
                    subjectStats[item.subject].tasksAssigned++;
                    if (item.completed) subjectStats[item.subject].tasksCompleted++;
                }
            });
        });
    });

    for (const sub in subjectStats) {
        const stats = subjectStats[sub];
        const allSubs = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []);
        const sObj = allSubs.find(s => s.subject === sub);
        const isFrozen = window.passedItems && ((window.passedItems.subjects && window.passedItems.subjects.includes(sub)) || (window.passedItems.programs && window.passedItems.programs.includes(sObj ? sObj.program : '')));

        if (isFrozen) {
            stats.effectiveChapters = stats.totalChapters;
        } else {
            const ratio = stats.tasksAssigned > 0 ? stats.tasksCompleted / stats.tasksAssigned : 0;
            stats.effectiveChapters = ratio * stats.totalChapters;
        }
    }

    window.lastSubjectStats = subjectStats; // Cache for the details modal

    // 1. Calculate Absolute Completion Progress (Top UI Bar - ALL SUBJECTS)
    let scopeTotalChapters = 0;
    let scopeCompleted = 0;
    const allSubs = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []).map(s => s.subject);
    allSubs.forEach(sub => {
        if (subjectStats[sub]) {
            scopeTotalChapters += subjectStats[sub].totalChapters;
            scopeCompleted += subjectStats[sub].effectiveChapters;
        }
    });

    const percentage = scopeTotalChapters > 0 ? Math.round((scopeCompleted / scopeTotalChapters) * 100) : 0;
    const displayCompleted = Math.round(scopeCompleted);

    window.safeSetText('progress-title', "Global Overall Completion");
    window.safeSetText('progress-text', `${percentage}%`);
    window.safeSetText('progress-detail', `${displayCompleted} / ${scopeTotalChapters} Chapters`);

    const pBar = document.getElementById('progress-bar');
    if (pBar) pBar.style.width = `${percentage}%`;

    // 2. Accurate Aggregated Pace Engine (Top Boxes)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    if (!window.globalStartDate || !window.globalEndDate) {
        // FALLBACK: Use actual pace based on 1st completed chapter across the entire system
        let earliestDate = null;
        window.tasks.forEach(t => {
            if (t.type === 'study' && t.trackTasks) {
                Object.values(t.trackTasks).flat().forEach(item => {
                    if (item.completed) {
                        let d = item.completedAt ? new Date(item.completedAt) : window.getTaskDate(t);
                        if (!earliestDate || d < earliestDate) earliestDate = d;
                    }
                });
            }
        });

        let paceTotalChapters = scopeTotalChapters;
        let paceCompleted = scopeCompleted;
        let remaining = Math.max(0, paceTotalChapters - paceCompleted);

        let globalCurPace = 0;
        let start = earliestDate ? new Date(earliestDate) : new Date(today);
        start.setHours(0, 0, 0, 0);

        if (earliestDate && start <= today) {
            const daysElapsed = Math.max(0, Math.floor((today - start) / msPerDay));
            globalCurPace = daysElapsed > 0 ? paceCompleted / daysElapsed : (paceCompleted > 0 ? paceCompleted : 0);
        }

        window.latestPaceData = {
            total: paceTotalChapters,
            completed: paceCompleted,
            start: new Date(start),
            end: globalCurPace > 0 ? new Date(today.getTime() + (remaining / globalCurPace) * msPerDay) : new Date(today),
            today: new Date(today),
            reqPace: 0,
            curPace: globalCurPace,
            projectedDate: paceTotalChapters === 0 || globalCurPace <= 0 ? new Date(0) : new Date(today.getTime() + (remaining / globalCurPace) * msPerDay),
            subjects: allSubs
        };

        const currentPaceDisplay = globalCurPace.toFixed(2);
        window.safeSetText('target-req-pace', `--`);
        window.safeSetText('current-pace-stat', `${currentPaceDisplay} Ch/Day`);

        let finishDisplay = '';
        let globalDaysLeftStr = '<span class="opacity-50">--</span>';
        let globalDaysNeededStr = '<span class="opacity-50">--</span>';

        if (paceTotalChapters === 0) {
            finishDisplay = '<span class="text-sm opacity-50 uppercase tracking-widest">No Targets</span>';
        } else if (remaining <= 0) {
            finishDisplay = '<span class="text-emerald-500">Finished!</span>';
            globalDaysLeftStr = '<span class="text-emerald-500 font-bold">Done</span>';
            globalDaysNeededStr = '<span class="text-emerald-500 font-bold">0 Days</span>';
        } else if (globalCurPace <= 0) {
            finishDisplay = '<span class="text-sm opacity-50 uppercase tracking-widest">No Data</span>';
            globalDaysLeftStr = '<span class="opacity-50">--</span>';
        } else {
            let projDate = window.latestPaceData.projectedDate;
            finishDisplay = projDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
            const globalDaysLeftNeed = remaining / globalCurPace;
            globalDaysNeededStr = `${Math.ceil(globalDaysLeftNeed)} Days Needed`;
            globalDaysLeftStr = '<span class="text-slate-400 font-bold">No Goal</span>';
        }

        window.safeSetHtml('projected-finish', finishDisplay);

        const globalLeftEl = document.getElementById('global-days-left');
        if (globalLeftEl) globalLeftEl.innerHTML = globalDaysLeftStr;

        const globalNeedEl = document.getElementById('global-days-needed');
        if (globalNeedEl) globalNeedEl.innerHTML = globalDaysNeededStr;

        let timelineText = earliestDate ? `Started: ${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}` : `Not Started`;
        window.safeSetHtml('pace-timeline-info', `<span class="text-slate-500 font-bold">Global Baseline</span> <span class="mx-1 opacity-50">|</span> <span class="tracking-widest text-[9px] uppercase">${timelineText}</span>`);

        const statusLabel = document.getElementById('target-status-label');
        if (statusLabel) {
            statusLabel.className = "text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest drop-shadow-sm";
            statusLabel.textContent = "NO TARGETS SET";
        }

        let progComment = { text: "No global pace goal is set. Actual pace is calculating dynamically from your first completed chapter.", icon: "📊", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/50" };
        window.safeSetHtml('prog-comment', `<div class="flex items-start space-x-3 p-3.5 rounded-xl border ${progComment.bg} ${progComment.border} shadow-sm transition-all duration-300 hover:shadow-md"><span class="text-lg md:text-xl drop-shadow-sm">${progComment.icon}</span><p class="text-[10px] md:text-xs font-bold leading-relaxed mt-0.5 ${progComment.color}">${progComment.text}</p></div>`);
    } else {
        // Find all subjects explicitly targeted by ANY goal
        let targetedSubjects = new Set();
        const globalGoal = window.paceGoals.find(g => g.type === 'global');

        if (globalGoal) {
            const isManualGlobal = globalGoal.subjects || globalGoal.secondaryPaces;
            if (isManualGlobal) {
                if (globalGoal.subjects) globalGoal.subjects.forEach(s => targetedSubjects.add(s));
                if (globalGoal.secondaryPaces) {
                    globalGoal.secondaryPaces.forEach(pid => {
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
            } else {
                window.paceGoals.forEach(g => {
                    if (g.type === 'global') return;

                    // Strict Time Period Constraint: Only aggregate if this goal intersects with the global timeline
                    const gStart = g.startDate ? window.parseDateSafe(g.startDate) : new Date(window.globalStartDate);
                    const gEnd = g.deadline ? window.parseDateSafe(g.deadline) : new Date(window.globalEndDate);
                    gStart.setHours(0, 0, 0, 0);
                    gEnd.setHours(23, 59, 59, 999);

                    if (gEnd < window.globalStartDate || gStart > window.globalEndDate) return; // Ignore if completely outside global period

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
                });
            }
        }

        let paceTotalChapters = 0;
        let paceCompleted = 0;
        targetedSubjects.forEach(sub => {
            if (subjectStats[sub]) {
                paceTotalChapters += subjectStats[sub].totalChapters;
                paceCompleted += subjectStats[sub].effectiveChapters;
            }
        });

        const start = new Date(window.globalStartDate); start.setHours(0, 0, 0, 0);
        const end = new Date(window.globalEndDate); end.setHours(23, 59, 59, 999);

        const remaining = Math.max(0, paceTotalChapters - paceCompleted);
        const totalDays = Math.max(1, Math.ceil((end - start) / msPerDay));
        const daysElapsed = Math.max(0, Math.floor((today - start) / msPerDay));
        const daysRemaining = Math.max(0, Math.ceil((end - today) / msPerDay));

        let globalReqPace = 0;
        let globalCurPace = 0;

        if (paceTotalChapters > 0) {
            if (today < start || today > end) {
                globalReqPace = today < start ? paceTotalChapters / totalDays : (remaining > 0 ? remaining : 0);
                globalCurPace = 0; // STRICTLY ZERO outside active timeline
            } else {
                globalReqPace = remaining > 0 ? remaining / Math.max(1, daysRemaining) : 0;
                globalCurPace = daysElapsed > 0 ? paceCompleted / daysElapsed : (paceCompleted > 0 ? paceCompleted : 0);
            }
        }

        // Save Pace Data for the Chart specifically
        window.latestPaceData = {
            total: paceTotalChapters,
            completed: paceCompleted,
            start: new Date(start),
            end: new Date(end),
            today: new Date(today),
            reqPace: globalReqPace,
            curPace: globalCurPace,
            projectedDate: paceTotalChapters === 0 || globalCurPace <= 0 ? new Date(0) : new Date(today.getTime() + (remaining / globalCurPace) * msPerDay),
            subjects: Array.from(targetedSubjects)
        };

        // UI Formatting for Pace Section
        const currentPaceDisplay = globalCurPace.toFixed(2);
        const reqPaceDisplay = globalReqPace.toFixed(2);

        let maxProjectedDate = window.latestPaceData.projectedDate;
        let finishDisplay = '';

        let globalDaysLeftStr = '<span class="opacity-50">--</span>';
        let globalDaysNeededStr = '<span class="opacity-50">--</span>';
        let diffGlobalDaysTG = Math.ceil((end - today) / msPerDay);

        if (paceTotalChapters === 0) {
            finishDisplay = '<span class="text-sm opacity-50 uppercase tracking-widest">No Targets</span>';
        } else if (remaining <= 0) {
            finishDisplay = '<span class="text-emerald-500">Finished!</span>';
            globalDaysLeftStr = '<span class="text-emerald-500 font-bold">Done</span>';
            globalDaysNeededStr = '<span class="text-emerald-500 font-bold">0 Days</span>';
        } else if (globalCurPace <= 0) {
            if (today < start) finishDisplay = '<span class="text-sm font-black text-blue-400 uppercase tracking-widest">Future Timeline</span>';
            else if (today > end) finishDisplay = '<span class="text-sm font-black text-red-500 uppercase tracking-widest">Overdue</span>';
            else finishDisplay = '<span class="text-sm opacity-50 uppercase tracking-widest">No Data</span>';

            if (diffGlobalDaysTG > 0) globalDaysLeftStr = `${diffGlobalDaysTG} Days Left`;
            else if (diffGlobalDaysTG === 0) globalDaysLeftStr = `<span class="text-orange-400">Due Today</span>`;
            else globalDaysLeftStr = `<span class="text-red-400">${Math.abs(diffGlobalDaysTG)} Days Overdue</span>`;
        } else {
            finishDisplay = maxProjectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

            if (diffGlobalDaysTG > 0) globalDaysLeftStr = `${diffGlobalDaysTG} Days Left`;
            else if (diffGlobalDaysTG === 0) globalDaysLeftStr = `<span class="text-orange-400">Due Today</span>`;
            else globalDaysLeftStr = `<span class="text-red-400">${Math.abs(diffGlobalDaysTG)} Days Overdue</span>`;

            const globalDaysLeftNeed = remaining / globalCurPace;
            globalDaysNeededStr = `${Math.ceil(globalDaysLeftNeed)} Days Needed`;
        }

        window.safeSetText('target-req-pace', `${reqPaceDisplay} Ch/Day`);
        window.safeSetText('current-pace-stat', `${currentPaceDisplay} Ch/Day`);
        window.safeSetHtml('projected-finish', finishDisplay);

        const globalLeftEl = document.getElementById('global-days-left');
        if (globalLeftEl) globalLeftEl.innerHTML = globalDaysLeftStr;

        const globalNeedEl = document.getElementById('global-days-needed');
        if (globalNeedEl) globalNeedEl.innerHTML = globalDaysNeededStr;

        let timelineText = `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} &rarr; ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
        window.safeSetHtml('pace-timeline-info', `<span class="text-blue-500 font-bold">Global Baseline</span> <span class="mx-1 opacity-50">|</span> <span class="tracking-widest text-[9px] uppercase">${timelineText}</span>`);

        const statusLabel = document.getElementById('target-status-label');
        if (statusLabel) {
            if (paceTotalChapters === 0) {
                statusLabel.className = "text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest drop-shadow-sm";
                statusLabel.textContent = "NO TARGETS SET";
            } else if (today < start) {
                statusLabel.className = "text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest drop-shadow-sm";
                statusLabel.textContent = "TIMELINES START IN FUTURE";
            } else if (today > end && remaining > 0) {
                statusLabel.className = "text-[9px] md:text-[10px] font-black text-red-500 uppercase tracking-widest drop-shadow-sm";
                statusLabel.textContent = "TIMELINE OVERDUE";
            } else if (globalCurPace >= globalReqPace && globalReqPace > 0) {
                statusLabel.className = "text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest drop-shadow-sm";
                statusLabel.textContent = `TARGET: ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
            } else {
                statusLabel.className = "text-[9px] md:text-[10px] font-black text-red-500 uppercase tracking-widest drop-shadow-sm";
                statusLabel.textContent = `TARGET: ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
            }
        }

        // Dynamic Contextual Comments
        let progComment = {};
        if (paceTotalChapters === 0) {
            progComment = { text: "No pace goals are mapped. Add a goal in Master Configuration to track speed.", icon: "📭", color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700" };
        } else if (today < start) {
            progComment = { text: "Your assigned timelines haven't started yet. Get ready to begin when the time comes!", icon: "⏳", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/50" };
        } else if (today > end && remaining > 0) {
            progComment = { text: "The target timeline has expired but tasks remain. You are currently overdue!", icon: "⏰", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800/50" };
        } else if (remaining <= 0 && paceTotalChapters > 0) {
            progComment = { text: "Target timelines completely finished! Outstanding achievement.", icon: "🏆", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800/50" };
        } else if (globalCurPace >= globalReqPace && globalCurPace > 0) {
            progComment = { text: "Excellent pace! You are on track to beat your aggregated deadlines.", icon: "🚀", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800/50" };
        } else if (globalCurPace >= globalReqPace * 0.75 && globalCurPace > 0) {
            progComment = { text: "Good steady progress, but slightly behind the required timeline. Push a bit harder!", icon: "👍", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/50" };
        } else if (globalCurPace > 0) {
            progComment = { text: "You're falling behind the required pace. Time to double down on studies!", icon: "⚠️", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800/50" };
        } else {
            progComment = { text: "No chapters completed in this active timeline yet! Start ticking off tasks to build momentum.", icon: "🚨", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800/50" };
        }

        window.safeSetHtml('prog-comment', `<div class="flex items-start space-x-3 p-3.5 rounded-xl border ${progComment.bg} ${progComment.border} shadow-sm transition-all duration-300 hover:shadow-md"><span class="text-lg md:text-xl drop-shadow-sm">${progComment.icon}</span><p class="text-[10px] md:text-xs font-bold leading-relaxed mt-0.5 ${progComment.color}">${progComment.text}</p></div>`);
    }

    if (typeof window.renderSubjectProgress === 'function') window.renderSubjectProgress(subjectStats);
    if (typeof window.renderCategoryProgress === 'function') window.renderCategoryProgress(subjectStats);
    if (typeof window.renderPaceGoals === 'function') window.renderPaceGoals(subjectStats);

    if (window.progressChart) {
        window.progressChart.data.datasets[0].data = [displayCompleted, scopeTotalChapters - displayCompleted];
        window.progressChart.update();
    }

    // Live Sync for Modals
    if (document.getElementById('pace-trend-modal') && !document.getElementById('pace-trend-modal').classList.contains('hidden')) {
        if (typeof window.renderPaceTrendChart === 'function') window.renderPaceTrendChart();
    }
    if (document.getElementById('revision-trend-modal') && !document.getElementById('revision-trend-modal').classList.contains('hidden')) {
        if (typeof window.renderRevisionTrendChart === 'function') window.renderRevisionTrendChart();
    }
}

window.renderPaceGoals = function (subjectStats) {
    const container = document.getElementById('pace-goals-container');
    if (!container) return;
    container.innerHTML = '';

    if (!window.paceGoals || window.paceGoals.length === 0) {
        container.innerHTML = `<div class="col-span-full py-8 text-center"><span class="text-2xl drop-shadow-sm mb-2 block">📭</span><p class="text-xs font-bold text-slate-400">No active timeline targets are defined yet.</p></div>`;
        return;
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    let html = '';
    window.paceGoals.forEach(g => {
        let total = 0; let completed = 0;
        let subjectsList = [];

        if (g.type === 'global') {
            const isManualGlobal = g.subjects || g.secondaryPaces;
            if (isManualGlobal) {
                if (g.subjects) subjectsList = g.subjects;
                if (g.secondaryPaces) {
                    g.secondaryPaces.forEach(pid => {
                        const pg = window.paceGoals.find(x => x.id === pid);
                        if (pg) {
                            if (pg.type === 'bundle' && pg.subjects) pg.subjects.forEach(s => subjectsList.push(s));
                            else if (pg.type === 'subject') subjectsList.push(pg.target);
                            else if (pg.type === 'program') {
                                window.customTracks.forEach(track => (window.syllabusStructure[track.id] || []).forEach(s => { if (pg.target === s.program) subjectsList.push(s.subject); }));
                            }
                        }
                    });
                }
            } else {
                window.customTracks.forEach(track => (window.syllabusStructure[track.id] || []).forEach(s => subjectsList.push(s.subject)));
            }
        } else if (g.type === 'bundle') {
            if (g.subjects) subjectsList = g.subjects;
            if (g.programs) {
                window.customTracks.forEach(track => (window.syllabusStructure[track.id] || []).forEach(s => { if (g.programs.includes(s.program)) subjectsList.push(s.subject); }));
            }
        } else if (g.type === 'subject') {
            subjectsList = [g.target];
        } else if (g.type === 'program') {
            window.customTracks.forEach(track => (window.syllabusStructure[track.id] || []).forEach(s => { if (g.target === s.program) subjectsList.push(s.subject); }));
        }

        // De-duplicate subjects list
        subjectsList = Array.from(new Set(subjectsList));

        subjectsList.forEach(sub => {
            if (subjectStats[sub]) {
                total += subjectStats[sub].totalChapters;
                completed += subjectStats[sub].effectiveChapters;
            }
        });

        const start = g.startDate ? window.parseDateSafe(g.startDate) : new Date(window.PLAN_START_DATE);
        const end = g.deadline ? window.parseDateSafe(g.deadline) : new Date(window.PLAN_END_DATE);
        start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);

        const remaining = Math.max(0, total - completed);
        const totalDays = Math.max(1, Math.ceil((end - start) / msPerDay));
        const daysElapsed = Math.max(0, Math.floor((today - start) / msPerDay));
        const daysRemaining = Math.max(0, Math.ceil((end - today) / msPerDay));

        let reqPace = 0;
        let curPace = 0;

        if (total > 0) {
            if (today < start || today > end) {
                reqPace = today < start ? total / totalDays : (remaining > 0 ? remaining : 0);
                curPace = 0;
            } else {
                reqPace = remaining > 0 ? remaining / Math.max(1, daysRemaining) : 0;
                curPace = daysElapsed > 0 ? completed / daysElapsed : (completed > 0 ? completed : 0);
            }
        }

        reqPace = reqPace.toFixed(2);
        curPace = curPace.toFixed(2);

        let statusBg = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50";
        let statusBadge = `<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500">Idle</span>`;
        let reqColor = "text-indigo-600 dark:text-indigo-400";
        let reqBg = "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/50 dark:border-indigo-900/30";

        let timeGoalCountdownStr = '';

        const allSubsGroup = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []);
        const isFrozenBundle = subjectsList.every(subName => {
            const sObj = allSubsGroup.find(s => s.subject === subName);
            return (window.passedItems && window.passedItems.subjects && window.passedItems.subjects.includes(subName)) ||
                   (window.passedItems && window.passedItems.programs && window.passedItems.programs.includes(sObj ? sObj.program : ''));
        });

        if (isFrozenBundle || completed >= total) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">Completed</span>`;
            statusBg = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 ring-1 ring-emerald-500/20";
            timeGoalCountdownStr = '<span class="text-emerald-500 font-bold">Done</span>';
        } else if (today < start) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">Scheduled</span>`;
            let diffDays = Math.ceil((start - today) / msPerDay);
            timeGoalCountdownStr = `<span class="text-blue-500 font-bold">${diffDays}d to start</span>`;
        } else if (today > end) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">Overdue</span>`;
            statusBg = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 ring-1 ring-red-500/20";
            reqColor = "text-red-600 dark:text-red-400";
            reqBg = "bg-red-50/50 dark:bg-red-950/20 border-red-100/50 dark:border-red-900/30";
            let diffDays = Math.floor((today - end) / msPerDay);
            timeGoalCountdownStr = `<span class="text-red-500 font-bold">${diffDays}d overdue</span>`;
        } else {
            let diffDays = Math.ceil((end - today) / msPerDay);
            if (diffDays > 0) timeGoalCountdownStr = `${diffDays} Days Left`;
            else if (diffDays === 0) timeGoalCountdownStr = `<span class="text-orange-500 font-bold">Due Today</span>`;

            if (parseFloat(curPace) >= parseFloat(reqPace)) {
                statusBadge = `<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">On Track</span>`;
            } else {
                statusBadge = `<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">Lagging</span>`;
                reqColor = "text-rose-600 dark:text-rose-400";
                reqBg = "bg-rose-50/50 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/30";
            }
        }

        let finishDisplay = '';
        let estDaysNeededStr = '<span class="opacity-50">--</span>';
        if (isFrozenBundle || completed >= total) {
            finishDisplay = '<span class="text-emerald-500 font-black uppercase text-[10px]">Done</span>';
            estDaysNeededStr = '<span class="text-emerald-500 font-bold text-[10px]">0 Days Needed</span>';
        } else if (completed === 0) {
            finishDisplay = '<span class="text-slate-400 text-[10px]">No Data</span>';
        } else if (parseFloat(curPace) > 0) {
            const daysLeft = remaining / parseFloat(curPace);
            const estDate = new Date(today.getTime() + (daysLeft * msPerDay));
            finishDisplay = estDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ` (${Math.ceil(daysLeft)}d)`;
            estDaysNeededStr = `${Math.ceil(daysLeft)} Days Needed`;
        }

        let labelText = g.label || "Untitled Target";
        let subText = g.type === 'global' ? `<span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md text-[8px] font-black uppercase tracking-widest">Global</span>` :
                      (g.type === 'bundle' ? `<span class="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-md text-[8px] font-black uppercase tracking-widest">Bundle</span>` :
                       (g.type === 'subject' ? `<span class="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-md text-[8px] font-black uppercase tracking-widest">Subject</span>` :
                        `<span class="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-md text-[8px] font-black uppercase tracking-widest">Program</span>`));

        let editBtn = `<button onclick="window.editPaceGoal('${g.id}')" class="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 active:scale-90 transition-all"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>`;

        html += `
        <div class="p-4 rounded-2xl border ${statusBg} shadow-sm transition-all hover:shadow-md flex flex-col justify-between h-full relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-700/50"></div>
            <div class="flex justify-between items-start gap-2 mb-3">
                <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5 mb-1.5">
                        ${subText}
                        ${statusBadge}
                    </div>
                    <span class="block text-xs md:text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight leading-tight truncate group-hover:text-blue-500 transition-colors" title="${labelText}">${labelText}</span>
                </div>
                <div class="flex items-center space-x-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${editBtn}
                </div>
            </div>
            
            <div>
                <div class="flex justify-between items-end mb-1">
                    <span class="text-[9px] font-bold text-slate-400">${Math.round(completed)} / ${total} Ch</span>
                    <span class="text-[9px] font-black text-slate-500">${total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden mb-4 border border-slate-200/50 dark:border-slate-600/30">
                    <div class="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-700" style="width: ${total > 0 ? (completed / total) * 100 : 0}%"></div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div class="p-2 rounded-xl ${reqBg} border flex flex-col justify-between">
                        <div>
                            <span class="block text-[8px] uppercase tracking-widest font-black ${reqColor} opacity-80 mb-0.5">Req Pace</span>
                            <div class="font-black text-xs md:text-sm ${reqColor}">${reqPace} <span class="text-[8px] opacity-70">ch/d</span></div>
                        </div>
                        <div class="text-[9px] font-black ${reqColor} mt-1.5 uppercase tracking-widest">${timeGoalCountdownStr}</div>
                    </div>
                    <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                            <span class="block text-[8px] uppercase tracking-widest font-black text-slate-500 opacity-80 mb-0.5">Cur Pace</span>
                            <div class="font-black text-xs md:text-sm text-slate-700 dark:text-slate-300">${curPace} <span class="text-[8px] opacity-70">ch/d</span></div>
                        </div>
                    </div>
                    <div class="col-span-2 p-2.5 rounded-xl bg-slate-900 dark:bg-slate-900 border border-slate-800 flex justify-between items-center shadow-inner">
                        <div class="flex flex-col">
                            <span class="text-[8px] uppercase tracking-widest font-black text-slate-400 mb-0.5">Est. Finish</span>
                            <span class="text-[9px] font-black mt-0.5">${estDaysNeededStr}</span>
                        </div>
                        <div class="font-black text-[10px] md:text-xs text-white text-right">${finishDisplay}</div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    container.innerHTML = html;
};

window.saveSubjectTimeGoal = function () {
    if (!window.currentSubjectForTimeGoal) return;
    const sub = window.currentSubjectForTimeGoal;
    const goalId = document.getElementById('stm-time-goal-select').value;
    const startDateVal = document.getElementById('stm-time-start').value;
    const dateVal = document.getElementById('stm-time-date').value;

    if (!window.subjectTimeLinks) window.subjectTimeLinks = {};

    if (dateVal) {
        window.subjectTimeLinks[sub] = { type: 'date', startDate: startDateVal, date: dateVal };
    } else if (goalId) {
        window.subjectTimeLinks[sub] = { type: 'goal', id: goalId };
    } else {
        delete window.subjectTimeLinks[sub];
    }

    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    if (typeof window.closeModal === 'function') window.closeModal('subject-time-modal');
    if (typeof window.showToast === 'function') window.showToast("Subject Time Goal updated!", "success");
};

window.clearSubjectTimeGoal = function () {
    if (!window.currentSubjectForTimeGoal) return;
    const sub = window.currentSubjectForTimeGoal;
    if (window.subjectTimeLinks && window.subjectTimeLinks[sub]) {
        delete window.subjectTimeLinks[sub];
    }
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    if (typeof window.closeModal === 'function') window.closeModal('subject-time-modal');
    if (typeof window.showToast === 'function') window.showToast("Time Goal reset to default timeline.", "success");
};

// Bind to window
window.updateMetrics = updateMetrics;

export { updateMetrics };
