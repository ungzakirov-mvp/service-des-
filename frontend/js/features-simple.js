/**
 * Simple Features Integration
 * Timer, Checklists, Notes, Canned Responses
 */

// currentTicketId уже объявлен в app.js
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

// ============================================
// MODAL FUNCTIONS
// ============================================
function openModal(modalId) {
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

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    document.body.style.overflow = '';
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// Close modal on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
});

// ============================================
// TIMER
// ============================================
function openTimerModal() {
    openModal('timerModal');
    updateTimerDisplay();
}

function startTimer() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    document.getElementById('timerStartBtn').style.display = 'none';
    document.getElementById('timerStopBtn').style.display = 'inline-flex';
    
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
    
    showToast('Таймер запущен!', 'success');
}

function stopTimer() {
    if (!isTimerRunning) return;
    
    isTimerRunning = false;
    clearInterval(timerInterval);
    
    document.getElementById('timerStartBtn').style.display = 'inline-flex';
    document.getElementById('timerStopBtn').style.display = 'none';
    
    // Save time entry
    const minutes = Math.floor(timerSeconds / 60);
    if (minutes > 0 && currentTicketId) {
        console.log(`Saving ${minutes} minutes for ticket ${currentTicketId}`);
        // TODO: API call to save time
    }
    
    showToast(`Таймер остановлен. Записано: ${formatTime(timerSeconds)}`, 'success');
    timerSeconds = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = formatTime(timerSeconds);
    }
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// CHECKLIST
// ============================================
let checklistItems = [];

function openChecklistModal() {
    openModal('checklistModal');
    loadChecklist();
}

function loadChecklist() {
    // Mock data - replace with API call
    checklistItems = [
        { id: 1, text: 'Принять заявку', completed: true },
        { id: 2, text: 'Диагностировать проблему', completed: false },
        { id: 3, text: 'Связаться с клиентом', completed: false },
    ];
    renderChecklist();
}

function renderChecklist() {
    const container = document.getElementById('checklistItems');
    const progress = document.getElementById('checklistProgress');
    
    if (!container) return;
    
    const completed = checklistItems.filter(i => i.completed).length;
    if (progress) progress.textContent = `${completed}/${checklistItems.length}`;
    
    container.innerHTML = checklistItems.map(item => `
        <div class="checklist-item ${item.completed ? 'completed' : ''}" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer;" onclick="toggleChecklistItem(${item.id})">
            <div class="checklist-checkbox ${item.completed ? 'checked' : ''}" style="width: 22px; height: 22px; border: 2px solid ${item.completed ? 'var(--jarvis-emerald)' : 'rgba(255,255,255,0.2)'}; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${item.completed ? '<i class="fas fa-check" style="color: var(--jarvis-emerald); font-size: 0.75rem;"></i>' : ''}
            </div>
            <div class="checklist-text" style="${item.completed ? 'text-decoration: line-through; color: var(--text-tertiary);' : 'color: var(--text-primary);'} flex: 1;">${item.text}</div>
            <i class="fas fa-trash" style="color: var(--text-tertiary); cursor: pointer;" onclick="event.stopPropagation(); deleteChecklistItem(${item.id})"></i>
        </div>
    `).join('');
}

function toggleChecklistItem(id) {
    const item = checklistItems.find(i => i.id === id);
    if (item) {
        item.completed = !item.completed;
        renderChecklist();
    }
}

function deleteChecklistItem(id) {
    checklistItems = checklistItems.filter(i => i.id !== id);
    renderChecklist();
}

function addChecklistItem() {
    const input = document.getElementById('newChecklistItem');
    const text = input?.value?.trim();
    
    if (!text) return;
    
    checklistItems.push({
        id: Date.now(),
        text: text,
        completed: false
    });
    
    input.value = '';
    renderChecklist();
}

// ============================================
// NOTES
// ============================================
let notes = [];

function openNoteModal() {
    openModal('noteModal');
    loadNotes();
}

function loadNotes() {
    // Mock data - replace with API call
    notes = [
        { id: 1, text: 'Клиенту нужно обновить драйвера', author: 'Иван П.', date: '2025-04-14 15:30' },
    ];
    renderNotes();
}

function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;
    
    if (notes.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 2rem;"><i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>Нет заметок</div>';
        return;
    }
    
    container.innerHTML = notes.map(note => `
        <div style="background: rgba(139,92,246,0.05); border-left: 3px solid var(--jarvis-violet); padding: 1rem; border-radius: 0 8px 8px 0; margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-weight: 600; color: var(--text-secondary); font-size: 0.9rem;">${note.author}</span>
                <span style="color: var(--text-tertiary); font-size: 0.8rem;">${note.date}</span>
            </div>
            <div style="color: var(--text-primary); line-height: 1.5;">${note.text}</div>
        </div>
    `).join('');
}

function saveNote() {
    const textarea = document.getElementById('noteText');
    const text = textarea?.value?.trim();
    
    if (!text) {
        showToast('Введите текст заметки', 'warning');
        return;
    }
    
    notes.unshift({
        id: Date.now(),
        text: text,
        author: 'Вы',
        date: new Date().toLocaleString()
    });
    
    textarea.value = '';
    renderNotes();
    showToast('Заметка сохранена!', 'success');
}

// ============================================
// CANNED RESPONSES
// ============================================
const cannedResponses = [
    { id: 1, title: 'Приветствие', shortcut: 'hello', content: 'Здравствуйте! Я принял(а) вашу заявку и начинаю работу над решением.' },
    { id: 2, title: 'Перезагрузка', shortcut: 'reboot', content: 'Пожалуйста, попробуйте перезагрузить компьютер и сообщите о результате.' },
    { id: 3, title: 'Решено', shortcut: 'done', content: 'Проблема решена! Если у вас остались вопросы, пожалуйста, откройте заявку повторно.' },
    { id: 4, title: 'Уточнение', shortcut: 'info', content: 'Для решения проблемы мне нужна дополнительная информация. Пожалуйста, уточните...' },
];

function openCannedModal() {
    openModal('cannedModal');
    renderCannedList(cannedResponses);
}

function renderCannedList(items) {
    const container = document.getElementById('cannedList');
    if (!container) return;
    
    container.innerHTML = items.map(item => `
        <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'" onclick="copyCannedResponse('${item.content.replace(/'/g, "\\'")}')">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="color: var(--text-primary);">${item.title}</strong>
                <span style="font-size: 0.75rem; color: #fbbf24; background: rgba(245,158,11,0.1); padding: 0.15rem 0.5rem; border-radius: 4px; font-family: monospace;">/${item.shortcut}</span>
            </div>
            <div style="color: var(--text-tertiary); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.content}</div>
        </div>
    `).join('');
}

function filterCannedResponses(search) {
    const filtered = cannedResponses.filter(r => 
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.shortcut.toLowerCase().includes(search.toLowerCase())
    );
    renderCannedList(filtered);
}

function copyCannedResponse(content) {
    navigator.clipboard.writeText(content).then(() => {
        showToast('Шаблон скопирован!', 'success');
        closeModal('cannedModal');
    });
}

function openNewCannedModal() {
    showToast('Создание шаблонов в разработке', 'info');
}

// ============================================
// RATING
// ============================================
let selectedRating = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Setup rating stars
    document.querySelectorAll('#ratingStars .rating-star').forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            updateRatingStars();
        });
        
        star.addEventListener('mouseenter', () => {
            highlightRatingStars(parseInt(star.dataset.rating));
        });
    });
    
    document.getElementById('ratingStars')?.addEventListener('mouseleave', () => {
        updateRatingStars();
    });
});

function updateRatingStars() {
    document.querySelectorAll('#ratingStars .rating-star').forEach((star, index) => {
        if (index < selectedRating) {
            star.classList.add('active');
            star.style.color = '#fbbf24';
        } else {
            star.classList.remove('active');
            star.style.color = 'rgba(255,255,255,0.1)';
        }
    });
}

function highlightRatingStars(rating) {
    document.querySelectorAll('#ratingStars .rating-star').forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#fbbf24';
            star.style.transform = 'scale(1.1)';
        } else {
            star.style.color = 'rgba(255,255,255,0.1)';
            star.style.transform = 'scale(1)';
        }
    });
}

function submitRating() {
    if (selectedRating === 0) {
        showToast('Пожалуйста, выберите оценку', 'warning');
        return;
    }
    
    const comment = document.getElementById('ratingComment')?.value;
    console.log(`Rating submitted: ${selectedRating}, Comment: ${comment}`);
    
    showToast('Спасибо за вашу оценку!', 'success');
    closeModal('ratingModal');
    selectedRating = 0;
    updateRatingStars();
}

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'rgba(16,185,129,0.95)' : type === 'error' ? 'rgba(244,63,94,0.95)' : type === 'warning' ? 'rgba(245,158,11,0.95)' : 'rgba(59,130,246,0.95)'};
        color: white;
        border-radius: 12px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// SHOW FLOATING BAR ON TICKET SELECT
// ============================================
function showFloatingBar() {
    const bar = document.getElementById('floatingActionBar');
    if (!bar) return;
    
    const role = window._currentUser?.role;
    if (role === 'admin' || role === 'super_admin' || role === 'agent' || role === 'manager') {
        bar.style.display = 'flex';
    }
}

function hideFloatingBar() {
    const bar = document.getElementById('floatingActionBar');
    if (bar) {
        bar.style.display = 'none';
    }
}

// Global function for filtering tickets
window.filterTickets = function(filter) {
    console.log('Filtering tickets:', filter);
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    // TODO: Actual filtering logic
};

window.filterByPriority = function(priority) {
    console.log('Filtering by priority:', priority);
    // TODO: Actual filtering logic
};

// Make floating bar functions globally accessible
window.showFloatingBar = showFloatingBar;
window.hideFloatingBar = hideFloatingBar;