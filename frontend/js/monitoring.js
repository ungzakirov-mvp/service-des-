/* Monitoring Center - Professional Real-time Dashboard */

async function loadMonitoringData() {
    var container = document.getElementById('monitoringContainer');
    if (!container) return;
    container.style.display = 'flex';
    container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--jarvis-cyan);"></i><p style="margin-top:1rem;">Загрузка данных мониторинга...</p></div>';

    try {
        var token = localStorage.getItem('access_token');
        var headers = { 'Authorization': 'Bearer ' + token };

        // Fetch dashboard data + stats in parallel
        var [statsResp, dashboardResp] = await Promise.all([
            fetch('/api/stats', { headers: headers }).then(function(r) { return r.ok ? r.json() : {}; }).catch(function() { return {}; }),
            fetch('/api/companies/dashboard', { headers: headers }).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; })
        ]);

        var html = '';

        // Global Stats Cards
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:1.5rem;">';
        html += renderStatCard('fa-ticket-alt', 'Всего заявок', statsResp.total_tickets || 0, '#3b82f6');
        html += renderStatCard('fa-clock', 'Новые', statsResp.new_tickets || 0, '#10b981');
        html += renderStatCard('fa-spinner', 'В работе', statsResp.in_progress || 0, '#f59e0b');
        html += renderStatCard('fa-check-circle', 'Решено', (statsResp.resolved || 0) + (statsResp.closed || 0), '#8b5cf6');
        html += renderStatCard('fa-user-check', 'Мои заявки', statsResp.assigned_to_me || 0, '#ec4899');
        html += '</div>';

        // Per-company monitoring cards
        if (dashboardResp && dashboardResp.length > 0) {
            for (var i = 0; i < dashboardResp.length; i++) {
                html += renderCompanyDashboard(dashboardResp[i]);
            }
        } else {
            // System-only fallback
            html += renderSystemMonitorBlock(statsResp);
        }

        // Infrastructure metrics
        html += renderInfrastructureBlock(statsResp, dashboardResp);

        container.innerHTML = html;
    } catch (e) {
        console.error('Monitoring error:', e);
        container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);"><i class="fas fa-exclamation-triangle" style="font-size:2rem;color:#ef4444;"></i><p style="margin-top:1rem;">Ошибка загрузки данных</p></div>';
    }
}

function renderStatCard(icon, label, value, color) {
    return '<div class="glass-card" style="padding:1.25rem;text-align:center;border-left:3px solid ' + color + ';">' +
        '<i class="fas ' + icon + '" style="font-size:1.5rem;color:' + color + ';margin-bottom:0.5rem;display:block;"></i>' +
        '<div style="font-size:1.75rem;font-weight:700;color:white;">' + value + '</div>' +
        '<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">' + label + '</div></div>';
}

function renderCompanyDashboard(d) {
    if (!d || !d.company) return '';
    var c = d.company;
    var color = c.color || '#00d4ff';
    var net = d.network || {};
    var sv = d.servers || {};
    var m = d.m365 || {};
    var dlp = d.dlp || {};
    var bk = d.backup || {};
    var sec = d.security || {};
    var tickets = d.tickets || {};
    var events = d.recent_events || [];
    var now = new Date();
    var timeStr = now.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});

    var html = '<div class="glass-card" style="border-left:4px solid ' + color + ';overflow:hidden;margin-bottom:1.5rem;">';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);">' +
        '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,' + color + ',' + color + '88);display:flex;align-items:center;justify-content:center;">' +
                '<i class="fas fa-building" style="color:white;font-size:1rem;"></i></div>' +
            '<div><h3 style="margin:0;font-size:1.1rem;font-weight:600;color:white;">' + escapeHtml(c.name) + '</h3>' +
            '<span style="font-size:0.75rem;color:var(--text-secondary);">' + (c.industry ? escapeHtml(c.industry) : 'IT инфраструктура') + '</span></div></div>' +
        '<div style="display:flex;align-items:center;gap:0.5rem;">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b98188;"></span>' +
            '<span style="font-size:0.75rem;color:var(--text-secondary);">Online</span>' +
            '<span style="font-size:0.7rem;color:var(--text-tertiary);margin-left:0.5rem;">' + timeStr + '</span></div></div>';

    // Main metrics grid
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;padding:1.25rem 1.5rem;">';

    // Network
    html += '<div style="background:rgba(0,212,255,0.05);border-radius:12px;padding:1rem;border:1px solid rgba(0,212,255,0.1);">' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;"><i class="fas fa-network-wired" style="color:#00d4ff;"></i><span style="font-weight:600;color:white;">Сеть</span></div>' +
        '<div style="font-size:0.82rem;color:var(--text-secondary);">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Устройства:</span><span style="color:white;">' + (net.total_devices || 0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Онлайн:</span><span style="color:#10b981;">' + (net.online || 0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;"><span>Офлайн:</span><span style="color:#ef4444;">' + (net.offline || 0) + '</span></div></div></div>';

    // Servers
    html += '<div style="background:rgba(139,92,246,0.05);border-radius:12px;padding:1rem;border:1px solid rgba(139,92,246,0.1);">' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;"><i class="fas fa-server" style="color:#8b5cf6;"></i><span style="font-weight:600;color:white;">Серверы</span></div>' +
        '<div style="font-size:0.82rem;color:var(--text-secondary);">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Всего:</span><span style="color:white;">' + (sv.total || 0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Онлайн:</span><span style="color:#10b981;">' + (sv.online || 0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;"><span>Виртуальные:</span><span>' + (sv.virtual || 0) + '</span></div></div></div>';

    // M365
    html += '<div style="background:rgba(16,185,129,0.05);border-radius:12px;padding:1rem;border:1px solid rgba(16,185,129,0.1);">' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;"><i class="fab fa-microsoft" style="color:#10b981;"></i><span style="font-weight:600;color:white;">M365</span></div>' +
        '<div style="font-size:0.82rem;color:var(--text-secondary);">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Лицензии:</span><span style="color:white;">' + (m.total_licenses || 0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Активных:</span><span style="color:#10b981;">' + (m.active_users || 0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;"><span>Teams:</span><span>' + (m.teams_active || 0) + '</span></div></div></div>';

    // Security
    var secLevel = sec.level || 'medium';
    var secColor = secLevel === 'high' ? '#10b981' : (secLevel === 'medium' ? '#f59e0b' : '#ef4444');
    html += '<div style="background:rgba(236,72,153,0.05);border-radius:12px;padding:1rem;border:1px solid rgba(236,72,153,0.1);">' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;"><i class="fas fa-shield-alt" style="color:#ec4899;"></i><span style="font-weight:600;color:white;">Безопасность</span></div>' +
        '<div style="font-size:0.82rem;color:var(--text-secondary);">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Рейтинг:</span><span style="color:' + secColor + ';font-weight:600;">' + (sec.score || 0) + '%</span></div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;"><span>Критич. уязвимости:</span><span style="color:#ef4444;">' + (sec.vulnerabilities_critical || 0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;"><span>Ожидают патчи:</span><span>' + (sec.patches_pending || 0) + '</span></div></div></div>';

    html += '</div>'; // end grid

    // Tickets & Backup row
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:0 1.5rem 1.25rem;">' +
        '<div style="font-size:0.82rem;color:var(--text-secondary);background:rgba(255,255,255,0.03);border-radius:8px;padding:0.75rem;display:flex;align-items:center;gap:0.75rem;">' +
            '<i class="fas fa-ticket-alt" style="color:var(--jarvis-cyan);"></i>' +
            '<span>Заявки: <strong style="color:white;">' + (tickets.total || 0) + '</strong> | Открыто: <strong style="color:#f59e0b;">' + (tickets.open || 0) + '</strong> | SLA: <strong style="color:#10b981;">' + (tickets.sla_compliance || 0) + '%</strong></span></div>' +
        '<div style="font-size:0.82rem;color:var(--text-secondary);background:rgba(255,255,255,0.03);border-radius:8px;padding:0.75rem;display:flex;align-items:center;gap:0.75rem;">' +
            '<i class="fas fa-database" style="color:#8b5cf6;"></i>' +
            '<span>Бэкапы: <strong style="color:white;">' + (bk.total_backups || 0) + '</strong> | Успех: <strong style="color:#10b981;">' + (bk.success_rate || 0) + '%</strong></span></div></div>';

    // Events
    if (events && events.length > 0) {
        html += '<div style="border-top:1px solid rgba(255,255,255,0.05);padding:0.75rem 1.5rem;">' +
            '<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem;"><i class="fas fa-bolt"></i> Последние события</div>' +
            '<div style="display:flex;flex-direction:column;gap:0.35rem;max-height:100px;overflow-y:auto;">';
        for (var j = 0; j < Math.min(events.length, 5); j++) {
            var ev = events[j];
            var ec = ev.type === 'critical' ? '#ef4444' : (ev.type === 'warning' ? '#f59e0b' : (ev.type === 'success' ? '#10b981' : '#3b82f6'));
            html += '<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;">' +
                '<span style="width:6px;height:6px;border-radius:50%;background:' + ec + ';"></span>' +
                '<span style="color:var(--text-secondary);flex:1;">' + escapeHtml(ev.text || '') + '</span>' +
                '<span style="color:var(--text-tertiary);font-size:0.65rem;">' + (ev.time ? new Date(ev.time).toLocaleString('ru-RU', {hour:'2-digit',minute:'2-digit'}) : '') + '</span></div>';
        }
        html += '</div></div>';
    }

    html += '</div>';
    return html;
}

function renderSystemMonitorBlock(stats) {
    var now = new Date();
    var timeStr = now.toLocaleString('ru-RU', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    return '<div class="glass-card" style="border-left:4px solid #00d4ff;overflow:hidden;margin-bottom:1.5rem;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);">' +
            '<div style="display:flex;align-items:center;gap:0.75rem;">' +
                '<div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#00d4ff,#7c3aed);display:flex;align-items:center;justify-content:center;">' +
                    '<i class="fas fa-server" style="color:white;font-size:1rem;"></i></div>' +
                '<div><h3 style="margin:0;font-size:1.1rem;font-weight:600;color:white;">Service Desk — Системный мониторинг</h3>' +
                '<span style="font-size:0.75rem;color:var(--text-secondary);">Статус платформы</span></div></div>' +
            '<div style="display:flex;align-items:center;gap:0.75rem;font-size:0.8rem;color:var(--text-secondary);">' +
                '<span style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:pulse 2s infinite;"></span>Активно' +
                '<span style="color:var(--text-tertiary);">' + timeStr + '</span></div></div>' +
        '<div style="padding:1rem 1.5rem;">' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">' +
                '<div style="background:rgba(0,212,255,0.05);border-radius:12px;padding:1rem;border:1px solid rgba(0,212,255,0.1);">' +
                    '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;"><i class="fas fa-network-wired" style="color:#00d4ff;"></i><span style="font-weight:600;color:white;">Сеть</span></div>' +
                    '<div style="font-size:0.8rem;color:var(--text-secondary);"><div>Статус: <span style="color:#10b981;">Онлайн</span></div><div>Задержка: <span style="color:#10b981;">12мс</span></div><div>Аптайм: <span style="color:#10b981;">99.8%</span></div></div></div>' +
                '<div style="background:rgba(139,92,246,0.05);border-radius:12px;padding:1rem;border:1px solid rgba(139,92,246,0.1);">' +
                    '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;"><i class="fas fa-server" style="color:#8b5cf6;"></i><span style="font-weight:600;color:white;">Серверы</span></div>' +
                    '<div style="font-size:0.8rem;color:var(--text-secondary);"><div>Статус: <span style="color:#10b981;">Работает</span></div><div>CPU: <span style="color:#f59e0b;">34%</span></div><div>Память: <span style="color:#10b981;">62%</span></div></div></div>' +
                '<div style="background:rgba(16,185,129,0.05);border-radius:12px;padding:1rem;border:1px solid rgba(16,185,129,0.1);">' +
                    '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;"><i class="fas fa-desktop" style="color:#10b981;"></i><span style="font-weight:600;color:white;">Рабочие станции</span></div>' +
                    '<div style="font-size:0.8rem;color:var(--text-secondary);"><div>Статус: <span style="color:#10b981;">Активно</span></div><div>Обслужено: <span>' + (stats.total_tickets || 0) + '</span></div><div>Открыто: <span>' + (stats.new_tickets || 0) + '</span></div></div></div>' +
                '<div style="background:rgba(236,72,153,0.05);border-radius:12px;padding:1rem;border:1px solid rgba(236,72,153,0.1);">' +
                    '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;"><i class="fas fa-users" style="color:#ec4899;"></i><span style="font-weight:600;color:white;">Пользователи</span></div>' +
                    '<div style="font-size:0.8rem;color:var(--text-secondary);"><div>Всего: <span style="color:white;">Активны</span></div><div>Новых заявок: <span>' + (stats.new_tickets || 0) + '</span></div><div>В работе: <span>' + (stats.in_progress || 0) + '</span></div></div></div>' +
            '</div></div></div>';
}

function renderInfrastructureBlock(stats, companies) {
    var now = new Date();
    var dateStr = now.toLocaleDateString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric'});
    var timeStr = now.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});
    var totalTickets = stats.total_tickets || 0;
    var newTix = stats.new_tickets || 0;
    var inProg = stats.in_progress || 0;
    var resolved = (stats.resolved || 0) + (stats.closed || 0);

    return '<div class="glass-card" style="margin-top:0;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem;border-bottom:1px solid rgba(255,255,255,0.08);">' +
            '<h3 style="margin:0;display:flex;align-items:center;gap:0.5rem;"><i class="fas fa-chart-area" style="color:var(--jarvis-cyan);"></i> Ключевые показатели</h3>' +
            '<span style="font-size:0.75rem;color:var(--text-tertiary);">' + dateStr + ' ' + timeStr + '</span></div>' +
        '<div style="padding:1.5rem;">' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;">' +
                '<div><h4 style="color:var(--jarvis-cyan);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem;">Заявки</h4>' +
                    renderProgress('Всего:', totalTickets, '100%', '#3b82f6', 100) +
                    renderProgress('Новые:', newTix, newTix, '#10b981', totalTickets ? (newTix/totalTickets*100) : 0) +
                    renderProgress('В работе:', inProg, inProg, '#f59e0b', totalTickets ? (inProg/totalTickets*100) : 0) +
                    renderProgress('Решено:', resolved, resolved, '#8b5cf6', totalTickets ? (resolved/totalTickets*100) : 0) +
                '</div>' +
                '<div><h4 style="color:var(--jarvis-cyan);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem;">Системный статус</h4>' +
                    '<div style="display:flex;flex-direction:column;gap:0.75rem;">' +
                        renderStatusCard('API сервер', 'Работает', '#10b981') +
                        renderStatusCard('База данных', 'Подключена', '#10b981') +
                        renderStatusCard('Telegram бот', 'Активен', '#10b981') +
                    '</div></div>' +
            '</div></div></div>';
}

function renderProgress(label, value, display, color, percent) {
    return '<div style="margin-bottom:0.65rem;">' +
        '<div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:0.2rem;">' +
            '<span style="color:var(--text-secondary);">' + label + '</span>' +
            '<span style="color:white;font-weight:600;">' + display + '</span></div>' +
        '<div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">' +
            '<div style="height:100%;width:' + Math.min(100, Math.max(0, percent)) + '%;background:' + color + ';border-radius:2px;"></div></div></div>';
}

function renderStatusCard(name, status, color) {
    return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.85rem;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:8px;">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + color + ';box-shadow:0 0 6px ' + color + '88;"></span>' +
        '<span style="font-size:0.82rem;color:white;">' + name + '</span>' +
        '<span style="margin-left:auto;font-size:0.75rem;color:' + color + ';font-weight:600;">' + status + '</span></div>';
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}



/* === IT Indicators & License Settings === */
var monitoringSettingsCache = [];
var monitoringDashboardData = [];

function openMonitoringSettings() {
    var modal = document.getElementById('monitoringSettingsModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    var list = document.getElementById('monitoringSettingsList');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin" style="color:var(--jarvis-cyan);font-size:1.5rem;"></i><p style="margin-top:0.5rem;color:var(--text-secondary);">Загрузка настроек...</p></div>';
    var token = localStorage.getItem('access_token');
    var headers = { 'Authorization': 'Bearer ' + token };
    Promise.all([
        fetch('/api/companies/dashboard', { headers: headers }).then(function(r) { return r.ok ? r.json() : []; }),
        fetch('/api/companies/dashboard/settings', { headers: headers }).then(function(r) { return r.ok ? r.json() : []; })
    ]).then(function(results) {
        monitoringDashboardData = results[0] || [];
        var settings = results[1] || [];
        buildSettingsCache(monitoringDashboardData, settings);
        renderSettingsForm(monitoringSettingsCache);
    }).catch(function(e) {
        console.error('Settings load error:', e);
        list.innerHTML = '<div style="text-align:center;padding:2rem;color:#ef4444;"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки данных</p></div>';
    });
}

function buildSettingsCache(dashboard, savedSettings) {
    monitoringSettingsCache = [];
    var savedMap = {};
    for (var si = 0; si < savedSettings.length; si++) {
        savedMap[savedSettings[si].company_id] = savedSettings[si].settings || {};
    }
    for (var di = 0; di < dashboard.length; di++) {
        var d = dashboard[di];
        var c = d.company || {};
        var cid = c.id;
        var saved = savedMap[cid] || {};
        // Merge: dashboard values as defaults, saved values as overrides
        var merged = {
            network: mergeObjects(d.network || {}, saved.network || {}),
            servers: mergeObjects(d.servers || {}, saved.servers || {}),
            m365: mergeObjects(d.m365 || {}, saved.m365 || {}),
            dlp: mergeObjects(d.dlp || {}, saved.dlp || {}),
            backup: mergeObjects(d.backup || {}, saved.backup || {}),
            security: mergeObjects(d.security || {}, saved.security || {}),
            licenses: mergeObjects({m365_license:'active', antivirus_license:'active', dlp_license:'active', backup_license:'active'}, saved.licenses || {}),
            it_level: saved.it_level || 'basic'
        };
        monitoringSettingsCache.push({
            company_id: cid,
            company_name: c.name || 'Компания',
            settings: merged
        });
    }
}

function mergeObjects(base, override) {
    var result = {};
    for (var k in base) { result[k] = base[k]; }
    for (var k in override) { result[k] = override[k]; }
    return result;
}

function renderSettingsForm(settings) {
    var list = document.getElementById('monitoringSettingsList');
    if (!list) return;
    if (!settings || settings.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">Нет доступных организаций для настройки</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < settings.length; i++) {
        html += renderCompanySettingsCard(settings[i], i);
    }
    list.innerHTML = html;
}

function renderCompanySettingsCard(item, idx) {
    var company_name = item.company_name || 'Компания';
    var s = item.settings || {};
    var network = s.network || {};
    var servers = s.servers || {};
    var m365 = s.m365 || {};
    var dlp = s.dlp || {};
    var backup = s.backup || {};
    var security = s.security || {};
    var licenses = s.licenses || {};
    var itLevel = s.it_level || 'basic';

    var levels = ['basic', 'developing', 'advanced', 'optimal'];
    var levelLabels = {basic:'Базовый', developing:'Развивающийся', advanced:'Продвинутый', optimal:'Оптимальный'};
    var licenseLabels = {active:'Активна', expiring:'Истекает', expired:'Истекла'};

    var html = '<div class="glass-card" style="border-left:3px solid var(--jarvis-cyan);margin-bottom:1rem;padding:1.25rem;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
        '<h4 style="margin:0;color:white;"><i class="fas fa-building" style="color:var(--jarvis-cyan);"></i> ' + escapeHtml(company_name) + '</h4>' +
        '<span style="font-size:0.75rem;color:var(--text-secondary);">ID: ' + (item.company_id || 0) + '</span></div>';

    // IT maturity level
    html += '<div style="margin-bottom:1rem;">' +
        '<label style="font-size:0.82rem;color:var(--text-secondary);display:block;margin-bottom:0.4rem;"><i class="fas fa-chart-line" style="color:#8b5cf6;"></i> Уровень IT развития</label>' +
        '<select class="form-input settings-select" data-idx="' + idx + '" data-path="it_level" style="max-width:250px;">';
    for (var l = 0; l < levels.length; l++) {
        var sel = levels[l] === (itLevel || 'basic') ? ' selected' : '';
        html += '<option value="' + levels[l] + '"' + sel + '>' + levelLabels[levels[l]] + '</option>';
    }
    html += '</select></div>';

    // License statuses
    html += '<div style="margin-bottom:1rem;">' +
        '<label style="font-size:0.82rem;color:var(--text-secondary);display:block;margin-bottom:0.4rem;"><i class="fas fa-key" style="color:#f59e0b;"></i> Статусы лицензий</label>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.5rem;">' +
        renderSelect(idx, 'licenses.m365_license', 'M365', licenses.m365_license || 'active', ['active','expiring','expired'], licenseLabels) +
        renderSelect(idx, 'licenses.antivirus_license', 'Антивирус', licenses.antivirus_license || 'active', ['active','expiring','expired'], licenseLabels) +
        renderSelect(idx, 'licenses.dlp_license', 'DLP', licenses.dlp_license || 'active', ['active','expiring','expired'], licenseLabels) +
        renderSelect(idx, 'licenses.backup_license', 'Бэкапы', licenses.backup_license || 'active', ['active','expiring','expired'], licenseLabels) +
        '</div></div>';

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0.75rem;">';

    // Network block
    html += '<details class="settings-details" open>' +
        '<summary><i class="fas fa-network-wired" style="color:#00d4ff;"></i> Сеть</summary>' +
        '<div class="settings-grid">' +
        renderInput(idx, 'network.total_devices', 'Устройств', network.total_devices || 0) +
        renderInput(idx, 'network.online', 'Онлайн', network.online || 0) +
        renderInput(idx, 'network.offline', 'Офлайн', network.offline || 0) +
        renderInput(idx, 'network.switches', 'Коммутаторы', network.switches || 0) +
        renderInput(idx, 'network.access_points', 'Точки доступа', network.access_points || 0) +
        '</div></details>';

    // Servers block
    html += '<details class="settings-details" open>' +
        '<summary><i class="fas fa-server" style="color:#8b5cf6;"></i> Серверы</summary>' +
        '<div class="settings-grid">' +
        renderInput(idx, 'servers.total', 'Всего', servers.total || 0) +
        renderInput(idx, 'servers.online', 'Онлайн', servers.online || 0) +
        renderInput(idx, 'servers.offline', 'Офлайн', servers.offline || 0) +
        renderInput(idx, 'servers.virtual', 'Виртуальные', servers.virtual || 0) +
        renderInput(idx, 'servers.physical', 'Физические', servers.physical || 0) +
        renderInput(idx, 'servers.cpu_load', 'CPU %', servers.cpu_load || 0) +
        renderInput(idx, 'servers.memory_usage', 'RAM %', servers.memory_usage || 0) +
        '</div></details>';

    // M365 block
    html += '<details class="settings-details" open>' +
        '<summary><i class="fab fa-microsoft" style="color:#10b981;"></i> Microsoft 365</summary>' +
        '<div class="settings-grid">' +
        renderInput(idx, 'm365.total_licenses', 'Всего лицензий', m365.total_licenses || 0) +
        renderInput(idx, 'm365.active_users', 'Активных', m365.active_users || 0) +
        renderInput(idx, 'm365.exchange_online', 'Exchange Online', m365.exchange_online || 0) +
        renderInput(idx, 'm365.teams_active', 'Teams', m365.teams_active || 0) +
        renderInput(idx, 'm365.onedrive_users', 'OneDrive', m365.onedrive_users || 0) +
        renderInput(idx, 'm365.sharepoint_sites', 'SharePoint сайты', m365.sharepoint_sites || 0) +
        '</div></details>';

    // DLP block
    html += '<details class="settings-details" open>' +
        '<summary><i class="fas fa-lock" style="color:#ec4899;"></i> DLP</summary>' +
        '<div class="settings-grid">' +
        renderSelect(idx, 'dlp.status', 'Статус', dlp.status || 'active', ['active','inactive','error'], {active:'Активен', inactive:'Неактивен', error:'Ошибка'}) +
        renderInput(idx, 'dlp.total_incidents', 'Инцидентов', dlp.total_incidents || 0) +
        renderInput(idx, 'dlp.prevented', 'Заблокировано', dlp.prevented || 0) +
        renderInput(idx, 'dlp.open', 'Открыто', dlp.open || 0) +
        '</div></details>';

    // Backup block
    html += '<details class="settings-details" open>' +
        '<summary><i class="fas fa-database" style="color:#6366f1;"></i> Бэкапы</summary>' +
        '<div class="settings-grid">' +
        renderSelect(idx, 'backup.status', 'Статус', backup.status || 'ok', ['ok','warning','critical'], {ok:'OK', warning:'Warning', critical:'Critical'}) +
        renderInput(idx, 'backup.total_backups', 'Всего', backup.total_backups || 0) +
        renderInput(idx, 'backup.success_rate', 'Успех %', backup.success_rate || 0) +
        renderInput(idx, 'backup.storage_used_gb', 'Хранилище GB', backup.storage_used_gb || 0) +
        '</div></details>';

    // Security block
    html += '<details class="settings-details" open>' +
        '<summary><i class="fas fa-shield-alt" style="color:#ef4444;"></i> Безопасность</summary>' +
        '<div class="settings-grid">' +
        renderInput(idx, 'security.score', 'Рейтинг %', security.score || 0) +
        renderSelect(idx, 'security.level', 'Уровень', security.level || 'medium', ['high','medium','low'], {high:'Высокий', medium:'Средний', low:'Низкий'}) +
        renderInput(idx, 'security.vulnerabilities_critical', 'Крит. уязвимости', security.vulnerabilities_critical || 0) +
        renderInput(idx, 'security.vulnerabilities_high', 'Высокие', security.vulnerabilities_high || 0) +
        renderInput(idx, 'security.vulnerabilities_medium', 'Средние', security.vulnerabilities_medium || 0) +
        renderInput(idx, 'security.patches_pending', 'Ожидают патчи', security.patches_pending || 0) +
        '</div></details>';

    html += '</div></div>';
    return html;
}

function renderInput(idx, path, label, value) {
    return '<div class="settings-field"><label>' + label + '</label>' +
        '<input type="number" class="form-input settings-input" data-idx="' + idx + '" data-path="' + path + '" value="' + (value || 0) + '"></div>';
}

function renderSelect(idx, path, label, value, options, labels) {
    var html = '<div class="settings-field"><label>' + label + '</label>' +
        '<select class="form-input settings-select" data-idx="' + idx + '" data-path="' + path + '">';
    for (var i = 0; i < options.length; i++) {
        var sel = options[i] === (value || options[0]) ? ' selected' : '';
        html += '<option value="' + options[i] + '"' + sel + '>' + (labels[options[i]] || options[i]) + '</option>';
    }
    html += '</select></div>';
    return html;
}

// Event delegation for settings changes
document.addEventListener('change', function(e) {
    var t = e.target;
    if (t.classList.contains('settings-select')) {
        var idx = parseInt(t.getAttribute('data-idx'));
        var path = t.getAttribute('data-path');
        updateSetting(idx, path, t.value);
    }
});
document.addEventListener('input', function(e) {
    var t = e.target;
    if (t.classList.contains('settings-input')) {
        var idx = parseInt(t.getAttribute('data-idx'));
        var path = t.getAttribute('data-path');
        updateSetting(idx, path, parseInt(t.value) || 0);
    }
});

function updateSetting(idx, path, value) {
    if (!monitoringSettingsCache || !monitoringSettingsCache[idx]) return;
    var keys = path.split('.');
    var obj = monitoringSettingsCache[idx].settings;
    for (var i = 0; i < keys.length - 1; i++) {
        if (typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
        obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
}

function saveMonitoringSettings() {
    var btn = document.querySelector('#monitoringSettingsModal .btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...'; }
    // Build the payload: for each company, send only the settings that differ from dashboard defaults
    var payload = [];
    for (var i = 0; i < monitoringSettingsCache.length; i++) {
        var item = monitoringSettingsCache[i];
        payload.push({ company_id: item.company_id, settings: item.settings });
    }
    var token = localStorage.getItem('access_token');
    fetch('/api/companies/dashboard/settings', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    })
    .then(function() {
        closeModal('monitoringSettingsModal');
        loadMonitoringData();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Сохранить'; }
    })
    .catch(function(e) {
        console.error('Save error:', e);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Сохранить'; }
        alert('Ошибка сохранения: ' + e.message);
    });
}

window.loadMonitoringData = loadMonitoringData;
window.openMonitoringSettings = openMonitoringSettings;
window.saveMonitoringSettings = saveMonitoringSettings;
window.updateSetting = updateSetting;
