function ensureAvailableSlots(dayId, trackId, slotsNeeded = 1) {
    let availableSlots = 0;
    for (let i = 0; i < window.tasks.length; i++) {
        if (window.tasks[i].id < dayId || window.tasks[i].type !== 'study') continue;
        if (window.tasks[i].trackTasks && window.tasks[i].trackTasks[trackId]) {
            if (window.tasks[i].trackTasks[trackId].some(item => item.subject === 'Revision')) availableSlots++;
        }
    }

    let slotsToCreate = slotsNeeded - availableSlots;
    if (slotsToCreate <= 0) return;

    let lastTaskId = window.tasks.length > 0 ? window.tasks[window.tasks.length - 1].id : 0;
    let lastStudyDay = 0;
    for (let i = window.tasks.length - 1; i >= 0; i--) {
        if (window.tasks[i].type === 'study') { lastStudyDay = window.tasks[i].studyDay; break; }
    }

    let createdSlots = 0;
    while (createdSlots < slotsToCreate) {
        lastTaskId++;
        const baseDate = new Date(window.PLAN_START_DATE.getTime());
        baseDate.setDate(baseDate.getDate() + (lastTaskId - 1));

        const dayName = baseDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = window.formatDate(baseDate);

        if (dayName === 'Fri') {
            const holiday = { id: lastTaskId, date: dateStr, day: dayName, type: 'holiday', gym: false, freelance: false };
            window.customActions.forEach(a => holiday[a.id] = false);
            window.tasks.push(holiday);
        } else {
            lastStudyDay++;
            const studyDay = {
                id: lastTaskId, date: dateStr, day: dayName, type: 'study', studyDay: lastStudyDay,
                gym: false, freelance: false,
                trackTasks: {}
            };
            window.customActions.forEach(a => studyDay[a.id] = false);
            window.customTracks.forEach(track => {
                studyDay.trackTasks[track.id] = [{ subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: `${track.id}-${lastTaskId}` }];
            });
            window.tasks.push(studyDay);
            createdSlots++;
        }
    }

    const newEndDate = new Date(window.PLAN_START_DATE.getTime());
    newEndDate.setDate(newEndDate.getDate() + (lastTaskId - 1));
    window.PLAN_END_DATE = newEndDate;
}

function recalculateTotals() {
    window.totalStaticChapters = 0;
    window.customTracks.forEach(track => {
        window.totalStaticChapters += (window.syllabusStructure[track.id] || []).reduce((acc, s) => acc + s.chapters, 0);
    });
}

function generateStudyPlan() {
    const startDate = new Date(window.PLAN_START_DATE);
    let maxChapters = 0;
    window.customTracks.forEach(track => {
        const trackChapters = (window.syllabusStructure[track.id] || []).reduce((acc, s) => acc + s.chapters, 0);
        if (trackChapters > maxChapters) maxChapters = trackChapters;
    });

    // Calculate plan end date dynamically based on maximum syllabus chapters needed
    let calculatedEnd = new Date(startDate.getTime());
    if (maxChapters > 0) {
        let studyIdx = 0;
        while (studyIdx < maxChapters) {
            const dayName = calculatedEnd.toLocaleDateString('en-US', { weekday: 'short' });
            if (dayName !== 'Fri') studyIdx++;
            if (studyIdx < maxChapters) calculatedEnd.setDate(calculatedEnd.getDate() + 1);
        }
    } else {
        // If there are no tracks/chapters, default to 30 days instead of 10 months
        calculatedEnd.setDate(calculatedEnd.getDate() + 29);
    }
    calculatedEnd.setHours(23, 59, 59, 999);
    window.PLAN_END_DATE = calculatedEnd; // Set global end date!

    const endDate = new Date(window.PLAN_END_DATE);
    const queues = {};
    window.customTracks.forEach(track => {
        queues[track.id] = [];
        (window.syllabusStructure[track.id] || []).forEach(s => {
            for (let i = 1; i <= s.chapters; i++) queues[track.id].push({ subject: s.subject, chapter: `Ch. ${i}`, title: `Topic ${i}` });
        });
    });

    let generated = [];
    let current = new Date(startDate);
    let dayId = 1; let studyIdx = 1;

    while (current <= endDate) {
        const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = window.formatDate(current);

        if (dayName === 'Fri') {
            const holiday = { id: dayId, date: dateStr, day: dayName, type: 'holiday', gym: false, freelance: false };
            window.customActions.forEach(a => holiday[a.id] = false);
            generated.push(holiday);
        } else {
            const studyDay = {
                id: dayId, date: dateStr, day: dayName, type: 'study', studyDay: studyIdx,
                gym: false, freelance: false,
                trackTasks: {}
            };
            window.customActions.forEach(a => studyDay[a.id] = false);
            window.customTracks.forEach(track => {
                const item = queues[track.id].shift() || { subject: "Revision", chapter: "Rev", title: "Practice" };
                studyDay.trackTasks[track.id] = [{ ...item, id: `${track.id}-${dayId}`, completed: false }];
            });
            generated.push(studyDay);
            studyIdx++;
        }
        current.setDate(current.getDate() + 1); dayId++;
    }
    return generated;
}

function reorderSubjectChapters(prog, subj) {
    if (subj === 'Revision') return;
    let subjectSlots = []; let chapters = [];
    for (let i = 0; i < window.tasks.length; i++) {
        if (window.tasks[i].type !== 'study') continue;
        if (window.tasks[i].trackTasks[prog]) {
            for (let j = 0; j < window.tasks[i].trackTasks[prog].length; j++) {
                if (window.tasks[i].trackTasks[prog][j].subject === subj && !window.tasks[i].trackTasks[prog][j].completed) {
                    subjectSlots.push({ tIdx: i, bIdx: j }); chapters.push({ ...window.tasks[i].trackTasks[prog][j] });
                }
            }
        }
    }
    if (chapters.length === 0) return;
    // Target the last number in the chapter string to support prefixes correctly (e.g., "R1 Ch. 15" extracts 15)
    chapters.sort((a, b) => {
        const ma = a.chapter.match(/(\d+)(?!.*\d)/);
        const mb = b.chapter.match(/(\d+)(?!.*\d)/);
        return (ma ? parseInt(ma[0]) : 999) - (mb ? parseInt(mb[0]) : 999);
    });
    for (let k = 0; k < subjectSlots.length; k++) {
        const slot = subjectSlots[k]; const chObj = chapters[k];
        window.tasks[slot.tIdx].trackTasks[prog][slot.bIdx] = { ...chObj, id: window.tasks[slot.tIdx].trackTasks[prog][slot.bIdx].id };
    }
}

function handleTaskToggle(e) {
    const studyDayId = parseInt(e.target.dataset.studId);
    const trackId = e.target.dataset.trackId;
    const taskId = e.target.dataset.taskId;
    const taskIndex = window.tasks.findIndex(t => t.studyDay === studyDayId && t.type === 'study');
    if (taskIndex === -1) return;

    const isCompleted = e.target.checked;
    const nowIso = new Date().toISOString();

    if (!window.tasks[taskIndex].trackTasks[trackId]) return;

    const itemIndex = window.tasks[taskIndex].trackTasks[trackId].findIndex(item => item.id === taskId);
    if (itemIndex === -1) return;

    window.tasks[taskIndex].trackTasks[trackId][itemIndex].completed = isCompleted;
    if (isCompleted) window.tasks[taskIndex].trackTasks[trackId][itemIndex].completedAt = nowIso;
    else delete window.tasks[taskIndex].trackTasks[trackId][itemIndex].completedAt;

    const taskObj = window.tasks[taskIndex].trackTasks[trackId][itemIndex];

    // 1. Optimistic UI update: Immediate Card State styling (zero-lag)
    const safeTaskId = taskObj.id || `legacy-${Math.random().toString(36).substr(2, 9)}`;
    const cardEl = document.getElementById(`single-task-${safeTaskId}-${studyDayId}`);
    if (cardEl) {
        const titleEl = cardEl.querySelector('.tracking-tight');
        const descEl = cardEl.querySelector('.line-clamp-2');
        const accentBar = cardEl.querySelector('.absolute.top-0.left-0');

        if (titleEl) {
            if (isCompleted) titleEl.classList.add('line-through', 'text-emerald-700', 'dark:text-emerald-400', 'opacity-70');
            else titleEl.classList.remove('line-through', 'text-emerald-700', 'dark:text-emerald-400', 'opacity-70');
        }
        if (descEl) isCompleted ? descEl.classList.add('line-through', 'opacity-60') : descEl.classList.remove('line-through', 'opacity-60');

        if (isCompleted) {
            cardEl.classList.add('ring-1', 'ring-emerald-500', 'bg-emerald-50/30', 'dark:bg-emerald-900/10', '!border-emerald-200', 'dark:!border-emerald-800');
            cardEl.classList.remove('bg-white', 'dark:bg-slate-800');
            if (accentBar) accentBar.className = 'absolute top-0 left-0 w-full h-1 bg-emerald-500 transition-colors';
        } else {
            cardEl.classList.remove('ring-1', 'ring-emerald-500', 'bg-emerald-50/30', 'dark:bg-emerald-900/10', '!border-emerald-200', 'dark:!border-emerald-800');
            cardEl.classList.add('bg-white', 'dark:bg-slate-800');
            if (accentBar) {
                accentBar.style.backgroundColor = window.getSubjectColor(taskObj.subject);
            }
        }
    }

    // 2. Optimistic UI update: Specific Subject Progress Bar (Prevents full DOM recreation)
    const safeSubId = taskObj.subject.replace(/[^a-zA-Z0-9]/g, '-');
    const subName = taskObj.subject;
    const groupTasks = window.tasks.flatMap(t => t.type === 'study' ? (Object.values(t.trackTasks).flat()) : []).filter(x => x.subject === subName);
    const completedCount = groupTasks.filter(x => x.completed).length;

    const sObj = window.syllabusStructure[trackId]?.find(s => s.subject === subName);
    const totalChapters = sObj ? sObj.chapters : 1;
    const progressPct = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 100;

    const textEl = document.getElementById(`group-text-${safeSubId}`);
    if (textEl) textEl.innerHTML = `${completedCount} <span class="opacity-60 text-[9px] mx-0.5">/</span> ${totalChapters} <span class="opacity-60">CH</span>`;

    const pctEl = document.getElementById(`group-pct-${safeSubId}`);
    if (pctEl) pctEl.textContent = `${progressPct}%`;

    const barEl = document.getElementById(`group-bar-${safeSubId}`);
    if (barEl) barEl.style.width = `${progressPct}%`;

    // 3. Optimistic UI update: Recalculate and update the 4 specific analytics cards inside the subject view
    const allSubTasks = window.tasks.filter(t => t.type === 'study' && t.trackTasks[trackId]?.some(item => item.subject === subName));

    let targetDate = null;
    let startDate = null;

    let hasTimeGoal = false;
    if (window.subjectTimeLinks && window.subjectTimeLinks[subName]) {
        const link = window.subjectTimeLinks[subName];
        if (link.type === 'date') {
            hasTimeGoal = true;
            if (link.startDate) startDate = window.parseDateSafe(link.startDate);
            targetDate = window.parseDateSafe(link.date);
        } else if (link.type === 'goal') {
            const pg = window.paceGoals.find(g => g.id === link.id);
            if (pg) {
                hasTimeGoal = true;
                if (pg.startDate) startDate = window.parseDateSafe(pg.startDate);
                targetDate = window.parseDateSafe(pg.deadline);
            }
        }
    }

    if (!hasTimeGoal) {
        let firstCompletedDay = allSubTasks.find(t => t.trackTasks[trackId]?.some(item => item.subject === subName && item.completed));
        if (firstCompletedDay) {
            let taskO = firstCompletedDay.trackTasks[trackId].find(item => item.subject === subName && item.completed);
            if (taskO.completedAt) {
                startDate = new Date(taskO.completedAt);
            } else {
                startDate = window.getTaskDate(firstCompletedDay);
            }
        }
    }

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (targetDate) targetDate.setHours(23, 59, 59, 999);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    let remainingCh = Math.max(0, totalChapters - completedCount);
    let actPaceRaw = 0;
    let reqPaceRaw = 0;

    let actualStartDateForPace = null;
    let firstCompletedDayForPace = allSubTasks.find(t => t.trackTasks[trackId]?.some(item => item.subject === subName && item.completed));
    if (firstCompletedDayForPace) {
        let taskO = firstCompletedDayForPace.trackTasks[trackId].find(item => item.subject === subName && item.completed);
        actualStartDateForPace = taskO.completedAt ? new Date(taskO.completedAt) : window.getTaskDate(firstCompletedDayForPace);
        actualStartDateForPace.setHours(0, 0, 0, 0);
    }

    if (totalChapters > 0) {
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

    const actPaceStr = actPaceRaw.toFixed(2);
    const reqPaceStr = hasTimeGoal ? reqPaceRaw.toFixed(2) : '--';

    let estFinishStr = '--';
    let estDaysNeededStr = '<span class="opacity-60">Unknown</span>';
    const isFrozenSub = (window.passedItems && window.passedItems.subjects && window.passedItems.subjects.includes(subName)) ||
        (window.passedItems && window.passedItems.programs && window.passedItems.programs.includes(sObj ? sObj.program : ''));
    if (isFrozenSub || completedCount >= totalChapters) {
        estFinishStr = '<span class="text-emerald-500 font-black">Finished</span>';
        estDaysNeededStr = '<span class="text-emerald-500 font-bold">0 Days</span>';
    } else if (completedCount === 0) {
        estFinishStr = '<span class="text-slate-400 text-[10px]">No Data</span>';
    } else if (actPaceRaw > 0) {
        const daysLeft = remainingCh / actPaceRaw;
        const estDate = new Date(today.getTime() + (daysLeft * msPerDay));
        estFinishStr = estDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        estDaysNeededStr = `${Math.ceil(daysLeft)} Days Needed`;
    }

    let timeGoalCountdownStr = '';
    if (isFrozenSub || completedCount >= totalChapters) {
        timeGoalCountdownStr = '<span class="text-emerald-500 font-bold">Done</span>';
    } else if (!hasTimeGoal) {
        timeGoalCountdownStr = '<span class="text-slate-400 font-bold">No Goal</span>';
    } else {
        let diffDaysTG = Math.ceil((targetDate - today) / msPerDay);
        if (diffDaysTG > 0) timeGoalCountdownStr = `${diffDaysTG} Days Left`;
        else if (diffDaysTG === 0) timeGoalCountdownStr = `<span class="text-orange-500 font-bold">Due Today</span>`;
        else timeGoalCountdownStr = `<span class="text-red-500 font-bold">${Math.abs(diffDaysTG)} Days Overdue</span>`;
    }

    const reqEl = document.getElementById(`tg-req-${safeSubId}`);
    if (reqEl) reqEl.textContent = reqPaceStr;

    const actEl = document.getElementById(`tg-act-${safeSubId}`);
    if (actEl) actEl.textContent = actPaceStr;

    const estEl1 = document.getElementById(`tg-est-${safeSubId}`);
    if (estEl1) estEl1.innerHTML = estFinishStr;

    const estEl2 = document.getElementById(`header-est-${safeSubId}`);
    if (estEl2) estEl2.innerHTML = estFinishStr;

    const tgDaysEl = document.getElementById(`tg-tg-days-${safeSubId}`);
    if (tgDaysEl) tgDaysEl.innerHTML = timeGoalCountdownStr;

    const estDaysEl = document.getElementById(`tg-est-days-${safeSubId}`);
    if (estDaysEl) estDaysEl.innerHTML = estDaysNeededStr;

    // Core Global updates & Saves
    if (typeof window.updateMetrics === 'function') window.updateMetrics();
    if (typeof window.saveTasks === 'function') window.saveTasks();

    // Smart background debounce for heavy canvas operations
    if (window.chartDebounce) clearTimeout(window.chartDebounce);
    window.chartDebounce = setTimeout(() => {
        if (typeof window.renderTrendCharts === 'function') {
            requestAnimationFrame(window.renderTrendCharts);
        }
    }, 600);
}

// Bind to window
window.ensureAvailableSlots = ensureAvailableSlots;
window.recalculateTotals = recalculateTotals;
window.generateStudyPlan = generateStudyPlan;
window.reorderSubjectChapters = reorderSubjectChapters;
window.handleTaskToggle = handleTaskToggle;

export { ensureAvailableSlots, recalculateTotals, generateStudyPlan, reorderSubjectChapters, handleTaskToggle };
