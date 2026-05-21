// Revision System UI logic

function openRevisionModal() {
    window.renderRevisionModalContent();
    if (typeof window.openModal === 'function') window.openModal('revision-manage-modal');
}

function renderRevisionModalContent() {
    const container = document.getElementById('rmm-subjects-container');
    if (!container) return;
    let html = '';

    window.customTracks.forEach(trackObj => {
        const track = trackObj.id;
        (window.customPrograms[track] || []).forEach(prog => {
            const subs = (window.syllabusStructure[track] || []).filter(s => s.program === prog);
            if (subs.length > 0) {
                html += `<div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"><h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">${prog}</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
                subs.forEach(s => {
                    const isRevising = window.revisionData && window.revisionData.active && window.revisionData.active.includes(s.subject);
                    let displaySub = s.subject.replace(prog + ' - ', '').replace(prog + ' ', '');
                    html += `
                        <label class="flex items-center space-x-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 active:scale-95 transition-all shadow-sm">
                            <input type="checkbox" onchange="window.toggleRevisionMode('${s.subject.replace(/'/g, "\\'")}')" class="form-checkbox h-4 w-4 text-blue-500 rounded border-slate-300 focus:ring-blue-500 transition-all" ${isRevising ? 'checked' : ''}>
                            <span class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title="${s.subject}">${displaySub}</span>
                        </label>`;
                });
                html += `</div></div>`;
            }
        });
    });
    container.innerHTML = html;
}

function toggleRevisionMode(sub) {
    if (!window.revisionData) window.revisionData = { active: [], progress: {} };
    if (!window.revisionData.active) window.revisionData.active = [];

    if (window.revisionData.active.includes(sub)) {
        window.revisionData.active = window.revisionData.active.filter(s => s !== sub);
    } else {
        window.revisionData.active.push(sub);
        if (!window.revisionData.progress[sub]) window.revisionData.progress[sub] = {};
    }
    if (typeof window.saveTasks === 'function') window.saveTasks();
    if (typeof window.renderUI === 'function') window.renderUI();
    window.renderRevisionModalContent();

    const actionText = window.revisionData.active.includes(sub) ? "started" : "closed";
    if (typeof window.showToast === 'function') window.showToast(`Revision mode ${actionText} for ${sub}!`, "success");
}

function toggleRevisionChapter(sub, chNum, isChecked) {
    if (!window.revisionData) window.revisionData = { active: [], progress: {} };
    if (!window.revisionData.progress[sub]) window.revisionData.progress[sub] = {};
    window.revisionData.progress[sub][chNum] = isChecked ? new Date().toISOString() : false;

    // Optimistic UI for smooth clicking
    const cardEl = document.getElementById(`rev-task-${sub.replace(/[^a-zA-Z0-9]/g, '-')}-${chNum}`);
    if (cardEl) {
        const titleEl = cardEl.querySelector('.tracking-tight');
        const descEl = cardEl.querySelector('.line-clamp-2');
        const accentBar = cardEl.querySelector('.absolute.top-0.left-0');

        if (titleEl) {
            if (isChecked) titleEl.classList.add('line-through', 'text-blue-700', 'dark:text-blue-400', 'opacity-70');
            else titleEl.classList.remove('line-through', 'text-blue-700', 'dark:text-blue-400', 'opacity-70');
        }
        if (descEl) isChecked ? descEl.classList.add('line-through', 'opacity-60') : descEl.classList.remove('line-through', 'opacity-60');

        if (isChecked) {
            cardEl.classList.add('ring-1', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
            cardEl.classList.remove('bg-white', 'dark:bg-slate-800');
            if (accentBar) accentBar.className = 'absolute top-0 left-0 w-full h-1 bg-blue-500 transition-colors';
        } else {
            cardEl.classList.remove('ring-1', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
            cardEl.classList.add('bg-white', 'dark:bg-slate-800');
            if (accentBar) accentBar.className = 'absolute top-0 left-0 w-full h-1 bg-blue-300 dark:bg-blue-700 transition-colors';
        }
    }

    // Update local progress bar
    const safeSubId = sub.replace(/[^a-zA-Z0-9]/g, '-');
    const allSubs = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []);
    const sObj = allSubs.find(s => s.subject === sub);
    const totalChapters = sObj ? sObj.chapters : 1;
    const completedCount = Object.values(window.revisionData.progress[sub]).filter(Boolean).length;
    const progressPct = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 100;

    const textEl = document.getElementById(`rev-group-text-${safeSubId}`);
    if (textEl) textEl.innerHTML = `${completedCount} <span class="opacity-60 text-[9px] mx-0.5">/</span> ${totalChapters} <span class="opacity-60">CH</span>`;
    const pctEl = document.getElementById(`rev-group-pct-${safeSubId}`);
    if (pctEl) pctEl.textContent = `${progressPct}%`;
    const barEl = document.getElementById(`rev-group-bar-${safeSubId}`);
    if (barEl) barEl.style.width = `${progressPct}%`;

    if (typeof window.updateMetrics === 'function') window.updateMetrics();
    if (typeof window.saveTasks === 'function') window.saveTasks();

    if (window.chartDebounce) clearTimeout(window.chartDebounce);
    window.chartDebounce = setTimeout(() => {
        if (typeof window.renderTrendCharts === 'function') {
            requestAnimationFrame(window.renderTrendCharts);
        }
    }, 600);
}

function generateRevisionTaskHtml(sub, chNum, isCompleted) {
    const safeSub = sub.replace(/[^a-zA-Z0-9]/g, '-');
    const safeSubQuotes = sub.replace(/'/g, "\\'");
    return `
        <div id="rev-task-${safeSub}-${chNum}" class="relative bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700 flex flex-col justify-between min-h-[110px] overflow-hidden group select-none ${isCompleted ? 'ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20 !border-blue-200 dark:!border-blue-800' : ''}">
            <div class="absolute top-0 left-0 w-full h-1 ${isCompleted ? 'bg-blue-500' : 'bg-blue-300 dark:bg-blue-700'} transition-colors"></div>
            
            <div class="flex justify-start items-center mb-3 mt-1">
                <span class="text-[9px] px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md font-black tracking-widest uppercase border border-blue-100 dark:border-blue-800/50">REVISION</span>
            </div>

            <div class="flex items-end justify-between mt-auto gap-3">
                <div class="flex flex-col pr-1">
                    <span class="font-black text-slate-800 dark:text-slate-100 text-sm md:text-base tracking-tight leading-tight mb-0.5 ${isCompleted ? 'line-through text-blue-700 dark:text-blue-400 opacity-70' : ''}">Ch. ${chNum}</span>
                    <span class="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug ${isCompleted ? 'line-through opacity-60' : ''}">Revision Practice</span>
                </div>
                <div class="shrink-0 mb-0.5">
                    <div class="relative flex items-center justify-center">
                        <input type="checkbox" onchange="window.toggleRevisionChapter('${safeSubQuotes}', ${chNum}, this.checked)" class="peer relative appearance-none w-6 h-6 border-2 border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-800 checked:bg-blue-500 checked:border-blue-500 focus:outline-none cursor-pointer transition-all shadow-sm hover:border-blue-400" ${isCompleted ? 'checked' : ''}>
                        <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                </div>
            </div>
        </div>`;
}

// Bind to window
window.openRevisionModal = openRevisionModal;
window.renderRevisionModalContent = renderRevisionModalContent;
window.toggleRevisionMode = toggleRevisionMode;
window.toggleRevisionChapter = toggleRevisionChapter;
window.generateRevisionTaskHtml = generateRevisionTaskHtml;

export { openRevisionModal, renderRevisionModalContent, toggleRevisionMode, toggleRevisionChapter, generateRevisionTaskHtml };
