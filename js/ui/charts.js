function renderChart() {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;
    if (window.progressChart) window.progressChart.destroy();
    window.progressChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: { datasets: [{ data: [0, window.totalStaticChapters], backgroundColor: ['#3b82f6', 'rgba(148, 163, 184, 0.1)'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '82%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
}

function renderTrendCharts() {
    // CLEANUP ORPHANED DATA
    let validProgs = [];
    window.customTracks.forEach(t => { if (window.customPrograms[t.id]) validProgs.push(...window.customPrograms[t.id]); });
    Object.keys(window.latestChartStats.prog).forEach(k => { if (!validProgs.includes(k)) delete window.latestChartStats.prog[k]; });
    Object.keys(window.chartVisibility.prog).forEach(k => { if (!validProgs.includes(k)) delete window.chartVisibility.prog[k]; });

    let validSubs = [];
    window.customTracks.forEach(t => { if (window.syllabusStructure[t.id]) validSubs.push(...window.syllabusStructure[t.id].map(s => s.subject)); });
    Object.keys(window.latestChartStats.subjects).forEach(k => { if (!validSubs.includes(k)) delete window.latestChartStats.subjects[k]; });
    Object.keys(window.chartVisibility.subjects).forEach(k => { if (!validSubs.includes(k)) delete window.chartVisibility.subjects[k]; });
    Object.keys(window.latestChartStats.revSubjects).forEach(k => { if (!validSubs.includes(k)) delete window.latestChartStats.revSubjects[k]; });
    Object.keys(window.chartVisibility.revSubjects).forEach(k => { if (!validSubs.includes(k)) delete window.chartVisibility.revSubjects[k]; });

    let validActs = window.customActions.map(a => a.id);
    Object.keys(window.latestChartStats.monthly).forEach(k => { if (!validActs.includes(k)) delete window.latestChartStats.monthly[k]; });
    Object.keys(window.latestChartStats.yearly).forEach(k => { if (!validActs.includes(k)) delete window.latestChartStats.yearly[k]; });
    Object.keys(window.chartVisibility.monthly).forEach(k => { if (!validActs.includes(k)) delete window.chartVisibility.monthly[k]; });
    Object.keys(window.chartVisibility.yearly).forEach(k => { if (!validActs.includes(k)) delete window.chartVisibility.yearly[k]; });

    const ctx1 = document.getElementById('mainChartPrograms');
    const ctx2 = document.getElementById('monthlyActionsChart');
    const ctxSub = document.getElementById('subjectTrendChart');

    let chartStart = new Date(window.PLAN_START_DATE.getTime());
    let chartEnd = new Date(window.PLAN_END_DATE.getTime());
    const todayObj = new Date();

    if (window.trendTimeFilter === '1Y') {
        chartEnd = new Date(chartStart);
        chartEnd.setFullYear(chartEnd.getFullYear() + 1);
        chartEnd.setMonth(chartEnd.getMonth() - 1);
    } else if (window.trendTimeFilter === '2Y') {
        chartEnd = new Date(chartStart);
        chartEnd.setFullYear(chartEnd.getFullYear() + 2);
        chartEnd.setMonth(chartEnd.getMonth() - 1);
    } else if (window.trendTimeFilter === '3Y') {
        chartEnd = new Date(chartStart);
        chartEnd.setFullYear(chartEnd.getFullYear() + 3);
        chartEnd.setMonth(chartEnd.getMonth() - 1);
    } else {
        chartStart = new Date(window.PLAN_START_DATE);
        chartStart.setMonth(0);
        chartStart.setDate(1);
        chartEnd = new Date(todayObj);
    }

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

    let progCum = {};
    window.customTracks.forEach(track => {
        (window.customPrograms[track.id] || []).forEach(p => {
            progCum[p] = Array(totalMonths).fill(0);
            if (window.chartVisibility.prog[p] === undefined) window.chartVisibility.prog[p] = true;
        });
    });

    let subData = {};
    window.customTracks.forEach(track => {
        (window.syllabusStructure[track.id] || []).forEach(s => {
            subData[s.subject] = Array(totalMonths).fill(0);
            if (window.chartVisibility.subjects[s.subject] === undefined) window.chartVisibility.subjects[s.subject] = true;
        });
    });

    // Dynamically build arrays for Daily Actions
    let actDaily = {}; let actCum = {};
    window.customActions.forEach(a => {
        actDaily[a.id] = Array(31).fill(0);
        actCum[a.id] = Array(totalMonths).fill(0);
        if (window.chartVisibility.monthly[a.id] === undefined) window.chartVisibility.monthly[a.id] = true;
        if (window.chartVisibility.yearly[a.id] === undefined) window.chartVisibility.yearly[a.id] = true;
    });

    const currentMonth = todayObj.getMonth(); const currentDay = todayObj.getDate();
    const todayMidx = (todayObj.getFullYear() - sYear) * 12 + (todayObj.getMonth() - sMonth);
    const daysInMonth = new Date(todayObj.getFullYear(), currentMonth + 1, 0).getDate();
    let latestActiveMonth = -1;

    window.tasks.forEach(t => {
        const taskDate = window.getTaskDate(t);
        const tYear = taskDate.getFullYear();
        const tMonth = taskDate.getMonth();
        const rawMidx = (tYear - sYear) * 12 + (tMonth - sMonth);

        if (rawMidx < totalMonths) {
            if (t.type === 'study') {
                let mIdxStudy = rawMidx < 0 ? 0 : rawMidx;
                Object.keys(t.trackTasks).forEach(trackId => {
                    t.trackTasks[trackId].forEach(item => {
                        if (item.completed) {
                            const sObj = (window.syllabusStructure[trackId] || []).find(s => s.subject === item.subject);
                            if (sObj && sObj.program && progCum[sObj.program]) progCum[sObj.program][mIdxStudy]++;
                            if (subData[item.subject]) subData[item.subject][mIdxStudy]++;
                            latestActiveMonth = Math.max(latestActiveMonth, mIdxStudy);
                        }
                    });
                });
            }
            if (rawMidx >= 0) {
                window.customActions.forEach(a => { if (t[a.id]) actCum[a.id][rawMidx]++; });
            }
        }
        if (tYear === todayObj.getFullYear() && tMonth === currentMonth) {
            const dIdx = taskDate.getDate() - 1;
            window.customActions.forEach(a => { if (t[a.id]) actDaily[a.id][dIdx] = 1; });
        }
    });

    let boundedToday = todayMidx >= totalMonths ? totalMonths - 1 : (todayMidx < 0 ? 0 : todayMidx);
    let boundedLatest = latestActiveMonth >= totalMonths ? totalMonths - 1 : latestActiveMonth;
    const cutoff = Math.max(boundedToday, boundedLatest, 0);

    // Program Trends
    Object.keys(progCum).forEach(p => {
        for (let i = 1; i <= cutoff; i++) progCum[p][i] += progCum[p][i - 1];
        let pTotal = 0;
        let pEffectiveTotal = 0;

        window.customTracks.forEach(track => {
            (window.syllabusStructure[track.id] || []).forEach(s => {
                if (s.program === p) {
                    pTotal += s.chapters;
                    if (window.lastSubjectStats && window.lastSubjectStats[s.subject]) {
                        pEffectiveTotal += window.lastSubjectStats[s.subject].effectiveChapters;
                    }
                }
            });
        });

        for (let i = 0; i <= cutoff; i++) progCum[p][i] = pTotal > 0 ? Math.round((progCum[p][i] / pTotal) * 100) : 0;

        // Sync the latest month with the absolutely accurate effective completion (which includes individually passed subjects and programs)
        if (pTotal > 0) {
            progCum[p][cutoff] = Math.max(progCum[p][cutoff], Math.round((pEffectiveTotal / pTotal) * 100));
        } else {
            progCum[p][cutoff] = 0;
        }

        window.latestChartStats.prog[p] = progCum[p][cutoff] || 0;
        for (let i = cutoff + 1; i < totalMonths; i++) progCum[p][i] = null;
    });

    // Action Cum Trends
    window.customActions.forEach(a => {
        for (let i = 0; i <= cutoff; i++) {
            let divisor;
            if (i === todayMidx) { divisor = currentDay; }
            else {
                const mDate = new Date(sYear, sMonth + i + 1, 0);
                divisor = mDate.getDate();
            }
            actCum[a.id][i] = Math.round((actCum[a.id][i] / divisor) * 100);
        }

        let runningTotal = 0;
        for (let i = 0; i < currentDay; i++) {
            runningTotal += actDaily[a.id][i];
            actDaily[a.id][i] = Math.round((runningTotal / (i + 1)) * 100);
        }

        for (let i = currentDay; i < daysInMonth; i++) actDaily[a.id][i] = null;

        window.latestChartStats.monthly[a.id] = actDaily[a.id][currentDay - 1] || 0;
        window.latestChartStats.yearly[a.id] = actCum[a.id][cutoff] || 0;
    });

    Object.keys(subData).forEach(k => {
        let sTotal = 1;
        let match = null;
        window.customTracks.forEach(t => {
            const m = (window.syllabusStructure[t.id] || []).find(s => s.subject === k);
            if (m) match = m;
        });
        if (match) sTotal = match.chapters;
        sTotal = Math.max(1, sTotal);
        for (let i = 1; i <= cutoff; i++) subData[k][i] += subData[k][i - 1];
        for (let i = 0; i <= cutoff; i++) subData[k][i] = Math.round((subData[k][i] / sTotal) * 100);

        // FIX: Sync Subject chart with "Frozen / Passed" status and True Effective Completion
        const progMatch = match ? match.program : null;

        if (window.lastSubjectStats && window.lastSubjectStats[k]) {
            const effPct = Math.round((window.lastSubjectStats[k].effectiveChapters / sTotal) * 100);
            subData[k][cutoff] = Math.max(subData[k][cutoff], effPct);
        }

        const isFrozen = window.passedItems && ((window.passedItems.subjects && window.passedItems.subjects.includes(k)) || (window.passedItems.programs && progMatch && window.passedItems.programs.includes(progMatch)));
        if (isFrozen) subData[k][cutoff] = 100;

        window.latestChartStats.subjects[k] = subData[k][cutoff] || 0;
        for (let i = cutoff + 1; i < totalMonths; i++) subData[k][i] = null;
    });

    Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';
    const chartOptions = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12, cornerRadius: 8, usePointStyle: true, boxPadding: 6, callbacks: { label: c => ' ' + c.dataset.label + ': ' + c.parsed.y + '%' } } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 9, weight: 'bold' }, callback: v => v + '%' }, grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false } }, x: { ticks: { font: { size: 9, weight: 'bold' } }, grid: { display: false, drawBorder: false } } } };

    if (ctx1) {
        let pDatasets = []; let dIdx = 0;
        Object.keys(progCum).forEach(p => {
            pDatasets.push({ label: p, data: progCum[p], borderColor: window.dynamicLineColors[dIdx % window.dynamicLineColors.length], backgroundColor: window.dynamicLineColors[dIdx % window.dynamicLineColors.length] + '25', tension: 0.4, borderWidth: 3, pointBackgroundColor: window.dynamicLineColors[dIdx % window.dynamicLineColors.length], pointRadius: 0, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff', fill: true, hidden: !window.chartVisibility.prog[p] }); dIdx++;
        });
        if (window.mainChartPrograms) {
            window.mainChartPrograms.data.labels = months;
            window.mainChartPrograms.data.datasets = pDatasets;
            window.mainChartPrograms.update('none'); // Update to avoid canvas reconstruction lag
        } else {
            window.mainChartPrograms = new Chart(ctx1, { type: 'line', data: { labels: months, datasets: pDatasets }, options: chartOptions });
        }
    }

    if (ctx2) {
        let mDatasets = window.customActions.map(a => ({
            label: a.title, data: actDaily[a.id], borderColor: window.twColors[a.color].hex, backgroundColor: window.twColors[a.color].hex + '25', tension: 0.4, borderWidth: 3, pointBackgroundColor: window.twColors[a.color].hex, pointRadius: 0, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff', fill: true, hidden: !window.chartVisibility.monthly[a.id]
        }));
        if (window.monthlyChartActions) {
            window.monthlyChartActions.data.labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            window.monthlyChartActions.data.datasets = mDatasets;
            window.monthlyChartActions.update('none');
        } else {
            window.monthlyChartActions = new Chart(ctx2, { type: 'line', data: { labels: Array.from({ length: daysInMonth }, (_, i) => i + 1), datasets: mDatasets }, options: chartOptions });
        }
    }

    const ctxYearly = document.getElementById('yearlyActionsChart');
    if (ctxYearly) {
        let yDatasets = window.customActions.map(a => ({
            label: a.title, data: actCum[a.id], borderColor: window.twColors[a.color].hex, backgroundColor: window.twColors[a.color].hex + '15', tension: 0.4, borderWidth: 3, pointBackgroundColor: window.twColors[a.color].hex, pointRadius: 3, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff', fill: true, hidden: !window.chartVisibility.yearly[a.id]
        }));
        if (window.yearlyChartActions) {
            window.yearlyChartActions.data.labels = months;
            window.yearlyChartActions.data.datasets = yDatasets;
            window.yearlyChartActions.update('none');
        } else {
            window.yearlyChartActions = new Chart(ctxYearly.getContext('2d'), { type: 'line', data: { labels: months, datasets: yDatasets }, options: chartOptions });
        }
    }

    if (ctxSub) {
        const subDatasets = Object.keys(subData).map(k => ({
            label: k, data: subData[k], borderColor: window.getSubjectColor(k), backgroundColor: 'transparent', tension: 0.4, borderWidth: 3, pointBackgroundColor: '#0f172a', pointBorderColor: window.getSubjectColor(k), pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointHoverBackgroundColor: window.getSubjectColor(k), pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, hidden: !window.chartVisibility.subjects[k], subjectKey: k
        }));
        if (window.subjectTrendChart) {
            window.subjectTrendChart.data.labels = months;
            window.subjectTrendChart.data.datasets = subDatasets;
            window.subjectTrendChart.update('none');
        } else {
            window.subjectTrendChart = new Chart(ctxSub.getContext('2d'), { type: 'line', data: { labels: months, datasets: subDatasets }, options: { ...chartOptions, interaction: { mode: 'nearest', axis: 'x', intersect: false } } });
        }
    }

    window.updateLegends();
    renderHeatmap();
}

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

window.toggleDataset = function (chartKey, dsKey) {
    window.chartVisibility[chartKey][dsKey] = !window.chartVisibility[chartKey][dsKey];
    const chart = chartKey === 'prog' ? window.mainChartPrograms : (chartKey === 'monthly' ? window.monthlyChartActions : window.yearlyChartActions);
    if (chart) {
        const searchVal = chartKey === 'prog' ? dsKey : window.customActions.find(a => a.id === dsKey)?.title;
        const ds = chart.data.datasets.find(d => d.label === searchVal);
        if (ds) ds.hidden = !window.chartVisibility[chartKey][dsKey];
        chart.update();
    }
    window.updateLegends();
};

window.toggleSubDataset = function (k) {
    window.chartVisibility.subjects[k] = !window.chartVisibility.subjects[k];
    if (window.subjectTrendChart) {
        const ds = window.subjectTrendChart.data.datasets.find(d => d.subjectKey === k);
        if (ds) { ds.hidden = !window.chartVisibility.subjects[k]; window.subjectTrendChart.update(); }
    }
    window.updateLegends();
};

window.toggleRevSubDataset = function (k) {
    window.chartVisibility.revSubjects[k] = !window.chartVisibility.revSubjects[k];
    if (window.revisionTrendChartInstance) {
        const ds = window.revisionTrendChartInstance.data.datasets.find(d => d.subjectKey === k);
        if (ds) { ds.hidden = !window.chartVisibility.revSubjects[k]; window.revisionTrendChartInstance.update(); }
    }
    window.updateRevisionLegends();
};

window.updateRevisionLegends = function () {
    const sLeg = document.getElementById('revision-trend-legend');
    if (sLeg) {
        sLeg.innerHTML = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []).map(s => {
            const k = s.subject;
            const val = window.latestChartStats.revSubjects ? window.latestChartStats.revSubjects[k] : 0;
            const active = window.chartVisibility.revSubjects[k];
            const color = window.getSubjectColor(k);
            const label = k.substring(0, 12) + (k.length > 12 ? '..' : '');
            const activeStyle = active ? `border-color: ${color}40; background-color: rgba(15,23,42,0.8); box-shadow: 0 0 10px ${color}20; opacity: 1;` : `border-color: rgba(255,255,255,0.1); background-color: transparent; opacity: 0.4; filter: grayscale(100%);`;
            return `<div onclick="window.toggleRevSubDataset('${k}')" class="cursor-pointer flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border active:scale-95 transition-all duration-300 hover:scale-105 backdrop-blur-sm" style="${activeStyle}"><div class="w-2 h-2 rounded-full shrink-0 shadow-md" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div><span class="text-[8px] md:text-[9px] font-black text-slate-200 uppercase whitespace-nowrap">${label}: ${val}%</span></div>`;
        }).join('');
    }
};

window.updateLegends = function () {
    const getLegend = (key, idxKey, color, label, valKey) => {
        const val = window.latestChartStats[key] ? window.latestChartStats[key][valKey] : 0;
        const active = window.chartVisibility[key][idxKey];
        return `<div onclick="window.toggleDataset('${key}', '${idxKey}')" class="cursor-pointer flex items-center space-x-1.5 md:space-x-2 px-2.5 md:px-3 py-1.5 md:px-3.5 md:py-2 bg-slate-900 rounded-lg md:rounded-xl border border-slate-700 hover:bg-slate-800 active:scale-95 transition-all ${active ? 'opacity-100 scale-100 shadow-md' : 'opacity-40 grayscale scale-95 line-through'}"><div class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div><span class="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">${label}: ${val}%</span></div>`;
    };
    const pLeg = document.getElementById('prog-legend');
    if (pLeg) {
        let pIdx = 0; pLeg.innerHTML = Object.keys(window.latestChartStats.prog).map(p => { const html = getLegend('prog', p, window.dynamicLineColors[pIdx % window.dynamicLineColors.length], p, p); pIdx++; return html; }).join('');
    }

    let actHtml = window.customActions.map(a => getLegend('monthly', a.id, window.twColors[a.color].hex, a.title, a.id)).join('');
    const aLeg = document.getElementById('act-legend'); if (aLeg) aLeg.innerHTML = actHtml;

    let yearHtml = window.customActions.map(a => getLegend('yearly', a.id, window.twColors[a.color].hex, a.title, a.id)).join('');
    const yLeg = document.getElementById('yearly-legend'); if (yLeg) yLeg.innerHTML = yearHtml;

    const sLeg = document.getElementById('subject-trend-legend');
    if (sLeg) {
        sLeg.innerHTML = window.customTracks.flatMap(t => window.syllabusStructure[t.id] || []).map(s => {
            const k = s.subject; const val = window.latestChartStats.subjects ? window.latestChartStats.subjects[k] : 0; const active = window.chartVisibility.subjects[k]; const color = window.getSubjectColor(k);
            const label = k.substring(0, 12) + (k.length > 12 ? '..' : '');
            const activeStyle = active ? `border-color: ${color}40; background-color: rgba(15,23,42,0.8); box-shadow: 0 0 10px ${color}20; opacity: 1;` : `border-color: rgba(255,255,255,0.1); background-color: transparent; opacity: 0.4; filter: grayscale(100%);`;
            return `<div onclick="window.toggleSubDataset('${k}')" class="cursor-pointer flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border active:scale-95 transition-all duration-300 hover:scale-105 backdrop-blur-sm" style="${activeStyle}"><div class="w-2 h-2 rounded-full shrink-0 shadow-md" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div><span class="text-[8px] md:text-[9px] font-black text-slate-200 uppercase whitespace-nowrap">${label}: ${val}%</span></div>`;
        }).join('');
    }
};

// Bind to window
window.renderChart = renderChart;
window.renderTrendCharts = renderTrendCharts;
window.renderHeatmap = renderHeatmap;

export { renderChart, renderTrendCharts, renderHeatmap };
