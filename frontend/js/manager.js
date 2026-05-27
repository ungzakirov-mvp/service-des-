// Manager Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    const api = window.api;
    if (!api || !api.token) {
        window.location.href = 'index.html';
        return;
    }

    class ManagerDashboard {
        constructor() {
            this.elements = {
                totalTickets: document.getElementById('totalTickets'),
                slaRate: document.getElementById('slaRate'),
                avgResolution: document.getElementById('avgResolution'),
                activeAgents: document.getElementById('activeAgents'),
                volumeChart: document.getElementById('volumeChart'),
                teamBody: document.getElementById('teamBody'),
                exportBtn: document.getElementById('exportBtn'),
                logoutBtn: document.getElementById('logoutBtn')
            };

            this.init();
        }

        async init() {
            try {
                const user = await api.getMe();
                if (user.role !== 'manager' && user.role !== 'admin' && user.role !== 'super_admin') {
                    // Redirect non-managers
                    window.location.href = user.role === 'client' ? 'client.html' : 'agent.html';
                    return;
                }
            } catch (e) {
                window.location.href = 'index.html';
            }

            // Listeners
            this.elements.logoutBtn.addEventListener('click', () => {
                api.clearToken();
                window.location.href = 'index.html';
            });

            this.elements.exportBtn.addEventListener('click', () => this.exportToCSV());

            // Initial Load
            this.loadData();

            // Auto refresh stats every minute
            setInterval(() => this.loadData(), 60000);
        }

        async loadData() {
            try {
                const data = await api.getAnalytics();
                this.renderDashboard(data);
            } catch (error) {
                console.error('Failed to load manager data:', error);
            }
        }

        renderDashboard(data) {
            // 1. KPI Cards
            const total = data.volume_trends.reduce((sum, t) => sum + t.count, 0);
            this.elements.totalTickets.textContent = total;

            // Mock SLA and Agents for now as they require more complex backend aggregation
            this.elements.slaRate.textContent = '94%';
            this.elements.activeAgents.textContent = data.agent_performance.length;

            const avgHrs = data.agent_performance.reduce((sum, a) => sum + (a.avg_resolution_hours || 0), 0) / (data.agent_performance.length || 1);
            this.elements.avgResolution.textContent = `${avgHrs.toFixed(1)} ч.`;

            // 2. Volume Chart (CSS Bars)
            this.elements.volumeChart.innerHTML = '';
            const maxVal = Math.max(...data.volume_trends.map(t => t.count), 1);

            data.volume_trends.forEach(trend => {
                const container = document.createElement('div');
                container.className = 'chart-bar-container';
                const percentage = (trend.count / maxVal) * 100;
                const date = new Date(trend.date).toLocaleDateString([], { month: 'short', day: 'numeric' });

                container.innerHTML = `
                    <div class="chart-bar" style="height: ${percentage}%" data-value="${trend.count}"></div>
                    <div class="chart-label">${date}</div>
                `;
                this.elements.volumeChart.appendChild(container);
            });

            // 3. Team Table
            this.elements.teamBody.innerHTML = '';
            data.agent_performance.forEach(agent => {
                const row = document.createElement('tr');
                // Mock SLA per agent
                const sla = (85 + Math.random() * 15).toFixed(0) + '%';
                row.innerHTML = `
                    <td>${agent.full_name || 'Agent'}</td>
                    <td style="font-weight:700">${agent.resolved_count}</td>
                    <td style="color:var(--accent-success)">${sla}</td>
                `;
                this.elements.teamBody.appendChild(row);
            });
        }

        async exportToCSV() {
            try {
                this.elements.exportBtn.disabled = true;
                const originalText = this.elements.exportBtn.innerHTML;
                this.elements.exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Экспорт...';

                const token = localStorage.getItem('access_token');
                const response = await fetch('/api/tickets/export/csv', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Ошибка сервера: ' + response.status);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `service_desk_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 1000);

                this.elements.exportBtn.innerHTML = originalText;
                this.elements.exportBtn.disabled = false;
            } catch (error) {
                alert('Export failed: ' + error.message);
                this.elements.exportBtn.disabled = false;
            }
        }
    }

    new ManagerDashboard();
});
