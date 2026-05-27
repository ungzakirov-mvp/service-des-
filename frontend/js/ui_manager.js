/* ============================================================
   UIManager — singleton overlay/modal/drawer manager
   ABSOLUTE RULE: only one active overlay at a time.
   ============================================================ */
const UIManager = {
    _stack: [],
    _overlay: null,
    _isMobile: function() { return window.innerWidth < 768; },

    init: function() {
        this._overlay = document.createElement('div');
        this._overlay.id = 'uiOverlay';
        this._overlay.className = 'ui-overlay-backdrop';
        this._overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:none;transition:opacity 0.2s ease;';
        this._overlay.addEventListener('click', function() { UIManager.closeTop(); });
        document.body.appendChild(this._overlay);

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') UIManager.closeTop();
        });
    },

    open: function(content, opts) {
        opts = opts || {};
        var title = opts.title || '';
        var type = opts.type || 'modal';
        var onClose = opts.onClose || null;
        var width = opts.width || (this._isMobile() ? '100%' : '560px');
        var fullScreen = opts.fullScreen || false;

        this.closeAll();

        var container = document.createElement('div');
        container.className = 'ui-overlay-container' + (this._isMobile() && !fullScreen ? ' ui-bottom-sheet' : '');
        container.style.cssText = this._isMobile() && !fullScreen
            ? 'position:fixed;bottom:0;left:0;right:0;max-height:90vh;z-index:10000;background:#0a0a1e;border-top:2px solid rgba(0,212,255,0.3);border-radius:20px 20px 0 0;display:flex;flex-direction:column;animation:slideUp 0.3s ease;'
            : 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:' + width + ';max-width:95vw;max-height:90vh;z-index:10000;background:#0a0a1e;border:1px solid rgba(0,212,255,0.2);border-radius:16px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5);';

        if (title || !fullScreen) {
            var header = document.createElement('div');
            header.style.cssText = 'padding:1rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
            header.innerHTML = '<h3 style="margin:0;color:#f0f0f0;font-size:1.1rem;">' + this._escapeHtml(title) + '</h3>' +
                '<button onclick="UIManager.closeTop()" style="background:none;border:none;color:#888;font-size:1.5rem;cursor:pointer;padding:0.25rem 0.5rem;border-radius:8px;transition:all 0.2s;" onmouseover="this.style.color=\'#fff\';this.style.background=\'rgba(255,255,255,0.1)\'" onmouseout="this.style.color=\'#888\';this.style.background=\'none\'">&times;</button>';
            container.appendChild(header);
        }

        var body = document.createElement('div');
        body.className = 'ui-overlay-body';
        body.style.cssText = 'padding:1.5rem;overflow-y:auto;flex:1;';
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }
        container.appendChild(body);

        var entry = { container: container, onClose: onClose };
        this._stack.push(entry);

        document.body.appendChild(container);
        this._overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';

        return entry;
    },

    closeTop: function() {
        if (this._stack.length === 0) return;
        var entry = this._stack.pop();
        if (entry.container && entry.container.parentNode) {
            entry.container.parentNode.removeChild(entry.container);
        }
        if (entry.onClose) entry.onClose();

        if (this._stack.length === 0) {
            this._overlay.style.display = 'none';
            document.body.style.overflow = '';
        } else {
            document.body.appendChild(this._stack[this._stack.length - 1].container);
        }
    },

    closeAll: function() {
        while (this._stack.length > 0) {
            var entry = this._stack.pop();
            if (entry.container && entry.container.parentNode) {
                entry.container.parentNode.removeChild(entry.container);
            }
            if (entry.onClose) entry.onClose();
        }
        this._overlay.style.display = 'none';
        document.body.style.overflow = '';
    },

    isOpen: function() {
        return this._stack.length > 0;
    },

    confirm: function(message, onConfirm) {
        var content = '<p style="color:var(--text-secondary);margin-bottom:1.5rem;">' + this._escapeHtml(message) + '</p>' +
            '<div style="display:flex;gap:0.75rem;justify-content:flex-end;">' +
            '<button onclick="UIManager.closeTop()" style="padding:0.6rem 1.2rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#ccc;cursor:pointer;">' + i18n.t('cancel') + '</button>' +
            '<button id="uiConfirmBtn" style="padding:0.6rem 1.2rem;background:#ef4444;border:none;border-radius:8px;color:white;cursor:pointer;">' + i18n.t('delete') + '</button>' +
            '</div>';
        var entry = this.open(content, { title: i18n.t('confirm_delete') });
        document.getElementById('uiConfirmBtn').onclick = function() {
            UIManager.closeTop();
            if (onConfirm) onConfirm();
        };
    },

    toast: function(message, type) {
        type = type || 'info';
        var colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
        var icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:1rem 1.5rem;background:#1a1a2e;border:1px solid ' + (colors[type] || colors.info) + ';border-radius:12px;color:white;z-index:10001;display:flex;align-items:center;gap:0.75rem;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:toastIn 0.3s ease;max-width:350px;';
        toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '" style="color:' + (colors[type] || colors.info) + ';font-size:1.1rem;"></i><span>' + this._escapeHtml(message) + '</span>';
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3500);
    },

    _escapeHtml: function(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
};

window.UIManager = UIManager;
document.addEventListener('DOMContentLoaded', function() { UIManager.init(); });

/* ============================================================
   Hash Router
   ============================================================ */
const Router = {
    routes: {},
    currentRoute: null,

    register: function(path, handler) {
        this.routes[path] = handler;
    },

    navigate: function(path) {
        window.location.hash = path;
    },

    init: function() {
        var self = this;
        window.addEventListener('hashchange', function() { self.resolve(); });
        window.addEventListener('popstate', function() { self.resolve(); });

        if (!window.location.hash) {
            window.location.hash = '#/tickets';
        } else {
            self.resolve();
        }
    },

    resolve: function() {
        var hash = window.location.hash.slice(1) || '/tickets';
        var parts = hash.split('/').filter(Boolean);
        var basePath = '/' + parts.slice(0, 2).join('/');

        UIManager.closeAll();

        var mainContent = document.querySelector('.main-content .view-container');
        if (!mainContent) mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        var views = mainContent.querySelectorAll('.view');
        views.forEach(function(v) { v.classList.add('hidden'); v.style.display = ''; });

        var routeKey = basePath;
        var param = parts[2] || null;
        var subAction = parts[3] || null;

        if (parts.length >= 3 && !isNaN(parseInt(parts[2]))) {
            routeKey = '/' + parts[0] + '/' + parts[1] + '/:id';
            param = parseInt(parts[2]);
            subAction = parts[3] || 'view';
        }

        var handler = this.routes[routeKey];
        if (handler) {
            handler(param, subAction);
        } else {
            var defaultView = document.getElementById('dashboardView');
            if (defaultView) {
                defaultView.classList.remove('hidden');
                defaultView.style.display = '';
            }
        }

        this.updateNav(hash);
        this.currentRoute = hash;
    },

    updateNav: function(hash) {
        document.querySelectorAll('.side-link').forEach(function(link) {
            link.classList.remove('active');
            var page = link.getAttribute('data-page');
            if (page && hash.includes(page)) {
                link.classList.add('active');
            }
        });
    }
};

window.Router = Router;

/* Animation keyframes for bottom sheet */
var styleSheet = document.createElement('style');
styleSheet.textContent = '@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes toastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
document.head.appendChild(styleSheet);