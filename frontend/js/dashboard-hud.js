// ============================================================
// HUD Dashboard — J.A.R.V.I.S. Tactical Interface  v3
// ПОЛНАЯ ЗАМЕНА. Vanilla JS. Моковые данные → потом API.
// ============================================================

var HUD = {
  data: null,
  chart: null,
  intervals: [],
  orgOpen: false,
  orgName: ''
};

function _t(key, fallback) {
  if (typeof i18n !== 'undefined' && i18n.t) {
    var v = i18n.t(key);
    if (v && v !== key) return v;
  }
  return fallback || key;
}

// --- MOCK DATA (заменить на API) ---
var MOCK = {
  queue: { open: 147, new_today: 62, resolved_today: 78, assigned: 129, unassigned: 18, in_progress: 94, waiting_user: 35 },
  sla: { compliance_pct: 93.2, compliance_delta_24h: 2.1, breached: 9, at_risk: 14 },
  priority: { p1: { count: 12, pct: 8 }, p2: { count: 35, pct: 24 }, p3: { count: 66, pct: 45 }, p4: { count: 34, pct: 23 } },
  agents: [
    { id: '1', name: '\u0428\u0430\u0432\u043a\u0430\u0442 \u041a.', status: 'online', active_tickets: 14, capacity_pct: 95 },
    { id: '2', name: '\u0414\u0438\u043b\u043d\u0443\u0440\u0430 \u0410.', status: 'online', active_tickets: 9, capacity_pct: 65 },
    { id: '3', name: '\u0411\u0435\u043a\u0437\u043e\u0434 \u041c.', status: 'online', active_tickets: 6, capacity_pct: 42 },
    { id: '4', name: '\u0410\u043b\u0438\u0448\u0435\u0440 \u0422.', status: 'idle', active_tickets: 3, capacity_pct: 22 },
    { id: '5', name: 'Akbarov O.', status: 'online', active_tickets: 5, capacity_pct: 35 }
  ],
  critical_tickets: [
    { id: '1', number: 4821, title: '\u041d\u0435 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 1\u0421 \u2014 \u043e\u0442\u0434\u0435\u043b \u043f\u0440\u043e\u0434\u0430\u0436', priority: 'p1', sla_remaining_minutes: -47 },
    { id: '2', number: 4815, title: 'Email-\u0441\u0435\u0440\u0432\u0435\u0440 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d', priority: 'p1', sla_remaining_minutes: -12 },
    { id: '3', number: 4830, title: 'VPN \u0442\u043e\u0440\u043c\u043e\u0437\u0438\u0442 \u0443 \u0443\u0434\u0430\u043b\u0451\u043d\u043d\u044b\u0445', priority: 'p2', sla_remaining_minutes: 38 },
    { id: '4', number: 4807, title: '\u041f\u0440\u0438\u043d\u0442\u0435\u0440 \u043d\u0435 \u043f\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \u2014 \u0431\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0438\u044f', priority: 'p2', sla_remaining_minutes: 82 }
  ],
  kpi: { mttr_minutes: 258, mtta_minutes: 8.4, fcr_pct: 71, csat: 4.6, backlog_7d: 23 },
  flow_14d: {
    labels: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14'],
    created: [58,62,71,55,48,32,65,68,72,59,51,30,68,74],
    resolved: [52,58,67,62,45,28,61,65,70,63,55,28,66,71],
    breached: [4,5,7,3,2,1,5,6,8,4,3,1,7,8]
  }
};

// --- HELPERS ---
function formatSla(minutes) {
  var abs = Math.abs(minutes);
  var h = String(Math.floor(abs / 60)).padStart(2, '0');
  var m = String(abs % 60).padStart(2, '0');
  return 'SLA ' + (minutes < 0 ? '-' : '+') + h + ':' + m;
}

function formatDuration(min) {
  var h = Math.floor(min / 60);
  var m = Math.floor(min % 60);
  return h + ':' + String(m).padStart(2, '0') + ':00';
}

function barColor(pct) {
  if (pct > 80) return 'j-bf-r';
  if (pct > 40) return 'j-bf-a';
  return 'j-bf-g';
}

function numColor(pct) {
  if (pct > 80) return 'j-red';
  if (pct > 40) return 'j-amber';
  return 'j-green';
}

function escapeHtml(t) {
  if (!t) return '';
  var d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

// --- STYLES ---
var HUD_STYLES = `
.j-root{background:radial-gradient(ellipse at top,rgba(0,80,130,.15),transparent 60%),radial-gradient(ellipse at bottom right,rgba(0,50,90,.1),transparent 50%),#050810;color:#c5e8ff;font-family:'JetBrains Mono','SF Mono',Consolas,monospace;padding:24px;min-height:100vh;box-shadow:inset 0 0 80px rgba(0,100,180,.08)}
.j-panel{border:1px solid rgba(0,200,255,.25);background:linear-gradient(180deg,rgba(0,50,80,.4),rgba(0,25,45,.35));border-radius:4px;padding:20px 22px;position:relative;box-shadow:0 4px 20px rgba(0,0,0,.5),inset 0 1px 0 rgba(0,212,255,.15),inset 0 -1px 0 rgba(0,0,0,.3)}
.j-panel::before{content:'';position:absolute;top:-2px;left:-2px;width:14px;height:14px;border-top:2px solid #00d4ff;border-left:2px solid #00d4ff;box-shadow:-2px -2px 8px rgba(0,212,255,.4)}
.j-panel::after{content:'';position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-bottom:2px solid #00d4ff;border-right:2px solid #00d4ff;box-shadow:2px 2px 8px rgba(0,212,255,.4)}
.j-panel-alert{border-color:rgba(255,80,80,.6)!important;background:linear-gradient(180deg,rgba(80,15,15,.5),rgba(40,8,8,.4))!important;box-shadow:0 4px 25px rgba(255,0,0,.2),0 0 30px rgba(255,80,80,.15),inset 0 1px 0 rgba(255,100,100,.2)!important}
.j-panel-alert::before,.j-panel-alert::after{border-color:#ff4444!important;box-shadow:0 0 10px rgba(255,80,80,.6)!important}
.j-lbl{font-size:12px;letter-spacing:.18em;color:#4a8cb8;text-transform:uppercase}
.j-lbl-lg{font-size:13px;letter-spacing:.2em;color:#4a8cb8;text-transform:uppercase}
.j-num-xl{font-size:54px;font-weight:300;line-height:1}
.j-num-md{font-size:24px;font-weight:400}
.j-num-sm{font-size:18px;font-weight:400}
.j-cyan{color:#00d4ff}.j-red{color:#ff5252}.j-amber{color:#ffb347}.j-green{color:#00ff9c}.j-dim{color:#4a8cb8}
.j-glow-c{text-shadow:0 0 25px rgba(0,212,255,.5),0 0 50px rgba(0,212,255,.2)}
.j-glow-r{text-shadow:0 0 20px rgba(255,82,82,.5),0 0 40px rgba(255,82,82,.2)}
.j-glow-a{text-shadow:0 0 20px rgba(255,179,71,.4),0 0 40px rgba(255,179,71,.15)}
.j-glow-g{text-shadow:0 0 20px rgba(0,255,156,.4),0 0 40px rgba(0,255,156,.15)}
.j-bar-track{height:8px;background:rgba(0,30,50,.6);border-radius:2px;box-shadow:inset 0 1px 2px rgba(0,0,0,.5);overflow:hidden}
.j-bar-fill{height:100%;border-radius:2px}
.j-bf-c{background:linear-gradient(180deg,#5be5ff,#00a8d4);box-shadow:0 0 12px rgba(0,212,255,.6)}
.j-bf-r{background:linear-gradient(180deg,#ff7878,#d93030);box-shadow:0 0 14px rgba(255,80,80,.8)}
.j-bf-a{background:linear-gradient(180deg,#ffc870,#d98a1e);box-shadow:0 0 12px rgba(255,179,71,.6)}
.j-bf-g{background:linear-gradient(180deg,#4dffb8,#00b86e);box-shadow:0 0 12px rgba(0,255,156,.6)}
.j-bf-d{background:linear-gradient(180deg,#6ba8d0,#3a6e90)}
.j-trow{display:flex;align-items:center;gap:14px;padding:13px 16px;border-left:3px solid transparent;font-size:14px;margin-bottom:7px;border-radius:3px}
.j-trow-r{border-left-color:#ff5252;background:linear-gradient(90deg,rgba(255,80,80,.18),rgba(255,80,80,.04));box-shadow:0 0 20px rgba(255,80,80,.15),0 2px 5px rgba(0,0,0,.5)}
.j-trow-a{border-left-color:#ffb347;background:linear-gradient(90deg,rgba(255,179,71,.14),rgba(255,179,71,.03));box-shadow:0 0 15px rgba(255,179,71,.1),0 2px 5px rgba(0,0,0,.5)}
.j-agent-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px dashed rgba(0,200,255,.12);font-size:14px}
.j-agent-row:last-child{border-bottom:none}
.j-pdot{width:10px;height:10px;border-radius:50%;flex-shrink:0;background:#00ff9c;box-shadow:0 0 12px #00ff9c,0 0 20px rgba(0,255,156,.5)}
.j-pdot-idle{background:#ffb347;box-shadow:0 0 10px #ffb347}
.j-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(0,200,255,.4),transparent);margin:18px 0;box-shadow:0 0 8px rgba(0,200,255,.2)}
.j-mrow{display:flex;justify-content:space-between;align-items:baseline;padding:13px 0;border-bottom:1px dashed rgba(0,200,255,.18)}
.j-mrow:last-child{border-bottom:none}
.j-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:1px solid rgba(0,200,255,.3);margin-bottom:20px;flex-wrap:wrap;gap:12px}
.j-org-btn{background:rgba(0,30,50,.6);border:1px solid rgba(0,200,255,.35);border-radius:3px;color:#00d4ff;font-family:inherit;font-size:13px;letter-spacing:.12em;padding:7px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 0 10px rgba(0,212,255,.1)}
.j-org-btn:hover{background:rgba(0,60,90,.5)}
.j-org-dd{position:absolute;top:100%;left:0;margin-top:6px;background:#050e18;border:1px solid rgba(0,200,255,.3);border-radius:4px;min-width:240px;z-index:100;box-shadow:0 8px 30px rgba(0,0,0,.7)}
.j-org-item{padding:11px 16px;font-size:13px;cursor:pointer;border-bottom:1px solid rgba(0,200,255,.08);display:flex;justify-content:space-between}
.j-org-item:last-child{border-bottom:none}
.j-org-item:hover{background:rgba(0,200,255,.08)}
.j-kpi-row{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;gap:16px;margin-bottom:18px}
.j-mid-row{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-bottom:18px}
.j-bot-row{display:grid;grid-template-columns:1.5fr 1fr;gap:16px}
.j-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@keyframes j-blink{50%{opacity:.3}}.j-blink{animation:j-blink 1.4s infinite}
@keyframes j-pulse{0%,100%{box-shadow:0 0 12px #00ff9c,0 0 20px rgba(0,255,156,.5)}50%{box-shadow:0 0 18px #00ff9c,0 0 30px rgba(0,255,156,.7)}}.j-pulse{animation:j-pulse 2s infinite}
@media(max-width:1024px){.j-kpi-row{grid-template-columns:1fr 1fr}.j-mid-row{grid-template-columns:1fr}.j-bot-row{grid-template-columns:1fr}.j-num-xl{font-size:42px}.j-panel{padding:16px 14px}.j-header{font-size:12px}}
@media(max-width:768px){.j-root{padding:12px 8px}.j-kpi-row{grid-template-columns:1fr;gap:10px}.j-mid-row{grid-template-columns:1fr;gap:10px}.j-bot-row{grid-template-columns:1fr;gap:10px}.j-mini-grid{grid-template-columns:1fr 1fr;gap:8px}.j-num-xl{font-size:36px}.j-num-md{font-size:20px}.j-num-sm{font-size:15px}.j-lbl{font-size:10px;letter-spacing:.12em}.j-lbl-lg{font-size:11px;letter-spacing:.14em}.j-panel{padding:14px 12px}.j-header{gap:8px;padding-bottom:12px;margin-bottom:14px}.j-trow{padding:10px 12px;font-size:12px;gap:8px}.j-agent-row{gap:8px;font-size:13px}.j-mrow{padding:10px 0}.j-panel::before,.j-panel::after{width:10px;height:10px}.j-org-btn{font-size:11px;padding:5px 10px;letter-spacing:.08em}.j-org-dd{min-width:180px}.j-org-item{padding:9px 12px;font-size:12px}.j-bar-track{height:6px}}
@media(max-width:480px){.j-num-xl{font-size:30px}.j-num-md{font-size:18px}.j-num-sm{font-size:14px}.j-panel{padding:10px 8px}.j-trow{padding:8px 8px;font-size:11px;gap:6px}.j-agent-row{font-size:12px;gap:6px}.j-mrow{padding:8px 0}.j-lbl{font-size:9px}.j-lbl-lg{font-size:10px}.j-root{padding:8px 6px}}
`;

// --- ORG LIST (mock, потом API) ---
var ORGS = [
  { id: 1, name: 'NOVUM TECH' },
  { id: 2, name: 'UZPHARMA LLC' },
  { id: 3, name: 'TASHKENT TRADING' }
];

// --- RENDER ---
function loadHUDDashboard() {
  var container = document.getElementById('hudDashboard');
  if (!container) return;

  // Inject styles once
  if (!document.getElementById('hudStyles')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'hudStyles';
    styleEl.textContent = HUD_STYLES;
    document.head.appendChild(styleEl);
  }

  // Initial org name from current user
  HUD.orgName = 'NOVUM TECH';
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.tenant_id) {
    var found = ORGS.find(function(o) { return o.id === currentUser.tenant_id; });
    if (found) HUD.orgName = found.name;
  }

  HUD.intervals.forEach(function(i) { clearInterval(i); });
  HUD.intervals = [];

  // Use mock for now, replace with API later
  HUD.data = MOCK;
  renderHUD(container);

  HUD.intervals.push(setInterval(updateHUDClock, 1000));
}

function renderHUD(container) {
  var d = HUD.data;
  var onlineCount = d.agents.filter(function(a) { return a.status === 'online'; }).length;
  var idleCount = d.agents.filter(function(a) { return a.status === 'idle'; }).length;

  container.innerHTML = '<div class="j-root">' +

    // === HEADER ===
    '<div class="j-header">' +
      '<div style="display:flex;align-items:center;gap:18px;">' +
        '<span style="font-size:11px;color:#00d4ff;letter-spacing:.25em;text-shadow:0 0 8px rgba(0,212,255,.6);">[ SYS ]</span>' +
        '<span style="font-size:17px;letter-spacing:.28em;color:#00d4ff;font-weight:500;text-shadow:0 0 15px rgba(0,212,255,.5);">SERVICE DESK // ' + _t('hud_monitoring', '\u041c\u041e\u041d\u0418\u0422\u041e\u0420\u0418\u041d\u0413') + '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:18px;position:relative;">' +
        '<div style="position:relative;" id="hudOrgSwitcher">' +
          '<button class="j-org-btn" id="hudOrgBtn">' +
            '<span class="j-dim" style="font-size:10px;">[ ORG ]</span>' +
            '<span id="hudOrgName">' + escapeHtml(HUD.orgName) + '</span>' +
            '<span id="hudOrgArrow">\u25BE</span>' +
          '</button>' +
          '<div class="j-org-dd" id="hudOrgDropdown" style="display:none;">' +
            ORGS.map(function(o) {
              return '<div class="j-org-item" data-org-id="' + o.id + '">' + escapeHtml(o.name) + '</div>';
            }).join('') +
            '<div class="j-org-item" data-org-id="all"><span class="j-cyan">\u2605 ' + _t('hud_all_orgs', '\u0412\u0421\u0415 \u041e\u0420\u0413\u0410\u041d\u0418\u0417\u0410\u0426\u0418\u0418') + '</span></div>' +
          '</div>' +
        '</div>' +
        '<span style="font-size:12px;" class="j-dim"><span class="j-pdot j-pulse" style="display:inline-block;vertical-align:middle;margin-right:7px;"></span>' + _t('hud_online', 'ONLINE') + '</span>' +
        '<span style="font-size:12px;" class="j-dim" id="hudClock">SYNC 00:00:00</span>' +
        '<span class="j-blink j-cyan" style="font-size:13px;text-shadow:0 0 10px rgba(0,212,255,.7);">\u25CF ' + _t('hud_live', 'LIVE') + '</span>' +
      '</div>' +
    '</div>' +

    // === KPI ROW ===
    '<div class="j-kpi-row">' +

      // Card 1: Active Queue
      '<div class="j-panel">' +
        '<div class="j-lbl">' + _t('hud_queue', '\u0410\u041a\u0422\u0418\u0412\u041d\u0410\u042f \u041e\u0427\u0415\u0420\u0415\u0414\u042c') + '</div>' +
        '<div style="display:flex;align-items:baseline;gap:12px;margin-top:14px;">' +
          '<span class="j-num-xl j-cyan j-glow-c">' + d.queue.open + '</span>' +
          '<span class="j-dim" style="font-size:13px;">/ ' + _t('hud_open', '\u043e\u0442\u043a\u0440\u044b\u0442\u044b\u0445') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:24px;margin-top:16px;">' +
          '<div><div class="j-lbl" style="font-size:10px;">' + _t('hud_new', '\u041d\u041e\u0412\u042b\u0425') + '</div><div class="j-num-sm">' + d.queue.new_today + '</div></div>' +
          '<div><div class="j-lbl" style="font-size:10px;">' + _t('hud_resolved', '\u0420\u0415\u0428\u0415\u041d\u041e') + '</div><div class="j-num-sm j-green">' + d.queue.resolved_today + '</div></div>' +
          '<div><div class="j-lbl" style="font-size:10px;">' + _t('hud_assigned', '\u041d\u0410\u0417\u041d\u0410\u0427\u0415\u041d\u041e') + '</div><div class="j-num-sm">' + d.queue.assigned + '</div></div>' +
        '</div>' +
      '</div>' +

      // Card 2: SLA Breach
      '<div class="j-panel' + (d.sla.breached > 0 ? ' j-panel-alert' : '') + '">' +
        '<div class="j-lbl" style="color:' + (d.sla.breached > 0 ? '#ff8888' : '#00ff9c') + ';">' + _t('hud_breach', 'SLA \u041d\u0410\u0420\u0423\u0428\u0415\u041d\u041e') + '</div>' +
        '<div style="display:flex;align-items:baseline;gap:12px;margin-top:14px;">' +
          '<span class="j-num-xl' + (d.sla.breached > 0 ? ' j-red j-glow-r' : ' j-green j-glow-g') + '">' + String(d.sla.breached).padStart(2, '0') + '</span>' +
          (d.sla.breached > 0 ? '<span class="j-blink j-red" style="font-size:26px;text-shadow:0 0 15px rgba(255,80,80,.8);">\u25B2</span>' : '') +
        '</div>' +
        '<div style="font-size:12px;' + (d.sla.breached > 0 ? 'color:#ff8888;' : 'color:#4a8cb8;') + 'margin-top:10px;letter-spacing:.06em;">' +
          (d.sla.breached > 0 ? _t('hud_breach_desc', '\u0422\u0420\u0415\u0411\u0423\u0415\u0422\u0421\u042f \u0412\u041c\u0415\u0428\u0410\u0422\u0415\u041b\u042c\u0421\u0422\u0412\u041e') : _t('hud_breach_clear', '\u0412\u0421\u0401 \u0427\u0418\u0421\u0422\u041e')) +
        '</div>' +
      '</div>' +

      // Card 3: SLA At Risk
      '<div class="j-panel">' +
        '<div class="j-lbl">' + _t('hud_at_risk', 'SLA \u041f\u041e\u0414 \u0420\u0418\u0421\u041a\u041e\u041c') + '</div>' +
        '<div style="margin-top:14px;">' +
          '<span class="j-num-xl j-amber j-glow-a">' + d.sla.at_risk + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:#ffb347;margin-top:10px;letter-spacing:.06em;">&lt; 2\u0427 ' + _t('hud_at_risk_desc', '\u0414\u041e \u0414\u0415\u0414\u041b\u0410\u0419\u041d\u0410') + '</div>' +
      '</div>' +

      // Card 4: SLA Compliance
      '<div class="j-panel">' +
        '<div class="j-lbl">' + _t('hud_compliance', 'SLA \u0412\u042b\u041f\u041e\u041b\u041d\u0415\u041d\u0418\u0415') + '</div>' +
        '<div style="margin-top:14px;">' +
          '<span class="j-num-xl j-green j-glow-g">' + d.sla.compliance_pct + '<span style="font-size:30px;">%</span></span>' +
        '</div>' +
        '<div style="font-size:12px;margin-top:10px;letter-spacing:.06em;" class="j-dim">\u2191 ' + d.sla.compliance_delta_24h + '% / 24\u0427</div>' +
      '</div>' +

    '</div>' +

    // === MID ROW ===
    '<div class="j-mid-row">' +

      // Priority Matrix
      '<div class="j-panel">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
          '<span class="j-lbl-lg">' + _t('hud_priority_matrix', '\u041e\u0427\u0415\u0420\u0415\u0414\u042c / \u041f\u0420\u0418\u041e\u0420\u0418\u0422\u0415\u0422\u042b') + '</span>' +
          '<span class="j-dim" style="font-size:12px;">' + _t('hud_total', '\u0412\u0421\u0415\u0413\u041e') + ': ' + d.queue.open + '</span>' +
        '</div>' +
        renderPriorityRows(d) +
        '<div class="j-divider"></div>' +
        '<div class="j-mini-grid">' +
          '<div><div class="j-lbl" style="font-size:10px;">' + _t('hud_unassigned', '\u041d\u0415 \u041d\u0410\u0417\u041d\u0410\u0427\u0415\u041d\u041e') + '</div><div class="j-num-md j-amber j-glow-a" style="margin-top:8px;">' + d.queue.unassigned + '</div></div>' +
          '<div><div class="j-lbl" style="font-size:10px;">' + _t('hud_in_progress', '\u0412 \u0420\u0410\u0411\u041e\u0422\u0415') + '</div><div class="j-num-md j-cyan j-glow-c" style="margin-top:8px;">' + d.queue.in_progress + '</div></div>' +
          '<div><div class="j-lbl" style="font-size:10px;">' + _t('hud_waiting', '\u0416\u0414\u0401\u0422 \u041a\u041b\u0418\u0415\u041d\u0422\u0410') + '</div><div class="j-num-md" style="margin-top:8px;">' + d.queue.waiting_user + '</div></div>' +
        '</div>' +
      '</div>' +

      // Agents Panel
      '<div class="j-panel">' +
        '<span class="j-lbl-lg">' + _t('hud_agents', '\u0410\u0413\u0415\u041d\u0422\u042b // \u041e\u041d\u041b\u0410\u0419\u041d') + '</span>' +
        '<div style="font-size:11px;color:#4a8cb8;margin:6px 0 16px;letter-spacing:.05em;">' +
          onlineCount + ' ' + _t('hud_online', 'ONLINE') + ' \u00B7 ' + idleCount + ' ' + _t('hud_idle', 'IDLE') +
        '</div>' +
        d.agents.map(function(a) {
          var dot = a.status === 'online' ? '<span class="j-pdot j-pulse"></span>' :
                    a.status === 'idle' ? '<span class="j-pdot j-pdot-idle"></span>' :
                    '<span class="j-pdot" style="background:#4a8cb8;box-shadow:none;"></span>';
          return '<div class="j-agent-row">' + dot +
            '<span style="flex:1;font-size:15px;">' + escapeHtml(a.name) + '</span>' +
            '<div class="j-bar-track" style="width:85px;">' +
              '<div class="j-bar-fill ' + barColor(a.capacity_pct) + '" style="width:' + a.capacity_pct + '%;"></div>' +
            '</div>' +
            '<span class="j-num-sm ' + numColor(a.capacity_pct) + '" style="width:28px;text-align:right;">' + a.active_tickets + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +

    '</div>' +

    // === CRITICAL TICKETS ===
    renderCriticalBlock(d) +

    // === BOTTOM ROW ===
    '<div class="j-bot-row">' +

      // Flow Chart (placeholder for now)
      '<div class="j-panel">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<span class="j-lbl-lg">' + _t('hud_flow', '\u0414\u0418\u041d\u0410\u041c\u0418\u041a\u0410 // 14 \u0414\u041d\u0415\u0419') + '</span>' +
          '<div style="display:flex;gap:14px;font-size:11px;">' +
            '<span class="j-cyan">\u2501 ' + _t('hud_created', '\u0421\u041e\u0417\u0414\u0410\u041d\u041e') + '</span>' +
            '<span class="j-green">\u2501 ' + _t('hud_resolved', '\u0420\u0415\u0428\u0415\u041d\u041e') + '</span>' +
            '<span class="j-red">\u2501 ' + _t('hud_breached', '\u041f\u0420\u041e\u0421\u0420\u041e\u0427\u0415\u041d\u041e') + '</span>' +
          '</div>' +
        '</div>' +
        '<div id="hudFlowChart" style="height:190px;"></div>' +
      '</div>' +

      // Key Metrics
      '<div class="j-panel">' +
        '<span class="j-lbl-lg">' + _t('hud_metrics', '\u041a\u041b\u042e\u0427\u0415\u0412\u042b\u0415 \u041c\u0415\u0422\u0420\u0418\u041a\u0418') + '</span>' +
        '<div style="margin-top:14px;">' +
          renderMetricRow(_t('hud_mttr', '\u0421\u0420\u0415\u0414\u041d\u0415\u0415 \u0412\u0420\u0415\u041c\u042f \u0420\u0415\u0428\u0415\u041d\u0418\u042f'), formatDuration(d.kpi.mttr_minutes), 'j-cyan j-glow-c') +
          renderMetricRow(_t('hud_mtta', '\u041f\u0415\u0420\u0412\u042b\u0419 \u041e\u0422\u0412\u0415\u0422'), Math.floor(d.kpi.mtta_minutes) + ':' + String(Math.round((d.kpi.mtta_minutes % 1) * 60)).padStart(2, '0') + ':00', 'j-cyan j-glow-c') +
          renderMetricRow(_t('hud_fcr', '\u0420\u0415\u0428\u0415\u041d\u041e \u0421 1-\u0413\u041e \u0420\u0410\u0417\u0410'), d.kpi.fcr_pct + '%', 'j-green j-glow-g') +
          renderMetricRow('CSAT', d.kpi.csat + ' / 5.0', 'j-green j-glow-g') +
          renderMetricRow(_t('hud_backlog', '\u0411\u042d\u041a\u041b\u041e\u0413 >7\u0414'), d.kpi.backlog_7d, 'j-amber j-glow-a') +
        '</div>' +
      '</div>' +

    '</div>' +

  '</div>';

  // Bind org switcher events
  bindOrgSwitcher();

  // Render chart
  renderFlowChart();
}

function renderPriorityRows(d) {
  var prios = [
    { key: 'p1', label: _t('prio_critical', '\u041a\u0420\u0418\u0422\u0418\u0427\u041d\u041e'), cls: 'j-red', bar: 'j-bf-r', glow: 'j-glow-r' },
    { key: 'p2', label: _t('prio_high', '\u0412\u042b\u0421\u041e\u041a\u0418\u0419'), cls: 'j-amber', bar: 'j-bf-a', glow: 'j-glow-a' },
    { key: 'p3', label: _t('prio_medium', '\u0421\u0420\u0415\u0414\u041d\u0418\u0419'), cls: 'j-cyan', bar: 'j-bf-c', glow: 'j-glow-c' },
    { key: 'p4', label: _t('prio_low', '\u041d\u0418\u0417\u041a\u0418\u0419'), cls: 'j-dim', bar: 'j-bf-d', glow: '' }
  ];
  var html = '';
  prios.forEach(function(p) {
    var item = d.priority[p.key];
    html += '<div style="margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;">' +
        '<span class="' + p.cls + '" style="letter-spacing:.08em;">\u25B8 ' + p.key.toUpperCase() + ' // ' + p.label + '</span>' +
        '<span><span class="j-num-sm ' + p.cls + '">' + item.count + '</span> <span class="j-dim" style="font-size:12px;">/ ' + item.pct + '%</span></span>' +
      '</div>' +
      '<div class="j-bar-track"><div class="j-bar-fill ' + p.bar + '" style="width:' + item.pct + '%;"></div></div>' +
    '</div>';
  });
  return html;
}

function renderCriticalBlock(d) {
  var tickets = d.critical_tickets;
  if (!tickets || tickets.length === 0) return '';
  var html = '<div class="j-panel" style="margin-bottom:18px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<span class="j-lbl-lg j-red" style="text-shadow:0 0 10px rgba(255,80,80,.5);">\u26A0 ' + _t('hud_critical', '\u041a\u0420\u0418\u0422\u0418\u0427\u041d\u042b\u0415 // \u0422\u0420\u0415\u0411\u0423\u042e\u0422 \u0412\u041d\u0418\u041c\u0410\u041d\u0418\u042f') + '</span>' +
      '<span class="j-dim" style="font-size:12px;">' + tickets.length + ' ' + _t('hud_tickets', '\u0422\u0418\u041a\u0415\u0422\u041e\u0412') + '</span>' +
    '</div>';
  tickets.forEach(function(t) {
    var isP1 = t.priority === 'p1';
    var rowClass = isP1 ? 'j-trow j-trow-r' : 'j-trow j-trow-a';
    var prioLabel = t.priority ? t.priority.toUpperCase() : '?';
    var prioColor = isP1 ? 'j-red' : 'j-amber';
    var slaColor = t.sla_remaining_minutes < 0 ? 'j-red' : 'j-amber';
    html += '<div class="' + rowClass + '" style="cursor:pointer;">' +
      '<span class="' + prioColor + '" style="font-size:13px;font-weight:500;width:36px;">[' + prioLabel + ']</span>' +
      '<span class="j-dim" style="font-size:12px;width:56px;">#' + t.number + '</span>' +
      '<span style="flex:1;color:#e6f4ff;">' + escapeHtml(t.title) + '</span>' +
      '<span class="' + slaColor + '" style="font-size:14px;font-weight:500;">' + formatSla(t.sla_remaining_minutes) + '</span>' +
    '</div>';
  });
  html += '</div>';
  return html;
}

function renderMetricRow(label, value, cls) {
  return '<div class="j-mrow">' +
    '<span class="j-dim" style="font-size:12px;letter-spacing:.1em;">' + label + '</span>' +
    '<span class="j-num-sm ' + cls + '">' + value + '</span>' +
  '</div>';
}

function renderFlowChart() {
  var wrapper = document.getElementById('hudFlowChart');
  if (!wrapper) return;

  if (typeof Chart === 'undefined') {
    wrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><span class="j-dim" style="font-size:12px;">[ CHART.JS REQUIRED ]</span></div>';
    return;
  }

  // Keep wrapper div with height:190px, put canvas inside
  wrapper.innerHTML = '';
  var newCanvas = document.createElement('canvas');
  newCanvas.id = 'hudFlowChartCanvas';
  wrapper.appendChild(newCanvas);

  var d = HUD.data;
  if (!d || !d.flow_14d) return;

  if (HUD.chart) {
    HUD.chart.destroy();
    HUD.chart = null;
  }

  HUD.chart = new Chart(newCanvas, {
    type: 'line',
    data: {
      labels: d.flow_14d.labels,
      datasets: [
        { label: 'CREATED', data: d.flow_14d.created, borderColor: 'rgba(0,212,255,1)', backgroundColor: 'rgba(0,212,255,0.08)', borderWidth: 1.5, tension: 0.4, pointRadius: 0, fill: true },
        { label: 'RESOLVED', data: d.flow_14d.resolved, borderColor: 'rgba(0,255,156,1)', borderWidth: 1.5, tension: 0.4, pointRadius: 0, fill: false },
        { label: 'BREACHED', data: d.flow_14d.breached, borderColor: 'rgba(255,82,82,1)', borderWidth: 1.5, tension: 0.4, pointRadius: 0, fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,30,50,0.9)', titleFont: { family: 'JetBrains Mono, monospace', size: 10 }, bodyFont: { family: 'JetBrains Mono, monospace', size: 10 }, borderColor: 'rgba(0,212,255,0.3)', borderWidth: 1 } },
      scales: {
        x: { ticks: { color: '#4a8cb8', font: { family: 'JetBrains Mono, monospace', size: 9 } }, grid: { color: 'rgba(0,200,255,0.05)' } },
        y: { beginAtZero: true, ticks: { color: '#4a8cb8', font: { family: 'JetBrains Mono, monospace', size: 9 } }, grid: { color: 'rgba(0,200,255,0.05)' } }
      }
    }
  });
}

function bindOrgSwitcher() {
  var btn = document.getElementById('hudOrgBtn');
  var dd = document.getElementById('hudOrgDropdown');
  var nameEl = document.getElementById('hudOrgName');
  var arrowEl = document.getElementById('hudOrgArrow');

  if (!btn || !dd) return;

  btn.onclick = function(e) {
    e.stopPropagation();
    HUD.orgOpen = !HUD.orgOpen;
    dd.style.display = HUD.orgOpen ? 'block' : 'none';
    if (arrowEl) arrowEl.textContent = HUD.orgOpen ? '\u25B4' : '\u25BE';
  };

  dd.querySelectorAll('.j-org-item').forEach(function(item) {
    item.onclick = function(e) {
      e.stopPropagation();
      var orgId = this.dataset.orgId;
      var name = this.textContent.trim();
      if (nameEl) nameEl.textContent = name;
      HUD.orgName = name;
      HUD.orgOpen = false;
      dd.style.display = 'none';
      if (arrowEl) arrowEl.textContent = '\u25BE';
      // TODO: fetch data for selected org: fetch('/api/dashboard?org_id=' + orgId)
    };
  });

  document.addEventListener('click', function() {
    if (HUD.orgOpen) {
      HUD.orgOpen = false;
      dd.style.display = 'none';
      if (arrowEl) arrowEl.textContent = '\u25BE';
    }
  });
}

function updateHUDClock() {
  var el = document.getElementById('hudClock');
  if (el) {
    var now = new Date();
    var locale = (typeof i18n !== 'undefined' && i18n.currentLocale) ? i18n.currentLocale : 'ru';
    el.textContent = 'SYNC ' + now.toLocaleTimeString(locale, { hour12: false });
  }
}

// Auto-load
(function() {
  var dv = document.getElementById('dashboardView');
  if (dv && !dv.classList.contains('hidden')) {
    loadHUDDashboard();
  }
})();

window.loadHUDDashboard = loadHUDDashboard;
document.addEventListener('localeChanged', function() {
  var c = document.getElementById('hudDashboard');
  if (c) renderHUD(c);
});
window.HUD = HUD;