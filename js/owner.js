// js/owner.js — لوحة صاحب المشروع: إضافة/تعديل المشروع، رفع الصورة، تثبيت الموقع.
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

  ownerShopsCache = Object.fromEntries(myShops.map(s => [s.id, s]));
  listEl.innerHTML = myShops.map(s => {
    const views = Number(s.views_count) || 0;
    const clicks = Number(s.clicks_count) || 0;
    const openNow = getOpenStatus(s);
    const rev = reviewsSummary[s.id];
    const rating = rev ? (rev.sum / rev.count).toFixed(1) : '—';
    const revCount = rev ? rev.count : 0;
    return `
    <div class="panel-card" style="margin-bottom:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <span class="badge ${s.status === 'approved' ? 'badge-open' : s.status === 'pending' ? 'badge-pending' : 'badge-closed'}">
            ${s.status === 'approved' ? 'منشور' : s.status === 'pending' ? 'بانتظار موافقة الإدارة' : 'مرفوض'}
          </span>
          ${s.is_verified ? `<span class="badge badge-verified">${ICONS.check} معتمد</span>` : ''}
        </div>
      </div>
      <div class="stat-grid" aria-label="إحصائيات المشروع">
        <div class="stat-tile"><span class="stat-ic">${ICONS.eye}</span><b>${views.toLocaleString('ar-IQ')}</b><small>زيارة</small></div>
        <div class="stat-tile"><span class="stat-ic">${ICONS.tap}</span><b>${clicks.toLocaleString('ar-IQ')}</b><small>تواصل</small></div>
        <div class="stat-tile"><span class="stat-ic">${ICONS.clock}</span><b style="font-size:.95rem">${escapeHtml(openNow.label)}</b><small>الحالة الحالية</small></div>
        <div class="stat-tile"><span class="stat-ic">${ICONS.star(true)}</span><b>${rating}</b><small>${revCount ? revCount.toLocaleString('ar-IQ') + ' تقييم' : 'لا تقييمات'}</small></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn btn-outline btn-sm" ${act('openOwnerFormById', s.id)}>${ICONS.edit} تعديل الملف</button>
        <button class="btn btn-green btn-sm" ${act('quickManualStatus', s.id, 'open')}><span class="dot"></span> مفتوح</button>
        <button class="btn btn-gold btn-sm" ${act('quickManualStatus', s.id, 'duty')}><span class="dot"></span> خفارة</button>
        <button class="btn btn-red btn-sm" ${act('quickManualStatus', s.id, 'closed')}><span class="dot"></span> مغلق</button>
        <button class="btn btn-outline btn-sm" ${act('quickManualStatus', s.id, 'auto')}>${ICONS.clock} تلقائي</button>
      </div>
    </div>
  `;
  }).join('');
}

function openOwnerFormById(shopId) {
  const shop = ownerShopsCache[shopId];
  if (shop) openOwnerForm(shop);
}

async function quickManualStatus(shopId, statusVal) {
  if (!['open', 'duty', 'closed', 'auto'].includes(statusVal)) return;
  const { error } = await sb.from('shops').update({ manual_status: statusVal }).eq('id', shopId);
  if (error) return showToast('تعذر تحديث حالة الدوام: ' + error.message, 'err', 4500);
  await loadInitialData();
  await renderOwnerSection();
  showToast('تم تحديث حالة الدوام.', 'ok');
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
    makeTiles().addTo(pickerMap);
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
  else pickerMarker = L.marker([lat, lng], { icon: shopPin({ plan: 'gold' }, {}) }).addTo(pickerMap);
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
  if (!/^image\//.test(file.type)) return showToast('اختر ملف صورة فقط.', 'err');
  if (file.size > 12 * 1024 * 1024) return showToast('الصورة كبيرة جداً (الحد 12 ميغابايت).', 'err');
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
        if (prev.dataset.blobUrl) URL.revokeObjectURL(prev.dataset.blobUrl);
        prev.dataset.blobUrl = URL.createObjectURL(blob);
        prev.src = prev.dataset.blobUrl;
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
  if (cleanPhone(phone).replace(/\D/g, '').length < 8) return showMsg('owner-form-msg', 'رقم الهاتف غير صحيح.', false);
  if (name.length > 100 || description.length > 1000 || daily_offer.length > 200) return showMsg('owner-form-msg', 'أحد الحقول أطول من المسموح.', false);
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

