// Agent Workspace Logic

class AgentWorkspace {
    constructor() {
        this.activeTicketId = null;
        this.pollingInterval = null;
        this.tickets = [];

        // DOM Elements
        this.elements = {
            ticketList: document.getElementById('ticketList'),
            timelineScroll: document.getElementById('timelineScroll'),
            activeTicketTitle: document.getElementById('activeTicketTitle'),
            activeTicketId: document.getElementById('activeTicketId'),
            replyBox: document.getElementById('replyBox'),
            replyEditor: document.querySelector('.reply-editor'),
            sendBtn: document.getElementById('sendBtn'),
            metaPanel: document.getElementById('metaPanel'),
            currentUserAvatar: document.getElementById('currentUserAvatar'),
            filterTabs: document.querySelectorAll('.filter-tab'),
            searchBar: document.querySelector('.search-bar'),
            navIcons: document.querySelectorAll('.nav-icon'),
            views: {
                inbox: document.getElementById('inboxView'),
                analytics: document.getElementById('analyticsView'),
                crm: document.getElementById('crmView'),
                settings: document.getElementById('settingsView')
            },
            volumeChart: document.getElementById('volumeChart'),
            agentLeaderboard: document.getElementById('agentLeaderboard'),
            crmTableBody: document.getElementById('crmTableBody'),
            crmSearch: document.getElementById('crmSearch'),
            createTicketModal: document.getElementById('createTicketModal'),
            createTicketForm: document.getElementById('createTicketForm'),
            createNewTicketBtn: document.getElementById('createNewTicketBtn'),
            closeModalBtns: document.querySelectorAll('.close-modal'),
            logoutBtn: document.getElementById('logoutBtn'),
            ticketStatusSelect: document.getElementById('ticketStatusSelect'),
            ticketPrioritySelect: document.getElementById('ticketPrioritySelect'),
            ticketAssignSelect: document.getElementById('ticketAssignSelect'),
            internalNoteToggle: document.getElementById('internalNoteToggle'),
            sendReplyBtn: document.getElementById('sendReplyBtn'),
            metaCompany: document.getElementById('metaCompany')
        };

        this.currentUser = null;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentView = 'inbox'; // Default

        this.init();
    }

    async init() {
        if (!api.token) {
            window.location.href = 'index.html';
            return;
        }

        try {
            this.currentUser = await api.getMe();
            if (this.elements.currentUserAvatar) {
                this.elements.currentUserAvatar.textContent = (this.currentUser.full_name || this.currentUser.email || 'A')[0].toUpperCase();
            }
        } catch (e) {
            console.error('Failed to fetch user profile:', e);
        }

        // Setup Event Listeners
        this.elements.filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleFilterClick(e));
        });

        if (this.elements.searchBar) {
            this.elements.searchBar.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderTicketList();
            });
        }

        this.elements.navIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                if (icon.id === 'logoutBtn' || icon.id === 'createNewTicketBtn') return;

                e.preventDefault();
                const view = icon.getAttribute('title').toLowerCase();

                if (view === 'входящие') this.switchView('inbox');
                else if (view === 'аналитика') this.switchView('analytics');
                else if (view === 'клиенты') this.switchView('crm');
                else if (view === 'настройки') this.switchView('settings');
                else alert(`Раздел "${icon.title}" находится в разработке`);

                this.elements.navIcons.forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
            });
        });

        // Create Ticket Modal Listeners
        if (this.elements.createNewTicketBtn) {
            this.elements.createNewTicketBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openCreateModal();
            });
        }

        this.elements.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeCreateModal());
        });

        if (this.elements.createTicketForm) {
            this.elements.createTicketForm.addEventListener('submit', (e) => this.handleCreateTicket(e));
        }

        window.addEventListener('click', (e) => {
            if (e.target === this.elements.createTicketModal) {
                this.closeCreateModal();
            }
        });

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                api.clearToken();
                window.location.href = 'index.html';
            });
        }

        if (this.elements.sendReplyBtn) {
            this.elements.sendReplyBtn.addEventListener('click', () => this.sendReply());
        }

        if (this.elements.ticketStatusSelect) {
            this.elements.ticketStatusSelect.addEventListener('change', () => this.updateTicketStatus());
        }
        if (this.elements.ticketPrioritySelect) {
            this.elements.ticketPrioritySelect.addEventListener('change', () => this.updateTicketPriority());
        }
        if (this.elements.ticketAssignSelect) {
            this.elements.ticketAssignSelect.addEventListener('change', () => this.updateTicketAssignment());
        }

        if (this.elements.crmSearch) {
            this.elements.crmSearch.addEventListener('input', (e) => this.renderCRMList(e.target.value));
        }

        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        }

        // Initial Load
        await this.loadTickets();

        // Polling (Every 30s)
        setInterval(() => {
            if (this.currentView === 'inbox') this.loadTickets(true);
        }, 30000);
    }

    switchView(viewId) {
        this.currentView = viewId;

        // Toggle Views
        Object.keys(this.elements.views).forEach(key => {
            this.elements.views[key].classList.toggle('hidden', key !== viewId);
        });

        // Load specific data
        if (viewId === 'analytics') this.loadAnalytics();
        if (viewId === 'crm') this.loadCRM();
        if (viewId === 'settings') this.loadSettings();
    }

    async loadAnalytics() {
        try {
            this.elements.volumeChart.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            const data = await api.getAnalytics();
            this.renderAnalytics(data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.elements.volumeChart.innerHTML = '<div style="color:red">Ошибка загрузки</div>';
        }
    }

    renderAnalytics(data) {
        // Render Volume Chart (Simple CSS Bars)
        this.elements.volumeChart.innerHTML = '';
        const maxVal = Math.max(...data.volume_trends.map(t => t.count), 1);

        data.volume_trends.forEach(trend => {
            const container = document.createElement('div');
            container.className = 'chart-bar-container';

            const percentage = (trend.count / maxVal) * 100;
            const day = new Date(trend.date).toLocaleDateString([], { weekday: 'short' });

            container.innerHTML = `
                <div class="chart-bar" style="height: ${percentage}%" data-value="${trend.count}"></div>
                <div class="chart-label">${day}</div>
            `;
            this.elements.volumeChart.appendChild(container);
        });

        // Render Leaderboard
        this.elements.agentLeaderboard.innerHTML = '';
        const sortedAgents = data.agent_performance.sort((a, b) => b.resolved_count - a.resolved_count);

        sortedAgents.forEach((agent, idx) => {
            const el = document.createElement('div');
            el.className = 'leader-item';
            el.innerHTML = `
                <div class="leader-rank">${idx + 1}</div>
                <div class="leader-info">
                    <div class="leader-name">${agent.full_name || 'Agent'}</div>
                    <div class="leader-stats">Скорость: ${agent.avg_resolution_hours || '-'} ч.</div>
                </div>
                <div class="leader-v">${agent.resolved_count}</div>
            `;
            this.elements.agentLeaderboard.appendChild(el);
        });
    }

    async loadCRM() {
        try {
            this.elements.crmTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Загрузка...</td></tr>';
            this.allClients = await api.getUsers({ role: 'client' });
            this.renderCRMList();
        } catch (error) {
            console.error('Failed to load CRM:', error);
            this.elements.crmTableBody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center">Ошибка загрузки</td></tr>';
        }
    }

    renderCRMList(query = '') {
        this.elements.crmTableBody.innerHTML = '';
        const filtered = this.allClients.filter(c =>
            c.email.toLowerCase().includes(query.toLowerCase()) ||
            (c.full_name && c.full_name.toLowerCase().includes(query.toLowerCase()))
        );

        if (filtered.length === 0) {
            this.elements.crmTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Клиенты не найдены</td></tr>';
            return;
        }

        filtered.forEach(client => {
            const date = new Date(client.created_at).toLocaleDateString();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.full_name || '-'}</td>
                <td>${client.email}</td>
                <td>${date}</td>
                <td><button class="btn btn-small" style="background:rgba(255,255,255,0.1)">Создать тикет</button></td>
            `;
            this.elements.crmTableBody.appendChild(row);
        });
    }

    async loadTickets(silent = false) {
        try {
            if (!silent) this.elements.ticketList.innerHTML = '<div style="text-align:center; padding: 2rem"><i class="fa-solid fa-spinner fa-spin"></i></div>';

            const tickets = await api.getTickets();
            // Sort by creation date descending
            this.tickets = tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            this.renderTicketList();
        } catch (error) {
            console.error('Failed to load tickets:', error);
            if (!silent) this.elements.ticketList.innerHTML = '<div style="text-align:center; color: red">Ошибка загрузки</div>';
        }
    }

    handleFilterClick(e) {
        const tab = e.target;
        this.currentFilter = tab.dataset.filter;

        this.elements.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        this.renderTicketList();
    }

    renderTicketList() {
        this.elements.ticketList.innerHTML = '';

        let filtered = this.tickets;

        // Apply Search
        if (this.searchQuery) {
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(this.searchQuery) ||
                t.readable_id.toString().includes(this.searchQuery)
            );
        }

        // Apply Tab Filter
        if (this.currentFilter === 'my' && this.currentUser) {
            filtered = filtered.filter(t => t.assigned_to === this.currentUser.id);
        } else if (this.currentFilter === 'unassigned') {
            filtered = filtered.filter(t => !t.assigned_to);
        }

        if (filtered.length === 0) {
            this.elements.ticketList.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted)">Нет тикетов</div>';
            return;
        }

        filtered.forEach(ticket => {
            const el = document.createElement('div');
            el.className = `ticket-item ${this.activeTicketId === ticket.id ? 'active' : ''}`;
            el.onclick = () => this.loadTicket(ticket.id);

            // Format time
            const time = new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Status Color
            const statusColor = ticket.status_rel ? ticket.status_rel.color : '#808080';
            const statusName = ticket.status_rel ? ticket.status_rel.name : 'Unknown';

            el.innerHTML = `
                <div class="ticket-title">${this.escapeHtml(ticket.title)}</div>
                <div class="t-meta-row">
                    <span><span class="t-status-dot" style="background: ${statusColor}"></span>${statusName}</span>
                    <span>#${ticket.readable_id}</span>
                </div>
                <div class="t-meta-row">
                    <span>${ticket.creator ? (ticket.creator.full_name || ticket.creator.email) : 'System'}</span>
                    <span>${time}</span>
                </div>
            `;
            this.elements.ticketList.appendChild(el);
        });
    }

    async loadTicket(id, refreshOnly = false) {
        if (this.activeTicketId === id && !refreshOnly) return;

        this.activeTicketId = id;
        if (!refreshOnly) this.renderTicketList(); // Update active class

        // Show loading in main stage if not just refreshing
        if (!refreshOnly) {
            this.elements.timelineScroll.innerHTML = '<div style="text-align:center; margin-top: 5rem"><i class="fa-solid fa-spinner fa-spin"></i></div>';
            this.elements.replyBox.classList.add('hidden');
        }

        try {
            // Parallel fetch: Details + Timeline
            const [ticket, timeline] = await Promise.all([
                api.getTicket(id),
                api.getTicketTimeline(id)
            ]);

            this.renderStageHeader(ticket);
            this.renderTimeline(timeline);
            this.renderMeta(ticket);

            // Populate Dropdowns if not done
            await this.populateDropdowns(ticket);

            this.elements.replyBox.classList.remove('hidden');

            // Scroll to bottom
            setTimeout(() => {
                this.elements.timelineScroll.scrollTop = this.elements.timelineScroll.scrollHeight;
            }, 50);

        } catch (error) {
            console.error('Error loading ticket details or timeline:', error);
            alert(`Ошибка загрузки тикета: ${error.message}`);
        } finally {
            if (this.elements.timelineScroll) {
                this.elements.timelineScroll.style.opacity = '1';
            }
        }
    }

    renderStageHeader(ticket) {
        this.elements.activeTicketTitle.textContent = ticket.title;
        this.elements.activeTicketId.textContent = `#${ticket.readable_id} • ${ticket.creator?.email || 'Unknown'}`;
        // Status will be handled by populateDropdowns
    }

    renderTimeline(events) {
        this.elements.timelineScroll.innerHTML = '';

        events.forEach(event => {
            const el = document.createElement('div');

            if (event.event_type === 'comment') {
                el.className = 'timeline-event';
                // Check if own message (simplified logic: rely on is_internal or user_id comparison if we had current user id)
                // For now, styling all comments as left-aligned bubbles. 
                // To do right-aligned for 'me', we need `api.getCurrentUser()`

                el.innerHTML = `
                    <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem">
                        ${(event.actor?.full_name || 'U')[0]}
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; margin-bottom: 0.25rem; color: var(--text-secondary)">
                            ${event.actor?.full_name || event.actor?.email} • ${new Date(event.created_at).toLocaleString()}
                        </div>
                        <div class="event-message ${event.is_internal ? 'internal' : ''}">
                            ${this.escapeHtml(event.content).replace(/\n/g, '<br>')}
                        </div>
                    </div>
                `;
            } else {
                // System Event
                el.className = 'event-system';
                el.textContent = event.content;
            }

            this.elements.timelineScroll.appendChild(el);
        });
    }

    renderMeta(ticket) {
        document.getElementById('metaClient').textContent = ticket.creator?.full_name || ticket.creator?.email || '-';
        if (this.elements.metaCompany) {
            this.elements.metaCompany.textContent = ticket.company?.name || 'Частное лицо';
        }
        document.getElementById('metaPriority').innerHTML = `<span class="badge badge-${ticket.priority}">${ticket.priority}</span>`;
        document.getElementById('metaAssignee').textContent = ticket.assignee?.full_name || '-';
        document.getElementById('metaSla').textContent = ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleDateString() : 'Нет';
    }

    async sendReply() {
        const text = this.elements.replyEditor.value.trim();
        if (!text || !this.activeTicketId) return;

        const isInternal = this.elements.internalNoteToggle ? this.elements.internalNoteToggle.checked : false;

        this.elements.sendReplyBtn.disabled = true;
        this.elements.sendReplyBtn.textContent = '...';

        try {
            await api.request('/comments/', {
                method: 'POST',
                body: JSON.stringify({
                    ticket_id: this.activeTicketId,
                    text: text,
                    is_internal: isInternal
                })
            });
            this.elements.replyEditor.value = '';
            if (this.elements.internalNoteToggle) this.elements.internalNoteToggle.checked = false;

            // Reload timeline
            const timeline = await api.getTicketTimeline(this.activeTicketId);
            this.renderTimeline(timeline);
            this.elements.timelineScroll.scrollTop = this.elements.timelineScroll.scrollHeight;
        } catch (error) {
            alert('Ошибка отправки: ' + error.message);
        } finally {
            this.elements.sendReplyBtn.disabled = false;
            this.elements.sendReplyBtn.textContent = 'Отправить';
        }
    }

    async updateTicketStatus() {
        const statusId = this.elements.ticketStatusSelect.value;
        if (!statusId || !this.activeTicketId) return;
        try {
            await api.request(`/tickets/${this.activeTicketId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status_id: parseInt(statusId) })
            });
            await this.loadTicket(this.activeTicketId, true);
            await this.loadTickets(true);
        } catch (e) { alert('Ошибка обновления статуса: ' + e.message); }
    }

    async updateTicketPriority() {
        const priority = this.elements.ticketPrioritySelect.value;
        if (!priority || !this.activeTicketId) return;
        try {
            await api.request(`/tickets/${this.activeTicketId}`, {
                method: 'PATCH',
                body: JSON.stringify({ priority: priority })
            });
            await this.loadTicket(this.activeTicketId, true);
        } catch (e) { alert('Ошибка обновления приоритета: ' + e.message); }
    }

    async updateTicketAssignment() {
        const agentId = this.elements.ticketAssignSelect.value;
        if (!this.activeTicketId) return;
        try {
            await api.request(`/tickets/${this.activeTicketId}`, {
                method: 'PATCH',
                body: JSON.stringify({ assigned_to: agentId ? parseInt(agentId) : null })
            });
            await this.loadTicket(this.activeTicketId, true);
            await this.loadTickets(true);
        } catch (e) { alert('Ошибка назначения: ' + e.message); }
    }

    openCreateModal() {
        if (this.elements.createTicketModal) {
            this.elements.createTicketModal.classList.remove('hidden');
        }
    }

    closeCreateModal() {
        if (this.elements.createTicketModal) {
            this.elements.createTicketModal.classList.add('hidden');
            this.elements.createTicketForm.reset();
        }
    }

    async populateDropdowns(ticket) {
        // Only load if not done or forced
        if (!this.allStatuses) {
            try {
                // We need an endpoint or mock for now. Let's assume we can get from tickets meta or similar.
                // For now, let's just hardcode standard statuses if no endpoint exists, 
                // but real app should fetch statuses.
                this.allStatuses = [
                    { id: 1, name: 'Новый' },
                    { id: 2, name: 'В работе' },
                    { id: 3, name: 'Решён' },
                    { id: 4, name: 'Закрыт' }
                ];

                this.elements.ticketStatusSelect.innerHTML = '<option value="">Статус...</option>' +
                    this.allStatuses.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            } catch (e) { console.error(e); }
        }

        if (!this.allAgents) {
            try {
                this.allAgents = await api.getUsers({ role: 'agent' });
                const admins = await api.getUsers({ role: 'admin' });
                this.allAgents = [...this.allAgents, ...admins];

                this.elements.ticketAssignSelect.innerHTML = '<option value="">Назначить...</option>' +
                    this.allAgents.map(a => `<option value="${a.id}">${a.full_name || a.email}</option>`).join('');
            } catch (e) { console.error(e); }
        }

        // Set current values
        if (ticket.status_id) this.elements.ticketStatusSelect.value = ticket.status_id;
        if (ticket.priority) this.elements.ticketPrioritySelect.value = ticket.priority;
        if (ticket.assigned_to) this.elements.ticketAssignSelect.value = ticket.assigned_to;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadSettings() {
        if (!this.currentUser) return;
        document.getElementById('settingsFullName').value = this.currentUser.full_name || '';
        document.getElementById('settingsEmail').value = this.currentUser.email || '';
    }

    async handleSettingsSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;

        const fullName = document.getElementById('settingsFullName').value;
        const password = document.getElementById('settingsPassword').value;

        const data = {};
        if (fullName !== this.currentUser.full_name) data.full_name = fullName;
        if (password) data.password = password;

        if (Object.keys(data).length === 0) {
            alert('Нет изменений для сохранения');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Сохранение...';

        try {
            const updated = await api.updateProfile(data);
            this.currentUser = updated;
            document.getElementById('settingsPassword').value = '';
            alert('Настройки успешно сохранены!');
            // Update UI avatar if needed
            if (this.elements.currentUserAvatar) {
                this.elements.currentUserAvatar.textContent = (updated.full_name || updated.email)[0].toUpperCase();
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            alert('Ошибка сохранения: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async handleCreateTicket(e) {
        e.preventDefault();
        const btn = this.elements.createTicketForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;

        const formData = {
            title: document.getElementById('newTicketTitle').value,
            description: document.getElementById('newTicketDescription').value,
            priority: document.getElementById('newTicketPriority').value
        };

        btn.disabled = true;
        btn.textContent = 'Создание...';

        try {
            await api.createTicket(formData);
            this.closeCreateModal();
            await this.loadTickets(); // Refresh list
            this.showToast('✅ Заявка создана и отправлена на обработку!');
        } catch (error) {
            console.error('Failed to create ticket:', error);
            this.showToast('Ошибка: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    handleFilterClick(e) {
        this.elements.filterTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        // Filter logic would go here (re-fetch with params)
        // For MVP: simply re-load all (or implementing client-side filter)
        this.loadTickets();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => {
    window.workspace = new AgentWorkspace();
});
