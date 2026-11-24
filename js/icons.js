// js/icons.js — مكتبة أيقونات SVG موحّدة، أيقونات الأقسام، ودبابيس الخريطة.
const SVG_PATHS = {
  utensils: '<path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 3v18"/><path d="M17 21V3c-2.8 1.4-4 4.2-4 7.5V13h4"/>',
  pill: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  coffee: '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/><path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M8 3v2M12 3v2"/>',
  basket: '<path d="M3 9h18l-2 10a2 2 0 0 1-2 1.6H7A2 2 0 0 1 5 19L3 9z"/><path d="M8 9l3-5M16 9l-3-5"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1L20 20M8.1 15.9L20 4"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4"/><path d="M3 16h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  droplet: '<path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z"/>',
  truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h4l4 3.5V16h-8"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16v4M17 18h4"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/>',
  mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  shirt: '<path d="M8 3L3 6l2.5 4L8 9v12h8V9l2.5 1L21 6l-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/>',
  bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12"/><path d="M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M7 8h4"/>',
  hammer: '<path d="M12 4l6 6-3 3-6-6 3-3z"/><path d="M14 6l4 4"/><path d="M5 19l5-5"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C10 8 7.5 7 7.5 5.2c0-1.4 1.5-2 2.5-1.2 1 .8 2 4 2 4s1-3.2 2-4c1-.8 2.5-.2 2.5 1.2C16.5 7 14 8 12 8z"/>',
  dumbbell: '<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/>',
  bed: '<path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.5"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 9v10h14V9"/><path d="M9 19v-5h6v5"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowUR: '<path d="M7 17L17 7M8 7h9v9"/>',
  pin: '<path d="M12 22s7-7.58 7-12.5A7 7 0 0 0 5 9.5C5 14.42 12 22 12 22z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4M20 19v-4h-4"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  locate: '<path d="M3 11l18-8-8 18-2-8-8-2z"/>',
  fit: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2V5z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5"/>',
  warn: '<path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.1"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"/><path d="M8.5 12l2.5 2.5L16 9.5"/>',
};

function ico(name, size = 16) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${SVG_PATHS[name] || SVG_PATHS.store}</svg>`;
}

// قاعدة المطابقة: الاسم العربي (بعد التطبيع) أو رمز الإيموجي القديم القادم من قاعدة البيانات.
const CAT_RULES = [
  ['utensils', /مطعم|مطاعم|وجب|كباب|شاورم|برغر|برگر|مشاو|فطور|🍽|🍔|🍕|🍗|🥙|🍖/],
  ['pill', /صيدل|دوا|💊/],
  ['activity', /طبيب|عياد|مستشف|مختبر|اسنان|صحه|🏥|🩺|🦷/],
  ['coffee', /كافي|قهو|مقهي|شاي|حلويات|☕|🧁/],
  ['basket', /بقال|ماركت|سوبر|خضر|فاكه|لحوم|جزار|تسوق|🛒|🥬|🥩|🍎/],
  ['scissors', /حلاق|صالون|تجميل|مكياج|✂|💇/],
  ['car', /سيار|كراج|اطار|🚗/],
  ['bolt', /كهرب|⚡|💡/],
  ['droplet', /سباك|مياه|💧|🚰/],
  ['wrench', /صيان|تصليح|ورش|🔧|🛠/],
  ['truck', /توصيل|نقل|شحن|🚚|🛵/],
  ['sparkles', /تنظيف|غسيل|مغسل|🧹|🧼/],
  ['cap', /مدرس|تعليم|دورات|كتب|مكتب|معهد|📚|🎓|🏫/],
  ['mobile', /موبايل|هاتف|اتصالات|جوال|📱/],
  ['shirt', /ملابس|ازياء|احذي|خياط|👕|👗|👟/],
  ['bank', /صيرف|مصرف|بنك|تحويل|💰|🏦/],
  ['fuel', /وقود|بنزين|محطه|⛽/],
  ['hammer', /بناء|مقاول|نجار|حداد|انشاء|🏗|🔨/],
  ['gift', /هدايا|ورود|زهور|مناسبات|🎁|💐/],
  ['dumbbell', /رياض|جيم|نادي|🏋/],
  ['bed', /فندق|شقق|سكن|🏨|🛏/],
];

function catIconName(cat) {
  const t = normalizeAr(`${cat?.name || ''} ${cat?.icon || ''}`);
  const hit = CAT_RULES.find(([, re]) => re.test(t));
  return hit ? hit[0] : 'store';
}
function catIcon(cat, size = 16) { return ico(catIconName(cat), size); }

// دبوس الخريطة: قرص داكن بإطار ذهبي، نقطة حالة (أخضر مفتوح / أحمر مغلق)، والمميز بخلفية ذهبية.
function shopPin(s, cat) {
  const cls = `yp-pin${s.plan === 'gold' ? ' gold' : ''}${s.openInfo && !s.openInfo.isOpen ? ' off' : ''}`;
  return L.divIcon({ className: 'yp-pin-wrap', iconSize: [40, 48], iconAnchor: [20, 46], html: `<div class="${cls}">${catIcon(cat || {}, 18)}</div>` });
}
function meIcon() {
  return L.divIcon({ className: 'yp-me-wrap', iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="yp-me"></div>' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = ico(el.dataset.ic, +el.dataset.s || 18); });
});
