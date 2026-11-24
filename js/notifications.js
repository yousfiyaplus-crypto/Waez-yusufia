// js/notifications.js — مركز النشاط والإشعارات الفورية عبر Supabase Realtime.
function subscribeToNotifications() {
  if (!currentUser) return;
  activityRealtimeChannel = sb.channel('user-notifications-' + currentUser.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${currentUser.id}` }, async () => {
      await refreshNotificationBadge();
      if (!document.getElementById('view-activity')?.classList.contains('hidden')) loadActivityCenter();
    }).subscribe();
}

async function refreshNotificationBadge() {
  const badge = document.getElementById('activity-unread-badge');
  if (!badge) return;
  if (!currentUser) { badge.classList.add('hidden'); return; }
  const { count, error } = await sb.from('user_notifications').select('id', { count: 'exact', head: true }).is('read_at', null).or(`user_id.eq.${currentUser.id},user_id.is.null`);
  if (error) { badge.classList.add('hidden'); return; }
  badge.textContent = count > 99 ? '99+' : String(count || 0);
  badge.classList.toggle('hidden', !count);
}

async function loadActivityCenter() {
  const list = document.getElementById('activity-list');
  const summary = document.getElementById('activity-summary');
  if (!list) return;
  if (!currentUser) { list.innerHTML = '<div class="panel-card">سجّل الدخول حتى تتابع إشعاراتك وطلباتك.</div>'; return; }
  list.innerHTML = '<div class="panel-card">جاري تحميل نشاطك...</div>';
  const { data, error } = await sb.from('user_notifications').select('*').or(`user_id.eq.${currentUser.id},user_id.is.null`).order('created_at', { ascending: false }).limit(60);
  if (error) { list.innerHTML = '<div class="panel-card">تعذر تحميل مركز النشاط. تأكد من تنفيذ تحديث قاعدة البيانات الخاص بالإشعارات.</div>'; return; }
  const rows = data || [];
  const unread = rows.filter(n => !n.read_at).length;
  if (summary) summary.textContent = `${rows.length} تحديث · ${unread} غير مقروء`;
  list.innerHTML = rows.map(n => {
    const icon = n.type === 'alert' ? '!' : n.type === 'service' ? '↗' : '●';
    return `<article class="activity-item ${n.read_at ? '' : 'unread'}"><div class="activity-icon">${icon}</div><div style="flex:1;min-width:0"><strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.body)}</p><small>${new Date(n.created_at).toLocaleString('ar-IQ')}</small>${n.read_at || !n.user_id ? '' : `<div style="margin-top:8px"><button class="btn btn-outline btn-sm" onclick="markNotificationRead('${n.id}')">تمييز كمقروء</button></div>`}</div></article>`;
  }).join('') || '<div class="panel-card">ما عندك إشعارات حالياً. من يصير تحديث يخصك راح يظهر هنا.</div>';
  await refreshNotificationBadge();
}

async function markNotificationRead(id) {
  if (!currentUser) return;
  const { error } = await sb.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null);
  if (error) return showToast('تعذر تحديث الإشعار. تأكد من صلاحيات قاعدة البيانات.', 'err');
  await loadActivityCenter();
}

async function markAllNotificationsRead() {
  if (!currentUser) return;
  const { error } = await sb.from('user_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null).eq('user_id', currentUser.id);
  if (error) return showToast('تعذر تحديث الإشعارات.', 'err');
  await loadActivityCenter();
  showToast('تم تمييز الإشعارات كمقروءة.', 'ok');
}
