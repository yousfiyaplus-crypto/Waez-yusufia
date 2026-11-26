// js/actions.js — ربط الأحداث بدون أي inline handlers (متوافق مع Content-Security-Policy الصارمة).
//
// بدل onclick="fn(...)" نستخدم:
//   data-action="اسم_الدالة"  data-args='["قيمة", 1]'   ← عند الضغط
//   data-input="اسم_الدالة"                              ← عند الكتابة
//   data-change="اسم_الدالة"                             ← عند تغيير القيمة
// الدوال المسموح استدعاؤها محصورة في القائمة البيضاء أدناه (لا نستدعي أي دالة عامة بالاسم).
// القيمة الخاصة "$el" داخل data-args تُستبدل بالعنصر نفسه.

const ACTIONS = {
  // التنقل والواجهة العامة
  switchView, installPWA, retryLoad, scrollToPulse, focusDirectory, startSearch,
  // الدليل والبحث والفلاتر
  clearSearch, clearAllFilters, selectCategory, toggleQuickFilter, requestUserLocation,
  setSortMode, setResultsView, setCommunityFilter, loadCommunityPosts,
  // الخريطة
  fitMapToShops, toggleMapStyle, toggleMapFullscreen, clearRoute, hideMapPreview, showRouteInApp,
  // المشاريع
  openShopModal, closeShopModal, modalBackdrop, goToAuthFromModal, toggleFav, shareShop, trackMetric,
  setReviewStars, submitReview, reportFakeReview,
  // الحساب
  setAuthMode, submitAuth, logout, toggleForgotPassword, requestPasswordReset, submitNewPassword,
  // الطلبات والإشعارات
  submitServiceRequest, markNotificationRead, markAllNotificationsRead, enableBrowserNotifications,
  // صاحب المشروع
  openOwnerForm, openOwnerFormById, closeOwnerForm, saveShop, quickManualStatus, pickCurrentGPS,
  togglePickerMapVisibility, previewShopImage,
  // الإدارة
  loadAdminTab, adminUpdateShop, adminDeleteShop, adminUpdateReview, adminDeleteReview,
  adminAssignServiceProvider, adminSetRequestStatus, submitCommunityPost, adminDeleteCommunityPost,
  toggleGlobalMap,
  // الإدخال
  onSearchInput,
};

function act(name, ...args) {
  const attr = `data-action="${escapeHtml(name)}"`;
  return args.length ? `${attr} data-args="${escapeHtml(JSON.stringify(args))}"` : attr;
}

function parseActionArgs(el) {
  const raw = el.getAttribute('data-args');
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(a => (a === '$el' ? el : a)) : [];
  } catch (_) { return []; }
}

function runAction(name, args) {
  const fn = Object.prototype.hasOwnProperty.call(ACTIONS, name) ? ACTIONS[name] : null;
  if (typeof fn !== 'function') { console.warn('Unknown action:', name); return; }
  try {
    const result = fn(...args);
    if (result && typeof result.catch === 'function') result.catch(err => console.error(`[${name}]`, err));
  } catch (err) { console.error(`[${name}]`, err); }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const name = el.getAttribute('data-action');
  const args = parseActionArgs(el);
  if (name === 'modalBackdrop') {          // إغلاق النافذة عند الضغط على الخلفية فقط
    if (e.target === el) runAction(args[0] || 'closeShopModal', []);
    return;
  }
  runAction(name, args);
});

['input', 'change'].forEach(type => {
  document.addEventListener(type, (e) => {
    const el = e.target.closest(`[data-${type}]`);
    if (el) runAction(el.getAttribute(`data-${type}`), [e]);
  });
});

// بديل onerror inline: إخفاء الصورة إن تعذر تحميلها.
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && t.hasAttribute('data-hide-on-error')) t.style.display = 'none';
}, true);

// أفعال صغيرة كانت مكتوبة inline سابقاً
function modalBackdrop() {}
function startSearch() {
  document.getElementById('search-input')?.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function goToAuthFromModal() { closeShopModal(); switchView('auth'); }
