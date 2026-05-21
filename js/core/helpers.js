function getSubjectColor(subjName) {
    if (window.subjectColors[subjName]) return window.subjectColors[subjName];
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
    let hash = 0;
    for (let i = 0; i < subjName.length; i++) hash = subjName.charCodeAt(i) + ((hash << 5) - hash);
    const color = colors[Math.abs(hash) % colors.length];
    window.subjectColors[subjName] = color;
    if (typeof window.saveTasks === 'function') {
        window.saveTasks(); // Persist the newly generated color
    }
    return color;
}

function safeSetText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function safeSetHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function safeSetClass(id, className) { const el = document.getElementById(id); if (el) el.className = className; }
function formatDate(dateObj) { return `${dateObj.toLocaleString('en-US', { month: 'short' })} ${dateObj.getDate()}`; }

function getTaskDate(task) {
    const baseDate = new Date(window.PLAN_START_DATE.getTime());
    baseDate.setDate(baseDate.getDate() + (task.id - 1));
    return baseDate;
}

function parseDateSafe(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
}

// Bind to window
window.getSubjectColor = getSubjectColor;
window.safeSetText = safeSetText;
window.safeSetHtml = safeSetHtml;
window.safeSetClass = safeSetClass;
window.formatDate = formatDate;
window.getTaskDate = getTaskDate;
window.parseDateSafe = parseDateSafe;

export { getSubjectColor, safeSetText, safeSetHtml, safeSetClass, formatDate, getTaskDate, parseDateSafe };
