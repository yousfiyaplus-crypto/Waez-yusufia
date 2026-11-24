// js/map.js — تهيئة خريطة Leaflet الرئيسية ورسم المسارات.
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

