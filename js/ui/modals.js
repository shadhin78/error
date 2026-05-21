window.currentSubjectForTimeGoal = null;

window.openSubjectTimeModal = function (subjectName) {
    window.currentSubjectForTimeGoal = subjectName;
    document.getElementById('stm-time-title').textContent = subjectName;

    const select = document.getElementById('stm-time-goal-select');
    select.innerHTML = '<option value="">-- None Selected --</option>';
    window.paceGoals.forEach(g => {
        select.innerHTML += `<option value="${g.id}">${g.target} (${window.formatDate(window.parseDateSafe(g.deadline))})</option>`;
    });

    document.getElementById('stm-time-start').value = '';
    document.getElementById('stm-time-date').value = '';
    select.value = '';

    if (window.subjectTimeLinks && window.subjectTimeLinks[subjectName]) {
        const link = window.subjectTimeLinks[subjectName];
        if (link.type === 'goal') select.value = link.id;
        if (link.type === 'date') {
            document.getElementById('stm-time-start').value = link.startDate || '';
            document.getElementById('stm-time-date').value = link.date;
        }
    }

    window.openModal('subject-time-modal');
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
    window.closeModal('subject-time-modal');
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
    window.closeModal('subject-time-modal');
    if (typeof window.showToast === 'function') window.showToast("Time Goal reset to default timeline.", "success");
};

window.updateEsmProgramDropdown = function () {
    const track = document.getElementById('esm-track').value;
    const progSelect = document.getElementById('esm-program');
    progSelect.innerHTML = '';
    (window.customPrograms[track] || []).forEach(p => {
        progSelect.innerHTML += `<option value="${p}">${p}</option>`;
    });
};

window.openSubjectEditModal = function (subName) {
    let track = null;
    let sObj = null;
    window.customTracks.forEach(t => {
        const found = (window.syllabusStructure[t.id] || []).find(s => s.subject === subName);
        if (found) { track = t.id; sObj = found; }
    });
    if (!sObj) return;

    document.getElementById('esm-old-name').value = subName;
    document.getElementById('esm-old-track').value = track;
    document.getElementById('esm-track').value = track;
    document.getElementById('esm-name').value = subName;

    window.updateEsmProgramDropdown();
    document.getElementById('esm-program').value = sObj.program;

    window.openModal('edit-subject-modal');
};

window.saveSubjectEditModal = function () {
    const oldName = document.getElementById('esm-old-name').value;
    const oldTrack = document.getElementById('esm-old-track').value;
    const newTrack = document.getElementById('esm-track').value;
    const newName = document.getElementById('esm-name').value.trim();
    const newProg = document.getElementById('esm-program').value;

    if (!newName) return window.showToast("Subject name cannot be empty.", "error");

    const sObj = (window.syllabusStructure[oldTrack] || []).find(s => s.subject === oldName);
    if (!sObj) return;

    if (oldName.toLowerCase() !== newName.toLowerCase()) {
        const allSubs = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []);
        const isGlobalDuplicate = allSubs.some(s => s.subject.toLowerCase() === newName.toLowerCase());
        if (isGlobalDuplicate) return window.showToast("Subject name must be unique globally.", "error");
    }

    let changed = false;

    // Handle Track Migration Safely
    if (oldTrack !== newTrack) {
        // Update structures
        window.syllabusStructure[oldTrack] = window.syllabusStructure[oldTrack].filter(s => s.subject !== oldName);
        sObj.program = newProg;
        sObj.subject = newName;
        window.syllabusStructure[newTrack].push(sObj);

        // Reallocate historical/future study tasks
        for (let i = 0; i < window.tasks.length; i++) {
            if (window.tasks[i].type !== 'study' || !window.tasks[i].trackTasks) continue;

            const oldItems = window.tasks[i].trackTasks[oldTrack] || [];
            const foundIdx = oldItems.findIndex(item => item.subject === oldName);
            
            if (foundIdx > -1) {
                const taskToMove = { ...oldItems[foundIdx], subject: newName };
                // Remove from old track
                oldItems[foundIdx] = { subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: oldItems[foundIdx].id };
                
                // Add to new track
                if (!window.tasks[i].trackTasks[newTrack]) window.tasks[i].trackTasks[newTrack] = [];
                window.tasks[i].trackTasks[newTrack].push(taskToMove);
            }
        }
        changed = true;
    }

    // Standard Program or Name Changes
    if (oldTrack === newTrack) {
        if (sObj.program !== newProg) {
            sObj.program = newProg;
            changed = true;
        }

        if (oldName !== newName) {
            sObj.subject = newName;
            for (let i = 0; i < window.tasks.length; i++) {
                if (window.tasks[i].type !== 'study' || !window.tasks[i].trackTasks) continue;
                (window.tasks[i].trackTasks[newTrack] || []).forEach(item => {
                    if (item.subject === oldName) item.subject = newName;
                });
            }
            changed = true;
        }
    }

    if (changed) {
        // Bulk rename references explicitly
        if (oldName !== newName) {
            if (window.subjectColors && window.subjectColors[oldName]) {
                window.subjectColors[newName] = window.subjectColors[oldName];
            }
            if (window.currentFilter === oldName) window.currentFilter = newName;

            if (window.chartVisibility.subjects[oldName] !== undefined) {
                window.chartVisibility.subjects[newName] = window.chartVisibility.subjects[oldName];
                delete window.chartVisibility.subjects[oldName];
            }
            if (window.chartVisibility.revSubjects[oldName] !== undefined) {
                window.chartVisibility.revSubjects[newName] = window.chartVisibility.revSubjects[oldName];
                delete window.chartVisibility.revSubjects[oldName];
            }

            window.paceGoals.forEach(g => {
                if (g.type === 'subject' && g.target === oldName) g.target = newName;
                if (g.type === 'bundle' && g.subjects) {
                    const idx = g.subjects.indexOf(oldName);
                    if (idx > -1) g.subjects[idx] = newName;
                }
            });
            if (window.passedItems.subjects.includes(oldName)) {
                window.passedItems.subjects = window.passedItems.subjects.filter(s => s !== oldName);
                window.passedItems.subjects.push(newName);
            }
            if (window.revisionData.active && window.revisionData.active.includes(oldName)) {
                window.revisionData.active = window.revisionData.active.filter(s => s !== oldName);
                window.revisionData.active.push(newName);
            }
            if (window.revisionData.progress && window.revisionData.progress[oldName]) {
                window.revisionData.progress[newName] = window.revisionData.progress[oldName];
                delete window.revisionData.progress[oldName];
            }
            if (window.subjectTimeLinks && window.subjectTimeLinks[oldName]) {
                window.subjectTimeLinks[newName] = window.subjectTimeLinks[oldName];
                delete window.subjectTimeLinks[oldName];
            }
        }

        if (typeof window.saveTasks === 'function') window.saveTasks();
        if (typeof window.renderUI === 'function') window.renderUI();
        if (window.chartDebounce) clearTimeout(window.chartDebounce);
        window.chartDebounce = setTimeout(() => {
            if (typeof window.renderTrendCharts === 'function') {
                requestAnimationFrame(window.renderTrendCharts);
            }
        }, 600);
        if (typeof window.showToast === 'function') window.showToast("Subject updated successfully!", "success");
    }
    window.closeModal('edit-subject-modal');
};

window.requestDeleteSubjectFromModal = function () {
    const subName = document.getElementById('esm-old-name').value;
    window.openConfirmModal("Delete Subject", `Are you sure you want to completely delete "${subName}"? This action cannot be undone.`, () => {
        window.executeDeleteSubjectFromModal(subName);
    });
};

window.executeDeleteSubjectFromModal = function (targetName) {
    const track = document.getElementById('esm-old-track').value;

    window.syllabusStructure[track] = (window.syllabusStructure[track] || []).filter(s => s.subject !== targetName);
    delete window.chartVisibility.subjects[targetName];
    delete window.chartVisibility.revSubjects[targetName];

    for (let i = 0; i < window.tasks.length; i++) {
        if (window.tasks[i].type !== 'study' || !window.tasks[i].trackTasks) continue;
        if (window.tasks[i].trackTasks[track]) {
            window.tasks[i].trackTasks[track] = window.tasks[i].trackTasks[track].map(item => 
                item.subject === targetName ? { subject: "Revision", chapter: "Rev", title: "Practice", completed: false, id: item.id } : item
            );
        }
    }
    if (window.currentFilter === targetName) window.currentFilter = 'All';
    window.paceGoals = window.paceGoals.filter(g => !(g.type === 'subject' && g.target === targetName));
    window.paceGoals.forEach(g => {
        if (g.type === 'bundle' && g.subjects) g.subjects = g.subjects.filter(s => s !== targetName);
    });
    window.passedItems.subjects = window.passedItems.subjects.filter(s => s !== targetName);
    if (window.revisionData.active) window.revisionData.active = window.revisionData.active.filter(s => s !== targetName);
    if (window.revisionData.progress && window.revisionData.progress[targetName]) delete window.revisionData.progress[targetName];

    if (window.subjectTimeLinks && window.subjectTimeLinks[targetName]) delete window.subjectTimeLinks[targetName];

    if (typeof window.recalculateTotals === 'function') window.recalculateTotals();
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    window.closeModal('edit-subject-modal');
    if (typeof window.showToast === 'function') window.showToast(`Subject "${targetName}" deleted.`, "success");
};

window.openModal = function (modalId, typeKey = null) {
    if (modalId === 'analytics-modal' && typeKey && typeof window.populateAnalyticsModal === 'function') {
        window.populateAnalyticsModal(typeKey);
    }
    const backdrops = { 'analytics-modal': 'am-backdrop', 'yearly-actions-modal': 'ym-backdrop', 'subject-trend-modal': 'stm-backdrop', 'edit-task-modal': 'etm-backdrop', 'edit-pace-modal': 'epm-backdrop', 'pace-trend-modal': 'ptm-backdrop', 'goal-details-modal': 'gdm-backdrop', 'revision-manage-modal': 'rmm-backdrop', 'revision-trend-modal': 'rvm-backdrop', 'global-history-modal': 'ghm-backdrop', 'subject-time-modal': 'stm-time-backdrop', 'daily-actions-db-modal': 'dadb-backdrop', 'result-modal': 'resm-backdrop', 'edit-subject-modal': 'esm-backdrop' };
    const contents = { 'analytics-modal': 'am-content', 'yearly-actions-modal': 'ym-content', 'subject-trend-modal': 'stm-content', 'edit-task-modal': 'etm-content', 'edit-pace-modal': 'epm-content', 'pace-trend-modal': 'ptm-content', 'goal-details-modal': 'gdm-content', 'revision-manage-modal': 'rmm-content', 'revision-trend-modal': 'rvm-content', 'global-history-modal': 'ghm-content', 'subject-time-modal': 'stm-time-content', 'daily-actions-db-modal': 'dadb-content', 'result-modal': 'resm-content', 'edit-subject-modal': 'esm-content' };
    const modal = document.getElementById(modalId); const backdrop = document.getElementById(backdrops[modalId]); const content = document.getElementById(contents[modalId]);
    if (!modal || !backdrop || !content) return;

    modal.classList.remove('hidden'); void modal.offsetWidth;
    backdrop.classList.remove('opacity-0'); backdrop.classList.add('opacity-100');
    content.classList.remove('scale-95', 'opacity-0', 'translate-y-4'); content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
    document.body.classList.add('overflow-hidden');

    if (modalId === 'revision-trend-modal' && typeof window.renderRevisionTrendChart === 'function') {
        window.renderRevisionTrendChart();
    }

    // Critical Fix: Sync all charts properly by giving the CSS transform transition time (300ms) to complete
    // before recalculating canvas dimensions. This applies to Analytics, Yearly, Pace, and Subject modals perfectly.
    setTimeout(() => {
        if (modalId === 'yearly-actions-modal' && window.yearlyChartActions) window.yearlyChartActions.resize();
        if (modalId === 'subject-trend-modal' && window.subjectTrendChart) window.subjectTrendChart.resize();
        if (modalId === 'revision-trend-modal' && window.revisionTrendChartInstance) window.revisionTrendChartInstance.resize();
        if (modalId === 'pace-trend-modal' && window.paceTrendChartInstance) window.paceTrendChartInstance.resize();
        if (modalId === 'analytics-modal' && window.masterLineChart) window.masterLineChart.resize();
        if (modalId === 'global-history-modal' && window.globalHistoryChartInstance) window.globalHistoryChartInstance.resize();
        if (modalId === 'daily-actions-db-modal' && window.dadbTrendChartInstance) window.dadbTrendChartInstance.resize();
    }, 320);
};

window.closeModal = function (modalId) {
    const backdrops = { 'analytics-modal': 'am-backdrop', 'yearly-actions-modal': 'ym-backdrop', 'subject-trend-modal': 'stm-backdrop', 'edit-task-modal': 'etm-backdrop', 'edit-pace-modal': 'epm-backdrop', 'pace-trend-modal': 'ptm-backdrop', 'goal-details-modal': 'gdm-backdrop', 'revision-manage-modal': 'rmm-backdrop', 'revision-trend-modal': 'rvm-backdrop', 'global-history-modal': 'ghm-backdrop', 'subject-time-modal': 'stm-time-backdrop', 'daily-actions-db-modal': 'dadb-backdrop', 'result-modal': 'resm-backdrop', 'edit-subject-modal': 'esm-backdrop' };
    const contents = { 'analytics-modal': 'am-content', 'yearly-actions-modal': 'ym-content', 'subject-trend-modal': 'stm-content', 'edit-task-modal': 'etm-content', 'edit-pace-modal': 'epm-content', 'pace-trend-modal': 'ptm-content', 'goal-details-modal': 'gdm-content', 'revision-manage-modal': 'rmm-content', 'revision-trend-modal': 'rvm-content', 'global-history-modal': 'ghm-content', 'subject-time-modal': 'stm-time-content', 'daily-actions-db-modal': 'dadb-content', 'result-modal': 'resm-content', 'edit-subject-modal': 'esm-content' };
    const modal = document.getElementById(modalId); const backdrop = document.getElementById(backdrops[modalId]); const content = document.getElementById(contents[modalId]);
    if (!modal || !backdrop || !content) return;

    backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100', 'translate-y-0'); content.classList.add('scale-95', 'opacity-0', 'translate-y-4');
    setTimeout(() => { modal.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }, 300);
};

window.pendingDeleteAction = null;

window.openConfirmModal = function (title, message, actionCallback) {
    document.getElementById('cm-title').textContent = title;
    document.getElementById('cm-message').textContent = message;
    window.pendingDeleteAction = actionCallback;
    const modal = document.getElementById('confirm-modal');
    const backdrop = document.getElementById('cm-backdrop');
    const content = document.getElementById('cm-content');
    if (!modal || !backdrop || !content) return;
    modal.classList.remove('hidden'); void modal.offsetWidth;
    backdrop.classList.remove('opacity-0'); backdrop.classList.add('opacity-100');
    content.classList.remove('scale-95', 'opacity-0', 'translate-y-4'); content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
    document.body.classList.add('overflow-hidden');
};

window.closeConfirmModal = function () {
    const modal = document.getElementById('confirm-modal');
    const backdrop = document.getElementById('cm-backdrop');
    const content = document.getElementById('cm-content');
    if (!modal || !backdrop || !content) return;
    backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100', 'translate-y-0'); content.classList.add('scale-95', 'opacity-0', 'translate-y-4');
    setTimeout(() => { modal.classList.add('hidden'); window.pendingDeleteAction = null; document.body.classList.remove('overflow-hidden'); }, 300);
};

window.executeConfirmedDelete = function () {
    if (window.pendingDeleteAction) window.pendingDeleteAction();
    window.closeConfirmModal();
};

window.showCongratsModal = function () {
    const modal = document.getElementById('congrats-modal');
    const backdrop = document.getElementById('congrats-backdrop');
    const content = document.getElementById('congrats-content');
    const dateEl = document.getElementById('congrats-end-date');

    if (!modal || !backdrop || !content) return;

    const today = new Date();
    dateEl.textContent = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    window.switchCongratsPage(1);

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
    content.classList.remove('scale-50', 'opacity-0', 'translate-y-10');
    content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
    document.body.classList.add('overflow-hidden');

    setTimeout(() => window.fireConfetti(), 300);
};

window.switchCongratsPage = function (pageNum) {
    const page1 = document.getElementById('congrats-page-1');
    const page2 = document.getElementById('congrats-page-2');
    if (!page1 || !page2) return;

    if (pageNum === 1) {
        page2.classList.add('hidden');
        page1.classList.remove('hidden');
    } else {
        page1.classList.add('hidden');
        page2.classList.remove('hidden');
        window.renderCongratsSummary();
    }
};

window.renderCongratsSummary = function () {
    const listContainer = document.getElementById('congrats-summary-list');
    if (!listContainer) return;

    if (!window.successResults || window.successResults.length === 0) {
        listContainer.innerHTML = '<div class="text-center py-8 text-slate-400"><span class="text-4xl block mb-3 opacity-50 grayscale">🌟</span><p class="text-xs font-black uppercase tracking-widest">You conquered the syllabus!</p><p class="text-[10px] mt-1 font-bold">No explicit achievements logged yet.</p></div>';
        return;
    }

    const sorted = [...window.successResults].sort((a, b) => new Date(b.date) - new Date(a.date));
    let html = '';
    sorted.forEach(res => {
        const isCgpa = res.type === 'cgpa';
        const colorClass = isCgpa ? 'blue' : 'yellow';
        const icon = isCgpa ? '🎓' : '🏆';
        const dateStr = window.parseDateSafe(res.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        html += `
        <div class="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-3 hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3 sm:gap-4 overflow-hidden">
                <div class="text-2xl sm:text-3xl drop-shadow-sm">${icon}</div>
                <div class="flex flex-col truncate pr-2">
                    <span class="text-[10px] font-black uppercase tracking-widest text-${colorClass}-500 dark:text-${colorClass}-400 mb-0.5">${isCgpa ? 'Program CGPA' : 'Achievement'}</span>
                    <span class="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">${res.title}</span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${dateStr}</span>
                </div>
            </div>
            <div class="shrink-0 bg-white dark:bg-slate-800 px-3 sm:px-4 py-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-center min-w-[3.5rem]">
                <span class="text-sm sm:text-base font-black text-${colorClass}-600 dark:text-${colorClass}-400">${res.value}</span>
            </div>
        </div>`;
    });
    listContainer.innerHTML = html;
};

window.closeCongratsModal = function () {
    const modal = document.getElementById('congrats-modal');
    const backdrop = document.getElementById('congrats-backdrop');
    const content = document.getElementById('congrats-content');

    backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
    content.classList.add('scale-95', 'opacity-0', 'translate-y-4');

    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }, 500);
};

window.fireConfetti = function () {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#06b6d4'];

    // Initial Firework Burst
    for (let i = 0; i < 200; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2 + 100,
            r: Math.random() * 6 + 3,
            dx: Math.random() * 24 - 12,
            dy: Math.random() * -24 - 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
            tiltAngle: 0,
            type: Math.random() > 0.5 ? 'circle' : 'rect'
        });
    }

    let animationId;
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, index) => {
            p.tiltAngle += p.tiltAngleIncrement;
            p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle) * 2;
            p.dy += 0.08; // gravity
            p.x += p.dx;
            p.y += p.dy;

            ctx.beginPath();
            if (p.type === 'circle') {
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            } else {
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
                ctx.stroke();
            }

            if (p.y > canvas.height || p.x < -50 || p.x > canvas.width + 50) {
                particles.splice(index, 1);
            }
        });

        if (particles.length > 0) {
            animationId = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    render();

    // Raining Flowers/Confetti phase
    let shoots = 0;
    let shootInterval = setInterval(() => {
        shoots++;
        if (shoots > 8) {
            clearInterval(shootInterval);
            return;
        }
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -20,
                r: Math.random() * 6 + 3,
                dx: Math.random() * 4 - 2,
                dy: Math.random() * 5 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.floor(Math.random() * 10) - 10,
                tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
                tiltAngle: 0,
                type: Math.random() > 0.5 ? 'circle' : 'rect'
            });
        }
    }, 600);
};

window.openSubjectTrendModal = function () { window.openModal('subject-trend-modal'); };
window.openRevisionTrendModal = function () { window.openModal('revision-trend-modal'); };
window.openYearlyActionsModal = function () { window.openModal('yearly-actions-modal'); };

window.openPaceTrendModal = function () {
    window.openModal('pace-trend-modal');
    if (typeof window.renderPaceTrendChart === 'function') window.renderPaceTrendChart(); // Initial render setup
    // Critical Fix: Force the chart to recalculate its dimensions strictly AFTER the 300ms CSS transition completes.
    // This perfectly syncs the canvas to the newly visible layout dimensions, preventing squishing/blurring.
    setTimeout(() => {
        if (window.paceTrendChartInstance) {
            window.paceTrendChartInstance.resize();
        }
    }, 320);
};

window.renderPaceTrendChart = function () {
    if (!window.latestPaceData) return;
    const ctx = document.getElementById('paceTrendCanvas');
    if (!ctx) return;

    const { total, completed, start, end, today, reqPace, curPace, projectedDate, subjects } = window.latestPaceData;

    window.safeSetText('ptm-req-pace', reqPace.toFixed(2));
    window.safeSetText('ptm-act-pace', curPace.toFixed(2));

    let finishDisplay = '--';
    const finishEl = document.getElementById('ptm-est-finish');

    finishEl.classList.remove('text-red-500', 'text-orange-700', 'dark:text-orange-400', 'text-emerald-500');

    if (total > 0 && completed >= total) {
        finishEl.classList.add('text-emerald-500');
        finishDisplay = 'Finished';
    } else if (total > 0 && curPace > 0) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const remaining = Math.max(0, total - completed);
        const daysLeft = remaining / curPace;
        const estDate = new Date(today.getTime() + (daysLeft * msPerDay));
        finishDisplay = estDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) + ` (${Math.ceil(daysLeft)} Days Needed)`;

        const deadlineDate = new Date(end);
        if (estDate <= deadlineDate) {
            finishEl.classList.add('text-emerald-500');
        } else {
            finishEl.classList.add('text-orange-700', 'dark:text-orange-400');
        }
    } else {
        finishEl.classList.add('text-red-500');
        if (today > end) finishDisplay = 'Overdue';
        else finishDisplay = 'No Data';
    }

    window.safeSetHtml('ptm-est-finish', finishDisplay);

    let labels = [];
    let reqData = [];
    let curData = [];

    let current = new Date(start);
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / msPerDay));
    const step = Math.max(1, Math.ceil(totalDays / 10)); // max 10 data points on chart

    const daysElapsed = Math.max(0, Math.floor((today - start) / msPerDay));

    for (let d = 0; d <= totalDays; d += step) {
        const dDate = new Date(start.getTime() + d * msPerDay);
        labels.push(dDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));

        // Required pace cumulative line (strictly linear from 0 to total)
        const reqCum = total > 0 ? (total / totalDays) * d : 0;
        reqData.push(Math.round(reqCum));

        // Actual completed cumulative line (only up to today)
        if (d <= daysElapsed) {
            const curCum = daysElapsed > 0 ? (completed / daysElapsed) * d : completed;
            curData.push(Math.round(curCum));
        } else {
            curData.push(null);
        }
    }

    // Force inclusion of end boundary if not already included
    const lastLabel = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (!labels.includes(lastLabel)) {
        labels.push(lastLabel);
        reqData.push(total);
        if (today >= end) curData.push(completed);
        else curData.push(null);
    }

    if (window.paceTrendChartInstance) window.paceTrendChartInstance.destroy();
    window.paceTrendChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Required Pace', data: reqData, borderColor: '#3b82f6', borderDash: [5, 5], backgroundColor: 'transparent', tension: 0.2, borderWidth: 2, pointRadius: 2 },
                { label: 'Actual Progress', data: curData, borderColor: '#10b981', backgroundColor: '#10b98120', fill: true, tension: 0.2, borderWidth: 3, pointRadius: 4, pointHoverRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12, cornerRadius: 8 } },
            scales: {
                y: { min: 0, max: total, ticks: { font: { size: 9, weight: 'bold' } }, grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false } },
                x: { ticks: { font: { size: 9, weight: 'bold' } }, grid: { display: false, drawBorder: false } }
            }
        }
    });
};

window.switchSysTab = function (tab) {
    ['track', 'chapter', 'subject', 'program', 'manage', 'pass'].forEach(t => {
        const btn = document.getElementById(`sys-tab-${t}`);
        const content = document.getElementById(`sys-content-${t}`);
        if (!btn || !content) return;

        if (t === tab) {
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-md'); btn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400');
            if (t === 'track') { btn.classList.remove('bg-blue-600'); btn.classList.add('bg-indigo-600'); }
            content.classList.remove('hidden');
        } else {
            btn.classList.remove('bg-blue-600', 'bg-indigo-600', 'text-white', 'shadow-md'); btn.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400');
            content.classList.add('hidden');
        }
    });
    if (tab === 'track') {
        const trackInput = document.getElementById('add-track-name');
        if (trackInput) trackInput.focus();
    }
    if (tab === 'chapter') window.updateChProgDropdown();
    if (tab === 'subject') window.updateSubProgDropdown();
    if (tab === 'manage') window.updateManageDropdown();
    if (tab === 'pass') window.renderPassConfig();
};

window.updateManageDropdown = function () {
    const type = document.getElementById('manage-type').value;
    const targetSelect = document.getElementById('manage-target');
    const trackBox = document.getElementById('manage-track-box');
    const progBox = document.getElementById('manage-program-box');
    targetSelect.innerHTML = '';

    if (type === 'action') {
        trackBox.classList.add('hidden');
        progBox.classList.add('hidden');
        window.customActions.forEach(a => targetSelect.innerHTML += `<option value="${a.id}">${a.title}</option>`);
    } else if (type === 'track') {
        trackBox.classList.add('hidden');
        progBox.classList.add('hidden');
        window.customTracks.forEach(t => targetSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`);
    } else if (type === 'program') {
        trackBox.classList.remove('hidden');
        progBox.classList.add('hidden');
        const track = document.getElementById('manage-track').value;
        (window.customPrograms[track] || []).forEach(p => targetSelect.innerHTML += `<option value="${p}">${p}</option>`);
    } else if (type === 'subject') {
        trackBox.classList.remove('hidden');
        progBox.classList.remove('hidden');
        const track = document.getElementById('manage-track').value;
        const progSelect = document.getElementById('manage-program');
        progSelect.innerHTML = '';
        (window.customPrograms[track] || []).forEach(p => progSelect.innerHTML += `<option value="${p}">${p}</option>`);
        window.updateManageSubjects();
    }
};

window.updateManageSubjects = function () {
    const track = document.getElementById('manage-track').value;
    const prog = document.getElementById('manage-program').value;
    const targetSelect = document.getElementById('manage-target');
    targetSelect.innerHTML = '';

    const subs = window.syllabusStructure[track].filter(s => s.program === prog);
    subs.forEach(s => targetSelect.innerHTML += `<option value="${s.subject}">${s.subject}</option>`);
    if (subs.length === 0) targetSelect.innerHTML = '<option value="">No subjects found</option>';
};

window.executeManageEdit = function () {
    const type = document.getElementById('manage-type').value;
    const targetId = document.getElementById('manage-target').value;
    const newName = document.getElementById('manage-new-name').value.trim();
    if (!newName) return window.showToast("Enter a new name.", "error");

    if (type === 'track') {
        const track = window.customTracks.find(t => t.id === targetId);
        if (track) track.name = newName;
        window.updateTrackDropdowns();
    } else if (type === 'action') {
        const act = window.customActions.find(a => a.id === targetId);
        if (act) act.title = newName;
    } else {
        const track = document.getElementById('manage-track').value;
        const oldName = targetId;

        if (type === 'program') {
            if (oldName.toLowerCase() === newName.toLowerCase()) return window.showToast("New name must be different.", "error");
            if (window.customPrograms[track].some(p => p.toLowerCase() === newName.toLowerCase())) return window.showToast("Program already exists.", "error");

            const pIdx = window.customPrograms[track].indexOf(oldName);
            if (pIdx > -1) window.customPrograms[track][pIdx] = newName;
            window.syllabusStructure[track].forEach(s => { if (s.program === oldName) s.program = newName; });
            if (window.chartVisibility.prog[oldName] !== undefined) { window.chartVisibility.prog[newName] = window.chartVisibility.prog[oldName]; delete window.chartVisibility.prog[oldName]; }

            window.paceGoals.forEach(g => {
                if (g.type === 'program' && g.target === oldName) g.target = newName;
                if (g.type === 'bundle' && g.programs) {
                    const idx = g.programs.indexOf(oldName);
                    if (idx > -1) g.programs[idx] = newName;
                }
            });
            if (window.passedItems.programs.includes(oldName)) {
                window.passedItems.programs = window.passedItems.programs.filter(p => p !== oldName);
                window.passedItems.programs.push(newName);
            }
            if (typeof window.showToast === 'function') window.showToast("Program renamed successfully!", "success");

        } else if (type === 'subject') {
            if (oldName.toLowerCase() === newName.toLowerCase()) return window.showToast("New name must be different.", "error");
            const isGlobalDuplicate = window.customTracks.some(t => (window.syllabusStructure[t.id] || []).some(s => s.subject.toLowerCase() === newName.toLowerCase()));
            if (isGlobalDuplicate) return window.showToast("Subject name must be unique globally.", "error");

            const sObj = window.syllabusStructure[track].find(s => s.subject === oldName);
            if (sObj) sObj.subject = newName;

            if (window.subjectColors && window.subjectColors[oldName]) {
                window.subjectColors[newName] = window.subjectColors[oldName];
            }
            for (let i = 0; i < window.tasks.length; i++) {
                if (window.tasks[i].type !== 'study' || !window.tasks[i].trackTasks[track]) continue;
                window.tasks[i].trackTasks[track].forEach(item => { if (item.subject === oldName) item.subject = newName; });
            }

            if (window.currentFilter === oldName) window.currentFilter = newName;
            if (window.chartVisibility.subjects[oldName] !== undefined) { window.chartVisibility.subjects[newName] = window.chartVisibility.subjects[oldName]; delete window.chartVisibility.subjects[oldName]; }

            window.paceGoals.forEach(g => {
                if (g.type === 'subject' && g.target === oldName) g.target = newName;
                if (g.type === 'bundle' && g.subjects) {
                    const idx = g.subjects.indexOf(oldName);
                    if (idx > -1) g.subjects[idx] = newName;
                }
            });
            if (window.passedItems.subjects.includes(oldName)) {
                window.passedItems.subjects = window.passedItems.subjects.filter(s => s !== oldName);
                window.passedItems.subjects.push(newName);
            }
            if (typeof window.showToast === 'function') window.showToast("Subject renamed universally!", "success");
        }
    }

    document.getElementById('manage-new-name').value = '';
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    window.updateManageDropdown();
};

window.requestManageDelete = function () {
    const targetId = document.getElementById('manage-target').value;
    if (!targetId) return window.showToast("Please select an item to delete.", "error");
    if (!confirm(`Are you sure you want to DELETE this item? This action cannot be undone.`)) return;
    window.executeManageDelete();
};

window.executeManageDelete = function () {
    const type = document.getElementById('manage-type').value;
    const targetId = document.getElementById('manage-target').value;
    const trackId = document.getElementById('manage-track').value;

    if (type === 'track') {
        window.customTracks = window.customTracks.filter(t => t.id !== targetId);
        delete window.customPrograms[targetId];
        delete window.syllabusStructure[targetId];
        window.updateTrackDropdowns();
        if (typeof window.showToast === 'function') window.showToast("Track deleted successfully.", "success");
    } else if (type === 'action') {
        window.customActions = window.customActions.filter(a => a.id !== targetId);
        if (typeof window.showToast === 'function') window.showToast("Action deleted.", "success");
    } else {
        const targetName = targetId;
        if (type === 'program') {
            const subsToDelete = (window.syllabusStructure[trackId] || []).filter(s => s.program === targetName).map(s => s.subject);
            window.customPrograms[trackId] = (window.customPrograms[trackId] || []).filter(p => p !== targetName);
            window.syllabusStructure[trackId] = (window.syllabusStructure[trackId] || []).filter(s => s.program !== targetName);
            
            for (let i = 0; i < window.tasks.length; i++) {
                if (window.tasks[i].type !== 'study' || !window.tasks[i].trackTasks[trackId]) continue;
                window.tasks[i].trackTasks[trackId] = window.tasks[i].trackTasks[trackId].map(item => 
                    subsToDelete.includes(item.subject) ? { ...item, subject: "Deleted", chapter: "N/A", title: "Deleted", completed: false } : item
                );
            }
            if (typeof window.showToast === 'function') window.showToast(`Program and its subjects deleted.`, "success");
        } else if (type === 'subject') {
            window.syllabusStructure[trackId] = (window.syllabusStructure[trackId] || []).filter(s => s.subject !== targetName);
            for (let i = 0; i < window.tasks.length; i++) {
                if (window.tasks[i].type !== 'study' || !window.tasks[i].trackTasks[trackId]) continue;
                window.tasks[i].trackTasks[trackId] = window.tasks[i].trackTasks[trackId].map(item => 
                    item.subject === targetName ? { ...item, subject: "Deleted", chapter: "N/A", title: "Deleted", completed: false } : item
                );
            }
            if (typeof window.showToast === 'function') window.showToast(`Subject deleted.`, "success");
        }
    }

    if (typeof window.recalculateTotals === 'function') window.recalculateTotals();
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    window.updateManageDropdown();
};

window.appendNewTrack = function () {
    const name = document.getElementById('add-track-name').value.trim();
    if (!name) return window.showToast("Track name required.", "error");
    if (window.customTracks.some(t => t.name.toLowerCase() === name.toLowerCase())) return window.showToast("Track already exists.", "error");

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
    window.customTracks.push({ id, name });
    window.customPrograms[id] = [];
    window.syllabusStructure[id] = [];
    
    document.getElementById('add-track-name').value = '';
    window.updateTrackDropdowns();
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    if (typeof window.showToast === 'function') window.showToast("Track successfully added!", "success");
};

window.updateTrackDropdowns = function () {
    const selectors = ['add-ch-track', 'add-sub-track', 'add-prog-track', 'manage-track', 'esm-track'];
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const currentVal = el.value;
            el.innerHTML = window.customTracks.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            if (currentVal && window.customTracks.some(t => t.id === currentVal)) el.value = currentVal;
        }
    });
};

window.updateChProgDropdown = function () {
    const track = document.getElementById('add-ch-track').value;
    const progSelect = document.getElementById('add-ch-program');
    if (!progSelect) return;
    progSelect.innerHTML = '';
    (window.customPrograms[track] || []).forEach(p => progSelect.innerHTML += `<option value="${p}">${p}</option>`);
    window.updateChSubjDropdown();
};

window.updateChSubjDropdown = function () {
    const track = document.getElementById('add-ch-track').value;
    const prog = document.getElementById('add-ch-program').value;
    const subjSelect = document.getElementById('add-ch-subject');
    if (!subjSelect) return;
    subjSelect.innerHTML = '';
    const subs = (window.syllabusStructure[track] || []).filter(s => s.program === prog);
    subs.forEach(s => subjSelect.innerHTML += `<option value="${s.subject}">${s.subject}</option>`);
    if (subs.length === 0) subjSelect.innerHTML = '<option value="">No subjects found</option>';
};

window.updateSubProgDropdown = function () {
    const track = document.getElementById('add-sub-track').value;
    const progSelect = document.getElementById('add-sub-program');
    progSelect.innerHTML = '';
    (window.customPrograms[track] || []).forEach(p => progSelect.innerHTML += `<option value="${p}">${p}</option>`);
};

window.appendNewProgram = function () {
    const track = document.getElementById('add-prog-track').value;
    const name = document.getElementById('add-prog-name').value.trim();
    if (!name) return window.showToast("Program name required.", "error");
    if (window.customPrograms[track].some(p => p.toLowerCase() === name.toLowerCase())) return window.showToast("Program already exists.", "error");

    window.customPrograms[track].push(name);
    document.getElementById('add-prog-name').value = '';
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    if (typeof window.showToast === 'function') window.showToast("Program successfully added!", "success");
};

window.appendNewSubject = function () {
    const track = document.getElementById('add-sub-track').value;
    const prog = document.getElementById('add-sub-program').value;
    const name = document.getElementById('add-sub-name').value.trim();
    const doBulk = document.getElementById('add-sub-bulk-cb').checked;
    const bulkNum = parseInt(document.getElementById('add-sub-bulk-num').value) || 0;

    if (!name) return window.showToast("Subject name required.", "error");

    const isGlobalDuplicate = window.customTracks.some(t => (window.syllabusStructure[t.id] || []).some(s => s.subject.toLowerCase() === name.toLowerCase()));
    if (isGlobalDuplicate) return window.showToast("Subject already exists. Names must be unique.", "error");

    if (doBulk && bulkNum <= 0) return window.showToast("Please enter a valid number of chapters to bulk add.", "error");

    let chaptersToAssign = doBulk ? bulkNum : 0;
    const todayStr = window.formatDate(new Date());
    let todayIdx = window.tasks.findIndex(t => t.date === todayStr);
    if (todayIdx === -1) todayIdx = 0;

    if (doBulk) {
        if (typeof window.ensureAvailableSlots === 'function') {
            window.ensureAvailableSlots(chaptersToAssign, track, todayIdx);
        }
    }

    window.syllabusStructure[track].push({ program: prog, subject: name, chapters: chaptersToAssign });
    if (typeof window.getSubjectColor === 'function') window.getSubjectColor(name);

    if (doBulk) {
        let currentChapter = 1;
        for (let i = todayIdx; i < window.tasks.length && currentChapter <= chaptersToAssign; i++) {
            if (window.tasks[i].type !== 'study') continue;
            const items = window.tasks[i].trackTasks[track] || [];
            const revIdx = items.findIndex(item => item.subject === 'Revision');
            if (revIdx > -1) {
                items[revIdx] = { subject: name, chapter: `Ch. ${currentChapter}`, title: `Topic ${currentChapter}`, completed: false, id: `${track}-${window.tasks[i].id}` };
                currentChapter++;
            }
        }
        if (typeof window.reorderSubjectChapters === 'function') {
            window.reorderSubjectChapters(track, name);
        }
    }

    document.getElementById('add-sub-name').value = '';
    document.getElementById('add-sub-bulk-cb').checked = false;
    document.getElementById('add-sub-bulk-num').value = '';
    document.getElementById('add-sub-bulk-num').classList.add('hidden');

    if (typeof window.recalculateTotals === 'function') window.recalculateTotals();
    if (typeof window.saveTasks === 'function') window.saveTasks();

    // Unblock main thread to allow modal to close immediately before heavy render
    setTimeout(() => {
        if (typeof window.renderUI === 'function') window.renderUI();
        if (typeof window.showToast === 'function') {
            window.showToast(doBulk ? `Subject created and ${chaptersToAssign} chapters scheduled!` : "Subject successfully created!", "success");
        }
    }, 50);
};

window.appendNewChapter = function () {
    const track = document.getElementById('add-ch-track').value;
    const prog = document.getElementById('add-ch-program').value;
    const subj = document.getElementById('add-ch-subject').value;
    const num = document.getElementById('add-ch-num').value;
    const title = document.getElementById('add-ch-title').value;
    const formattedCh = `Ch. ${num}`;

    if (!subj || !num || !title) return window.showToast("Please fill all fields.", "error");

    let isDuplicate = false;
    for (let i = 0; i < window.tasks.length; i++) {
        if (window.tasks[i].type !== 'study') continue;
        if (window.tasks[i].trackTasks && window.tasks[i].trackTasks[track]) {
            if (window.tasks[i].trackTasks[track].some(item => item.subject === subj && item.chapter === formattedCh)) { isDuplicate = true; break; }
        }
    }
    if (isDuplicate) return window.showToast(`Chapter ${num} already exists for ${subj}!`, "error");

    const todayStr = window.formatDate(new Date()); let todayIdx = window.tasks.findIndex(t => t.date === todayStr); if (todayIdx === -1) todayIdx = 0;

    if (typeof window.ensureAvailableSlots === 'function') {
        window.ensureAvailableSlots(1, track, todayIdx);
    }

    let slotted = false;

    for (let i = todayIdx; i < window.tasks.length; i++) {
        if (window.tasks[i].type !== 'study') continue;
        if (window.tasks[i].trackTasks && window.tasks[i].trackTasks[track]) {
            const items = window.tasks[i].trackTasks[track];
            const revIdx = items.findIndex(item => item.subject === 'Revision');
            if (revIdx > -1) {
                items[revIdx] = { subject: subj, chapter: formattedCh, title: title, completed: false, id: `${track}-${window.tasks[i].id}` };
                slotted = true; break;
            }
        }
    }

    if (!slotted) return window.showToast("No upcoming 'Revision' slots left for this track!", "error");

    if (typeof window.reorderSubjectChapters === 'function') {
        window.reorderSubjectChapters(track, subj);
    }
    const targetSub = window.syllabusStructure[track].find(s => s.subject === subj);
    if (targetSub) targetSub.chapters++;

    if (typeof window.recalculateTotals === 'function') window.recalculateTotals();
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    document.getElementById('add-ch-num').value = ''; document.getElementById('add-ch-title').value = '';
    if (typeof window.showToast === 'function') window.showToast("Chapter added and sequenced!", "success");
};

window.appendNewAction = function () {
    const title = document.getElementById('add-act-title').value.trim();
    const desc = document.getElementById('add-act-desc').value.trim();
    const color = document.getElementById('add-act-color').value;

    if (!title || !desc) return window.showToast("Please provide a Title and Description.", "error");
    const newId = 'act_' + title.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString().slice(-4);

    window.customActions.push({ id: newId, title: title, desc: desc, color: color, icon: 'generic' });

    document.getElementById('add-act-title').value = ''; document.getElementById('add-act-desc').value = '';
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    if (typeof window.showToast === 'function') window.showToast("Daily Action Tracker created!", "success");
};

window.renderPassConfig = function () {
    const container = document.getElementById('sys-content-pass');
    if (!container) return;
    if (!window.passedItems) window.passedItems = { programs: [], subjects: [] };

    let html = '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4 font-bold">Mark entire programs or specific subjects as "Passed". This freezes them, compressing their UI in the Task List and instantly satisfying their pacing requirements.</p><div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">';

    // Programs Column
    html += '<div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"><h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">Programs (Freeze All Subs)</h4><div class="flex flex-col gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">';
    window.customTracks.forEach(trackObj => {
        const track = trackObj.id;
        if (window.customPrograms[track].length > 0) {
            html += `<div class="mt-2 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1">${trackObj.name}</div>`;
            window.customPrograms[track].forEach(p => {
                const isChecked = window.passedItems.programs.includes(p) ? 'checked' : '';
                html += `
                <label class="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all">
                    <input type="checkbox" onchange="window.togglePassStatus('program', '${p}', this.checked)" class="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500 transition-all" ${isChecked}>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${p}</span>
                </label>`;
            });
        }
    });
    html += '</div></div>';

    // Subjects Column (Updated to Accordions)
    html += '<div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"><h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">Individual Subjects</h4><div class="flex flex-col gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">';
    window.customTracks.forEach(trackObj => {
        const track = trackObj.id;
        window.customPrograms[track].forEach(prog => {
            const subs = window.syllabusStructure[track].filter(s => s.program === prog);
            if (subs.length > 0) {
                html += `
                <details class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group">
                    <summary class="cursor-pointer font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 p-3 outline-none select-none list-none flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-95 rounded-xl transition-all [&::-webkit-details-marker]:hidden">
                        <div class="flex items-center space-x-2">
                            <span>${prog}</span>
                            <span class="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[8px]">${subs.length} Subs</span>
                        </div>
                        <svg class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </summary>
                    <div class="p-3 pt-0 border-t border-slate-100 dark:border-slate-700">
                        <div class="flex flex-col gap-1.5 mt-3">
                `;
                subs.forEach(s => {
                    const isProgPassed = window.passedItems.programs.includes(prog);
                    const isChecked = window.passedItems.subjects.includes(s.subject) || isProgPassed ? 'checked' : '';
                    let displaySub = s.subject.replace(prog + ' - ', '').replace(prog + ' ', '');
                    html += `
                            <label class="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 active:scale-95 transition-all">
                                <input type="checkbox" onchange="window.togglePassStatus('subject', '${s.subject}', this.checked)" class="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500 transition-all" ${isChecked}>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">${displaySub}</span>
                            </label>`;
                });
                html += `
                        </div>
                    </div>
                </details>`;
            }
        });
    });
    html += '</div></div></div>';

    container.innerHTML = html;
};

window.togglePassStatus = function (type, name, isChecked) {
    if (!window.passedItems) window.passedItems = { programs: [], subjects: [] };

    if (type === 'program') {
        if (isChecked) {
            if (!window.passedItems.programs.includes(name)) window.passedItems.programs.push(name);

            // Link: Checking a program automatically checks all its subjects
            let programSubs = [];
            window.customTracks.forEach(trackObj => {
                (window.syllabusStructure[trackObj.id] || []).forEach(s => {
                    if (s.program === name) programSubs.push(s.subject);
                });
            });
            programSubs.forEach(sub => {
                if (!window.passedItems.subjects.includes(sub)) window.passedItems.subjects.push(sub);
            });

        } else {
            window.passedItems.programs = window.passedItems.programs.filter(p => p !== name);

            // Link: Unchecking a program automatically unchecks all its subjects
            let programSubs = [];
            window.customTracks.forEach(trackObj => {
                (window.syllabusStructure[trackObj.id] || []).forEach(s => {
                    if (s.program === name) programSubs.push(s.subject);
                });
            });
            window.passedItems.subjects = window.passedItems.subjects.filter(s => !programSubs.includes(s));
        }
    } else if (type === 'subject') {
        if (isChecked) {
            if (!window.passedItems.subjects.includes(name)) window.passedItems.subjects.push(name);

            // Link: Check if all subjects in the program are now checked
            const allSubs = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []);
            const sObj = allSubs.find(s => s.subject === name);
            if (sObj) {
                const progName = sObj.program;
                let allSubsInProg = [];
                window.customTracks.forEach(trackObj => {
                    (window.syllabusStructure[trackObj.id] || []).forEach(s => {
                        if (s.program === progName) allSubsInProg.push(s.subject);
                    });
                });
                const allPassed = allSubsInProg.every(sub => window.passedItems.subjects.includes(sub));
                if (allPassed && !window.passedItems.programs.includes(progName)) {
                    window.passedItems.programs.push(progName);
                }
            }

        } else {
            window.passedItems.subjects = window.passedItems.subjects.filter(s => s !== name);

            // Link: Unchecking a subject must uncheck its parent program
            const allSubs = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []);
            const sObj = allSubs.find(s => s.subject === name);
            if (sObj) {
                const progName = sObj.program;
                window.passedItems.programs = window.passedItems.programs.filter(p => p !== progName);
            }
        }
    }

    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.updateSuccessScore === 'function') window.updateSuccessScore();
    if (typeof window.renderUI === 'function') window.renderUI();
    window.renderPassConfig();
    if (typeof window.showToast === 'function') {
        window.showToast(name + (isChecked ? " frozen & marked passed!" : " unfrozen!"), "success");
    }
};

window.togglePaceBundleType = function () {
    const bType = document.getElementById('add-pace-bundle-type').value;
    const nameContainer = document.getElementById('add-pace-name-container');
    const checklistSection = document.getElementById('add-pace-checklist-section');
    const checklistLabel = document.getElementById('add-pace-checklist-label');

    if (bType === 'global') {
        nameContainer.classList.add('hidden');
        checklistSection.classList.remove('hidden');
        checklistLabel.textContent = "Select Subjects & Secondary Paces";
        window.updatePaceSubjects();
    } else {
        nameContainer.classList.remove('hidden');
        checklistSection.classList.remove('hidden');

        if (bType === 'subjects') {
            checklistLabel.textContent = "Select Subjects to Include (Organized by Program)";
        } else {
            checklistLabel.textContent = "Select Entire Programs to Include";
        }
        window.updatePaceSubjects();
    }
};

window.updatePaceSubjects = function () {
    const bType = document.getElementById('add-pace-bundle-type').value;
    const container = document.getElementById('add-pace-subjects-container');
    if (!container) return;

    let html = '';

    if (bType === 'subjects') {
        window.customTracks.forEach(trackObj => {
            const track = trackObj.id;
            (window.customPrograms[track] || []).forEach(prog => {
                const subs = (window.syllabusStructure[track] || []).filter(s => s.program === prog);
                if (subs.length > 0) {
                    html += `
                    <details class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group">
                        <summary class="cursor-pointer font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 p-3 outline-none select-none list-none flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-95 rounded-xl transition-all [&::-webkit-details-marker]:hidden">
                            <div class="flex items-center space-x-2">
                                <span>${prog}</span>
                                <span class="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md text-[8px]">${subs.length} Subjects</span>
                            </div>
                            <svg class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </summary>
                        <div class="p-3 pt-0 border-t border-slate-100 dark:border-slate-700">
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                    `;
                    subs.forEach(s => {
                        let displaySub = s.subject.replace(prog + ' - ', '').replace(prog + ' ', '');
                        html += `
                                <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-400 active:scale-95 transition-all shadow-sm group/label">
                                    <input type="checkbox" value="${s.subject}" class="pace-subject-cb form-checkbox h-4 w-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 transition-all">
                                    <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate group-hover/label:text-orange-600 dark:group-hover/label:text-orange-400 transition-colors" title="${s.subject}">${displaySub}</span>
                                </label>`;
                    });
                    html += `
                            </div>
                        </div>
                    </details>`;
                }
            });
        });
    } else if (bType === 'programs') {
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full">`;
        window.customTracks.forEach(trackObj => {
            const track = trackObj.id;
            if ((window.customPrograms[track] || []).length > 0) {
                window.customPrograms[track].forEach(p => {
                    html += `
                    <label class="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-400 active:scale-95 transition-all shadow-sm">
                        <input type="checkbox" value="${p}" class="pace-subject-cb form-checkbox h-4 w-4 text-violet-500 rounded border-slate-300 focus:ring-violet-500 accent-violet-500 transition-all">
                        <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate">${p}</span>
                    </label>`;
                });
            }
        });
        html += `</div>`;
    } else if (bType === 'global') {
        html += `<div class="mb-4"><h5 class="text-[10px] font-black uppercase text-slate-400 mb-2">Subjects</h5>`;
        window.customTracks.forEach(trackObj => {
            const track = trackObj.id;
            (window.customPrograms[track] || []).forEach(prog => {
                const subs = (window.syllabusStructure[track] || []).filter(s => s.program === prog);
                if (subs.length > 0) {
                    html += `
                    <details class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group mb-2">
                        <summary class="cursor-pointer font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 p-3 outline-none select-none list-none flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-95 rounded-xl transition-all [&::-webkit-details-marker]:hidden">
                            <div class="flex items-center space-x-2">
                                <span>${prog}</span>
                                <span class="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md text-[8px]">${subs.length} Subjects</span>
                            </div>
                            <svg class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </summary>
                        <div class="p-3 pt-0 border-t border-slate-100 dark:border-slate-700">
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                    `;
                    subs.forEach(s => {
                        let displaySub = s.subject.replace(prog + ' - ', '').replace(prog + ' ', '');
                        html += `
                                <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-400 active:scale-95 transition-all shadow-sm group/label">
                                    <input type="checkbox" value="${s.subject}" class="global-subject-cb form-checkbox h-4 w-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 transition-all">
                                    <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate group-hover/label:text-orange-600 dark:group-hover/label:text-orange-400 transition-colors" title="${s.subject}">${displaySub}</span>
                                </label>`;
                    });
                    html += `
                            </div>
                        </div>
                    </details>`;
                }
            });
        });
        html += `</div>`;

        html += `<div><h5 class="text-[10px] font-black uppercase text-slate-400 mb-2">Secondary Paces</h5>`;
        const otherGoals = window.paceGoals.filter(g => g.type !== 'global');
        if (otherGoals.length > 0) {
            html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
            otherGoals.forEach(g => {
                html += `
                <label class="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 active:scale-95 transition-all shadow-sm">
                    <input type="checkbox" value="${g.id}" class="global-pace-cb form-checkbox h-4 w-4 text-indigo-500 rounded border-slate-300 focus:ring-indigo-500 accent-indigo-500 transition-all">
                    <span class="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title="${g.target}">${g.target}</span>
                </label>`;
            });
            html += `</div>`;
        } else {
            html += `<span class="text-[10px] text-slate-500">No other pace goals available to link.</span>`;
        }
        html += `</div>`;
    }

    container.innerHTML = html || '<span class="text-[10px] text-slate-500 col-span-full">No items found.</span>';
};

window.addPaceGoal = function () {
    const bType = document.getElementById('add-pace-bundle-type').value;
    const name = bType === 'global' ? 'Global Overall' : document.getElementById('add-pace-name').value.trim();
    const startStr = document.getElementById('add-pace-start').value;
    const dateStr = document.getElementById('add-pace-date').value;

    if (bType !== 'global' && !name) return window.showToast("Please provide a Goal Name.", "error");
    if (!startStr) return window.showToast("Please select a target start date.", "error");
    if (!dateStr) return window.showToast("Please select a target deadline date.", "error");

    const startDate = window.parseDateSafe(startStr);
    const targetDate = window.parseDateSafe(dateStr);
    if (targetDate <= startDate) return window.showToast("Target deadline must be after the start date.", "error");

    if (bType === 'global') {
        if (window.paceGoals.some(g => g.type === 'global')) return window.showToast("A Global Pace Goal already exists.", "error");

        const subjCheckboxes = document.querySelectorAll('.global-subject-cb:checked');
        const secCheckboxes = document.querySelectorAll('.global-pace-cb:checked');

        const selectedSubjects = Array.from(subjCheckboxes).map(cb => cb.value);
        const selectedSec = Array.from(secCheckboxes).map(cb => cb.value);

        window.paceGoals.push({
            id: 'pg_' + Date.now(),
            type: 'global',
            target: name,
            startDate: startStr,
            deadline: dateStr,
            subjects: selectedSubjects,
            secondaryPaces: selectedSec
        });
    } else {
        const checkboxes = document.querySelectorAll('.pace-subject-cb:checked');
        const selectedItems = Array.from(checkboxes).map(cb => cb.value);

        if (selectedItems.length === 0) return window.showToast("Please select at least one item.", "error");
        if (window.paceGoals.some(g => g.target === name)) return window.showToast("A custom goal with this name already exists.", "error");

        let newGoal = {
            id: 'pg_' + Date.now(),
            type: 'bundle',
            target: name,
            startDate: startStr,
            deadline: dateStr
        };

        if (bType === 'subjects') {
            newGoal.subjects = selectedItems;
        } else {
            newGoal.programs = selectedItems;
        }

        window.paceGoals.push(newGoal);
    }

    document.getElementById('add-pace-name').value = '';
    document.getElementById('add-pace-start').value = '';
    document.getElementById('add-pace-date').value = '';
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    if (typeof window.showToast === 'function') window.showToast("Custom Pace Goal added!", "success");
};

window.requestDeletePaceGoal = function (id) {
    window.openConfirmModal("Delete Pace Goal", "Are you sure you want to remove this target timeline?", () => window.deletePaceGoal(id));
};

window.deletePaceGoal = function (id) {
    window.paceGoals = window.paceGoals.filter(g => g.id !== id);
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    if (typeof window.showToast === 'function') window.showToast("Pace Goal deleted.", "success");
};
