// js/requests.js — عرض وإرسال طلبات الخدمة من المستخدمين.
async function renderServiceRequestView() {
  const wrap = document.getElementById('my-service-requests');
  if (!wrap || !currentUser) return;
  wrap.classList.remove('hidden');
  wrap.innerHTML = '<strong>طلباتي السابقة</strong>' + skeletonCards(2);
  const { data, error } = await sb.from('service_requests').select('id,category,area,details,status,assigned_provider_name,assigned_provider_phone,assignment_notes,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(20);
  if (error) { wrap.innerHTML = '<strong>طلباتك السابقة</strong><p style="color:var(--text-muted);font-size:.8rem;">نفّذ تحديث قاعدة البيانات المرفق لتفعيل سجل الطلبات.</p>'; return; }
  const labels = {new:'وصلنا طلبك',reviewing:'الإدارة تراجع طلبك',assigned:'تم ربطك بمقدم خدمة',completed:'مكتمل',cancelled:'ملغي'};
  wrap.innerHTML = '<strong>طلباتي السابقة</strong>' + ((data||[]).map(r=>`<div class="review-item"><div style="display:flex;justify-content:space-between;gap:8px;"><b>${escapeHtml(r.category)}</b><span class="request-status">${labels[r.status]||'قيد المتابعة'}</span></div><div style="font-size:.76rem;color:var(--text-muted);margin-top:4px;">${escapeHtml(r.area)} • ${new Date(r.created_at).toLocaleDateString('ar-IQ')}</div><p style="font-size:.82rem;margin:5px 0 0;">${escapeHtml(r.details)}</p>${r.status === 'assigned' && r.assigned_provider_name ? `<div class="msg-box msg-ok" style="margin-top:10px;"><strong>مقدم الخدمة: ${escapeHtml(r.assigned_provider_name)}</strong>${r.assigned_provider_phone ? `<div style="margin-top:5px;">رقم التواصل: ${escapeHtml(r.assigned_provider_phone)} ${/^9647\d{9}$/.test(formatWhatsApp(r.assigned_provider_phone)) ? `<a class="btn btn-green btn-sm" style="margin-inline-start:6px;" href="https://wa.me/${formatWhatsApp(r.assigned_provider_phone)}" target="_blank" rel="noopener noreferrer">واتساب</a>` : ''}</div>` : ''}${r.assignment_notes ? `<p style="margin:5px 0 0;">${escapeHtml(r.assignment_notes)}</p>` : ''}</div>` : ''}</div>`).join('') || '<p style="color:var(--text-muted);font-size:.82rem;">ما عندك طلبات سابقة حالياً.</p>');
}

async function submitServiceRequest() {
  if (!currentUser) return switchView('auth');
  const category = document.getElementById('sr-category').value;
  const area = document.getElementById('sr-area').value.trim();
  const phone = cleanPhone(document.getElementById('sr-phone').value);
  const details = document.getElementById('sr-details').value.trim();
  if (!category || !area || phone.length < 10 || details.length < 8) return showMsg('sr-message','أكمل نوع الخدمة والمنطقة ورقم الهاتف والتفاصيل بشكل صحيح.',false);
  const btn = document.getElementById('sr-submit');
  btn.disabled = true; btn.textContent = 'جاري إرسال الطلب...';
  const { error } = await sb.from('service_requests').insert({user_id:currentUser.id,category,area,phone,details,status:'new'});
  btn.disabled = false; btn.textContent = 'إرسال طلب الخدمة';
  if (error) return showMsg('sr-message','تعذر إرسال الطلب: ' + error.message,false);
  document.getElementById('sr-details').value = '';
  showMsg('sr-message','وصل طلبك بنجاح. تگدر تتابع حالته من طلباتي السابقة.',true);
  document.getElementById('sr-category').value = '';
  document.getElementById('sr-area').value = '';
  document.getElementById('sr-phone').value = '';
  await renderServiceRequestView();
}

