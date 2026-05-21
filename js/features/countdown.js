function updateCountdown() {
    if (!window.globalStartDate || !window.globalEndDate) {
        window.safeSetHtml('countdown-timer', `<div class="text-right"><span class="block text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Final Deadline</span><span class="text-slate-400 font-black text-sm md:text-base drop-shadow-sm">Not Set</span></div>`);
        window.safeSetHtml('time-gone-stats', `<div class="flex items-center space-x-2 md:space-x-3"><div class="p-2 md:p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg md:rounded-xl border border-slate-200 dark:border-slate-700/50"><svg class="w-4 h-4 md:w-5 md:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><div><span class="block text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Time Elapsed</span><span class="text-slate-400 font-black text-sm md:text-base">Not Set</span></div></div>`);
        return;
    }

    const today = new Date();
    const start = new Date(window.globalStartDate);
    const target = new Date(window.globalEndDate);

    const diffLeft = target - today;
    if (diffLeft > 0) {
        const daysLeft = Math.ceil(diffLeft / (1000 * 60 * 60 * 24));
        window.safeSetHtml('countdown-timer', `<div class="text-right"><span class="block text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Final Deadline</span><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 font-black text-xl md:text-2xl drop-shadow-sm">${daysLeft} Days</span></div>`);
    } else {
        window.safeSetHtml('countdown-timer', `<span class="text-green-500 font-black text-base md:text-lg drop-shadow-sm">Goal Reached!</span>`);
    }

    const diffGone = today - start;
    const daysGone = Math.max(0, Math.floor(diffGone / (1000 * 60 * 60 * 24)));
    window.safeSetHtml('time-gone-stats', `<div class="flex items-center space-x-2 md:space-x-3"><div class="p-2 md:p-2.5 bg-red-100 dark:bg-red-500/20 rounded-lg md:rounded-xl border border-red-200 dark:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]"><svg class="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><div><span class="block text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Time Elapsed</span><span class="text-red-600 dark:text-red-400 font-black text-xl md:text-2xl drop-shadow-[0_2px_4px_rgba(239,68,68,0.3)]">${daysGone} Days</span></div></div>`);
}

function updateSuccessScore() {
    if (!window.passedItems) window.passedItems = { programs: [], subjects: [] };
    let totalSubs = 0;
    let passedSubs = 0;

    window.customTracks.forEach(track => {
        (window.syllabusStructure[track.id] || []).forEach(s => {
            totalSubs++;
            if (window.passedItems.programs.includes(s.program) || window.passedItems.subjects.includes(s.subject)) {
                passedSubs++;
            }
        });
    });

    const pct = totalSubs > 0 ? Math.round((passedSubs / totalSubs) * 100) : 0;

    window.safeSetHtml('success-score-stats', `
        <div class="flex items-center space-x-2 md:space-x-3">
            <div class="p-2 md:p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg md:rounded-xl border border-emerald-200 dark:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                <svg class="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div class="text-left">
                <span class="block text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-wider">Success Score</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-black text-xl md:text-2xl drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]">${pct}%</span>
            </div>
        </div>
    `);

    if (pct === 100 && totalSubs > 0 && !window.hasShownCongrats) {
        window.hasShownCongrats = true;
        if (typeof window.showCongratsModal === 'function') {
            setTimeout(() => window.showCongratsModal(), 800);
        }
    } else if (pct < 100) {
        window.hasShownCongrats = false;
    }
}

// Bind to window
window.updateCountdown = updateCountdown;
window.updateSuccessScore = updateSuccessScore;

export { updateCountdown, updateSuccessScore };
