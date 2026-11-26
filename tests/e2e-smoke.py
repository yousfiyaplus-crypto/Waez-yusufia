# اختبار دخان (Smoke test) بالمتصفح مع محاكاة Supabase وLeaflet. التشغيل: python3 tests/e2e-smoke.py [anon|owner|admin]
# يتطلب: pip install playwright && playwright install chromium
import json, subprocess, time, sys, os
from playwright.sync_api import sync_playwright

PROJECT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ROLE = sys.argv[1] if len(sys.argv) > 1 else 'anon'
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '-d', PROJECT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

CATS = [{"id":1,"name":"مطاعم","icon":"🍽️","sort_order":1},{"id":2,"name":"صيدليات","icon":"💊","sort_order":2}]
SHOPS = [
 {"id":"s1","name":"مطعم <img src=x onerror=window.__xss=1>","category_id":1,"area_text":"اليوسفية","phone":"07701234567","whatsapp":"07701234567","description":"وصف","daily_offer":"خصم","open_time":"08:00","close_time":"23:59","is_24h":False,"manual_status":"auto","show_on_map":True,"lat":33.075,"lng":44.245,"status":"approved","is_verified":True,"plan":"gold","image_url":"https://x.test/a.jpg\" onerror=\"window.__xss=2","owner_id":"u1","views_count":50,"clicks_count":10,"created_at":"2026-01-01T00:00:00Z"},
 {"id":"s2","name":"صيدلية الشفاء","category_id":2,"area_text":"اليوسفية","phone":"07709999999","whatsapp":None,"description":"","daily_offer":None,"open_time":"09:00","close_time":"21:00","is_24h":True,"manual_status":"auto","show_on_map":False,"lat":None,"lng":None,"status":"approved","is_verified":False,"plan":"free","image_url":None,"owner_id":"u2","views_count":5,"clicks_count":1,"created_at":"2026-02-01T00:00:00Z"},
]
REVS = [{"shop_id":"s1","rating":5},{"shop_id":"s1","rating":4},{"shop_id":"s2","rating":3}]

SB_STUB = """
(function(){
  const DB = %s;
  const ROLE = %s;
  function q(table){
    const state={table};
    const p = new Proxy(function(){}, {
      get(_, k){
        if(k==='then') return (res)=>res(result(state));
        if(k==='single'||k==='maybeSingle') { state.single=true; return ()=>p; }
        return (...a)=>{ if(k==='select' && a[1] && a[1].head) state.head=true; return p; };
      }
    });
    return p;
  }
  function result(s){
    if(s.head) return {count:0,error:null,data:null};
    let d = DB[s.table] || [];
    if(s.single) return {data: s.table==='profiles' ? DB.profile : d[0]||null, error:null};
    return {data:d, error:null};
  }
  const chan = new Proxy({}, {get:()=>()=>chan});
  const user = ROLE==='anon' ? null : {id:'u1', email:'owner@test.com'};
  window.supabase = { createClient: () => ({
    from: q, rpc: ()=>Promise.resolve({data:null,error:null}),
    channel: ()=>chan, removeChannel: ()=>{},
    auth: { getSession: ()=>Promise.resolve({data:{session: user?{user}:null}}),
            onAuthStateChange: ()=>({data:{subscription:{unsubscribe(){}}}}),
            signInWithPassword: ()=>Promise.resolve({error:null}), signOut: ()=>Promise.resolve({}) },
    storage: { from: ()=>({upload:()=>Promise.resolve({}), getPublicUrl:()=>({data:{publicUrl:'https://x.test/p.jpg'}})}) }
  })};
})();
""" % (json.dumps({"categories":CATS,"app_settings":[],"shops":SHOPS,"reviews":REVS,"community_posts":[],"service_requests":[],"user_notifications":[],
                   "profile":{"id":"u1","full_name":"علي أحمد","role":"admin" if ROLE=='admin' else "user","email":"owner@test.com"},"profiles":[{"id":"u1","email":"a@b.c","created_at":"2026-01-01"}]}), json.dumps(ROLE))

L_STUB = """
(function(){
  const chain = new Proxy(function(){}, { get(_, k){ if(k==='then') return undefined; if(k==='getBounds') return ()=>({}); return ()=>chain; }, apply(){ return chain; } });
  window.L = new Proxy({}, { get(_, k){ return ()=>chain; } });
})();
"""

errors, csp, logs = [], [], []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, locale='ar')
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    def on_console(m):
        t = m.text
        if 'Content Security Policy' in t or 'Refused to' in t: csp.append(t[:200])
        elif m.type == 'error': logs.append(t[:200])
    page.on('console', on_console)
    def route(r):
        u = r.request.url
        if 'supabase-js' in u: r.fulfill(body=SB_STUB, content_type='application/javascript')
        elif 'leaflet.markercluster' in u: r.fulfill(body='', content_type='application/javascript')
        elif 'leaflet' in u and u.endswith('.js'): r.fulfill(body=L_STUB, content_type='application/javascript')
        elif u.startswith('http://localhost:8765'): r.continue_()
        else: r.fulfill(status=200, body='', content_type='text/css' if u.endswith('.css') or 'fonts' in u else 'image/png')
    ctx.route('**/*', route)
    page.goto('http://localhost:8765/index.html')
    page.wait_for_selector('.shop-card:not(.sk-card)', timeout=8000)
    res = {}
    res['cards'] = page.locator('.shop-card').count()
    res['xss'] = page.evaluate('window.__xss')
    res['name_rendered_as_text'] = 'onerror' in page.locator('.shop-name').first.inner_text()
    page.screenshot(path='home.png')
    # sort
    page.select_option('#sort-select', 'rating')
    res['first_after_rating'] = page.locator('.shop-name').first.inner_text()[:12]
    # open modal by clicking card
    page.locator('.shop-top').nth(1).click()
    page.wait_for_selector('#modal-shop:not(.hidden) h2', timeout=5000)
    res['modal_title'] = page.locator('#modal-shop h2').inner_text()
    res['hash'] = page.evaluate('location.hash')
    page.screenshot(path='modal.png')
    page.locator('#close-shop-modal').click()
    res['modal_closed'] = page.locator('#modal-shop').evaluate('e=>e.classList.contains("hidden")')
    # filter toggle
    page.locator('#filter-open').click()
    res['open_filter_active'] = page.locator('#filter-open').evaluate('e=>e.classList.contains("active")')
    # category pill
    page.locator('#category-pills .pill').nth(2).click()
    res['cards_after_category'] = page.locator('.shop-card').count()
    # nav
    for v in ['request','owner','activity','auth','home']:
        page.locator(f'#nav-{v}').click()
        res[f'view_{v}_visible'] = page.locator(f'#view-{v}').evaluate('e=>!e.classList.contains("hidden")')
    if ROLE != 'anon':
        page.locator('#nav-owner').click(); page.wait_for_timeout(300)
        res['owner_cards'] = page.locator('#owner-shops-list .panel-card').count()
        res['owner_stats'] = page.locator('.stat-tile').count()
        page.screenshot(path='owner.png')
        page.locator('[data-action="openOwnerFormById"]').first.click()
        res['owner_form_open'] = page.locator('#owner-form-card').evaluate('e=>!e.classList.contains("hidden")')
        res['owner_form_name'] = page.input_value('#f-name')[:10]
    if ROLE == 'admin':
        page.locator('#nav-admin').click(); page.wait_for_timeout(300)
        for t in ['shops','reviews','requests','community','settings']:
            page.locator(f'#admin-tabs .pill[data-args*="{t}"]').click(); page.wait_for_timeout(250)
        res['admin_tab_buttons_ok'] = page.locator('#admin-panel-body').inner_text()[:40]
        page.screenshot(path='admin.png')
    res['xss_final'] = page.evaluate('window.__xss')
    print(json.dumps(res, ensure_ascii=False, indent=1))
    b.close()
srv.terminate()
print('PAGE ERRORS:', errors)
print('CSP VIOLATIONS:', csp)
print('CONSOLE ERRORS:', logs)
