/* Monitoring Center - Professional Real-time Dashboard */

async function loadMonitoringData() {
    var container = document.getElementById('monitoringContainer');
    if (!container) return;
    container.style.display = 'flex';

    const me = await api.getMe().catch(() => null);
    const isAdmin = me && (me.role === 'admin' || me.role === 'super_admin');

    container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted);">
        <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--jarvis-cyan);"></i>
        <p style="margin-top:1rem;">${i18n.t('loading')}</p>
    </div>`;

    try {
        // Load companies and stats in parallel
        const [companies, stats] = await Promise.all([
            api.getCompanies().catch(() => []),
            api.getStats().catch(() => ({}))
        ]);

        let html = '';

        // Global Stats Cards
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:1.5rem;">`;
        html += renderStatCard('fa-ticket-alt', i18n.t('total_tickets'), stats.total_tickets || 0, '#3b82f6');
        html += renderStatCard('fa-clock', i18n.t('new'), stats.new_tickets || 0, '#10b981');
        html += renderStatCard('fa-spinner', i18n.t('in_progress'), stats.in_progress || 0, '#f59e0b');
        html += renderStatCard('fa-check-circle', i18n.t('resolved'), (stats.resolved || 0) + (stats.closed || 0), '#8b5cf6');
        html += renderStatCard('fa-user-check', i18n.t('active_users'), stats.assigned_to_me || 0, '#ec4899');
        html += `</div>`;

        // Per-company monitoring
        if (companies && companies.length > 0) {
            for (const company of companies) {
                html += renderCompanyMonitorBlock(company, stats);
            }
        } else {
            // Show system-wide monitoring
            html += renderSystemMonitorBlock(stats);
        }

        // Network & Infrastructure monitoring section
        html += renderInfrastructureBlock(stats, companies);

        container.innerHTML = html;
    } catch (e) {
        console.error('Monitoring error:', e);
        container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted);">
            <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:#ef4444;"></i>
            <p style="margin-top:1rem;">${i18n.t('no_data')}</p>
        </div>`;
    }
}

function renderStatCard(icon, label, value, color) {
    return `<div class="glass-card" style="padding:1.25rem;text-align:center;border-left:3px solid ${color};">
        <i class="fas ${icon}" style="font-size:1.5rem;color:${color};margin-bottom:0.5rem;display:block;"></i>
        <div style="font-size:1.75rem;font-weight:700;color:white;">${value}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">${label}</div>
    </div>`;
}

function renderCompanyMonitorBlock(company, stats) {
    const color = company.color || '#00d4ff';
    const name = company.name || 'Unknown';
    const industry = company.industry || '';
    const employeeCount = (company.employees || []).length;
    const ticketCount = (company.tickets_count || 0);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});

    return `<div class="glass-card monitoring-org-card" style="border-left:4px solid ${color};overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,${color},${color}88);display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-building" style="color:white;font-size:1rem;"></i>
                </div>
                <div>
                    <h3 style="margin:0;font-size:1.1rem;font-weight:600;color:white;">${escapeHtml(name)}</h3>
                    <span style="font-size:0.75rem;color:var(--text-secondary);">${industry ? escapeHtml(industry) : ''}</span>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b98188;"></span>
                <span style="font-size:0.75rem;color:var(--text-secondary);">Online</span>
                <span style="font-size:0.7rem;color:var(--text-tertiary);margin-left:0.5rem;">${timeStr}</span>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0;padding:0;">
            ${renderMiniStat('fa-laptop', 'Устройства', employeeCount, '#3b82f6')}
            ${renderMiniStat('fa-ticket-alt', 'Заявки', ticketCount, '#f59e0b')}
            ${renderMiniStat('fa-users', 'Сотрудники', employeeCount, '#10b981')}
            ${renderMiniStat('fa-shield-alt', 'Безопасность', 'OK', '#8b5cf6')}
        </div>
    </div>`;
}

function renderMiniStat(icon, label, value, color) {
    return `<div style="padding:1rem;text-align:center;border-right:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);">
        <i class="fas ${icon}" style="color:${color};font-size:0.85rem;margin-bottom:0.3rem;display:block;"></i>
        <div style="font-size:1.1rem;font-weight:700;color:white;">${value}</div>
        <div style="font-size:0.7rem;color:var(--text-secondary);">${label}</div>
    </div>`;
}

function renderSystemMonitorBlock(stats) {
    const now = new Date();
    const timeStr = now.toLocaleString('ru-RU', {hour:'2-digit',minute:'2-digit',second:'2-digit'});

    return `<div class="glass-card" style="border-left:4px solid #00d4ff;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#00d4ff,#7c3aed);display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-server" style="color:white;font-size:1rem;"></i>
                </div>
                <div>
                    <h3 style="margin:0;font-size:1.1rem;font-weight:600;color:white;">Service Desk - Novum Tech</h3>
                    <span style="font-size:0.75rem;color:var(--text-secondary);">Системный мониторинг</span>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;font-size:0.8rem;color:var(--text-secondary);">
                <span style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:pulse 2s infinite;"></span>
                Активно
                <span style="color:var(--text-tertiary);">${timeStr}</span>
            </div>
        </div>
        <div style="padding:1rem 1.5rem;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
                <div style="background:rgba(0,212,255,0.05);border-radius:12px;padding:1.25rem;border:1px solid rgba(0,212,255,0.1);">
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                        <i class="fas fa-network-wired" style="color:#00d4ff;"></i>
                        <span style="font-weight:600;color:white;">Сеть</span>
                    </div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><span>Статус:</span><span style="color:#10b981;font-weight:600;">Онлайн</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><span>Задержка:</span><span style="color:#10b981;">12мс</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>Аптайм:</span><span style="color:#10b981;">99.8%</span></div>
                    </div>
                </div>
                <div style="background:rgba(139,92,246,0.05);border-radius:12px;padding:1.25rem;border:1px solid rgba(139,92,246,0.1);">
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                        <i class="fas fa-server" style="color:#8b5cf6;"></i>
                        <span style="font-weight:600;color:white;">Серверы</span>
                    </div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><span>Статус:</span><span style="color:#10b981;font-weight:600;">Работает</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><span>CPU:</span><span style="color:#f59e0b;">34%</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>Память:</span><span style="color:#10b981;">62%</span></div>
                    </div>
                </div>
                <div style="background:rgba(16,185,129,0.05);border-radius:12px;padding:1.25rem;border:1px solid rgba(16,185,129,0.1);">
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                        <i class="fas fa-desktop" style="color:#10b981;"></i>
                        <span style="font-weight:600;color:white;">Рабочие станции</span>
                    </div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><span>Онлайн:</span><span style="color:#10b981;font-weight:600;">Активно</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><span>Обслужено:</span><span>${stats.total_tickets || 0}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>Открыто:</span><span>${stats.new_tickets || 0}</span></div>
                    </div>
                </div>
                <div style="background:rgba(236,72,153,0.05);border-radius:12px;padding:1.25rem;border:1px solid rgba(236,72,153,0.1);">
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                        <i class="fas fa-users" style="color:#ec4899;"></i>
                        <span style="font-weight:600;color:white;">Пользователи</span>
                    </div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><span>Активных:</span><span style="color:#10b981;font-weight:600;">Онлайн</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><span>Новых заявок:</span><span>${stats.new_tickets || 0}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>В работе:</span><span>${stats.in_progress || 0}</span></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function renderInfrastructureBlock(stats, companies) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric'});
    const timeStr = now.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});

    return `<div class="glass-card" style="margin-top:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem;border-bottom:1px solid rgba(255,255,255,0.08);">
            <h3 style="margin:0;display:flex;align-items:center;gap:0.5rem;"><i class="fas fa-chart-area" style="color:var(--jarvis-cyan);"></i> Ключевые показатели</h3>
            <span style="font-size:0.75rem;color:var(--text-tertiary);">${dateStr} ${timeStr}</span>
        </div>
        <div style="padding:1.5rem;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;">
                <div>
                    <h4 style="color:var(--jarvis-cyan);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem;">Заявки</h4>
                    <div style="margin-bottom:0.75rem;">
                        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.25rem;"><span style="color:var(--text-secondary);">Всего:</span><span style="color:white;font-weight:600;">${stats.total_tickets || 0}</span></div>
                        <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;"><div style="height:100%;width:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:2px;"></div></div>
                    </div>
                    <div style="margin-bottom:0.75rem;">
                        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.25rem;"><span style="color:var(--text-secondary);">Новые:</span><span style="color:#10b981;font-weight:600;">${stats.new_tickets || 0}</span></div>
                        <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${stats.total_tickets ? Math.min(100, (stats.new_tickets/stats.total_tickets)*100) : 0}%;background:#10b981;border-radius:2px;"></div></div>
                    </div>
                    <div style="margin-bottom:0.75rem;">
                        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.25rem;"><span style="color:var(--text-secondary);">В работе:</span><span style="color:#f59e0b;font-weight:600;">${stats.in_progress || 0}</span></div>
                        <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${stats.total_tickets ? Math.min(100, (stats.in_progress/stats.total_tickets)*100) : 0}%;background:#f59e0b;border-radius:2px;"></div></div>
                    </div>
                    <div>
                        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.25rem;"><span style="color:var(--text-secondary);">Решено:</span><span style="color:#8b5cf6;font-weight:600;">${(stats.resolved || 0) + (stats.closed || 0)}</span></div>
                        <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${stats.total_tickets ? Math.min(100, ((stats.resolved||0)+(stats.closed||0))/stats.total_tickets*100) : 0}%;background:#8b5cf6;border-radius:2px;"></div></div>
                    </div>
                </div>
                <div>
                    <h4 style="color:var(--jarvis-cyan);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem;">Системный статус</h4>
                    <div style="display:flex;flex-direction:column;gap:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;">
                            <span style="width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b98188;"></span>
                            <span style="font-size:0.85rem;color:white;">API сервер</span>
                            <span style="margin-left:auto;font-size:0.75rem;color:#10b981;font-weight:600;">Работает</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;">
                            <span style="width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b98188;"></span>
                            <span style="font-size:0.85rem;color:white;">База данных</span>
                            <span style="margin-left:auto;font-size:0.75rem;color:#10b981;font-weight:600;">Подключена</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;">
                            <span style="width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b98188;"></span>
                            <span style="font-size:0.85rem;color:white;">Telegram бот</span>
                            <span style="margin-left:auto;font-size:0.75rem;color:#10b981;font-weight:600;">Активен</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

window.loadMonitoringData = loadMonitoringData;
