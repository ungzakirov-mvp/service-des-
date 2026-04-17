// API Client for Service Desk Backend

// Always use relative /api path - nginx will proxy to backend
const API_BASE_URL = '/api';

class APIClient {
    constructor() {
        this.token = localStorage.getItem('access_token');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            console.log(`API Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });
            console.log(`API Response: ${response.status} from ${endpoint}`);

            if (response.status === 401) {
                // If it's NOT an auth endpoint, it's a session expiry
                const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');

                if (!isAuthEndpoint) {
                    console.warn('Unauthorized request - clearing token and redirecting');
                    this.clearToken();
                    if (!window.location.pathname.includes('index.html')) {
                        window.location.href = 'index.html';
                    }
                    throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
                }
                // If it IS auth endpoint, just let it fall through to the general error handler
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { detail: 'Network error or invalid server response' };
                }
                // Handle Pydantic validation errors (array format)
                let errorMessage = 'Request failed';
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(e => `${e.loc?.join('.')} - ${e.msg}`).join('; ');
                } else if (errorData.detail) {
                    errorMessage = JSON.stringify(errorData.detail);
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('access_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('access_token');
    }

    // ... rest of the methods remain same but I will rewrite them to be sure

    async register(email, password, fullName) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name: fullName })
        });
        this.setToken(response.access_token);
        return response;
    }

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(response.access_token);
        return response;
    }

    async getStats() {
        return await this.request('/stats');
    }

    async getAnalytics() {
        return await this.request('/analytics');
    }

    async getTickets(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/tickets/?${params}`);
    }

    async createTicket(data) {
        return await this.request('/tickets/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getTicket(id) {
        return await this.request(`/tickets/${id}`);
    }

    async acceptTicket(id) {
        return await this.request(`/tickets/${id}/accept`, { method: 'POST' });
    }

    async resolveTicket(id, resolutionComment = '') {
        return await this.request(`/tickets/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ resolution_comment: resolutionComment })
        });
    }

    async closeTicket(id) {
        return await this.request(`/tickets/${id}/close`, { method: 'POST' });
    }

    async reopenTicket(id, reason = '') {
        return await this.request(`/tickets/${id}/reopen`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }

    async assignTicket(id, agentId) {
        return await this.request(`/tickets/${id}/assign/${agentId}`, { method: 'POST' });
    }

    async rateTicket(id, rating, comment) {
        return await this.request(`/tickets/${id}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating, comment })
        });
    }

    async getAgentStats() {
        return await this.request('/tickets/stats/agents');
    }

    async getTicketTimeline(ticketId) {
        return await this.request(`/tickets/${ticketId}/timeline`);
    }

    async getMe() {
        return await this.request('/auth/me');
    }

    async getComments(ticketId) {
        return await this.request(`/comments/ticket/${ticketId}`);
    }

    async createComment(ticketId, text) {
        return await this.request('/comments/', {
            method: 'POST',
            body: JSON.stringify({ ticket_id: ticketId, text })
        });
    }

    async updateProfile(data) {
        return await this.request('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // Users
    async getUsers(filters = {}) {
        const query = new URLSearchParams(filters);
        return await this.request(`/users/?${query}`);
    }

    async createUser(data) {
        return await this.request('/users/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // CRM
    async getCompanies() {
        return await this.request('/crm/companies');
    }

    async getCompany(id) {
        return await this.request(`/crm/companies/${id}`);
    }

    async createCompany(data) {
        return await this.request('/crm/companies', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async editCompany(id, data) {
        return await this.request(`/crm/companies/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async deleteCompany(id) {
        return await this.request(`/crm/companies/${id}`, {
            method: 'DELETE'
        });
    }

    async editUser(id, data) {
        return await this.request(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    async getCompanyContacts(id) {
        return await this.request(`/crm/companies/${id}/contacts`);
    }

    // Time Tracking
    async logTime(data) {
        return await this.request('/timetracking/log', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getTicketTimeEntries(ticketId) {
        return await this.request(`/timetracking/ticket/${ticketId}`);
    }

    async getTicketTotalTime(ticketId) {
        return await this.request(`/timetracking/ticket/${ticketId}/total`);
    }

    // Knowledge Base
    async getKBCategories() {
        return await this.request('/kb/categories');
    }

    async createKBCategory(data) {
        return await this.request('/kb/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getKBArticles(params = {}) {
        const query = new URLSearchParams(params);
        return await this.request(`/kb/articles?${query}`);
    }

    async createKBArticle(data) {
        return await this.request('/kb/articles', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getKBArticle(id) {
        return await this.request(`/kb/articles/${id}`);
    }

    // Audit
    async getAuditLogs(params = {}) {
        const query = new URLSearchParams(params);
        return await this.request(`/audit/logs?${query}`);
    }

    // Subscriptions
    async getSubscriptions(companyId) {
        return await this.request(`/crm/companies/${companyId}/subscriptions`);
    }
    async createSubscription(companyId, data) {
        return await this.request(`/crm/companies/${companyId}/subscriptions`, {
            method: 'POST', body: JSON.stringify(data)
        });
    }
    async updateSubscription(subId, data) {
        return await this.request(`/crm/subscriptions/${subId}`, {
            method: 'PATCH', body: JSON.stringify(data)
        });
    }
    async deleteSubscription(subId) {
        return await this.request(`/crm/subscriptions/${subId}`, { method: 'DELETE' });
    }
    async getExpiringSubscriptions(days = 30) {
        return await this.request(`/crm/subscriptions/expiring?days=${days}`);
    }

    // Employees
    async getEmployees(companyId) {
        return await this.request(`/crm/companies/${companyId}/employees`);
    }
    async createEmployee(companyId, data) {
        return await this.request(`/crm/companies/${companyId}/employees`, {
            method: 'POST', body: JSON.stringify(data)
        });
    }
    async updateEmployee(empId, data) {
        return await this.request(`/crm/employees/${empId}`, {
            method: 'PATCH', body: JSON.stringify(data)
        });
    }
    async deleteEmployee(empId) {
        return await this.request(`/crm/employees/${empId}`, { method: 'DELETE' });
    }

    // Rating
    async rateTicket(ticketId, rating, comment) {
        return await this.request(`/tickets/${ticketId}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating, comment })
        });
    }
}

// Export to window object explicitly
window.api = new APIClient();
