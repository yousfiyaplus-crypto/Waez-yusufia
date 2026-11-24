// js/community.js — نبض اليوسفية (الأخبار والتنبيهات والعروض المحلية).
async function loadCommunityPosts() {
  const { data, error } = await sb.from('community_posts').select('id,title,body,kind,area,expires_at,created_at').eq('status','published').or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()).order('created_at',{ascending:false}).limit(6);
  communityPosts = error ? [] : (data || []);
  renderCommunityPosts();
}

function setCommunityFilter(filter) {
  communityFilter = ['all','news','alert','offer'].includes(filter) ? filter : 'all';
  document.querySelectorAll('[data-community-filter]').forEach(btn => {
    const active = btn.dataset.communityFilter === communityFilter;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  renderCommunityPosts();
}

function renderCommunityPosts() {
  const section = document.getElementById('community-pulse');
  const wrap = document.getElementById('community-posts-list');
  const filters = document.getElementById('community-post-filters');
  if (!section || !wrap) return;
  section.classList.toggle('hidden', communityPosts.length === 0);
  if (filters) filters.classList.toggle('hidden', communityPosts.length < 2);
  const visiblePosts = communityFilter === 'all' ? communityPosts : communityPosts.filter(post => post.kind === communityFilter);
  if (!visiblePosts.length) {
    wrap.innerHTML = '<div class="pulse-empty">ماكو تحديثات ضمن هذا التصنيف حالياً.</div>';
    return;
  }
  wrap.innerHTML = visiblePosts.map(post => {
    const kind = ['news','offer','alert'].includes(post.kind) ? post.kind : 'news';
    const symbol = ico(kind === 'offer' ? 'percent' : kind === 'alert' ? 'warn' : 'news', 18);
    const label = kind === 'offer' ? 'عرض تجاري' : kind === 'alert' ? 'تنبيه مهم' : 'خبر محلي';
    const date = post.created_at ? new Date(post.created_at).toLocaleDateString('ar-IQ',{day:'numeric',month:'short'}) : '';
    const expiry = post.expires_at ? new Date(post.expires_at) : null;
    const remaining = expiry && !Number.isNaN(expiry.getTime()) ? Math.ceil((expiry.getTime()-Date.now())/86400000) : null;
    const expiryLabel = remaining !== null && remaining >= 0 && remaining <= 1 ? 'ينتهي قريباً' : '';
    return `<article class="pulse-card ${kind}"><div class="pulse-symbol" aria-hidden="true">${symbol}</div><div class="pulse-content"><strong>${escapeHtml(post.title)}</strong><p>${escapeHtml(post.body)}</p><div class="pulse-meta"><span>${label}</span>${post.area ? `<span>• ${escapeHtml(post.area)}</span>` : ''}${date ? `<span>• ${date}</span>` : ''}${expiryLabel ? `<span class="pulse-time">${expiryLabel}</span>` : ''}</div></div></article>`;
  }).join('');
}

async function submitCommunityPost() {
  if (currentProfile?.role !== 'admin') return showToast('هذه الخاصية للإدارة فقط.','err');
  const title = document.getElementById('cp-title')?.value.trim();
  const body = document.getElementById('cp-body')?.value.trim();
  const kind = document.getElementById('cp-kind')?.value || 'news';
  const area = document.getElementById('cp-area')?.value.trim() || null;
  const days = Number(document.getElementById('cp-days')?.value || 0);
  if (!title || !body) return showToast('اكتب العنوان والتفاصيل أولاً.','err');
  const expires_at = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
  const { error } = await sb.from('community_posts').insert({title,body,kind,area,expires_at,status:'published',created_by:currentUser.id});
  if (error) return showToast('تعذر النشر: ' + error.message,'err',4500);
  communityFilter = 'all';
  showToast('تم نشر التحديث المحلي.','ok');
  loadAdminTab('community');
  await loadCommunityPosts();
}

async function adminDeleteCommunityPost(id) {
  const ok = await showDialog({message:'حذف هذا التحديث من نبض اليوسفية؟',confirmText:'حذف التحديث'});
  if (!ok) return;
  const { error } = await sb.from('community_posts').delete().eq('id',id);
  if (error) return showToast('تعذر الحذف: ' + error.message,'err');
  await loadCommunityPosts();
  loadAdminTab('community');
}

