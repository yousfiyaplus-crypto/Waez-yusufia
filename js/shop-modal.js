// js/shop-modal.js — نافذة تفاصيل المشروع، التقييمات، والإبلاغ عن تقييم مزيف.
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
  setShopHash(shop.id);
  injectShopJsonLd(shop);

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
  clearShopHash();
  clearShopJsonLd();
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

