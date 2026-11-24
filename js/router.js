// ===== توجيه الروابط العميقة للمشاريع (Hash Routing) =====
// الهدف: يفتح رابط مثل index.html#shop-<id> تفاصيل المشروع مباشرة،
// ويضيف بيانات JSON-LD (LocalBusiness) عند فتح أي مشروع لتحسين فرصة
// ظهوره ضمن نتائج البحث المحلي (SEO)، دون المساس بسلوك التطبيق الحالي.

function setShopHash(shopId) {
  const target = `#shop-${encodeURIComponent(shopId)}`;
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', target);
  } else {
    window.location.hash = target;
  }
}

function clearShopHash() {
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } else {
    window.location.hash = '';
  }
}

function applyRouteFromHash() {
  const match = (window.location.hash || '').match(/^#shop-(.+)$/);
  if (!match || !match[1]) return;
  const shopId = decodeURIComponent(match[1]);
  if (allShops.some(s => s.id === shopId)) {
    switchView('home');
    openShopModal(shopId);
  }
}

function injectShopJsonLd(shop) {
  const el = document.getElementById('shop-jsonld');
  if (!el) return;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: shop.name,
  };
  if (shop.description) data.description = shop.description;
  if (shop.phone) data.telephone = shop.phone;
  if (shop.image_url) data.image = shop.image_url;
  data.address = {
    '@type': 'PostalAddress',
    addressLocality: shop.area_text || 'اليوسفية',
    addressRegion: 'بغداد',
    addressCountry: 'IQ',
  };
  if (shop.lat && shop.lng) {
    data.geo = { '@type': 'GeoCoordinates', latitude: shop.lat, longitude: shop.lng };
  }
  el.textContent = JSON.stringify(data);
}

function clearShopJsonLd() {
  const el = document.getElementById('shop-jsonld');
  if (el) el.textContent = '';
}

window.addEventListener('hashchange', applyRouteFromHash);
