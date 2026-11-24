// js/filters.js — تصنيفات الأقسام، الفلاتر السريعة، وتحديد موقع المستخدم.
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

