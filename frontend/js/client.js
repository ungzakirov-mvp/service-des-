// Client Portal - Simple and Working
let api = null;
let portal = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Wait for api to be available
    api = window.api;
    
    if (!api || !api.token) {
        console.error('No API token found');
        window.location.href = 'index.html';
        return;
    }

    // Get user info
    try {
        const user = await api.getMe();
        document.getElementById('clientName').textContent = user.full_name || user.email;
        console.log('Logged in as:', user.email, 'Role:', user.role);
    } catch (e) {
        console.error('Auth error:', e);
        window.location.href = 'index.html';
        return;
    }

    // Load initial tickets
    loadClientTickets();

    // Event listeners
    document.getElementById('createNewBtn').addEventListener('click', () => showNewTicket());
    document.getElementById('cancelBtn').addEventListener('click', () => showDashboard());
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Navigation
    document.querySelectorAll('.client-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });
});

async function loadClientTickets() {
    const list = document.getElementById('clientTicketsList');
    list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
    
    try {
        const tickets = await api.getTickets();
        renderClientTickets(tickets);
    } catch (e) {
        console.error('Load tickets error:', e);
        list.innerHTML = '<div style="color:red;padding:2rem">Ошибка загрузки: ' + e.message + '</div>';
    }
}

function renderClientTickets(tickets) {
    const list = document.getElementById('clientTicketsList');
    
    if (!tickets || tickets.length === 0) {
        list.innerHTML = `
            <div style="text-align:center;padding:3rem;color:var(--text-muted)">
                <i class="fas fa-inbox" style="font-size:3rem;opacity:0.3"></i>
                <p style="margin-top:1rem">У вас пока нет обращений</p>
                <button class="btn btn-primary" onclick="showNewTicket()" style="margin-top:1rem">
                    <i class="fas fa-plus"></i> Создать первое обращение
                </button>
            </div>
        `;
        return;
    }

    list.innerHTML = tickets.map(ticket => {
        const statusColor = getStatusColor(ticket.status_rel?.name || 'новый');
        const date = new Date(ticket.created_at).toLocaleDateString('ru-RU');
        return `
            <div class="ticket-card" onclick="alert('Просмотр тикета #${ticket.readable_id}')">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
                    <span style="font-weight:600;font-size:1.1rem">${escapeHtml(ticket.title)}</span>
                    <span class="ticket-status-badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">
                        ${ticket.status_rel?.name || 'Новый'}
                    </span>
                </div>
                <div style="color:var(--text-muted);font-size:0.85rem">
                    <span>#${ticket.readable_id}</span> • <span>${date}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusColor(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('нов')) return '#3b82f6';
    if (s.includes('раб') || s.includes('ожидан')) return '#f59e0b';
    if (s.includes('реш') || s.includes('закрыт')) return '#10b981';
    return '#8b5cf6';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function switchView(view) {
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('newTicketView').classList.add('hidden');
    document.getElementById('ticketDetailView').classList.add('hidden');
    document.getElementById('assetsView').classList.add('hidden');
    
    document.querySelectorAll('.client-nav-item').forEach(i => i.classList.remove('active'));
    
    if (view === 'dashboard') {
        document.getElementById('dashboardView').classList.remove('hidden');
        document.querySelector('[data-view="dashboard"]').classList.add('active');
        loadClientTickets();
    } else if (view === 'new-ticket') {
        document.getElementById('newTicketView').classList.remove('hidden');
        document.querySelector('[data-view="new-ticket"]').classList.add('active');
    } else if (view === 'assets') {
        document.getElementById('assetsView').classList.remove('hidden');
        document.querySelector('[data-view="assets"]').classList.add('active');
    }
}

function showDashboard() {
    switchView('dashboard');
}

function showNewTicket() {
    switchView('new-ticket');
}

async function submitTicket() {
    const btn = document.getElementById('submitTicketBtn');
    const titleEl = document.getElementById('ticketTitle');
    const descEl = document.getElementById('ticketDescription');
    const priorityEl = document.getElementById('ticketPriority');
    
    const title = titleEl.value.trim();
    const description = descEl.value.trim();
    const priority = priorityEl.value;
    
    if (!title) {
        showToast('❌ Укажите тему обращения');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
    
    try {
        console.log('Creating ticket:', { title, description, priority });
        const result = await api.createTicket({
            title: title,
            description: description,
            priority: priority
        });
        console.log('Ticket created:', result);
        
        // Clear form
        titleEl.value = '';
        descEl.value = '';
        priorityEl.value = 'средний';
        
        showToast('✅ Заявка #' + result.readable_id + ' создана и отправлена на обработку!');
        
        // Go to dashboard and reload
        switchView('dashboard');
        
    } catch (e) {
        console.error('Create ticket error:', e);
        showToast('❌ Ошибка: ' + (e.message || 'Не удалось создать заявку'));
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Отправить заявку';
    }
}

function logout() {
    api.clearToken();
    window.location.href = 'index.html';
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = msg;
        toast.classList.remove('hidden', 'fade-out');
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.classList.add('hidden'), 500);
        }, 4000);
    }
}
