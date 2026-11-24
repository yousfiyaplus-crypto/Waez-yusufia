// js/config.js — إعدادات الاتصال بـ Supabase، الحالة العامة، ومكتبة الأيقونات SVG.
// ===== إعدادات الربط =====
const SUPABASE_URL = 'https://rwtbmtexxarddibqkbqw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p-zCzWFpfcuL68Jfc-wV9w_ZM8tnIHw';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// إحداثيات مركز اليوسفية - بغداد
const YUSUFIYA_CENTER = [33.075, 44.245];

// حالة التطبيق
let currentUser = null;
let currentProfile = null;
let categories = [];
let allShops = [];
let communityPosts = [];
let communityFilter = 'all';
let reviewsSummary = {}; // { shopId: { avg, count } }
let mapEnabledSetting = true;
let selectedCategory = 'all';
let quickFilters = { open: false, verified: false, fav: false };
let userCoords = null;
let favorites = JSON.parse(localStorage.getItem('yp_favs') || '[]');
let authMode = 'login';
let deferredPrompt = null;
let activityRealtimeChannel = null;

let mainMap = null;
let mainMarkersLayer = null;
let routeLayer = null;
let pickerMap = null;
let pickerMarker = null;
let pendingCompressedBlob = null;

// ===== مكتبة الأيقونات (SVG مضمّنة، بلا طلبات خارجية) =====
const ICONS = {
  pin: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M12 22s7-7.58 7-12.5A7 7 0 0 0 5 9.5C5 14.42 12 22 12 22z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  check: '<svg class="ic ic-14" viewBox="0 0 24 24" stroke-width="2.3"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  star: (filled) => `<svg class="ic ic-14${filled ? ' ic-fill' : ''}" viewBox="0 0 24 24" ${filled ? 'fill="currentColor" stroke="none"' : ''}><path d="M12 2.5l2.95 6.26 6.9.76-5.13 4.73 1.4 6.78L12 17.9 5.88 21.03l1.4-6.78L2.15 9.52l6.9-.76L12 2.5z"/></svg>`,
  fire: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M12 22c4 0 7-2.5 7-6.5 0-3-1.8-4.8-2.6-6.3-.3 1.7-1.3 2.8-1.3 2.8C15.5 9 14 6 12 2c-.6 3-2 4.8-3.3 6.5C7.4 10 6 11.8 6 14.5 6 18.5 8 22 12 22z"/></svg>',
  phone: '<svg class="ic ic-16" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  chat: '<svg class="ic ic-16" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 20l1-4.5a8.38 8.38 0 0 1-1-4A8.5 8.5 0 1 1 21 11.5z"/></svg>',
  compass: '<svg class="ic ic-16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M14.5 9.5l-2 5-5 2 2-5 5-2z"/></svg>',
  heart: (filled) => `<svg class="ic ic-16${filled ? ' ic-fill' : ''}" viewBox="0 0 24 24" ${filled ? 'fill="currentColor"' : ''}><path d="M12 21s-7.2-4.5-9.6-9C1.1 9 2.5 5.5 5.9 5.5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2 3.4 0 4.8 3.5 3.5 6.5-2.4 4.5-9.6 9-9.6 9z"/></svg>`,
  eye: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  tap: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M9 11.5V6a1.5 1.5 0 0 1 3 0v5"/><path d="M12 11V5a1.5 1.5 0 0 1 3 0v6"/><path d="M15 11.5V7a1.5 1.5 0 0 1 3 0v7c0 3.5-2 6.5-6 6.5s-5.5-1.5-7-4l-1.8-3.2a1.4 1.4 0 0 1 2.3-1.6L7 14"/></svg>',
  edit: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  trash: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  flag: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
  store: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 9v10h14V9"/><path d="M9 19v-5h6v5"/></svg>',
  clock: '<svg class="ic ic-14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  warn: '<svg class="ic ic-14" viewBox="0 0 24 24"><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.1"/></svg>',
};
