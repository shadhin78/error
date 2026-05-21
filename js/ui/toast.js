// Toast notifications & window resize responsiveness coordinator

function showToast(msg, type) {
    const t = document.getElementById('toast-message'); if (!t) return;
    t.textContent = msg;
    t.className = `mt-5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl px-5 py-3 text-center transition-all duration-300 w-full md:w-auto self-start border shadow-md ${type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'}`;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 4000);
}

// Fast global resize listener to ensure all canvas charts remain perfectly responsive across device orientations
let resizeDebounceTimer = null;
window.addEventListener('resize', () => {
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
        const charts = [
            window.progressChart, window.mainChartPrograms, window.monthlyChartActions,
            window.yearlyChartActions, window.subjectTrendChart, window.paceTrendChartInstance,
            window.revisionTrendChartInstance, window.globalHistoryChartInstance, window.masterLineChart,
            window.dadbTrendChartInstance, window.resultsTrendChartInstance
        ];
        charts.forEach(c => { if (c && typeof c.resize === 'function') c.resize(); });
    }, 50);
});

// Bind to window
window.showToast = showToast;

export { showToast };
