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
  updateDailyHub();
  await refreshNotificationBadge();
  if (currentUser) subscribeToNotifications();
  applyRouteFromHash();

  sb.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    await loadCurrentProfile();
    updateAuthUI();
    if (activityRealtimeChannel) { sb.removeChannel(activityRealtimeChannel); activityRealtimeChannel = null; }
    await refreshNotificationBadge();
    if (currentUser) subscribeToNotifications();
    if (_event === 'PASSWORD_RECOVERY') {
      switchView('auth');
      showResetPasswordBox();
    }
  });
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  document.getElementById('install-pwa-btn').classList.add('hidden');
}

// ===== بوابة ويز اليومية =====
function scrollToPulse() {
  const pulse = document.getElementById('community-pulse');
  if (pulse && !pulse.classList.contains('hidden')) pulse.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else showToast('ماكو تحديثات محلية منشورة حالياً.', 'info');
}

function focusDirectory() {
  document.getElementById('search-input')?.focus();
  document.getElementById('search-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateDailyHub() {
  const greeting = document.getElementById('daily-greeting');
  if (!greeting) return;
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'صباح الخير، شنو نكتشف اليوم؟' : hour < 18 ? 'نهارك سعيد، شنو تحتاج اليوم؟' : 'مساء الخير، شنو جديد اليوسفية؟';
  greeting.textContent = currentProfile?.full_name ? `هلا ${currentProfile.full_name.split(' ')[0]}، ${timeGreeting}` : timeGreeting;
}

// ===== التنقل =====
function switchView(viewName) {
  ['home', 'request', 'owner', 'admin', 'auth', 'activity'].forEach(v => {
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
  } else if (viewName === 'activity') {
    loadActivityCenter();
  } else if (viewName === 'request') {
    renderServiceRequestView();
  } else if (viewName === 'owner') {
    renderOwnerSection();
  } else if (viewName === 'admin' && currentProfile?.role === 'admin') {
    loadAdminTab('pending', document.querySelector('#admin-tabs .pill'));
  }
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

