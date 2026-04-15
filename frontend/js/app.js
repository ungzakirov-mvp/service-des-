// Service Desk Premium Frontend Application

let currentUser = null;
let activeView = 'dashboard';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkAuth();
    if (window.i18n) i18n.init();
    initWebSocket();
    loadNotifications();
});

let volumeChart = null;
let statusChart = null;

function initializeApp() {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    if (token) {
        showDashboard();
        // loadDashboardData() вызывается внутри showView('dashboard')
    } else {
        showPage('loginPage');
    }
}

function setupEventListeners() {
    // Auth
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('registerPage');
    });
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('loginPage');
    });
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.side-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            showView(page);

            // Update active state
            document.querySelectorAll('.side-link').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // Tickets
    document.getElementById('createTicketForm').addEventListener('submit', handleCreateTicket);
    document.getElementById('statusFilter').addEventListener('change', loadTickets);
    document.getElementById('priorityFilter').addEventListener('change', loadTickets);

    // Users & Companies
    if (document.getElementById('createUserForm')) document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
    if (document.getElementById('createCompanyForm')) document.getElementById('createCompanyForm').addEventListener('submit', handleCreateCompany);
    if (document.getElementById('editCompanyForm')) document.getElementById('editCompanyForm').addEventListener('submit', handleEditCompany);
    if (document.getElementById('editUserForm')) document.getElementById('editUserForm').addEventListener('submit', handleEditUser);
    if (document.getElementById('subForm')) document.getElementById('subForm').addEventListener('submit', handleSubForm);
    if (document.getElementById('empForm')) document.getElementById('empForm').addEventListener('submit', handleEmpForm);
    if (document.getElementById('assignForm')) document.getElementById('assignForm').addEventListener('submit', handleAssignTicket);
    
    // Initialize new ticket creator
    initTicketCreator();

    // Rating
    if (document.getElementById('ratingForm')) document.getElementById('ratingForm').addEventListener('submit', handleRatingSubmit);

    // Star Rating Interactivity
    const stars = document.querySelectorAll('#starRating .fa-star');
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const value = e.target.dataset.value;
            document.getElementById('ratingValue').value = value;
            updateStarRating(value);
        });
        star.addEventListener('mouseover', (e) => {
            updateStarRating(e.target.dataset.value, true);
        });
        star.addEventListener('mouseout', () => {
            const currentVal = document.getElementById('ratingValue').value;
            updateStarRating(currentVal || 0);
        });
    });

    // Dashboard Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const status = e.target.dataset.status;
            filterRecentTickets(status);
        });
    });

    // Refresh Dashboard
    document.getElementById('refreshDashboardBtn').addEventListener('click', () => {
        loadDashboardData();
        showToast('Данные обновлены', 'success');
    });

    // Command Center shortcut (Ctrl+K)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openCommandCenter();
        }
        if (e.key === 'Escape') {
            closeModals();
        }
    });
}

function openCommandCenter() {
    const modal = document.getElementById('commandCenter');
    modal.classList.remove('hidden');
    document.getElementById('commandInput').focus();
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    if (window.slaInterval) clearInterval(window.slaInterval);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        if (id === 'ticketModal' && window.slaInterval) {
            clearInterval(window.slaInterval);
        }
    }
}

function toggleSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
}

function checkAuth() {
    const token = localStorage.getItem('access_token');
    return !!token;
}

// Auth Handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await api.login(email, password);
        showToast('Вход выполнен успешно!', 'success');
        showDashboard();
        // loadDashboardData() вызывается внутри showView
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('regName').value;

    try {
        await api.register(email, password, fullName);
        showToast('Регистрация успешна!', 'success');
        showDashboard();
        // loadDashboardData() вызывается внутри showView
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function handleLogout() {
    api.clearToken();
    currentUser = null;
    showPage('loginPage');
    showToast('Вы вышли из системы', 'success');
}

// Dashboard
async function showDashboard() {
    showPage('dashboardPage');
    showView('dashboard');

    // Update user info in sidebar
    try {
        if (!currentUser) {
            currentUser = await api.getMe();
        }
        window._currentUser = currentUser;

        // Update elements if they exist
        const emailEl = document.getElementById('userEmail');
        const roleEl = document.getElementById('userRoleBadge');
        const charEl = document.getElementById('userAvatarChar');

        if (emailEl) emailEl.textContent = currentUser.email;
        if (roleEl) roleEl.textContent = currentUser.role.toUpperCase();
        if (charEl) charEl.textContent = (currentUser.full_name || currentUser.email).charAt(0).toUpperCase();

        // Role-based visibility
        const role = currentUser.role;
        const auditLink = document.getElementById('auditNavLink');
        const crmLink = document.querySelector('[data-page="crm"]');
        const usersLink = document.getElementById('usersNavLink');

        if (auditLink) auditLink.style.display = (role === 'manager' || role === 'admin') ? 'flex' : 'none';
        if (crmLink) crmLink.style.display = (role !== 'client') ? 'flex' : 'none';

        if (usersLink) {
            if (role === 'admin' || role === 'super_admin') {
                usersLink.classList.remove('hidden');
                usersLink.style.display = 'flex';
            } else {
                usersLink.classList.add('hidden');
                usersLink.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Failed to load current user:', error);
    }
}

let _dashboardLoading = false;
let _ticketsLoading = false;
let _dashboardLoaded = false;

async function loadDashboardData() {
    if (_dashboardLoading) return;
    _dashboardLoading = true;
    try {
        const stats = await api.getStats();
        const analytics = await api.getAnalytics();

        const totalTicketsEl = document.getElementById('totalTickets');
        const activeUsersEl = document.getElementById('activeUsers');
        const slaComplianceEl = document.getElementById('slaCompliance');
        const avgResolutionTimeEl = document.getElementById('avgResolutionTime');
        const lastUpdateTimeEl = document.getElementById('lastUpdateTime');
        
        if (totalTicketsEl) totalTicketsEl.textContent = analytics.total_tickets || 0;
        if (activeUsersEl) activeUsersEl.textContent = analytics.active_users || 0;

        const totalSla = analytics.agent_performance.reduce((acc, curr) => acc + curr.sla_compliance_rate, 0);
        const avgSla = analytics.agent_performance.length > 0 ? (totalSla / analytics.agent_performance.length).toFixed(1) : "100";
        if (slaComplianceEl) slaComplianceEl.textContent = `${avgSla}%`;

        const totalHours = analytics.agent_performance.reduce((acc, curr) => acc + (curr.avg_resolution_hours || 0), 0);
        const avgHours = analytics.agent_performance.length > 0 ? (totalHours / analytics.agent_performance.length).toFixed(1) : "0";
        if (avgResolutionTimeEl) avgResolutionTimeEl.textContent = `${avgHours}ч`;

        if (lastUpdateTimeEl) lastUpdateTimeEl.textContent = `Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;

        renderVolumeChart(analytics.volume_trends);
        renderStatusChart(analytics.status_distribution);
        renderAgentRatings(analytics.agent_performance);
        renderRequesterRatings(analytics.requester_performance);
        renderDeadlines(analytics.upcoming_deadlines);

        // Load tickets only ONCE on first load
        if (!_dashboardLoaded) {
            window.allRecentTickets = await api.getTickets({ limit: 10 });
            filterRecentTickets('all');
            _dashboardLoaded = true;
        }

    } catch (error) {
        console.error('Dashboard error:', error);
    } finally {
        _dashboardLoading = false;
    }
}

function renderVolumeChart(trends) {
    const ctx = document.getElementById('volumeChart').getContext('2d');

    if (volumeChart) volumeChart.destroy();

    volumeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trends.map(t => t.date),
            datasets: [{
                label: 'Количество заявок',
                data: trends.map(t => t.count),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                    ticks: { color: '#71717a', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#71717a', font: { size: 10 } }
                }
            }
        }
    });
}

function renderStatusChart(dist) {
    const ctx = document.getElementById('statusChart').getContext('2d');

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dist.map(d => d.status_name),
            datasets: [{
                data: dist.map(d => d.count),
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#71717a'],
                borderWidth: 2,
                borderColor: '#18181b',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: 'white', padding: 20 } }
            },
            cutout: '70%'
        }
    });
}

function renderAgentRatings(agents) {
    const container = document.getElementById('agentRatingList');
    if (!agents.length) {
        container.innerHTML = '<div class="loading">Нет исполнителей</div>';
        return;
    }

    container.innerHTML = agents
        .sort((a, b) => b.resolved_count - a.resolved_count)
        .slice(0, 5)
        .map((agent, index) => `
        <div class="rating-item">
            <div class="rating-rank">${index + 1}</div>
            <div class="rating-info">
                <span class="rating-name">${escapeHtml(agent.full_name || 'Неизвестно')}</span>
                <span class="rating-val">${agent.resolved_count} решено • ${agent.sla_compliance_rate}% SLA</span>
            </div>
        </div>
    `).join('');
}

function renderRequesterRatings(requesters) {
    const container = document.getElementById('requesterRatingList');
    if (!requesters.length) {
        container.innerHTML = '<div class="loading">Нет заказчиков</div>';
        return;
    }

    container.innerHTML = requesters
        .map((req, index) => `
        <div class="rating-item">
            <div class="rating-rank">${index + 1}</div>
            <div class="rating-info">
                <span class="rating-name">${escapeHtml(req.full_name || 'Неизвестно')}</span>
                <span class="rating-val">${req.ticket_count} заявок</span>
            </div>
        </div>
    `).join('');
}

function renderDeadlines(deadlines) {
    const container = document.getElementById('deadlineList');
    if (!deadlines.length) {
        container.innerHTML = '<div class="loading">Дедлайнов нет</div>';
        return;
    }

    container.innerHTML = deadlines.map(d => {
        const dueDate = new Date(d.due_at);
        const now = new Date();
        const diffHours = (dueDate - now) / (1000 * 60 * 60);
        const urgency = diffHours < 4 ? 'urgent' : (diffHours < 24 ? 'warning' : '');

        return `
            <div class="deadline-item ${urgency}">
                <div class="deadline-date">
                    <span class="dd-day">${dueDate.getDate()}</span>
                    <span class="dd-month">${dueDate.toLocaleString('ru', { month: 'short' })}</span>
                </div>
                <div class="deadline-content">
                    <h4>${escapeHtml(d.title)}</h4>
                    <p>${d.status_name} • ${d.priority}</p>
                </div>
            </div>
        `;
    }).join('');
}

function filterRecentTickets(status) {
    const tickets = window.allRecentTickets || [];
    const filtered = status === 'all'
        ? tickets
        : tickets.filter(t => t.status.toLowerCase() === status.toLowerCase());

    renderRecentTickets(filtered);
}

function renderRecentTickets(tickets) {
    const container = document.getElementById('recentTicketsList');
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 2rem; text-align: center;">Тикетов не найдено</p>';
        return;
    }

    // Не перерисовывать если данные не изменились
    const newHtml = `
        <div class="ticket-list-header glass-card" style="display: grid; grid-template-columns: 80px 1fr 120px 120px 140px; padding: 0.5rem 1.25rem; font-size: 0.75rem; color: var(--text-low); border-bottom: 2px solid var(--prism-border); border-radius: 0;">
            <span>ID</span>
            <span>TITLE</span>
            <span>STATUS</span>
            <span>PRIORITY</span>
            <span>UPDATED</span>
        </div>
        ${tickets.map(ticket => `
            <div class="ticket-card" onclick="openTicketModal(${ticket.id})">
                <span class="ticket-id-tag">#${ticket.readable_id || ticket.id}</span>
                <span class="ticket-title">${escapeHtml(ticket.title)}${ticket.rating ? ` <span class="text-warning text-xs" title="Оценка: ${ticket.rating}/5" style="margin-left: 0.5rem;"><i class="fas fa-star"></i> ${ticket.rating}</span>` : ''}</span>
                <span class="badge badge-${getStatusClass(ticket.status_rel?.name || 'новый')}">${ticket.status_rel?.name || 'новый'}</span>
                <span class="badge badge-${getPriorityClass(ticket.priority)}">${ticket.priority}</span>
                <span style="color: var(--text-low); font-size: 0.75rem;">${formatDate(ticket.created_at)}</span>
            </div>
        `).join('')}
    `;
    
    if (container._lastHtml === newHtml) return;
    container._lastHtml = newHtml;
    container.innerHTML = newHtml;
}

// Tickets View
async function loadTickets() {
    if (_ticketsLoading) return;
    _ticketsLoading = true;
    const status = document.getElementById('statusFilter').value;
    const priority = document.getElementById('priorityFilter').value;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    try {
        const tickets = await api.getTickets(filters);
        renderTickets(tickets);
    } catch (error) {
        showToast('Ошибка загрузки тикетов', 'error');
    } finally {
        _ticketsLoading = false;
    }
}

function renderTickets(tickets) {
    const container = document.getElementById('ticketsList');
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary)">Тикеты не найдены</p>';
        return;
    }

    const slaColor = (ticket) => {
        if (!ticket.sla_due_at) return '';
        const diff = new Date(ticket.sla_due_at) - new Date();
        if (diff < 0) return 'sla-overdue';
        if (diff < 2*3600000) return 'sla-urgent';
        if (diff < 24*3600000) return 'sla-warning';
        return '';
    };

    const statusBg = (name) => {
        const n = (name || '').toLowerCase();
        if (n.includes('новый') || n.includes('new') || n.includes('открыт')) return '#3b82f6';
        if (n.includes('работ') || n.includes('progress') || n.includes('ожидан')) return '#f59e0b';
        if (n.includes('решён') || n.includes('resolved')) return '#10b981';
        if (n.includes('закрыт') || n.includes('closed')) return '#6b7280';
        return '#8b5cf6';
    };

    const fmtSla = (d) => {
        if (!d) return '';
        const diff = new Date(d) - new Date();
        if (diff < 0) return 'Просрочено';
        const h = Math.floor(diff/3600000);
        const m = Math.floor((diff%3600000)/60000);
        if (h > 24) return `${Math.floor(h/24)}д ${h%24}ч`;
        if (h > 0) return `${h}ч ${m}м`;
        return `${m} мин`;
    };

    const newHtml = `
        <div class="ticket-list-header glass-card" style="display: grid; grid-template-columns: 60px 1fr 100px 90px 100px 70px 80px; padding: 0.5rem 1rem; font-size: 0.7rem; color: var(--text-low); border-bottom: 2px solid var(--prism-border); border-radius: 0;">
            <span>ID</span><span>ТИТУЛ</span><span>СТАТУС</span><span>ПРИОРИТЕТ</span><span>SLA</span><span>ИСПОЛНИТЕЛЬ</span><span>ДЕЙСТВИЯ</span>
        </div>
        ${tickets.map(t => {
            const sc = slaColor(t);
            const sl = fmtSla(t.sla_due_at);
            const sBg = statusBg(t.status_rel?.name);
            const assigned = t.assignee ? (t.assignee.full_name || t.assignee.email.split('@')[0]) : '—';
            return `<div class="ticket-card ${sc}" onclick="openTicketModal(${t.id})" style="display:grid;grid-template-columns:60px 1fr 100px 90px 100px 70px 80px;align-items:center;gap:4px;cursor:pointer;padding:0.75rem 1rem;border-bottom:1px solid var(--prism-border);">
                <span class="ticket-id-tag">#${t.readable_id||t.id}</span>
                <span class="ticket-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.title)}${t.scheduled_at ? '<span style="font-size:0.65rem;color:var(--text-low);margin-left:6px;">📋 '+new Date(t.scheduled_at).toLocaleDateString('ru')+'</span>' : ''}</span>
                <span class="badge" style="background:${sBg}22;color:${sBg};border:1px solid ${sBg}44;font-size:0.7rem;">${t.status_rel?.name||'?'}</span>
                <span class="badge badge-${getPriorityClass(t.priority)}" style="font-size:0.7rem;">${t.priority}</span>
                <span style="font-size:0.7rem;color:${sc==='sla-overdue'?'#ef4444':sc==='sla-urgent'?'#f59e0b':'var(--text-low)'};">${sl}</span>
                <span style="font-size:0.7rem;color:var(--text-med);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(assigned)}</span>
                <span style="display:flex;gap:4px;" onclick="event.stopPropagation();">
                    ${!t.accepted_at && window._currentUser?.role !== 'client' ? `<button onclick="acceptTicket(${t.id})" title="Принять" style="background:#3b82f622;color:#3b82f6;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;">✓</button>` : ''}
                    ${!t.status_rel?.is_final && window._currentUser?.role !== 'client' ? `<button onclick="closeTicketAction(${t.id})" title="Закрыть" style="background:#10b98122;color:#10b981;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;">✕</button>` : ''}
                    ${window._currentUser?.role === 'admin' || window._currentUser?.role === 'super_admin' ? `<button onclick="showAssignModal(${t.id})" title="Назначить" style="background:#8b5cf622;color:#8b5cf6;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.7rem;">↻</button>` : ''}
                    ${t.rating ? `<span style="color:#f59e0b;font-size:0.7rem;">★${t.rating}</span>` : ''}
                </span>
            </div>`;
        }).join('')}
    `;
    
    // Не перерисовывать если HTML не изменился
    if (container._lastHtml === newHtml) return;
    container._lastHtml = newHtml;
    container.innerHTML = newHtml;
}

async function acceptTicket(ticketId) {
    try {
        await api.acceptTicket(ticketId);
        showToast('Тикет принят', 'success');
        loadTickets();
    } catch (e) { showToast(e.message || 'Ошибка', 'error'); }
}

async function closeTicketAction(ticketId) {
    if (!confirm('Закрыть тикет?')) return;
    try {
        await api.closeTicket(ticketId);
        showToast('Тикет закрыт', 'success');
        loadTickets();
    } catch (e) { showToast(e.message || 'Ошибка', 'error'); }
}

async function showAssignModal(ticketId) {
    window._assignTicketId = ticketId;
    const sel = document.getElementById('assignAgentSelect');
    sel.innerHTML = '<option value="">Загрузка агентов...</option>';
    document.getElementById('assignModal').classList.remove('hidden');
    try {
        const users = await api.getUsers();
        const agents = users.filter(u => u.role === 'agent' || u.role === 'admin' || u.role === 'super_admin');
        sel.innerHTML = '<option value="">Выберите исполнителя</option>';
        agents.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = (a.full_name || a.email) + ' (' + getRoleLabel(a.role) + ')';
            sel.appendChild(opt);
        });
        if (agents.length === 0) {
            sel.innerHTML = '<option value="">Нет агентов</option>';
        }
    } catch (e) {
        sel.innerHTML = '<option value="">Ошибка загрузки</option>';
        showToast('Не удалось загрузить агентов', 'error');
    }
}

async function handleAssignTicket(e) {
    e.preventDefault();
    const agentId = document.getElementById('assignAgentSelect').value;
    if (!agentId) { showToast('Выберите исполнителя', 'error'); return; }
    try {
        await api.assignTicket(window._assignTicketId, parseInt(agentId));
        showToast('Исполнитель назначен', 'success');
        closeModal('assignModal');
        loadTickets();
    } catch (e) { showToast(e.message || 'Ошибка', 'error'); }
}

// Create Ticket
async function handleCreateTicket(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('.btn-creator-submit') || e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Создание...';
    }

    const title = document.getElementById('ticketTitle').value;
    const description = document.getElementById('ticketDescription').value;
    const priority = document.querySelector('input[name="priority"]:checked')?.value || 'medium';
    const scheduledAt = document.getElementById('ticketScheduledAt')?.value;
    const assignee = document.getElementById('ticketAssignee')?.value;

    const data = { title, description, priority };
    if (scheduledAt) data.scheduled_at = new Date(scheduledAt).toISOString();
    if (assignee) data.assigned_to = parseInt(assignee);

    try {
        await api.createTicket(data);
        showToast('Заявка успешно создана!', 'success');
        e.target.reset();
        resetPriorityCards();
        showView('tickets');
        loadTickets();
        document.querySelectorAll('.side-link').forEach(l => l.classList.remove('active'));
        document.querySelector('[data-page="tickets"]').classList.add('active');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = '<span class="btn-content"><i class="fas fa-paper-plane"></i><span>Создать заявку</span></span><div class="btn-ripple"></div>';
        }
    }
}

// Initialize Ticket Creator Form
function initTicketCreator() {
    // Priority cards selection
    const priorityCards = document.querySelectorAll('.priority-card');
    priorityCards.forEach(card => {
        card.addEventListener('click', () => {
            priorityCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // File drop zone
    const dropZone = document.getElementById('fileDropZone');
    const fileInput = document.getElementById('ticketFiles');
    
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            handleFiles(files);
        });
        
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }

    // Submit button ripple effect
    const submitBtn = document.querySelector('.btn-creator-submit');
    if (submitBtn) {
        submitBtn.addEventListener('mousemove', (e) => {
            const rect = submitBtn.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            submitBtn.style.setProperty('--x', `${x}%`);
            submitBtn.style.setProperty('--y', `${y}%`);
        });
    }

    // Load agents for assignee select
    loadAgentsForSelect();
}

function resetPriorityCards() {
    const cards = document.querySelectorAll('.priority-card');
    cards.forEach(c => c.classList.remove('active'));
    const defaultCard = document.querySelector('.priority-card[data-priority="medium"]');
    if (defaultCard) {
        defaultCard.classList.add('active');
        const radio = defaultCard.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
}

function handleFiles(files) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="fas fa-file"></i>
            <span>${file.name}</span>
            <small>(${(file.size / 1024).toFixed(1)} KB)</small>
        `;
        fileList.appendChild(fileItem);
    });
}

async function loadAgentsForSelect() {
    const select = document.getElementById('ticketAssignee');
    if (!select) return;
    
    try {
        const users = await api.getUsers();
        const agents = users.filter(u => u.role === 'agent' || u.role === 'admin');
        
        select.innerHTML = '<option value="">Автоматически</option>';
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.full_name || agent.email;
            select.appendChild(option);
        });
    } catch (e) {
        console.error('Failed to load agents:', e);
    }
}

// UI Helpers
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
}

function showView(viewName) {
    activeView = viewName;
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    const viewEl = document.getElementById(`${viewName}View`);
    if (viewEl) viewEl.classList.remove('hidden');

    // Load data for the view
    if (viewName === 'tickets') {
        loadTickets();
    } else if (viewName === 'dashboard') {
        loadDashboardData();
    } else if (viewName === 'crm') {
        loadCRMData();
    } else if (viewName === 'kb') {
        loadKBData();
    } else if (viewName === 'audit') {
        loadAuditLogData();
    } else if (viewName === 'users') {
        loadUsers();
    } else if (viewName === 'assets') {
        loadAssetsView();
    }
}

// CRM View functions
let allCompanies = [];

async function loadCRMData() {
    const grid = document.getElementById('companyCardsGrid');
    if (!grid) return;

    try {
        const companies = await api.getCompanies();
        allCompanies = companies;
        window._allCompanies = companies;
        renderCompanies(companies);
    } catch (error) {
        showToast('Ошибка загрузки CRM', 'error');
    }
}

function renderCompanies(companies) {
    const container = document.getElementById('companyCardsGrid');
    if (!companies || companies.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 3rem;">Компании не найдены. Нажмите «Новая компания» чтобы добавить.</p>';
        return;
    }

    const industryIcons = {
        'IT': 'fa-laptop-code',
        'Торговля': 'fa-shopping-cart',
        'Производство': 'fa-industry',
        'Финансы': 'fa-university',
        'Медицина': 'fa-heartbeat',
        'Образование': 'fa-graduation-cap',
        'Логистика': 'fa-truck',
        'Строительство': 'fa-hard-hat',
        'HoReCa': 'fa-utensils',
        'Другое': 'fa-building'
    };

    container.innerHTML = companies.map(company => {
        const icon = industryIcons[company.industry] || 'fa-building';
        const initial = company.name.charAt(0).toUpperCase();
        const contacts = [];
        if (company.phone) contacts.push(`<span><i class="fas fa-phone" style="font-size:0.7rem;margin-right:4px;"></i>${escapeHtml(company.phone)}</span>`);
        if (company.email) contacts.push(`<span><i class="fas fa-envelope" style="font-size:0.7rem;margin-right:4px;"></i>${escapeHtml(company.email)}</span>`);
        if (company.website) contacts.push(`<span><i class="fas fa-globe" style="font-size:0.7rem;margin-right:4px;"></i>${escapeHtml(company.website)}</span>`);

        return `
        <div class="company-card glass-card" onclick="openCompanyDetail(${company.id})" style="cursor:pointer;">
            <div class="company-card-header">
                <div class="company-logo" style="width:48px;height:48px;font-size:1.2rem;">${initial}</div>
                <div class="company-card-info">
                    <h3 style="margin:0;font-size:1rem;color:var(--text-high);">${escapeHtml(company.name)}</h3>
                    ${company.legal_name ? `<p style="margin:2px 0 0;font-size:0.75rem;color:var(--text-low);">${escapeHtml(company.legal_name)}</p>` : ''}
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                        <span class="badge badge-small" style="background:rgba(99,102,241,0.1);color:var(--accent-indigo);border:1px solid rgba(99,102,241,0.2);padding:2px 8px;border-radius:12px;font-size:0.7rem;">
                            <i class="fas ${icon}" style="margin-right:3px;"></i>${escapeHtml(company.industry || 'Без отрасли')}
                        </span>
                        ${company.inn ? `<span style="font-size:0.7rem;color:var(--text-low);">ИНН: ${escapeHtml(company.inn)}</span>` : ''}
                    </div>
                </div>
            </div>
            ${contacts.length ? `<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;font-size:0.8rem;color:var(--text-med);">${contacts.join('')}</div>` : ''}
            ${company.address ? `<div style="margin-top:8px;font-size:0.8rem;color:var(--text-low);"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${escapeHtml(company.address)}</div>` : ''}
            <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.7rem;color:var(--text-low);">${formatDate(company.created_at)}</span>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();openCompanyDetail(${company.id})" title="Открыть" style="background:rgba(99,102,241,0.1);color:var(--accent-indigo);border:none;border-radius:8px;cursor:pointer;padding:6px 10px;">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();showEditCompanyModal(${company.id})" title="Редактировать" style="background:rgba(99,102,241,0.1);color:#6366f1;border:none;border-radius:8px;cursor:pointer;padding:6px 10px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();confirmDeleteCompanyById(${company.id},'${escapeHtml(company.name)}')" title="Удалить" style="background:rgba(239,68,68,0.1);color:#ef4444;border:none;border-radius:8px;cursor:pointer;padding:6px 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function showEditCompanyModal(id) {
    const company = allCompanies.find(c => c.id === id);
    if (!company) return;

    document.getElementById('editCompanyId').value = company.id;
    document.getElementById('editCompanyName').value = company.name || '';
    document.getElementById('editCompanyLegalName').value = company.legal_name || '';
    document.getElementById('editCompanyInn').value = company.inn || '';
    document.getElementById('editCompanyIndustry').value = company.industry || '';
    document.getElementById('editCompanyPhone').value = company.phone || '';
    document.getElementById('editCompanyEmail').value = company.email || '';
    document.getElementById('editCompanyWebsite').value = company.website || '';
    document.getElementById('editCompanyDomain').value = company.domain || '';
    document.getElementById('editCompanyAddress').value = company.address || '';
    document.getElementById('editCompanyDescription').value = company.description || '';
    document.getElementById('editCompanyModal').classList.remove('hidden');
}

async function handleEditCompany(e) {
    e.preventDefault();
    const id = document.getElementById('editCompanyId').value;
    const data = {
        name: document.getElementById('editCompanyName').value,
        legal_name: document.getElementById('editCompanyLegalName').value || null,
        inn: document.getElementById('editCompanyInn').value || null,
        industry: document.getElementById('editCompanyIndustry').value || null,
        phone: document.getElementById('editCompanyPhone').value || null,
        email: document.getElementById('editCompanyEmail').value || null,
        website: document.getElementById('editCompanyWebsite').value || null,
        domain: document.getElementById('editCompanyDomain').value || null,
        address: document.getElementById('editCompanyAddress').value || null,
        description: document.getElementById('editCompanyDescription').value || null
    };

    try {
        await api.request(`/crm/companies/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        showToast('Компания обновлена', 'success');
        closeModal('editCompanyModal');
        loadCRMData();
    } catch (error) {
        showToast(error.message || 'Ошибка обновления компании', 'error');
    }
}

async function confirmDeleteCompany() {
    const id = document.getElementById('editCompanyId').value;
    const name = document.getElementById('editCompanyName').value;
    if (!confirm(`Удалить организацию "${name}"?\nЭто действие нельзя отменить.`)) return;

    try {
        await api.request(`/crm/companies/${id}`, { method: 'DELETE' });
        showToast('Организация удалена', 'success');
        closeModal('editCompanyModal');
        loadCRMData();
    } catch (error) {
        showToast(error.message || 'Ошибка удаления', 'error');
    }
}

async function confirmDeleteCompanyById(id, name) {
    if (!confirm(`Удалить организацию "${name}"?\nЭто действие нельзя отменить.`)) return;

    try {
        await api.request(`/crm/companies/${id}`, { method: 'DELETE' });
        showToast('Организация удалена', 'success');
        loadCRMData();
    } catch (error) {
        showToast(error.message || 'Ошибка удаления', 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function getStatusClass(status) {
    const map = {
        'новый': 'new',
        'в_работе': 'progress',
        'решён': 'resolved',
        'закрыт': 'closed'
    };
    return map[status] || 'new';
}

function getPriorityClass(priority) {
    const map = {
        'низкий': 'low',
        'средний': 'medium',
        'высокий': 'high',
        'критичный': 'critical'
    };
    return map[priority] || 'medium';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Ticket Detail Modal Logic ---
let currentTicketId = null;
let slaInterval = null;

let currentTicketForRating = null;

async function openTicketModal(ticketId) {
    currentTicketId = ticketId;
    
    // Загружаем ВСЕ данные параллельно одним запросом
    try {
        const [ticket, timeline] = await Promise.all([
            api.getTicket(ticketId),
            api.getTicketTimeline(ticketId)
        ]);
        
        currentTicketForRating = ticket;

        // Показываем модалку только после загрузки данных
        const modal = document.getElementById('ticketModal');
        modal.classList.remove('hidden');
        
        // Show floating action bar
        if (typeof showFloatingBar === 'function') {
            showFloatingBar();
        }

        // Basic Info
        document.getElementById('modalTicketTitle').textContent = `Тикет #${ticket.readable_id} - ${ticket.title}`;
        document.getElementById('modalTicketDescription').innerHTML = ticket.description || 'Нет описания';

        // Badges
        document.getElementById('modalStatusBadge').innerHTML = `<span class="badge badge-${getStatusClass(ticket.status_rel?.name || 'новый')}">${ticket.status_rel?.name || 'новый'}</span>`;
        document.getElementById('modalPriorityBadge').innerHTML = `<span class="badge badge-${getPriorityClass(ticket.priority)}">${ticket.priority}</span>`;

        // Rating UI
        const clientActions = document.getElementById('clientActions');
        if (clientActions) {
            const isResolved = ['решён', 'закрыт', 'resolved', 'closed'].includes(ticket.status_rel?.name?.toLowerCase());
            if (currentUser && currentUser.role === 'client' && isResolved) {
                clientActions.classList.remove('hidden');
                const btnRate = document.getElementById('btnRateTicket');
                const ratingDisplay = document.getElementById('ticketRatingDisplay');
                if (ticket.rating) {
                    btnRate?.classList.add('hidden');
                    ratingDisplay?.classList.remove('hidden');
                    ratingDisplay.innerHTML = Array(5).fill(0).map((_, i) =>
                        `<i class="fas fa-star ${i < ticket.rating ? 'text-warning' : 'text-muted'}"></i>`
                    ).join('');
                } else {
                    btnRate?.classList.remove('hidden');
                    ratingDisplay?.classList.add('hidden');
                }
            } else {
                clientActions.classList.add('hidden');
            }
        }

        // SLA
        if (ticket.sla_due_at) {
            startSlaTimer(ticket.sla_due_at);
        } else {
            document.getElementById('modalSlaDeadline').textContent = 'Не установлен';
            document.getElementById('modalSlaDeadline').classList.remove('sla-urgent');
        }

        // Timeline - уже загружен выше
        renderModalTimeline(timeline);

        // Load client assets
        loadClientAssets(ticket);

        // Load ticket files/attachments
        loadTicketFiles(ticket);

    } catch (error) {
        console.error('Modal error:', error);
        showToast('Ошибка загрузки деталей тикета', 'error');
        closeTicketModal();
    }
}

function closeTicketModal() {
    document.getElementById('ticketModal').classList.add('hidden');
    currentTicketId = null;
    if (slaInterval) clearInterval(slaInterval);
    
    // Hide floating action bar
    if (typeof hideFloatingBar === 'function') {
        hideFloatingBar();
    }
}

function startSlaTimer(deadline) {
    if (slaInterval) clearInterval(slaInterval);

    const update = () => {
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;

        const el = document.getElementById('modalSlaDeadline');
        if (!el) return;

        if (diff <= 0) {
            el.textContent = 'Просрочено!';
            el.classList.add('sla-urgent');
            clearInterval(slaInterval);
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        el.textContent = `${hours}ч ${mins}м осталось`;

        if (hours < 2) {
            el.classList.add('sla-urgent');
        } else {
            el.classList.remove('sla-urgent');
        }
    };

    update();
    slaInterval = setInterval(update, 60000);
}

async function loadTicketTime(ticketId) {
    try {
        const total = await api.getTicketTotalTime(ticketId);
        document.getElementById('modalTotalTime').textContent = `${total.total_hours} ч.`;

        const entries = await api.getTicketTimeEntries(ticketId);
        renderTimeEntries(entries);
    } catch (error) {
        console.error('Time tracking error:', error);
    }
}

function renderTimeEntries(entries) {
    const container = document.getElementById('modalTimeList');
    if (!entries.length) {
        container.innerHTML = '<p class="text-muted">Нет записей</p>';
        return;
    }

    container.innerHTML = entries.map(e => `
        <div class="time-log-item">
            <strong>${(e.minutes / 60).toFixed(1)}ч</strong> - ${escapeHtml(e.description || 'Без описания')}
            <div style="font-size: 0.7rem; color: var(--text-dim)">${formatDate(e.created_at)}</div>
        </div>
    `).join('');
}

function renderModalTimeline(events) {
    const container = document.getElementById('modalTimeline');
    container.innerHTML = events.slice().reverse().map(ev => `
        <div class="timeline-item-compact" style="margin-bottom: 0.5rem; font-size: 0.85rem; border-left: 2px solid var(--glass-border); padding-left: 0.5rem;">
            <span class="timeline-date" style="color: var(--text-dim); display: block;">${new Date(ev.created_at).toLocaleString('ru')}</span>
            <span class="timeline-text">${escapeHtml(ev.content)}</span>
        </div>
    `).join('');
}

// Global Event Listeners for new forms
document.addEventListener('DOMContentLoaded', () => {
    // We use event delegation or wait for DOM. 
    // Since app.js is included at the end, we can also just check immediately if DOMContentLoaded is overkill.
});

// Adding explicit listener for logTimeForm
setTimeout(() => {
    const logTimeForm = document.getElementById('logTimeForm');
    if (logTimeForm) {
        logTimeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentTicketId) return;

            const minutesEl = document.getElementById('logMinutes');
            const descEl = document.getElementById('logDesc');

            try {
                await api.logTime({
                    ticket_id: currentTicketId,
                    minutes: parseInt(minutesEl.value),
                    description: descEl.value
                });
                showToast('Время сохранено', 'success');
                minutesEl.value = '';
                descEl.value = '';
                loadTicketTime(currentTicketId);
            } catch (error) {
                showToast('Ошибка сохранения времени', 'error');
            }
        });
    }
}, 1000);

// --- Knowledge Base Logic ---
let allKBArticles = [];
let currentKBCategoryId = null;

async function loadKBData() {
    try {
        const categories = await api.getKBCategories();
        renderKBCategories(categories);

        allKBArticles = await api.getKBArticles();
        renderKBArticles(allKBArticles);

        // Hide management buttons for clients
        const me = await api.getMe();
        const isStaff = me.role !== 'client';
        document.getElementById('newArticleBtn').style.display = isStaff ? 'block' : 'none';
        document.getElementById('newCategoryBtn').style.display = isStaff ? 'block' : 'none';

    } catch (error) {
        showToast('Ошибка загрузки Базы Знаний', 'error');
    }
}

function renderKBCategories(categories) {
    const container = document.getElementById('kbCategoryList');
    const allActive = !currentKBCategoryId ? 'active' : '';

    let html = `<div class="kb-category-item ${allActive}" onclick="filterKBCategory(null)">
        <i class="fas fa-th-large"></i> <span>Все статьи</span>
    </div>`;

    html += categories.map(cat => `
        <div class="kb-category-item ${currentKBCategoryId === cat.id ? 'active' : ''}" onclick="filterKBCategory(${cat.id})">
            <i class="fas fa-${cat.icon || 'book'}"></i> <span>${escapeHtml(cat.name)}</span>
        </div>
    `).join('');

    container.innerHTML = html;
}

function renderKBArticles(articles) {
    const container = document.getElementById('kbArticleList');
    if (!articles.length) {
        container.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Статьи не найдены</p>';
        return;
    }

    container.innerHTML = articles.map(art => `
        <div class="glass-card kb-article-card" onclick="openKBArticle(${art.id})">
            <h4>${escapeHtml(art.title)}</h4>
            <p class="kb-article-excerpt">${art.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
            <div class="kb-article-meta">
                <span><i class="fas fa-eye"></i> ${art.view_count}</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(art.created_at)}</span>
            </div>
        </div>
    `).join('');
}

function filterKBCategory(id) {
    currentKBCategoryId = id;
    // Re-render categories to update active state
    api.getKBCategories().then(renderKBCategories);

    const filtered = id
        ? allKBArticles.filter(a => a.category_id === id)
        : allKBArticles;
    renderKBArticles(filtered);
}

function searchKB() {
    const term = document.getElementById('kbSearch').value.toLowerCase();
    const filtered = allKBArticles.filter(a =>
        a.title.toLowerCase().includes(term) ||
        a.content.toLowerCase().includes(term)
    );
    renderKBArticles(filtered);
}

async function openKBArticle(id) {
    try {
        const article = await api.getKBArticle(id);
        // We reuse the ticket modal or create a new one? Let's use a simpler alert for now or build a quick KB viewer.
        // For premium feel, let's just use a native alert for content for now, but in real app we'd have another modal.
        alert(`Здесь будет просмотр статьи: ${article.title}\n\n${article.content}`);
    } catch (error) {
        showToast('Ошибка открытия статьи', 'error');
    }
}

function showNewKBCategory() {
    const name = prompt('Введите название категории:');
    if (name) {
        api.createKBCategory({ name }).then(() => {
            showToast('Категория создана', 'success');
            loadKBData();
        });
    }
}

function showNewKBArticle() {
    showToast('Функция создания статьи в разработке (нужен редактор)', 'info');
}

// --- Audit Log Logic ---
async function loadAuditLogData() {
    const tableBody = document.getElementById('auditLogTableBody');
    if (!tableBody) return;

    try {
        const logs = await api.getAuditLogs({ limit: 50 });
        renderAuditLogs(logs);
    } catch (error) {
        showToast('Ошибка загрузки аудита', 'error');
    }
}

function renderAuditLogs(logs) {
    const container = document.getElementById('auditLogTableBody');
    if (!logs || logs.length === 0) {
        container.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Записи не найдены</td></tr>';
        return;
    }

    container.innerHTML = logs.map(log => `
        <tr>
            <td>
                <div style="font-size: 0.85rem; color: var(--text-dim);">${new Date(log.created_at).toLocaleString('ru')}</div>
            </td>
            <td>
                <span class="badge" style="background: rgba(102, 126, 234, 0.1); border: 1px solid var(--glass-border);">${log.action}</span>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="avatar-small" style="width: 24px; height: 24px; font-size: 0.6rem;">${log.user?.full_name?.charAt(0) || 'S'}</div>
                    <span style="font-size: 0.9rem;">${escapeHtml(log.user?.email || 'System')}</span>
                </div>
            </td>
            <td>
                <span style="font-size: 0.85rem; color: var(--text-dim);">${log.target_type || '-'}${log.target_id ? ` #${log.target_id}` : ''}</span>
            </td>
            <td>
                <code style="font-size: 0.8rem; opacity: 0.7;">${log.ip_address || '-'}</code>
            </td>
            <td>
                <div style="font-size: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title='${JSON.stringify(log.details)}'>
                    ${JSON.stringify(log.details)}
                </div>
            </td>
        </tr>
    `).join('');
}

// Update UI based on User Role on startup
async function updateUIForRole() {
    try {
        const me = await api.getMe();
        const isAdmin = me.role === 'admin' || me.role === 'super_admin';

        const auditLink = document.getElementById('auditNavLink');
        if (auditLink) {
            auditLink.style.display = isAdmin ? 'flex' : 'none';
        }
    } catch (e) {
        console.error("UI Update error", e);
    }
}

// Register UI update in initializeApp
const originalInitializeApp = initializeApp;
initializeApp = async function () {
    await originalInitializeApp();
    const token = localStorage.getItem('access_token');
    if (token) {
        updateUIForRole();
    }
};

// --- Real-time WebSocket Logic ---
let ws = null;

function initWebSocket() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    if (ws) ws.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Backend WebSocket endpoint is at /ws/{token} (without /api prefix)
    const wsUrl = `${protocol}//${host}/ws/${token}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWsEvent(message);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected, retrying in 5s...');
        setTimeout(initWebSocket, 5000);
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
    };
}

function handleWsEvent(event) {
    console.log('Real-time event:', event);

    switch (event.type) {
        case 'REFRESH_TICKETS':
            showToast(event.message || 'Тикет обновлен', 'info');
            loadTickets();
            if (activeView === 'dashboard') loadDashboardData();
            break;

        case 'TICKET_CREATED':
            // Не показывать уведомление создателю заявки
            if (currentUser && event.data && currentUser.id === event.data.created_by_id) {
                console.log('Skipping notification for ticket creator');
            } else if (currentUser && currentUser.role === 'client') {
                console.log('Skipping notification for client');
            } else {
                showNewTicketNotification(event.data);
            }
            loadTickets();
            if (activeView === 'dashboard') loadDashboardData();
            break;

        case 'TICKET_COMMENT_ADDED':
            if (activeView === 'tickets' && currentTicketId === event.data.ticket_id) {
                loadTicketTimeline(event.data.ticket_id);
            }
            showToast(`Новое сообщение в тикете #${event.data.ticket_id}`, 'info');
            break;

        case 'NEW_NOTIFICATION':
            showToast(event.message, 'info');
            loadNotifications();
            break;
    }
}

// --- Notification Center Logic ---
let allNotifications = [];

async function loadNotifications() {
    try {
        const data = await api.request('/notifications');
        allNotifications = data;
        renderNotifications();
        updateNotificationBadge();
    } catch (e) {
        console.error("Notifications error", e);
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationList');
    if (!allNotifications || allNotifications.length === 0) {
        container.innerHTML = '<p class="text-muted" style="padding: 1rem; text-align: center;">Нет новых уведомлений</p>';
        return;
    }

    container.innerHTML = allNotifications.slice(0, 5).map(n => `
        <div class="notif-item ${!n.read_at ? 'unread' : ''}">
            <h4>${escapeHtml(n.title)}</h4>
            <p>${escapeHtml(n.content)}</p>
            <div class="notif-time">${new Date(n.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
    `).join('');
}

function updateNotificationBadge() {
    const unreadCount = allNotifications.filter(n => !n.read_at).length;
    const badge = document.getElementById('notificationBadge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.classList.toggle('hidden');
}

// Close notifications when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notificationDropdown');
    const trigger = document.querySelector('.notification-trigger');
    if (dropdown && !dropdown.classList.contains('hidden') && 
        !dropdown.contains(e.target) && 
        !trigger?.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

async function markAllNotificationsAsRead() {
    try {
        await api.request('/notifications/read-all', { method: 'POST' });
        loadNotifications();
    } catch (e) {
        showToast('Ошибка при обновлении уведомлений', 'error');
    }
}

// --- Users & Companies Management ---

async function loadUsers() {
    try {
        const roleFilterEl = document.getElementById('userRoleFilter');
        const role = roleFilterEl ? roleFilterEl.value : '';
        const searchInput = document.getElementById('userSearchInput');
        const search = searchInput ? searchInput.value.toLowerCase() : '';

        const filters = {};
        if (role) filters.role = role;

        const [users, companies] = await Promise.all([
            api.getUsers(filters),
            api.getCompanies().catch(() => [])
        ]);

        window._allUsers = users;
        window._allCompanies = companies;

        const filteredUsers = users.filter(u =>
            !search ||
            (u.email && u.email.toLowerCase().includes(search)) ||
            (u.full_name && u.full_name.toLowerCase().includes(search))
        );

        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (filteredUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 1rem;">Пользователи не найдены</td></tr>';
            return;
        }

        filteredUsers.forEach(user => {
            const company = companies.find(c => c.id === user.company_id);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="user-cell" style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="avatar-small">${(user.full_name || user.email).charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="font-medium">${escapeHtml(user.full_name || 'Не указано')}</div>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="badge badge-${getRoleBadgeColor(user.role)}">${getRoleLabel(user.role)}</span></td>
                <td>${company ? escapeHtml(company.name) : '<span class="text-muted">—</span>'}</td>
                <td>
                    <button class="btn btn-icon btn-small" onclick="showEditUserModal(${user.id})" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Errors loading users', error);
        showToast('Ошибка загрузки пользователей', 'error');
    }
}

function getRoleLabel(role) {
    const labels = {
        'admin': 'Админ',
        'agent': 'Агент',
        'client': 'Клиент',
        'super_admin': 'СуперАдмин'
    };
    return labels[role] || role;
}

async function showEditUserModal(id) {
    const user = window._allUsers.find(u => u.id === id);
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserFullName').value = user.full_name || '';
    document.getElementById('editUserRole').value = user.role || 'client';
    document.getElementById('editUserPassword').value = '';

    const companySelect = document.getElementById('editUserCompanyId');
    companySelect.innerHTML = '<option value="">Не выбрано</option>';
    const companies = window._allCompanies || [];
    companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (c.id === user.company_id) opt.selected = true;
        companySelect.appendChild(opt);
    });

    document.getElementById('editUserModal').classList.remove('hidden');
}

async function handleEditUser(e) {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const companyEl = document.getElementById('editUserCompanyId');
    const passwordEl = document.getElementById('editUserPassword');

    const data = {
        full_name: document.getElementById('editUserFullName').value || null,
        role: document.getElementById('editUserRole').value,
        company_id: companyEl && companyEl.value ? parseInt(companyEl.value) : null
    };
    if (passwordEl && passwordEl.value) {
        data.password = passwordEl.value;
    }

    try {
        await api.request(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        showToast('Пользователь обновлён', 'success');
        closeModal('editUserModal');
        loadUsers();
    } catch (error) {
        showToast(error.message || 'Ошибка обновления', 'error');
    }
}

async function confirmDeleteUser() {
    const id = document.getElementById('editUserId').value;
    const email = document.getElementById('editUserEmail').value;
    if (!confirm(`Удалить пользователя "${email}"?\nЭто действие нельзя отменить.`)) return;

    try {
        await api.request(`/users/${id}`, { method: 'DELETE' });
        showToast('Пользователь удалён', 'success');
        closeModal('editUserModal');
        loadUsers();
    } catch (error) {
        showToast(error.message || 'Ошибка удаления', 'error');
    }
}

function filterUsersTable() {
    loadUsers();
}

function getRoleBadgeColor(role) {
    switch (role) {
        case 'admin': return 'danger';
        case 'agent': return 'warning';
        case 'client': return 'success';
        default: return 'secondary';
    }
}

async function showCreateUserModal() {
    const form = document.getElementById('createUserForm');
    if (form) form.reset();

    const companySelect = document.getElementById('newUserCompanyId');
    if (companySelect) {
        companySelect.innerHTML = '<option value="">Не выбрано</option>';
        try {
            const companies = await api.getCompanies();
            companies.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                companySelect.appendChild(opt);
            });
        } catch (e) { console.error(e); }
    }

    const modal = document.getElementById('createUserModal');
    if (modal) modal.classList.remove('hidden');
}

async function handleCreateUser(e) {
    e.preventDefault();

    const companyIdEl = document.getElementById('newUserCompanyId');
    const companyId = companyIdEl ? companyIdEl.value : null;

    const data = {
        email: document.getElementById('newUserEmail').value,
        full_name: document.getElementById('newUserFullName').value,
        password: document.getElementById('newUserPassword').value,
        role: document.getElementById('newUserRole').value,
        company_id: companyId ? parseInt(companyId) : null
    };

    try {
        await api.createUser(data);
        showToast('Пользователь создан', 'success');
        closeModal('createUserModal');
        loadUsers();
    } catch (error) {
        showToast(error.message || 'Ошибка создания пользователя', 'error');
    }
}

function showCreateCompanyModal() {
    const form = document.getElementById('createCompanyForm');
    if (form) form.reset();
    const modal = document.getElementById('createCompanyModal');
    if (modal) modal.classList.remove('hidden');
}

async function handleCreateCompany(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('newCompanyName').value,
        legal_name: document.getElementById('newCompanyLegalName').value || null,
        inn: document.getElementById('newCompanyInn').value || null,
        industry: document.getElementById('newCompanyIndustry').value || null,
        phone: document.getElementById('newCompanyPhone').value || null,
        email: document.getElementById('newCompanyEmail').value || null,
        website: document.getElementById('newCompanyWebsite').value || null,
        domain: document.getElementById('newCompanyDomain').value || null,
        address: document.getElementById('newCompanyAddress').value || null,
        description: document.getElementById('newCompanyDescription').value || null
    };

    try {
        await api.createCompany(data);
        showToast('Компания создана', 'success');
        closeModal('createCompanyModal');
        document.getElementById('createCompanyForm').reset();
        loadCRMData();
    } catch (error) {
        showToast(error.message || 'Ошибка создания компании', 'error');
    }
}

// --- Ticket Rating ---

// --- Company Detail ---
window._detailCompanyId = null;
window._detailCompanyName = '';

async function openCompanyDetail(id) {
    const company = allCompanies.find(c => c.id === id);
    if (!company) return;
    window._detailCompanyId = id;
    window._detailCompanyName = company.name;
    document.getElementById('detailCompanyName').textContent = company.name;

    const fields = [
        ['Юр. название', company.legal_name], ['ИНН', company.inn],
        ['Отрасль', company.industry], ['Телефон', company.phone],
        ['Email', company.email], ['Веб-сайт', company.website],
        ['Домен', company.domain], ['Адрес', company.address],
    ];
    const infoHtml = fields.filter(f => f[1]).map(([label, val]) =>
        `<div style="padding:8px 0;border-bottom:1px solid var(--prism-border);"><span style="color:var(--text-low);font-size:0.75rem;">${label}</span><br><span style="color:var(--text-high);">${escapeHtml(val)}</span></div>`
    ).join('');
    document.getElementById('detailCompanyInfo').innerHTML = infoHtml || '<p style="color:var(--text-low);grid-column:1/-1;text-align:center;">Нет данных</p>';

    showDetailTab('info');
    document.getElementById('companyDetailModal').classList.remove('hidden');
    loadSubscriptions(id);
    loadEmployees(id);
}

function showDetailTab(tab) {
    ['info','subs','emps'].forEach(t => {
        document.getElementById('detail' + t.charAt(0).toUpperCase() + t.slice(1) + 'Tab').style.display = t === tab ? '' : 'none';
        const btn = document.getElementById('detailTab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) btn.classList.toggle('active', t === tab);
    });
}

function openEditFromDetail() {
    closeModal('companyDetailModal');
    showEditCompanyModal(window._detailCompanyId);
}

// --- Subscriptions ---
async function loadSubscriptions(companyId) {
    try {
        const subs = await api.getSubscriptions(companyId);
        renderSubscriptions(subs);
    } catch (e) { console.error(e); }
}

function renderSubscriptions(subs) {
    const container = document.getElementById('detailSubsList');
    if (!subs || subs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-low);text-align:center;padding:2rem;">Нет подписок</p>';
        return;
    }
    const statusColors = { active: '#10b981', expiring: '#f59e0b', expired: '#ef4444', cancelled: '#71717a' };
    const statusLabels = { active: 'Активна', expiring: 'Истекает', expired: 'Истекла', cancelled: 'Отменена' };
    const cycleLabels = { monthly: 'Ежемесячная', yearly: 'Ежегодная', quarterly: 'Ежеквартальная' };

    container.innerHTML = subs.map(s => {
        const expDate = s.expires_at ? new Date(s.expires_at) : null;
        const daysLeft = expDate ? Math.ceil((expDate - new Date()) / 86400000) : null;
        const urgency = daysLeft !== null ? (daysLeft <= 7 ? 'urgent' : daysLeft <= 30 ? 'warning' : '') : '';
        const statusColor = statusColors[s.status] || '#71717a';
        const statusLabel = statusLabels[s.status] || s.status;

        return `<div class="sub-card glass-card" style="padding:1rem;margin-bottom:0.75rem;cursor:pointer;" onclick="editSubscription(${s.id})">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong style="color:var(--text-high);">${escapeHtml(s.service_name)}</strong>
                    ${s.plan ? `<span style="color:var(--text-low);margin-left:8px;font-size:0.8rem;">${escapeHtml(s.plan)}</span>` : ''}
                    <span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:12px;font-size:0.7rem;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">${statusLabel}</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();editSubscription(${s.id})" title="Редактировать" style="background:rgba(99,102,241,0.1);color:#6366f1;border:none;border-radius:8px;cursor:pointer;padding:4px 8px;"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();deleteSub(${s.id})" title="Удалить" style="background:rgba(239,68,68,0.1);color:#ef4444;border:none;border-radius:8px;cursor:pointer;padding:4px 8px;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:0.8rem;color:var(--text-med);">
                ${s.license_count ? `<span><i class="fas fa-users" style="margin-right:4px;"></i>${s.license_count} лицензий</span>` : ''}
                ${s.price ? `<span><i class="fas fa-tag" style="margin-right:4px;"></i>${escapeHtml(s.price)} ${s.currency || 'UZS'}</span>` : ''}
                ${s.billing_cycle ? `<span>${cycleLabels[s.billing_cycle] || s.billing_cycle}</span>` : ''}
                ${expDate ? `<span class="${urgency}" style="${urgency === 'urgent' ? 'color:#ef4444;font-weight:600;' : urgency === 'warning' ? 'color:#f59e0b;' : ''}"><i class="fas fa-clock" style="margin-right:4px;"></i>${daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} дн.` : 'Истекла') : ''} ${expDate.toLocaleDateString('ru')}</span>` : ''}
                ${s.m365_tenant_id ? `<span style="color:var(--accent-indigo);"><i class="fab fa-microsoft" style="margin-right:4px;"></i>M365</span>` : ''}
            </div>
        </div>`;
    }).join('');
}

function showAddSubModal() {
    document.getElementById('subModalTitle').textContent = 'Добавить подписку';
    document.getElementById('subForm').reset();
    document.getElementById('subId').value = '';
    document.getElementById('subStatus').value = 'active';
    document.getElementById('subCurrency').value = 'UZS';
    document.getElementById('subAutoRenew').checked = false;
    document.getElementById('subModal').classList.remove('hidden');
}

async function editSubscription(subId) {
    const subs = await api.getSubscriptions(window._detailCompanyId);
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;
    document.getElementById('subModalTitle').textContent = 'Редактировать подписку';
    document.getElementById('subId').value = sub.id;
    document.getElementById('subServiceName').value = sub.service_name || '';
    document.getElementById('subPlan').value = sub.plan || '';
    document.getElementById('subLicenseCount').value = sub.license_count || '';
    document.getElementById('subPrice').value = sub.price || '';
    document.getElementById('subCurrency').value = sub.currency || 'UZS';
    document.getElementById('subBillingCycle').value = sub.billing_cycle || '';
    document.getElementById('subStartedAt').value = sub.started_at ? sub.started_at.substring(0,10) : '';
    document.getElementById('subExpiresAt').value = sub.expires_at ? sub.expires_at.substring(0,10) : '';
    document.getElementById('subAutoRenew').checked = sub.auto_renew || false;
    document.getElementById('subStatus').value = sub.status || 'active';
    document.getElementById('subM365TenantId').value = sub.m365_tenant_id || '';
    document.getElementById('subM365Domain').value = sub.m365_domain || '';
    document.getElementById('subAdminEmail').value = sub.admin_email || '';
    document.getElementById('subNotes').value = sub.notes || '';
    document.getElementById('subModal').classList.remove('hidden');
}

async function handleSubForm(e) {
    e.preventDefault();
    const subId = document.getElementById('subId').value;
    const data = {
        service_name: document.getElementById('subServiceName').value,
        plan: document.getElementById('subPlan').value || null,
        license_count: document.getElementById('subLicenseCount').value ? parseInt(document.getElementById('subLicenseCount').value) : null,
        price: document.getElementById('subPrice').value || null,
        currency: document.getElementById('subCurrency').value || 'UZS',
        billing_cycle: document.getElementById('subBillingCycle').value || null,
        started_at: document.getElementById('subStartedAt').value || null,
        expires_at: document.getElementById('subExpiresAt').value || null,
        auto_renew: document.getElementById('subAutoRenew').checked,
        status: document.getElementById('subStatus').value || 'active',
        m365_tenant_id: document.getElementById('subM365TenantId').value || null,
        m365_domain: document.getElementById('subM365Domain').value || null,
        admin_email: document.getElementById('subAdminEmail').value || null,
        notes: document.getElementById('subNotes').value || null,
    };
    try {
        if (subId) {
            await api.updateSubscription(subId, data);
            showToast('Подписка обновлена', 'success');
        } else {
            await api.createSubscription(window._detailCompanyId, data);
            showToast('Подписка добавлена', 'success');
        }
        closeModal('subModal');
        loadSubscriptions(window._detailCompanyId);
    } catch (error) {
        showToast(error.message || 'Ошибка сохранения подписки', 'error');
    }
}

async function deleteSub(subId) {
    if (!confirm('Удалить подписку?')) return;
    try {
        await api.deleteSubscription(subId);
        showToast('Подписка удалена', 'success');
        loadSubscriptions(window._detailCompanyId);
    } catch (error) {
        showToast(error.message || 'Ошибка удаления', 'error');
    }
}

// --- Employees ---
async function loadEmployees(companyId) {
    try {
        const emps = await api.getEmployees(companyId);
        renderEmployees(emps);
    } catch (e) { console.error(e); }
}

function renderEmployees(emps) {
    const container = document.getElementById('detailEmpsList');
    if (!emps || emps.length === 0) {
        container.innerHTML = '<p style="color:var(--text-low);text-align:center;padding:2rem;">Нет сотрудников</p>';
        return;
    }
    container.innerHTML = emps.map(e => `
        <div class="sub-card glass-card" style="padding:1rem;margin-bottom:0.75rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-indigo);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;">${(e.full_name || '?').charAt(0)}</div>
                    <div>
                        <strong style="color:var(--text-high);">${escapeHtml(e.full_name)}</strong>
                        ${e.position ? `<span style="color:var(--text-low);margin-left:8px;font-size:0.8rem;">${escapeHtml(e.position)}</span>` : ''}
                        ${!e.is_active ? '<span style="margin-left:8px;font-size:0.7rem;color:#71717a;">Неактивен</span>' : ''}
                        ${e.m365_license ? '<span style="margin-left:8px;color:var(--accent-indigo);font-size:0.75rem;"><i class="fab fa-microsoft"></i> M365</span>' : ''}
                    </div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-icon btn-small" onclick="editEmployee(${e.id})" title="Редактировать" style="background:rgba(99,102,241,0.1);color:#6366f1;border:none;border-radius:8px;cursor:pointer;padding:4px 8px;"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-icon btn-small" onclick="deleteEmp(${e.id})" title="Удалить" style="background:rgba(239,68,68,0.1);color:#ef4444;border:none;border-radius:8px;cursor:pointer;padding:4px 8px;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:0.8rem;color:var(--text-med);">
                ${e.department ? `<span><i class="fas fa-building" style="margin-right:4px;"></i>${escapeHtml(e.department)}</span>` : ''}
                ${e.email ? `<span><i class="fas fa-envelope" style="margin-right:4px;"></i>${escapeHtml(e.email)}</span>` : ''}
                ${e.phone ? `<span><i class="fas fa-phone" style="margin-right:4px;"></i>${escapeHtml(e.phone)}</span>` : ''}
                ${e.m365_email ? `<span style="color:var(--accent-indigo);"><i class="fab fa-microsoft" style="margin-right:4px;"></i>${escapeHtml(e.m365_email)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function showAddEmpModal() {
    document.getElementById('empModalTitle').textContent = 'Добавить сотрудника';
    document.getElementById('empForm').reset();
    document.getElementById('empId').value = '';
    document.getElementById('empIsActive').checked = true;
    document.getElementById('empModal').classList.remove('hidden');
}

async function editEmployee(empId) {
    const emps = await api.getEmployees(window._detailCompanyId);
    const emp = emps.find(e => e.id === empId);
    if (!emp) return;
    document.getElementById('empModalTitle').textContent = 'Редактировать сотрудника';
    document.getElementById('empId').value = emp.id;
    document.getElementById('empFullName').value = emp.full_name || '';
    document.getElementById('empPosition').value = emp.position || '';
    document.getElementById('empDepartment').value = emp.department || '';
    document.getElementById('empEmail').value = emp.email || '';
    document.getElementById('empPhone').value = emp.phone || '';
    document.getElementById('empM365License').value = emp.m365_license || '';
    document.getElementById('empM365Email').value = emp.m365_email || '';
    document.getElementById('empIsActive').checked = emp.is_active !== false;
    document.getElementById('empNotes').value = emp.notes || '';
    document.getElementById('empModal').classList.remove('hidden');
}

async function handleEmpForm(e) {
    e.preventDefault();
    const empId = document.getElementById('empId').value;
    const data = {
        full_name: document.getElementById('empFullName').value,
        position: document.getElementById('empPosition').value || null,
        department: document.getElementById('empDepartment').value || null,
        email: document.getElementById('empEmail').value || null,
        phone: document.getElementById('empPhone').value || null,
        m365_license: document.getElementById('empM365License').value || null,
        m365_email: document.getElementById('empM365Email').value || null,
        is_active: document.getElementById('empIsActive').checked,
        notes: document.getElementById('empNotes').value || null,
    };
    try {
        if (empId) {
            await api.updateEmployee(parseInt(empId), data);
            showToast('Сотрудник обновлён', 'success');
        } else {
            await api.createEmployee(window._detailCompanyId, data);
            showToast('Сотрудник добавлен', 'success');
        }
        closeModal('empModal');
        loadEmployees(window._detailCompanyId);
    } catch (error) {
        showToast(error.message || 'Ошибка сохранения', 'error');
    }
}

async function deleteEmp(empId) {
    if (!confirm('Удалить сотрудника?')) return;
    try {
        await api.deleteEmployee(empId);
        showToast('Сотрудник удалён', 'success');
        loadEmployees(window._detailCompanyId);
    } catch (error) {
        showToast(error.message || 'Ошибка удаления', 'error');
    }
}

function showRatingModal() {
    if (!currentTicketForRating) return;
    document.getElementById('ratingTicketId').value = currentTicketForRating.id;
    document.getElementById('ratingForm').reset();
    updateStarRating(0);
    document.getElementById('ratingModal').classList.remove('hidden');
}

async function handleRatingSubmit(e) {
    e.preventDefault();
    const ticketId = document.getElementById('ratingTicketId').value;
    const ratingEl = document.getElementById('ratingValue');
    const rating = parseInt(ratingEl.value);
    const comment = document.getElementById('ratingComment').value;

    if (!rating || rating < 1) {
        showToast('Пожалуйста, поставьте оценку', 'warning');
        return;
    }

    try {
        await api.rateTicket(ticketId, rating, comment);
        showToast('Спасибо за отзыв!', 'success');
        closeModal('ratingModal');
        closeTicketModal();
        loadTickets();
    } catch (error) {
        showToast(error.message || 'Ошибка отправки отзыва', 'error');
    }
}

function updateStarRating(value, isHover = false) {
    const stars = document.querySelectorAll('#starRating .fa-star');
    stars.forEach(star => {
        const starVal = parseInt(star.dataset.value);
        if (starVal <= value) {
            star.classList.replace('far', 'fas');
            star.classList.add('text-warning');
        } else {
            star.classList.replace('fas', 'far');
            star.classList.remove('text-warning');
        }
    });
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.target;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

window.togglePasswordVisibility = togglePasswordVisibility;

// ============================================
// NEW TICKET NOTIFICATION FOR AGENTS
// ============================================
function showNewTicketNotification(ticket) {
    if (!ticket) return;

    let notifContainer = document.getElementById('newTicketNotifications');
    if (!notifContainer) {
        notifContainer = document.createElement('div');
        notifContainer.id = 'newTicketNotifications';
        notifContainer.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:480px;width:90vw;pointer-events:auto;';
        document.body.appendChild(notifContainer);
    }

    const priorityColors = { critical:'#f43f5e', high:'#f59e0b', medium:'#00d4ff', low:'#10b981' };
    const priorityLabels = { critical:'Критичный', high:'Высокий', medium:'Средний', low:'Низкий' };
    const pc = priorityColors[ticket.priority] || '#00d4ff';
    const pl = priorityLabels[ticket.priority] || ticket.priority;

    const notif = document.createElement('div');
    notif.style.cssText = 'background:linear-gradient(135deg,rgba(0,212,255,0.95),rgba(124,58,237,0.95));border:1px solid rgba(0,212,255,0.5);border-radius:16px;padding:20px;color:white;box-shadow:0 10px 40px rgba(0,212,255,0.4);position:relative;overflow:hidden;';

    notif.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:24px;">\uD83D\uDD14</div>
            <div style="flex:1;">
                <h3 style="margin:0;font-size:16px;font-weight:700;">Новая заявка!</h3>
                <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;"><span style="color:${pc};font-weight:600;">\u25CF ${pl}</span> приоритет</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">\u00D7</button>
        </div>
        <div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:12px;margin-bottom:15px;">
            <p style="margin:0 0 4px 0;font-weight:600;font-size:15px;">${escapeHtml(ticket.title || 'Без заголовка')}</p>
            <p style="margin:0;font-size:13px;opacity:0.8;line-height:1.4;">${escapeHtml((ticket.description || '').substring(0, 120))}</p>
        </div>
        <div style="display:flex;gap:10px;">
            <button onclick="assignTicketToMe(${ticket.id}, this.parentElement.parentElement)" style="flex:1;background:linear-gradient(135deg,#10b981,#059669);border:none;color:white;padding:12px 16px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-check"></i> Принять заявку
            </button>
            <button onclick="openTicketModal(${ticket.id}); this.closest('[id=newTicketNotifications]') && this.closest('[id=newTicketNotifications]').remove();" style="flex:1;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:white;padding:12px 16px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-eye"></i> Просмотреть
            </button>
        </div>
    `;

    notifContainer.appendChild(notif);

    setTimeout(() => {
        if (notif.parentNode) {
            notif.style.opacity = '0';
            notif.style.transition = 'opacity 0.5s';
            setTimeout(() => notif.remove(), 500);
        }
    }, 30000);

    playNotificationSound();
}

async function assignTicketToMe(ticketId, notifElement) {
    try {
        const btn = notifElement.querySelector('button');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Принимаю...';
        btn.disabled = true;

        await api.assignTicket(ticketId, currentUser.id);

        showToast('Заявка принята!', 'success');
        notifElement.style.opacity = '0';
        notifElement.style.transition = 'opacity 0.3s';
        setTimeout(() => notifElement.remove(), 300);

        loadTickets();
        if (activeView === 'dashboard') loadDashboardData();
    } catch (error) {
        console.error('Error assigning ticket:', error);
        showToast(error.message || 'Ошибка при принятии заявки', 'error');
        const btn = notifElement.querySelector('button');
        btn.innerHTML = '<i class="fas fa-check"></i> Принять заявку';
        btn.disabled = false;
    }
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
}

// ============================================
// CLIENT ASSETS & FILES IN TICKET MODAL
// ============================================
async function loadClientAssets(ticket) {
    const container = document.getElementById('modalClientAssets');
    if (!container) return;
    
    try {
        let assets = [];
        // Load assets from company or ticket
        if (ticket.company_id) {
            const res = await fetch(`/api/v1/features/companies/${ticket.company_id}/assets`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) assets = await res.json();
        }
        
        if (assets.length === 0) {
            container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">Нет привязанной техники</p>';
            return;
        }
        
        const icons = { laptop:'fa-laptop', desktop:'fa-desktop', server:'fa-server', printer:'fa-printer', router:'fa-wifi', phone:'fa-mobile-alt', monitor:'fa-tv', other:'fa-box' };
        const statusLabels = { active:'Активно', repair:'В ремонте', decommissioned:'Списано' };
        const statusColors = { active:'#10b981', repair:'#f59e0b', decommissioned:'#6b7280' };
        
        container.innerHTML = assets.map(a => `
            <div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1);border-radius:10px;padding:0.75rem;margin-bottom:0.5rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
                    <i class="fas ${icons[a.asset_type]||'fa-box'}" style="color:var(--jarvis-cyan);font-size:0.9rem;"></i>
                    <strong style="color:var(--text-primary);font-size:0.85rem;">${escapeHtml(a.name)}</strong>
                    <span style="margin-left:auto;padding:0.1rem 0.5rem;border-radius:10px;font-size:0.7rem;background:${statusColors[a.status]||'#6b7280'}22;color:${statusColors[a.status]||'#6b7280'};">${statusLabels[a.status]||a.status}</span>
                </div>
                ${a.model ? `<div style="font-size:0.75rem;color:var(--text-secondary);">Модель: ${escapeHtml(a.model)}</div>` : ''}
                ${a.serial_number ? `<div style="font-size:0.75rem;color:var(--text-tertiary);">S/N: ${escapeHtml(a.serial_number)}</div>` : ''}
                ${a.remote_access_id ? `<div style="font-size:0.75rem;color:var(--jarvis-cyan);cursor:pointer;" onclick="navigator.clipboard.writeText('${escapeHtml(a.remote_access_id)}');showToast('ID скопирован','success');"><i class="fas fa-desktop"></i> ${escapeHtml(a.remote_access_id)}</div>` : ''}
            </div>
        `).join('');
    } catch (e) {
        console.error('Load assets error:', e);
        container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">Ошибка загрузки техники</p>';
    }
}

async function loadTicketFiles(ticket) {
    const container = document.getElementById('modalFiles');
    if (!container) return;
    
    try {
        let files = [];
        // Try to load attachments
        if (ticket.attachments && ticket.attachments.length > 0) {
            files = ticket.attachments;
        } else if (ticket.id) {
            const res = await fetch(`/api/tickets/${ticket.id}/attachments`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) files = await res.json();
        }
        
        if (!files || files.length === 0) {
            container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">Нет прикреплённых файлов</p>';
            return;
        }
        
        const fileIcons = { 'image': 'fa-image', 'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'xls': 'fa-file-excel', 'zip': 'fa-file-archive' };
        
        container.innerHTML = files.map(f => {
            const icon = f.content_type ? Object.entries(fileIcons).find(([k]) => f.content_type.includes(k))?.[1] || 'fa-file' : 'fa-file';
            const size = f.size ? (f.size < 1024 ? f.size + ' B' : f.size < 1048576 ? (f.size/1024).toFixed(1) + ' KB' : (f.size/1048576).toFixed(1) + ' MB') : '';
            return `<div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1);border-radius:10px;padding:0.75rem;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.75rem;cursor:pointer;" onclick="${f.url ? "window.open('" + f.url + "','_blank')" : ''}">
                <i class="fas ${icon}" style="color:var(--jarvis-cyan);font-size:1.2rem;"></i>
                <div style="flex:1;">
                    <div style="color:var(--text-primary);font-size:0.85rem;font-weight:600;">${escapeHtml(f.filename || f.name || 'Файл')}</div>
                    ${size ? `<div style="font-size:0.7rem;color:var(--text-tertiary);">${size}</div>` : ''}
                </div>
                <i class="fas fa-download" style="color:var(--text-low);font-size:0.8rem;"></i>
            </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">Нет прикреплённых файлов</p>';
    }
}

async function loadAssetsView() {
    const container = document.getElementById('assetsList');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i> Загрузка...</div>';
    
    try {
        const search = document.getElementById('assetSearchInput')?.value || '';
        const assetType = document.getElementById('assetTypeFilter')?.value || '';
        const assetStatus = document.getElementById('assetStatusFilter')?.value || '';
        
        let url = '/api/v1/features/assets?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (assetType) url += `asset_type=${encodeURIComponent(assetType)}&`;
        if (assetStatus) url += `status=${encodeURIComponent(assetStatus)}&`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (!res.ok) throw new Error('Failed to load assets');
        const assets = await res.json();
        
        if (assets.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-desktop" style="font-size:3rem;opacity:0.3;margin-bottom:1rem;display:block;"></i>Нет добавленной техники.<br><small>Нажмите «Добавить устройство» чтобы создать запись.</small></div>';
            return;
        }
        
        const icons = { laptop:'fa-laptop', desktop:'fa-desktop', server:'fa-server', printer:'fa-printer', router:'fa-wifi', phone:'fa-mobile-alt', monitor:'fa-tv', other:'fa-box' };
        const typeLabels = { laptop:'Ноутбук', desktop:'ПК', server:'Сервер', printer:'Принтер', router:'Роутер', phone:'Телефон', monitor:'Монитор', other:'Другое' };
        const statusLabels = { active:'Активно', repair:'В ремонте', decommissioned:'Списано' };
        const statusColors = { active:'#10b981', repair:'#f59e0b', decommissioned:'#6b7280' };
        
        container.innerHTML = assets.map(a => `
            <div class="glass-card" style="padding:1.25rem;cursor:default;transition:none;">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(0,212,255,0.15),rgba(124,58,237,0.1));display:flex;align-items:center;justify-content:center;">
                        <i class="fas ${icons[a.asset_type]||'fa-box'}" style="color:var(--jarvis-cyan);font-size:1.1rem;"></i>
                    </div>
                    <div style="flex:1;">
                        <h4 style="margin:0;font-size:1rem;color:var(--text-high);">${escapeHtml(a.name)}</h4>
                        <p style="margin:2px 0 0;font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(typeLabels[a.asset_type]||a.asset_type)}${a.model ? ' • '+escapeHtml(a.model) : ''}${a.company_name ? ' • '+escapeHtml(a.company_name) : ''}</p>
                    </div>
                    <span style="padding:0.2rem 0.6rem;border-radius:20px;font-size:0.7rem;font-weight:600;background:${statusColors[a.status]||'#6b7280'}22;color:${statusColors[a.status]||'#6b7280'};">${statusLabels[a.status]||a.status}</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:0.8rem;color:var(--text-med);">
                    ${a.serial_number ? `<span><i class="fas fa-barcode" style="margin-right:4px;"></i>${escapeHtml(a.serial_number)}</span>` : ''}
                    ${a.remote_access_id ? `<span style="color:var(--jarvis-cyan);cursor:pointer;" onclick="navigator.clipboard.writeText('${escapeHtml(a.remote_access_id)}');showToast('ID скопирован','success');"><i class="fas fa-desktop" style="margin-right:4px;"></i>${escapeHtml(a.remote_access_id)}</span>` : ''}
                    ${a.location ? `<span><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${escapeHtml(a.location)}</span>` : ''}
                </div>
                ${a.notes ? `<div style="font-size:0.75rem;color:var(--text-low);margin-top:6px;"><i class="fas fa-sticky-note" style="margin-right:4px;"></i>${escapeHtml(a.notes.substring(0,80))}${a.notes.length>80?'...':''}</div>` : ''}
            </div>
        `).join('');
    } catch (e) {
        console.error('Load assets error:', e);
        container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:1rem;display:block;color:var(--jarvis-rose);"></i>Ошибка загрузки техники</div>';
    }
}

function showAddAssetModal() {
    document.getElementById('addAssetForm').reset();
    
    const companySelect = document.getElementById('assetCompanyId');
    companySelect.innerHTML = '<option value="">Выберите организацию</option>';
    
    if (window._allCompanies && window._allCompanies.length) {
        window._allCompanies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            companySelect.appendChild(opt);
        });
    } else {
        api.getCompanies().then(companies => {
            window._allCompanies = companies;
            companySelect.innerHTML = '<option value="">Выберите организацию</option>';
            companies.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                companySelect.appendChild(opt);
            });
        }).catch(() => {});
    }
    
    // Load users for assigned_to
    const assignedSelect = document.getElementById('assetAssignedTo');
    assignedSelect.innerHTML = '<option value="">Не назначено</option>';
    if (window._allUsers && window._allUsers.length) {
        window._allUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.full_name || u.email;
            assignedSelect.appendChild(opt);
        });
    } else {
        api.getUsers().then(users => {
            window._allUsers = users;
            assignedSelect.innerHTML = '<option value="">Не назначено</option>';
            users.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.full_name || u.email;
                assignedSelect.appendChild(opt);
            });
        }).catch(() => {});
    }
    
    document.getElementById('addAssetModal').classList.remove('hidden');
}

async function handleCreateAsset(e) {
    e.preventDefault();
    const assignedToEl = document.getElementById('assetAssignedTo');
    const data = {
        name: document.getElementById('assetName').value,
        asset_type: document.getElementById('assetType').value,
        company_id: parseInt(document.getElementById('assetCompanyId').value),
        assigned_to: assignedToEl && assignedToEl.value ? parseInt(assignedToEl.value) : null,
        model: document.getElementById('assetModel').value || null,
        serial_number: document.getElementById('assetSerialNumber').value || null,
        remote_access_id: document.getElementById('assetRemoteAccessId').value || null,
        location: document.getElementById('assetLocation').value || null,
        status: document.getElementById('assetStatus').value,
        notes: document.getElementById('assetNotes').value || null
    };
    
    try {
        await featuresAPI.createAsset(data);
        showToast('Устройство добавлено', 'success');
        closeModal('addAssetModal');
        loadAssetsView();
    } catch (error) {
        showToast(error.message || 'Ошибка добавления устройства', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const addAssetForm = document.getElementById('addAssetForm');
    if (addAssetForm) addAssetForm.addEventListener('submit', handleCreateAsset);
    
    const assetSearchInput = document.getElementById('assetSearchInput');
    if (assetSearchInput) {
        let assetSearchTimeout;
        assetSearchInput.addEventListener('input', () => {
            clearTimeout(assetSearchTimeout);
            assetSearchTimeout = setTimeout(() => loadAssetsView(), 300);
        });
    }
    const assetTypeFilter = document.getElementById('assetTypeFilter');
    if (assetTypeFilter) assetTypeFilter.addEventListener('change', () => loadAssetsView());
    const assetStatusFilter = document.getElementById('assetStatusFilter');
    if (assetStatusFilter) assetStatusFilter.addEventListener('change', () => loadAssetsView());
});

