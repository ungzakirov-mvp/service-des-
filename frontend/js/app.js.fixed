console.log('app.js v3.5.5 LOADED');
// Service Desk Premium Frontend Application

let currentUser = null;
let activeView = 'dashboard';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkAuth();
    if (window.i18n) i18n.init();
    if (checkAuth()) {
        initWebSocket();
        loadNotifications();
    }
});

let volumeChart = null;
let statusChart = null;
let priorityChart = null;
let weekdayChart = null;

function initializeApp() {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    if (token) {
        showDashboard();
        // loadDashboardData() ???????????????????? ???????????? showView('dashboard')
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

    // Color preview sync
    const syncPreview = (inputId, previewId) => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (input && preview) {
            input.addEventListener('input', () => { preview.style.background = input.value; });
        }
    };
    syncPreview('newCompanyColor', 'newCompanyColorPreview');
    syncPreview('editCompanyColor', 'editCompanyColorPreview');

    // Logo upload
    const logoInput = document.getElementById('editCompanyLogoFile');
    if (logoInput) {
        logoInput.addEventListener('change', handleLogoUpload);
    }

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
        showToast('???????????? ??????????????????', 'success');
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

// Mobile Sidebar Toggle
function toggleMobileSidebar() {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('mobileToggle');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
        
        // Toggle icon between bars and times
        if (toggle) {
            const icon = toggle.querySelector('i');
            if (sidebar.classList.contains('mobile-open')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        }
    }
}

// Close mobile sidebar on navigation
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay && sidebar.classList.contains('mobile-open')) {
        // Check if clicked on a nav link
        if (e.target.closest('.side-link')) {
            toggleMobileSidebar();
        }
    }
});

// Handle resize - close sidebar on desktop
window.addEventListener('resize', function() {
    if (window.innerWidth > 1024) {
        const sidebar = document.getElementById('mainSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }
});

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
        showToast('???????? ???????????????? ??????????????!', 'success');
        showDashboard();
        // loadDashboardData() ???????????????????? ???????????? showView
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
        showToast('?????????????????????? ??????????????!', 'success');
        showDashboard();
        // loadDashboardData() ???????????????????? ???????????? showView
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function handleLogout() {
    api.clearToken();
    currentUser = null;
    showPage('loginPage');
    showToast('???? ?????????? ???? ??????????????', 'success');
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
        const nameEl = document.getElementById('userFullName');
        const emailEl = document.getElementById('userEmail');
        const roleEl = document.getElementById('userRoleBadge');
        const charEl = document.getElementById('userAvatarChar');

        if (nameEl) nameEl.textContent = currentUser.full_name || currentUser.email;
        if (emailEl) emailEl.textContent = currentUser.email;

        // Update top user info bar
        const topUserName = document.getElementById('topUserName');
        const topUserRole = document.getElementById('topUserRole');
        const topUserAvatar = document.getElementById('topUserAvatar');
        const topUserInfoBar = document.getElementById('topUserInfoBar');
        if (topUserName) topUserName.textContent = currentUser.full_name || currentUser.email;
        if (topUserRole) topUserRole.textContent = roleMap[(currentUser.role || '').toLowerCase()] || currentUser.role;
        if (topUserAvatar) topUserAvatar.textContent = (currentUser.full_name || currentUser.email).charAt(0).toUpperCase();
        if (topUserInfoBar) topUserInfoBar.style.display = 'flex';
        if (roleEl) {
            var roleMap = { 'super_admin': '?????????????? ??????????????????????????', 'admin': '??????????????????????????', 'agent': '??????????', 'client': '????????????', 'manager': '????????????????' };
            roleEl.textContent = roleMap[(currentUser.role || '').toLowerCase()] || currentUser.role.toUpperCase();
        }
        if (charEl) charEl.textContent = (currentUser.full_name || currentUser.email).charAt(0).toUpperCase();

        // Role-based visibility
        const role = currentUser.role;
        const auditLink = document.getElementById('auditNavLink');
        const usersLink = document.getElementById('usersNavLink');
        const crmLink = document.querySelector('[data-page="crm"]');

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

function animateCounter(el, target, suffix = '', duration = 800) {
    if (!el) return;
    const start = performance.now();
    const from = 0;
    const update = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(from + (target - from) * eased) + suffix;
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target + suffix;
    };
    requestAnimationFrame(update);
}

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
        // Guard: if old dashboard elements are missing, skip legacy rendering
        if (!totalTicketsEl) return;
        const lastUpdateTimeEl = document.getElementById('lastUpdateTime');
        
        animateCounter(totalTicketsEl, analytics.total_tickets || 0);
        animateCounter(activeUsersEl, analytics.active_users || 0);

        const totalSla = analytics.agent_performance.reduce((acc, curr) => acc + curr.sla_compliance_rate, 0);
        const avgSla = analytics.agent_performance.length > 0 ? (totalSla / analytics.agent_performance.length).toFixed(1) : "100";
        if (slaComplianceEl) animateCounter(slaComplianceEl, parseFloat(avgSla), '%', 1000);

        const totalHours = analytics.agent_performance.reduce((acc, curr) => acc + (curr.avg_resolution_hours || 0), 0);
        const avgHours = analytics.agent_performance.length > 0 ? (totalHours / analytics.agent_performance.length).toFixed(1) : "0";
        if (avgResolutionTimeEl) avgResolutionTimeEl.textContent = `${avgHours}??`;

        // Quick stats
        const criticalEl = document.getElementById('criticalTickets');
        const overdueEl = document.getElementById('overdueTickets');
        const todayEl = document.getElementById('todayTickets');
        const openEl = document.getElementById('openTickets');
        if (criticalEl) animateCounter(criticalEl, analytics.critical_count || 0);
        if (overdueEl) animateCounter(overdueEl, analytics.overdue_count || 0);
        if (todayEl) animateCounter(todayEl, analytics.today_count || 0);
        if (openEl) animateCounter(openEl, analytics.open_count || (analytics.total_tickets || 0));

        if (lastUpdateTimeEl) lastUpdateTimeEl.textContent = `??????????????????: ${new Date().toLocaleTimeString('ru-RU')}`;

        renderVolumeChart(analytics.volume_trends);
        renderStatusChart(analytics.status_distribution);
        renderPriorityChart(analytics.priority_distribution || analytics.status_distribution);
        renderWeekdayChart();
        renderAgentRatings(analytics.agent_performance);
        renderSlaBreaches(analytics.overdue_tickets || []);
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

function renderPriorityChart(dist) {
    const canvas = document.getElementById('priorityChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (priorityChart) priorityChart.destroy();
    const labels = dist.map(d => d.status_name || d.priority || d.label || '?');
    const data = dist.map(d => d.count || d.value || 0);
    if (!data.length) return;
    priorityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#71717a'],
                borderWidth: 2, borderColor: '#18181b', hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: 'white', padding: 16 } } },
            cutout: '65%'
        }
    });
}

function renderWeekdayChart() {
    const canvas = document.getElementById('weekdayChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (weekdayChart) weekdayChart.destroy();
    const days = ['????', '????', '????', '????', '????', '????', '????'];
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    const data = days.map((_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return { day: d.toISOString().slice(0, 10), label: days[i] };
    });
    weekdayChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: '????????????',
                data: data.map(() => Math.floor(Math.random() * 5) + 1),
                backgroundColor: ['rgba(16,185,129,0.6)', 'rgba(16,185,129,0.6)', 'rgba(16,185,129,0.6)', 'rgba(16,185,129,0.6)', 'rgba(16,185,129,0.6)', 'rgba(99,102,241,0.3)', 'rgba(99,102,241,0.3)'],
                borderColor: ['#10b981', '#10b981', '#10b981', '#10b981', '#10b981', '#6366f1', '#6366f1'],
                borderWidth: 1, borderRadius: 4, borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#71717a', font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 9 } } }
            }
        }
    });
    // Fetch real data from API to update
    api.getTickets({ limit: 100 }).then(tickets => {
        if (!tickets || !tickets.length) return;
        const counts = data.map(d => {
            return tickets.filter(t => t.created_at && t.created_at.startsWith(d.day)).length;
        });
        if (counts.every(c => c === 0)) return;
        weekdayChart.data.datasets[0].data = counts;
        weekdayChart.update();
    }).catch(() => {});
}

function renderSlaBreaches(tickets) {
    const container = document.getElementById('slaBreachList');
    if (!container) return;
    if (!tickets || !tickets.length) {
        container.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-tertiary);font-size:0.85rem;">??? ?????????????????? ??????</div>';
        return;
    }
    container.innerHTML = tickets.slice(0, 5).map(t => {
        const due = t.sla_due_at ? new Date(t.sla_due_at) : null;
        const days = due ? Math.floor((Date.now() - due) / (1000*60*60*24)) : '?';
        return `<div class="deadline-item urgent" style="cursor:pointer;" onclick="openTicketModal(${t.id})">
            <div class="deadline-date"><span class="dd-day">${days}</span><span class="dd-month">????.</span></div>
            <div class="deadline-content"><h4>#${t.readable_id} ${escapeHtml(t.title || '')}</h4><p>?????????????????? ${days} ????.</p></div>
        </div>`;
    }).join('');
}

function renderVolumeChart(trends) {
    const ctx = document.getElementById('volumeChart').getContext('2d');

    if (volumeChart) volumeChart.destroy();

    volumeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trends.map(t => t.date),
            datasets: [{
                label: '???????????????????? ????????????',
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
        container.innerHTML = '<div class="loading">?????? ????????????????????????</div>';
        return;
    }

    container.innerHTML = agents
        .sort((a, b) => b.resolved_count - a.resolved_count)
        .slice(0, 5)
        .map((agent, index) => `
        <div class="rating-item">
            <div class="rating-rank">${index + 1}</div>
            <div class="rating-info">
                <span class="rating-name">${escapeHtml(agent.full_name || '????????????????????')}</span>
                <span class="rating-val">${agent.resolved_count} ???????????? ??? ${agent.sla_compliance_rate}% SLA</span>
            </div>
        </div>
    `).join('');
}

function renderRequesterRatings(requesters) {
    const container = document.getElementById('requesterRatingList');
    if (!requesters.length) {
        container.innerHTML = '<div class="loading">?????? ????????????????????</div>';
        return;
    }

    container.innerHTML = requesters
        .map((req, index) => `
        <div class="rating-item">
            <div class="rating-rank">${index + 1}</div>
            <div class="rating-info">
                <span class="rating-name">${escapeHtml(req.full_name || '????????????????????')}</span>
                <span class="rating-val">${req.ticket_count} ????????????</span>
            </div>
        </div>
    `).join('');
}

function renderDeadlines(deadlines) {
    const container = document.getElementById('deadlineList');
    if (!deadlines.length) {
        container.innerHTML = '<div class="loading">?????????????????? ??????</div>';
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
                    <p>${d.status_name} ??? ${d.priority}</p>
                </div>
            </div>
        `;
    }).join('');
}

function filterRecentTickets(status) {
    var tickets = window.allRecentTickets || [];
    const filtered = status === 'all'
        ? tickets
        : tickets.filter(t => t.status.toLowerCase() === status.toLowerCase());

    renderRecentTickets(filtered);
}



// Tickets View
async function loadTickets() {
    if (_ticketsLoading) return;
    _ticketsLoading = true;
    var status = document.getElementById('statusFilter').value;
    var priority = document.getElementById('priorityFilter').value;

    var filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    try {
        var tickets = await api.getTickets(filters);
        renderTickets(tickets);
    } catch (error) {
        showToast('???????????? ???????????????? ??????????????', 'error');
    } finally {
        _ticketsLoading = false;
    }
}

function renderTickets(tickets) {
    var container = document.getElementById('ticketsList');
    if (!container) return;

    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:0.5rem;color:var(--text-tertiary);"></i><p>???????????? ???? ??????????????</p></div>';
        return;
    }

    var statusBg = function(name) {
        var n = (name || '').toLowerCase();
        if (n.includes('??????????') || n.includes('new')) return '#3b82f6';
        if (n.includes('??????????') || n.includes('progress')) return '#f59e0b';
        if (n.includes('????????????') || n.includes('awaiting')) return '#8b5cf6';
        if (n.includes('????????????') || n.includes('closed')) return '#6b7280';
        if (n.includes('??????????') || n.includes('resolved') || n.includes('????????????????') || n.includes('????????????')) return '#10b981';
        return '#6366f1';
    };
    var statusLabel = function(name) {
        var n = (name || '').toLowerCase();
        if (n.includes('??????????') || n.includes('new')) return '??????????';
        if (n.includes('??????????') || n.includes('progress')) return '?? ????????????';
        if (n.includes('????????????') || n.includes('awaiting')) return '??????????????';
        if (n.includes('??????????') || n.includes('resolved') || n.includes('????????????????')) return '????????????????';
        if (n.includes('????????????') || n.includes('closed') || n.includes('????????????')) return '????????????????';
        return name || '?';
    };
    var fmtSla = function(d) {
        if (!d) return '';
        // Append Z to treat as UTC (backend sends UTC timestamps)
        var slaDate = d.endsWith('Z') ? new Date(d) : new Date(d + 'Z');
        var diff = slaDate - new Date();
        if (diff < 0) return '????????????????????';
        var h = Math.floor(diff/3600000);
        var m = Math.floor((diff%3600000)/60000);
        if (h > 24) return Math.floor(h/24) + '?? ' + (h%24) + '??';
        if (h > 0) return h + '?? ' + m + '??';
        return m + ' ??????';
    };
    var slaClass = function(t) {
        if (!t.sla_due_at) return '';
        var slaDate = t.sla_due_at.endsWith('Z') ? new Date(t.sla_due_at) : new Date(t.sla_due_at + 'Z');
        var diff = slaDate - new Date();
        if (diff < 0) return 'sla-overdue';
        if (diff < 2*3600000) return 'sla-urgent';
        if (diff < 24*3600000) return 'sla-warning';
        return '';
    };
    var getInitials = function(name) {
        if (!name) return '?';
        var parts = name.split(' ');
        return (parts[0][0] || '') + (parts[1] ? parts[1][0] : '');
    };
    var avatarColor = function(name) {
        if (!name) return '#6366f1';
        var hash = 0;
        for (var i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
        var colors = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#14b8a6'];
        return colors[Math.abs(hash) % colors.length];
    };
    var getPriorityBadge = function(p) {
        p = (p || '').toLowerCase();
        if (p === 'critical') return {label:'??????????????????', color:'#ef4444', bg:'rgba(239,68,68,0.15)'};
        if (p === 'high') return {label:'??????????????', color:'#f59e0b', bg:'rgba(245,158,11,0.15)'};
        if (p === 'medium') return {label:'??????????????', color:'#3b82f6', bg:'rgba(59,130,246,0.15)'};
        if (p === 'low') return {label:'????????????', color:'#10b981', bg:'rgba(16,185,129,0.15)'};
        return {label:p || '???', color:'#6b7280', bg:'rgba(107,114,128,0.15)'};
    };
    var isOverdue = function(t) {
        return t.sla_due_at && new Date(t.sla_due_at) < new Date();
    };

    // Compute stats
    var total = tickets.length;
    var newCount = 0, progressCount = 0, awaitingCount = 0, resolvedCount = 0, closedCount = 0, overdueCount = 0;
    for (var ti = 0; ti < tickets.length; ti++) {
        var t = tickets[ti];
        var sn = (t.status_rel ? t.status_rel.name : t.status || '').toLowerCase();
        if (sn.includes('??????????') || sn.includes('new') || sn.includes('????????????')) newCount++;
        else if (sn.includes('??????????') || sn.includes('progress')) progressCount++;
        else if (sn.includes('????????????') || sn.includes('awaiting')) awaitingCount++;
        else if (sn.includes('??????????') || sn.includes('resolved')) resolvedCount++;
        else if (sn.includes('????????????') || sn.includes('closed')) closedCount++;
        if (isOverdue(t)) overdueCount++;
    }

    var html = '';

    // Stats widgets row
    html += '<div class="ticket-stats-row">';
    var stats = [
        {icon:'fa-inbox', label:'??????????', value:total, color:'#3b82f6'},
        {icon:'fa-star', label:'??????????', value:newCount, color:'#f59e0b'},
        {icon:'fa-spinner', label:'?? ????????????', value:progressCount, color:'#8b5cf6'},
        {icon:'fa-clock', label:'??????????????', value:awaitingCount, color:'#ec4899'},
        {icon:'fa-check-circle', label:'????????????', value:resolvedCount, color:'#10b981'},
        {icon:'fa-exclamation-triangle', label:'???????????????????? SLA', value:overdueCount, color:'#ef4444'}
    ];
    for (var si = 0; si < stats.length; si++) {
        html += '<div class="ticket-stat-card" style="border-left-color:' + stats[si].color + ';">' +
            '<div class="ticket-stat-icon" style="color:' + stats[si].color + ';"><i class="fas ' + stats[si].icon + '"></i></div>' +
            '<div class="ticket-stat-info"><div class="ticket-stat-value">' + stats[si].value + '</div><div class="ticket-stat-label">' + stats[si].label + '</div></div></div>';
    }
    html += '</div>';

    // Tickets list
    html += '<div class="tickets-card-list">';
    for (var ti = 0; ti < tickets.length; ti++) {
        var t = tickets[ti];
        var sc = slaClass(t);
        var sl = fmtSla(t.sla_due_at);
        var sBg = statusBg(t.status_rel ? t.status_rel.name : '');
        var sLbl = statusLabel(t.status_rel ? t.status_rel.name : '');
        var prio = getPriorityBadge(t.priority);
        var creatorName = t.creator ? (t.creator.full_name || t.creator.email || '???') : '???';
        var assigneeName = t.assignee ? (t.assignee.full_name || t.assignee.email || '???') : '???';
        var init = getInitials(creatorName);
        var ac = avatarColor(creatorName);
        var overdue = isOverdue(t);
        var hasSla = t.sla_due_at ? true : false;

        html += '<div class="ticket-modern-card" onclick="openTicketModal(' + t.id + ')">';
        
        // Left: avatar
        html += '<div class="ticket-card-left">';
        html += '<div class="ticket-avatar" style="background:' + ac + ';">' + init + '</div>';
        html += '</div>';

        // Center: content
        html += '<div class="ticket-card-center">';
        html += '<div class="ticket-card-title-row">';
        html += '<span class="ticket-card-id">#' + (t.readable_id || t.id) + '</span>';
        html += '<span class="ticket-card-title">' + escapeHtml(t.title) + '</span>';
        html += '</div>';
        html += '<div class="ticket-card-meta">';
        html += '<span class="ticket-card-meta-item"><i class="fas fa-user"></i> ' + escapeHtml(creatorName) + '</span>';
        html += '<span class="ticket-card-meta-item"><i class="fas fa-user-check"></i> ' + escapeHtml(assigneeName) + '</span>';
        if (t.created_at) {
            var d = new Date(t.created_at);
            html += '<span class="ticket-card-meta-item"><i class="fas fa-calendar"></i> ' + d.toLocaleDateString('ru-RU') + '</span>';
        }
        if (t.company_name) {
            html += '<span class="ticket-card-meta-item"><i class="fas fa-building"></i> ' + escapeHtml(t.company_name) + '</span>';
        }
        html += '</div>';
        html += '</div>';

        // Right: badges and actions
        html += '<div class="ticket-card-right">';
        // Status badge
        html += '<span class="ticket-badge status-badge" style="background:' + sBg + '22;color:' + sBg + ';border:1px solid ' + sBg + '44;">' + sLbl + '</span>';
        // Priority badge
        html += '<span class="ticket-badge prio-badge" style="background:' + prio.bg + ';color:' + prio.color + ';border:1px solid ' + prio.color + '44;">' + prio.label + '</span>';
        // SLA
        if (hasSla) {
            html += '<span class="ticket-badge sla-badge ' + sc + '" style="' + (overdue ? 'color:#ef4444;border-color:#ef4444;' : '') + '"><i class="fas fa-hourglass-half"></i> ' + sl + '</span>';
        }
        // Rating
        if (t.rating) {
            html += '<span class="ticket-badge" style="color:#f59e0b;"><i class="fas fa-star"></i> ' + t.rating + '</span>';
        }
        // Actions
        html += '<div class="ticket-card-actions" onclick="event.stopPropagation();">';
        if (!t.accepted_at && window._currentUser && window._currentUser.role !== 'client') {
            html += '<button class="ticket-btn accept-btn" onclick="acceptTicket(' + t.id + ')" title="??????????????"><i class="fas fa-check"></i></button>';
        }
        if (t.status_rel && t.status_rel.name === '?? ????????????' && window._currentUser && window._currentUser.role !== 'client') {
            html += '<button class="ticket-btn resolve-btn" onclick="resolveTicketAction(' + t.id + ')" title="??????????????????"><i class="fas fa-check-double"></i></button>';
        }
        if (t.status_rel && t.status_rel.is_final) {
            html += '<button class="ticket-btn reopen-btn" onclick="reopenTicketAction(' + t.id + ')" title="??????????????"><i class="fas fa-redo"></i></button>';
        }
        if (window._currentUser && (window._currentUser.role === 'admin' || window._currentUser.role === 'super_admin')) {
            html += '<button class="ticket-btn assign-btn" onclick="showAssignModal(' + t.id + ')" title="??????????????????"><i class="fas fa-user-plus"></i></button>';
        }
        html += '</div>';
        html += '</div>';

        html += '</div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

async function acceptTicket(ticketId) {
    try {
        await api.acceptTicket(ticketId);
        showToast('?????????? ????????????', 'success');
        loadTickets();
    } catch (e) { showToast(e.message || '????????????', 'error'); }
}

async function closeTicketAction(ticketId) {
    if (!confirm('?????????????? ???????????')) return;
    try {
        await api.closeTicket(ticketId);
        showToast('?????????? ????????????', 'success');
        loadTickets();
    } catch (e) { showToast(e.message || '????????????', 'error'); }
}

async function resolveTicketAction(ticketId) {
    var comment = prompt('?????????????????????? ?? ?????????????????????? ???????????? (??????????????????????????):');
    if (comment === null) return;
    try {
        await api.resolveTicket(ticketId, comment);
        showToast('?????????? ????????????????! ???????????? ??????????????????.', 'success');
        loadTickets();
    } catch (e) { showToast(e.message || '????????????', 'error'); }
}

async function reopenTicketAction(ticketId) {
    var reason = prompt('?????????????? ????????????????????????:');
    if (reason === null) return;
    try {
        await api.reopenTicket(ticketId, reason || '?????????? ????????????????????');
        showToast('?????????? ????????????????????', 'success');
        loadTickets();
    } catch (e) { showToast(e.message || '????????????', 'error'); }
}

async function showAssignModal(ticketId) {
    window._assignTicketId = ticketId;
    const sel = document.getElementById('assignAgentSelect');
    sel.innerHTML = '<option value="">???????????????? ??????????????...</option>';
    document.getElementById('assignModal').classList.remove('hidden');
    try {
        const users = await api.getUsers();
        const agents = users.filter(u => u.role === 'agent' || u.role === 'admin' || u.role === 'super_admin');
        sel.innerHTML = '<option value="">???????????????? ??????????????????????</option>';
        agents.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = (a.full_name || a.email) + ' (' + getRoleLabel(a.role) + ')';
            sel.appendChild(opt);
        });
        if (agents.length === 0) {
            sel.innerHTML = '<option value="">?????? ??????????????</option>';
        }
    } catch (e) {
        sel.innerHTML = '<option value="">???????????? ????????????????</option>';
        showToast('???? ?????????????? ?????????????????? ??????????????', 'error');
    }
}

async function handleAssignTicket(e) {
    e.preventDefault();
    const agentId = document.getElementById('assignAgentSelect').value;
    if (!agentId) { showToast('???????????????? ??????????????????????', 'error'); return; }
    try {
        await api.assignTicket(window._assignTicketId, parseInt(agentId));
        showToast('?????????????????????? ????????????????', 'success');
        closeModal('assignModal');
        loadTickets();
    } catch (e) { showToast(e.message || '????????????', 'error'); }
}

// Create Ticket
async function handleCreateTicket(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('.btn-creator-submit') || e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ????????????????...';
    }

    const title = document.getElementById('ticketTitle').value;
    const description = document.getElementById('ticketDescription').value;
    var priority = document.querySelector('input[name="priority"]:checked')?.value || 'medium';
    const scheduledAt = document.getElementById('ticketScheduledAt')?.value;
    const assignee = document.getElementById('ticketAssignee')?.value;

    const data = { title, description, priority };
    if (scheduledAt) data.scheduled_at = new Date(scheduledAt).toISOString();
    if (assignee) data.assigned_to = parseInt(assignee);

    try {
        const result = await api.createTicket(data);
        showToast('??? ???????????? ?????????????? ?? ???????????????????? ???? ??????????????????!', 'success');
        e.target.reset();
        resetPriorityCards();
        
        // ?????????????????????????? ???? ???????????? ??????????????
        document.querySelectorAll('.side-link').forEach(l => l.classList.remove('active'));
        document.querySelector('[data-page="tickets"]').classList.add('active');
        showView('tickets');
        loadTickets();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = '<span class="btn-content"><i class="fas fa-paper-plane"></i><span>?????????????? ????????????</span></span><div class="btn-ripple"></div>';
        }
    }
}

// Initialize Ticket Creator Form
function initTicketCreator() {
    // Priority cards selection
    var priorityCards = document.querySelectorAll('.priority-card');
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

    // Load agents for assignee select (only if authenticated)
    const token = localStorage.getItem('access_token');
    if (token) {
        loadAgentsForSelect();
    }
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
        
        select.innerHTML = '<option value="">??????????????????????????</option>';
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
    // Hide monitoring on non-monitoring views
    const mc = document.getElementById('monitoringContainer');
    if (mc && viewName !== 'monitoring') mc.style.display = 'none';
    activeView = viewName;
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    const viewEl = document.getElementById(`${viewName}View`);
    if (viewEl) viewEl.classList.remove('hidden');

    // Toggle quick actions bar visibility
    const quickActions = document.getElementById('quickActionsBar');
    if (viewName === 'tickets' || viewName === 'create') {
        if (quickActions) quickActions.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    } else {
        if (quickActions) quickActions.style.display = 'none';
    }

    // Load data for the view
    if (viewName === 'tickets') {
        loadTickets();
    } else if (viewName === 'dashboard') {
        // HUD handles its own data loading
        if (typeof loadHUDDashboard === 'function') {
            loadHUDDashboard();
        } else {
            loadDashboardData();
        }
    } else if (viewName === 'crm') {
        loadCRMData();
    } else if (viewName === 'monitoring') {
        loadMonitoringData();
    } else if (viewName === 'audit') {
        loadAuditLogData();
    } else if (viewName === 'users') {
        loadUsers();
    } else if (viewName === 'assets') {
        loadAssetsView();
    } else if (viewName === 'tariffs') {
        if (typeof loadTariffsView === 'function') loadTariffsView();
    } else if (viewName === 'create') {
        loadOpenTickets();
    } else if (viewName === 'newTicketsView') {
        showNewTicketsPanel();
    } else if (viewName === 'demoDashboard') {
        if (typeof loadCompanyDashboard === 'function') loadCompanyDashboard();
    } else if (viewName === 'dashsettings') {
        if (typeof loadDashboardSettings === 'function') loadDashboardSettings();
    }
}

function navigateToTickets(filter) {
    const statusEl = document.getElementById('statusFilter');
    var priorityEl = document.getElementById('priorityFilter');
    if (statusEl) statusEl.value = '';
    if (priorityEl) priorityEl.value = '';
    showView('tickets');
}

let currentTicketFilter = 'all';

function showNewTicketsPanel() {
    let listPanel = document.getElementById('newTicketsSimpleList');
    if (!listPanel) {
        listPanel = document.createElement('div');
        listPanel.id = 'newTicketsSimpleList';
        listPanel.style.cssText = 'position:fixed;top:70px;left:20px;right:20px;bottom:70px;background:linear-gradient(180deg,#0a0a1a 0%,#12121a 100%);z-index:999999;border:1px solid rgba(0,212,255,0.3);border-radius:16px;box-shadow:0 0 40px rgba(0,212,255,0.1);overflow:hidden;';
        document.body.appendChild(listPanel);
    }
    listPanel.style.display = 'block';
    
    listPanel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem;border-bottom:1px solid rgba(0,212,255,0.2);">
            <h2 style="color:#00d4ff;margin:0;font-size:1.25rem;"><i class="fas fa-ticket-alt"></i> ?????????????? ?????????????????????? ????????????</h2>
            <button onclick="closeNewTicketsPanel()" style="background:none;border:none;color:#666;font-size:1.5rem;cursor:pointer;">&times;</button>
        </div>
        <div style="display:flex;gap:0.5rem;padding:0.75rem;background:rgba(0,0,0,0.3);">
            <button onclick="setTicketFilter('all')" class="filter-btn active" data-filter="all">??????</button>
            <button onclick="setTicketFilter('new')" class="filter-btn" data-filter="new">??????????</button>
            <button onclick="setTicketFilter('open')" class="filter-btn" data-filter="open">?? ????????????</button>
            <button onclick="setTicketFilter('resolved')" class="filter-btn" data-filter="resolved">????????????????</button>
        </div>
        <div id="newTicketsListContent" style="padding:0.5rem;overflow-y:auto;height:calc(100%-120px);">????????????????...</div>
    `;
    
    loadNewTicketsList();
}

function closeNewTicketsPanel() {
    const panel = document.getElementById('newTicketsSimpleList');
    if (panel) panel.style.display = 'none';
}

function setTicketFilter(filter) {
    currentTicketFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
        btn.style.background = btn.dataset.filter === filter ? 'rgba(0,212,255,0.2)' : 'transparent';
        btn.style.border = btn.dataset.filter === filter ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.1)';
    });
    loadNewTicketsList();
}

function loadNewTicketsList() {
    const content = document.getElementById('newTicketsListContent');
    if (!content) return;
    
    content.innerHTML = '<p style="color:#666;text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> ????????????????...</p>';
    
    fetch('/api/tickets/', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
    })
    .then(r => r.json())
    .then(tickets => {
        let filtered = tickets;
        if (currentTicketFilter === 'new') {
            filtered = tickets.filter(t => t.status_rel?.name === '??????????');
        } else if (currentTicketFilter === 'open') {
            filtered = tickets.filter(t => t.status_rel?.name && t.status_rel.name !== '??????????' && t.status_rel.name !== '????????????' && t.status_rel.name !== '??????????' && t.status_rel.name !== '?????????????? ??????????????');
        } else if (currentTicketFilter === 'resolved') {
            filtered = tickets.filter(t => t.status_rel?.name === '????????????' || t.status_rel?.name === '??????????' || t.status_rel?.name === '?????????????? ??????????????');
        }
        
        if (filtered.length === 0) {
            content.innerHTML = '<p style="color:#666;text-align:center;padding:2rem;">?????? ????????????</p>';
            return;
        }
        
        content.innerHTML = filtered.map(t => {
            const statusColor = t.status_rel?.name === '??????????' ? '#3B82F6' : t.status_rel?.name === '????????????' ? '#10B981' : '#F59E0B';
            var priorityColor = t.priority === 'critical' ? '#EF4444' : t.priority === 'high' ? '#F59E0B' : '#00D4FF';
            
            return `<div style="padding:1rem;margin-bottom:0.5rem;background:linear-gradient(135deg,rgba(26,26,58,0.8) 0%,rgba(20,20,45,0.9) 100%);border-radius:12px;border-left:4px solid ${priorityColor};cursor:pointer;transition:all 0.2s;" 
                onmouseover="this.style.background='rgba(0,212,255,0.1)'"
                onmouseout="this.style.background='linear-gradient(135deg,rgba(26,26,58,0.8) 0%,rgba(20,20,45,0.9) 100%)'"
                onclick="openTicketModal(${t.id});closeNewTicketsPanel();">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                    <span style="color:${priorityColor};font-weight:bold;font-size:1.1rem;">#${t.id}</span>
                    <span style="background:${statusColor}22;color:${statusColor};padding:0.2rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:600;">${t.status_rel?.name || '??????????'}</span>
                </div>
                <div style="color:#fff;font-size:0.95rem;margin-bottom:0.5rem;">${t.title || '?????? ??????????????????'}</div>
                <div style="display:flex;gap:1rem;font-size:0.8rem;color:#888;">
                    <span><i class="fas fa-user"></i> ${t.creator?.email?.split('@')[0] || '-'}</span>
                    <span><i class="fas fa-clock"></i> ${new Date(t.created_at).toLocaleDateString('ru')}</span>
                    ${t.assignee ? `<span><i class="fas fa-user-check"></i> ${t.assignee.email?.split('@')[0]}</span>` : ''}
                </div>
            </div>`;
        }).join('');
    })
    .catch(e => content.innerHTML = '<p style="color:#EF4444;text-align:center;padding:2rem;">????????????: ' + e.message + '</p>');
}

async function loadOpenTickets() {
    console.log('loadOpenTickets called');
    const container = document.getElementById('openTicketsList');
    console.log('Container:', container);
    if (!container) {
        alert('Container not found!');
        return;
    }
    
    container.innerHTML = '<p style="color:var(--text-tertiary);font-size:0.85rem;">????????????????...</p>';
    
    const token = localStorage.getItem('access_token');
    console.log('Token exists:', !!token);
    
    try {
        const res = await fetch('/api/tickets/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Response status:', res.status);
        
        if (!res.ok) {
            container.innerHTML = '<p style="color:var(--jarvis-rose);font-size:0.85rem;">????????????: ' + res.status + '</p>';
            return;
        }
        
        var tickets = await res.json();
        console.log('Tickets:', JSON.stringify(tickets).substring(0, 500));
        console.log('First ticket keys:', Object.keys(tickets[0] || {}));
        
        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<p style="color:var(--text-tertiary);font-size:0.85rem;">?????? ????????????</p>';
            return;
        }
        
        console.log('Rendering', tickets.length, 'tickets');
        
        container.innerHTML = '';
        
        tickets.forEach((t, i) => {
            console.log('Rendering ticket', i, t.id);
            const div = document.createElement('div');
            div.id = 'ticket-' + t.id;
            div.style.cssText = 'cursor:pointer;padding:0.75rem;margin-bottom:0.5rem;background:#1a1a3a;border-radius:8px;border:1px solid #00d4ff;display:flex;align-items:center;gap:0.5rem;';
            div.onclick = () => openTicketModal(t.id);
            div.innerHTML = '<span style="color:#00d4ff;font-weight:bold;font-size:1.2rem;">#' + t.id + '</span><span style="color:#fff;font-size:1rem;">' + (t.title || t.subject || '?????? ??????????????????') + '</span>';
            container.appendChild(div);
        });
        
        console.log('Container children after:', container.children.length);
    } catch (e) {
        console.error('Load open tickets error:', e);
        container.innerHTML = '<p style="color:var(--jarvis-rose);font-size:0.85rem;">????????????: ' + e.message + '</p>';
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
        showToast('???????????? ???????????????? CRM', 'error');
    }
}

function renderCompanies(companies) {
    const container = document.getElementById('companyCardsGrid');
    if (!companies || companies.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 3rem;">???????????????? ???? ??????????????. ?????????????? ???????????? ?????????????????? ?????????? ????????????????.</p>';
        return;
    }

    const industryIcons = {
        'IT': 'fa-laptop-code',
        '????????????????': 'fa-shopping-cart',
        '????????????????????????': 'fa-industry',
        '??????????????': 'fa-university',
        '????????????????': 'fa-heartbeat',
        '??????????????????????': 'fa-graduation-cap',
        '??????????????????': 'fa-truck',
        '??????????????????????????': 'fa-hard-hat',
        'HoReCa': 'fa-utensils',
        '????????????': 'fa-building'
    };

    container.innerHTML = companies.map(company => {
        const icon = industryIcons[company.industry] || 'fa-building';
        const initial = company.name.charAt(0).toUpperCase();
        const contacts = [];
        if (company.phone) contacts.push(`<span><i class="fas fa-phone" style="font-size:0.7rem;margin-right:4px;"></i>${escapeHtml(company.phone)}</span>`);
        if (company.email) contacts.push(`<span><i class="fas fa-envelope" style="font-size:0.7rem;margin-right:4px;"></i>${escapeHtml(company.email)}</span>`);
        if (company.website) contacts.push(`<span><i class="fas fa-globe" style="font-size:0.7rem;margin-right:4px;"></i>${escapeHtml(company.website)}</span>`);

        const logoHtml = company.logo_url
            ? `<img src="${company.logo_url}" alt="" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:2px solid rgba(255,255,255,0.1);">`
            : `<div class="company-logo" style="width:48px;height:48px;font-size:1.2rem;position:relative;">
                    ${initial}
                    <span style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:${company.color || '#0066CC'};border:2px solid var(--bg-canvas);"></span>
                </div>`;
        return `
        <div class="company-card glass-card" onclick="openCompanyDetail(${company.id})" style="cursor:pointer;">
            <div class="company-card-header">
                ${logoHtml}
                <div class="company-card-info">
                    <h3 style="margin:0;font-size:1rem;color:var(--text-high);">${escapeHtml(company.name)}</h3>
                    ${company.legal_name ? `<p style="margin:2px 0 0;font-size:0.75rem;color:var(--text-low);">${escapeHtml(company.legal_name)}</p>` : ''}
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                        <span class="badge badge-small" style="background:rgba(99,102,241,0.1);color:var(--accent-indigo);border:1px solid rgba(99,102,241,0.2);padding:2px 8px;border-radius:12px;font-size:0.7rem;">
                            <i class="fas ${icon}" style="margin-right:3px;"></i>${escapeHtml(company.industry || '?????? ??????????????')}
                        </span>
                        ${company.inn ? `<span style="font-size:0.7rem;color:var(--text-low);">??????: ${escapeHtml(company.inn)}</span>` : ''}
                    </div>
                </div>
            </div>
            ${contacts.length ? `<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;font-size:0.8rem;color:var(--text-med);">${contacts.join('')}</div>` : ''}
            ${company.address ? `<div style="margin-top:8px;font-size:0.8rem;color:var(--text-low);"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${escapeHtml(company.address)}</div>` : ''}
            <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.7rem;color:var(--text-low);">${formatDate(company.created_at)}</span>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();openCompanyDetail(${company.id})" title="??????????????" style="background:rgba(99,102,241,0.1);color:var(--accent-indigo);border:none;border-radius:8px;cursor:pointer;padding:6px 10px;">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();showEditCompanyModal(${company.id})" title="??????????????????????????" style="background:rgba(99,102,241,0.1);color:#6366f1;border:none;border-radius:8px;cursor:pointer;padding:6px 10px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();confirmDeleteCompanyById(${company.id},'${escapeHtml(company.name)}')" title="??????????????" style="background:rgba(239,68,68,0.1);color:#ef4444;border:none;border-radius:8px;cursor:pointer;padding:6px 10px;">
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
    const cc = company.color || '#0066CC';
    document.getElementById('editCompanyColor').value = cc;
    document.getElementById('editCompanyColorPreview').style.background = cc;

    // Logo
    document.getElementById('editCompanyLogoUrl').value = company.logo_url || '';
    const preview = document.getElementById('editLogoPreview');
    const img = document.getElementById('editLogoImg');
    if (company.logo_url) {
        img.src = company.logo_url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

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
        description: document.getElementById('editCompanyDescription').value || null,
        color: document.getElementById('editCompanyColor').value || '#0066CC',
        logo_url: document.getElementById('editCompanyLogoUrl').value || null
    };

    try {
        await api.request(`/crm/companies/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        showToast('???????????????? ??????????????????', 'success');
        closeModal('editCompanyModal');
        loadCRMData();
    } catch (error) {
        showToast(error.message || '???????????? ???????????????????? ????????????????', 'error');
    }
}

async function confirmDeleteCompany() {
    const id = document.getElementById('editCompanyId').value;
    const name = document.getElementById('editCompanyName').value;
    if (!confirm(`?????????????? ?????????????????????? "${name}"?\n?????? ???????????????? ???????????? ????????????????.`)) return;

    try {
        await api.request(`/crm/companies/${id}`, { method: 'DELETE' });
        showToast('?????????????????????? ??????????????', 'success');
        closeModal('editCompanyModal');
        loadCRMData();
    } catch (error) {
        showToast(error.message || '???????????? ????????????????', 'error');
    }
}

async function confirmDeleteCompanyById(id, name) {
    if (!confirm(`?????????????? ?????????????????????? "${name}"?\n?????? ???????????????? ???????????? ????????????????.`)) return;

    try {
        await api.request(`/crm/companies/${id}`, { method: 'DELETE' });
        showToast('?????????????????????? ??????????????', 'success');
        loadCRMData();
    } catch (error) {
        showToast(error.message || '???????????? ????????????????', 'error');
    }
}

async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const companyId = document.getElementById('editCompanyId').value;
    if (!companyId) { showToast('?????????????? ?????????????????? ????????????????', 'warning'); return; }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const result = await api.uploadCompanyLogo(companyId, formData);
        document.getElementById('editCompanyLogoUrl').value = result.logo_url;
        const preview = document.getElementById('editLogoPreview');
        const img = document.getElementById('editLogoImg');
        img.src = result.logo_url;
        preview.style.display = 'block';
        showToast('?????????????? ????????????????', 'success');
    } catch (error) {
        showToast(error.message || '???????????? ???????????????? ????????????????', 'error');
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
        '??????????': 'new',
        '??_????????????': 'progress',
        '??????????': 'resolved',
        '?????????????? ??????????????': 'resolved',
        '????????????': 'closed'
    };
    return map[status] || 'new';
}

function getPriorityClass(priority) {
    const map = {
        '????????????': 'low',
        '??????????????': 'medium',
        '??????????????': 'high',
        '??????????????????': 'critical'
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
    
    // ?????????????????? ?????? ???????????? ?????????????????????? ?????????? ????????????????
    try {
        const [ticket, timeline] = await Promise.all([
            api.getTicket(ticketId),
            api.getTicketTimeline(ticketId)
        ]);
        
        currentTicketForRating = ticket;

        // ???????????????????? ?????????????? ???????????? ?????????? ???????????????? ????????????
        const modal = document.getElementById('ticketModal');
        modal.classList.remove('hidden');
        
        // Show floating action bar
        if (typeof showFloatingBar === 'function') {
            showFloatingBar();
        }

        // Basic Info
        document.getElementById('modalTicketTitle').textContent = `?????????? #${ticket.readable_id} - ${ticket.title}`;
        document.getElementById('modalTicketDescription').innerHTML = ticket.description || '?????? ????????????????';

        // Badges
        document.getElementById('modalStatusBadge').innerHTML = `<span class="badge badge-${getStatusClass(ticket.status_rel?.name || '??????????')}">${ticket.status_rel?.name || '??????????'}</span>`;
        document.getElementById('modalPriorityBadge').innerHTML = `<span class="badge badge-${getPriorityClass(ticket.priority)}">${ticket.priority}</span>`;

        // Rating UI
        const clientActions = document.getElementById('clientActions');
        if (clientActions) {
            const isResolved = ['?????????????? ??????????????', '??????????', '????????????', 'resolved', 'closed'].includes(ticket.status_rel?.name?.toLowerCase());
            const isClosed = ['????????????', 'closed'].includes(ticket.status_rel?.name?.toLowerCase());
            if (currentUser && currentUser.role === 'client' && isResolved) {
                clientActions.classList.remove('hidden');
                const btnRate = document.getElementById('btnRateTicket');
                const ratingDisplay = document.getElementById('ticketRatingDisplay');
                const closeSection = document.getElementById('clientCloseSection');
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
                if (closeSection) {
                    if (isClosed) {
                        closeSection.innerHTML = '<p style="color:var(--text-med);font-size:0.85rem;">??? ???????????? ??????????????</p>';
                    } else {
                        closeSection.innerHTML = `<button class="btn btn-primary" onclick="closeTicketAction(${ticket.id})" style="width:100%;margin-top:0.5rem;">??? ?????????????? ????????????</button>`;
                    }
                    closeSection.classList.remove('hidden');
                }
            } else {
                clientActions.classList.add('hidden');
                const closeSection = document.getElementById('clientCloseSection');
                if (closeSection) closeSection.classList.add('hidden');
            }
        }

        // SLA
        if (ticket.sla_due_at) {
            startSlaTimer(ticket.sla_due_at);
        } else {
            document.getElementById('modalSlaDeadline').textContent = '???? ????????????????????';
            document.getElementById('modalSlaDeadline').classList.remove('sla-urgent');
        }

        // Assignee
        const assigneeEl = document.getElementById('modalAssignee');
        if (ticket.assignee) {
            const name = ticket.assignee.full_name || ticket.assignee.email || '???';
            const email = ticket.assignee.email ? ` (${ticket.assignee.email})` : '';
            assigneeEl.innerHTML = `<span style="font-weight:500;">${escapeHtml(name)}</span>${email ? `<br><span style="font-size:0.75rem;color:var(--text-med);">${escapeHtml(email)}</span>` : ''}`;
            // Add assign button for admins
            if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
                assigneeEl.innerHTML += `<br><button class="btn btn-small btn-outline" onclick="showAssignModal(${ticket.id})" style="margin-top:6px;font-size:0.7rem;">??? ??????????????</button>`;
            }
        } else {
            assigneeEl.innerHTML = '???';
            if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
                assigneeEl.innerHTML += `<br><button class="btn btn-small btn-outline" onclick="showAssignModal(${ticket.id})" style="margin-top:6px;font-size:0.7rem;">??? ??????????????????</button>`;
            }
        }

        // Workflow button visibility
        const statusName = ticket.status_rel?.name || '';
        const isNew = statusName === '??????????';
        const isInProgress = statusName === '?? ????????????';
        const isAwaitingClient = statusName === '?????????????? ??????????????';
        const isClosed = ticket.status_rel?.is_final;
        const isAgent = currentUser?.role !== 'client';
        
        const agentActions = document.getElementById('agentActions');
        const resolveBtn = document.getElementById('btnResolveTicket');
        const closeBtn = document.getElementById('btnCloseTicket');
        
        if (agentActions) {
            if (isAgent) {
                agentActions.classList.remove('hidden');
                // Show resolve button only if ticket is in progress
                if (resolveBtn) {
                    resolveBtn.classList.toggle('hidden', !isInProgress);
                }
                // Show close button only if not closed
                if (closeBtn) {
                    closeBtn.classList.toggle('hidden', isClosed);
                }
            } else {
                agentActions.classList.add('hidden');
            }
        }

        // Admin actions (delete ticket)
        const adminActions = document.getElementById('adminActions');
        if (adminActions) {
            const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
            adminActions.classList.toggle('hidden', !isAdmin);
        }

        // Timeline - ?????? ???????????????? ????????
        renderModalTimeline(timeline);

        // Load client assets
        loadClientAssets(ticket);

        // Load ticket files/attachments
        loadTicketFiles(ticket);
        
        // Load checklist if agent
        window.currentTicketId = ticketId;
        if (typeof loadChecklist === 'function') {
            loadChecklist(ticketId);
        }

    } catch (error) {
        console.error('Modal error:', error);
        showToast('???????????? ???????????????? ?????????????? ????????????', 'error');
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

async function deleteTicket() {
    if (!currentTicketId) return;
    if (!confirm('?????????? ?????????????? ????????????? ?????? ???????????????? ????????????????????.')) return;

    try {
        await api.request(`/tickets/${currentTicketId}`, { method: 'DELETE' });
        showToast('???????????? ??????????????', 'success');
        closeTicketModal();
        loadTickets();
    } catch (error) {
        showToast(error.message || '???????????? ???????????????? ????????????', 'error');
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
            el.textContent = '????????????????????!';
            el.classList.add('sla-urgent');
            clearInterval(slaInterval);
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        el.textContent = `${hours}?? ${mins}?? ????????????????`;

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
        document.getElementById('modalTotalTime').textContent = `${total.total_hours} ??.`;

        const entries = await api.getTicketTimeEntries(ticketId);
        renderTimeEntries(entries);
    } catch (error) {
        console.error('Time tracking error:', error);
    }
}

function renderTimeEntries(entries) {
    const container = document.getElementById('modalTimeList');
    if (!entries.length) {
        container.innerHTML = '<p class="text-muted">?????? ??????????????</p>';
        return;
    }

    container.innerHTML = entries.map(e => `
        <div class="time-log-item">
            <strong>${(e.minutes / 60).toFixed(1)}??</strong> - ${escapeHtml(e.description || '?????? ????????????????')}
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

            const mins = parseInt(minutesEl.value) || 0;
            if (mins < 1 && !descEl.value.trim()) {
                showToast('?????????????? ???????????? ?????? ????????????????', 'error');
                return;
            }
            try {
                await api.logTime({
                    ticket_id: currentTicketId,
                    minutes: mins,
                    description: descEl.value
                });
                showToast('?????????? ??????????????????', 'success');
                minutesEl.value = '';
                descEl.value = '';
                loadTicketTime(currentTicketId);
            } catch (error) {
                showToast('???????????? ???????????????????? ??????????????', 'error');
            }
        });
    }
}, 1000);

// --- Audit Log Logic ---
async function loadAuditLogData() {
    const tableBody = document.getElementById('auditLogTableBody');
    if (!tableBody) return;

    try {
        const logs = await api.getAuditLogs({ limit: 50 });
        renderAuditLogs(logs);
    } catch (error) {
        showToast('???????????? ???????????????? ????????????', 'error');
    }
}

function renderAuditLogs(logs) {
    const container = document.getElementById('auditLogTableBody');
    if (!logs || logs.length === 0) {
        container.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">???????????? ???? ??????????????</td></tr>';
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
        const usersLink = document.getElementById('usersNavLink');
        if (auditLink) {
            auditLink.style.display = isAdmin ? 'flex' : 'none';
        }
        if (usersLink) {
            if (isAdmin) {
                usersLink.classList.remove('hidden');
                usersLink.style.display = 'flex';
            } else {
                usersLink.classList.add('hidden');
                usersLink.style.display = 'none';
            }
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

// Auto-refresh tickets every 10 seconds
setInterval(async function() {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    // Only refresh if on tickets or dashboard view
    if (activeView === 'tickets' || activeView === 'dashboard') {
        loadTickets();
    }
}, 10000);

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
            showToast(event.message || '?????????? ????????????????', 'info');
            loadTickets();
            if (activeView === 'dashboard') loadDashboardData();
            break;

        case 'TICKET_CREATED':
            // ???????????????????? ???????? ?????????? ??????????????????
            if (currentUser && event.data && currentUser.id !== event.data.created_by_id) {
                showNewTicketNotification(event.data);
            }
            // ???????????? ?????????????????? ????????????
            loadTickets();
            if (activeView === 'dashboard') {
                loadDashboardData();
            }
            if (activeView === 'tickets') {
                loadTickets();
            }
            break;

        case 'TICKET_COMMENT_ADDED':
            if (activeView === 'tickets' && currentTicketId === event.data.ticket_id) {
                loadTicketTimeline(event.data.ticket_id);
            }
            showToast(`?????????? ?????????????????? ?? ???????????? #${event.data.ticket_id}`, 'info');
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
        container.innerHTML = '<p class="text-muted" style="padding: 1rem; text-align: center;">?????? ?????????? ??????????????????????</p>';
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
        showToast('???????????? ?????? ???????????????????? ??????????????????????', 'error');
    }
}

// --- Users & Companies Management ---

async function loadUsers() {
    try {
        const roleFilterEl = document.getElementById('userRoleFilter');
        const role = roleFilterEl ? roleFilterEl.value : '';
        const searchInput = document.getElementById('userSearchInput');
        const search = searchInput ? searchInput.value.toLowerCase() : '';

        var filters = {};
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
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 1rem;">???????????????????????? ???? ??????????????</td></tr>';
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
                            <div class="font-medium">${escapeHtml(user.full_name || '???? ??????????????')}</div>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="badge badge-${getRoleBadgeColor(user.role)}">${getRoleLabel(user.role)}</span></td>
                <td>${company ? escapeHtml(company.name) : '<span class="text-muted">???</span>'}</td>
                <td>
                    <button class="btn btn-icon btn-small" onclick="showEditUserModal(${user.id})" title="??????????????????????????">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Errors loading users', error);
        showToast('???????????? ???????????????? ??????????????????????????', 'error');
    }
}

function getRoleLabel(role) {
    const labels = {
        'admin': '??????????',
        'agent': '??????????',
        'client': '????????????',
        'super_admin': '????????????????????'
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
    companySelect.innerHTML = '<option value="">???? ??????????????</option>';
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
        showToast('???????????????????????? ????????????????', 'success');
        closeModal('editUserModal');
        loadUsers();
    } catch (error) {
        showToast(error.message || '???????????? ????????????????????', 'error');
    }
}

async function confirmDeleteUser() {
    const id = document.getElementById('editUserId').value;
    const email = document.getElementById('editUserEmail').value;
    if (!confirm(`?????????????? ???????????????????????? "${email}"?\n?????? ???????????????? ???????????? ????????????????.`)) return;

    try {
        await api.request(`/users/${id}`, { method: 'DELETE' });
        showToast('???????????????????????? ????????????', 'success');
        closeModal('editUserModal');
        loadUsers();
    } catch (error) {
        showToast(error.message || '???????????? ????????????????', 'error');
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
        companySelect.innerHTML = '<option value="">???? ??????????????</option>';
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
        showToast('???????????????????????? ????????????', 'success');
        closeModal('createUserModal');
        loadUsers();
    } catch (error) {
        showToast(error.message || '???????????? ???????????????? ????????????????????????', 'error');
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
        description: document.getElementById('newCompanyDescription').value || null,
        color: document.getElementById('newCompanyColor').value || '#0066CC'
    };

    try {
        await api.createCompany(data);
        showToast('???????????????? ??????????????', 'success');
        closeModal('createCompanyModal');
        document.getElementById('createCompanyForm').reset();
        loadCRMData();
    } catch (error) {
        showToast(error.message || '???????????? ???????????????? ????????????????', 'error');
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
        ['????. ????????????????', company.legal_name], ['??????', company.inn],
        ['??????????????', company.industry], ['??????????????', company.phone],
        ['Email', company.email], ['??????-????????', company.website],
        ['??????????', company.domain], ['??????????', company.address],
    ];
    const infoHtml = fields.filter(f => f[1]).map(([label, val]) =>
        `<div style="padding:8px 0;border-bottom:1px solid var(--prism-border);"><span style="color:var(--text-low);font-size:0.75rem;">${label}</span><br><span style="color:var(--text-high);">${escapeHtml(val)}</span></div>`
    ).join('');
    document.getElementById('detailCompanyInfo').innerHTML = infoHtml || '<p style="color:var(--text-low);grid-column:1/-1;text-align:center;">?????? ????????????</p>';

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
        container.innerHTML = '<p style="color:var(--text-low);text-align:center;padding:2rem;">?????? ????????????????</p>';
        return;
    }
    const statusColors = { active: '#10b981', expiring: '#f59e0b', expired: '#ef4444', cancelled: '#71717a' };
    const statusLabels = { active: '??????????????', expiring: '????????????????', expired: '??????????????', cancelled: '????????????????' };
    const cycleLabels = { monthly: '??????????????????????', yearly: '??????????????????', quarterly: '????????????????????????????' };

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
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();editSubscription(${s.id})" title="??????????????????????????" style="background:rgba(99,102,241,0.1);color:#6366f1;border:none;border-radius:8px;cursor:pointer;padding:4px 8px;"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-icon btn-small" onclick="event.stopPropagation();deleteSub(${s.id})" title="??????????????" style="background:rgba(239,68,68,0.1);color:#ef4444;border:none;border-radius:8px;cursor:pointer;padding:4px 8px;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:0.8rem;color:var(--text-med);">
                ${s.license_count ? `<span><i class="fas fa-users" style="margin-right:4px;"></i>${s.license_count} ????????????????</span>` : ''}
                ${s.price ? `<span><i class="fas fa-tag" style="margin-right:4px;"></i>${escapeHtml(s.price)} ${s.currency || 'UZS'}</span>` : ''}
                ${s.billing_cycle ? `<span>${cycleLabels[s.billing_cycle] || s.billing_cycle}</span>` : ''}
                ${expDate ? `<span class="${urgency}" style="${urgency === 'urgent' ? 'color:#ef4444;font-weight:600;' : urgency === 'warning' ? 'color:#f59e0b;' : ''}"><i class="fas fa-clock" style="margin-right:4px;"></i>${daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} ????.` : '??????????????') : ''} ${expDate.toLocaleDateString('ru')}</span>` : ''}
                ${s.m365_tenant_id ? `<span style="color:var(--accent-indigo);"><i class="fab fa-microsoft" style="margin-right:4px;"></i>M365</span>` : ''}
            </div>
        </div>`;
    }).join('');
}

function showAddSubModal() {
    document.getElementById('subModalTitle').textContent = '???????????????? ????????????????';
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
    document.getElementById('subModalTitle').textContent = '?????????????????????????? ????????????????';
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
            showToast('???????????????? ??????????????????', 'success');
        } else {
            await api.createSubscription(window._detailCompanyId, data);
            showToast('???????????????? ??????????????????', 'success');
        }
        closeModal('subModal');
        loadSubscriptions(window._detailCompanyId);
    } catch (error) {
        showToast(error.message || '???????????? ???????????????????? ????????????????', 'error');
    }
}

async function deleteSub(subId) {
    if (!confirm('?????????????? ?????????????????')) return;
    try {
        await api.deleteSubscription(subId);
        showToast('???????????????? ??????????????', 'success');
        loadSubscriptions(window._detailCompanyId);
    } catch (error) {
        showToast(error.message || '???????????? ????????????????', 'error');
    }
}

// --- Employees ---
async function loadEmployees(companyId) {
    try {
        const [emps, contacts] = await Promise.all([
            api.getEmployees(companyId),
            api.getCompanyContacts(companyId).catch(() => [])
        ]);
        renderEmployees(emps, contacts);
    } catch (e) { console.error(e); }
}

function renderEmployees(emps, contacts) {
    const container = document.getElementById('detailEmpsList');
    const contactItems = (contacts || []).map(u => ({
        id: u.id,
        full_name: u.full_name || u.email,
        position: u.role === 'admin' ? '??????????????????????????' : u.role === 'agent' ? '??????????' : '????????????',
        email: u.email,
        phone: '',
        department: '',
        is_active: true,
        m365_email: u.anudesk_email || '',
        m365_license: '',
        _is_user: true
    }));
    const all = [...(emps || []), ...contactItems];
    if (!all || all.length === 0) {
        container.innerHTML = '<p style="color:var(--text-low);text-align:center;padding:2rem;">?????? ??????????????????????</p>';
        return;
    }
    container.innerHTML = all.map(e => `
        <div class="sub-card glass-card" style="padding:1rem;margin-bottom:0.75rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-indigo);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;">${(e.full_name || '?').charAt(0)}</div>
                    <div>
                        <strong style="color:var(--text-high);">${escapeHtml(e.full_name)}</strong>
                        ${e.position ? `<span style="color:var(--text-low);margin-left:8px;font-size:0.8rem;">${escapeHtml(e.position)}</span>` : ''}
                        ${!e.is_active ? '<span style="margin-left:8px;font-size:0.7rem;color:#71717a;">??????????????????</span>' : ''}
                        ${e.m365_license ? '<span style="margin-left:8px;color:var(--accent-indigo);font-size:0.75rem;"><i class="fab fa-microsoft"></i> M365</span>' : ''}
                    </div>
                </div>
                <div style="display:flex;gap:6px;">
                    ${e._is_user ? '<span style="font-size:0.75rem;color:var(--text-med);padding:4px 8px;">?????????????? ????????????</span>' : `
                    <button class="btn btn-icon btn-small" onclick="editEmployee(${e.id})" title="??????????????????????????" style="background:rgba(99,102,241,0.1);color:#6366f1;border:none;border-radius:8px;cursor:pointer;padding:4px 8px;"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-icon btn-small" onclick="deleteEmp(${e.id})" title="??????????????" style="background:rgba(239,68,68,0.1);color:#ef4444;border:none;border-radius:8px;cursor:pointer;padding:4px 8px;"><i class="fas fa-trash"></i></button>
                    `}
                </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:0.8rem;color:var(--text-med);">
                ${e._is_user ? '<span style="color:var(--jarvis-cyan);font-size:0.75rem;padding:0.15rem 0.5rem;background:rgba(0,212,255,0.1);border-radius:4px;"><i class="fas fa-user-check"></i> ???????????????????????? ??????????????</span>' : ''}
                ${e.department ? `<span><i class="fas fa-building" style="margin-right:4px;"></i>${escapeHtml(e.department)}</span>` : ''}
                ${e.email ? `<span><i class="fas fa-envelope" style="margin-right:4px;"></i>${escapeHtml(e.email)}</span>` : ''}
                ${e.phone ? `<span><i class="fas fa-phone" style="margin-right:4px;"></i>${escapeHtml(e.phone)}</span>` : ''}
                ${e.m365_email ? `<span style="color:var(--accent-indigo);"><i class="fab fa-microsoft" style="margin-right:4px;"></i>${escapeHtml(e.m365_email)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function showAddEmpModal() {
    document.getElementById('empModalTitle').textContent = '???????????????? ????????????????????';
    document.getElementById('empForm').reset();
    document.getElementById('empId').value = '';
    document.getElementById('empIsActive').checked = true;
    document.getElementById('empModal').classList.remove('hidden');
}

async function editEmployee(empId) {
    const emps = await api.getEmployees(window._detailCompanyId);
    const emp = emps.find(e => e.id === empId);
    if (!emp) return;
    document.getElementById('empModalTitle').textContent = '?????????????????????????? ????????????????????';
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
            showToast('?????????????????? ????????????????', 'success');
        } else {
            await api.createEmployee(window._detailCompanyId, data);
            showToast('?????????????????? ????????????????', 'success');
        }
        closeModal('empModal');
        loadEmployees(window._detailCompanyId);
    } catch (error) {
        showToast(error.message || '???????????? ????????????????????', 'error');
    }
}

async function deleteEmp(empId) {
    if (!confirm('?????????????? ?????????????????????')) return;
    try {
        await api.deleteEmployee(empId);
        showToast('?????????????????? ????????????', 'success');
        loadEmployees(window._detailCompanyId);
    } catch (error) {
        showToast(error.message || '???????????? ????????????????', 'error');
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
        showToast('????????????????????, ?????????????????? ????????????', 'warning');
        return;
    }

    try {
        await api.rateTicket(ticketId, rating, comment);
        showToast('?????????????? ???? ??????????!', 'success');
        closeModal('ratingModal');
        closeTicketModal();
        loadTickets();
    } catch (error) {
        showToast(error.message || '???????????? ???????????????? ????????????', 'error');
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

    var priorityColors = { critical:'#f43f5e', high:'#f59e0b', medium:'#00d4ff', low:'#10b981' };
    var priorityLabels = { critical:'??????????????????', high:'??????????????', medium:'??????????????', low:'????????????' };
    const pc = priorityColors[ticket.priority] || '#00d4ff';
    const pl = priorityLabels[ticket.priority] || ticket.priority;

    const notif = document.createElement('div');
    notif.style.cssText = 'background:linear-gradient(135deg,rgba(0,212,255,0.95),rgba(124,58,237,0.95));border:1px solid rgba(0,212,255,0.5);border-radius:16px;padding:20px;color:white;box-shadow:0 10px 40px rgba(0,212,255,0.4);position:relative;overflow:hidden;';

    notif.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:24px;">\uD83D\uDD14</div>
            <div style="flex:1;">
                <h3 style="margin:0;font-size:16px;font-weight:700;">?????????? ????????????!</h3>
                <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;"><span style="color:${pc};font-weight:600;">\u25CF ${pl}</span> ??????????????????</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">\u00D7</button>
        </div>
        <div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:12px;margin-bottom:15px;">
            <p style="margin:0 0 4px 0;font-weight:600;font-size:15px;">${escapeHtml(ticket.title || '?????? ??????????????????')}</p>
            <p style="margin:0;font-size:13px;opacity:0.8;line-height:1.4;">${escapeHtml((ticket.description || '').substring(0, 120))}</p>
        </div>
        <div style="display:flex;gap:10px;">
            <button onclick="assignTicketToMe(${ticket.id}, this.parentElement.parentElement)" style="flex:1;background:linear-gradient(135deg,#10b981,#059669);border:none;color:white;padding:12px 16px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-check"></i> ?????????????? ????????????
            </button>
            <button onclick="openTicketModal(${ticket.id}); this.closest('[id=newTicketNotifications]') && this.closest('[id=newTicketNotifications]').remove();" style="flex:1;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:white;padding:12px 16px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-eye"></i> ??????????????????????
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
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ????????????????...';
        btn.disabled = true;

        await api.assignTicket(ticketId, currentUser.id);

        showToast('???????????? ??????????????!', 'success');
        notifElement.style.opacity = '0';
        notifElement.style.transition = 'opacity 0.3s';
        setTimeout(() => notifElement.remove(), 300);

        loadTickets();
        if (activeView === 'dashboard') loadDashboardData();
    } catch (error) {
        console.error('Error assigning ticket:', error);
        showToast(error.message || '???????????? ?????? ???????????????? ????????????', 'error');
        const btn = notifElement.querySelector('button');
        btn.innerHTML = '<i class="fas fa-check"></i> ?????????????? ????????????';
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
            container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">?????? ?????????????????????? ??????????????</p>';
            return;
        }
        
        const icons = { laptop:'fa-laptop', desktop:'fa-desktop', server:'fa-server', printer:'fa-printer', router:'fa-wifi', phone:'fa-mobile-alt', monitor:'fa-tv', other:'fa-box' };
        const statusLabels = { active:'??????????????', repair:'?? ??????????????', decommissioned:'??????????????' };
        const statusColors = { active:'#10b981', repair:'#f59e0b', decommissioned:'#6b7280' };
        
        container.innerHTML = assets.map(a => `
            <div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1);border-radius:10px;padding:0.75rem;margin-bottom:0.5rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
                    <i class="fas ${icons[a.asset_type]||'fa-box'}" style="color:var(--jarvis-cyan);font-size:0.9rem;"></i>
                    <strong style="color:var(--text-primary);font-size:0.85rem;">${escapeHtml(a.name)}</strong>
                    <span style="margin-left:auto;padding:0.1rem 0.5rem;border-radius:10px;font-size:0.7rem;background:${statusColors[a.status]||'#6b7280'}22;color:${statusColors[a.status]||'#6b7280'};">${statusLabels[a.status]||a.status}</span>
                </div>
                ${a.model ? `<div style="font-size:0.75rem;color:var(--text-secondary);">????????????: ${escapeHtml(a.model)}</div>` : ''}
                ${a.serial_number ? `<div style="font-size:0.75rem;color:var(--text-tertiary);">S/N: ${escapeHtml(a.serial_number)}</div>` : ''}
                ${a.remote_access_id ? `<div style="font-size:0.75rem;color:var(--jarvis-cyan);cursor:pointer;" onclick="navigator.clipboard.writeText('${escapeHtml(a.remote_access_id)}');showToast('ID ????????????????????','success');"><i class="fas fa-desktop"></i> ${escapeHtml(a.remote_access_id)}</div>` : ''}
            </div>
        `).join('');
    } catch (e) {
        console.error('Load assets error:', e);
        container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">???????????? ???????????????? ??????????????</p>';
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
            container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">?????? ?????????????????????????? ????????????</p>';
            return;
        }
        
        const fileIcons = { 'image': 'fa-image', 'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'xls': 'fa-file-excel', 'zip': 'fa-file-archive' };
        
        container.innerHTML = files.map(f => {
            const icon = f.content_type ? Object.entries(fileIcons).find(([k]) => f.content_type.includes(k))?.[1] || 'fa-file' : 'fa-file';
            const size = f.size ? (f.size < 1024 ? f.size + ' B' : f.size < 1048576 ? (f.size/1024).toFixed(1) + ' KB' : (f.size/1048576).toFixed(1) + ' MB') : '';
            return `<div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1);border-radius:10px;padding:0.75rem;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.75rem;cursor:pointer;" onclick="${f.url ? "window.open('" + f.url + "','_blank')" : ''}">
                <i class="fas ${icon}" style="color:var(--jarvis-cyan);font-size:1.2rem;"></i>
                <div style="flex:1;">
                    <div style="color:var(--text-primary);font-size:0.85rem;font-weight:600;">${escapeHtml(f.filename || f.name || '????????')}</div>
                    ${size ? `<div style="font-size:0.7rem;color:var(--text-tertiary);">${size}</div>` : ''}
                </div>
                <i class="fas fa-download" style="color:var(--text-low);font-size:0.8rem;"></i>
            </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">?????? ?????????????????????????? ????????????</p>';
    }
}

async function loadAssetsView() {
    const container = document.getElementById('assetsList');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i> ????????????????...</div>';
    await loadAssetFilters();
    await loadAssetStats();
    try {
        const search = document.getElementById('assetSearchInput')?.value || '';
        const assetType = document.getElementById('assetTypeFilter')?.value || '';
        const assetStatus = document.getElementById('assetStatusFilter')?.value || '';
        const assetCondition = document.getElementById('assetConditionFilter')?.value || '';
        const assetCompany = document.getElementById('assetCompanyFilter')?.value || '';
        let url = '/api/assets?';
        if (search) url += 'search=' + encodeURIComponent(search) + '&';
        if (assetType) url += 'asset_type=' + encodeURIComponent(assetType) + '&';
        if (assetStatus) url += 'status=' + encodeURIComponent(assetStatus) + '&';
        if (assetCondition) url += 'condition=' + encodeURIComponent(assetCondition) + '&';
        if (assetCompany) url += 'company_id=' + encodeURIComponent(assetCompany) + '&';
        const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') } });
        if (!res.ok) throw new Error('Failed to load assets');
        const assets = await res.json();
        if (assets.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-desktop" style="font-size:3rem;opacity:0.3;margin-bottom:1rem;display:block;"></i>\u041d\u0435\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043d\u043e\u0439 \u0442\u0435\u0445\u043d\u0438\u043a\u0438.<br><small>\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e\u00bb \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c.</small></div>';
            return;
        }
        container.innerHTML = assets.map(function(a) { return assetCardHtml(a); }).join('');
    } catch (e) {
        console.error('Load assets error:', e);
        container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:1rem;display:block;color:var(--jarvis-rose);"></i>\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0442\u0435\u0445\u043d\u0438\u043a\u0438</div>';
    }
}

function assetCardHtml(a) {
    var icons = { laptop:'fa-laptop', desktop:'fa-desktop', server:'fa-server', printer:'fa-print', network:'fa-wifi', monitor:'fa-tv', phone:'fa-mobile-alt', tablet:'fa-tablet', other:'fa-box' };
    var typeLabels = { laptop:'\u041d\u043e\u0443\u0442\u0431\u0443\u043a', desktop:'\u041f\u041a', server:'\u0421\u0435\u0440\u0432\u0435\u0440', printer:'\u041f\u0440\u0438\u043d\u0442\u0435\u0440', network:'\u0421\u0435\u0442\u0435\u0432\u043e\u0435', monitor:'\u041c\u043e\u043d\u0438\u0442\u043e\u0440', phone:'\u0422\u0435\u043b\u0435\u0444\u043e\u043d', tablet:'\u041f\u043b\u0430\u043d\u0448\u0435\u0442', other:'\u0414\u0440\u0443\u0433\u043e\u0435' };
    var statusColors = { active:'#10b981', in_repair:'#f59e0b', in_storage:'#6b7280', decommissioned:'#ef4444', lost:'#dc2626' };
    var statusLabels = { active:'\u0410\u043a\u0442\u0438\u0432\u043d\u043e', in_repair:'\u0412 \u0440\u0435\u043c\u043e\u043d\u0442\u0435', in_storage:'\u041d\u0430 \u0441\u043a\u043b\u0430\u0434\u0435', decommissioned:'\u0421\u043f\u0438\u0441\u0430\u043d\u043e', lost:'\u0423\u0442\u0435\u0440\u044f\u043d\u043e' };
    var condColors = { new:'#10b981', excellent:'#34d399', good:'#6ee7b7', fair:'#fbbf24', poor:'#f97316', damaged:'#ef4444', broken:'#dc2626' };
    var condLabels = { new:'\u041d\u043e\u0432\u044b\u0439', excellent:'\u041e\u0442\u043b\u0438\u0447\u043d\u043e\u0435', good:'\u0425\u043e\u0440\u043e\u0448\u0435\u0435', fair:'\u0423\u0434\u043e\u0432\u043b\u0435\u0442\u0432\u043e\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0435', poor:'\u041f\u043b\u043e\u0445\u043e\u0435', damaged:'\u041f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u043e', broken:'\u0421\u043b\u043e\u043c\u0430\u043d\u043e' };
    var sColor = statusColors[a.status] || '#6b7280';
    var cColor = condColors[a.condition] || '#6b7280';
    return '<div class="glass-card" style="padding:14px;cursor:default;transition:none;">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
            '<div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,rgba(0,212,255,0.15),rgba(124,58,237,0.1));display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                '<i class="fas ' + (icons[a.asset_type] || 'fa-box') + '" style="color:var(--jarvis-cyan);font-size:1rem;"></i>' +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                    '<h4 style="margin:0;font-size:0.95rem;color:var(--text-high);font-weight:600;">' + escapeHtml(a.name) + '</h4>' +
                    (a.readable_id ? '<span style="font-size:0.7rem;color:var(--text-secondary);background:rgba(0,212,255,0.1);padding:1px 6px;border-radius:4px;">' + escapeHtml(a.readable_id) + '</span>' : '') +
                '</div>' +
                '<p style="margin:2px 0 0;font-size:0.78rem;color:var(--text-secondary);">' + escapeHtml(typeLabels[a.asset_type] || a.asset_type) +
                    (a.manufacturer ? ' \u2022 ' + escapeHtml(a.manufacturer) : '') +
                    (a.model ? ' ' + escapeHtml(a.model) : '') +
                    (a.company_name ? ' \u2022 ' + escapeHtml(a.company_name) : '') +
                '</p>' +
            '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
            '<span style="padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:600;background:' + sColor + '22;color:' + sColor + ';border:1px solid ' + sColor + '44;">' + (statusLabels[a.status] || a.status) + '</span>' +
            '<span style="padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:600;background:' + cColor + '22;color:' + cColor + ';border:1px solid ' + cColor + '44;">' + (condLabels[a.condition] || a.condition) + '</span>' +
            (a.assigned_user_name ? '<span style="padding:2px 8px;border-radius:12px;font-size:0.7rem;background:rgba(99,102,241,0.15);color:#818cf8;"><i class="fas fa-user"></i> ' + escapeHtml(a.assigned_user_name) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;font-size:0.78rem;color:var(--text-med);margin-bottom:8px;">' +
            (a.serial_number ? '<span><i class="fas fa-barcode" style="margin-right:3px;width:12px;"></i>' + escapeHtml(a.serial_number) + '</span>' : '') +
            (a.inventory_number ? '<span><i class="fas fa-tag" style="margin-right:3px;width:12px;"></i>' + escapeHtml(a.inventory_number) + '</span>' : '') +
            (a.location ? '<span><i class="fas fa-map-marker-alt" style="margin-right:3px;width:12px;"></i>' + escapeHtml(a.location) + '</span>' : '') +
        '</div>' +
        (a.notes ? '<div style="font-size:0.72rem;color:var(--text-low);margin-bottom:8px;border-top:1px solid rgba(255,255,255,0.05);padding-top:6px;"><i class="fas fa-sticky-note" style="margin-right:4px;"></i>' + escapeHtml(a.notes.substring(0, 100)) + (a.notes.length > 100 ? '...' : '') + '</div>' : '') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;">' +
            '<button class="btn btn-small btn-ghost" onclick="showAssetDetail(' + a.id + ')" style="font-size:0.75rem;"><i class="fas fa-info-circle"></i> \u0414\u0435\u0442\u0430\u043b\u0438</button>' +
            (a.status === 'active' ? '<button class="btn btn-small btn-ghost" onclick="openAssignModal(' + a.id + ',\'' + escapeHtml(a.name) + '\')" style="font-size:0.75rem;"><i class="fas fa-user-check"></i> \u0412\u044b\u0434\u0430\u0442\u044c</button>' : '') +
            (a.assigned_to ? '<button class="btn btn-small btn-ghost" onclick="handleReturnAsset(' + a.id + ')" style="font-size:0.75rem;color:var(--jarvis-rose);"><i class="fas fa-undo"></i> \u0412\u0435\u0440\u043d\u0443\u0442\u044c</button>' : '') +
            (a.status !== 'decommissioned' && a.status !== 'lost' ? '<button class="btn btn-small btn-ghost" onclick="openMoveModal(' + a.id + ',\'' + escapeHtml(a.name) + '\')" style="font-size:0.75rem;"><i class="fas fa-arrows-alt"></i> \u041f\u0435\u0440\u0435\u043c\u0435\u0441\u0442\u0438\u0442\u044c</button>' : '') +
            '<button class="btn btn-small btn-ghost" onclick="showEditAssetModal(' + a.id + ')" style="font-size:0.75rem;"><i class="fas fa-edit"></i></button>' +
            '<button class="btn btn-small btn-ghost" onclick="if(confirm(\'\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e?\'))handleDeleteAsset(' + a.id + ')" style="font-size:0.75rem;color:var(--jarvis-rose);"><i class="fas fa-trash"></i></button>' +
        '</div>' +
    '</div>';
}

async function loadAssetFilters() {
    try {
        var r = await fetch('/api/assets/meta/types', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') } });
        if (!r.ok) return;
        var meta = await r.json();
        var typeSel = document.getElementById('assetTypeFilter');
        var statusSel = document.getElementById('assetStatusFilter');
        var condSel = document.getElementById('assetConditionFilter');
        if (typeSel && meta.types) {
            typeSel.innerHTML = '<option value="">\u0412\u0441\u0435 \u0442\u0438\u043f\u044b</option>' +
                meta.types.map(function(t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('');
        }
        if (statusSel && meta.statuses) {
            statusSel.innerHTML = '<option value="">\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b</option>' +
                meta.statuses.map(function(s) { return '<option value="' + s.id + '">' + s.label + '</option>'; }).join('');
        }
        if (condSel && meta.conditions) {
            condSel.innerHTML = '<option value="">\u0412\u0441\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u044f</option>' +
                meta.conditions.map(function(c) { return '<option value="' + c.id + '">' + c.label + '</option>'; }).join('');
        }
        var addType = document.getElementById('assetType');
        if (addType && meta.types) {
            addType.innerHTML = meta.types.map(function(t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('');
        }
        var addStatus = document.getElementById('assetStatus');
        if (addStatus && meta.statuses) {
            addStatus.innerHTML = meta.statuses.map(function(s) { return '<option value="' + s.id + '">' + s.label + '</option>'; }).join('');
        }
        var addCond = document.getElementById('assetCondition');
        if (addCond && meta.conditions) {
            addCond.innerHTML = meta.conditions.map(function(c) { return '<option value="' + c.id + '">' + c.label + '</option>'; }).join('');
        }
    } catch(e) { console.error('Load filters error:', e); }
}

async function loadAssetStats() {
    try {
        var r = await fetch('/api/assets/stats', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') } });
        if (!r.ok) return;
        var s = await r.json();
        var el = function(id) { return document.getElementById(id); };
        if (el('assetStatTotal')) el('assetStatTotal').textContent = s.total || 0;
        if (el('assetStatActive')) el('assetStatActive').textContent = s.active || 0;
        if (el('assetStatRepair')) el('assetStatRepair').textContent = s.in_repair || 0;
        if (el('assetStatDecommissioned')) el('assetStatDecommissioned').textContent = s.decommissioned || 0;
    } catch(e) { console.error('Load stats error:', e); }
}

// === ADD / EDIT ASSET ===
var _editingAssetId = null;

// showAddAssetModal defined below (line ~3951)

async function showEditAssetModal(id) {
    _editingAssetId = id;
    document.getElementById('addAssetModalTitle').textContent = '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e';
    document.getElementById('addAssetSubmitBtn').innerHTML = '<i class="fas fa-save"></i> \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c';
    try {
        var r = await fetch('/api/assets/' + id, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') } });
        if (!r.ok) throw new Error('Not found');
        var a = await r.json();
        document.getElementById('assetName').value = a.name || '';
        document.getElementById('assetType').value = a.asset_type || 'other';
        document.getElementById('assetManufacturer').value = a.manufacturer || '';
        document.getElementById('assetModel').value = a.model || '';
        document.getElementById('assetSerialNumber').value = a.serial_number || '';
        document.getElementById('assetInventoryNumber').value = a.inventory_number || '';
        document.getElementById('assetCondition').value = a.condition || 'good';
        document.getElementById('assetStatus').value = a.status || 'active';
        document.getElementById('assetPurchaseDate').value = a.purchase_date ? a.purchase_date.split('T')[0] : '';
        document.getElementById('assetPurchaseCost').value = a.purchase_cost || '';
        document.getElementById('assetWarrantyEnd').value = a.warranty_end ? a.warranty_end.split('T')[0] : '';
        document.getElementById('assetSupplier').value = a.supplier || '';
        document.getElementById('assetLocation').value = a.location || '';
        document.getElementById('assetRemoteAccessId').value = a.remote_access_id || '';
        document.getElementById('assetRemoteAccessPassword').value = a.remote_access_password || '';
        document.getElementById('assetNotes').value = a.notes || '';
        if (a.specifications) {
            document.getElementById('assetSpecCpu').value = a.specifications.cpu || '';
            document.getElementById('assetSpecRam').value = a.specifications.ram || '';
            document.getElementById('assetSpecDisk').value = a.specifications.disk || '';
            document.getElementById('assetSpecGpu').value = a.specifications.gpu || '';
            document.getElementById('assetSpecOs').value = a.specifications.os || '';
            document.getElementById('assetSpecIp').value = a.specifications.ip_address || '';
        }
        await populateCompanySelect('assetCompanyId', a.company_id);
        await populateUserSelect('assetAssignedTo', a.assigned_to);
        var m = document.getElementById('addAssetModal');
        m.classList.remove('hidden');
        m.style.display = 'flex';
    } catch(e) {
        showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438', 'error');
    }
}

async function handleCreateAsset(e) {
    e.preventDefault();
    var data = {
        name: document.getElementById('assetName').value,
        asset_type: document.getElementById('assetType').value,
        manufacturer: document.getElementById('assetManufacturer').value || null,
        model: document.getElementById('assetModel').value || null,
        serial_number: document.getElementById('assetSerialNumber').value || null,
        inventory_number: document.getElementById('assetInventoryNumber').value || null,
        condition: document.getElementById('assetCondition').value,
        status: document.getElementById('assetStatus').value,
        purchase_date: document.getElementById('assetPurchaseDate').value || null,
        purchase_cost: document.getElementById('assetPurchaseCost').value || null,
        warranty_end: document.getElementById('assetWarrantyEnd').value || null,
        supplier: document.getElementById('assetSupplier').value || null,
        location: document.getElementById('assetLocation').value || null,
        remote_access_id: document.getElementById('assetRemoteAccessId').value || null,
        remote_access_password: document.getElementById('assetRemoteAccessPassword').value || null,
        assigned_to: parseInt(document.getElementById('assetAssignedTo').value) || null,
        company_id: parseInt(document.getElementById('assetCompanyId').value),
        notes: document.getElementById('assetNotes').value || null,
        specifications: {
            cpu: document.getElementById('assetSpecCpu').value || null,
            ram: document.getElementById('assetSpecRam').value || null,
            disk: document.getElementById('assetSpecDisk').value || null,
            gpu: document.getElementById('assetSpecGpu').value || null,
            os: document.getElementById('assetSpecOs').value || null,
            ip_address: document.getElementById('assetSpecIp').value || null
        }
    };
    // Clean null specs
    Object.keys(data.specifications).forEach(function(k) { if (!data.specifications[k]) delete data.specifications[k]; });
    try {
        var url = '/api/assets';
        var method = 'POST';
        if (_editingAssetId) { url += '/' + _editingAssetId; method = 'PUT'; }
        var r = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('access_token') },
            body: JSON.stringify(data)
        });
        if (!r.ok) { var err = await r.json(); throw new Error(err.detail || 'Error'); }
        showToast(_editingAssetId ? '\u0423\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e' : '\u0423\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e', 'success');
        closeModal('addAssetModal');
        loadAssetsView();
    } catch(error) {
        showToast(error.message || '\u041e\u0448\u0438\u0431\u043a\u0430', 'error');
    }
}

// === ASSIGN / RETURN / MOVE ===
var _activeAssetId = null;
var _activeAssetName = '';

function openAssignModal(id, name) {
    _activeAssetId = id;
    _activeAssetName = name;
    var na = document.getElementById('assignAssetName');
    if (na) na.textContent = '????????????????????: ' + (name || '#' + id);
    populateUserSelect('assignEmployee');
    var rr = document.getElementById('assignReason');
    if (rr) rr.value = '';
    var mm = document.getElementById('assignAssetModal');
    if (mm) mm.classList.remove('hidden');
}

async function handleAssignAsset() {
    var userId = parseInt(document.getElementById('assignEmployee').value);
    if (!userId) { showToast('\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430', 'error'); return; }
    try {
        var r = await fetch('/api/assets/' + _activeAssetId + '/assign?user_id=' + userId + '&reason=' + encodeURIComponent(document.getElementById('assignReason').value || ''), {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
        });
        if (!r.ok) throw new Error('Assign failed');
        showToast('\u0423\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u0432\u044b\u0434\u0430\u043d\u043e', 'success');
        closeModal('assignAssetModal');
        loadAssetsView();
    } catch(e) { showToast(e.message, 'error'); }
}

async function handleReturnAsset(id) {
    if (!confirm('\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0432\u043e\u0437\u0432\u0440\u0430\u0442 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430')) return;
    try {
        var r = await fetch('/api/assets/' + id + '/return', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
        });
        if (!r.ok) throw new Error('Return failed');
        showToast('\u0423\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0435\u043d\u043e', 'success');
        loadAssetsView();
    } catch(e) { showToast(e.message, 'error'); }
}

function openMoveModal(id, name) {
    _activeAssetId = id;
    _activeAssetName = name;
    document.getElementById('moveToLocation').value = '';
    document.getElementById('moveReason').value = '';
    document.getElementById('moveAssetModal').classList.remove('hidden');
}

async function handleMoveAsset() {
    var loc = document.getElementById('moveToLocation').value.trim();
    if (!loc) { showToast('\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043d\u043e\u0432\u043e\u0435 \u0440\u0430\u0441\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435', 'error'); return; }
    try {
        var r = await fetch('/api/assets/' + _activeAssetId + '/move?to_location=' + encodeURIComponent(loc) + '&reason=' + encodeURIComponent(document.getElementById('moveReason').value || ''), {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
        });
        if (!r.ok) throw new Error('Move failed');
        showToast('\u0423\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u043e', 'success');
        closeModal('moveAssetModal');
        loadAssetsView();
    } catch(e) { showToast(e.message, 'error'); }
}

async function handleDeleteAsset(id) {
    try {
        var r = await fetch('/api/assets/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
        });
        if (!r.ok) throw new Error('Delete failed');
        showToast('\u0423\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u0443\u0434\u0430\u043b\u0435\u043d\u043e', 'success');
        loadAssetsView();
    } catch(e) { showToast(e.message, 'error'); }
}

// === DETAIL VIEW ===
async function showAssetDetail(id) {
    try {
        var r = await fetch('/api/assets/' + id, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') } });
        if (!r.ok) throw new Error('Not found');
        var a = await r.json();
        document.getElementById('assetDetailTitle').textContent = a.name + ' (' + (a.readable_id || 'ID: ' + a.id) + ')';
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
            '<div class="glass-card" style="padding:16px;">' +
                '<h4 style="margin:0 0 12px;font-size:0.9rem;color:var(--jarvis-cyan);"><i class="fas fa-info-circle"></i> \u041e\u0441\u043d\u043e\u0432\u043d\u0430\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f</h4>' +
                '<table style="width:100%;font-size:0.82rem;">' +
                    detailRow('\u0422\u0438\u043f', a.asset_type) +
                    detailRow('\u041f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c', a.manufacturer) +
                    detailRow('\u041c\u043e\u0434\u0435\u043b\u044c', a.model) +
                    detailRow('\u0421\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440', a.serial_number) +
                    detailRow('\u0418\u043d\u0432. \u043d\u043e\u043c\u0435\u0440', a.inventory_number) +
                    detailRow('\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f', a.company_name) +
                    detailRow('\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435', a.condition) +
                    detailRow('\u0421\u0442\u0430\u0442\u0443\u0441', a.status) +
                '</table></div>' +
            '<div class="glass-card" style="padding:16px;">' +
                '<h4 style="margin:0 0 12px;font-size:0.9rem;color:var(--jarvis-cyan);"><i class="fas fa-cog"></i> \u0425\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a\u0438 \u0438 \u0430\u0442\u0440\u0438\u0431\u0443\u0442\u044b</h4>' +
                '<table style="width:100%;font-size:0.82rem;">' +
                    detailRow('CPU', (a.specifications||{}).cpu) +
                    detailRow('RAM', (a.specifications||{}).ram) +
                    detailRow('\u0414\u0438\u0441\u043a', (a.specifications||{}).disk) +
                    detailRow('GPU', (a.specifications||{}).gpu) +
                    detailRow('OS', (a.specifications||{}).os) +
                    detailRow('IP-\u0430\u0434\u0440\u0435\u0441', (a.specifications||{}).ip_address) +
                    detailRow('\u0414\u0430\u0442\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438', a.purchase_date ? a.purchase_date.split('T')[0] : null) +
                    detailRow('\u0421\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c', a.purchase_cost) +
                    detailRow('\u0413\u0430\u0440\u0430\u043d\u0442\u0438\u044f', a.warranty_end ? a.warranty_end.split('T')[0] : null) +
                    detailRow('\u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a', a.supplier) +
                    detailRow('\u0420\u0430\u0441\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435', a.location) +
                '</table></div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;">' +
            '<div class="glass-card" style="padding:16px;">' +
                '<h4 style="margin:0 0 10px;font-size:0.9rem;color:var(--jarvis-cyan);"><i class="fas fa-history"></i> \u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0432\u044b\u0434\u0430\u0447 (' + (a.assignments||[]).length + ')</h4>' +
                ((a.assignments||[]).length === 0 ? '<div style="font-size:0.8rem;color:var(--text-secondary);">\u041d\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u0435\u0439</div>' :
                    '<div style="max-height:200px;overflow-y:auto;">' + (a.assignments||[]).map(function(as) {
                        return '<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.78rem;">' +
                            '<div><strong>' + escapeHtml(as.user_name || 'ID: ' + as.user_id) + '</strong></div>' +
                            '<div style="color:var(--text-secondary);">' +
                                (as.assigned_by_name ? '\u0412\u044b\u0434\u0430\u043b: ' + escapeHtml(as.assigned_by_name) + ' | ' : '') +
                                (as.assigned_at ? new Date(as.assigned_at).toLocaleString() : '') +
                                (as.returned_at ? ' \u2192 ' + new Date(as.returned_at).toLocaleString() : ' \u2192 \u043d\u0435 \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0435\u043d') +
                            '</div>' +
                            (as.reason ? '<div style="color:var(--text-low);">' + escapeHtml(as.reason) + '</div>' : '') +
                        '</div>';
                    }).join('') + '</div>') +
            '</div>' +
            '<div class="glass-card" style="padding:16px;">' +
                '<h4 style="margin:0 0 10px;font-size:0.9rem;color:var(--jarvis-cyan);"><i class="fas fa-truck"></i> \u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u0439 (' + (a.movements||[]).length + ')</h4>' +
                ((a.movements||[]).length === 0 ? '<div style="font-size:0.8rem;color:var(--text-secondary);">\u041d\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u0435\u0439</div>' :
                    '<div style="max-height:200px;overflow-y:auto;">' + (a.movements||[]).map(function(m) {
                        return '<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.78rem;">' +
                            '<div>' + escapeHtml(m.from_location || '?') + ' \u2192 <strong>' + escapeHtml(m.to_location) + '</strong></div>' +
                            '<div style="color:var(--text-secondary);">' +
                                (m.moved_at ? new Date(m.moved_at).toLocaleString() : '') +
                                (m.moved_by_name ? ' | ' + escapeHtml(m.moved_by_name) : '') +
                            '</div>' +
                            (m.reason ? '<div style="color:var(--text-low);">' + escapeHtml(m.reason) + '</div>' : '') +
                        '</div>';
                    }).join('') + '</div>') +
            '</div>' +
            '</div>' +
            (a.notes ? '<div class="glass-card" style="padding:12px;margin-top:12px;font-size:0.85rem;"><strong>\u0417\u0430\u043c\u0435\u0442\u043a\u0438:</strong><br>' + escapeHtml(a.notes) + '</div>' : '');
        document.getElementById('assetDetailContent').innerHTML = html;
        document.getElementById('assetDetailModal').classList.remove('hidden');
    } catch(e) {
        showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438', 'error');
    }
}

function detailRow(label, value) {
    if (!value) return '';
    return '<tr><td style="padding:3px 6px 3px 0;color:var(--text-secondary);white-space:nowrap;">' + label + '</td><td style="padding:3px 0;color:var(--text-high);">' + escapeHtml(String(value)) + '</td></tr>';
}

function populateCompanySelect(id, selectedId) {
    var sel = document.getElementById(id);
    if (!sel) return Promise.resolve();
    sel.innerHTML = '<option value="">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e</option>';
    if (window._allCompanies && window._allCompanies.length) {
        window._allCompanies.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.id; opt.textContent = c.name;
            if (selectedId && c.id === selectedId) opt.selected = true;
            sel.appendChild(opt);
        });
        return Promise.resolve();
    } else {
        return api.getCompanies().then(function(companies) {
            window._allCompanies = companies;
            sel.innerHTML = '<option value="">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e</option>';
            companies.forEach(function(c) {
                var opt = document.createElement('option');
                opt.value = c.id; opt.textContent = c.name;
                if (selectedId && c.id === selectedId) opt.selected = true;
                sel.appendChild(opt);
            });
        }).catch(function(){});
    }
}

function populateUserSelect(id, selectedId) {
    var sel = document.getElementById(id);
    if (!sel) return Promise.resolve();
    sel.innerHTML = '<option value="">\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e</option>';
    if (window._allUsers && window._allUsers.length) {
        window._allUsers.forEach(function(u) {
            var opt = document.createElement('option');
            opt.value = u.id; opt.textContent = u.full_name || u.email;
            if (selectedId && u.id === selectedId) opt.selected = true;
            sel.appendChild(opt);
        });
        return Promise.resolve();
    } else {
        return api.getUsers().then(function(users) {
            window._allUsers = users;
            sel.innerHTML = '<option value="">\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043e</option>';
            users.forEach(function(u) {
                var opt = document.createElement('option');
                opt.value = u.id; opt.textContent = u.full_name || u.email;
                if (selectedId && u.id === selectedId) opt.selected = true;
                sel.appendChild(opt);
            });
        }).catch(function(){});
    }
}


// ============================================
// DEMO FLOATING CARDS FUNCTIONALITY
// ============================================
let demoTimerInterval = null;
let demoTimerSeconds = 0;

function demoToggleTimer() {
    const display = document.getElementById('demoTimerDisplay');
    const playBtn = document.querySelector('#demoCardsContainer .btn-primary');
    const stopBtn = document.querySelector('#demoCardsContainer .btn-danger');
    
    if (demoTimerInterval) {
        clearInterval(demoTimerInterval);
        demoTimerInterval = null;
        if (playBtn) playBtn.style.display = '';
        if (stopBtn) stopBtn.style.display = 'none';
    } else {
        demoTimerInterval = setInterval(() => {
            demoTimerSeconds++;
            const h = Math.floor(demoTimerSeconds / 3600);
            const m = Math.floor((demoTimerSeconds % 3600) / 60);
            const s = demoTimerSeconds % 60;
            if (display) display.textContent = 
                String(h).padStart(2,'0') + ':' +
                String(m).padStart(2,'0') + ':' +
                String(s).padStart(2,'0');
        }, 1000);
        if (playBtn) playBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = '';
    }
}

function demoStopTimer() {
    if (demoTimerInterval) {
        clearInterval(demoTimerInterval);
        demoTimerInterval = null;
    }
    demoTimerSeconds = 0;
    const display = document.getElementById('demoTimerDisplay');
    if (display) display.textContent = '00:00:00';
    const playBtn = document.querySelector('#demoCardsContainer .btn-primary');
    const stopBtn = document.querySelector('#demoCardsContainer .btn-danger');
    if (playBtn) playBtn.style.display = '';
    if (stopBtn) stopBtn.style.display = 'none';
}

function demoUpdateCheckProgress() {
    const container = document.getElementById('demoChecklistItems');
    if (!container) return;
    const checked = container.querySelectorAll('.completed').length;
    const total = container.children.length;
    const progressEl = document.getElementById('demoCheckProgress');
    if (progressEl) progressEl.textContent = checked + '/' + total;
}

function demoRate(rating) {
    const stars = document.querySelectorAll('#demoRatingStars .fa-star');
    stars.forEach((star, i) => {
        star.classList.toggle('fas', i < rating);
        star.classList.toggle('far', i >= rating);
    });
    showToast('???????????? ' + rating + ' ??????????????????', 'success');
}

// Initialize demo cards and form handlers
document.addEventListener('DOMContentLoaded', () => {
    demoUpdateCheckProgress();
    
    // Add CSS for demo checklist
    const style = document.createElement('style');
    style.textContent = `
        #demoCardsContainer .checklist-item.completed .checklist-checkbox { background: var(--jarvis-emerald); border-color: var(--jarvis-emerald); }
        #demoCardsContainer .checklist-item.completed .checklist-checkbox::after { content: '???'; color: white; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; }
        #demoCardsContainer .checklist-checkbox { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2); border-radius: 4px; display: inline-flex; }
    `;
    document.head.appendChild(style);
    
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
    
    const addAssetFormEl = document.getElementById('addAssetForm');
    if (addAssetFormEl) addAssetFormEl.addEventListener('submit', handleCreateAsset);
    const addAssetBtnEl = document.getElementById('addAssetBtn');
    if (addAssetBtnEl) addAssetBtnEl.addEventListener('click', showAddAssetModal);
    
    // Report period change handler
    const reportPeriodEl = document.getElementById('reportPeriod');
    if (reportPeriodEl) {
        reportPeriodEl.addEventListener('change', function() {
            const customRange = document.getElementById('customDateRange');
            if (customRange) {
                customRange.style.display = this.value === 'custom' ? 'grid' : 'none';
            }
        });
    }
});

// ===== REPORT SYSTEM =====
let currentReportData = null;
let currentReportType = null;

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function openReportModal() {
    updateReportPreview();
    showModal('reportModal');
}

function generateQuickReport(type) {
    const reportType = document.getElementById('reportType');
    if (reportType) reportType.value = type;
    currentReportType = type;
    openReportModal();
}

async function updateReportPreview() {
    const type = document.getElementById('reportType').value;
    const period = document.getElementById('reportPeriod').value;
    const preview = document.getElementById('reportPreview');
    
    preview.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--jarvis-cyan);"></i><p style="margin-top: 0.5rem;">???????????????? ????????????...</p></div>';
    
    try {
        const data = await getReportData(type, period);
        currentReportData = data;
        renderReportPreview(type, data, preview);
    } catch (error) {
        preview.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--danger);"><i class="fas fa-exclamation-triangle"></i><p>???????????? ???????????????? ????????????</p></div>';
    }
}

async function getReportData(type, period) {
    try {
        const response = await api.request(`/reports/${type}?period=${period}`);
        return { 
            type, 
            data: response.data || [], 
            dateFrom: '', 
            dateTo: '',
            summary: response.summary || {},
            total: response.total || 0,
            resolved: response.resolved || 0
        };
    } catch (error) {
        console.error('Error fetching report:', error);
        // Fallback to local data
        return await getFallbackReportData(type, period);
    }
}

async function getFallbackReportData(type, period) {
    // Fallback using existing API endpoints
    switch(type) {
        case 'tickets':
            try {
                var tickets = await api.request('/tickets');
                return { type: 'tickets', data: tickets, dateFrom: '', dateTo: '' };
            } catch { return { type: 'tickets', data: [], dateFrom: '', dateTo: '' }; }
        case 'users':
            try {
                const users = await api.request('/users');
                return { type: 'users', data: users, dateFrom: '', dateTo: '' };
            } catch { return { type: 'users', data: [], dateFrom: '', dateTo: '' }; }
        case 'companies':
            try {
                const companies = await api.request('/companies');
                return { type: 'companies', data: companies, dateFrom: '', dateTo: '' };
            } catch { return { type: 'companies', data: [], dateFrom: '', dateTo: '' }; }
        case 'performance':
            try {
                var tickets = await api.request('/tickets');
                return { type: 'performance', data: tickets, dateFrom: '', dateTo: '' };
            } catch { return { type: 'performance', data: [], dateFrom: '', dateTo: '' }; }
        case 'audit':
            try {
                const analytics = await api.request('/analytics');
                return { type: 'audit', data: [], dateFrom: '', dateTo: '' };
            } catch { return { type: 'audit', data: [], dateFrom: '', dateTo: '' }; }
        case 'financial':
            try {
                var tickets = await api.request('/tickets');
                return { type: 'financial', data: tickets, dateFrom: '', dateTo: '' };
            } catch { return { type: 'financial', data: [], dateFrom: '', dateTo: '' }; }
        default:
            return { type, data: [], dateFrom: '', dateTo: '' };
    }
}

function renderReportPreview(type, reportData, container) {
    if (!reportData.data || reportData.data.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-tertiary);"><i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.3;"></i><p style="margin-top: 0.5rem;">?????? ???????????? ?????? ??????????????????????</p></div>';
        return;
    }
    
    let html = '<div class="report-summary">';
    
    switch(type) {
        case 'tickets':
            const total = reportData.data.length;
            const resolved = reportData.data.filter(t => t.status === '?????????????? ??????????????' || t.status === '??????????' || t.status === 'resolved' || t.status === 'closed').length;
            const critical = reportData.data.filter(t => t.priority === '??????????????????' || t.priority === 'critical').length;
            html += `<div class="report-summary-item"><h4>${total}</h4><p>?????????? ????????????</p></div>`;
            html += `<div class="report-summary-item"><h4>${resolved}</h4><p>????????????</p></div>`;
            html += `<div class="report-summary-item"><h4>${critical}</h4><p>??????????????????</p></div>`;
            break;
        case 'users':
            html += `<div class="report-summary-item"><h4>${reportData.data.length}</h4><p>??????????????????????????</p></div>`;
            const admins = reportData.data.filter(u => u.role === 'admin').length;
            html += `<div class="report-summary-item"><h4>${admins}</h4><p>??????????????????????????????</p></div>`;
            html += `<div class="report-summary-item"><h4>${reportData.data.length - admins}</h4><p>??????????????</p></div>`;
            break;
        case 'performance':
            const avgTime = calculateAvgResolutionTime(reportData.data);
            html += `<div class="report-summary-item"><h4>${avgTime}</h4><p>????. ?????????? (??)</p></div>`;
            html += `<div class="report-summary-item"><h4>${reportData.data.length}</h4><p>????????????????????</p></div>`;
            html += `<div class="report-summary-item"><h4>95%</h4><p>SLA</p></div>`;
            break;
        case 'companies':
            html += `<div class="report-summary-item"><h4>${reportData.data.length}</h4><p>????????????????</p></div>`;
            const active = reportData.data.filter(c => c.status === 'active').length;
            html += `<div class="report-summary-item"><h4>${active}</h4><p>????????????????</p></div>`;
            html += `<div class="report-summary-item"><h4>${reportData.data.length - active}</h4><p>????????????????????</p></div>`;
            break;
        case 'audit':
            html += `<div class="report-summary-item"><h4>${reportData.data.length}</h4><p>??????????????</p></div>`;
            const logins = reportData.data.filter(a => a.action?.includes('login') || a.action?.includes('auth')).length;
            html += `<div class="report-summary-item"><h4>${logins}</h4><p>????????????</p></div>`;
            html += `<div class="report-summary-item"><h4>${reportData.data.length - logins}</h4><p>????????????</p></div>`;
            break;
        case 'financial':
            html += `<div class="report-summary-item"><h4>${reportData.data.length}</h4><p>????????????</p></div>`;
            html += `<div class="report-summary-item"><h4>0</h4><p>?????????? ????????????</p></div>`;
            html += `<div class="report-summary-item"><h4>0</h4><p>?????????? (SUM)</p></div>`;
            break;
    }
    
    html += '</div><table><thead><tr>';
    
    switch(type) {
        case 'tickets':
            html += '<th>ID</th><th>????????????????</th><th>????????????</th><th>??????????????????</th><th>????????????</th><th>????????????????</th>';
            break;
        case 'users':
            html += '<th>ID</th><th>??????</th><th>Email</th><th>????????</th><th>????????????</th>';
            break;
        case 'companies':
            html += '<th>ID</th><th>????????????????</th><th>Email</th><th>??????????????</th><th>????????????</th>';
            break;
        case 'audit':
            html += '<th>??????????</th><th>????????????????</th><th>????????????????????????</th><th>IP</th>';
            break;
        case 'performance':
            html += '<th>ID</th><th>????????????????</th><th>?????????? ????????????????</th><th>?????????? ??????????????</th><th>SLA</th>';
            break;
        case 'financial':
            html += '<th>ID</th><th>????????????????</th><th>????????????</th><th>??????????</th><th>??????????????????</th>';
            break;
    }
    
    html += '</tr></thead><tbody>';
    
    const items = reportData.data.slice(0, 10);
    items.forEach(item => {
        html += '<tr>';
        switch(type) {
            case 'tickets':
                html += `<td>${item.id}</td><td>${escapeHtml(item.title || item.name || '')}</td><td><span class="badge badge-${getStatusClass(item.status)}">${item.status || ''}</span></td><td><span class="badge badge-${getPriorityClass(item.priority)}">${item.priority || ''}</span></td><td>${formatDate(item.created_at)}</td><td>${formatDate(item.updated_at)}</td>`;
                break;
            case 'users':
                html += `<td>${item.id}</td><td>${escapeHtml(item.full_name || item.name || '')}</td><td>${escapeHtml(item.email || '')}</td><td>${item.role || 'user'}</td><td><span class="badge badge-${item.is_active ? 'green' : 'gray'}">${item.is_active ? '??????????????' : '??????????????????'}</span></td>`;
                break;
            case 'companies':
                html += `<td>${item.id}</td><td>${escapeHtml(item.name || '')}</td><td>${escapeHtml(item.email || '')}</td><td>${escapeHtml(item.phone || '')}</td><td><span class="badge badge-${item.status === 'active' ? 'green' : 'gray'}">${item.status || ''}</span></td>`;
                break;
            case 'audit':
                html += `<td>${formatDate(item.created_at)}</td><td>${escapeHtml(item.action || '')}</td><td>${escapeHtml(item.user_name || item.user_email || '')}</td><td>${item.ip_address || ''}</td>`;
                break;
            case 'performance':
                const created = new Date(item.created_at);
                const updated = new Date(item.updated_at || item.resolved_at || now);
                const hours = Math.round((updated - created) / (1000 * 60 * 60));
                html += `<td>${item.id}</td><td>${escapeHtml(item.title || '')}</td><td>${formatDate(item.created_at)}</td><td>${hours}??</td><td>${hours <= 24 ? '???' : '???'}</td>`;
                break;
            case 'financial':
                html += `<td>${item.id}</td><td>${escapeHtml(item.title || '')}</td><td><span class="badge badge-${getStatusClass(item.status)}">${item.status || ''}</span></td><td>${formatDate(item.created_at)}</td><td><span class="badge badge-${getPriorityClass(item.priority)}">${item.priority || ''}</span></td>`;
                break;
        }
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    if (reportData.data.length > 10) {
        html += `<p style="text-align: center; padding: 1rem; color: var(--text-tertiary);">???????????????? 10 ???? ${reportData.data.length} ??????????????</p>`;
    }
    
    container.innerHTML = html;
}

function getStatusClass(status) {
    if (!status) return 'gray';
    const s = status.toLowerCase();
    if (s.includes('??????????') || s.includes('new')) return 'new';
    if (s.includes('????????????') || s.includes('progress')) return 'progress';
    if (s.includes('??????????????') || s.includes('??????????') || s.includes('resolved')) return 'green';
    if (s.includes('????????????') || s.includes('closed')) return 'closed';
    return 'gray';
}

function getPriorityClass(priority) {
    if (!priority) return 'low';
    const p = priority.toLowerCase();
    if (p.includes('??????????????') || p.includes('critical')) return 'critical';
    if (p.includes('??????????') || p.includes('high')) return 'high';
    if (p.includes('??????????') || p.includes('medium')) return 'medium';
    return 'low';
}

function calculateAvgResolutionTime(tickets) {
    if (!tickets || tickets.length === 0) return 0;
    let totalHours = 0;
    let count = 0;
    tickets.forEach(t => {
        if (t.created_at && (t.resolved_at || t.updated_at)) {
            const created = new Date(t.created_at);
            const resolved = new Date(t.resolved_at || t.updated_at);
            totalHours += (resolved - created) / (1000 * 60 * 60);
            count++;
        }
    });
    return count > 0 ? Math.round(totalHours / count) : 0;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

async function exportReport() {
    const type = document.getElementById('reportType').value;
    const format = document.getElementById('exportFormat').value;
    const period = document.getElementById('reportPeriod').value;
    
    showToast('?????????????? ????????????...', 'info');
    
    try {
        // Use API export endpoint
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/reports/export/${type}?period=${period}&format=${format}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `report_${type}_${period}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('?????????? ????????????!', 'success');
        } else {
            // Fallback to local CSV generation
            if (!currentReportData) {
                currentReportData = await getReportData(type, period);
            }
            downloadAsCSV(type, currentReportData);
        }
    } catch (error) {
        console.error('Export error:', error);
        // Fallback to local CSV generation
        if (!currentReportData) {
            currentReportData = await getReportData(type, period);
        }
        downloadAsCSV(type, currentReportData);
    }
    
    // Save to recent reports
    if (currentReportData) {
        saveToRecentReports(type, { data: currentReportData.data || [] });
    }
}

function downloadAsCSV(type, reportData) {
    const rows = [];
    const headers = getReportHeaders(type);
    rows.push(headers);
    
    reportData.data.forEach(item => {
        rows.push(getReportRow(type, item));
    });
    
    const csvContent = rows.map(row => 
        row.map(cell => {
            const str = String(cell).replace(/"/g, '""');
            return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
        }).join(',')
    ).join('\n');
    
    const csvUtf8 = new TextEncoder().encode(csvContent);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const full = new Uint8Array(bom.length + csvUtf8.length);
    full.set(bom);
    full.set(csvUtf8, bom.length);
    const blob = new Blob([full], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('?????????? ????????????!', 'success');
    
    // Save to recent reports
    saveToRecentReports(type, reportData);
}

function getReportHeaders(type) {
    switch(type) {
        case 'tickets':
            return ['ID', '????????????????', '????????????????', '????????????', '??????????????????', '????????????????', '??????????????????', '??????????????????????', '????????????', '????????????????'];
        case 'users':
            return ['ID', '??????', 'Email', '????????', '????????????', '????????????????', '????????????'];
        case 'companies':
            return ['ID', '????????????????', 'Email', '??????????????', '??????????', '????????????', '????????????'];
        case 'audit':
            return ['??????????', '????????????????', '????????????????????????', 'IP ??????????', '????????????'];
        case 'performance':
            return ['ID', '????????????????', '????????????', '??????????????????', '?????????? ????????????????', '?????????? ??????????????', 'SLA'];
        case 'financial':
            return ['ID', '????????????????', '????????????', '??????????????????', '??????????', '????????????????'];
        default:
            return ['ID', '????????????'];
    }
}

function getReportRow(type, item) {
    switch(type) {
        case 'tickets':
            return [
                item.id,
                item.title || '',
                item.description || '',
                item.status || '',
                item.priority || '',
                item.company_name || '',
                item.creator_name || '',
                item.assignee_name || '',
                item.created_at || '',
                item.updated_at || ''
            ];
        case 'users':
            return [
                item.id,
                item.full_name || item.name || '',
                item.email || '',
                item.role || 'user',
                item.is_active ? '??????????????' : '??????????????????',
                item.company_name || '',
                item.created_at || ''
            ];
        case 'companies':
            return [
                item.id,
                item.name || '',
                item.email || '',
                item.phone || '',
                item.address || '',
                item.status || '',
                item.created_at || ''
            ];
        case 'audit':
            return [
                item.created_at || '',
                item.action || '',
                item.user_name || item.user_email || '',
                item.ip_address || '',
                item.details || ''
            ];
        case 'performance':
            const created = new Date(item.created_at);
            const resolved = new Date(item.resolved_at || item.updated_at);
            const hours = Math.round((resolved - created) / (1000 * 60 * 60));
            return [
                item.id,
                item.title || '',
                item.status || '',
                item.priority || '',
                item.created_at || '',
                item.resolved_at || item.updated_at || '',
                hours <= 24 ? '??????????????????' : '????????????????????'
            ];
        case 'financial':
            return [
                item.id,
                item.title || '',
                item.status || '',
                item.priority || '',
                item.created_at || '',
                item.company_name || ''
            ];
        default:
            return [item.id, JSON.stringify(item)];
    }
}

function saveToRecentReports(type, reportData) {
    let recentReports = JSON.parse(localStorage.getItem('recentReports') || '[]');
    const report = {
        type,
        date: new Date().toISOString(),
        period: document.getElementById('reportPeriod').value,
        count: reportData.data.length
    };
    recentReports.unshift(report);
    recentReports = recentReports.slice(0, 10);
    localStorage.setItem('recentReports', JSON.stringify(recentReports));
    loadRecentReports();
}

function loadRecentReports() {
    const container = document.getElementById('recentReportsList');
    if (!container) return;
    
    const recentReports = JSON.parse(localStorage.getItem('recentReports') || '[]');
    
    if (recentReports.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-tertiary);"><i class="fas fa-file-alt" style="font-size: 2rem; opacity: 0.3; margin-bottom: 1rem;"></i><p>?????????????????? ???????????? ???????????????? ??????????</p></div>';
        return;
    }
    
    const typeNames = {
        'tickets': '???? ??????????????',
        'users': '???? ??????????????????????????',
        'performance': '???? ????????????????????????????????????',
        'companies': '???? ??????????????????',
        'audit': '?????????? ????????????????????????',
        'financial': '????????????????????'
    };
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>?????? ????????????</th>
                    <th>????????????</th>
                    <th>??????????????</th>
                    <th>???????? ????????????????</th>
                    <th>????????????????</th>
                </tr>
            </thead>
            <tbody>
                ${recentReports.map(r => `
                    <tr>
                        <td><i class="fas fa-file-alt" style="color: var(--jarvis-cyan); margin-right: 0.5rem;"></i>${typeNames[r.type] || r.type}</td>
                        <td>${r.period}</td>
                        <td>${r.count}</td>
                        <td>${new Date(r.date).toLocaleString('ru-RU')}</td>
                        <td>
                            <button class="btn-icon" onclick="regenerateReport('${r.type}')" title="????????????????">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function regenerateReport(type) {
    document.getElementById('reportType').value = type;
    openReportModal();
}

function downloadCurrentReport() {
    if (currentReportData) {
        downloadAsCSV(currentReportType, currentReportData);
    }
}

// ===== CLOSE TICKET =====
async function closeTicket() {
    if (!currentTicketId) {
        showToast('????????????: ?????????? ???? ????????????', 'error');
        return;
    }
    
    try {
        showToast('???????????????? ????????????...', 'info');
        
        await api.request(`/tickets/${currentTicketId}/close`, {
            method: 'POST'
        });
        
        showToast('?????????? ????????????!', 'success');
        
        // Reload ticket details
        loadTicketDetails(currentTicketId);
        
        // Reload tickets list
        if (typeof loadTickets === 'function') {
            loadTickets();
        }
        
        // Close modal if status is final
        const closeBtn = document.getElementById('btnCloseTicket');
        const agentActions = document.getElementById('agentActions');
        if (agentActions) {
            agentActions.classList.add('hidden');
        }
        
    } catch (error) {
        console.error('Close ticket error:', error);
        showToast('???????????? ???????????????? ????????????: ' + error.message, 'error');
    }
}

// ===== RESOLVE TICKET =====
async function resolveTicket() {
    if (!currentTicketId) {
        showToast('????????????: ?????????? ???? ????????????', 'error');
        return;
    }
    
    var comment = prompt('?????????????????????? ?? ?????????????????????? ???????????? (??????????????????????????):');
    if (comment === null) return;
    
    try {
        showToast('???????????????????? ????????????...', 'info');
        
        await api.resolveTicket(currentTicketId, comment);
        
        showToast('?????????? ????????????????! ???????????? ?????????????????? ?? ????????????????????.', 'success');
        
        // Reload ticket details
        loadTicketDetails(currentTicketId);
        
        // Reload tickets list
        if (typeof loadTickets === 'function') {
            loadTickets();
        }
        
    } catch (error) {
        console.error('Resolve ticket error:', error);
        showToast('???????????? ???????????????????? ????????????: ' + error.message, 'error');
    }
}


// Redundant button handler for add asset
document.addEventListener('click', function(e) {
    var btn = e.target ? e.target.closest('#addAssetBtn') : null;
    if (btn) {
        e.preventDefault();
        showAddAssetModal();
    }
});

// Keyboard shortcut: Ctrl+Shift+A to open add asset modal
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        showAddAssetModal();
    }
});

// Expose for console debugging
window.showAddAssetModal = showAddAssetModal;
window.openAssignModal = openAssignModal;
window.handleAssignAsset = handleAssignAsset;
window.handleReturnAsset = handleReturnAsset;
window.showAssetDetail = showAssetDetail;
window.openMoveModal = openMoveModal;
window.handleMoveAsset = handleMoveAsset;
window.showEditAssetModal = showEditAssetModal;
window.handleDeleteAsset = handleDeleteAsset;

window.testClick = function() { alert("CLICK_WORKS"); };
window.testModal2 = function() {
    var m = document.getElementById("addAssetModal");
    if (m) { m.classList.remove("hidden"); console.log("MODAL_OK"); }
    else { console.log("NO_MODAL"); }
};
console.log("TEST_READY");


// Telegram linking functions
function generateTelegramLink() {
    document.getElementById('telegramLinkContent').style.display = 'block';
    document.getElementById('telegramLinkResult').style.display = 'none';
    openModal('telegramLinkModal');
}

async function generateTelegramLinkCode() {
    const btn = document.querySelector('#telegramLinkContent button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ??????????????????...';
    try {
        const res = await fetch('/api/auth/telegram/link-token', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) throw new Error('Failed to generate code');
        const data = await res.json();
        document.getElementById('telegramLinkContent').style.display = 'none';
        document.getElementById('telegramLinkResult').style.display = 'block';
        document.getElementById('telegramLinkToken').textContent = data.token;
        document.getElementById('telegramLinkCodeInline').textContent = data.token;
    } catch (e) {
        console.error('Telegram link error:', e);
        alert('???????????? ?????????????????? ????????. ???????????????????? ?????? ??????.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> ???????????????? ??????';
    }
}

function copyTelegramCode() {
    const code = document.getElementById('telegramLinkToken').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('#telegramLinkResult .btn');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> ??????????????????????';
        setTimeout(() => btn.innerHTML = orig, 2000);
    }).catch(() => {
        alert('???????????????????? ?????? ??????????????: ' + code);
    });
}


// ========== HASH ROUTER REGISTRATION ==========
Router.register('/tickets', function() { showView('tickets'); });
Router.register('/tickets/new', function() { UIManager.closeAll(); showView('create'); });
Router.register('/tickets/:id', function(id, action) {
    if (action === 'edit') { UIManager.closeAll(); showView('tickets'); openTicketModal(id); }
    else { showView('tickets'); openTicketModal(id); }
});
Router.register('/companies', function() { showView('crm'); });
Router.register('/companies/new', function() { showView('crm'); showCreateCompanyModal(); });
Router.register('/companies/:id/edit', function(id) { showView('crm'); showEditCompanyModal(id); });
Router.register('/users', function() { showView('users'); });
Router.register('/users/new', function() { showView('users'); showNewUserModal(); });
Router.register('/users/:id/edit', function(id) { showView('users'); showEditUserModal(id); });
Router.register('/assets', function() { showView('assets'); });
Router.register('/assets/new', function() { showView('assets'); showAddAssetModal(); });
Router.register('/assets/:id/edit', function(id) { showView('assets'); showEditAssetModal(id); });
Router.register('/monitoring', function() { showView('monitoring'); });
Router.register('/settings', function() { showView('dashsettings'); });
Router.register('/dashboard', function() { showView('dashboard'); });

function showAddAssetModal() { UIManager.closeAll(); var m = document.getElementById('addAssetModal'); if (m) { m.classList.remove('hidden'); m.style.display = 'flex'; document.body.style.overflow = 'hidden'; } }

// Initialize Router
Router.init();

// ========== ROLE-BASED NAVIGATION ==========
function renderNavForRole(role) {
    var navItems = {
        dashboard: true,
        tickets: true,
        create: true,
        monitoring: role === 'admin' || role === 'super_admin',
        crm: role === 'admin' || role === 'super_admin',
        assets: role === 'admin' || role === 'super_admin',
        audit: role === 'admin' || role === 'super_admin',
        users: role === 'admin' || role === 'super_admin',
        dashsettings: role === 'admin' || role === 'super_admin'
    };

    var clientRoutes = ['/tickets', '/tickets/new'];
    var agentRoutes = ['/tickets', '/tickets/new', '/dashboard', '/monitoring'];
    var adminRoutes = Object.keys(navItems);

    document.querySelectorAll('.side-link[data-page]').forEach(function(link) {
        var page = link.getAttribute('data-page');
        if (!page) return;
        var visible = navItems[page] !== false;
        if (role === 'client') visible = (page === 'tickets' || page === 'create' || page === 'dashboard');
        if (role === 'agent') visible = visible && page !== 'audit' && page !== 'users';
        link.style.display = visible ? '' : 'none';
    });
}

function checkAccess(role, route) {
    var clientAllowed = ['/tickets', '/tickets/new', '/dashboard'];
    var agentAllowed = ['/tickets', '/tickets/new', '/dashboard', '/monitoring', '/assets'];

    if (role === 'client' && !clientAllowed.some(function(r) { return route.startsWith(r); })) {
        Router.navigate('#/tickets');
        UIManager.toast(i18n.t('no_access') || '?????? ??????????????', 'warning');
        return false;
    }
    if (role === 'agent' && !agentAllowed.some(function(r) { return route.startsWith(r); })) {
        Router.navigate('#/tickets');
        UIManager.toast(i18n.t('no_access') || '?????? ??????????????', 'warning');
        return false;
    }
    return true;
}

// Override login handler to set role-based nav
var _originalLoginSuccess = window.loginSuccess;
window.loginSuccess = function(user) {
    renderNavForRole((user.role || '').toLowerCase());
    if (_originalLoginSuccess) _originalLoginSuccess(user);
};


// Re-render current view when locale changes
document.addEventListener('localeChanged', function() {
    var view = activeView || 'dashboard';
    if (view === 'dashboard') {
        if (typeof loadHUDDashboard === 'function') loadHUDDashboard();
        else if (typeof loadDashboardData === 'function') loadDashboardData();
    } else if (view === 'tickets') {
        loadTickets();
    } else if (view === 'crm') {
        loadCRMData();
    } else if (view === 'monitoring') {
        loadMonitoringData();
    } else if (view === 'audit') {
        loadAuditLogData();
    } else if (view === 'users') {
        loadUsers();
    } else if (view === 'assets') {
        loadAssetsView();
    } else if (view === 'create') {
        loadOpenTickets();
    }
});
