// js/map.js — خريطة ويز: طبقة داكنة، دبابيس SVG حسب القسم، تجميع، بطاقة معاينة، ومسار.
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
let meLayer = null, mapStyle = 'dark', mapShopIndex = {}, mapFitPending = true;

// طبقة OpenStreetMap (بلا مفتاح API). النمط الليلي يتم بفلتر CSS على الطبقة فقط، فلا تتأثر الدبابيس.
function makeTiles() {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: TILE_ATTR, subdomains: 'abc', maxZoom: 19 });
}
function applyMapTheme() {
  document.getElementById('main-map')?.classList.toggle('map-dark', mapStyle === 'dark');
  document.getElementById('tool-style')?.classList.toggle('on', mapStyle === 'light');
}

function initMainMap() {
  try { if (localStorage.getItem('yp_map_style') === 'light') mapStyle = 'light'; } catch (_) {}
  mainMap = L.map('main-map').setView(YUSUFIYA_CENTER, 14);
  makeTiles().addTo(mainMap);
  mainMarkersLayer = (L.markerClusterGroup
    ? L.markerClusterGroup({
        showCoverageOnHover: false, maxClusterRadius: 46,
        iconCreateFunction: c => L.divIcon({ className: 'yp-cluster-wrap', iconSize: [42, 42], html: `<div class="yp-cluster">${c.getChildCount()}</div>` }),
      })
    : L.layerGroup()).addTo(mainMap);
  meLayer = L.layerGroup().addTo(mainMap);
  routeLayer = L.layerGroup().addTo(mainMap);
  mainMap.on('click', hideMapPreview);
  applyMapTheme();
}

function toggleMapStyle() {
  mapStyle = mapStyle === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('yp_map_style', mapStyle); } catch (_) {}
  applyMapTheme();
}

function fitMapToShops() {
  const pts = Object.values(mapShopIndex).filter(s => s.show_on_map && s.lat && s.lng).map(s => [s.lat, s.lng]);
  if (pts.length) mainMap.fitBounds(pts, { padding: [44, 44], maxZoom: 16 });
  else mainMap.setView(YUSUFIYA_CENTER, 14);
}

// بطاقة معاينة تظهر فوق الخريطة عند لمس أي دبوس
function showMapPreview(id, marker) {
  const s = mapShopIndex[id];
  const el = document.getElementById('map-preview');
  if (!s || !el) return;
  const cat = categories.find(c => c.id === s.category_id) || {};
  document.querySelectorAll('.yp-pin.sel').forEach(n => n.classList.remove('sel'));
  marker?._icon?.querySelector('.yp-pin')?.classList.add('sel');
  el.innerHTML = `
    <img src="${safeImageUrl(s.image_url)}" alt="" />
    <div class="mp-body">
      <strong>${escapeHtml(s.name)}</strong>
      <span class="mp-meta">${catIcon(cat, 13)} ${escapeHtml(cat.name || '')}${s.dist != null ? ` <span class="sep">•</span> ${formatDistance(s.dist)}` : ''}</span>
      <span class="badge ${s.openInfo.cls}"><span class="dot"></span> ${escapeHtml(s.openInfo.label)}</span>
    </div>
    <div class="mp-actions">
      <button type="button" class="btn btn-gold btn-sm" ${act('openShopModal', s.id)}>التفاصيل</button>
      <button type="button" class="mp-ic" ${act('showRouteInApp', s.id)} aria-label="المسار">${ico('route', 17)}</button>
      <a class="mp-ic" href="tel:${cleanPhone(s.phone)}" ${act('trackMetric', s.id, 'click')} aria-label="اتصال">${ico('phone', 17)}</a>
    </div>
    <button type="button" class="mp-x" ${act('hideMapPreview')} aria-label="إغلاق">${ico('x', 14)}</button>`;
  el.classList.remove('hidden');
}

function hideMapPreview() {
  document.getElementById('map-preview')?.classList.add('hidden');
  document.querySelectorAll('.yp-pin.sel').forEach(n => n.classList.remove('sel'));
}

async function showRouteInApp(shopId) {
  const shop = allShops.find(s => s.id === shopId);
  if (!shop || !shop.lat || !shop.lng) return;
  trackMetric(shopId, 'click');
  closeShopModal();
  hideMapPreview();
  switchView('home');

  const mapWrap = document.getElementById('map-wrapper');
  mapWrap.classList.remove('hidden');
  mapWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const routeBar = document.getElementById('route-bar');
  const routeText = document.getElementById('route-info-text');
  const extBtn = document.getElementById('route-ext-btn');
  extBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`;
  routeBar.classList.remove('hidden');
  const cat = categories.find(c => c.id === shop.category_id);
  const destPin = () => L.marker([shop.lat, shop.lng], { icon: shopPin({ ...shop, openInfo: getOpenStatus(shop) }, cat), interactive: false });

  const drawWithUser = async (coords) => {
    if (routeLayer) routeLayer.clearLayers();
    routeText.textContent = `جاري رسم المسار إلى ${shop.name}...`;
    L.marker([coords.lat, coords.lng], { icon: meIcon(), interactive: false }).addTo(routeLayer);
    destPin().addTo(routeLayer);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${coords.lng},${coords.lat};${shop.lng},${shop.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length) {
        const r = data.routes[0];
        L.geoJSON(r.geometry, { style: { color: '#0d0f14', weight: 10, opacity: 0.55 } }).addTo(routeLayer);
        const line = L.geoJSON(r.geometry, { style: { color: '#f5b800', weight: 5, opacity: 1 } }).addTo(routeLayer);
        mainMap.fitBounds(line.getBounds(), { padding: [45, 45] });
        const km = (r.distance / 1000).toFixed(1);
        const mins = Math.max(1, Math.round(r.duration / 60));
        routeText.textContent = `إلى ${shop.name}: ${km} كم (~${mins} دقيقة)`;
        return;
      }
    } catch (_) {}

    const fallbackLine = L.polyline([[coords.lat, coords.lng], [shop.lat, shop.lng]], {
      color: '#f5b800', weight: 4, dashArray: '8, 8'
    }).addTo(routeLayer);
    mainMap.fitBounds(fallbackLine.getBounds(), { padding: [45, 45] });
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
        destPin().addTo(routeLayer);
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
  const btn = document.getElementById('tool-full');
  if (btn) btn.innerHTML = ico(opened ? 'shrink' : 'expand', 19);
  if (mainMap) setTimeout(() => mainMap.invalidateSize(), 220);
}
