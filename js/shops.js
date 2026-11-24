// js/shops.js — عرض قائمة المشاريع (بطاقات + دبابيس الخريطة) والمفضلة.
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

