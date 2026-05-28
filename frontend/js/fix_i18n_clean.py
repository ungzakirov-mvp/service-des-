#!/usr/bin/env python3
"""Cleanly add ALL HUD i18n keys to i18n.js - one-time fix."""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/root/servicedesk/frontend/js/i18n.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Define ALL HUD keys for all 3 languages
hud_ru = """
            // HUD Dashboard
            hud_title: 'SERVICE DESK // МОНИТОРИНГ',
            hud_live: 'LIVE',
            hud_breach_clear: 'ВСЁ ЧИСТО',
            prio_critical: 'КРИТИЧНЫЙ',
            prio_high: 'ВЫСОКИЙ',
            prio_medium: 'СРЕДНИЙ',
            prio_low: 'НИЗКИЙ',
            hud_queue: 'Активная очередь',
            hud_breach: 'Нарушение SLA',
            hud_breach_desc: 'Требуется вмешательство',
            hud_at_risk: 'SLA под угрозой',
            hud_at_risk_desc: '< 2ч до дедлайна',
            hud_compliance: 'Выполнение SLA',
            hud_compliance_desc: 'за 30 дней',
            hud_priority_matrix: 'Очередь / Матрица приоритетов',
            hud_agents: 'Агенты // Активные',
            hud_critical: 'Критично // Требует вмешательства',
            hud_flow: 'Поток заявок // 14 дней',
            hud_metrics: 'Ключевые метрики',
            hud_total: 'Всего',
            hud_new: 'Новых',
            hud_resolved: 'Решено',
            hud_assigned: 'Назначено',
            hud_unassigned: 'Не назначено',
            hud_in_progress: 'В работе',
            hud_waiting: 'Ожидает ответа',
            hud_online: 'Онлайн',
            hud_idle: 'Неактивен',
            hud_offline: 'Офлайн',
            hud_created: 'Создано',
            hud_breached: 'Просрочено',
            hud_mttr: 'MTTR',
            hud_mtta: 'MTTA',
            hud_fcr: 'FCR',
            hud_csat: 'CSAT',
            hud_backlog: 'Бэклог >7д',
            hud_no_critical: 'Нет критичных заявок',
            hud_no_agents: 'Нет активных агентов',
            hud_initializing: 'Инициализация HUD...',
            hud_loading: 'Загрузка...',
            hud_error: 'Ошибка загрузки',
            hud_retry: 'Повторить',
"""

hud_en = """
            // HUD Dashboard
            hud_title: 'SERVICE DESK // MONITORING',
            hud_live: 'LIVE',
            hud_breach_clear: 'ALL CLEAR',
            prio_critical: 'CRITICAL',
            prio_high: 'HIGH',
            prio_medium: 'MEDIUM',
            prio_low: 'LOW',
            hud_queue: 'Active Queue',
            hud_breach: 'SLA Breach',
            hud_breach_desc: 'Requires Intervention',
            hud_at_risk: 'SLA At Risk',
            hud_at_risk_desc: '< 2h to Deadline',
            hud_compliance: 'SLA Compliance',
            hud_compliance_desc: 'Last 30 Days',
            hud_priority_matrix: 'Queue / Priority Matrix',
            hud_agents: 'Agents // Active',
            hud_critical: 'Critical // Immediate Action',
            hud_flow: 'Ticket Flow // 14 Days',
            hud_metrics: 'Key Metrics',
            hud_total: 'Total',
            hud_new: 'New',
            hud_resolved: 'Resolved',
            hud_assigned: 'Assigned',
            hud_unassigned: 'Unassigned',
            hud_in_progress: 'In Progress',
            hud_waiting: 'Waiting User',
            hud_online: 'Online',
            hud_online_dot: 'ONLINE',
            hud_idle: 'Idle',
            hud_offline: 'Offline',
            hud_created: 'Created',
            hud_breached: 'Breached',
            hud_mttr: 'MTTR',
            hud_mtta: 'MTTA',
            hud_fcr: 'FCR',
            hud_csat: 'CSAT',
            hud_backlog: 'Backlog >7d',
            hud_no_critical: 'No Critical Tickets',
            hud_no_agents: 'No Active Agents',
            hud_initializing: 'Initializing HUD...',
            hud_loading: 'Loading...',
            hud_error: 'Load Error',
            hud_retry: 'Retry',
"""

hud_uz = """
            // HUD Dashboard
            hud_title: 'SERVICE DESK // MONITORING',
            hud_live: 'LIVE',
            hud_breach_clear: 'HAMMA YAXSHI',
            prio_critical: 'KRITIK',
            prio_high: 'YUQORI',
            prio_medium: "O'RTACHA",
            prio_low: 'PAST',
            hud_queue: 'Faol navbat',
            hud_breach: 'SLA buzilishi',
            hud_breach_desc: 'Aralashuv talab etiladi',
            hud_at_risk: 'SLA xavf ostida',
            hud_at_risk_desc: '< 2s muddatgacha',
            hud_compliance: 'SLA bajarilishi',
            hud_compliance_desc: '30 kun ichida',
            hud_priority_matrix: 'Navbat / Ustuvorlik matritsasi',
            hud_agents: 'Agentlar // Faol',
            hud_critical: 'Kritik // Shoshilinch chora',
            hud_flow: 'Arizalar oqimi // 14 kun',
            hud_metrics: 'Asosiy ko\'rsatkichlar',
            hud_total: 'Jami',
            hud_new: 'Yangi',
            hud_resolved: 'Hal qilingan',
            hud_assigned: 'Tayinlangan',
            hud_unassigned: 'Tayinlanmagan',
            hud_in_progress: 'Jarayonda',
            hud_waiting: 'Javob kutilmoqda',
            hud_online: 'Onlayn',
            hud_idle: 'Harakatsiz',
            hud_offline: 'Offlayn',
            hud_created: 'Yaratilgan',
            hud_breached: 'Muddat o\'tgan',
            hud_mttr: 'MTTR',
            hud_mtta: 'MTTA',
            hud_fcr: 'FCR',
            hud_csat: 'CSAT',
            hud_backlog: 'Orqada qolgan >7k',
            hud_no_critical: 'Kritik arizalar yo\'q',
            hud_no_agents: 'Faol agentlar yo\'q',
            hud_initializing: 'HUD ishga tushmoqda...',
            hud_loading: 'Yuklanmoqda...',
            hud_error: 'Yuklash xatosi',
            hud_retry: 'Qayta urinish',
"""

# --- Insert RU block ---
# Insert before the first "// Dashboard extra" (which is in RU section)
marker = "            // Dashboard extra"
pos = content.find(marker)
if pos == -1:
    print("ERROR: Could not find '// Dashboard extra' marker")
    sys.exit(1)
content = content[:pos] + hud_ru + "\n" + content[pos:]
print("Inserted RU HUD block")

# --- Insert EN block ---
# Find en: marker, then find "// Dashboard extra" after it
en_marker = "        en:"
en_pos = content.find(en_marker)
if en_pos == -1:
    print("ERROR: Could not find 'en:' marker")
    sys.exit(1)
en_extra_pos = content.find(marker, en_pos)
if en_extra_pos == -1:
    print("ERROR: Could not find '// Dashboard extra' in EN section")
    sys.exit(1)
content = content[:en_extra_pos] + hud_en + "\n" + content[en_extra_pos:]
print("Inserted EN HUD block")

# --- Insert UZ block ---
uz_marker = "        uz:"
uz_pos = content.find(uz_marker)
if uz_pos == -1:
    print("ERROR: Could not find 'uz:' marker")
    sys.exit(1)
uz_extra_pos = content.find(marker, uz_pos)
if uz_extra_pos == -1:
    print("ERROR: Could not find '// Dashboard extra' in UZ section")
    sys.exit(1)
content = content[:uz_extra_pos] + hud_uz + "\n" + content[uz_extra_pos:]
print("Inserted UZ HUD block")

# Write file
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

# Verify: count "// HUD Dashboard" occurrences (should be exactly 3)
count = content.count("// HUD Dashboard")
print(f"Done. '// HUD Dashboard' count: {count} (expected: 3)")
