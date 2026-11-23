// ===== إعدادات الربط =====
const SUPABASE_URL = 'https://rwtbmtexxarddibqkbqw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p-zCzWFpfcuL68Jfc-wV9w_ZM8tnIHw';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// إحداثيات مركز اليوسفية - بغداد
const YUSUFIYA_CENTER = [33.075, 44.245];

// حالة التطبيق
let currentUser = null;
let currentProfile = null;
let categories = [];
let allShops = [];
let communityPosts = [];
let reviewsSummary = {}; // { shopId: { avg, count } }
let mapEnabledSetting = true;
let selectedCategory = 'all';
let quickFilters = { open: false, verified: false, fav: false };
let userCoords = null;
let favorites = JSON.parse(localStorage.getItem('yp_favs') || '[]');
let authMode = 'login';
let deferredPrompt = null;

let mainMap = null;
let mainMarkersLayer = null;
let routeLayer = null;
let pickerMap = null;
let pickerMarker = null;
let pendingCompressedBlob = null;

// ===== مكتبة الأيقونات (SVG مضمّنة، بلا طلبات خارجية) =====
const ICONS = {
  pin: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M12 22s7-7.58 7-12.5A7 7 0 0 0 5 9.5C5 14.42 12 22 12 22z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  check: '<svg class="ic ic-14" viewBox="0 0 24 24" stroke-width="2.3"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  star: (filled) => `<svg class="ic ic-14${filled ? ' ic-fill' : ''}" viewBox="0 0 24 24" ${filled ? 'fill="currentColor" stroke="none"' : ''}><path d="M12 2.5l2.95 6.26 6.9.76-5.13 4.73 1.4 6.78L12 17.9 5.88 21.03l1.4-6.78L2.15 9.52l6.9-.76L12 2.5z"/></svg>`,
  fire: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M12 22c4 0 7-2.5 7-6.5 0-3-1.8-4.8-2.6-6.3-.3 1.7-1.3 2.8-1.3 2.8C15.5 9 14 6 12 2c-.6 3-2 4.8-3.3 6.5C7.4 10 6 11.8 6 14.5 6 18.5 8 22 12 22z"/></svg>',
  phone: '<svg class="ic ic-16" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  chat: '<svg class="ic ic-16" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 20l1-4.5a8.38 8.38 0 0 1-1-4A8.5 8.5 0 1 1 21 11.5z"/></svg>',
  compass: '<svg class="ic ic-16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M14.5 9.5l-2 5-5 2 2-5 5-2z"/></svg>',
  heart: (filled) => `<svg class="ic ic-16${filled ? ' ic-fill' : ''}" viewBox="0 0 24 24" ${filled ? 'fill="currentColor"' : ''}><path d="M12 21s-7.2-4.5-9.6-9C1.1 9 2.5 5.5 5.9 5.5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2 3.4 0 4.8 3.5 3.5 6.5-2.4 4.5-9.6 9-9.6 9z"/></svg>`,
  eye: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  tap: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M9 11.5V6a1.5 1.5 0 0 1 3 0v5"/><path d="M12 11V5a1.5 1.5 0 0 1 3 0v6"/><path d="M15 11.5V7a1.5 1.5 0 0 1 3 0v7c0 3.5-2 6.5-6 6.5s-5.5-1.5-7-4l-1.8-3.2a1.4 1.4 0 0 1 2.3-1.6L7 14"/></svg>',
  edit: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  trash: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  flag: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
  store: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 9v10h14V9"/><path d="M9 19v-5h6v5"/></svg>',
  clock: '<svg class="ic ic-14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  warn: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.1"/></svg>',
};

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
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) return url;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#0d0f14"/><path d="M60 95l8-25h64l8 25" stroke="#f5b800" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M68 120v40h64v-40" stroke="#f5b800" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M88 160v-22h24v22" stroke="#f5b800" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  );
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
  t.innerHTML = message;
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
  searchDebounceTimer = setTimeout(renderShops, 150);
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

// ===== تشغيل التطبيق =====
window.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-pwa-btn').classList.remove('hidden');
  });

  initMainMap();
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      if (!e.target.closest('.leaflet-container')) e.preventDefault();
    }, { passive: false });
  });
  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1 && !e.target.closest('.leaflet-container')) {
      e.preventDefault();
    }
  }, { passive: false });
  await checkAuthSession();
  await loadInitialData();

  sb.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    await loadCurrentProfile();
    updateAuthUI();
  });
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  document.getElementById('install-pwa-btn').classList.add('hidden');
}

// ===== التنقل =====
function switchView(viewName) {
  ['home', 'request', 'owner', 'admin', 'auth'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const show = v === viewName;
    el.classList.toggle('hidden', !show);
    el.classList.remove('view-enter');
    if (show) { void el.offsetWidth; el.classList.add('view-enter'); }
    const nav = document.getElementById(`nav-${v}`);
    if (nav) nav.classList.toggle('active', show);
  });

  if (viewName === 'home' && mainMap) {
    setTimeout(() => mainMap.invalidateSize(), 200);
  } else if (viewName === 'request') {
    renderServiceRequestView();
  } else if (viewName === 'owner') {
    renderOwnerSection();
  } else if (viewName === 'admin' && currentProfile?.role === 'admin') {
    loadAdminTab('pending', document.querySelector('#admin-tabs .pill'));
  }
}

// ===== المصادقة والحساب =====
async function checkAuthSession() {
  const { data } = await sb.auth.getSession();
  currentUser = data?.session?.user || null;
  await loadCurrentProfile();
  updateAuthUI();
}

async function loadCurrentProfile() {
  if (!currentUser) {
    currentProfile = null;
    return;
  }
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data || null;
}

function updateAuthUI() {
  const badge = document.getElementById('header-user-badge');
  const navAdmin = document.getElementById('nav-admin');
  const authForms = document.getElementById('auth-forms-card');
  const authLogged = document.getElementById('auth-logged-in');

  document.getElementById('request-login-note')?.classList.toggle('hidden', !!currentUser);
  document.getElementById('service-request-form')?.classList.toggle('hidden', !currentUser);
  if (currentUser) {
    const name = currentProfile?.full_name || currentUser.email.split('@')[0];
    badge.innerHTML = `<svg class="ic ic-16" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg> ${escapeHtml(name)}`;
    authForms.classList.add('hidden');
    authLogged.classList.remove('hidden');
    document.getElementById('profile-info').innerHTML =
      `<strong>الاسم:</strong> ${escapeHtml(name)}<br><strong>الإيميل:</strong> ${escapeHtml(currentUser.email)}<br><strong>الصلاحية:</strong> ${currentProfile?.role === 'admin' ? 'مدير المنصة' : 'مستخدم / صاحب مشروع'}`;
    navAdmin.classList.toggle('hidden', currentProfile?.role !== 'admin');
  } else {
    badge.innerHTML = `<svg class="ic ic-16" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg> دخول / تسجيل`;
    authForms.classList.remove('hidden');
    authLogged.classList.add('hidden');
    navAdmin.classList.add('hidden');
  }
}

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('auth-name-group').classList.toggle('hidden', mode === 'login');
  document.getElementById('tab-login').className = mode === 'login' ? 'btn btn-primary' : 'btn btn-outline';
  document.getElementById('tab-signup').className = mode === 'signup' ? 'btn btn-primary' : 'btn btn-outline';
  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'دخول' : 'إنشاء الحساب';
  document.getElementById('auth-msg').innerHTML = '';
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const fullName = document.getElementById('auth-name').value.trim();

  if (!email || password.length < 6) {
    return showMsg('auth-msg', 'يرجى إدخال بريد إلكتروني صحيح وكلمة مرور من ٦ أحرف على الأقل.', false);
  }

  const btn = document.getElementById('auth-submit-btn');
  const btnDefaultHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> جاري التحقق...`;
  const restoreBtn = () => { btn.disabled = false; btn.innerHTML = btnDefaultHtml; };

  if (authMode === 'login') {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    restoreBtn();
    if (error) return showMsg('auth-msg', 'تأكد من الإيميل وكلمة المرور أو تفعيل الحساب من إيميلك.', false);
    showMsg('auth-msg', 'تم تسجيل الدخول بنجاح!', true);
    await loadInitialData();
    switchView('home');
  } else {
    if (!fullName) { restoreBtn(); return showMsg('auth-msg', 'يرجى كتابة اسمك الكامل.', false); }
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    restoreBtn();
    if (error) return showMsg('auth-msg', error.message, false);
    if (data?.session) {
      showMsg('auth-msg', 'تم إنشاء الحساب وتسجيل الدخول بنجاح!', true);
      await loadInitialData();
    } else {
      showMsg('auth-msg', 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني (تفقد البريد الوارد أو Spam) ثم سجل الدخول.', true);
    }
  }
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateAuthUI();
  switchView('home');
}

// ===== تحميل البيانات الأولية =====
async function loadInitialData() {
  const [catRes, setRes, shopRes, revRes] = await Promise.all([
    sb.from('categories').select('*').order('sort_order'),
    sb.from('app_settings').select('*'),
    sb.from('shops').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
    sb.from('reviews').select('shop_id, rating').eq('status', 'approved')
  ]);

  categories = catRes.data || [];
  const settingsMap = {};
  (setRes.data || []).forEach(s => { settingsMap[s.key] = s.value; });
  mapEnabledSetting = settingsMap.map_enabled !== false && settingsMap.map_enabled !== 'false';

  allShops = shopRes.data || [];
  await loadCommunityPosts();
  const heroShops = document.getElementById('hero-shops-count');
  const heroCats = document.getElementById('hero-categories-count');
  if (heroShops) heroShops.textContent = allShops.length.toLocaleString('ar-IQ');
  if (heroCats) heroCats.textContent = categories.length.toLocaleString('ar-IQ');
  reviewsSummary = {};
  (revRes.data || []).forEach(r => {
    if (!reviewsSummary[r.shop_id]) reviewsSummary[r.shop_id] = { sum: 0, count: 0 };
    reviewsSummary[r.shop_id].sum += r.rating;
    reviewsSummary[r.shop_id].count += 1;
  });

  renderCategoryPills();
  populateCategorySelect();
  document.getElementById('map-wrapper').classList.toggle('hidden', !mapEnabledSetting);
  renderShops();
}

async function renderServiceRequestView() {
  const wrap = document.getElementById('my-service-requests');
  if (!wrap || !currentUser) return;
  wrap.classList.remove('hidden');
  wrap.innerHTML = '<strong>طلباتي السابقة</strong><p style="color:var(--text-muted);font-size:.8rem;">جاري التحميل...</p>';
  const { data, error } = await sb.from('service_requests').select('id,category,area,details,status,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(20);
  if (error) { wrap.innerHTML = '<strong>طلباتك السابقة</strong><p style="color:var(--text-muted);font-size:.8rem;">نفّذ تحديث قاعدة البيانات المرفق لتفعيل سجل الطلبات.</p>'; return; }
  const labels = {new:'جديد',reviewing:'قيد المتابعة',assigned:'تم توجيهه',completed:'مكتمل',cancelled:'ملغي'};
  wrap.innerHTML = '<strong>طلباتي السابقة</strong>' + ((data||[]).map(r=>`<div class="review-item"><div style="display:flex;justify-content:space-between;gap:8px;"><b>${escapeHtml(r.category)}</b><span class="request-status">${labels[r.status]||'قيد المتابعة'}</span></div><div style="font-size:.76rem;color:var(--text-muted);margin-top:4px;">${escapeHtml(r.area)} • ${new Date(r.created_at).toLocaleDateString('ar-IQ')}</div><p style="font-size:.82rem;margin:5px 0 0;">${escapeHtml(r.details)}</p></div>`).join('') || '<p style="color:var(--text-muted);font-size:.82rem;">ما عندك طلبات سابقة حالياً.</p>');
}

async function submitServiceRequest() {
  if (!currentUser) return switchView('auth');
  const category = document.getElementById('sr-category').value;
  const area = document.getElementById('sr-area').value.trim();
  const phone = cleanPhone(document.getElementById('sr-phone').value);
  const details = document.getElementById('sr-details').value.trim();
  if (!category || !area || phone.length < 10 || details.length < 8) return showMsg('sr-message','أكمل نوع الخدمة والمنطقة ورقم الهاتف والتفاصيل بشكل صحيح.',false);
  const btn = document.getElementById('sr-submit');
  btn.disabled = true; btn.textContent = 'جاري إرسال الطلب...';
  const { error } = await sb.from('service_requests').insert({user_id:currentUser.id,category,area,phone,details,status:'new'});
  btn.disabled = false; btn.textContent = 'إرسال طلب الخدمة';
  if (error) return showMsg('sr-message','تعذر إرسال الطلب: ' + error.message,false);
  document.getElementById('sr-details').value = '';
  showMsg('sr-message','وصل طلبك بنجاح. تگدر تتابع حالته من طلباتي السابقة.',true);
  await renderServiceRequestView();
}

async function loadCommunityPosts() {
  const { data, error } = await sb.from('community_posts').select('id,title,body,kind,area,expires_at,created_at').eq('status','published').or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()).order('created_at',{ascending:false}).limit(6);
  communityPosts = error ? [] : (data || []);
  renderCommunityPosts();
}

function renderCommunityPosts() {
  const section = document.getElementById('community-pulse');
  const wrap = document.getElementById('community-posts-list');
  if (!section || !wrap) return;
  section.classList.toggle('hidden', communityPosts.length === 0);
  wrap.innerHTML = communityPosts.map(post => {
    const kind = ['news','offer','alert'].includes(post.kind) ? post.kind : 'news';
    const symbol = kind === 'offer' ? '٪' : kind === 'alert' ? '!' : '●';
    const label = kind === 'offer' ? 'عرض' : kind === 'alert' ? 'تنبيه' : 'خبر محلي';
    const date = post.created_at ? new Date(post.created_at).toLocaleDateString('ar-IQ',{day:'numeric',month:'short'}) : '';
    return `<article class="pulse-card ${kind}"><div class="pulse-symbol">${symbol}</div><div class="pulse-content"><strong>${escapeHtml(post.title)}</strong><p>${escapeHtml(post.body)}</p><div class="pulse-meta"><span>${label}</span>${post.area ? `<span>• ${escapeHtml(post.area)}</span>` : ''}${date ? `<span>• ${date}</span>` : ''}</div></div></article>`;
  }).join('');
}

async function submitCommunityPost() {
  if (currentProfile?.role !== 'admin') return showToast('هذه الخاصية للإدارة فقط.','err');
  const title = document.getElementById('cp-title')?.value.trim();
  const body = document.getElementById('cp-body')?.value.trim();
  const kind = document.getElementById('cp-kind')?.value || 'news';
  const area = document.getElementById('cp-area')?.value.trim() || null;
  const days = Number(document.getElementById('cp-days')?.value || 0);
  if (!title || !body) return showToast('اكتب العنوان والتفاصيل أولاً.','err');
  const expires_at = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
  const { error } = await sb.from('community_posts').insert({title,body,kind,area,expires_at,status:'published',created_by:currentUser.id});
  if (error) return showToast('تعذر النشر: ' + error.message,'err',4500);
  showToast('تم نشر التحديث المحلي.','ok');
  loadAdminTab('community');
  await loadCommunityPosts();
}

async function adminDeleteCommunityPost(id) {
  const ok = await showDialog({message:'حذف هذا التحديث من نبض اليوسفية؟',confirmText:'حذف التحديث'});
  if (!ok) return;
  const { error } = await sb.from('community_posts').delete().eq('id',id);
  if (error) return showToast('تعذر الحذف: ' + error.message,'err');
  await loadCommunityPosts();
  loadAdminTab('community');
}

function renderCategoryPills() {
  const wrap = document.getElementById('category-pills');
  let html = `<button class="pill ${selectedCategory === 'all' ? 'active' : ''}" onclick="selectCategory('all')">الكل</button>`;
  categories.forEach(c => {
    html += `<button class="pill ${selectedCategory === c.id ? 'active' : ''}" onclick="selectCategory(${c.id})">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</button>`;
  });
  wrap.innerHTML = html;
}

function populateCategorySelect() {
  const sel = document.getElementById('f-category');
  if (!sel) return;
  sel.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`).join('');
}

function selectCategory(catId) {
  selectedCategory = catId;
  renderCategoryPills();
  renderShops();
}

function toggleQuickFilter(key) {
  quickFilters[key] = !quickFilters[key];
  const btn = document.getElementById(`filter-${key}`);
  if (key === 'open') btn.classList.toggle('active', quickFilters.open);
  if (key === 'verified') btn.classList.toggle('active-gold', quickFilters.verified);
  if (key === 'fav') btn.classList.toggle('active-red', quickFilters.fav);
  renderShops();
}

function requestUserLocation() {
  const statusEl = document.getElementById('location-status');
  if (!navigator.geolocation) {
    statusEl.textContent = 'متصفحك لا يدعم تحديد الموقع.';
    return;
  }
  statusEl.textContent = 'جاري تحديد موقعك...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      document.getElementById('btn-my-location').classList.add('active');
      statusEl.innerHTML = `${ICONS.check} تم تحديد موقعك — يتم الآن ترتيب المشاريع الظاهرة من الأقرب إليك.`;
      if (mainMap) mainMap.setView([userCoords.lat, userCoords.lng], 14);
      renderShops();
    },
    () => {
      statusEl.textContent = 'تعذر الوصول للموقع. تأكد من تفعيل الـ GPS والسماح للمتصفح.';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ===== الخريطة الرئيسية =====
function initMainMap() {
  mainMap = L.map('main-map').setView(YUSUFIYA_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(mainMap);
  mainMarkersLayer = L.layerGroup().addTo(mainMap);
  routeLayer = L.layerGroup().addTo(mainMap);
}

async function showRouteInApp(shopId) {
  const shop = allShops.find(s => s.id === shopId);
  if (!shop || !shop.lat || !shop.lng) return;
  trackMetric(shopId, 'click');
  closeShopModal();
  switchView('home');

  const mapWrap = document.getElementById('map-wrapper');
  mapWrap.classList.remove('hidden');
  mapWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const routeBar = document.getElementById('route-bar');
  const routeText = document.getElementById('route-info-text');
  const extBtn = document.getElementById('route-ext-btn');
  extBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`;
  routeBar.classList.remove('hidden');

  const drawWithUser = async (coords) => {
    if (routeLayer) routeLayer.clearLayers();
    routeText.textContent = `جاري رسم المسار إلى ${shop.name}...`;

    L.circleMarker([coords.lat, coords.lng], {
      radius: 8, color: '#0d0f14', fillColor: '#16a34a', fillOpacity: 1
    }).bindPopup('موقعك الحالي').addTo(routeLayer);

    L.marker([shop.lat, shop.lng]).bindPopup(escapeHtml(shop.name)).addTo(routeLayer);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${coords.lng},${coords.lat};${shop.lng},${shop.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length) {
        const r = data.routes[0];
        const line = L.geoJSON(r.geometry, { style: { color: '#2563eb', weight: 5, opacity: 0.9 } }).addTo(routeLayer);
        mainMap.fitBounds(line.getBounds(), { padding: [35, 35] });
        const km = (r.distance / 1000).toFixed(1);
        const mins = Math.max(1, Math.round(r.duration / 60));
        routeText.textContent = `إلى ${shop.name}: ${km} كم (~${mins} دقيقة)`;
        return;
      }
    } catch (_) {}

    const fallbackLine = L.polyline([[coords.lat, coords.lng], [shop.lat, shop.lng]], {
      color: '#2563eb', weight: 4, dashArray: '8, 8'
    }).addTo(routeLayer);
    mainMap.fitBounds(fallbackLine.getBounds(), { padding: [35, 35] });
    const d = calcDistanceKm(coords.lat, coords.lng, shop.lat, shop.lng);
    routeText.textContent = `إلى ${shop.name} (يبعد ${formatDistance(d)})`;
  };

  if (userCoords) {
    drawWithUser(userCoords);
  } else {
    routeText.textContent = 'جاري تحديد موقعك لرسم المسار...';
    const locFn = (typeof getSmartLocation === 'function')
      ? getSmartLocation
      : (ok, fail) => navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: false, timeout: 12000 });
    locFn(
      (pos) => {
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        document.getElementById('btn-my-location').classList.add('active');
        drawWithUser(userCoords);
      },
      () => {
        if (routeLayer) routeLayer.clearLayers();
        mainMap.setView([shop.lat, shop.lng], 16);
        routeText.textContent = `موقع ${shop.name} (فعّل الـ GPS لرسم الطريق من مكانك)`;
      }
    );
  }
}

function clearRoute() {
  if (routeLayer) routeLayer.clearLayers();
  document.getElementById('route-bar').classList.add('hidden');
  if (!mapEnabledSetting) document.getElementById('map-wrapper').classList.add('hidden');
}

function setResultsView(mode) {
  const isList = mode === 'list';
  document.body.classList.toggle('list-view', isList);
  document.getElementById('show-map-view')?.classList.toggle('active', !isList);
  document.getElementById('show-list-view')?.classList.toggle('active', isList);
  if (!isList && mainMap) setTimeout(() => mainMap.invalidateSize(), 180);
}

function toggleMapFullscreen() {
  const mapCard = document.getElementById('map-wrapper');
  const opened = mapCard.classList.toggle('map-fullscreen');
  document.body.classList.toggle('map-open', opened);
  const btn = mapCard.querySelector('.map-expand-btn');
  if (btn) btn.textContent = opened ? '✕ إغلاق' : '⛶ تكبير';
  if (mainMap) setTimeout(() => mainMap.invalidateSize(), 220);
}

function renderShops() {
  toggleSearchClearBtn();
  const q = normalizeAr(document.getElementById('search-input').value.trim());
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  let list = allShops.map(s => {
    const openInfo = getOpenStatus(s);
    const dist = (userCoords && s.show_on_map && s.lat && s.lng)
      ? calcDistanceKm(userCoords.lat, userCoords.lng, s.lat, s.lng)
      : null;
    const rev = reviewsSummary[s.id];
    const avgRating = rev ? (rev.sum / rev.count) : 0;
    return { ...s, openInfo, dist, avgRating, revCount: rev ? rev.count : 0 };
  }).filter(s => {
    if (selectedCategory !== 'all' && s.category_id !== selectedCategory) return false;
    if (quickFilters.open && !s.openInfo.isOpen) return false;
    if (quickFilters.verified && !s.is_verified) return false;
    if (quickFilters.fav && !favorites.includes(s.id)) return false;
    if (q) {
      const hay = normalizeAr(`${s.name} ${s.description || ''} ${s.area_text} ${s.daily_offer || ''} ${catMap[s.category_id]?.name || ''}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // الترتيب: الذهبي أولاً -> الأقرب -> الأعلى تقييماً
  list.sort((a, b) => {
    if (a.plan === 'gold' && b.plan !== 'gold') return -1;
    if (b.plan === 'gold' && a.plan !== 'gold') return 1;
    if (a.dist != null && b.dist != null) return a.dist - b.dist;
    if (a.dist != null) return -1;
    if (b.dist != null) return 1;
    return b.avgRating - a.avgRating;
  });

  // تحديث الخريطة
  if (mainMarkersLayer) {
    mainMarkersLayer.clearLayers();
    if (userCoords) {
      L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 8, color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9
      }).bindPopup('موقعك الحالي').addTo(mainMarkersLayer);
    }
    let mapPinsCount = 0;
    if (mapEnabledSetting) {
      list.forEach(s => {
        if (s.show_on_map && s.lat && s.lng) {
          mapPinsCount++;
          const m = L.marker([s.lat, s.lng]).addTo(mainMarkersLayer);
          m.bindPopup(`<b>${escapeHtml(s.name)}</b><br>${escapeHtml(s.openInfo.label)}<br><button onclick="openShopModal('${s.id}')" style="margin-top:4px;cursor:pointer;">عرض التفاصيل</button>`);
        }
      });
    }
    document.getElementById('shops-count').textContent = `${mapPinsCount} على الخريطة | ${list.length} إجمالي`;
  } else {
    const countEl = document.getElementById('shops-count');
    if (countEl) countEl.textContent = `${list.length} مشروع`;
  }

  // عرض البطاقات
  const container = document.getElementById('shops-list');
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="ic ic-22" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>لا توجد مشاريع مطابقة لبحثك أو فلاترك الحالية.</p>
        <button class="btn btn-outline btn-sm" onclick="clearAllFilters()">مسح البحث والفلاتر</button>
      </div>`;
    return;
  }

  container.innerHTML = list.map(s => {
    const cat = catMap[s.category_id] || { icon: '', name: '' };
    const showDir = mapEnabledSetting && s.show_on_map && s.lat && s.lng;
    const waNum = formatWhatsApp(s.whatsapp || s.phone);

    return `
      <article class="shop-card ${s.plan === 'gold' ? 'gold' : ''}">
        <div class="shop-top" onclick="openShopModal('${s.id}')">
          <img class="shop-thumb" src="${safeImageUrl(s.image_url)}" alt="${escapeHtml(s.name)}" loading="lazy" />
          <div class="shop-info">
            <div class="shop-title-row">
              <h3 class="shop-name">${escapeHtml(s.name)}</h3>
              ${s.is_verified ? `<span class="badge badge-verified">${ICONS.check} معتمد</span>` : ''}
              ${s.plan === 'gold' ? `<span class="badge badge-gold">${ICONS.star(true)} مميز</span>` : ''}
            </div>
            <div class="shop-meta">
              ${escapeHtml(cat.icon)} ${escapeHtml(cat.name)} <span class="sep">•</span> ${ICONS.pin} ${escapeHtml(s.area_text)}
              ${s.dist != null ? ` <span class="sep">•</span> <b>يبعد ${formatDistance(s.dist)}</b>` : ''}
              ${!s.show_on_map ? ' (موقع خاص/متنقل)' : ''}
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:4px;">
              <span class="badge ${s.openInfo.cls}"><span class="dot"></span> ${escapeHtml(s.openInfo.label)}</span>
              ${s.revCount > 0 ? `<span class="shop-rating">${ICONS.star(true)} ${s.avgRating.toFixed(1)} (${s.revCount})</span>` : '<span class="no-rating">لا تقييمات بعد</span>'}
            </div>
            ${s.daily_offer ? `<div class="shop-offer">${ICONS.fire} ${escapeHtml(s.daily_offer)}</div>` : ''}
          </div>
        </div>
        <div class="shop-actions ${showDir ? '' : 'two-cols'}">
          <a class="action-btn action-call" href="tel:${cleanPhone(s.phone)}" onclick="trackMetric('${s.id}','click')">${ICONS.phone} اتصال</a>
          <a class="action-btn action-wa" target="_blank" rel="noopener" href="https://wa.me/${waNum}" onclick="trackMetric('${s.id}','click')">${ICONS.chat} واتساب</a>
          ${showDir ? `<button type="button" class="action-btn action-map" onclick="showRouteInApp('${s.id}')">${ICONS.pin} المسار</button>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

function trackMetric(shopId, metric) {
  sb.rpc('increment_shop_metric', { p_shop_id: shopId, p_metric: metric }).then(() => {});
}

function toggleFav(shopId) {
  const nowFav = !favorites.includes(shopId);
  if (!nowFav) favorites = favorites.filter(id => id !== shopId);
  else favorites.push(shopId);
  localStorage.setItem('yp_favs', JSON.stringify(favorites));
  openShopModal(shopId).then(() => {
    if (!nowFav) return;
    const btn = document.querySelector('#modal-shop-body button[onclick*="toggleFav"]');
    if (btn && btn.animate) {
      btn.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
        { duration: 280, easing: 'ease-out' }
      );
    }
  });
  renderShops();
}

// ===== نافذة التفاصيل والتقييمات =====
async function openShopModal(shopId) {
  const shop = allShops.find(s => s.id === shopId);
  if (!shop) return;
  trackMetric(shopId, 'view');

  const openInfo = getOpenStatus(shop);
  const showDir = mapEnabledSetting && shop.show_on_map && shop.lat && shop.lng;
  const waNum = formatWhatsApp(shop.whatsapp || shop.phone);
  const isFav = favorites.includes(shop.id);
  const isOwner = currentUser && currentUser.id === shop.owner_id;

  const modal = document.getElementById('modal-shop');
  const body = document.getElementById('modal-shop-body');
  modal.classList.remove('hidden');

  const { data: revs } = await sb.from('reviews')
    .select('*')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });

  const approvedRevs = (revs || []).filter(r => r.status === 'approved');
  const myRev = currentUser ? (revs || []).find(r => r.user_id === currentUser.id) : null;

  body.innerHTML = `
    <img src="${safeImageUrl(shop.image_url)}" style="width:100%;max-height:220px;object-fit:cover;border-radius:14px;margin-bottom:10px;" />
    <div class="shop-title-row">
      <h2 style="margin:0;">${escapeHtml(shop.name)}</h2>
      ${shop.is_verified ? `<span class="badge badge-verified">${ICONS.check} معتمد</span>` : ''}
      ${shop.plan === 'gold' ? `<span class="badge badge-gold">${ICONS.star(true)} مميز</span>` : ''}
    </div>
    <p style="margin:6px 0;font-size:0.88rem;color:var(--text-muted);display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
      ${ICONS.pin} ${escapeHtml(shop.area_text)} <span class="sep">•</span> <span class="badge ${openInfo.cls}">${escapeHtml(openInfo.label)}</span>
      <span class="sep">•</span> الدوام: ${shop.is_24h ? '٢٤ ساعة' : `${escapeHtml(shop.open_time?.slice(0,5) || '')} - ${escapeHtml(shop.close_time?.slice(0,5) || '')}`}
    </p>
    ${shop.daily_offer ? `<div class="shop-offer" style="margin-bottom:8px;">${ICONS.fire} ${escapeHtml(shop.daily_offer)}</div>` : ''}
    <p style="font-size:0.93rem;line-height:1.6;">${escapeHtml(shop.description || 'لا يوجد وصف إضافي.')}</p>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">
      <a class="btn btn-green btn-sm" href="tel:${cleanPhone(shop.phone)}" onclick="trackMetric('${shop.id}','click')">${ICONS.phone} اتصال مباشر</a>
      <a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="https://wa.me/${waNum}" onclick="trackMetric('${shop.id}','click')">${ICONS.chat} واتساب</a>
      ${showDir ? `<button type="button" class="btn btn-outline btn-sm" onclick="showRouteInApp('${shop.id}')">${ICONS.pin} المسار</button>` : ''}
      <button class="btn btn-outline btn-sm" onclick="toggleFav('${shop.id}')" style="${isFav ? 'color:var(--brand-red);' : ''}">${ICONS.heart(isFav)} ${isFav ? 'محفوظ بالمفضلة' : 'حفظ بالمفضلة'}</button>
    </div>

    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0;" />
    <h4 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">${ICONS.star(true)} تقييمات الزبائن (${approvedRevs.length})</h4>

    ${!currentUser ? `
      <div class="panel-card" style="background:#f9fafb;padding:10px;">
        لضمان حقيقية التقييمات، يرجى <button class="btn btn-primary btn-sm" onclick="closeShopModal();switchView('auth');">تسجيل الدخول</button> لإضافة تقييمك.
      </div>
    ` : isOwner ? `
      <div class="msg-box msg-ok">هذا مشروعك الخاص — يمكنك متابعة التقييمات والإبلاغ عن أي تقييم مزيف من هنا.</div>
    ` : myRev ? `
      <div class="msg-box msg-ok">شكراً! لقد قمت بتقييم هذا المشروع مسبقاً (${myRev.rating}/5 - الحالة: ${myRev.status === 'pending' ? 'قيد مراجعة الإدارة' : myRev.status === 'approved' ? 'منشور' : 'مرفوض'}).</div>
    ` : `
      <div class="panel-card" style="background:#f9fafb;padding:12px;">
        <div style="font-weight:700;font-size:0.86rem;">أضف تقييمك الحقيقي (مرة واحدة فقط):</div>
        <div class="star-select" id="rev-stars">
          ${[1,2,3,4,5].map(n => `<button type="button" class="star-btn active" onclick="setReviewStars(${n})">${ICONS.star(true).replace('ic-14','ic-22')}</button>`).join('')}
        </div>
        <input type="hidden" id="rev-rating-val" value="5" />
        <textarea id="rev-comment" class="form-control" rows="2" placeholder="اكتب تجربتك بكل أمانة..."></textarea>
        <button id="rev-submit-btn" class="btn btn-gold btn-sm" style="margin-top:8px;" onclick="submitReview('${shop.id}')">إرسال التقييم للمراجعة</button>
        <div id="rev-msg"></div>
      </div>
    `}

    <div>
      ${approvedRevs.length === 0 ? '<p style="color:var(--text-muted);font-size:0.85rem;">لا توجد تقييمات منشورة بعد.</p>' : approvedRevs.map(r => `
        <div class="review-item">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>${escapeHtml(r.reviewer_name)}</strong>
            <span style="color:var(--brand-gold);display:flex;gap:1px;">${ICONS.star(true).repeat(r.rating)}</span>
          </div>
          <p style="margin:4px 0;font-size:0.88rem;">${escapeHtml(r.comment || '')}</p>
          ${isOwner && !r.is_reported ? `<button class="btn btn-outline btn-sm" onclick="reportFakeReview('${r.id}','${shop.id}')">${ICONS.flag} إبلاغ الإدارة عن تقييم مزيف</button>` : ''}
          ${r.is_reported ? '<small style="color:var(--brand-red);">تم إرسال بلاغ للإدارة لفحص هذا التقييم</small>' : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function closeShopModal() {
  document.getElementById('modal-shop').classList.add('hidden');
}

function setReviewStars(n) {
  document.getElementById('rev-rating-val').value = n;
  document.querySelectorAll('#rev-stars .star-btn').forEach((b, idx) => {
    b.classList.toggle('active', idx < n);
  });
}

async function submitReview(shopId) {
  const rating = parseInt(document.getElementById('rev-rating-val').value, 10);
  const comment = document.getElementById('rev-comment').value.trim();
  const reviewerName = currentProfile?.full_name || currentUser.email.split('@')[0];

  const btn = document.getElementById('rev-submit-btn');
  const btnDefaultHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> جاري الإرسال...`; }

  const { error } = await sb.from('reviews').insert({
    shop_id: shopId,
    user_id: currentUser.id,
    reviewer_name: reviewerName,
    rating,
    comment
  });

  if (error) {
    if (btn) { btn.disabled = false; btn.innerHTML = btnDefaultHtml; }
    return showMsg('rev-msg', 'تعذر إرسال التقييم (ربما قيّمت سابقاً).', false);
  }
  showMsg('rev-msg', 'تم إرسال تقييمك! سيظهر بعد فحصه واعتماده من الإدارة.', true);
  setTimeout(() => openShopModal(shopId), 1200);
}

async function reportFakeReview(reviewId, shopId) {
  const reason = await showDialog({
    message: 'اكتب سبب الشك أو التزييف بإيجاز:',
    withInput: true,
    confirmText: 'إرسال البلاغ',
    placeholder: 'مثال: نفس الشخص يقيّم من أكثر من حساب',
  });
  if (!reason) return;
  await sb.rpc('report_review', { p_review_id: reviewId, p_reason: reason });
  showToast(`${ICONS.check} تم رفع البلاغ للإدارة لفحص حساب المقيّم.`, 'ok');
  openShopModal(shopId);
}

// ===== لوحة صاحب المشروع =====
async function renderOwnerSection() {
  const notLogged = document.getElementById('owner-not-logged');
  const content = document.getElementById('owner-content');
  if (!currentUser) {
    notLogged.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }
  notLogged.classList.add('hidden');
  content.classList.remove('hidden');

  const { data: myShops } = await sb.from('shops').select('*').eq('owner_id', currentUser.id).order('created_at', { ascending: false });
  const listEl = document.getElementById('owner-shops-list');

  if (!myShops || myShops.length === 0) {
    listEl.innerHTML = `<div class="panel-card" style="text-align:center;color:var(--text-muted);">لم تضف أي مشروع بعد — اضغط "+ إضافة مشروع جديد" بالأعلى.</div>`;
    return;
  }

  listEl.innerHTML = myShops.map(s => `
    <div class="panel-card" style="margin-bottom:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <span class="badge ${s.status === 'approved' ? 'badge-open' : s.status === 'pending' ? 'badge-pending' : 'badge-closed'}">
            ${s.status === 'approved' ? 'منشور' : s.status === 'pending' ? 'بانتظار موافقة الإدارة' : 'مرفوض'}
          </span>
          ${s.is_verified ? `<span class="badge badge-verified">${ICONS.check} معتمد</span>` : ''}
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted);display:flex;align-items:center;gap:10px;">
          <span style="display:flex;align-items:center;gap:4px;">${ICONS.eye} ${s.views_count} زيارة</span>
          <span style="display:flex;align-items:center;gap:4px;">${ICONS.tap} ${s.clicks_count} تواصل</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn btn-outline btn-sm" onclick='openOwnerForm(${JSON.stringify(s).replace(/'/g, "&#39;")})'>${ICONS.edit} تعديل الملف</button>
        <button class="btn btn-green btn-sm" onclick="quickManualStatus('${s.id}','open')"><span class="dot"></span> مفتوح</button>
        <button class="btn btn-gold btn-sm" onclick="quickManualStatus('${s.id}','duty')"><span class="dot"></span> خفارة</button>
        <button class="btn btn-red btn-sm" onclick="quickManualStatus('${s.id}','closed')"><span class="dot"></span> مغلق</button>
        <button class="btn btn-outline btn-sm" onclick="quickManualStatus('${s.id}','auto')">${ICONS.clock} تلقائي</button>
      </div>
    </div>
  `).join('');
}

async function quickManualStatus(shopId, statusVal) {
  await sb.from('shops').update({ manual_status: statusVal }).eq('id', shopId);
  await loadInitialData();
  await renderOwnerSection();
}

function openOwnerForm(shop = null) {
  document.getElementById('owner-form-card').classList.remove('hidden');
  document.getElementById('owner-form-msg').innerHTML = '';
  pendingCompressedBlob = null;

  document.getElementById('owner-form-title').textContent = shop ? `تعديل: ${shop.name}` : 'إضافة مشروع جديد';
  document.getElementById('shop-edit-id').value = shop ? shop.id : '';
  document.getElementById('f-name').value = shop ? shop.name : '';
  document.getElementById('f-category').value = shop ? shop.category_id : (categories[0]?.id || 1);
  document.getElementById('f-area').value = shop ? shop.area_text : 'اليوسفية';
  document.getElementById('f-phone').value = shop ? shop.phone : '';
  document.getElementById('f-whatsapp').value = shop ? (shop.whatsapp || '') : '';
  document.getElementById('f-desc').value = shop ? (shop.description || '') : '';
  document.getElementById('f-offer').value = shop ? (shop.daily_offer || '') : '';
  document.getElementById('f-open-time').value = shop?.open_time ? shop.open_time.slice(0, 5) : '08:00';
  document.getElementById('f-close-time').value = shop?.close_time ? shop.close_time.slice(0, 5) : '22:00';
  document.getElementById('f-is-24h').checked = shop ? !!shop.is_24h : false;
  document.getElementById('f-manual-status').value = shop ? shop.manual_status : 'auto';
  document.getElementById('f-show-map').checked = shop ? !!shop.show_on_map : true;
  document.getElementById('f-lat').value = shop?.lat || '';
  document.getElementById('f-lng').value = shop?.lng || '';
  document.getElementById('coords-label').innerHTML = shop?.lat ? `${ICONS.check} تم تحديد الإحداثيات` : 'المس الخريطة لتثبيت الدبوس';

  const prev = document.getElementById('f-image-preview');
  if (shop?.image_url) {
    prev.src = shop.image_url;
    prev.classList.remove('hidden');
  } else {
    prev.classList.add('hidden');
  }

  togglePickerMapVisibility();
  initPickerMap(shop?.lat, shop?.lng);
}

function closeOwnerForm() {
  document.getElementById('owner-form-card').classList.add('hidden');
}

function togglePickerMapVisibility() {
  const show = document.getElementById('f-show-map').checked;
  document.getElementById('picker-map-box').classList.toggle('hidden', !show);
  if (show && pickerMap) setTimeout(() => pickerMap.invalidateSize(), 200);
}

function initPickerMap(lat, lng) {
  const center = (lat && lng) ? [lat, lng] : YUSUFIYA_CENTER;
  if (!pickerMap) {
    pickerMap = L.map('picker-map').setView(center, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(pickerMap);
    pickerMap.on('click', (e) => setPickerPin(e.latlng.lat, e.latlng.lng));
  } else {
    pickerMap.setView(center, 14);
  }
  if (lat && lng) setPickerPin(lat, lng);
  else if (pickerMarker) { pickerMap.removeLayer(pickerMarker); pickerMarker = null; }
  setTimeout(() => pickerMap.invalidateSize(), 250);
}

function setPickerPin(lat, lng) {
  document.getElementById('f-lat').value = lat.toFixed(6);
  document.getElementById('f-lng').value = lng.toFixed(6);
  document.getElementById('coords-label').innerHTML = `${ICONS.check} تم تثبيت الموقع (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  if (pickerMarker) pickerMarker.setLatLng([lat, lng]);
  else pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
}

function pickCurrentGPS() {
  if (!navigator.geolocation) return showToast(`${ICONS.warn} المتصفح لا يدعم GPS`, 'err');
  document.getElementById('coords-label').textContent = 'جاري سحب الإحداثيات...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      pickerMap.setView([pos.coords.latitude, pos.coords.longitude], 16);
      setPickerPin(pos.coords.latitude, pos.coords.longitude);
    },
    () => showToast(`${ICONS.warn} تعذر تحديد موقعك. المس الخريطة يدوياً أو فعّل الـ GPS.`, 'err'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ضغط الصورة قبل الرفع
function previewShopImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 900;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        pendingCompressedBlob = blob;
        const prev = document.getElementById('f-image-preview');
        prev.src = URL.createObjectURL(blob);
        prev.classList.remove('hidden');
      }, 'image/jpeg', 0.78);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveShop() {
  const editId = document.getElementById('shop-edit-id').value;
  const name = document.getElementById('f-name').value.trim();
  const category_id = parseInt(document.getElementById('f-category').value, 10);
  const area_text = document.getElementById('f-area').value.trim() || 'اليوسفية';
  const phone = document.getElementById('f-phone').value.trim();
  const whatsapp = document.getElementById('f-whatsapp').value.trim() || phone;
  const description = document.getElementById('f-desc').value.trim();
  const daily_offer = document.getElementById('f-offer').value.trim();
  const open_time = document.getElementById('f-open-time').value;
  const close_time = document.getElementById('f-close-time').value;
  const is_24h = document.getElementById('f-is-24h').checked;
  const manual_status = document.getElementById('f-manual-status').value;
  const show_on_map = document.getElementById('f-show-map').checked;
  const lat = show_on_map ? parseFloat(document.getElementById('f-lat').value) || null : null;
  const lng = show_on_map ? parseFloat(document.getElementById('f-lng').value) || null : null;

  if (!name || !phone) return showMsg('owner-form-msg', 'يرجى كتابة اسم المشروع ورقم الهاتف.', false);
  if (show_on_map && (!lat || !lng)) return showMsg('owner-form-msg', 'حدد موقعك على الخريطة أو اختر إخفاء الموقع للعمل المنزلي/المتنقل.', false);

  const btn = document.getElementById('btn-save-shop');
  const btnDefaultHtml = btn.innerHTML;
  const btnSavingHtml = `${ICONS.clock} جاري الحفظ...`;
  btn.disabled = true;
  btn.innerHTML = btnSavingHtml;

  let image_url = undefined;
  if (pendingCompressedBlob) {
    const filePath = `${currentUser.id}/${Date.now()}.jpg`;
    const { error: upErr } = await sb.storage.from('shop-images').upload(filePath, pendingCompressedBlob, {
      contentType: 'image/jpeg'
    });
    if (upErr) {
      btn.disabled = false; btn.innerHTML = btnDefaultHtml;
      return showMsg('owner-form-msg', 'فشل رفع الصورة: ' + upErr.message, false);
    }
    image_url = sb.storage.from('shop-images').getPublicUrl(filePath).data.publicUrl;
  }

  const payload = {
    name, category_id, area_text, phone, whatsapp, description, daily_offer,
    open_time, close_time, is_24h, manual_status, show_on_map, lat, lng
  };
  if (image_url) payload.image_url = image_url;

  let res;
  if (editId) {
    res = await sb.from('shops').update(payload).eq('id', editId);
  } else {
    payload.owner_id = currentUser.id;
    res = await sb.from('shops').insert(payload);
  }

  btn.disabled = false;
  btn.innerHTML = btnDefaultHtml;
  if (res.error) return showMsg('owner-form-msg', 'حدث خطأ: ' + res.error.message, false);

  showMsg('owner-form-msg', editId ? 'تم تحديث بيانات المشروع بنجاح!' : 'تم إرسال مشروعك! سيظهر على الخريطة بعد موافقة الإدارة.', true);
  await loadInitialData();
  await renderOwnerSection();
  setTimeout(closeOwnerForm, 1200);
}

// ===== لوحة الإدارة السرية =====
async function loadAdminTab(tab, btnEl) {
  if (btnEl) {
    document.querySelectorAll('#admin-tabs .pill').forEach(p => p.classList.remove('active'));
    btnEl.classList.add('active');
  }
  const body = document.getElementById('admin-panel-body');
  body.innerHTML = '<div class="panel-card">جاري التحميل...</div>';

  if (tab === 'pending') {
    const { data } = await sb.from('shops').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (!data?.length) return body.innerHTML = '<div class="panel-card">لا توجد طلبات جديدة بانتظار الموافقة.</div>';
    body.innerHTML = data.map(s => `
      <div class="panel-card">
        <div style="display:flex;gap:10px;">
          <img src="${safeImageUrl(s.image_url)}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;" />
          <div>
            <strong>${escapeHtml(s.name)}</strong><br>
            <small style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px;">
              <span style="display:flex;align-items:center;gap:3px;">${ICONS.phone} ${escapeHtml(s.phone)}</span>
              <span class="sep">•</span>
              <span style="display:flex;align-items:center;gap:3px;">${ICONS.pin} ${escapeHtml(s.area_text)}</span>
              <span class="sep">•</span>
              ${s.show_on_map ? 'ظاهر على الخريطة' : 'موقع مخفي'}
            </small>
            <p style="margin:4px 0;font-size:0.83rem;">${escapeHtml(s.description || '')}</p>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-green btn-sm" onclick="adminUpdateShop('${s.id}', {status:'approved'})">${ICONS.check} موافقة ونشر</button>
          <button class="btn btn-red btn-sm" onclick="adminUpdateShop('${s.id}', {status:'rejected'})">رفض</button>
        </div>
      </div>
    `).join('');
  } else if (tab === 'shops') {
    const { data } = await sb.from('shops').select('*').order('created_at', { ascending: false });
    body.innerHTML = (data || []).map(s => `
      <div class="panel-card">
        <strong>${escapeHtml(s.name)}</strong>
        <span class="badge ${s.status==='approved'?'badge-open':'badge-closed'}">${escapeHtml(s.status)}</span>
        ${s.is_verified ? `<span class="badge badge-verified">${ICONS.check} معتمد</span>` : ''}
        ${s.plan === 'gold' ? `<span class="badge badge-gold">${ICONS.star(true)} ذهبي</span>` : ''}
        <div style="font-size:0.8rem;color:var(--text-muted);margin:5px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="display:flex;align-items:center;gap:3px;">${ICONS.eye} ${s.views_count}</span>
          <span style="display:flex;align-items:center;gap:3px;">${ICONS.tap} ${s.clicks_count}</span>
          <span style="display:flex;align-items:center;gap:3px;">${ICONS.phone} ${escapeHtml(s.phone)}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          <button class="btn btn-outline btn-sm" onclick="adminUpdateShop('${s.id}', {is_verified: ${!s.is_verified}})">${ICONS.check} ${s.is_verified ? 'إلغاء الاعتماد' : 'منح علامة معتمد'}</button>
          <button class="btn btn-gold btn-sm" onclick="adminUpdateShop('${s.id}', {plan: '${s.plan === 'gold' ? 'free' : 'gold'}'})">${ICONS.star(true)} ${s.plan === 'gold' ? 'إرجاع للمجاني' : 'ترقية لباقة ذهبية'}</button>
          <button class="btn btn-red btn-sm" onclick="adminDeleteShop('${s.id}')">${ICONS.trash} حذف</button>
        </div>
      </div>
    `).join('');
  } else if (tab === 'reviews') {
    const [revRes, profRes, shopRes] = await Promise.all([
      sb.from('reviews').select('*').order('created_at', { ascending: false }),
      sb.from('profiles').select('id, email, created_at'),
      sb.from('shops').select('id, name')
    ]);
    const profMap = Object.fromEntries((profRes.data || []).map(p => [p.id, p]));
    const shopMap = Object.fromEntries((shopRes.data || []).map(s => [s.id, s.name]));
    const revs = revRes.data || [];
    if (!revs.length) return body.innerHTML = '<div class="panel-card">لا توجد تقييمات بعد.</div>';

    body.innerHTML = revs.map(r => {
      const p = profMap[r.user_id] || {};
      const accDate = p.created_at ? new Date(p.created_at).toLocaleDateString('ar-IQ') : 'غير معروف';
      return `
        <div class="panel-card">
          <div style="display:flex;justify-content:space-between;">
            <strong>${escapeHtml(shopMap[r.shop_id] || 'مشروع')}</strong>
            <span style="color:var(--brand-gold);display:flex;gap:1px;">${ICONS.star(true).repeat(r.rating)}</span>
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin:4px 0;">
            المقيّم: ${escapeHtml(r.reviewer_name)} | الإيميل: <b>${escapeHtml(p.email || '')}</b> | تاريخ فتح الحساب: <b>${escapeHtml(accDate)}</b>
          </div>
          <p style="margin:6px 0;font-size:0.9rem;">${escapeHtml(r.comment || '')}</p>
          ${r.is_reported ? `<div class="msg-box msg-err">${ICONS.flag} بلاغ من صاحب المشروع: ${escapeHtml(r.report_reason || '')}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:8px;">
            ${r.status !== 'approved' ? `<button class="btn btn-green btn-sm" onclick="adminUpdateReview('${r.id}','approved')">${ICONS.check} اعتماد</button>` : ''}
            <button class="btn btn-red btn-sm" onclick="adminDeleteReview('${r.id}')">${ICONS.trash} رفض وحذف</button>
          </div>
        </div>
      `;
    }).join('');
  } else if (tab === 'requests') {
    const { data, error } = await sb.from('service_requests').select('*').order('created_at',{ascending:false}).limit(100);
    if (error) { body.innerHTML = '<div class="panel-card">نفّذ ملف SQL المرفق لتفعيل طلبات الخدمات.</div>'; return; }
    const statusLabels = {new:'جديد',reviewing:'قيد المتابعة',assigned:'تم توجيهه',completed:'مكتمل',cancelled:'ملغي'};
    body.innerHTML = (data||[]).map(r=>`<div class="panel-card"><div style="display:flex;justify-content:space-between;gap:8px;"><strong>${escapeHtml(r.category)}</strong><span class="request-status">${statusLabels[r.status]||r.status}</span></div><p style="font-size:.82rem;color:var(--text-muted);">${escapeHtml(r.area)} • ${escapeHtml(r.phone)}</p><p style="font-size:.85rem;">${escapeHtml(r.details)}</p><small style="color:var(--text-faint);">${new Date(r.created_at).toLocaleString('ar-IQ')}</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;"><button class="btn btn-outline btn-sm" onclick="adminSetRequestStatus('${r.id}','reviewing')">قيد المتابعة</button><button class="btn btn-green btn-sm" onclick="adminSetRequestStatus('${r.id}','assigned')">تم التوجيه</button><button class="btn btn-primary btn-sm" onclick="adminSetRequestStatus('${r.id}','completed')">مكتمل</button><button class="btn btn-red btn-sm" onclick="adminSetRequestStatus('${r.id}','cancelled')">إلغاء</button></div></div>`).join('') || '<div class="panel-card">لا توجد طلبات خدمة حتى الآن.</div>';
  } else if (tab === 'community') {
    const { data, error } = await sb.from('community_posts').select('*').order('created_at',{ascending:false}).limit(50);
    if (error) {
      body.innerHTML = `<div class="panel-card"><strong>ميزة نبض اليوسفية تحتاج تهيئة قاعدة البيانات</strong><p style="color:var(--text-muted);font-size:.85rem;">نفّذ ملف SQL المرفق مرة واحدة في Supabase ثم أعد فتح هذا القسم.</p></div>`;
      return;
    }
    body.innerHTML = `
      <div class="panel-card">
        <h4 style="margin:0 0 12px;">نشر تحديث محلي جديد</h4>
        <div class="form-group"><label for="cp-title">العنوان</label><input id="cp-title" class="form-control" maxlength="100" placeholder="مثال: انقطاع الماء في حي ..." /></div>
        <div class="form-group"><label for="cp-body">التفاصيل</label><textarea id="cp-body" class="form-control" rows="3" maxlength="1000" placeholder="اكتب التفاصيل بوضوح..."></textarea></div>
        <div class="form-group"><label for="cp-kind">نوع التحديث</label><select id="cp-kind" class="form-control"><option value="news">خبر محلي</option><option value="alert">تنبيه مهم</option><option value="offer">عرض تجاري</option></select></div>
        <div class="form-group"><label for="cp-area">المنطقة (اختياري)</label><input id="cp-area" class="form-control" maxlength="80" placeholder="مثال: مركز اليوسفية" /></div>
        <div class="form-group"><label for="cp-days">مدة الظهور</label><select id="cp-days" class="form-control"><option value="1">يوم واحد</option><option value="3" selected>3 أيام</option><option value="7">أسبوع</option><option value="30">شهر</option><option value="0">بدون انتهاء تلقائي</option></select></div>
        <button class="btn btn-primary btn-block" onclick="submitCommunityPost()">نشر التحديث</button>
      </div>
      <h4>التحديثات المنشورة (${(data||[]).length})</h4>
      ${(data||[]).map(post=>`<div class="panel-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><strong>${escapeHtml(post.title)}</strong><span class="badge ${post.kind==='alert'?'badge-closed':post.kind==='offer'?'badge-open':'badge-duty'}">${post.kind==='alert'?'تنبيه':post.kind==='offer'?'عرض':'خبر'}</span></div><p style="font-size:.82rem;color:var(--text-muted);">${escapeHtml(post.body)}</p><button class="btn btn-red btn-sm" onclick="adminDeleteCommunityPost('${post.id}')">حذف</button></div>`).join('') || '<div class="panel-card">لا توجد تحديثات منشورة بعد.</div>'}
    `;
  } else if (tab === 'settings') {
    body.innerHTML = `
      <div class="panel-card">
        <h4 style="margin-top:0;">التحكم العام بالخريطة</h4>
        <p style="font-size:0.86rem;color:var(--text-muted);">إذا احتجت لأي سبب إخفاء الخريطة التفاعلية من الموقع بالكامل وتحويله لقائمة بطاقات فقط:</p>
        <button class="btn ${mapEnabledSetting ? 'btn-red' : 'btn-green'}" onclick="toggleGlobalMap()">
          ${mapEnabledSetting ? 'إخفاء الخريطة من الموقع كله' : `${ICONS.pin} تفعيل وإظهار الخريطة بالموقع`}
        </button>
      </div>
    `;
  }
}

async function adminSetRequestStatus(id,status) {
  const { error } = await sb.from('service_requests').update({status}).eq('id',id);
  if (error) return showToast('تعذر تحديث الطلب: '+error.message,'err');
  loadAdminTab('requests');
}

async function adminUpdateShop(id, changes) {
  await sb.from('shops').update(changes).eq('id', id);
  await loadInitialData();
  loadAdminTab(changes.status ? 'pending' : 'shops');
}

async function adminDeleteShop(id) {
  const ok = await showDialog({
    message: 'هل أنت متأكد من حذف هذا المشروع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
    confirmText: 'حذف نهائياً',
  });
  if (!ok) return;
  await sb.from('shops').delete().eq('id', id);
  await loadInitialData();
  loadAdminTab('shops');
  showToast(`${ICONS.check} تم حذف المشروع.`, 'ok');
}

async function adminUpdateReview(id, status) {
  await sb.from('reviews').update({ status, is_reported: false }).eq('id', id);
  await loadInitialData();
  loadAdminTab('reviews');
}

async function adminDeleteReview(id) {
  await sb.from('reviews').delete().eq('id', id);
  await loadInitialData();
  loadAdminTab('reviews');
}

async function toggleGlobalMap() {
  const nextVal = !mapEnabledSetting;
  await sb.from('app_settings').upsert({ key: 'map_enabled', value: nextVal });
  await loadInitialData();
  loadAdminTab('settings');
}