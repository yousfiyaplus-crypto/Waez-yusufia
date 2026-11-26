// js/utils.js — دوال مساعدة عامة: تعقيم النصوص، البحث، المسافات، حالة الدوام.
// ===== أدوات مساعدة آمنة =====
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanPhone(num) {
  return String(num || '').replace(/[^\d+]/g, '');
}

function formatWhatsApp(num) {
  let d = String(num || '').replace(/\D/g, '');
  if (d.startsWith('00964')) d = d.slice(2);
  else if (d.startsWith('07') && d.length === 11) d = '964' + d.slice(1);
  return d;
}

function safeImageUrl(url) {
  // يُستخدم داخل src="..." لذلك نهرّب الناتج، ونسمح بـ https فقط.
  if (typeof url === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(url)) return escapeHtml(url);
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#0d0f14"/><path d="M60 95l8-25h64l8 25" stroke="#f5b800" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M68 120v40h64v-40" stroke="#f5b800" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M88 160v-22h24v22" stroke="#f5b800" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  );
}

// بطاقات هيكلية (Skeleton) لحالات التحميل
function skeletonCards(n = 3) {
  return Array.from({ length: n }, () =>
    '<div class="panel-card sk-panel" aria-hidden="true"><div class="sk sk-line w60"></div><div class="sk sk-line w80"></div><div class="sk sk-line w40"></div></div>'
  ).join('');
}

function showMsg(elId, text, isOk = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = `<div class="msg-box ${isOk ? 'msg-ok' : 'msg-err'}">${isOk ? ICONS.check : ICONS.warn}${escapeHtml(text)}</div>`;
}

// ===== تنبيهات عائمة (Toast) =====
function showToast(message, type = 'ok', duration = 2800) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.setAttribute('role', type === 'err' ? 'alert' : 'status');
  // الأيقونة الأولى (SVG موثوق من ICONS) تبقى كما هي، وباقي النص يُهرَّب لأنه قد يحوي رسائل أخطاء خارجية.
  const m = String(message).match(/^(\s*<svg[\s\S]*?<\/svg>)?([\s\S]*)$/);
  t.innerHTML = (m[1] || '') + escapeHtml(m[2]);
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, duration);
}

// ===== نافذة تأكيد/إدخال عامة (بديل عن confirm/prompt/alert الأصلية بالمتصفح) =====
function showDialog({ message, withInput = false, confirmText = 'تأكيد', danger = true, placeholder = '' }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('generic-dialog');
    const msgEl = document.getElementById('gd-message');
    const inputWrap = document.getElementById('gd-input-wrap');
    const input = document.getElementById('gd-input');
    const confirmBtn = document.getElementById('gd-confirm');
    const cancelBtn = document.getElementById('gd-cancel');

    msgEl.textContent = message;
    inputWrap.classList.toggle('hidden', !withInput);
    input.value = '';
    input.placeholder = placeholder;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `btn ${danger ? 'btn-red' : 'btn-primary'} btn-block`;
    overlay.classList.remove('hidden');
    if (withInput) setTimeout(() => input.focus(), 150);

    const cleanup = (result) => {
      overlay.classList.add('hidden');
      overlay.onclick = null;
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      resolve(result);
    };
    cancelBtn.onclick = () => cleanup(withInput ? null : false);
    confirmBtn.onclick = () => cleanup(withInput ? (input.value.trim() || null) : true);
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(withInput ? null : false); };
  });
}

// ===== تطبيع النص العربي للبحث (يتجاهل التشكيل واختلاف الألف/التاء المربوطة) =====
function normalizeAr(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

// ===== معالجة البحث مع تأخير بسيط (debounce) لسلاسة الكتابة =====
let searchDebounceTimer = null;
function onSearchInput() {
  toggleSearchClearBtn();
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => { mapFitPending = true; renderShops(); }, 150);
}

function toggleSearchClearBtn() {
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-clear-btn');
  if (input && btn) btn.classList.toggle('show', input.value.length > 0);
}

function clearSearch() {
  const input = document.getElementById('search-input');
  input.value = '';
  input.focus();
  toggleSearchClearBtn();
  renderShops();
}

function clearAllFilters() {
  selectedCategory = 'all';
  quickFilters = { open: false, verified: false, fav: false };
  document.getElementById('search-input').value = '';
  toggleSearchClearBtn();
  ['open', 'verified', 'fav'].forEach(k => {
    const btn = document.getElementById(`filter-${k}`);
    btn.classList.remove('active', 'active-gold', 'active-red');
  });
  renderCategoryPills();
  mapFitPending = true;
  renderShops();
}

// حساب المسافة بالكيلومتر (Haversine)
function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} متر`;
  return `${km.toFixed(1)} كم`;
}

// حساب حالة الفتح والإغلاق بتوقيت بغداد
function getOpenStatus(shop) {
  if (shop.manual_status === 'open') return { isOpen: true, label: 'مفتوح الآن', cls: 'badge-open' };
  if (shop.manual_status === 'duty') return { isOpen: true, label: 'خفارة / متاح', cls: 'badge-duty' };
  if (shop.manual_status === 'closed') return { isOpen: false, label: 'مغلق حالياً', cls: 'badge-closed' };
  if (shop.is_24h) return { isOpen: true, label: 'مفتوح ٢٤ ساعة', cls: 'badge-open' };

  if (!shop.open_time || !shop.close_time) return { isOpen: true, label: 'متاح', cls: 'badge-open' };
  const [oh, om] = shop.open_time.split(':').map(Number);
  const [ch, cm] = shop.close_time.split(':').map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  let nh = parseInt(parts.find(p => p.type === 'hour').value, 10);
  if (nh === 24) nh = 0;
  const nm = parseInt(parts.find(p => p.type === 'minute').value, 10);
  const nowMin = nh * 60 + nm;

  const isOpen = openMin <= closeMin
    ? (nowMin >= openMin && nowMin < closeMin)
    : (nowMin >= openMin || nowMin < closeMin);

  return isOpen
    ? { isOpen: true, label: 'مفتوح الآن', cls: 'badge-open' }
    : { isOpen: false, label: 'مغلق حالياً', cls: 'badge-closed' };
}
