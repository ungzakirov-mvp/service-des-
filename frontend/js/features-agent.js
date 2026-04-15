/**
 * Features for Agent Interface
 * Time tracking, canned responses, checklists, internal notes, assets
 */

// ============================================
// TIME TRACKING ( переиспользуем timerInterval из features-simple.js)
// ============================================
let agentTimerInterval = null;
let currentTimerEntry = null;
let timerStartTime = null;

// Initialize timer on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkTimerStatus();
});

async function checkTimerStatus() {
    try {
        const status = await featuresAPI.getTimerStatus();
        if (status.is_running && status.current_entry) {
            currentTimerEntry = status.current_entry;
            timerStartTime = new Date(currentTimerEntry.started_at);
            showTimerWidget();
            startTimerDisplay();
        }
    } catch (e) {
        console.error('Error checking timer status:', e);
    }
}

async function startTimer(ticketId) {
    try {
        const entry = await featuresAPI.startTimer(ticketId, `Работа над тикетом #${ticketId}`);
        currentTimerEntry = entry;
        timerStartTime = new Date();
        showTimerWidget();
        startTimerDisplay();
        showToast('Таймер запущен', 'success');
    } catch (e) {
        showToast(e.message || 'Ошибка запуска таймера', 'error');
    }
}

async function stopTimer() {
    if (!currentTimerEntry) return;
    
    try {
        await featuresAPI.stopTimer(currentTimerEntry.id);
        stopTimerDisplay();
        hideTimerWidget();
        currentTimerEntry = null;
        showToast('Таймер остановлен', 'success');
        
        // Refresh time summary for current ticket
        if (window.currentTicketId) {
            await loadTimeSummary(window.currentTicketId);
        }
    } catch (e) {
        showToast(e.message || 'Ошибка остановки таймера', 'error');
    }
}

function showTimerWidget() {
    const widget = document.getElementById('timeTrackerWidget');
    if (widget) {
        widget.style.display = 'block';
        // Update ticket info
        const ticketInfo = document.getElementById('timerTicketInfo');
        if (ticketInfo && window.currentTicketId) {
            ticketInfo.textContent = `Тикет #${window.currentTicketId}`;
        }
    }
}

function hideTimerWidget() {
    const widget = document.getElementById('timeTrackerWidget');
    if (widget) {
        widget.style.display = 'none';
    }
}

function startTimerDisplay() {
    updateTimerDisplay();
    agentTimerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimerDisplay() {
    if (agentTimerInterval) {
        clearInterval(agentTimerInterval);
        agentTimerInterval = null;
    }
}

function updateTimerDisplay() {
    if (!timerStartTime) return;
    
    const now = new Date();
    const diff = Math.floor((now - timerStartTime) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
}

async function loadTimeSummary(ticketId) {
    try {
        const summary = await featuresAPI.getTicketTimeSummary(ticketId);
        const section = document.getElementById('timeSummarySection');
        const value = document.getElementById('timeSummaryValue');
        
        if (!section) return;
        
        if (summary.total_minutes > 0) {
            section.style.display = 'block';
            const hours = Math.floor(summary.total_minutes / 60);
            const mins = summary.total_minutes % 60;
            value.textContent = `${hours}ч ${mins}м`;
            
            if (summary.billable_minutes !== summary.total_minutes) {
                const billHours = Math.floor(summary.billable_minutes / 60);
                const billMins = summary.billable_minutes % 60;
                value.textContent += ` (опл. ${billHours}ч ${billMins}м)`;
            }
        } else {
            section.style.display = 'none';
        }
    } catch (e) {
        console.error('Error loading time summary:', e);
    }
}

// ============================================
// AGENT CANNED RESPONSES (uses API)
// ============================================
// Reuses cannedResponses from features-simple.js or loads from API if needed
let _agentCannedResponses = null;

async function getAgentCannedResponses() {
    if (_agentCannedResponses) return _agentCannedResponses;
    try {
        _agentCannedResponses = await featuresAPI.getCannedResponses();
    } catch (e) {
        console.error('Error loading canned responses:', e);
        _agentCannedResponses = [];
    }
    return _agentCannedResponses;
}

document.addEventListener('DOMContentLoaded', async () => {
    await getAgentCannedResponses();
});

// Handle / shortcut in reply editor
document.getElementById('replyEditor')?.addEventListener('input', function(e) {
    const cursorPosition = this.selectionStart;
    const textBeforeCursor = this.value.substring(0, cursorPosition);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
        const searchTerm = textBeforeCursor.substring(lastSlashIndex + 1).toLowerCase();
        if (searchTerm.length >= 1) {
            showCannedResponsesDropdown(searchTerm, lastSlashIndex);
        } else {
            hideCannedResponsesDropdown();
        }
    } else {
        hideCannedResponsesDropdown();
    }
});

async function showCannedResponsesDropdown(searchTerm, slashIndex) {
    const dropdown = document.getElementById('cannedResponsesDropdown');
    const responses = await getAgentCannedResponses();
    const filtered = responses.filter(r => 
        r.title.toLowerCase().includes(searchTerm) || 
        (r.shortcut && r.shortcut.toLowerCase().includes(searchTerm))
    );
    
    if (filtered.length === 0) {
        hideCannedResponsesDropdown();
        return;
    }
    
    dropdown.innerHTML = filtered.map(r => `
        <div class="canned-response-item" onclick="insertCannedResponse('${r.content.replace(/'/g, "\\'")}', ${slashIndex})">
            <div class="canned-response-title">
                ${r.title}
                ${r.shortcut ? `<span class="canned-response-shortcut">/${r.shortcut}</span>` : ''}
            </div>
            <div class="canned-response-preview">${r.content.substring(0, 60)}...</div>
        </div>
    `).join('');
    
    dropdown.classList.remove('hidden');
}

function hideCannedResponsesDropdown() {
    document.getElementById('cannedResponsesDropdown')?.classList.add('hidden');
}

function insertCannedResponse(content, slashIndex) {
    const editor = document.getElementById('replyEditor');
    const currentValue = editor.value;
    const beforeSlash = currentValue.substring(0, slashIndex);
    const afterCursor = currentValue.substring(editor.selectionStart);
    
    editor.value = beforeSlash + content + afterCursor;
    hideCannedResponsesDropdown();
    editor.focus();
}

// Show/hide canned responses button
document.getElementById('showCannedResponsesBtn')?.addEventListener('click', async () => {
    const dropdown = document.getElementById('cannedResponsesDropdown');
    if (dropdown.classList.contains('hidden')) {
        await loadCannedResponses();
        showCannedResponsesDropdown('', -1);
    } else {
        hideCannedResponsesDropdown();
    }
});

// Start timer button
document.getElementById('startTimerBtn')?.addEventListener('click', () => {
    if (window.currentTicketId) {
        startTimer(window.currentTicketId);
    } else {
        showToast('Сначала выберите тикет', 'warning');
    }
});

// ============================================
// CHECKLISTS
// ============================================
async function loadChecklist(ticketId) {
    try {
        const items = await featuresAPI.getChecklist(ticketId);
        const panel = document.getElementById('checklistPanel');
        const container = document.getElementById('checklistItems');
        const progress = document.getElementById('checklistProgress');
        
        if (!panel) return;
        
        if (items.length === 0) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        
        const completed = items.filter(i => i.is_completed).length;
        progress.textContent = `${completed}/${items.length}`;
        
        container.innerHTML = items.map(item => `
            <div class="checklist-item ${item.is_completed ? 'completed' : ''}">
                <div class="checklist-checkbox ${item.is_completed ? 'checked' : ''}" onclick="toggleChecklistItem(${item.id})">
                    ${item.is_completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="checklist-content">
                    <div class="checklist-text">${item.title}</div>
                    ${item.description ? `<div class="checklist-description">${item.description}</div>` : ''}
                </div>
                <div class="checklist-delete" onclick="deleteChecklistItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Error loading checklist:', e);
    }
}

async function addChecklistItem() {
    const input = document.getElementById('newChecklistItem');
    const title = input.value.trim();
    
    if (!title || !window.currentTicketId) return;
    
    try {
        await featuresAPI.addChecklistItem(window.currentTicketId, title);
        input.value = '';
        await loadChecklist(window.currentTicketId);
        showToast('Пункт добавлен', 'success');
    } catch (e) {
        showToast('Ошибка добавления пункта', 'error');
    }
}

async function toggleChecklistItem(itemId) {
    try {
        await featuresAPI.toggleChecklistItem(itemId);
        await loadChecklist(window.currentTicketId);
    } catch (e) {
        showToast('Ошибка обновления', 'error');
    }
}

async function deleteChecklistItem(itemId) {
    if (!confirm('Удалить этот пункт?')) return;
    
    try {
        await featuresAPI.deleteChecklistItem(itemId);
        await loadChecklist(window.currentTicketId);
        showToast('Пункт удален', 'success');
    } catch (e) {
        showToast('Ошибка удаления', 'error');
    }
}

// Enter key in checklist input
document.getElementById('newChecklistItem')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addChecklistItem();
    }
});

// ============================================
// INTERNAL NOTES
// ============================================
async function loadInternalNotes(ticketId) {
    try {
        const notes = await featuresAPI.getInternalNotes(ticketId);
        const panel = document.getElementById('internalNotesPanel');
        const list = document.getElementById('internalNotesList');
        
        if (!panel) return;
        
        if (notes.length === 0) {
            list.innerHTML = '<div style="color: var(--text-tertiary); padding: 1rem; text-align: center;">Нет приватных заметок</div>';
        } else {
            list.innerHTML = notes.map(note => `
                <div class="internal-note-item ${note.is_pinned ? 'pinned' : ''}">
                    <div class="internal-note-header">
                        <span class="internal-note-author">${note.user_name || 'Агент'}</span>
                        <span class="internal-note-date">${new Date(note.created_at).toLocaleString()}</span>
                    </div>
                    <div class="internal-note-content">${note.content}</div>
                </div>
            `).join('');
        }
        
        panel.style.display = 'block';
    } catch (e) {
        console.error('Error loading internal notes:', e);
    }
}

async function addInternalNote() {
    const textarea = document.getElementById('internalNoteText');
    const content = textarea.value.trim();
    
    if (!content || !window.currentTicketId) return;
    
    try {
        await featuresAPI.createInternalNote(window.currentTicketId, content);
        textarea.value = '';
        await loadInternalNotes(window.currentTicketId);
        showToast('Заметка добавлена', 'success');
    } catch (e) {
        showToast('Ошибка добавления заметки', 'error');
    }
}

// ============================================
// CUSTOMER ASSETS
// ============================================
async function loadCustomerAssets(companyId) {
    if (!companyId) {
        document.getElementById('customerAssetsList').innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.85rem;">Клиент не привязан к организации</div>';
        return;
    }
    
    try {
        const assets = await featuresAPI.getCompanyAssets(companyId);
        const container = document.getElementById('customerAssetsList');
        
        if (assets.length === 0) {
            container.innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.85rem;">Нет зарегистрированного оборудования</div>';
            return;
        }
        
        container.innerHTML = assets.map(asset => `
            <div class="asset-item" style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-${getAssetIcon(asset.asset_type)}" style="color: var(--jarvis-cyan);"></i>
                    <strong style="color: var(--text-primary); font-size: 0.9rem;">${asset.name}</strong>
                    <span class="asset-status ${asset.status}">${getAssetStatusLabel(asset.status)}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-tertiary);">
                    ${asset.model || 'Модель не указана'}
                </div>
                ${asset.remote_access_id ? `
                    <div style="margin-top: 0.5rem;">
                        <span class="remote-access-badge" onclick="copyToClipboard('${asset.remote_access_id}')">
                            <i class="fas fa-desktop"></i> ${asset.remote_access_id}
                        </span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (e) {
        console.error('Error loading assets:', e);
        document.getElementById('customerAssetsList').innerHTML = '<div style="color: var(--text-tertiary);">Ошибка загрузки</div>';
    }
}

function getAssetIcon(type) {
    const icons = {
        'computer': 'desktop',
        'server': 'server',
        'printer': 'print',
        'network': 'network-wired'
    };
    return icons[type] || 'box';
}

function getAssetStatusLabel(status) {
    const labels = {
        'active': 'Активно',
        'repair': 'В ремонте',
        'retired': 'Списано'
    };
    return labels[status] || status;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('ID скопирован: ' + text, 'success');
    });
}

function showAddAssetModal() {
    // TODO: Implement asset creation modal
    showToast('Функция добавления оборудования в разработке', 'info');
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function showToast(message, type = 'info') {
    // Use existing toast implementation from agent.js or create simple one
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 2rem;
        background: ${type === 'success' ? 'rgba(16,185,129,0.9)' : type === 'error' ? 'rgba(244,63,94,0.9)' : 'rgba(59,130,246,0.9)'};
        color: white;
        border-radius: 8px;
        z-index: 9999;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Override selectTicket to load new data
const originalSelectTicket = window.selectTicket;
window.selectTicket = async function(ticketId) {
    window.currentTicketId = ticketId;
    
    // Call original function
    if (originalSelectTicket) {
        await originalSelectTicket(ticketId);
    }
    
    // Load new features
    await loadChecklist(ticketId);
    await loadInternalNotes(ticketId);
    await loadTimeSummary(ticketId);
    
    // Load assets if company is available
    const companyId = document.getElementById('metaCompany')?.dataset?.companyId;
    if (companyId) {
        await loadCustomerAssets(companyId);
    }
};

// Force show feature buttons on page load
function forceShowFeatureButtons() {
    const buttons = ['btnTimer', 'btnChecklist', 'btnInternalNote'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.style.cssText += '; display: inline-flex !important; visibility: visible !important; opacity: 1 !important;';
        }
    });
}

// Button event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Force show buttons after a short delay
    setTimeout(forceShowFeatureButtons, 500);
    setTimeout(forceShowFeatureButtons, 1000);
    
    // Timer button
    document.getElementById('btnTimer')?.addEventListener('click', () => {
        if (window.currentTicketId) {
            startTimer(window.currentTicketId);
        } else {
            showToast('Сначала выберите тикет', 'warning');
        }
    });
    
    // Checklist button - show panel and add first item
    document.getElementById('btnChecklist')?.addEventListener('click', () => {
        if (window.currentTicketId) {
            const panel = document.getElementById('checklistPanel');
            panel.style.display = 'block';
            document.getElementById('newChecklistItem')?.focus();
        } else {
            showToast('Сначала выберите тикет', 'warning');
        }
    });
    
    // Internal note button - show panel
    document.getElementById('btnInternalNote')?.addEventListener('click', () => {
        if (window.currentTicketId) {
            const panel = document.getElementById('internalNotesPanel');
            panel.style.display = 'block';
            document.getElementById('internalNoteText')?.focus();
        } else {
            showToast('Сначала выберите тикет', 'warning');
        }
    });
});

// Global functions
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.addChecklistItem = addChecklistItem;
window.toggleChecklistItem = toggleChecklistItem;
window.deleteChecklistItem = deleteChecklistItem;
window.addInternalNote = addInternalNote;
window.copyToClipboard = copyToClipboard;
window.showAddAssetModal = showAddAssetModal;