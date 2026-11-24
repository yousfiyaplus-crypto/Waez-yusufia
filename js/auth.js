// ===== المصادقة والحساب =====
async function checkAuthSession() {
  const { data } = await sb.auth.getSession();
  currentUser = data?.session?.user || null;
  await loadCurrentProfile();
  updateAuthUI();
}

async function loadCurrentProfile() {
  if (!currentUser) {
    currentProfile = null;
    return;
  }
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data || null;
}

function updateAuthUI() {
  updateDailyHub();
  const badge = document.getElementById('header-user-badge');
  const navAdmin = document.getElementById('nav-admin');
  const authForms = document.getElementById('auth-forms-card');
  const authLogged = document.getElementById('auth-logged-in');

  document.getElementById('request-login-note')?.classList.toggle('hidden', !!currentUser);
  document.getElementById('service-request-form')?.classList.toggle('hidden', !currentUser);
  if (currentUser) {
    const name = currentProfile?.full_name || currentUser.email.split('@')[0];
    badge.innerHTML = `<svg class="ic ic-16" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg> ${escapeHtml(name)}`;
    authForms.classList.add('hidden');
    authLogged.classList.remove('hidden');
    document.getElementById('profile-info').innerHTML =
      `<strong>الاسم:</strong> ${escapeHtml(name)}<br><strong>الإيميل:</strong> ${escapeHtml(currentUser.email)}<br><strong>الصلاحية:</strong> ${currentProfile?.role === 'admin' ? 'مدير المنصة' : 'مستخدم / صاحب مشروع'}`;
    navAdmin.classList.toggle('hidden', currentProfile?.role !== 'admin');
  } else {
    badge.innerHTML = `<svg class="ic ic-16" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg> دخول / تسجيل`;
    authForms.classList.remove('hidden');
    authLogged.classList.add('hidden');
    navAdmin.classList.add('hidden');
  }
}

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('auth-name-group').classList.toggle('hidden', mode === 'login');
  document.getElementById('tab-login').className = mode === 'login' ? 'btn btn-primary' : 'btn btn-outline';
  document.getElementById('tab-signup').className = mode === 'signup' ? 'btn btn-primary' : 'btn btn-outline';
  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'دخول' : 'إنشاء الحساب';
  document.getElementById('auth-msg').innerHTML = '';
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const fullName = document.getElementById('auth-name').value.trim();

  if (!email || password.length < 6) {
    return showMsg('auth-msg', 'يرجى إدخال بريد إلكتروني صحيح وكلمة مرور من ٦ أحرف على الأقل.', false);
  }

  const btn = document.getElementById('auth-submit-btn');
  const btnDefaultHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> جاري التحقق...`;
  const restoreBtn = () => { btn.disabled = false; btn.innerHTML = btnDefaultHtml; };

  if (authMode === 'login') {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    restoreBtn();
    if (error) return showMsg('auth-msg', 'تأكد من الإيميل وكلمة المرور أو تفعيل الحساب من إيميلك.', false);
    showMsg('auth-msg', 'تم تسجيل الدخول بنجاح!', true);
    await loadInitialData();
    switchView('home');
  } else {
    if (!fullName) { restoreBtn(); return showMsg('auth-msg', 'يرجى كتابة اسمك الكامل.', false); }
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    restoreBtn();
    if (error) return showMsg('auth-msg', error.message, false);
    if (data?.session) {
      showMsg('auth-msg', 'تم إنشاء الحساب وتسجيل الدخول بنجاح!', true);
      await loadInitialData();
    } else {
      showMsg('auth-msg', 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني (تفقد البريد الوارد أو Spam) ثم سجل الدخول.', true);
    }
  }
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateAuthUI();
  switchView('home');
}

// ===== استعادة كلمة المرور =====
function toggleForgotPassword() {
  const box = document.getElementById('forgot-pass-box');
  if (!box) return;
  box.classList.toggle('hidden');
  if (!box.classList.contains('hidden')) {
    document.getElementById('forgot-email')?.focus();
  }
}

async function requestPasswordReset() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return showMsg('forgot-pass-msg', 'اكتب بريدك الإلكتروني المسجّل أولاً.', false);
  const btn = document.getElementById('forgot-pass-btn');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'جاري الإرسال...';
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  btn.disabled = false;
  btn.textContent = original;
  if (error) return showMsg('forgot-pass-msg', 'تعذر إرسال الرابط: ' + error.message, false);
  showMsg('forgot-pass-msg', 'تم إرسال رابط إعادة التعيين إلى بريدك. افتحه من نفس هذا المتصفح.', true);
}

function showResetPasswordBox() {
  document.getElementById('auth-forms-card')?.classList.add('hidden');
  document.getElementById('auth-logged-in')?.classList.add('hidden');
  document.getElementById('reset-pass-box')?.classList.remove('hidden');
}

async function submitNewPassword() {
  const pass = document.getElementById('new-password').value;
  if (!pass || pass.length < 6) return showMsg('reset-pass-msg', 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل.', false);
  const btn = document.getElementById('reset-pass-btn');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';
  const { error } = await sb.auth.updateUser({ password: pass });
  btn.disabled = false;
  btn.textContent = original;
  if (error) return showMsg('reset-pass-msg', 'تعذر تحديث كلمة المرور: ' + error.message, false);
  showMsg('reset-pass-msg', 'تم تحديث كلمة المرور بنجاح.', true);
  setTimeout(() => {
    document.getElementById('reset-pass-box')?.classList.add('hidden');
    updateAuthUI();
    switchView('home');
  }, 1200);
}

