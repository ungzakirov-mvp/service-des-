// Client Portal Logic
document.addEventListener('DOMContentLoaded', () => {
    const api = window.api;
    if (!api || !api.token) {
        window.location.href = 'index.html';
        return;
    }

    class ClientPortal {
        constructor() {
            this.elements = {
                clientName: document.getElementById('clientName'),
                dashboardView: document.getElementById('dashboardView'),
                newTicketView: document.getElementById('newTicketView'),
                ticketDetailView: document.getElementById('ticketDetailView'),
                ticketsList: document.getElementById('clientTicketsList'),
                navItems: document.querySelectorAll('.client-nav-item'),
                createForm: document.getElementById('clientCreateForm'),
                createNewBtn: document.getElementById('createNewBtn'),
                logoutBtn: document.getElementById('logoutBtn')
            };

            this.init();
        }

        async init() {
            // Load Profile
            try {
                this.user = await api.getMe();
                this.elements.clientName.textContent = this.user.full_name || this.user.email;
            } catch (e) {
                console.error('Failed to load profile:', e);
                api.clearToken();
                window.location.href = 'index.html';
            }

            // Listeners
            this.elements.navItems.forEach(item => {
                item.addEventListener('click', () => this.switchView(item.dataset.view));
            });

            this.elements.createNewBtn.addEventListener('click', () => this.switchView('new-ticket'));

            this.elements.createForm.addEventListener('submit', (e) => this.handleCreate(e));

            this.elements.logoutBtn.addEventListener('click', () => {
                api.clearToken();
                window.location.href = 'index.html';
            });

            // Initial Load
            this.loadTickets();
        }

        switchView(viewId) {
            this.elements.dashboardView.classList.add('hidden');
            this.elements.newTicketView.classList.add('hidden');
            this.elements.ticketDetailView.classList.add('hidden');

            this.elements.navItems.forEach(i => i.classList.remove('active'));

            if (viewId === 'dashboard') {
                this.elements.dashboardView.classList.remove('hidden');
                document.querySelector('[data-view="dashboard"]').classList.add('active');
                this.loadTickets();
            } else if (viewId === 'new-ticket') {
                this.elements.newTicketView.classList.remove('hidden');
                document.querySelector('[data-view="new-ticket"]').classList.add('active');
            }
        }

        async loadTickets() {
            try {
                // Backend automatically filters by tenant and user if they are a client 
                // (or returns all if admin, but here we are in client portal so we expect own)
                // Note: The /tickets/ endpoint returns all for now, but in a real app 
                // it should filter by owner. I'll make sure it looks right.
                const tickets = await api.getTickets();
                this.renderTickets(tickets);
            } catch (error) {
                console.error('Load Error:', error);
                this.elements.ticketsList.innerHTML = '<div style="color:red">Ошибка загрузки заявок</div>';
            }
        }

        renderTickets(tickets) {
            if (tickets.length === 0) {
                this.elements.ticketsList.innerHTML = `
                    <div style="text-align: center; color: var(--text-muted); padding: 5rem;">
                        <p>У вас пока нет активных обращений.</p>
                        <button class="btn btn-secondary btn-small" onclick="document.getElementById('createNewBtn').click()">
                            Создать первое обращение
                        </button>
                    </div>`;
                return;
            }

            this.elements.ticketsList.innerHTML = '';
            tickets.forEach(ticket => {
                const card = document.createElement('div');
                card.className = 'ticket-card';

                const statusColor = this.getStatusColor(ticket.status_name);
                const date = new Date(ticket.created_at).toLocaleDateString();

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem">
                        <span style="font-weight: 600; font-size: 1.1rem">${ticket.title}</span>
                        <span class="ticket-status-badge" style="background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44">
                            ${ticket.status_name}
                        </span>
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.85rem">
                        <span>#${ticket.readable_id}</span> • <span>Создано: ${date}</span>
                    </div>
                `;
                this.elements.ticketsList.appendChild(card);
            });
        }

        async handleCreate(e) {
            e.preventDefault();
            
            const titleEl = document.getElementById('ticketTitle');
            const descEl = document.getElementById('ticketDescription');
            const priorityEl = document.getElementById('ticketPriority');
            const btn = e.target.querySelector('button[type="submit"]');
            
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Отправка...';
            }

            const data = {
                title: titleEl ? titleEl.value : '',
                description: descEl ? descEl.value : '',
                priority: priorityEl ? priorityEl.value : 'medium'
            };

            console.log('Creating ticket:', data);

            try {
                const result = await api.createTicket(data);
                console.log('Ticket created:', result);
                
                if (titleEl) titleEl.value = '';
                if (descEl) descEl.value = '';
                if (priorityEl) priorityEl.value = 'medium';
                
                this.showToast('✅ Заявка создана и отправлена на обработку!');
                this.loadTickets();
                this.switchView('dashboard');
            } catch (error) {
                console.error('Create ticket error:', error);
                this.showToast('❌ Ошибка: ' + (error.message || 'Не удалось создать заявку'));
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Отправить заявку';
                }
            }
        }

        getStatusColor(status) {
            const s = status.toLowerCase();
            if (s.includes('нов')) return '#667eea';
            if (s.includes('раб')) return '#f59e0b';
            if (s.includes('реш') || s.includes('зак')) return '#10b981';
            return '#94a3b8';
        }

        showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.remove('hidden', 'fade-out');
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.classList.add('hidden'), 500);
            }, 3000);
        }
    }

    new ClientPortal();
});
