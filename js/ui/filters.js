// Filtering & Search Control logic

function renderFilterButtons() {
    const filterContainer = document.getElementById('filter-buttons');
    if (!filterContainer) return;

    let html = '';

    const btnClass = (val) => {
        const isActive = window.currentFilter === val;
        return `active:scale-95 whitespace-nowrap px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[11px] md:text-sm font-black transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border-transparent scale-105' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:shadow-md'}`;
    };

    // ALL button and Revise Setup
    html += `<div class="mb-3 flex gap-2"><button class="${btnClass('All')}" onclick="window.setFilter('All')">All Tasks</button><button class="active:scale-95 whitespace-nowrap px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[11px] md:text-sm font-black transition-all duration-300 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/60 shadow-sm flex items-center gap-1.5" onclick="window.openRevisionModal()"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Revise Subject</button></div>`;

    // Group by Track -> Program
    window.customTracks.forEach(track => {
        (window.customPrograms[track.id] || []).forEach(prog => {
            const subs = (window.syllabusStructure[track.id] || []).filter(s => s.program === prog);
            if (subs.length > 0) {
                html += `
                <div class="mb-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1 w-full">${prog} PROGRAM (${track.name})</span>
                    </div>
                    <div class="flex flex-wrap gap-2 md:gap-3">
                        <button class="${btnClass(prog)}" onclick="window.setFilter('${prog}')">[ ENTIRE ${prog} ]</button>
                        ${subs.map(s => {
                            let displaySub = s.subject;
                            if (displaySub.startsWith(s.program + ' - ')) displaySub = displaySub.replace(s.program + ' - ', '');
                            else if (displaySub.startsWith(s.program + ' ')) displaySub = displaySub.replace(s.program + ' ', '');
                            return `<button class="${btnClass(s.subject)}" onclick="window.setFilter('${s.subject}')">${displaySub}</button>`;
                        }).join('')}
                    </div>
                </div>`;
            }
        });
    });

    filterContainer.innerHTML = html;
}

function setFilter(val) {
    window.currentFilter = val;
    window.subjectDetailsState = {};
    renderFilterButtons();
    if (typeof window.renderTaskList === 'function') window.renderTaskList();
    if (typeof window.updateMetrics === 'function') window.updateMetrics();
    if (typeof window.renderTrendCharts === 'function') window.renderTrendCharts();
}

function setTrendFilter(f) {
    window.trendTimeFilter = f;
    if (typeof window.renderTrendCharts === 'function') window.renderTrendCharts();
    if (window.revisionTrendChartInstance && typeof window.renderRevisionTrendChart === 'function') {
        window.renderRevisionTrendChart();
    }
    ['1Y', '2Y', '3Y', 'ALL'].forEach(id => {
        const btn = document.getElementById('tf-' + id);
        if (btn) {
            if (id === f) {
                btn.classList.add('bg-blue-600', 'text-white', 'shadow');
                btn.classList.remove('text-slate-500', 'hover:bg-slate-300', 'dark:text-slate-400', 'dark:hover:bg-slate-600');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white', 'shadow');
                btn.classList.add('text-slate-500', 'hover:bg-slate-300', 'dark:text-slate-400', 'dark:hover:bg-slate-600');
            }
        }
    });
}

// Bind to window
window.renderFilterButtons = renderFilterButtons;
window.setFilter = setFilter;
window.setTrendFilter = setTrendFilter;

export { renderFilterButtons, setFilter, setTrendFilter };
