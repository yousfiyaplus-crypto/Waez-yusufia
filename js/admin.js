// js/admin.js — لوحة الإدارة: الموافقات، إدارة المشاريع والتقييمات والطلبات والإعدادات.
async function loadAdminTab(tab, btnEl) {
  if (btnEl) {
    document.querySelectorAll('#admin-tabs .pill').forEach(p => p.classList.remove('active'));
    btnEl.classList.add('active');
  }
  const body = document.getElementById('admin-panel-body');
  body.innerHTML = skeletonCards(3);

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
          <button class="btn btn-green btn-sm" ${act('adminUpdateShop', s.id, {status:'approved'})}>${ICONS.check} موافقة ونشر</button>
          <button class="btn btn-red btn-sm" ${act('adminUpdateShop', s.id, {status:'rejected'})}>رفض</button>
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
          <button class="btn btn-outline btn-sm" ${act('adminUpdateShop', s.id, {is_verified: !s.is_verified})}>${ICONS.check} ${s.is_verified ? 'إلغاء الاعتماد' : 'منح علامة معتمد'}</button>
          <button class="btn btn-gold btn-sm" ${act('adminUpdateShop', s.id, {plan: s.plan === 'gold' ? 'free' : 'gold'})}>${ICONS.star(true)} ${s.plan === 'gold' ? 'إرجاع للمجاني' : 'ترقية لباقة ذهبية'}</button>
          <button class="btn btn-red btn-sm" ${act('adminDeleteShop', s.id)}>${ICONS.trash} حذف</button>
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
            ${r.status !== 'approved' ? `<button class="btn btn-green btn-sm" ${act('adminUpdateReview', r.id, 'approved')}>${ICONS.check} اعتماد</button>` : ''}
            <button class="btn btn-red btn-sm" ${act('adminDeleteReview', r.id)}>${ICONS.trash} رفض وحذف</button>
          </div>
        </div>
      `;
    }).join('');
  } else if (tab === 'requests') {
    const { data, error } = await sb.from('service_requests').select('*').order('created_at',{ascending:false}).limit(100);
    if (error) { body.innerHTML = '<div class="panel-card">نفّذ ملف SQL المرفق لتفعيل طلبات الخدمات.</div>'; return; }
    const statusLabels = {new:'جديد',reviewing:'قيد المتابعة',assigned:'تم توجيهه',completed:'مكتمل',cancelled:'ملغي'};
    body.innerHTML = (data||[]).map(r=>{
      const waPhone = formatWhatsApp(r.phone);
      const waMessage = encodeURIComponent(`مرحباً، نتواصل معك بخصوص طلبك في ويز اليوسفية: ${r.category} - ${r.area}.`);
      const waLink = /^9647\d{9}$/.test(waPhone) ? `https://wa.me/${waPhone}?text=${waMessage}` : '';
      const providerPhone = formatWhatsApp(r.assigned_provider_phone);
      const providerLink = /^9647\d{9}$/.test(providerPhone) ? `https://wa.me/${providerPhone}?text=${encodeURIComponent(`مرحباً، معك إدارة ويز اليوسفية. لدينا طلب ${r.category} في ${r.area}. هل يمكنك استلامه؟`)}` : '';
      return `<div class="panel-card"><div style="display:flex;justify-content:space-between;gap:8px;"><strong>${escapeHtml(r.category)}</strong><span class="request-status">${statusLabels[r.status]||r.status}</span></div><p style="font-size:.82rem;color:var(--text-muted);">${escapeHtml(r.area)} • ${escapeHtml(r.phone)}</p><p style="font-size:.85rem;">${escapeHtml(r.details)}</p><small style="color:var(--text-faint);">${new Date(r.created_at).toLocaleString('ar-IQ')}</small><div class="form-group" style="margin-top:12px;"><label>اسم مقدم الخدمة الذي اخترته</label><input id="provider-name-${r.id}" class="form-control" maxlength="100" value="${escapeHtml(r.assigned_provider_name||'')}" placeholder="اسم الشخص أو الجهة" /></div><div class="form-group"><label>رقم مقدم الخدمة</label><input id="provider-phone-${r.id}" class="form-control" type="tel" maxlength="20" value="${escapeHtml(r.assigned_provider_phone||'')}" placeholder="07xxxxxxxxx" /></div><div class="form-group"><label>ملاحظة للمستخدم (اختياري)</label><input id="provider-notes-${r.id}" class="form-control" maxlength="250" value="${escapeHtml(r.assignment_notes||'')}" placeholder="مثلاً: سيتواصل معك خلال نصف ساعة" /></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">${waLink ? `<a class="btn btn-outline btn-sm" href="${waLink}" target="_blank" rel="noopener noreferrer">مراسلة صاحب الطلب</a>` : '<span class="request-status">تحقق من رقم صاحب الطلب</span>'}${providerLink ? `<a class="btn btn-green btn-sm" href="${providerLink}" target="_blank" rel="noopener noreferrer">مراسلة مقدم الخدمة</a>` : ''}<button class="btn btn-green btn-sm" ${act('adminAssignServiceProvider', r.id)}>حفظ التوجيه وإبلاغ المستخدم</button><button class="btn btn-outline btn-sm" ${act('adminSetRequestStatus', r.id, 'reviewing')}>قيد المتابعة</button><button class="btn btn-primary btn-sm" ${act('adminSetRequestStatus', r.id, 'completed')}>مكتمل</button><button class="btn btn-red btn-sm" ${act('adminSetRequestStatus', r.id, 'cancelled')}>إلغاء</button></div></div>`;
    }).join('') || '<div class="panel-card">لا توجد طلبات خدمة حتى الآن.</div>';
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
        <div class="form-group"><label for="cp-kind">نوع التحديث</label><select id="cp-kind" class="form-control"><option value="news">خبر محلي — بطاقة بيضاء</option><option value="alert">تنبيه مهم — بطاقة حمراء</option><option value="offer">عرض تجاري — بطاقة خضراء</option></select><small style="display:block;color:var(--text-muted);margin-top:5px;">لون البطاقة يتغير تلقائياً حسب النوع الذي تختاره.</small></div>
        <div class="form-group"><label for="cp-area">المنطقة (اختياري)</label><input id="cp-area" class="form-control" maxlength="80" placeholder="مثال: مركز اليوسفية" /></div>
        <div class="form-group"><label for="cp-days">مدة الظهور</label><select id="cp-days" class="form-control"><option value="1">يوم واحد</option><option value="3" selected>3 أيام</option><option value="7">أسبوع</option><option value="30">شهر</option><option value="0">بدون انتهاء تلقائي</option></select></div>
        <button class="btn btn-primary btn-block" ${act('submitCommunityPost')}>نشر التحديث</button>
      </div>
      <h4>التحديثات المنشورة (${(data||[]).length})</h4>
      ${(data||[]).map(post=>`<div class="panel-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><strong>${escapeHtml(post.title)}</strong><span class="badge ${post.kind==='alert'?'badge-closed':post.kind==='offer'?'badge-open':'badge-duty'}">${post.kind==='alert'?'تنبيه':post.kind==='offer'?'عرض':'خبر'}</span></div><p style="font-size:.82rem;color:var(--text-muted);">${escapeHtml(post.body)}</p><button class="btn btn-red btn-sm" ${act('adminDeleteCommunityPost', post.id)}>حذف</button></div>`).join('') || '<div class="panel-card">لا توجد تحديثات منشورة بعد.</div>'}
    `;
  } else if (tab === 'settings') {
    body.innerHTML = `
      <div class="panel-card">
        <h4 style="margin-top:0;">التحكم العام بالخريطة</h4>
        <p style="font-size:0.86rem;color:var(--text-muted);">إذا احتجت لأي سبب إخفاء الخريطة التفاعلية من الموقع بالكامل وتحويله لقائمة بطاقات فقط:</p>
        <button class="btn ${mapEnabledSetting ? 'btn-red' : 'btn-green'}" ${act('toggleGlobalMap')}>
          ${mapEnabledSetting ? 'إخفاء الخريطة من الموقع كله' : `${ICONS.pin} تفعيل وإظهار الخريطة بالموقع`}
        </button>
      </div>
    `;
  }
}

async function adminAssignServiceProvider(id) {
  const name = document.getElementById(`provider-name-${id}`)?.value.trim() || '';
  const phone = cleanPhone(document.getElementById(`provider-phone-${id}`)?.value || '');
  const notes = document.getElementById(`provider-notes-${id}`)?.value.trim() || '';
  if (name.length < 2 || phone.replace(/\D/g, '').length < 10) {
    return showToast('اكتب اسم مقدم الخدمة ورقم هاتف صحيح قبل حفظ التوجيه.','err');
  }
  const { error } = await sb.from('service_requests').update({
    assigned_provider_name: name,
    assigned_provider_phone: phone,
    assignment_notes: notes || null,
    status: 'assigned',
    updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) return showToast('تعذر حفظ التوجيه. تأكد من تنفيذ تحديث قاعدة البيانات: ' + error.message,'err');
  showToast('تم حفظ مقدم الخدمة وتحديث حالة الطلب.','ok');
  await loadAdminTab('requests');
}

async function adminSetRequestStatus(id,status) {
  const { error } = await sb.from('service_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if (error) return showToast('تعذر تحديث الطلب: '+error.message,'err');
  loadAdminTab('requests');
}

async function adminUpdateShop(id, changes) {
  const allowed = ['status', 'is_verified', 'plan'];
  const safe = Object.fromEntries(Object.entries(changes || {}).filter(([k]) => allowed.includes(k)));
  const { error } = await sb.from('shops').update(safe).eq('id', id);
  if (error) return showToast('تعذر تنفيذ العملية: ' + error.message, 'err', 4500);
  await loadInitialData();
  loadAdminTab(changes.status ? 'pending' : 'shops');
}

async function adminDeleteShop(id) {
  const ok = await showDialog({
    message: 'هل أنت متأكد من حذف هذا المشروع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
    confirmText: 'حذف نهائياً',
  });
  if (!ok) return;
  const { error } = await sb.from('shops').delete().eq('id', id);
  if (error) return showToast('تعذر الحذف: ' + error.message, 'err', 4500);
  await loadInitialData();
  loadAdminTab('shops');
  showToast(`${ICONS.check} تم حذف المشروع.`, 'ok');
}

async function adminUpdateReview(id, status) {
  const { error } = await sb.from('reviews').update({ status, is_reported: false }).eq('id', id);
  if (error) return showToast('تعذر تحديث التقييم: ' + error.message, 'err', 4500);
  await loadInitialData();
  loadAdminTab('reviews');
}

async function adminDeleteReview(id) {
  const ok = await showDialog({ message: 'حذف هذا التقييم نهائياً؟', confirmText: 'حذف التقييم' });
  if (!ok) return;
  const { error } = await sb.from('reviews').delete().eq('id', id);
  if (error) return showToast('تعذر حذف التقييم: ' + error.message, 'err', 4500);
  await loadInitialData();
  loadAdminTab('reviews');
}

async function toggleGlobalMap() {
  const nextVal = !mapEnabledSetting;
  const { error } = await sb.from('app_settings').upsert({ key: 'map_enabled', value: nextVal });
  if (error) return showToast('تعذر حفظ الإعداد: ' + error.message, 'err', 4500);
  await loadInitialData();
  loadAdminTab('settings');
}

