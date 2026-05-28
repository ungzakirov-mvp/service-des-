// Tariffs HUD v5.0
var tariffData = null;
var catalogData = null;
var cart = [];
var currentTab = 'plans';
var tariffEditId = null;

var __S = {
  ru: {status:'статус',sum:'сум',month:'мес',up_to:'до',unlimited:'Без ограничений',ws:'рабочих мест',select_plan:'Выбрать план',active_plan:'Активный план',popular:'Популярный',current_plan:'Текущий план',confirm:'Вы уверены, что хотите сменить тарифный план?',subscrib_err:'Ошибка смены тарифа',load_err:'Ошибка загрузки данных',net_err:'Сетевая ошибка',tariff_plans:'Тарифные планы',constructor:'Конструктор услуг',requests:'Заявки на услуги',catalog:'Каталог услуг',your_order:'Ваша заявка',cart_empty:'Добавьте услуги из каталога',order_notes:'Примечания к заявке...',submit:'Отправить заявку',sent:'Заявка на услуги отправлена!',req_err:'Ошибка отправки заявки',monthly:'Итого в месяц',onetime:'Разовые услуги',cat_ws:'Рабочие станции',cat_srv:'Серверы',cat_net:'Сеть',cat_sec:'Безопасность',cat_bak:'Резервное копирование',cat_cld:'Облачные сервисы',cat_1x:'Разовые услуги',cat_oth:'Другое',soon:'Раздел заявок будет доступен в следующей версии',edit:'✎',delete:'✕',save_plan:'Сохранить',plan_name:'Название',plan_price:'Цена (тийины)',plan_ws:'Раб. мест (0=без лимита)',plan_desc:'Описание',plan_popular:'Популярный',admin_edit:'Редактирование тарифа',add_plan:'Добавить план',confirm_del:'Удалить этот тарифный план?',saved:'Сохранено!',deleted:'Удалён!',error_save:'Ошибка',features:'Функции',add_feature:'+ Функцию',feat_text:'Текст',feat_key:'Ключ',feat_included:'Вкл',cancel:'Отмена'},
  en: {status:'status',sum:'UZS',month:'mo',up_to:'up to',unlimited:'Unlimited',ws:'workstations',select_plan:'Select',active_plan:'Active',popular:'Popular',current_plan:'Current',confirm:'Change your pricing plan?',subscrib_err:'Change error',load_err:'Load error',net_err:'Network error',tariff_plans:'Pricing Plans',constructor:'Service Builder',requests:'Requests',catalog:'Catalog',your_order:'Your Order',cart_empty:'Cart is empty',order_notes:'Notes...',submit:'Submit',sent:'Sent!',req_err:'Error',monthly:'Monthly',onetime:'One-time',cat_ws:'Workstations',cat_srv:'Servers',cat_net:'Network',cat_sec:'Security',cat_bak:'Backup',cat_cld:'Cloud',cat_1x:'One-time',cat_oth:'Other',soon:'Coming soon',edit:'✎',delete:'✕',save_plan:'Save',plan_name:'Name',plan_price:'Price (tiyin)',plan_ws:'Workstations (0=∞)',plan_desc:'Description',plan_popular:'Popular',admin_edit:'Edit Tariff',add_plan:'Add Plan',confirm_del:'Delete this plan?',saved:'Saved!',deleted:'Deleted!',error_save:'Error',features:'Features',add_feature:'+ Feature',feat_text:'Text',feat_key:'Key',feat_included:'On',cancel:'Cancel'},
  uz: {status:'holati',sum:"so'm",month:'oy',up_to:'gacha',unlimited:'Cheksiz',ws:'ish joylari',select_plan:'Tanlash',active_plan:'Faol',popular:'Mashhur',current_plan:'Joriy',confirm:"Tarifni o'zgartirish?",subscrib_err:"O'zgartirish xatosi",load_err:"Yuklash xatosi",net_err:'Tarmoq xatosi',tariff_plans:'Tarif rejalari',constructor:'Konstruktor',requests:'Arizalar',catalog:'Katalog',your_order:"Arizangiz",cart_empty:"Savatcha bo'sh",order_notes:'Izoh...',submit:'Yuborish',sent:"Yuborildi!",req_err:'Xato',monthly:'Oylik',onetime:'Bir martalik',cat_ws:'Ish stansiyalari',cat_srv:'Serverlar',cat_net:'Tarmoq',cat_sec:'Xavfsizlik',cat_bak:'Zaxira',cat_cld:'Bulut',cat_1x:'Bir martalik',cat_oth:'Boshqa',soon:'Tez orada',edit:'✎',delete:'✕',save_plan:'Saqlash',plan_name:'Nomi',plan_price:"Narx (tiyin)",plan_ws:"Ish joylari (0=cheksiz)",plan_desc:"Tavsif",plan_popular:'Mashhur',admin_edit:"Tarifni tahrirlash",add_plan:"Reja qo'shish",confirm_del:"Rejani o'chirish?",saved:"Saqlandi!",deleted:"O'chirildi!",error_save:'Xato',features:'Funksiyalar',add_feature:'+ Funksiya',feat_text:'Matn',feat_key:'Kalit',feat_included:'Yoq',cancel:'Bekor qilish'}
};

function __(k) {
  var l = (window.i18n && i18n.currentLocale) ? i18n.currentLocale : localStorage.getItem('locale') || 'ru';
  var m = __S[l] || __S.ru;
  return m[k] || k;
}
function fp(t) { return t == null ? '\u2014' : Math.round(t / 100).toLocaleString('ru-RU') + ' ' + __('sum'); }
function gl() { return (window.i18n && i18n.currentLocale) ? i18n.currentLocale : localStorage.getItem('locale') || 'ru'; }

async function loadTariffsView() {
  var c = document.getElementById('tariffsView');
  if (!c) return;
  try {
    var l = gl(), t = localStorage.getItem('access_token'), h = { 'Authorization': 'Bearer ' + t };
    var a = await fetch('/api/tariffs?lang=' + l, { headers: h });
    var b = await fetch('/api/tariffs/services?lang=' + l, { headers: h });
    tariffData = await a.json();
    catalogData = await b.json();
    renderTP(c);
  } catch (e) {
    console.error('TE:', e);
    c.innerHTML = '<div class="hud-panel" style="color:var(--jarvis-red);padding:2rem">' + __('load_err') + '</div>';
  }
}

function renderTP(con) {
  var a = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin');
  var h = '<div class="tariffs-hud"><div class="tariffs-tabs">' +
    '<button class="tab-btn' + (currentTab === 'plans' ? ' active' : '') + '" onclick="swT(\'plans\')"><i class="fas fa-crown"></i> ' + __('tariff_plans') + '</button>' +
    '<button class="tab-btn' + (currentTab === 'constructor' ? ' active' : '') + '" onclick="swT(\'constructor\')"><i class="fas fa-wrench"></i> ' + __('constructor') + '</button>';
  if (a) h += '<button class="tab-btn' + (currentTab === 'requests' ? ' active' : '') + '" onclick="swT(\'requests\')"><i class="fas fa-inbox"></i> ' + __('requests') + '</button>';
  h += '</div><div id="tariffsContent"></div></div>';
  con.innerHTML = h;
  if (currentTab === 'plans') rPl(a);
  else if (currentTab === 'constructor') rCn();
  else if (currentTab === 'requests' && a) rRq();
}

function swT(t) { currentTab = t; renderTP(document.getElementById('tariffsView')); }

function rPl(isAdmin) {
  var c = document.getElementById('tariffsContent');
  if (!c) return;
  var ps = tariffData.plans || [], cp = tariffData.current_plan;
  var h = '<div class="plans-grid">';
  if (isAdmin) h += '<div class="tf-add-card" onclick="shEM(null)"><i class="fas fa-plus-circle"></i><span>' + __('add_plan') + '</span></div>';
  ps.forEach(function(p) {
    var ic = cp && cp.tariff_id === p.id, ip = p.is_popular;
    h += '<div class="plan-card' + (ip ? ' plan-popular' : '') + (ic ? ' plan-current' : '') + '">';
    h += '<div class="plan-header"><h3 class="plan-name">' + p.name + '</h3>';
    if (ip) h += '<div class="plan-badge">' + __('popular') + '</div>';
    if (ic) h += '<div class="plan-current-badge">' + __('current_plan') + '</div>';
    h += '<div class="plan-price"><span class="price-amount">' + fp(p.price_monthly) + '</span><span class="price-period">/ ' + __('month') + '</span></div>';
    if (p.max_workstations) h += '<div class="plan-ws">' + __('up_to') + ' ' + p.max_workstations + ' ' + __('ws') + '</div>';
    else h += '<div class="plan-ws">' + __('unlimited') + '</div>';
    h += '</div>';
    if (p.description) h += '<p class="plan-desc">' + p.description + '</p>';
    h += '<ul class="plan-features">';
    (p.features || []).forEach(function(f) {
      h += '<li class="' + (f.is_included ? 'feat-included' : 'feat-excluded') + '"><i class="fas ' + (f.is_included ? 'fa-check' : 'fa-xmark') + '"></i><span>' + f.text + '</span></li>';
    });
    h += '</ul><div class="plan-action">';
    if (ic) h += '<button class="tf-btn" disabled>' + __('active_plan') + '</button>';
    else h += '<button class="tf-btn tf-btn-p" onclick="hSub(' + p.id + ')">' + __('select_plan') + '</button>';
    if (isAdmin) {
      h += '<div class="tf-aa">';
      h += '<button class="tf-aa-b" onclick="shEM(' + p.id + ')">' + __('edit') + '</button>';
      h += '<button class="tf-aa-b tf-aa-d" onclick="hDel(' + p.id + ')">' + __('delete') + '</button>';
      h += '</div>';
    }
    h += '</div></div>';
  });
  h += '</div>';
  c.innerHTML = h;
}

async function hSub(i) {
  if (!confirm(__('confirm'))) return;
  try {
    var t = localStorage.getItem('access_token');
    var r = await fetch('/api/tariffs/subscribe', { method: 'POST', headers: { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ tariff_id: i }) });
    if (!r.ok) { var e = await r.json(); alert(e.detail || __('subscrib_err')); return; }
    await loadTariffsView();
  } catch (e) { alert(__('net_err')); }
}

async function hDel(i) {
  if (!confirm(__('confirm_del'))) return;
  try {
    var t = localStorage.getItem('access_token');
    var r = await fetch('/api/tariffs/admin/plans/' + i, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + t } });
    if (!r.ok) { var e = await r.json(); alert(e.detail || __('error_save')); return; }
    alert(__('deleted'));
    await loadTariffsView();
  } catch (e) { alert(__('net_err')); }
}

function rCn() {
  var c = document.getElementById('tariffsContent');
  if (!c) return;
  var svs = catalogData.services || [], cats = {};
  svs.forEach(function(s) { var ct = s.category || 'other'; if (!cats[ct]) cats[ct] = []; cats[ct].push(s); });
  var cn = { workstations: __('cat_ws'), servers: __('cat_srv'), network: __('cat_net'), security: __('cat_sec'), backup: __('cat_bak'), cloud: __('cat_cld'), one_time: __('cat_1x'), other: __('cat_oth') };
  var h = '<div class="constructor-layout"><div class="catalog-section"><h3 class="section-title"><i class="fas fa-box-open"></i> ' + __('catalog') + '</h3>';
  Object.keys(cats).forEach(function(ct) {
    h += '<div class="catalog-category"><h4 class="category-title">' + (cn[ct] || ct) + '</h4><div class="catalog-items">';
    cats[ct].forEach(function(s) {
      h += '<div class="catalog-card" onclick="aTC(' + s.id + ')"><div class="catalog-icon"><i class="fas ' + (s.icon_name || 'fa-cube') + '"></i></div><div class="catalog-info"><div class="catalog-name">' + s.name + '</div><div class="catalog-price">' + fp(s.price) + ' / ' + s.price_unit + '</div></div><i class="fas fa-plus-circle catalog-add"></i></div>';
    });
    h += '</div></div>';
  });
  h += '</div><div class="cart-section"><h3 class="section-title"><i class="fas fa-calculator"></i> ' + __('your_order') + '</h3>';
  h += '<div id="cartItems" class="cart-items"><p class="cart-empty">' + __('cart_empty') + '</p></div>';
  h += '<div id="cartSummary" class="cart-summary"></div>';
  h += '<div class="cart-actions"><textarea id="requestNotes" class="cart-notes" placeholder="' + __('order_notes') + '" rows="3"></textarea>';
  h += '<button class="tf-btn tf-btn-p" onclick="sSR()" id="submitRequestBtn" disabled><i class="fas fa-paper-plane"></i> ' + __('submit') + '</button></div></div></div>';
  c.innerHTML = h;
  uC();
}

function aTC(i) {
  var svs = catalogData.services || [], sv = null;
  for (var j = 0; j < svs.length; j++) { if (svs[j].id === i) { sv = svs[j]; break; } }
  if (!sv) return;
  var ex = null;
  for (var j = 0; j < cart.length; j++) { if (cart[j].service_id === i) { ex = cart[j]; break; } }
  if (ex) { if (ex.quantity < sv.max_quantity) ex.quantity++; }
  else { cart.push({ service_id: i, name: sv.name, price: sv.price, price_unit: sv.price_unit, price_type: sv.price_type, is_quantifiable: sv.is_quantifiable, min_quantity: sv.min_quantity, max_quantity: sv.max_quantity, quantity: sv.min_quantity }); }
  uC();
}
function rF(i) { cart = cart.filter(function(c) { return c.service_id !== i; }); uC(); }
function cQ(i, d) {
  var it = null;
  for (var j = 0; j < cart.length; j++) { if (cart[j].service_id === i) { it = cart[j]; break; } }
  if (!it) return;
  var n = it.quantity + d;
  if (n < it.min_quantity) { rF(i); return; }
  if (n > it.max_quantity) return;
  it.quantity = n; uC();
}
function uC() {
  var e = document.getElementById('cartItems'), s = document.getElementById('cartSummary'), b = document.getElementById('submitRequestBtn');
  if (!e) return;
  if (cart.length === 0) { e.innerHTML = '<p class="cart-empty">' + __('cart_empty') + '</p>'; if (s) s.innerHTML = ''; if (b) b.disabled = true; return; }
  var tm = 0, to = 0, h = '';
  cart.forEach(function(it) {
    var st = it.price * it.quantity;
    if (it.price_type === 'monthly') tm += st; else to += st;
    h += '<div class="cart-item"><div class="cart-item-info"><span class="cart-item-name">' + it.name + '</span><span class="cart-item-price">' + fp(it.price) + '/' + it.price_unit + '</span></div>';
    h += '<div class="cart-item-qty">';
    if (it.is_quantifiable) { h += '<button class="qty-btn" onclick="cQ(' + it.service_id + ',-1)">\u2212</button><span class="qty-val">' + it.quantity + '</span><button class="qty-btn" onclick="cQ(' + it.service_id + ',1)">+</button>'; }
    else { h += '<span class="qty-val qty-fixed">1</span>'; }
    h += '</div><div class="cart-item-subtotal">' + fp(st) + '</div><button class="cart-remove" onclick="rF(' + it.service_id + ')"><i class="fas fa-trash"></i></button></div>';
  });
  e.innerHTML = h;
  var sh = '';
  if (tm > 0) sh += '<div class="summary-row"><span>' + __('monthly') + ':</span><span class="summary-value">' + fp(tm) + '</span></div>';
  if (to > 0) sh += '<div class="summary-row"><span>' + __('onetime') + ':</span><span class="summary-value">' + fp(to) + '</span></div>';
  if (s) s.innerHTML = sh;
  if (b) b.disabled = false;
}

async function sSR() {
  if (cart.length === 0) return;
  var n = document.getElementById('requestNotes') ? document.getElementById('requestNotes').value : '';
  var is = cart.map(function(c) { return { service_id: c.service_id, quantity: c.quantity }; });
  try {
    var t = localStorage.getItem('access_token');
    var r = await fetch('/api/tariffs/services/request', { method: 'POST', headers: { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ items: is, notes: n }) });
    if (!r.ok) { var e = await r.json(); alert(e.detail || __('req_err')); return; }
    cart = []; alert(__('sent')); rCn();
  } catch (e) { alert(__('net_err')); }
}

function shEM(i) {
  tariffEditId = i;
  var p = null;
  if (i) { var ps = tariffData.plans || []; for (var j = 0; j < ps.length; j++) { if (ps[j].id === i) { p = ps[j]; break; } } }
  var t = i ? __('admin_edit') : __('add_plan');
  var nm = p ? p.name : '', pr = p ? p.price_monthly : '', ws = p ? (p.max_workstations || 0) : 0, dc = p ? (p.description || '') : '', po = p ? p.is_popular : false;
  var h = '<div class="tf-mo" onclick="cEM()"><div class="tf-mc" onclick="event.stopPropagation()">' +
    '<div class="tf-mh"><h3>' + t + '</h3><button class="tf-mx" onclick="cEM()">&times;</button></div>' +
    '<div class="tf-mb"><label>' + __('plan_name') + '</label><input id="epN" class="tf-inp" value="' + esc(nm) + '">' +
    '<label>' + __('plan_price') + '</label><input id="epP" class="tf-inp" type="number" value="' + pr + '">' +
    '<label>' + __('plan_ws') + '</label><input id="epW" class="tf-inp" type="number" value="' + ws + '">' +
    '<label>' + __('plan_desc') + '</label><textarea id="epD" class="tf-inp" rows="3">' + esc(dc) + '</textarea>' +
    '<label class="tf-chk"><input id="epPop" type="checkbox"' + (po ? ' checked' : '') + '> ' + __('plan_popular') + '</label>' +
    '</div><h4 class="tf-fh">' + __('features') + '</h4><div id="featsL" class="tf-fl">';
  var fs = p ? (p.features || []) : [];
  if (fs.length === 0) fs = [{ text: '', feature_key: '', is_included: true }];
  fs.forEach(function(f, idx) {
    h += '<div class="tf-fr"><input class="tf-inp tf-ft" placeholder="' + __('feat_text') + '" value="' + esc(f.text || '') + '"><input class="tf-inp tf-fk" placeholder="' + __('feat_key') + '" value="' + esc(f.feature_key || '') + '"><label class="tf-chk"><input type="checkbox" class="tf-fc"' + (f.is_included ? ' checked' : '') + '> ' + __('feat_included') + '</label><button class="tf-frx" onclick="rFtr(' + idx + ')">' + __('delete') + '</button></div>';
  });
  h += '</div><button class="tf-afb" onclick="aFtr()">' + __('add_feature') + '</button>' +
    '<div class="tf-mf"><button class="tf-btn tf-btn-p" onclick="sP()">' + __('save_plan') + '</button><button class="tf-btn" onclick="cEM()">' + __('cancel') + '</button></div></div></div>';
  var d = document.createElement('div'); d.id = 'tfEditModal'; d.innerHTML = h; document.body.appendChild(d);
}

function esc(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function cEM() { var e = document.getElementById('tfEditModal'); if (e) e.remove(); tariffEditId = null; }
function rFtr(i) { var l = document.getElementById('featsL'), r = l.querySelectorAll('.tf-fr'); if (r.length <= 1) return; r[i].remove(); }
function aFtr() {
  var l = document.getElementById('featsL'), r = l.querySelectorAll('.tf-fr').length;
  var d = document.createElement('div'); d.className = 'tf-fr';
  d.innerHTML = '<input class="tf-inp tf-ft" placeholder="' + __('feat_text') + '"><input class="tf-inp tf-fk" placeholder="' + __('feat_key') + '"><label class="tf-chk"><input type="checkbox" class="tf-fc" checked> ' + __('feat_included') + '</label><button class="tf-frx" onclick="rFtr(' + r + ')">' + __('delete') + '</button>';
  l.appendChild(d);
}
function cF() {
  var rs = document.querySelectorAll('#featsL .tf-fr'), fe = [];
  rs.forEach(function(r) { var t = r.querySelector('.tf-ft') ? r.querySelector('.tf-ft').value : '', k = r.querySelector('.tf-fk') ? r.querySelector('.tf-fk').value : '', ic = r.querySelector('.tf-fc') ? r.querySelector('.tf-fc').checked : true; if (t) fe.push({ text: t, feature_key: k, is_included: ic }); });
  return fe;
}
async function sP() {
  var m = tariffEditId ? 'PUT' : 'POST', u = tariffEditId ? '/api/tariffs/admin/plans/' + tariffEditId : '/api/tariffs/admin/plans';
  var d = { name_ru: document.getElementById('epN').value, name_en: document.getElementById('epN').value, name_uz: document.getElementById('epN').value, slug: 'p-' + Date.now(), price_monthly: parseInt(document.getElementById('epP').value) || 0, max_workstations: parseInt(document.getElementById('epW').value) || 0, description_ru: document.getElementById('epD').value, description_en: document.getElementById('epD').value, description_uz: document.getElementById('epD').value, is_popular: document.getElementById('epPop').checked, features: cF() };
  try {
    var t = localStorage.getItem('access_token');
    var r = await fetch(u, { method: m, headers: { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    if (!r.ok) { var e = await r.json(); alert(e.detail || __('error_save')); return; }
    cEM(); alert(__('saved')); await loadTariffsView();
  } catch (e) { alert(__('net_err')); }
}
async function rRq() {
  var c = document.getElementById('tariffsContent');
  if (!c) return;
  try {
    var t = localStorage.getItem('access_token');
    var r = await fetch('/api/tariffs/admin/requests', { headers: { 'Authorization': 'Bearer ' + t } });
    var d = await r.json();
    var reqs = d.requests || [];
    var h = '<div class="hud-panel" style="padding:0.75rem"><h3 style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#00d4ff;margin:0 0 0.75rem"><i class="fas fa-inbox"></i> ' + __('requests') + '</h3>';
    if (reqs.length === 0) { h += '<p style="color:rgba(200,210,230,0.4);font-size:0.7rem">' + __('cart_empty') + '</p></div>'; c.innerHTML = h; return; }
    h += '<table style="width:100%;border-collapse:collapse;font-size:0.7rem"><tr style="color:rgba(200,210,230,0.4);text-transform:uppercase;letter-spacing:0.06em;font-size:0.6rem"><th style="padding:0.3rem 0.4rem;text-align:left;border-bottom:1px solid rgba(0,212,255,0.1)">ID</th><th style="padding:0.3rem 0.4rem;text-align:left;border-bottom:1px solid rgba(0,212,255,0.1)">' + __('status') + '</th><th style="padding:0.3rem 0.4rem;text-align:left;border-bottom:1px solid rgba(0,212,255,0.1)">' + __('monthly') + '</th><th style="padding:0.3rem 0.4rem;text-align:left;border-bottom:1px solid rgba(0,212,255,0.1)">' + __('onetime') + '</th><th style="padding:0.3rem 0.4rem;text-align:left;border-bottom:1px solid rgba(0,212,255,0.1)">' + __('order_notes') + '</th><th style="padding:0.3rem 0.4rem;text-align:left;border-bottom:1px solid rgba(0,212,255,0.1)">' + __('popular') + '</th></tr>';
    reqs.forEach(function(r) {
      h += '<tr style="border-bottom:1px solid rgba(0,212,255,0.05)"><td style="padding:0.3rem 0.4rem;color:#e0e7ff">#' + r.id + '</td><td style="padding:0.3rem 0.4rem"><span style="color:' + (r.status==='pending'?'#fbbf24':r.status==='approved'?'#22c55e':r.status==='rejected'?'#ef4444':'#94a3b8') + '">' + r.status + '</span></td><td style="padding:0.3rem 0.4rem;color:#00d4ff">' + fp(r.total_monthly) + '</td><td style="padding:0.3rem 0.4rem;color:#e0e7ff">' + fp(r.total_one_time) + '</td><td style="padding:0.3rem 0.4rem;color:rgba(200,210,230,0.5)">' + (r.notes || '-') + '</td><td style="padding:0.3rem 0.4rem;color:rgba(200,210,230,0.4);font-size:0.6rem">' + (r.created_at ? r.created_at.slice(0,10) : '') + '</td></tr>';
    });
    h += '</table></div>';
    c.innerHTML = h;
  } catch (e) { c.innerHTML = '<div class="hud-panel" style="padding:1rem;color:var(--jarvis-red)">' + __('load_err') + '</div>'; }
}
document.addEventListener('localeChanged', function() { if (typeof activeView !== 'undefined' && activeView === 'tariffs') { currentTab = 'plans'; loadTariffsView(); } });
