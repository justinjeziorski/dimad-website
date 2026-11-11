let timerInterval = null, isTimerRunning = false, weeklyLoggedSeconds = 14.5 * 3600;
let currentActiveMode = 'entrepreneur';

const VIEW_FILES = [
  'ent-dashboard',
  'ent-ai-business',
  'ent-crm',
  'ent-stocks',
  'ent-invoices',
  'ent-goals',
  'ent-tasks',
  'creator-studio',
  'creator-ai',
  'creator-writespace',
  'creator-design',
  'creator-pipeline',
  'creator-scheduler',
  'creator-vault',
  'nomad-city',
  'nomad-concierge',
  'nomad-ai',
  'nomad-maps',
  'nomad-guides',
  'nomad-language',
  'nomad-toolbox',
  'dimad-ai-hub',
  'dimad-calendar',
  'dimad-notepad',
  'dimad-dimdrive',
  'community-overview',
  'community-map',
  'community-meet',
  'community-forum',
  'community-announcements',
  'settings'
];

const MODE_NAV = {
  entrepreneur: {
    defaultTab: 'ent-dashboard',
    items: [
      { id: 'ent-dashboard', label: 'Command Center', highlight: true },
      { id: 'ent-ai-business', label: '⚡ Business AI' },
      { id: 'ent-crm', label: 'Sales & Revenue' },
      { id: 'ent-stocks', label: 'Stocks & Finance' },
      { id: 'ent-invoices', label: 'Invoices & Proposals' },
      { id: 'ent-goals', label: 'Goals & Achievements' },
      { id: 'ent-tasks', label: 'Task Manager' }
    ]
  },
  creator: {
    defaultTab: 'creator-studio',
    items: [
      { id: 'creator-studio', label: 'Dimad Studio', highlight: true },
      { id: 'creator-ai', label: '⚡ Creator AI' },
      { id: 'creator-writespace', label: 'WriteSpace' },
      { id: 'creator-design', label: 'Design Suite' },
      { id: 'creator-pipeline', label: 'Creator Pipeline' },
      { id: 'creator-scheduler', label: 'Content Scheduler' },
      { id: 'creator-vault', label: 'Asset & Media Vault' }
    ]
  },
  nomad: {
    defaultTab: 'nomad-city',
    items: [
      { id: 'nomad-city', label: 'Your City', highlight: true },
      { id: 'nomad-ai', label: '⚡ Nomad AI' },
      { id: 'nomad-concierge', label: 'Dimad Concierge', premium: true },
      { id: 'nomad-maps', label: 'Digital Maps' },
      { id: 'nomad-guides', label: 'Travel Guides' },
      { id: 'nomad-language', label: 'Language Survival Kit' },
      { id: 'nomad-toolbox', label: 'Travel Toolbox' }
    ]
  },
  community: {
    defaultTab: 'community-overview',
    items: [
      { id: 'community-overview', label: 'Club Overview', highlight: true },
      { id: 'community-announcements', label: 'Announcements' },
      { id: 'community-map', label: 'Members Map' },
      { id: 'community-meet', label: 'Dimad Meet' },
      { id: 'community-forum', label: 'Dimad Forum' }
    ]
  }
};


async function loadViews() {
  const container = document.getElementById('view-container');
  try {
    const fragments = await Promise.all(VIEW_FILES.map(async (id) => {
      const res = await fetch(new URL(`../views/${id}.html`, window.location.href), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load views/${id}.html (${res.status})`);
      return res.text();
    }));
    container.innerHTML = fragments.join('\n');
  } catch (err) {
    container.innerHTML = `
      <div class="p-4 border border-brand-alert/40 bg-brand-panel rounded text-slate-300 space-y-2">
        <h2 class="text-sm font-bold text-brand-alert">Views could not be loaded</h2>
        <p class="text-[10px]">Serve this folder over HTTP so <code>fetch()</code> can load files from <code>views/</code>. Opening <code>index.html</code> directly as a file is blocked by the browser.</p>
        <p class="text-[10px] text-slate-400 font-mono">${err.message}</p>
      </div>
    `;
    throw err;
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('main-sidebar');
  const toggleIcon = document.getElementById('sidebar-toggle-icon');
  sidebar.classList.toggle('sidebar-collapsed');
  toggleIcon.classList.toggle('fa-angles-left');
  toggleIcon.classList.toggle('fa-angles-right');
}

const WORLD_CLOCK_CITIES = [
  { id: 'baker', city: 'Baker Island', tz: 'Etc/GMT+12', group: 'UTC−12' },
  { id: 'pago-pago', city: 'Pago Pago', tz: 'Pacific/Pago_Pago', group: 'UTC−11' },
  { id: 'honolulu', city: 'Honolulu', tz: 'Pacific/Honolulu', group: 'UTC−10' },
  { id: 'anchorage', city: 'Anchorage', tz: 'America/Anchorage', group: 'UTC−9' },
  { id: 'los-angeles', city: 'Los Angeles', tz: 'America/Los_Angeles', group: 'UTC−8' },
  { id: 'vancouver', city: 'Vancouver', tz: 'America/Vancouver', group: 'UTC−8' },
  { id: 'tijuana', city: 'Tijuana', tz: 'America/Tijuana', group: 'UTC−8' },
  { id: 'denver', city: 'Denver', tz: 'America/Denver', group: 'UTC−7' },
  { id: 'phoenix', city: 'Phoenix', tz: 'America/Phoenix', group: 'UTC−7' },
  { id: 'calgary', city: 'Calgary', tz: 'America/Edmonton', group: 'UTC−7' },
  { id: 'chicago', city: 'Chicago', tz: 'America/Chicago', group: 'UTC−6' },
  { id: 'mexico-city', city: 'Mexico City', tz: 'America/Mexico_City', group: 'UTC−6' },
  { id: 'dallas', city: 'Dallas', tz: 'America/Chicago', group: 'UTC−6' },
  { id: 'new-york', city: 'New York', tz: 'America/New_York', group: 'UTC−5' },
  { id: 'toronto', city: 'Toronto', tz: 'America/Toronto', group: 'UTC−5' },
  { id: 'bogota', city: 'Bogotá', tz: 'America/Bogota', group: 'UTC−5' },
  { id: 'lima', city: 'Lima', tz: 'America/Lima', group: 'UTC−5' },
  { id: 'santiago', city: 'Santiago', tz: 'America/Santiago', group: 'UTC−4' },
  { id: 'halifax', city: 'Halifax', tz: 'America/Halifax', group: 'UTC−4' },
  { id: 'caracas', city: 'Caracas', tz: 'America/Caracas', group: 'UTC−4' },
  { id: 'sao-paulo', city: 'São Paulo', tz: 'America/Sao_Paulo', group: 'UTC−3' },
  { id: 'buenos-aires', city: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', group: 'UTC−3' },
  { id: 'montevideo', city: 'Montevideo', tz: 'America/Montevideo', group: 'UTC−3' },
  { id: 'south-georgia', city: 'South Georgia', tz: 'Atlantic/South_Georgia', group: 'UTC−2' },
  { id: 'azores', city: 'Azores', tz: 'Atlantic/Azores', group: 'UTC−1' },
  { id: 'cape-verde', city: 'Cape Verde', tz: 'Atlantic/Cape_Verde', group: 'UTC−1' },
  { id: 'london', city: 'London', tz: 'Europe/London', group: 'UTC±0' },
  { id: 'dublin', city: 'Dublin', tz: 'Europe/Dublin', group: 'UTC±0' },
  { id: 'lisbon', city: 'Lisbon', tz: 'Europe/Lisbon', group: 'UTC±0' },
  { id: 'reykjavik', city: 'Reykjavik', tz: 'Atlantic/Reykjavik', group: 'UTC±0' },
  { id: 'accra', city: 'Accra', tz: 'Africa/Accra', group: 'UTC±0' },
  { id: 'paris', city: 'Paris', tz: 'Europe/Paris', group: 'UTC+1' },
  { id: 'berlin', city: 'Berlin', tz: 'Europe/Berlin', group: 'UTC+1' },
  { id: 'rome', city: 'Rome', tz: 'Europe/Rome', group: 'UTC+1' },
  { id: 'madrid', city: 'Madrid', tz: 'Europe/Madrid', group: 'UTC+1' },
  { id: 'amsterdam', city: 'Amsterdam', tz: 'Europe/Amsterdam', group: 'UTC+1' },
  { id: 'lagos', city: 'Lagos', tz: 'Africa/Lagos', group: 'UTC+1' },
  { id: 'cairo', city: 'Cairo', tz: 'Africa/Cairo', group: 'UTC+2' },
  { id: 'johannesburg', city: 'Johannesburg', tz: 'Africa/Johannesburg', group: 'UTC+2' },
  { id: 'athens', city: 'Athens', tz: 'Europe/Athens', group: 'UTC+2' },
  { id: 'helsinki', city: 'Helsinki', tz: 'Europe/Helsinki', group: 'UTC+2' },
  { id: 'jerusalem', city: 'Jerusalem', tz: 'Asia/Jerusalem', group: 'UTC+2' },
  { id: 'istanbul', city: 'Istanbul', tz: 'Europe/Istanbul', group: 'UTC+3' },
  { id: 'moscow', city: 'Moscow', tz: 'Europe/Moscow', group: 'UTC+3' },
  { id: 'nairobi', city: 'Nairobi', tz: 'Africa/Nairobi', group: 'UTC+3' },
  { id: 'riyadh', city: 'Riyadh', tz: 'Asia/Riyadh', group: 'UTC+3' },
  { id: 'doha', city: 'Doha', tz: 'Asia/Qatar', group: 'UTC+3' },
  { id: 'yerevan', city: 'Yerevan', tz: 'Asia/Yerevan', group: 'UTC+4' },
  { id: 'dubai', city: 'Dubai', tz: 'Asia/Dubai', group: 'UTC+4' },
  { id: 'baku', city: 'Baku', tz: 'Asia/Baku', group: 'UTC+4' },
  { id: 'tbilisi', city: 'Tbilisi', tz: 'Asia/Tbilisi', group: 'UTC+4' },
  { id: 'muscat', city: 'Muscat', tz: 'Asia/Muscat', group: 'UTC+4' },
  { id: 'kabul', city: 'Kabul', tz: 'Asia/Kabul', group: 'UTC+4:30' },
  { id: 'karachi', city: 'Karachi', tz: 'Asia/Karachi', group: 'UTC+5' },
  { id: 'tashkent', city: 'Tashkent', tz: 'Asia/Tashkent', group: 'UTC+5' },
  { id: 'male', city: 'Malé', tz: 'Indian/Maldives', group: 'UTC+5' },
  { id: 'mumbai', city: 'Mumbai', tz: 'Asia/Kolkata', group: 'UTC+5:30' },
  { id: 'delhi', city: 'Delhi', tz: 'Asia/Kolkata', group: 'UTC+5:30' },
  { id: 'colombo', city: 'Colombo', tz: 'Asia/Colombo', group: 'UTC+5:30' },
  { id: 'kathmandu', city: 'Kathmandu', tz: 'Asia/Kathmandu', group: 'UTC+5:45' },
  { id: 'dhaka', city: 'Dhaka', tz: 'Asia/Dhaka', group: 'UTC+6' },
  { id: 'almaty', city: 'Almaty', tz: 'Asia/Almaty', group: 'UTC+6' },
  { id: 'yangon', city: 'Yangon', tz: 'Asia/Yangon', group: 'UTC+6:30' },
  { id: 'bangkok', city: 'Bangkok', tz: 'Asia/Bangkok', group: 'UTC+7' },
  { id: 'jakarta', city: 'Jakarta', tz: 'Asia/Jakarta', group: 'UTC+7' },
  { id: 'hcmc', city: 'Ho Chi Minh City', tz: 'Asia/Ho_Chi_Minh', group: 'UTC+7' },
  { id: 'singapore', city: 'Singapore', tz: 'Asia/Singapore', group: 'UTC+8' },
  { id: 'hong-kong', city: 'Hong Kong', tz: 'Asia/Hong_Kong', group: 'UTC+8' },
  { id: 'beijing', city: 'Beijing', tz: 'Asia/Shanghai', group: 'UTC+8' },
  { id: 'perth', city: 'Perth', tz: 'Australia/Perth', group: 'UTC+8' },
  { id: 'manila', city: 'Manila', tz: 'Asia/Manila', group: 'UTC+8' },
  { id: 'tokyo', city: 'Tokyo', tz: 'Asia/Tokyo', group: 'UTC+9' },
  { id: 'seoul', city: 'Seoul', tz: 'Asia/Seoul', group: 'UTC+9' },
  { id: 'adelaide', city: 'Adelaide', tz: 'Australia/Adelaide', group: 'UTC+9:30' },
  { id: 'sydney', city: 'Sydney', tz: 'Australia/Sydney', group: 'UTC+10' },
  { id: 'melbourne', city: 'Melbourne', tz: 'Australia/Melbourne', group: 'UTC+10' },
  { id: 'vladivostok', city: 'Vladivostok', tz: 'Asia/Vladivostok', group: 'UTC+10' },
  { id: 'noumea', city: 'Nouméa', tz: 'Pacific/Noumea', group: 'UTC+11' },
  { id: 'auckland', city: 'Auckland', tz: 'Pacific/Auckland', group: 'UTC+12' },
  { id: 'fiji', city: 'Suva', tz: 'Pacific/Fiji', group: 'UTC+12' },
  { id: 'apia', city: 'Apia', tz: 'Pacific/Apia', group: 'UTC+13' },
  { id: 'nukualofa', city: "Nuku'alofa", tz: 'Pacific/Tongatapu', group: 'UTC+13' },
  { id: 'kiritimati', city: 'Kiritimati', tz: 'Pacific/Kiritimati', group: 'UTC+14' }
];

const DIMAD_GEO = {
  storageKey: 'dimad_geo_city',
  watchId: null,
  refreshing: false,
  hubs: [
    { city: 'Yerevan', lat: 40.1792, lon: 44.4991, km: 40 },
    { city: 'London', lat: 51.5074, lon: -0.1278, km: 40 },
    { city: 'New York', lat: 40.7128, lon: -74.006, km: 50 }
  ],

  init() {
    const el = document.getElementById('geo-location-label');
    const cached = this.readCache();
    if (cached) this.setLabel(cached);
    if (!el || !navigator.geolocation) return;
    const opts = { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 };
    const onOk = (pos) => this.resolve(pos.coords.latitude, pos.coords.longitude);
    try {
      this.watchId = navigator.geolocation.watchPosition(onOk, () => {}, opts);
    } catch (_) {
      navigator.geolocation.getCurrentPosition(onOk, () => {}, opts);
    }
  },

  readCache() {
    try { return localStorage.getItem(this.storageKey) || ''; } catch { return ''; }
  },

  writeCache(city) {
    try { localStorage.setItem(this.storageKey, city); } catch {}
  },

  setLabel(city) {
    if (!city) return;
    const el = document.getElementById('geo-location-label');
    if (el) el.textContent = city;
    const heading = document.getElementById('nomad-city-heading');
    if (heading) {
      heading.replaceChildren();
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-city';
      heading.append(icon, document.createTextNode(' YOUR CITY: ' + String(city).toUpperCase()));
    }
  },

  modal() {
    return document.getElementById('geo-refresh-modal');
  },

  async permissionState() {
    if (!navigator.geolocation) return 'unsupported';
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state || 'unknown';
    } catch {
      return 'unknown';
    }
  },

  setRefreshCopy(state) {
    const label = document.getElementById('geo-refresh-state');
    const copy = document.getElementById('geo-refresh-copy');
    const help = document.getElementById('geo-refresh-help');
    const allow = document.getElementById('geo-refresh-allow');
    const denied = state === 'denied';
    if (label) {
      label.textContent = state === 'granted' ? 'Location allowed' : denied ? 'Location blocked' : state === 'unsupported' ? 'GPS unavailable' : 'Request site access';
      label.className = `text-[11px] font-mono ${denied || state === 'unsupported' ? 'text-brand-alert' : 'text-brand-mint'}`;
    }
    if (copy) {
      copy.textContent = denied
        ? 'This site cannot read your location until you change tracking permissions in the browser, then refresh again.'
        : 'Refresh Your City from this device. Allow location tracking for this site so DIMAD can pin your current node.';
    }
    if (help) help.classList.toggle('hidden', !denied);
    if (allow) allow.textContent = denied ? 'Change permissions' : 'Allow & update';
  },

  setRefreshStatus(text, kind) {
    const status = document.getElementById('geo-refresh-status');
    if (!status) return;
    if (!text) {
      status.classList.add('hidden');
      status.textContent = '';
      return;
    }
    status.classList.remove('hidden');
    status.className = `text-[10px] font-mono ${kind === 'error' ? 'text-brand-alert' : 'text-brand-mint'}`;
    status.textContent = text;
  },

  spinRefresh(on) {
    const icon = document.querySelector('#geo-refresh-btn i');
    if (icon) icon.classList.toggle('fa-spin', !!on);
  },

  async openRefresh() {
    const modal = this.modal();
    if (!modal) return;
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    this.setRefreshStatus('');
    this.setRefreshCopy(await this.permissionState());
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeRefresh() {
    const modal = this.modal();
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.spinRefresh(false);
  },

  async confirmRefresh() {
    const state = await this.permissionState();
    if (state === 'unsupported') {
      this.setRefreshStatus('This browser does not support location.', 'error');
      return;
    }
    if (state === 'denied') {
      this.setRefreshCopy('denied');
      this.setRefreshStatus('Open the lock icon in the address bar, set Location to Allow, then Retry.', 'error');
      const allow = document.getElementById('geo-refresh-allow');
      if (allow) allow.textContent = 'Retry';
      this.requestLocation();
      return;
    }
    this.requestLocation();
  },

  requestLocation() {
    if (!navigator.geolocation) {
      this.setRefreshStatus('This browser does not support location.', 'error');
      return;
    }
    if (this.refreshing) return;
    this.refreshing = true;
    this.spinRefresh(true);
    this.setRefreshStatus('Requesting location…');
    const opts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await this.resolve(pos.coords.latitude, pos.coords.longitude);
        this.refreshing = false;
        this.spinRefresh(false);
        this.setRefreshCopy('granted');
        this.setRefreshStatus(`Updated: ${this.readCache() || 'current node'}`, 'ok');
        setTimeout(() => this.closeRefresh(), 900);
      },
      (err) => {
        this.refreshing = false;
        this.spinRefresh(false);
        const denied = err && err.code === 1;
        if (denied) this.setRefreshCopy('denied');
        this.setRefreshStatus(
          denied
            ? 'Permission denied. Change site location tracking to Allow, then Retry.'
            : 'Could not read a fix. Check GPS and try again.',
          'error'
        );
        const allow = document.getElementById('geo-refresh-allow');
        if (allow) allow.textContent = denied ? 'Retry' : 'Try again';
      },
      opts
    );
  },

  km(aLat, aLon, bLat, bLon) {
    const toRad = (n) => n * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLon = toRad(bLon - aLon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
  },

  hubCity(lat, lon) {
    let best = '';
    let bestKm = Infinity;
    this.hubs.forEach((hub) => {
      const d = this.km(lat, lon, hub.lat, hub.lon);
      if (d <= hub.km && d < bestKm) {
        bestKm = d;
        best = hub.city;
      }
    });
    return best;
  },

  async resolve(lat, lon) {
    const city = this.hubCity(lat, lon) || await this.reverse(lat, lon);
    if (!city) return;
    this.setLabel(city);
    this.writeCache(city);
  },

  async reverse(lat, lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
      const res = await fetch(url);
      if (!res.ok) return '';
      const data = await res.json();
      const raw = data.city || data.locality || data.principalSubdivision || '';
      const listed = typeof WORLD_CLOCK_CITIES !== 'undefined'
        ? WORLD_CLOCK_CITIES.find((c) => c.city.toLowerCase() === String(raw).toLowerCase())
        : null;
      return listed ? listed.city : raw;
    } catch {
      return '';
    }
  }
};

const WORLD_CLOCKS = {
  storageKey: 'dimad_world_clocks',
  query: '',
  tones: [
    { time: 'text-brand-accent', badge: 'bg-brand-accent/10 text-brand-accent' },
    { time: 'text-brand-gold', badge: 'bg-brand-gold/10 text-brand-gold' },
    { time: 'text-brand-mint', badge: 'bg-brand-mint/10 text-brand-mint' }
  ],

  analogFace(id) {
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30) * Math.PI / 180;
      const outer = 20.5;
      const inner = i % 3 === 0 ? 16.5 : 18.2;
      const x1 = 24 + Math.sin(a) * inner;
      const y1 = 24 - Math.cos(a) * inner;
      const x2 = 24 + Math.sin(a) * outer;
      const y2 = 24 - Math.cos(a) * outer;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-opacity="${i % 3 === 0 ? '0.85' : '0.35'}" stroke-width="${i % 3 === 0 ? '1.6' : '1'}" stroke-linecap="round"/>`;
    }).join('');
    return `<svg data-world-clock-analog="${id}" class="shrink-0" viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
      <circle cx="24" cy="24" r="22.5" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.4"/>
      ${ticks}
      <line data-hand="hour" x1="24" y1="24" x2="24" y2="13.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <line data-hand="minute" x1="24" y1="24" x2="24" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <line data-hand="second" x1="24" y1="26.5" x2="24" y2="8.5" stroke="currentColor" stroke-opacity="0.7" stroke-width="0.9" stroke-linecap="round"/>
      <circle cx="24" cy="24" r="1.8" fill="currentColor"/>
    </svg>`;
  },

  selectedIds() {
    try {
      const ids = JSON.parse(localStorage.getItem(this.storageKey) || '');
      if (Array.isArray(ids) && ids.length) {
        return ids.filter((id) => WORLD_CLOCK_CITIES.some((c) => c.id === id)).slice(0, 3);
      }
    } catch (err) { /* default */ }
    return ['yerevan', 'london', 'new-york'];
  },

  persist(ids) {
    localStorage.setItem(this.storageKey, JSON.stringify(ids.slice(0, 3)));
  },

  cityById(id) {
    return WORLD_CLOCK_CITIES.find((c) => c.id === id);
  },

  offsetLabel(tz) {
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName');
      return part ? part.value.replace('GMT', 'UTC') : '';
    } catch (err) {
      return '';
    }
  },

  render() {
    const grid = document.getElementById('world-clocks-grid');
    if (!grid) return;
    const selected = this.selectedIds().map((id) => this.cityById(id)).filter(Boolean);
    grid.innerHTML = selected.map((city, idx) => {
      const tone = this.tones[idx] || this.tones[0];
      const heroes = {
        yerevan: '../assets/yerevan-clock-hero.jpg',
        london: '../assets/london-clock-hero.jpg',
        'new-york': '../assets/new-york-clock-hero.jpg'
      };
      const hero = heroes[city.id];
      const shell = hero
        ? 'relative overflow-hidden border border-amber-500/40 bg-cover bg-center p-2.5 rounded'
        : 'border border-brand-border bg-brand-panel p-2.5 rounded';
      const shellStyle = hero ? ` style="background-image:url('${hero}')"` : '';
      const overlay = hero ? '<div class="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/25"></div>' : '';
      const timeClass = hero ? 'text-amber-100' : tone.time;
      const nameClass = hero ? 'text-amber-50' : 'text-slate-400';
      const badgeClass = hero ? 'bg-amber-500/20 text-amber-100 border border-amber-200/20' : tone.badge;
      return `
        <div class="${shell} flex items-center justify-between gap-2"${shellStyle}>
          ${overlay}
          <div class="relative z-10 flex items-center gap-2.5 min-w-0 ${timeClass}">
            ${this.analogFace(city.id)}
            <div class="min-w-0">
              <p class="text-[9px] ${nameClass} font-bold">${city.city.toUpperCase()}</p>
              <p data-world-clock="${city.id}" class="text-xs font-bold font-mono ${timeClass}">--:--:--</p>
            </div>
          </div>
          <span data-world-clock-offset="${city.id}" class="relative z-10 text-[8px] ${badgeClass} px-1.5 py-0.5 rounded shrink-0">${this.offsetLabel(city.tz)}</span>
        </div>`;
    }).join('');
    this.tick();
    const panel = document.getElementById('world-clocks-picker');
    if (panel && !panel.classList.contains('hidden')) this.renderPicker(true);
  },

  partsInZone(now, tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      }).formatToParts(now);
      const num = (type) => Number((parts.find((p) => p.type === type) || {}).value || 0);
      return { hour: num('hour') % 24, minute: num('minute'), second: num('second') };
    } catch (err) {
      return null;
    }
  },

  tick() {
    const now = new Date();
    this.selectedIds().forEach((id) => {
      const city = this.cityById(id);
      const el = document.querySelector(`[data-world-clock="${id}"]`);
      if (!city || !el) return;
      const parts = this.partsInZone(now, city.tz);
      if (!parts) return;
      el.textContent = now.toLocaleTimeString('en-US', {
        timeZone: city.tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const analog = document.querySelector(`[data-world-clock-analog="${id}"]`);
      if (analog) {
        const hAng = (parts.hour % 12) * 30 + parts.minute * 0.5 + parts.second * (0.5 / 60);
        const mAng = parts.minute * 6 + parts.second * 0.1;
        const sAng = parts.second * 6;
        const hourHand = analog.querySelector('[data-hand="hour"]');
        const minuteHand = analog.querySelector('[data-hand="minute"]');
        const secondHand = analog.querySelector('[data-hand="second"]');
        if (hourHand) hourHand.setAttribute('transform', `rotate(${hAng} 24 24)`);
        if (minuteHand) minuteHand.setAttribute('transform', `rotate(${mAng} 24 24)`);
        if (secondHand) secondHand.setAttribute('transform', `rotate(${sAng} 24 24)`);
      }
      const badge = document.querySelector(`[data-world-clock-offset="${id}"]`);
      if (badge) badge.textContent = this.offsetLabel(city.tz);
    });
  },

  togglePicker() {
    const panel = document.getElementById('world-clocks-picker');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      this.renderPicker();
      const input = document.getElementById('world-clocks-search');
      if (input) {
        input.value = this.query || '';
        input.focus();
      }
    }
  },

  filterCities(value) {
    this.query = String(value || '');
    this.renderPicker();
  },

  renderPicker() {
    const list = document.getElementById('world-clocks-picker-list');
    const count = document.getElementById('world-clocks-picker-count');
    if (!list) return;
    const selected = this.selectedIds();
    const atCap = selected.length >= 3;
    if (count) count.textContent = `Pick up to 3 cities · ${selected.length}/3`;
    const q = String(this.query || '').trim().toLowerCase();
    const cities = q
      ? WORLD_CLOCK_CITIES.filter((city) =>
          city.city.toLowerCase().includes(q) ||
          city.group.toLowerCase().includes(q) ||
          city.tz.toLowerCase().includes(q)
        )
      : WORLD_CLOCK_CITIES;
    if (!cities.length) {
      list.innerHTML = `<div class="text-[11px] text-slate-500 px-1 py-2">No cities match</div>`;
      return;
    }
    let html = '';
    let lastGroup = '';
    cities.forEach((city) => {
      if (city.group !== lastGroup) {
        lastGroup = city.group;
        html += `<div class="text-[9px] font-bold text-amber-400/80 uppercase tracking-wide px-1 pt-2 pb-0.5">${city.group}</div>`;
      }
      const checked = selected.includes(city.id);
      const disabled = atCap && !checked;
      html += `
        <label class="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-slate-900 ${disabled ? 'opacity-40' : 'cursor-pointer'}">
          <input type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} onchange="WORLD_CLOCKS.toggleCity('${city.id}', this.checked)" class="accent-amber-400">
          <span class="text-[11px] text-slate-200">${city.city}</span>
        </label>`;
    });
    list.innerHTML = html;
  },

  toggleCity(id, on) {
    let ids = this.selectedIds();
    if (on) {
      if (ids.includes(id) || ids.length >= 3) return this.renderPicker();
      ids.push(id);
    } else {
      ids = ids.filter((item) => item !== id);
    }
    this.persist(ids);
    this.render();
  }
};

function updateClocks() {
  if (typeof WORLD_CLOCKS !== 'undefined') WORLD_CLOCKS.tick();
}

function setIdentityHeaderState(id, active) {
  const btn = document.getElementById(`btn-identity-${id}`);
  const chevron = document.querySelector(`[data-identity-chevron="${id}"]`);
  if (!btn) return;

  btn.classList.remove('bg-brand-accent/10', 'border-brand-accent/40', 'text-brand-accent', 'bg-brand-mint/10', 'border-brand-mint/40', 'text-brand-mint', 'bg-brand-black/40', 'border-brand-border/60', 'text-slate-300');
  if (active) {
    btn.classList.add('bg-brand-accent/10', 'border-brand-accent/40', 'text-brand-accent');
  } else {
    btn.classList.add('bg-brand-black/40', 'border-brand-border/60', 'text-slate-300');
  }

  if (chevron) {
    chevron.classList.toggle('fa-chevron-down', active);
    chevron.classList.toggle('fa-chevron-right', !active);
    chevron.classList.toggle('text-slate-500', !active);
  }
}

function renderModeNav(mode) {
  const container = document.getElementById(`subnav-${mode}`);
  const config = MODE_NAV[mode];
  if (!container || !config) return;

  container.innerHTML = config.items.map((item) => {
    const color = item.highlight ? 'text-amber-400 font-semibold hover:text-amber-300' : 'text-slate-400 hover:text-slate-200';
    const badge = item.premium
      ? '<span class="text-[7px] bg-brand-gold/15 text-brand-gold border border-brand-gold/40 px-1 py-0.5 rounded uppercase tracking-wide">Premium</span>'
      : '';
    return `
      <button type="button" onclick="switchTab('${item.id}')" class="sub-nav-btn ${color} flex items-center justify-between gap-1 w-full text-left py-1 px-2 rounded">
        <span>${item.label}</span>
        ${badge}
      </button>
    `;
  }).join('');
}

function openSalesRevenue() {
  const sub = document.getElementById('subnav-entrepreneur');
  if (sub && sub.classList.contains('hidden')) {
    currentActiveMode = 'entrepreneur';
    renderModeNav('entrepreneur');
    sub.classList.remove('hidden');
    setIdentityHeaderState('entrepreneur', true);
  }
  switchTab('ent-crm');
}

function openStocksFromTicker() {
  const sub = document.getElementById('subnav-entrepreneur');
  if (sub && sub.classList.contains('hidden')) {
    currentActiveMode = 'entrepreneur';
    renderModeNav('entrepreneur');
    sub.classList.remove('hidden');
    setIdentityHeaderState('entrepreneur', true);
  }
  switchTab('ent-stocks');
}

function openCreatorWriteSpace() {
  closeDimDriveNav();
  ['entrepreneur', 'creator', 'nomad', 'community'].forEach((mode) => {
    const sub = document.getElementById(`subnav-${mode}`);
    if (!sub) return;
    if (mode === 'creator') {
      currentActiveMode = 'creator';
      renderModeNav('creator');
      sub.classList.remove('hidden');
      setIdentityHeaderState('creator', true);
    } else {
      sub.classList.add('hidden');
      setIdentityHeaderState(mode, false);
    }
  });
  if (typeof WRITESPACE !== 'undefined' && WRITESPACE.state) {
    const s = WRITESPACE.state();
    if (s.fullscreen) {
      s.fullscreen = false;
      WRITESPACE.persist(s);
    }
  }
  switchTab('creator-writespace');
}

function switchIdentity(id) {
  const sub = document.getElementById(`subnav-${id}`);
  if (!sub || !MODE_NAV[id]) return;

  const isOpen = !sub.classList.contains('hidden');
  if (isOpen) {
    sub.classList.add('hidden');
    setIdentityHeaderState(id, false);
    return;
  }

  currentActiveMode = id;
  renderModeNav(id);
  sub.classList.remove('hidden');
  setIdentityHeaderState(id, true);
  switchTab(MODE_NAV[id].defaultTab);
}

function switchTab(tabId) {
  if (tabId === 'settings') {
    openSettingsVaultNav('dim-wallet');
    return;
  }
  if (tabId === 'dimad-ai-hub') {
    openDimadAiNav();
    return;
  }
  if (tabId === 'ent-ai-business') {
    openDimadAiNav('business');
    return;
  }
  if (tabId === 'creator-ai') {
    openDimadAiNav('creator');
    return;
  }
  if (tabId === 'nomad-ai') {
    openDimadAiNav('travel');
    return;
  }
  if (tabId === 'nomad-concierge') {
    openConciergeNav();
    return;
  }
  if (tabId === 'dimad-dimdrive') {
    openDimDriveNav();
    return;
  }
  closeDimDriveNav();
  document.querySelectorAll('.tab-view').forEach((el) => {
    if (el.id === 'view-nomad-concierge' || el.id === 'view-dimad-dimdrive') return;
    if (el.closest && el.closest('#dimad-ai-engine-stage')) return;
    el.classList.add('hidden');
  });
  const target = document.getElementById(`view-${tabId}`);
  if (target) target.classList.remove('hidden');
  if (typeof DIMAD_NOTEPAD !== 'undefined' && tabId !== 'dimad-notepad') {
    DIMAD_NOTEPAD.unmount();
  }
  if (tabId === 'dimad-notepad' && typeof DIMAD_NOTEPAD !== 'undefined') {
    DIMAD_NOTEPAD.mount();
  }
  if (tabId === 'ent-stocks' && typeof FINNHUB_MARKETS !== 'undefined') {
    FINNHUB_MARKETS.open();
  }
  if (tabId === 'ent-dashboard' && typeof COMMAND_CENTER !== 'undefined') {
    COMMAND_CENTER.apply();
  }
  if (tabId === 'creator-studio' && typeof DIMAD_STUDIO !== 'undefined') {
    DIMAD_STUDIO.apply();
  }
  if (tabId === 'dimad-calendar' && typeof DIMAD_CAL !== 'undefined') {
    DIMAD_CAL.renderFull();
  }
  if (typeof BUSINESS_AI !== 'undefined' && tabId !== 'ent-ai-business' && !(typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('business'))) {
    BUSINESS_AI.unmount();
  }
  if (tabId === 'ent-ai-business' && typeof BUSINESS_AI !== 'undefined') {
    BUSINESS_AI.mount();
  }
  if (typeof NOMAD_AI !== 'undefined' && tabId !== 'nomad-ai' && !(typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('travel'))) {
    NOMAD_AI.unmount();
  }
  if (tabId === 'nomad-ai' && typeof NOMAD_AI !== 'undefined') {
    NOMAD_AI.mount();
  }
  if (typeof CREATOR_AI !== 'undefined' && tabId !== 'creator-ai' && !(typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('creator'))) {
    CREATOR_AI.unmount();
  }
  if (tabId === 'creator-ai' && typeof CREATOR_AI !== 'undefined') {
    CREATOR_AI.mount();
  }
  if (tabId === 'creator-writespace' && typeof WRITESPACE !== 'undefined') {
    WRITESPACE.mount();
  }
  if (tabId === 'creator-design' && typeof DESIGN_SUITE !== 'undefined') {
    DESIGN_SUITE.mount();
  }
  if (tabId === 'creator-pipeline' && typeof PIPELINE !== 'undefined') {
    PIPELINE.mount();
  }
  if (tabId === 'creator-scheduler' && typeof SCHEDULER !== 'undefined') {
    SCHEDULER.mount();
  }
  if (tabId === 'creator-vault' && typeof MEDIA_VAULT !== 'undefined') {
    MEDIA_VAULT.mount();
  }
  if (tabId === 'nomad-guides' && typeof TRAVEL_GUIDES !== 'undefined') {
    TRAVEL_GUIDES.mount();
  }
  if (tabId === 'nomad-maps' && typeof DIGITAL_MAPS !== 'undefined') {
    DIGITAL_MAPS.mount();
  }
  if (tabId === 'nomad-toolbox' && typeof TRAVEL_TOOLBOX !== 'undefined') {
    TRAVEL_TOOLBOX.mount();
  }
  if (tabId === 'nomad-language' && typeof LANGUAGE_KIT !== 'undefined') {
    LANGUAGE_KIT.mount();
  }
  if (tabId === 'ent-goals') {
    initGoalsRewards();
    if (typeof FOCUS_LOG !== 'undefined') FOCUS_LOG.render();
  }
  if (tabId === 'ent-tasks' && typeof TASK_MANAGER !== 'undefined') {
    TASK_MANAGER.mount();
  }
  if (tabId === 'ent-crm' && typeof DIMAD_SHEET !== 'undefined') {
    DIMAD_SHEET.mount();
  }
  if (tabId === 'ent-invoices' && typeof INVOICES !== 'undefined') {
    INVOICES.mount();
  }
}

function openConciergeNav() {
  const panel = document.getElementById('view-nomad-concierge');
  if (!panel) return;
  if (panel.parentElement !== document.body) document.body.appendChild(panel);
  panel.classList.remove('hidden');
  panel.classList.add('flex');
  if (typeof CONCIERGE !== 'undefined') CONCIERGE.mount();
}

function closeConciergeNav() {
  const panel = document.getElementById('view-nomad-concierge');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.classList.remove('flex');
}

function openDimDriveNav() {
  const panel = document.getElementById('view-dimad-dimdrive');
  if (!panel) return;
  if (panel.parentElement !== document.body) document.body.appendChild(panel);
  panel.classList.remove('hidden');
  panel.classList.add('flex');
  panel.style.zIndex = '400';
  if (typeof DIMDRIVE !== 'undefined') {
    if (!DIMDRIVE.viewMode) DIMDRIVE.viewMode = 'list';
    DIMDRIVE.render();
  }
}

function closeDimDriveNav() {
  const panel = document.getElementById('view-dimad-dimdrive');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.classList.remove('flex');
}

function resolveDimTier() {
  const raw = String(localStorage.getItem('dimad_tier') || 'PRO').toUpperCase();
  if (raw === 'FREE' || raw === 'EXPLORE' || raw === 'PRO' || raw === 'EXECUTIVE') return raw;
  if (raw === 'PROFESSIONAL' || raw === 'PREMIUM') return 'PRO';
  if (raw === 'VIP' || raw === 'UNLIMITED' || raw === 'VIP UNLIMITED' || raw === 'VIP_UNLIMITED') return 'EXECUTIVE';
  return 'PRO';
}

function loadAiQuota() {
  try {
    const raw = JSON.parse(localStorage.getItem('dimad_ai_quota') || '');
    if (raw && typeof raw.queriesUsedThisPeriod === 'number' && raw.periodStartDate) {
      return raw;
    }
  } catch (err) {
    /* use a fresh period */
  }
  return {
    queriesUsedThisPeriod: 0,
    periodStartDate: new Date().toISOString()
  };
}

function persistAiQuota() {
  try {
    localStorage.setItem('dimad_ai_quota', JSON.stringify(DIM_ENGINE.userQuota));
  } catch (err) {
    /* ignore quota persist failures */
  }
}

const DIMAD_AI_USAGE = {
  storageKey: 'dimad_platform_ai_usage',
  engines: [
    { id: 'business', label: 'Business AI', icon: '💼' },
    { id: 'creator', label: 'Creator AI', icon: '🎨' },
    { id: 'travel', label: 'Nomad AI', icon: '✈️' },
    { id: 'hub', label: 'Dimad AI Hub', icon: '⚡' }
  ],

  monthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  monthLabel() {
    return new Date().toLocaleDateString([], { month: 'long', year: 'numeric' });
  },

  defaults() {
    return {
      monthKey: this.monthKey(),
      units: { business: 18, creator: 16, travel: 8, hub: 0 }
    };
  },

  load() {
    let state = this.defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || '');
      if (saved && saved.units) state = { ...state, ...saved, units: { ...state.units, ...saved.units } };
    } catch (_) { /* seed */ }
    if (state.monthKey !== this.monthKey()) state = this.defaults();
    this._state = state;
    return state;
  },

  persist() {
    try { localStorage.setItem(this.storageKey, JSON.stringify(this._state || this.load())); } catch (_) { /* ignore */ }
  },

  total() {
    const units = this.load().units || {};
    return this.engines.reduce((sum, e) => sum + (Number(units[e.id]) || 0), 0);
  },

  percent() {
    return Math.max(0, Math.min(100, this.total()));
  },

  record(engineId, amount) {
    const s = this.load();
    const key = this.engines.some((e) => e.id === engineId) ? engineId : 'hub';
    s.units[key] = Math.max(0, (Number(s.units[key]) || 0) + (Number(amount) || 2));
    this._state = s;
    this.persist();
    this.paint();
  },

  paint() {
    const pct = this.percent();
    const tone = pct > 80 ? 'bg-brand-gold' : 'bg-brand-mint';
    ['dimad-ai-usage-bar', 'bai-usage-bar', 'cai-usage-bar', 'nai-usage-bar', 'sub-ai-usage-bar'].forEach((id) => {
      const bar = document.getElementById(id);
      if (!bar) return;
      bar.style.width = pct + '%';
      bar.className = `h-full rounded-full ${tone}`;
    });
    ['dimad-ai-usage-pct', 'bai-usage-pct', 'cai-usage-pct', 'nai-usage-pct', 'sub-ai-usage-pct'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = pct + '%';
    });
    const used = document.getElementById('sub-ai-usage-used');
    if (used) used.textContent = pct + '% used this month';
    this.renderPage();
  },

  openSubscription() {
    if (typeof openSettingsVaultNav === 'function') openSettingsVaultNav('subscription');
  },

  renderPage() {
    const root = document.getElementById('sub-ai-usage-breakdown');
    const label = document.getElementById('sub-ai-usage-month');
    if (label) label.textContent = this.monthLabel();
    if (!root) return;
    const s = this.load();
    const total = Math.max(this.total(), 1);
    root.innerHTML = this.engines.map((engine) => {
      const value = Number(s.units[engine.id]) || 0;
      const share = Math.round((value / total) * 100);
      return `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
        <div class="flex items-center justify-between gap-2 text-[11px]">
          <span class="text-slate-200 font-semibold">${engine.icon} ${engine.label}</span>
          <span class="font-mono text-brand-gold">${value}%</span>
        </div>
        <div class="bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div class="h-full rounded-full bg-brand-gold" style="width:${share}%"></div>
        </div>
        <p class="text-[10px] text-slate-500">${share}% of this month's usage</p>
      </div>`;
    }).join('');
  }
};
window.DIMAD_AI_USAGE = DIMAD_AI_USAGE;

// DIMAD OS: $DIM ECONOMICS — 16,000 $DIM = $10.00 USD ($1 $DIM = $0.000625)
const DIM_ENGINE = {
  peg: {
    tokensPerDollar: 1600
  },

  tierConfigs: {
    FREE: {
      name: 'Free Account',
      price: 0,
      multiplier: 1.00,
      canRedeem: false,
      monthlyDeposit: 0,
      maxDiscountCapUsd: 0,
      maxDiscountCapDim: 0,
      aiModelTier: 'Gemini Flash',
      aiLimitType: 'daily',
      aiLimitMax: 50,
      aiFallbackModel: null
    },
    EXPLORE: {
      name: 'Explore Tier ($9/mo)',
      price: 9,
      multiplier: 1.00,
      canRedeem: true,
      monthlyDeposit: 1500,
      maxDiscountCapUsd: 4.50,
      maxDiscountCapDim: 7200,
      aiModelTier: 'Standard Production Models',
      aiLimitType: 'weekly',
      aiLimitMax: 1000,
      aiFallbackModel: 'Gemini Flash'
    },
    PRO: {
      name: 'Premium Tier ($59/mo)',
      price: 59,
      multiplier: 1.15,
      canRedeem: true,
      monthlyDeposit: 10000,
      maxDiscountCapUsd: 29.50,
      maxDiscountCapDim: 47200,
      aiModelTier: 'UNLIMITED Standard AI',
      aiLimitType: 'unlimited',
      aiLimitMax: Infinity,
      aiFallbackModel: null
    },
    EXECUTIVE: {
      name: 'Unlimited VIP Tier ($199/mo)',
      price: 199,
      multiplier: 1.50,
      canRedeem: true,
      monthlyDeposit: 30000,
      maxDiscountCapUsd: 99.50,
      maxDiscountCapDim: 159200,
      aiModelTier: 'UNLIMITED Deep Reasoning AI',
      aiLimitType: 'unlimited',
      aiLimitMax: Infinity,
      aiFallbackModel: null
    }
  },

  user: {
    tier: resolveDimTier(),
    streakDays: 0,
    restShields: 2,
    loggedFocusHours: 45,
    totalDimBalance: 18400
  },

  userQuota: loadAiQuota(),

  streakMilestones: [
    { days: 10, baseReward: 1000 },
    { days: 30, baseReward: 2000 },
    { days: 50, baseReward: 3000 },
    { days: 75, baseReward: 4000 },
    { days: 100, baseReward: 5000 },
    { days: 125, baseReward: 6000 },
    { days: 150, baseReward: 7000 },
    { days: 180, baseReward: 8000 },
    { days: 200, baseReward: 9000 },
    { days: 250, baseReward: 10000 },
    { days: 300, baseReward: 11000 },
    { days: 365, baseReward: 12000 }
  ],

  mintTokens(baseAmount, reason = 'Execution Yield') {
    const activeTier = this.tierConfigs[this.user.tier];
    const finalAmount = Math.round(baseAmount * activeTier.multiplier);
    this.user.totalDimBalance += finalAmount;
    console.log(`[DIM MINT] +${finalAmount} $DIM (${reason}) | Tier: ${activeTier.name} (${activeTier.multiplier}x)`);
    this.updateUI();
    return finalAmount;
  },

  dimToUsd(dimAmount) {
    return (dimAmount / this.peg.tokensPerDollar).toFixed(2);
  },

  getSubscriptionDiscount() {
    const activeTier = this.tierConfigs[this.user.tier];
    if (!activeTier.canRedeem || activeTier.price === 0) {
      return { discountAppliedUsd: '0.00', finalCashDue: activeTier.price.toFixed(2) };
    }

    const availableUsdValue = parseFloat(this.dimToUsd(this.user.totalDimBalance));
    const discountApplied = Math.min(availableUsdValue, activeTier.maxDiscountCapUsd);
    const finalBillCash = activeTier.price - discountApplied;

    return {
      discountAppliedUsd: discountApplied.toFixed(2),
      finalCashDue: finalBillCash.toFixed(2)
    };
  },

  redeemConcierge() {
    if (typeof closeSettingsVaultNav === 'function') closeSettingsVaultNav();
    if (typeof openConciergeNav === 'function') openConciergeNav();
  },

  applySubscriptionOffset() {
    const activeTier = this.tierConfigs[this.user.tier];
    if (!activeTier.canRedeem) {
      alert('Subscription offsets require an active paid tier.');
      switchVaultTab('subscription');
      return;
    }
    const discount = this.getSubscriptionDiscount();
    alert(`Successfully applied $${discount.discountAppliedUsd} offset to your monthly plan! Final bill due: $${discount.finalCashDue}/mo.`);
  },

  issueOnwardTicket() {
    const activeTier = this.tierConfigs[this.user.tier];
    if (!activeTier.canRedeem) {
      alert('Vault Redemptions are locked on Free accounts.');
      return;
    }
    const cost = 2500;
    if (this.user.totalDimBalance < cost) {
      alert('Insufficient $DIM balance. Required: 2,500 $DIM.');
      return;
    }
    this.user.totalDimBalance -= cost;
    alert('Onward flight reservation issued! Check your Travel Vault.');
    this.updateUI();
  },

  updateUI() {
    const activeTier = this.tierConfigs[this.user.tier];
    const discount = this.getSubscriptionDiscount();

    const freeLockBanner = document.getElementById('free-tier-lock-banner');
    if (freeLockBanner) {
      if (!activeTier.canRedeem) {
        freeLockBanner.classList.remove('hidden');
      } else {
        freeLockBanner.classList.add('hidden');
      }
    }

    document.querySelectorAll('.user-tier-badge').forEach((el) => {
      el.textContent = `${activeTier.name} (${activeTier.multiplier}x Yield)`;
    });
    const balanceLabel = `${this.user.totalDimBalance.toLocaleString()} $DIM`;
    document.querySelectorAll('.dim-balance-display').forEach((el) => {
      el.textContent = balanceLabel;
    });
    const headerBalance = document.getElementById('dim-balance');
    if (headerBalance) headerBalance.textContent = balanceLabel;
    document.querySelectorAll('.dim-usd-value').forEach((el) => {
      el.textContent = `$${this.dimToUsd(this.user.totalDimBalance)} USD`;
    });
    document.querySelectorAll('.dim-multiplier-display').forEach((el) => {
      el.textContent = `${activeTier.multiplier}x Yield`;
    });
    document.querySelectorAll('.sub-discount-display').forEach((el) => {
      el.textContent = `-$${discount.discountAppliedUsd} / mo`;
    });
    document.querySelectorAll('.sub-final-cash').forEach((el) => {
      el.textContent = `$${discount.finalCashDue} / mo`;
    });
    this.renderStreakTrack();
    renderAiQuotaUi();
  },

  renderStreakTrack() {
    const days = (typeof CLOCK_IN !== 'undefined' && CLOCK_IN.yearDays) ? CLOCK_IN.yearDays() : (this.user.streakDays || 0);
    this.user.streakDays = days;
    const milestones = this.streakMilestones;
    const next = milestones.find((m) => m.days > days);
    const label = next
      ? `Next Milestone: <strong class="text-slate-200">${next.days} Days</strong> · ${next.baseReward.toLocaleString()} $DIM · ${next.days - days} day${next.days - days === 1 ? '' : 's'} remaining`
      : '365 clock-in days complete — all year milestones claimed';
    document.querySelectorAll('[data-streak-badge]').forEach((el) => {
      el.textContent = `${days}d`;
    });
    document.querySelectorAll('[data-streak-next]').forEach((el) => {
      el.innerHTML = label;
    });
  }
};

window.DIM_ENGINE = DIM_ENGINE;

function openSettingsVaultNav(defaultTab) {
  const panel = document.getElementById('settings-vault-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.classList.add('flex');
  DIM_ENGINE.updateUI();
  switchVaultTab(defaultTab || 'dim-wallet');
}

function closeSettingsVaultNav() {
  const panel = document.getElementById('settings-vault-panel');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.classList.remove('flex');
}

function switchVaultTab(tabName) {
  document.querySelectorAll('.vault-tab-content').forEach((el) => el.classList.add('hidden'));

  document.querySelectorAll('.vault-tab-btn').forEach((btn) => {
    btn.classList.remove('text-amber-400', 'bg-amber-500/10', 'border', 'border-amber-500/20', 'font-bold');
    btn.classList.add('text-slate-400');
  });

  const targetContent = document.getElementById(`vault-tab-${tabName}`);
  const targetBtn = document.querySelector(`.vault-tab-btn[data-tab="${tabName}"]`);

  if (targetContent) targetContent.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.classList.remove('text-slate-400');
    targetBtn.classList.add('text-amber-400', 'bg-amber-500/10', 'border', 'border-amber-500/20', 'font-bold');
  }
  if (tabName === 'subscription' && typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.paint();
}

const DIMAD_AI_STATE = {
  activeMode: 'business',
  activeChatId: null,
  chats: [],
  pinnedVault: [],
  pinnedFilter: 'all',
  selectedPinIds: [],
  modes: {
    business: {
      icon: '💼',
      title: 'Business AI Command',
      desc: 'Strategy, unit economics, and high-agency scaling.',
      placeholder: "Ask Business AI anything... (e.g. 'Map out my Q3 pricing model')"
    },
    creator: {
      icon: '🎨',
      title: 'Creator AI Studio',
      desc: 'Content pipelines, brand aesthetics, and audience loops.',
      placeholder: 'Ask Creator AI anything... (e.g. draft a launch hook)'
    },
    travel: {
      icon: '✈️',
      title: 'Nomad AI',
      desc: 'Nomad routes, boutique stays, and flight coordination.',
      placeholder: 'Ask Nomad AI anything... (e.g. 10-day Yerevan to Tbilisi)'
    }
  }
};

function escapeAiHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DIMAD_AI_HOST = {
  engines: {
    business: { viewId: 'view-ent-ai-business', railId: 'bai-rail', engine: () => window.BUSINESS_AI },
    creator: { viewId: 'view-creator-ai', railId: 'cai-rail', engine: () => window.CREATOR_AI },
    travel: { viewId: 'view-nomad-ai', railId: 'nai-rail', engine: () => window.NOMAD_AI }
  },

  isOpen() {
    const panel = document.getElementById('dimad-ai-panel');
    return !!(panel && !panel.classList.contains('hidden'));
  },

  holding(modeKey) {
    return this.isOpen() && DIMAD_AI_STATE.activeMode === modeKey;
  },

  home() {
    return document.getElementById('view-container');
  },

  stage() {
    return document.getElementById('dimad-ai-engine-stage');
  },

  active() {
    return this.engines[DIMAD_AI_STATE.activeMode] || this.engines.business;
  },

  hideRail(id) {
    const rail = document.getElementById(id);
    if (!rail) return;
    rail.classList.add('hidden');
    rail.classList.remove('flex');
  },

  setUsageChips(view, hide) {
    if (!view) return;
    view.querySelectorAll('.engine-usage-chip').forEach((el) => el.classList.toggle('hidden', !!hide));
  },

  paintUsage() {
    if (typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.paint();
  },

  openUsage() {
    if (typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.openSubscription();
  },

  restoreView(spec) {
    const view = document.getElementById(spec.viewId);
    const home = this.home();
    if (!view || !home) return;
    this.setUsageChips(view, false);
    if (view.parentElement !== home) home.appendChild(view);
    view.classList.add('hidden');
    view.classList.remove('h-full', 'min-h-0', 'overflow-hidden');
    this.hideRail(spec.railId);
    const engine = spec.engine();
    if (engine && engine.unmount) engine.unmount();
  },

  parkOthers(keepKey) {
    Object.keys(this.engines).forEach((key) => {
      if (key === keepKey) return;
      this.restoreView(this.engines[key]);
    });
  },

  show(modeKey) {
    const spec = this.engines[modeKey] || this.engines.business;
    const stage = this.stage();
    const view = document.getElementById(spec.viewId);
    if (!stage || !view) return;
    this.parkOthers(modeKey);
    stage.appendChild(view);
    view.classList.remove('hidden');
    view.classList.add('h-full', 'min-h-0', 'overflow-hidden');
    stage.classList.remove('hidden');
    const chrome = document.getElementById('dimad-ai-hub-chrome');
    if (chrome) chrome.classList.add('hidden');
    const engine = spec.engine();
    if (engine && engine.mount) engine.mount();
    this.hideRail(spec.railId);
    this.setUsageChips(view, true);
    this.paintUsage();
    this.syncChats();
  },

  close() {
    Object.keys(this.engines).forEach((key) => this.restoreView(this.engines[key]));
    const stage = this.stage();
    if (stage) stage.classList.add('hidden');
  },

  newChat() {
    const engine = this.active().engine();
    if (engine && engine.newChat) engine.newChat();
    this.syncChats();
  },

  openChat(id) {
    const engine = this.active().engine();
    if (engine && engine.openChat) engine.openChat(id);
    this.syncChats();
  },

  syncChats() {
    if (typeof renderChatList === 'function') renderChatList();
  }
};

function openDimadAiNav(modeKey) {
  const panel = document.getElementById('dimad-ai-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.classList.add('flex');
  switchAiMode(modeKey || DIMAD_AI_STATE.activeMode || 'business');
  renderAiQuotaUi();
}

function closeDimadAiNav() {
  DIMAD_AI_HOST.close();
  const panel = document.getElementById('dimad-ai-panel');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.classList.remove('flex');
}

function switchAiMode(modeKey) {
  const config = DIMAD_AI_STATE.modes[modeKey];
  if (!config) return;
  DIMAD_AI_STATE.activeMode = modeKey;

  const icon = document.getElementById('active-mode-icon');
  const title = document.getElementById('active-mode-title');
  const desc = document.getElementById('active-mode-desc');
  const input = document.getElementById('chat-input-box');
  if (icon) icon.textContent = config.icon;
  if (title) title.textContent = config.title;
  if (desc) desc.textContent = config.desc;
  if (input) input.placeholder = config.placeholder;

  document.querySelectorAll('.ai-mode-btn').forEach((btn) => {
    btn.classList.remove('text-amber-400', 'text-brand-gold', 'bg-amber-500/10', 'border', 'border-amber-500/20', 'font-bold');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.querySelector(`.ai-mode-btn[data-mode="${modeKey}"]`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('text-amber-400', 'bg-amber-500/10', 'border', 'border-amber-500/20', 'font-bold');
  }

  if (DIMAD_AI_HOST.isOpen()) DIMAD_AI_HOST.show(modeKey);
}

let currentSelectedSnippet = '';

function pinMessage(btnElement) {
  const group = btnElement && btnElement.closest ? btnElement.closest('.group') : null;
  const messageBox = group ? group.querySelector('p') : null;
  currentSelectedSnippet = messageBox ? messageBox.innerText : 'Pinned concept snippet.';

  const snippetEl = document.getElementById('modal-pinned-snippet');
  const summaryEl = document.getElementById('modal-ai-summary');
  if (snippetEl) snippetEl.textContent = `"${currentSelectedSnippet}"`;
  if (summaryEl) {
    summaryEl.innerHTML = `
      <strong>Mode:</strong> ${escapeAiHtml(DIMAD_AI_STATE.activeMode.toUpperCase())} AI<br>
      <strong>Key Takeaway:</strong> High-leverage executive framework extracted from thread.<br>
      <strong>Actionable Next Step:</strong> Review and integrate into operational dashboard.
    `;
  }

  const modal = document.getElementById('pin-summary-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closePinModal() {
  const modal = document.getElementById('pin-summary-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function chatModeMeta(mode) {
  const map = {
    business: { label: 'BUSINESS AI', icon: '💼', category: 'business', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    creator: { label: 'CREATOR AI', icon: '🎨', category: 'writing', className: 'text-brand-gold bg-brand-gold/10 border-brand-gold/20' },
    travel: { label: 'TRAVEL AI', icon: '✈️', category: 'travel', className: 'text-sky-400 bg-sky-500/10 border-sky-500/20' }
  };
  return map[mode] || { label: 'INSPIRATION', icon: '💡', category: 'inspiration', className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' };
}

function persistAiChats() {
  try {
    localStorage.setItem('dimad_ai_chats', JSON.stringify({
      chats: DIMAD_AI_STATE.chats,
      pinnedVault: DIMAD_AI_STATE.pinnedVault,
      activeChatId: DIMAD_AI_STATE.activeChatId
    }));
  } catch (err) {
    /* ignore */
  }
}

function loadAiChats() {
  try {
    const raw = JSON.parse(localStorage.getItem('dimad_ai_chats') || '');
    if (raw && Array.isArray(raw.chats)) {
      DIMAD_AI_STATE.chats = raw.chats;
      DIMAD_AI_STATE.pinnedVault = Array.isArray(raw.pinnedVault) ? raw.pinnedVault : [];
      DIMAD_AI_STATE.activeChatId = raw.activeChatId || null;
    }
  } catch (err) {
    /* start empty */
  }
}

function starterAiMessage(mode) {
  const starters = {
    business: 'Here is your high-agency growth loop framework: Focus exclusively on high-value B2B creators, charge a premium VIP Unlimited subscription ($199/mo), and reward execution via our $DIM proof-of-work token.',
    creator: 'Ready to draft, outline, and ship. Tell me the asset: essay, hook, chapter, or brand system.',
    travel: 'Ready to plan the next node. Share dates, budget, and whether you need flights, stays, or a visa-safe onward ticket.'
  };
  return starters[mode] || starters.business;
}

function captureChatMessagesFromDom() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return [];
  const messages = [];
  container.querySelectorAll(':scope > div').forEach((row) => {
    const isUser = row.classList.contains('justify-end');
    const p = row.querySelector('p');
    const bubble = row.querySelector('div.bg-amber-500, p, .rounded-2xl');
    const text = p ? p.innerText : (bubble ? bubble.innerText : '');
    if (!text.trim()) return;
    messages.push({ role: isUser ? 'user' : 'ai', text: text.trim() });
  });
  return messages;
}

function renderChatMessages(messages) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  container.innerHTML = (messages || []).map((msg) => {
    if (msg.role === 'user') {
      return `
        <div class="flex items-start justify-end space-x-3">
          <div class="bg-amber-500 text-slate-950 p-4 rounded-2xl text-xs max-w-2xl font-medium">${escapeAiHtml(msg.text)}</div>
        </div>`;
    }
    return `
      <div class="flex items-start space-x-3 max-w-2xl">
        <div class="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">AI</div>
        <div class="space-y-2 group relative">
          <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs text-slate-200 leading-relaxed shadow-lg">
            <p>${escapeAiHtml(msg.text)}</p>
          </div>
          <div class="absolute -right-12 top-2 opacity-0 group-hover:opacity-100 transition">
            <button type="button" onclick="pinMessage(this)" class="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg shadow transition" title="Pin this idea">📌</button>
          </div>
        </div>
      </div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function titleFromMessages(messages, mode) {
  const firstUser = (messages || []).find((m) => m.role === 'user');
  if (firstUser && firstUser.text) return firstUser.text.slice(0, 42);
  return `${DIMAD_AI_STATE.modes[mode]?.title || 'Chat'} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function persistActiveChat() {
  if (!DIMAD_AI_STATE.activeChatId) return;
  const chat = DIMAD_AI_STATE.chats.find((c) => c.id === DIMAD_AI_STATE.activeChatId);
  if (!chat) return;
  chat.messages = captureChatMessagesFromDom();
  chat.mode = DIMAD_AI_STATE.activeMode;
  chat.updatedAt = Date.now();
  chat.title = titleFromMessages(chat.messages, chat.mode);
  persistAiChats();
  renderChatList();
}

function startNewChat(keepExistingIfEmpty) {
  if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen()) {
    DIMAD_AI_HOST.newChat();
    return;
  }
  if (keepExistingIfEmpty) {
    if (!DIMAD_AI_STATE.activeChatId && DIMAD_AI_STATE.chats[0]) {
      DIMAD_AI_STATE.activeChatId = DIMAD_AI_STATE.chats[0].id;
    }
    const existing = DIMAD_AI_STATE.chats.find((c) => c.id === DIMAD_AI_STATE.activeChatId);
    if (existing) {
      renderChatMessages(existing.messages);
      renderChatList();
      return;
    }
  }
  persistActiveChat();
  const mode = DIMAD_AI_STATE.activeMode || 'business';
  const chat = {
    id: `chat-${Date.now()}`,
    mode,
    title: 'New chat',
    updatedAt: Date.now(),
    messages: [{ role: 'ai', text: starterAiMessage(mode) }]
  };
  DIMAD_AI_STATE.chats.unshift(chat);
  DIMAD_AI_STATE.activeChatId = chat.id;
  persistAiChats();
  renderChatMessages(chat.messages);
  renderChatList();
}

function loadChat(chatId) {
  if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen()) {
    DIMAD_AI_HOST.openChat(chatId);
    return;
  }
  persistActiveChat();
  const chat = DIMAD_AI_STATE.chats.find((c) => c.id === chatId);
  if (!chat) return;
  DIMAD_AI_STATE.activeChatId = chatId;
  switchAiMode(chat.mode || 'business');
  renderChatMessages(chat.messages);
  persistAiChats();
  renderChatList();
}

function renderChatList() {
  const list = document.getElementById('chat-history-list');
  const count = document.getElementById('chat-count');
  const hosted = typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen();
  const engine = hosted ? DIMAD_AI_HOST.active().engine() : null;
  const chats = hosted && engine && engine.chats ? engine.chats().filter((c) => !c.archived) : DIMAD_AI_STATE.chats;
  const activeId = hosted && engine && engine.state ? engine.state().activeChatId : DIMAD_AI_STATE.activeChatId;
  if (count) count.textContent = String((chats || []).length);
  if (!list) return;
  if (!(chats || []).length) {
    list.innerHTML = `<div class="text-slate-500 italic text-[11px] px-2 py-1">No chats yet. Start a conversation and it will auto-save here.</div>`;
    return;
  }
  list.innerHTML = chats.map((chat) => {
    const active = String(chat.id) === String(activeId);
    return `
      <button type="button" onclick="loadChat('${chat.id}')" class="w-full text-left px-2 py-1 rounded border leading-tight ${active ? 'border-amber-500/40 bg-amber-500/10 text-slate-100' : 'border-transparent text-slate-300 hover:bg-slate-800/50'}">
        <p class="text-[11px] font-semibold truncate">${escapeAiHtml(chat.title || 'Untitled chat')}</p>
      </button>`;
  }).join('');
}

function savePinnedIdeaToVault() {
  const summaryEl = document.getElementById('modal-ai-summary');
  DIMAD_AI_STATE.pinnedVault.unshift({
    id: `pin-${Date.now()}`,
    chatId: DIMAD_AI_STATE.activeChatId,
    mode: DIMAD_AI_STATE.activeMode,
    title: (currentSelectedSnippet || 'Pinned insight').slice(0, 48),
    snippet: currentSelectedSnippet,
    summary: summaryEl ? summaryEl.innerText : '',
    date: new Date().toLocaleDateString(),
    createdAt: Date.now()
  });
  persistAiChats();
  closePinModal();
}

function openPinnedChatsPage() {
  const panel = document.getElementById('pinned-chats-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.classList.add('flex');
  DIMAD_AI_STATE.pinnedFilter = 'all';
  DIMAD_AI_STATE.selectedPinIds = [];
  const search = document.getElementById('vault-search-input');
  if (search && !search.dataset.bound) {
    search.dataset.bound = 'true';
    search.addEventListener('input', renderPinnedChatsExplorer);
  }
  renderPinnedChatsExplorer();
}

function closePinnedChatsPage() {
  const panel = document.getElementById('pinned-chats-panel');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.classList.remove('flex');
}

function openPinnedVaultModal() {
  openPinnedChatsPage();
}

function setPinnedFilter(filter) {
  DIMAD_AI_STATE.pinnedFilter = filter;
  renderPinnedChatsExplorer();
}

function togglePinSelection(pinId) {
  const selected = DIMAD_AI_STATE.selectedPinIds;
  const idx = selected.indexOf(pinId);
  if (idx === -1) selected.push(pinId);
  else selected.splice(idx, 1);
  renderPinnedChatsExplorer();
}

function filteredPinnedItems() {
  const searchEl = document.getElementById('vault-search-input');
  const q = (searchEl && searchEl.value ? searchEl.value : '').toLowerCase();
  return DIMAD_AI_STATE.pinnedVault.filter((item) => {
    const meta = chatModeMeta(item.mode);
    const matchesFilter = DIMAD_AI_STATE.pinnedFilter === 'all' || meta.category === DIMAD_AI_STATE.pinnedFilter;
    const hay = `${item.title} ${item.snippet} ${item.mode}`.toLowerCase();
    return matchesFilter && (!q || hay.includes(q));
  });
}

function renderPinnedChatsExplorer() {
  const grid = document.getElementById('pinned-chats-grid');
  const filters = document.getElementById('pinned-chat-filters');
  const synth = document.getElementById('synthesize-selected-btn');
  if (synth) synth.innerHTML = `<span>⚡ Synthesize (${DIMAD_AI_STATE.selectedPinIds.length} Selected)</span>`;
  if (!grid || !filters) return;

  const counts = { all: DIMAD_AI_STATE.pinnedVault.length, business: 0, writing: 0, travel: 0, inspiration: 0 };
  DIMAD_AI_STATE.pinnedVault.forEach((item) => {
    const cat = chatModeMeta(item.mode).category;
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const pills = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'business', label: `💼 Business (${counts.business})` },
    { id: 'writing', label: `📚 Book & Writing (${counts.writing})` },
    { id: 'travel', label: `✈️ Travel & Nomad (${counts.travel})` },
    { id: 'inspiration', label: `💡 Inspiration (${counts.inspiration})` }
  ];
  filters.innerHTML = pills.map((pill) => {
    const active = DIMAD_AI_STATE.pinnedFilter === pill.id;
    const cls = active
      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold'
      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white';
    return `<button type="button" onclick="setPinnedFilter('${pill.id}')" class="${cls} px-3 py-1.5 rounded-lg">${pill.label}</button>`;
  }).join('');

  const items = filteredPinnedItems();
  if (!items.length) {
    grid.innerHTML = `<div class="col-span-full text-slate-500 text-xs italic">No pinned chats yet. Hover an AI reply and click 📌, then save it here.</div>`;
    return;
  }

  grid.innerHTML = items.map((item) => {
    const meta = chatModeMeta(item.mode);
    const checked = DIMAD_AI_STATE.selectedPinIds.includes(item.id);
    return `
      <div class="bg-slate-900 border ${checked ? 'border-amber-500/40' : 'border-slate-800'} hover:border-amber-500/30 p-5 rounded-2xl flex flex-col justify-between space-y-4 transition group relative">
        <div class="space-y-2">
          <div class="flex justify-between items-center text-[10px] font-mono">
            <span class="${meta.className} px-2 py-0.5 rounded border">${meta.icon} ${escapeAiHtml(meta.label)}</span>
            <label class="flex items-center gap-1 text-slate-500">
              <input type="checkbox" ${checked ? 'checked' : ''} onchange="togglePinSelection('${item.id}')" class="accent-amber-500">
              Select
            </label>
          </div>
          <h4 class="text-sm font-bold text-white">${escapeAiHtml(item.title || 'Pinned insight')}</h4>
          <p class="text-xs text-slate-300 italic line-clamp-3">"${escapeAiHtml(item.snippet || '')}"</p>
          <div class="text-[10px] text-slate-500 font-mono">${escapeAiHtml(item.date || '')}</div>
        </div>
        <div class="space-y-2 pt-2 border-t border-slate-800/80">
          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <button type="button" onclick="reopenThread('${item.chatId || item.id}')" class="bg-slate-950 hover:bg-slate-800 text-amber-400 font-semibold py-2 rounded-xl border border-slate-800 transition text-center">💬 Re-open Thread</button>
            <button type="button" onclick="transformIdea('${item.id}')" class="bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2 rounded-xl border border-slate-800 transition text-center">🚀 Transform</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function synthesizeSelectedIdeas() {
  const selected = DIMAD_AI_STATE.pinnedVault.filter((item) => DIMAD_AI_STATE.selectedPinIds.includes(item.id));
  if (!selected.length) {
    alert('Select at least one pinned chat to synthesize.');
    return;
  }
  closePinnedChatsPage();
  startNewChat();
  const input = document.getElementById('chat-input-box');
  if (input) {
    input.value = `Synthesize these pinned insights into one execution plan:\n${selected.map((s) => `- ${s.title}: ${s.snippet}`).join('\n')}`;
    sendChatMessage();
  }
}

function reopenThread(chatId) {
  closePinnedChatsPage();
  const chat = DIMAD_AI_STATE.chats.find((c) => c.id === chatId);
  if (chat) loadChat(chatId);
  else startNewChat();
}

function transformIdea(pinId) {
  const item = DIMAD_AI_STATE.pinnedVault.find((p) => p.id === pinId);
  closePinnedChatsPage();
  startNewChat();
  const input = document.getElementById('chat-input-box');
  if (input) {
    input.value = `Transform this pinned insight into an execution deck: ${item ? item.snippet : pinId}`;
    sendChatMessage();
  }
}

function getNextResetTime(limitType, startDateIso) {
  const start = new Date(startDateIso);
  const now = new Date();

  if (limitType === 'daily') {
    const nextDailyReset = new Date(start);
    nextDailyReset.setDate(start.getDate() + 1);
    return {
      isResetDue: now >= nextDailyReset,
      formattedTime: nextDailyReset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      formattedDate: nextDailyReset.toLocaleDateString()
    };
  }

  if (limitType === 'weekly') {
    const nextWeeklyReset = new Date(start);
    nextWeeklyReset.setDate(start.getDate() + 7);
    return {
      isResetDue: now >= nextWeeklyReset,
      formattedTime: nextWeeklyReset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      formattedDate: nextWeeklyReset.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    };
  }

  return { isResetDue: false, formattedTime: 'N/A', formattedDate: 'N/A' };
}

function checkAndProcessAiQuery() {
  const activeTier = DIM_ENGINE.tierConfigs[DIM_ENGINE.user.tier];
  const quota = DIM_ENGINE.userQuota;
  const resetInfo = getNextResetTime(activeTier.aiLimitType, quota.periodStartDate);

  if (resetInfo.isResetDue) {
    quota.queriesUsedThisPeriod = 0;
    quota.periodStartDate = new Date().toISOString();
    persistAiQuota();
  }

  if (activeTier.aiLimitType === 'unlimited') {
    return {
      allowed: true,
      activeModel: activeTier.aiModelTier,
      statusMessage: `${activeTier.aiModelTier} Active`
    };
  }

  if (DIM_ENGINE.user.tier === 'FREE') {
    if (quota.queriesUsedThisPeriod >= activeTier.aiLimitMax) {
      return {
        allowed: false,
        activeModel: 'Locked',
        statusMessage: `You've reached your daily 50-query limit on Gemini Flash. Please wait until ${resetInfo.formattedTime} to continue, or upgrade to Explore ($9/mo).`
      };
    }
    quota.queriesUsedThisPeriod++;
    persistAiQuota();
    return {
      allowed: true,
      activeModel: 'Gemini Flash',
      statusMessage: `Gemini Flash (${quota.queriesUsedThisPeriod}/50 used today)`
    };
  }

  if (DIM_ENGINE.user.tier === 'EXPLORE') {
    if (quota.queriesUsedThisPeriod < activeTier.aiLimitMax) {
      quota.queriesUsedThisPeriod++;
      persistAiQuota();
      return {
        allowed: true,
        activeModel: 'Standard Production Model',
        statusMessage: `Standard AI (${quota.queriesUsedThisPeriod}/1,000 weekly quota)`
      };
    }
    return {
      allowed: true,
      activeModel: 'Gemini Flash (Reverted)',
      statusMessage: `Standard AI weekly quota used. Using Gemini Flash until weekly reset on ${resetInfo.formattedDate}.`
    };
  }

  return {
    allowed: true,
    activeModel: activeTier.aiModelTier,
    statusMessage: `${activeTier.aiModelTier} Active`
  };
}

function renderAiQuotaUi(statusOverride) {
  const activeTier = DIM_ENGINE.tierConfigs[DIM_ENGINE.user.tier] || DIM_ENGINE.tierConfigs.PRO;
  const quota = DIM_ENGINE.userQuota;
  const resetInfo = getNextResetTime(activeTier.aiLimitType, quota.periodStartDate);
  let label = `${activeTier.aiModelTier} Active`;

  if (activeTier.aiLimitType === 'daily') {
    label = quota.queriesUsedThisPeriod >= activeTier.aiLimitMax
      ? `Locked until ${resetInfo.formattedTime}`
      : `Gemini Flash (${quota.queriesUsedThisPeriod}/50 today)`;
  } else if (activeTier.aiLimitType === 'weekly') {
    label = quota.queriesUsedThisPeriod >= activeTier.aiLimitMax
      ? `Gemini Flash until ${resetInfo.formattedDate}`
      : `Standard AI (${quota.queriesUsedThisPeriod}/1,000 this week)`;
  }

  if (statusOverride && statusOverride.statusMessage) {
    label = statusOverride.statusMessage;
  }

  const badge = document.getElementById('ai-active-model-badge');
  if (badge) badge.textContent = label;
  const credits = document.getElementById('ai-credits-label');
  if (credits) credits.textContent = label;
}

function showQuotaExceededModal(message) {
  const modal = document.getElementById('ai-quota-modal');
  const body = document.getElementById('ai-quota-modal-message');
  if (body) body.textContent = message;
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  } else {
    alert(`Quota Reached\n\n${message}`);
  }
  renderAiQuotaUi({ statusMessage: message });
}

function closeQuotaExceededModal() {
  const modal = document.getElementById('ai-quota-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function upgradeFromQuotaModal() {
  closeQuotaExceededModal();
  closeDimadAiNav();
  openSettingsVaultNav('subscription');
}

function sendChatMessage() {
  const input = document.getElementById('chat-input-box');
  const container = document.getElementById('chat-messages-container');
  if (!input || !container || !input.value.trim()) return;

  const queryResult = checkAndProcessAiQuery();
  renderAiQuotaUi(queryResult);

  if (!queryResult.allowed) {
    showQuotaExceededModal(queryResult.statusMessage);
    return;
  }

  const userQuery = input.value.trim();
  const safeQuery = escapeAiHtml(userQuery);
  input.value = '';

  if (!DIMAD_AI_STATE.activeChatId) startNewChat();

  container.innerHTML += `
    <div class="flex items-start justify-end space-x-3">
      <div class="bg-amber-500 text-slate-950 p-4 rounded-2xl text-xs max-w-2xl font-medium">
        ${safeQuery}
      </div>
    </div>
  `;
  persistActiveChat();
  if (typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.record('hub', 2);

  setTimeout(() => {
    container.innerHTML += `
      <div class="flex items-start space-x-3 max-w-2xl">
        <div class="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">
          AI
        </div>
        <div class="space-y-2 group relative">
          <div class="flex items-center space-x-2">
            <span class="text-[10px] font-mono bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
              ${escapeAiHtml(queryResult.activeModel)}
            </span>
          </div>
          <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs text-slate-200 leading-relaxed shadow-lg">
            <p>Processing your prompt under <strong>${escapeAiHtml(queryResult.activeModel)}</strong>...</p>
          </div>
          <div class="absolute -right-12 top-6 opacity-0 group-hover:opacity-100 transition">
            <button type="button" onclick="pinMessage(this)" class="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg shadow transition" title="Pin this idea">
              📌
            </button>
          </div>
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;
    persistActiveChat();
  }, 500);
}

function toggleNotificationModal() {
  const modal = document.getElementById('goal-reminder-modal');
  if (modal) modal.classList.toggle('hidden');
}

function switchGoalHorizon(value) {
  document.querySelectorAll('[data-goal-horizon]').forEach((el) => {
    el.classList.toggle('hidden', el.getAttribute('data-goal-horizon') !== value);
  });
}

const DIMAD_GOALS = {
  storageKey: 'dimad_operator_goals',
  max: 10,
  horizons: [
    { id: 'daily', label: 'Daily', sub: 'Today' },
    { id: 'weekly', label: 'Weekly', sub: 'This week' },
    { id: 'monthly', label: 'Monthly', sub: 'This month' },
    { id: 'quarterly', label: 'Quarterly', sub: 'This quarter' },
    { id: 'yearly', label: 'Yearly', sub: 'This year' }
  ],

  pad(n) {
    return String(n).padStart(2, '0');
  },

  iso(date) {
    const d = date instanceof Date ? date : this.parseIso(date);
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  },

  parseIso(stamp) {
    const parts = String(stamp || '').split('-').map(Number);
    return new Date(parts[0] || new Date().getFullYear(), (parts[1] || 1) - 1, parts[2] || 1);
  },

  weekStart(date) {
    const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = x.getDay();
    x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
    return x;
  },

  viewDate() {
    if (!this._calDate) this._calDate = new Date();
    return this._calDate;
  },

  periodStart(horizon, date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (horizon === 'daily') return this.iso(d);
    if (horizon === 'weekly') return this.iso(this.weekStart(d));
    if (horizon === 'monthly') return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-01`;
    if (horizon === 'quarterly') {
      const m = Math.floor(d.getMonth() / 3) * 3 + 1;
      return `${d.getFullYear()}-${this.pad(m)}-01`;
    }
    return `${d.getFullYear()}-01-01`;
  },

  periodLabel(horizon, startIso) {
    const nowKey = this.periodStart(horizon, new Date());
    if (startIso === nowKey) {
      const h = this.horizons.find((x) => x.id === horizon);
      return h ? h.sub : startIso;
    }
    const d = this.parseIso(startIso);
    if (horizon === 'daily') return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (horizon === 'weekly') return 'Week of ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (horizon === 'monthly') return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (horizon === 'quarterly') return 'Q' + (Math.floor(d.getMonth() / 3) + 1) + ' ' + d.getFullYear();
    return String(d.getFullYear());
  },

  defaults() {
    return {
      brand: 'DIMAD is the dark-gold command center for operators who build companies with their own hands — one OS, one voice, no split attention.',
      purpose: 'To turn focused hours into shipped work, clean books, and geographic freedom. Execution is the brand. Distraction is the enemy.',
      vision: 'A generation of sovereign founders who run product, finance, and travel from one room in the world — and still out-ship the studio down the street.',
      activeHorizon: 'daily',
      hiddenHorizons: [],
      reminders: {
        daily: { on: true },
        weekly: { on: false, weekday: 1 },
        monthly: { on: false, day: 1 },
        quarterly: { on: false, month: 1, day: 1 },
        yearly: { on: false, month: 1, day: 1 }
      },
      reminderFired: {},
      goals: {
        daily: [
          { id: 'd1', text: 'Close 3 qualified outbound conversations.', done: false },
          { id: 'd2', text: 'Ship one production-ready product increment.', done: true },
          { id: 'd3', text: 'Review cash, pipeline, and today’s bottleneck in 15 minutes.', done: false }
        ],
        weekly: [
          { id: 'w1', text: 'Publish one brief that moves Explore → Premium.', done: false },
          { id: 'w2', text: 'Clear the invoice queue and send all payment links.', done: false },
          { id: 'w3', text: 'Complete a 40-hour focus week with documented Clock Ins.', done: false }
        ],
        monthly: [
          { id: 'm1', text: 'Convert 4 Explore trials into Premium seats.', done: false },
          { id: 'm2', text: 'Hit 30 Clock-In days and lock the 2,000 $DIM milestone.', done: false },
          { id: 'm3', text: 'Run one revenue experiment with a written kill/scale call.', done: false }
        ],
        quarterly: [
          { id: 'q1', text: 'Launch paid membership with redeemable $DIM perks.', done: false },
          { id: 'q2', text: 'Compress inbound-to-invoice to under 48 hours.', done: false },
          { id: 'q3', text: 'Staff inbox SLA and weekly reporting to a named owner.', done: false }
        ],
        yearly: [
          { id: 'y1', text: 'Reach 200 paying Premium operator seats.', done: false },
          { id: 'y2', text: 'Clock in 365 days and claim the 12,000 $DIM year award.', done: false },
          { id: 'y3', text: 'Make DIMAD the default execution OS for independent operators.', done: false }
        ]
      }
    };
  },

  hydrateGoal(horizon, g, i) {
    const weekdays = Array.isArray(g && g.weekdays)
      ? g.weekdays.map(Number).filter((n) => n >= 0 && n <= 6)
      : [0, 1, 2, 3, 4, 5, 6];
    return {
      id: (g && g.id) || `${horizon[0]}-${i}-${Date.now()}`,
      text: String((g && g.text) || ''),
      done: !!(g && g.done),
      recurring: !!(g && g.recurring),
      start: (g && g.start) || this.periodStart(horizon, new Date()),
      until: (g && g.until) || '',
      weekdays: weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6],
      donePeriods: (g && g.donePeriods && typeof g.donePeriods === 'object') ? g.donePeriods : {}
    };
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      const base = this.defaults();
      this.horizons.forEach((h) => {
        base.goals[h.id] = (base.goals[h.id] || []).map((g, i) => this.hydrateGoal(h.id, g, i));
      });
      if (!saved || typeof saved !== 'object') return base;
      const goals = { ...base.goals };
      this.horizons.forEach((h) => {
        const raw = (saved.goals && Array.isArray(saved.goals[h.id])) ? saved.goals[h.id] : goals[h.id];
        goals[h.id] = (raw || []).map((g, i) => this.hydrateGoal(h.id, g, i));
      });
      return {
        brand: saved.brand != null ? String(saved.brand) : base.brand,
        purpose: saved.purpose != null ? String(saved.purpose) : base.purpose,
        vision: saved.vision != null ? String(saved.vision) : base.vision,
        activeHorizon: saved.activeHorizon === 'all' || this.horizons.some((h) => h.id === saved.activeHorizon) ? saved.activeHorizon : 'daily',
        hiddenHorizons: Array.isArray(saved.hiddenHorizons) ? saved.hiddenHorizons.filter((id) => this.horizons.some((h) => h.id === id)) : [],
        reminders: {
          daily: { on: !!(saved.reminders && saved.reminders.daily && saved.reminders.daily.on) || (saved.reminders && saved.reminders.daily ? !!saved.reminders.daily.on : base.reminders.daily.on) },
          weekly: { on: !!(saved.reminders && saved.reminders.weekly && saved.reminders.weekly.on), weekday: Number((saved.reminders && saved.reminders.weekly && saved.reminders.weekly.weekday) ?? 1) },
          monthly: { on: !!(saved.reminders && saved.reminders.monthly && saved.reminders.monthly.on), day: Number((saved.reminders && saved.reminders.monthly && saved.reminders.monthly.day) || 1) },
          quarterly: { on: !!(saved.reminders && saved.reminders.quarterly && saved.reminders.quarterly.on), month: Number((saved.reminders && saved.reminders.quarterly && saved.reminders.quarterly.month) || 1), day: Number((saved.reminders && saved.reminders.quarterly && saved.reminders.quarterly.day) || 1) },
          yearly: { on: !!(saved.reminders && saved.reminders.yearly && saved.reminders.yearly.on), month: Number((saved.reminders && saved.reminders.yearly && saved.reminders.yearly.month) || 1), day: Number((saved.reminders && saved.reminders.yearly && saved.reminders.yearly.day) || 1) }
        },
        reminderFired: saved.reminderFired && typeof saved.reminderFired === 'object' ? saved.reminderFired : {},
        goals
      };
    } catch (err) {
      return this.defaults();
    }
  },

  persist(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  },

  state() {
    if (!this._state) this._state = this.load();
    return this._state;
  },

  escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  mount() {
    ['goal-identity-modal', 'goal-settings-modal', 'goal-nudge-modal', 'goal-new-modal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== document.body) document.body.appendChild(el);
    });
    this.ensureActiveVisible();
    this.renderIdentity();
    this.render();
  },

  identityLabels: {
    brand: 'My Brand',
    purpose: 'My Purpose',
    vision: 'My Vision'
  },

  renderIdentity() {
    const s = this.state();
    ['brand', 'purpose', 'vision'].forEach((key) => {
      const el = document.getElementById('goal-' + key);
      if (el) el.textContent = s[key] || '';
    });
  },

  openIdentity(field) {
    const s = this.state();
    this._identityField = field;
    const title = document.getElementById('goal-identity-title');
    const body = document.getElementById('goal-identity-body');
    const modal = document.getElementById('goal-identity-modal');
    if (title) title.textContent = this.identityLabels[field] || 'Edit';
    if (body) {
      body.value = s[field] || '';
      body.focus();
    }
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (body) setTimeout(() => body.focus(), 30);
  },

  closeIdentity() {
    const modal = document.getElementById('goal-identity-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this._identityField = null;
  },

  saveIdentity() {
    const field = this._identityField;
    const body = document.getElementById('goal-identity-body');
    if (!field || !body) return;
    const s = this.state();
    s[field] = body.value;
    this.persist(s);
    this.renderIdentity();
    this.closeIdentity();
  },

  list(horizon) {
    const s = this.state();
    if (!s.goals[horizon]) s.goals[horizon] = [];
    return s.goals[horizon];
  },

  isDone(goal, periodKey) {
    if (goal.recurring) return !!(goal.donePeriods && goal.donePeriods[periodKey]);
    return !!goal.done;
  },

  previousPeriod(horizon, startIso) {
    const d = this.parseIso(startIso);
    if (horizon === 'daily') d.setDate(d.getDate() - 1);
    else if (horizon === 'weekly') d.setDate(d.getDate() - 7);
    else if (horizon === 'monthly') d.setMonth(d.getMonth() - 1);
    else if (horizon === 'quarterly') d.setMonth(d.getMonth() - 3);
    else d.setFullYear(d.getFullYear() - 1);
    return this.periodStart(horizon, d);
  },

  appliesToPeriod(goal, horizon, key) {
    const start = goal.start || key;
    if (goal.until && key > goal.until) return false;
    if (goal.recurring) {
      if (start > key) return false;
      if (horizon === 'daily' && Array.isArray(goal.weekdays) && goal.weekdays.length) {
        const dow = this.parseIso(key).getDay();
        if (!goal.weekdays.includes(dow)) return false;
      }
      return true;
    }
    return start === key;
  },

  itemsFor(horizon, date) {
    const d = date || this.viewDate();
    if (horizon === 'all') {
      return this.visibleHorizons().flatMap((h) => this.itemsFor(h.id, d).map((g) => ({
        ...g,
        horizon: h.id,
        horizonLabel: h.label,
        horizonSub: this.periodLabel(h.id, this.periodStart(h.id, d))
      })));
    }
    const key = this.periodStart(horizon, d);
    return this.list(horizon).filter((g) => this.appliesToPeriod(g, horizon, key));
  },

  boardItems(horizon) {
    const now = new Date();
    if (horizon === 'all') {
      return this.visibleHorizons().flatMap((h) => this.boardItems(h.id).map((g) => ({
        ...g,
        horizon: h.id,
        horizonLabel: h.label,
        horizonSub: this.periodLabel(h.id, g.start || this.periodStart(h.id, now))
      })));
    }
    const key = this.periodStart(horizon, now);
    return this.list(horizon)
      .filter((g) => {
        const start = g.start || key;
        if (g.until && g.until < key) return false;
        return g.recurring || start >= key;
      })
      .sort((a, b) => String(a.start || key).localeCompare(String(b.start || key)));
  },

  allItems() {
    return this.itemsFor('all');
  },

  boardHorizons() {
    return this.visibleHorizons().concat([{ id: 'all', label: 'All', sub: 'Every horizon' }]);
  },

  add() {
    this.openComposer();
  },

  composerHint(horizon) {
    return { daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year' }[horizon] || 'period';
  },

  fillComposerChips() {
    const vis = this.visibleHorizons();
    const chips = document.getElementById('gn-horizons');
    if (!chips) return;
    chips.innerHTML = vis.map((h) => {
      const on = h.id === this._composerHorizon;
      return `<button type="button" onclick="DIMAD_GOALS.setComposerHorizon('${h.id}')" class="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${on ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-brand-gold/40'}">${this.escape(h.label)}</button>`;
    }).join('');
  },

  showComposer(edit) {
    const title = document.getElementById('gn-title');
    const del = document.getElementById('gn-cancel-goal');
    const save = document.getElementById('gn-save');
    if (title) title.textContent = edit ? 'Edit Goal' : 'New Goal';
    if (save) save.textContent = edit ? 'Save changes' : 'Save goal';
    if (del) del.classList.toggle('hidden', !edit);
    const err = document.getElementById('gn-error');
    if (err) { err.classList.add('hidden'); err.textContent = ''; }
    this.fillComposerChips();
    this.syncComposerWhen();
    this.syncWeekdaysPanel();
    const modal = document.getElementById('goal-new-modal');
    if (!modal) return;
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const text = document.getElementById('gn-text');
    if (text) setTimeout(() => text.focus(), 30);
  },

  openComposer() {
    this._editId = null;
    this._editHorizon = null;
    const vis = this.visibleHorizons();
    const active = this.state().activeHorizon;
    this._composerHorizon = active !== 'all' && vis.some((h) => h.id === active) ? active : vis[0].id;
    this._composerQuarter = Math.floor(this.viewDate().getMonth() / 3) + 1;
    const text = document.getElementById('gn-text');
    const rec = document.getElementById('gn-recurring');
    if (text) text.value = '';
    if (rec) rec.checked = false;
    this._composerDate = this.viewDate();
    this._composerWeekdays = [0, 1, 2, 3, 4, 5, 6];
    this.showComposer(false);
  },

  openEditor(horizon, id) {
    const item = this.list(horizon).find((g) => g.id === id);
    if (!item) return;
    this._editId = id;
    this._editHorizon = horizon;
    this._composerHorizon = horizon;
    const todayKey = this.periodStart(horizon, new Date());
    const startKey = item.start || todayKey;
    const editFrom = startKey < todayKey ? todayKey : startKey;
    const start = this.parseIso(editFrom);
    this._composerDate = start;
    this._composerQuarter = Math.floor(start.getMonth() / 3) + 1;
    this._composerWeekdays = (Array.isArray(item.weekdays) && item.weekdays.length)
      ? item.weekdays.slice()
      : [0, 1, 2, 3, 4, 5, 6];
    const text = document.getElementById('gn-text');
    const rec = document.getElementById('gn-recurring');
    if (text) text.value = item.text || '';
    if (rec) rec.checked = !!item.recurring;
    this.showComposer(true);
  },

  setComposerHorizon(id) {
    if (!this.visibleHorizons().some((h) => h.id === id)) return;
    this._composerHorizon = id;
    const chips = document.getElementById('gn-horizons');
    if (chips) {
      chips.querySelectorAll('button').forEach((btn, i) => {
        const h = this.visibleHorizons()[i];
        const on = h && h.id === id;
        btn.className = `px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${on ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-brand-gold/40'}`;
      });
    }
    this.syncComposerWhen();
    this.syncWeekdaysPanel();
  },

  weekdayDefs() {
    return [
      { n: 1, l: 'Mon' },
      { n: 2, l: 'Tue' },
      { n: 3, l: 'Wed' },
      { n: 4, l: 'Thu' },
      { n: 5, l: 'Fri' },
      { n: 6, l: 'Sat' },
      { n: 0, l: 'Sun' }
    ];
  },

  toggleComposerDay(n) {
    const set = new Set(this._composerWeekdays || []);
    if (set.has(n)) set.delete(n);
    else set.add(n);
    this._composerWeekdays = Array.from(set).sort((a, b) => a - b);
    this.renderWeekdayChips();
  },

  renderWeekdayChips() {
    const root = document.getElementById('gn-weekdays');
    if (!root) return;
    const selected = new Set(this._composerWeekdays || []);
    root.innerHTML = this.weekdayDefs().map((d) => {
      const on = selected.has(d.n);
      return `<button type="button" onclick="DIMAD_GOALS.toggleComposerDay(${d.n})" class="min-w-[2.4rem] px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${on ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800'}">${d.l}</button>`;
    }).join('');
  },

  syncWeekdaysPanel() {
    const wrap = document.getElementById('gn-weekdays-wrap');
    const rec = document.getElementById('gn-recurring');
    const show = this._composerHorizon === 'daily' && rec && rec.checked;
    if (wrap) wrap.classList.toggle('hidden', !show);
    if (show) this.renderWeekdayChips();
  },

  weekdayBadge(g) {
    const days = Array.isArray(g.weekdays) ? g.weekdays : [];
    if (!days.length || days.length >= 7) return 'Recurring';
    const labels = { 0: 'Su', 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr', 6: 'Sa' };
    return this.weekdayDefs().filter((d) => days.includes(d.n)).map((d) => labels[d.n]).join(' ');
  },

  hasPastCoverage(item, horizon, newStart) {
    if (!item) return false;
    const start = item.start || newStart;
    if (start < newStart) return true;
    const done = item.donePeriods && typeof item.donePeriods === 'object' ? Object.keys(item.donePeriods) : [];
    return done.some((k) => k < newStart);
  },

  spawnGoal(horizon, fields) {
    this.list(horizon).push({
      id: horizon + '-' + Date.now(),
      text: fields.text,
      done: false,
      recurring: !!fields.recurring,
      start: fields.start,
      until: '',
      weekdays: Array.isArray(fields.weekdays) ? fields.weekdays : [0, 1, 2, 3, 4, 5, 6],
      donePeriods: {}
    });
  },

  syncComposerWhen() {
    const h = this._composerHorizon || 'daily';
    const hint = document.getElementById('gn-recurring-hint');
    if (hint) hint.textContent = this.composerHint(h);
    const root = document.getElementById('gn-when');
    if (!root) return;
    const d = this._composerDate || this.viewDate();
    const field = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-amber-100';
    if (h === 'daily' || h === 'weekly') {
      root.innerHTML = `<input id="gn-date" type="date" value="${this.iso(d)}" class="${field}">${h === 'weekly' ? '<p class="text-[11px] text-slate-500 mt-1">Uses the week that contains this date.</p>' : ''}`;
      return;
    }
    if (h === 'monthly') {
      root.innerHTML = `<input id="gn-month" type="month" value="${d.getFullYear()}-${this.pad(d.getMonth() + 1)}" class="${field}">`;
      return;
    }
    if (h === 'quarterly') {
      const q = this._composerQuarter || 1;
      root.innerHTML = `<div class="flex flex-wrap items-center gap-2">
        <input id="gn-year" type="number" min="2020" max="2100" value="${d.getFullYear()}" class="w-24 ${field}">
        ${[1, 2, 3, 4].map((n) => `<button type="button" onclick="DIMAD_GOALS.setComposerQuarter(${n})" class="px-3 py-1.5 rounded-lg text-[11px] font-bold border ${n === q ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 text-slate-300 border-slate-800'}">Q${n}</button>`).join('')}
      </div>`;
      return;
    }
    root.innerHTML = `<input id="gn-year" type="number" min="2020" max="2100" value="${d.getFullYear()}" class="w-28 ${field}">`;
  },

  setComposerQuarter(n) {
    this._composerQuarter = n;
    this.syncComposerWhen();
  },

  composerStart(horizon) {
    const fallback = this.periodStart(horizon, this._composerDate || this.viewDate());
    if (horizon === 'daily' || horizon === 'weekly') {
      const el = document.getElementById('gn-date');
      return el && el.value ? this.periodStart(horizon, this.parseIso(el.value)) : fallback;
    }
    if (horizon === 'monthly') {
      const el = document.getElementById('gn-month');
      if (!el || !el.value) return fallback;
      const parts = el.value.split('-');
      return `${parts[0]}-${parts[1]}-01`;
    }
    const yearEl = document.getElementById('gn-year');
    const year = Number(yearEl && yearEl.value) || (this._composerDate || this.viewDate()).getFullYear();
    if (horizon === 'quarterly') {
      const m = ((this._composerQuarter || 1) - 1) * 3 + 1;
      return `${year}-${this.pad(m)}-01`;
    }
    return `${year}-01-01`;
  },

  closeComposer() {
    const modal = document.getElementById('goal-new-modal');
    this._editId = null;
    this._editHorizon = null;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  cancelGoal() {
    if (!this._editId || !this._editHorizon) return;
    const horizon = this._editHorizon;
    const id = this._editId;
    const item = this.list(horizon).find((g) => g.id === id);
    const todayKey = this.periodStart(horizon, new Date());
    this.closeComposer();
    if (!item) return;
    if (item.until && item.until < todayKey) {
      this.render();
      return;
    }
    if (item.start && item.start < todayKey) {
      item.until = this.previousPeriod(horizon, todayKey);
      this.persist(this.state());
      this.render();
      return;
    }
    this.remove(horizon, id);
  },

  saveComposer() {
    const textEl = document.getElementById('gn-text');
    const err = document.getElementById('gn-error');
    const text = String(textEl && textEl.value || '').trim();
    const horizon = this._composerHorizon || 'daily';
    const showErr = (msg) => { if (err) { err.textContent = msg; err.classList.remove('hidden'); } };
    if (!text) { showErr('Write a measurable target.'); return; }
    const rec = !!(document.getElementById('gn-recurring') && document.getElementById('gn-recurring').checked);
    const weekdays = rec && horizon === 'daily'
      ? (this._composerWeekdays || []).map(Number).filter((n) => n >= 0 && n <= 6)
      : [0, 1, 2, 3, 4, 5, 6];
    if (rec && horizon === 'daily' && !weekdays.length) {
      showErr('Pick at least one day for this daily goal.');
      return;
    }
    const todayKey = this.periodStart(horizon, new Date());
    let start = this.composerStart(horizon);
    if (this._editId && start < todayKey) start = todayKey;
    const fields = { text, recurring: rec, start, weekdays };
    if (this._editId) {
      const from = this._editHorizon;
      const item = this.list(from).find((g) => g.id === this._editId);
      if (!item) return;
      const splitStart = from === horizon ? start : this.periodStart(from, new Date());
      const ended = !!(item.until && item.until < splitStart);
      const shouldSplit = ended || this.hasPastCoverage(item, from, splitStart);
      if (shouldSplit) {
        const prevUntil = item.until;
        if (!ended) item.until = this.previousPeriod(from, splitStart);
        const inPeriod = this.itemsFor(horizon, this.parseIso(start));
        if (inPeriod.length >= this.max) {
          item.until = prevUntil;
          showErr('This period already has 10 goals.');
          return;
        }
        this.spawnGoal(horizon, fields);
      } else {
        const inPeriod = this.itemsFor(horizon, this.parseIso(start)).filter((g) => g.id !== item.id);
        if (inPeriod.length >= this.max) { showErr('This period already has 10 goals.'); return; }
        item.text = text;
        item.recurring = rec;
        item.start = start;
        item.weekdays = weekdays;
        if (from !== horizon) {
          this.state().goals[from] = this.list(from).filter((g) => g.id !== item.id);
          this.list(horizon).push(item);
        }
      }
      this.state().activeHorizon = horizon;
      this.persist(this.state());
      this.closeComposer();
      this.render();
      return;
    }
    const inPeriod = this.itemsFor(horizon, this.parseIso(start));
    if (inPeriod.length >= this.max) { showErr('This period already has 10 goals.'); return; }
    this.spawnGoal(horizon, fields);
    this.state().activeHorizon = horizon;
    this.persist(this.state());
    this.closeComposer();
    this.render();
  },

  setHorizon(id) {
    if (id !== 'all' && !this.visibleHorizons().some((h) => h.id === id)) return;
    this.state().activeHorizon = id;
    this.persist(this.state());
    this.render();
  },

  visibleHorizons() {
    const hidden = this.state().hiddenHorizons || [];
    const shown = this.horizons.filter((h) => !hidden.includes(h.id));
    return shown.length ? shown : this.horizons.slice(0, 1);
  },

  ensureActiveVisible() {
    const s = this.state();
    if (s.activeHorizon === 'all') return;
    const vis = this.visibleHorizons();
    if (!vis.some((h) => h.id === s.activeHorizon)) {
      s.activeHorizon = vis[0].id;
      this.persist(s);
    }
  },

  clampDay(year, month, day) {
    const last = new Date(year, month, 0).getDate();
    return Math.max(1, Math.min(Number(day) || 1, last));
  },

  todayStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  openSettings() {
    const s = this.state();
    const visRoot = document.getElementById('goal-settings-visible');
    if (visRoot) {
      visRoot.innerHTML = this.horizons.map((h) => {
        const on = !(s.hiddenHorizons || []).includes(h.id);
        return `<label class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-[12px] text-slate-200">
          <input type="checkbox" data-gs-vis="${h.id}" ${on ? 'checked' : ''} class="accent-amber-500">
          Show ${this.escape(h.label)}
        </label>`;
      }).join('');
    }
    const r = s.reminders || this.defaults().reminders;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el[el.type === 'checkbox' ? 'checked' : 'value'] = val; };
    set('gs-rem-daily', !!r.daily.on);
    set('gs-rem-weekly', !!r.weekly.on);
    set('gs-rem-weekly-day', String(r.weekly.weekday ?? 1));
    set('gs-rem-monthly', !!r.monthly.on);
    set('gs-rem-monthly-day', String(r.monthly.day || 1));
    set('gs-rem-quarterly', !!r.quarterly.on);
    set('gs-rem-quarterly-month', String(r.quarterly.month || 1));
    set('gs-rem-quarterly-day', String(r.quarterly.day || 1));
    set('gs-rem-yearly', !!r.yearly.on);
    set('gs-rem-yearly-month', String(r.yearly.month || 1));
    set('gs-rem-yearly-day', String(r.yearly.day || 1));
    const modal = document.getElementById('goal-settings-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeSettings() {
    const modal = document.getElementById('goal-settings-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveSettings() {
    const s = this.state();
    const hidden = [];
    document.querySelectorAll('[data-gs-vis]').forEach((el) => {
      if (!el.checked) hidden.push(el.getAttribute('data-gs-vis'));
    });
    s.hiddenHorizons = hidden.length === this.horizons.length ? hidden.slice(0, -1) : hidden;
    const num = (id, fallback) => {
      const el = document.getElementById(id);
      const n = Number(el && el.value);
      return Number.isFinite(n) ? n : fallback;
    };
    const on = (id) => !!(document.getElementById(id) && document.getElementById(id).checked);
    s.reminders = {
      daily: { on: on('gs-rem-daily') },
      weekly: { on: on('gs-rem-weekly'), weekday: num('gs-rem-weekly-day', 1) },
      monthly: { on: on('gs-rem-monthly'), day: Math.max(1, Math.min(31, num('gs-rem-monthly-day', 1))) },
      quarterly: { on: on('gs-rem-quarterly'), month: Math.max(1, Math.min(3, num('gs-rem-quarterly-month', 1))), day: Math.max(1, Math.min(31, num('gs-rem-quarterly-day', 1))) },
      yearly: { on: on('gs-rem-yearly'), month: Math.max(1, Math.min(12, num('gs-rem-yearly-month', 1))), day: Math.max(1, Math.min(31, num('gs-rem-yearly-day', 1))) }
    };
    this.persist(s);
    this.ensureActiveVisible();
    this.render();
    this.closeSettings();
  },

  isQuarterlyDate(now, month, day) {
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const start = Math.max(1, Math.min(3, Number(month) || 1));
    return [0, 4, 8, 12].some((offset) => {
      const mm = ((start + offset - 1) % 12) + 1;
      return mm === m && d === this.clampDay(now.getFullYear(), mm, day);
    });
  },

  dueReminders() {
    const s = this.state();
    const r = s.reminders || this.defaults().reminders;
    const fired = s.reminderFired || {};
    const hidden = s.hiddenHorizons || [];
    const now = new Date();
    const today = this.todayStamp();
    const monthKey = today.slice(0, 7);
    const yearKey = String(now.getFullYear());
    const due = [];
    const visible = (id) => !hidden.includes(id);
    if (r.daily && r.daily.on && visible('daily') && fired.daily !== today) due.push('daily');
    if (r.weekly && r.weekly.on && visible('weekly') && now.getDay() === Number(r.weekly.weekday) && fired.weekly !== today) due.push('weekly');
    if (r.monthly && r.monthly.on && visible('monthly') && now.getDate() === this.clampDay(now.getFullYear(), now.getMonth() + 1, r.monthly.day) && fired.monthly !== monthKey) due.push('monthly');
    if (r.quarterly && r.quarterly.on && visible('quarterly') && this.isQuarterlyDate(now, r.quarterly.month, r.quarterly.day) && fired.quarterly !== today) due.push('quarterly');
    if (r.yearly && r.yearly.on && visible('yearly') && (now.getMonth() + 1) === Number(r.yearly.month) && now.getDate() === this.clampDay(now.getFullYear(), r.yearly.month, r.yearly.day) && fired.yearly !== yearKey) due.push('yearly');
    return due;
  },

  checkReminders() {
    const due = this.dueReminders();
    if (!due.length) return;
    this._nudgeDue = due;
    const body = document.getElementById('goal-nudge-body');
    if (body) {
      body.innerHTML = due.map((id) => {
        const h = this.horizons.find((x) => x.id === id);
        const open = this.itemsFor(id, new Date()).filter((g) => !this.isDone(g, this.periodStart(id, new Date())));
        const rows = open.slice(0, 4).map((g) => `<li class="text-[12px] text-slate-200">${this.escape(g.text || 'Untitled target')}</li>`).join('')
          || '<li class="text-[12px] text-slate-500">All targets in this horizon are complete.</li>';
        return `<div class="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div class="text-[10px] font-bold uppercase tracking-wider text-brand-gold mb-1.5">${this.escape(h ? h.label : id)}</div>
          <ul class="space-y-1 list-disc pl-4">${rows}</ul>
        </div>`;
      }).join('');
    }
    const modal = document.getElementById('goal-nudge-modal');
    if (!modal) return;
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  dismissNudge() {
    const s = this.state();
    const today = this.todayStamp();
    const now = new Date();
    s.reminderFired = s.reminderFired || {};
    (this._nudgeDue || []).forEach((id) => {
      if (id === 'daily' || id === 'weekly' || id === 'quarterly') s.reminderFired[id] = today;
      if (id === 'monthly') s.reminderFired[id] = today.slice(0, 7);
      if (id === 'yearly') s.reminderFired[id] = String(now.getFullYear());
    });
    this.persist(s);
    this._nudgeDue = [];
    const modal = document.getElementById('goal-nudge-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  openFromNudge() {
    const first = (this._nudgeDue || [])[0];
    this.dismissNudge();
    if (typeof switchTab === 'function') switchTab('ent-goals');
    if (first) this.setHorizon(first);
  },

  score(horizon) {
    const now = new Date();
    const items = this.itemsFor(horizon, now);
    const keyFor = (g) => this.periodStart(g.horizon || horizon, now);
    return { entered: items.length, complete: items.filter((g) => this.isDone(g, keyFor(g))).length };
  },

  setText(horizon, id, text) {
    const item = this.list(horizon).find((g) => g.id === id);
    if (!item) return;
    item.text = text;
    this.persist(this.state());
  },

  toggle(horizon, id) {
    const item = this.list(horizon).find((g) => g.id === id);
    if (!item) return;
    const key = this.periodStart(horizon, this.viewDate());
    this.setDone(horizon, id, !this.isDone(item, key));
  },

  setDone(horizon, id, done, periodKey) {
    const item = this.list(horizon).find((g) => g.id === id);
    if (!item) return;
    const key = periodKey || this.periodStart(horizon, this.viewDate());
    if (item.recurring) {
      item.donePeriods = item.donePeriods || {};
      item.donePeriods[key] = !!done;
    } else {
      item.done = !!done;
    }
    this.persist(this.state());
    this.render();
  },

  remove(horizon, id) {
    const s = this.state();
    s.goals[horizon] = this.list(horizon).filter((g) => g.id !== id);
    this.persist(s);
    this.render();
  },

  addDays(date, days) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + days);
    return d;
  },

  jumpToday() {
    this._calDate = new Date();
    this.render();
  },

  shiftBoard(dir) {
    const d = this.viewDate();
    const live = this.state().activeHorizon || 'daily';
    if (live === 'daily' || live === 'all') this._calDate = this.addDays(d, dir * 7);
    else if (live === 'weekly') this._calDate = this.addDays(d, dir * 28);
    else if (live === 'yearly') this._calDate = new Date(d.getFullYear() + dir * 5, 0, 1);
    else this._calDate = new Date(d.getFullYear() + dir, d.getMonth(), 1);
    this.render();
  },

  boardNav(title) {
    return `<div class="flex items-center justify-between gap-2">
      <button type="button" onclick="DIMAD_GOALS.shiftBoard(-1)" class="w-6 h-6 rounded-md border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 text-xs">‹</button>
      <div class="text-center">
        <div class="text-[10px] font-black text-white">${this.escape(title)}</div>
        <button type="button" onclick="DIMAD_GOALS.jumpToday()" class="text-[8px] font-bold uppercase tracking-wide text-brand-gold hover:text-amber-300">This period</button>
      </div>
      <button type="button" onclick="DIMAD_GOALS.shiftBoard(1)" class="w-6 h-6 rounded-md border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 text-xs">›</button>
    </div>`;
  },

  goalCardHtml(g, horizon, date) {
    const hid = g.horizon || horizon;
    const key = this.periodStart(hid, date);
    const done = this.isDone(g, key);
    const rec = g.recurring
      ? `<span class="shrink-0 text-[7px] font-black uppercase tracking-wide text-sky-300 bg-sky-500/15 px-1 py-px rounded">${this.escape(this.weekdayBadge(g))}</span>`
      : '';
    const complete = done
      ? '<span class="shrink-0 text-[7px] font-black uppercase tracking-wide text-emerald-400 bg-emerald-500/10 px-1 py-px rounded">Complete</span>'
      : '';
    const horizonChip = g.horizonLabel
      ? `<span class="shrink-0 text-[7px] font-black uppercase tracking-wide text-brand-gold bg-amber-500/10 px-1 py-px rounded">${this.escape(g.horizonLabel)}</span>`
      : '';
    return `<div class="flex items-center gap-1.5 min-w-0">
      <div class="flex shrink-0 rounded overflow-hidden border ${done ? 'border-emerald-500/40' : 'border-slate-700'}">
        <button type="button" onclick="DIMAD_GOALS.setDone('${hid}', '${g.id}', true, '${key}')" class="px-1.5 py-0.5 text-[8px] font-black uppercase ${done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-500 hover:text-emerald-300'}">Yes</button>
        <button type="button" onclick="DIMAD_GOALS.setDone('${hid}', '${g.id}', false, '${key}')" class="px-1.5 py-0.5 text-[8px] font-black uppercase border-l ${done ? 'border-emerald-500/30 bg-slate-950 text-slate-500' : 'border-slate-700 bg-amber-500 text-slate-950'}">No</button>
      </div>
      <button type="button" onclick="DIMAD_GOALS.openEditor('${hid}', '${g.id}')" class="flex-1 min-w-0 text-left text-[10px] font-semibold leading-tight ${done ? 'line-through text-slate-500' : 'text-slate-200 hover:text-white'}">${g.text ? this.escape(g.text) : '<span class="text-slate-600">Untitled target</span>'}</button>
      ${horizonChip}${rec}${complete}
    </div>`;
  },

  periodRow(title, sub, items, horizon, date, highlight) {
    const empty = '<p class="text-[9px] text-slate-600 py-px">No goals</p>';
    return `<div class="rounded-lg border ${highlight ? 'border-brand-gold/50 bg-amber-500/5' : 'border-slate-800 bg-slate-900'} px-2 py-1 flex items-start gap-2">
      <div class="w-[4.75rem] shrink-0">
        <div class="text-[8px] font-black uppercase tracking-wide ${highlight ? 'text-brand-gold' : 'text-slate-200'}">${this.escape(title)}</div>
        <div class="text-[8px] font-mono text-slate-500">${this.escape(sub)}</div>
      </div>
      <div class="flex-1 min-w-0 space-y-0.5">${items.map((g) => this.goalCardHtml(g, horizon, date)).join('') || empty}</div>
    </div>`;
  },

  renderBoard() {
    const root = document.getElementById('dimad-goals-board');
    if (!root) return;
    const live = this.state().activeHorizon || 'daily';
    const d = this.viewDate();
    const today = this.todayStamp();
    if (live === 'daily' || live === 'all') {
      const start = this.weekStart(d);
      const end = this.addDays(start, 6);
      const title = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' – ' + end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const cols = names.map((name, i) => {
        const day = this.addDays(start, i);
        const stamp = this.iso(day);
        const items = live === 'all'
          ? this.visibleHorizons().flatMap((h) => {
            const key = this.periodStart(h.id, day);
            if (h.id !== 'daily' && key !== stamp) return [];
            return this.itemsFor(h.id, day).map((g) => ({ ...g, horizon: h.id, horizonLabel: h.label }));
          })
          : this.itemsFor('daily', day);
        return this.periodRow(name, String(day.getDate()), items, live === 'all' ? 'all' : 'daily', day, stamp === today);
      }).join('');
      root.innerHTML = this.boardNav(title) + `<div class="space-y-1">${cols}</div>`;
      return;
    }
    if (live === 'weekly') {
      const start = this.weekStart(d);
      const last = this.addDays(start, 21);
      const title = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' – ' + last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const nowWeek = this.periodStart('weekly', new Date());
      const cols = [0, 1, 2, 3].map((i) => {
        const week = this.addDays(start, i * 7);
        const key = this.periodStart('weekly', week);
        const label = 'Week of ' + week.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return this.periodRow(label, this.periodLabel('weekly', key), this.itemsFor('weekly', week), 'weekly', week, key === nowWeek);
      }).join('');
      root.innerHTML = this.boardNav(title) + `<div class="space-y-1">${cols}</div>`;
      return;
    }
    if (live === 'monthly') {
      const year = d.getFullYear();
      const nowKey = this.periodStart('monthly', new Date());
      const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const cols = names.map((name, i) => {
        const monthDate = new Date(year, i, 1);
        const key = this.periodStart('monthly', monthDate);
        return this.periodRow(name, String(year), this.itemsFor('monthly', monthDate), 'monthly', monthDate, key === nowKey);
      }).join('');
      root.innerHTML = this.boardNav(String(year)) + `<div class="grid grid-cols-1 lg:grid-cols-2 gap-1">${cols}</div>`;
      return;
    }
    if (live === 'quarterly') {
      const year = d.getFullYear();
      const nowKey = this.periodStart('quarterly', new Date());
      const cols = [1, 2, 3, 4].map((q) => {
        const qDate = new Date(year, (q - 1) * 3, 1);
        const key = this.periodStart('quarterly', qDate);
        return this.periodRow('Q' + q, String(year), this.itemsFor('quarterly', qDate), 'quarterly', qDate, key === nowKey);
      }).join('');
      root.innerHTML = this.boardNav(String(year)) + `<div class="space-y-1">${cols}</div>`;
      return;
    }
    const year = d.getFullYear();
    const nowYear = new Date().getFullYear();
    const cols = [0, 1, 2, 3, 4].map((i) => {
      const y = year + i;
      const yDate = new Date(y, 0, 1);
      return this.periodRow(String(y), 'Year', this.itemsFor('yearly', yDate), 'yearly', yDate, y === nowYear);
    }).join('');
    root.innerHTML = this.boardNav(year + ' – ' + (year + 4)) + `<div class="space-y-1">${cols}</div>`;
  },

  formatDueDate(date) {
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  },

  periodDueDate(horizon, now) {
    const d = now || new Date();
    const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const r = (this.state().reminders || this.defaults().reminders);
    if (horizon === 'daily') return today;
    if (horizon === 'weekly') {
      const want = Number((r.weekly && r.weekly.weekday) ?? 1);
      const start = this.weekStart(today);
      for (let i = 0; i < 7; i++) {
        const day = this.addDays(start, i);
        if (day.getDay() === want) return day;
      }
      return this.addDays(start, 4);
    }
    if (horizon === 'monthly') {
      const month = today.getMonth() + 1;
      const day = this.clampDay(today.getFullYear(), month, (r.monthly && r.monthly.day) || 1);
      return new Date(today.getFullYear(), today.getMonth(), day);
    }
    if (horizon === 'quarterly') {
      const qStart = Math.floor(today.getMonth() / 3) * 3;
      const q1 = Math.max(1, Math.min(3, Number((r.quarterly && r.quarterly.month) || 1)));
      const month = qStart + q1;
      const day = this.clampDay(today.getFullYear(), month, (r.quarterly && r.quarterly.day) || 1);
      return new Date(today.getFullYear(), month - 1, day);
    }
    const month = Math.max(1, Math.min(12, Number((r.yearly && r.yearly.month) || 1)));
    const day = this.clampDay(today.getFullYear(), month, (r.yearly && r.yearly.day) || 1);
    return new Date(today.getFullYear(), month - 1, day);
  },

  setDashHorizon(id) {
    if (!this.horizons.some((h) => h.id === id)) return;
    this._dashHorizon = id;
    this.renderDash();
  },

  openFromDash() {
    const h = this._dashHorizon || 'daily';
    this.state().activeHorizon = h;
    this.persist(this.state());
    if (typeof switchTab === 'function') switchTab('ent-goals');
  },

  renderDash() {
    const chips = document.getElementById('cc-goals-horizons');
    const list = document.getElementById('cc-goals-list');
    if (!chips && !list) return;
    const horizon = this.horizons.some((h) => h.id === this._dashHorizon) ? this._dashHorizon : 'daily';
    this._dashHorizon = horizon;
    const now = new Date();
    const key = this.periodStart(horizon, now);
    const items = this.itemsFor(horizon, now);
    const sc = this.score(horizon);
    const pct = sc.entered ? Math.round((sc.complete / sc.entered) * 100) : 0;
    const period = document.getElementById('cc-goals-period');
    const pctEl = document.getElementById('cc-goals-pct');
    const bar = document.getElementById('cc-goals-bar');
    if (period) period.textContent = this.periodLabel(horizon, key);
    if (pctEl) pctEl.textContent = sc.entered ? pct + '%' : '—';
    const dueEl = document.getElementById('cc-goals-due');
    if (dueEl) {
      const due = this.periodDueDate(horizon, now);
      dueEl.textContent = 'Due ' + this.formatDueDate(due);
    }
    if (bar) {
      bar.style.width = (sc.entered ? pct : 0) + '%';
      bar.className = `h-full ${pct === 100 && sc.entered ? 'bg-brand-mint' : 'bg-brand-gold'}`;
    }
    if (chips) {
      chips.innerHTML = this.horizons.map((h) => {
        const on = h.id === horizon;
        return `<button type="button" onclick="DIMAD_GOALS.setDashHorizon('${h.id}')" class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide border ${on ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-brand-gold/40 hover:text-white'}">${this.escape(h.label)}</button>`;
      }).join('');
    }
    if (list) {
      const empty = `<p class="text-[10px] text-slate-500 py-1">No ${this.escape(horizon)} goals this period.</p>`;
      list.innerHTML = items.map((g) => {
        const done = this.isDone(g, key);
        const rec = g.recurring
          ? `<span class="shrink-0 text-[7px] font-black uppercase tracking-wide text-sky-300 bg-sky-500/15 px-1 py-px rounded">${this.escape(this.weekdayBadge(g))}</span>`
          : '';
        return `<div class="flex items-center gap-1.5 min-w-0 bg-brand-black/40 p-1.5 rounded border ${done ? 'border-emerald-500/30' : 'border-brand-border'}">
          <div class="flex shrink-0 rounded overflow-hidden border ${done ? 'border-emerald-500/40' : 'border-slate-700'}">
            <button type="button" onclick="DIMAD_GOALS.setDone('${horizon}', '${g.id}', true, '${key}')" class="px-1.5 py-0.5 text-[8px] font-black uppercase ${done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-500 hover:text-emerald-300'}">Yes</button>
            <button type="button" onclick="DIMAD_GOALS.setDone('${horizon}', '${g.id}', false, '${key}')" class="px-1.5 py-0.5 text-[8px] font-black uppercase border-l ${done ? 'border-emerald-500/30 bg-slate-950 text-slate-500' : 'border-slate-700 bg-amber-500 text-slate-950'}">No</button>
          </div>
          <span class="flex-1 min-w-0 text-[10px] font-semibold leading-tight ${done ? 'line-through text-slate-500' : 'text-slate-200'}">${g.text ? this.escape(g.text) : 'Untitled target'}</span>
          ${rec}
        </div>`;
      }).join('') || empty;
    }
  },

  render() {
    const s = this.state();
    const active = s.activeHorizon || 'daily';
    const scoreRoot = document.getElementById('dimad-goals-score');
    const toggles = document.getElementById('dimad-goals-toggles');
    const list = document.getElementById('dimad-goals-list');
    const cap = document.getElementById('dimad-goals-cap');
    const vis = this.visibleHorizons();
    const shown = this.boardHorizons();
    if (!shown.some((h) => h.id === active)) {
      this.ensureActiveVisible();
    }
    const live = this.state().activeHorizon || shown[0].id;
    if (scoreRoot) {
      scoreRoot.innerHTML = shown.map((h) => {
        const sc = this.score(h.id);
        const on = h.id === live;
        const pct = sc.entered ? Math.round((sc.complete / sc.entered) * 100) : 0;
        return `<button type="button" onclick="DIMAD_GOALS.setHorizon('${h.id}')" class="text-left rounded-xl border px-3 py-2.5 ${on ? 'border-brand-gold/50 bg-amber-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}">
          <div class="text-[9px] font-bold uppercase tracking-wider ${on ? 'text-brand-gold' : 'text-slate-400'}">${this.escape(h.label)}</div>
          <div class="mt-1 flex items-baseline justify-between gap-2">
            <span class="text-sm font-black font-mono text-white">${sc.complete}<span class="text-slate-500 font-bold">/${sc.entered}</span></span>
            <span class="text-[10px] font-mono ${pct === 100 && sc.entered ? 'text-brand-mint' : 'text-slate-500'}">${sc.entered ? pct + '%' : '—'}</span>
          </div>
          <div class="text-[9px] text-slate-500 mt-0.5">completed / entered</div>
        </button>`;
      }).join('');
    }
    if (toggles) {
      toggles.innerHTML = shown.map((h) => {
        const on = h.id === live;
        return `<button type="button" onclick="DIMAD_GOALS.setHorizon('${h.id}')" class="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border ${on ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-brand-gold/40 hover:text-white'}">${this.escape(h.label)}</button>`;
      }).join('');
    }
    this.renderBoard();
    this.renderDash();
    const current = this.itemsFor(live, new Date());
    const h = live === 'all' ? { id: 'all', label: 'All' } : (this.horizons.find((x) => x.id === live) || vis[0]);
    if (list) list.innerHTML = '';
    if (cap) {
      cap.textContent = live === 'all'
        ? `${current.length} goals due this period · ${vis.length} horizon${vis.length === 1 ? '' : 's'}`
        : `${current.length}/${this.max} current ${h.label.toLowerCase()} slots`;
    }
  }
};
window.DIMAD_GOALS = DIMAD_GOALS;

function initGoalsRewards() {
  const select = document.getElementById('goal-horizon-select');
  if (select) {
    select.addEventListener('change', (e) => switchGoalHorizon(e.target.value));
    switchGoalHorizon(select.value);
  }
  if (typeof DIMAD_GOALS !== 'undefined') DIMAD_GOALS.mount();
  if (typeof DIM_ENGINE !== 'undefined') DIM_ENGINE.renderStreakTrack();
}

const WEEKLY_GOAL_SECONDS = 40 * 3600;
const DAILY_GOAL_SECONDS = 8 * 3600;
const MONTHLY_GOAL_SECONDS = 160 * 3600;
const YEARLY_GOAL_SECONDS = 1920 * 3600;

function formatHms(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const FOCUS_TIMER = {
  storageKey: 'dimad_focus_progress',
  midnightTimer: null,
  dailySeconds: 0,
  log: {},
  clockInDays: [],
  membershipStart: '',
  claimedMilestones: [],
  claimedYearStart: '',

  pad(n) {
    return String(n).padStart(2, '0');
  },

  dayKey(d = new Date()) {
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  },

  weekKey(d = new Date()) {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
    return this.dayKey(copy);
  },

  msUntilMidnight() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return Math.max(250, next.getTime() - now.getTime());
  },

  defaultState() {
    return {
      weeklySeconds: 14.5 * 3600,
      dailySeconds: 0,
      dayKey: this.dayKey(),
      weekKey: this.weekKey(),
      log: {},
      clockInDay: '',
      clockInDays: [],
      membershipStart: '',
      claimedMilestones: [],
      claimedYearStart: ''
    };
  },

  normalizeDays(raw) {
    if (!Array.isArray(raw)) return [];
    return Array.from(new Set(raw.filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key)))).sort();
  },

  addYear(key) {
    const d = this.parseDayKey(key);
    d.setFullYear(d.getFullYear() + 1);
    return this.dayKey(d);
  },

  parseDayKey(key) {
    const parts = String(key || '').split('-').map(Number);
    return new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
  },

  yearStartKey(state) {
    const start = state.membershipStart || this.dayKey();
    const today = this.dayKey();
    let cursor = start;
    let guard = 0;
    while (this.addYear(cursor) <= today && guard < 80) {
      cursor = this.addYear(cursor);
      guard += 1;
    }
    return cursor;
  },

  normalizeLog(raw) {
    const log = {};
    if (!raw || typeof raw !== 'object') return log;
    Object.keys(raw).forEach((key) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      const sec = Math.max(0, Math.floor(Number(raw[key]) || 0));
      if (sec) log[key] = sec;
    });
    return log;
  },

  seedLog(state) {
    const log = this.normalizeLog(state.log);
    if (Object.keys(log).length) {
      log[state.dayKey] = state.dailySeconds;
      state.log = log;
      return state;
    }
    log[state.dayKey] = state.dailySeconds;
    const leftover = Math.max(0, state.weeklySeconds - state.dailySeconds);
    if (leftover > 0) {
      const prev = new Date();
      prev.setDate(prev.getDate() - 1);
      if (this.weekKey(prev) === state.weekKey) log[this.dayKey(prev)] = leftover;
    }
    state.log = log;
    return state;
  },

  load() {
    let state = this.defaultState();
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || '');
      if (raw && Number.isFinite(raw.weeklySeconds) && Number.isFinite(raw.dailySeconds)) {
        state = {
          weeklySeconds: Math.max(0, Math.floor(raw.weeklySeconds)),
          dailySeconds: Math.max(0, Math.floor(raw.dailySeconds)),
          dayKey: raw.dayKey || this.dayKey(),
          weekKey: raw.weekKey || this.weekKey(),
          log: this.normalizeLog(raw.log),
          clockInDay: raw.clockInDay || '',
          clockInDays: this.normalizeDays(raw.clockInDays),
          membershipStart: raw.membershipStart || '',
          claimedMilestones: Array.isArray(raw.claimedMilestones) ? raw.claimedMilestones.map(Number) : [],
          claimedYearStart: raw.claimedYearStart || ''
        };
      }
    } catch (err) { /* defaults */ }
    return this.seedLog(this.applyRollover(state));
  },

  persist(state) {
    const log = this.normalizeLog(state.log);
    log[state.dayKey] = state.dailySeconds;
    const keys = Object.keys(log).sort();
    if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((key) => { delete log[key]; });
    localStorage.setItem(this.storageKey, JSON.stringify({
      weeklySeconds: state.weeklySeconds,
      dailySeconds: state.dailySeconds,
      dayKey: state.dayKey,
      weekKey: state.weekKey,
      log,
      clockInDay: state.clockInDay || '',
      clockInDays: this.normalizeDays(state.clockInDays),
      membershipStart: state.membershipStart || '',
      claimedMilestones: Array.isArray(state.claimedMilestones) ? state.claimedMilestones : [],
      claimedYearStart: state.claimedYearStart || ''
    }));
  },

  applyRollover(state) {
    const today = this.dayKey();
    const week = this.weekKey();
    state.log = this.normalizeLog(state.log);
    if (state.weekKey !== week) {
      state.weeklySeconds = 0;
      state.weekKey = week;
    }
    if (state.dayKey !== today) {
      if (state.dailySeconds > 0) state.log[state.dayKey] = state.dailySeconds;
      state.dailySeconds = 0;
      state.dayKey = today;
    }
    state.log[today] = state.dailySeconds;
    return state;
  },

  syncGlobals(state) {
    weeklyLoggedSeconds = state.weeklySeconds;
    this.dailySeconds = state.dailySeconds;
    this.log = { ...(state.log || {}) };
    this.clockInDay = state.clockInDay || '';
    this.clockInDays = this.normalizeDays(state.clockInDays);
    this.membershipStart = state.membershipStart || '';
    this.claimedMilestones = Array.isArray(state.claimedMilestones) ? state.claimedMilestones.slice() : [];
    this.claimedYearStart = state.claimedYearStart || '';
  },

  snapshot() {
    const state = this.applyRollover({
      weeklySeconds: weeklyLoggedSeconds,
      dailySeconds: this.dailySeconds,
      dayKey: this.dayKey(),
      weekKey: this.weekKey(),
      log: { ...(this.log || {}) },
      clockInDay: this.clockInDay || '',
      clockInDays: this.normalizeDays(this.clockInDays),
      membershipStart: this.membershipStart || '',
      claimedMilestones: Array.isArray(this.claimedMilestones) ? this.claimedMilestones.slice() : [],
      claimedYearStart: this.claimedYearStart || ''
    });
    this.syncGlobals(state);
    return state;
  },

  syncPauseButton() {
    const btn = document.getElementById('btn-timer-pause');
    if (!btn) return;
    btn.classList.remove('hidden');
    btn.textContent = isTimerRunning ? 'Clock Out' : 'Clock In';
    btn.className = isTimerRunning
      ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 px-2 py-0.5 rounded text-[9px] font-bold border border-rose-500/40 transition-all whitespace-nowrap'
      : 'bg-amber-500/15 hover:bg-amber-500/25 text-brand-gold px-2 py-0.5 rounded text-[9px] font-bold border border-amber-500/40 transition-all whitespace-nowrap';
  },

  render() {
    const state = this.snapshot();
    const weekText = document.getElementById('weekly-progress-text');
    const weekBar = document.getElementById('weekly-progress-bar');
    const dayText = document.getElementById('daily-progress-text');
    const dayBar = document.getElementById('daily-progress-bar');
    if (weekText) weekText.innerText = `${formatHms(state.weeklySeconds)} / ${formatHms(WEEKLY_GOAL_SECONDS)}`;
    if (weekBar) weekBar.style.width = `${Math.min(100, (state.weeklySeconds / WEEKLY_GOAL_SECONDS) * 100)}%`;
    if (dayText) dayText.innerText = `${formatHms(state.dailySeconds)} / ${formatHms(DAILY_GOAL_SECONDS)}`;
    if (dayBar) dayBar.style.width = `${Math.min(100, (state.dailySeconds / DAILY_GOAL_SECONDS) * 100)}%`;
    this.syncPauseButton();
    if (typeof FOCUS_LOG !== 'undefined') FOCUS_LOG.render();
    if (typeof DAILY_QUOTE !== 'undefined') DAILY_QUOTE.render();
  },

  tick() {
    const state = this.snapshot();
    state.weeklySeconds += 1;
    state.dailySeconds += 1;
    state.log[state.dayKey] = state.dailySeconds;
    this.syncGlobals(state);
    this.persist(state);
    this.render();
  },

  scheduleMidnightReset() {
    clearTimeout(this.midnightTimer);
    this.midnightTimer = setTimeout(() => {
      if (isTimerRunning) {
        isTimerRunning = false;
        clearInterval(timerInterval);
      }
      const state = this.snapshot();
      this.persist(state);
      this.render();
      this.scheduleMidnightReset();
      if (typeof CLOCK_IN !== 'undefined') CLOCK_IN.prompt();
    }, this.msUntilMidnight());
  },

  init() {
    const state = this.load();
    this.syncGlobals(state);
    this.persist(state);
    if (typeof CLOCK_IN !== 'undefined') {
      const next = CLOCK_IN.ensureMembership(this.snapshot());
      this.syncGlobals(next);
      this.persist(next);
    }
    this.render();
    this.scheduleMidnightReset();
    if (typeof CLOCK_IN !== 'undefined') CLOCK_IN.prompt();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const next = this.snapshot();
        this.persist(next);
        this.render();
      }
    });
  }
};

function renderWeeklyProgress() {
  FOCUS_TIMER.render();
}

function startFocusTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  timerInterval = setInterval(() => FOCUS_TIMER.tick(), 1000);
  FOCUS_TIMER.syncPauseButton();
}

function pauseFocusTimer() {
  if (!isTimerRunning) return;
  isTimerRunning = false;
  clearInterval(timerInterval);
  FOCUS_TIMER.persist(FOCUS_TIMER.snapshot());
  FOCUS_TIMER.syncPauseButton();
}

function toggleFocusClock() {
  if (isTimerRunning) {
    pauseFocusTimer();
    return;
  }
  const today = FOCUS_TIMER.dayKey();
  if (FOCUS_TIMER.clockInDay === today) {
    startFocusTimer();
    return;
  }
  if (typeof CLOCK_IN !== 'undefined') CLOCK_IN.show();
  else startFocusTimer();
}

function openFocusLog() {
  const sub = document.getElementById('subnav-entrepreneur');
  if (sub && sub.classList.contains('hidden')) {
    currentActiveMode = 'entrepreneur';
    renderModeNav('entrepreneur');
    sub.classList.remove('hidden');
    setIdentityHeaderState('entrepreneur', true);
  }
  switchTab('ent-goals');
  if (typeof FOCUS_LOG !== 'undefined') {
    FOCUS_LOG.lastChartAt = 0;
    FOCUS_LOG.render();
  }
  requestAnimationFrame(() => {
    const el = document.getElementById('goals-focus-log');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

const DAILY_QUOTE = {
  quotes: [
    { text: 'At the birth of every great business organization was an enthusiast consumed with earnestness of purpose and confidence in their powers.', author: 'B.C. Forbes' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'What you do every day matters more than what you do once in a while.', author: 'Gretchen Rubin' },
    { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
    { text: 'An inch of movement will bring you closer to your goals than a mile of intention.', author: 'Steve Maraboli' },
    { text: 'Do the hard jobs first. The easy jobs will take care of themselves.', author: 'Dale Carnegie' },
    { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' }
  ],

  pick() {
    const key = typeof FOCUS_TIMER !== 'undefined' ? FOCUS_TIMER.dayKey() : String(new Date().getDate());
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
    return this.quotes[Math.abs(hash) % this.quotes.length];
  },

  html() {
    const q = this.pick();
    return `"${q.text}" <span class="not-italic text-brand-gold font-semibold">— ${q.author}</span>`;
  },

  render() {
    const el = document.getElementById('cc-quote-text');
    if (el) el.innerHTML = this.html();
  }
};

const DAILY_INSPO = {
  seeds: [
    {
      id: 'inspo-day-03',
      title: 'Scandinavian Minimalism',
      promptText: 'Sunlit workspace with raw oak wood, matte ceramic mug, soft beige tones, top-down view, 35mm film grain.',
      imageUrl: '../assets/daily-inspo-scandinavian.jpg',
      philosophyTitle: 'Scandinavian Minimalism',
      philosophyBody: 'Channel your inner "Lagom" which translates to "not too little, not too much," and "Hygge" translating to coziness.',
      application: [
        { icon: '📸', label: 'Visual / Render', text: 'Use crisp composition, flat lighting, and plenty of empty space to create an ambiance that feels deeply quiet, deliberate, and calm.' },
        { icon: '🎥', label: 'Video Direction', text: 'Translate text rules into visual grammar, focusing on negative space, muted natural lighting, and long, static frames that let the environment speak.' },
        { icon: '✍️', label: 'Writing & Scripting', text: 'Use bare, unadorned prose to let the quietness of the space between the words carry the emotional weight.' },
        { icon: '📱', label: 'Social & Brand', text: 'Use a hyper-focused visual strategy to build instant trust through uncluttered layouts, generous whitespace, and a humble, human-centric voice while rejecting aggressive marketing tactics.' }
      ]
    }
  ],

  pick() {
    return this.seeds[0];
  },

  render() {
    const el = document.getElementById('cs-inspo-line');
    if (!el) return;
    const seed = this.pick();
    el.innerHTML = `"${this.escape(seed.promptText)}" <span class="not-italic text-brand-gold font-semibold">— ${this.escape(seed.title)}</span>`;
  },

  escape(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  openPhilosophy() {
    const seed = this.pick();
    const modal = document.getElementById('cs-inspo-modal');
    const title = document.getElementById('cs-inspo-philosophy-title');
    const body = document.getElementById('cs-inspo-philosophy-body');
    if (title) title.textContent = seed.philosophyTitle;
    if (body) body.textContent = seed.philosophyBody;
    if (!modal) return;
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    modal.style.zIndex = '420';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closePhilosophy() {
    const modal = document.getElementById('cs-inspo-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  openApplication() {
    const seed = this.pick();
    const modal = document.getElementById('cs-inspo-app-modal');
    const body = document.getElementById('cs-inspo-app-body');
    if (body) {
      body.innerHTML = (seed.application || []).map((row) => `
        <div>
          <div class="text-[10px] font-bold text-brand-gold mb-0.5">${row.icon} ${this.escape(row.label)}</div>
          <p>${this.escape(row.text)}</p>
        </div>
      `).join('');
    }
    if (!modal) return;
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    modal.style.zIndex = '420';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeApplication() {
    const modal = document.getElementById('cs-inspo-app-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  openInCreatorAI() {
    if (typeof CREATOR_AI !== 'undefined' && CREATOR_AI.loadDailyInspo) CREATOR_AI.loadDailyInspo(this.pick());
  }
};

const CLOCK_IN = {
  sessionKey: 'dimad_clockin_session',

  readUser() {
    try {
      return JSON.parse(localStorage.getItem('dimad_user') || '') || {};
    } catch (err) {
      return {};
    }
  },

  writeUser(user) {
    localStorage.setItem('dimad_user', JSON.stringify(user));
  },

  userName() {
    const raw = this.readUser();
    if (raw && raw.name) return String(raw.name).split(' ')[0];
    if (raw && raw.email) return String(raw.email).split('@')[0];
    return '';
  },

  greeting() {
    const name = this.userName();
    const pretty = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
    return pretty ? `Have a good day, ${pretty}.` : 'Have a good day.';
  },

  show() {
    const modal = document.getElementById('clock-in-modal');
    if (!modal) return;
    const greet = document.getElementById('clock-in-greeting');
    const quote = document.getElementById('clock-in-quote');
    if (greet) greet.textContent = this.greeting();
    if (quote) quote.innerHTML = DAILY_QUOTE.html();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  hide() {
    const modal = document.getElementById('clock-in-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  prompt() {
    if (isTimerRunning) return;
    const today = FOCUS_TIMER.dayKey();
    try {
      if (sessionStorage.getItem(this.sessionKey) === today && FOCUS_TIMER.clockInDay === today) return;
    } catch (err) { /* continue */ }
    this.show();
  },

  confirm() {
    const today = FOCUS_TIMER.dayKey();
    this.registerDay(today);
    try { sessionStorage.setItem(this.sessionKey, today); } catch (err) { /* skip */ }
    this.hide();
    startFocusTimer();
  },

  ensureMembership(state) {
    const user = this.readUser();
    let start = state.membershipStart || user.membershipStart || '';
    if (!start) {
      const days = FOCUS_TIMER.normalizeDays(state.clockInDays);
      start = days[0] || FOCUS_TIMER.dayKey();
    }
    if (!user.membershipStart) {
      user.membershipStart = start;
      this.writeUser(user);
    }
    state.membershipStart = user.membershipStart || start;
    if (state.clockInDay && !state.clockInDays.includes(state.clockInDay)) {
      state.clockInDays = FOCUS_TIMER.normalizeDays(state.clockInDays.concat(state.clockInDay));
    }
    const yearStart = FOCUS_TIMER.yearStartKey(state);
    if (state.claimedYearStart !== yearStart) {
      state.claimedMilestones = [];
      state.claimedYearStart = yearStart;
    }
    return state;
  },

  yearWindow() {
    const state = this.ensureMembership(FOCUS_TIMER.snapshot());
    const start = FOCUS_TIMER.yearStartKey(state);
    return { start, end: FOCUS_TIMER.addYear(start), state };
  },

  yearDays() {
    const { start, end, state } = this.yearWindow();
    return FOCUS_TIMER.normalizeDays(state.clockInDays).filter((day) => day >= start && day < end).length;
  },

  registerDay(day) {
    const today = day || FOCUS_TIMER.dayKey();
    const state = this.ensureMembership(FOCUS_TIMER.snapshot());
    state.clockInDay = today;
    if (!state.clockInDays.includes(today)) state.clockInDays.push(today);
    state.clockInDays = FOCUS_TIMER.normalizeDays(state.clockInDays);
    const yearStart = FOCUS_TIMER.yearStartKey(state);
    if (state.claimedYearStart !== yearStart) {
      state.claimedMilestones = [];
      state.claimedYearStart = yearStart;
    }
    const days = state.clockInDays.filter((key) => key >= yearStart && key < FOCUS_TIMER.addYear(yearStart)).length;
    const claimed = new Set(state.claimedMilestones);
    const milestones = (typeof DIM_ENGINE !== 'undefined' && DIM_ENGINE.streakMilestones) ? DIM_ENGINE.streakMilestones : [];
    milestones.forEach((m) => {
      if (days >= m.days && !claimed.has(m.days)) {
        claimed.add(m.days);
        if (typeof DIM_ENGINE !== 'undefined') {
          DIM_ENGINE.user.totalDimBalance += m.baseReward;
        }
      }
    });
    state.claimedMilestones = Array.from(claimed).sort((a, b) => a - b);
    FOCUS_TIMER.syncGlobals(state);
    FOCUS_TIMER.persist(state);
    if (typeof DIM_ENGINE !== 'undefined') {
      DIM_ENGINE.user.streakDays = days;
      DIM_ENGINE.updateUI();
    }
    if (typeof FOCUS_LOG !== 'undefined') {
      FOCUS_LOG.lastChartAt = 0;
      FOCUS_LOG.render();
    }
  }
};

const FOCUS_LOG = {
  lastChartAt: 0,
  lastTrendAt: 0,
  trendDirty: true,
  trendMode: 'daily',

  fmtDate(key) {
    const d = FOCUS_TIMER.parseDayKey(key);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  render() {
    const root = document.getElementById('goals-focus-log');
    if (!root) return;
    const now = Date.now();
    const hoursEl = document.getElementById('focus-log-hours');
    const freqEl = document.getElementById('focus-log-freq');
    const { start, end, state } = CLOCK_IN.yearWindow();
    const days = CLOCK_IN.yearDays();
    const next = DIM_ENGINE.streakMilestones.find((m) => m.days > days);
    const claimed = new Set(state.claimedMilestones || []);
    const earned = DIM_ENGINE.streakMilestones.reduce((sum, m) => sum + ((claimed.has(m.days) || days >= m.days) ? m.baseReward : 0), 0);
    if (hoursEl) hoursEl.textContent = `${days} / 365 days`;
    if (freqEl) freqEl.textContent = next
      ? `Next ${next.days}d · ${next.baseReward.toLocaleString()} $DIM`
      : 'Year complete';
    const rangeEl = document.getElementById('focus-log-range');
    if (rangeEl) rangeEl.textContent = `${this.fmtDate(start)} – ${this.fmtDate(end)}`;
    const earnedEl = document.getElementById('focus-log-earned');
    if (earnedEl) earnedEl.textContent = `${earned.toLocaleString()} $DIM`;
    this.updateTrendStats(state, start, end);
    const chartReady = document.getElementById('focus-log-chart') && document.getElementById('focus-log-chart').children.length;
    if (now - this.lastChartAt < 4000 && this.lastChartAt && chartReady && !this.trendDirty) {
      if (now - this.lastTrendAt >= 20000) this.drawTrend(state, start, end);
      return;
    }
    this.lastChartAt = now;
    this.drawBar(days);
    this.drawHeat(start, end, state.clockInDays || []);
    this.drawMilestones(days, claimed);
    this.drawTrend(state, start, end);
  },

  fmtHours(sec) {
    const n = Math.max(0, Math.floor(sec || 0));
    if (n < 60) return `${n}s`;
    if (n < 3600) return `${Math.round(n / 60)}m`;
    const h = n / 3600;
    if (h < 10) return `${h.toFixed(1)}h`;
    return `${Math.round(h)}h`;
  },

  daySeconds(state, key) {
    if (key === FOCUS_TIMER.dayKey()) return Math.max(0, state.dailySeconds || 0);
    return Math.max(0, (state.log && state.log[key]) || 0);
  },

  rangeSeconds(state, from, to) {
    let total = 0;
    const startDate = FOCUS_TIMER.parseDayKey(from);
    for (let i = 0; i < 400; i += 1) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = FOCUS_TIMER.dayKey(d);
      if (key >= to) break;
      total += this.daySeconds(state, key);
    }
    return total;
  },

  setTrend(mode) {
    this.trendMode = mode === 'weekly' || mode === 'yearly' ? mode : 'daily';
    this.trendDirty = true;
    this.lastTrendAt = 0;
    this.render();
  },

  syncTrendTabs() {
    ['daily', 'weekly', 'yearly'].forEach((mode) => {
      const btn = document.getElementById(`focus-trend-${mode}`);
      if (!btn) return;
      const on = this.trendMode === mode;
      btn.className = `px-2.5 py-1 text-[10px] font-bold ${mode === 'daily' ? '' : 'border-l border-slate-800 '}${on ? 'text-brand-gold bg-amber-500/10' : 'text-slate-400 hover:text-slate-200'}`;
    });
  },

  updateTrendStats(state, start, end) {
    const today = FOCUS_TIMER.dayKey();
    const weekStart = FOCUS_TIMER.weekKey();
    const weekEndDate = FOCUS_TIMER.parseDayKey(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const todayEl = document.getElementById('focus-trend-today');
    const weekEl = document.getElementById('focus-trend-week');
    const yearEl = document.getElementById('focus-trend-year');
    if (todayEl) todayEl.textContent = this.fmtHours(this.daySeconds(state, today));
    if (weekEl) weekEl.textContent = this.fmtHours(this.rangeSeconds(state, weekStart, FOCUS_TIMER.dayKey(weekEndDate)));
    if (yearEl) yearEl.textContent = this.fmtHours(this.rangeSeconds(state, start, end));
  },

  trendSeries(state, start, end) {
    const today = FOCUS_TIMER.dayKey();
    const todayDate = FOCUS_TIMER.parseDayKey(today);
    if (this.trendMode === 'weekly') {
      return Array.from({ length: 12 }, (_, i) => {
        const cursor = new Date(todayDate);
        cursor.setDate(cursor.getDate() - ((11 - i) * 7));
        const weekStart = FOCUS_TIMER.weekKey(cursor);
        const weekEnd = FOCUS_TIMER.parseDayKey(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const to = FOCUS_TIMER.dayKey(weekEnd);
        const d = FOCUS_TIMER.parseDayKey(weekStart);
        return {
          key: weekStart,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          seconds: this.rangeSeconds(state, weekStart, to),
          hint: `Week of ${this.fmtDate(weekStart)}`
        };
      });
    }
    if (this.trendMode === 'yearly') {
      const yearStart = FOCUS_TIMER.parseDayKey(start);
      return Array.from({ length: 12 }, (_, i) => {
        const month = new Date(yearStart.getFullYear(), yearStart.getMonth() + i, 1);
        const next = new Date(yearStart.getFullYear(), yearStart.getMonth() + i + 1, 1);
        const from = FOCUS_TIMER.dayKey(month);
        const to = FOCUS_TIMER.dayKey(next);
        return {
          key: from,
          label: month.toLocaleDateString('en-US', { month: 'short' }),
          seconds: this.rangeSeconds(state, from, to < end ? to : end),
          hint: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      });
    }
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() - (13 - i));
      const key = FOCUS_TIMER.dayKey(d);
      return {
        key,
        label: String(d.getDate()),
        seconds: this.daySeconds(state, key),
        hint: this.fmtDate(key)
      };
    });
  },

  drawTrend(state, start, end) {
    const svg = document.getElementById('focus-trend-chart');
    if (!svg) return;
    this.lastTrendAt = Date.now();
    this.trendDirty = false;
    this.syncTrendTabs();
    const series = this.trendSeries(state, start, end);
    const goal = this.trendMode === 'weekly' ? WEEKLY_GOAL_SECONDS : this.trendMode === 'yearly' ? MONTHLY_GOAL_SECONDS : DAILY_GOAL_SECONDS;
    const maxSec = Math.max(goal, ...series.map((item) => item.seconds), 1);
    const x0 = 44;
    const x1 = 886;
    const y0 = 16;
    const y1 = 136;
    const bw = x1 - x0;
    const bh = y1 - y0;
    const slot = bw / series.length;
    const barW = Math.max(8, slot * 0.58);
    const points = series.map((item, i) => {
      const x = x0 + i * slot + slot / 2;
      const h = (item.seconds / maxSec) * bh;
      return { ...item, x, y: y1 - h, h };
    });
    const line = points.map((pt, i) => `${i ? 'L' : 'M'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    const goalY = y1 - (goal / maxSec) * bh;
    const bars = points.map((pt) => {
      const on = pt.seconds > 0;
      const x = pt.x - barW / 2;
      return `<rect x="${x.toFixed(1)}" y="${pt.y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(pt.h, on ? 2 : 0).toFixed(1)}" rx="3" fill="${on ? '#F59E0B' : '#1E293B'}" opacity="${on ? '0.92' : '0.7'}">
        <title>${pt.hint}: ${this.fmtHours(pt.seconds)}</title>
      </rect>`;
    }).join('');
    const labels = points.map((pt) => `<text x="${pt.x.toFixed(1)}" y="154" text-anchor="middle" fill="#64748B" font-size="9" font-weight="700" font-family="JetBrains Mono, monospace">${pt.label}</text>`).join('');
    const ticks = [0, 0.5, 1].map((ratio) => {
      const y = y1 - ratio * bh;
      const sec = maxSec * ratio;
      return `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="#1E293B" stroke-width="1"/>
        <text x="40" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="#64748B" font-size="8" font-family="JetBrains Mono, monospace">${this.fmtHours(sec)}</text>`;
    }).join('');
    svg.innerHTML = `
      ${ticks}
      <line x1="${x0}" y1="${goalY.toFixed(1)}" x2="${x1}" y2="${goalY.toFixed(1)}" stroke="#F59E0B" stroke-opacity="0.35" stroke-dasharray="4 4"/>
      ${bars}
      <path d="${line}" fill="none" stroke="#FDE68A" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>
      ${points.map((pt) => pt.seconds ? `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="2.6" fill="#FDE68A" stroke="#F59E0B" stroke-width="1"/>` : '').join('')}
      ${labels}
    `;
  },

  drawBar(days) {
    const svg = document.getElementById('focus-log-chart');
    if (!svg) return;
    const x0 = 46;
    const x1 = 854;
    const y = 52;
    const barH = 28;
    const bw = x1 - x0;
    const ratio = Math.min(1, days / 365);
    const fill = Math.max(days ? 18 : 0, ratio * bw);
    const headX = x0 + fill;
    const ticks = DIM_ENGINE.streakMilestones.map((m, i) => {
      const x = x0 + (m.days / 365) * bw;
      const on = days >= m.days;
      const current = !on && !DIM_ENGINE.streakMilestones.some((other) => other.days > days && other.days < m.days);
      const major = m.days === 10 || m.days === 100 || m.days === 200 || m.days === 365;
      const mid = m.days === 30 || m.days === 50 || m.days === 180 || m.days === 250;
      const top = i % 2 === 1;
      const above = top ? (major ? 18 : mid ? 12 : 8) : (major ? 6 : 3);
      const below = top ? (major ? 6 : 3) : (major ? 16 : mid ? 11 : 8);
      const stroke = on ? '#FCD34D' : current ? '#F59E0B' : '#64748B';
      const fillDot = on ? '#F59E0B' : current ? '#B45309' : '#0B0F17';
      const dayFill = on ? '#FDE68A' : current ? '#F59E0B' : '#94A3B8';
      const dimFill = on ? '#F59E0B' : current ? '#D97706' : '#64748B';
      const weight = major ? '2.2' : mid ? '1.6' : '1.15';
      const dimLabel = `${m.baseReward.toLocaleString()} $DIM`;
      const labelY = top ? y - 22 : y + barH + 16;
      const dimY = top ? y - 10 : y + barH + 28;
      return `<line x1="${x.toFixed(1)}" y1="${(y - above).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + barH + below).toFixed(1)}" stroke="${stroke}" stroke-width="${weight}" opacity="${on ? '0.95' : '0.55'}" stroke-linecap="round"/>
        <circle cx="${x.toFixed(1)}" cy="${y + barH / 2}" r="${major ? 6 : mid ? 5 : 4}" fill="${fillDot}" stroke="${stroke}" stroke-width="1.6"/>
        <text x="${x.toFixed(1)}" y="${labelY}" text-anchor="middle" fill="${dayFill}" font-size="9" font-weight="800" font-family="JetBrains Mono, monospace">${m.days} days</text>
        <text x="${x.toFixed(1)}" y="${dimY}" text-anchor="middle" fill="${dimFill}" font-size="8" font-weight="700" font-family="JetBrains Mono, monospace">${dimLabel}</text>`;
    }).join('');
    svg.setAttribute('viewBox', '0 0 900 130');
    svg.innerHTML = `
      <defs>
        <linearGradient id="focus-gold-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#B45309"/>
          <stop offset="45%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#FDE68A"/>
        </linearGradient>
        <linearGradient id="focus-gold-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFF7ED" stop-opacity="0.45"/>
          <stop offset="55%" stop-color="#F59E0B" stop-opacity="0"/>
        </linearGradient>
        <filter id="focus-gold-glow" x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="3.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="${x0}" y="${y}" width="${bw}" height="${barH}" rx="16" fill="#070A0F" stroke="#F59E0B" stroke-opacity="0.45"/>
      <rect x="${x0}" y="${y}" width="${fill.toFixed(1)}" height="${barH}" rx="16" fill="url(#focus-gold-bar)" filter="url(#focus-gold-glow)"/>
      <rect x="${x0}" y="${y}" width="${fill.toFixed(1)}" height="${barH / 2}" rx="16" fill="url(#focus-gold-shine)"/>
      ${ticks}
      ${days ? `<circle cx="${headX.toFixed(1)}" cy="${y + barH / 2}" r="9" fill="#FDE68A" stroke="#F59E0B" stroke-width="2.4" filter="url(#focus-gold-glow)"/>` : ''}
    `;
  },

  drawHeat(start, end, clockInDays) {
    const root = document.getElementById('focus-log-dots');
    if (!root) return;
    const set = new Set(clockInDays);
    const startDate = FOCUS_TIMER.parseDayKey(start);
    const cells = [];
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = FOCUS_TIMER.dayKey(d);
      if (key >= end) break;
      const on = set.has(key);
      const today = key === FOCUS_TIMER.dayKey();
      cells.push(`<span title="${key}${on ? ' · Clocked in' : ''}" class="h-2 w-2 rounded-[2px] ${on ? 'bg-amber-400' : 'bg-slate-800'} ${today ? 'ring-1 ring-brand-accent' : ''}"></span>`);
    }
    root.innerHTML = cells.join('');
  },

  drawMilestones(days, claimed) {
    const root = document.getElementById('focus-log-milestones');
    if (!root) return;
    root.innerHTML = DIM_ENGINE.streakMilestones.map((m) => {
      const on = claimed.has(m.days) || days >= m.days;
      const current = days < m.days && !DIM_ENGINE.streakMilestones.some((other) => other.days > days && other.days < m.days);
      return `<div class="rounded-lg border px-2 py-1.5 text-center ${on ? 'border-emerald-500/40 bg-emerald-500/10' : current ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950'}">
        <div class="text-[10px] font-black ${on ? 'text-emerald-400' : current ? 'text-amber-400' : 'text-slate-500'}">${m.days}d</div>
        <div class="text-[9px] font-mono ${on || current ? 'text-amber-400' : 'text-slate-600'}">${m.baseReward.toLocaleString()} $DIM</div>
      </div>`;
    }).join('');
  }
};

const CONNECT_MODULARS = {
  connectStripe() {
    openSalesRevenue();
  },

  connectStore(platform) {
    openSalesRevenue();
  },

  connectCalendar(provider) {
    if (provider === 'Calendly') {
      if (typeof window.DIMAD_CALENDLY?.connect === 'function') {
        return window.DIMAD_CALENDLY.connect();
      }
      const host = window.location.hostname;
      const base = (host === '127.0.0.1' || host === 'localhost') ? 'http://localhost:3000' : '';
      window.location.assign(`${base}/api/auth/calendly/connect`);
      return;
    }
    const status = document.getElementById('calendar-source-status');
    if (status) status.textContent = `${provider} Calendar synced`;
    const locked = document.querySelector('[data-cal-locked-source]');
    if (locked) locked.textContent = `Synced via ${provider}`;
  }
};

const DIMAD_NOTEPAD = {
  storageKey: 'dimad_notepad',
  activeId: null,
  dirty: false,
  ctxId: null,
  renamingId: null,
  bound: false,
  saveFlash: null,
  autoTimer: null,

  normalize(note) {
    return {
      ...note,
      createdAt: note.createdAt || note.updatedAt || Date.now(),
      updatedAt: note.updatedAt || note.createdAt || Date.now(),
      customTitle: !!note.customTitle
    };
  },

  load() {
    let notes = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (Array.isArray(parsed)) notes = parsed.map((note) => this.normalize(note));
    } catch (err) { /* start empty */ }
    notes = this.mergeFromDrive(notes);
    if (notes.length) {
      if (notes.some((note) => !note.driveFileId) && typeof DIMDRIVE !== 'undefined' && DIMDRIVE.syncNotepad) {
        this.persist(notes);
        try {
          return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        } catch (err) {
          return notes;
        }
      }
      return notes;
    }
    const now = Date.now();
    const welcome = [{
      id: 'note-welcome',
      title: 'Untitled',
      body: 'Cloud-based notepad that auto-saves to dimDrive. Save your thoughts here.',
      createdAt: now,
      updatedAt: now,
      customTitle: false
    }];
    this.persist(welcome);
    return welcome;
  },

  mergeFromDrive(notes) {
    if (typeof DIMDRIVE === 'undefined' || !DIMDRIVE.listNotepad) return notes;
    const files = DIMDRIVE.listNotepad();
    if (!files.length) return notes;
    const byId = new Map(notes.map((note) => [String(note.id), note]));
    let changed = false;
    files.forEach((file) => {
      const payload = file.payload || {};
      const id = String(payload.noteId || file.id);
      const incoming = this.normalize({
        id,
        title: payload.title || String(file.name || 'Untitled').replace(/\.txt$/i, ''),
        body: payload.body != null ? payload.body : (payload.text || ''),
        createdAt: payload.createdAt || file.createdAt,
        updatedAt: payload.updatedAt || file.updatedAt,
        customTitle: !!payload.customTitle,
        driveFileId: file.id
      });
      const current = byId.get(id);
      if (!current) {
        notes.push(incoming);
        byId.set(id, incoming);
        changed = true;
        return;
      }
      if (!current.driveFileId) {
        current.driveFileId = file.id;
        changed = true;
      }
      if (Number(incoming.updatedAt || 0) > Number(current.updatedAt || 0)) {
        Object.assign(current, incoming);
        changed = true;
      }
    });
    if (changed) this.persist(notes, { skipDrive: true });
    return notes;
  },

  persist(notes, opts = {}) {
    localStorage.setItem(this.storageKey, JSON.stringify(notes));
    if (opts.skipDrive) return;
    if (typeof DIMDRIVE === 'undefined' || !DIMDRIVE.syncNotepad) return;
    const mapped = DIMDRIVE.syncNotepad(notes, opts.removedIds || []);
    if (mapped) localStorage.setItem(this.storageKey, JSON.stringify(mapped));
  },

  titleFromBody(body) {
    const text = String(body || '').replace(/\s+/g, ' ').trim();
    if (!text) return 'Untitled';
    const words = text.split(' ').slice(0, 8).join(' ');
    return words.length > 52 ? `${words.slice(0, 52).trim()}…` : words;
  },

  displayTitle(note) {
    if (note.customTitle && (note.title || '').trim()) return note.title.trim();
    return this.titleFromBody(note.body);
  },

  createdLabel(note) {
    const stamp = new Date(note.createdAt || Date.now());
    return stamp.toLocaleString();
  },

  bindUi() {
    if (this.bound) return;
    this.bound = true;
    document.addEventListener('click', () => {
      this.closeCtx();
      this.closeRecent();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCtx();
        this.closeRecent();
      }
    });
    window.addEventListener('resize', () => {
      if (this.mounted) this.placeRail();
    });
  },

  render() {
    this.bindUi();
    this.closeCtx();
    const list = document.getElementById('notepad-list');
    const bodyEl = document.getElementById('notepad-body');
    const metaEl = document.getElementById('notepad-meta');
    if (!list || !bodyEl) return;

    const notes = this.load();
    if (!this.activeId || !notes.some((n) => n.id === this.activeId)) {
      this.activeId = notes[0] ? notes[0].id : null;
    }
    const active = notes.find((n) => n.id === this.activeId) || notes[0];

    list.innerHTML = notes.map((note) => {
      const selected = note.id === this.activeId
        ? 'bg-amber-500/10 border-amber-500/30 text-slate-100'
        : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200';
      if (this.renamingId === note.id) {
        return `
          <div class="w-full text-left px-2.5 py-2 rounded-lg border ${selected}">
            <input id="notepad-rename-input" type="text" value="${this.escape(this.displayTitle(note))}"
              onkeydown="DIMAD_NOTEPAD.renameKey(event)" onblur="DIMAD_NOTEPAD.commitRename()"
              class="w-full bg-slate-900 border border-amber-500/40 rounded px-2 py-1 text-[12px] text-slate-100 outline-none">
            <div class="text-[10px] text-slate-500 mt-1">Created ${this.escape(this.createdLabel(note))}</div>
          </div>`;
      }
      return `
        <button type="button" onclick="DIMAD_NOTEPAD.select('${note.id}')" oncontextmenu="DIMAD_NOTEPAD.openCtx(event, '${note.id}')" class="w-full text-left px-2.5 py-2 rounded-lg border ${selected} transition">
          <div class="text-[12px] font-semibold truncate">${this.escape(this.displayTitle(note))}</div>
          <div class="text-[10px] text-slate-500 mt-0.5">Created ${this.escape(this.createdLabel(note))}</div>
        </button>`;
    }).join('');

    if (!active) {
      bodyEl.value = '';
      if (metaEl) metaEl.textContent = 'No note selected';
      this.dirty = false;
      this.syncSaveButton();
      return;
    }
    if (!this.dirty) bodyEl.value = active.body || '';
    if (metaEl) metaEl.textContent = `Created ${this.createdLabel(active)} · dimDrive`;
    const fullTitle = document.getElementById('notepad-title');
    if (fullTitle && !(this._editingTitle && this._titleWhere === 'full')) {
      fullTitle.textContent = this.displayTitle(active);
      fullTitle.classList.remove('hidden');
    }
    this.syncSaveButton();
    this.renderDash();

    if (this.renamingId) {
      const input = document.getElementById('notepad-rename-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
  },

  select(id) {
    if (this.dirty) this.save({ silent: true });
    this.activeId = id;
    this.dirty = false;
    this.renamingId = null;
    this.render();
  },

  create() {
    if (this.dirty) this.save({ silent: true });
    const notes = this.load();
    const now = Date.now();
    const note = { id: `note-${now}`, title: 'Untitled', body: '', createdAt: now, updatedAt: now, customTitle: false };
    notes.unshift(note);
    this.activeId = note.id;
    this.dirty = false;
    this.persist(notes);
    this.render();
    this.renderDash();
    const bodyEl = document.getElementById('notepad-body');
    if (bodyEl) bodyEl.focus();
  },

  createFromDash(prefix) {
    this._editSource = prefix === 'cs' ? 'cs' : 'dash';
    if (this.dirty) this.save({ silent: true });
    const notes = this.load();
    const now = Date.now();
    const note = { id: `note-${now}`, title: 'Untitled', body: '', createdAt: now, updatedAt: now, customTitle: false };
    notes.unshift(note);
    this.activeId = note.id;
    this.dirty = false;
    this.persist(notes);
    this.renderDash();
    if (document.getElementById('notepad-list')) this.render();
    const dash = document.getElementById(this._editSource === 'cs' ? 'cs-notepad-body' : 'cc-notepad-body');
    if (dash) {
      dash.value = '';
      dash.focus();
    }
    const status = document.getElementById(this._editSource === 'cs' ? 'cs-notepad-status' : 'cc-notepad-status');
    if (status) status.textContent = 'New note — start writing.';
  },

  editorEl() {
    const studio = document.getElementById('cs-notepad-body');
    const dash = document.getElementById('cc-notepad-body');
    const full = document.getElementById('notepad-body');
    if (this._editSource === 'cs' && studio) return studio;
    if (this._editSource === 'dash' && dash) return dash;
    if (this._editSource === 'full' && full) return full;
    return dash || studio || full;
  },

  ensureActive() {
    const notes = this.load();
    if (this.activeId && notes.some((n) => n.id === this.activeId)) return this.activeId;
    if (!notes.length) {
      const now = Date.now();
      const note = { id: `note-${now}`, title: 'Untitled', body: '', createdAt: now, updatedAt: now, customTitle: false };
      this.persist([note]);
      this.activeId = note.id;
      return this.activeId;
    }
    this.activeId = notes[0].id;
    return this.activeId;
  },

  markDirty(source) {
    if (source) this._editSource = source === 'cs' ? 'cs' : source;
    this.dirty = true;
    this.syncSaveButton();
    const statusId = this._editSource === 'cs' ? 'cs-notepad-status' : 'cc-notepad-status';
    const status = document.getElementById(statusId);
    if (status && (this._editSource === 'dash' || this._editSource === 'cs')) status.textContent = 'Saving…';
    clearTimeout(this.autoTimer);
    this.autoTimer = setTimeout(() => this.save({ silent: true }), 700);
  },

  syncSaveButton() {
    const btn = document.getElementById('notepad-quick-save');
    if (btn && !this.saveFlash) {
      btn.textContent = 'Quick Save';
      btn.classList.toggle('opacity-80', !this.dirty);
    }
    ['cc-notepad-save', 'cs-notepad-save'].forEach((id) => {
      const dashBtn = document.getElementById(id);
      if (dashBtn && !this.saveFlash) dashBtn.textContent = 'Save';
    });
  },

  saveDash(prefix) {
    this._editSource = prefix === 'cs' ? 'cs' : 'dash';
    this.save({ silent: true, keepOpen: true });
    const dashBtn = document.getElementById(prefix === 'cs' ? 'cs-notepad-save' : 'cc-notepad-save');
    if (dashBtn) {
      dashBtn.textContent = 'Saved';
      this.saveFlash = setTimeout(() => {
        this.saveFlash = null;
        if (dashBtn) dashBtn.textContent = 'Save';
      }, 1100);
    }
  },

  save(opts = {}) {
    const source = this.editorEl();
    this.ensureActive();
    if (!source || !this.activeId) return;
    const body = source.value;
    const notes = this.load().map((note) => {
      if (note.id !== this.activeId) return note;
      const title = note.customTitle ? (note.title || this.titleFromBody(body)) : this.titleFromBody(body);
      return { ...note, title, body, updatedAt: Date.now() };
    });
    this.persist(notes);
    this.dirty = false;
    const fullEl = document.getElementById('notepad-body');
    const dashEl = document.getElementById('cc-notepad-body');
    const studioEl = document.getElementById('cs-notepad-body');
    if (fullEl && fullEl !== source) fullEl.value = body;
    if (dashEl && dashEl !== source) dashEl.value = body;
    if (studioEl && studioEl !== source) studioEl.value = body;
    if (!opts.silent) {
      const btn = document.getElementById('notepad-quick-save');
      if (btn) {
        btn.textContent = 'Saved to dimDrive';
        this.saveFlash = setTimeout(() => {
          this.saveFlash = null;
          if (btn) btn.textContent = 'Quick Save';
          this.syncSaveButton();
        }, 1100);
      }
    }
    ['cc-notepad-status', 'cs-notepad-status'].forEach((id) => {
      const status = document.getElementById(id);
      if (status) status.textContent = 'Saved to DIMAD Notepad.';
    });
    if (opts.keepOpen || this._editSource === 'dash' || this._editSource === 'cs') {
      this.renderDash();
      return;
    }
    if (document.getElementById('notepad-list')) this.render();
    else this.renderDash();
  },

  openCtx(event, id) {
    event.preventDefault();
    event.stopPropagation();
    this.ctxId = id;
    const ctx = document.getElementById('notepad-ctx');
    if (!ctx) return;
    ctx.classList.remove('hidden');
    const x = Math.min(event.clientX, window.innerWidth - 170);
    const y = Math.min(event.clientY, window.innerHeight - 90);
    ctx.style.left = `${x}px`;
    ctx.style.top = `${y}px`;
  },

  closeCtx() {
    const ctx = document.getElementById('notepad-ctx');
    if (ctx) ctx.classList.add('hidden');
  },

  ctxAction(action) {
    const id = this.ctxId;
    this.closeCtx();
    if (!id) return;
    if (action === 'rename') {
      this.renamingId = id;
      this.render();
    }
    if (action === 'delete') this.remove(id);
  },

  renameKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitRename();
    }
    if (event.key === 'Escape') {
      this.renamingId = null;
      this.render();
    }
  },

  commitRename() {
    const id = this.renamingId;
    const input = document.getElementById('notepad-rename-input');
    this.renamingId = null;
    if (!id || !input) {
      this.render();
      return;
    }
    const name = input.value.trim();
    const notes = this.load().map((note) => {
      if (note.id !== id) return note;
      if (!name) return { ...note, customTitle: false, title: this.titleFromBody(note.body), updatedAt: Date.now() };
      return { ...note, title: name, customTitle: true, updatedAt: Date.now() };
    });
    this.persist(notes);
    this.render();
  },

  remove(id) {
    const target = id || this.activeId;
    if (!target) return;
    const notes = this.load().filter((n) => n.id !== target);
    this.persist(notes, { removedIds: [target] });
    if (this.activeId === target) {
      this.activeId = notes[0] ? notes[0].id : null;
      this.dirty = false;
    }
    this.render();
  },

  escape(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  renderPreview() {
    this.renderDash();
  },

  recentNotes() {
    return this.load()
      .slice()
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, 3);
  },

  renderRecentMenu() {
    const recent = this.recentNotes();
    const html = !recent.length
      ? '<p class="px-3 py-2 text-[10px] text-slate-500">No saved notes yet.</p>'
      : recent.map((note) => {
        const on = note.id === this.activeId;
        return `<button type="button" onclick="DIMAD_NOTEPAD.openRecent('${note.id}')" class="w-full text-left px-3 py-1.5 ${on ? 'bg-amber-500/10 text-amber-100' : 'text-slate-200 hover:bg-slate-900'}">
        <div class="text-[11px] font-semibold truncate">${this.escape(this.displayTitle(note))}</div>
        <div class="text-[9px] text-slate-500 truncate">${this.escape((note.body || '').replace(/\s+/g, ' ').trim().slice(0, 48) || 'Empty note')}</div>
      </button>`;
      }).join('');
    ['cc-notepad-recent', 'cs-notepad-recent'].forEach((id) => {
      const menu = document.getElementById(id);
      if (menu) menu.innerHTML = html;
    });
  },

  toggleRecent(event, prefix) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.bindUi();
    const menu = document.getElementById(`${prefix === 'cs' ? 'cs' : 'cc'}-notepad-recent`);
    if (!menu) return;
    const open = menu.classList.contains('hidden');
    this.closeRecent();
    if (open) {
      this.renderRecentMenu();
      menu.classList.remove('hidden');
    }
  },

  closeRecent() {
    ['cc-notepad-recent', 'cs-notepad-recent'].forEach((id) => {
      const menu = document.getElementById(id);
      if (menu) menu.classList.add('hidden');
    });
  },

  openRecent(id) {
    this.closeRecent();
    if (this.dirty) this.save({ silent: true });
    this.activeId = id;
    this.dirty = false;
    const studio = document.getElementById('view-creator-studio');
    this._editSource = (studio && !studio.classList.contains('hidden')) ? 'cs' : 'dash';
    this.renderDash();
    if (document.getElementById('notepad-list')) this.render();
  },

  titleFields(where) {
    if (where === 'full') {
      return {
        label: document.getElementById('notepad-title'),
        input: document.getElementById('notepad-title-input')
      };
    }
    if (where === 'cs') {
      return {
        label: document.getElementById('cs-notepad-title'),
        input: document.getElementById('cs-notepad-title-input')
      };
    }
    return {
      label: document.getElementById('cc-notepad-title'),
      input: document.getElementById('cc-notepad-title-input')
    };
  },

  beginTitleEdit(event, where) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.ensureActive();
    const notes = this.load();
    const active = notes.find((n) => n.id === this.activeId) || notes[0];
    if (!active) return;
    this._titleWhere = where === 'full' ? 'full' : (where === 'cs' ? 'cs' : 'dash');
    this._editingTitle = true;
    const { label, input } = this.titleFields(this._titleWhere);
    if (!label || !input) return;
    input.value = this.displayTitle(active);
    label.classList.add('hidden');
    input.classList.remove('hidden');
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  },

  titleKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitTitleEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelTitleEdit();
    }
  },

  hideTitleInputs() {
    ['cc-notepad-title', 'cs-notepad-title', 'notepad-title'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });
    ['cc-notepad-title-input', 'cs-notepad-title-input', 'notepad-title-input'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  },

  cancelTitleEdit() {
    this._editingTitle = false;
    this.hideTitleInputs();
    this.renderDash();
    if (document.getElementById('notepad-list')) this.render();
  },

  commitTitleEdit() {
    if (!this._editingTitle) return;
    const { input } = this.titleFields(this._titleWhere || 'dash');
    this._editingTitle = false;
    const name = input ? String(input.value || '').trim() : '';
    this.ensureActive();
    const notes = this.load().map((note) => {
      if (note.id !== this.activeId) return note;
      if (!name) return { ...note, customTitle: false, title: this.titleFromBody(note.body), updatedAt: Date.now() };
      return { ...note, title: name, customTitle: true, updatedAt: Date.now() };
    });
    this.persist(notes);
    this.hideTitleInputs();
    this.renderDash();
    if (document.getElementById('notepad-list')) this.render();
  },

  renderDash() {
    this.bindUi();
    const notes = this.load();
    const active = notes.find((n) => n.id === this.activeId) || notes[0];
    let found = false;
    ['cc', 'cs'].forEach((prefix) => {
      const titleEl = document.getElementById(`${prefix}-notepad-title`);
      const dashEl = document.getElementById(`${prefix}-notepad-body`);
      if (!titleEl && !dashEl) return;
      found = true;
      const where = prefix === 'cs' ? 'cs' : 'dash';
      if (!active) {
        if (titleEl && !(this._editingTitle && this._titleWhere === where)) titleEl.textContent = 'No notes yet';
        if (dashEl && !this.dirty) dashEl.value = '';
        return;
      }
      this.activeId = active.id;
      if (titleEl && !(this._editingTitle && this._titleWhere === where)) {
        titleEl.textContent = this.displayTitle(active);
        titleEl.classList.remove('hidden');
      }
      if (dashEl && !(this.dirty && this._editSource === where)) dashEl.value = active.body || '';
    });
    if (!found) return;
    this.renderRecentMenu();
  },

  openTab() {
    if (typeof switchTab === 'function') switchTab('dimad-notepad');
  },

  mount() {
    const rail = document.getElementById('np-rail');
    if (rail && rail.parentElement !== document.body) document.body.appendChild(rail);
    this.mounted = true;
    this.bindUi();
    this.placeRail();
    this.render();
  },

  unmount() {
    this.closeCtx();
    const rail = document.getElementById('np-rail');
    if (rail) {
      rail.classList.add('hidden');
      rail.classList.remove('flex');
    }
    this.mounted = false;
  },

  backToDashboard() {
    this.closeCtx();
    if (this.dirty) this.save({ silent: true });
    const dest = (typeof currentActiveMode !== 'undefined' && typeof MODE_NAV !== 'undefined' && MODE_NAV[currentActiveMode])
      ? MODE_NAV[currentActiveMode].defaultTab
      : 'ent-dashboard';
    if (typeof switchTab === 'function') switchTab(dest);
  },

  placeRail() {
    const rail = document.getElementById('np-rail');
    const nav = document.getElementById('main-sidebar');
    if (!rail || !nav) return;
    const box = nav.getBoundingClientRect();
    rail.style.position = 'fixed';
    rail.style.top = `${box.top}px`;
    rail.style.left = `${box.left}px`;
    rail.style.width = `${Math.max(box.width, 180)}px`;
    rail.style.height = `${box.height}px`;
    rail.style.zIndex = '355';
    rail.classList.remove('hidden');
    rail.classList.add('flex');
  },

  openDriveFile(file) {
    if (!file) return;
    const payload = file.payload || {};
    const id = String(payload.noteId || file.id);
    const notes = this.load();
    const idx = notes.findIndex((n) => String(n.id) === id || String(n.driveFileId) === String(file.id));
    const next = this.normalize({
      id,
      title: payload.title || String(file.name || 'Untitled').replace(/\.txt$/i, ''),
      body: payload.body != null ? payload.body : (payload.text || ''),
      createdAt: payload.createdAt || file.createdAt,
      updatedAt: payload.updatedAt || file.updatedAt || Date.now(),
      customTitle: !!payload.customTitle,
      driveFileId: file.id
    });
    if (idx >= 0) notes[idx] = { ...notes[idx], ...next };
    else notes.unshift(next);
    this.activeId = id;
    this.dirty = false;
    this.persist(notes, { skipDrive: true });
    this.render();
  }
};

const DESIGN_SUITE = {
  elements: [],
  selectedId: null,
  zoom: 1,
  size: { width: 1280, height: 720 },
  bg: '#070A0F',
  history: [],
  historyStep: -1,
  mounted: false,
  dragging: false,
  dragOffset: { x: 0, y: 0 },
  grid: 8,
  snap: 8,
  editingId: null,
  drawerCollapsed: false,
  templatesCollapsed: false,
  moved: false,

  el(id) { return document.getElementById(id); },

  mount() {
    if (!this.el('ds-artboard')) return;
    if (!this.mounted) {
      this.mounted = true;
      this.switchPanel('ai');
      this.loadTemplate('nomad-quote');
    }
    requestAnimationFrame(() => this.fit());
  },

  toggleDrawer() {
    this.drawerCollapsed = !this.drawerCollapsed;
    const drawer = this.el('ds-sidebar-drawer');
    const icon = this.el('ds-drawer-toggle') && this.el('ds-drawer-toggle').querySelector('i');
    if (drawer) drawer.classList.toggle('ds-drawer-collapsed', this.drawerCollapsed);
    if (icon) {
      icon.classList.toggle('fa-chevron-left', !this.drawerCollapsed);
      icon.classList.toggle('fa-chevron-right', this.drawerCollapsed);
    }
    requestAnimationFrame(() => this.fit());
  },

  toggleTemplates() {
    this.templatesCollapsed = !this.templatesCollapsed;
    const body = this.el('ds-templates-body');
    const chev = this.el('ds-templates-chevron');
    if (body) body.classList.toggle('hidden', this.templatesCollapsed);
    if (chev) {
      chev.classList.toggle('fa-chevron-down', !this.templatesCollapsed);
      chev.classList.toggle('fa-chevron-up', this.templatesCollapsed);
    }
  },

  switchPanel(name) {
    if (this.drawerCollapsed) this.toggleDrawer();
    document.querySelectorAll('#view-creator-design .ds-tab').forEach(btn => {
      const on = btn.getAttribute('data-ds-tab') === name;
      btn.classList.toggle('text-brand-gold', on);
      btn.classList.toggle('text-slate-400', !on);
    });
    document.querySelectorAll('#view-creator-design .ds-panel').forEach(p => p.classList.add('hidden'));
    const panel = this.el(`ds-panel-${name}`);
    if (panel) panel.classList.remove('hidden');
  },

  changePreset(val) {
    let w = 1280, h = 720;
    if (val === '1080x1080') { w = 1080; h = 1080; }
    else if (val === '1080x1920') { w = 1080; h = 1920; }
    else if (val === '1280x720') { w = 1280; h = 720; }
    else if (val === '1500x500') { w = 1500; h = 500; }
    else if (val === '1200x630') { w = 1200; h = 630; }
    else if (val === 'custom') {
      const customW = prompt('Enter custom width (px):', '1200');
      const customH = prompt('Enter custom height (px):', '800');
      if (!customW || !customH) return;
      w = parseInt(customW, 10) || 1200;
      h = parseInt(customH, 10) || 800;
    }
    this.size = { width: w, height: h };
    const preset = this.el('ds-preset');
    if (preset && val !== 'custom') preset.value = val;
    const board = this.el('ds-artboard');
    if (board) {
      board.style.width = `${w}px`;
      board.style.height = `${h}px`;
    }
    this.fit();
  },

  adjustZoom(delta) {
    this.zoom = Math.max(0.2, Math.min(2.5, this.zoom + delta));
    this.applyZoom();
  },

  fit() {
    const stage = this.el('ds-canvas-stage');
    if (!stage) return;
    const scaleW = (stage.clientWidth - 64) / this.size.width;
    const scaleH = (stage.clientHeight - 64) / this.size.height;
    this.zoom = Math.min(scaleW, scaleH, 1);
    this.applyZoom();
  },

  applyZoom() {
    const board = this.el('ds-artboard');
    const wrap = this.el('ds-artboard-wrap');
    if (!board) return;
    board.style.transform = `scale(${this.zoom})`;
    board.style.transformOrigin = 'top left';
    if (wrap) {
      wrap.style.width = `${this.size.width * this.zoom}px`;
      wrap.style.height = `${this.size.height * this.zoom}px`;
    }
    const label = this.el('ds-zoom');
    if (label) label.textContent = `${Math.round(this.zoom * 100)}%`;
  },

  nid() { return Date.now() + Math.floor(Math.random() * 99); },

  addText(text, size, weight) {
    const id = this.nid();
    this.elements.push({
      id, type: 'text', text: text || 'New text', x: 100, y: 100,
      fontSize: size || 32, fontWeight: weight || '700', fontFamily: 'JetBrains Mono', fill: '#ffffff'
    });
    this.selectedId = id;
    this.render();
    this.saveHistory();
    this.beginEdit(id);
  },

  generateText() {
    this.generateTextFrom('ds-gen-text');
  },

  generateTextFrom(inputId) {
    const input = this.el(inputId);
    const text = (input && input.value.trim()) || 'BUILD HERE.';
    this.addText(text, 42, '700');
    if (input) input.value = '';
  },

  addShape(shape) {
    this.elements.push({
      id: this.nid(), type: 'shape', shape, x: 200, y: 200,
      width: shape === 'line' ? 180 : 150,
      height: shape === 'line' ? 6 : (shape === 'badge' ? 40 : 150),
      fill: '#F59E0B'
    });
    this.selectedId = this.elements[this.elements.length - 1].id;
    this.render();
    this.saveHistory();
  },

  addIcon(icon) {
    this.elements.push({
      id: this.nid(), type: 'icon', icon, x: 250, y: 250, fontSize: 64, fill: '#F59E0B'
    });
    this.selectedId = this.elements[this.elements.length - 1].id;
    this.render();
    this.saveHistory();
  },

  addImage(src) {
    this.elements.push({
      id: this.nid(), type: 'image', src, x: 150, y: 150, width: 300, height: 200
    });
    this.selectedId = this.elements[this.elements.length - 1].id;
    this.render();
    this.saveHistory();
  },

  handleUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => this.addImage(ev.target.result);
    reader.readAsDataURL(file);
  },

  box(el) {
    const node = this.el('ds-artboard') && this.el('ds-artboard').querySelector(`[data-id="${el.id}"]`);
    const w = el.width || (node ? node.offsetWidth : 120);
    const h = el.height || (node ? node.offsetHeight : (el.fontSize || 32));
    return { x: el.x, y: el.y, w, h, cx: el.x + w / 2, cy: el.y + h / 2, r: el.x + w, b: el.y + h };
  },

  render() {
    const board = this.el('ds-artboard');
    if (!board) return;
    board.style.backgroundColor = this.bg;
    board.style.backgroundImage = 'linear-gradient(to right, rgba(56,189,248,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.07) 1px, transparent 1px)';
    board.style.backgroundSize = `${this.grid * 4}px ${this.grid * 4}px`;
    board.innerHTML = '';
    this.elements.forEach(el => {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.left = `${el.x}px`;
      div.style.top = `${el.y}px`;
      div.style.cursor = 'move';
      div.dataset.id = String(el.id);
      if (this.selectedId === el.id && this.editingId !== el.id) {
        div.style.outline = '2px solid #F59E0B';
        div.style.outlineOffset = '2px';
      }
      if (el.type === 'text') {
        div.className = 'ds-text';
        div.textContent = el.text;
        div.style.color = el.fill;
        div.style.fontSize = `${el.fontSize}px`;
        div.style.fontFamily = el.fontFamily || 'JetBrains Mono';
        div.style.fontWeight = el.fontWeight;
        div.style.whiteSpace = 'pre';
        div.setAttribute('spellcheck', 'false');
        div.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          this.beginEdit(el.id);
        });
      } else if (el.type === 'shape') {
        div.style.width = `${el.width}px`;
        div.style.height = `${el.height}px`;
        div.style.backgroundColor = el.fill;
        if (el.shape === 'circle') div.style.borderRadius = '50%';
        if (el.shape === 'badge') div.style.borderRadius = '9999px';
      } else if (el.type === 'icon') {
        const i = document.createElement('i');
        i.className = el.icon === 'plane' ? 'fa-solid fa-plane' : (el.icon === 'laptop' ? 'fa-solid fa-laptop-code' : 'fa-solid fa-globe');
        i.style.fontSize = `${el.fontSize}px`;
        i.style.color = el.fill;
        div.appendChild(i);
      } else if (el.type === 'image') {
        const img = document.createElement('img');
        img.src = el.src;
        img.alt = '';
        img.style.width = `${el.width}px`;
        img.style.height = `${el.height}px`;
        img.style.objectFit = 'cover';
        img.style.borderRadius = '12px';
        img.draggable = false;
        div.appendChild(img);
      }
      div.addEventListener('mousedown', (e) => this.startDrag(e, el.id));
      board.appendChild(div);
      el._w = div.offsetWidth;
      el._h = div.offsetHeight;
    });
    this.updateBar();
  },

  beginEdit(id) {
    const el = this.elements.find(item => item.id === id);
    const node = this.el('ds-artboard') && this.el('ds-artboard').querySelector(`[data-id="${id}"]`);
    if (!el || el.type !== 'text' || !node) return;
    this.editingId = id;
    this.selectedId = id;
    node.contentEditable = 'true';
    node.style.cursor = 'text';
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const commit = () => {
      node.contentEditable = 'false';
      node.style.cursor = 'move';
      const next = (node.innerText || '').replace(/\n+$/, '');
      if (next !== el.text) {
        el.text = next || el.text;
        this.saveHistory();
      }
      this.editingId = null;
      node.removeEventListener('blur', commit);
      this.updateBar();
    };
    node.addEventListener('blur', commit);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        node.blur();
      }
      e.stopPropagation();
    });
    this.updateBar();
  },

  startDrag(e, id) {
    e.stopPropagation();
    if (this.editingId === id) return;
    if (this.editingId) {
      const active = document.activeElement;
      if (active && active.blur) active.blur();
    }
    this.selectedId = id;
    const el = this.elements.find(item => item.id === id);
    if (!el) return;
    this.dragging = true;
    this.moved = false;
    const board = this.el('ds-artboard').getBoundingClientRect();
    this.dragOffset.x = (e.clientX - board.left) / this.zoom - el.x;
    this.dragOffset.y = (e.clientY - board.top) / this.zoom - el.y;
    const move = (ev) => this.onDrag(ev);
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      this.clearGuides();
      if (this.dragging) {
        this.dragging = false;
        if (this.moved) this.saveHistory();
      }
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    this.updateBar();
    const node = this.el('ds-artboard').querySelector(`[data-id="${id}"]`);
    if (node) {
      node.style.outline = '2px solid #F59E0B';
      node.style.outlineOffset = '2px';
    }
  },

  onDrag(e) {
    if (!this.dragging || !this.selectedId) return;
    const el = this.elements.find(item => item.id === this.selectedId);
    const board = this.el('ds-artboard');
    if (!el || !board) return;
    this.moved = true;
    const rect = board.getBoundingClientRect();
    let x = (e.clientX - rect.left) / this.zoom - this.dragOffset.x;
    let y = (e.clientY - rect.top) / this.zoom - this.dragOffset.y;
    const snapped = this.snapToGridAndPeers(el, x, y);
    el.x = snapped.x;
    el.y = snapped.y;
    const node = board.querySelector(`[data-id="${el.id}"]`);
    if (node) {
      node.style.left = `${el.x}px`;
      node.style.top = `${el.y}px`;
    }
    this.drawGuides(snapped.guides);
  },

  snapToGridAndPeers(el, x, y) {
    const w = el._w || el.width || 120;
    const h = el._h || el.height || el.fontSize || 32;
    const xs = [0, this.size.width / 2 - w / 2, this.size.width - w];
    const ys = [0, this.size.height / 2 - h / 2, this.size.height - h];
    const vLines = [0, this.size.width / 2, this.size.width];
    const hLines = [0, this.size.height / 2, this.size.height];
    this.elements.forEach(other => {
      if (other.id === el.id) return;
      const b = this.box(other);
      xs.push(b.x, b.cx - w / 2, b.r - w, b.r, b.x - w);
      ys.push(b.y, b.cy - h / 2, b.b - h, b.b, b.y - h);
      vLines.push(b.x, b.cx, b.r);
      hLines.push(b.y, b.cy, b.b);
    });
    const snapAxis = (val, targets) => {
      let best = Math.round(val / this.grid) * this.grid;
      let dist = Math.abs(val - best);
      let hit = null;
      targets.forEach(t => {
        const d = Math.abs(val - t);
        if (d <= this.snap && d < dist) {
          dist = d;
          best = t;
          hit = t;
        }
      });
      return { val: best, hit };
    };
    const sx = snapAxis(x, xs);
    const sy = snapAxis(y, ys);
    const guides = [];
    const left = sx.val;
    const top = sy.val;
    const cx = left + w / 2;
    const cy = top + h / 2;
    vLines.forEach(line => {
      if (Math.abs(left - line) < 1 || Math.abs(cx - line) < 1 || Math.abs(left + w - line) < 1) {
        guides.push({ axis: 'v', pos: line });
      }
    });
    hLines.forEach(line => {
      if (Math.abs(top - line) < 1 || Math.abs(cy - line) < 1 || Math.abs(top + h - line) < 1) {
        guides.push({ axis: 'h', pos: line });
      }
    });
    return { x: sx.val, y: sy.val, guides };
  },

  drawGuides(guides) {
    const board = this.el('ds-artboard');
    if (!board) return;
    board.querySelectorAll('.ds-guide').forEach(n => n.remove());
    (guides || []).forEach(g => {
      const line = document.createElement('div');
      line.className = `ds-guide ${g.axis === 'v' ? 'ds-guide-v' : 'ds-guide-h'}`;
      if (g.axis === 'v') line.style.left = `${g.pos}px`;
      else line.style.top = `${g.pos}px`;
      board.appendChild(line);
    });
  },

  clearGuides() {
    const board = this.el('ds-artboard');
    if (board) board.querySelectorAll('.ds-guide').forEach(n => n.remove());
  },

  align(edge) {
    const el = this.elements.find(item => item.id === this.selectedId);
    if (!el) return;
    const w = el._w || el.width || 120;
    const h = el._h || el.height || el.fontSize || 32;
    if (edge === 'left') el.x = 0;
    if (edge === 'center') el.x = (this.size.width - w) / 2;
    if (edge === 'right') el.x = this.size.width - w;
    if (edge === 'top') el.y = 0;
    if (edge === 'middle') el.y = (this.size.height - h) / 2;
    if (edge === 'bottom') el.y = this.size.height - h;
    this.render();
    this.saveHistory();
  },

  clearSelect(e) {
    if (e.target && e.target.id === 'ds-canvas-stage') {
      this.selectedId = null;
      this.render();
    }
  },

  updateBar() {
    const label = this.el('ds-selected-label');
    const textControls = this.el('ds-text-controls');
    const colorPicker = this.el('ds-element-color');
    const el = this.elements.find(item => item.id === this.selectedId);
    if (!el) {
      if (label) label.textContent = 'No Selection';
      if (textControls) textControls.classList.add('hidden');
      return;
    }
    if (label) label.textContent = `Selected: ${el.type.toUpperCase()}`;
    if (el.fill && colorPicker) colorPicker.value = el.fill;
    if (el.type === 'text') {
      textControls.classList.remove('hidden');
      textControls.classList.add('flex');
      const textVal = this.el('ds-text-value');
      if (textVal && document.activeElement !== textVal) textVal.value = el.text || '';
      this.el('ds-font-family').value = el.fontFamily || 'JetBrains Mono';
      this.el('ds-font-size').value = el.fontSize || 32;
    } else {
      textControls.classList.add('hidden');
      textControls.classList.remove('flex');
    }
  },

  updateSelected(prop, val) {
    const el = this.elements.find(item => item.id === this.selectedId);
    if (!el) return;
    el[prop] = prop === 'fontSize' ? (parseInt(val, 10) || 16) : val;
    if (prop === 'text') {
      const node = this.el('ds-artboard') && this.el('ds-artboard').querySelector(`[data-id="${el.id}"]`);
      if (node) node.textContent = el.text;
      return;
    }
    this.render();
    this.saveHistory();
  },

  deleteSelected() {
    if (!this.selectedId) return;
    this.elements = this.elements.filter(item => item.id !== this.selectedId);
    this.selectedId = null;
    this.render();
    this.saveHistory();
  },

  moveLayer(dir) {
    const idx = this.elements.findIndex(item => item.id === this.selectedId);
    if (idx === -1) return;
    if (dir === 'up' && idx < this.elements.length - 1) {
      const tmp = this.elements[idx];
      this.elements[idx] = this.elements[idx + 1];
      this.elements[idx + 1] = tmp;
    } else if (dir === 'down' && idx > 0) {
      const tmp = this.elements[idx];
      this.elements[idx] = this.elements[idx - 1];
      this.elements[idx - 1] = tmp;
    }
    this.render();
    this.saveHistory();
  },

  applyColor(hex) {
    if (this.selectedId) this.updateSelected('fill', hex);
    else this.setBg(hex);
  },

  applyFont(fontName) {
    if (this.selectedId) this.updateSelected('fontFamily', fontName);
  },

  setBg(hex) {
    this.bg = hex;
    this.render();
  },

  loadTemplate(tpl) {
    this.elements = [];
    this.bg = '#070A0F';
    const F = 'JetBrains Mono';
    if (tpl === 'nomad-quote') {
      this.changePreset('1280x720');
      this.elements = [
        { id: 1, type: 'text', text: 'BUILD HERE.', x: 120, y: 180, fontSize: 64, fontWeight: '700', fontFamily: F, fill: '#ffffff' },
        { id: 2, type: 'text', text: 'LIVE EVERYWHERE.', x: 120, y: 260, fontSize: 64, fontWeight: '700', fontFamily: F, fill: '#F59E0B' },
        { id: 3, type: 'text', text: 'THE OPERATING SYSTEM FOR BORDERLESS EXECUTION', x: 120, y: 360, fontSize: 16, fontWeight: 'normal', fontFamily: F, fill: '#94a3b8' },
        { id: 4, type: 'icon', icon: 'globe', x: 120, y: 430, fontSize: 36, fill: '#F59E0B' }
      ];
    } else if (tpl === 'youtube-thumb') {
      this.changePreset('1280x720');
      this.elements = [
        { id: 1, type: 'shape', shape: 'badge', x: 80, y: 80, width: 220, height: 40, fill: '#F59E0B' },
        { id: 2, type: 'text', text: 'EPISODE 04', x: 125, y: 88, fontSize: 16, fontWeight: '700', fontFamily: F, fill: '#070A0F' },
        { id: 3, type: 'text', text: 'DA NANG WORKSPACE', x: 80, y: 160, fontSize: 48, fontWeight: '700', fontFamily: F, fill: '#ffffff' },
        { id: 4, type: 'image', src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80', x: 650, y: 140, width: 550, height: 400 }
      ];
    } else if (tpl === 'minimal-card') {
      this.changePreset('1200x630');
      this.bg = '#0B0F17';
      this.elements = [
        { id: 1, type: 'text', text: 'SOVEREIGN FOUNDER', x: 80, y: 200, fontSize: 42, fontWeight: '700', fontFamily: F, fill: '#ffffff' },
        { id: 2, type: 'text', text: 'DIMAD OS  ·  GOLD / SLATE', x: 80, y: 270, fontSize: 16, fontWeight: 'normal', fontFamily: F, fill: '#10B981' }
      ];
    } else if (tpl === 'story-promo') {
      this.changePreset('1080x1920');
      this.elements = [
        { id: 1, type: 'text', text: 'WORKSTATION', x: 80, y: 640, fontSize: 56, fontWeight: '700', fontFamily: F, fill: '#ffffff' },
        { id: 2, type: 'text', text: 'SETUP', x: 80, y: 720, fontSize: 56, fontWeight: '700', fontFamily: F, fill: '#F59E0B' },
        { id: 3, type: 'text', text: 'DIMAD DESIGN SUITE', x: 80, y: 820, fontSize: 18, fontWeight: 'normal', fontFamily: F, fill: '#38BDF8' }
      ];
    }
    this.selectedId = null;
    this.render();
    this.saveHistory();
  },

  generateAi() {
    const promptEl = this.el('ds-ai-prompt');
    const styleEl = this.el('ds-ai-style');
    const promptText = (promptEl && promptEl.value.trim()) || 'NOMAD MASTERCLASS';
    const style = (styleEl && styleEl.value) || 'sovereign';
    const palettes = {
      sovereign: { bg: '#070A0F', accent: '#F59E0B', text: '#ffffff' },
      minimal: { bg: '#ffffff', accent: '#070A0F', text: '#070A0F' },
      cyber: { bg: '#070A0F', accent: '#38BDF8', text: '#F59E0B' },
      luxury: { bg: '#000000', accent: '#F59E0B', text: '#ffffff' }
    };
    const pal = palettes[style] || palettes.sovereign;
    this.bg = pal.bg;
    this.changePreset('1280x720');
    this.elements = [
      { id: 1, type: 'shape', shape: 'rectangle', x: 60, y: 60, width: 8, height: 120, fill: pal.accent },
      { id: 2, type: 'text', text: promptText.toUpperCase(), x: 90, y: 70, fontSize: 36, fontWeight: '700', fontFamily: 'JetBrains Mono', fill: pal.text },
      { id: 3, type: 'text', text: 'Generated via DIMAD Design Suite', x: 90, y: 150, fontSize: 14, fontWeight: 'normal', fontFamily: 'JetBrains Mono', fill: pal.accent }
    ];
    this.selectedId = null;
    this.render();
    this.saveHistory();
  },

  saveHistory() {
    this.historyStep += 1;
    this.history = this.history.slice(0, this.historyStep);
    this.history.push(JSON.stringify({ elements: this.elements, bg: this.bg, size: this.size }));
  },

  undo() {
    if (this.historyStep > 0) {
      this.historyStep -= 1;
      this.applySnapshot(this.history[this.historyStep]);
    }
  },

  redo() {
    if (this.historyStep < this.history.length - 1) {
      this.historyStep += 1;
      this.applySnapshot(this.history[this.historyStep]);
    }
  },

  applySnapshot(raw) {
    const snap = JSON.parse(raw);
    this.elements = snap.elements || [];
    this.bg = snap.bg || '#070A0F';
    if (snap.size) this.size = snap.size;
    const board = this.el('ds-artboard');
    if (board) {
      board.style.width = `${this.size.width}px`;
      board.style.height = `${this.size.height}px`;
    }
    this.render();
  },

  exportPng() {
    const canvas = document.createElement('canvas');
    canvas.width = this.size.width;
    canvas.height = this.size.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.elements.forEach(el => {
      if (el.type === 'shape') {
        ctx.fillStyle = el.fill;
        if (el.shape === 'circle') {
          ctx.beginPath();
          ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(el.x, el.y, el.width, el.height);
        }
      } else if (el.type === 'text') {
        ctx.fillStyle = el.fill;
        ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize}px ${el.fontFamily || 'JetBrains Mono'}`;
        ctx.fillText(el.text, el.x, el.y + el.fontSize);
      }
    });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'dimad-design.png';
    a.click();
  },

  openCanva() {
    const modal = this.el('ds-canva-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeCanva() {
    const modal = this.el('ds-canva-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
window.DESIGN_SUITE = DESIGN_SUITE;

const DIMDRIVE = {
  storageKey: 'dimad_dimdrive',
  bound: false,
  toastTimer: null,
  tab: 'drive',
  category: 'All',
  query: '',
  viewMode: 'list',
  sortBy: 'name',
  selectedId: 'file-1',
  detailsOpen: true,
  newOpen: false,
  folderId: null,
  composingFolder: false,
  renamingFolderId: null,
  folderCtxId: null,
  folderStyles: [
    { color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30' },
    { color: 'from-brand-accent/20 to-brand-accent/5', border: 'border-brand-accent/30' },
    { color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30' },
    { color: 'from-rose-500/20 to-rose-500/5', border: 'border-rose-500/30' },
    { color: 'from-sky-500/20 to-sky-500/5', border: 'border-sky-500/30' }
  ],

  seedFolders() {
    return [
      { id: 'f1', name: 'Personal Documents', color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30' },
      { id: 'f2', name: 'Travel', color: 'from-brand-accent/20 to-brand-accent/5', border: 'border-brand-accent/30' },
      { id: 'f3', name: 'Brand Assets', color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30' },
      { id: 'f4', name: 'Blog Posts', color: 'from-rose-500/20 to-rose-500/5', border: 'border-rose-500/30' },
      { id: 'f-sheets', name: 'Sales Workbooks', color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30' },
      { id: 'f-notepad', name: 'Notepad', color: 'from-sky-500/20 to-sky-500/5', border: 'border-sky-500/30', locked: true }
    ];
  },

  seedFiles() {
    return [
      { id: 'file-1', name: 'Armenia_Residency_Permit_Scan.pdf', type: 'pdf', size: '2.4 MB', sizeBytes: 2516582, folder: 'f1', category: 'Passports & Visas', updatedAt: 'Oct 24, 2026', createdAt: 'Oct 20, 2026', owner: 'You', starred: true, sharedWith: 'Dimad Travel Concierge Agent', permission: 'Shared', previewText: 'REPUBLIC OF ARMENIA - IMMIGRATION SERVICES. Temporary Residency Permit #AR-883921. Valid for 1 Year.' },
      { id: 'file-2', name: 'Yerevan_Airbnb_Lease_Contract.pdf', type: 'pdf', size: '4.1 MB', sizeBytes: 4299161, folder: 'f1', category: 'Documents', updatedAt: 'Nov 02, 2026', createdAt: 'Nov 01, 2026', owner: 'You', starred: true, sharedWith: 'Private', permission: 'Private', previewText: 'RESIDENTIAL LEASE AGREEMENT. Kentron District, Yerevan. Monthly Rent: 320,000 AMD. Utilities included.' },
      { id: 'file-3', name: 'Sole_Proprietorship_Tax_Certificate.pdf', type: 'pdf', size: '1.8 MB', sizeBytes: 1887436, folder: 'f2', category: 'Invoices & Tax', updatedAt: 'Sep 15, 2026', createdAt: 'Sep 10, 2026', owner: 'You', starred: false, sharedWith: 'Legal Sub-Agent', permission: 'Shared', previewText: 'MINISTRY OF FINANCE. Taxpayer Identification Number (TIN): 90124881. IT Micro-Business Exemption Code.' },
      { id: 'file-4', name: 'QatarAirways_Flight_EVN_DOH_NYC.pdf', type: 'pdf', size: '850 KB', sizeBytes: 870400, folder: 'f3', category: 'Passports & Visas', updatedAt: 'Nov 04, 2026', createdAt: 'Nov 04, 2026', owner: 'Dimad Concierge Desk', starred: true, sharedWith: 'You', permission: 'Shared', previewText: 'BOARDING PASS CONFIRMATION. Booking Ref: #QX992A. Seat 14A. Zvartnots Int Airport (EVN) -> JFK.' },
      { id: 'file-5', name: 'Dimad_Ecosystem_Vector_Logo.svg', type: 'svg', size: '320 KB', sizeBytes: 327680, folder: 'f4', category: 'Photos & Scans', updatedAt: 'Aug 12, 2026', createdAt: 'Aug 01, 2026', owner: 'Design by Dimad', starred: false, sharedWith: 'Public', permission: 'Public Link', previewText: 'SVG Vector Outline Asset. Dimad Brand Design System v2.4 (Dark & Amber Theme Rules).' },
      { id: 'file-6', name: 'Q3_Remote_Expense_Report.csv', type: 'csv', size: '142 KB', sizeBytes: 145408, folder: 'f2', category: 'Invoices & Tax', updatedAt: 'Oct 01, 2026', createdAt: 'Oct 01, 2026', owner: 'You', starred: false, sharedWith: 'Private', permission: 'Private', previewText: 'Date,Category,Merchant,Amount USD,Payment Method. 2026-09-02,Coworking,LOFT Yerevan,140.00,Wise Card.' },
      { id: 'file-7', name: 'Passport_Scan_HighRes_Color.png', type: 'png', size: '5.6 MB', sizeBytes: 5872025, folder: 'f1', category: 'Photos & Scans', updatedAt: 'Jul 19, 2026', createdAt: 'Jul 19, 2026', owner: 'You', starred: true, sharedWith: 'Private', permission: 'Private', previewText: '300 DPI High-Resolution Identity Scan. Passport No: P-882014992. Expire Date: 2032.' }
    ];
  },

  formatBytes(n) {
    const bytes = Number(n) || 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  },

  formatStamp(value) {
    if (value == null || value === '') return '—';
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
      const d = new Date(Number(value));
      if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    }
    return String(value);
  },

  previewFromFile(file) {
    if (file.previewText) return file.previewText;
    if (file.type === 'writespace' && file.payload) {
      return String(file.payload.bodyText || file.payload.title || '').replace(/\s+/g, ' ').slice(0, 180);
    }
    if (file.type === 'sheet' && file.payload && file.payload.workbook) {
      const book = file.payload.workbook;
      const first = book.sheets && book.sheets[book.sheetList && book.sheetList[0]] && book.sheets[book.sheetList[0]].A1;
      return (first && first.raw) || file.name || 'Sales workbook';
    }
    if (file.type === 'notepad' && file.payload) {
      return String(file.payload.body || file.payload.text || file.payload.title || '').replace(/\s+/g, ' ').slice(0, 180);
    }
    if (file.payload && file.payload.text) return String(file.payload.text).slice(0, 180);
    return 'Stored in dimDrive on this device.';
  },

  extType(name, mime, fallback) {
    const lower = String(name || '').toLowerCase();
    if (fallback === 'writespace') return 'writespace';
    if (fallback === 'sheet' || /\.dimsheet(\.json)?$/i.test(lower)) return 'sheet';
    if (fallback === 'notepad' || /\.dimnote(\.json)?$/i.test(lower)) return 'notepad';
    if (lower.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
    if (lower.endsWith('.svg') || mime === 'image/svg+xml') return 'svg';
    if (/\.(png|jpe?g|gif|webp)$/.test(lower) || String(mime || '').startsWith('image/')) return lower.split('.').pop() || 'png';
    if (lower.endsWith('.csv') || mime === 'text/csv') return 'csv';
    return fallback || 'file';
  },

  normalizeUser(file) {
    const type = this.extType(file.name, file.mime, file.type);
    return {
      ...file,
      type: file.type === 'sheet' || file.type === 'notepad' ? file.type : type,
      size: file.size || this.formatBytes(file.sizeBytes || (file.payload && file.payload.text ? file.payload.text.length : 0)),
      sizeBytes: file.sizeBytes || 0,
      folder: file.folder || 'user',
      category: file.category || (file.type === 'writespace' ? 'Documents' : 'Documents'),
      owner: file.owner || 'You',
      starred: !!file.starred,
      sharedWith: file.sharedWith || 'Private',
      permission: file.permission || 'Private',
      previewText: this.previewFromFile(file),
      trashed: !!file.trashed
    };
  },

  renameSeedFolders(folders) {
    const map = {
      f1: { old: 'Armenia Travel Docs & Visas', next: 'Personal Documents' },
      f2: { old: 'Legal & Tax Registration', next: 'Travel' },
      f3: { old: 'Concierge Flight Tickets', next: 'Brand Assets' },
      f4: { old: 'Dimad Brand Assets', next: 'Blog Posts' },
      'f-notepad': { old: 'DIMAD Notepad', next: 'Notepad' }
    };
    return (folders || []).map((folder) => {
      const rule = map[folder.id];
      if (folder.id === 'f-notepad') return { ...folder, name: 'Notepad', locked: true };
      if (!rule) return folder;
      if (folder.name === rule.next) return folder;
      if (String(folder.name || '').includes(rule.old)) return { ...folder, name: rule.next };
      return folder;
    });
  },

  workspace() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (raw && Array.isArray(raw.files) && Array.isArray(raw.folders)) {
        let folders = this.renameSeedFolders(raw.folders);
        const files = raw.files.map((f) => this.normalizeUser(f));
        if (!folders.some((f) => f.id === 'f-notepad')) {
          folders = folders.concat([this.notepadFolder()]);
        }
        if (JSON.stringify(folders) !== JSON.stringify(raw.folders)) {
          localStorage.setItem(this.storageKey, JSON.stringify({ files: raw.files, folders }));
        }
        return { files, folders };
      }
      const legacy = Array.isArray(raw) ? raw : [];
      const user = legacy.map((f) => this.normalizeUser(f));
      const files = [...this.seedFiles(), ...user];
      const folders = this.seedFolders();
      const ws = { files, folders };
      localStorage.setItem(this.storageKey, JSON.stringify(ws));
      return ws;
    } catch (err) {
      return { files: this.seedFiles(), folders: this.seedFolders() };
    }
  },

  load() {
    return this.workspace().files;
  },

  persist(files) {
    localStorage.setItem(this.storageKey, JSON.stringify({ files, folders: this.workspace().folders }));
  },

  persistFolders(folders) {
    localStorage.setItem(this.storageKey, JSON.stringify({ files: this.load(), folders }));
  },

  notepadFolder() {
    return { id: 'f-notepad', name: 'Notepad', color: 'from-sky-500/20 to-sky-500/5', border: 'border-sky-500/30', locked: true };
  },

  isLockedFolder(id) {
    return id === 'f-notepad';
  },

  visibleFolders() {
    return this.workspace().folders.filter((folder) => !this.isLockedFolder(folder.id) && !folder.locked);
  },

  ensureNotepadFolder() {
    const ws = this.workspace();
    if (ws.folders.some((f) => f.id === 'f-notepad')) return 'f-notepad';
    this.persistFolders(ws.folders.concat([this.notepadFolder()]));
    return 'f-notepad';
  },

  listNotepad() {
    return this.load().filter((f) => f.type === 'notepad' && !f.trashed);
  },

  noteFileName(note) {
    const title = String((note && (note.title || note.body)) || 'Untitled').replace(/\s+/g, ' ').trim() || 'Untitled';
    const words = title.split(' ').slice(0, 8).join(' ');
    const safe = words.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, '_').slice(0, 52) || 'Untitled';
    return `${safe}.txt`;
  },

  syncNotepad(notes, removedIds) {
    const folder = this.ensureNotepadFolder();
    const gone = new Set((removedIds || []).map(String));
    let rows = this.load();
    const byNoteId = new Map();
    rows.forEach((file) => {
      if (file.type === 'notepad' && file.payload && file.payload.noteId) byNoteId.set(String(file.payload.noteId), file);
    });
    (notes || []).forEach((note) => {
      const existing = byNoteId.get(String(note.id)) || rows.find((f) => String(f.id) === String(note.driveFileId));
      const payload = {
        kind: 'dimad-note',
        version: 1,
        noteId: note.id,
        title: note.title || 'Untitled',
        body: note.body || '',
        customTitle: !!note.customTitle,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      };
      const name = this.noteFileName({ title: payload.title, body: payload.body });
      const sizeBytes = JSON.stringify(payload).length;
      const previewText = this.previewFromFile({ type: 'notepad', payload });
      if (existing) {
        const idx = rows.findIndex((f) => String(f.id) === String(existing.id));
        rows[idx] = {
          ...existing,
          name,
          payload,
          previewText,
          updatedAt: note.updatedAt || Date.now(),
          type: 'notepad',
          category: 'Notes',
          folder: existing.folder || folder,
          size: this.formatBytes(sizeBytes),
          sizeBytes,
          trashed: false
        };
        note.driveFileId = existing.id;
      } else {
        const file = {
          id: `drv_note_${note.id}`,
          name,
          type: 'notepad',
          kind: 'Note',
          createdAt: note.createdAt || Date.now(),
          updatedAt: note.updatedAt || Date.now(),
          payload,
          folder,
          category: 'Notes',
          owner: 'You',
          starred: false,
          sharedWith: 'Private',
          permission: 'Private',
          previewText,
          size: this.formatBytes(sizeBytes),
          sizeBytes,
          trashed: false
        };
        rows.unshift(file);
        note.driveFileId = file.id;
        byNoteId.set(String(note.id), file);
      }
    });
    if (gone.size) {
      rows = rows.map((file) => {
        const noteId = file.payload && file.payload.noteId;
        if (file.type === 'notepad' && noteId && gone.has(String(noteId))) return { ...file, trashed: true };
        return file;
      });
    }
    this.persist(rows);
    if (document.getElementById('view-dimad-dimdrive') && this.render) {
      try { this.render(); } catch (err) { /* drive tab not mounted */ }
    }
    return notes;
  },

  openInNotepad(id) {
    const file = this.get(id);
    if (!file || file.type !== 'notepad' || typeof DIMAD_NOTEPAD === 'undefined') return;
    DIMAD_NOTEPAD.openDriveFile(file);
    closeDimDriveNav();
    if (typeof switchTab === 'function') switchTab('dimad-notepad');
  },

  ensureSheetFolder() {
    const ws = this.workspace();
    if (ws.folders.some((f) => f.id === 'f-sheets')) return 'f-sheets';
    this.persistFolders(ws.folders.concat([{
      id: 'f-sheets',
      name: 'Sales Workbooks',
      color: 'from-amber-500/20 to-amber-500/5',
      border: 'border-amber-500/30'
    }]));
    return 'f-sheets';
  },

  listSheets() {
    return this.load().filter((f) => f.type === 'sheet' && !f.trashed);
  },

  upsertSheet(draft) {
    const folder = this.ensureSheetFolder();
    const rows = this.load();
    const now = Date.now();
    const name = (draft.name || 'Sales_Revenue_Workbook.xlsx').trim();
    const workbook = draft.payload && draft.payload.workbook ? draft.payload.workbook : (draft.workbook || draft.payload || {});
    const payload = { workbook };
    const previewText = this.previewFromFile({ type: 'sheet', name, payload });
    const sizeBytes = JSON.stringify(payload).length;
    if (draft.id) {
      const idx = rows.findIndex((f) => String(f.id) === String(draft.id));
      if (idx >= 0) {
        rows[idx] = {
          ...rows[idx],
          name,
          payload,
          previewText,
          updatedAt: now,
          type: 'sheet',
          category: 'Spreadsheets',
          folder: rows[idx].folder || folder,
          size: this.formatBytes(sizeBytes),
          sizeBytes
        };
        this.persist(rows);
        this.toast(`Saved "${name}" to dimDrive`);
        return rows[idx];
      }
    }
    const file = {
      id: `drv_sheet_${now}`,
      name,
      type: 'sheet',
      kind: 'Workbook',
      createdAt: now,
      updatedAt: now,
      payload,
      folder,
      category: 'Spreadsheets',
      owner: 'You',
      starred: false,
      sharedWith: 'Private',
      permission: 'Private',
      previewText,
      size: this.formatBytes(sizeBytes),
      sizeBytes,
      trashed: false
    };
    rows.unshift(file);
    this.persist(rows);
    this.toast(`Saved "${name}" to dimDrive`);
    return file;
  },

  openInSheet(id) {
    if (typeof DIMAD_SHEET === 'undefined') return;
    DIMAD_SHEET.pendingOpenId = id;
    closeDimDriveNav();
    if (typeof switchTab === 'function') switchTab('ent-crm');
  },

  escape(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  upsertWriteSpace(draft) {
    const rows = this.load();
    const now = Date.now();
    const name = (draft.name || draft.title || 'Untitled draft').trim();
    const payload = {
      title: draft.title || '',
      subtitle: draft.subtitle || '',
      bodyText: draft.bodyText || '',
      layoutStyle: draft.layoutStyle || 'substack',
      fontFamily: draft.fontFamily || 'Georgia',
      fontSize: draft.fontSize || '18',
      coverImage: draft.coverImage || '',
      focusKeyword: draft.focusKeyword || '',
      metaTitle: draft.metaTitle || '',
      metaDescription: draft.metaDescription || '',
      slug: draft.slug || ''
    };
    const previewText = this.previewFromFile({ type: 'writespace', payload });
    if (draft.id) {
      const idx = rows.findIndex((f) => String(f.id) === String(draft.id));
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], name, payload, previewText, updatedAt: now, type: 'writespace', folder: rows[idx].folder || 'user', category: 'Documents' };
        this.persist(rows);
        return rows[idx];
      }
    }
    const file = {
      id: `drv_${now}`,
      name,
      type: 'writespace',
      kind: 'WriteSpace',
      createdAt: now,
      updatedAt: now,
      payload,
      folder: 'user',
      category: 'Documents',
      owner: 'You',
      starred: false,
      sharedWith: 'Private',
      permission: 'Private',
      previewText,
      size: this.formatBytes((payload.bodyText || '').length),
      sizeBytes: (payload.bodyText || '').length
    };
    rows.unshift(file);
    this.persist(rows);
    return file;
  },

  get(id) {
    return this.load().find((f) => String(f.id) === String(id)) || null;
  },

  remove(id) {
    this.persist(this.load().map((f) => String(f.id) === String(id) ? { ...f, trashed: true } : f));
    const gone = this.get(id);
    this.toast(`Moved "${gone ? gone.name : 'file'}" to Trash.`);
    if (String(this.selectedId) === String(id)) {
      const next = this.filteredFiles()[0];
      this.selectedId = next ? next.id : null;
    }
    this.render();
  },

  ingestBrowserFile(file, folderId) {
    if (file.size > 750000) {
      this.toast('Keep uploads under 750 KB for dimDrive on this device.');
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const now = Date.now();
        let type = this.extType(file.name, file.type, 'file');
        let payload = { dataUrl: typeof reader.result === 'string' && String(reader.result).startsWith('data:') ? reader.result : '', text: typeof reader.result === 'string' && !String(reader.result).startsWith('data:') ? reader.result : '' };
        let category = String(file.type || '').startsWith('image/') ? 'Photos & Scans' : 'Documents';
        let folder = folderId || 'user';
        if (typeof reader.result === 'string' && !String(reader.result).startsWith('data:')) {
          try {
            const parsed = JSON.parse(reader.result);
            if (parsed && (parsed.kind === 'dimad-sheet' || parsed.sheets)) {
              type = 'sheet';
              payload = { workbook: parsed.sheets ? parsed : { sheets: parsed } };
              category = 'Spreadsheets';
              folder = this.ensureSheetFolder();
            } else if (parsed && (parsed.kind === 'dimad-note' || parsed.noteId)) {
              type = 'notepad';
              payload = {
                kind: 'dimad-note',
                version: 1,
                noteId: parsed.noteId || `note-${now}`,
                title: parsed.title || file.name,
                body: parsed.body || parsed.text || '',
                customTitle: !!parsed.customTitle,
                createdAt: parsed.createdAt || now,
                updatedAt: now
              };
              category = 'Notes';
              folder = this.ensureNotepadFolder();
            }
          } catch (err) { /* not json workbook */ }
        }
        const image = String(file.type || '').startsWith('image/');
        resolve({
          id: `drv_${now}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type,
          kind: file.type || 'File',
          createdAt: now,
          updatedAt: now,
          mime: file.type,
          payload,
          folder,
          category,
          owner: 'You',
          starred: false,
          sharedWith: 'Private',
          permission: 'Private',
          previewText: type === 'sheet' ? this.previewFromFile({ type, name: file.name, payload }) : 'Uploaded to dimDrive on this device.',
          size: this.formatBytes(file.size),
          sizeBytes: file.size,
          trashed: false
        });
      };
      if (file.type.startsWith('text/') || /\.(md|txt|json|html|csv|dimsheet)$/i.test(file.name)) reader.readAsText(file);
      else reader.readAsDataURL(file);
    });
  },

  upload(input) {
    const file = input && input.files && input.files[0];
    this.newOpen = false;
    if (!file) return;
    this.ingestBrowserFile(file, 'user').then((row) => {
      input.value = '';
      if (!row) return;
      const rows = this.load();
      rows.unshift(row);
      this.persist(rows);
      this.selectedId = row.id;
      this.tab = 'drive';
      this.toast(`Uploaded "${row.name}"`);
      this.render();
    });
  },

  uploadFolder(input) {
    const list = input && input.files ? Array.from(input.files).slice(0, 8) : [];
    this.newOpen = false;
    if (!list.length) return;
    Promise.all(list.map((f) => this.ingestBrowserFile(f, 'user'))).then((rows) => {
      input.value = '';
      const ok = rows.filter(Boolean);
      if (!ok.length) return;
      this.persist([...ok, ...this.load()]);
      this.selectedId = ok[0].id;
      this.toast(`Uploaded ${ok.length} file${ok.length === 1 ? '' : 's'} from folder.`);
      this.render();
    });
  },

  scanId() {
    this.newOpen = false;
    this.toast('Simulating Scan Document upload to dimDrive...');
    this.render();
  },

  download(id) {
    const file = this.get(id);
    if (!file) return;
    let blob;
    let filename = file.name || 'dimdrive-file';
    if (file.type === 'writespace') {
      const body = `# ${(file.payload && file.payload.title) || file.name}\n\n${(file.payload && file.payload.subtitle) || ''}\n\n${(file.payload && file.payload.bodyText) || ''}`;
      blob = new Blob([body], { type: 'text/markdown' });
      if (!/\.md$/i.test(filename)) filename += '.md';
    } else if (file.type === 'sheet') {
      const book = (file.payload && file.payload.workbook) || {};
      blob = new Blob([JSON.stringify({ kind: 'dimad-sheet', version: 1, name: file.name, ...book }, null, 2)], { type: 'application/json' });
      if (!/\.dimsheet\.json$/i.test(filename)) filename = filename.replace(/\.xlsx$/i, '') + '.dimsheet.json';
    } else if (file.type === 'notepad') {
      blob = new Blob([(file.payload && file.payload.body) || (file.payload && file.payload.text) || ''], { type: 'text/plain' });
      if (!/\.txt$/i.test(filename)) filename += '.txt';
    } else if (file.payload && file.payload.dataUrl && String(file.payload.dataUrl).startsWith('data:')) {
      const a = document.createElement('a');
      a.href = file.payload.dataUrl;
      a.download = filename;
      a.click();
      return;
    } else if (!file.payload) {
      this.toast(`Preview only — "${file.name}" is a workspace sample.`);
      return;
    } else {
      blob = new Blob([file.payload.text ? file.payload.text : JSON.stringify(file.payload || {})], { type: 'text/plain' });
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  },

  openInWriteSpace(id) {
    const file = this.get(id);
    if (!file || file.type !== 'writespace' || typeof WRITESPACE === 'undefined') return;
    WRITESPACE.loadDriveFile(file);
    openCreatorWriteSpace();
  },

  toast(message) {
    const el = document.getElementById('dimdrive-toast');
    if (!el) return;
    el.innerHTML = `<i class="fa-solid fa-circle-check text-sm"></i><span>${this.escape(message)}</span>`;
    el.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
  },

  bindUi() {
    if (this.bound) return;
    this.bound = true;
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#view-dimad-dimdrive .relative')) {
        this.newOpen = false;
        const menu = document.getElementById('dimdrive-new-menu');
        const chev = document.getElementById('dimdrive-new-chevron');
        if (menu) menu.classList.add('hidden');
        if (chev) chev.classList.remove('rotate-180');
      }
      if (!e.target.closest('#dimdrive-folder-ctx')) this.closeFolderCtx();
    });
  },

  setTab(id) {
    this.tab = id;
    this.folderId = null;
    this.selectedId = null;
    this.render();
  },

  setCategory(cat) {
    this.category = this.category === cat ? 'All' : cat;
    this.render();
  },

  setSearch(value) {
    this.query = value;
    const input = document.getElementById('dimdrive-search');
    if (input && input.value !== value) input.value = value;
    this.render();
  },

  setSort(value) {
    this.sortBy = value;
    this.render();
  },

  setView(mode) {
    this.viewMode = mode;
    this.render();
  },

  select(id) {
    this.selectedId = id;
    this.detailsOpen = true;
    this.render();
  },

  openFolder(id) {
    if (this.isLockedFolder(id) || id === 'f-notepad') {
      this.closeFolderCtx();
      this.setTab('notepad');
      return;
    }
    this.folderId = id;
    this.tab = 'drive';
    this.closeFolderCtx();
    const folder = this.workspace().folders.find((f) => f.id === id);
    this.toast(`Opening folder: ${folder ? folder.name : id}`);
    this.render();
  },

  startNewFolder() {
    this.newOpen = false;
    this.composingFolder = true;
    this.renamingFolderId = null;
    this.closeFolderCtx();
    this.render();
    const input = document.getElementById('dimdrive-folder-new');
    if (input) {
      input.focus();
      input.select();
    }
  },

  commitNewFolder() {
    const input = document.getElementById('dimdrive-folder-new');
    const name = (input && input.value ? input.value : '').trim();
    this.composingFolder = false;
    if (!name) {
      this.render();
      return;
    }
    const folders = this.workspace().folders.slice();
    const style = this.folderStyles[folders.length % this.folderStyles.length];
    const folder = { id: `fld_${Date.now()}`, name, color: style.color, border: style.border };
    folders.push(folder);
    this.persistFolders(folders);
    this.folderId = folder.id;
    this.tab = 'drive';
    this.toast(`Created folder “${name}”`);
    this.render();
  },

  startRenameFolder(id) {
    if (this.isLockedFolder(id)) {
      this.toast('Notepad is a system tab and cannot be renamed.');
      return;
    }
    this.renamingFolderId = id;
    this.composingFolder = false;
    this.render();
    const input = document.getElementById('dimdrive-folder-rename');
    if (input) {
      input.focus();
      input.select();
    }
  },

  commitRenameFolder() {
    const id = this.renamingFolderId;
    const input = document.getElementById('dimdrive-folder-rename');
    this.renamingFolderId = null;
    if (!id || !input) {
      this.render();
      return;
    }
    const name = input.value.trim();
    if (!name) {
      this.render();
      return;
    }
    this.persistFolders(this.workspace().folders.map((f) => f.id === id ? { ...f, name } : f));
    this.render();
  },

  folderKey(event, action) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (action === 'new') this.commitNewFolder();
      else this.commitRenameFolder();
    }
    if (event.key === 'Escape') {
      this.composingFolder = false;
      this.renamingFolderId = null;
      this.render();
    }
  },

  deleteFolder(id) {
    if (!id || id === 'user' || this.isLockedFolder(id)) {
      if (this.isLockedFolder(id)) this.toast('Notepad is a system tab and cannot be deleted.');
      return;
    }
    const folders = this.workspace().folders.filter((f) => f.id !== id);
    const files = this.load().map((f) => f.folder === id ? { ...f, folder: 'user' } : f);
    localStorage.setItem(this.storageKey, JSON.stringify({ files, folders }));
    if (this.folderId === id) this.folderId = null;
    this.toast('Folder deleted. Files moved to Uploads.');
    this.render();
  },

  openFolderCtx(event, id) {
    event.preventDefault();
    event.stopPropagation();
    this.folderCtxId = id;
    const ctx = document.getElementById('dimdrive-folder-ctx');
    if (!ctx) return;
    ctx.classList.remove('hidden');
    ctx.style.left = `${Math.min(event.clientX, window.innerWidth - 160)}px`;
    ctx.style.top = `${Math.min(event.clientY, window.innerHeight - 80)}px`;
  },

  closeFolderCtx() {
    const ctx = document.getElementById('dimdrive-folder-ctx');
    if (ctx) ctx.classList.add('hidden');
  },

  folderCtxAction(action) {
    const id = this.folderCtxId;
    this.closeFolderCtx();
    if (!id) return;
    if (action === 'rename') this.startRenameFolder(id);
    if (action === 'delete') this.deleteFolder(id);
  },

  close() {
    closeDimDriveNav();
    if (typeof switchTab === 'function') switchTab('ent-dashboard');
  },

  openWriteSpace() {
    openCreatorWriteSpace();
  },

  toggleDetails() {
    this.detailsOpen = !this.detailsOpen;
    this.render();
  },

  toggleNewMenu() {
    this.newOpen = !this.newOpen;
    this.render();
  },

  toggleStar(id, event) {
    if (event) event.stopPropagation();
    const rows = this.load().map((f) => {
      if (String(f.id) !== String(id)) return f;
      const starred = !f.starred;
      this.toast(starred ? `Starred "${f.name}"` : `Removed star from "${f.name}"`);
      return { ...f, starred };
    });
    this.persist(rows);
    this.render();
  },

  copyShareLink(name, event) {
    if (event) event.stopPropagation();
    const fakeUrl = `https://dimad.app/drive/share/${encodeURIComponent(name)}`;
    if (navigator.clipboard) navigator.clipboard.writeText(fakeUrl);
    this.toast(`Secure public link for "${name}" copied!`);
  },

  upgradeStorage() {
    this.toast('Upgrading to 2TB Tier...');
    closeDimDriveNav();
    if (typeof switchTab === 'function') switchTab('settings');
    if (typeof switchVaultTab === 'function') switchVaultTab('subscription');
  },

  fileIcon(type) {
    if (type === 'pdf') return '<i class="fa-solid fa-file-pdf text-rose-500"></i>';
    if (type === 'svg') return '<i class="fa-solid fa-file-image text-emerald-400"></i>';
    if (type === 'png' || type === 'jpg' || type === 'jpeg' || type === 'gif' || type === 'webp') return '<i class="fa-solid fa-file-image text-brand-accent"></i>';
    if (type === 'csv') return '<i class="fa-solid fa-file-csv text-amber-500"></i>';
    if (type === 'sheet') return '<i class="fa-solid fa-file-excel text-brand-gold"></i>';
    if (type === 'writespace') return '<i class="fa-solid fa-feather text-amber-400"></i>';
    if (type === 'notepad') return '<i class="fa-solid fa-note-sticky text-sky-400"></i>';
    return '<i class="fa-solid fa-file-lines text-slate-400"></i>';
  },

  dateValue(value) {
    if (typeof value === 'number') return value;
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  },

  filteredFiles() {
    const q = this.query.trim().toLowerCase();
    return this.load().filter((f) => {
      if (this.tab === 'trash') return !!f.trashed;
      if (f.trashed) return false;
      if (this.tab === 'starred' && !f.starred) return false;
      if (this.tab === 'notepad' && !(f.folder === 'f-notepad' || f.type === 'notepad')) return false;
      if (this.tab === 'uploads' && !(f.folder === 'user' || String(f.id).startsWith('drv_'))) return false;
      if (this.tab === 'recent') return true;
      if (this.tab === 'drive' && !this.folderId && (f.folder === 'f-notepad' || f.type === 'notepad')) return false;
      if (this.folderId && f.folder !== this.folderId) return false;
      if (q) {
        return f.name.toLowerCase().includes(q) || String(f.category || '').toLowerCase().includes(q) || String(f.owner || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      if (this.tab === 'recent' || this.sortBy === 'date') return this.dateValue(b.updatedAt) - this.dateValue(a.updatedAt);
      if (this.sortBy === 'size') return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      return String(a.name).localeCompare(String(b.name));
    });
  },

  renderNav() {
    const nav = document.getElementById('dimdrive-nav');
    if (!nav) return;
    const files = this.load();
    const items = [
      { id: 'drive', label: 'My Drive', icon: 'fa-hard-drive' },
      { id: 'uploads', label: 'Uploads', icon: 'fa-cloud-arrow-up' },
      { id: 'recent', label: 'Recent', icon: 'fa-clock' },
      { id: 'starred', label: 'Starred', icon: 'fa-star' },
      { id: 'notepad', label: 'Notepad', icon: 'fa-note-sticky' },
      { id: 'trash', label: 'Trash', icon: 'fa-trash-can' }
    ];
    nav.innerHTML = items.map((item) => {
      const on = this.tab === item.id;
      const count = item.id === 'starred'
        ? files.filter((f) => f.starred && !f.trashed).length
        : item.id === 'notepad'
          ? files.filter((f) => !f.trashed && (f.folder === 'f-notepad' || f.type === 'notepad')).length
          : null;
      return `<button type="button" onclick="DIMDRIVE.setTab('${item.id}')" class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-semibold transition ${on ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}">
        <span class="flex items-center gap-2"><i class="fa-solid ${item.icon} w-3.5 text-center text-[10px] ${on ? 'text-amber-500' : 'text-slate-400'}"></i>${item.label}</span>
        ${count != null ? `<span class="text-[8px] bg-slate-950 px-1 py-0.5 rounded text-amber-400 border border-slate-800 font-mono">${count}</span>` : ''}
      </button>`;
    }).join('');
  },

  renderFolderNav() {
    const root = document.getElementById('dimdrive-folder-nav');
    if (!root) return;
    const folders = this.visibleFolders();
    const files = this.load().filter((f) => !f.trashed);
    const rows = folders.map((folder) => {
      const count = files.filter((f) => f.folder === folder.id).length;
      const on = this.folderId === folder.id;
      if (this.renamingFolderId === folder.id) {
        return `<div class="px-1.5 py-1">
          <input id="dimdrive-folder-rename" type="text" value="${this.escape(folder.name)}" onkeydown="DIMDRIVE.folderKey(event,'rename')" onblur="DIMDRIVE.commitRenameFolder()" class="w-full bg-slate-900 border border-amber-500/40 rounded px-1.5 py-1 text-[10px] text-slate-100 outline-none">
        </div>`;
      }
      return `<button type="button" onclick="DIMDRIVE.openFolder('${folder.id}')" oncontextmenu="DIMDRIVE.openFolderCtx(event, '${folder.id}')" class="w-full flex items-center justify-between px-2 py-1 rounded-md text-[10px] font-medium transition ${on ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}">
        <span class="flex items-center gap-1.5 min-w-0"><i class="fa-solid fa-folder text-amber-500 text-[9px] shrink-0"></i><span class="truncate">${this.escape(folder.name)}</span></span>
        <span class="text-[8px] font-mono text-slate-500">${count}</span>
      </button>`;
    }).join('');
    const composer = this.composingFolder ? `<div class="px-1.5 py-1">
      <input id="dimdrive-folder-new" type="text" placeholder="Folder name" onkeydown="DIMDRIVE.folderKey(event,'new')" onblur="DIMDRIVE.commitNewFolder()" class="w-full bg-slate-900 border border-amber-500/40 rounded px-1.5 py-1 text-[10px] text-slate-100 outline-none placeholder:text-slate-600">
    </div>` : '';
    root.innerHTML = `${composer}${rows || '<p class="px-2 py-1 text-[9px] text-slate-500">No folders yet. Create one.</p>'}`;
  },

  renderFolders() {
    if (this.tab !== 'drive' || this.query || this.category !== 'All' || this.folderId) return '';
    const files = this.load().filter((f) => !f.trashed);
    const folders = this.visibleFolders().slice();
    if (files.some((f) => f.folder === 'user')) {
      folders.push({ id: 'user', name: '✍️ WriteSpace & Uploads', color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30' });
    }
    return `<div class="space-y-1.5">
      <h3 class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Folders (${folders.length})</h3>
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-1.5">
        ${folders.map((folder) => {
          const items = files.filter((f) => f.folder === folder.id);
          const bytes = items.reduce((n, f) => n + (f.sizeBytes || 0), 0);
          return `<button type="button" onclick="DIMDRIVE.openFolder('${folder.id}')" class="px-2 py-1.5 rounded-lg border bg-gradient-to-br ${folder.color} ${folder.border} hover:border-amber-500/60 transition cursor-pointer group flex items-center justify-between text-left">
            <div class="flex items-center gap-1.5 overflow-hidden min-w-0">
              <i class="fa-solid fa-folder text-[11px] text-amber-500 group-hover:scale-110 transition-transform"></i>
              <div class="truncate">
                <h4 class="text-[9px] font-bold text-slate-100 truncate group-hover:text-amber-400">${this.escape(folder.name)}</h4>
                <p class="text-[8px] text-slate-400 font-mono">${items.length} items • ${this.formatBytes(bytes)}</p>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-[8px] text-slate-600 group-hover:text-amber-500"></i>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  },

  renderFiles() {
    const files = this.filteredFiles();
    const empty = `<div class="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
      <i class="fa-solid fa-folder-open text-3xl text-slate-600"></i>
      <p class="text-xs text-slate-400 font-medium">No files found matching your criteria.</p>
      <button type="button" onclick="DIMDRIVE.setSearch(''); DIMDRIVE.category='All'; DIMDRIVE.folderId=null; DIMDRIVE.render();" class="text-xs text-amber-400 font-bold hover:underline">Reset Filters</button>
    </div>`;
    const grid = `<div class="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
      ${files.map((file) => `<div onclick="DIMDRIVE.select('${file.id}')" class="group p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${this.selectedId === file.id ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'}">
        <div class="flex items-start justify-between gap-1.5">
          <div class="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-sm shrink-0">${this.fileIcon(file.type)}</div>
          <div class="flex items-center gap-0.5">
            <button type="button" onclick="DIMDRIVE.toggleStar('${file.id}', event)" class="text-[10px] p-0.5 hover:text-amber-400 transition ${file.starred ? 'text-amber-400' : 'text-slate-600 opacity-0 group-hover:opacity-100'}"><i class="fa-${file.starred ? 'solid' : 'regular'} fa-star"></i></button>
            <button type="button" onclick="DIMDRIVE.copyShareLink(${JSON.stringify(file.name)}, event)" class="text-[10px] p-0.5 text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition"><i class="fa-solid fa-link"></i></button>
          </div>
        </div>
        <div>
          <h4 class="text-[10px] font-bold text-slate-100 truncate group-hover:text-amber-400">${this.escape(file.name)}</h4>
          <p class="line-clamp-2 mt-1 leading-snug bg-slate-950/60 p-1.5 rounded-md border border-slate-800/60 font-mono text-[9px] text-slate-400">"${this.escape(this.previewFromFile(file))}"</p>
        </div>
        <div class="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
          <span class="font-mono">${this.escape(file.size || '—')}</span>
          <span>${this.escape(this.formatStamp(file.updatedAt))}</span>
        </div>
      </div>`).join('')}
    </div>`;
    const list = `<div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      <table class="w-full text-left border-collapse text-[10px]">
        <thead><tr class="bg-slate-900 border-b border-slate-800 text-[9px] uppercase font-bold text-slate-400">
          <th class="py-2 px-3">Name</th><th class="py-2 px-3 hidden sm:table-cell">Category</th><th class="py-2 px-3 hidden md:table-cell">Owner</th><th class="py-2 px-3">Last Modified</th><th class="py-2 px-3 text-right">Size</th><th class="py-2 px-3 text-center">Actions</th>
        </tr></thead>
        <tbody class="divide-y divide-slate-800/60">
          ${files.map((file) => `<tr onclick="DIMDRIVE.select('${file.id}')" class="cursor-pointer transition hover:bg-slate-800/50 ${this.selectedId === file.id ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''}">
            <td class="py-1.5 px-3 font-semibold text-slate-200">
              <div class="flex items-center gap-2"><span class="text-sm">${this.fileIcon(file.type)}</span><span class="truncate max-w-xs">${this.escape(file.name)}</span>${file.starred ? '<i class="fa-solid fa-star text-amber-400 text-[8px]"></i>' : ''}</div>
            </td>
            <td class="py-1.5 px-3 text-slate-400 hidden sm:table-cell">${this.escape(file.category || '—')}</td>
            <td class="py-1.5 px-3 text-slate-400 hidden md:table-cell">${this.escape(file.owner || 'You')}</td>
            <td class="py-1.5 px-3 text-slate-400 font-mono text-[9px]">${this.escape(this.formatStamp(file.updatedAt))}</td>
            <td class="py-1.5 px-3 text-right font-mono text-slate-300">${this.escape(file.size || '—')}</td>
            <td class="py-1.5 px-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button type="button" onclick="DIMDRIVE.copyShareLink(${JSON.stringify(file.name)}, event)" class="text-slate-400 hover:text-amber-400 p-1"><i class="fa-solid fa-link text-[10px]"></i></button>
                <button type="button" onclick="event.stopPropagation(); DIMDRIVE.remove('${file.id}')" class="text-slate-500 hover:text-rose-400 p-1"><i class="fa-solid fa-trash text-[10px]"></i></button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
    return `<div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Files (${files.length})</h3>
        <span class="text-[9px] text-slate-500 font-mono">Click a file to inspect</span>
      </div>
      ${files.length === 0 ? empty : (this.viewMode === 'grid' ? grid : list)}
    </div>`;
  },

  renderInspector() {
    const panel = document.getElementById('dimdrive-inspector');
    if (!panel) return;
    const files = this.filteredFiles();
    const selected = this.get(this.selectedId) || files[0] || null;
    if (selected && this.selectedId !== selected.id) this.selectedId = selected.id;
    if (!this.detailsOpen || !selected) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    const canOpen = selected.type === 'writespace' || selected.type === 'sheet' || selected.type === 'notepad';
    const openLabel = selected.type === 'sheet' ? 'Open in Sales & Revenue' : selected.type === 'notepad' ? 'Open in DIMAD Notepad' : 'Open in WriteSpace';
    const openFn = selected.type === 'sheet'
      ? `DIMDRIVE.openInSheet('${selected.id}')`
      : selected.type === 'notepad'
        ? `DIMDRIVE.openInNotepad('${selected.id}')`
        : `DIMDRIVE.openInWriteSpace('${selected.id}')`;
    panel.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 class="text-[9px] font-bold text-slate-300 uppercase tracking-wider">File Details</h3>
          <button type="button" onclick="DIMDRIVE.toggleDetails()" class="text-slate-500 hover:text-slate-200 text-[10px]"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center space-y-2">
          <div class="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-xl">${this.fileIcon(selected.type)}</div>
          <div>
            <h4 class="text-[10px] font-bold text-slate-100 break-words">${this.escape(selected.name)}</h4>
            <span class="text-[9px] text-amber-400 font-mono mt-0.5 block">${this.escape(String(selected.type || 'file').toUpperCase())} • ${this.escape(selected.size || '—')}</span>
          </div>
          <div class="bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-left font-mono text-[9px] text-slate-300 space-y-1">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">Text Preview</span>
            <p class="line-clamp-3 leading-snug italic">"${this.escape(this.previewFromFile(selected))}"</p>
          </div>
        </div>
        <div class="space-y-1.5 text-[10px]">
          <h4 class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">System Metadata</h4>
          <div class="bg-slate-950 rounded-lg p-2 border border-slate-800 space-y-1.5 text-[10px]">
            <div class="flex justify-between text-slate-400"><span>Category:</span><span class="text-slate-200 font-medium">${this.escape(selected.category || '—')}</span></div>
            <div class="flex justify-between text-slate-400"><span>Owner:</span><span class="text-slate-200 font-medium">${this.escape(selected.owner || 'You')}</span></div>
            <div class="flex justify-between text-slate-400"><span>Sharing Status:</span><span class="text-amber-400 font-semibold">${this.escape(selected.permission || 'Private')}</span></div>
            <div class="flex justify-between text-slate-400"><span>Created:</span><span class="text-slate-300 font-mono">${this.escape(this.formatStamp(selected.createdAt))}</span></div>
            <div class="flex justify-between text-slate-400"><span>Last Modified:</span><span class="text-slate-300 font-mono">${this.escape(this.formatStamp(selected.updatedAt))}</span></div>
          </div>
        </div>
      </div>
      <div class="space-y-1.5 pt-3 border-t border-slate-800">
        ${canOpen ? `<button type="button" onclick="${openFn}" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] py-1.5 rounded-lg transition">${openLabel}</button>` : ''}
        <button type="button" onclick='DIMDRIVE.copyShareLink(${JSON.stringify(selected.name)})' class="w-full ${canOpen ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'} font-bold text-[10px] py-1.5 rounded-lg transition flex items-center justify-center gap-1.5"><i class="fa-solid fa-link"></i> Copy Public Link</button>
        <button type="button" onclick="DIMDRIVE.download('${selected.id}')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[10px] py-1.5 rounded-lg border border-slate-700 transition">Download</button>
        <button type="button" onclick="DIMDRIVE.remove('${selected.id}')" class="w-full bg-transparent hover:bg-rose-500/10 text-rose-400 font-medium text-[10px] py-1 rounded-lg transition flex items-center justify-center gap-1.5"><i class="fa-solid fa-trash-can"></i> Delete File</button>
      </div>`;
  },

  render() {
    const view = document.getElementById('view-dimad-dimdrive');
    if (!view) return;
    this.bindUi();
    const searchClear = document.getElementById('dimdrive-search-clear');
    if (searchClear) searchClear.classList.toggle('hidden', !this.query);
    const menu = document.getElementById('dimdrive-new-menu');
    const chev = document.getElementById('dimdrive-new-chevron');
    if (menu) menu.classList.toggle('hidden', !this.newOpen);
    if (chev) chev.classList.toggle('rotate-180', this.newOpen);
    const info = document.getElementById('dimdrive-info-btn');
    if (info) info.className = `p-1.5 rounded-lg border text-[10px] transition ${this.detailsOpen ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`;
    const title = document.getElementById('dimdrive-title');
    if (title) {
      if (this.folderId) {
        const folder = this.workspace().folders.concat([{ id: 'user', name: 'WriteSpace & Uploads' }]).find((f) => f.id === this.folderId);
        title.innerHTML = `<button type="button" onclick="DIMDRIVE.folderId=null; DIMDRIVE.render();" class="text-slate-400 hover:text-amber-400 mr-1"><i class="fa-solid fa-arrow-left"></i></button> ${this.escape(folder ? folder.name : 'Folder')}`;
      } else {
        const labels = { drive: 'My Drive', uploads: 'Uploads', recent: 'Recent', starred: 'Starred', notepad: 'Notepad', trash: 'Trash' };
        title.textContent = labels[this.tab] || this.tab;
      }
    }
    const chip = document.getElementById('dimdrive-filter-chip');
    if (chip) {
      chip.classList.toggle('hidden', this.category === 'All');
      chip.textContent = `Filter: ${this.category}`;
    }
    const sort = document.getElementById('dimdrive-sort');
    if (sort) sort.value = this.sortBy;
    const gridBtn = document.getElementById('dimdrive-view-grid');
    const listBtn = document.getElementById('dimdrive-view-list');
    if (gridBtn) gridBtn.className = `px-2 py-0.5 rounded transition ${this.viewMode === 'grid' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'}`;
    if (listBtn) listBtn.className = `px-2 py-0.5 rounded transition ${this.viewMode === 'list' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'}`;
    const bytes = this.load().filter((f) => !f.trashed).reduce((n, f) => n + (f.sizeBytes || 0), 0) + 4509715660;
    const cap = 15 * 1073741824;
    const pct = Math.min(100, Math.round((bytes / cap) * 100));
    const copy = document.getElementById('dimdrive-storage-copy');
    const pctEl = document.getElementById('dimdrive-storage-pct');
    const bar = document.getElementById('dimdrive-storage-bar');
    if (copy) copy.textContent = `${(bytes / 1073741824).toFixed(1)} GB of 15 GB`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (bar) bar.style.width = `${pct}%`;
    this.renderNav();
    this.renderFolderNav();
    const body = document.getElementById('dimdrive-body');
    if (body) body.innerHTML = `${this.renderFolders()}${this.renderFiles()}`;
    this.renderInspector();
  }
};

const WRITESPACE = {
  storageKey: 'dimad_writespace',
  bound: false,
  tones: ['Conversational', 'Professional', 'Persuasive', 'Academic'],
  defaults: {
    themeMode: 'dark',
    layoutStyle: 'substack',
    title: 'The Art of Deep Work in an Era of Digital Distraction',
    subtitle: 'How modern writers build concentration reserves and produce high-impact essays.',
    bodyText: 'In an age dominated by instant notifications and relentless feeds, the ability to maintain deep focus has become both extraordinarily rare and immensely valuable.\n\nFor essayists and newsletter creators, writing is not merely typing words onto a screen; it is an act of synthesis. When we allow our focus to fragment every six minutes, we severely impair our capacity for high-level creative thinking.\n\nTo construct compelling arguments and memorable prose, writers must cultivate dedicated zones of solitude. By removing visual noise and establishing intentional distribution pipelines, the friction between thought and published work disappears.\n\nHere are three core principles for maintaining a flow state:\n1. Eliminate non-essential visual triggers during draft mode.\n2. Separate the acts of drafting, line-editing, and publishing into distinct sessions.\n3. Leverage modern assistance tools for polishing, while preserving your authentic voice.',
    coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    fontFamily: 'Georgia',
    fontSize: '18',
    bold: false,
    italic: false,
    underline: false,
    grammarEnabled: true,
    grammarIssues: [
      { id: 1, type: 'typo', word: 'synthsis', fix: 'synthesis', explanation: 'Possible spelling error.' },
      { id: 2, type: 'grammar', word: 'impair', fix: 'impairs', explanation: 'Subject-verb agreement check.' },
      { id: 3, type: 'style', word: 'immensely valuable', fix: 'priceless', explanation: 'Wordiness: consider a more concise alternative.' }
    ],
    selectedTone: 'Conversational',
    customToneName: '',
    customToneDesc: '',
    customTones: [
      { id: 'c1', name: '', desc: '' },
      { id: 'c2', name: '', desc: '' },
      { id: 'c3', name: '', desc: '' },
      { id: 'c4', name: '', desc: '' }
    ],
    selectedCustomToneId: 'c1',
    writeAiMode: 'tools',
    writeAiMessages: [],
    focusKeyword: 'deep work writing',
    metaTitle: 'The Art of Deep Work in Digital Era',
    metaDescription: 'Learn how modern writers build concentration reserves and publish high-impact essays consistently.',
    slug: 'art-of-deep-work-writing',
    tab: 'ai-editor',
    sidebarCollapsed: false,
    fullscreen: false,
    currentFileId: ''
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return this.normalizeCustomTones({ ...this.defaults, ...saved });
    } catch (err) {
      return this.normalizeCustomTones({ ...this.defaults });
    }
  },

  persist(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  },

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  previewBodyHtml(text) {
    const raw = String(text || '').trim();
    if (!raw) return '<p class="opacity-50 italic">Nothing to preview yet.</p>';
    return raw.split(/\n{2,}/).map((block) => {
      const lines = this.escape(block).replace(/\n/g, '<br>');
      return `<p class="mb-4 last:mb-0">${lines}</p>`;
    }).join('');
  },

  openPreview() {
    this.saveFromDom();
    const s = this.state();
    const modal = document.getElementById('ws-preview-modal');
    const stage = document.getElementById('ws-preview-stage');
    const kind = document.getElementById('ws-preview-kind');
    if (!modal || !stage) return;
    const layout = s.layoutStyle || 'substack';
    const face = `'${s.fontFamily || 'Georgia'}', Georgia, serif`;
    const size = this.sizePx(s.fontSize);
    const light = s.themeMode === 'light';
    let title = s.title || 'Untitled';
    let subtitle = s.subtitle || '';
    let body = s.bodyText || '';
    let dateLabel = '';
    if (layout === 'journal') {
      const j = this.ensureJournalEntry();
      const entry = j.entries.find((e) => e.id === j.currentId) || {};
      title = entry.title || '';
      body = entry.body || '';
      dateLabel = this.formatJournalDate(entry.date || this.todayStamp());
    }
    const bodyHtml = this.previewBodyHtml(body);
    if (kind) {
      kind.textContent = layout === 'word' ? '· Microsoft Word' : layout === 'journal' ? '· Journal' : '· Substack';
    }
    if (layout === 'word') {
      stage.style.backgroundColor = '#e6e6e6';
      stage.innerHTML = `
        <article class="w-full max-w-[816px] min-h-[1056px] bg-white text-black shadow-2xl border border-[#c6c6c6] px-24 py-16 select-text cursor-default" style="font-family:${face}">
          <div class="flex items-center justify-between text-[10px] tracking-wide text-[#666] mb-10" style="font-family:Calibri, 'Segoe UI', sans-serif">
            <span>${this.escape(title)}</span><span>Page 1</span>
          </div>
          <h1 class="text-[21.33px] font-bold leading-tight mb-4">${this.escape(title)}</h1>
          <div class="leading-[1.15] text-black whitespace-normal" style="font-size:${size}">${bodyHtml}</div>
        </article>`;
    } else if (layout === 'journal') {
      stage.style.backgroundColor = light ? '#f0f2f5' : '#070A0F';
      const paper = light ? 'bg-white text-slate-800 border-slate-200' : 'bg-brand-panel text-slate-100 border-brand-gold/30';
      stage.innerHTML = `
        <article class="w-full max-w-3xl ${paper} rounded-xl border shadow-xl p-8 md:p-12 select-text cursor-default" style="font-family:${face}">
          <div class="text-[11px] font-semibold tracking-widest uppercase text-amber-500 mb-2">${this.escape(dateLabel)}</div>
          ${title ? `<h1 class="text-2xl font-bold mb-6">${this.escape(title)}</h1>` : ''}
          <div class="leading-relaxed whitespace-normal" style="font-size:${size}">${bodyHtml}</div>
        </article>`;
    } else {
      stage.style.backgroundColor = light ? '#f0f2f5' : '#070A0F';
      const paper = light ? 'bg-white text-slate-800 border-slate-200' : 'bg-brand-panel text-slate-100 border-brand-gold/30';
      const cover = s.coverImage
        ? `<div class="rounded-lg overflow-hidden border border-amber-900/30 h-48 sm:h-64 mb-6"><img alt="" class="w-full h-full object-cover" src="${this.escape(s.coverImage)}"></div>`
        : '';
      stage.innerHTML = `
        <article class="w-full max-w-3xl ${paper} rounded-xl border shadow-xl p-8 md:p-12 select-text cursor-default" style="font-family:${face}">
          ${cover}
          <h1 class="text-3xl sm:text-4xl font-extrabold mb-2">${this.escape(title)}</h1>
          ${subtitle ? `<p class="text-lg opacity-80 mb-6">${this.escape(subtitle)}</p>` : ''}
          <div class="flex items-center gap-3 mt-2 mb-8 pt-4 border-t border-amber-900/20 text-xs opacity-75">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold">WS</div>
            <div>
              <div class="font-semibold text-amber-500">WriteSpace Author</div>
              <div>${new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <div class="leading-relaxed whitespace-normal" style="font-size:${size}">${bodyHtml}</div>
        </article>`;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this._previewEsc = (ev) => { if (ev.key === 'Escape') this.closePreview(); };
    document.addEventListener('keydown', this._previewEsc);
  },

  closePreview() {
    const modal = document.getElementById('ws-preview-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    if (this._previewEsc) {
      document.removeEventListener('keydown', this._previewEsc);
      this._previewEsc = null;
    }
  },

  journalKey: 'dimad_writespace_journal',

  defaultJournalFolders() {
    return [{ id: 'daily', name: 'Daily Journal' }];
  },

  loadJournal() {
    try {
      const data = JSON.parse(localStorage.getItem(this.journalKey) || '{}');
      const folders = Array.isArray(data.folders) && data.folders.length
        ? data.folders
        : this.defaultJournalFolders();
      if (!folders.some((f) => f.id === 'daily')) folders.unshift({ id: 'daily', name: 'Daily Journal' });
      const entries = (Array.isArray(data.entries) ? data.entries : []).map((entry) => ({
        ...entry,
        folderId: entry.folderId || 'daily'
      }));
      const currentFolder = folders.some((f) => f.id === data.currentFolder) ? data.currentFolder : 'daily';
      const inFolder = entries.filter((e) => e.folderId === currentFolder);
      const now = new Date();
      const nowYear = now.getFullYear();
      const year = Number(data.year) || nowYear;
      const lastMonth = this.lastJournalMonth(year);
      let month = Number(data.month);
      if (!month || month < 1 || month > 12) month = year === nowYear ? now.getMonth() + 1 : lastMonth;
      if (month > lastMonth) month = lastMonth;
      return {
        folders,
        currentFolder,
        entries,
        currentId: data.currentId || (inFolder[0] && inFolder[0].id) || (entries[0] && entries[0].id) || '',
        year,
        month
      };
    } catch (err) {
      const now = new Date();
      return { folders: this.defaultJournalFolders(), currentFolder: 'daily', entries: [], currentId: '', year: now.getFullYear(), month: now.getMonth() + 1 };
    }
  },

  persistJournal(data) {
    localStorage.setItem(this.journalKey, JSON.stringify(data));
  },

  todayStamp() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  formatJournalDate(iso) {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  },

  folderEntries(j) {
    return (j.entries || []).filter((e) => (e.folderId || 'daily') === (j.currentFolder || 'daily'));
  },

  ensureJournalEntry() {
    const j = this.loadJournal();
    let folderItems = this.folderEntries(j);
    if (!folderItems.length) {
      const entry = {
        id: `j-${Date.now()}`,
        date: this.todayStamp(),
        title: '',
        body: '',
        folderId: j.currentFolder || 'daily',
        updatedAt: Date.now()
      };
      j.entries.unshift(entry);
      j.currentId = entry.id;
      this.persistJournal(j);
      folderItems = [entry];
    }
    const current = j.entries.find((e) => e.id === j.currentId);
    if (!current || (current.folderId || 'daily') !== j.currentFolder) {
      j.currentId = folderItems[0].id;
      this.persistJournal(j);
    }
    return j;
  },

  enterJournal() {
    this._inJournal = true;
    this.ensureJournalEntry();
    this.applyJournalToDom();
    this.renderJournalNav();
    this.syncLayout();
    this.syncTheme();
    this.syncChrome();
  },

  applyJournalToDom() {
    const j = this.ensureJournalEntry();
    const entry = j.entries.find((e) => e.id === j.currentId) || j.entries[0];
    const body = document.getElementById('ws-body');
    const title = document.getElementById('ws-journal-title');
    const dateEl = document.getElementById('ws-journal-date');
    if (body) {
      body.value = entry.body || '';
      body.placeholder = 'Write freely. No outline. No audience. Just the page.';
    }
    if (title) title.value = entry.title || '';
    if (dateEl) dateEl.textContent = this.formatJournalDate(entry.date);
  },

  saveCurrentJournalEntry() {
    const j = this.ensureJournalEntry();
    const entry = j.entries.find((e) => e.id === j.currentId);
    if (!entry) return;
    entry.body = document.getElementById('ws-body')?.value || '';
    entry.title = document.getElementById('ws-journal-title')?.value || '';
    entry.updatedAt = Date.now();
    this.persistJournal(j);
    this.renderJournalList();
  },

  openJournalEntry(id) {
    this.saveCurrentJournalEntry();
    const j = this.loadJournal();
    if (!j.entries.some((e) => e.id === id)) return;
    j.currentId = id;
    this.persistJournal(j);
    this.applyJournalToDom();
    this.renderJournalNav();
    this.syncMetrics();
  },

  newJournalEntry() {
    this.saveCurrentJournalEntry();
    const j = this.loadJournal();
    const entry = {
      id: `j-${Date.now()}`,
      date: this.todayStamp(),
      title: '',
      body: '',
      folderId: j.currentFolder || 'daily',
      updatedAt: Date.now()
    };
    j.entries.unshift(entry);
    j.currentId = entry.id;
    j.year = new Date().getFullYear();
    j.month = new Date().getMonth() + 1;
    this.persistJournal(j);
    this.applyJournalToDom();
    this.renderJournalNav();
    const body = document.getElementById('ws-body');
    if (body) body.focus();
  },

  customFolderCount(j) {
    return (j.folders || []).filter((f) => f.id !== 'daily').length;
  },

  bindJournalFolderUi() {
    if (this._folderUiBound) return;
    this._folderUiBound = true;
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('ws-journal-folder-menu');
      const btn = document.getElementById('ws-journal-folder-btn');
      const ctx = document.getElementById('ws-journal-folder-ctx');
      if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target) && !this._folderComposer && !this._renamingFolderId) {
        menu.classList.add('hidden');
      }
      const yearMenu = document.getElementById('ws-journal-year-menu');
      const yearBtn = document.getElementById('ws-journal-year-btn');
      if (yearMenu && yearBtn && !yearMenu.contains(e.target) && !yearBtn.contains(e.target)) {
        yearMenu.classList.add('hidden');
      }
      const monthMenu = document.getElementById('ws-journal-month-menu');
      const monthBtn = document.getElementById('ws-journal-month-btn');
      if (monthMenu && monthBtn && !monthMenu.contains(e.target) && !monthBtn.contains(e.target)) {
        monthMenu.classList.add('hidden');
      }
      if (ctx && !ctx.contains(e.target)) ctx.classList.add('hidden');
    });
  },

  toggleJournalFolderMenu(e) {
    if (e) e.stopPropagation();
    this.bindJournalFolderUi();
    const menu = document.getElementById('ws-journal-folder-menu');
    if (!menu) return;
    const willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willOpen);
    if (willOpen) {
      this._folderComposer = false;
      this._renamingFolderId = '';
      this.renderJournalFolders(this.loadJournal());
    }
  },

  startNewFolder(e) {
    if (e) e.stopPropagation();
    const j = this.loadJournal();
    if (this.customFolderCount(j) >= 10) return;
    this._folderComposer = true;
    this._renamingFolderId = '';
    const menu = document.getElementById('ws-journal-folder-menu');
    if (menu) menu.classList.remove('hidden');
    this.renderJournalFolders(j);
    const input = document.getElementById('ws-journal-folder-new');
    if (input) {
      input.focus();
      input.select();
    }
  },

  commitNewFolder() {
    const input = document.getElementById('ws-journal-folder-new');
    const name = (input && input.value ? input.value : '').trim();
    this._folderComposer = false;
    if (!name) {
      this.renderJournalFolders(this.loadJournal());
      return;
    }
    const j = this.loadJournal();
    if (this.customFolderCount(j) >= 10) {
      this.renderJournalFolders(j);
      return;
    }
    this.saveCurrentJournalEntry();
    const fresh = this.loadJournal();
    const id = `folder-${Date.now()}`;
    fresh.folders.push({ id, name });
    fresh.currentFolder = id;
    fresh.entries.unshift({
      id: `j-${Date.now()}`,
      date: this.todayStamp(),
      title: '',
      body: '',
      folderId: id,
      updatedAt: Date.now()
    });
    fresh.currentId = fresh.entries[0].id;
    this.persistJournal(fresh);
    this.applyJournalToDom();
    this.renderJournalNav();
    const menu = document.getElementById('ws-journal-folder-menu');
    if (menu) menu.classList.add('hidden');
    const body = document.getElementById('ws-body');
    if (body) body.focus();
  },

  switchJournalFolder(folderId) {
    this._folderComposer = false;
    this._renamingFolderId = '';
    this.saveCurrentJournalEntry();
    const j = this.loadJournal();
    if (!j.folders.some((f) => f.id === folderId)) return;
    j.currentFolder = folderId;
    const inFolder = this.folderEntries(j);
    j.currentId = inFolder[0] ? inFolder[0].id : '';
    this.persistJournal(j);
    this.ensureJournalEntry();
    this.applyJournalToDom();
    this.renderJournalNav();
    this.syncMetrics();
    const menu = document.getElementById('ws-journal-folder-menu');
    if (menu) menu.classList.add('hidden');
  },

  openJournalFolderCtx(e, folderId) {
    e.preventDefault();
    e.stopPropagation();
    if (folderId === 'daily') return;
    this.bindJournalFolderUi();
    this._ctxFolderId = folderId;
    const ctx = document.getElementById('ws-journal-folder-ctx');
    if (!ctx) return;
    ctx.classList.remove('hidden');
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 160);
    ctx.style.left = `${x}px`;
    ctx.style.top = `${y}px`;
  },

  journalFolderAction(action) {
    const id = this._ctxFolderId;
    const ctx = document.getElementById('ws-journal-folder-ctx');
    if (ctx) ctx.classList.add('hidden');
    if (!id || id === 'daily') return;
    if (action === 'rename') this.startRenameFolder(id);
    if (action === 'up') this.moveJournalFolder(id, -1);
    if (action === 'down') this.moveJournalFolder(id, 1);
    if (action === 'delete') this.deleteJournalFolder(id);
  },

  startRenameFolder(id) {
    this._renamingFolderId = id;
    this._folderComposer = false;
    const menu = document.getElementById('ws-journal-folder-menu');
    if (menu) menu.classList.remove('hidden');
    this.renderJournalFolders(this.loadJournal());
    const input = document.getElementById('ws-journal-folder-rename');
    if (input) {
      input.focus();
      input.select();
    }
  },

  commitRenameFolder() {
    const id = this._renamingFolderId;
    const input = document.getElementById('ws-journal-folder-rename');
    const name = (input && input.value ? input.value : '').trim();
    this._renamingFolderId = '';
    if (!id || !name) {
      this.renderJournalFolders(this.loadJournal());
      return;
    }
    const j = this.loadJournal();
    const folder = j.folders.find((f) => f.id === id);
    if (folder) folder.name = name;
    this.persistJournal(j);
    this.renderJournalFolders(j);
  },

  moveJournalFolder(id, dir) {
    const j = this.loadJournal();
    const custom = j.folders.filter((f) => f.id !== 'daily');
    const daily = j.folders.find((f) => f.id === 'daily') || { id: 'daily', name: 'Daily Journal' };
    const idx = custom.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= custom.length) return;
    const tmp = custom[idx];
    custom[idx] = custom[next];
    custom[next] = tmp;
    j.folders = [daily, ...custom];
    this.persistJournal(j);
    this.renderJournalFolders(j);
  },

  deleteJournalFolder(id) {
    if (id === 'daily') return;
    const j = this.loadJournal();
    const folder = j.folders.find((f) => f.id === id);
    if (!folder) return;
    const ok = confirm(`Delete folder “${folder.name}” and its pages?`);
    if (!ok) return;
    this.saveCurrentJournalEntry();
    const fresh = this.loadJournal();
    fresh.folders = fresh.folders.filter((f) => f.id !== id);
    fresh.entries = fresh.entries.filter((e) => (e.folderId || 'daily') !== id);
    if (fresh.currentFolder === id) fresh.currentFolder = 'daily';
    this.persistJournal(fresh);
    this.ensureJournalEntry();
    this.applyJournalToDom();
    this.renderJournalNav();
  },

  renderJournalFolders(j) {
    const menu = document.getElementById('ws-journal-folder-menu');
    const label = document.getElementById('ws-journal-folder-label');
    if (!j) j = this.loadJournal();
    const current = j.currentFolder || 'daily';
    const folder = (j.folders || []).find((f) => f.id === current);
    if (label) label.textContent = folder ? folder.name : 'Daily Journal';
    if (!menu) return;
    const esc = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const atCap = this.customFolderCount(j) >= 10;
    const rows = (j.folders || this.defaultJournalFolders()).map((f) => {
      const on = f.id === current;
      if (this._renamingFolderId === f.id) {
        return `<div class="px-2 py-1 flex items-center gap-1" onclick="event.stopPropagation()">
          <input id="ws-journal-folder-rename" type="text" value="${esc(f.name)}" class="flex-1 min-w-0 bg-brand-black border border-brand-gold/50 rounded px-1.5 py-1 text-[11px] text-amber-100 font-semibold uppercase" onkeydown="if(event.key==='Enter'){event.preventDefault();WRITESPACE.commitRenameFolder();}">
          <button type="button" onclick="WRITESPACE.commitRenameFolder()" class="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center" title="Save"><i class="fa-solid fa-check text-[10px]"></i></button>
        </div>`;
      }
      const ctx = f.id === 'daily' ? '' : `oncontextmenu="WRITESPACE.openJournalFolderCtx(event, '${f.id}')"`;
      return `<button type="button" ${ctx} onclick="WRITESPACE.switchJournalFolder('${f.id}')" class="w-full text-left px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${on ? 'bg-amber-500/15 text-amber-400' : 'text-amber-200 hover:bg-amber-500/10'}">${esc(f.name)}</button>`;
    }).join('');
    let composer = '';
    if (this._folderComposer) {
      composer = `<div class="px-2 py-1.5 flex items-center gap-1 border-t border-amber-900/30" onclick="event.stopPropagation()">
        <input id="ws-journal-folder-new" type="text" placeholder="Folder name" class="flex-1 min-w-0 bg-brand-black border border-brand-gold/50 rounded px-1.5 py-1 text-[11px] text-amber-100 font-semibold uppercase" onkeydown="if(event.key==='Enter'){event.preventDefault();WRITESPACE.commitNewFolder();}">
        <button type="button" onclick="WRITESPACE.commitNewFolder()" class="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center shrink-0" title="Save folder"><i class="fa-solid fa-check text-[10px]"></i></button>
      </div>`;
    } else {
      composer = `<button type="button" onclick="WRITESPACE.startNewFolder(event)" class="w-full text-left px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide border-t border-amber-900/30 ${atCap ? 'text-amber-700 cursor-not-allowed' : 'text-amber-400 hover:bg-amber-500/10'}">${atCap ? 'Folder limit reached (10)' : '+ New Folder'}</button>`;
    }
    menu.innerHTML = rows + composer;
  },

  journalYears() {
    const years = new Set([2024, 2025, 2026, new Date().getFullYear()]);
    const j = this.loadJournal();
    (j.entries || []).forEach((entry) => {
      const y = Number(String(entry.date || '').slice(0, 4));
      if (y >= 2000 && y <= 2100) years.add(y);
    });
    return [...years].sort((a, b) => a - b);
  },

  journalMonthNames() {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  },

  lastJournalMonth(year) {
    const now = new Date();
    if (Number(year) === now.getFullYear()) return now.getMonth() + 1;
    return 12;
  },

  journalMonthCounts(j, year) {
    const counts = {};
    this.folderEntries(j).forEach((entry) => {
      const d = new Date(`${entry.date}T12:00:00`);
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) return;
      const m = d.getMonth() + 1;
      counts[m] = (counts[m] || 0) + 1;
    });
    return counts;
  },

  toggleJournalYearMenu(e) {
    if (e) e.stopPropagation();
    this.bindJournalFolderUi();
    const menu = document.getElementById('ws-journal-year-menu');
    if (!menu) return;
    const open = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !open);
    if (open) this.renderJournalYearMenu();
  },

  renderJournalYearMenu() {
    const menu = document.getElementById('ws-journal-year-menu');
    const label = document.getElementById('ws-journal-year-label');
    const j = this.loadJournal();
    const year = j.year || new Date().getFullYear();
    if (label) label.textContent = String(year);
    if (!menu) return;
    menu.innerHTML = this.journalYears().map((y) => `<button type="button" onclick="WRITESPACE.setJournalYear(${y})" class="w-full text-left px-3 py-1.5 text-[11px] font-bold tracking-wide ${y === year ? 'bg-amber-500/15 text-amber-400' : 'text-amber-200 hover:bg-amber-500/10'}">${y}</button>`).join('');
  },

  setJournalYear(year) {
    const j = this.loadJournal();
    j.year = Number(year);
    const last = this.lastJournalMonth(j.year);
    if (!j.month || j.month > last) j.month = last;
    this.persistJournal(j);
    const menu = document.getElementById('ws-journal-year-menu');
    if (menu) menu.classList.add('hidden');
    this.renderJournalYearMenu();
    this.renderJournalMonthMenu();
    this.renderJournalList();
  },

  toggleJournalMonthMenu(e) {
    if (e) e.stopPropagation();
    this.bindJournalFolderUi();
    const menu = document.getElementById('ws-journal-month-menu');
    if (!menu) return;
    const open = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !open);
    if (open) this.renderJournalMonthMenu();
  },

  renderJournalMonthMenu() {
    const menu = document.getElementById('ws-journal-month-menu');
    const label = document.getElementById('ws-journal-month-label');
    const j = this.loadJournal();
    const year = j.year || new Date().getFullYear();
    const last = this.lastJournalMonth(year);
    let month = Number(j.month) || last;
    if (month > last) month = last;
    const names = this.journalMonthNames();
    const counts = this.journalMonthCounts(j, year);
    const count = counts[month] || 0;
    if (label) label.textContent = `${names[month - 1]} · ${count} ${count === 1 ? 'entry' : 'entries'}`;
    if (!menu) return;
    menu.innerHTML = Array.from({ length: last }, (_, i) => i + 1).map((m) => {
      const n = counts[m] || 0;
      const on = m === month;
      return `<button type="button" onclick="WRITESPACE.setJournalMonth(${m})" class="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] font-bold tracking-wide ${on ? 'bg-amber-500/15 text-amber-400' : 'text-amber-200 hover:bg-amber-500/10'}">
        <span>${names[m - 1]}</span>
        <span class="${on ? 'text-amber-400' : 'text-amber-300/50'}">${n}</span>
      </button>`;
    }).join('');
  },

  setJournalMonth(month) {
    const j = this.loadJournal();
    j.month = Number(month);
    this.persistJournal(j);
    const menu = document.getElementById('ws-journal-month-menu');
    if (menu) menu.classList.add('hidden');
    this.renderJournalMonthMenu();
    this.renderJournalList();
  },

  renderJournalList() {
    const root = document.getElementById('ws-journal-list');
    if (!root) return;
    const j = this.loadJournal();
    const year = j.year || new Date().getFullYear();
    const last = this.lastJournalMonth(year);
    let month = Number(j.month) || last;
    if (month > last) month = last;
    const yearLabel = document.getElementById('ws-journal-year-label');
    if (yearLabel) yearLabel.textContent = String(year);
    this.renderJournalMonthMenu();
    const items = this.folderEntries(j).filter((entry) => {
      const d = new Date(`${entry.date}T12:00:00`);
      return !Number.isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth() + 1) === month;
    }).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.updatedAt || 0) - (b.updatedAt || 0));
    const esc = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!items.length) {
      root.innerHTML = '<p class="px-2.5 py-3 text-[10px] text-amber-300/40">No pages this month. Click + New to write.</p>';
      return;
    }
    root.innerHTML = items.map((entry) => {
      const d = new Date(`${entry.date}T12:00:00`);
      const dayLabel = Number.isNaN(d.getTime()) ? entry.date : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const preview = (entry.title || entry.body || 'Blank page').replace(/\s+/g, ' ').trim().slice(0, 48);
      const on = entry.id === j.currentId;
      return `<button type="button" onclick="WRITESPACE.openJournalEntry('${entry.id}')" class="w-full text-left px-2.5 py-2 rounded-lg border ${on ? 'bg-amber-500/15 border-amber-500/40 text-amber-100' : 'border-transparent hover:bg-amber-500/10 text-amber-200'}">
        <div class="text-[10px] font-semibold text-amber-400 leading-snug">${esc(dayLabel)}</div>
        <div class="text-[11px] truncate opacity-80">${esc(preview)}</div>
      </button>`;
    }).join('');
  },

  renderJournalNav() {
    this.bindJournalFolderUi();
    this.renderJournalFolders(this.loadJournal());
    this.renderJournalYearMenu();
    this.renderJournalMonthMenu();
    this.renderJournalList();
  },

  state() {
    if (!this._state) this._state = this.load();
    return this._state;
  },

  saveFromDom() {
    const s = this.state();
    s.fontFamily = document.getElementById('ws-font')?.value || s.fontFamily;
    s.fontSize = document.getElementById('ws-size')?.value || s.fontSize;
    const layoutEl = document.getElementById('ws-layout');
    if (layoutEl && s.layoutStyle !== 'journal') s.layoutStyle = layoutEl.value || s.layoutStyle;
    s.focusKeyword = document.getElementById('ws-keyword')?.value || '';
    s.metaTitle = document.getElementById('ws-meta-title')?.value || '';
    s.metaDescription = document.getElementById('ws-meta-desc')?.value || '';
    s.slug = document.getElementById('ws-slug')?.value || '';
    s.aiPrompt = document.getElementById('ws-ai-prompt')?.value || '';
    if (this._inJournal && s.layoutStyle === 'journal') {
      this.persist(s);
      this.saveCurrentJournalEntry();
      this.syncMetrics();
      this.syncLayout();
      return;
    }
    s.title = document.getElementById('ws-title')?.value || '';
    s.subtitle = document.getElementById('ws-subtitle')?.value || '';
    s.bodyText = document.getElementById('ws-body')?.value || '';
    this.persist(s);
    this.syncMetrics();
    this.syncLayout();
  },

  wordCount() {
    const s = this.state();
    return `${s.bodyText || ''} ${s.title || ''}`.trim().split(/\s+/).filter(Boolean).length;
  },

  seoScore() {
    const s = this.state();
    const kw = (s.focusKeyword || '').toLowerCase();
    let score = 40;
    if (kw && (s.title || '').toLowerCase().includes(kw)) score += 20;
    if (kw && (s.bodyText || '').toLowerCase().includes(kw)) score += 20;
    if ((s.metaDescription || '').length >= 100 && (s.metaDescription || '').length <= 160) score += 10;
    if (this.wordCount() >= 300) score += 10;
    return Math.min(score, 100);
  },

  mount() {
    const s = this.state();
    const title = document.getElementById('ws-title');
    const titleWord = document.getElementById('ws-title-word');
    const sub = document.getElementById('ws-subtitle');
    const body = document.getElementById('ws-body');
    if (!body) return;
    if (title) title.value = s.title;
    if (titleWord) titleWord.value = s.title;
    if (sub) sub.value = s.subtitle;
    if (s.layoutStyle === 'journal') this.applyJournalToDom();
    else body.value = s.bodyText;
    const font = document.getElementById('ws-font');
    const size = document.getElementById('ws-size');
    const layout = document.getElementById('ws-layout');
    if (font) font.value = s.fontFamily;
    if (size) size.value = s.fontSize;
    if (layout && s.layoutStyle !== 'journal') layout.value = s.layoutStyle;
    const kw = document.getElementById('ws-keyword');
    const mt = document.getElementById('ws-meta-title');
    const md = document.getElementById('ws-meta-desc');
    const slug = document.getElementById('ws-slug');
    if (kw) kw.value = s.focusKeyword;
    if (mt) mt.value = s.metaTitle;
    if (md) md.value = s.metaDescription;
    if (slug) slug.value = s.slug;
    const cover = document.getElementById('ws-cover');
    const wrap = document.getElementById('ws-cover-wrap');
    if (cover && wrap) {
      if (s.coverImage) {
        cover.src = s.coverImage;
        wrap.classList.remove('hidden');
      } else wrap.classList.add('hidden');
    }
    this.renderTones();
    this.setWriteAiMode(s.writeAiMode || 'tools');
    this.renderWriteAiChat();
    this.setTab(s.tab || 'ai-editor');
    this.syncLayout();
    this.syncTheme();
    this.syncChrome();
    if (s.layoutStyle === 'journal') {
      this._inJournal = true;
      this.enterJournal();
    }
    this.syncFormats();
    this.syncGrammar();
    this.syncMetrics();
    if (!this.bound) {
      ['ws-title', 'ws-subtitle', 'ws-body', 'ws-font', 'ws-size', 'ws-layout', 'ws-keyword', 'ws-meta-title', 'ws-meta-desc', 'ws-slug', 'ws-ai-prompt', 'ws-journal-title'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
          if (id === 'ws-title' && titleWord) titleWord.value = title.value;
          if (id === 'ws-title-word' && title) title.value = titleWord.value;
          this.saveFromDom();
        });
        if (el && el.tagName === 'SELECT') el.addEventListener('change', () => {
          const prevLayout = this.state().layoutStyle;
          if (id === 'ws-layout' && prevLayout === 'journal' && el.value !== 'journal') {
            this.saveCurrentJournalEntry();
            this._inJournal = false;
            this.state().layoutStyle = el.value;
            const bodyEl = document.getElementById('ws-body');
            if (bodyEl) bodyEl.value = this.state().bodyText || '';
            const titleEl = document.getElementById('ws-title');
            if (titleEl) titleEl.value = this.state().title || '';
          }
          if (id === 'ws-layout' && el.value === 'word') {
            const st = this.state();
            if (st.fontFamily === 'Georgia') {
              st.fontFamily = 'Calibri';
              const font = document.getElementById('ws-font');
              if (font) font.value = 'Calibri';
            }
            if (st.fontSize === '18') {
              st.fontSize = '11';
              const sizeEl = document.getElementById('ws-size');
              if (sizeEl) sizeEl.value = '11';
            }
          }
          this.saveFromDom();
          if (id === 'ws-layout' && el.value === 'journal') this.enterJournal();
        });
      });
      if (titleWord) titleWord.addEventListener('input', () => {
        if (title) title.value = titleWord.value;
        this.saveFromDom();
      });
      if (!this._escBound) {
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.state().fullscreen) this.toggleFullscreen();
        });
        this._escBound = true;
      }
      this.bound = true;
    }
  },

  renderTones() {
    const root = document.getElementById('ws-tones');
    if (!root) return;
    const s = this.state();
    const chips = this.tones.map((tone) => `<button type="button" onclick="WRITESPACE.setTone('${tone}')" class="py-1.5 px-2 rounded text-center font-medium border ${s.selectedTone === tone ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-[#1a1724] border-amber-900/40 text-amber-200'}">${tone}</button>`);
    root.innerHTML = chips.join('');
    const btn = document.getElementById('ws-custom-tone-btn');
    const hint = document.getElementById('ws-custom-tone-hint');
    const filled = this.customToneSlots().filter((t) => (t.desc || '').trim());
    const has = filled.length > 0;
    const customOn = s.selectedTone === 'Custom';
    const active = this.activeCustomTone();
    if (btn) {
      const span = btn.querySelector('span');
      if (span) {
        span.innerHTML = has
          ? `<i class="fa-solid fa-pen-nib text-brand-gold"></i> Edit Custom Tone`
          : `<i class="fa-solid fa-pen-nib text-brand-gold"></i> Set Custom Tone`;
      }
      btn.className = customOn
        ? 'mt-1.5 w-full py-2 px-3 rounded-lg border border-amber-400 bg-amber-500/20 hover:bg-amber-500/10 text-left font-medium text-amber-200 flex items-center justify-between'
        : 'mt-1.5 w-full py-2 px-3 rounded-lg border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-left font-medium text-amber-200 flex items-center justify-between';
    }
    if (hint) {
      if (customOn && active) {
        hint.classList.remove('hidden');
        hint.textContent = `${active.name || 'Custom'} — ${active.desc}`;
      } else if (has) {
        hint.classList.remove('hidden');
        hint.textContent = `${filled.length} custom tone${filled.length === 1 ? '' : 's'} saved. Open to pick the active voice.`;
      } else {
        hint.classList.add('hidden');
        hint.textContent = '';
      }
    }
  },

  setTone(tone) {
    this.state().selectedTone = tone;
    this.persist(this.state());
    this.renderTones();
  },

  normalizeCustomTones(s) {
    let list = Array.isArray(s.customTones) ? s.customTones.slice() : [];
    if (!list.some((t) => t && (t.desc || t.name)) && (s.customToneDesc || s.customToneName)) {
      list = [{ id: 'c1', name: s.customToneName || 'Custom', desc: s.customToneDesc || '' }];
    }
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const prev = list[i] || {};
      slots.push({
        id: prev.id || ('c' + (i + 1)),
        name: prev.name || '',
        desc: prev.desc || ''
      });
    }
    s.customTones = slots;
    if (!slots.some((t) => t.id === s.selectedCustomToneId)) s.selectedCustomToneId = slots[0].id;
    if (s.selectedTone === 'Custom' && !(this.slotById(slots, s.selectedCustomToneId) || {}).desc) {
      const first = slots.find((t) => (t.desc || '').trim());
      if (first) s.selectedCustomToneId = first.id;
      else s.selectedTone = 'Conversational';
    }
    return s;
  },

  slotById(list, id) {
    return (list || []).find((t) => t.id === id) || null;
  },

  customToneSlots() {
    return this.normalizeCustomTones(this.state()).customTones;
  },

  activeCustomTone() {
    const s = this.state();
    const slots = this.customToneSlots();
    return this.slotById(slots, s.selectedCustomToneId) || slots.find((t) => (t.desc || '').trim()) || null;
  },

  toneLabel() {
    const s = this.state();
    if (s.selectedTone === 'Custom') {
      const active = this.activeCustomTone();
      return (active && active.name) || 'custom tone';
    }
    return s.selectedTone || 'Conversational';
  },

  toneGuide() {
    const s = this.state();
    if (s.selectedTone === 'Custom') {
      const active = this.activeCustomTone();
      if (active && (active.desc || '').trim()) return active.desc.trim();
    }
    const map = {
      Conversational: 'warm, direct, second-person, short paragraphs',
      Professional: 'clear, composed, precise, no slang',
      Persuasive: 'benefit-led, confident, end with a next action',
      Academic: 'measured, evidence-first, qualified claims'
    };
    return map[s.selectedTone] || map.Conversational;
  },

  editingCustomToneId() {
    const s = this.state();
    const slots = this.customToneSlots();
    if (this._editingToneId && slots.some((t) => t.id === this._editingToneId)) return this._editingToneId;
    if (s.selectedCustomToneId && slots.some((t) => t.id === s.selectedCustomToneId)) return s.selectedCustomToneId;
    return slots[0] ? slots[0].id : 'c1';
  },

  flushCustomToneEditor() {
    const id = this._editingToneId || this.editingCustomToneId();
    const nameEl = document.getElementById('ws-ct-name');
    const descEl = document.getElementById('ws-ct-desc');
    if (!nameEl && !descEl) return this.customToneSlots();
    const s = this.state();
    s.customTones = this.customToneSlots().map((tone) => {
      if (tone.id !== id) return tone;
      return {
        id: tone.id,
        name: ((nameEl && nameEl.value) || '').trim(),
        desc: ((descEl && descEl.value) || '').trim()
      };
    });
    return s.customTones;
  },

  renderCustomToneEditor() {
    const pick = document.getElementById('ws-custom-tone-pick');
    const editor = document.getElementById('ws-custom-tone-editor');
    if (!pick || !editor) return;
    const s = this.state();
    const slots = this.customToneSlots();
    const currentId = this.editingCustomToneId();
    this._editingToneId = currentId;
    const current = this.slotById(slots, currentId) || slots[0];
    const active = s.selectedTone === 'Custom' && s.selectedCustomToneId === currentId;
    pick.innerHTML = slots.map((tone, i) => {
      const label = (tone.name || '').trim() || ((tone.desc || '').trim() ? `Tone ${i + 1}` : `Empty slot ${i + 1}`);
      const mark = s.selectedTone === 'Custom' && s.selectedCustomToneId === tone.id ? ' · active' : '';
      return `<option value="${tone.id}" ${tone.id === currentId ? 'selected' : ''}>${this.escape(label)}${mark}</option>`;
    }).join('');
    editor.innerHTML = `<div class="flex items-center justify-between gap-2">
        <span class="text-[10px] font-bold uppercase tracking-wide text-amber-300">Voice</span>
        <button type="button" onclick="WRITESPACE.useCustomTone()" class="text-[10px] font-bold px-2 py-1 rounded ${active ? 'bg-amber-500 text-slate-950' : 'border border-amber-900/40 text-amber-200 hover:border-amber-400'}">${active ? 'Active' : 'Use this tone'}</button>
      </div>
      <label class="block space-y-1">
        <span class="text-[10px] text-amber-300/80">Tone name</span>
        <input id="ws-ct-name" type="text" maxlength="40" value="${this.escape(current ? current.name : '')}" placeholder="e.g. Founder-to-founder" class="w-full bg-slate-950 border border-amber-900/40 rounded-lg px-2 py-1.5 text-[12px] text-amber-100">
      </label>
      <label class="block space-y-1">
        <span class="text-[10px] text-amber-300/80">Audience tone description</span>
        <textarea id="ws-ct-desc" rows="6" placeholder="Who they are, how they talk, what they refuse." class="w-full bg-slate-950 border border-amber-900/40 rounded-lg px-2 py-1.5 text-[12px] text-amber-100 resize-none">${this.escape(current ? current.desc : '')}</textarea>
      </label>`;
  },

  pickCustomTone(id) {
    this.flushCustomToneEditor();
    this._editingToneId = id;
    this.renderCustomToneEditor();
  },

  openCustomTone() {
    this.normalizeCustomTones(this.state());
    this._editingToneId = this.editingCustomToneId();
    this.renderCustomToneEditor();
    const modal = document.getElementById('ws-custom-tone-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeCustomTone() {
    const modal = document.getElementById('ws-custom-tone-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  useCustomTone() {
    const s = this.state();
    s.customTones = this.flushCustomToneEditor();
    const id = this.editingCustomToneId();
    const slot = this.slotById(s.customTones, id);
    if (!slot || !(slot.desc || '').trim()) return;
    s.selectedCustomToneId = id;
    s.selectedTone = 'Custom';
    s.customToneName = slot.name;
    s.customToneDesc = slot.desc;
    this.persist(s);
    this.renderCustomToneEditor();
    this.renderTones();
  },

  saveCustomTone() {
    const s = this.state();
    s.customTones = this.flushCustomToneEditor();
    const slot = this.slotById(s.customTones, this.editingCustomToneId());
    if (slot && (slot.desc || '').trim()) {
      s.selectedCustomToneId = slot.id;
      s.selectedTone = 'Custom';
      s.customToneName = slot.name;
      s.customToneDesc = slot.desc;
    } else if (s.selectedTone === 'Custom') {
      const filled = s.customTones.find((t) => (t.desc || '').trim());
      if (filled) {
        s.selectedCustomToneId = filled.id;
        s.customToneName = filled.name;
        s.customToneDesc = filled.desc;
      } else {
        s.selectedTone = 'Conversational';
        s.customToneName = '';
        s.customToneDesc = '';
      }
    }
    this.persist(s);
    this.renderTones();
    this.closeCustomTone();
  },

  deleteCustomTone() {
    const s = this.state();
    const id = this.editingCustomToneId();
    s.customTones = this.flushCustomToneEditor().map((t) => t.id === id ? { ...t, name: '', desc: '' } : t);
    if (s.selectedCustomToneId === id) {
      const next = s.customTones.find((t) => (t.desc || '').trim());
      if (next) {
        s.selectedCustomToneId = next.id;
        s.customToneName = next.name;
        s.customToneDesc = next.desc;
      } else {
        s.selectedTone = 'Conversational';
        s.customToneName = '';
        s.customToneDesc = '';
      }
    }
    this.persist(s);
    this.renderCustomToneEditor();
    this.renderTones();
  },

  setWriteAiMode(mode) {
    const s = this.state();
    s.writeAiMode = mode === 'chat' ? 'chat' : 'tools';
    this.persist(s);
    const tools = document.getElementById('ws-writeai-tools');
    const chat = document.getElementById('ws-writeai-chat');
    const toolsBtn = document.getElementById('ws-writeai-tools-btn');
    const chatBtn = document.getElementById('ws-writeai-chat-btn');
    if (tools) tools.classList.toggle('hidden', s.writeAiMode !== 'tools');
    if (chat) chat.classList.toggle('hidden', s.writeAiMode !== 'chat');
    const on = 'px-2.5 py-1 bg-amber-500/20 text-amber-300';
    const off = 'px-2.5 py-1 bg-[#1a1724] text-amber-200/80';
    if (toolsBtn) toolsBtn.className = s.writeAiMode === 'tools' ? on : off;
    if (chatBtn) chatBtn.className = s.writeAiMode === 'chat' ? on : off;
    if (s.writeAiMode === 'chat') this.renderWriteAiChat();
  },

  writeAiMessages() {
    const s = this.state();
    if (!Array.isArray(s.writeAiMessages)) s.writeAiMessages = [];
    return s.writeAiMessages;
  },

  renderWriteAiChat() {
    const feed = document.getElementById('ws-writeai-feed');
    if (!feed) return;
    const msgs = this.writeAiMessages();
    if (!msgs.length) {
      feed.innerHTML = `<div class="text-[11px] text-amber-200/70 leading-relaxed p-2">WriteAI reads the draft on the left. Hit <span class="text-brand-gold font-semibold">Revise Draft</span> to rewrite it in the selected audience tone, or type a revision note.</div>`;
      return;
    }
    feed.innerHTML = msgs.map((m) => {
      const you = m.role === 'user';
      const apply = m.kind === 'revision'
        ? `<button type="button" onclick="WRITESPACE.applyRevision('${m.id}')" class="mt-2 w-full py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded font-medium text-[11px]">Replace draft with this revision</button>`
        : '';
      return `<div class="rounded-lg px-2.5 py-2 ${you ? 'bg-amber-500/15 border border-amber-500/30 ml-4' : 'bg-[#1a1724] border border-amber-900/40 mr-4'}">
        <div class="text-[9px] font-bold uppercase tracking-wide ${you ? 'text-amber-300' : 'text-brand-gold'} mb-1">${you ? 'You' : 'WriteAI'}</div>
        <div class="whitespace-pre-wrap leading-relaxed text-amber-100">${this.escape(m.text || '')}</div>
        ${apply}
      </div>`;
    }).join('');
    feed.scrollTop = feed.scrollHeight;
  },

  currentDraft() {
    this.saveFromDom();
    const s = this.state();
    const title = (s.layoutStyle === 'journal' ? (document.getElementById('ws-journal-title')?.value || '') : (s.title || '')).trim();
    const body = (s.bodyText || '').trim();
    return { title, subtitle: (s.subtitle || '').trim(), body };
  },

  rewritePack(draft, instruction) {
    const s = this.state();
    const guide = this.toneGuide();
    const label = this.toneLabel();
    const paras = String(draft || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (!paras.length) {
      const empty = 'No draft on the page yet. Write a few lines, then hit Revise Draft.';
      return { display: empty, draft: '' };
    }
    const rewritten = paras.map((p, i) => {
      if (i === 0) {
        if (s.selectedTone === 'Persuasive') return `Here’s the point, without the warmup: ${p.replace(/^In an age /i, 'Right now, ')}`;
        if (s.selectedTone === 'Professional') return p.replace(/\bimmensely\b/gi, 'highly').replace(/!+/g, '.');
        if (s.selectedTone === 'Academic') return `This draft argues that ${p.charAt(0).toLowerCase()}${p.slice(1)}`;
        if (s.selectedTone === 'Custom') return p;
        return p.replace(/\bwe\b/gi, 'you').replace(/\bFor essayists and newsletter creators, /i, 'If you write for a living, ');
      }
      return p;
    });
    if (s.selectedTone === 'Persuasive' || s.selectedTone === 'Custom') {
      rewritten.push('Next action: keep one principle, cut one distraction, and ship the draft in this voice.');
    }
    const body = rewritten.join('\n\n');
    const note = instruction ? `\n(Revision note: ${instruction})\n` : '';
    return {
      draft: body,
      display: `Revision · ${label}\nVoice: ${guide}${note}\n${body}`
    };
  },

  reviseDraft() {
    const { body, title } = this.currentDraft();
    const source = body || title;
    if (!source) {
      this.writeAiMessages().push({ id: 'm-' + Date.now(), role: 'ai', text: 'There is no draft to revise yet. Write on the canvas first.', kind: 'note' });
      this.persist(this.state());
      this.setWriteAiMode('chat');
      this.renderWriteAiChat();
      return;
    }
    this.writeAiMessages().push({
      id: 'm-' + Date.now(),
      role: 'user',
      text: `Revise the current draft in a ${this.toneLabel()} voice.`
    });
    this.persist(this.state());
    this.setWriteAiMode('chat');
    this.renderWriteAiChat();
    const draft = source;
    setTimeout(() => {
      const pack = this.rewritePack(draft);
      const id = 'rev-' + Date.now();
      this.state().lastAi = pack.draft;
      this.writeAiMessages().push({ id, role: 'ai', text: pack.display, draft: pack.draft, kind: 'revision' });
      this.persist(this.state());
      this.renderWriteAiChat();
    }, 700);
  },

  writeAiKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendWriteAi();
    }
  },

  sendWriteAi() {
    const input = document.getElementById('ws-writeai-input');
    const prompt = ((input && input.value) || '').trim();
    if (!prompt) return;
    if (input) input.value = '';
    const { body, title } = this.currentDraft();
    this.writeAiMessages().push({ id: 'm-' + Date.now(), role: 'user', text: prompt });
    this.persist(this.state());
    this.renderWriteAiChat();
    setTimeout(() => {
      const pack = this.rewritePack(body || title, prompt);
      const id = 'rev-' + Date.now();
      this.state().lastAi = pack.draft;
      this.writeAiMessages().push({ id, role: 'ai', text: pack.display, draft: pack.draft, kind: 'revision' });
      this.persist(this.state());
      this.renderWriteAiChat();
    }, 700);
  },

  applyRevision(id) {
    const msg = this.writeAiMessages().find((m) => String(m.id) === String(id));
    const text = (msg && (msg.draft || msg.text)) || this.state().lastAi;
    if (!text) return;
    this.state().lastAi = text;
    this.applyAi();
  },

  setTab(tab) {
    this.state().tab = tab;
    this.persist(this.state());
    document.querySelectorAll('.ws-pane').forEach((el) => el.classList.add('hidden'));
    const pane = document.getElementById(`ws-tab-${tab}`);
    if (pane) pane.classList.remove('hidden');
    document.querySelectorAll('.ws-tab').forEach((btn) => {
      const on = btn.getAttribute('data-ws-tab') === tab;
      btn.classList.toggle('border-amber-400', on);
      btn.classList.toggle('text-amber-400', on);
      btn.classList.toggle('font-semibold', on);
      btn.classList.toggle('border-transparent', !on);
      btn.classList.toggle('text-amber-200', !on);
      btn.classList.toggle('opacity-60', false);
    });
  },

  toggleTheme() {
    const s = this.state();
    s.themeMode = s.themeMode === 'light' ? 'dark' : 'light';
    this.persist(s);
    this.syncTheme();
    this.syncChrome();
    this.syncLayout();
  },

  toggleFullscreen() {
    const s = this.state();
    s.fullscreen = !s.fullscreen;
    this.persist(s);
    this.syncChrome();
  },

  toggleSidebar() {
    const s = this.state();
    if (s.layoutStyle === 'journal') return;
    s.sidebarCollapsed = !s.sidebarCollapsed;
    this.persist(s);
    this.syncChrome();
  },

  openSidebarTab(tab) {
    const s = this.state();
    if (s.layoutStyle === 'journal') return;
    s.sidebarCollapsed = false;
    this.persist(s);
    this.syncChrome();
    this.setTab(tab);
  },

  syncChrome() {
    const s = this.state();
    const root = document.getElementById('ws-root');
    const view = document.getElementById('view-creator-writespace');
    const aside = document.getElementById('ws-aside');
    const rail = document.getElementById('ws-aside-rail');
    const fullBtn = document.getElementById('ws-full-btn');
    if (root) {
      root.classList.toggle('fixed', !!s.fullscreen);
      root.classList.toggle('inset-0', !!s.fullscreen);
      root.classList.toggle('z-[350]', !!s.fullscreen);
      if (s.fullscreen) {
        root.style.minHeight = '100vh';
        root.style.height = '100vh';
      } else {
        root.style.minHeight = '';
        root.style.height = '';
      }
    }
    if (view && s.fullscreen) view.classList.remove('hidden');
    const journal = s.layoutStyle === 'journal';
    if (aside) aside.classList.toggle('hidden', journal || !!s.sidebarCollapsed);
    if (rail) {
      const showRail = !journal && !!s.sidebarCollapsed;
      rail.classList.toggle('hidden', !showRail);
      rail.classList.toggle('flex', showRail);
    }
    if (fullBtn) {
      fullBtn.innerHTML = s.fullscreen
        ? '<i class="fa-solid fa-compress"></i><span class="hidden sm:inline">Exit</span>'
        : '<i class="fa-solid fa-expand"></i><span class="hidden sm:inline">Expand</span>';
      fullBtn.title = s.fullscreen ? 'Exit full screen' : 'Expand WriteSpace';
    }
    this.syncJournalButton();
  },

  syncJournalButton() {
    const btn = document.getElementById('ws-journal-btn');
    const brand = document.getElementById('ws-brand-title');
    const brandJournal = document.getElementById('ws-brand-journal');
    const layoutWrap = document.getElementById('ws-layout-wrap');
    const layoutRule = document.getElementById('ws-layout-rule');
    const on = this.state().layoutStyle === 'journal';
    if (btn) {
      btn.className = on
        ? 'p-1.5 rounded-md border border-amber-500/50 bg-amber-500/15 text-amber-400 text-xs font-medium flex items-center gap-1.5'
        : 'p-1.5 rounded-md border bg-[#1e1b26] border-amber-900/40 text-amber-300 text-xs font-medium flex items-center gap-1.5';
      btn.title = on ? 'Back' : 'Journal';
      btn.innerHTML = on
        ? '<i class="fa-solid fa-arrow-left"></i><span class="hidden sm:inline">Back</span>'
        : '<i class="fa-solid fa-book"></i><span class="hidden sm:inline">Journal</span>';
    }
    if (brand) brand.textContent = 'WriteSpace';
    if (brandJournal) brandJournal.classList.toggle('hidden', !on);
    if (layoutWrap) {
      layoutWrap.classList.add('hidden');
      layoutWrap.classList.toggle('sm:flex', !on);
    }
    if (layoutRule) {
      layoutRule.classList.add('hidden');
      layoutRule.classList.toggle('sm:block', !on);
    }
  },

  toggleJournalMode() {
    const s = this.state();
    const layoutEl = document.getElementById('ws-layout');
    if (s.layoutStyle === 'journal') {
      this.saveCurrentJournalEntry();
      this._inJournal = false;
      s.layoutStyle = s.prevLayout && s.prevLayout !== 'journal' ? s.prevLayout : 'substack';
      if (layoutEl) layoutEl.value = s.layoutStyle;
      this.persist(s);
      const bodyEl = document.getElementById('ws-body');
      if (bodyEl && s.bodyText) bodyEl.value = s.bodyText;
      const titleEl = document.getElementById('ws-title');
      if (titleEl && s.title) titleEl.value = s.title;
      this.syncLayout();
      this.syncTheme();
      this.syncChrome();
      this.syncMetrics();
      return;
    }
    s.prevLayout = layoutEl ? layoutEl.value : s.layoutStyle;
    s.layoutStyle = 'journal';
    this.persist(s);
    this.enterJournal();
    this.syncJournalButton();
  },

  syncTheme() {
    const s = this.state();
    const root = document.getElementById('ws-root');
    const btn = document.getElementById('ws-theme-btn');
    const canvas = document.getElementById('ws-canvas');
    const body = document.getElementById('ws-body');
    const title = document.getElementById('ws-title');
    const titleWord = document.getElementById('ws-title-word');
    const subtitle = document.getElementById('ws-subtitle');
    const wordH = document.getElementById('ws-word-head');
    const wordF = document.getElementById('ws-word-foot');
    const light = s.themeMode === 'light';
    if (root) {
      root.classList.toggle('bg-[#f0f2f5]', light);
      root.classList.toggle('text-slate-800', light);
      root.classList.toggle('bg-brand-black', !light);
      root.classList.toggle('text-amber-50', !light);
    }
    if (btn) {
      btn.innerHTML = light
        ? '<i class="fa-solid fa-moon text-amber-500"></i><span class="hidden sm:inline">Night Mode</span>'
        : '<i class="fa-solid fa-sun text-blue-400"></i><span class="hidden sm:inline">Day Mode</span>';
    }
    const wordDoc = s.layoutStyle === 'word';
    if (canvas && !wordDoc) {
      canvas.style.backgroundColor = light ? '#ffffff' : '';
      canvas.style.color = light ? '#1e293b' : '';
      canvas.classList.toggle('bg-white', light);
      canvas.classList.toggle('border-slate-200', light);
      canvas.classList.toggle('text-slate-800', light);
      canvas.classList.toggle('bg-brand-panel', !light);
      canvas.classList.toggle('border-amber-900/30', !light);
      canvas.classList.toggle('text-amber-50', !light);
    }
    if (!wordDoc) {
      [body, title, titleWord, subtitle].forEach((el) => {
        if (!el) return;
        el.style.backgroundColor = light ? '#ffffff' : 'transparent';
        el.style.color = light ? '#1e293b' : '';
      });
      if (subtitle && light) subtitle.style.color = '#475569';
    }
    if (wordH && !wordDoc) {
      wordH.classList.toggle('border-slate-200', light);
      wordH.classList.toggle('text-slate-500', light);
      wordH.classList.toggle('border-amber-900/30', !light);
      wordH.classList.toggle('text-amber-400/60', !light);
    }
    if (wordF && !wordDoc) {
      wordF.classList.toggle('border-slate-200', light);
      wordF.classList.toggle('text-slate-400', light);
      wordF.classList.toggle('border-amber-900/30', !light);
      wordF.classList.toggle('text-amber-400/50', !light);
    }
    const aside = document.getElementById('ws-aside');
    if (aside) {
      aside.style.color = '#fde68a';
    }
    this.syncFormats();
  },

  sizePx(size) {
    if (size === '11') return '14.67px';
    if (size === '12') return '16px';
    return `${size || 18}px`;
  },

  syncLayout() {
    const s = this.state();
    const sub = document.getElementById('ws-substack-head');
    const wordH = document.getElementById('ws-word-head');
    const wordT = document.getElementById('ws-title-word');
    const wordF = document.getElementById('ws-word-foot');
    const ruler = document.getElementById('ws-word-ruler');
    const stage = document.getElementById('ws-stage');
    const canvas = document.getElementById('ws-canvas');
    const grammar = document.getElementById('ws-grammar');
    const grammarBtn = document.getElementById('ws-grammar-btn');
    const journalNav = document.getElementById('ws-journal-nav');
    const journalHead = document.getElementById('ws-journal-head');
    const aside = document.getElementById('ws-aside');
    const rail = document.getElementById('ws-aside-rail');
    const isWord = s.layoutStyle === 'word';
    const isJournal = s.layoutStyle === 'journal';
    if (sub) sub.classList.toggle('hidden', isWord || isJournal);
    if (wordH) wordH.classList.toggle('hidden', !isWord);
    if (wordT) wordT.classList.toggle('hidden', !isWord);
    if (wordF) wordF.classList.toggle('hidden', !isWord);
    if (ruler) ruler.classList.toggle('hidden', !isWord);
    if (journalHead) journalHead.classList.toggle('hidden', !isJournal);
    if (journalNav) {
      journalNav.classList.toggle('hidden', !isJournal);
      journalNav.classList.toggle('flex', isJournal);
    }
    if (isJournal) {
      if (aside) aside.classList.add('hidden');
      if (rail) {
        rail.classList.add('hidden');
        rail.classList.remove('flex');
      }
    }
    const body = document.getElementById('ws-body');
    if (isJournal) {
      if (stage) stage.style.backgroundColor = s.themeMode === 'light' ? '#f0f2f5' : '#070A0F';
      if (canvas) {
        canvas.style.width = '';
        canvas.style.maxWidth = '';
        canvas.style.minHeight = '720px';
        canvas.style.padding = '';
        canvas.style.borderRadius = '';
        canvas.style.border = '';
        canvas.style.boxShadow = '';
        canvas.classList.add('w-full', 'max-w-3xl', 'p-8', 'md:p-12', 'rounded-xl');
      }
      if (body) {
        body.style.fontFamily = s.fontFamily;
        body.style.fontSize = this.sizePx(s.fontSize);
        body.style.lineHeight = '1.7';
        body.style.minHeight = '560px';
        body.placeholder = 'Write freely. No outline. No audience. Just the page.';
      }
      const jTitle = document.getElementById('ws-journal-title');
      if (jTitle) {
        jTitle.style.fontFamily = s.fontFamily;
      }
      if (grammar) {
        grammar.innerHTML = '';
        grammar.classList.add('hidden');
      }
      if (grammarBtn) grammarBtn.classList.add('hidden');
      this.renderJournalNav();
    } else if (isWord) {
      if (!this._wordDefaultsApplied) {
        this._wordDefaultsApplied = true;
        if (s.fontFamily === 'Georgia') {
          s.fontFamily = 'Calibri';
          const font = document.getElementById('ws-font');
          if (font) font.value = 'Calibri';
        }
        if (s.fontSize === '18') {
          s.fontSize = '11';
          const sizeEl = document.getElementById('ws-size');
          if (sizeEl) sizeEl.value = '11';
        }
        this.persist(s);
      }
      if (stage) stage.style.backgroundColor = s.themeMode === 'light' ? '#e6e6e6' : '#2d2d2d';
      if (canvas) {
        canvas.style.backgroundColor = '#ffffff';
        canvas.style.color = '#000000';
        canvas.style.width = '816px';
        canvas.style.maxWidth = '100%';
        canvas.style.minHeight = '1056px';
        canvas.style.padding = '64px 96px 56px';
        canvas.style.borderRadius = '0';
        canvas.style.border = '1px solid #c6c6c6';
        canvas.style.boxShadow = '0 0 0 1px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.18)';
        canvas.classList.remove('rounded-xl', 'bg-brand-panel', 'text-amber-50');
      }
      const face = `'${s.fontFamily}', Calibri, 'Segoe UI', sans-serif`;
      if (body) {
        body.style.fontFamily = face;
        body.style.fontSize = this.sizePx(s.fontSize);
        body.style.lineHeight = '1.15';
        body.style.color = '#000000';
        body.style.backgroundColor = '#ffffff';
        body.style.minHeight = '760px';
        body.placeholder = 'Start typing...';
      }
      if (wordT) {
        wordT.style.fontFamily = face;
        wordT.style.fontSize = '21.33px';
        wordT.style.fontWeight = '700';
        wordT.style.color = '#000000';
        wordT.style.backgroundColor = '#ffffff';
        wordT.style.marginBottom = '10px';
        wordT.style.lineHeight = '1.15';
      }
      const headerLeft = document.getElementById('ws-word-header-left');
      if (headerLeft) headerLeft.textContent = s.title || '';
      if (grammar) {
        grammar.classList.remove('hidden');
        grammar.classList.add('text-neutral-600');
      }
      if (grammarBtn) grammarBtn.classList.remove('hidden');
    } else {
      if (stage) stage.style.backgroundColor = '';
      if (canvas) {
        canvas.style.width = '';
        canvas.style.maxWidth = '';
        canvas.style.minHeight = '';
        canvas.style.padding = '';
        canvas.style.borderRadius = '';
        canvas.style.border = '';
        canvas.style.boxShadow = '';
        canvas.classList.add('w-full', 'max-w-3xl', 'p-8', 'md:p-12', 'rounded-xl');
      }
      if (body) {
        body.style.fontFamily = s.fontFamily;
        body.style.fontSize = this.sizePx(s.fontSize);
        body.style.lineHeight = '';
        body.style.minHeight = '';
        body.placeholder = 'Start typing your post or story...';
      }
      if (grammar) grammar.classList.remove('hidden');
      if (grammarBtn) grammarBtn.classList.remove('hidden');
    }
    if (body) {
      body.classList.toggle('font-bold', !!s.bold);
      body.classList.toggle('italic', !!s.italic);
      body.classList.toggle('underline', !!s.underline);
    }
    if (!isJournal) this.syncChrome();
  },

  toggleFormat(key) {
    const s = this.state();
    s[key] = !s[key];
    this.persist(s);
    this.syncFormats();
    this.syncLayout();
  },

  syncFormats() {
    const s = this.state();
    const day = s.themeMode === 'light';
    ['bold', 'italic', 'underline'].forEach((key) => {
      const btn = document.getElementById(`ws-${key}`);
      if (!btn) return;
      btn.className = s[key]
        ? 'p-1.5 rounded border bg-amber-500/20 border-brand-gold text-brand-gold'
        : day
          ? 'p-1.5 rounded border border-transparent text-brand-gold'
          : 'p-1.5 rounded border border-transparent text-amber-200';
    });
  },

  toggleGrammar() {
    const s = this.state();
    s.grammarEnabled = !s.grammarEnabled;
    this.persist(s);
    this.syncGrammar();
  },

  syncGrammar() {
    const s = this.state();
    const box = document.getElementById('ws-grammar');
    const btn = document.getElementById('ws-grammar-btn');
    if (btn) btn.className = s.grammarEnabled
      ? 'px-2.5 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-500 flex items-center gap-1.5'
      : 'px-2.5 py-1 rounded border border-transparent opacity-50 flex items-center gap-1.5';
    if (!box) return;
    if (!s.grammarEnabled || !s.grammarIssues.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `<div class="flex items-center gap-2 font-medium mb-2 text-amber-500"><i class="fa-solid fa-circle-exclamation"></i> Real-time Grammar &amp; Style Alerts (${s.grammarIssues.length})</div>
      <div class="flex flex-wrap gap-2">${s.grammarIssues.map((issue) => {
        const tone = issue.type === 'typo' ? 'border-red-500/50 bg-red-500/10 text-red-400' : issue.type === 'grammar' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-amber-500/50 bg-amber-500/10 text-amber-400';
        return `<span class="px-2.5 py-1 rounded text-xs border ${tone} flex items-center gap-1.5">
          <span class="line-through opacity-70">${issue.word}</span> → <span class="font-semibold">${issue.fix}</span>
          <button type="button" onclick="WRITESPACE.acceptFix(${issue.id})" class="font-bold">✓</button>
          <button type="button" onclick="WRITESPACE.ignoreFix(${issue.id})" class="opacity-70">✕</button>
        </span>`;
      }).join('')}</div>`;
  },

  acceptFix(id) {
    const s = this.state();
    const issue = s.grammarIssues.find((i) => i.id === id);
    if (!issue) return;
    s.bodyText = (s.bodyText || '').replace(issue.word, issue.fix);
    s.grammarIssues = s.grammarIssues.filter((i) => i.id !== id);
    this.persist(s);
    const body = document.getElementById('ws-body');
    if (body) body.value = s.bodyText;
    this.syncGrammar();
    this.syncMetrics();
  },

  ignoreFix(id) {
    const s = this.state();
    s.grammarIssues = s.grammarIssues.filter((i) => i.id !== id);
    this.persist(s);
    this.syncGrammar();
  },

  removeCover() {
    this.state().coverImage = '';
    this.persist(this.state());
    const wrap = document.getElementById('ws-cover-wrap');
    if (wrap) wrap.classList.add('hidden');
  },

  syncMetrics() {
    const s = this.state();
    const words = this.wordCount();
    const chars = (s.bodyText || '').length + (s.title || '').length;
    const read = Math.max(1, Math.ceil(words / 200));
    const pages = Math.max(1, Math.ceil(words / 350));
    const score = this.seoScore();
    const w = document.getElementById('ws-stat-words');
    const c = document.getElementById('ws-stat-chars');
    const r = document.getElementById('ws-stat-read');
    if (w) w.textContent = `${words} words`;
    if (c) c.textContent = `${chars} chars`;
    if (r) r.textContent = `~${read} min read`;
    const byline = document.getElementById('ws-byline');
    if (byline) byline.textContent = `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${read} min read`;
    const page = document.getElementById('ws-page-of');
    const pageNum = document.getElementById('ws-word-page-num');
    if (s.layoutStyle === 'word') {
      if (page) page.textContent = '';
      if (pageNum) pageNum.textContent = String(pages);
    } else if (page) {
      page.textContent = `PAGE 1 OF ${pages}`;
    }
    const badge = document.getElementById('ws-seo-badge');
    const bar = document.getElementById('ws-seo-bar');
    if (badge) {
      badge.textContent = `Score: ${score}/100`;
      badge.className = `px-2 py-0.5 rounded font-bold text-xs ${score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`;
    }
    if (bar) bar.style.width = `${score}%`;
    const mtc = document.getElementById('ws-meta-title-count');
    const mdc = document.getElementById('ws-meta-desc-count');
    if (mtc) mtc.textContent = `(${(s.metaTitle || '').length}/60)`;
    if (mdc) mdc.textContent = `(${(s.metaDescription || '').length}/160)`;
    const checks = document.getElementById('ws-seo-checks');
    if (checks) {
      const kw = (s.focusKeyword || '').toLowerCase();
      const rows = [
        [(s.title || '').toLowerCase().includes(kw) && kw, 'Focus Keyword in Title'],
        [(s.bodyText || '').toLowerCase().includes(kw) && kw, 'Focus Keyword in First 200 words'],
        [words >= 300, 'Word Count > 300 words']
      ];
      checks.innerHTML = `<span class="font-semibold opacity-80">SEO Quality Checks</span>${rows.map(([ok, label]) => `<div class="flex items-center gap-2"><i class="fa-solid fa-circle-check ${ok ? 'text-emerald-400' : 'text-slate-500'}"></i><span>${label}</span></div>`).join('')}`;
    }
    const ww = document.getElementById('ws-win-words');
    const wr = document.getElementById('ws-win-read');
    const ws = document.getElementById('ws-win-seo');
    if (ww) ww.textContent = String(words);
    if (wr) wr.textContent = `${read} min`;
    if (ws) ws.textContent = `${score}%`;
  },

  aiAction(type) {
    const s = this.state();
    const promptEl = document.getElementById('ws-ai-prompt');
    const custom = promptEl ? promptEl.value.trim() : '';
    if (type === 'custom' && !custom) return;
    const out = document.getElementById('ws-ai-out');
    if (out) {
      out.classList.remove('hidden');
      out.innerHTML = '<div class="flex items-center gap-1.5 font-semibold text-amber-500"><i class="fa-solid fa-rotate animate-spin"></i> Analyzing draft tokens and restructuring prose...</div>';
    }
    setTimeout(() => {
      let text = '';
      if (type === 'grammar') text = 'Grammar pass complete. Review subject-verb agreement in paragraph 2 and keep the three principles as a numbered list.';
      else if (type === 'improve') text = 'Tighten the opening by leading with a concrete scene of interruption, then land the synthesis line. Vary sentence length in paragraph 3.';
      else if (type === 'tone') text = `Tone shifted toward ${this.toneLabel()}: ${this.toneGuide()}. Keep the core argument; rewrite the call-to-action in that voice.`;
      else if (type === 'summarize') text = '• Deep focus is scarce and valuable for essayists.\n• Fragmented attention blocks synthesis.\n• Separate drafting, editing, and publishing; use tools without losing voice.';
      else text = custom ? `Instruction: ${custom}\n\nRewrite the hook to earn the next sentence, then keep the three principles intact.` : '';
      s.lastAi = text;
      this.persist(s);
      if (out) {
        out.innerHTML = `<div class="font-semibold text-amber-500 mb-1"><i class="fa-solid fa-sparkles"></i> AI Editor Output</div>
          <p class="whitespace-pre-wrap leading-relaxed opacity-90">${text.replace(/</g, '&lt;')}</p>
          <button type="button" onclick="WRITESPACE.applyAi()" class="mt-2 w-full py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded font-medium text-[11px]">Replace Draft with AI Output</button>`;
      }
    }, 700);
  },

  applyAi() {
    const s = this.state();
    if (!s.lastAi) return;
    s.bodyText = s.lastAi;
    this.persist(s);
    const body = document.getElementById('ws-body');
    if (body) body.value = s.bodyText;
    this.syncMetrics();
  },

  seoFeedback() {
    this.saveFromDom();
    const s = this.state();
    const box = document.getElementById('ws-seo-feedback');
    if (!box) return;
    box.classList.remove('hidden');
    box.innerHTML = '<div class="flex items-center gap-1.5 font-semibold text-amber-400"><i class="fa-solid fa-rotate animate-spin"></i> Generating SEO feedback...</div>';
    const score = this.seoScore();
    const words = this.wordCount();
    const kw = (s.focusKeyword || '').trim();
    const title = s.title || '';
    const body = s.bodyText || '';
    const meta = s.metaDescription || '';
    const slug = s.slug || '';
    const first200 = body.slice(0, 400).toLowerCase();
    setTimeout(() => {
      const lines = [];
      lines.push(`Score ${score}/100. ${score >= 70 ? 'Solid foundation — tighten on-page details below.' : 'This draft is under-optimized. Fix the gaps first, then expand the argument.'}`);
      if (!kw) lines.push('Set a focus keyword. Search engines need one primary phrase to rank.');
      else {
        if (!title.toLowerCase().includes(kw.toLowerCase())) lines.push(`Put “${kw}” in the title, ideally near the front.`);
        else lines.push(`Title already includes “${kw}”. Keep it natural — don’t stack the phrase.`);
        if (!first200.includes(kw.toLowerCase())) lines.push(`Use “${kw}” in the first 100–150 words so the opener matches search intent.`);
        const hits = (body.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (hits < 2) lines.push(`The keyword appears only ${hits} time(s). Add 1–2 more uses in H2-style lines or a closing takeaway.`);
        if (hits > 12) lines.push('Keyword density looks high. Swap a few repeats for related phrases.');
      }
      if (meta.length < 100) lines.push(`Meta description is ${meta.length} characters. Aim for 120–155 characters with the keyword and a reason to click.`);
      else if (meta.length > 160) lines.push(`Meta description is ${meta.length} characters and will truncate. Cut it under 160.`);
      else lines.push('Meta description length is in the click-range. Lead with the benefit, not a summary of paragraph one.');
      if (words < 300) lines.push(`Word count is ${words}. Build to 600–900 words with one example, one objection, and a clear CTA.`);
      else if (words < 600) lines.push(`You’re at ${words} words. Add a concrete example or FAQ block to pass thin-content filters.`);
      else lines.push(`${words} words is enough depth. Next: one descriptive subhead every 150–200 words.`);
      if (slug && kw && !slug.toLowerCase().includes(kw.toLowerCase().split(' ')[0])) lines.push(`Slug “${slug}” doesn’t echo the keyword. Use a short hyphenated version of the focus phrase.`);
      lines.push('Add internal links to one related DIMAD post and one outbound source. Search engines treat that as topical confidence.');
      const text = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
      s.lastSeoFeedback = text;
      this.persist(s);
      box.innerHTML = `<div class="font-semibold text-amber-400 mb-1"><i class="fa-solid fa-sparkles"></i> SEO feedback</div>
        <p class="whitespace-pre-wrap leading-relaxed text-amber-100/90">${text.replace(/</g, '&lt;')}</p>`;
    }, 650);
  },

  publish(platform) {
    const banner = document.getElementById('ws-publish-banner');
    if (!banner) return;
    banner.textContent = `Pushed to ${platform} as a formatted Draft!`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 4000);
  },

  copyHtml() {
    const s = this.state();
    const html = `<article><h1>${s.title}</h1><h2>${s.subtitle}</h2><p>${(s.bodyText || '').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p></article>`;
    if (navigator.clipboard) navigator.clipboard.writeText(html);
    this.publish('Clean HTML');
  },

  downloadMd() {
    const s = this.state();
    const md = `# ${s.title}\n\n*${s.subtitle}*\n\n${s.bodyText}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${s.slug || 'writespace-draft'}.md`;
    a.click();
    this.publish('Markdown');
  },

  draftSnapshot() {
    this.saveFromDom();
    const s = this.state();
    return {
      id: s.currentFileId || '',
      name: s.title || 'Untitled draft',
      title: s.title,
      subtitle: s.subtitle,
      bodyText: s.bodyText,
      layoutStyle: s.layoutStyle,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      coverImage: s.coverImage,
      focusKeyword: s.focusKeyword,
      metaTitle: s.metaTitle,
      metaDescription: s.metaDescription,
      slug: s.slug
    };
  },

  openSaveModal() {
    const modal = document.getElementById('ws-save-modal');
    const name = document.getElementById('ws-save-name');
    if (name) name.value = this.state().title || 'Untitled draft';
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeSaveModal() {
    const modal = document.getElementById('ws-save-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveToDrive() {
    const name = (document.getElementById('ws-save-name')?.value || '').trim();
    const draft = this.draftSnapshot();
    draft.name = name || draft.title || 'Untitled draft';
    const file = DIMDRIVE.upsertWriteSpace(draft);
    this.state().currentFileId = file.id;
    this.persist(this.state());
    this.closeSaveModal();
    this.publish('dimDrive');
    const banner = document.getElementById('ws-publish-banner');
    if (banner) banner.textContent = `Saved to dimDrive as “${file.name}”.`;
  },

  saveLocally() {
    const name = (document.getElementById('ws-save-name')?.value || this.state().title || 'writespace-draft').trim();
    const s = this.draftSnapshot();
    const md = `# ${s.title}\n\n*${s.subtitle || ''}*\n\n${s.bodyText || ''}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/[^\w\-]+/g, '-') || 'writespace-draft'}.md`;
    a.click();
    this.closeSaveModal();
    this.publish('this device');
  },

  openOpenModal() {
    const modal = document.getElementById('ws-open-modal');
    const list = document.getElementById('ws-open-list');
    if (list) {
      const files = DIMDRIVE.load().filter((f) => f.type === 'writespace');
      if (!files.length) {
        list.innerHTML = '<p class="text-[12px] text-slate-400">No WriteSpace files in dimDrive yet. Save a draft first.</p>';
      } else {
        list.innerHTML = files.map((file) => `<button type="button" onclick="DIMDRIVE.openInWriteSpace('${file.id}')" class="w-full text-left border border-amber-900/40 hover:border-amber-500/50 rounded-xl px-3 py-2.5">
          <div class="text-[12px] font-semibold text-amber-100 truncate">${DIMDRIVE.escape(file.name)}</div>
          <div class="text-[10px] font-mono text-amber-400/70">${new Date(file.updatedAt || file.createdAt).toLocaleString()}</div>
        </button>`).join('');
      }
    }
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeOpenModal() {
    const modal = document.getElementById('ws-open-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  loadDriveFile(file) {
    if (!file || !file.payload) return;
    const s = this.state();
    Object.assign(s, file.payload, { currentFileId: file.id });
    this.persist(s);
    this.closeOpenModal();
    this.mount();
  },

  openVictory() {
    this.syncMetrics();
    const modal = document.getElementById('ws-victory');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeVictory() {
    const modal = document.getElementById('ws-victory');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

const PIPELINE = {
  storageKey: 'dimad_content_pipeline',
  openStatuses: ['Target', 'Pitched', 'Negotiating', 'Active Collab', 'Paid'],
  statuses: ['Target', 'Pitched', 'Negotiating', 'Active Collab', 'Paid', 'Closed'],
  showClosed: false,
  sortKey: '',
  sortDir: 'asc',
  seed: [
    { id: 1, name: 'Glossier', contact: 'sarah@glossier.com', sector: 'Beauty / Skincare', status: 'Negotiating', profit: '$1,200', websitePitch: 'https://glossier.com/pages/creators', origin: 'we', description: 'UGC skincare routine + unboxing for new cloud paint.', pitchDate: '2026-10-18', startDate: '2026-10-20', endDate: '2026-11-30', dueDate: '2026-11-07' },
    { id: 2, name: 'Gymshark', contact: 'partnerships@gymshark.com', sector: 'Fitness', status: 'Pitched', profit: '$800', websitePitch: 'https://gymshark.com/pages/influencers', origin: 'we', description: 'Training-day reel series in new seamless drop.', pitchDate: '2026-10-28', startDate: '', endDate: '', dueDate: '2026-11-12' },
    { id: 3, name: 'Article', contact: 'ugc@article.com', sector: 'Home / Living', status: 'Active Collab', profit: '$2,500', websitePitch: 'https://article.com/collabs', origin: 'them', description: 'They reached out for a living-room styling video.', pitchDate: '2026-09-22', startDate: '2026-10-01', endDate: '2026-12-15', dueDate: '2026-11-21' },
    { id: 4, name: 'Notion', contact: 'creators@notion.so', sector: 'Tech / Productivity', status: 'Target', profit: '$1,500', websitePitch: '', origin: 'we', description: 'Shorts walkthrough of creator CRM in Notion.', pitchDate: '', startDate: '', endDate: '', dueDate: '2026-12-01' },
    { id: 5, name: 'AG1 Athletic Greens', contact: 'influencers@drinkag1.com', sector: 'Wellness', status: 'Paid', profit: '$3,000', websitePitch: 'https://drinkag1.com/creators', origin: 'them', description: '30-day morning routine integration. Paid in full.', pitchDate: '2026-08-14', startDate: '2026-09-01', endDate: '2026-09-30', dueDate: '2026-09-30' }
  ],

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  emptyRecord() {
    return {
      id: '',
      name: '',
      status: 'Target',
      sector: '',
      contact: '',
      profit: '',
      websitePitch: '',
      origin: 'we',
      description: '',
      pitchDate: '',
      startDate: '',
      endDate: '',
      dueDate: ''
    };
  },

  normalize(row) {
    const base = this.emptyRecord();
    return {
      ...base,
      ...row,
      sector: row.sector || row.niche || '',
      profit: row.profit || row.value || '',
      websitePitch: row.websitePitch || row.website || '',
      origin: row.origin === 'them' ? 'them' : 'we',
      description: row.description || '',
      pitchDate: row.pitchDate || row.startDate || '',
      startDate: row.startDate || '',
      endDate: row.endDate || '',
      dueDate: row.dueDate || ''
    };
  },

  load() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (Array.isArray(rows) && rows.length) return rows.map((row) => this.normalize(row));
    } catch (err) { /* empty */ }
    const seed = this.seed.map((row) => this.normalize(row));
    this.persist(seed);
    return seed;
  },

  persist(brands) {
    localStorage.setItem(this.storageKey, JSON.stringify(brands));
  },

  renderStudio() {
    const root = document.getElementById('cs-pipeline-list');
    if (!root) return;
    const rows = this.load().filter((row) => this.openStatuses.includes(row.status)).slice(0, 5);
    if (!rows.length) {
      root.innerHTML = '<p class="text-slate-500 px-1 py-2">No open pipeline deals.</p>';
      return;
    }
    root.innerHTML = rows.map((row) => `
      <button type="button" onclick="switchTab('creator-pipeline')" class="w-full flex items-center justify-between gap-2 bg-brand-black/50 border border-brand-border rounded px-2 py-1.5 text-left hover:border-brand-gold/40 transition">
        <span class="min-w-0">
          <span class="block text-[11px] font-semibold text-slate-100 truncate">${this.escape(row.name)}</span>
          <span class="block text-[9px] text-slate-500 truncate">${this.escape(row.sector || row.contact || '')}</span>
        </span>
        <span class="text-right shrink-0">
          <span class="block text-[9px] font-bold text-brand-mint">${this.escape(row.status)}</span>
          <span class="block text-[9px] text-brand-gold">${this.escape(row.profit || '')}</span>
        </span>
      </button>
    `).join('');
  },

  pipelineValue(brands) {
    return brands.reduce((acc, curr) => acc + (parseInt(String(curr.profit || '').replace(/[^0-9]/g, ''), 10) || 0), 0);
  },

  parseDate(value) {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  },

  startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  },

  matchesDue(row, filter) {
    if (filter === 'all') return true;
    const due = this.parseDate(row.dueDate);
    if (filter === 'none') return !due;
    if (!due) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (filter === 'overdue') return due < today;
    if (filter === 'week') {
      const start = this.startOfWeek(today);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return due >= start && due < end;
    }
    if (filter === 'month') return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth();
    if (filter === 'year') return due.getFullYear() === today.getFullYear();
    return true;
  },

  filtered() {
    const brands = this.load();
    const status = document.getElementById('pl-filter-status')?.value || 'all';
    const sector = document.getElementById('pl-filter-sector')?.value || 'all';
    const website = document.getElementById('pl-filter-website')?.value || 'all';
    const origin = document.getElementById('pl-filter-origin')?.value || 'all';
    const due = document.getElementById('pl-filter-due')?.value || 'all';
    const siteQ = (document.getElementById('pl-filter-site')?.value || '').trim().toLowerCase();
    return brands.filter((row) => {
      const isClosed = row.status === 'Closed';
      if (this.showClosed ? !isClosed : isClosed) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (sector !== 'all' && row.sector !== sector) return false;
      const hasSite = !!(row.websitePitch || '').trim();
      if (website === 'has' && !hasSite) return false;
      if (website === 'none' && hasSite) return false;
      if (origin !== 'all' && row.origin !== origin) return false;
      if (!this.matchesDue(row, due)) return false;
      if (siteQ && !(row.websitePitch || '').toLowerCase().includes(siteQ)) return false;
      return true;
    });
  },

  fillFilters(brands) {
    const statusEl = document.getElementById('pl-filter-status');
    const sectorEl = document.getElementById('pl-filter-sector');
    if (statusEl) {
      const current = statusEl.value || 'all';
      const opts = this.showClosed ? ['Closed'] : this.openStatuses;
      statusEl.innerHTML = this.showClosed
        ? '<option value="Closed">Closed</option>'
        : `<option value="all">All statuses</option>${opts.map((s) => `<option value="${this.escape(s)}">${this.escape(s)}</option>`).join('')}`;
      statusEl.value = opts.includes(current) || current === 'all' ? current : (this.showClosed ? 'Closed' : 'all');
      if (this.showClosed) statusEl.value = 'Closed';
    }
    if (sectorEl) {
      const current = sectorEl.value || 'all';
      const sectors = [...new Set(brands.map((b) => b.sector).filter(Boolean))].sort();
      sectorEl.innerHTML = `<option value="all">All sectors</option>${sectors.map((s) => `<option value="${this.escape(s)}">${this.escape(s)}</option>`).join('')}`;
      sectorEl.value = sectors.includes(current) || current === 'all' ? current : 'all';
    }
  },

  sortBy(key) {
    if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.render();
  },

  sorted(rows) {
    const key = this.sortKey;
    if (!key) return rows;
    const dir = this.sortDir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      if (key === 'pitchDate') {
        const av = a.pitchDate || '';
        const bv = b.pitchDate || '';
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return av < bv ? -1 * dir : av > bv ? dir : 0;
      }
      const av = String(a[key] || '').toLowerCase();
      const bv = String(b[key] || '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return dir;
      return 0;
    });
  },

  formatPitchDate(value) {
    const d = this.parseDate(value);
    if (!d) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  },

  syncSortMarks() {
    document.querySelectorAll('[data-pl-sort]').forEach((el) => {
      const key = el.getAttribute('data-pl-sort');
      el.textContent = this.sortKey === key ? (this.sortDir === 'asc' ? '▲' : '▼') : '';
    });
  },

  toggleClosedFolder() {
    this.showClosed = !this.showClosed;
    const statusEl = document.getElementById('pl-filter-status');
    if (statusEl) statusEl.value = this.showClosed ? 'Closed' : 'all';
    this.render();
  },

  mount() {
    const statusSelect = document.getElementById('pl-status');
    if (statusSelect) {
      statusSelect.innerHTML = this.statuses.map((s) => `<option value="${this.escape(s)}">${this.escape(s)}</option>`).join('');
    }
    this.render();
  },

  render() {
    const body = document.getElementById('pl-rows');
    const total = document.getElementById('pl-total');
    const metrics = document.getElementById('pl-metrics');
    if (!body) return;
    const all = this.load();
    const openRows = all.filter((row) => row.status !== 'Closed');
    const closedRows = all.filter((row) => row.status === 'Closed');
    this.fillFilters(all);
    const rows = this.sorted(this.filtered());
    this.syncSortMarks();
    const heading = document.getElementById('pl-heading');
    const subhead = document.getElementById('pl-subhead');
    const closedBtn = document.getElementById('pl-closed-btn');
    if (heading) heading.textContent = this.showClosed ? 'Closed Outreach' : 'Brand Outreach & Content Pipeline';
    if (subhead) {
      subhead.textContent = this.showClosed
        ? 'Closed folder. Change status on a record to move it back into the live pipeline.'
        : 'Spreadsheet view. Click a business to open the full pitch record.';
    }
    if (closedBtn) {
      closedBtn.textContent = this.showClosed ? 'Back to Pipeline' : `View Closed${closedRows.length ? ` (${closedRows.length})` : ''}`;
    }
    if (metrics) {
      const metricRows = this.showClosed ? closedRows : openRows;
      const statusHtml = (this.showClosed ? ['Closed'] : this.openStatuses).map((status) => {
        const n = all.filter((row) => row.status === status).length;
        return `<div class="border-l border-slate-800 pl-5">
          <span class="block text-slate-400">${this.escape(status)}</span>
          <span class="text-base font-semibold text-white">${n}</span>
        </div>`;
      }).join('');
      metrics.innerHTML = `<div>
            <span class="block text-slate-400">${this.showClosed ? 'Closed Value' : 'Total Pipeline'}</span>
            <span id="pl-total" class="text-base font-semibold text-amber-400">$${this.pipelineValue(metricRows).toLocaleString()}</span>
          </div>${statusHtml}`;
    }
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="3" class="px-4 py-10 text-center text-slate-500 text-xs">${this.showClosed ? 'No closed outreach yet.' : 'No businesses match these filters.'}</td></tr>`;
      return;
    }
    body.innerHTML = rows.map((row, i) => {
      const zebra = i % 2 ? 'bg-slate-900' : 'bg-slate-950';
      return `<tr onclick="PIPELINE.openDetail(${Number(row.id)})" class="${zebra} hover:bg-amber-950/30 cursor-pointer border-b border-slate-800">
        <td class="px-4 py-2.5 text-white font-medium whitespace-nowrap">${this.escape(row.name)}</td>
        <td class="px-4 py-2.5 text-amber-400 whitespace-nowrap">${this.escape(row.status)}</td>
        <td class="px-4 py-2.5 text-slate-300 whitespace-nowrap font-mono text-[12px]">${this.escape(this.formatPitchDate(row.pitchDate))}</td>
      </tr>`;
    }).join('');
  },

  fillForm(row) {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || '';
    };
    set('pl-id', row.id);
    set('pl-name', row.name);
    set('pl-status', row.status || 'Target');
    set('pl-sector', row.sector);
    set('pl-contact', row.contact);
    set('pl-profit', row.profit);
    set('pl-website', row.websitePitch);
    set('pl-origin', row.origin || 'we');
    set('pl-description', row.description);
    set('pl-pitch', row.pitchDate);
    set('pl-start', row.startDate);
    set('pl-end', row.endDate);
    set('pl-due', row.dueDate);
    const title = document.getElementById('pl-detail-title');
    if (title) title.textContent = row.id ? row.name || 'Business record' : 'New reach-out';
  },

  openDetail(id) {
    const row = id
      ? this.load().find((b) => Number(b.id) === Number(id))
      : this.emptyRecord();
    if (!row) return;
    this.fillForm(this.normalize(row));
    const modal = document.getElementById('pl-detail');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeDetail() {
    const modal = document.getElementById('pl-detail');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveDetail(event) {
    event.preventDefault();
    const name = (document.getElementById('pl-name')?.value || '').trim();
    if (!name) return;
    const record = this.normalize({
      id: document.getElementById('pl-id')?.value,
      name,
      status: document.getElementById('pl-status')?.value || 'Target',
      sector: (document.getElementById('pl-sector')?.value || '').trim(),
      contact: (document.getElementById('pl-contact')?.value || '').trim(),
      profit: (document.getElementById('pl-profit')?.value || '').trim(),
      websitePitch: (document.getElementById('pl-website')?.value || '').trim(),
      origin: document.getElementById('pl-origin')?.value || 'we',
      description: (document.getElementById('pl-description')?.value || '').trim(),
      pitchDate: document.getElementById('pl-pitch')?.value || '',
      startDate: document.getElementById('pl-start')?.value || '',
      endDate: document.getElementById('pl-end')?.value || '',
      dueDate: document.getElementById('pl-due')?.value || ''
    });
    const brands = this.load();
    if (record.id) {
      const idx = brands.findIndex((b) => String(b.id) === String(record.id));
      if (idx >= 0) brands[idx] = { ...brands[idx], ...record };
      else brands.push({ ...record, id: Date.now() });
    } else {
      brands.push({ ...record, id: Date.now() });
    }
    this.persist(brands);
    this.closeDetail();
    if (record.status === 'Closed') this.showClosed = true;
    else if (this.showClosed && record.status !== 'Closed') this.showClosed = false;
    this.render();
  }
};

window.PIPELINE = PIPELINE;

const SCHEDULER = {
  storageKey: 'dimad_content_scheduler',
  platforms: ['All', 'Blog', 'Facebook', 'Google Business', 'Instagram', 'LinkedIn', 'Pinterest', 'Podcast', 'Threads', 'TikTok', 'X', 'YouTube'],
  contentTypes: ['All', 'UGC Brand Deal', 'Owned Content'],
  statuses: ['Drafting', 'Editing', 'Ready for Review', 'Scheduled', 'Published'],
  profilesKey: 'dimad_scheduler_profiles',
  maxProfiles: 8,
  selectedPlatform: 'All',
  selectedType: 'All',
  selectedProfile: 'all',
  viewMode: 'calendar',
  calView: 'week',
  calKind: 'posting',
  calOffset: 0,
  prodKey: 'dimad_production_list',
  expandedId: 'prod-1',
  filterStage: 'All',
  prodStages: ['All', 'Brainstorm', 'Scripting & Outline', 'Filming / Recording', 'Editing & B-Roll', 'Client / Brand Review', 'Ready to Post'],
  prodSeed: [
    {
      id: 'prod-1',
      title: 'Glossier 3-Step Morning Glow Routine',
      type: 'UGC Video',
      brand: 'Glossier',
      stage: 'Filming / Recording',
      dueDate: '2026-11-08',
      sponsorFee: '$1,200',
      script: 'HOOK A: Stop doing this to your skin in the morning...\nHOOK B: 3 steps to dewy skin in under 2 minutes.\nBODY: Show cleanser texture, serum drip shot, moisturizer glow.',
      checklists: [
        { id: 1, text: 'Record 3 alternate hooks', completed: true },
        { id: 2, text: 'B-Roll of product texture', completed: true },
        { id: 3, text: 'Edit with auto-captions (CapCut)', completed: false },
        { id: 4, text: 'Submit draft to brand portal', completed: false }
      ],
      driveLink: 'https://drive.google.com/folder/glossier-ugc-1'
    },
    {
      id: 'prod-2',
      title: 'Ep. 42: Building a Location Independent Business',
      type: 'Podcast',
      brand: 'Self (Sponsored by AG1)',
      stage: 'Editing & B-Roll',
      dueDate: '2026-11-10',
      sponsorFee: '$800',
      script: 'Intro: Welcome back to Sovereign Nomad.\nMid-roll (04:15): AG1 sponsor read (Mention link in bio for free shaker).\nOutro: Join the WriteSpace community.',
      checklists: [
        { id: 1, text: 'Clean up background noise / EQ audio', completed: true },
        { id: 2, text: 'Extract 3 short clips for TikTok/Reels', completed: true },
        { id: 3, text: 'Write episode show notes & timestamps', completed: false },
        { id: 4, text: 'Upload to Spotify for Podcasters', completed: false }
      ],
      driveLink: ''
    },
    {
      id: 'prod-3',
      title: 'The Sovereign Nomad Newsletter #14',
      type: 'Substack Article',
      brand: 'Self',
      stage: 'Scripting & Outline',
      dueDate: '2026-11-12',
      sponsorFee: 'Owned',
      script: 'Topic: Geolocation API costs and building customizable dashboards.\nKey takeaways: HTML5 vs IP detection, saving API fees, tier architecture.',
      checklists: [
        { id: 1, text: 'Draft outline in WriteSpace', completed: true },
        { id: 2, text: 'Generate custom pull-quote graphics', completed: false },
        { id: 3, text: 'Add affiliate links for gear/tools', completed: false }
      ],
      driveLink: ''
    }
  ],
  seed: [
    { id: 1, title: 'Glossier Summer Skincare Routine', platform: 'TikTok', type: 'UGC Brand Deal', brand: 'Glossier', date: '2026-11-05', time: '14:00', status: 'Scheduled', format: 'Short Video', repurposedTo: ['Instagram Reel', 'YouTube Short'] },
    { id: 2, title: 'Ep. 42: How to Scale a Digital Nomad Business', platform: 'Podcast', type: 'Owned Content', brand: 'Self', date: '2026-11-08', time: '08:00', status: 'Editing', format: 'Audio/Video', repurposedTo: ['Substack Draft', 'TikTok Clips'] },
    { id: 3, title: 'The Sovereign Entrepreneur Newsletter #14', platform: 'Blog', type: 'Owned Content', brand: 'Self', date: '2026-11-09', time: '10:00', status: 'Drafting', format: 'Newsletter', repurposedTo: ['X Thread'] },
    { id: 4, title: 'Article Living Room Setup Review', platform: 'Instagram', type: 'UGC Brand Deal', brand: 'Article', date: '2026-11-12', time: '17:30', status: 'Ready for Review', format: 'Carousel', repurposedTo: [] }
  ],

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  load() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (Array.isArray(rows) && rows.length) return rows;
    } catch (err) { /* empty */ }
    const seed = this.seed.map((row) => ({ ...row, repurposedTo: [...(row.repurposedTo || [])] }));
    this.persist(seed);
    return seed;
  },

  persist(rows) {
    localStorage.setItem(this.storageKey, JSON.stringify(rows));
  },

  defaultProfiles() {
    return [{ id: 'main', name: 'Main profile' }];
  },

  loadProfiles() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.profilesKey) || 'null');
      if (Array.isArray(rows) && rows.length) return rows.slice(0, this.maxProfiles);
    } catch (err) { /* empty */ }
    const seed = this.defaultProfiles();
    this.persistProfiles(seed);
    return seed;
  },

  persistProfiles(rows) {
    localStorage.setItem(this.profilesKey, JSON.stringify(rows));
  },

  loadProd() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.prodKey) || 'null');
      if (Array.isArray(rows) && rows.length) return rows;
    } catch (err) { /* empty */ }
    const seed = this.prodSeed.map((row) => ({ ...row, checklists: (row.checklists || []).map((c) => ({ ...c })) }));
    this.persistProd(seed);
    return seed;
  },

  persistProd(rows) {
    localStorage.setItem(this.prodKey, JSON.stringify(rows));
  },

  patch(id, patch) {
    this.persist(this.load().map((row) => String(row.id) === String(id) ? { ...row, ...patch } : row));
  },

  remove(id) {
    this.persist(this.load().filter((row) => String(row.id) !== String(id)));
  },

  patchProd(id, patch) {
    this.persistProd(this.loadProd().map((row) => String(row.id) === String(id) ? { ...row, ...patch } : row));
  },

  removeProd(id) {
    this.persistProd(this.loadProd().filter((row) => String(row.id) !== String(id)));
  },

  openProdModal() {
    const modal = document.getElementById('sch-prod-modal');
    const stage = document.getElementById('prod-new-stage');
    const due = document.getElementById('prod-new-due');
    const title = document.getElementById('prod-new-title');
    const brand = document.getElementById('prod-new-brand');
    const fee = document.getElementById('prod-new-fee');
    const drive = document.getElementById('prod-new-drive');
    const type = document.getElementById('prod-new-type');
    if (stage) {
      const opts = this.prodStages.filter((s) => s !== 'All');
      stage.innerHTML = opts.map((s) => `<option value="${this.escape(s)}">${this.escape(s)}</option>`).join('');
      stage.value = 'Brainstorm';
    }
    if (due) due.value = this.dateKey(new Date());
    if (title) title.value = '';
    if (brand) brand.value = 'Self';
    if (fee) fee.value = '';
    if (drive) drive.value = '';
    if (type) type.value = 'UGC Video';
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (title) title.focus();
  },

  closeProdModal() {
    const modal = document.getElementById('sch-prod-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  addProduction(event) {
    event.preventDefault();
    const title = (document.getElementById('prod-new-title')?.value || '').trim();
    if (!title) return;
    const id = `prod-${Date.now()}`;
    const rows = this.loadProd();
    rows.unshift({
      id,
      title,
      type: document.getElementById('prod-new-type')?.value || 'UGC Video',
      brand: (document.getElementById('prod-new-brand')?.value || 'Self').trim() || 'Self',
      stage: document.getElementById('prod-new-stage')?.value || 'Brainstorm',
      dueDate: document.getElementById('prod-new-due')?.value || this.dateKey(new Date()),
      sponsorFee: (document.getElementById('prod-new-fee')?.value || '').trim() || 'Owned',
      script: '',
      checklists: [
        { id: 1, text: 'Draft outline / hooks', completed: false },
        { id: 2, text: 'Capture assets / footage', completed: false },
        { id: 3, text: 'First edit', completed: false }
      ],
      driveLink: (document.getElementById('prod-new-drive')?.value || '').trim()
    });
    this.persistProd(rows);
    this.expandedId = id;
    this.filterStage = 'All';
    this.viewMode = 'list';
    this.closeProdModal();
    this.render();
  },

  setProdFilter(stage) {
    this.filterStage = stage;
    this.render();
  },

  toggleProd(id) {
    this.expandedId = this.expandedId === id ? '' : id;
    this.render();
  },

  setProdStage(id, stage) {
    const rows = this.loadProd().map((item) => (item.id === id ? { ...item, stage } : item));
    this.persistProd(rows);
    this.render();
  },

  setProdScript(id, script) {
    const rows = this.loadProd().map((item) => (item.id === id ? { ...item, script } : item));
    this.persistProd(rows);
  },

  toggleCheck(itemId, checkId) {
    const rows = this.loadProd().map((item) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        checklists: item.checklists.map((c) => (Number(c.id) === Number(checkId) ? { ...c, completed: !c.completed } : c))
      };
    });
    this.persistProd(rows);
    this.render();
  },

  nextDueLabel(items) {
    const dated = items.filter((i) => i.dueDate).slice().sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    if (!dated.length) return 'None';
    const d = new Date(`${dated[0].dueDate}T00:00:00`);
    const label = Number.isNaN(d.getTime())
      ? dated[0].dueDate
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const brand = (dated[0].brand || '').split('(')[0].trim();
    return brand ? `${label} (${brand})` : label;
  },

  renderProductionList() {
    const items = this.loadProd();
    const filtered = items.filter((i) => this.filterStage === 'All' || i.stage === this.filterStage);
    const chips = this.prodStages.map((s) => {
      const on = this.filterStage === s;
      const cls = on
        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-medium'
        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600';
      return `<button type="button" onclick="SCHEDULER.setProdFilter('${this.escape(s)}')" class="text-xs px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${cls}">${this.escape(s)}</button>`;
    }).join('');
    const cards = filtered.map((item) => {
      const done = (item.checklists || []).filter((c) => c.completed).length;
      const total = (item.checklists || []).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const open = this.expandedId === item.id;
      const stageOpts = this.prodStages.filter((s) => s !== 'All').map((s) => `<option value="${this.escape(s)}"${s === item.stage ? ' selected' : ''}>${this.escape(s)}</option>`).join('');
      const checks = (item.checklists || []).map((check) => {
        const doneCls = check.completed
          ? 'bg-slate-900 border-emerald-900/50 text-[#88a090] line-through'
          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';
        return `<label class="flex items-center gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${doneCls}">
          <input type="checkbox" ${check.completed ? 'checked' : ''} onchange="SCHEDULER.toggleCheck('${item.id}', ${Number(check.id)})" class="accent-amber-500 rounded cursor-pointer">
          <span>${this.escape(check.text)}</span>
        </label>`;
      }).join('');
      const drive = item.driveLink
        ? `<a href="${this.escape(item.driveLink)}" target="_blank" rel="noreferrer" class="text-xs text-amber-400 underline hover:text-amber-300">Open Folder ↗</a>`
        : '<span class="text-xs text-slate-500 font-mono">No link attached</span>';
      const workspace = open ? `<div class="border-t border-slate-800 bg-brand-black p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Script Hook &amp; Outline</h4>
            <span class="text-[10px] text-amber-500/80 font-mono">Auto-Saved</span>
          </div>
          <textarea rows="8" oninput="SCHEDULER.setProdScript('${item.id}', this.value)" placeholder="Write hooks, talking points, mid-roll sponsor reads..." class="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono leading-relaxed">${this.escape(item.script || '')}</textarea>
        </div>
        <div class="flex flex-col justify-between">
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Production Check-List</h4>
            <div class="space-y-2">${checks}</div>
          </div>
          <div class="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
            <span class="text-xs text-slate-500">Raw Assets / Drive Folder:</span>
            ${drive}
          </div>
        </div>
      </div>` : '';
      return `<div class="bg-slate-900 border rounded-2xl transition-all overflow-hidden ${open ? 'border-amber-600/60 shadow-xl' : 'border-slate-800 hover:border-slate-700'}">
        <div onclick="SCHEDULER.toggleProd('${item.id}')" class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none">
          <div class="flex items-center gap-4 flex-1">
            <span class="text-amber-500 text-sm font-mono">${open ? '▼' : '▶'}</span>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs bg-slate-800 text-amber-400 font-mono px-2 py-0.5 rounded border border-slate-700">${this.escape(item.type)}</span>
                <span class="text-xs text-slate-400">Deal: <strong class="text-slate-300">${this.escape(item.brand)}</strong></span>
              </div>
              <h3 class="text-base font-semibold text-white">${this.escape(item.title)}</h3>
            </div>
          </div>
          <div class="flex items-center gap-6" onclick="event.stopPropagation()">
            <div class="w-32 hidden sm:block">
              <div class="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                <span>Tasks</span>
                <span>${done}/${total} (${pct}%)</span>
              </div>
              <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-full" style="width:${pct}%"></div>
              </div>
            </div>
            <select onchange="SCHEDULER.setProdStage('${item.id}', this.value)" class="bg-slate-900 text-xs text-amber-400 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer">${stageOpts}</select>
            <div class="text-right text-xs">
              <span class="text-slate-500 block font-mono">Due Date</span>
              <span class="text-white font-medium">${this.escape(item.dueDate)}</span>
            </div>
          </div>
        </div>
        ${workspace}
      </div>`;
    }).join('') || '<div class="h-32 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-500">No assets in this stage.</div>';
    return `<div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <p class="text-sm text-slate-400">Granular pre-production, scripts, shot-lists, and brand asset pipelines.</p>
      <div class="flex items-center gap-4 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs">
        <div>
          <span class="text-slate-400 block">In Production</span>
          <span class="text-amber-400 font-bold text-sm">${items.length} Assets</span>
        </div>
        <div class="border-l border-slate-800 pl-4">
          <span class="text-slate-400 block">Next Due</span>
          <span class="text-white font-medium">${this.escape(this.nextDueLabel(items))}</span>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
      <span class="text-xs text-slate-500 font-mono uppercase tracking-wider mr-2">Filter Stage:</span>
      ${chips}
    </div>
    <div class="space-y-4">${cards}</div>`;
  },

  filtered() {
    return this.load().filter((item) => {
      const platformMatch = this.selectedPlatform === 'All' || item.platform === this.selectedPlatform;
      const typeMatch = this.selectedType === 'All' || item.type === this.selectedType;
      const profileMatch = this.selectedProfile === 'all' || String(item.profileId || 'main') === String(this.selectedProfile);
      return platformMatch && typeMatch && profileMatch;
    });
  },

  mount() {
    const typeEl = document.getElementById('sch-type');
    if (typeEl && !typeEl.dataset.ready) {
      typeEl.innerHTML = this.contentTypes.map((t) => `<option value="${this.escape(t)}">${this.escape(t)}</option>`).join('');
      typeEl.dataset.ready = '1';
    }
    const platformEl = document.getElementById('sch-platform');
    if (platformEl) {
      platformEl.innerHTML = this.platforms.filter((p) => p !== 'All').map((p) => `<option value="${this.escape(p)}">${this.escape(p)}</option>`).join('');
    }
    const categoryEl = document.getElementById('sch-category');
    if (categoryEl && !categoryEl.dataset.ready) {
      categoryEl.innerHTML = this.contentTypes.filter((t) => t !== 'All').map((t) => `<option value="${this.escape(t)}">${this.escape(t)}</option>`).join('');
      categoryEl.dataset.ready = '1';
    }
    const statusEl = document.getElementById('sch-status');
    if (statusEl && !statusEl.dataset.ready) {
      statusEl.innerHTML = this.statuses.map((s) => `<option value="${this.escape(s)}">${this.escape(s)}</option>`).join('');
      statusEl.dataset.ready = '1';
    }
    this.syncProfileSelects();
    this.render();
  },

  syncProfileSelects() {
    const profiles = this.loadProfiles();
    const opts = `<option value="all">All profiles</option>${profiles.map((p) => `<option value="${this.escape(p.id)}">${this.escape(p.name)}</option>`).join('')}`;
    const filterEl = document.getElementById('sch-profile');
    const itemEl = document.getElementById('sch-item-profile');
    if (filterEl) {
      filterEl.innerHTML = opts;
      filterEl.value = this.selectedProfile;
      if (filterEl.value !== this.selectedProfile) {
        this.selectedProfile = 'all';
        filterEl.value = 'all';
      }
    }
    if (itemEl) {
      itemEl.innerHTML = profiles.map((p) => `<option value="${this.escape(p.id)}">${this.escape(p.name)}</option>`).join('');
    }
    const count = document.getElementById('sch-profile-count');
    if (count) count.textContent = `${profiles.length}/${this.maxProfiles}`;
    const addBtn = document.getElementById('sch-add-profile');
    if (addBtn) addBtn.classList.toggle('opacity-40', profiles.length >= this.maxProfiles);
  },

  setProfile(id) {
    this.selectedProfile = id || 'all';
    this.render();
  },

  openAddProfile() {
    if (this.loadProfiles().length >= this.maxProfiles) return;
    const modal = document.getElementById('sch-profile-modal');
    const input = document.getElementById('sch-profile-name');
    if (input) input.value = '';
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (input) input.focus();
  },

  closeAddProfile() {
    const modal = document.getElementById('sch-profile-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveProfile() {
    const name = (document.getElementById('sch-profile-name')?.value || '').trim();
    if (!name) return;
    const profiles = this.loadProfiles();
    if (profiles.length >= this.maxProfiles) return;
    const profile = { id: `p-${Date.now()}`, name };
    profiles.push(profile);
    this.persistProfiles(profiles);
    this.selectedProfile = profile.id;
    this.closeAddProfile();
    this.syncProfileSelects();
    this.render();
  },

  setView(mode) {
    this.viewMode = mode === 'list' ? 'list' : 'calendar';
    this.render();
  },

  setPlatform(platform) {
    this.selectedPlatform = platform;
    this.render();
  },

  setType(type) {
    this.selectedType = type;
    this.render();
  },

  statusClass(status) {
    return status === 'Scheduled' || status === 'Published'
      ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
      : 'bg-amber-950/60 text-amber-300 border border-amber-900/40';
  },

  renderStudio() {
    const root = document.getElementById('cs-scheduler-list');
    if (!root) return;
    const items = this.load().slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).slice(0, 5);
    if (!items.length) {
      root.innerHTML = '<p class="text-slate-500 px-1 py-2">No scheduled posts yet.</p>';
      return;
    }
    root.innerHTML = items.map((item) => `
      <button type="button" onclick="switchTab('creator-scheduler')" class="w-full flex items-center justify-between gap-2 bg-brand-black/50 border border-brand-border rounded px-2 py-1.5 text-left hover:border-brand-gold/40 transition">
        <span class="min-w-0">
          <span class="block text-[11px] font-semibold text-slate-100 truncate">${this.escape(item.title)}</span>
          <span class="block text-[9px] text-slate-500 truncate">${this.escape(item.platform || '')} · ${this.escape(item.date || '')}</span>
        </span>
        <span class="text-[8px] font-bold px-1.5 py-0.5 rounded ${this.statusClass(item.status)}">${this.escape(item.status)}</span>
      </button>
    `).join('');
  },

  render() {
    const chips = document.getElementById('sch-platforms');
    const body = document.getElementById('sch-body');
    const calBtn = document.getElementById('sch-view-calendar');
    const listBtn = document.getElementById('sch-view-list');
    if (!body) return;
    if (chips) {
      chips.innerHTML = this.platforms.map((p) => {
        const on = this.selectedPlatform === p;
        const cls = on
          ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-medium'
          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600';
        return `<button type="button" onclick="SCHEDULER.setPlatform('${this.escape(p)}')" class="text-xs px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${cls}">${this.escape(p)}</button>`;
      }).join('');
    }
    if (calBtn) {
      calBtn.className = this.viewMode === 'calendar'
        ? 'px-2.5 py-1 rounded-md transition-all bg-amber-600 text-white font-medium'
        : 'px-2.5 py-1 rounded-md transition-all text-slate-400 hover:text-white';
    }
    if (listBtn) {
      listBtn.className = this.viewMode === 'list'
        ? 'px-2.5 py-1 rounded-md transition-all bg-amber-600 text-white font-medium'
        : 'px-2.5 py-1 rounded-md transition-all text-slate-400 hover:text-white';
    }
    if (!this.platforms.includes(this.selectedPlatform)) this.selectedPlatform = 'All';
    const items = this.filtered();
    if (this.viewMode === 'list') {
      body.innerHTML = this.renderProductionList();
      return;
    }
    body.innerHTML = this.renderCalendarGrid(items);
  },

  calAnchor() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + this.calOffset);
    return d;
  },

  dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  eventsAsCal(items) {
    return (items || this.filtered()).filter((item) => item.date).map((item) => ({
      id: `sch-${item.id}`,
      title: `${item.platform}: ${item.title}`,
      date: item.date,
      startTime: item.time || '12:00',
      endTime: typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.calculateEndTime(item.time || '12:00') : item.time,
      type: 'content',
      source: 'Content Scheduler',
      tone: 'sky',
      cancelled: !!item.cancelled
    }));
  },

  prodAsCal() {
    return this.loadProd().filter((item) => item.dueDate).map((item) => ({
      id: `pcal-${item.id}`,
      title: `${item.stage}: ${item.title}`,
      date: item.dueDate,
      startTime: '09:00',
      endTime: '10:00',
      type: 'production',
      source: 'Production Calendar',
      tone: 'amber',
      cancelled: !!item.cancelled
    }));
  },

  itemsOn(dateKey, items) {
    const events = this.calKind === 'production' ? this.prodAsCal() : this.eventsAsCal(items);
    return events.filter((ev) => ev.date === dateKey);
  },

  setCalKind(kind) {
    this.calKind = kind === 'production' ? 'production' : 'posting';
    this.render();
  },

  ignoreSlot() {},

  setCalView(view) {
    this.calView = view === 'day' || view === 'month' ? view : 'week';
    this.render();
  },

  shiftCal(dir) {
    if (this.calView === 'month') {
      const d = this.calAnchor();
      d.setMonth(d.getMonth() + dir);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.calOffset = Math.round((d - today) / 86400000);
    } else if (this.calView === 'week') this.calOffset += dir * 7;
    else this.calOffset += dir;
    this.render();
  },

  goCalToday() {
    this.calOffset = 0;
    this.render();
  },

  calRangeLabel() {
    const d = this.calAnchor();
    if (this.calView === 'day') return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    if (this.calView === 'month') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const start = CALENDAR_NAV.weekStart(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  },

  openAt(date, time) {
    this.openModal({ date, time });
  },

  openDay(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.calOffset = Math.round((target - today) / 86400000);
    this.calView = 'day';
    this.render();
  },

  renderCalendarGrid(items) {
    const prod = this.calKind === 'production';
    const active = (view) => {
      if (this.calView !== view) return 'text-slate-400 hover:text-white';
      return prod ? 'bg-amber-500 text-slate-950' : 'bg-brand-gold text-slate-950';
    };
    const kindOn = (kind) => this.calKind === kind
      ? (kind === 'production' ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-brand-gold text-slate-950 font-semibold')
      : 'text-slate-400 hover:text-white';
    const chrome = prod ? 'border-amber-500/40' : 'border-slate-800';
    return `<div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border ${chrome} p-4 rounded-2xl">
        <div class="flex items-center space-x-3">
          <button type="button" onclick="SCHEDULER.shiftCal(-1)" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">◀ Prev</button>
          <button type="button" onclick="SCHEDULER.shiftCal(1)" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">Next ▶</button>
          <button type="button" onclick="SCHEDULER.goCalToday()" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">Today</button>
          <h3 class="text-sm font-bold text-white ml-2">${this.calRangeLabel()}</h3>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="bg-slate-950 border border-slate-800 p-1 rounded-xl flex space-x-1">
            <button type="button" onclick="SCHEDULER.setCalKind('production')" class="px-3 py-1.5 text-xs rounded-lg transition-all ${kindOn('production')}">Production Calendar</button>
            <button type="button" onclick="SCHEDULER.setCalKind('posting')" class="px-3 py-1.5 text-xs rounded-lg transition-all ${kindOn('posting')}">Posting Calendar</button>
          </div>
          <div class="bg-slate-950 border border-slate-800 p-1 rounded-xl flex space-x-1">
            <button type="button" onclick="SCHEDULER.setCalView('day')" class="px-3 py-1 text-xs font-semibold rounded-lg ${active('day')}">Day</button>
            <button type="button" onclick="SCHEDULER.setCalView('week')" class="px-3 py-1 text-xs font-semibold rounded-lg ${active('week')}">Week</button>
            <button type="button" onclick="SCHEDULER.setCalView('month')" class="px-3 py-1 text-xs font-semibold rounded-lg ${active('month')}">Month</button>
          </div>
        </div>
      </div>
      <div class="bg-slate-900 border ${chrome} rounded-2xl p-4 overflow-x-auto min-h-[280px]">
        ${this.calView === 'month' ? this.renderSchMonth(items) : this.calView === 'week' ? this.renderSchWeek(items) : this.renderSchDay(items)}
      </div>
    </div>`;
  },

  renderSchDay(items) {
    const dateStr = this.dateKey(this.calAnchor());
    const events = this.itemsOn(dateStr, items);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const slotFn = this.calKind === 'production' ? 'SCHEDULER.ignoreSlot' : 'SCHEDULER.openAt';
    const hint = this.calKind === 'production'
      ? 'Gold blocks are production due dates. Click a block to open the Production List.'
      : '24-hour posting grid — click an hour to schedule.';
    return `<div class="space-y-2">
      <div class="text-[10px] font-mono text-slate-500">${hint}</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        <div>${DIMAD_CAL.renderHourColumn(dateStr, hours.slice(0, 12), events, { slotFn })}</div>
        <div>${DIMAD_CAL.renderHourColumn(dateStr, hours.slice(12), events, { slotFn })}</div>
      </div>
    </div>`;
  },

  renderSchWeek(items) {
    const start = CALENDAR_NAV.weekStart(this.calAnchor());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourPx = DIMAD_CAL.HOUR_PX;
    const header = `<div class="text-[9px] font-mono text-slate-500 py-1">Time</div>${days.map((d) => `<div class="text-center text-[9px] font-mono text-slate-400 py-1">${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}</div>`).join('')}`;
    const gutter = hours.map((h) => `<div class="text-[10px] font-mono text-slate-500 border-t border-slate-800/80" style="height:${hourPx}px;line-height:${hourPx}px">${String(h).padStart(2, '0')}:00</div>`).join('');
    const dayCols = days.map((d) => {
      const key = this.dateKey(d);
      const slotFn = this.calKind === 'production' ? 'SCHEDULER.ignoreSlot' : 'SCHEDULER.openAt';
      return DIMAD_CAL.renderHourColumn(key, hours, this.itemsOn(key, items), { showGutter: false, slotFn });
    }).join('');
    return `<div class="min-w-[860px] space-y-1">
      <div class="grid gap-1" style="grid-template-columns: 42px repeat(7, minmax(0, 1fr))">${header}</div>
      <div class="grid gap-1" style="grid-template-columns: 42px repeat(7, minmax(0, 1fr))">
        <div class="select-none">${gutter}</div>
        ${dayCols}
      </div>
    </div>`;
  },

  renderSchMonth(items) {
    const cursor = this.calAnchor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const start = CALENDAR_NAV.weekStart(new Date(year, month, 1));
    const todayKey = this.dateKey(new Date());
    const weekday = CALENDAR_NAV.weekdayLabels().map((n) => `<div class="text-center text-[9px] font-mono text-slate-500 py-1">${n}</div>`).join('');
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = this.dateKey(d);
      const dayItems = this.itemsOn(key, items).slice(0, 3);
      const inMonth = d.getMonth() === month;
      const isToday = key === todayKey;
      const chipCls = this.calKind === 'production' ? 'text-amber-400' : 'text-sky-200';
      const chips = dayItems.map((ev) => `<div class="text-[8px] ${chipCls} truncate">${this.escape(ev.startTime)} ${this.escape(ev.title)}</div>`).join('') || '<div class="text-[8px] text-slate-600 italic">add</div>';
      return `<button type="button" onclick="SCHEDULER.openDay('${key}')" class="min-h-[88px] rounded-md border text-left px-1.5 py-1 ${isToday ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'} ${inMonth ? '' : 'opacity-40'}">
        <div class="text-[11px] font-semibold ${isToday ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</div>
        ${chips}
      </button>`;
    }).join('');
    return `<div class="grid grid-cols-7 gap-1">${weekday}${cells}</div>`;
  },

  openFromStudio() {
    const date = (typeof CALENDAR_NAV !== 'undefined')
      ? CALENDAR_NAV.dateKey(CALENDAR_NAV.anchorDate())
      : this.dateKey(new Date());
    this.viewMode = 'calendar';
    if (typeof switchTab === 'function') switchTab('creator-scheduler');
    window.setTimeout(() => this.openModal({ date }), 0);
  },

  openModal(prefill) {
    const modal = document.getElementById('sch-modal');
    const title = document.getElementById('sch-title');
    const platform = document.getElementById('sch-platform');
    const category = document.getElementById('sch-category');
    const brand = document.getElementById('sch-brand');
    const date = document.getElementById('sch-date');
    const time = document.getElementById('sch-time');
    const format = document.getElementById('sch-format');
    const status = document.getElementById('sch-status');
    const pre = prefill || {};
    if (title) title.value = pre.title || '';
    if (platform) platform.value = pre.platform || 'TikTok';
    if (category) category.value = pre.type || 'Owned Content';
    if (brand) brand.value = pre.brand || 'Self';
    if (date) date.value = pre.date || '';
    if (time) time.value = pre.time || '12:00';
    if (format) format.value = pre.format || 'Short Video';
    if (status) status.value = pre.status || 'Drafting';
    const itemProfile = document.getElementById('sch-item-profile');
    if (itemProfile) {
      const profiles = this.loadProfiles();
      const preferred = pre.profileId || (this.selectedProfile !== 'all' ? this.selectedProfile : profiles[0]?.id);
      if (preferred) itemProfile.value = preferred;
    }
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeModal() {
    const modal = document.getElementById('sch-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  addItem(event) {
    event.preventDefault();
    const title = (document.getElementById('sch-title')?.value || '').trim();
    if (!title) return;
    const rows = this.load();
    rows.push({
      id: Date.now(),
      title,
      platform: document.getElementById('sch-platform')?.value || 'TikTok',
      type: document.getElementById('sch-category')?.value || 'Owned Content',
      brand: (document.getElementById('sch-brand')?.value || 'Self').trim() || 'Self',
      date: document.getElementById('sch-date')?.value || '',
      time: document.getElementById('sch-time')?.value || '12:00',
      status: document.getElementById('sch-status')?.value || 'Drafting',
      format: (document.getElementById('sch-format')?.value || '').trim(),
      profileId: document.getElementById('sch-item-profile')?.value || this.loadProfiles()[0]?.id || 'main',
      repurposedTo: []
    });
    this.persist(rows);
    this.closeModal();
    this.render();
    if (typeof DIMAD_CAL !== 'undefined') DIMAD_CAL.renderFull();
    if (typeof CALENDAR_NAV !== 'undefined') CALENDAR_NAV.render();
  }
};

window.SCHEDULER = SCHEDULER;

const CONCIERGE = {
  ticketsKey: 'dimad_concierge_tickets',
  profileKey: 'dimad_concierge_profile',
  dimKey: 'dimad_concierge_dim',
  activeView: 'dashboard',
  dashboardTab: 'open',
  selectedTicketId: 'TCK-8921',
  wizardStep: 1,
  exportTicketId: '',
  chatDraft: '',
  profileMenuOpen: false,
  wizardData: {
    speedTier: 'standard',
    origin: '',
    originIata: '',
    destination: '',
    destinationIata: '',
    startDate: '',
    endDate: '',
    tripType: 'Business',
    consultationSlot: '',
    consultationSlotId: '',
    skipConsultation: false,
    requestDetails: ''
  },
  airports: [
    { iata: 'JFK', city: 'New York', name: 'John F. Kennedy International' },
    { iata: 'LHR', city: 'London', name: 'Heathrow' },
    { iata: 'CDG', city: 'Paris', name: 'Charles de Gaulle' },
    { iata: 'DXB', city: 'Dubai', name: 'Dubai International' },
    { iata: 'HND', city: 'Tokyo', name: 'Haneda' },
    { iata: 'NRT', city: 'Tokyo', name: 'Narita' },
    { iata: 'SIN', city: 'Singapore', name: 'Changi' },
    { iata: 'LAX', city: 'Los Angeles', name: 'Los Angeles International' },
    { iata: 'SFO', city: 'San Francisco', name: 'San Francisco International' },
    { iata: 'ORD', city: 'Chicago', name: "O'Hare International" },
    { iata: 'MIA', city: 'Miami', name: 'Miami International' },
    { iata: 'FRA', city: 'Frankfurt', name: 'Frankfurt am Main' },
    { iata: 'AMS', city: 'Amsterdam', name: 'Schiphol' },
    { iata: 'MAD', city: 'Madrid', name: 'Adolfo Suárez Madrid-Barajas' },
    { iata: 'BCN', city: 'Barcelona', name: 'El Prat' },
    { iata: 'LIS', city: 'Lisbon', name: 'Humberto Delgado' },
    { iata: 'SYD', city: 'Sydney', name: 'Kingsford Smith' },
    { iata: 'HKG', city: 'Hong Kong', name: 'Hong Kong International' },
    { iata: 'ICN', city: 'Seoul', name: 'Incheon International' },
    { iata: 'DOH', city: 'Doha', name: 'Hamad International' }
  ],
  statusSteps: [
    'New',
    'Agent Assigned',
    'Itinerary in Progress',
    'Itinerary for Review',
    'Itinerary Approved',
    'Booking Confirmed',
    'Closed'
  ],
  defaultProfile: {
    fullName: 'Alexander Wright',
    email: 'alexander@wrightcapital.co',
    phone: '+1 (555) 234-8901',
    ktnGlobalEntry: '982341092',
    passportNumber: 'A90182391',
    passportExpiry: '2030-08-15',
    airlineLoyalty: [
      { provider: 'United MileagePlus', number: 'UA9823019' },
      { provider: 'Delta SkyMiles', number: 'DL4819203' }
    ],
    hotelLoyalty: [
      { provider: 'Marriott Bonvoy', number: 'MB88392019' },
      { provider: 'Hyatt World of Hyatt', number: 'HY1029384' }
    ],
    preferences: {
      airlineBrands: ['United', 'Delta', 'British Airways'],
      seatPreference: 'Aisle - Forward Cabin',
      hotelBrands: ['Marriott Marquis', 'Edition', 'Park Hyatt'],
      roomPreference: 'High Floor, Away from Elevator, King Bed'
    }
  },
  seedTickets: [
    {
      id: 'TCK-8921',
      title: '1-Month Relocation Base: Lisbon & Porto',
      origin: 'New York (JFK)',
      destination: 'Lisbon (LIS)',
      dates: 'Nov 15 - Dec 15, 2026',
      type: 'Relocation',
      status: 'Itinerary for Review',
      statusStep: 3,
      assignedAgent: 'Sarah Jenkins (Lead Concierge)',
      costDIM: 5000,
      tier: 'Standard (72h)',
      createdAt: '2026-11-01',
      quoteAmountUSD: 4250,
      quoteApproved: false,
      itineraryDetails: {
        flight: 'United Airlines #UA64 (Business Class Non-stop JFK -> LIS)',
        stay: 'Lisbon Santos Loft Apartment (30 nights, high-speed fiber)',
        coworking: 'Second Home Lisboa Unlimited Pass',
        transfers: 'Private Executive Airport Transfer (Lisbon & Porto)'
      },
      messages: [
        { id: 1, sender: 'system', text: 'Ticket created. 5,000 $DIM authorization held. Your agent Sarah is assigned (Guaranteed 6h SLA).', time: 'Nov 1, 09:00 AM' },
        { id: 2, sender: 'user', text: 'Hi Sarah! Need a solid remote work setup in Santos or Chiado, plus flight outbound from JFK. Prefer United for the PQP points.', time: 'Nov 1, 09:15 AM' },
        { id: 3, sender: 'agent', text: "On it, Alexander! I've curated a 30-day stay with 500Mbps fiber wifi and secured business class space on UA64 using your 1K status for free seat upgrades.", time: 'Nov 1, 02:30 PM' },
        { id: 4, sender: 'agent', text: "Draft itinerary attached below for your review. Total execution cost: $4,250. Please click 'Approve Quote & Book' to finalize direct supplier charges.", time: 'Nov 1, 02:32 PM', isItineraryCard: true }
      ]
    },
    {
      id: 'TCK-7740',
      title: 'Executive Offsite & Investor Pitch - London',
      origin: 'Miami (MIA)',
      destination: 'London (LHR)',
      dates: 'Dec 02 - Dec 06, 2026',
      type: 'Business',
      status: 'Booking Confirmed',
      statusStep: 5,
      assignedAgent: 'Marcus Vance',
      costDIM: 7500,
      tier: 'Express 2-Day',
      createdAt: '2026-10-25',
      quoteAmountUSD: 6890,
      quoteApproved: true,
      itineraryDetails: {
        flight: 'British Airways Club World #BA208',
        stay: 'The Ned London (4 nights - Heritage Suite)',
        transfers: 'Heathrow Express First Class + Blacklane Chauffeur'
      },
      messages: [
        { id: 1, sender: 'system', text: 'Express Ticket Confirmed. Agent Marcus Vance assigned.', time: 'Oct 25, 14:00' },
        { id: 2, sender: 'agent', text: 'All bookings locked in! Your substantiation audit report and direct hotel folios are ready for export.', time: 'Oct 26, 11:15' }
      ]
    },
    {
      id: 'TCK-6102',
      title: 'Tokyo Tech Week & Co-Working Setup',
      origin: 'San Francisco (SFO)',
      destination: 'Tokyo (HND)',
      dates: 'Sep 10 - Sep 20, 2026',
      type: 'Business',
      status: 'Closed',
      statusStep: 6,
      assignedAgent: 'Sarah Jenkins',
      costDIM: 5000,
      tier: 'Standard',
      createdAt: '2026-08-30',
      quoteAmountUSD: 5120,
      quoteApproved: true,
      itineraryDetails: {
        flight: 'ANA Business Class #NH107',
        stay: 'TRUNK Hotel Yoyogi Park',
        transfers: 'Narita Express Reserved Seats'
      },
      messages: [
        { id: 1, sender: 'system', text: 'Trip marked completed. Audit package archived.', time: 'Sep 21, 2026' }
      ]
    }
  ],

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  loadTickets() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.ticketsKey) || 'null');
      if (Array.isArray(rows) && rows.length) return rows;
    } catch (err) { /* seed */ }
    const seed = JSON.parse(JSON.stringify(this.seedTickets));
    this.persistTickets(seed);
    return seed;
  },

  persistTickets(rows) {
    localStorage.setItem(this.ticketsKey, JSON.stringify(rows));
  },

  loadProfile() {
    try {
      const row = JSON.parse(localStorage.getItem(this.profileKey) || 'null');
      if (row && row.fullName) return row;
    } catch (err) { /* seed */ }
    const seed = JSON.parse(JSON.stringify(this.defaultProfile));
    this.persistProfile(seed);
    return seed;
  },

  persistProfile(row) {
    localStorage.setItem(this.profileKey, JSON.stringify(row));
  },

  loadDim() {
    const raw = localStorage.getItem(this.dimKey);
    if (raw !== null && raw !== '') {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n;
    }
    localStorage.setItem(this.dimKey, '25000');
    return 25000;
  },

  persistDim(n) {
    localStorage.setItem(this.dimKey, String(n));
  },

  currentTicket() {
    const tickets = this.loadTickets();
    return tickets.find((t) => t.id === this.selectedTicketId) || tickets[0];
  },

  feeForTier(tier) {
    let fee = 5000;
    if (tier === 'express') fee += 30000;
    if (tier === 'emergency') fee += 80000;
    return fee;
  },

  statusBadge(status) {
    const map = {
      New: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'Agent Assigned': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'Itinerary in Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      'Itinerary for Review': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 animate-pulse',
      'Itinerary Approved': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      'Booking Confirmed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      Closed: 'bg-slate-800 text-slate-400 border-slate-700'
    };
    return map[status] || 'bg-slate-800 text-slate-300';
  },

  consultSlots() {
    const pad = (n) => String(n).padStart(2, '0');
    const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const timeKey = (h, m) => `${pad(h)}:${pad(m)}`;
    const endOf = (h, m) => {
      const total = h * 60 + m + 30;
      return timeKey(Math.floor(total / 60) % 24, total % 60);
    };
    const labelOf = (d, h, m) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${pad(hr)}:${pad(m)} ${ampm} EST`;
    };
    const make = (d, h, m) => ({
      id: `${dateKey(d)}-${timeKey(h, m)}`,
      label: labelOf(d, h, m),
      date: dateKey(d),
      startTime: timeKey(h, m),
      endTime: endOf(h, m)
    });
    const t = new Date();
    const a = new Date(t);
    a.setDate(t.getDate() + 1);
    const b = new Date(t);
    b.setDate(t.getDate() + 3);
    return [make(a, 10, 0), make(a, 14, 30), make(b, 11, 0), make(b, 16, 0)];
  },

  syncConsultCalendar(slot) {
    if (typeof DIMAD_CAL === 'undefined') return;
    const rows = DIMAD_CAL.load().filter((ev) => ev.id !== 'cg-consult');
    if (slot) {
      const route = [this.wizardData.origin, this.wizardData.destination].filter(Boolean).join(' → ');
      rows.push({
        id: 'cg-consult',
        title: 'Concierge Intake Call (30 min)',
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        time: slot.startTime,
        type: 'task',
        source: 'Dimad Concierge',
        notes: route || 'Intake consultation',
        reminder: 'none',
        tone: 'amber',
        reminded: false
      });
    }
    DIMAD_CAL.persist(rows);
    if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.syncFromStore();
    DIMAD_CAL.renderFull();
    if (typeof CALENDAR_NAV !== 'undefined') CALENDAR_NAV.render();
  },

  airportLabel(airport) {
    return `${airport.city} (${airport.iata}) — ${airport.name}`;
  },

  airportIataKey(field) {
    return field === 'destination' ? 'destinationIata' : 'originIata';
  },

  matchAirports(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return this.airports.slice();
    return this.airports.filter((airport) => {
      const hay = `${airport.iata} ${airport.city} ${airport.name} ${this.airportLabel(airport)}`.toLowerCase();
      return hay.includes(q);
    });
  },

  findAirportMatch(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return null;
    return this.airports.find((airport) => {
      const iata = airport.iata.toLowerCase();
      const label = this.airportLabel(airport).toLowerCase();
      return q === iata || q === label || q === `${airport.city} (${airport.iata})`.toLowerCase();
    }) || null;
  },

  airportFieldHtml(field, label, placeholder) {
    const iataKey = this.airportIataKey(field);
    const iata = this.wizardData[iataKey] || '';
    const display = this.wizardData[field] || '';
    return `<div class="relative">
      <label class="block text-slate-400 mb-1" for="cg-${field}-search">${label}</label>
      <input type="hidden" id="cg-${field}-iata" name="${field}Iata" value="${this.escape(iata)}" data-airport-iata="${field}">
      <input id="cg-${field}-search" type="text" autocomplete="off" spellcheck="false" value="${this.escape(display)}" placeholder="${this.escape(placeholder)}" oninput="CONCIERGE.filterAirport('${field}', this.value)" onfocus="CONCIERGE.filterAirport('${field}', this.value)" onkeydown="CONCIERGE.airportKey(event,'${field}')" onblur="CONCIERGE.validateAirport('${field}')" class="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500">
      <div id="cg-${field}-list" class="hidden absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-slate-700 rounded-lg shadow-xl"></div>
    </div>`;
  },

  filterAirport(field, query) {
    const list = document.getElementById(`cg-${field}-list`);
    const hidden = document.getElementById(`cg-${field}-iata`);
    if (!list) return;
    const iataKey = this.airportIataKey(field);
    this.wizardData[field] = query;
    this.wizardData[iataKey] = '';
    if (hidden) hidden.value = '';
    const matches = this.matchAirports(query);
    if (!matches.length) {
      list.innerHTML = '<div class="px-3 py-2 text-[10px] text-slate-500">No airports match.</div>';
      list.classList.remove('hidden');
      return;
    }
    list.innerHTML = matches.map((airport) => `<button type="button" class="w-full text-left px-3 py-2 text-[11px] text-slate-200 hover:bg-brand-gold/15 hover:text-brand-gold border-b border-slate-800 last:border-0" onmousedown="event.preventDefault(); CONCIERGE.pickAirport('${field}','${airport.iata}')"><span class="font-bold text-brand-gold font-mono">${airport.iata}</span> <span class="text-slate-100">${this.escape(airport.city)}</span><span class="block text-[9px] text-slate-500">${this.escape(airport.name)}</span></button>`).join('');
    list.classList.remove('hidden');
  },

  pickAirport(field, iata) {
    const airport = this.airports.find((row) => row.iata === iata);
    if (!airport) return;
    const label = this.airportLabel(airport);
    const iataKey = this.airportIataKey(field);
    this.wizardData[field] = label;
    this.wizardData[iataKey] = airport.iata;
    const search = document.getElementById(`cg-${field}-search`);
    const hidden = document.getElementById(`cg-${field}-iata`);
    const list = document.getElementById(`cg-${field}-list`);
    if (search) search.value = label;
    if (hidden) hidden.value = airport.iata;
    if (list) {
      list.classList.add('hidden');
      list.innerHTML = '';
    }
  },

  validateAirport(field) {
    const search = document.getElementById(`cg-${field}-search`);
    const hidden = document.getElementById(`cg-${field}-iata`);
    const list = document.getElementById(`cg-${field}-list`);
    const iataKey = this.airportIataKey(field);
    const matched = this.findAirportMatch(search?.value || '') || this.airports.find((row) => row.iata === (hidden?.value || this.wizardData[iataKey]));
    const typed = String(search?.value || '').trim();
    if (matched && typed) {
      this.pickAirport(field, matched.iata);
      return;
    }
    if (search) search.value = '';
    if (hidden) hidden.value = '';
    this.wizardData[field] = '';
    this.wizardData[iataKey] = '';
    if (list) {
      list.classList.add('hidden');
      list.innerHTML = '';
    }
  },

  airportKey(event, field) {
    if (event.key === 'Escape') {
      const list = document.getElementById(`cg-${field}-list`);
      if (list) list.classList.add('hidden');
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const matches = this.matchAirports(event.target.value);
      if (matches.length === 1) this.pickAirport(field, matches[0].iata);
    }
  },

  mount() {
    this.render();
  },

  setView(view) {
    this.activeView = view;
    if (view === 'wizard') this.wizardStep = 1;
    this.render();
  },

  setDashTab(tab) {
    this.dashboardTab = tab === 'closed' ? 'closed' : 'open';
    this.render();
  },

  openChat(id) {
    if (id) this.selectedTicketId = id;
    this.activeView = 'chat';
    this.render();
  },

  openWizard() {
    this.wizardStep = 1;
    this.wizardData = {
      speedTier: 'standard',
      origin: '',
      originIata: '',
      destination: '',
      destinationIata: '',
      startDate: '',
      endDate: '',
      tripType: 'Business',
      consultationSlot: '',
      consultationSlotId: '',
      skipConsultation: false,
      requestDetails: ''
    };
    this.activeView = 'wizard';
    this.render();
  },

  setWizardStep(step) {
    this.wizardStep = step;
    this.render();
  },

  setSpeed(tier) {
    this.wizardData.speedTier = tier;
    this.render();
  },

  setTripType(type) {
    this.wizardData.tripType = type;
    this.render();
  },

  setSlot(slotId) {
    const slot = this.consultSlots().find((row) => row.id === slotId || row.label === slotId);
    if (!slot) return;
    this.wizardData.consultationSlot = slot.label;
    this.wizardData.consultationSlotId = slot.id;
    this.wizardData.skipConsultation = false;
    this.syncConsultCalendar(slot);
    this.render();
  },

  skipCall() {
    this.wizardData.skipConsultation = true;
    this.wizardData.consultationSlot = '';
    this.wizardData.consultationSlotId = '';
    this.syncConsultCalendar(null);
    this.render();
  },

  submitWizard() {
    const fee = this.feeForTier(this.wizardData.speedTier);
    const dim = this.loadDim();
    if (dim < fee) {
      alert(`Need ${fee.toLocaleString()} $DIM to authorize this ticket. Current balance: ${dim.toLocaleString()} $DIM.`);
      return;
    }
    const w = this.wizardData;
    const newId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket = {
      id: newId,
      title: `${w.tripType}: ${w.origin || 'Origin'} to ${w.destination || 'Destination'}`,
      origin: w.origin || 'Flexible Origin',
      originIata: w.originIata || '',
      destination: w.destination || 'Flexible Destination',
      destinationIata: w.destinationIata || '',
      dates: `${w.startDate || 'TBD'} - ${w.endDate || 'TBD'}`,
      type: w.tripType,
      status: 'New',
      statusStep: 0,
      assignedAgent: 'Assigning Agent (SLA: 6h)...',
      costDIM: fee,
      tier: w.speedTier === 'standard' ? 'Standard (72h)' : w.speedTier === 'express' ? 'Express 2-Day' : '24h Emergency',
      createdAt: new Date().toISOString().split('T')[0],
      quoteAmountUSD: 0,
      quoteApproved: false,
      itineraryDetails: {
        flight: 'Pending agent search...',
        stay: 'Pending agent search...',
        transfers: 'Pending agent search...'
      },
      messages: [
        {
          id: 1,
          sender: 'system',
          text: `Thank you for your ticket request. Your agent is currently being assigned and will respond as soon as they are assigned. Our guaranteed assignment time is 6 hours. (${fee.toLocaleString()} $DIM authorized).`,
          time: 'Just now'
        },
        {
          id: 2,
          sender: 'user',
          text: w.requestDetails || 'Hi, please see details in my ticket submission.',
          time: 'Just now'
        }
      ]
    };
    this.persistDim(dim - fee);
    this.persistTickets([ticket, ...this.loadTickets()]);
    this.selectedTicketId = newId;
    this.wizardStep = 5;
    this.render();
  },

  approveQuote(ticketId) {
    const rows = this.loadTickets().map((t) => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        status: 'Booking Confirmed',
        statusStep: 5,
        quoteApproved: true,
        messages: [
          ...(t.messages || []),
          {
            id: Date.now(),
            sender: 'user',
            text: `Approved quote of $${Number(t.quoteAmountUSD || 0).toLocaleString()}. Please proceed with supplier charging and ticket issuance.`,
            time: 'Just now'
          },
          {
            id: Date.now() + 1,
            sender: 'system',
            text: 'Status updated: Booking Confirmed. Direct supplier invoices and substantiation audit package generated.',
            time: 'Just now'
          }
        ]
      };
    });
    this.persistTickets(rows);
    this.render();
  },

  sendChat() {
    const input = document.getElementById('cg-chat-input');
    const text = (input?.value || this.chatDraft || '').trim();
    if (!text) return;
    const id = this.selectedTicketId;
    const rows = this.loadTickets().map((t) => {
      if (t.id !== id) return t;
      return {
        ...t,
        messages: [...(t.messages || []), { id: Date.now(), sender: 'user', text, time: 'Just now' }]
      };
    });
    this.persistTickets(rows);
    this.chatDraft = '';
    this.render();
  },

  openExport(id) {
    this.exportTicketId = id;
    this.render();
  },

  closeExport() {
    this.exportTicketId = '';
    this.render();
  },

  saveProfileFromDom() {
    const profile = this.loadProfile();
    const set = (key, id) => {
      const el = document.getElementById(id);
      if (el) profile[key] = el.value;
    };
    set('fullName', 'cg-full-name');
    set('ktnGlobalEntry', 'cg-ktn');
    set('passportNumber', 'cg-passport');
    const seat = document.getElementById('cg-seat');
    const room = document.getElementById('cg-room');
    profile.preferences = profile.preferences || {};
    if (seat) profile.preferences.seatPreference = seat.value;
    if (room) profile.preferences.roomPreference = room.value;
    this.persistProfile(profile);
    this.render();
  },

  addLoyalty(kind) {
    const provider = (document.getElementById(`cg-add-${kind}-provider`)?.value || '').trim();
    const number = (document.getElementById(`cg-add-${kind}-number`)?.value || '').trim();
    if (!provider || !number) return;
    const profile = this.loadProfile();
    const key = kind === 'hotel' ? 'hotelLoyalty' : 'airlineLoyalty';
    profile[key] = [...(profile[key] || []), { provider, number }];
    this.persistProfile(profile);
    this.render();
  },

  navClass(view) {
    return this.activeView === view
      ? 'bg-brand-gold/20 border border-brand-gold text-brand-gold font-bold'
      : 'text-slate-400 hover:text-slate-200 hover:bg-brand-black/40 border border-transparent';
  },

  toggleProfileMenu(event) {
    if (event) event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
    this.render();
  },

  openTravelerProfile() {
    this.profileMenuOpen = false;
    this.setView('profile');
  },

  openDimVault() {
    this.profileMenuOpen = false;
    if (typeof closeConciergeNav === 'function') closeConciergeNav();
    if (typeof openSettingsVaultNav === 'function') openSettingsVaultNav('dim-wallet');
  },

  render() {
    const root = document.getElementById('cg-root');
    if (!root) return;
    const profile = this.loadProfile();
    const dim = this.loadDim();
    const initials = String(profile.fullName || 'AW').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    const reviewPing = this.loadTickets().some((t) => t.status === 'Itinerary for Review');
    const wizardBtn = this.activeView === 'wizard'
      ? 'bg-brand-gold/20 border border-brand-gold text-brand-gold font-bold'
      : 'text-brand-gold hover:bg-brand-gold/10 border border-brand-gold/40';
    root.innerHTML = `<div class="h-full min-h-0 flex flex-col md:flex-row bg-brand-black">
      <aside class="w-full md:w-64 bg-brand-panel border-r border-brand-border flex flex-col justify-between p-4 shrink-0">
        <div>
          <button type="button" onclick="closeConciergeNav()" class="w-full flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold py-2.5 px-4 rounded-xl transition shadow-sm mb-4">
            <span>← Back to Dashboard</span>
          </button>
          <div class="flex items-center justify-between gap-2 px-1 py-2 mb-3 relative">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2 h-2 rounded-full bg-brand-gold animate-pulse shrink-0"></span>
              <div class="min-w-0">
                <h1 class="font-bold text-[11px] tracking-wider text-slate-100 leading-none">DIMAD<span class="text-brand-gold">OS</span></h1>
                <span class="text-[8px] font-bold tracking-wider text-slate-500 uppercase">Concierge</span>
              </div>
            </div>
            <button type="button" onclick="CONCIERGE.toggleProfileMenu(event)" class="flex items-center gap-1.5 min-w-0 max-w-[58%] rounded border border-brand-gold/40 bg-brand-black/60 hover:border-brand-gold px-1.5 py-1 transition-all">
              <div class="w-6 h-6 rounded bg-brand-black border border-brand-gold/40 flex items-center justify-center font-bold text-[8px] text-brand-gold shrink-0">${this.escape(initials)}</div>
              <span class="text-[9px] font-semibold text-slate-100 truncate">${this.escape(profile.fullName)}</span>
              <i class="fa-solid fa-chevron-down text-[8px] text-brand-gold shrink-0"></i>
            </button>
            ${this.profileMenuOpen ? `<div class="absolute right-0 top-full mt-1 z-30 w-40 bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-xl" onclick="event.stopPropagation()">
              <button type="button" onclick="CONCIERGE.openTravelerProfile()" class="w-full text-left px-3 py-2 text-[10px] text-slate-200 hover:bg-brand-gold/15 hover:text-brand-gold">Profile</button>
              <button type="button" onclick="CONCIERGE.openDimVault()" class="w-full text-left px-3 py-2 text-[10px] text-slate-200 hover:bg-brand-gold/15 hover:text-brand-gold border-t border-slate-800">$DIM Vault</button>
            </div>` : ''}
          </div>
          <div class="mb-4 p-2.5 rounded bg-brand-black/60 border border-brand-border">
            <div class="flex items-center justify-between text-[8px] text-slate-500 mb-1 uppercase tracking-wider font-bold">
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-sparkles text-brand-gold"></i> Token Balance</span>
              <span class="bg-brand-gold/15 text-brand-gold px-1.5 py-0.5 rounded text-[7px] border border-brand-gold/40">FOUNDER</span>
            </div>
            <div class="text-sm font-bold font-mono text-brand-gold flex items-baseline gap-1">
              ${dim.toLocaleString()} <span class="text-[9px] text-slate-400">$DIM</span>
            </div>
          </div>
          <nav class="space-y-1">
            <button type="button" onclick="CONCIERGE.openWizard()" class="w-full flex items-center gap-2 px-2.5 py-2 rounded text-[10px] font-bold transition-all ${this.activeView === 'wizard' ? 'bg-brand-gold text-slate-950' : 'bg-brand-gold hover:bg-amber-400 text-slate-950'}">
              <i class="fa-solid fa-circle-plus text-[10px]"></i> Create New Ticket
            </button>
            <button type="button" onclick="CONCIERGE.setView('dashboard')" class="w-full flex items-center gap-2 px-2.5 py-2 rounded text-[10px] font-semibold transition-all ${this.navClass('dashboard')}">
              <i class="fa-solid fa-file-lines text-[10px]"></i> Concierge Dashboard
            </button>
            <button type="button" onclick="CONCIERGE.setView('chat')" class="w-full flex items-center gap-2 px-2.5 py-2 rounded text-[10px] font-semibold transition-all ${this.navClass('chat')}">
              <i class="fa-solid fa-comment-dots text-[10px]"></i> Trip Chat
              ${reviewPing ? '<span class="ml-auto w-1.5 h-1.5 rounded-full bg-brand-gold animate-ping"></span>' : ''}
            </button>
            <button type="button" onclick="CONCIERGE.setView('profile')" class="w-full flex items-center gap-2 px-2.5 py-2 rounded text-[10px] font-semibold transition-all ${this.navClass('profile')}">
              <i class="fa-solid fa-user text-[10px]"></i> Traveler Profile &amp; Vault
            </button>
          </nav>
        </div>
      </aside>
      <main id="cg-main" class="flex-1 min-h-0 overflow-y-auto bg-brand-black p-3 ${this.activeView === 'chat' ? 'flex flex-col' : ''}">
        ${this.activeView === 'wizard' ? this.renderWizard() : this.activeView === 'chat' ? this.renderChat() : this.activeView === 'profile' ? this.renderProfile() : this.renderDashboard()}
      </main>
    </div>
    ${this.exportTicketId ? this.renderExport() : ''}`;
    if (this.activeView === 'chat') {
      const sc = document.getElementById('cg-chat-scroll');
      if (sc) sc.scrollTop = sc.scrollHeight;
    }
    if (this.profileMenuOpen) {
      const closeMenu = () => {
        if (!this.profileMenuOpen) return;
        this.profileMenuOpen = false;
        this.render();
      };
      setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
    }
  },

  renderDashboard() {
    const tickets = this.loadTickets();
    const dim = this.loadDim();
    const open = tickets.filter((t) => t.status !== 'Closed');
    const closed = tickets.filter((t) => t.status === 'Closed');
    const list = this.dashboardTab === 'closed' ? closed : open;
    const cards = list.map((ticket) => {
      const details = ticket.itineraryDetails || {};
      const approve = ticket.status === 'Itinerary for Review' && !ticket.quoteApproved
        ? `<button type="button" onclick="CONCIERGE.approveQuote('${ticket.id}')" class="px-2.5 py-1 rounded bg-brand-mint/20 hover:bg-brand-mint/30 text-brand-mint font-bold text-[10px] border border-brand-mint/40 transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-check"></i> 1-Click Approve Quote ($${Number(ticket.quoteAmountUSD || 0).toLocaleString()})
          </button>`
        : '';
      return `<div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-gold/30 transition-all space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[10px] font-mono font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">${this.escape(ticket.id)}</span>
            <span class="text-[9px] px-2 py-0.5 rounded font-medium border border-brand-border text-slate-300 bg-brand-black/40">${this.escape(ticket.type)}</span>
            <span class="text-[9px] px-2 py-0.5 rounded font-semibold border ${this.statusBadge(ticket.status)}">• ${this.escape(ticket.status)}</span>
          </div>
          <div class="text-[10px] text-slate-400 flex items-center gap-2">
            <span>Service Tier: <strong class="text-slate-100">${this.escape(ticket.tier)}</strong></span>
            <span>•</span>
            <span>Fee: <strong class="text-brand-gold font-mono">${Number(ticket.costDIM || 0).toLocaleString()} $DIM</strong></span>
          </div>
        </div>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-white">${this.escape(ticket.title)}</h3>
            <div class="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 mt-1">
              <span class="flex items-center gap-1"><i class="fa-solid fa-plane text-slate-500"></i> ${this.escape(ticket.origin)} ➔ ${this.escape(ticket.destination)}</span>
              <span class="flex items-center gap-1"><i class="fa-solid fa-calendar text-slate-500"></i> ${this.escape(ticket.dates)}</span>
              <span class="flex items-center gap-1"><i class="fa-solid fa-user text-slate-500"></i> Agent: ${this.escape(ticket.assignedAgent)}</span>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            ${approve}
            <button type="button" onclick="CONCIERGE.openChat('${ticket.id}')" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-200 font-semibold text-[10px] border border-slate-700 transition-all flex items-center gap-1.5">
              <i class="fa-solid fa-comment-dots text-brand-gold"></i> Trip Chat
            </button>
            <button type="button" onclick="CONCIERGE.openExport('${ticket.id}')" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-[10px] border border-slate-700 transition-all flex items-center gap-1.5">
              <i class="fa-solid fa-download"></i> Export Itinerary
            </button>
          </div>
        </div>
        <div class="p-2.5 rounded bg-brand-black/40 border border-brand-border text-[10px] grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-300">
          <div><span class="text-slate-500 block text-[8px] font-bold tracking-wider uppercase">Flight</span> ${this.escape(details.flight || '—')}</div>
          <div><span class="text-slate-500 block text-[8px] font-bold tracking-wider uppercase">Accommodation</span> ${this.escape(details.stay || '—')}</div>
          <div><span class="text-slate-500 block text-[8px] font-bold tracking-wider uppercase">Transfers / Logistics</span> ${this.escape(details.transfers || details.coworking || '—')}</div>
        </div>
      </div>`;
    }).join('') || `<div class="text-[10px] text-slate-500 py-8 text-center">No tickets in this folder.</div>`;
    const tabOn = (tab) => this.dashboardTab === tab
      ? 'border-brand-gold text-brand-gold font-semibold'
      : 'border-transparent text-slate-400 hover:text-slate-200';
    return `<div class="space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-bold text-white">Concierge Desk</h2>
            <span class="text-[9px] font-semibold text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2 py-0.5 rounded">SLA Active: Guaranteed 6h Response</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">Manage business travel, relocation logistics, and expense documentation packages.</p>
        </div>
        <button type="button" onclick="CONCIERGE.openWizard()" class="flex items-center gap-1.5 bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded text-[10px] transition-all">
          <i class="fa-solid fa-circle-plus"></i> Book New Ticket (5,000 $DIM)
        </button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-slate-500 text-[8px] font-bold tracking-wider uppercase mb-1"><span>Active Tickets</span><i class="fa-solid fa-compass text-brand-gold"></i></div>
          <div class="text-sm font-bold font-mono text-white">${open.length}</div>
        </div>
        <div class="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-slate-500 text-[8px] font-bold tracking-wider uppercase mb-1"><span>Completed Trips</span><i class="fa-solid fa-circle-check text-brand-mint"></i></div>
          <div class="text-sm font-bold font-mono text-white">${closed.length}</div>
        </div>
        <div class="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-slate-500 text-[8px] font-bold tracking-wider uppercase mb-1"><span>Token Balance</span><i class="fa-solid fa-bolt text-brand-gold"></i></div>
          <div class="text-sm font-bold font-mono text-brand-gold">${dim.toLocaleString()} <span class="text-[9px] font-normal text-slate-400">$DIM</span></div>
        </div>
        <div class="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-slate-500 text-[8px] font-bold tracking-wider uppercase mb-1"><span>Vault Preferences</span><i class="fa-solid fa-shield-halved text-brand-accent"></i></div>
          <div class="text-[10px] font-semibold text-brand-mint flex items-center gap-1 mt-1"><i class="fa-solid fa-check"></i> Airlines &amp; Hotels Linked</div>
        </div>
      </div>
      <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-800 px-4 pt-3">
          <div class="flex gap-4">
            <button type="button" onclick="CONCIERGE.setDashTab('open')" class="pb-2 text-[10px] font-semibold border-b-2 transition-all flex items-center gap-2 ${tabOn('open')}">
              Open Tickets <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-brand-black border border-brand-border text-slate-300">${open.length}</span>
            </button>
            <button type="button" onclick="CONCIERGE.setDashTab('closed')" class="pb-2 text-[10px] font-semibold border-b-2 transition-all flex items-center gap-2 ${tabOn('closed')}">
              Closed &amp; Archived <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-brand-black border border-brand-border text-slate-300">${closed.length}</span>
            </button>
          </div>
        </div>
        <div class="p-4 space-y-3">${cards}</div>
      </div>
    </div>`;
  },

  renderWizard() {
    const w = this.wizardData;
    const step = this.wizardStep;
    const fee = this.feeForTier(w.speedTier);
    const tierCard = (id, title, sub, extra, danger) => {
      const on = w.speedTier === id;
      return `<button type="button" onclick="CONCIERGE.setSpeed('${id}')" class="p-4 rounded-xl border text-left transition-all ${on ? 'bg-brand-gold/20 border-brand-gold text-white' : 'bg-brand-black/40 border-slate-800 text-slate-400 hover:border-slate-700'}">
        <div class="font-bold text-sm ${danger ? 'text-red-400' : ''}">${title}</div>
        <div class="text-xs text-slate-400">${sub}</div>
        <div class="mt-2 text-xs font-mono font-bold text-amber-400">${extra}</div>
      </button>`;
    };
    let body = '';
    if (step === 1) {
      body = `<div class="space-y-6">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2"><i class="fa-solid fa-credit-card text-amber-400"></i> Authorization &amp; Concierge Scope</h3>
          <p class="text-xs text-slate-400 mt-1">Submitting a concierge ticket authorizes the deduction of your $DIM tokens for execution.</p>
        </div>
        <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div class="flex justify-between items-center text-sm font-bold text-amber-400"><span>Standard Ticket Execution</span><span class="font-mono text-base">5,000 $DIM</span></div>
          <ul class="text-xs text-slate-300 space-y-2 list-disc list-inside">
            <li>Standard concierge chat messaging &amp; custom itinerary building</li>
            <li>1 Consultation Call (30-min optional) + 1 Final Booking Call</li>
            <li>Substantiation Audit Package (IRS tax-deductible expense documentation)</li>
            <li>Standard Turnaround: Minimum 72 hours</li>
          </ul>
        </div>
        <div class="space-y-3">
          <label class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Select Turnaround Speed</label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${tierCard('standard', 'Standard', 'Min 72h Turnaround', '+0 $DIM')}
            ${tierCard('express', 'Express <i class="fa-solid fa-bolt text-amber-400"></i>', 'Guaranteed 2-Day', '+30,000 $DIM')}
            ${tierCard('emergency', '24h Emergency <i class="fa-solid fa-triangle-exclamation"></i>', 'Immediate Priority', '+80,000 $DIM', true)}
          </div>
        </div>
        <button type="button" onclick="CONCIERGE.setWizardStep(2)" class="w-full py-3 rounded-xl bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition-all">Accept Fee &amp; Proceed to Trip Details <i class="fa-solid fa-chevron-right ml-1"></i></button>
      </div>`;
    } else if (step === 2) {
      const profile = this.loadProfile();
      const types = ['Business', 'Relocation', 'Leisure / Mixed'].map((type) => {
        const on = w.tripType === type;
        return `<button type="button" onclick="CONCIERGE.setTripType('${type.replace(/'/g, '')}')" class="p-2.5 rounded-lg text-xs font-semibold border transition-all ${on ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}">${this.escape(type)}</button>`;
      }).join('');
      body = `<div class="space-y-6">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2"><i class="fa-solid fa-plane text-amber-400"></i> Trip Parameters &amp; Loyalty Sync</h3>
          <p class="text-xs text-slate-400 mt-1">Provide your route info. Your saved loyalty numbers will be automatically attached.</p>
        </div>
        <div class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-check"></i> Syncing traveler preferences for ${this.escape(profile.fullName)}</span>
          <span class="font-mono text-[10px] text-slate-400">KTN: ${this.escape(profile.ktnGlobalEntry)}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          ${this.airportFieldHtml('origin', 'Origin City / Airport', 'Search city, airport, or IATA (JFK)')}
          ${this.airportFieldHtml('destination', 'Destination City / Airport', 'Search city, airport, or IATA (LHR)')}
          <div><label class="block text-slate-400 mb-1">Target Start Date</label><input type="date" value="${this.escape(w.startDate)}" oninput="CONCIERGE.wizardData.startDate=this.value" class="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"></div>
          <div><label class="block text-slate-400 mb-1">Target End Date</label><input type="date" value="${this.escape(w.endDate)}" oninput="CONCIERGE.wizardData.endDate=this.value" class="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"></div>
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Trip Classification</label>
          <div class="grid grid-cols-3 gap-3">${types}</div>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" onclick="CONCIERGE.setWizardStep(1)" class="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm">Back</button>
          <button type="button" onclick="CONCIERGE.setWizardStep(3)" class="w-2/3 py-3 rounded-xl bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-[10px]">Next: Schedule Consultation Call <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </div>`;
    } else if (step === 3) {
      const slots = this.consultSlots().map((slot) => {
        const on = w.consultationSlotId === slot.id && !w.skipConsultation;
        return `<button type="button" onclick="CONCIERGE.setSlot(this.dataset.slot)" data-slot="${this.escape(slot.id)}" class="p-3.5 rounded-xl text-xs font-medium border text-left transition-all ${on ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}">📅 ${this.escape(slot.label)}</button>`;
      }).join('');
      body = `<div class="space-y-6">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2"><i class="fa-solid fa-calendar text-amber-400"></i> Schedule 30-Min Intake Call</h3>
          <p class="text-xs text-slate-400 mt-1">Included with your ticket fee. Talk directly with your assigned travel strategist.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${slots}</div>
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h4 class="text-xs font-bold text-white">Prefer Async Chat Only?</h4>
            <p class="text-[11px] text-slate-400">Skip the consultation call and manage everything in your Trip Chat thread.</p>
          </div>
          <button type="button" onclick="CONCIERGE.skipCall()" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${w.skipConsultation ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}">${w.skipConsultation ? '✓ Call Skipped' : 'Skip Call'}</button>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" onclick="CONCIERGE.setWizardStep(2)" class="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm">Back</button>
          <button type="button" onclick="CONCIERGE.setWizardStep(4)" class="w-2/3 py-3 rounded-xl bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-[10px]">Next: Detailed Request <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </div>`;
    } else if (step === 4) {
      body = `<div class="space-y-6">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2"><i class="fa-solid fa-comment-dots text-amber-400"></i> Specific Requests &amp; Notes</h3>
          <p class="text-xs text-slate-400 mt-1">Detail any specific hotel preferences, preferred flight times, coworking needs, or special logistics.</p>
        </div>
        <textarea rows="5" oninput="CONCIERGE.wizardData.requestDetails=this.value" placeholder="e.g. Need a high-speed wifi apartment in Lisbon for 30 days. Prefer United business class out of JFK." class="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500">${this.escape(w.requestDetails)}</textarea>
        <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-400">
          <div class="flex justify-between"><span>Total $DIM Authorization:</span><span class="font-mono font-bold text-amber-400">${fee.toLocaleString()} $DIM</span></div>
          <div class="flex justify-between"><span>Assigned Agent SLA:</span><span class="text-emerald-400 font-semibold">Guaranteed response within 6 hours</span></div>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" onclick="CONCIERGE.setWizardStep(3)" class="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm">Back</button>
          <button type="button" onclick="CONCIERGE.submitWizard()" class="w-2/3 py-3 rounded-xl bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20">Submit Ticket &amp; Deduct $DIM <i class="fa-solid fa-sparkles"></i></button>
        </div>
      </div>`;
    } else {
      const ticket = this.currentTicket();
      body = `<div class="text-center py-8 space-y-6">
        <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
        <div class="space-y-2">
          <h3 class="text-sm font-bold text-white">Ticket Successfully Submitted</h3>
          <p class="text-xs text-slate-400 max-w-md mx-auto">Thank you for your ticket request. Your agent is currently being assigned and will respond as soon as they are assigned. Our guaranteed assignment time is 6 hours.</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-sm mx-auto text-xs text-slate-300 font-mono">Token Hold Authorized • ${(ticket?.costDIM || fee).toLocaleString()} $DIM</div>
        <button type="button" onclick="CONCIERGE.setView('chat')" class="px-6 py-3 rounded-xl bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-[10px] inline-flex items-center gap-2">Open Trip Chat <i class="fa-solid fa-chevron-right"></i></button>
      </div>`;
    }
    return `<div class="max-w-3xl mx-auto space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <button type="button" onclick="CONCIERGE.setView('dashboard')" class="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><i class="fa-solid fa-arrow-left"></i> Cancel &amp; Return to Dashboard</button>
        <span class="text-xs font-mono text-amber-400">Step ${step} of 5</span>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">${body}</div>
    </div>`;
  },

  renderChat() {
    const ticket = this.currentTicket();
    if (!ticket) return '<p class="text-sm text-slate-500">No tickets yet.</p>';
    const tickets = this.loadTickets();
    const opts = tickets.map((t) => `<option value="${this.escape(t.id)}" ${t.id === ticket.id ? 'selected' : ''}>${this.escape(t.id)} - ${this.escape(String(t.title || '').slice(0, 25))}...</option>`).join('');
    const steps = this.statusSteps.map((step, idx) => {
      const passed = idx <= ticket.statusStep;
      const current = idx === ticket.statusStep;
      return `<div class="flex items-center gap-1 shrink-0">
        <div class="w-2 h-2 rounded-full ${current ? 'bg-amber-400 ring-4 ring-amber-500/20' : passed ? 'bg-emerald-400' : 'bg-slate-700'}"></div>
        <span class="font-medium ${current ? 'text-amber-400 font-bold' : passed ? 'text-slate-300' : 'text-slate-600'}">${this.escape(step)}</span>
        ${idx < this.statusSteps.length - 1 ? '<span class="text-slate-800 mx-1">›</span>' : ''}
      </div>`;
    }).join('');
    const approveTop = ticket.status === 'Itinerary for Review' && !ticket.quoteApproved
      ? `<button type="button" onclick="CONCIERGE.approveQuote('${ticket.id}')" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1"><i class="fa-solid fa-check"></i> Approve Quote ($${Number(ticket.quoteAmountUSD || 0).toLocaleString()})</button>`
      : '';
    const msgs = (ticket.messages || []).map((msg) => {
      if (msg.sender === 'system') {
        return `<div class="w-full my-2 text-center"><span class="inline-block px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-mono">⚙️ ${this.escape(msg.text)}</span></div>`;
      }
      const itinerary = msg.isItineraryCard && ticket.itineraryDetails
        ? `<div class="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 space-y-3">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2">
              <span class="font-bold text-amber-400 text-xs"><i class="fa-solid fa-file-lines"></i> Proposed Execution Package</span>
              <span class="font-mono font-bold text-white text-sm">$${Number(ticket.quoteAmountUSD || 0).toLocaleString()} USD</span>
            </div>
            <div class="space-y-1.5 text-[11px]">
              <p>✈️ <strong>Flight:</strong> ${this.escape(ticket.itineraryDetails.flight)}</p>
              <p>🏨 <strong>Stay:</strong> ${this.escape(ticket.itineraryDetails.stay)}</p>
              <p>💼 <strong>Logistics:</strong> ${this.escape(ticket.itineraryDetails.transfers)}</p>
            </div>
            ${ticket.quoteApproved
              ? '<div class="text-center p-2 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-xs border border-emerald-500/30">✓ Approved &amp; Processing</div>'
              : `<button type="button" onclick="CONCIERGE.approveQuote('${ticket.id}')" class="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs">Approve Quote &amp; Issue Tickets ($${Number(ticket.quoteAmountUSD || 0).toLocaleString()})</button>`}
          </div>`
        : '';
      const user = msg.sender === 'user';
      return `<div class="flex flex-col ${user ? 'items-end' : 'items-start'}">
        <div class="max-w-xl rounded-2xl p-3 text-[11px] space-y-2 ${user ? 'bg-brand-gold text-slate-950 rounded-br-none font-medium' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'}">
          <div class="flex justify-between items-center text-[10px] opacity-70 gap-4 mb-1">
            <span class="font-bold uppercase tracking-wider">${user ? 'You' : this.escape(ticket.assignedAgent)}</span>
            <span>${this.escape(msg.time)}</span>
          </div>
          <p class="leading-relaxed whitespace-pre-wrap">${this.escape(msg.text)}</p>
          ${itinerary}
        </div>
      </div>`;
    }).join('');
    return `<div class="max-w-5xl mx-auto flex flex-col h-full min-h-0">
      <div class="bg-slate-900 p-4 rounded-t-2xl border border-slate-800 space-y-4 shrink-0">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">${this.escape(ticket.id)}</span>
              <h3 class="text-base font-bold text-white">${this.escape(ticket.title)}</h3>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">Assigned Agent: <strong class="text-white">${this.escape(ticket.assignedAgent)}</strong></p>
          </div>
          <div class="flex items-center gap-2">
            ${approveTop}
            <select onchange="CONCIERGE.openChat(this.value)" class="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-lg p-2 focus:outline-none">${opts}</select>
          </div>
        </div>
        <div class="pt-2 border-t border-slate-800">
          <div class="flex justify-between items-center overflow-x-auto pb-1 text-[10px]">${steps}</div>
        </div>
      </div>
      <div id="cg-chat-scroll" class="flex-1 min-h-0 bg-slate-950/90 border-x border-slate-800 p-4 md:p-6 overflow-y-auto space-y-4">${msgs}</div>
      <div class="bg-slate-900 p-4 rounded-b-2xl border border-slate-800 flex items-center gap-3 shrink-0">
        <button type="button" class="text-slate-500 hover:text-amber-400 p-2 rounded-lg hover:bg-slate-800"><i class="fa-solid fa-paperclip"></i></button>
        <input id="cg-chat-input" type="text" placeholder="Type your message or request details..." value="${this.escape(this.chatDraft)}" oninput="CONCIERGE.chatDraft=this.value" onkeydown="if(event.key==='Enter')CONCIERGE.sendChat()" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500">
        <button type="button" onclick="CONCIERGE.sendChat()" class="bg-brand-gold hover:bg-amber-400 text-slate-950 p-2 rounded font-bold"><i class="fa-solid fa-paper-plane text-[10px]"></i></button>
      </div>
    </div>`;
  },

  renderProfile() {
    const p = this.loadProfile();
    const airlines = (p.airlineLoyalty || []).map((air) => `<div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
      <div class="font-bold text-white">${this.escape(air.provider)}</div>
      <div class="font-mono text-slate-400">${this.escape(air.number)}</div>
    </div>`).join('');
    const hotels = (p.hotelLoyalty || []).map((hotel) => `<div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
      <div class="font-bold text-white">${this.escape(hotel.provider)}</div>
      <div class="font-mono text-slate-400">${this.escape(hotel.number)}</div>
    </div>`).join('');
    const addRow = (kind) => `<div class="grid grid-cols-[1fr_1fr_auto] gap-2">
      <input id="cg-add-${kind}-provider" placeholder="Program" class="p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px]">
      <input id="cg-add-${kind}-number" placeholder="#" class="p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] font-mono">
      <button type="button" onclick="CONCIERGE.addLoyalty('${kind}')" class="px-2 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-bold">Add</button>
    </div>`;
    return `<div class="max-w-4xl mx-auto space-y-6">
      <div class="pb-4 border-b border-slate-800 flex justify-between items-center gap-3">
        <div>
          <h2 class="text-sm font-bold text-white flex items-center gap-2"><i class="fa-solid fa-shield-halved text-brand-gold"></i> Traveler Profile &amp; Loyalty Vault</h2>
          <p class="text-xs text-slate-400">Save frequent flyer numbers, TSA/KTN credentials, and hotel preferences for 1-click booking execution.</p>
        </div>
        <button type="button" onclick="CONCIERGE.saveProfileFromDom()" class="px-3 py-1.5 rounded bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0">Save Vault Updates</button>
      </div>
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 class="text-sm font-bold text-amber-400 uppercase tracking-wider">Government ID &amp; Security Clearance</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div><label class="block text-slate-400 mb-1">Full Legal Name (Passport)</label><input id="cg-full-name" type="text" value="${this.escape(p.fullName)}" class="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"></div>
          <div><label class="block text-slate-400 mb-1">Known Traveler # (KTN / Global Entry)</label><input id="cg-ktn" type="text" value="${this.escape(p.ktnGlobalEntry)}" class="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"></div>
          <div><label class="block text-slate-400 mb-1">Passport Number</label><input id="cg-passport" type="text" value="${this.escape(p.passportNumber)}" class="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 class="text-sm font-bold text-amber-400 uppercase tracking-wider"><i class="fa-solid fa-plane"></i> Airline Frequent Flyer Accounts</h3>
          <div class="space-y-3">${airlines}</div>
          ${addRow('air')}
        </div>
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 class="text-sm font-bold text-amber-400 uppercase tracking-wider"><i class="fa-solid fa-building"></i> Hotel Rewards Programs</h3>
          <div class="space-y-3">${hotels}</div>
          ${addRow('hotel')}
        </div>
      </div>
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
        <h3 class="text-sm font-bold text-amber-400 uppercase tracking-wider">Default Concierge Booking Directives</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label class="block text-slate-400 mb-1">Flight Seat Preference</label><input id="cg-seat" type="text" value="${this.escape(p.preferences?.seatPreference || '')}" class="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"></div>
          <div><label class="block text-slate-400 mb-1">Hotel Room Preferences</label><input id="cg-room" type="text" value="${this.escape(p.preferences?.roomPreference || '')}" class="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"></div>
        </div>
      </div>
    </div>`;
  },

  renderExport() {
    const ticket = this.loadTickets().find((t) => t.id === this.exportTicketId);
    if (!ticket) return '';
    const profile = this.loadProfile();
    const details = ticket.itineraryDetails || {};
    return `<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4" onclick="if(event.target===this)CONCIERGE.closeExport()">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
        <button type="button" onclick="CONCIERGE.closeExport()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        <div class="border-b border-slate-800 pb-4">
          <span class="text-xs font-mono text-amber-400">Dimad Concierge Export Package</span>
          <h3 class="text-sm font-bold text-white">${this.escape(ticket.title)}</h3>
          <p class="text-xs text-slate-400 mt-1">Substantiation Audit Package (IRS IRC §274(d) Compliant)</p>
        </div>
        <div class="space-y-4 text-xs text-slate-300">
          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div class="flex justify-between font-bold text-white"><span>Ticket Reference: ${this.escape(ticket.id)}</span><span class="text-amber-400 font-mono">$${Number(ticket.quoteAmountUSD || 0).toLocaleString()} USD</span></div>
            <div><strong>Passenger:</strong> ${this.escape(profile.fullName)} (${this.escape(profile.email)})</div>
            <div><strong>Business Purpose:</strong> Executive Business &amp; Remote Base Execution</div>
            <div><strong>Tax Home / Destination:</strong> ${this.escape(ticket.origin)} ➔ ${this.escape(ticket.destination)}</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div class="font-bold text-white border-b border-slate-800 pb-1">Itemized Expense Folio</div>
            <ul class="space-y-1 text-slate-400 list-disc list-inside">
              <li>Air Transportation: ${this.escape(details.flight)}</li>
              <li>Lodging / Apartment: ${this.escape(details.stay)}</li>
              <li>Logistics &amp; Coworking: ${this.escape(details.transfers)}</li>
            </ul>
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" onclick="CONCIERGE.closeExport()" class="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"><i class="fa-solid fa-download text-amber-400"></i> Download IRS Audit Package (PDF)</button>
          <button type="button" onclick="CONCIERGE.closeExport()" class="w-1/2 py-2 rounded bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-[10px]"><i class="fa-solid fa-envelope"></i> Email Package to Accountant</button>
        </div>
      </div>
    </div>`;
  }
};

window.CONCIERGE = CONCIERGE;

const MEDIA_VAULT = {
  storageKey: 'dimad_media_vault',
  category: 'all',
  search: '',
  tag: '',
  hoverId: '',
  convertId: '',
  convertFmt: 0,
  convertPreset: 0,
  showKit: false,
  toast: '',
  toastTimer: null,
  formats: ['WEBP', 'PNG', 'JPG', 'SVG'],
  popularTags: ['#BrandKit', '#SponsorKit', '#B-Roll', '#SocialTemplates', '#PressKit'],
  foldersKey: 'dimad_media_vault_folders',
  maxFolders: 16,
  renamingId: '',
  creatingFolder: false,
  ctxFolderId: '',
  ctxX: 0,
  ctxY: 0,
  defaultFolders: [
    { id: 'brand', label: 'Brand Kit & Identity', icon: 'fa-palette' },
    { id: 'content', label: 'Content & B-Roll Library', icon: 'fa-clapperboard' },
    { id: 'press', label: 'Creator Press & Sponsor Kit', icon: 'fa-award' },
    { id: 'templates', label: 'Campaign Templates', icon: 'fa-layer-group' }
  ],
  seed: [
    { id: 'ast-001', title: 'Dimad Primary Brand Mark', category: 'brand', type: 'SVG', size: '142 KB', dimensions: 'Vector (Scalable)', tags: ['#BrandKit', '#Logo', '#Vector'], thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', url: 'https://cdn.dimad.os/assets/dimad-logo-primary.svg', dateAdded: '2026-10-12', downloads: 342 },
    { id: 'ast-002', title: 'Amber Brand Color Swatch', category: 'brand', type: 'COLOR', size: 'N/A', dimensions: 'HEX / RGB', tags: ['#BrandKit', '#Color', '#Primary'], hex: '#F59E0B', rgb: 'rgb(245, 158, 11)', dateAdded: '2026-10-01', downloads: 1204, isColorSwatch: true },
    { id: 'ast-003', title: 'Lisbon Co-Working Aerial B-Roll', category: 'content', type: 'MP4', size: '184 MB', dimensions: '3840 x 2160 (4K 60fps)', duration: '0:24', tags: ['#B-Roll', '#Video', '#Lisbon', '#NomadLife'], thumbnail: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=600&q=80', videoPreviewUrl: 'https://assets.mixkit.co/videos/preview/mixkit-working-on-a-laptop-in-a-cafe-4330-large.mp4', url: 'https://cdn.dimad.os/broll/lisbon-cowork-4k.mp4', dateAdded: '2026-11-02', downloads: 89 },
    { id: 'ast-004', title: '4K Creator Studio Headshot (Transparent)', category: 'press', type: 'PNG', size: '14.2 MB', dimensions: '4000 x 6000 px', tags: ['#PressKit', '#Headshot', '#SponsorKit'], thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', url: 'https://cdn.dimad.os/press/alexander-headshot-transparent.png', dateAdded: '2026-09-15', downloads: 215 },
    { id: 'ast-005', title: '2026 Q4 Creator Media Kit & Rate Card', category: 'press', type: 'PDF', size: '4.8 MB', dimensions: '12 Pages (Interactive)', tags: ['#SponsorKit', '#RateCard', '#Analytics'], thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80', url: 'https://cdn.dimad.os/docs/dimad-media-kit-2026.pdf', dateAdded: '2026-10-28', downloads: 512 },
    { id: 'ast-006', title: 'YouTube Thumbnail Starter Template', category: 'templates', type: 'PSD', size: '68 MB', dimensions: '1920 x 1080 (16:9)', tags: ['#SocialTemplates', '#YouTube', '#Thumbnails'], thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=600&q=80', url: 'https://cdn.dimad.os/templates/yt-thumb-master.psd', dateAdded: '2026-10-05', downloads: 630 },
    { id: 'ast-007', title: 'Substack Newsletter Banner Pack', category: 'templates', type: 'CANVA', size: 'Cloud Link', dimensions: '1200 x 630 px', tags: ['#SocialTemplates', '#Substack', '#Newsletter'], thumbnail: 'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&w=600&q=80', url: 'https://canva.com/design/dimad-newsletter-templates', dateAdded: '2026-10-20', downloads: 180 },
    { id: 'ast-008', title: 'Lo-Fi Podcast Stinger Audio Logo', category: 'content', type: 'WAV', size: '12 MB', dimensions: '24-bit 48kHz', duration: '0:06', tags: ['#Audio', '#Stinger', '#Podcast'], thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80', url: 'https://cdn.dimad.os/audio/audio-logo-amber.wav', dateAdded: '2026-09-01', downloads: 94 }
  ],

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  load() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (Array.isArray(rows) && rows.length) return rows;
    } catch (err) { /* seed */ }
    const seed = JSON.parse(JSON.stringify(this.seed));
    this.persist(seed);
    return seed;
  },

  persist(rows) {
    localStorage.setItem(this.storageKey, JSON.stringify(rows));
  },

  loadFolders() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.foldersKey) || 'null');
      if (Array.isArray(rows) && rows.length) return rows;
    } catch (err) { /* seed */ }
    const seed = JSON.parse(JSON.stringify(this.defaultFolders));
    this.persistFolders(seed);
    return seed;
  },

  persistFolders(rows) {
    localStorage.setItem(this.foldersKey, JSON.stringify(rows));
  },

  openFolderCtx(event, id) {
    event.preventDefault();
    event.stopPropagation();
    this.ctxFolderId = id;
    this.ctxX = event.clientX;
    this.ctxY = event.clientY;
    this.creatingFolder = false;
    this.render();
  },

  closeFolderCtx() {
    if (!this.ctxFolderId) return;
    this.ctxFolderId = '';
    this.render();
  },

  startRenameFolder(id) {
    this.renamingId = id || this.ctxFolderId;
    this.ctxFolderId = '';
    this.creatingFolder = false;
    this.render();
  },

  commitRenameFolder() {
    const input = document.getElementById('mv-folder-rename');
    const name = (input?.value || '').trim();
    const id = this.renamingId;
    this.renamingId = '';
    if (!id || !name) {
      this.render();
      return;
    }
    const rows = this.loadFolders().map((f) => (f.id === id ? { ...f, label: name } : f));
    this.persistFolders(rows);
    this.render();
  },

  deleteFolder(id) {
    const target = id || this.ctxFolderId;
    this.ctxFolderId = '';
    const folder = this.loadFolders().find((f) => f.id === target);
    if (!folder) return;
    if (!confirm(`Delete folder "${folder.label}"? Assets stay in All Brand Assets.`)) {
      this.render();
      return;
    }
    this.persistFolders(this.loadFolders().filter((f) => f.id !== target));
    if (this.category === target) this.category = 'all';
    this.render();
  },

  startNewFolder() {
    if (this.loadFolders().length >= this.maxFolders) {
      this.showToast(`Folder limit reached (${this.maxFolders}).`);
      return;
    }
    this.creatingFolder = true;
    this.ctxFolderId = '';
    this.renamingId = '';
    this.render();
  },

  commitNewFolder() {
    const input = document.getElementById('mv-folder-new');
    const name = (input?.value || '').trim();
    this.creatingFolder = false;
    if (!name) {
      this.render();
      return;
    }
    const rows = this.loadFolders();
    if (rows.length >= this.maxFolders) {
      this.showToast(`Folder limit reached (${this.maxFolders}).`);
      this.render();
      return;
    }
    const id = `fld-${Date.now()}`;
    rows.push({ id, label: name, icon: 'fa-folder' });
    this.persistFolders(rows);
    this.category = id;
    this.render();
  },

  mount() {
    this.render();
  },

  filtered() {
    const q = this.search.trim().toLowerCase();
    return this.load().filter((item) => {
      const cat = this.category === 'all' || item.category === this.category;
      const search = !q || item.title.toLowerCase().includes(q) || (item.tags || []).some((t) => t.toLowerCase().includes(q));
      const tag = !this.tag || (item.tags || []).includes(this.tag);
      return cat && search && tag;
    });
  },

  setCat(id) {
    this.category = id;
    this.tag = '';
    this.render();
  },

  setTag(tag) {
    this.tag = this.tag === tag ? '' : tag;
    this.render();
  },

  setSearch(value) {
    this.search = value;
    this.render();
  },

  clearFilters() {
    this.category = 'all';
    this.tag = '';
    this.search = '';
    this.render();
  },

  showToast(msg) {
    this.toast = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.render();
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.render();
    }, 3000);
  },

  copy(text, label) {
    const value = String(text || '');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value);
    else {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    this.showToast(`Copied ${label} to clipboard!`);
  },

  openConvert(id) {
    this.convertId = id;
    this.convertFmt = 0;
    this.convertPreset = 0;
    this.render();
  },

  closeConvert() {
    this.convertId = '';
    this.render();
  },

  setFmt(i) {
    this.convertFmt = i;
    this.render();
  },

  setPreset(i) {
    this.convertPreset = i;
    this.render();
  },

  runConvert() {
    const asset = this.load().find((a) => a.id === this.convertId);
    const fmt = this.formats[this.convertFmt] || 'WEBP';
    this.convertId = '';
    this.showToast(`Converted & downloaded ${asset ? asset.title : 'asset'} as ${fmt}`);
  },

  attach(title) {
    this.showToast(`Attached "${title}" to active WriteSpace document.`);
  },

  upload() {
    this.showToast('Upload modal opened. Drop files or connect Google Drive.');
  },

  catClass(id) {
    return this.category === id
      ? 'bg-brand-gold/20 border border-brand-gold text-brand-gold font-bold'
      : 'text-slate-400 hover:text-slate-200 hover:bg-brand-black/40 border border-transparent';
  },

  render() {
    const root = document.getElementById('mv-root');
    if (!root) return;
    const assets = this.load();
    const rows = this.filtered();
    const allBtn = `<button type="button" onclick="MEDIA_VAULT.setCat('all')" class="w-full flex items-center justify-between px-2.5 py-2 rounded text-[10px] font-semibold transition-all ${this.catClass('all')}">
        <span class="flex items-center gap-2"><i class="fa-solid fa-border-all text-[10px]"></i> All Brand Assets</span>
        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-black border border-brand-border text-slate-400">${assets.length}</span>
      </button>`;
    const folderBtns = this.loadFolders().map((c) => {
      const n = assets.filter((a) => a.category === c.id).length;
      if (this.renamingId === c.id) {
        return `<div class="flex items-center gap-1 px-1" onclick="event.stopPropagation()">
          <input id="mv-folder-rename" type="text" value="${this.escape(c.label)}" class="flex-1 min-w-0 bg-slate-950 border border-brand-gold/50 rounded px-1.5 py-1 text-[10px] text-slate-100" onkeydown="if(event.key==='Enter'){event.preventDefault();MEDIA_VAULT.commitRenameFolder();}if(event.key==='Escape'){MEDIA_VAULT.renamingId='';MEDIA_VAULT.render();}">
          <button type="button" onclick="MEDIA_VAULT.commitRenameFolder()" class="w-6 h-6 rounded bg-brand-gold text-slate-950 shrink-0" title="Save"><i class="fa-solid fa-check text-[10px]"></i></button>
        </div>`;
      }
      return `<button type="button" oncontextmenu="MEDIA_VAULT.openFolderCtx(event,'${c.id}')" onclick="MEDIA_VAULT.setCat('${c.id}')" class="w-full flex items-center justify-between px-2.5 py-2 rounded text-[10px] font-semibold transition-all ${this.catClass(c.id)}">
        <span class="flex items-center gap-2 min-w-0"><i class="fa-solid ${this.escape(c.icon || 'fa-folder')} text-[10px] shrink-0"></i> <span class="truncate">${this.escape(c.label)}</span></span>
        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-black border border-brand-border text-slate-400 shrink-0">${n}</span>
      </button>`;
    }).join('');
    const createRow = this.creatingFolder
      ? `<div class="flex items-center gap-1 px-1 pt-1" onclick="event.stopPropagation()">
          <input id="mv-folder-new" type="text" placeholder="Folder name" class="flex-1 min-w-0 bg-slate-950 border border-brand-gold/50 rounded px-1.5 py-1 text-[10px] text-slate-100" onkeydown="if(event.key==='Enter'){event.preventDefault();MEDIA_VAULT.commitNewFolder();}if(event.key==='Escape'){MEDIA_VAULT.creatingFolder=false;MEDIA_VAULT.render();}">
          <button type="button" onclick="MEDIA_VAULT.commitNewFolder()" class="w-6 h-6 rounded bg-brand-gold text-slate-950 shrink-0" title="Save"><i class="fa-solid fa-check text-[10px]"></i></button>
        </div>`
      : `<button type="button" onclick="MEDIA_VAULT.startNewFolder()" class="w-full text-left px-2.5 py-2 rounded text-[10px] font-bold text-brand-gold hover:bg-brand-gold/10 border border-dashed border-brand-gold/30">+ Create new folder</button>`;
    const catBtns = `${allBtn}${folderBtns}${createRow}`;
    const ctxMenu = this.ctxFolderId
      ? `<div class="fixed z-[430] min-w-[120px] bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-xl text-[10px]" style="left:${this.ctxX}px;top:${this.ctxY}px" onclick="event.stopPropagation()">
          <button type="button" onclick="MEDIA_VAULT.startRenameFolder('${this.ctxFolderId}')" class="w-full text-left px-3 py-2 text-slate-200 hover:bg-brand-gold/15 hover:text-brand-gold">Edit</button>
          <button type="button" onclick="MEDIA_VAULT.deleteFolder('${this.ctxFolderId}')" class="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 border-t border-slate-800">Delete</button>
        </div>` : '';
    const tags = this.popularTags.map((tag) => {
      const on = this.tag === tag;
      return `<button type="button" onclick="MEDIA_VAULT.setTag('${tag}')" class="text-[9px] font-mono px-2 py-0.5 rounded border ${on ? 'bg-brand-gold text-slate-950 border-brand-gold font-bold' : 'bg-brand-black/60 text-slate-400 border-brand-border hover:text-white'}">${tag}</button>`;
    }).join('');
    const pills = (this.tag || this.category !== 'all' || this.search)
      ? `<div class="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span>Active Filters:</span>
          ${this.category !== 'all' ? `<span class="bg-slate-900 text-brand-gold px-2 py-0.5 rounded font-mono text-[9px] border border-slate-800">Category: ${this.escape(this.category)}</span>` : ''}
          ${this.tag ? `<span class="bg-brand-gold/15 text-brand-gold border border-brand-gold/40 px-2 py-0.5 rounded font-mono text-[9px]">${this.escape(this.tag)} <button type="button" onclick="MEDIA_VAULT.setTag('${this.escape(this.tag)}')">✕</button></span>` : ''}
          ${this.search ? `<span class="bg-slate-900 text-slate-200 px-2 py-0.5 rounded text-[9px] border border-slate-800">"${this.escape(this.search)}"</span>` : ''}
          <button type="button" onclick="MEDIA_VAULT.clearFilters()" class="text-[9px] text-brand-gold hover:underline">Reset All Filters</button>
        </div>` : '';
    const cards = rows.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">${rows.map((a) => this.cardHtml(a)).join('')}</div>`
      : `<div class="text-center py-16 space-y-2 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <i class="fa-solid fa-file-circle-xmark text-slate-600 text-lg"></i>
          <p class="text-[10px] font-semibold text-slate-400">No media assets found matching your criteria.</p>
          <button type="button" onclick="MEDIA_VAULT.clearFilters()" class="text-[10px] text-brand-gold font-bold hover:underline">Clear filters &amp; view all assets</button>
        </div>`;
    root.innerHTML = `<div class="h-full min-h-0 flex bg-brand-black">
      <aside class="w-48 shrink-0 bg-brand-panel border-r border-brand-border flex flex-col justify-between hidden md:flex">
        <div>
          <div class="px-3 py-2 border-b border-brand-border">
            <span class="text-[8px] font-bold text-slate-500 tracking-wider uppercase">Vault Views</span>
          </div>
          <div class="p-2 space-y-1">${catBtns}</div>
          <p class="px-3 pb-1 text-[8px] text-slate-600">Right-click a folder to edit or delete.</p>
          <div class="p-3 border-t border-brand-border">
            <div class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-2">Popular Tags</div>
            <div class="flex flex-wrap gap-1">${tags}</div>
          </div>
        </div>
        <div class="p-3 border-t border-brand-border">
          <div class="flex justify-between items-center text-[9px] text-slate-400 mb-1">
            <span>Vault Storage</span>
            <span class="font-mono text-brand-gold font-bold">2.4 GB / 20 GB</span>
          </div>
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div class="h-full bg-brand-gold w-[12%]"></div></div>
          <p class="text-[8px] text-slate-500 mt-1.5">dimDrive Cloud Storage Active</p>
        </div>
      </aside>
      <main id="mv-main" class="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div class="bg-brand-panel border-b border-brand-border px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2 text-[10px]">
            <span class="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><i class="fa-solid fa-bolt text-brand-gold"></i> Quick Brand Copy</span>
            ${this.swatchBtn('#F59E0B', 'Primary Amber Hex')}
            ${this.swatchBtn('#1E293B', 'Dark Slate Hex')}
            ${this.swatchBtn('#0F172A', 'Charcoal Hex')}
            <button type="button" onclick="MEDIA_VAULT.copy('JetBrains Mono','Font Stack')" class="hidden lg:flex items-center gap-1 text-slate-400 hover:text-white border-l border-slate-800 pl-3"><i class="fa-solid fa-font text-brand-gold"></i> JetBrains Mono</button>
            <button type="button" onclick="MEDIA_VAULT.copy('Building tools for the modern sovereign founder & creator.','Brand Tagline')" class="hidden lg:flex items-center gap-1 text-slate-400 hover:text-white truncate max-w-[180px]"><i class="fa-solid fa-quote-left text-brand-gold"></i> Building tools for...</button>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="MEDIA_VAULT.showKit=true;MEDIA_VAULT.render()" class="bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-2.5 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-share-nodes"></i> Live Sponsor Media Kit</button>
            <button type="button" onclick="MEDIA_VAULT.upload()" class="bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded text-[10px]"><i class="fa-solid fa-cloud-arrow-up"></i> Upload Asset</button>
          </div>
        </div>
        <div class="p-3 space-y-3">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold text-white">Asset Vault</h2>
                <span class="text-[9px] font-semibold text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2 py-0.5 rounded">Production Ready</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Centralized brand collateral, media kits, video B-roll, and campaign assets.</p>
            </div>
            <div class="relative w-full md:w-72">
              <i class="fa-solid fa-magnifying-glass text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]"></i>
              <input id="mv-search" type="text" value="${this.escape(this.search)}" oninput="MEDIA_VAULT.search=this.value;MEDIA_VAULT._searchCaret=this.selectionStart;MEDIA_VAULT.render()" placeholder="Search by name, type, or #tag..." class="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-7 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500">
              ${this.search ? `<button type="button" onclick="MEDIA_VAULT.setSearch('')" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-[10px]">✕</button>` : ''}
            </div>
          </div>
          ${pills}
          ${cards}
        </div>
      </main>
    </div>
    ${this.convertId ? this.convertHtml() : ''}
    ${this.showKit ? this.kitHtml() : ''}
    ${ctxMenu}
    ${this.toast ? `<div class="fixed bottom-6 right-6 z-[420] flex items-center gap-2 bg-brand-gold text-slate-950 px-3 py-2 rounded-xl font-bold text-[10px] shadow-lg">${this.escape(this.toast)}</div>` : ''}`;
    const rename = document.getElementById('mv-folder-rename');
    if (rename) {
      rename.focus();
      rename.select();
    }
    const neu = document.getElementById('mv-folder-new');
    if (neu) neu.focus();
    const search = document.getElementById('mv-search');
    if (search && typeof this._searchCaret === 'number' && !rename && !neu) {
      search.focus();
      const caret = Math.min(this._searchCaret, search.value.length);
      search.setSelectionRange(caret, caret);
    }
    if (this.ctxFolderId) {
      setTimeout(() => document.addEventListener('click', () => MEDIA_VAULT.closeFolderCtx(), { once: true }), 0);
    }
  },

  swatchBtn(hex, label) {
    return `<button type="button" onclick="MEDIA_VAULT.copy('${hex}','${label}')" class="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800 hover:border-brand-gold/50 text-[10px] font-mono text-slate-300">
      <span class="w-2.5 h-2.5 rounded-full border border-slate-700" style="background:${hex}"></span>${hex}
    </button>`;
  },

  cardHtml(asset) {
    const tags = (asset.tags || []).map((t) => `<span class="text-[8px] font-mono px-1.5 py-0.5 rounded bg-brand-black text-slate-400 border border-slate-800">${this.escape(t)}</span>`).join('');
    let media;
    if (asset.isColorSwatch) {
      media = `<button type="button" onclick="MEDIA_VAULT.copy('${this.escape(asset.hex)}','Color Swatch ${this.escape(asset.hex)}')" class="h-36 w-full relative p-3 flex flex-col justify-end text-left" style="background:${this.escape(asset.hex)}">
        <div class="bg-brand-black/80 p-2 rounded border border-white/10 w-fit">
          <p class="text-[10px] font-mono font-bold text-white">${this.escape(asset.hex)}</p>
          <p class="text-[8px] text-slate-400 font-mono">${this.escape(asset.rgb)}</p>
        </div>
      </button>`;
    } else {
      const preview = asset.type === 'MP4' && this.hoverId === asset.id && asset.videoPreviewUrl
        ? `<video src="${this.escape(asset.videoPreviewUrl)}" autoplay loop muted playsinline class="w-full h-full object-cover"></video>`
        : `<img src="${this.escape(asset.thumbnail)}" alt="" class="w-full h-full object-cover">`;
      media = `<div class="h-36 w-full bg-slate-950 relative overflow-hidden group" onmouseenter="MEDIA_VAULT.hoverId='${asset.id}';MEDIA_VAULT.render()" onmouseleave="MEDIA_VAULT.hoverId='';MEDIA_VAULT.render()">
        ${preview}
        <div class="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all p-2 flex flex-col justify-between">
          <div class="flex justify-end gap-1">
            <button type="button" onclick="event.stopPropagation();MEDIA_VAULT.copy('${this.escape(asset.url)}','CDN Asset Link')" class="p-1.5 rounded bg-slate-950/90 text-slate-200 hover:text-brand-gold"><i class="fa-solid fa-link text-[10px]"></i></button>
            <button type="button" onclick="event.stopPropagation();MEDIA_VAULT.openConvert('${asset.id}')" class="p-1.5 rounded bg-slate-950/90 text-slate-200 hover:text-brand-gold"><i class="fa-solid fa-rotate text-[10px]"></i></button>
          </div>
          <button type="button" onclick="event.stopPropagation();MEDIA_VAULT.attach('${this.escape(asset.title).replace(/'/g, '')}')" class="w-full py-1.5 rounded bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-[9px]"><i class="fa-solid fa-file-circle-plus"></i> Attach to Campaign</button>
        </div>
        <div class="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-brand-black/80 border border-slate-800 text-[8px] font-mono font-bold text-brand-gold">${this.escape(asset.type)}${asset.duration ? ` • ${this.escape(asset.duration)}` : ''}</div>
      </div>`;
    }
    return `<div class="bg-slate-900 border border-slate-800 hover:border-brand-gold/40 rounded-2xl overflow-hidden flex flex-col">
      ${media}
      <div class="p-3 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <h3 class="text-[11px] font-bold text-white truncate">${this.escape(asset.title)}</h3>
          <div class="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono mt-0.5">
            <span>${this.escape(asset.dimensions)}</span><span>•</span><span>${this.escape(asset.size)}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-1">${tags}</div>
        <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
          <span><i class="fa-solid fa-download text-slate-500"></i> ${asset.downloads} downloads</span>
          <button type="button" onclick="MEDIA_VAULT.copy('${this.escape(asset.url)}','Asset URL')" class="text-brand-gold hover:text-amber-300 font-semibold">Copy URL</button>
        </div>
      </div>
    </div>`;
  },

  convertHtml() {
    const asset = this.load().find((a) => a.id === this.convertId);
    if (!asset) return '';
    const fmts = this.formats.map((fmt, i) => `<button type="button" onclick="MEDIA_VAULT.setFmt(${i})" class="p-2 rounded border font-mono text-[10px] font-bold ${i === this.convertFmt ? 'bg-brand-gold/20 border-brand-gold text-brand-gold' : 'bg-slate-950 border-slate-800 text-slate-400'}">${fmt}</button>`).join('');
    const presets = [
      { name: 'Instagram Story / Reel (9:16)', res: '1080 x 1920 px' },
      { name: 'YouTube Thumbnail (16:9)', res: '1920 x 1080 px' },
      { name: 'Twitter / X Banner (3:1)', res: '1500 x 500 px' },
      { name: 'Original Dimensions', res: asset.dimensions }
    ].map((p, i) => `<button type="button" onclick="MEDIA_VAULT.setPreset(${i})" class="w-full p-2.5 rounded-xl border flex justify-between items-center text-left ${i === this.convertPreset ? 'bg-slate-950 border-brand-gold/60 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400'}">
        <span class="font-semibold text-[10px]">${this.escape(p.name)}</span>
        <span class="font-mono text-[9px] text-brand-gold">${this.escape(p.res)}</span>
      </button>`).join('');
    return `<div class="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onclick="if(event.target===this)MEDIA_VAULT.closeConvert()">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 relative">
        <button type="button" onclick="MEDIA_VAULT.closeConvert()" class="absolute top-3 right-3 text-slate-400 hover:text-white">✕</button>
        <div class="border-b border-slate-800 pb-3">
          <span class="text-[8px] font-mono uppercase tracking-wider text-brand-gold">Dimad Asset Converter</span>
          <h3 class="text-sm font-bold text-white mt-1">Convert &amp; Resize Asset</h3>
          <p class="text-[10px] text-slate-400">Convert "${this.escape(asset.title)}" into optimized web formats.</p>
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 font-medium mb-1">Select Target Format</label>
          <div class="grid grid-cols-4 gap-2">${fmts}</div>
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 font-medium mb-1">Social Aspect Ratio Presets</label>
          <div class="space-y-2">${presets}</div>
        </div>
        <div class="flex gap-2 pt-1">
          <button type="button" onclick="MEDIA_VAULT.closeConvert()" class="w-1/3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px]">Cancel</button>
          <button type="button" onclick="MEDIA_VAULT.runConvert()" class="w-2/3 py-2 rounded bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-[10px]"><i class="fa-solid fa-download"></i> Convert &amp; Download File</button>
        </div>
      </div>
    </div>`;
  },

  publicKitUrl() {
    try {
      return new URL('../press/alexander-wright-2026.html', window.location.href).href;
    } catch (err) {
      return '../press/alexander-wright-2026.html';
    }
  },

  exportKitPdf() {
    window.open(`${this.publicKitUrl()}?print=1`, '_blank', 'noopener');
  },

  kitHtml() {
    const live = this.publicKitUrl();
    return `<div class="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onclick="if(event.target===this){MEDIA_VAULT.showKit=false;MEDIA_VAULT.render()}">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 relative max-h-[90vh] overflow-y-auto">
        <button type="button" onclick="MEDIA_VAULT.showKit=false;MEDIA_VAULT.render()" class="absolute top-3 right-3 text-slate-400 hover:text-white">✕</button>
        <div class="flex items-center gap-3 pb-3 border-b border-slate-800">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" alt="" class="w-14 h-14 rounded-2xl object-cover border-2 border-brand-gold/50">
          <div>
            <span class="text-[8px] font-mono uppercase tracking-wider text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">Verified Public Media Kit</span>
            <h3 class="text-sm font-bold text-white mt-1">Alexander Wright</h3>
            <p class="text-[10px] text-slate-400">Founder &amp; Tech Creator • 180K+ Cross-Platform Audience</p>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[8px] text-slate-500 uppercase block">Substack / Newsletter</span>
            <span class="text-sm font-bold font-mono text-brand-gold">42,500</span>
            <span class="text-[8px] text-brand-mint block font-semibold">48% Open Rate</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[8px] text-slate-500 uppercase block">YouTube Subscribers</span>
            <span class="text-sm font-bold font-mono text-white">98,000</span>
            <span class="text-[8px] text-slate-400 block">Tech &amp; Remote Work</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[8px] text-slate-500 uppercase block">Monthly Impressions</span>
            <span class="text-sm font-bold font-mono text-brand-gold">1.2M</span>
            <span class="text-[8px] text-brand-mint block font-semibold">+24% YoY</span>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <h4 class="text-[9px] font-bold text-brand-gold uppercase tracking-wider">2026 Sponsorship Package Rates</h4>
          <div class="flex justify-between items-center pb-2 border-b border-slate-800 text-[10px]"><div><span class="font-bold text-white block">Dedicated Newsletter Integration</span><span class="text-[9px] text-slate-400">Primary header banner + 150-word editorial review</span></div><span class="font-mono font-bold text-brand-gold">$1,800 USD</span></div>
          <div class="flex justify-between items-center pb-2 border-b border-slate-800 text-[10px]"><div><span class="font-bold text-white block">YouTube Main Channel Dedicated Integration</span><span class="text-[9px] text-slate-400">60-90 second mid-roll integration + link in top description</span></div><span class="font-mono font-bold text-brand-gold">$3,500 USD</span></div>
          <div class="flex justify-between items-center text-[10px]"><div><span class="font-bold text-white block">Full Creator OS Ecosystem Takeover</span><span class="text-[9px] text-slate-400">Newsletter + YouTube + Twitter/X Thread + Podcast Stinger</span></div><span class="font-mono font-bold text-brand-mint">$6,000 USD</span></div>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <a href="${this.escape(live)}" target="_blank" rel="noopener" class="font-mono text-slate-400 truncate hover:text-brand-gold">${this.escape(live)}</a>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="MEDIA_VAULT.copy(MEDIA_VAULT.publicKitUrl(),'Sponsor Media Kit Link')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold">Copy Live Link</button>
            <button type="button" onclick="MEDIA_VAULT.exportKitPdf()" class="px-2.5 py-1 rounded bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold">Export to PDF</button>
          </div>
        </div>
      </div>
    </div>`;
  }
};

window.MEDIA_VAULT = MEDIA_VAULT;

const TRAVEL_GUIDES = {
  storageKey: 'dimad_wander_saved',
  category: 'All Articles',
  search: '',
  sortBy: 'Latest',
  activeId: '',
  toast: '',
  toastTimer: null,
  categories: ['All Articles', 'City Guides', 'Nomad Visas', 'Digital Nomad Hubs', 'Hidden Gems', 'Travel Tech & Hacks'],
  articles: [
    {
      id: 'guide-lisbon-2026',
      isHero: true,
      title: 'The Ultimate 2026 Guide to Living & Working in Lisbon: Neighborhoods, Visas & Tech Hubs',
      category: 'City Guides',
      readTime: '8 min read',
      author: 'Alexander Wright',
      authorRole: 'Founder & Remote Strategist',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      date: 'Oct 28, 2026',
      views: '14.2K',
      likes: 890,
      coverImage: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80',
      excerpt: 'Portugal has evolved from a quiet coastal getaway into Europe’s primary tech ecosystem for founders and creators. Here is the definitive operational playbook for housing, NHR tax transitions, and daily workflow.',
      tags: ['#Lisbon', '#Portugal', '#NomadVisa', '#EuropeHub'],
      takeaways: [
        'Santos & Chiado remain the top hubs for high-speed fiber coworking spaces.',
        'D8 Digital Nomad Visa requires minimum €3,280/mo income substantiation.',
        'Local tax residency rules shifted in late 2025; ensure proper legal setup prior to month 6.'
      ],
      contentSections: [
        { heading: 'Why Lisbon Retains the Nomad Crown in 2026', body: 'Lisbon offers an unbeatable combination of 300 days of sunshine, high-density international founder networks, and reliable infrastructure. While accommodation costs have normalized upward, the density of tech talent and investor events continues to make it the European launchpad of choice.' },
        { heading: 'Neighborhood Breakdown: Where to Base Yourself', body: 'For entrepreneurs needing quiet deep-work hours alongside active nightlife, Santos and Estrela provide lush green squares and high-speed fiber coffee bars. Principe Real offers boutique living, while Cais do Sodré puts you right on the Tagus River waterfront.' },
        { heading: 'Operational Essentials: Connectivity & Visas', body: 'Fiber internet is ubiquitous, averaging 500Mbps symmetrical across most midterm apartments. The D8 Digital Nomad Visa is streamlined for remote tech workers, with initial residency grants covering 2 years.' }
      ]
    },
    {
      id: 'guide-tokyo-hacks',
      title: 'Tokyo Uncovered: Strategic Work Cafes & Nightlife Strategy for Remote Founders',
      category: 'Digital Nomad Hubs',
      readTime: '6 min read',
      author: 'Elena Rostova',
      authorRole: 'Asia-Pacific Bureau Lead',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
      date: 'Nov 02, 2026',
      views: '9.8K',
      likes: 654,
      coverImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Navigating Japan’s six-month digital nomad visa. Where to find silent 24/7 work pods in Shibuya, pocket Wi-Fi hacks, and late-night founder gatherings.',
      tags: ['#Tokyo', '#Japan', '#AsiaNomad', '#WorkCafes'],
      takeaways: [
        'Japan’s 6-month Nomad Visa is non-renewable within the same year—plan entry dates carefully.',
        'Use pocket eSIMs (e.g. Ubigi/Airalo) for seamless high-speed 5G subway coverage.',
        'Shibuya & Roppongi offer high-density 24/7 tech coworking spaces with English support.'
      ],
      contentSections: [
        { heading: 'The Tokyo Remote Work Landscape', body: 'Tokyo offers world-class infrastructure and unrivaled safety. Finding laptop-friendly cafes requires local knowledge, as traditional kissaten discourage prolonged computer usage. Opt for dedicated coworking chains like WeWork Shibuya or Tsutaya Book Cafe floors.' }
      ]
    },
    {
      id: 'guide-nomad-visas-2026',
      title: 'Digital Nomad Visas in 2026: Spain vs. Bali vs. Dubai Tax & Income Rules',
      category: 'Nomad Visas',
      readTime: '10 min read',
      author: 'Marcus Vance',
      authorRole: 'Global Tax Strategist',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      date: 'Oct 15, 2026',
      views: '22.4K',
      likes: 1420,
      coverImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Comparing minimum income barriers, local tax exemptions, path to permanent residency, and banking compliance across top nomad destinations.',
      tags: ['#NomadVisa', '#TaxHacks', '#Spain', '#Dubai'],
      takeaways: [
        'Spain Beckham Law permits a flat 24% tax rate for qualified remote founders.',
        'Dubai offers 0% personal income tax with 1-year virtual working residency cards.',
        'Always verify 183-day fiscal presence thresholds to avoid double taxation traps.'
      ],
      contentSections: [
        { heading: 'Navigating Legal Tax Residency', body: 'Choosing the right nomad visa is more than just choosing a beach—it dictates your worldwide tax liability. Spain’s Telework Visa gives access to the EU Schengen zone, while Dubai offers 0% local income tax.' }
      ]
    },
    {
      id: 'guide-bansko-bulgaria',
      title: 'Bansko & Beyond: Why Bulgaria is Europe’s Secret 10% Flat-Tax Capital',
      category: 'Hidden Gems',
      readTime: '5 min read',
      author: 'Sarah Jenkins',
      authorRole: 'European Travel Desk',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      date: 'Sep 29, 2026',
      views: '7.1K',
      likes: 412,
      coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Nestled in the Pirin Mountains, Bansko hosts Europe’s largest mountain nomad festival alongside extremely affordable mountain living and flat 10% taxes.',
      tags: ['#Bansko', '#Bulgaria', '#BudgetTravel', '#MountainLife'],
      takeaways: [
        '10% Flat Personal & Corporate Income Tax in Bulgaria.',
        'Monthly living expenses range from €900 to €1,400 for luxury stays.',
        'Thriving community driven by Coworking Bansko and seasonal mountain festivals.'
      ],
      contentSections: [
        { heading: 'Low Burn-Rate, High Quality of Life', body: 'Bansko provides a rare sanctuary for bootstrapped founders looking to stretch runway without sacrificing community. Fast fiber internet, crisp mountain air, and cheap ski passes make it an ideal summer or winter base.' }
      ]
    },
    {
      id: 'guide-capetown-playbook',
      title: 'Cape Town Playbook: Safety, Power Backup Solutions & Oceanfront Workspaces',
      category: 'City Guides',
      readTime: '7 min read',
      author: 'Alexander Wright',
      authorRole: 'Founder & Remote Strategist',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      date: 'Oct 04, 2026',
      views: '11.5K',
      likes: 780,
      coverImage: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
      excerpt: 'How to thrive in Camps Bay and Sea Point during the South African summer season. Inverter setup tips, surf morning routines, and networking spots.',
      tags: ['#CapeTown', '#SouthAfrica', '#SurfNomad', '#CityGuide'],
      takeaways: [
        'Ensure your accommodation explicitly advertises Inverter / Solar power for zero work interruption.',
        'Sea Point and Camps Bay offer walkable, secure coastal living with beachside cafes.',
        'Overberg day trips and Stellenbosch wine runs make weekend getaways effortless.'
      ],
      contentSections: [
        { heading: 'The Magic of Cape Town Summer', body: 'Between November and March, Cape Town becomes the premier hub for European time-zone remote workers. The combination of ocean views, world-class dining, and zero time difference with Europe is unmatched.' }
      ]
    },
    {
      id: 'guide-tech-packing-2026',
      title: 'The 2026 Carry-On Only Packing List: 15 Essential Tech & Ops Tools for Remote Travelers',
      category: 'Travel Tech & Hacks',
      readTime: '4 min read',
      author: 'Elena Rostova',
      authorRole: 'Asia-Pacific Bureau Lead',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
      date: 'Oct 19, 2026',
      views: '18.9K',
      likes: 1102,
      coverImage: 'https://images.unsplash.com/photo-1553531384-cc64ac80f931?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Ultra-lightweight GaN chargers, portable dual screens, noise-canceling headsets, and secure hardware keys for global founders travel setup.',
      tags: ['#Gear', '#TechHacks', '#CarryOnOnly', '#RemoteWork'],
      takeaways: [
        '100W GaN multi-port USB-C chargers replace bulky laptop bricks.',
        'Universal travel adapters with built-in high-wattage Type-C ports are non-negotiable.',
        'Physical YubiKey security tokens safeguard crypto & bank accounts while traveling.'
      ],
      contentSections: [
        { heading: 'Streamlining Mobile Hardware', body: 'Traveling light allows fast airport transitions and hassle-free train rides. Prioritize multi-functional gear like 65W+ GaN chargers that power laptops, phones, and drones simultaneously.' }
      ]
    }
  ],

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  loadSaved() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      return [];
    }
  },

  persistSaved(ids) {
    localStorage.setItem(this.storageKey, JSON.stringify(ids));
  },

  parseViews(value) {
    const raw = String(value || '').toUpperCase().replace(/,/g, '');
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return 0;
    if (raw.includes('K')) return num * 1000;
    if (raw.includes('M')) return num * 1000000;
    return num;
  },

  parseDate(value) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  },

  article(id) {
    return this.articles.find((a) => a.id === id) || null;
  },

  filtered() {
    let rows = this.articles.filter((art) => !art.isHero);
    if (this.category !== 'All Articles') rows = rows.filter((art) => art.category === this.category);
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      rows = rows.filter((art) =>
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (this.sortBy === 'Popular') rows = rows.slice().sort((a, b) => this.parseViews(b.views) - this.parseViews(a.views));
    else if (this.sortBy === 'Read Time') rows = rows.slice().sort((a, b) => parseInt(b.readTime, 10) - parseInt(a.readTime, 10));
    else rows = rows.slice().sort((a, b) => this.parseDate(b.date) - this.parseDate(a.date));
    return rows;
  },

  showToast(msg) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.render();
    }, 3000);
    this.render();
  },

  setSearch(value) {
    this.search = value;
    this.render();
  },

  setCategory(cat) {
    this.category = cat;
    this.render();
  },

  setSort(value) {
    this.sortBy = value;
    this.render();
  },

  clearFilters() {
    this.category = 'All Articles';
    this.search = '';
    this.render();
  },

  open(id) {
    this.activeId = id;
    this.render();
  },

  close() {
    this.activeId = '';
    this.render();
  },

  toggleBookmark(id, event) {
    if (event) event.stopPropagation();
    const saved = this.loadSaved();
    if (saved.includes(id)) {
      this.persistSaved(saved.filter((item) => item !== id));
      this.showToast('Article removed from your reading list.');
    } else {
      this.persistSaved([...saved, id]);
      this.showToast('Article saved to your reading list!');
    }
  },

  showSavedCount() {
    this.showToast(`You have ${this.loadSaved().length} saved reading list articles.`);
  },

  copyShare(title, event, id) {
    if (event) event.stopPropagation();
    const slug = id || this.activeId || '';
    const url = `${window.location.origin}${window.location.pathname}${slug ? '#' + slug : ''}`;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
    this.showToast(`Copied article link for "${String(title).slice(0, 20)}..."`);
  },

  mount() {
    this.render();
  },

  render() {
    const root = document.getElementById('wg-root');
    if (!root) return;
    const saved = this.loadSaved();
    const hero = this.articles.find((a) => a.isHero) || this.articles[0];
    const rows = this.filtered();
    const catBtns = this.categories.map((cat) => {
      const on = this.category === cat;
      return `<button type="button" onclick="TRAVEL_GUIDES.setCategory('${this.escape(cat)}')" class="px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${on ? 'bg-brand-gold text-slate-950 font-bold' : 'bg-slate-950 border border-brand-border text-slate-400 hover:text-white hover:border-slate-600'}">${this.escape(cat)}</button>`;
    }).join('');
    const cards = rows.map((article) => {
      const bookmarked = saved.includes(article.id);
      const tags = article.tags.map((t) => `<span class="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-brand-border">${this.escape(t)}</span>`).join('');
      return `<article onclick="TRAVEL_GUIDES.open('${article.id}')" class="group bg-brand-panel border border-brand-border hover:border-brand-gold/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col justify-between">
        <div class="h-48 relative overflow-hidden bg-slate-950">
          <img src="${this.escape(article.coverImage)}" alt="${this.escape(article.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-brand-border text-[10px] font-mono font-bold text-brand-gold">${this.escape(article.category)}</div>
          <button type="button" onclick="TRAVEL_GUIDES.toggleBookmark('${article.id}', event)" title="Save Article" class="absolute top-3 right-3 p-2 rounded-lg backdrop-blur-md ${bookmarked ? 'bg-brand-gold text-slate-950' : 'bg-slate-950/70 text-slate-300 hover:text-white'}">
            <i class="fa-solid fa-bookmark text-[11px]"></i>
          </button>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>${this.escape(article.readTime)}</span><span>•</span><span>${this.escape(article.date)}</span><span>•</span><span>${this.escape(article.views)} reads</span>
            </div>
            <h3 class="text-base font-bold text-white leading-snug group-hover:text-brand-gold transition-colors line-clamp-2">${this.escape(article.title)}</h3>
            <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${this.escape(article.excerpt)}</p>
          </div>
          <div class="flex flex-wrap gap-1">${tags}</div>
          <div class="pt-3 border-t border-brand-border/80 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="${this.escape(article.authorAvatar)}" alt="${this.escape(article.author)}" class="w-6 h-6 rounded-full object-cover border border-brand-gold/30">
              <span class="text-xs text-slate-300 font-medium">${this.escape(article.author)}</span>
            </div>
            <button type="button" onclick="TRAVEL_GUIDES.copyShare('${this.escape(article.title).replace(/'/g, '')}', event, '${article.id}')" class="text-slate-500 hover:text-brand-gold p-1" title="Share Article Link">
              <i class="fa-solid fa-share-nodes"></i>
            </button>
          </div>
        </div>
      </article>`;
    }).join('');
    const grid = rows.length
      ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>`
      : `<div class="text-center py-16 bg-brand-panel/60 rounded-2xl border border-dashed border-brand-border space-y-3">
          <i class="fa-solid fa-book-open text-2xl text-slate-600"></i>
          <p class="text-sm text-slate-400 font-semibold">No travel guides found matching your selection.</p>
          <button type="button" onclick="TRAVEL_GUIDES.clearFilters()" class="text-xs text-brand-gold font-bold hover:underline">Clear search filters</button>
        </div>`;
    const heroTags = (hero.tags || []).map((tag) => `<span class="text-[10px] font-mono bg-slate-950 text-slate-400 border border-brand-border px-2 py-0.5 rounded-md">${this.escape(tag)}</span>`).join('');
    const active = this.article(this.activeId);
    const modal = active ? this.modalHtml(active, saved) : '';
    const toast = this.toast
      ? `<div class="fixed bottom-6 right-6 z-[420] flex items-center gap-2 bg-brand-gold text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl"><i class="fa-solid fa-circle-check"></i><span>${this.escape(this.toast)}</span></div>`
      : '';
    root.innerHTML = `
      <div class="min-h-full bg-brand-black text-slate-100 flex flex-col">
        <header class="sticky top-0 z-30 bg-brand-black/90 backdrop-blur-md border-b border-brand-border px-4 md:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3 shrink-0">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <i class="fa-solid fa-compass"></i>
            </div>
            <div>
              <h1 class="font-extrabold text-base tracking-tight text-white leading-none">Autonomous by Dimad</h1>
              <p class="text-[10px] text-slate-400 font-medium">Travel &amp; Destination Guides for the Curious Traveler.</p>
            </div>
          </div>
          <div class="relative w-full md:w-96">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[11px]"></i>
            <input id="wg-search" type="text" value="${this.escape(this.search)}" oninput="TRAVEL_GUIDES.search=this.value;TRAVEL_GUIDES._searchCaret=this.selectionStart;TRAVEL_GUIDES.render()" placeholder="Search Lisbon, nomad visas, Tokyo cafes, tech gear..." class="w-full bg-slate-950 border border-brand-border rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold">
            ${this.search ? `<button type="button" onclick="TRAVEL_GUIDES.setSearch('')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs">✕</button>` : ''}
          </div>
          <button type="button" onclick="TRAVEL_GUIDES.showSavedCount()" class="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-gold font-medium bg-slate-950 border border-brand-border px-3 py-1.5 rounded-xl shrink-0">
            <i class="fa-solid fa-bookmark text-brand-gold"></i>
            <span>Saved (${saved.length})</span>
          </button>
        </header>
        <main class="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8 space-y-10">
          <section onclick="TRAVEL_GUIDES.open('${hero.id}')" class="relative rounded-3xl overflow-hidden border border-brand-border bg-brand-panel group cursor-pointer hover:border-brand-gold/50 transition-all">
            <div class="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
              <div class="lg:col-span-7 relative overflow-hidden min-h-[280px]">
                <img src="${this.escape(hero.coverImage)}" alt="${this.escape(hero.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/20 to-transparent lg:hidden"></div>
                <span class="absolute top-4 left-4 bg-brand-gold text-slate-950 font-extrabold text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full">★ Featured Cover Story</span>
              </div>
              <div class="lg:col-span-5 p-6 md:p-10 flex flex-col justify-between bg-brand-panel border-t lg:border-t-0 lg:border-l border-brand-border">
                <div class="space-y-4">
                  <div class="flex items-center gap-3 text-xs text-slate-400">
                    <span class="text-brand-gold font-bold font-mono">${this.escape(hero.category)}</span>
                    <span>•</span><span>${this.escape(hero.readTime)}</span>
                    <span>•</span><span>${this.escape(hero.date)}</span>
                  </div>
                  <h2 class="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug group-hover:text-brand-gold">${this.escape(hero.title)}</h2>
                  <p class="text-xs md:text-sm text-slate-300 line-clamp-3 leading-relaxed">${this.escape(hero.excerpt)}</p>
                  <div class="flex flex-wrap gap-1.5 pt-2">${heroTags}</div>
                </div>
                <div class="pt-6 border-t border-brand-border/80 flex items-center justify-between mt-6">
                  <div class="flex items-center gap-3">
                    <img src="${this.escape(hero.authorAvatar)}" alt="${this.escape(hero.author)}" class="w-9 h-9 rounded-full object-cover border border-brand-gold/40">
                    <div>
                      <p class="text-xs font-bold text-white leading-none">${this.escape(hero.author)}</p>
                      <p class="text-[10px] text-slate-400 mt-0.5">${this.escape(hero.authorRole)}</p>
                    </div>
                  </div>
                  <span class="inline-flex items-center gap-1 text-xs font-bold text-brand-gold">Read Full Story <i class="fa-solid fa-arrow-right"></i></span>
                </div>
              </div>
            </div>
          </section>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border/80">
            <div id="wg-cats" class="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 text-xs">${catBtns}</div>
            <div class="flex items-center gap-2 shrink-0 text-xs">
              <span class="text-slate-500">Sort by:</span>
              <select onchange="TRAVEL_GUIDES.setSort(this.value)" class="bg-slate-950 border border-brand-border text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-brand-gold">
                <option value="Latest" ${this.sortBy === 'Latest' ? 'selected' : ''}>Latest Articles</option>
                <option value="Popular" ${this.sortBy === 'Popular' ? 'selected' : ''}>Most Popular</option>
                <option value="Read Time" ${this.sortBy === 'Read Time' ? 'selected' : ''}>Reading Time</option>
              </select>
            </div>
          </div>
          <div>${grid}</div>
        </main>
        <footer class="border-t border-brand-border bg-brand-black py-8 px-4 md:px-8 mt-4 text-center text-xs text-slate-500">
          <p>© 2026 Dimad OS - Autonomous by Dimad</p>
        </footer>
        ${modal}
        ${toast}
      </div>`;
    const search = document.getElementById('wg-search');
    if (search && typeof this._searchCaret === 'number') {
      search.focus();
      const pos = Math.min(this._searchCaret, search.value.length);
      search.setSelectionRange(pos, pos);
    }
  },

  modalHtml(article, saved) {
    const bookmarked = saved.includes(article.id);
    const takeaways = (article.takeaways || []).map((point) => `<li class="flex items-start gap-2"><span class="text-brand-gold font-bold">•</span><span>${this.escape(point)}</span></li>`).join('');
    const sections = (article.contentSections || []).map((sec) => `<div class="space-y-2"><h3 class="text-lg font-bold text-white">${this.escape(sec.heading)}</h3><p class="text-slate-300 leading-relaxed">${this.escape(sec.body)}</p></div>`).join('');
    return `<div class="fixed inset-0 z-[400] bg-black/85 backdrop-blur-md flex justify-center overflow-y-auto p-4 md:p-8" onclick="if(event.target===this)TRAVEL_GUIDES.close()">
      <div class="bg-brand-panel border border-brand-border rounded-3xl max-w-3xl w-full my-auto overflow-hidden relative">
        <button type="button" onclick="TRAVEL_GUIDES.close()" class="absolute top-4 right-4 z-20 bg-slate-950/80 text-slate-400 hover:text-white p-2 rounded-full border border-brand-border"><i class="fa-solid fa-xmark"></i></button>
        <div class="h-72 relative">
          <img src="${this.escape(article.coverImage)}" alt="${this.escape(article.title)}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-brand-panel via-brand-panel/40 to-transparent"></div>
          <div class="absolute bottom-6 left-6 right-6 space-y-2">
            <span class="bg-brand-gold text-slate-950 font-bold text-[10px] font-mono px-2.5 py-1 rounded-md">${this.escape(article.category)}</span>
            <h2 class="text-xl md:text-3xl font-extrabold text-white leading-tight">${this.escape(article.title)}</h2>
          </div>
        </div>
        <div class="p-6 md:p-10 space-y-8">
          <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-brand-border text-xs">
            <div class="flex items-center gap-3">
              <img src="${this.escape(article.authorAvatar)}" alt="${this.escape(article.author)}" class="w-10 h-10 rounded-full object-cover border border-brand-gold/40">
              <div>
                <p class="font-bold text-white text-sm">${this.escape(article.author)}</p>
                <p class="text-[10px] text-slate-400">${this.escape(article.authorRole)} • ${this.escape(article.date)}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="TRAVEL_GUIDES.toggleBookmark('${article.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${bookmarked ? 'bg-brand-gold text-slate-950 border-brand-gold' : 'bg-slate-950 text-slate-300 border-brand-border'}">
                <i class="fa-solid fa-bookmark"></i> ${bookmarked ? 'Saved' : 'Save'}
              </button>
              <button type="button" onclick="TRAVEL_GUIDES.copyShare('${this.escape(article.title).replace(/'/g, '')}', event, '${article.id}')" class="px-3 py-1.5 rounded-xl bg-slate-950 text-slate-300 hover:text-white border border-brand-border font-bold text-xs flex items-center gap-1.5">
                <i class="fa-solid fa-share-nodes text-brand-gold"></i> Share Link
              </button>
            </div>
          </div>
          <div class="p-5 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 space-y-3">
            <h4 class="text-xs font-bold text-brand-gold uppercase tracking-wider flex items-center gap-1.5"><i class="fa-solid fa-bolt"></i> Operational Key Takeaways</h4>
            <ul class="space-y-2 text-xs text-slate-200">${takeaways}</ul>
          </div>
          <div class="space-y-6 text-sm text-slate-300 leading-relaxed">
            <p class="text-base font-medium text-slate-200 leading-relaxed italic">"${this.escape(article.excerpt)}"</p>
            ${sections || '<p>Full article body content loading from Dimad editorial servers...</p>'}
          </div>
          <div class="pt-6 border-t border-brand-border flex justify-between items-center text-xs">
            <span class="text-slate-500">Dimad Wander Editorial • 2026 Edition</span>
            <button type="button" onclick="TRAVEL_GUIDES.close()" class="px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold">Done Reading</button>
          </div>
        </div>
      </div>
    </div>`;
  }
};

window.TRAVEL_GUIDES = TRAVEL_GUIDES;

const DIGITAL_MAPS = {
  category: 'all',
  search: '',
  selectedId: 1,
  popupOpen: true,
  toast: '',
  toastTimer: null,
  categories: [
    { id: 'all', label: 'All Pins' },
    { id: 'cafe', label: '☕ Deep Work Cafes' },
    { id: 'coworking', label: '💻 Coworking Hubs' },
    { id: 'food', label: '🍷 Dining & Wine' },
    { id: 'ops', label: '🛠️ Essential Ops' }
  ],
  places: [
    { id: 1, name: 'The Green Bean (Cascade)', category: 'cafe', district: 'Cascade Complex', wifi: '85 Mbps', power: 'Abundant Outlets', tagline: 'Eco-friendly, 100% non-smoking spot with solid brunch and non-stop fast Wi-Fi.', address: '38 Isahakyan St', coords: { top: '32%', left: '42%' }, color: 'bg-amber-500', authorNote: 'Recommended by @AlexRivera for 4+ hr deep work sprints.' },
    { id: 2, name: 'Mirzoyan Library', category: 'cafe', district: 'Kentron South', wifi: '60 Mbps', power: 'Selected Tables', tagline: 'Hidden courtyard cafe, gallery & photography library. Extremely chill creative vibe.', address: '10 Mher Mkrtchyan St', coords: { top: '58%', left: '55%' }, color: 'bg-amber-500', authorNote: 'Best place for afternoon writing or casual client calls.' },
    { id: 3, name: 'Keerk & Co.', category: 'cafe', district: 'Baghramyan Ave', wifi: '95 Mbps', power: 'Outlets at Bench', tagline: 'Bookstore cafe featuring specialty espresso, clean power hookups, and great sandwiches.', address: '3A Marshal Baghramyan Ave', coords: { top: '25%', left: '35%' }, color: 'bg-amber-500', authorNote: 'Ideal focus zone before heading down to Cascade.' },
    { id: 4, name: 'Impact Hub Yerevan', category: 'coworking', district: 'Tigran Mets', wifi: '200+ Mbps Fiber', power: 'Dedicated Desks', tagline: 'Premier social entrepreneurship & remote worker hub. 24/7 access available.', address: '80 Tigran Mets St', coords: { top: '68%', left: '62%' }, color: 'bg-brand-accent', authorNote: 'Go-to community spot for networking with local tech founders.' },
    { id: 5, name: 'LOFT Coworking & Self-Dev', category: 'coworking', district: 'Moskovyan / Teryan', wifi: '120 Mbps', power: 'Every Table', tagline: 'Anti-cafe style space with minute/day pass rates, phone booths, and free tea/coffee.', address: '3 Moskovyan St', coords: { top: '36%', left: '48%' }, color: 'bg-brand-accent', authorNote: 'Perfect for flexible 2-hour pop-in sessions between meetings.' },
    { id: 6, name: 'Saryan Wine Street Strip', category: 'food', district: 'Saryan Street', wifi: 'Various', power: 'N/A', tagline: 'Hub of Yerevan\'s famous wine bars (In Vino, Tapastan) for post-work networking.', address: 'Martiros Saryan St', coords: { top: '45%', left: '30%' }, color: 'bg-rose-500', authorNote: 'The undisputed epicenter for evening drinks & founder catchups.' },
    { id: 7, name: 'Dalan Art Gallery & Abovyan 12', category: 'food', district: 'Abovyan Street', wifi: '40 Mbps', power: 'Limited', tagline: 'Historic secret garden restaurant serving authentic regional Armenian food.', address: '12 Abovyan St', coords: { top: '48%', left: '52%' }, color: 'bg-rose-500', authorNote: 'Take visiting clients or team members here for traditional lunch.' },
    { id: 8, name: 'GUM Market (Fresh Produce & Dried Fruit)', category: 'ops', district: 'Kentron East', wifi: 'N/A', power: 'N/A', tagline: 'Famous local market for artisan dried fruits, nuts, lavash bread & fresh supplies.', address: 'Movskyashan Ave', coords: { top: '72%', left: '68%' }, color: 'bg-emerald-500', authorNote: 'Stock up on healthy local snacks for your Airbnb workspace.' },
    { id: 9, name: 'Ucom / Team Telecom SIM & eSIM Hub', category: 'ops', district: 'Northern Avenue', wifi: 'High Speed', power: 'N/A', tagline: 'Official flagship store for instant local physical SIM or high-speed data packages.', address: 'Northern Ave 1', coords: { top: '44%', left: '48%' }, color: 'bg-emerald-500', authorNote: 'Grab 50GB unlimited data line upon city arrival.' }
  ],

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  catBadge(cat) {
    if (cat === 'cafe') return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    if (cat === 'coworking') return 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30';
    if (cat === 'food') return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    if (cat === 'ops') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    return 'bg-slate-800 text-slate-300';
  },

  catIcon(cat) {
    if (cat === 'cafe') return '<i class="fa-solid fa-mug-saucer"></i>';
    if (cat === 'coworking') return '<i class="fa-solid fa-laptop"></i>';
    if (cat === 'food') return '<i class="fa-solid fa-utensils"></i>';
    if (cat === 'ops') return '<i class="fa-solid fa-wrench"></i>';
    return '<i class="fa-solid fa-location-dot"></i>';
  },

  filtered() {
    const q = this.search.trim().toLowerCase();
    return this.places.filter((p) => {
      const catOk = this.category === 'all' || p.category === this.category;
      const qOk = !q || p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q) || p.district.toLowerCase().includes(q);
      return catOk && qOk;
    });
  },

  place(id) {
    return this.places.find((p) => p.id === id) || null;
  },

  setCategory(cat) {
    this.category = cat;
    this.render();
  },

  setSearch(value) {
    this.search = value;
    this.render();
  },

  select(id) {
    this.selectedId = Number(id);
    this.popupOpen = true;
    this.render();
  },

  closePopup() {
    this.popupOpen = false;
    this.render();
  },

  recenter() {
    this.selectedId = 1;
    this.popupOpen = true;
    this.render();
  },

  openMaps(name) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Yerevan Armenia')}`, '_blank');
  },

  copyList() {
    const url = 'https://maps.google.com/?q=Yerevan+Digital+Nomad+Verified+Intel';
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
    this.toast = 'Link copied to clipboard!';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.render();
    }, 2000);
    this.render();
  },

  mount() {
    this.render();
  },

  render() {
    const root = document.getElementById('dm-root');
    if (!root) return;
    const rows = this.filtered();
    const selected = this.place(this.selectedId);
    const chips = this.categories.map((cat) => {
      const on = this.category === cat.id;
      return `<button type="button" onclick="DIGITAL_MAPS.setCategory('${cat.id}')" class="px-3 py-1 rounded-md whitespace-nowrap transition ${on ? 'bg-brand-gold text-slate-950 font-semibold' : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-brand-border'}">${this.escape(cat.label)}</button>`;
    }).join('');
    const cards = rows.length
      ? rows.map((p) => {
        const on = this.selectedId === p.id;
        return `<button type="button" onclick="DIGITAL_MAPS.select(${p.id})" class="w-full text-left p-3.5 rounded-xl border transition ${on ? 'bg-brand-panel border-brand-gold/70 shadow-lg' : 'bg-slate-950/60 border-brand-border hover:border-slate-600 hover:bg-slate-800/40'}">
          <div class="flex items-start justify-between mb-1.5">
            <div>
              <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${this.catBadge(p.category)}">${this.escape(p.category)}</span>
              <h3 class="text-xs font-bold text-slate-100 mt-1">${this.escape(p.name)}</h3>
            </div>
            <span class="text-[10px] text-slate-400 bg-slate-950 border border-brand-border px-1.5 py-0.5 rounded">${this.escape(p.district)}</span>
          </div>
          <p class="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">${this.escape(p.tagline)}</p>
          <div class="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-brand-border/60">
            <div class="flex items-center gap-3">
              <span><i class="fa-solid fa-wifi text-brand-gold mr-1"></i>${this.escape(p.wifi)}</span>
              <span><i class="fa-solid fa-plug text-emerald-400 mr-1"></i>${this.escape(p.power)}</span>
            </div>
            <span class="text-brand-gold">View on map →</span>
          </div>
        </button>`;
      }).join('')
      : `<div class="text-center py-8 text-slate-500 text-xs"><i class="fa-solid fa-compass text-2xl mb-2 text-slate-600 block"></i>No locations matched your filter.</div>`;
    const pins = rows.map((p) => {
      const on = this.selectedId === p.id;
      return `<button type="button" onclick="DIGITAL_MAPS.select(${p.id})" style="top:${p.coords.top};left:${p.coords.left}" class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 transition-transform ${on ? 'scale-125 z-30' : 'hover:scale-110'}">
        <span class="relative flex items-center justify-center">
          <span class="absolute w-8 h-8 ${p.color} opacity-20 rounded-full animate-ping"></span>
          <span class="w-7 h-7 rounded-full ${p.color} text-slate-950 font-bold text-[11px] flex items-center justify-center shadow-lg border-2 border-slate-900">${this.catIcon(p.category)}</span>
        </span>
        <span class="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none bg-brand-panel border border-brand-border text-slate-100 text-[10px] font-medium px-2 py-1 rounded shadow-xl whitespace-nowrap">${this.escape(p.name)}</span>
      </button>`;
    }).join('');
    const popup = this.popupOpen && selected
      ? `<div class="absolute bottom-6 right-6 w-80 bg-brand-panel/95 border border-slate-700 backdrop-blur rounded-xl p-4 shadow-2xl z-20">
          <div class="flex items-start justify-between mb-2">
            <div>
              <span class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${this.catBadge(selected.category)}">${this.escape(selected.category)}</span>
              <h4 class="text-sm font-bold text-slate-100 mt-1">${this.escape(selected.name)}</h4>
            </div>
            <button type="button" onclick="DIGITAL_MAPS.closePopup()" class="text-slate-400 hover:text-slate-200 text-xs"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <p class="text-xs text-slate-300 mb-3 leading-relaxed">${this.escape(selected.tagline)}</p>
          <div class="bg-slate-950/80 rounded-lg p-2.5 border border-brand-border space-y-1.5 mb-3 text-[11px]">
            <div class="flex justify-between text-slate-400"><span>Wi-Fi Speed:</span><span class="text-brand-gold font-semibold">${this.escape(selected.wifi)}</span></div>
            <div class="flex justify-between text-slate-400"><span>Power Plugs:</span><span class="text-slate-200 font-medium">${this.escape(selected.power)}</span></div>
            <div class="flex justify-between text-slate-400"><span>Location:</span><span class="text-slate-300">${this.escape(selected.address)}</span></div>
          </div>
          <div class="text-[10px] text-brand-gold/90 italic mb-3 border-l-2 border-brand-gold pl-2">"${this.escape(selected.authorNote)}"</div>
          <button type="button" onclick="DIGITAL_MAPS.openMaps('${this.escape(selected.name).replace(/'/g, '')}')" class="w-full bg-brand-gold hover:bg-amber-400 text-slate-950 text-xs font-semibold py-1.5 rounded-lg transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-location-arrow"></i><span>Open in Google Maps</span>
          </button>
        </div>`
      : '';
    const toast = this.toast
      ? `<div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-brand-gold text-slate-950 px-4 py-2 rounded-lg font-semibold text-xs shadow-xl z-[420]">${this.escape(this.toast)}</div>`
      : '';
    root.innerHTML = `
      <div class="h-full min-h-0 flex flex-col bg-brand-black text-slate-100">
        <header class="h-14 bg-brand-panel border-b border-brand-border flex items-center justify-between px-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand-gold text-slate-950 flex items-center justify-center font-bold text-lg">D</div>
            <div>
              <span class="text-xs text-brand-gold font-semibold tracking-wider uppercase block leading-none">Wander Intel</span>
              <span class="text-sm font-semibold text-slate-200">Digital Maps by Dimad</span>
            </div>
          </div>
          <div class="flex items-center gap-2 bg-slate-950 border border-brand-border px-3 py-1.5 rounded-lg text-xs">
            <i class="fa-solid fa-location-dot text-brand-gold"></i>
            <span class="font-medium text-slate-200">Yerevan, Armenia</span>
            <span class="text-slate-400 text-[10px] bg-brand-black px-1.5 py-0.5 rounded border border-brand-border">Kentron Center</span>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" onclick="DIGITAL_MAPS.copyList()" class="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-brand-border">
              <i class="fa-solid fa-arrow-up-right-from-square text-brand-gold"></i>
              <span>Save Google Maps List</span>
            </button>
            <div class="w-8 h-8 rounded-full bg-slate-950 border border-brand-border flex items-center justify-center text-xs font-medium text-brand-gold">AR</div>
          </div>
        </header>
        <div class="flex-1 min-h-0 flex overflow-hidden">
          <aside class="w-[42%] min-w-[280px] max-w-[480px] bg-brand-panel border-r border-brand-border flex flex-col shrink-0">
            <div class="p-4 border-b border-brand-border space-y-3">
              <div class="relative">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                <input id="dm-search" type="text" value="${this.escape(this.search)}" oninput="DIGITAL_MAPS.search=this.value;DIGITAL_MAPS._searchCaret=this.selectionStart;DIGITAL_MAPS.render()" placeholder="Search Yerevan places (e.g. Wi-Fi, Kentron, Saryan)..." class="w-full bg-slate-950 border border-brand-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-gold">
              </div>
              <div id="dm-chips" class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">${chips}</div>
            </div>
            <div id="dm-list" class="flex-1 overflow-y-auto p-4 space-y-3">${cards}</div>
          </aside>
          <main class="flex flex-1 relative bg-brand-black overflow-hidden flex-col min-w-0">
            <div class="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>
            <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
              <path d="M-50 400 Q 200 350, 400 500 T 900 450" fill="none" stroke="#38BDF8" stroke-width="12" />
              <path d="M 100 -50 L 500 800" fill="none" stroke="#64748B" stroke-width="3" />
              <path d="M 600 -50 L 300 800" fill="none" stroke="#64748B" stroke-width="2" />
              <circle cx="450" cy="380" r="140" fill="none" stroke="#F59E0B" stroke-width="1" stroke-dasharray="4 4" />
            </svg>
            <div class="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
              <div class="bg-brand-panel/90 backdrop-blur border border-brand-border px-3 py-1.5 rounded-lg text-xs text-slate-300 pointer-events-auto flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span><b>Verified Intel Grid:</b> Yerevan Central District</span>
              </div>
              <button type="button" onclick="DIGITAL_MAPS.recenter()" class="pointer-events-auto bg-brand-panel/90 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-brand-border text-xs" title="Recenter Map"><i class="fa-solid fa-crosshairs"></i></button>
            </div>
            <div class="relative w-full h-full">${pins}</div>
            ${popup}
            <div class="absolute bottom-4 left-4 bg-brand-panel/90 border border-brand-border rounded-lg px-3 py-2 text-[11px] text-slate-400 flex items-center gap-4 backdrop-blur">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Cafes</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-brand-accent"></span>Coworking</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Dining &amp; Wine</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Essential Ops</span>
            </div>
          </main>
        </div>
        ${toast}
      </div>`;
    const search = document.getElementById('dm-search');
    if (search && typeof this._searchCaret === 'number') {
      search.focus();
      const pos = Math.min(this._searchCaret, search.value.length);
      search.setSelectionRange(pos, pos);
    }
  }
};

window.DIGITAL_MAPS = DIGITAL_MAPS;

const TRAVEL_TOOLBOX = {
  category: 'all',
  search: '',
  toast: '',
  toastTimer: null,
  destId: 'yerevan',
  destOpen: false,
  destinations: [
    { id: 'yerevan', city: 'Yerevan', country: 'Armenia', chip: 'Armenia (Yerevan)', auto: true, flag: 'tb-flag-am', currency: 'AMD', fx: '~388/$1', plugs: 'Type C & F', volts: '230V', emergency: '911 / 103', emergencyNote: 'Med', visa: '180 Days', visaNote: 'US/EU' },
    { id: 'mexico-city', city: 'Mexico City', country: 'Mexico', chip: 'Mexico (Mexico City)', auto: false, flag: 'tb-flag-mx', currency: 'MXN', fx: '~17/$1', plugs: 'Type A & B', volts: '127V', emergency: '911', emergencyNote: 'All', visa: '180 Days', visaNote: 'US/EU' },
    { id: 'danang', city: 'Da Nang', country: 'Vietnam', chip: 'Vietnam (Da Nang)', auto: false, flag: 'tb-flag-vn', currency: 'VND', fx: '~25k/$1', plugs: 'Type A & C', volts: '220V', emergency: '113 / 115', emergencyNote: 'Med', visa: 'E-Visa', visaNote: '90 Days' },
    { id: 'bangkok', city: 'Bangkok', country: 'Thailand', chip: 'Thailand (Bangkok)', auto: false, flag: 'tb-flag-th', currency: 'THB', fx: '~36/$1', plugs: 'Type A, B, C', volts: '220V', emergency: '191 / 1669', emergencyNote: 'Med', visa: 'Visa Exempt', visaNote: '60 Days' },
    { id: 'canggu', city: 'Canggu', country: 'Bali', chip: 'Bali (Canggu)', auto: false, flag: 'tb-flag-id', currency: 'IDR', fx: '~16k/$1', plugs: 'Type C & F', volts: '230V', emergency: '112', emergencyNote: 'All', visa: 'VOA', visaNote: '30 Days' }
  ],
  categories: [
    { id: 'all', label: 'All Tools' },
    { id: 'transit', label: '🚕 Rideshare & Transit' },
    { id: 'connect', label: '📶 eSIM & VPN' },
    { id: 'food', label: '🛵 Food & Groceries' },
    { id: 'finance', label: '💳 Money & Banking' },
    { id: 'gov', label: '📋 Visa & Admin' }
  ],
  tools: [
    { id: 1, title: 'Yandex Go', category: 'transit', type: 'Local Standard', rating: 'Primary Taxi App', description: 'The primary rideshare app in Armenia. Extremely cheap city rides ($1.50–$3.00), fast pickup, supports credit card or cash payments.', status: 'Essential', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'fa-taxi', links: [{ name: 'Open Yandex Go', url: 'https://go.yandex/en_am/' }] },
    { id: 2, title: 'GG Taxi', category: 'transit', type: 'Armenian Regional', rating: 'Local Alternative', description: 'High-quality local Armenian taxi app. Features clean cars, intercity transfers (e.g. Yerevan to Lake Sevan), and courier delivery.', status: 'Recommended', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'fa-car-side', links: [{ name: 'Download GG', url: 'https://gg.am/' }] },
    { id: 3, title: 'Yerevan Metro Token Guide', category: 'transit', type: 'Public Transit', rating: '100 AMD / Ride', description: '1 single line connecting North to South. Buy orange tokens or tap local Telcell wallet at turnstiles. Fastest way to bypass Kentron traffic.', status: 'Utility', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700', icon: 'fa-train-subway', links: [{ name: 'Metro Route Map', url: 'https://yandex.com/metro/yerevan' }] },
    { id: 4, title: 'Airalo eSIM (Armenia)', category: 'connect', type: 'Instant Data', rating: '$4.50 / 1GB', description: 'Pre-install before landing at Zvartnots Airport (EVN). Connects directly to Team Telecom 4G/LTE instantly upon arrival.', status: 'Global Favorite', badgeColor: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30', icon: 'fa-sim-card', links: [{ name: 'Get Airalo Plan', url: 'https://www.airalo.com/' }] },
    { id: 5, title: 'Ucom / Team Telecom Physical SIM', category: 'connect', type: 'Local Carrier', rating: 'Unlimited ~$8/mo', description: 'Visit Northern Avenue store with passport for local unlimited 5G/LTE data lines and SMS capabilities.', status: 'Best Value', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'fa-tower-cell', links: [{ name: 'Locate Stores', url: 'https://www.ucom.am/en' }] },
    { id: 6, title: 'NordVPN / ExpressVPN Setup', category: 'connect', type: 'Security Protocol', rating: 'High Speed Servers', description: 'Essential for secure banking, public cafe Wi-Fi encryption, and seamless streaming access while abroad.', status: 'Security', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: 'fa-shield-halved', links: [{ name: 'NordVPN', url: 'https://nordvpn.com/' }, { name: 'ExpressVPN', url: 'https://www.expressvpn.com/' }] },
    { id: 7, title: 'Menu.am', category: 'food', type: 'Delivery Leader', rating: 'Top Food App', description: 'Armenia\'s largest food delivery platform. Delivers from virtually every restaurant, cafe, and bakery in Yerevan.', status: 'Essential', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'fa-utensils', links: [{ name: 'Open Menu.am', url: 'https://www.menu.am/' }] },
    { id: 8, title: 'Yandex Eats / SAS Supermarket', category: 'food', type: 'Grocery & Express', rating: '15-Min Delivery', description: 'Order premium imported groceries, ready-to-eat meals, and fresh bakery goods directly to your accommodation.', status: 'Popular', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'fa-basket-shopping', links: [{ name: 'Yandex Eats', url: 'https://eats.yandex.com/' }, { name: 'SAS Delivery', url: 'https://www.sas.am/en/' }] },
    { id: 9, title: 'Ameriabank / IDBank Nomad Accounts', category: 'finance', type: 'Local Banking', rating: 'Multi-Currency', description: 'Popular local banks for digital nomads opening non-resident accounts (USD, EUR, AMD) with Visa/Mastercard support.', status: 'Nomad Favorite', badgeColor: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30', icon: 'fa-building-columns', links: [{ name: 'Ameriabank', url: 'https://ameriabank.am/' }, { name: 'IDBank', url: 'https://idbank.am/' }] },
    { id: 10, title: 'Wise & Revolut Card Compatibility', category: 'finance', type: 'Global Debit', rating: 'Zero FX Fee', description: 'Wise debit cards work universally across Yerevan card terminals (POS). Low ATM cash withdrawal fees at HSBC or Ameriabank.', status: 'Verified', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'fa-credit-card', links: [{ name: 'Wise', url: 'https://wise.com' }, { name: 'Revolut', url: 'https://www.revolut.com/' }] },
    { id: 11, title: 'Armenia E-Visa Official Portal', category: 'gov', type: 'Official Government', rating: 'E-Visa System', description: 'Official Ministry of Foreign Affairs portal for nationalities requiring pre-arranged entry visas.', status: 'Official', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700', icon: 'fa-passport', links: [{ name: 'Official Portal', url: 'https://evisa.mfa.am/' }] },
    { id: 12, title: 'Tax Residency & PE Registration', category: 'gov', type: 'Founder Legal', rating: '5% Micro-Business', description: 'Armenia offers a highly favorable 5% tech/sole proprietor tax regime for foreign founders establishing local residency.', status: 'High Value', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'fa-file-contract', links: [{ name: 'Read Setup Guide', url: 'https://www.src.am/en' }] }
  ],

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  filtered() {
    const q = this.search.trim().toLowerCase();
    return this.tools.filter((t) => {
      const catOk = this.category === 'all' || t.category === this.category;
      const qOk = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.type.toLowerCase().includes(q);
      return catOk && qOk;
    });
  },

  setCategory(cat) {
    this.category = cat;
    this.render();
  },

  setSearch(value) {
    this.search = value;
    this.render();
  },

  showToast(msg) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.render();
    }, 2000);
    this.render();
  },

  openLink(title, url) {
    if (url) window.open(url, '_blank', 'noopener');
    this.showToast(`Opening ${title}...`);
  },

  dest() {
    return this.destinations.find((d) => d.id === this.destId) || this.destinations[0];
  },

  toggleDest(event) {
    if (event) event.stopPropagation();
    this.destOpen = !this.destOpen;
    this.render();
  },

  setDest(id) {
    this.destId = id;
    this.destOpen = false;
    this.render();
  },

  mount() {
    this.render();
  },

  render() {
    const root = document.getElementById('tb-root');
    if (!root) return;
    const dest = this.dest();
    const rows = this.filtered().filter((t) => (t.dest || 'yerevan') === this.destId);
    const chips = this.categories.map((cat) => {
      const on = this.category === cat.id;
      return `<button type="button" onclick="TRAVEL_TOOLBOX.setCategory('${cat.id}')" class="px-3 py-1.5 rounded-lg whitespace-nowrap transition ${on ? 'bg-brand-gold text-slate-950 font-semibold' : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-brand-border'}">${this.escape(cat.label)}</button>`;
    }).join('');
    const cards = rows.length
      ? rows.map((t) => {
        const links = (t.links || []).map((l, i) => `<button type="button" onclick="TRAVEL_TOOLBOX.openLink('${this.escape(t.title).replace(/'/g, '')}','${this.escape(l.url)}')" class="text-[11px] bg-slate-950 hover:bg-slate-800 text-brand-gold px-2.5 py-1 rounded border border-brand-border">${this.escape(l.name)} ↗</button>`).join('');
        return `<article class="bg-brand-panel border border-brand-border hover:border-slate-600 rounded-xl p-4 flex flex-col justify-between transition group">
          <div>
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-slate-950 border border-brand-border text-brand-gold flex items-center justify-center text-base group-hover:border-brand-gold/50 transition">
                  <i class="fa-solid ${this.escape(t.icon)}"></i>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-100">${this.escape(t.title)}</h3>
                  <span class="text-[10px] text-slate-400">${this.escape(t.type)}</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded font-semibold border ${t.badgeColor}">${this.escape(t.status)}</span>
            </div>
            <p class="text-xs text-slate-400 leading-relaxed mb-4">${this.escape(t.description)}</p>
          </div>
          <div class="pt-3 border-t border-brand-border/80 flex items-center justify-between gap-2">
            <span class="text-[11px] font-medium text-slate-300"><i class="fa-solid fa-star text-brand-gold text-[10px] mr-1"></i>${this.escape(t.rating)}</span>
            <div class="flex items-center gap-2 flex-wrap justify-end">${links}</div>
          </div>
        </article>`;
      }).join('')
      : `<div class="col-span-full text-center py-12 text-slate-500 text-xs"><i class="fa-solid fa-toolbox text-3xl mb-2 text-slate-600 block"></i>${this.destId === 'yerevan' ? 'No tools matched your search criteria.' : `Tool intel for ${this.escape(dest.city)} is being compiled.`}</div>`;
    const destMenu = this.destinations.map((d) => {
      const on = d.id === this.destId;
      return `<button type="button" onclick="TRAVEL_TOOLBOX.setDest('${d.id}')" class="w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${on ? 'bg-brand-gold/15 text-brand-gold' : 'text-slate-200 hover:bg-slate-800'}">
        <span class="tb-flag ${d.flag}"></span>
        <span class="font-medium">${this.escape(d.city)}</span>
        <span class="text-slate-500">${this.escape(d.country)}</span>
      </button>`;
    }).join('');
    const toast = this.toast
      ? `<div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-brand-gold text-slate-950 px-4 py-2 rounded-lg font-semibold text-xs shadow-xl z-[420]">${this.escape(this.toast)}</div>`
      : '';
    root.innerHTML = `
      <div class="min-h-full bg-brand-black text-slate-100 flex flex-col">
        <header class="h-14 bg-brand-panel border-b border-brand-border flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand-gold text-slate-950 flex items-center justify-center font-bold text-lg">D</div>
            <div>
              <span class="text-xs text-brand-gold font-semibold tracking-wider uppercase block leading-none">Dimad OS</span>
              <span class="text-sm font-semibold text-slate-200">Travel Toolbox</span>
            </div>
          </div>
          <div class="flex items-center gap-2 bg-slate-950 border border-brand-border px-3 py-1.5 rounded-lg text-xs">
            <span class="tb-flag ${dest.flag}" title="${this.escape(dest.country)}"></span>
            <span class="font-medium text-slate-200">${this.escape(dest.chip)}</span>
            <span class="text-brand-gold text-[10px] bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/20">${dest.auto ? 'Auto-Detected' : 'Selected'}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative">
              <button type="button" onclick="TRAVEL_TOOLBOX.toggleDest(event)" class="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-brand-border ${this.destOpen ? 'border-brand-gold/50' : ''}">
                <i class="fa-solid fa-magnifying-glass text-brand-gold"></i>
                <span>Search Destinations</span>
                <i class="fa-solid fa-chevron-down text-[9px] text-slate-500"></i>
              </button>
              ${this.destOpen ? `<div class="absolute right-0 mt-1.5 w-56 bg-brand-panel border border-brand-border rounded-xl overflow-hidden shadow-2xl z-40">${destMenu}</div>` : ''}
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-950 border border-brand-border flex items-center justify-center text-xs font-medium text-brand-gold">AR</div>
          </div>
        </header>
        <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          <div class="bg-brand-panel border border-brand-border rounded-2xl p-5 relative overflow-hidden">
            <div class="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none"></div>
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="tb-flag ${dest.flag}" title="${this.escape(dest.country)}" style="width:1.6em;height:1.1em"></span>
                  <h1 class="text-xl sm:text-2xl font-bold text-slate-100">${this.escape(dest.city)} Travel Toolbox</h1>
                </div>
                <p class="text-xs text-slate-400">Verified regional apps, connectivity tools, emergency infrastructure, and specs for ${this.escape(dest.country)}.</p>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/80 border border-brand-border p-3 rounded-xl">
                <div class="space-y-0.5"><span class="text-[10px] text-slate-500 uppercase block font-semibold">Currency</span><span class="text-slate-200 font-bold">${this.escape(dest.currency)} <span class="text-brand-gold font-normal">${this.escape(dest.fx)}</span></span></div>
                <div class="space-y-0.5"><span class="text-[10px] text-slate-500 uppercase block font-semibold">Power Plugs</span><span class="text-slate-200 font-bold">${this.escape(dest.plugs)} <span class="text-slate-400 font-normal">(${this.escape(dest.volts)})</span></span></div>
                <div class="space-y-0.5"><span class="text-[10px] text-slate-500 uppercase block font-semibold">Emergency</span><span class="text-slate-200 font-bold">${this.escape(dest.emergency)} <span class="text-slate-400 font-normal">(${this.escape(dest.emergencyNote)})</span></span></div>
                <div class="space-y-0.5"><span class="text-[10px] text-slate-500 uppercase block font-semibold">Visa Policy</span><span class="text-emerald-400 font-bold">${this.escape(dest.visa)} <span class="text-slate-400 font-normal">(${this.escape(dest.visaNote)})</span></span></div>
              </div>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-brand-panel/60 p-2.5 rounded-xl border border-brand-border">
            <div class="relative w-full sm:w-72">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input id="tb-search" type="text" value="${this.escape(this.search)}" oninput="TRAVEL_TOOLBOX.search=this.value;TRAVEL_TOOLBOX._searchCaret=this.selectionStart;TRAVEL_TOOLBOX.render()" placeholder="Search apps, eSIMs, VPNs, delivery..." class="w-full bg-slate-950 border border-brand-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-gold">
            </div>
            <div id="tb-cats" class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">${chips}</div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>
        </main>
        ${toast}
      </div>`;
    const search = document.getElementById('tb-search');
    if (search && typeof this._searchCaret === 'number') {
      search.focus();
      const pos = Math.min(this._searchCaret, search.value.length);
      search.setSelectionRange(pos, pos);
    }
    if (this.destOpen) {
      setTimeout(() => document.addEventListener('click', () => {
        if (!this.destOpen) return;
        this.destOpen = false;
        this.render();
      }, { once: true }), 0);
    }
  }
};

window.TRAVEL_TOOLBOX = TRAVEL_TOOLBOX;

const LANGUAGE_KIT = {
  lang: 'hy',
  category: 'All',
  search: '',
  autoDetected: true,
  toast: '',
  toastTimer: null,
  categories: ['All', 'Greetings', 'Courtesy', 'Commerce', 'Dining', 'Navigation', 'Remote Work', 'Emergency'],
  languages: [
    { id: 'hy', name: 'Armenian', flag: 'lk-flag-am', bcp47: 'hy-AM', native: 'Հայերեն', country: 'Armenia (Yerevan)' },
    { id: 'en', name: 'English', flag: 'lk-flag-gb', bcp47: 'en-US', native: 'English', country: 'Global Standard' },
    { id: 'es', name: 'Spanish', flag: 'lk-flag-es', bcp47: 'es-ES', native: 'Español', country: 'Spain & Latin America' },
    { id: 'vi', name: 'Vietnamese', flag: 'lk-flag-vn', bcp47: 'vi-VN', native: 'Tiếng Việt', country: 'Vietnam' },
    { id: 'ban', name: 'Balinese', flag: 'lk-flag-id', bcp47: 'id-ID', native: 'Basa Bali', country: 'Bali, Indonesia' },
    { id: 'th', name: 'Thai', flag: 'lk-flag-th', bcp47: 'th-TH', native: 'ภาษาไทย', country: 'Thailand' }
  ],
  phrases: {
    hy: [
      { id: 1, native: 'Բարև', phonetic: 'Barev', english: 'Hello (Informal)', category: 'Greetings' },
      { id: 2, native: 'Բարև Ձեզ', phonetic: 'Barev Dzez', english: 'Hello (Formal)', category: 'Greetings' },
      { id: 3, native: 'Շնորհակալություն', phonetic: 'Shnorhakalutyun (or Mersi)', english: 'Thank you', category: 'Courtesy' },
      { id: 4, native: 'Խնդրեմ', phonetic: 'Khntrem', english: 'Please / You\'re welcome', category: 'Courtesy' },
      { id: 5, native: 'Այո / Ոչ', phonetic: 'Ayo / Voch', english: 'Yes / No', category: 'Greetings' },
      { id: 6, native: 'Կներեք', phonetic: 'Knerek', english: 'Excuse me / Sorry', category: 'Courtesy' },
      { id: 7, native: 'Ցտեսություն', phonetic: 'Tstesutyun', english: 'Goodbye', category: 'Greetings' },
      { id: 8, native: 'Ինչ արժի՞', phonetic: 'Inch arzhi?', english: 'How much does it cost?', category: 'Commerce' },
      { id: 9, native: 'Որտե՞ղ է զուգարանը', phonetic: 'Vorteg e zugaran-e?', english: 'Where is the bathroom?', category: 'Navigation' },
      { id: 10, native: 'Դուք անգլերեն գիտե՞ք', phonetic: 'Duk angleren gitek?', english: 'Do you speak English?', category: 'Courtesy' },
      { id: 11, native: 'Ես չեմ հասկանում', phonetic: 'Yes chem haskanum', english: 'I don\'t understand', category: 'Courtesy' },
      { id: 12, native: 'Օգնություն!', phonetic: 'Ognutyun!', english: 'Help!', category: 'Emergency' },
      { id: 13, native: 'Հաշիվ, խնդրեմ', phonetic: 'Hashiv, khntrem', english: 'The bill, please', category: 'Dining' },
      { id: 14, native: 'Ջուր', phonetic: 'Jur', english: 'Water', category: 'Dining' },
      { id: 15, native: 'Սուրճ', phonetic: 'Soorj', english: 'Coffee', category: 'Dining' },
      { id: 16, native: 'Wi-Fi ծածկագիրը', phonetic: 'Wi-Fi tsatskagir-e?', english: 'Wi-Fi password?', category: 'Remote Work' },
      { id: 17, native: 'Որտե՞ղ է...', phonetic: 'Vorteg e...?', english: 'Where is...?', category: 'Navigation' },
      { id: 18, native: 'Շատ համեղ է', phonetic: 'Shat hameg e', english: 'Very delicious', category: 'Dining' },
      { id: 19, native: 'Տաքսի', phonetic: 'Taksi', english: 'Taxi', category: 'Navigation' },
      { id: 20, native: 'Լավ', phonetic: 'Lav', english: 'Good / OK', category: 'Greetings' }
    ],
    en: [
      { id: 1, native: 'Hello / Hi', phonetic: 'heh-LOH / hai', english: 'Hello', category: 'Greetings' },
      { id: 2, native: 'Thank you', phonetic: 'THANGK yoo', english: 'Thank you', category: 'Courtesy' },
      { id: 3, native: 'Please', phonetic: 'pleez', english: 'Please', category: 'Courtesy' },
      { id: 4, native: 'You\'re welcome', phonetic: 'yoor WEL-kuhm', english: 'You\'re welcome', category: 'Courtesy' },
      { id: 5, native: 'Excuse me / Sorry', phonetic: 'ik-SKYOOZ mee', english: 'Excuse me', category: 'Courtesy' },
      { id: 6, native: 'Yes / No', phonetic: 'yes / noh', english: 'Yes / No', category: 'Greetings' },
      { id: 7, native: 'Goodbye', phonetic: 'good-BYE', english: 'Goodbye', category: 'Greetings' },
      { id: 8, native: 'How much is this?', phonetic: 'how muhch iz thihs?', english: 'How much is this?', category: 'Commerce' },
      { id: 9, native: 'Where is the bathroom?', phonetic: 'wair iz thuh BATH-room?', english: 'Where is the bathroom?', category: 'Navigation' },
      { id: 10, native: 'Do you speak English?', phonetic: 'doo yoo speek ING-glish?', english: 'Do you speak English?', category: 'Courtesy' },
      { id: 11, native: 'I don\'t understand', phonetic: 'ai dohnt uhn-der-STAND', english: 'I don\'t understand', category: 'Courtesy' },
      { id: 12, native: 'Help!', phonetic: 'HELP!', english: 'Help!', category: 'Emergency' },
      { id: 13, native: 'Check, please', phonetic: 'chek pleez', english: 'Check, please', category: 'Dining' },
      { id: 14, native: 'Water', phonetic: 'WAH-ter', english: 'Water', category: 'Dining' },
      { id: 15, native: 'Coffee', phonetic: 'KAH-fee', english: 'Coffee', category: 'Dining' },
      { id: 16, native: 'Wi-Fi password?', phonetic: 'WHY-fy PASS-wurd?', english: 'Wi-Fi password?', category: 'Remote Work' },
      { id: 17, native: 'Where is...?', phonetic: 'wair iz...?', english: 'Where is...?', category: 'Navigation' },
      { id: 18, native: 'Delicious', phonetic: 'dih-LISH-uhs', english: 'Delicious', category: 'Dining' },
      { id: 19, native: 'Left / Right', phonetic: 'left / ryt', english: 'Left / Right', category: 'Navigation' },
      { id: 20, native: 'OK / Good', phonetic: 'oh-KAY / good', english: 'OK / Good', category: 'Greetings' }
    ],
    es: [
      { id: 1, native: 'Hola', phonetic: 'OH-lah', english: 'Hello', category: 'Greetings' },
      { id: 2, native: 'Gracias', phonetic: 'GRAH-syahs', english: 'Thank you', category: 'Courtesy' },
      { id: 3, native: 'Por favor', phonetic: 'por fah-VOR', english: 'Please', category: 'Courtesy' },
      { id: 4, native: 'De nada', phonetic: 'deh NAH-dah', english: 'You\'re welcome', category: 'Courtesy' },
      { id: 5, native: 'Disculpa / Perdón', phonetic: 'dees-KOOL-pah / pehr-DOHN', english: 'Excuse me / Sorry', category: 'Courtesy' },
      { id: 6, native: 'Sí / No', phonetic: 'see / noh', english: 'Yes / No', category: 'Greetings' },
      { id: 7, native: 'Adiós / Chao', phonetic: 'ah-DYOHS', english: 'Goodbye', category: 'Greetings' },
      { id: 8, native: '¿Cuánto cuesta?', phonetic: 'KWAHN-toh KWEHS-tah?', english: 'How much does it cost?', category: 'Commerce' },
      { id: 9, native: '¿Dónde está el baño?', phonetic: 'DOHN-deh ehs-TAH el BAH-nyoh?', english: 'Where is the bathroom?', category: 'Navigation' },
      { id: 10, native: '¿Hablas inglés?', phonetic: 'AH-blahs een-GLEHS?', english: 'Do you speak English?', category: 'Courtesy' },
      { id: 11, native: 'No entiendo', phonetic: 'noh ehn-TYEHN-doh', english: 'I don\'t understand', category: 'Courtesy' },
      { id: 12, native: '¡Ayuda!', phonetic: 'ah-YOO-dah!', english: 'Help!', category: 'Emergency' },
      { id: 13, native: 'La cuenta, por favor', phonetic: 'lah KWEHN-tah por fah-VOR', english: 'The bill, please', category: 'Dining' },
      { id: 14, native: 'Agua', phonetic: 'AH-gwah', english: 'Water', category: 'Dining' },
      { id: 15, native: 'Café', phonetic: 'kah-FEH', english: 'Coffee', category: 'Dining' },
      { id: 16, native: '¿Clave de Wi-Fi?', phonetic: 'KLAH-veh deh WEE-fee?', english: 'Wi-Fi password?', category: 'Remote Work' },
      { id: 17, native: '¿Dónde está...?', phonetic: 'DOHN-deh ehs-TAH...?', english: 'Where is...?', category: 'Navigation' },
      { id: 18, native: 'Muy rico / Delicioso', phonetic: 'mwee REE-koh', english: 'Delicious', category: 'Dining' },
      { id: 19, native: 'Izquierda / Derecha', phonetic: 'ees-KYEHR-dah / deh-REH-chah', english: 'Left / Right', category: 'Navigation' },
      { id: 20, native: 'Bueno / Vale', phonetic: 'BWEH-noh / VAH-leh', english: 'Good / OK', category: 'Greetings' }
    ],
    vi: [
      { id: 1, native: 'Xin chào', phonetic: 'sin chow', english: 'Hello', category: 'Greetings' },
      { id: 2, native: 'Cảm ơn', phonetic: 'gahm un', english: 'Thank you', category: 'Courtesy' },
      { id: 3, native: 'Làm ơn', phonetic: 'lahm un', english: 'Please', category: 'Courtesy' },
      { id: 4, native: 'Không có gì', phonetic: 'khong go zee', english: 'You\'re welcome', category: 'Courtesy' },
      { id: 5, native: 'Xin lỗi', phonetic: 'seen loy', english: 'Excuse me / Sorry', category: 'Courtesy' },
      { id: 6, native: 'Có / Không', phonetic: 'saw / khong', english: 'Yes / No', category: 'Greetings' },
      { id: 7, native: 'Tạm biệt', phonetic: 'tam byet', english: 'Goodbye', category: 'Greetings' },
      { id: 8, native: 'Bao nhiêu tiền?', phonetic: 'bow new teen?', english: 'How much money?', category: 'Commerce' },
      { id: 9, native: 'Nhà vệ sinh ở đâu?', phonetic: 'nha vay sing uh dow?', english: 'Where is the restroom?', category: 'Navigation' },
      { id: 10, native: 'Bạn có nói tiếng Anh không?', phonetic: 'ban saw noy teeng anh khong?', english: 'Do you speak English?', category: 'Courtesy' },
      { id: 11, native: 'Tôi không hiểu', phonetic: 'toy khong heew', english: 'I don\'t understand', category: 'Courtesy' },
      { id: 12, native: 'Cứu tôi với!', phonetic: 'koo toy voy!', english: 'Help me!', category: 'Emergency' },
      { id: 13, native: 'Tính tiền', phonetic: 'ting teen', english: 'Check / Bill, please', category: 'Dining' },
      { id: 14, native: 'Nước', phonetic: 'nu-uk', english: 'Water', category: 'Dining' },
      { id: 15, native: 'Cà phê', phonetic: 'ca phe', english: 'Coffee', category: 'Dining' },
      { id: 16, native: 'Mật khẩu Wi-Fi?', phonetic: 'mat khow Wi-Fi?', english: 'Wi-Fi password?', category: 'Remote Work' },
      { id: 17, native: 'Ở đâu...?', phonetic: 'uh dow...?', english: 'Where is...?', category: 'Navigation' },
      { id: 18, native: 'Ngon quá!', phonetic: 'ngon qua!', english: 'Very delicious!', category: 'Dining' },
      { id: 19, native: 'Trái / Phải', phonetic: 'chai / fie', english: 'Left / Right', category: 'Navigation' },
      { id: 20, native: 'Được', phonetic: 'du-uk', english: 'OK / Good', category: 'Greetings' }
    ],
    ban: [
      { id: 1, native: 'Om Swastiastu', phonetic: 'Om Swas-tee-as-too', english: 'Hello (Spiritual Greeting)', category: 'Greetings' },
      { id: 2, native: 'Suksma', phonetic: 'Sooks-MA', english: 'Thank you', category: 'Courtesy' },
      { id: 3, native: 'Suksma mewali', phonetic: 'Sooks-MA meh-WAH-lee', english: 'You\'re welcome', category: 'Courtesy' },
      { id: 4, native: 'Ampurayang', phonetic: 'Ahms-poo-rah-yahng', english: 'Excuse me / Sorry', category: 'Courtesy' },
      { id: 5, native: 'Ainggih / Nenten', phonetic: 'Ahng-geeh / NEN-ten', english: 'Yes / No', category: 'Greetings' },
      { id: 6, native: 'Mepamit', phonetic: 'Meh-PAH-meet', english: 'Goodbye', category: 'Greetings' },
      { id: 7, native: 'Kuda hargane?', phonetic: 'Koo-dah har-GAH-neh?', english: 'How much does it cost?', category: 'Commerce' },
      { id: 8, native: 'Dija WC?', phonetic: 'DEE-jah WC?', english: 'Where is the toilet?', category: 'Navigation' },
      { id: 9, native: 'Punapi Gatra?', phonetic: 'Poo-NAH-pee GAH-trah?', english: 'How are you?', category: 'Greetings' },
      { id: 10, native: 'Nenten ngidang', phonetic: 'NEN-ten ngih-dahng', english: 'I don\'t understand', category: 'Courtesy' },
      { id: 11, native: 'Tulung!', phonetic: 'Too-loong!', english: 'Help!', category: 'Emergency' },
      { id: 12, native: 'Mumpung / Numbas', phonetic: 'Noom-bahs', english: 'Bill / To buy', category: 'Dining' },
      { id: 13, native: 'Toya', phonetic: 'TOH-yah', english: 'Water', category: 'Dining' },
      { id: 14, native: 'Kopi', phonetic: 'KOH-pee', english: 'Coffee', category: 'Dining' },
      { id: 15, native: 'Jaen', phonetic: 'JAH-en', english: 'Delicious', category: 'Dining' },
      { id: 16, native: 'Dija...?', phonetic: 'DEE-jah...?', english: 'Where is...?', category: 'Navigation' },
      { id: 17, native: 'Rahajeng semeng', phonetic: 'Rah-HAH-jeng seh-MENG', english: 'Good morning', category: 'Greetings' },
      { id: 18, native: 'Bli / Mbok', phonetic: 'Blee / M-bok', english: 'Sir (Male) / Ma\'am (Female)', category: 'Courtesy' },
      { id: 19, native: 'Sampun', phonetic: 'Sahm-POON', english: 'No, thank you (Polite refusal)', category: 'Courtesy' },
      { id: 20, native: 'Bagus', phonetic: 'Bah-GOOS', english: 'Good / Great', category: 'Greetings' }
    ],
    th: [
      { id: 1, native: 'สวัสดี', phonetic: 'sa-wat-dee (khrap/kha)', english: 'Hello', category: 'Greetings' },
      { id: 2, native: 'ขอบคุณ', phonetic: 'khob-khun (khrap/kha)', english: 'Thank you', category: 'Courtesy' },
      { id: 3, native: 'กรุณา', phonetic: 'ka-roo-nah', english: 'Please', category: 'Courtesy' },
      { id: 4, native: 'ยินดี', phonetic: 'yin-dee', english: 'You\'re welcome', category: 'Courtesy' },
      { id: 5, native: 'ขอโทษ', phonetic: 'khaw-thot (khrap/kha)', english: 'Excuse me / Sorry', category: 'Courtesy' },
      { id: 6, native: 'ใช่ / ไม่ใช่', phonetic: 'chai / mai-chai', english: 'Yes / No', category: 'Greetings' },
      { id: 7, native: 'ลาก่อน', phonetic: 'lah-gohn', english: 'Goodbye', category: 'Greetings' },
      { id: 8, native: 'เท่าไหร่?', phonetic: 'thao-rai?', english: 'How much?', category: 'Commerce' },
      { id: 9, native: 'ห้องน้ำอยู่ที่ไหน?', phonetic: 'hong-nam yuu thii-nai?', english: 'Where is the restroom?', category: 'Navigation' },
      { id: 10, native: 'พูดภาษาอังกฤษได้ไหม?', phonetic: 'phoot ang-grit dai mai?', english: 'Do you speak English?', category: 'Courtesy' },
      { id: 11, native: 'ไม่เข้าใจ', phonetic: 'mai khaw-jai', english: 'I don\'t understand', category: 'Courtesy' },
      { id: 12, native: 'ช่วยด้วย!', phonetic: 'chuay duay!', english: 'Help!', category: 'Emergency' },
      { id: 13, native: 'เช็คบิล ด้วย', phonetic: 'chek-bin duay', english: 'The bill, please', category: 'Dining' },
      { id: 14, native: 'น้ำเปล่า', phonetic: 'nam-plao', english: 'Still water', category: 'Dining' },
      { id: 15, native: 'กาแฟ', phonetic: 'gah-fae', english: 'Coffee', category: 'Dining' },
      { id: 16, native: 'รหัสไวไฟ?', phonetic: 'ra-hat why-fy?', english: 'Wi-Fi password?', category: 'Remote Work' },
      { id: 17, native: '...อยู่ที่ไหน?', phonetic: '...yuu thii-nai?', english: 'Where is...?', category: 'Navigation' },
      { id: 18, native: 'อร่อย', phonetic: 'a-roi', english: 'Delicious', category: 'Dining' },
      { id: 19, native: 'ไม่เผ็ด', phonetic: 'mai-phet', english: 'Not spicy', category: 'Dining' },
      { id: 20, native: 'ดี', phonetic: 'dee', english: 'Good / OK', category: 'Greetings' }
    ]
  },

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  langObj() {
    return this.languages.find((l) => l.id === this.lang) || this.languages[0];
  },

  filtered() {
    const rows = this.phrases[this.lang] || [];
    const q = this.search.trim().toLowerCase();
    return rows.filter((item) => {
      const catOk = this.category === 'All' || item.category === this.category;
      const qOk = !q || item.native.toLowerCase().includes(q) || item.phonetic.toLowerCase().includes(q) || item.english.toLowerCase().includes(q);
      return catOk && qOk;
    });
  },

  showToast(msg) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.render();
    }, 2500);
    this.render();
  },

  setLang(id) {
    const lang = this.languages.find((l) => l.id === id);
    this.lang = id;
    this.autoDetected = false;
    this.showToast(`Switched to ${lang ? lang.name : id}`);
  },

  setCategory(cat) {
    this.category = cat;
    this.render();
  },

  setSearch(value) {
    this.search = value;
    this.render();
  },

  clearFilters() {
    this.category = 'All';
    this.search = '';
    this.render();
  },

  keepArmenian() {
    this.lang = 'hy';
    this.autoDetected = false;
    this.showToast('Location pinned to Yerevan.');
  },

  dismissBanner() {
    this.autoDetected = false;
    this.render();
  },

  copy(id) {
    const item = (this.phrases[this.lang] || []).find((p) => p.id === id);
    if (!item) return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(item.native);
    this.showToast(`Copied "${item.english}" to clipboard!`);
  },

  speak(id) {
    const item = (this.phrases[this.lang] || []).find((p) => p.id === id);
    if (!item) return;
    if (!('speechSynthesis' in window)) {
      this.showToast('Web Speech API not supported on your browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(item.native);
    utterance.lang = this.langObj().bcp47;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    this.showToast('Speaking phrase out loud...');
  },

  mount() {
    this.render();
  },

  render() {
    const root = document.getElementById('lk-root');
    if (!root) return;
    const active = this.langObj();
    const rows = this.phrases[this.lang] || [];
    const langCards = this.languages.map((lang) => {
      const on = this.lang === lang.id;
      return `<button type="button" onclick="LANGUAGE_KIT.setLang('${lang.id}')" class="p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${on ? 'bg-brand-panel border-brand-gold text-white ring-1 ring-brand-gold' : 'bg-brand-panel/60 border-brand-border text-slate-400 hover:text-slate-200 hover:border-slate-600'}">
        <div class="flex items-center justify-between mb-1">
          <span class="lk-flag ${lang.flag}"></span>
          ${on ? '<span class="w-2 h-2 rounded-full bg-brand-gold"></span>' : ''}
        </div>
        <div>
          <p class="text-xs font-bold leading-none text-slate-100">${this.escape(lang.name)}</p>
          <p class="lk-native text-[10px] text-slate-400 mt-1">${this.escape(lang.native)}</p>
        </div>
      </button>`;
    }).join('');
    const cards = rows.length
      ? `<div class="bg-brand-panel border border-brand-border rounded-2xl overflow-hidden overflow-x-auto">
          <div class="min-w-[640px]">
            <div class="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_5.5rem] gap-3 px-4 py-2 border-b border-brand-border text-[10px] uppercase tracking-wider font-bold text-slate-500">
              <span>#</span><span>English</span><span>Phonetic</span><span>Native</span><span class="text-right">Actions</span>
            </div>
            ${rows.map((item, i) => `<div class="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_5.5rem] gap-3 items-center px-4 py-2.5 ${i ? 'border-t border-brand-border/70' : ''} hover:bg-brand-gold/5">
              <span class="text-[10px] font-mono text-slate-500">${String(i + 1).padStart(2, '0')}</span>
              <span class="text-xs text-slate-200">${this.escape(item.english)}</span>
              <span class="text-[11px] font-mono text-brand-gold/90">${this.escape(item.phonetic)}</span>
              <span class="lk-native text-sm font-bold text-white leading-snug">${this.escape(item.native)}</span>
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" onclick="LANGUAGE_KIT.speak(${item.id})" class="w-7 h-7 rounded-lg bg-slate-950 hover:bg-brand-gold hover:text-slate-950 text-slate-400 border border-brand-border flex items-center justify-center" title="Speak Phrase Out Loud"><i class="fa-solid fa-volume-high text-xs"></i></button>
                <button type="button" onclick="LANGUAGE_KIT.copy(${item.id})" class="w-7 h-7 rounded-lg bg-slate-950 hover:bg-brand-gold hover:text-slate-950 text-slate-400 border border-brand-border flex items-center justify-center" title="Copy Native Script"><i class="fa-regular fa-copy text-xs"></i></button>
              </div>
            </div>`).join('')}
          </div>
        </div>`
      : `<div class="text-center py-16 bg-brand-panel/40 rounded-2xl border border-dashed border-brand-border space-y-3">
          <i class="fa-solid fa-book-open text-3xl text-slate-600"></i>
          <p class="text-xs text-slate-400 font-medium">No survival phrases loaded for this language.</p>
        </div>`;
    const banner = this.autoDetected
      ? `<div class="bg-gradient-to-r from-brand-panel via-brand-panel to-amber-950/40 border border-brand-gold/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center shrink-0"><span class="lk-flag lk-flag-am"></span></div>
            <div>
              <h2 class="text-xs font-bold text-brand-gold uppercase tracking-wider flex items-center gap-1.5"><i class="fa-solid fa-location-crosshairs"></i> Geolocation Auto-Detected</h2>
              <p class="text-xs text-slate-300 font-medium mt-0.5">Welcome to Yerevan, Armenia! We've automatically loaded your <b>Armenian (Հայերեն)</b> phrase kit.</p>
            </div>
          </div>
          <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button type="button" onclick="LANGUAGE_KIT.keepArmenian()" class="text-xs font-bold bg-brand-gold text-slate-950 hover:bg-amber-400 px-3 py-1.5 rounded-xl">Keep Armenian</button>
            <button type="button" onclick="LANGUAGE_KIT.dismissBanner()" class="text-xs text-slate-400 hover:text-white px-2 py-1.5">Dismiss</button>
          </div>
        </div>`
      : '';
    const toast = this.toast
      ? `<div class="fixed bottom-6 right-6 z-[420] flex items-center gap-2 bg-brand-gold text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl"><i class="fa-solid fa-circle-check"></i><span>${this.escape(this.toast)}</span></div>`
      : '';
    root.innerHTML = `
      <div class="min-h-full bg-brand-black text-slate-100 flex flex-col">
        <header class="sticky top-0 z-30 bg-brand-panel/90 backdrop-blur-md border-b border-brand-border px-4 md:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <i class="fa-solid fa-language text-lg"></i>
            </div>
            <div>
              <h1 class="font-extrabold text-base tracking-tight text-white leading-none">LANGUAGE SURVIVAL KIT</h1>
              <p class="text-[10px] text-slate-400 font-medium">Essential quick-phrases navigating new countries</p>
            </div>
          </div>
          <div class="flex items-center gap-2 bg-slate-950 border border-brand-border px-3 py-1.5 rounded-xl text-xs">
            <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
            <span class="text-slate-400">Location:</span>
            <span class="font-semibold text-slate-200">Yerevan, Armenia</span>
            <span class="text-[10px] font-mono bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><span class="lk-flag lk-flag-am"></span> ${this.escape(active.name)}</span>
          </div>
        </header>
        <main class="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
          ${banner}
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
              <span>Select Target Language (${this.languages.length})</span>
              <span>Active Dialect: <strong class="text-brand-gold">${this.escape(active.country)}</strong></span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">${langCards}</div>
          </div>
          <div>${cards}</div>
        </main>
        <footer class="border-t border-brand-border bg-brand-black py-6 px-4 text-center text-xs text-slate-500">
          <p>© 2026 Dimad OS — Global Language Survival &amp; Geolocation Stack.</p>
        </footer>
        ${toast}
      </div>`;
  }
};

window.LANGUAGE_KIT = LANGUAGE_KIT;

let calendarClickCount = 0;

const CALENDAR_HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);

const DIMAD_CAL = {
  storageKey: 'dimad_calendar_events',
  mode: 'hourly',
  dayOffset: 0,
  editingId: '',

  load() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (Array.isArray(rows)) return rows;
    } catch (err) { /* empty */ }
    return [];
  },

  persist(rows) {
    localStorage.setItem(this.storageKey, JSON.stringify(rows));
  },

  contentFilterKey: 'dimad_cal_show_content',

  showContentSchedule() {
    try { return localStorage.getItem(this.contentFilterKey) !== '0'; }
    catch (err) { return true; }
  },

  setShowContent(on) {
    localStorage.setItem(this.contentFilterKey, on ? '1' : '0');
    ['cal-show-content', 'cs-cal-show-content'].forEach((id) => {
      const box = document.getElementById(id);
      if (box) box.checked = !!on;
    });
    this.renderFull();
    if (typeof CALENDAR_NAV !== 'undefined') CALENDAR_NAV.render();
  },

  schedulerOverlay() {
    if (!this.showContentSchedule() || typeof SCHEDULER === 'undefined') return [];
    return SCHEDULER.load().filter((item) => item.date).map((item) => ({
      id: `sch-${item.id}`,
      title: `${item.platform}: ${item.title}`,
      date: item.date,
      startTime: item.time || '12:00',
      endTime: this.calculateEndTime(item.time || '12:00'),
      time: item.time || '12:00',
      type: 'content',
      source: 'Content Scheduler',
      tone: 'sky',
      cancelled: !!item.cancelled
    }));
  },

  contentToggleHtml() {
    const on = this.showContentSchedule();
    return `<label class="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 cursor-pointer select-none px-2 py-1 rounded-lg border border-slate-700 bg-slate-950/60">
      <input type="checkbox" ${on ? 'checked' : ''} onchange="DIMAD_CAL.setShowContent(this.checked)" class="accent-amber-500">
      Content schedule
    </label>`;
  },

  escape(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  anchorDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + this.dayOffset);
    return d;
  },

  eventsListForDay(date) {
    const key = typeof date === 'string' ? date : this.dateKey(date);
    const stored = this.load().filter((ev) => ev.date === key);
    const overlay = this.schedulerOverlay().filter((ev) => ev.date === key);
    return stored.concat(overlay);
  },

  eventsForDay(date) {
    const map = {};
    this.eventsListForDay(date).forEach((ev) => {
      const time = ev.startTime || ev.time;
      if (!time) return;
      map[time] = { ...ev, title: ev.title, source: ev.source || 'DIMAD Calendar', tone: ev.tone || 'amber', id: ev.id, notes: ev.notes, reminder: ev.reminder, type: ev.type, endTime: ev.endTime, startTime: time, cancelled: !!ev.cancelled };
    });
    return map;
  },

  upcoming() {
    const now = Date.now();
    return this.load().concat(this.schedulerOverlay()).map((ev) => {
      const start = new Date(`${ev.date}T${ev.startTime || ev.time}:00`);
      return { ...ev, start };
    }).filter((ev) => ev.start.getTime() >= now - 3600000).sort((a, b) => a.start - b.start).slice(0, 12);
  },

  toMinutes(hhmm) {
    const parts = String(hhmm || '').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  },

  eventStartHour(ev) {
    return Math.floor(this.toMinutes(ev.startTime || ev.time) / 60);
  },

  eventEndExclusiveHour(ev) {
    const endM = this.toMinutes(ev.endTime || this.calculateEndTime(ev.startTime || ev.time));
    if (endM <= this.toMinutes(ev.startTime || ev.time)) return this.eventStartHour(ev) + 1;
    return endM % 60 === 0 ? endM / 60 : Math.ceil(endM / 60);
  },

  coversHour(ev, hour) {
    const startM = this.toMinutes(ev.startTime || ev.time);
    const endM = this.toMinutes(ev.endTime || this.calculateEndTime(ev.startTime || ev.time));
    return startM < (hour + 1) * 60 && endM > hour * 60;
  },

  spanHours(ev, colStart = 0, colEnd = 24) {
    const startH = Math.max(colStart, this.eventStartHour(ev));
    const endH = Math.min(colEnd, this.eventEndExclusiveHour(ev));
    return Math.max(1, endH - startH);
  },

  visibleStartHour(ev, colStart = 0) {
    return Math.max(colStart, this.eventStartHour(ev));
  },

  HOUR_PX: 32,

  renderHourColumn(dateKey, hours, events, opts) {
    const options = opts || {};
    const showGutter = options.showGutter !== false;
    const colStart = hours[0] * 60;
    const colEnd = (hours[hours.length - 1] + 1) * 60;
    const hourPx = this.HOUR_PX;
    const height = hours.length * hourPx;
    const gutter = hours.map((h) => {
      const label = `${String(h).padStart(2, '0')}:00`;
      return `<div class="text-[10px] font-mono text-slate-500 border-t border-slate-800/80" style="height:${hourPx}px;line-height:${hourPx}px">${label}</div>`;
    }).join('');
    const empties = hours.map((h) => {
      const time = `${String(h).padStart(2, '0')}:00`;
      const slotClick = options.slotFn
        ? `${options.slotFn}('${dateKey}','${time}')`
        : `DIMAD_CAL.openComposer({date:'${dateKey}',time:'${time}'})`;
      return `<button type="button" onclick="${slotClick}" class="block w-full border-t border-dashed border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition" style="height:${hourPx}px" title="Add event at ${time}"></button>`;
    }).join('');
    const blocks = (events || []).map((ev) => {
      const start = this.toMinutes(ev.startTime || ev.time);
      const endRaw = this.toMinutes(ev.endTime || this.calculateEndTime(ev.startTime || ev.time));
      const end = endRaw > start ? endRaw : start + 60;
      if (end <= colStart || start >= colEnd) return '';
      const visStart = Math.max(start, colStart);
      const visEnd = Math.min(end, colEnd);
      const top = ((visStart - colStart) / 60) * hourPx + 1;
      const hgt = Math.max(18, ((visEnd - visStart) / 60) * hourPx - 3);
      const content = ev.type === 'content' || ev.source === 'Content Scheduler' || ev.tone === 'sky';
      const indigo = ev.type === 'meeting' || ev.source === 'Calendly' || ev.tone === 'indigo';
      const wrap = content
        ? 'bg-sky-500/20 border-sky-500/40'
        : indigo ? 'bg-brand-gold/20 border-brand-gold/40' : 'bg-amber-500/20 border-amber-500/40';
      const startLabel = this.clockValue(ev.startTime || ev.time);
      const endLabel = this.clockValue(ev.endTime || this.calculateEndTime(ev.startTime || ev.time));
      const safeTitle = this.escape(ev.title);
      const cancelledCls = ev.cancelled ? ' line-through opacity-60' : '';
      const evId = ev.id || '';
      return `<button type="button" ${this.eventPointerAttrs(evId)} class="absolute left-0 right-0 ${wrap}${cancelledCls} border rounded-md px-1.5 text-left overflow-hidden z-[1] hover:brightness-110" style="top:${top}px;height:${hgt}px">
        <div class="text-[10px] font-semibold text-slate-100 truncate leading-tight pt-0.5">${safeTitle}</div>
        <div class="text-[8px] font-mono text-slate-300/90">${startLabel}–${endLabel}</div>
      </button>`;
    }).join('');
    const lane = `<div class="relative min-w-0" style="height:${height}px">
      <div class="absolute inset-0">${empties}</div>
      ${blocks}
    </div>`;
    if (!showGutter) return lane;
    return `<div class="grid grid-cols-[42px_minmax(0,1fr)] gap-x-1" style="height:${height}px">
      <div class="select-none">${gutter}</div>
      ${lane}
    </div>`;
  },

  calculateEndTime(startTime) {
    const [hours, minutes] = String(startTime).split(':').map(Number);
    const nextHour = ((hours || 0) + 1) % 24;
    return `${String(nextHour).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
  },

  hasConflict(date, startTime, endTime, ignoreId) {
    const start = this.toMinutes(startTime);
    const end = this.toMinutes(endTime || this.calculateEndTime(startTime));
    return this.load().some((ev) => {
      if (ev.cancelled || (ignoreId && String(ev.id) === String(ignoreId)) || ev.date !== date) return false;
      const evStart = this.toMinutes(ev.startTime || ev.time);
      const evEnd = this.toMinutes(ev.endTime || this.calculateEndTime(ev.startTime || ev.time));
      return start < evEnd && end > evStart;
    });
  },

  addEvent(eventData) {
    if (!eventData || !eventData.title || !eventData.date || !(eventData.startTime || eventData.time)) {
      alert('Please provide a title, date, and start time.');
      return false;
    }
    const startTime = eventData.startTime || eventData.time;
    const endTime = eventData.endTime || this.calculateEndTime(startTime);
    const rows = this.load();
    const existingId = eventData.id || '';
    const idx = existingId ? rows.findIndex((ev) => String(ev.id) === String(existingId)) : -1;
    if (this.hasConflict(eventData.date, startTime, endTime, idx >= 0 ? existingId : undefined)) {
      alert('That slot overlaps another event. Choose a free time.');
      return false;
    }
    const payload = {
      id: existingId || `evt_${Date.now()}`,
      title: eventData.title,
      date: eventData.date,
      startTime,
      endTime,
      time: startTime,
      type: eventData.type || 'task',
      source: eventData.source || (idx >= 0 ? rows[idx].source : 'Manual Entry'),
      notes: eventData.notes || '',
      reminder: eventData.reminder || 'none',
      tone: eventData.tone || (idx >= 0 ? rows[idx].tone : 'amber'),
      reminded: false,
      cancelled: eventData.cancelled != null ? !!eventData.cancelled : (idx >= 0 ? !!rows[idx].cancelled : false)
    };
    if (idx >= 0) rows[idx] = { ...rows[idx], ...payload };
    else rows.push(payload);
    this.persist(rows);
    if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.syncFromStore();
    return true;
  },

  deleteEvent(eventId) {
    this.persist(this.load().filter((ev) => String(ev.id) !== String(eventId)));
    if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.syncFromStore();
    this.refreshViews();
  },

  eventPointerAttrs(id) {
    const safe = String(id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `onclick="event.stopPropagation()" ondblclick="event.stopPropagation(); DIMAD_CAL.openEvent('${safe}')" oncontextmenu="event.preventDefault(); event.stopPropagation(); DIMAD_CAL.openContextMenu(event, '${safe}')"`;
  },

  bindUi() {
    if (this._uiBound) return;
    this._uiBound = true;
    document.addEventListener('click', () => this.closeContextMenu());
    document.addEventListener('scroll', () => this.closeContextMenu(), true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeContextMenu();
    });
  },

  findAny(id) {
    const sid = String(id || '');
    if (!sid) return null;
    if (sid.startsWith('sch-') && typeof SCHEDULER !== 'undefined') {
      const item = SCHEDULER.load().find((row) => String(row.id) === sid.slice(4));
      if (!item) return null;
      return {
        id: sid,
        title: `${item.platform}: ${item.title}`,
        displayTitle: item.title,
        date: item.date,
        startTime: item.time || '12:00',
        endTime: this.calculateEndTime(item.time || '12:00'),
        type: 'content',
        source: 'Content Scheduler',
        notes: item.notes || '',
        cancelled: !!item.cancelled,
        origin: 'scheduler',
        originId: item.id
      };
    }
    if (sid.startsWith('pcal-') && typeof SCHEDULER !== 'undefined') {
      const item = SCHEDULER.loadProd().find((row) => String(row.id) === sid.slice(5));
      if (!item) return null;
      return {
        id: sid,
        title: `${item.stage}: ${item.title}`,
        displayTitle: item.title,
        date: item.dueDate,
        startTime: '09:00',
        endTime: '10:00',
        type: 'production',
        source: 'Production Calendar',
        cancelled: !!item.cancelled,
        origin: 'production',
        originId: item.id
      };
    }
    const stored = this.load().find((row) => String(row.id) === sid);
    if (stored) return { ...stored, origin: 'calendar', displayTitle: stored.title };
    return null;
  },

  refreshViews() {
    this.renderFull();
    if (typeof CALENDAR_NAV !== 'undefined') CALENDAR_NAV.render();
    if (typeof SCHEDULER !== 'undefined' && SCHEDULER.render) {
      try { SCHEDULER.render(); } catch (err) { /* tab may be unmounted */ }
    }
  },

  openContextMenu(evt, id) {
    this.bindUi();
    this.menuEventId = String(id || '');
    const menu = document.getElementById('dimad-cal-ctx');
    if (!menu || !this.menuEventId) return;
    menu.classList.remove('hidden');
    const x = Math.min(evt.clientX, window.innerWidth - 180);
    const y = Math.min(evt.clientY, window.innerHeight - 130);
    menu.style.left = `${Math.max(8, x)}px`;
    menu.style.top = `${Math.max(8, y)}px`;
  },

  closeContextMenu() {
    const menu = document.getElementById('dimad-cal-ctx');
    if (menu) menu.classList.add('hidden');
  },

  ctxAction(action) {
    const id = this.menuEventId;
    this.closeContextMenu();
    if (!id) return;
    if (action === 'edit') this.openEvent(id);
    else if (action === 'cancel') this.cancelEvent(id);
    else if (action === 'delete') this.askDelete(id);
  },

  cancelEvent(id) {
    const rec = this.findAny(id);
    if (!rec) return;
    if (rec.origin === 'scheduler' && typeof SCHEDULER !== 'undefined') SCHEDULER.patch(rec.originId, { cancelled: true });
    else if (rec.origin === 'production' && typeof SCHEDULER !== 'undefined') SCHEDULER.patchProd(rec.originId, { cancelled: true });
    else {
      const rows = this.load().map((ev) => String(ev.id) === String(id) ? { ...ev, cancelled: true } : ev);
      this.persist(rows);
      if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.syncFromStore();
    }
    this.closeComposer();
    this.refreshViews();
  },

  cancelFromComposer() {
    const id = document.getElementById('cal-event-id')?.value || this.editingId;
    if (id) this.cancelEvent(id);
  },

  askDelete(id) {
    this.pendingDeleteId = String(id || '');
    const modal = document.getElementById('dimad-cal-delete-confirm');
    if (!this.pendingDeleteId || !modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  confirmDelete(yes) {
    const modal = document.getElementById('dimad-cal-delete-confirm');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    const id = this.pendingDeleteId;
    this.pendingDeleteId = '';
    if (!yes || !id) return;
    this.deleteEverywhere(id);
  },

  deleteEverywhere(id) {
    const rec = this.findAny(id);
    if (rec && rec.origin === 'scheduler' && typeof SCHEDULER !== 'undefined') SCHEDULER.remove(rec.originId);
    else if (rec && rec.origin === 'production' && typeof SCHEDULER !== 'undefined') SCHEDULER.removeProd(rec.originId);
    else this.persist(this.load().filter((ev) => String(ev.id) !== String(id)));
    if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.syncFromStore();
    this.closeComposer();
    this.refreshViews();
  },

  openEventSource() {
    const rec = this.findAny(this.editingId);
    this.closeComposer();
    if (!rec) return;
    if (rec.origin === 'scheduler' && typeof switchTab === 'function') {
      switchTab('creator-scheduler');
      if (typeof SCHEDULER !== 'undefined') {
        SCHEDULER.expandedId = String(rec.originId);
        if (SCHEDULER.setView) SCHEDULER.setView('list');
      }
      return;
    }
    if (rec.origin === 'production' && typeof switchTab === 'function') {
      switchTab('creator-scheduler');
      if (typeof SCHEDULER !== 'undefined') {
        SCHEDULER.expandedId = String(rec.originId);
        if (SCHEDULER.setCalKind) SCHEDULER.setCalKind('production');
      }
    }
  },

  openFromCommandCenter(opts) {
    const options = opts || {};
    if (options.dateKey) {
      const [y, m, d] = options.dateKey.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.dayOffset = Math.round((target - today) / 86400000);
    } else if (typeof CALENDAR_NAV !== 'undefined') {
      this.dayOffset = CALENDAR_NAV.dayOffset || 0;
    }
    const incoming = options.mode || (typeof CALENDAR_NAV !== 'undefined' ? CALENDAR_NAV.mode : 'day');
    this.mode = incoming === 'hourly' ? 'day' : incoming === 'weekly' ? 'week' : incoming === 'monthly' ? 'month' : incoming;
    if (typeof switchTab === 'function') switchTab('dimad-calendar');
    else this.renderFull();
  },

  setMode(mode) {
    this.mode = mode === 'week' || mode === 'weekly' ? 'week' : mode === 'month' || mode === 'monthly' ? 'month' : 'day';
    this.renderFull();
  },

  goToday() {
    this.dayOffset = 0;
    this.renderFull();
  },

  shift(dir) {
    if (this.mode === 'monthly') {
      const d = this.anchorDate();
      d.setMonth(d.getMonth() + dir);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.dayOffset = Math.round((d - today) / 86400000);
    } else if (this.mode === 'weekly') {
      this.dayOffset += dir * 7;
    } else {
      this.dayOffset += dir;
    }
    this.renderFull();
  },

  tzLabel() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch (err) { return 'UTC'; }
  },

  renderFull() {
    ensureDimadCalendar();
    if (typeof dimadCal !== 'undefined' && dimadCal) {
      dimadCal.currentDate = this.anchorDate();
      dimadCal.currentView = this.mode === 'week' || this.mode === 'weekly' ? 'week' : this.mode === 'month' || this.mode === 'monthly' ? 'month' : 'day';
      dimadCal.syncFromStore();
    }
    this.renderAgenda();
    this.fillTimeSelect();
  },

  dayHtml(date) {
    const booked = Object.assign({}, CALENDAR_NAV.bookedForDay(date));
    const col = (hours) => hours.map((time) => {
      const ev = booked[time];
      if (ev) {
        return `<button type="button" ${this.eventPointerAttrs(ev.id || '')} class="w-full text-left bg-amber-500/10 border border-amber-500/30 h-7 px-1.5 rounded-md flex items-center gap-2 my-px ${ev.cancelled ? 'line-through opacity-60' : ''}">
          <span class="text-[10px] font-mono text-amber-400 w-[42px]">${time}</span>
          <span class="text-[11px] font-semibold text-slate-200 truncate">${CALENDAR_NAV.escape(ev.title)}</span>
        </button>`;
      }
      return `<button type="button" onclick="DIMAD_CAL.openComposer({date:'${this.dateKey(date)}',time:'${time}'})" class="group w-full h-7 flex items-center gap-2 px-0.5">
        <span class="text-[10px] font-mono text-slate-500 w-[42px]">${time}</span>
        <span class="flex-1 border-t border-dashed border-slate-700 group-hover:border-amber-500/50"></span>
        <span class="text-[9px] text-slate-500 group-hover:text-amber-400">add event</span>
      </button>`;
    }).join('');
    return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4"><div>${col(CALENDAR_HOURS.slice(0, 12))}</div><div>${col(CALENDAR_HOURS.slice(12))}</div></div>`;
  },

  weekHtml(start) {
    const todayKey = this.dateKey(new Date());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    return `<div class="grid grid-cols-7 gap-1">${days.map((d) => {
      const key = this.dateKey(d);
      const booked = CALENDAR_NAV.bookedForDay(d);
      const items = Object.keys(booked).sort().slice(0, 4).map((time) => {
        const ev = booked[time];
        return `<div ${this.eventPointerAttrs(ev.id || '')} class="bg-amber-500/15 text-amber-200 rounded px-1 py-0.5 text-[8px] truncate ${ev.cancelled ? 'line-through opacity-60' : ''}">${time} ${CALENDAR_NAV.escape(ev.title)}</div>`;
      }).join('');
      const isToday = key === todayKey;
      return `<button type="button" onclick="DIMAD_CAL.openComposer({date:'${key}'})" class="text-left min-h-[120px] rounded-lg border ${isToday ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-950/40'} p-1.5 space-y-1">
        <div class="flex justify-between"><span class="text-[9px] text-slate-500">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span><span class="text-[11px] font-semibold ${isToday ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</span></div>
        ${items || '<div class="text-[8px] text-slate-600 italic">add event</div>'}
      </button>`;
    }).join('')}</div>`;
  },

  monthHtml(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = CALENDAR_NAV.weekStart(new Date(year, month, 1));
    const todayKey = this.dateKey(new Date());
    const weekday = CALENDAR_NAV.weekdayLabels().map((n) => `<div class="text-center text-[9px] font-mono text-slate-500 py-1">${n}</div>`).join('');
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    return `<div class="grid grid-cols-7 gap-1">${weekday}${cells.map((d) => {
      const key = this.dateKey(d);
      const count = Object.keys(CALENDAR_NAV.bookedForDay(d)).length;
      const inMonth = d.getMonth() === month;
      const isToday = key === todayKey;
      return `<button type="button" onclick="DIMAD_CAL.openComposer({date:'${key}'})" class="min-h-[64px] rounded-md border text-left px-1.5 py-1 ${isToday ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'} ${inMonth ? '' : 'opacity-40'}">
        <div class="text-[11px] font-semibold ${isToday ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</div>
        <div class="text-[8px] font-mono text-amber-400/80">${count ? count + ' events · edit' : 'add event'}</div>
      </button>`;
    }).join('')}</div>`;
  },

  renderAgenda() {
    const root = document.getElementById('dimad-cal-agenda');
    if (!root) return;
    const rows = this.upcoming();
    if (!rows.length) {
      root.innerHTML = '<p class="text-[11px] text-slate-500">No upcoming events. Use + Add event to schedule a meeting and optional popup reminder.</p>';
      return;
    }
    root.innerHTML = rows.map((ev) => {
      const rem = ev.reminder === 'none' || !ev.reminder ? 'No reminder' : ev.reminder === '0' ? 'At time' : `${ev.reminder} min before`;
      return `<div class="border border-slate-800 rounded-lg px-2.5 py-2 ${ev.cancelled ? 'line-through opacity-60' : ''}">
        <div class="text-[11px] font-semibold text-slate-100">${this.escape(ev.title)}</div>
        <div class="text-[9px] font-mono text-slate-500">${ev.date} · ${ev.startTime || ev.time}${ev.endTime ? '–' + ev.endTime : ''} · ${rem}${ev.cancelled ? ' · Cancelled' : ''}</div>
      </div>`;
    }).join('');
  },

  clockValue(value) {
    const parts = String(value || '').split(':');
    if (parts.length < 2 || Number.isNaN(Number(parts[0])) || Number.isNaN(Number(parts[1]))) return '';
    return `${String(Number(parts[0])).padStart(2, '0')}:${String(Number(parts[1])).padStart(2, '0')}`;
  },

  fillTimeSelect() {
    const startInput = document.getElementById('cal-event-start');
    const endInput = document.getElementById('cal-event-end');
    const legacy = document.getElementById('cal-event-time');
    if (legacy && legacy.tagName === 'SELECT' && !legacy.options.length) {
      legacy.innerHTML = CALENDAR_HOURS.map((t) => `<option value="${t}">${t}</option>`).join('');
    }
    if (startInput && !startInput.value) startInput.value = '09:00';
    if (endInput && !endInput.value) endInput.value = '10:00';
  },

  openEvent(id) {
    this.closeContextMenu();
    const rec = this.findAny(id);
    if (!rec) return;
    this.openComposer(rec);
  },

  openComposer(prefill) {
    this.closeContextMenu();
    this.fillTimeSelect();
    let data = Object.assign({}, prefill || {});
    if (data.id && !data.origin) {
      const found = this.findAny(data.id);
      if (found) data = Object.assign({}, found, data);
    }
    if (!data.id && data.title && data.date) {
      const match = this.load().find((row) => row.date === data.date && row.title === data.title);
      if (match) data = Object.assign({}, match, data.id ? data : match);
    }
    this.editingId = data.id ? String(data.id) : '';
    const dateInput = document.getElementById('cal-event-date');
    const startInput = document.getElementById('cal-event-start');
    const endInput = document.getElementById('cal-event-end');
    const titleInput = document.getElementById('cal-event-title');
    const notesInput = document.getElementById('cal-event-notes');
    const typeInput = document.getElementById('cal-event-type');
    const reminderInput = document.getElementById('cal-event-reminder');
    const idInput = document.getElementById('cal-event-id');
    const heading = document.getElementById('cal-event-heading');
    const deleteBtn = document.getElementById('cal-event-delete');
    const cancelBtn = document.getElementById('cal-event-cancel');
    const originEl = document.getElementById('cal-event-origin');
    const sourceLink = document.getElementById('cal-event-source-link');
    const start = this.clockValue(data.startTime || data.time) || '09:00';
    const end = this.clockValue(data.endTime) || this.calculateEndTime(start);
    if (dateInput) dateInput.value = data.date || this.dateKey(this.anchorDate());
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;
    if (titleInput) titleInput.value = data.title || '';
    if (notesInput) notesInput.value = data.notes || '';
    if (typeInput) {
      const allowed = ['meeting', 'task'];
      typeInput.value = allowed.includes(data.type) ? data.type : 'meeting';
    }
    if (reminderInput) reminderInput.value = data.reminder || '15';
    if (idInput) idInput.value = this.editingId;
    if (heading) heading.textContent = this.editingId ? 'Meeting description' : 'Add meeting / event';
    if (deleteBtn) deleteBtn.classList.toggle('hidden', !this.editingId);
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !this.editingId);
    const hasOrigin = data.origin === 'scheduler' || data.origin === 'production';
    if (originEl) originEl.classList.toggle('hidden', !hasOrigin);
    if (sourceLink) {
      sourceLink.textContent = data.displayTitle || data.title || data.source || 'Open source';
      sourceLink.dataset.origin = data.origin || '';
    }
    const modal = document.getElementById('dimad-cal-composer');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeComposer() {
    const modal = document.getElementById('dimad-cal-composer');
    const idInput = document.getElementById('cal-event-id');
    this.editingId = '';
    if (idInput) idInput.value = '';
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  deleteFromComposer() {
    const id = document.getElementById('cal-event-id')?.value || this.editingId;
    if (!id) return;
    this.askDelete(id);
  },

  saveComposer() {
    const title = (document.getElementById('cal-event-title')?.value || '').trim();
    const date = document.getElementById('cal-event-date')?.value;
    const startTime = this.clockValue(document.getElementById('cal-event-start')?.value || document.getElementById('cal-event-time')?.value);
    const endTime = this.clockValue(document.getElementById('cal-event-end')?.value);
    const notes = document.getElementById('cal-event-notes')?.value || '';
    const reminder = document.getElementById('cal-event-reminder')?.value || 'none';
    if (!title || !date || !startTime) return;
    if (endTime && this.toMinutes(endTime) <= this.toMinutes(startTime)) {
      alert('End time must be after start time.');
      return;
    }
    const typeEl = document.getElementById('cal-event-type');
    const existingId = document.getElementById('cal-event-id')?.value || this.editingId || '';
    const rec = existingId ? this.findAny(existingId) : null;
    if (rec && rec.origin === 'scheduler' && typeof SCHEDULER !== 'undefined') {
      const bare = title.includes(': ') ? title.split(': ').slice(1).join(': ') : title;
      SCHEDULER.patch(rec.originId, { title: bare, date, time: startTime, notes });
      this.closeComposer();
      this.refreshViews();
      return;
    }
    if (rec && rec.origin === 'production' && typeof SCHEDULER !== 'undefined') {
      SCHEDULER.patchProd(rec.originId, { dueDate: date });
      this.closeComposer();
      this.refreshViews();
      return;
    }
    const existing = rec && rec.origin === 'calendar' ? rec : null;
    const ok = this.addEvent({
      id: existingId || undefined,
      title,
      date,
      startTime,
      endTime: endTime || this.calculateEndTime(startTime),
      time: startTime,
      notes,
      reminder,
      type: typeEl ? typeEl.value : 'task',
      source: existing ? (existing.source || 'DIMAD Calendar') : 'DIMAD Calendar',
      cancelled: existing ? !!existing.cancelled : false
    });
    if (!ok) return;
    this.closeComposer();
    this.refreshViews();
    if (reminder !== 'none' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  showReminder(ev) {
    const modal = document.getElementById('dimad-cal-reminder');
    const text = document.getElementById('dimad-cal-reminder-text');
    const when = ev.startTime || ev.time;
    if (text) text.textContent = `${when} · ${ev.title}${ev.notes ? ' — ' + ev.notes : ''}`;
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('DIMAD Calendar', { body: `${ev.time} ${ev.title}` });
      }
    } catch (err) { /* ignore */ }
  },

  dismissReminder() {
    const modal = document.getElementById('dimad-cal-reminder');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  tickReminders() {
    const now = Date.now();
    const rows = this.load();
    let changed = false;
    rows.forEach((ev) => {
      if (ev.cancelled || ev.reminded || !ev.reminder || ev.reminder === 'none') return;
      const start = new Date(`${ev.date}T${ev.startTime || ev.time}:00`).getTime();
      if (!Number.isFinite(start)) return;
      const lead = Number(ev.reminder) * 60000;
      const fireAt = start - (Number.isFinite(lead) ? lead : 0);
      if (now >= fireAt && now <= start + 120000) {
        ev.reminded = true;
        changed = true;
        this.showReminder(ev);
      }
    });
    if (changed) this.persist(rows);
  },

  renderMiniMonth() {
    const root = document.getElementById('cc-mini-month');
    const label = document.getElementById('cc-mini-month-label');
    if (!root) return;
    const now = new Date();
    if (label) label.textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const start = CALENDAR_NAV.weekStart(new Date(now.getFullYear(), now.getMonth(), 1));
    const todayKey = this.dateKey(now);
    const heads = CALENDAR_NAV.weekdayLabels('letter').map((n) => `<span class="text-slate-500">${n}</span>`).join('');
    const cells = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = this.dateKey(d);
      const inMonth = d.getMonth() === now.getMonth();
      const isToday = key === todayKey;
      return `<button type="button" onclick="DIMAD_CAL.openFromCommandCenter({dateKey:'${key}',mode:'hourly'})" class="p-1 rounded ${isToday ? 'bg-brand-mint/20 border border-brand-mint text-brand-mint font-bold' : 'bg-brand-black/40'} ${inMonth ? 'text-slate-200' : 'text-slate-500'}">${d.getDate()}</button>`;
    }).join('');
    root.innerHTML = heads + cells;
  }
};

class DimadCalendar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentDate = new Date();
    this.currentView = 'week';
    this.hours = Array.from({ length: 24 }, (_, i) => i);
    this.syncFromStore();
    this.ensureSeeds();
    this.render();
  }

  formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  syncFromStore() {
    const stored = typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.load() : [];
    const overlay = typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.schedulerOverlay() : [];
    this.events = stored.concat(overlay);
  }

  ensureSeeds() {
    if (this.events.length) return;
    const today = this.formatDateKey(new Date());
    DIMAD_CAL.addEvent({ id: '1', title: 'Client Onboarding & Setup', date: today, startTime: '10:00', endTime: '11:00', type: 'meeting', source: 'Calendly' });
    DIMAD_CAL.addEvent({ id: '2', title: 'Deep Work Code Sprint', date: today, startTime: '13:00', endTime: '15:00', type: 'task', source: 'Execution Queue' });
    this.syncFromStore();
  }

  addEvent(eventData) {
    const ok = DIMAD_CAL.addEvent(eventData);
    if (!ok) return false;
    this.syncFromStore();
    this.render();
    if (typeof CALENDAR_NAV !== 'undefined') CALENDAR_NAV.render();
    return true;
  }

  deleteEvent(eventId) {
    DIMAD_CAL.deleteEvent(eventId);
  }

  changeView(view) {
    this.currentView = view;
    DIMAD_CAL.mode = view;
    if (typeof CALENDAR_NAV !== 'undefined') {
      CALENDAR_NAV.mode = view === 'week' ? 'weekly' : view === 'month' ? 'monthly' : 'hourly';
    }
    this.render();
  }

  navigate(direction) {
    if (this.currentView === 'day') this.currentDate.setDate(this.currentDate.getDate() + direction);
    else if (this.currentView === 'week') this.currentDate.setDate(this.currentDate.getDate() + direction * 7);
    else this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(this.currentDate);
    cursor.setHours(0, 0, 0, 0);
    DIMAD_CAL.dayOffset = Math.round((cursor - today) / 86400000);
    this.render();
  }

  getDateRangeString() {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    if (this.currentView === 'day') return this.currentDate.toLocaleDateString('en-US', options);
    if (this.currentView === 'month') return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const start = CALENDAR_NAV.weekStart(this.currentDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  render() {
    if (!this.container) return;
    this.syncFromStore();
    const condensed = typeof CALENDAR_NAV !== 'undefined' && CALENDAR_NAV.condensed;
    const viewVal = this.currentView === 'week' ? 'week' : this.currentView === 'month' ? 'month' : 'day';
    const contentOn = typeof DIMAD_CAL !== 'undefined' && DIMAD_CAL.showContentSchedule();
    this.container.innerHTML = `
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div class="flex items-center space-x-3">
            <button type="button" onclick="dimadCal.navigate(-1)" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">◀ Prev</button>
            <button type="button" onclick="dimadCal.navigate(1)" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">Next ▶</button>
            <button type="button" onclick="dimadCal.goToday()" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">Today</button>
            <h3 class="text-sm font-bold text-white ml-2">${this.getDateRangeString()}</h3>
          </div>
          <div class="flex items-center flex-wrap gap-2">
            <label class="sr-only" for="dimad-cal-mode-select">Calendar view</label>
            <select id="dimad-cal-mode-select" onchange="dimadCal.changeView(this.value)" class="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded outline-none cursor-pointer hover:bg-amber-500/20">
              <option value="day" ${viewVal === 'day' ? 'selected' : ''}>Hourly</option>
              <option value="week" ${viewVal === 'week' ? 'selected' : ''}>Weekly</option>
              <option value="month" ${viewVal === 'month' ? 'selected' : ''}>Monthly</option>
            </select>
            <label class="flex items-center gap-1 text-[10px] font-semibold text-slate-400 cursor-pointer select-none">
              <input type="checkbox" ${contentOn ? 'checked' : ''} onchange="DIMAD_CAL.setShowContent(this.checked)" class="accent-amber-500">
              Content schedule
            </label>
            <label class="sr-only" for="dimad-cal-layout-select">Calendar layout</label>
            <select id="dimad-cal-layout-select" data-cal-layout onchange="CALENDAR_NAV.setLayout(this.value)" class="text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-700 px-2 py-0.5 rounded outline-none cursor-pointer hover:text-amber-400 hover:border-amber-500/30">
              <option value="full" ${condensed ? '' : 'selected'}>Full view</option>
              <option value="multi" ${condensed ? 'selected' : ''}>Multiview</option>
            </select>
            <button type="button" onclick="CAL_SETTINGS.open()" title="Calendar settings" class="text-slate-400 hover:text-amber-400 px-1.5 py-0.5 border border-slate-700 rounded-lg bg-slate-950"><i class="fa-solid fa-gear text-[10px]"></i></button>
            <button type="button" onclick="dimadCal.openQuickCreateModal()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-amber-500/10">＋ New Event</button>
          </div>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto min-h-[280px]">
          ${this.renderViewContent()}
        </div>
      </div>`;
    DIMAD_CAL.renderAgenda();
  }

  goToday() {
    this.currentDate = new Date();
    DIMAD_CAL.dayOffset = 0;
    this.render();
  }

  renderViewContent() {
    if (typeof CALENDAR_NAV !== 'undefined' && CALENDAR_NAV.condensed) return this.renderMultiview();
    if (this.currentView === 'month') return this.renderMonthGridView();
    if (this.currentView === 'week') return this.renderWeekGridView();
    return this.renderHourlyGridView();
  }

  renderMultiview() {
    const dayTitle = this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const weekly = this.currentView === 'week';
    const companion = weekly
      ? CALENDAR_NAV.weeksStackHtml(this.currentDate)
      : `<div class="text-[9px] font-mono text-slate-400 mb-1.5">${this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>${this.renderMonthGridView()}`;
    return `<div class="cal-dual-condensed">
      <div class="min-w-0">
        <div class="text-[11px] font-semibold text-white mb-1.5">${DIMAD_CAL.escape(dayTitle)}</div>
        ${this.renderHourlyGridView()}
      </div>
      <div class="min-w-0 overflow-x-auto">${companion}</div>
    </div>`;
  }

  eventsOn(dateStr) {
    return this.events.filter((e) => e.date === dateStr);
  }

  eventAt(dateStr, hour) {
    return this.eventsOn(dateStr).find((e) => DIMAD_CAL.coversHour(e, hour));
  }

  renderHourlyGridView() {
    const dateStr = this.formatDateKey(this.currentDate);
    const events = this.eventsOn(dateStr);
    return `
      <div class="space-y-2">
        <div class="text-[10px] font-mono text-slate-500">24-hour overview — click an event to view or edit; click an open hour to add.</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <div>${DIMAD_CAL.renderHourColumn(dateStr, this.hours.slice(0, 12), events)}</div>
          <div>${DIMAD_CAL.renderHourColumn(dateStr, this.hours.slice(12), events)}</div>
        </div>
      </div>`;
  }

  renderWeekGridView() {
    const start = CALENDAR_NAV.weekStart(this.currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const hourPx = DIMAD_CAL.HOUR_PX;
    const header = `<div class="text-[9px] font-mono text-slate-500 py-1">Time</div>${days.map((d) => `<div class="text-center text-[9px] font-mono text-slate-400 py-1">${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}</div>`).join('')}`;
    const gutter = this.hours.map((h) => `<div class="text-[10px] font-mono text-slate-500 border-t border-slate-800/80" style="height:${hourPx}px;line-height:${hourPx}px">${String(h).padStart(2, '0')}:00</div>`).join('');
    const dayCols = days.map((d) => {
      const key = this.formatDateKey(d);
      return DIMAD_CAL.renderHourColumn(key, this.hours, this.eventsOn(key), { showGutter: false });
    }).join('');
    return `<div class="min-w-[860px] space-y-1">
      <div class="grid gap-1" style="grid-template-columns: 42px repeat(7, minmax(0, 1fr))">${header}</div>
      <div class="grid gap-1" style="grid-template-columns: 42px repeat(7, minmax(0, 1fr))">
        <div class="select-none">${gutter}</div>
        ${dayCols}
      </div>
    </div>`;
  }

  renderMonthGridView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const start = CALENDAR_NAV.weekStart(new Date(year, month, 1));
    const todayKey = this.formatDateKey(new Date());
    const weekday = CALENDAR_NAV.weekdayLabels().map((n) => `<div class="text-center text-[9px] font-mono text-slate-500 py-1">${n}</div>`).join('');
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = this.formatDateKey(d);
      const items = this.eventsOn(key).slice(0, 3);
      const inMonth = d.getMonth() === month;
      const isToday = key === todayKey;
      return `<button type="button" onclick="dimadCal.promptQuickSlot('${key}', '09:00')" class="min-h-[88px] rounded-md border text-left px-1.5 py-1 ${isToday ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'} ${inMonth ? '' : 'opacity-40'}">
        <div class="text-[11px] font-semibold ${isToday ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</div>
        ${items.map((ev) => `<div ${DIMAD_CAL.eventPointerAttrs(ev.id || '')} class="text-[8px] text-amber-200 truncate hover:text-brand-gold ${ev.cancelled ? 'line-through opacity-60' : ''}">${ev.startTime || ev.time} ${DIMAD_CAL.escape(ev.title)}</div>`).join('') || '<div class="text-[8px] text-slate-600 italic">add event</div>'}
      </button>`;
    }).join('');
    return `<div class="grid grid-cols-7 gap-1">${weekday}${cells}</div>`;
  }

  promptQuickSlot(date, time) {
    DIMAD_CAL.openComposer({ date, time });
  }

  openQuickCreateModal() {
    DIMAD_CAL.openComposer({ date: this.formatDateKey(this.currentDate) });
  }
}

let dimadCal = null;

const CAL_SETTINGS = {
  storageKey: 'dimad_cal_settings',

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      if (raw && typeof raw === 'object') {
        return { weekStartsOn: raw.weekStartsOn === 'sunday' ? 'sunday' : 'monday' };
      }
    } catch (err) { /* defaults */ }
    return { weekStartsOn: 'monday' };
  },

  persist(next) {
    localStorage.setItem(this.storageKey, JSON.stringify(next));
  },

  weekStartsOn() {
    return this.load().weekStartsOn;
  },

  setWeekStartsOn(value) {
    const next = this.load();
    next.weekStartsOn = value === 'sunday' ? 'sunday' : 'monday';
    this.persist(next);
    this.refresh();
  },

  open() {
    const modal = document.getElementById('dimad-cal-settings');
    if (!modal) return;
    const start = this.weekStartsOn();
    modal.querySelectorAll('input[name="cal-week-start"]').forEach((el) => {
      el.checked = el.value === start;
    });
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  close() {
    const modal = document.getElementById('dimad-cal-settings');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  refresh() {
    if (typeof CALENDAR_NAV !== 'undefined') CALENDAR_NAV.render();
    if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.render();
    if (typeof SCHEDULER !== 'undefined' && SCHEDULER.render) {
      try { SCHEDULER.render(); } catch (err) { /* unmounted */ }
    }
  }
};
window.CAL_SETTINGS = CAL_SETTINGS;

function ensureDimadCalendar() {
  const el = document.getElementById('dimad-calendar-container');
  if (!el) return null;
  if (!dimadCal || dimadCal.container !== el) {
    const prior = dimadCal;
    dimadCal = new DimadCalendar('dimad-calendar-container');
    if (prior) {
      dimadCal.currentView = prior.currentView;
      dimadCal.currentDate = prior.currentDate;
      dimadCal.render();
    }
  }
  return dimadCal;
}

const CALENDAR_NAV = {
  mode: 'hourly',
  dayOffset: 0,
  extraEvents: {},
  condensed: false,

  surfaces() {
    return [
      {
        main: 'hourly-slots-container',
        side: 'cal-companion-container',
        dual: 'cal-dual',
        title: 'cal-view-title',
        hint: 'cal-view-hint',
        tz: 'calendar-timezone-label',
        mode: 'cal-mode-select',
        content: 'cal-show-content'
      },
      {
        main: 'cs-hourly-slots-container',
        side: 'cs-cal-companion-container',
        dual: 'cs-cal-dual',
        title: 'cs-cal-view-title',
        hint: 'cs-cal-view-hint',
        tz: 'cs-calendar-timezone-label',
        mode: 'cs-cal-mode-select',
        content: 'cs-cal-show-content'
      }
    ];
  },

  tzName() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch (err) { return 'UTC'; }
  },

  anchorDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + this.dayOffset);
    return d;
  },

  formatDayTitle(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (date.getTime() === today.getTime()) return `Today: ${label}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date.getTime() === tomorrow.getTime()) return `Tomorrow: ${label}`;
    return label;
  },

  weekStartsSunday() {
    return typeof CAL_SETTINGS !== 'undefined' && CAL_SETTINGS.weekStartsOn() === 'sunday';
  },

  weekStart(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const offset = this.weekStartsSunday() ? -day : (day === 0 ? -6 : 1 - day);
    start.setDate(start.getDate() + offset);
    return start;
  },

  weekdayLabels(mode) {
    const mon = mode === 'letter' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sun = mode === 'letter' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return this.weekStartsSunday() ? sun : mon;
  },

  weekRangeLabel(start) {
    const s = this.weekStart(start);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return `Week of ${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  },

  weeksStackHtml(fromDate) {
    const start = this.weekStart(fromDate || this.anchorDate());
    const next = new Date(start);
    next.setDate(start.getDate() + 7);
    const navBtn = 'bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-lg text-[9px] font-semibold';
    return `<div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <button type="button" onclick="CALENDAR_NAV.shiftWeeks(-1)" class="${navBtn}">◀ Back</button>
        <button type="button" onclick="CALENDAR_NAV.shiftWeeks(1)" class="${navBtn}">Forward ▶</button>
      </div>
      <div>
        <div class="text-[9px] font-mono text-slate-400 mb-1.5">${this.weekRangeLabel(start)}</div>
        ${this.weekHtml(start)}
      </div>
      <div>
        <div class="text-[9px] font-mono text-slate-400 mb-1.5">${this.weekRangeLabel(next)}</div>
        ${this.weekHtml(next)}
      </div>
    </div>`;
  },

  shiftWeeks(dir) {
    const step = dir < 0 ? -7 : 7;
    this.dayOffset += step;
    calendarClickCount = this.dayOffset === 0 ? 0 : 1;
    if (typeof dimadCal !== 'undefined' && dimadCal && dimadCal.currentDate) {
      dimadCal.currentDate.setDate(dimadCal.currentDate.getDate() + step);
      dimadCal.render();
    }
    this.render();
  },

  dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  bookedForDay(date) {
    const key = this.dateKey(date);
    const extras = this.extraEvents[key] || {};
    const stored = typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.eventsForDay(date) : {};
    return Object.assign({}, extras, stored);
  },

  openSlotHtml(time) {
    return `
      <div data-cal-slot="${time}" onclick="CALENDAR_NAV.clickSlot('${time}')" class="group h-5 flex items-center gap-2 px-0.5 cursor-pointer">
        <span class="text-[10px] font-mono text-slate-500 w-[42px] flex-shrink-0">${time}</span>
        <span class="flex-1 border-t border-dashed border-slate-700 group-hover:border-amber-500/50 transition"></span>
        <span class="text-[9px] text-slate-500 group-hover:text-amber-400 transition flex-shrink-0">add event</span>
      </div>`;
  },

  bookedSlotHtml(time, title, source, tone, span = 1) {
    const palette = tone === 'indigo'
      ? { wrap: 'bg-slate-800/60 border-slate-700', time: 'text-slate-400', source: 'text-slate-500', badge: 'bg-slate-800 text-slate-400', badgeText: 'Locked' }
      : { wrap: 'bg-amber-500/10 border-amber-500/30', time: 'text-amber-400', source: 'text-amber-300/80', badge: 'bg-amber-500/20 text-amber-300', badgeText: 'Active' };
    const sourceAttr = tone === 'indigo' ? ' data-cal-locked-source' : '';
    return `
      <div class="${palette.wrap} border px-1 rounded-md flex items-start justify-between gap-1.5 min-h-0" style="grid-row: span ${span}">
        <div class="flex items-start gap-2 min-w-0 pt-0.5">
          <span class="text-[10px] font-mono ${palette.time} w-[42px] flex-shrink-0">${time}</span>
          <h5 class="text-[10px] font-semibold text-slate-200 truncate leading-tight">${title}</h5>
          <span class="text-[8px] ${palette.source} font-mono hidden xl:inline truncate"${sourceAttr}>${source}</span>
        </div>
        <span class="text-[8px] font-mono ${palette.badge} px-1 py-px rounded flex-shrink-0 mt-0.5">${palette.badgeText}</span>
      </div>`;
  },

  setMode(mode) {
    this.mode = mode === 'weekly' || mode === 'monthly' ? mode : 'hourly';
    calendarClickCount = 0;
    this.syncNavLabel();
    this.render();
  },

  goToday() {
    this.dayOffset = 0;
    calendarClickCount = 0;
    if (typeof dimadCal !== 'undefined' && dimadCal) {
      dimadCal.currentDate = new Date();
      dimadCal.render();
    }
    this.render();
  },

  shiftCursor(dir) {
    const step = dir < 0 ? -1 : 1;
    if (this.mode === 'weekly') this.dayOffset += step * 7;
    else if (this.mode === 'monthly') {
      const d = this.anchorDate();
      d.setMonth(d.getMonth() + step);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.dayOffset = Math.round((d - today) / 86400000);
    } else this.dayOffset += step;
    calendarClickCount = this.dayOffset === 0 ? 0 : 1;
    if (typeof dimadCal !== 'undefined' && dimadCal && dimadCal.currentDate) {
      if (this.mode === 'weekly') dimadCal.currentDate.setDate(dimadCal.currentDate.getDate() + step * 7);
      else if (this.mode === 'monthly') dimadCal.currentDate.setMonth(dimadCal.currentDate.getMonth() + step);
      else dimadCal.currentDate.setDate(dimadCal.currentDate.getDate() + step);
      dimadCal.render();
    }
    this.render();
  },

  toggleCondense() {
    this.setLayout(this.condensed ? 'full' : 'multi');
  },

  setLayout(layout) {
    this.condensed = layout === 'multi';
    try { localStorage.setItem('dimad_cal_condensed', this.condensed ? '1' : '0'); } catch (err) { /* ignore */ }
    this.render();
    if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.render();
  },

  companionMode() {
    return this.mode === 'weekly' ? 'weekly' : 'monthly';
  },

  syncCondenseBtn() {
    document.querySelectorAll('[data-cal-layout]').forEach((el) => {
      el.value = this.condensed ? 'multi' : 'full';
    });
    this.surfaces().forEach((surface) => {
      const wrap = document.getElementById(surface.dual);
      const side = document.getElementById(surface.side);
      if (wrap) wrap.classList.toggle('cal-dual-condensed', this.condensed);
      if (side) side.classList.toggle('hidden', !this.condensed);
    });
  },

  syncNavLabel() {
    const navLabel = document.getElementById('cal-nav-label');
    if (!navLabel) return;
    if (calendarClickCount >= 1) {
      navLabel.innerText = 'View Calendar >';
      return;
    }
    if (this.mode === 'weekly') navLabel.innerText = 'Next Week >';
    else if (this.mode === 'monthly') navLabel.innerText = 'Next Month >';
    else navLabel.innerText = 'Tomorrow >';
  },

  updateChrome(title, hint) {
    this.surfaces().forEach((surface) => {
      const titleEl = document.getElementById(surface.title);
      const hintEl = document.getElementById(surface.hint);
      const tzEl = document.getElementById(surface.tz);
      const selectEl = document.getElementById(surface.mode);
      if (titleEl) titleEl.innerText = title;
      if (hintEl) hintEl.innerText = hint;
      if (tzEl) tzEl.textContent = `Timezone: ${this.tzName()} (Auto-detected)`;
      if (selectEl && selectEl.value !== this.mode) selectEl.value = this.mode;
      const contentBox = document.getElementById(surface.content);
      if (contentBox && typeof DIMAD_CAL !== 'undefined') contentBox.checked = DIMAD_CAL.showContentSchedule();
    });
    this.syncNavLabel();
  },

  paintSurface(surface, html, companionHtml) {
    const main = document.getElementById(surface.main);
    const side = document.getElementById(surface.side);
    if (!main) return;
    main.innerHTML = html;
    if (side) side.innerHTML = companionHtml == null ? '' : companionHtml;
  },

  render() {
    try {
      if (localStorage.getItem('dimad_cal_condensed') === '1') this.condensed = true;
      if (localStorage.getItem('dimad_cal_condensed') === '0') this.condensed = false;
    } catch (err) { /* keep in-memory */ }
    const surfaces = this.surfaces().filter((surface) => document.getElementById(surface.main));
    if (!surfaces.length) return;
    this.syncCondenseBtn();
    let html;
    let companionHtml = '';
    if (this.condensed) {
      const dayTitle = this.anchorDate().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      html = `<div class="text-[11px] font-semibold text-white mb-1.5">${this.escape(dayTitle)}</div>
        <div class="text-[10px] font-mono text-slate-500 mb-2">24-hour overview — click an event to view or edit; click an open hour to add.</div>
        ${this.dayHtml()}`;
      const companion = this.companionMode();
      companionHtml = companion === 'weekly'
        ? this.weeksStackHtml()
        : `<div class="text-[9px] font-mono text-slate-400 mb-1.5">${this.anchorDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>${this.monthHtml({ companion: true })}`;
    } else if (this.mode === 'weekly') {
      html = this.weekGridHtml();
    } else if (this.mode === 'monthly') {
      html = this.monthHtml();
    } else {
      html = this.dayHtml();
    }
    surfaces.forEach((surface) => this.paintSurface(surface, html, this.condensed ? companionHtml : ''));
    this.updateChromeForMode();
  },

  updateChromeForMode() {
    const date = this.anchorDate();
    if (this.mode === 'weekly') {
      this.updateChrome(this.weekRangeLabel(date), '');
      return;
    }
    if (this.mode === 'monthly') {
      this.updateChrome(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), '');
      return;
    }
    this.updateChrome(date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }), '');
  },

  renderDay(which) {
    if (which === 'tomorrow') this.dayOffset = 1;
    if (which === 'today') this.dayOffset = 0;
    this.mode = 'hourly';
    this.render();
  },

  dayHtml() {
    const date = this.anchorDate();
    const dateKey = this.dateKey(date);
    const list = (typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.eventsListForDay(dateKey) : []).map((ev) => ({
      ...ev,
      startTime: ev.startTime || ev.time,
      endTime: ev.endTime || DIMAD_CAL.calculateEndTime(ev.startTime || ev.time)
    }));
    const morningHours = Array.from({ length: 12 }, (_, i) => i);
    const eveningHours = Array.from({ length: 12 }, (_, i) => i + 12);
    const cols = this.condensed ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2';
    return `
      <div class="grid ${cols} gap-x-3 gap-y-1">
        <div>${DIMAD_CAL.renderHourColumn(dateKey, morningHours, list)}</div>
        <div>${DIMAD_CAL.renderHourColumn(dateKey, eveningHours, list)}</div>
      </div>`;
  },

  weekGridHtml(fromDate) {
    const start = this.weekStart(fromDate || this.anchorDate());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourPx = typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.HOUR_PX : 32;
    const todayKey = this.dateKey(new Date());
    const selectedKey = this.dateKey(this.anchorDate());
    const header = `<div class="text-[9px] font-mono text-slate-500 py-1">Time</div>${days.map((d) => {
      const key = this.dateKey(d);
      const isToday = key === todayKey;
      const isSelected = key === selectedKey;
      return `<button type="button" onclick="CALENDAR_NAV.openDayFromGrid('${key}')" class="text-center text-[9px] font-mono py-1 rounded hover:text-amber-300 ${isSelected || isToday ? 'text-amber-400 font-semibold' : 'text-slate-400'}">${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}</button>`;
    }).join('')}`;
    const gutter = hours.map((h) => `<div class="text-[10px] font-mono text-slate-500 border-t border-slate-800/80" style="height:${hourPx}px;line-height:${hourPx}px">${String(h).padStart(2, '0')}:00</div>`).join('');
    const dayCols = days.map((d) => {
      const key = this.dateKey(d);
      const list = typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.eventsListForDay(key) : [];
      return DIMAD_CAL.renderHourColumn(key, hours, list, { showGutter: false });
    }).join('');
    return `<div class="overflow-x-auto">
      <div class="min-w-[860px] space-y-1">
        <div class="grid gap-1" style="grid-template-columns: 42px repeat(7, minmax(0, 1fr))">${header}</div>
        <div class="grid gap-1" style="grid-template-columns: 42px repeat(7, minmax(0, 1fr))">
          <div class="select-none">${gutter}</div>
          ${dayCols}
        </div>
      </div>
    </div>`;
  },

  weekHtml(fromDate) {
    const start = this.weekStart(fromDate || this.anchorDate());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const todayKey = this.dateKey(new Date());
    const selectedKey = this.dateKey(this.anchorDate());
    const compact = this.condensed;
    return `
      <div class="grid grid-cols-7 gap-1">
        ${days.map((d) => {
          const key = this.dateKey(d);
          const booked = this.bookedForDay(d);
          const items = Object.keys(booked).sort().slice(0, compact ? 2 : 3).map((time) => {
            const ev = booked[time];
            const tone = ev.tone === 'sky' || ev.type === 'content'
              ? 'bg-sky-500/15 text-sky-200'
              : ev.tone === 'indigo' ? 'bg-brand-gold/15 text-amber-200' : 'bg-amber-500/15 text-amber-200';
            return `<div ${typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.eventPointerAttrs(ev.id || '') : ''} class="${tone} rounded px-1 py-0.5 text-[8px] leading-tight truncate ${ev.cancelled ? 'line-through opacity-60' : ''}">${time} ${this.escape(ev.title)}</div>`;
          }).join('');
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          return `
            <button type="button" onclick="CALENDAR_NAV.openDayFromGrid('${key}')" class="text-left ${compact ? 'min-h-[88px]' : 'min-h-[108px]'} rounded-lg border ${isSelected ? 'border-amber-500/50 bg-amber-500/10' : isToday ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-950/40'} p-1.5 space-y-1 hover:border-amber-500/30 transition">
              <div class="flex items-baseline justify-between">
                <span class="text-[9px] font-mono text-slate-500">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span class="text-[11px] font-semibold ${isToday || isSelected ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</span>
              </div>
              ${items || '<div class="text-[8px] text-slate-600 italic">open</div>'}
            </button>`;
        }).join('')}
      </div>`;
  },

  renderWeek() {
    this.mode = 'weekly';
    this.render();
  },

  monthHtml(opts) {
    const companion = !!(opts && opts.companion);
    const date = this.anchorDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const start = this.weekStart(first);
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const todayKey = this.dateKey(new Date());
    const selectedKey = this.dateKey(date);
    const weekday = this.weekdayLabels().map((n) =>
      `<div class="text-center text-[9px] font-mono text-slate-500 py-1">${n}</div>`
    ).join('');
    return `
      <div class="grid grid-cols-7 gap-1">
        ${weekday}
        ${cells.map((d) => {
          const inMonth = d.getMonth() === month;
          const key = this.dateKey(d);
          const booked = this.bookedForDay(d);
          const count = Object.keys(booked).length;
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const click = companion
            ? `CALENDAR_NAV.openDayFromGrid('${key}')`
            : `DIMAD_CAL.openFromCommandCenter({dateKey:'${key}',mode:'hourly'})`;
          return `
            <button type="button" onclick="${click}" class="h-12 rounded-md border text-left px-1.5 py-1 ${isSelected ? 'border-amber-500/50 bg-amber-500/10' : isToday ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'} ${inMonth ? '' : 'opacity-40'} hover:border-amber-500/30 transition">
              <div class="text-[11px] font-semibold ${isToday || isSelected ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</div>
              <div class="text-[8px] font-mono ${count ? 'text-amber-400/80' : 'text-slate-600'}">${count ? count + ' evt' : ''}</div>
            </button>`;
        }).join('')}
      </div>`;
  },

  renderMonth() {
    this.mode = 'monthly';
    this.render();
  },

  openDayFromGrid(key) {
    const [y, m, d] = key.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.dayOffset = Math.round((target - today) / 86400000);
    if (!this.condensed) this.mode = 'hourly';
    calendarClickCount = this.dayOffset === 0 ? 0 : 1;
    if (typeof dimadCal !== 'undefined' && dimadCal) {
      dimadCal.currentDate = target;
      dimadCal.render();
    }
    this.render();
  },

  progressView() {
    calendarClickCount++;
    if (this.mode === 'weekly') {
      if (calendarClickCount === 1) {
        this.dayOffset += 7;
        this.render();
      } else {
        calendarClickCount = 0;
        if (typeof DIMAD_CAL !== 'undefined') DIMAD_CAL.openFromCommandCenter({ mode: 'weekly' });
      }
      return;
    }
    if (this.mode === 'monthly') {
      if (calendarClickCount === 1) {
        const d = this.anchorDate();
        d.setMonth(d.getMonth() + 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.dayOffset = Math.round((d - today) / 86400000);
        this.render();
      } else {
        calendarClickCount = 0;
        if (typeof DIMAD_CAL !== 'undefined') DIMAD_CAL.openFromCommandCenter({ mode: 'monthly' });
      }
      return;
    }
    if (calendarClickCount === 1) {
      this.dayOffset = 1;
      this.render();
    } else {
      calendarClickCount = 0;
      if (typeof DIMAD_CAL !== 'undefined') DIMAD_CAL.openFromCommandCenter({ mode: 'hourly' });
    }
  },

  clickSlot(timeString) {
    if (typeof DIMAD_CAL !== 'undefined') {
      DIMAD_CAL.openComposer({ date: this.dateKey(this.anchorDate()), time: timeString });
      return;
    }
    const taskName = prompt(`Add task or meeting for ${timeString}:`);
    if (!taskName) return;
    const key = this.dateKey(this.anchorDate());
    if (!this.extraEvents[key]) this.extraEvents[key] = {};
    this.extraEvents[key][timeString] = { title: String(taskName), source: 'Command Center', tone: 'amber' };
    this.render();
  },

  escape(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

const FINNHUB_MARKETS = {
  tokenKey: 'dimad_finnhub_token',
  watchKey: 'dimad_watchlist',
  selected: 'AAPL',
  quotes: {},
  searchTimer: null,
  pollId: null,
  fallback: {
    AAPL: { c: 227.52, d: 1.84, dp: 0.81, h: 229.10, l: 225.40, o: 226.15, pc: 225.68, name: 'Apple Inc' },
    MSFT: { c: 428.90, d: 2.11, dp: 0.49, h: 431.20, l: 425.80, o: 426.40, pc: 426.79, name: 'Microsoft Corp' },
    NVDA: { c: 141.22, d: 3.45, dp: 2.51, h: 142.80, l: 137.10, o: 138.20, pc: 137.77, name: 'NVIDIA Corp' },
    TSLA: { c: 248.60, d: -4.12, dp: -1.63, h: 254.00, l: 247.20, o: 252.10, pc: 252.72, name: 'Tesla Inc' },
    AMZN: { c: 188.40, d: 0.92, dp: 0.49, h: 189.70, l: 186.50, o: 187.10, pc: 187.48, name: 'Amazon.com Inc' },
    GOOGL: { c: 178.15, d: 1.05, dp: 0.59, h: 179.40, l: 176.80, o: 177.20, pc: 177.10, name: 'Alphabet Inc' },
    META: { c: 572.30, d: -3.20, dp: -0.56, h: 578.00, l: 570.10, o: 575.40, pc: 575.50, name: 'Meta Platforms' },
    SPY: { c: 581.52, d: 2.31, dp: 0.40, h: 583.10, l: 578.40, o: 579.20, pc: 579.21, name: 'SPDR S&P 500 ETF' },
    QQQ: { c: 505.18, d: 3.02, dp: 0.60, h: 507.40, l: 501.90, o: 502.80, pc: 502.16, name: 'Invesco QQQ Trust' },
    AMD: { c: 388.50, d: 4.20, dp: 1.09, h: 391.00, l: 382.40, o: 384.10, pc: 384.30, name: 'Advanced Micro Devices' },
    'BINANCE:BTCUSDT': { c: 67420, d: 1384, dp: 2.10, h: 68100, l: 65900, o: 66040, pc: 66036, name: 'Bitcoin' },
    'BINANCE:ETHUSDT': { c: 2640.50, d: -21.30, dp: -0.80, h: 2695, l: 2622, o: 2661, pc: 2661.80, name: 'Ethereum' }
  },
  fallbackNews: [
    { headline: 'Global markets hold near highs as chipmakers lead the tape', source: 'DIMAD Wire', datetime: Math.floor(Date.now() / 1000) - 1800, url: 'https://finnhub.io', summary: 'Risk appetite stays firm with NVDA and the MAG7 supporting index futures.' },
    { headline: 'Treasury yields ease ahead of the next inflation print', source: 'DIMAD Wire', datetime: Math.floor(Date.now() / 1000) - 5400, url: 'https://finnhub.io', summary: 'Duration caught a bid as traders fade a hawkish overshoot in front-end rates.' },
    { headline: 'Bitcoin holds the $67k handle on ETF residual demand', source: 'DIMAD Wire', datetime: Math.floor(Date.now() / 1000) - 8600, url: 'https://finnhub.io', summary: 'Crypto beta remains correlated with Nasdaq as BTC tracks the liquidity impulse.' }
  ],

  token() {
    return String(localStorage.getItem(this.tokenKey) || '').trim();
  },

  watchlist() {
    try {
      const list = JSON.parse(localStorage.getItem(this.watchKey) || '');
      if (Array.isArray(list) && list.length) return list;
    } catch (err) { /* default */ }
    return ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'AMD'];
  },

  saveToken(value) {
    const token = String(value || '').trim();
    if (token) localStorage.setItem(this.tokenKey, token);
    else localStorage.removeItem(this.tokenKey);
    this.refresh();
  },

  init() {
    const input = document.getElementById('finnhub-token');
    if (input) input.value = this.token();
    this.quotes = { ...this.fallback };
    this.refresh();
    if (this.pollId) clearInterval(this.pollId);
    this.pollId = setInterval(() => this.refresh(), 45000);
  },

  open() {
    const input = document.getElementById('finnhub-token');
    if (input && this.token()) input.value = this.token();
    this.renderWatchlist();
    this.renderQuote();
    this.loadNews(this.selected);
  },

  async api(path) {
    const token = this.token();
    if (!token) throw new Error('no-token');
    const url = `https://finnhub.io/api/v1/${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (res.status === 401) throw new Error('bad-token');
    if (!res.ok) throw new Error(`http-${res.status}`);
    return res.json();
  },

  fmt(n, digits) {
    const num = Number(n);
    if (!Number.isFinite(num)) return '—';
    return num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  },

  headerQuote(id, quote, money) {
    const el = document.getElementById(id);
    if (!el || !quote) return;
    const up = Number(quote.d) >= 0;
    el.className = up ? 'text-brand-mint' : 'text-brand-alert';
    const arrow = up ? '▲' : '▼';
    const price = money ? `$${this.fmt(quote.c, 2)}` : this.fmt(quote.c, 2);
    el.textContent = `${price} ${arrow} ${up ? '+' : ''}${this.fmt(quote.dp, 1)}%`;
  },

  async refresh() {
    const symbols = [...new Set([...this.watchlist(), this.selected, 'SPY', 'QQQ', 'AMD', 'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'])];
    const status = document.getElementById('finnhub-status');
    try {
      if (!this.token()) throw new Error('no-token');
      const pack = await Promise.all(symbols.map(async (sym) => {
        const q = await this.api(`quote?symbol=${encodeURIComponent(sym)}`);
        return [sym, q];
      }));
      pack.forEach(([sym, q]) => {
        if (q && typeof q.c === 'number' && q.c > 0) this.quotes[sym] = Object.assign({}, this.quotes[sym], q);
      });
      if (status) status.textContent = 'LIVE · Finnhub.io';
      if (status) status.className = 'text-[9px] font-mono text-brand-mint';
    } catch (err) {
      if (status) {
        status.textContent = err.message === 'bad-token'
          ? 'Token rejected · check your Finnhub key'
          : 'Demo quotes · add a Finnhub token for live prints';
        status.className = 'text-[9px] font-mono text-slate-500';
      }
    }
    this.syncHeader();
    this.renderWatchlist();
    this.renderQuote();
  },

  syncHeader() {
    this.headerQuote('mkt-btc', this.quotes['BINANCE:BTCUSDT'], true);
    this.headerQuote('mkt-eth', this.quotes['BINANCE:ETHUSDT'], true);
    this.headerQuote('mkt-amd', this.quotes.AMD, false);
  },

  renderWatchlist() {
    const root = document.getElementById('finnhub-watchlist');
    if (!root) return;
    root.innerHTML = this.watchlist().map((sym) => {
      const q = this.quotes[sym] || {};
      const up = Number(q.d) >= 0;
      const active = sym === this.selected ? 'bg-amber-500/10' : 'hover:bg-slate-900';
      return `
        <button type="button" onclick="FINNHUB_MARKETS.select('${sym}')" class="w-full flex items-center justify-between px-3 py-2 text-left ${active} transition">
          <span class="text-[11px] font-bold text-slate-200">${sym}</span>
          <span class="text-right">
            <span class="block text-[11px] font-mono text-slate-100">${this.fmt(q.c, 2)}</span>
            <span class="block text-[9px] font-mono ${up ? 'text-brand-mint' : 'text-brand-alert'}">${up ? '+' : ''}${this.fmt(q.dp, 2)}%</span>
          </span>
        </button>`;
    }).join('');
  },

  renderQuote() {
    const q = this.quotes[this.selected] || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('finnhub-quote-symbol', this.selected);
    set('finnhub-quote-name', q.name || 'Finnhub quote');
    set('finnhub-quote-price', this.fmt(q.c, 2));
    set('finnhub-q-o', this.fmt(q.o, 2));
    set('finnhub-q-h', this.fmt(q.h, 2));
    set('finnhub-q-l', this.fmt(q.l, 2));
    set('finnhub-q-pc', this.fmt(q.pc, 2));
    const ch = document.getElementById('finnhub-quote-change');
    if (ch) {
      const up = Number(q.d) >= 0;
      ch.className = `text-[11px] font-mono ${up ? 'text-brand-mint' : 'text-brand-alert'}`;
      ch.textContent = `${up ? '+' : ''}${this.fmt(q.d, 2)} (${up ? '+' : ''}${this.fmt(q.dp, 2)}%)`;
    }
    const meta = document.getElementById('finnhub-quote-meta');
    if (meta) meta.textContent = this.token() ? 'Live print via Finnhub.io' : 'Demo print — connect Finnhub for realtime US quotes.';
  },

  async select(sym) {
    this.selected = sym;
    this.renderWatchlist();
    this.renderQuote();
    const box = document.getElementById('finnhub-search-results');
    if (box) box.classList.add('hidden');
    try {
      if (this.token()) {
        const profile = await this.api(`stock/profile2?symbol=${encodeURIComponent(sym)}`);
        if (profile && profile.name) {
          this.quotes[sym] = Object.assign({}, this.quotes[sym], { name: profile.name });
          this.renderQuote();
        }
        const q = await this.api(`quote?symbol=${encodeURIComponent(sym)}`);
        if (q && q.c) {
          this.quotes[sym] = Object.assign({}, this.quotes[sym], q);
          this.renderQuote();
          this.renderWatchlist();
        }
      }
    } catch (err) { /* keep cached */ }
    this.loadNews(sym);
  },

  addSymbol(sym, name) {
    const list = this.watchlist();
    if (!list.includes(sym)) {
      list.unshift(sym);
      localStorage.setItem(this.watchKey, JSON.stringify(list.slice(0, 16)));
    }
    if (name) this.quotes[sym] = Object.assign({}, this.quotes[sym], { name });
    this.select(sym);
    this.refresh();
  },

  search(q) {
    clearTimeout(this.searchTimer);
    const box = document.getElementById('finnhub-search-results');
    const query = String(q || '').trim();
    if (!box) return;
    if (query.length < 1) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    this.searchTimer = setTimeout(() => this.runSearch(query), 280);
  },

  async runSearch(query) {
    const box = document.getElementById('finnhub-search-results');
    if (!box) return;
    let rows = [];
    try {
      if (this.token()) {
        const data = await this.api(`search?q=${encodeURIComponent(query)}`);
        rows = (data.result || []).slice(0, 8);
      }
    } catch (err) { rows = []; }
    if (!rows.length) {
      const q = query.toUpperCase();
      rows = Object.keys(this.fallback)
        .filter((sym) => sym.includes(q) || String(this.fallback[sym].name).toUpperCase().includes(q))
        .map((sym) => ({ symbol: sym, description: this.fallback[sym].name, type: 'Demo' }));
    }
    if (!rows.length) {
      box.classList.remove('hidden');
      box.innerHTML = '<div class="px-3 py-2 text-[11px] text-slate-500">No symbols found</div>';
      return;
    }
    box.classList.remove('hidden');
    box.innerHTML = rows.map((row) => {
      const sym = String(row.symbol || row.displaySymbol || '').replace(/'/g, '');
      const desc = String(row.description || '').replace(/</g, '&lt;');
      return `
        <button type="button" onclick="FINNHUB_MARKETS.addSymbol('${sym}', '${desc.replace(/'/g, '')}')" class="w-full text-left px-3 py-2 hover:bg-slate-900 flex items-center justify-between gap-2">
          <span>
            <span class="block text-[11px] font-bold text-amber-400">${sym}</span>
            <span class="block text-[10px] text-slate-500 truncate">${desc}</span>
          </span>
          <span class="text-[9px] font-mono text-slate-600">${row.type || ''}</span>
        </button>`;
    }).join('');
  },

  async loadNews(symbol) {
    const root = document.getElementById('finnhub-news');
    const scope = document.getElementById('finnhub-news-scope');
    if (!root) return;
    let items = [];
    try {
      if (this.token()) {
        const to = new Date();
        const from = new Date(Date.now() - 5 * 86400000);
        const iso = (d) => d.toISOString().slice(0, 10);
        items = await this.api(`company-news?symbol=${encodeURIComponent(symbol)}&from=${iso(from)}&to=${iso(to)}`);
        if (!Array.isArray(items) || !items.length) {
          items = await this.api('news?category=general');
          if (scope) scope.textContent = 'Market';
        } else if (scope) scope.textContent = symbol;
      }
    } catch (err) { items = []; }
    if (!Array.isArray(items) || !items.length) {
      items = this.fallbackNews;
      if (scope) scope.textContent = 'Market';
    }
    root.innerHTML = items.slice(0, 12).map((item) => {
      const when = item.datetime ? new Date(item.datetime * 1000).toLocaleString() : '';
      const headline = String(item.headline || 'Untitled').replace(/</g, '&lt;');
      const source = String(item.source || 'News').replace(/</g, '&lt;');
      const href = String(item.url || 'https://finnhub.io');
      return `
        <a href="${href}" target="_blank" rel="noopener noreferrer" class="block px-3 py-2 hover:bg-slate-900 transition">
          <div class="text-[11px] text-slate-200 leading-snug">${headline}</div>
          <div class="text-[9px] text-slate-500 mt-1 font-mono">${source} · ${when}</div>
        </a>`;
    }).join('');
  }
};

const TASK_MANAGER = {
  storageKey: 'dimad_task_manager',
  maxToday: 20,
  bound: false,
  state: null,
  view: 'today',
  dragId: '',
  dragFrom: '',

  todayKey() {
    return typeof FOCUS_TIMER !== 'undefined' ? FOCUS_TIMER.dayKey() : new Date().toISOString().slice(0, 10);
  },

  shiftKey(days) {
    const key = this.todayKey();
    const d = typeof FOCUS_TIMER !== 'undefined'
      ? FOCUS_TIMER.parseDayKey(key)
      : new Date(`${key}T00:00:00`);
    d.setDate(d.getDate() + days);
    return typeof FOCUS_TIMER !== 'undefined' ? FOCUS_TIMER.dayKey(d) : d.toISOString().slice(0, 10);
  },

  fmtDate(key) {
    if (typeof FOCUS_LOG !== 'undefined' && FOCUS_LOG.fmtDate) return FOCUS_LOG.fmtDate(key);
    return key;
  },

  normalizeTask(task, fallbackDate) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(task.date) ? task.date : fallbackDate;
    return {
      id: String(task.id || `t-${Date.now()}`),
      title: String(task.title || '').trim() || 'Untitled task',
      completed: !!task.completed,
      date,
      completedAt: task.completedAt || (task.completed ? date : '')
    };
  },

  defaults() {
    const today = this.todayKey();
    return {
      tasks: [
        { id: 't1', title: 'Finalize MailerLite sign-up flow for Dimad Founders Club', completed: true, date: today, completedAt: today },
        { id: 't2', title: 'Review soft goods technical design specs for carry system', completed: false, date: today, completedAt: '' },
        { id: 't3', title: 'Draft chapter 4 of "Redefining Everything" book', completed: false, date: today, completedAt: '' }
      ]
    };
  },

  load() {
    const today = this.todayKey();
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || '');
      if (raw && Array.isArray(raw.tasks)) {
        return { tasks: raw.tasks.map((task) => this.normalizeTask(task, today)) };
      }
    } catch (err) { /* seed */ }
    return this.defaults();
  },

  persist() {
    localStorage.setItem(this.storageKey, JSON.stringify({ tasks: (this.state && this.state.tasks) || [] }));
  },

  ensure() {
    if (!this.state) this.state = this.load();
    return this.state;
  },

  mount() {
    this.ensure();
    this.bind();
    this.render();
  },

  bind() {
    const tabForm = document.getElementById('tm-add-form');
    const ccForm = document.getElementById('cc-tm-add-form');
    if (tabForm && !tabForm.dataset.tmBound) {
      tabForm.dataset.tmBound = '1';
      tabForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.addTask('tab');
      });
    }
    if (ccForm && !ccForm.dataset.tmBound) {
      ccForm.dataset.tmBound = '1';
      ccForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.addTask('cc');
      });
    }
    if (!this.docBound) {
      this.docBound = true;
      const end = (event) => this.endOutsideEdit(event);
      window.addEventListener('pointerdown', end, true);
      window.addEventListener('mousedown', end, true);
      window.addEventListener('touchstart', end, true);
      window.addEventListener('click', end, true);
    }
  },

  todayOpen() {
    this.ensure();
    const today = this.todayKey();
    return this.state.tasks.filter((task) => !task.completed && task.date <= today);
  },

  previewRows() {
    this.ensure();
    const today = this.todayKey();
    const open = this.todayOpen();
    const done = this.state.tasks.filter((task) => task.completed && (task.completedAt || task.date) === today);
    return open.concat(done);
  },

  filtered() {
    const today = this.todayKey();
    if (this.view === 'history') {
      return this.state.tasks.filter((task) => task.completed).sort((a, b) => String(b.completedAt || b.date).localeCompare(String(a.completedAt || a.date)));
    }
    if (this.view === 'future') {
      return this.state.tasks.filter((task) => !task.completed && task.date > today);
    }
    return this.todayOpen();
  },

  setView(view) {
    this.view = view === 'history' || view === 'future' ? view : 'today';
    this.render();
  },

  addTask(source) {
    this.ensure();
    if (this.todayOpen().length >= this.maxToday) {
      this.render();
      return;
    }
    const input = document.getElementById(source === 'cc' ? 'cc-tm-new' : 'tm-new-task');
    const title = input ? input.value.trim() : '';
    if (!title) return;
    this.state.tasks.push({
      id: `t-${Date.now()}`,
      title,
      completed: false,
      date: this.todayKey(),
      completedAt: ''
    });
    if (input) input.value = '';
    this.view = 'today';
    this.persist();
    this.render();
  },

  focusAdd(source) {
    this.ensure();
    this.bind();
    const input = document.getElementById(source === 'cc' ? 'cc-tm-new' : 'tm-new-task');
    if (input && !input.disabled) input.focus();
  },

  toggleTask(id) {
    const task = this.state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.completed = !task.completed;
    task.completedAt = task.completed ? this.todayKey() : '';
    this.persist();
    this.render();
  },

  deleteTask(id) {
    this.ensure();
    const task = this.state.tasks.find((item) => item.id === id);
    if (!task) return;
    this.deleteId = id;
    this.menuId = '';
    this.render();
    const modal = document.getElementById('tm-delete-modal');
    const title = document.getElementById('tm-delete-title');
    if (title) title.textContent = task.title;
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeDelete() {
    const modal = document.getElementById('tm-delete-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.deleteId = '';
  },

  confirmDelete() {
    const id = this.deleteId;
    this.closeDelete();
    if (!id) return;
    this.state.tasks = this.state.tasks.filter((item) => item.id !== id);
    this.persist();
    this.render();
  },

  reopenTask(id) {
    const task = this.state.tasks.find((item) => item.id === id);
    if (!task) return;
    if (this.todayOpen().length >= this.maxToday) {
      this.render();
      return;
    }
    task.completed = false;
    task.completedAt = '';
    task.date = this.todayKey();
    this.view = 'today';
    this.persist();
    this.render();
  },

  moveToday(id) {
    const task = this.state.tasks.find((item) => item.id === id);
    if (!task || task.completed) return;
    if (this.todayOpen().length >= this.maxToday) {
      this.render();
      return;
    }
    task.date = this.todayKey();
    this.view = 'today';
    this.persist();
    this.render();
  },

  sortableTasks(from) {
    if (from === 'history') return [];
    if (from === 'cc') return this.todayOpen();
    return this.filtered().filter((task) => !task.completed);
  },

  applyVisibleOrder(ids) {
    const want = new Set(ids);
    const queue = ids.slice();
    const byId = {};
    this.state.tasks.forEach((task) => { byId[task.id] = task; });
    let i = 0;
    this.state.tasks = this.state.tasks.map((task) => {
      if (!want.has(task.id)) return task;
      return byId[queue[i++]] || task;
    });
  },

  move(id, dir, from) {
    const vis = this.sortableTasks(from);
    const index = vis.findIndex((item) => item.id === id);
    const other = vis[index + dir];
    if (!other) return;
    const ids = vis.map((item) => item.id);
    ids[index] = other.id;
    ids[index + dir] = id;
    this.applyVisibleOrder(ids);
    this.persist();
    this.render();
  },

  onDragStart(event, id, from) {
    if (this.editId === id || event.target.closest('button, textarea, input, a, [data-tm-menu]')) {
      event.preventDefault();
      return;
    }
    this.dragId = id;
    this.dragFrom = from;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    event.currentTarget.classList.add('tm-dragging');
  },

  onDragOver(event, id, from) {
    if (!this.dragId || this.dragFrom !== from || this.dragId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const row = event.currentTarget;
    const mid = row.getBoundingClientRect().top + row.offsetHeight / 2;
    row.classList.toggle('tm-drop-before', event.clientY < mid);
    row.classList.toggle('tm-drop-after', event.clientY >= mid);
  },

  onDragLeave(event) {
    const row = event.currentTarget;
    if (row.contains(event.relatedTarget)) return;
    row.classList.remove('tm-drop-before', 'tm-drop-after');
  },

  onDrop(event, id, from) {
    event.preventDefault();
    const source = this.dragId || event.dataTransfer.getData('text/plain');
    const row = event.currentTarget;
    const after = event.clientY >= row.getBoundingClientRect().top + row.offsetHeight / 2;
    row.classList.remove('tm-drop-before', 'tm-drop-after');
    this.dropAt(source, id, after, from);
  },

  onDragEnd() {
    this.dragId = '';
    this.dragFrom = '';
    document.querySelectorAll('[data-tm-row]').forEach((el) => {
      el.classList.remove('tm-dragging', 'tm-drop-before', 'tm-drop-after');
    });
  },

  dropAt(sourceId, targetId, after, from) {
    if (!sourceId || sourceId === targetId) return;
    const vis = this.sortableTasks(from);
    const ids = vis.map((item) => item.id);
    const fromIdx = ids.indexOf(sourceId);
    if (fromIdx < 0 || ids.indexOf(targetId) < 0) return;
    ids.splice(fromIdx, 1);
    let toIdx = ids.indexOf(targetId);
    ids.splice(after ? toIdx + 1 : toIdx, 0, sourceId);
    this.applyVisibleOrder(ids);
    this.persist();
    this.render();
  },

  moveTomorrow(id) {
    const task = this.state.tasks.find((item) => item.id === id);
    if (!task || task.completed) return;
    task.date = this.shiftKey(1);
    this.persist();
    this.render();
  },

  snoozeUntil(id, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= this.todayKey()) return;
    const task = this.state.tasks.find((item) => item.id === id);
    if (!task || task.completed) return;
    task.date = date;
    this.persist();
    this.render();
  },

  openSnooze(id) {
    this.ensure();
    this.menuId = '';
    const task = this.state.tasks.find((item) => item.id === id);
    if (!task || task.completed) return;
    this.snoozeId = id;
    const modal = document.getElementById('tm-snooze-modal');
    const input = document.getElementById('tm-snooze-date');
    const title = document.getElementById('tm-snooze-title');
    const min = this.shiftKey(1);
    if (title) title.textContent = task.title;
    if (input) {
      input.min = min;
      input.value = task.date > this.todayKey() ? task.date : min;
    }
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeSnooze() {
    const modal = document.getElementById('tm-snooze-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.snoozeId = '';
  },

  confirmSnooze() {
    const input = document.getElementById('tm-snooze-date');
    const date = input ? input.value : '';
    const id = this.snoozeId;
    this.closeSnooze();
    this.snoozeUntil(id, date);
  },

  iconBtn(action, title, icon, extra = '') {
    return `<button type="button" title="${title}" ${extra} class="w-6 h-6 rounded-md bg-slate-900 hover:bg-slate-800 border border-brand-border text-slate-400 hover:text-brand-gold flex items-center justify-center disabled:opacity-30"><i class="fa-solid ${icon} text-[9px]"></i></button>`;
  },

  menuItem(label, onclick, disabled) {
    return `<button type="button" ${disabled ? 'disabled' : ''} onclick="event.preventDefault();event.stopPropagation();${onclick}" class="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-200 hover:bg-slate-800 hover:text-brand-gold disabled:opacity-30 disabled:hover:text-slate-200">${label}</button>`;
  },

  toggleMenu(id) {
    if (this.editId) {
      const input = this.visibleEditInput(this.editId);
      this.commitEdit(this.editId, input ? input.value : '');
      return;
    }
    this.menuId = this.menuId === id ? '' : id;
    this.render();
    if (this.menuId) this.placeMenu(this.menuId);
  },

  placeMenu(id) {
    document.querySelectorAll(`[data-tm-menu="${id}"]`).forEach((menu) => {
      const btn = menu.parentElement && menu.parentElement.querySelector(`[data-tm-menu-btn="${id}"]`);
      if (!btn) return;
      const box = btn.getBoundingClientRect();
      if (!box.width && !box.height) return;
      menu.style.position = 'fixed';
      menu.style.top = `${Math.min(box.bottom + 4, window.innerHeight - menu.offsetHeight - 8)}px`;
      menu.style.right = `${Math.max(8, window.innerWidth - box.right)}px`;
      menu.style.left = 'auto';
    });
  },

  startEdit(id) {
    this.menuId = id;
    this.editId = id;
    this.render();
    requestAnimationFrame(() => {
      this.placeMenu(id);
      const input = this.visibleEditInput(id);
      if (!input) return;
      input.focus();
      input.select();
    });
  },

  cancelEdit() {
    this.editId = '';
    this.menuId = '';
    this.render();
  },

  visibleEditInput(id) {
    const nodes = [...document.querySelectorAll(`[data-tm-edit="${id}"]`)];
    return nodes.find((el) => el.getBoundingClientRect().width > 0) || nodes[0] || null;
  },

  commitFromOverlay(id) {
    const input = this.visibleEditInput(id);
    this.commitEdit(id, input ? input.value : '');
  },

  endOutsideEdit(event) {
    if (!this.editId) {
      if (this.menuId) {
        const node = this.eventNode(event);
        if (node && node.closest && node.closest('[data-tm-menu], [data-tm-menu-btn]')) return;
        this.menuId = '';
        this.render();
      }
      return;
    }
    const node = this.eventNode(event);
    if (node && node.closest && node.closest('[data-tm-edit], [data-tm-menu]')) return;
    const id = this.editId;
    const input = this.visibleEditInput(id);
    this.commitEdit(id, input ? input.value : '');
  },

  eventNode(event) {
    const raw = event && event.target;
    if (!raw) return null;
    return raw.nodeType === 1 ? raw : raw.parentElement;
  },

  commitEdit(id, value) {
    if (this.editId !== id) return;
    const task = this.state.tasks.find((item) => item.id === id);
    const title = String(value || '').trim();
    this.editId = '';
    this.menuId = '';
    if (task && title) task.title = title;
    this.persist();
    this.render();
  },

  rowMarkup(task, index, total, from) {
    const compact = from === 'cc';
    const history = from === 'history';
    const future = from === 'future';
    const editing = this.editId === task.id;
    const open = this.menuId === task.id || editing;
    const fromArg = from === 'cc' ? ", 'cc'" : '';
    const items = [];
    if (history || task.completed) {
      items.push(this.menuItem('Re-open', `TASK_MANAGER.reopenTask('${task.id}')`));
    } else if (future) {
      items.push(this.menuItem('Move to today', `TASK_MANAGER.moveToday('${task.id}')`));
      items.push(this.menuItem('Snooze until...', `TASK_MANAGER.openSnooze('${task.id}')`));
      items.push(this.menuItem('Move up', `TASK_MANAGER.move('${task.id}', -1${fromArg})`, index === 0));
      items.push(this.menuItem('Move down', `TASK_MANAGER.move('${task.id}', 1${fromArg})`, index === total - 1));
    } else {
      items.push(this.menuItem("I'll do it tomorrow", `TASK_MANAGER.moveTomorrow('${task.id}')`));
      items.push(this.menuItem('Snooze until...', `TASK_MANAGER.openSnooze('${task.id}')`));
      items.push(this.menuItem('Move up', `TASK_MANAGER.move('${task.id}', -1${fromArg})`, index === 0));
      items.push(this.menuItem('Move down', `TASK_MANAGER.move('${task.id}', 1${fromArg})`, index === total - 1));
    }
    items.push(this.menuItem('Edit', `TASK_MANAGER.startEdit('${task.id}')`));
    items.push(this.menuItem('Delete', `TASK_MANAGER.deleteTask('${task.id}')`));
    const title = `<span ondblclick="event.preventDefault();event.stopPropagation();TASK_MANAGER.startEdit('${task.id}')" class="${compact ? 'text-[10px]' : 'text-[11px]'} font-medium block truncate cursor-text ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}">${this.escape(task.title)}</span>`;
    const editPanel = `<div class="p-2 space-y-1.5">
      <p class="text-[9px] font-mono uppercase tracking-wide text-slate-500 px-0.5">Edit task</p>
      <textarea data-tm-edit="${task.id}" rows="4" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();TASK_MANAGER.commitEdit('${task.id}', this.value)} if(event.key==='Escape'){event.preventDefault();TASK_MANAGER.cancelEdit()}" class="w-full h-24 resize-none overflow-y-auto bg-brand-black border border-brand-gold rounded-md px-2 py-1.5 text-[11px] text-slate-200 font-mono leading-snug whitespace-pre-wrap break-words focus:outline-none">${this.escape(task.title)}</textarea>
      <button type="button" onclick="event.preventDefault();event.stopPropagation();TASK_MANAGER.commitFromOverlay('${task.id}')" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] py-1.5 rounded-md">Save</button>
    </div>`;
    const check = `<button type="button" onclick="event.preventDefault();event.stopPropagation();TASK_MANAGER.toggleTask('${task.id}')" class="w-5 h-5 rounded border flex items-center justify-center shrink-0 ${task.completed ? 'bg-brand-mint border-brand-mint text-slate-950' : 'border-slate-600 hover:border-brand-gold'}">${task.completed ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}</button>`;
    const meta = history
      ? `Completed ${this.fmtDate(task.completedAt || task.date)}`
      : future
        ? this.fmtDate(task.date)
        : (task.date < this.todayKey() ? `From ${this.fmtDate(task.date)}` : '');
    const canDrag = !task.completed && !history && !editing && !this.editId;
    return `
      <div data-tm-row="${task.id}" draggable="${canDrag ? 'true' : 'false'}" ondragstart="TASK_MANAGER.onDragStart(event, '${task.id}', '${from}')" ondragover="TASK_MANAGER.onDragOver(event, '${task.id}', '${from}')" ondragleave="TASK_MANAGER.onDragLeave(event)" ondrop="TASK_MANAGER.onDrop(event, '${task.id}', '${from}')" ondragend="TASK_MANAGER.onDragEnd()" class="flex items-start justify-between gap-2 ${compact ? 'p-2' : 'p-3'} rounded-xl bg-brand-black/70 border border-brand-border ${canDrag ? 'select-none' : ''}">
        <div class="flex items-start gap-2 min-w-0 flex-1">
          ${check}
          <div class="min-w-0 flex-1">
            ${title}
            ${meta && !compact ? `<span class="text-[9px] font-mono text-slate-500">${meta}</span>` : ''}
          </div>
        </div>
        <div class="relative shrink-0">
          <button type="button" data-tm-menu-btn="${task.id}" title="Settings" onclick="event.preventDefault();event.stopPropagation();TASK_MANAGER.toggleMenu('${task.id}')" class="w-7 h-7 rounded-md bg-slate-900 hover:bg-slate-800 border border-brand-border text-slate-400 hover:text-brand-gold flex items-center justify-center ${open ? 'text-brand-gold border-brand-gold/40' : ''}">
            <i class="fa-solid fa-gear text-[11px]"></i>
          </button>
          <div data-tm-menu="${task.id}" onclick="event.stopPropagation()" class="${open ? '' : 'hidden'} fixed z-50 ${editing ? 'w-72' : 'w-44'} rounded-lg border border-brand-border bg-slate-950 shadow-2xl ${editing ? '' : 'py-1'}">
            ${editing ? editPanel : items.join('')}
          </div>
        </div>
      </div>`;
  },

  renderPreview() {
    this.ensure();
    this.bind();
    const list = document.getElementById('cc-tm-list');
    const limitEl = document.getElementById('cc-tm-limit');
    const input = document.getElementById('cc-tm-new');
    const atLimit = this.todayOpen().length >= this.maxToday;
    if (limitEl) limitEl.classList.toggle('hidden', !atLimit);
    if (input) {
      input.disabled = atLimit;
      input.placeholder = atLimit ? 'Complete or Delete tasks to add more' : 'Type a task and hit Enter…';
    }
    if (!list) return;
    const rows = this.previewRows();
    const openCount = this.todayOpen().length;
    list.innerHTML = rows.map((task, index) => this.rowMarkup(task, index, openCount, task.completed ? 'history' : 'cc')).join('') || `<p class="text-[10px] text-slate-500 px-1">No tasks for today.</p>`;
    if (this.menuId) this.placeMenu(this.menuId);
  },

  render() {
    this.ensure();
    this.renderPreview();
    const root = document.getElementById('view-ent-tasks');
    if (!root) return;
    const open = this.todayOpen().length;
    const atLimit = open >= this.maxToday;
    const pendingEl = document.getElementById('tm-pending');
    if (pendingEl) pendingEl.textContent = `${open} / ${this.maxToday}`;
    const limitEl = document.getElementById('tm-limit');
    const form = document.getElementById('tm-add-form');
    const addBtn = document.getElementById('tm-add-btn');
    const input = document.getElementById('tm-new-task');
    const showAdd = this.view === 'today';
    if (form) form.classList.toggle('hidden', !showAdd);
    if (limitEl) {
      limitEl.classList.toggle('hidden', !(showAdd && atLimit));
    }
    if (input) {
      input.disabled = atLimit;
      input.placeholder = atLimit ? 'Complete or Delete tasks to add more' : 'Type a task and hit Enter…';
    }
    if (addBtn) addBtn.disabled = atLimit;
    ['today', 'history', 'future'].forEach((view) => {
      const btn = document.getElementById(`tm-tab-${view}`);
      if (!btn) return;
      const on = this.view === view;
      btn.className = `text-[10px] font-bold px-2.5 py-1 rounded-lg border ${on ? 'border-amber-500/40 bg-amber-500/10 text-brand-gold' : 'border-brand-border bg-brand-black text-slate-400 hover:text-slate-200'}`;
    });
    const list = document.getElementById('tm-list');
    if (!list) return;
    const rows = this.filtered();
    const empty = {
      today: 'No tasks for today.',
      history: 'No completed tasks yet.',
      future: 'No future tasks. Move or snooze one to a later date.'
    };
    const sortable = rows.filter((task) => !task.completed).length;
    list.innerHTML = rows.map((task, index) => this.rowMarkup(task, index, this.view === 'history' ? rows.length : sortable, this.view === 'history' ? 'history' : this.view)).join('') || `<p class="text-[11px] text-slate-500 px-1">${empty[this.view]}</p>`;
    if (this.menuId) this.placeMenu(this.menuId);
  },

  escape(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
};

const DIMAD_SHEET = {
  storageKey: 'dimad_excel_data',
  columns: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
  rowCount: 50,
  sheets: {},
  sheetList: ['Sales', 'Revenue'],
  activeSheet: 'Sales',
  selected: 'A1',
  editing: null,
  ribbon: 'home',
  bound: false,
  built: false,
  driveFileId: null,
  workbookName: 'Sales_Revenue_Workbook.xlsx',
  savedAt: null,
  dirty: false,
  pendingOpenId: null,
  zoom: 100,
  zoomKey: 'dimad_sheet_zoom',

  emptyCell() {
    return { raw: '', style: {} };
  },

  snapshot() {
    return {
      kind: 'dimad-sheet',
      version: 1,
      name: this.workbookName,
      sheets: this.sheets,
      sheetList: this.sheetList,
      activeSheet: this.activeSheet
    };
  },

  applyBook(book, meta) {
    if (!book || !book.sheets) return;
    this.sheets = book.sheets;
    this.sheetList = book.sheetList && book.sheetList.length ? book.sheetList : Object.keys(book.sheets);
    this.activeSheet = this.sheetList.includes(book.activeSheet) ? book.activeSheet : this.sheetList[0];
    if (meta) {
      if (meta.id) this.driveFileId = meta.id;
      if (meta.name) this.workbookName = meta.name;
      if (meta.updatedAt) this.savedAt = meta.updatedAt;
    }
    if (book.name && !meta) this.workbookName = book.name;
    this.dirty = false;
  },

  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (parsed && parsed.sheets) {
        this.applyBook(parsed, { id: parsed.driveFileId, name: parsed.workbookName, updatedAt: parsed.savedAt });
        return;
      }
    } catch (err) {}
    this.sheetList = ['Sales', 'Revenue'];
    this.activeSheet = 'Sales';
    this.sheets = { Sales: {}, Revenue: {} };
    this.workbookName = 'Sales_Revenue_Workbook.xlsx';
    this.driveFileId = null;
    this.seedSales();
  },

  save(keepClean) {
    if (!keepClean) this.dirty = true;
    localStorage.setItem(this.storageKey, JSON.stringify({
      ...this.snapshot(),
      driveFileId: this.driveFileId,
      workbookName: this.workbookName,
      savedAt: this.savedAt
    }));
    this.syncChrome();
  },

  syncChrome() {
    const name = document.getElementById('sheet-book-name');
    const status = document.getElementById('sheet-save-status');
    if (name) name.textContent = this.workbookName || 'Untitled.xlsx';
    if (!status) return;
    if (this.driveFileId && !this.dirty) {
      status.textContent = 'Saved to dimDrive';
      status.className = 'text-[9px] font-mono text-brand-mint bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0';
    } else if (this.driveFileId && this.dirty) {
      status.textContent = 'Unsaved changes';
      status.className = 'text-[9px] font-mono text-brand-gold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0';
    } else {
      status.textContent = 'Not in dimDrive';
      status.className = 'text-[9px] font-mono text-slate-400 bg-slate-900 border border-brand-border px-1.5 py-0.5 rounded shrink-0';
    }
  },

  markDirty() {
    this.dirty = true;
    this.syncChrome();
  },

  loadZoom() {
    const stored = parseInt(localStorage.getItem(this.zoomKey), 10);
    this.setZoom(Number.isFinite(stored) ? stored : 100, true);
  },

  zoomBy(delta) {
    this.setZoom(this.zoom + delta);
  },

  setZoom(value, skipStore) {
    const zoom = Math.max(25, Math.min(200, Math.round(Number(value) / 5) * 5));
    this.zoom = zoom;
    const table = document.getElementById('sheet-table');
    if (table) table.style.zoom = String(zoom / 100);
    const slider = document.getElementById('sheet-zoom-slider');
    const label = document.getElementById('sheet-zoom-label');
    if (slider) slider.value = String(zoom);
    if (label) label.textContent = zoom + '%';
    document.querySelectorAll('#sheet-zoom-menu button').forEach((btn) => {
      const on = parseInt(btn.textContent, 10) === zoom;
      btn.classList.toggle('text-brand-gold', on);
      btn.classList.toggle('font-bold', on);
      btn.classList.toggle('bg-amber-500/10', on);
    });
    if (!skipStore) localStorage.setItem(this.zoomKey, String(zoom));
  },

  toggleZoomMenu(force) {
    const menu = document.getElementById('sheet-zoom-menu');
    if (!menu) return;
    if (force === false) menu.classList.add('hidden');
    else if (force === true) menu.classList.remove('hidden');
    else menu.classList.toggle('hidden');
  },

  pickZoom(value) {
    this.setZoom(value);
    this.toggleZoomMenu(false);
  },

  saveToDrive() {
    this.commitEdit();
    if (typeof DIMDRIVE === 'undefined') return;
    const file = DIMDRIVE.upsertSheet({
      id: this.driveFileId,
      name: this.workbookName || 'Sales_Revenue_Workbook.xlsx',
      payload: { workbook: this.snapshot() }
    });
    this.driveFileId = file.id;
    this.workbookName = file.name;
    this.savedAt = file.updatedAt;
    this.dirty = false;
    this.save(true);
    if (DIMDRIVE.render) DIMDRIVE.render();
  },

  openPicker() {
    this.toggleExportMenu(false);
    const modal = document.getElementById('sheet-open-modal');
    const list = document.getElementById('sheet-open-list');
    if (!modal || !list) return;
    const files = typeof DIMDRIVE !== 'undefined' ? DIMDRIVE.listSheets() : [];
    list.innerHTML = files.length
      ? files.map((file) => `<button type="button" onclick="DIMAD_SHEET.openDriveFile('${file.id}')" class="w-full text-left px-3 py-2 rounded-lg border border-brand-border hover:border-brand-gold bg-brand-black">
          <div class="text-[11px] font-bold text-slate-100 truncate">${this.escape(file.name)}</div>
          <div class="text-[9px] font-mono text-slate-500">${this.escape(DIMDRIVE.formatStamp(file.updatedAt))}</div>
        </button>`).join('')
      : '<p class="text-[11px] text-slate-500 px-1">No workbooks in dimDrive yet. Save this sheet, or upload a file from another computer.</p>';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closePicker() {
    const modal = document.getElementById('sheet-open-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  openDriveFile(id) {
    if (typeof DIMDRIVE === 'undefined') return;
    const file = DIMDRIVE.get(id);
    if (!file || file.type !== 'sheet') return;
    const book = file.payload && file.payload.workbook ? file.payload.workbook : file.payload;
    this.applyBook(book, file);
    this.dirty = false;
    this.save(true);
    this.paintAll();
    this.renderTabs();
    this.selectCell('A1');
    this.closePicker();
    this.syncChrome();
  },

  toggleExportMenu(force) {
    const menu = document.getElementById('sheet-export-menu');
    if (!menu) return;
    if (force === false) menu.classList.add('hidden');
    else menu.classList.toggle('hidden');
  },

  exportWorkbook() {
    this.toggleExportMenu(false);
    const blob = new Blob([JSON.stringify(this.snapshot(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const name = String(this.workbookName || 'workbook').replace(/\.xlsx$/i, '') + '.dimsheet.json';
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
  },

  importPortable(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target.result || '');
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.sheets) {
          if (typeof DIMDRIVE !== 'undefined') {
            const saved = DIMDRIVE.upsertSheet({ name: parsed.name || file.name, payload: { workbook: parsed } });
            this.openDriveFile(saved.id);
          } else {
            this.applyBook(parsed);
            this.save();
            this.paintAll();
            this.renderTabs();
            this.selectCell('A1');
          }
          this.closePicker();
          event.target.value = '';
          return;
        }
      } catch (err) { /* csv fallback */ }
      this.importCsv({ target: { files: [file], value: '' } });
      this.closePicker();
      event.target.value = '';
    };
    reader.readAsText(file);
  },

  seedSales() {
    this.sheets.Sales = {
      A1: { raw: 'DIMAD — Sales & Revenue Runway', style: { bold: true, color: '#F59E0B' } },
      A3: { raw: 'Revenue Stream', style: { bold: true, bgColor: '#1E293B' } },
      B3: { raw: 'Monthly Amount ($)', style: { bold: true, bgColor: '#1E293B', align: 'right' } },
      A4: { raw: 'Stripe SaaS Subscriptions', style: {} },
      B4: { raw: '5420', style: { align: 'right' } },
      A5: { raw: 'Gumroad Digital Asset Sales', style: {} },
      B5: { raw: '1250', style: { align: 'right' } },
      A6: { raw: 'Client Advisory Retainers', style: {} },
      B6: { raw: '3500', style: { align: 'right' } },
      A7: { raw: 'Total Gross Revenue', style: { bold: true } },
      B7: { raw: '=SUM(B4:B6)', style: { bold: true, color: '#10B981', align: 'right' } },
      A9: { raw: 'Monthly Operating Expenses', style: { bold: true, bgColor: '#1E293B' } },
      B9: { raw: 'Cost ($)', style: { bold: true, bgColor: '#1E293B', align: 'right' } },
      A10: { raw: 'Nomad Housing & Co-working', style: {} },
      B10: { raw: '2200', style: { align: 'right' } },
      A11: { raw: 'Software & Cloud Infrastructure', style: {} },
      B11: { raw: '450', style: { align: 'right' } },
      A12: { raw: 'Total Monthly Burn', style: { bold: true } },
      B12: { raw: '=SUM(B10:B11)', style: { bold: true, color: '#EF4444', align: 'right' } },
      A14: { raw: 'Net Monthly Cashflow', style: { bold: true, bgColor: '#12261c' } },
      B14: { raw: '=B7-B12', style: { bold: true, color: '#10B981', align: 'right', bgColor: '#12261c' } }
    };
    this.sheets.Revenue = this.sheets.Revenue || {};
  },

  mount() {
    this.load();
    this.buildGrid();
    this.bind();
    this.setRibbon(this.ribbon);
    if (this.pendingOpenId) {
      this.openDriveFile(this.pendingOpenId);
      this.pendingOpenId = null;
    }
    this.paintAll();
    this.selectCell(this.selected || 'A1');
    this.renderTabs();
    this.syncChrome();
    this.loadZoom();
  },

  buildGrid() {
    const table = document.getElementById('sheet-table');
    if (!table) return;
    if (table.querySelector('.sheet-cell') && this.built) return;
    let head = '<thead><tr><th class="sticky top-0 left-0 z-30 w-10 h-6 bg-[#0B0F17] border border-[#1E293B] text-[9px] text-slate-500"></th>';
    this.columns.forEach((col, idx) => {
      head += `<th data-col="${idx}" class="sheet-col sticky top-0 z-20 bg-[#0B0F17] border border-[#1E293B] text-center text-[10px] font-normal text-slate-400">${col}</th>`;
    });
    head += '</tr></thead><tbody>';
    let body = '';
    for (let r = 1; r <= this.rowCount; r++) {
      body += `<tr><td data-row="${r}" class="sheet-row sticky left-0 z-10 w-10 h-6 bg-[#0B0F17] border border-[#1E293B] text-center text-[10px] text-slate-500">${r}</td>`;
      this.columns.forEach((col) => {
        const ref = col + r;
        body += `<td data-ref="${ref}" class="sheet-cell border border-[#1E293B] bg-[#070A0F] text-slate-200 relative p-0 overflow-hidden"></td>`;
      });
      body += '</tr>';
    }
    table.innerHTML = head + body + '</tbody>';
    this.built = true;
  },

  bind() {
    const wrap = document.getElementById('sheet-grid-wrap');
    if (wrap && wrap.dataset.zoomBound !== '1') {
      wrap.dataset.zoomBound = '1';
      wrap.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.zoomBy(e.deltaY < 0 ? 10 : -10);
      }, { passive: false });
    }
    const table = document.getElementById('sheet-table');
    if (!table || table.dataset.sheetBound === '1') return;
    table.dataset.sheetBound = '1';
    table.addEventListener('mousedown', (e) => {
      if (e.target.closest('input')) return;
      const cell = e.target.closest('.sheet-cell');
      if (cell) this.editCell(cell.dataset.ref);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#sheet-export-menu') && !String(e.target.closest('button') && e.target.closest('button').getAttribute('onclick') || '').includes('toggleExportMenu')) {
        this.toggleExportMenu(false);
      }
      if (!e.target.closest('#sheet-zoom-menu') && !e.target.closest('#sheet-zoom-label')) {
        this.toggleZoomMenu(false);
      }
    });
    this.bound = true;
  },

  setRibbon(name) {
    this.ribbon = name;
    ['home', 'insert', 'formulas'].forEach((tab) => {
      const panel = document.getElementById(`sheet-ribbon-${tab}`);
      if (panel) panel.style.display = tab === name ? 'flex' : 'none';
      const btn = document.querySelector(`[data-sheet-ribbon="${tab}"]`);
      if (btn) btn.className = tab === name
        ? 'px-3 py-1 rounded-t bg-brand-panel text-brand-gold font-bold'
        : 'px-3 py-1 rounded-t text-slate-400 hover:text-slate-200';
    });
  },

  ensure(ref) {
    if (!this.sheets[this.activeSheet]) this.sheets[this.activeSheet] = {};
    if (!this.sheets[this.activeSheet][ref]) this.sheets[this.activeSheet][ref] = this.emptyCell();
    return this.sheets[this.activeSheet][ref];
  },

  get(ref) {
    return (this.sheets[this.activeSheet] && this.sheets[this.activeSheet][ref]) || this.emptyCell();
  },

  selectCell(ref) {
    this.commitEdit();
    this.selected = ref;
    const refEl = document.getElementById('sheet-ref');
    const formula = document.getElementById('sheet-formula');
    if (refEl) refEl.textContent = ref;
    if (formula) formula.value = this.get(ref).raw || '';
    document.querySelectorAll('.sheet-cell.sheet-active').forEach((el) => el.classList.remove('sheet-active'));
    const td = document.querySelector(`.sheet-cell[data-ref="${ref}"]`);
    if (td) td.classList.add('sheet-active');
    const col = ref.replace(/[0-9]/g, '');
    const row = ref.replace(/\D/g, '');
    document.querySelectorAll('.sheet-col').forEach((el) => {
      const on = this.columns[Number(el.dataset.col)] === col;
      el.classList.toggle('text-brand-gold', on);
      el.classList.toggle('bg-amber-500/10', on);
    });
    document.querySelectorAll('.sheet-row').forEach((el) => {
      const on = String(el.dataset.row) === String(row);
      el.classList.toggle('text-brand-gold', on);
      el.classList.toggle('bg-amber-500/10', on);
    });
    const style = this.get(ref).style || {};
    const boldBtn = document.getElementById('sheet-bold');
    const italicBtn = document.getElementById('sheet-italic');
    if (boldBtn) boldBtn.classList.toggle('bg-amber-500/20', !!style.bold);
    if (italicBtn) italicBtn.classList.toggle('bg-amber-500/20', !!style.italic);
    this.metrics();
  },

  editCell(ref) {
    if (this.editing === ref) {
      const live = document.querySelector(`.sheet-cell[data-ref="${ref}"] input`);
      if (live) live.focus();
      return;
    }
    this.selectCell(ref);
    this.editing = ref;
    const td = document.querySelector(`.sheet-cell[data-ref="${ref}"]`);
    if (!td) return;
    td.innerHTML = `<input class="w-full h-full bg-brand-panel text-slate-100 px-1.5 text-[11px] font-mono" value="${this.escapeAttr(this.get(ref).raw)}">`;
    const input = td.querySelector('input');
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.commitEdit();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        this.commitEdit();
        const col = ref.replace(/[0-9]/g, '');
        const row = parseInt(ref.replace(/\D/g, ''), 10);
        const idx = this.columns.indexOf(col);
        if (idx < this.columns.length - 1) this.editCell(this.columns[idx + 1] + row);
      }
    });
    input.addEventListener('blur', () => this.commitEdit());
  },

  commitEdit() {
    if (!this.editing) return;
    const td = document.querySelector(`.sheet-cell[data-ref="${this.editing}"]`);
    const input = td && td.querySelector('input');
    if (input) this.ensure(this.editing).raw = input.value;
    const ref = this.editing;
    this.editing = null;
    this.save();
    this.paintAll();
    this.selectCell(ref);
  },

  formulaInput(value) {
    this.ensure(this.selected).raw = value;
    this.save();
    this.paintAll();
  },

  toggleStyle(prop) {
    const cell = this.ensure(this.selected);
    cell.style = cell.style || {};
    cell.style[prop] = !cell.style[prop];
    this.save();
    this.paintCell(this.selected);
    this.selectCell(this.selected);
  },

  setAlign(align) {
    this.ensure(this.selected).style.align = align;
    this.save();
    this.paintCell(this.selected);
  },

  applyColor(prop, value) {
    this.ensure(this.selected).style[prop] = value;
    this.save();
    this.paintCell(this.selected);
  },

  formatMoney() {
    const val = parseFloat(this.display(this.selected));
    if (isNaN(val)) return;
    this.ensure(this.selected).raw = '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2 });
    this.save();
    this.paintAll();
    this.selectCell(this.selected);
  },

  formatPercent() {
    const val = parseFloat(this.display(this.selected));
    if (isNaN(val)) return;
    this.ensure(this.selected).raw = (val * 100).toFixed(1) + '%';
    this.save();
    this.paintAll();
    this.selectCell(this.selected);
  },

  copyCell() {
    const raw = this.get(this.selected).raw || '';
    if (navigator.clipboard) navigator.clipboard.writeText(raw);
  },

  clearCell() {
    this.ensure(this.selected).raw = '';
    this.save();
    this.paintAll();
    this.selectCell(this.selected);
  },

  insertFormula(fn) {
    const raw = `=${fn}(B4:B6)`;
    this.ensure(this.selected).raw = raw;
    this.save();
    this.paintAll();
    this.selectCell(this.selected);
  },

  insertSample() {
    this.seedSales();
    this.save();
    this.paintAll();
    this.selectCell('A1');
  },

  clearSheet() {
    if (!confirm('Clear the entire current sheet?')) return;
    this.sheets[this.activeSheet] = {};
    this.save();
    this.paintAll();
    this.selectCell('A1');
  },

  addSheet() {
    let n = this.sheetList.length + 1;
    let name = 'Sheet' + n;
    while (this.sheetList.includes(name)) {
      n += 1;
      name = 'Sheet' + n;
    }
    this.sheetList.push(name);
    this.sheets[name] = {};
    this.activeSheet = name;
    this.save();
    this.paintAll();
    this.renderTabs();
    this.selectCell('A1');
  },

  switchSheet(name) {
    this.commitEdit();
    this.activeSheet = name;
    this.save();
    this.paintAll();
    this.renderTabs();
    this.selectCell('A1');
  },

  deleteSheet(name) {
    if (this.sheetList.length <= 1) return;
    this.sheetList = this.sheetList.filter((s) => s !== name);
    delete this.sheets[name];
    this.activeSheet = this.sheetList[0];
    this.save();
    this.paintAll();
    this.renderTabs();
    this.selectCell('A1');
  },

  renderTabs() {
    const wrap = document.getElementById('sheet-tabs');
    if (!wrap) return;
    wrap.innerHTML = this.sheetList.map((name) => {
      const on = name === this.activeSheet;
      const close = this.sheetList.length > 1 && on
        ? `<button type="button" onclick="event.stopPropagation(); DIMAD_SHEET.deleteSheet('${name}')" class="ml-1 text-slate-500 hover:text-red-400"><i class="fa-solid fa-xmark text-[9px]"></i></button>`
        : '';
      return `<button type="button" onclick="DIMAD_SHEET.switchSheet('${name}')" class="px-3 py-1 text-[10px] ${on ? 'bg-brand-panel text-brand-gold font-bold border-t-2 border-brand-gold' : 'text-slate-400 hover:text-slate-200'}">${this.escape(name)}${close}</button>`;
    }).join('');
  },

  paintAll() {
    this.columns.forEach((col) => {
      for (let r = 1; r <= this.rowCount; r++) this.paintCell(col + r);
    });
    this.metrics();
  },

  paintCell(ref) {
    if (this.editing === ref) return;
    const td = document.querySelector(`.sheet-cell[data-ref="${ref}"]`);
    if (!td) return;
    const cell = this.get(ref);
    const style = cell.style || {};
    const align = style.align === 'center' ? 'justify-center text-center' : style.align === 'right' ? 'justify-end text-right' : 'justify-start text-left';
    const weight = style.bold ? 'font-bold' : '';
    const italic = style.italic ? 'italic' : '';
    const color = style.color || '#e2e8f0';
    const bg = style.bgColor || '#070A0F';
    td.style.backgroundColor = bg;
    td.innerHTML = `<div class="w-full h-full px-1.5 flex items-center truncate ${align} ${weight} ${italic}" style="color:${color}">${this.escape(this.display(ref))}</div>`;
  },

  display(ref, stack) {
    const raw = this.get(ref).raw;
    if (!raw) return '';
    if (!String(raw).startsWith('=')) return raw;
    return this.evalFormula(raw, stack || new Set());
  },

  evalFormula(formula, stack) {
    try {
      let expr = formula.substring(1).toUpperCase().trim();
      const range = expr.match(/^(SUM|AVERAGE|MIN|MAX|COUNT)\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)$/);
      if (range) {
        const values = this.rangeValues(range[2], range[3], stack);
        if (range[1] === 'SUM') return values.reduce((a, b) => a + b, 0);
        if (range[1] === 'AVERAGE') return values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0;
        if (range[1] === 'MIN') return values.length ? Math.min(...values) : 0;
        if (range[1] === 'MAX') return values.length ? Math.max(...values) : 0;
        if (range[1] === 'COUNT') return values.length;
      }
      const replaced = expr.replace(/[A-Z]+[0-9]+/g, (match) => {
        if (stack.has(match)) return '0';
        const next = new Set(stack);
        next.add(match);
        const val = parseFloat(this.display(match, next));
        return isNaN(val) ? '0' : String(val);
      });
      if (!/^[\d+\-*/().\s]+$/.test(replaced)) return '#VALUE!';
      const result = Function('"use strict"; return (' + replaced + ')')();
      return Number.isFinite(result) ? result : '#VALUE!';
    } catch (err) {
      return '#ERROR!';
    }
  },

  rangeValues(startRef, endRef, stack) {
    const startCol = startRef.replace(/[0-9]/g, '');
    const startRow = parseInt(startRef.replace(/\D/g, ''), 10);
    const endCol = endRef.replace(/[0-9]/g, '');
    const endRow = parseInt(endRef.replace(/\D/g, ''), 10);
    const minC = Math.min(this.columns.indexOf(startCol), this.columns.indexOf(endCol));
    const maxC = Math.max(this.columns.indexOf(startCol), this.columns.indexOf(endCol));
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const values = [];
    for (let c = minC; c <= maxC; c++) {
      for (let r = minR; r <= maxR; r++) {
        const ref = this.columns[c] + r;
        if (stack && stack.has(ref)) continue;
        const next = new Set(stack || []);
        next.add(ref);
        const val = parseFloat(this.display(ref, next));
        if (!isNaN(val)) values.push(val);
      }
    }
    return values;
  },

  metrics() {
    let sum = 0;
    let count = 0;
    for (let r = 1; r <= this.rowCount; r++) {
      const val = parseFloat(this.display('B' + r));
      if (!isNaN(val)) {
        sum += val;
        count += 1;
      }
    }
    const avg = document.getElementById('sheet-avg');
    const countEl = document.getElementById('sheet-count');
    const sumEl = document.getElementById('sheet-sum');
    if (avg) avg.textContent = count ? (sum / count).toFixed(2) : '0';
    if (countEl) countEl.textContent = String(count);
    if (sumEl) sumEl.textContent = sum.toLocaleString();
  },

  exportCsv() {
    this.toggleExportMenu(false);
    let csv = '';
    for (let r = 1; r <= 30; r++) {
      const row = [];
      for (let c = 0; c < 10; c++) {
        const val = String(this.display(this.columns[c] + r)).replace(/"/g, '""');
        row.push(`"${val}"`);
      }
      csv += row.join(',') + '\r\n';
    }
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = `${this.activeSheet}_export.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  importCsv(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      String(e.target.result).split(/\r?\n/).forEach((line, rIdx) => {
        if (rIdx >= this.rowCount) return;
        line.split(',').forEach((cellVal, cIdx) => {
          if (cIdx >= this.columns.length) return;
          const clean = cellVal.replace(/^"|"$/g, '').trim();
          if (!clean) return;
          this.ensure(this.columns[cIdx] + (rIdx + 1)).raw = clean;
        });
      });
      this.save();
      this.paintAll();
      this.selectCell('A1');
      event.target.value = '';
    };
    reader.readAsText(file);
  },

  escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  },

  escapeAttr(value) {
    return this.escape(value).replace(/\n/g, ' ');
  }
};

const INVOICES = {
  storageKey: 'dimad_invoices_data',
  tab: 'invoices',
  filter: 'All',
  search: '',
  draftLines: [{ description: 'Consulting Advisory Block', qty: 1, rate: 2500 }],
  toastTimer: null,
  invoices: [],
  proposals: [],
  clients: [],
  editingInvoiceId: null,
  editingClientId: null,

  seed() {
    return {
      clients: [
        { id: 'c1', name: 'Apex Media Group', company: 'Apex Inc', email: 'billing@apexmedia.com', currency: 'USD', location: 'New York, USA', timezone: 'America/New_York', defaultTerms: 'Net 15' },
        { id: 'c2', name: 'Klaus & Partners', company: 'Klaus GmbH', email: 'accounts@klaus.de', currency: 'EUR', location: 'Berlin, Germany', timezone: 'Europe/Berlin', defaultTerms: 'Net 30' },
        { id: 'c3', name: 'Solaris Digital', company: 'Solaris LTD', email: 'hello@solaris.co.uk', currency: 'GBP', location: 'London, UK', timezone: 'Europe/London', defaultTerms: 'Due on Receipt' }
      ],
      invoices: [
        { id: 'inv-1', number: 'DIM-2026-001', clientId: 'c1', clientName: 'Apex Media Group', title: 'Q1 Growth & System Architecture', issueDate: '2026-03-01', dueDate: '2026-03-16', total: 6500, currency: 'USD', status: 'Sent', stripeLink: 'https://buy.stripe.com/test_1', items: [{ description: 'Strategy & Execution Sprint', qty: 1, rate: 6500 }] },
        { id: 'inv-2', number: 'DIM-2026-002', clientId: 'c2', clientName: 'Klaus & Partners', title: 'Asynchronous Workflow Design', issueDate: '2026-02-10', dueDate: '2026-02-25', total: 1200, currency: 'EUR', status: 'Overdue', stripeLink: '', items: [{ description: 'Workflow Optimization', qty: 12, rate: 100 }] },
        { id: 'inv-3', number: 'DIM-2026-003', clientId: 'c3', clientName: 'Solaris Digital', title: 'Monthly Executive Retainer', issueDate: '2026-03-05', dueDate: '2026-03-05', total: 4500, currency: 'GBP', status: 'Paid', stripeLink: 'https://buy.stripe.com/test_3', items: [{ description: 'Advisory Retainer', qty: 1, rate: 4500 }] }
      ],
      proposals: [
        { id: 'prop-1', number: 'PROP-2026-101', clientId: 'c1', clientName: 'Apex Media Group', title: 'Full Stack Brand Re-positioning', total: 12000, currency: 'USD', validUntil: '2026-04-01', stage: 'Draft', items: [{ description: 'Scope Phase 1', qty: 1, rate: 12000 }] },
        { id: 'prop-2', number: 'PROP-2026-102', clientId: 'c2', clientName: 'Klaus & Partners', title: 'Custom Operational Dashboard', total: 8500, currency: 'EUR', validUntil: '2026-03-28', stage: 'Sent', items: [{ description: 'Dashboard Engineering', qty: 1, rate: 8500 }] },
        { id: 'prop-3', number: 'PROP-2026-103', clientId: 'c3', clientName: 'Solaris Digital', title: 'Growth Engine Retainer', total: 6500, currency: 'GBP', validUntil: '2026-03-20', stage: 'Accepted', items: [{ description: 'Growth Advisory', qty: 1, rate: 6500 }] }
      ]
    };
  },

  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (parsed && Array.isArray(parsed.invoices)) {
        this.invoices = parsed.invoices;
        this.proposals = parsed.proposals || [];
        this.clients = parsed.clients || [];
        return;
      }
    } catch (err) {}
    const seed = this.seed();
    this.invoices = seed.invoices;
    this.proposals = seed.proposals;
    this.clients = seed.clients;
  },

  persist() {
    localStorage.setItem(this.storageKey, JSON.stringify({
      invoices: this.invoices,
      proposals: this.proposals,
      clients: this.clients
    }));
  },

  mount() {
    this.load();
    this.render();
  },

  setTab(tab) {
    this.tab = tab;
    this.render();
  },

  setSearch(value) {
    this.search = value || '';
    this.render();
  },

  setFilter(status) {
    this.filter = status;
    this.render();
  },

  money(amount, currency) {
    const symbols = { USD: '$', EUR: '€', GBP: '£', CAD: '$', AUD: '$' };
    return (symbols[currency] || '$') + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  },

  clientTime(tz) {
    try {
      return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      return '—';
    }
  },

  toast(message) {
    const el = document.getElementById('inv-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
  },

  metrics() {
    let outstanding = 0;
    let overdue = 0;
    let collected = 0;
    let unpaid = 0;
    let overdueN = 0;
    this.invoices.forEach((inv) => {
      if (inv.status === 'Sent') {
        outstanding += inv.total;
        unpaid += 1;
      } else if (inv.status === 'Overdue') {
        outstanding += inv.total;
        overdue += inv.total;
        unpaid += 1;
        overdueN += 1;
      } else if (inv.status === 'Paid') collected += inv.total;
    });
    const openProps = this.proposals.filter((p) => p.stage !== 'Closed');
    const pipeline = openProps.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set('inv-m-outstanding', this.money(outstanding));
    set('inv-m-unpaid', unpaid + ' pending');
    set('inv-m-collected', this.money(collected));
    set('inv-m-overdue', this.money(overdue));
    set('inv-m-overdue-n', overdueN + ' need attention');
    set('inv-m-pipeline', this.money(pipeline));
    set('inv-m-props', openProps.length + ' active proposals');
  },

  filteredInvoices() {
    const q = this.search.toLowerCase();
    return this.invoices.filter((inv) => {
      const okStatus = this.filter === 'All' || inv.status === this.filter;
      const okSearch = !q || String(inv.clientName).toLowerCase().includes(q) || String(inv.number).toLowerCase().includes(q) || String(inv.title).toLowerCase().includes(q);
      return okStatus && okSearch;
    });
  },

  statusBadge(status) {
    const map = {
      Paid: 'bg-emerald-500/10 text-brand-mint border-emerald-500/30',
      Sent: 'bg-sky-500/10 text-brand-accent border-sky-500/30',
      Overdue: 'bg-red-500/10 text-brand-alert border-red-500/30',
      Draft: 'bg-slate-800 text-slate-300 border-slate-700'
    };
    return map[status] || map.Draft;
  },

  tabClass(id) {
    const on = this.tab === id;
    return `px-3 py-1.5 rounded-lg text-[10px] font-bold border ${on ? 'border-amber-500/40 bg-amber-500/10 text-brand-gold' : 'border-brand-border bg-brand-black text-slate-400 hover:text-slate-200'}`;
  },

  render() {
    if (!document.getElementById('view-ent-invoices')) return;
    this.metrics();
    ['invoices', 'proposals', 'clients'].forEach((tab) => {
      const btn = document.querySelector(`[data-inv-tab="${tab}"]`);
      if (btn) btn.className = this.tabClass(tab);
      const panel = document.getElementById(`inv-panel-${tab}`);
      if (panel) panel.classList.toggle('hidden', this.tab !== tab);
    });
    const counts = {
      invoices: this.invoices.length,
      proposals: this.proposals.length,
      clients: this.clients.length
    };
    ['invoices', 'proposals', 'clients'].forEach((tab) => {
      const btn = document.querySelector(`[data-inv-tab="${tab}"]`);
      if (!btn) return;
      const labels = { invoices: 'Invoices', proposals: 'Proposals', clients: 'Clients' };
      btn.textContent = `${labels[tab]} (${counts[tab]})`;
    });
    if (this.tab === 'invoices') this.renderInvoices();
    if (this.tab === 'proposals') this.renderProposals();
    if (this.tab === 'clients') this.renderClients();
  },

  renderInvoices() {
    const root = document.getElementById('inv-panel-invoices');
    if (!root) return;
    const rows = this.filteredInvoices();
    const filters = ['All', 'Paid', 'Sent', 'Draft', 'Overdue'];
    root.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 bg-brand-panel border border-brand-border rounded-xl p-2.5">
        <div class="flex items-center gap-1 flex-wrap">
          <span class="text-[10px] text-slate-500 mr-1">Status</span>
          ${filters.map((status) => `<button type="button" onclick="INVOICES.setFilter('${status}')" class="px-2 py-1 text-[10px] rounded-md border ${this.filter === status ? 'border-amber-500/40 bg-amber-500/10 text-brand-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'}">${status}</button>`).join('')}
        </div>
        <div class="text-[10px] text-slate-500">${rows.length} invoices</div>
      </div>
      <div class="bg-brand-panel border border-brand-border rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[11px] text-slate-300">
            <thead class="bg-brand-black text-slate-400 text-[9px] uppercase tracking-wider border-b border-brand-border">
              <tr>
                <th class="py-2.5 px-3">ID</th>
                <th class="py-2.5 px-3">Client</th>
                <th class="py-2.5 px-3">Dates</th>
                <th class="py-2.5 px-3 text-right">Amount</th>
                <th class="py-2.5 px-3 text-center">Status</th>
                <th class="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-brand-border">
              ${rows.map((inv) => `<tr class="hover:bg-slate-900/50">
                <td class="py-2.5 px-3"><button type="button" onclick="INVOICES.openInvoiceModal('${inv.id}')" class="font-mono text-brand-gold font-bold hover:underline">${this.escape(inv.number)}</button></td>
                <td class="py-2.5 px-3"><button type="button" onclick="INVOICES.openClientModal('${inv.clientId}')" class="text-left"><div class="text-white font-bold hover:text-brand-gold hover:underline">${this.escape(inv.clientName)}</div><div class="text-[10px] text-slate-500">${this.escape(inv.title)}</div></button></td>
                <td class="py-2.5 px-3 font-mono text-[10px] text-slate-400">Issued ${this.escape(inv.issueDate)}<div class="${inv.status === 'Overdue' ? 'text-brand-alert font-bold' : ''}">Due ${this.escape(inv.dueDate)}</div></td>
                <td class="py-2.5 px-3 text-right font-mono text-white font-bold">${this.money(inv.total, inv.currency)}</td>
                <td class="py-2.5 px-3 text-center">
                  <select onchange="INVOICES.setStatus('${inv.id}', this.value)" class="bg-brand-black border rounded-full px-2 py-0.5 text-[9px] font-bold cursor-pointer ${this.statusBadge(inv.status)}">
                    ${['Draft', 'Sent', 'Paid', 'Overdue'].map((status) => `<option ${inv.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                  </select>
                </td>
                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                  <button type="button" onclick="INVOICES.copyLink('${inv.id}')" class="p-1.5 rounded border border-brand-border text-brand-mint" title="Copy Stripe link"><i class="fa-solid fa-link text-[10px]"></i></button>
                  <button type="button" onclick="INVOICES.nudge('${inv.id}')" class="p-1.5 rounded border border-brand-border text-brand-gold" title="Nudge"><i class="fa-solid fa-paper-plane text-[10px]"></i></button>
                  <button type="button" onclick="INVOICES.toggleStatus('${inv.id}')" class="p-1.5 rounded border border-brand-border text-brand-accent" title="Toggle paid"><i class="fa-solid fa-rotate text-[10px]"></i></button>
                  <button type="button" onclick="INVOICES.preview('invoice','${inv.id}')" class="p-1.5 rounded bg-amber-500 text-slate-950" title="Preview"><i class="fa-solid fa-eye text-[10px]"></i></button>
                </td>
              </tr>`).join('') || `<tr><td colspan="6" class="py-8 text-center text-slate-500 text-[11px]">No invoices match the current filters.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  renderProposals() {
    const root = document.getElementById('inv-panel-proposals');
    if (!root) return;
    const stages = [
      { id: 'Draft', label: '1. Drafts', next: 'Sent', nextLabel: 'Send →' },
      { id: 'Sent', label: '2. Sent / Viewed', next: 'Accepted', nextLabel: 'Accept' },
      { id: 'Accepted', label: '3. Accepted', next: 'invoice', nextLabel: 'Invoice →' },
      { id: 'Closed', label: '4. Closed', next: null, nextLabel: '' }
    ];
    root.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-4 gap-3">${stages.map((stage) => {
      const cards = this.proposals.filter((p) => p.stage === stage.id);
      return `<div class="bg-brand-panel border border-brand-border rounded-xl p-3 space-y-2">
        <div class="flex items-center justify-between border-b border-brand-border pb-2">
          <span class="text-[10px] font-bold uppercase tracking-wider ${stage.id === 'Accepted' ? 'text-brand-gold' : 'text-slate-300'}">${stage.label}</span>
          <span class="text-[9px] font-mono text-slate-400 bg-brand-black px-1.5 py-0.5 rounded">${cards.length}</span>
        </div>
        ${cards.map((prop) => `<div class="bg-brand-black border ${stage.id === 'Accepted' ? 'border-amber-500/30' : 'border-brand-border'} rounded-lg p-2.5">
          <div class="flex justify-between text-[9px] font-mono text-slate-500"><span>${this.escape(prop.number)}</span><span>${this.escape(prop.validUntil || '')}</span></div>
          <div class="text-[11px] font-bold text-white mt-1">${this.escape(prop.clientName)}</div>
          <div class="text-[10px] text-slate-400 truncate">${this.escape(prop.title)}</div>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-[11px] font-mono font-bold text-brand-gold">${this.money(prop.total, prop.currency)}</span>
            ${stage.next === 'invoice' ? `<button type="button" onclick="INVOICES.convert('${prop.id}')" class="text-[9px] font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded">Invoice →</button>` : ''}
            ${stage.next && stage.next !== 'invoice' ? `<button type="button" onclick="INVOICES.moveProposal('${prop.id}','${stage.next}')" class="text-[9px] font-bold border border-brand-border text-slate-200 px-2 py-1 rounded hover:text-brand-gold">${stage.nextLabel}</button>` : ''}
          </div>
        </div>`).join('') || '<p class="text-[10px] text-slate-600 px-1">Empty</p>'}
      </div>`;
    }).join('')}</div>`;
  },

  renderClients() {
    const root = document.getElementById('inv-panel-clients');
    if (!root) return;
    const q = this.search.toLowerCase();
    const list = this.clients.filter((c) => !q || c.name.toLowerCase().includes(q) || String(c.company).toLowerCase().includes(q));
    root.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-3">${list.map((client) => `<button type="button" onclick="INVOICES.openClientModal('${client.id}')" class="bg-brand-panel border border-brand-border rounded-xl p-4 space-y-3 text-left hover:border-brand-gold/50">
      <div class="flex items-start justify-between">
        <div class="w-9 h-9 rounded-lg bg-brand-black border border-brand-border flex items-center justify-center font-bold text-brand-gold text-[11px]">${this.escape(client.name.slice(0, 2).toUpperCase())}</div>
        <span class="text-[9px] font-mono text-brand-gold border border-amber-500/30 px-1.5 py-0.5 rounded">${this.escape(client.currency)}</span>
      </div>
      <div>
        <h3 class="text-[13px] font-black text-white hover:text-brand-gold">${this.escape(client.name)}</h3>
        <p class="text-[11px] text-slate-400">${this.escape(client.company)}</p>
        <p class="text-[10px] font-mono text-slate-500">${this.escape(client.email)}</p>
      </div>
      <div class="pt-2 border-t border-brand-border space-y-1 text-[10px] text-slate-400">
        <div class="flex justify-between"><span>Location</span><span class="text-slate-200">${this.escape(client.location)}</span></div>
        <div class="flex justify-between"><span>Local time</span><span class="text-brand-gold font-mono">${this.escape(this.clientTime(client.timezone))}</span></div>
        <div class="flex justify-between"><span>Terms</span><span class="text-slate-200">${this.escape(client.defaultTerms)}</span></div>
      </div>
    </button>`).join('')}</div>`;
  },

  showModal(id) {
    this.closeModals();
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
  },

  closeModals() {
    ['inv-invoice-modal', 'inv-proposal-modal', 'inv-client-modal', 'inv-preview-modal'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('hidden');
      el.classList.remove('flex');
    });
  },

  fillClientSelect(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = this.clients.map((c) => `<option value="${this.escape(c.id)}">${this.escape(c.name)}</option>`).join('');
  },

  openInvoiceModal(id) {
    this.editingInvoiceId = id || null;
    this.fillClientSelect('inv-new-client');
    const inv = id ? this.invoices.find((i) => i.id === id) : null;
    const title = document.getElementById('inv-modal-title');
    const saveBtn = document.getElementById('inv-modal-save');
    const set = (elId, value) => {
      const el = document.getElementById(elId);
      if (el) el.value = value;
    };
    if (title) title.textContent = inv ? 'Edit invoice' : 'Create invoice';
    if (saveBtn) saveBtn.textContent = inv ? 'Save changes' : 'Generate';
    if (inv) {
      set('inv-new-client', inv.clientId);
      set('inv-new-number', inv.number);
      set('inv-new-currency', inv.currency || 'USD');
      set('inv-new-terms', inv.terms || 'Net 15');
      set('inv-new-date', inv.issueDate || '');
      set('inv-new-due', inv.dueDate || '');
      set('inv-new-status', inv.status || 'Sent');
      set('inv-new-stripe', inv.stripeLink || '');
      this.draftLines = (inv.items && inv.items.length) ? inv.items.map((item) => ({ ...item })) : [{ description: inv.title || '', qty: 1, rate: inv.total || 0 }];
    } else {
      set('inv-new-number', 'DIM-2026-00' + (this.invoices.length + 1));
      set('inv-new-date', new Date().toISOString().slice(0, 10));
      set('inv-new-due', new Date().toISOString().slice(0, 10));
      set('inv-new-status', 'Sent');
      set('inv-new-stripe', '');
      this.draftLines = [{ description: 'Consulting Advisory Block', qty: 1, rate: 2500 }];
    }
    this.renderLines();
    this.showModal('inv-invoice-modal');
  },

  renderLines() {
    const wrap = document.getElementById('inv-new-lines');
    if (!wrap) return;
    wrap.innerHTML = this.draftLines.map((item, index) => `<div class="grid grid-cols-12 gap-2 items-center bg-brand-black border border-brand-border rounded-lg p-2">
      <input value="${this.escape(item.description)}" oninput="INVOICES.draftLines[${index}].description=this.value" class="col-span-6 bg-transparent text-[11px] text-slate-200 outline-none" placeholder="Description">
      <input type="number" value="${item.qty}" oninput="INVOICES.draftLines[${index}].qty=Number(this.value); INVOICES.updateDraftTotal()" class="col-span-2 bg-brand-panel border border-brand-border rounded px-2 py-1 text-right text-[11px] text-white">
      <input type="number" value="${item.rate}" oninput="INVOICES.draftLines[${index}].rate=Number(this.value); INVOICES.updateDraftTotal()" class="col-span-3 bg-brand-panel border border-brand-border rounded px-2 py-1 text-right text-[11px] text-white">
      <button type="button" onclick="INVOICES.removeLine(${index})" class="col-span-1 text-slate-500 hover:text-brand-alert"><i class="fa-solid fa-trash text-[10px]"></i></button>
    </div>`).join('');
    this.updateDraftTotal();
  },

  addLine() {
    this.draftLines.push({ description: '', qty: 1, rate: 0 });
    this.renderLines();
  },

  removeLine(index) {
    if (this.draftLines.length <= 1) return;
    this.draftLines.splice(index, 1);
    this.renderLines();
  },

  updateDraftTotal() {
    const total = this.draftLines.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
    const el = document.getElementById('inv-new-total');
    const cur = document.getElementById('inv-new-currency');
    if (el) el.textContent = this.money(total, cur ? cur.value : 'USD');
  },

  saveInvoice() {
    const client = this.clients.find((c) => c.id === document.getElementById('inv-new-client').value);
    const issue = document.getElementById('inv-new-date').value;
    const due = document.getElementById('inv-new-due').value || issue;
    const total = this.draftLines.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
    const payload = {
      number: document.getElementById('inv-new-number').value,
      clientId: client ? client.id : '',
      clientName: client ? client.name : 'Client',
      title: this.draftLines[0] && this.draftLines[0].description ? this.draftLines[0].description : 'Services',
      issueDate: issue,
      dueDate: due,
      total,
      currency: document.getElementById('inv-new-currency').value,
      status: document.getElementById('inv-new-status').value || 'Sent',
      stripeLink: document.getElementById('inv-new-stripe').value,
      terms: document.getElementById('inv-new-terms').value,
      items: this.draftLines.map((item) => ({ ...item }))
    };
    if (this.editingInvoiceId) {
      const idx = this.invoices.findIndex((i) => i.id === this.editingInvoiceId);
      if (idx >= 0) this.invoices[idx] = { ...this.invoices[idx], ...payload };
      this.toast('Invoice updated');
    } else {
      this.invoices.unshift({ id: 'inv-' + Date.now(), ...payload });
      this.toast('Invoice generated');
    }
    this.editingInvoiceId = null;
    this.persist();
    this.closeModals();
    this.setTab('invoices');
  },

  openProposalModal() {
    this.fillClientSelect('prop-new-client');
    const title = document.getElementById('prop-new-title');
    const total = document.getElementById('prop-new-total');
    if (title) title.value = '';
    if (total) total.value = '';
    this.showModal('inv-proposal-modal');
  },

  saveProposal() {
    const client = this.clients.find((c) => c.id === document.getElementById('prop-new-client').value);
    const total = Number(document.getElementById('prop-new-total').value || 0);
    const title = document.getElementById('prop-new-title').value || 'Proposal';
    const currency = document.getElementById('prop-new-currency').value;
    this.proposals.unshift({
      id: 'prop-' + Date.now(),
      number: 'PROP-2026-' + (100 + this.proposals.length + 1),
      clientId: client ? client.id : '',
      clientName: client ? client.name : 'Client',
      title,
      total,
      currency,
      validUntil: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      stage: 'Draft',
      items: [{ description: title, qty: 1, rate: total }]
    });
    this.persist();
    this.closeModals();
    this.setTab('proposals');
    this.toast('Proposal saved as draft');
  },

  openClientModal(id) {
    this.editingClientId = id || null;
    const client = id ? this.clients.find((c) => c.id === id) : null;
    const title = document.getElementById('cli-modal-title');
    const saveBtn = document.getElementById('cli-modal-save');
    if (title) title.textContent = client ? 'Edit client' : 'New client';
    if (saveBtn) saveBtn.textContent = client ? 'Save changes' : 'Add client';
    const set = (elId, value) => {
      const el = document.getElementById(elId);
      if (el) el.value = value || '';
    };
    set('cli-name', client ? client.name : '');
    set('cli-company', client ? client.company : '');
    set('cli-email', client ? client.email : '');
    set('cli-location', client ? client.location : '');
    set('cli-tz', client ? client.timezone : '');
    set('cli-currency', client ? client.currency : 'USD');
    set('cli-terms', client ? client.defaultTerms : 'Net 15');
    this.showModal('inv-client-modal');
  },

  saveClient() {
    const name = document.getElementById('cli-name').value.trim();
    if (!name) return this.toast('Add a client name');
    const payload = {
      name,
      company: document.getElementById('cli-company').value.trim(),
      email: document.getElementById('cli-email').value.trim(),
      location: document.getElementById('cli-location').value.trim() || 'Remote',
      timezone: document.getElementById('cli-tz').value.trim() || 'UTC',
      currency: document.getElementById('cli-currency').value,
      defaultTerms: document.getElementById('cli-terms').value
    };
    if (this.editingClientId) {
      const idx = this.clients.findIndex((c) => c.id === this.editingClientId);
      if (idx >= 0) this.clients[idx] = { ...this.clients[idx], ...payload };
      this.invoices.forEach((inv) => {
        if (inv.clientId === this.editingClientId) inv.clientName = name;
      });
      this.proposals.forEach((prop) => {
        if (prop.clientId === this.editingClientId) prop.clientName = name;
      });
      this.toast('Client updated');
    } else {
      this.clients.unshift({ id: 'c' + Date.now(), ...payload });
      this.toast('Client added');
    }
    this.editingClientId = null;
    this.persist();
    this.closeModals();
    this.render();
  },

  setStatus(id, status) {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) return;
    inv.status = status;
    this.persist();
    this.render();
    this.toast(inv.number + ' → ' + status);
  },

  copyLink(id) {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv || !inv.stripeLink) return this.toast('No Stripe link on this invoice');
    if (navigator.clipboard) navigator.clipboard.writeText(inv.stripeLink);
    this.toast('Stripe link copied');
  },

  nudge(id) {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) return;
    this.toast('Nudge drafted for ' + inv.clientName + ' · ' + inv.number);
  },

  toggleStatus(id) {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) return;
    if (inv.status === 'Paid') inv.status = 'Sent';
    else inv.status = 'Paid';
    this.persist();
    this.render();
  },

  moveProposal(id, stage) {
    const prop = this.proposals.find((p) => p.id === id);
    if (!prop) return;
    prop.stage = stage;
    this.persist();
    this.render();
  },

  convert(id) {
    const prop = this.proposals.find((p) => p.id === id);
    if (!prop) return;
    this.invoices.unshift({
      id: 'inv-' + Date.now(),
      number: 'DIM-2026-00' + (this.invoices.length + 1),
      clientId: prop.clientId,
      clientName: prop.clientName,
      title: prop.title,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      total: prop.total,
      currency: prop.currency,
      status: 'Sent',
      stripeLink: '',
      items: (prop.items || []).map((item) => ({ ...item }))
    });
    prop.stage = 'Closed';
    this.persist();
    this.setTab('invoices');
    this.toast('Proposal converted to invoice');
  },

  preview(kind, id) {
    const doc = kind === 'invoice' ? this.invoices.find((i) => i.id === id) : this.proposals.find((p) => p.id === id);
    if (!doc) return;
    const client = this.clients.find((c) => c.id === doc.clientId) || {};
    const paper = document.getElementById('inv-preview-paper');
    if (!paper) return;
    paper.innerHTML = `
      <div class="flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <div class="text-xl font-black tracking-wide">DIMAD STUDIO</div>
          <div class="text-[11px] text-slate-500 mt-1">Autonomous consulting · Remote</div>
        </div>
        <div class="text-right">
          <div class="text-xl font-black text-amber-600 uppercase">${this.escape(kind)}</div>
          <div class="text-[11px] font-mono text-slate-500">${this.escape(doc.number)}</div>
          <div class="text-[11px] font-mono text-slate-500">${this.escape(doc.issueDate || '')}</div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-6 text-[12px]">
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Billed to</div>
          <div class="font-bold">${this.escape(doc.clientName)}</div>
          <div class="text-slate-600">${this.escape(client.company || '')}</div>
          <div class="font-mono text-slate-500">${this.escape(client.email || '')}</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment</div>
          <div>Due ${this.escape(doc.dueDate || 'Upon receipt')}</div>
        </div>
      </div>
      <table class="w-full text-left text-[12px]">
        <thead><tr class="border-b bg-slate-50 text-[10px] uppercase text-slate-500"><th class="py-2 px-2">Description</th><th class="py-2 px-2 text-center">Qty</th><th class="py-2 px-2 text-right">Rate</th><th class="py-2 px-2 text-right">Amount</th></tr></thead>
        <tbody>${(doc.items || []).map((item) => `<tr class="border-b border-slate-100">
          <td class="py-2 px-2">${this.escape(item.description)}</td>
          <td class="py-2 px-2 text-center font-mono">${item.qty}</td>
          <td class="py-2 px-2 text-right font-mono">${this.money(item.rate, doc.currency)}</td>
          <td class="py-2 px-2 text-right font-mono font-bold">${this.money(item.qty * item.rate, doc.currency)}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="flex items-end justify-between">
        <div class="text-[11px] text-slate-500">${doc.stripeLink ? `<span class="font-mono">${this.escape(doc.stripeLink)}</span>` : ''}</div>
        <div class="text-right"><div class="text-[11px] text-slate-500">Total due</div><div class="text-2xl font-black font-mono text-amber-700">${this.money(doc.total, doc.currency)}</div></div>
      </div>
      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 inv-no-print">
        <button type="button" onclick="INVOICES.closeModals()" class="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-[11px] font-bold">Close</button>
        <button type="button" onclick="window.print()" class="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold">Print / PDF</button>
      </div>`;
    this.showModal('inv-preview-modal');
  },

  escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
};

const BUSINESS_AI = {
  storageKey: 'dimad_business_ai',
  generating: false,
  mounted: false,
  ctxId: null,
  renamingId: null,
  bound: false,
  railView: 'chats',
  starters: [
    { label: 'Unit economics', prompt: 'Map unit economics for a $59/mo Premium SaaS: CAC, LTV, payback, and the one lever that moves profit first.' },
    { label: 'Pricing model', prompt: 'Design a Free / Explore $9 / Premium $59 / VIP $199 ladder with positioning and upgrade triggers.' },
    { label: 'Offer stack', prompt: 'Write a high-ticket offer stack for operators who want an execution OS, including guarantee and objection handling.' },
    { label: 'Sales script', prompt: 'Draft a 7-message outbound sequence for boutique agency owners who still invoice by hand.' },
    { label: 'Hiring brief', prompt: 'Write a hiring scorecard for a part-time operator who owns inbox, invoices, and weekly reporting.' }
  ],

  defaults() {
    return {
      usage: 42,
      model: 'flash',
      activeThreadId: 'thread-welcome',
      messages: [
        {
          id: 'welcome-1',
          sender: 'ai',
          timestamp: '10:42 AM',
          type: 'welcome',
          threadId: 'thread-welcome',
          text: "I'm Business AI — strategy copilot for pricing, unit economics, offers, sales, and ops. Tell me the constraint and I'll return a plan you can execute this week."
        }
      ],
      activeChatId: 'b1',
      chats: [
        {
          id: 'b1',
          title: 'Premium ladder',
          tag: 'Pricing',
          threadId: 'thread-price',
          pinned: true,
          archived: false,
          thread: [
            { id: 'bp-u1', sender: 'user', timestamp: '9:18 AM', text: 'Design a Free / Explore $9 / Premium $59 / VIP $199 ladder.', threadId: 'thread-price' },
            { id: 'bp-a1', sender: 'ai', timestamp: '9:18 AM', type: 'plan', threadId: 'thread-price', text: 'Anchor Premium at $59 as the working operator default. Free proves the OS. Explore ($9) is the on-ramp. VIP ($199) is concierge + yield. Upgrade trigger: they hit a constraint Free cannot clear (invoices, vault, concierge).' }
          ]
        },
        {
          id: 'b2',
          title: 'Outbound sequence',
          tag: 'Sales',
          threadId: 'thread-sales',
          pinned: false,
          archived: false,
          thread: [
            { id: 'bs-u1', sender: 'user', timestamp: '11:04 AM', text: 'Draft a 7-message outbound sequence for boutique agency owners.', threadId: 'thread-sales' },
            { id: 'bs-a1', sender: 'ai', timestamp: '11:04 AM', type: 'hooks', threadId: 'thread-sales', text: 'Seven-touch sequence, one ask per message.', hooks: [{ tag: '1 · Pattern interrupt', text: 'Still building invoices in three tabs at 11pm?' }, { tag: '2 · Proof', text: 'Operators on Premium close the books from one Command Center.' }] }
          ]
        },
        {
          id: 'b3',
          title: 'Operator scorecard',
          tag: 'Hiring',
          threadId: 'thread-hire',
          pinned: false,
          archived: false,
          thread: [
            { id: 'bh-u1', sender: 'user', timestamp: '2:41 PM', text: 'Write a hiring scorecard for a part-time operator.', threadId: 'thread-hire' },
            { id: 'bh-a1', sender: 'ai', timestamp: '2:41 PM', type: 'plan', threadId: 'thread-hire', text: 'Hiring scorecard for a 10hr/week operator: owns inbox SLA, invoice send/follow-up, and a Monday metrics dump. Hire at 12+ on reliability, writing, and tools.' }
          ]
        }
      ]
    };
  },

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (raw && Array.isArray(raw.messages)) {
        const next = { ...this.defaults(), ...raw };
        if (!Array.isArray(next.chats) || !next.chats.length) next.chats = raw.briefs || this.defaults().chats;
        next.chats = (next.chats || []).map((c) => ({ pinned: false, archived: false, ...c }));
        return next;
      }
    } catch (err) { /* defaults */ }
    return this.defaults();
  },

  persist(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  },

  state() {
    if (!this._state) this._state = this.load();
    return this._state;
  },

  escape(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  mount() {
    const view = document.getElementById('view-ent-ai-business');
    if (!view) return;
    ['bai-usage-modal', 'bai-summary-modal', 'bai-ctx', 'bai-rail'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== document.body) document.body.appendChild(el);
    });
    this.bindUi();
    this.mounted = true;
    this.placeRail();
    this.render();
    const feed = document.getElementById('bai-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  },

  unmount() {
    this.closeCtx();
    const rail = document.getElementById('bai-rail');
    if (rail) {
      rail.classList.add('hidden');
      rail.classList.remove('flex');
    }
    this.mounted = false;
  },

  backToDashboard() {
    this.closeCtx();
    this.closeSummary();
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen()) {
      closeDimadAiNav();
      return;
    }
    if (typeof switchTab === 'function') switchTab('ent-dashboard');
  },

  bindUi() {
    if (this.bound) return;
    this.bound = true;
    document.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('#bai-ctx')) return;
      this.closeCtx();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCtx();
        this.closeSummary();
      }
    });
    window.addEventListener('resize', () => {
      if (this.mounted) this.placeRail();
    });
  },

  placeRail() {
    const rail = document.getElementById('bai-rail');
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen()) {
      if (rail) {
        rail.classList.add('hidden');
        rail.classList.remove('flex');
      }
      return;
    }
    const nav = document.getElementById('main-sidebar');
    if (!rail || !nav) return;
    const box = nav.getBoundingClientRect();
    rail.style.position = 'fixed';
    rail.style.top = `${box.top}px`;
    rail.style.left = `${box.left}px`;
    rail.style.width = `${Math.max(box.width, 180)}px`;
    rail.style.height = `${box.height}px`;
    rail.style.zIndex = '355';
    rail.classList.remove('hidden');
    rail.classList.add('flex');
  },

  openUsageInfo() {
    const modal = document.getElementById('bai-usage-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeUsageInfo() {
    const modal = document.getElementById('bai-usage-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  setModel(model) {
    this.state().model = model;
    this.persist(this.state());
    this.renderChrome();
  },

  chip(prompt) {
    const input = document.getElementById('bai-input');
    if (input) input.value = prompt;
    this.send();
  },

  inputKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send(event);
    }
  },

  send(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('bai-input');
    const prompt = ((input && input.value) || '').trim();
    if (!prompt || this.generating) return;
    const s = this.state();
    let chat = this.activeChat();
    if (!chat || chat.id === 'welcome') chat = this.ensureLiveChat();
    const threadId = chat.threadId;
    s.activeThreadId = threadId;
    s.activeChatId = chat.id;
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: 'msg-' + Date.now(), sender: 'user', text: prompt, timestamp: stamp, threadId };
    s.messages.push(userMsg);
    chat.thread = chat.thread || [];
    chat.thread.push(userMsg);
    if (typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.record('business', 2);
    if (input) input.value = '';
    this.generating = true;
    this.persist(s);
    this.render();
    window.setTimeout(() => this.respond(prompt, threadId), 900);
  },

  respond(prompt, threadId) {
    const s = this.state();
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lower = prompt.toLowerCase();
    const engine = s.model === 'pro' ? 'Deep Reasoning' : 'Gemini Flash';
    let msg;
    if (/price|pricing|tier|ladder|unit|econ|ltv|cac/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'metrics',
        text: `Pricing brief via ${engine}. Keep four rungs. Make Premium the default working seat.`,
        metrics: [
          { label: 'Free', value: '$0', note: 'Proof of OS' },
          { label: 'Explore', value: '$9', note: 'On-ramp' },
          { label: 'Premium', value: '$59', note: 'Operator default' },
          { label: 'VIP', value: '$199', note: 'Concierge + yield' }
        ]
      };
    } else if (/offer|stack|position|guarantee/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'plan',
        text: `Offer stack: one promise, three proof points, one guarantee. Promise: an execution OS that turns focus hours into $DIM and shipped work. Proof: Command Center, invoices, Creator AI. Guarantee: 14-day operator trial on Explore before Premium.`
      };
    } else if (/sales|outreach|script|sequence|inbound/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'hooks',
        text: 'Seven-touch sequence, one ask per message.',
        hooks: [
          { tag: '1 · Pattern interrupt', text: 'Still building invoices in three tabs at 11pm?' },
          { tag: '2 · Proof', text: 'Operators on Premium close the books from one Command Center.' },
          { tag: '5 · Soft ask', text: 'Want a 12-minute walkthrough of the $59 seat this week?' }
        ]
      };
    } else if (/hire|hiring|scorecard|role|ops/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'plan',
        text: 'Hiring scorecard for a 10hr/week operator: owns inbox SLA, invoice send/follow-up, and a Monday metrics dump. Must-haves: written English, Stripe hygiene, calm under timezone drift. Score 1–5 on reliability, writing, tools. Hire at 12+.'
      };
    } else {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'plan',
        text: `High-agency loop via ${engine}: pick one ICP, one offer, one channel. This week: 10 outbound, 2 demos, 1 shipped asset. Kill anything that does not feed that loop.`
      };
    }
    s.messages.push(msg);
    const chat = (s.chats || []).find((c) => c.threadId === threadId);
    if (chat) {
      chat.thread = chat.thread || [];
      chat.thread.push(msg);
      if (!chat.customTitle) chat.title = String(prompt || chat.title).replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ') || chat.title;
      chat.tag = s.model === 'pro' ? 'Deep' : 'Flash';
      chat.updatedAt = Date.now();
    }
    this.generating = false;
    this.persist(s);
    this.render();
  },

  chats() {
    return this.state().chats || [];
  },

  activeChat() {
    const s = this.state();
    return this.chats().find((c) => c.id === s.activeChatId) || this.chats().find((c) => c.threadId === s.activeThreadId) || null;
  },

  ensureLiveChat() {
    const s = this.state();
    const threadId = 'thread-' + Date.now();
    const chat = {
      id: 'chat-' + Date.now(),
      title: 'New chat',
      tag: 'Live',
      threadId,
      pinned: false,
      archived: false,
      customTitle: false,
      thread: [],
      updatedAt: Date.now()
    };
    s.chats = s.chats || [];
    s.chats.unshift(chat);
    s.activeChatId = chat.id;
    s.activeThreadId = threadId;
    return chat;
  },

  newChat() {
    const s = this.state();
    s.messages = this.defaults().messages.map((m) => ({ ...m }));
    this.ensureLiveChat();
    this.persist(s);
    this.render();
    const input = document.getElementById('bai-input');
    if (input) input.focus();
  },

  openChat(id) {
    const chat = this.chats().find((c) => String(c.id) === String(id));
    if (!chat) return;
    const s = this.state();
    s.activeChatId = chat.id;
    s.activeThreadId = chat.threadId;
    this.closeCtx();
    this.renamingId = null;
    this.persist(s);
    this.render();
    const feed = document.getElementById('bai-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  },

  toggleArchivedView() {
    this.railView = this.railView === 'archived' ? 'chats' : 'archived';
    this.closeCtx();
    this.renderRail();
  },

  openCtx(event, id) {
    event.preventDefault();
    event.stopPropagation();
    this.ctxId = id;
    const chat = this.chats().find((c) => String(c.id) === String(id));
    const archived = !!(chat && chat.archived);
    const pin = document.getElementById('bai-ctx-pin');
    const arch = document.getElementById('bai-ctx-archive');
    if (pin) {
      pin.classList.toggle('hidden', archived);
      pin.textContent = chat && chat.pinned ? 'Unpin' : 'Pin';
    }
    if (arch) arch.textContent = archived ? 'Unarchive' : 'Archive';
    const ctx = document.getElementById('bai-ctx');
    if (!ctx) return;
    ctx.classList.remove('hidden');
    ctx.style.left = `${Math.min(event.clientX, window.innerWidth - 180)}px`;
    ctx.style.top = `${Math.min(event.clientY, window.innerHeight - 180)}px`;
  },

  closeCtx() {
    const ctx = document.getElementById('bai-ctx');
    if (ctx) ctx.classList.add('hidden');
  },

  ctxAction(action) {
    const id = this.ctxId;
    this.closeCtx();
    if (!id) return;
    if (action === 'pin') this.togglePin(id);
    if (action === 'rename') {
      this.renamingId = id;
      this.renderRail();
      const input = document.getElementById('bai-rename-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
    if (action === 'archive') this.toggleArchive(id);
    if (action === 'summary') this.openSummary(id);
    if (action === 'delete') this.deleteChat(id);
  },

  togglePin(id) {
    const s = this.state();
    s.chats = this.chats().map((c) => String(c.id) === String(id) ? { ...c, pinned: !c.pinned } : c);
    this.persist(s);
    this.renderRail();
  },

  toggleArchive(id) {
    const s = this.state();
    s.chats = this.chats().map((c) => String(c.id) === String(id) ? { ...c, archived: !c.archived, pinned: c.archived ? c.pinned : false } : c);
    this.persist(s);
    this.renderRail();
  },

  deleteChat(id) {
    const s = this.state();
    s.chats = this.chats().filter((c) => String(c.id) !== String(id));
    if (s.activeChatId === id) this.newChat();
    else {
      this.persist(s);
      this.renderRail();
    }
  },

  commitRename() {
    const id = this.renamingId;
    const input = document.getElementById('bai-rename-input');
    this.renamingId = null;
    if (!id || !input) {
      this.renderRail();
      return;
    }
    const name = input.value.trim();
    const s = this.state();
    s.chats = this.chats().map((c) => {
      if (String(c.id) !== String(id)) return c;
      if (!name) return { ...c, customTitle: false };
      return { ...c, title: name, customTitle: true };
    });
    this.persist(s);
    this.render();
  },

  renameKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitRename();
    }
    if (event.key === 'Escape') {
      this.renamingId = null;
      this.renderRail();
    }
  },

  buildSummary(chat) {
    const thread = chat.thread || [];
    const asks = thread.filter((m) => m.sender === 'user').map((m) => m.text).filter(Boolean);
    const answers = thread.filter((m) => m.sender === 'ai').map((m) => m.text).filter(Boolean);
    const recs = answers.join(' ').split(/(?<=\.)\s+/).filter(Boolean).slice(0, 5);
    return [
      `Executive Summary — ${chat.title || 'Business AI thread'}`,
      '',
      'Objective',
      asks[0] || 'No prompt captured.',
      '',
      'Thread asks',
      ...(asks.length ? asks.map((t, i) => `${i + 1}. ${t}`) : ['—']),
      '',
      'Recommendations',
      ...(recs.length ? recs.map((t) => `• ${t}`) : ['• Continue the brief in Business AI.']),
      '',
      'Next actions',
      '• Convert the top recommendation into a dated task.',
      '• Assign an owner and a 7-day checkpoint.',
      '',
      `Generated ${new Date().toLocaleString()} · Business AI`
    ].join('\n');
  },

  openSummary(id) {
    const chat = this.chats().find((c) => String(c.id) === String(id));
    if (!chat) return;
    this.summaryChatId = id;
    const title = document.getElementById('bai-summary-title');
    const body = document.getElementById('bai-summary-body');
    const status = document.getElementById('bai-summary-status');
    if (title) title.textContent = chat.title || 'Untitled chat';
    if (body) body.value = this.buildSummary(chat);
    if (status) status.classList.add('hidden');
    const modal = document.getElementById('bai-summary-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeSummary() {
    const modal = document.getElementById('bai-summary-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveSummaryNote() {
    const body = document.getElementById('bai-summary-body');
    const text = (body && body.value) || '';
    const chat = this.chats().find((c) => String(c.id) === String(this.summaryChatId));
    const title = `Summary — ${chat ? chat.title : 'Business AI'}`;
    const now = Date.now();
    if (typeof DIMAD_NOTEPAD !== 'undefined') {
      const notes = DIMAD_NOTEPAD.load();
      notes.unshift({
        id: `note-sum-${now}`,
        title,
        body: text,
        createdAt: now,
        updatedAt: now,
        customTitle: true
      });
      DIMAD_NOTEPAD.persist(notes);
    }
    const status = document.getElementById('bai-summary-status');
    if (status) status.classList.remove('hidden');
  },

  render() {
    this.placeRail();
    this.renderChrome();
    this.renderFeed();
    this.renderStarters();
    this.renderRail();
  },

  renderChrome() {
    const s = this.state();
    const pct = typeof DIMAD_AI_USAGE !== 'undefined' ? DIMAD_AI_USAGE.percent() : Math.max(0, Math.min(100, Number(s.usage) || 0));
    const bar = document.getElementById('bai-usage-bar');
    const label = document.getElementById('bai-usage-pct');
    const tip = document.getElementById('bai-usage-tip-pct');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = `h-full rounded-full ${pct > 80 ? 'bg-brand-gold' : 'bg-brand-mint'}`;
    }
    if (label) label.textContent = pct + '%';
    if (tip) tip.textContent = pct + '% Used';
    const flash = document.getElementById('bai-model-flash');
    const pro = document.getElementById('bai-model-pro');
    if (flash) flash.className = `px-2.5 py-1.5 rounded text-[10px] font-semibold ${s.model === 'flash' ? 'bg-brand-mint text-slate-950' : 'bg-brand-black text-slate-400 hover:text-white'}`;
    if (pro) pro.className = `px-2.5 py-1.5 rounded text-[10px] font-semibold ${s.model === 'pro' ? 'bg-brand-gold text-slate-950' : 'bg-brand-black text-slate-400 hover:text-white'}`;
    const send = document.getElementById('bai-send');
    if (send) send.disabled = this.generating;
    const heading = document.getElementById('bai-active-title');
    const chat = this.activeChat();
    if (heading) heading.textContent = chat && chat.title && chat.title !== 'New chat' ? chat.title : 'Chat for strategy, pricing, offers, sales, and ops.';
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('business')) DIMAD_AI_HOST.paintUsage();
  },

  renderStarters() {
    const root = document.getElementById('bai-starters');
    if (!root) return;
    root.innerHTML = this.starters.map((chip) => `<button type="button" onclick='BUSINESS_AI.chip(${JSON.stringify(chip.prompt)})' class="text-[10px] px-2.5 py-1 rounded border border-brand-border bg-brand-black text-slate-300 hover:border-brand-gold/50 hover:text-white transition">${this.escape(chip.label)}</button>`).join('');
  },

  renderFeed() {
    const feed = document.getElementById('bai-feed');
    if (!feed) return;
    const s = this.state();
    const chat = this.activeChat();
    const log = chat && chat.thread && chat.thread.length
      ? chat.thread
      : (s.messages || []);
    const rows = log.map((msg) => {
      const you = msg.sender === 'user';
      let extra = '';
      if (msg.metrics) {
        extra = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">${msg.metrics.map((m) => `<div class="bg-brand-black border border-brand-border rounded p-2.5">
          <div class="text-[9px] text-slate-500 uppercase">${this.escape(m.label)}</div>
          <div class="text-[13px] font-bold text-brand-gold font-mono">${this.escape(m.value)}</div>
          <div class="text-[10px] text-slate-400">${this.escape(m.note)}</div>
        </div>`).join('')}</div>`;
      }
      if (msg.hooks) {
        extra += `<div class="space-y-1.5 w-full">${msg.hooks.map((h) => `<div class="bg-brand-black border border-brand-border rounded p-2.5">
          <span class="text-[9px] font-mono uppercase text-brand-mint">${this.escape(h.tag)}</span>
          <p class="text-[12px] text-slate-200 mt-1">${this.escape(h.text)}</p>
        </div>`).join('')}</div>`;
      }
      const avatar = you
        ? '<div class="w-7 h-7 rounded bg-brand-gold text-slate-950 text-[9px] font-bold flex items-center justify-center shrink-0">YOU</div>'
        : '<div class="w-7 h-7 rounded bg-brand-gold/15 border border-brand-gold/40 text-brand-gold flex items-center justify-center shrink-0"><i class="fa-solid fa-briefcase text-[10px]"></i></div>';
      return `<div class="flex gap-2.5 ${you ? 'flex-row-reverse' : ''} max-w-3xl ${you ? 'ml-auto' : 'mr-auto'} w-full">
        ${avatar}
        <div class="min-w-0 flex-1 space-y-1.5 ${you ? 'flex flex-col items-end' : ''}">
          <div class="text-[9px] text-slate-500 font-mono">${you ? 'You' : 'Business AI'} · ${this.escape(msg.timestamp || '')}</div>
          ${msg.text ? `<div class="p-3 rounded-2xl text-[13px] leading-relaxed ${you ? 'bg-brand-gold text-slate-950 rounded-tr-md' : 'bg-brand-black border border-brand-border text-slate-200 rounded-tl-md'}">${this.escape(msg.text)}</div>` : ''}
          ${extra}
        </div>
      </div>`;
    }).join('');
    const pending = this.generating
      ? `<div class="flex gap-2.5 max-w-3xl mr-auto"><div class="w-7 h-7 rounded bg-brand-gold/15 border border-brand-gold/40 text-brand-gold flex items-center justify-center shrink-0"><i class="fa-solid fa-briefcase text-[10px]"></i></div><div class="flex items-center gap-2 text-[12px] text-brand-gold bg-brand-black border border-brand-border p-2.5 rounded-2xl"><i class="fa-solid fa-spinner fa-spin"></i> Drafting the brief...</div></div>`
      : '';
    feed.innerHTML = `<div class="max-w-3xl mx-auto w-full space-y-5">${rows}${pending}</div>`;
    feed.scrollTop = feed.scrollHeight;
  },

  renderRail() {
    const root = document.getElementById('bai-chat-list');
    if (!root) return;
    const s = this.state();
    const activeId = s.activeChatId;
    const all = this.chats();
    const archivedView = this.railView === 'archived';
    const pinned = all.filter((c) => c.pinned && !c.archived);
    const live = all.filter((c) => !c.pinned && !c.archived);
    const archived = all.filter((c) => c.archived);
    const heading = document.getElementById('bai-rail-heading');
    const newBtn = document.getElementById('bai-rail-new');
    const switchLabel = document.getElementById('bai-rail-switch-label');
    if (heading) heading.textContent = archivedView ? 'ARCHIVED' : 'SAVED CHATS';
    if (newBtn) newBtn.classList.toggle('hidden', archivedView);
    if (switchLabel) switchLabel.textContent = archivedView ? 'Saved chats' : `Archived${archived.length ? ' · ' + archived.length : ''}`;
    const row = (chat) => {
      if (this.renamingId === chat.id) {
        return `<div class="px-1 py-1"><input id="bai-rename-input" type="text" value="${this.escape(chat.title || '')}" onkeydown="BUSINESS_AI.renameKey(event)" onblur="BUSINESS_AI.commitRename()" class="w-full bg-slate-900 border border-brand-gold/40 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"></div>`;
      }
      const on = String(chat.id) === String(activeId);
      return `<button type="button" onclick="BUSINESS_AI.openChat('${chat.id}')" oncontextmenu="BUSINESS_AI.openCtx(event, '${chat.id}')" class="w-full text-left px-2 py-1 rounded border leading-tight ${on ? 'bg-brand-gold/10 border-brand-gold/40 text-slate-100' : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'}">
        <div class="flex items-center gap-1.5 min-w-0">
          ${chat.pinned ? '<i class="fa-solid fa-thumbtack text-brand-gold text-[8px] shrink-0"></i>' : ''}
          <span class="truncate text-[11px] font-semibold">${this.escape(chat.title || 'Untitled')}</span>
        </div>
      </button>`;
    };
    const block = (label, items) => items.length ? `<div class="space-y-0"><div class="px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500">${label}</div>${items.map(row).join('')}</div>` : '';
    if (archivedView) {
      root.innerHTML = archived.length ? `<div class="space-y-0">${archived.map(row).join('')}</div>` : '<p class="px-2 text-[10px] text-slate-500">No archived chats.</p>';
      return;
    }
    root.innerHTML = `${block('Pinned', pinned)}${block('Chats', live)}` || '<p class="px-2 text-[10px] text-slate-500">No saved chats yet.</p>';
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('business')) DIMAD_AI_HOST.syncChats();
  }
};
window.BUSINESS_AI = BUSINESS_AI;

const NOMAD_AI = {
  storageKey: 'dimad_nomad_ai',
  generating: false,
  mounted: false,
  ctxId: null,
  renamingId: null,
  bound: false,
  railView: 'chats',
  starters: [
    { label: 'Unit economics', prompt: 'Map unit economics for a $59/mo Premium SaaS: CAC, LTV, payback, and the one lever that moves profit first.' },
    { label: 'Pricing model', prompt: 'Design a Free / Explore $9 / Premium $59 / VIP $199 ladder with positioning and upgrade triggers.' },
    { label: 'Offer stack', prompt: 'Write a high-ticket offer stack for operators who want an execution OS, including guarantee and objection handling.' },
    { label: 'Sales script', prompt: 'Draft a 7-message outbound sequence for boutique agency owners who still invoice by hand.' },
    { label: 'Hiring brief', prompt: 'Write a hiring scorecard for a part-time operator who owns inbox, invoices, and weekly reporting.' }
  ],

  defaults() {
    return {
      usage: 42,
      model: 'flash',
      activeThreadId: 'thread-welcome',
      messages: [
        {
          id: 'welcome-1',
          sender: 'ai',
          timestamp: '10:42 AM',
          type: 'welcome',
          threadId: 'thread-welcome',
          text: "I'm Nomad AI — strategy copilot for pricing, unit economics, offers, sales, and ops. Tell me the constraint and I'll return a plan you can execute this week."
        }
      ],
      activeChatId: 'b1',
      chats: [
        {
          id: 'b1',
          title: 'Premium ladder',
          tag: 'Pricing',
          threadId: 'thread-price',
          pinned: true,
          archived: false,
          thread: [
            { id: 'bp-u1', sender: 'user', timestamp: '9:18 AM', text: 'Design a Free / Explore $9 / Premium $59 / VIP $199 ladder.', threadId: 'thread-price' },
            { id: 'bp-a1', sender: 'ai', timestamp: '9:18 AM', type: 'plan', threadId: 'thread-price', text: 'Anchor Premium at $59 as the working operator default. Free proves the OS. Explore ($9) is the on-ramp. VIP ($199) is concierge + yield. Upgrade trigger: they hit a constraint Free cannot clear (invoices, vault, concierge).' }
          ]
        },
        {
          id: 'b2',
          title: 'Outbound sequence',
          tag: 'Sales',
          threadId: 'thread-sales',
          pinned: false,
          archived: false,
          thread: [
            { id: 'bs-u1', sender: 'user', timestamp: '11:04 AM', text: 'Draft a 7-message outbound sequence for boutique agency owners.', threadId: 'thread-sales' },
            { id: 'bs-a1', sender: 'ai', timestamp: '11:04 AM', type: 'hooks', threadId: 'thread-sales', text: 'Seven-touch sequence, one ask per message.', hooks: [{ tag: '1 · Pattern interrupt', text: 'Still building invoices in three tabs at 11pm?' }, { tag: '2 · Proof', text: 'Operators on Premium close the books from one Command Center.' }] }
          ]
        },
        {
          id: 'b3',
          title: 'Operator scorecard',
          tag: 'Hiring',
          threadId: 'thread-hire',
          pinned: false,
          archived: false,
          thread: [
            { id: 'bh-u1', sender: 'user', timestamp: '2:41 PM', text: 'Write a hiring scorecard for a part-time operator.', threadId: 'thread-hire' },
            { id: 'bh-a1', sender: 'ai', timestamp: '2:41 PM', type: 'plan', threadId: 'thread-hire', text: 'Hiring scorecard for a 10hr/week operator: owns inbox SLA, invoice send/follow-up, and a Monday metrics dump. Hire at 12+ on reliability, writing, and tools.' }
          ]
        }
      ]
    };
  },

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (raw && Array.isArray(raw.messages)) {
        const next = { ...this.defaults(), ...raw };
        if (!Array.isArray(next.chats) || !next.chats.length) next.chats = raw.briefs || this.defaults().chats;
        next.chats = (next.chats || []).map((c) => ({ pinned: false, archived: false, ...c }));
        return next;
      }
    } catch (err) { /* defaults */ }
    return this.defaults();
  },

  persist(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  },

  state() {
    if (!this._state) this._state = this.load();
    return this._state;
  },

  escape(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  mount() {
    const view = document.getElementById('view-nomad-ai');
    if (!view) return;
    ['nai-usage-modal', 'nai-summary-modal', 'nai-ctx', 'nai-rail'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== document.body) document.body.appendChild(el);
    });
    this.bindUi();
    this.mounted = true;
    this.placeRail();
    this.render();
    const feed = document.getElementById('nai-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  },

  unmount() {
    this.closeCtx();
    const rail = document.getElementById('nai-rail');
    if (rail) {
      rail.classList.add('hidden');
      rail.classList.remove('flex');
    }
    this.mounted = false;
  },

  backToDashboard() {
    this.closeCtx();
    this.closeSummary();
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen()) {
      closeDimadAiNav();
      return;
    }
    if (typeof switchTab === 'function') switchTab('nomad-city');
  },

  bindUi() {
    if (this.bound) return;
    this.bound = true;
    document.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('#nai-ctx')) return;
      this.closeCtx();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCtx();
        this.closeSummary();
      }
    });
    window.addEventListener('resize', () => {
      if (this.mounted) this.placeRail();
    });
  },

  placeRail() {
    const rail = document.getElementById('nai-rail');
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen()) {
      if (rail) {
        rail.classList.add('hidden');
        rail.classList.remove('flex');
      }
      return;
    }
    const nav = document.getElementById('main-sidebar');
    if (!rail || !nav) return;
    const box = nav.getBoundingClientRect();
    rail.style.position = 'fixed';
    rail.style.top = `${box.top}px`;
    rail.style.left = `${box.left}px`;
    rail.style.width = `${Math.max(box.width, 180)}px`;
    rail.style.height = `${box.height}px`;
    rail.style.zIndex = '355';
    rail.classList.remove('hidden');
    rail.classList.add('flex');
  },

  openUsageInfo() {
    const modal = document.getElementById('nai-usage-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeUsageInfo() {
    const modal = document.getElementById('nai-usage-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  setModel(model) {
    this.state().model = model;
    this.persist(this.state());
    this.renderChrome();
  },

  chip(prompt) {
    const input = document.getElementById('nai-input');
    if (input) input.value = prompt;
    this.send();
  },

  inputKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send(event);
    }
  },

  send(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('nai-input');
    const prompt = ((input && input.value) || '').trim();
    if (!prompt || this.generating) return;
    const s = this.state();
    let chat = this.activeChat();
    if (!chat || chat.id === 'welcome') chat = this.ensureLiveChat();
    const threadId = chat.threadId;
    s.activeThreadId = threadId;
    s.activeChatId = chat.id;
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: 'msg-' + Date.now(), sender: 'user', text: prompt, timestamp: stamp, threadId };
    s.messages.push(userMsg);
    chat.thread = chat.thread || [];
    chat.thread.push(userMsg);
    if (typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.record('travel', 2);
    if (input) input.value = '';
    this.generating = true;
    this.persist(s);
    this.render();
    window.setTimeout(() => this.respond(prompt, threadId), 900);
  },

  respond(prompt, threadId) {
    const s = this.state();
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lower = prompt.toLowerCase();
    const engine = s.model === 'pro' ? 'Deep Reasoning' : 'Gemini Flash';
    let msg;
    if (/price|pricing|tier|ladder|unit|econ|ltv|cac/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'metrics',
        text: `Pricing brief via ${engine}. Keep four rungs. Make Premium the default working seat.`,
        metrics: [
          { label: 'Free', value: '$0', note: 'Proof of OS' },
          { label: 'Explore', value: '$9', note: 'On-ramp' },
          { label: 'Premium', value: '$59', note: 'Operator default' },
          { label: 'VIP', value: '$199', note: 'Concierge + yield' }
        ]
      };
    } else if (/offer|stack|position|guarantee/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'plan',
        text: `Offer stack: one promise, three proof points, one guarantee. Promise: an execution OS that turns focus hours into $DIM and shipped work. Proof: Command Center, invoices, Creator AI. Guarantee: 14-day operator trial on Explore before Premium.`
      };
    } else if (/sales|outreach|script|sequence|inbound/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'hooks',
        text: 'Seven-touch sequence, one ask per message.',
        hooks: [
          { tag: '1 · Pattern interrupt', text: 'Still building invoices in three tabs at 11pm?' },
          { tag: '2 · Proof', text: 'Operators on Premium close the books from one Command Center.' },
          { tag: '5 · Soft ask', text: 'Want a 12-minute walkthrough of the $59 seat this week?' }
        ]
      };
    } else if (/hire|hiring|scorecard|role|ops/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'plan',
        text: 'Hiring scorecard for a 10hr/week operator: owns inbox SLA, invoice send/follow-up, and a Monday metrics dump. Must-haves: written English, Stripe hygiene, calm under timezone drift. Score 1–5 on reliability, writing, tools. Hire at 12+.'
      };
    } else {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp, threadId, type: 'plan',
        text: `High-agency loop via ${engine}: pick one ICP, one offer, one channel. This week: 10 outbound, 2 demos, 1 shipped asset. Kill anything that does not feed that loop.`
      };
    }
    s.messages.push(msg);
    const chat = (s.chats || []).find((c) => c.threadId === threadId);
    if (chat) {
      chat.thread = chat.thread || [];
      chat.thread.push(msg);
      if (!chat.customTitle) chat.title = String(prompt || chat.title).replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ') || chat.title;
      chat.tag = s.model === 'pro' ? 'Deep' : 'Flash';
      chat.updatedAt = Date.now();
    }
    this.generating = false;
    this.persist(s);
    this.render();
  },

  chats() {
    return this.state().chats || [];
  },

  activeChat() {
    const s = this.state();
    return this.chats().find((c) => c.id === s.activeChatId) || this.chats().find((c) => c.threadId === s.activeThreadId) || null;
  },

  ensureLiveChat() {
    const s = this.state();
    const threadId = 'thread-' + Date.now();
    const chat = {
      id: 'chat-' + Date.now(),
      title: 'New chat',
      tag: 'Live',
      threadId,
      pinned: false,
      archived: false,
      customTitle: false,
      thread: [],
      updatedAt: Date.now()
    };
    s.chats = s.chats || [];
    s.chats.unshift(chat);
    s.activeChatId = chat.id;
    s.activeThreadId = threadId;
    return chat;
  },

  newChat() {
    const s = this.state();
    s.messages = this.defaults().messages.map((m) => ({ ...m }));
    this.ensureLiveChat();
    this.persist(s);
    this.render();
    const input = document.getElementById('nai-input');
    if (input) input.focus();
  },

  openChat(id) {
    const chat = this.chats().find((c) => String(c.id) === String(id));
    if (!chat) return;
    const s = this.state();
    s.activeChatId = chat.id;
    s.activeThreadId = chat.threadId;
    this.closeCtx();
    this.renamingId = null;
    this.persist(s);
    this.render();
    const feed = document.getElementById('nai-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  },

  toggleArchivedView() {
    this.railView = this.railView === 'archived' ? 'chats' : 'archived';
    this.closeCtx();
    this.renderRail();
  },

  openCtx(event, id) {
    event.preventDefault();
    event.stopPropagation();
    this.ctxId = id;
    const chat = this.chats().find((c) => String(c.id) === String(id));
    const archived = !!(chat && chat.archived);
    const pin = document.getElementById('nai-ctx-pin');
    const arch = document.getElementById('nai-ctx-archive');
    if (pin) {
      pin.classList.toggle('hidden', archived);
      pin.textContent = chat && chat.pinned ? 'Unpin' : 'Pin';
    }
    if (arch) arch.textContent = archived ? 'Unarchive' : 'Archive';
    const ctx = document.getElementById('nai-ctx');
    if (!ctx) return;
    ctx.classList.remove('hidden');
    ctx.style.left = `${Math.min(event.clientX, window.innerWidth - 180)}px`;
    ctx.style.top = `${Math.min(event.clientY, window.innerHeight - 180)}px`;
  },

  closeCtx() {
    const ctx = document.getElementById('nai-ctx');
    if (ctx) ctx.classList.add('hidden');
  },

  ctxAction(action) {
    const id = this.ctxId;
    this.closeCtx();
    if (!id) return;
    if (action === 'pin') this.togglePin(id);
    if (action === 'rename') {
      this.renamingId = id;
      this.renderRail();
      const input = document.getElementById('nai-rename-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
    if (action === 'archive') this.toggleArchive(id);
    if (action === 'summary') this.openSummary(id);
    if (action === 'delete') this.deleteChat(id);
  },

  togglePin(id) {
    const s = this.state();
    s.chats = this.chats().map((c) => String(c.id) === String(id) ? { ...c, pinned: !c.pinned } : c);
    this.persist(s);
    this.renderRail();
  },

  toggleArchive(id) {
    const s = this.state();
    s.chats = this.chats().map((c) => String(c.id) === String(id) ? { ...c, archived: !c.archived, pinned: c.archived ? c.pinned : false } : c);
    this.persist(s);
    this.renderRail();
  },

  deleteChat(id) {
    const s = this.state();
    s.chats = this.chats().filter((c) => String(c.id) !== String(id));
    if (s.activeChatId === id) this.newChat();
    else {
      this.persist(s);
      this.renderRail();
    }
  },

  commitRename() {
    const id = this.renamingId;
    const input = document.getElementById('nai-rename-input');
    this.renamingId = null;
    if (!id || !input) {
      this.renderRail();
      return;
    }
    const name = input.value.trim();
    const s = this.state();
    s.chats = this.chats().map((c) => {
      if (String(c.id) !== String(id)) return c;
      if (!name) return { ...c, customTitle: false };
      return { ...c, title: name, customTitle: true };
    });
    this.persist(s);
    this.render();
  },

  renameKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitRename();
    }
    if (event.key === 'Escape') {
      this.renamingId = null;
      this.renderRail();
    }
  },

  buildSummary(chat) {
    const thread = chat.thread || [];
    const asks = thread.filter((m) => m.sender === 'user').map((m) => m.text).filter(Boolean);
    const answers = thread.filter((m) => m.sender === 'ai').map((m) => m.text).filter(Boolean);
    const recs = answers.join(' ').split(/(?<=\.)\s+/).filter(Boolean).slice(0, 5);
    return [
      `Executive Summary — ${chat.title || 'Nomad AI thread'}`,
      '',
      'Objective',
      asks[0] || 'No prompt captured.',
      '',
      'Thread asks',
      ...(asks.length ? asks.map((t, i) => `${i + 1}. ${t}`) : ['—']),
      '',
      'Recommendations',
      ...(recs.length ? recs.map((t) => `• ${t}`) : ['• Continue the brief in Nomad AI.']),
      '',
      'Next actions',
      '• Convert the top recommendation into a dated task.',
      '• Assign an owner and a 7-day checkpoint.',
      '',
      `Generated ${new Date().toLocaleString()} · Nomad AI`
    ].join('\n');
  },

  openSummary(id) {
    const chat = this.chats().find((c) => String(c.id) === String(id));
    if (!chat) return;
    this.summaryChatId = id;
    const title = document.getElementById('nai-summary-title');
    const body = document.getElementById('nai-summary-body');
    const status = document.getElementById('nai-summary-status');
    if (title) title.textContent = chat.title || 'Untitled chat';
    if (body) body.value = this.buildSummary(chat);
    if (status) status.classList.add('hidden');
    const modal = document.getElementById('nai-summary-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeSummary() {
    const modal = document.getElementById('nai-summary-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveSummaryNote() {
    const body = document.getElementById('nai-summary-body');
    const text = (body && body.value) || '';
    const chat = this.chats().find((c) => String(c.id) === String(this.summaryChatId));
    const title = `Summary — ${chat ? chat.title : 'Nomad AI'}`;
    const now = Date.now();
    if (typeof DIMAD_NOTEPAD !== 'undefined') {
      const notes = DIMAD_NOTEPAD.load();
      notes.unshift({
        id: `note-sum-${now}`,
        title,
        body: text,
        createdAt: now,
        updatedAt: now,
        customTitle: true
      });
      DIMAD_NOTEPAD.persist(notes);
    }
    const status = document.getElementById('nai-summary-status');
    if (status) status.classList.remove('hidden');
  },

  render() {
    this.placeRail();
    this.renderChrome();
    this.renderFeed();
    this.renderStarters();
    this.renderRail();
  },

  renderChrome() {
    const s = this.state();
    const pct = typeof DIMAD_AI_USAGE !== 'undefined' ? DIMAD_AI_USAGE.percent() : Math.max(0, Math.min(100, Number(s.usage) || 0));
    const bar = document.getElementById('nai-usage-bar');
    const label = document.getElementById('nai-usage-pct');
    const tip = document.getElementById('nai-usage-tip-pct');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = `h-full rounded-full ${pct > 80 ? 'bg-brand-gold' : 'bg-brand-mint'}`;
    }
    if (label) label.textContent = pct + '%';
    if (tip) tip.textContent = pct + '% Used';
    const flash = document.getElementById('nai-model-flash');
    const pro = document.getElementById('nai-model-pro');
    if (flash) flash.className = `px-2.5 py-1.5 rounded text-[10px] font-semibold ${s.model === 'flash' ? 'bg-brand-mint text-slate-950' : 'bg-brand-black text-slate-400 hover:text-white'}`;
    if (pro) pro.className = `px-2.5 py-1.5 rounded text-[10px] font-semibold ${s.model === 'pro' ? 'bg-brand-gold text-slate-950' : 'bg-brand-black text-slate-400 hover:text-white'}`;
    const send = document.getElementById('nai-send');
    if (send) send.disabled = this.generating;
    const heading = document.getElementById('nai-active-title');
    const chat = this.activeChat();
    if (heading) heading.textContent = chat && chat.title && chat.title !== 'New chat' ? chat.title : 'Chat for strategy, pricing, offers, sales, and ops.';
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('travel')) DIMAD_AI_HOST.paintUsage();
  },

  renderStarters() {
    const root = document.getElementById('nai-starters');
    if (!root) return;
    root.innerHTML = this.starters.map((chip) => `<button type="button" onclick='NOMAD_AI.chip(${JSON.stringify(chip.prompt)})' class="text-[10px] px-2.5 py-1 rounded border border-brand-border bg-brand-black text-slate-300 hover:border-brand-gold/50 hover:text-white transition">${this.escape(chip.label)}</button>`).join('');
  },

  renderFeed() {
    const feed = document.getElementById('nai-feed');
    if (!feed) return;
    const s = this.state();
    const chat = this.activeChat();
    const log = chat && chat.thread && chat.thread.length
      ? chat.thread
      : (s.messages || []);
    const rows = log.map((msg) => {
      const you = msg.sender === 'user';
      let extra = '';
      if (msg.metrics) {
        extra = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">${msg.metrics.map((m) => `<div class="bg-brand-black border border-brand-border rounded p-2.5">
          <div class="text-[9px] text-slate-500 uppercase">${this.escape(m.label)}</div>
          <div class="text-[13px] font-bold text-brand-gold font-mono">${this.escape(m.value)}</div>
          <div class="text-[10px] text-slate-400">${this.escape(m.note)}</div>
        </div>`).join('')}</div>`;
      }
      if (msg.hooks) {
        extra += `<div class="space-y-1.5 w-full">${msg.hooks.map((h) => `<div class="bg-brand-black border border-brand-border rounded p-2.5">
          <span class="text-[9px] font-mono uppercase text-brand-mint">${this.escape(h.tag)}</span>
          <p class="text-[12px] text-slate-200 mt-1">${this.escape(h.text)}</p>
        </div>`).join('')}</div>`;
      }
      const avatar = you
        ? '<div class="w-7 h-7 rounded bg-brand-gold text-slate-950 text-[9px] font-bold flex items-center justify-center shrink-0">YOU</div>'
        : '<div class="w-7 h-7 rounded bg-brand-gold/15 border border-brand-gold/40 text-brand-gold flex items-center justify-center shrink-0"><i class="fa-solid fa-plane text-[10px]"></i></div>';
      return `<div class="flex gap-2.5 ${you ? 'flex-row-reverse' : ''} max-w-3xl ${you ? 'ml-auto' : 'mr-auto'} w-full">
        ${avatar}
        <div class="min-w-0 flex-1 space-y-1.5 ${you ? 'flex flex-col items-end' : ''}">
          <div class="text-[9px] text-slate-500 font-mono">${you ? 'You' : 'Nomad AI'} · ${this.escape(msg.timestamp || '')}</div>
          ${msg.text ? `<div class="p-3 rounded-2xl text-[13px] leading-relaxed ${you ? 'bg-brand-gold text-slate-950 rounded-tr-md' : 'bg-brand-black border border-brand-border text-slate-200 rounded-tl-md'}">${this.escape(msg.text)}</div>` : ''}
          ${extra}
        </div>
      </div>`;
    }).join('');
    const pending = this.generating
      ? `<div class="flex gap-2.5 max-w-3xl mr-auto"><div class="w-7 h-7 rounded bg-brand-gold/15 border border-brand-gold/40 text-brand-gold flex items-center justify-center shrink-0"><i class="fa-solid fa-plane text-[10px]"></i></div><div class="flex items-center gap-2 text-[12px] text-brand-gold bg-brand-black border border-brand-border p-2.5 rounded-2xl"><i class="fa-solid fa-spinner fa-spin"></i> Drafting the brief...</div></div>`
      : '';
    feed.innerHTML = `<div class="max-w-3xl mx-auto w-full space-y-5">${rows}${pending}</div>`;
    feed.scrollTop = feed.scrollHeight;
  },

  renderRail() {
    const root = document.getElementById('nai-chat-list');
    if (!root) return;
    const s = this.state();
    const activeId = s.activeChatId;
    const all = this.chats();
    const archivedView = this.railView === 'archived';
    const pinned = all.filter((c) => c.pinned && !c.archived);
    const live = all.filter((c) => !c.pinned && !c.archived);
    const archived = all.filter((c) => c.archived);
    const heading = document.getElementById('nai-rail-heading');
    const newBtn = document.getElementById('nai-rail-new');
    const switchLabel = document.getElementById('nai-rail-switch-label');
    if (heading) heading.textContent = archivedView ? 'ARCHIVED' : 'SAVED CHATS';
    if (newBtn) newBtn.classList.toggle('hidden', archivedView);
    if (switchLabel) switchLabel.textContent = archivedView ? 'Saved chats' : `Archived${archived.length ? ' · ' + archived.length : ''}`;
    const row = (chat) => {
      if (this.renamingId === chat.id) {
        return `<div class="px-1 py-1"><input id="nai-rename-input" type="text" value="${this.escape(chat.title || '')}" onkeydown="NOMAD_AI.renameKey(event)" onblur="NOMAD_AI.commitRename()" class="w-full bg-slate-900 border border-brand-gold/40 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"></div>`;
      }
      const on = String(chat.id) === String(activeId);
      return `<button type="button" onclick="NOMAD_AI.openChat('${chat.id}')" oncontextmenu="NOMAD_AI.openCtx(event, '${chat.id}')" class="w-full text-left px-2 py-1 rounded border leading-tight ${on ? 'bg-brand-gold/10 border-brand-gold/40 text-slate-100' : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'}">
        <div class="flex items-center gap-1.5 min-w-0">
          ${chat.pinned ? '<i class="fa-solid fa-thumbtack text-brand-gold text-[8px] shrink-0"></i>' : ''}
          <span class="truncate text-[11px] font-semibold">${this.escape(chat.title || 'Untitled')}</span>
        </div>
      </button>`;
    };
    const block = (label, items) => items.length ? `<div class="space-y-0"><div class="px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500">${label}</div>${items.map(row).join('')}</div>` : '';
    if (archivedView) {
      root.innerHTML = archived.length ? `<div class="space-y-0">${archived.map(row).join('')}</div>` : '<p class="px-2 text-[10px] text-slate-500">No archived chats.</p>';
      return;
    }
    root.innerHTML = `${block('Pinned', pinned)}${block('Chats', live)}` || '<p class="px-2 text-[10px] text-slate-500">No saved chats yet.</p>';
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('travel')) DIMAD_AI_HOST.syncChats();
  }
};
window.NOMAD_AI = NOMAD_AI;


const CREATOR_AI = {
  storageKey: 'dimad_creator_ai_v2',
  passKey: 'dimad_creator_studio_pass',
  copiedId: null,
  generating: false,
  mounted: false,
  viewingAssetId: null,
  ctxId: null,
  renamingId: null,
  bound: false,
  railView: 'chats',
  starters: [
    { label: 'Product shot', prompt: 'Generate a sleek, minimalist studio product photoshoot for an obsidian digital nomad tumbler on volcanic sand.' },
    { label: 'TikTok hooks', prompt: 'Write 3 viral TikTok hook options for a SaaS product that automates client invoices.' },
    { label: 'Brand kit', prompt: 'Generate a high-contrast futuristic brand identity palette with hex codes and typography hierarchy.' },
    { label: 'IG carousel', prompt: 'Outline a 6-slide Instagram carousel teaching solopreneurs how to price retainers, with slide copy and visual direction.' },
    { label: 'Campaign pack', prompt: 'Draft a full product launch campaign pack: hero render, social story background, and ad headline.' }
  ],

  defaults() {
    return {
      usage: 42,
      model: 'flash',
      ratio: '1:1',
      vaultFilter: 'recent',
      activeThreadId: 'thread-welcome',
      input: '',
      messages: [
        {
          id: 'welcome-1',
          sender: 'ai',
          timestamp: '10:42 AM',
          text: "I'm Creator AI — a chat partner for social posts, product shots, brand kits, hooks, and campaign assets. Tell me what you're shipping and I'll draft copy, visuals, or a full pack.",
          type: 'welcome',
          threadId: 'thread-welcome'
        }
      ],
      vault: []
    };
  },

  sampleVault() {
    return [
      {
        id: 'v1',
        title: 'Obsidian Vessel 4K',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
        ptsSpent: 1000,
        date: 'Today',
        threadId: 'thread-vessel',
        thread: [
          { id: 'tv-u1', sender: 'user', timestamp: '10:41 AM', text: 'Product shot of an obsidian travel tumbler on volcanic sand, rim light, 8k.', threadId: 'thread-vessel' },
          { id: 'tv-d1', sender: 'ai', timestamp: '10:41 AM', text: 'Draft #01 — wider sand field, still too busy behind the bottle.', type: 'image_draft', threadId: 'thread-vessel', draftData: { title: 'Obsidian Vessel — Draft #01', prompt: 'Wide volcanic beach, tumbler small in frame', previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80', exportCost: 1000, isExported: false } },
          { id: 'tv-u2', sender: 'user', timestamp: '10:42 AM', text: 'Tighter crop. More rim light. Lose the extra props.', threadId: 'thread-vessel' },
          { id: 'tv-d2', sender: 'ai', timestamp: '10:43 AM', text: 'Draft #04 locked the hero angle. Export when you want 4K.', type: 'image_draft', threadId: 'thread-vessel', draftData: { title: 'Obsidian Travel Vessel — Draft #04', prompt: 'Minimalist black stainless steel water bottle on dark volcanic sand, dramatic rim lighting', previewUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80', exportCost: 1000, isExported: true } }
        ]
      },
      {
        id: 'v2',
        title: 'Lisbon Sunset B-Roll',
        type: 'video',
        url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
        duration: '5.0s',
        ptsSpent: 4000,
        date: 'Yesterday',
        threadId: 'thread-lisbon',
        thread: [
          { id: 'tl-u1', sender: 'user', timestamp: '4:12 PM', text: '5s motion teaser of a Lisbon sunset rooftop, 60fps, vertical story crop.', threadId: 'thread-lisbon' },
          { id: 'tl-d1', sender: 'ai', timestamp: '4:12 PM', text: 'Keyframe draft — too much sky, not enough city texture.', type: 'video_draft', threadId: 'thread-lisbon', videoData: { title: 'Lisbon Loop — Draft #01', fps: '60 FPS', previewUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80', exportCost: 4000, isExported: false } },
          { id: 'tl-u2', sender: 'user', timestamp: '4:14 PM', text: 'Push into the terrace and keep the 5s loop seamless.', threadId: 'thread-lisbon' },
          { id: 'tl-d2', sender: 'ai', timestamp: '4:15 PM', text: 'HD keyframe locked for the sunset B-roll loop.', type: 'video_draft', threadId: 'thread-lisbon', videoData: { title: 'Lisbon Sunset B-Roll', fps: '60 FPS', previewUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1000&q=80', exportCost: 4000, isExported: true } }
        ]
      },
      {
        id: 'v3',
        title: 'Cyber Nomad Palette',
        type: 'image',
        url: '',
        colors: ['#070A0F', '#38BDF8', '#10B981', '#F59E0B', '#EF4444'],
        date: '3 days ago',
        threadId: 'thread-palette',
        thread: [
          { id: 'tp-u1', sender: 'user', timestamp: '1:04 PM', text: 'Brand kit: high-contrast nomad OS palette with gold, mint, and sky.', threadId: 'thread-palette' },
          { id: 'tp-d1', sender: 'ai', timestamp: '1:04 PM', text: 'Draft kit with canvas, accent, action, and gold roles.', type: 'brand_kit', threadId: 'thread-palette', brandData: { title: 'Cyber-Nomad Palette & Identity', colors: [{ name: 'Deep Slate', hex: '#070A0F' }, { name: 'Sky Signal', hex: '#38BDF8' }, { name: 'Mint Yield', hex: '#10B981' }, { name: 'Amber Gold', hex: '#F59E0B' }] } }
        ]
      }
    ];
  },

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (raw && Array.isArray(raw.messages)) {
        const next = { ...this.defaults(), ...raw };
        if (next.vaultFilter === 'all') next.vaultFilter = 'recent';
        if (!Array.isArray(next.vault) || !next.vault.length) next.vault = this.sampleVault();
        next.vault = next.vault.map((item) => this.hydrateVaultItem(item));
        return this.hydrateChats(next);
      }
    } catch (err) { /* defaults */ }
    const fresh = this.defaults();
    fresh.vault = this.sampleVault();
    return this.hydrateChats(fresh);
  },

  hydrateChats(state) {
    if (Array.isArray(state.chats) && state.chats.length) {
      state.chats = state.chats.map((c) => ({ pinned: false, archived: false, customTitle: !!c.customTitle, ...c }));
      if (!state.activeChatId) state.activeChatId = state.chats[0].id;
      if (!state.activeThreadId) state.activeThreadId = state.chats[0].threadId;
      return state;
    }
    const chats = [];
    (state.vault || []).forEach((item, i) => {
      if (!item.thread || !item.thread.length) return;
      chats.push({
        id: 'c-vault-' + item.id,
        title: item.title || 'Asset thread',
        tag: item.type === 'video' ? 'Video' : item.type === 'image' ? 'Image' : 'Brand',
        threadId: item.threadId || ('thread-vault-' + item.id),
        pinned: i === 0,
        archived: false,
        customTitle: true,
        vaultId: item.id,
        thread: item.thread,
        updatedAt: Date.now() - i * 1000
      });
    });
    const taken = new Set(chats.map((c) => c.threadId));
    const extra = {};
    (state.messages || []).forEach((m) => {
      const tid = m.threadId || 'thread-welcome';
      if (taken.has(tid) || tid === 'thread-welcome') return;
      extra[tid] = extra[tid] || [];
      extra[tid].push(m);
    });
    Object.keys(extra).forEach((tid) => {
      const thread = extra[tid];
      const first = thread.find((m) => m.sender === 'user');
      chats.unshift({
        id: 'c-' + tid,
        title: String((first && first.text) || 'Chat').replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' '),
        tag: 'Chat',
        threadId: tid,
        pinned: false,
        archived: false,
        thread,
        updatedAt: Date.now()
      });
    });
    if (!chats.length) {
      chats.push({
        id: 'c-welcome',
        title: 'Welcome',
        tag: 'Chat',
        threadId: 'thread-welcome',
        pinned: false,
        archived: false,
        thread: state.messages || [],
        updatedAt: Date.now()
      });
    }
    state.chats = chats;
    state.activeChatId = chats[0].id;
    state.activeThreadId = chats[0].threadId;
    return state;
  },

  hydrateVaultItem(item) {
    if (item.thread && item.thread.length) return item;
    const samples = this.sampleVault();
    const match = samples.find((row) => row.id === item.id || row.title === item.title);
    if (match) return { ...item, threadId: match.threadId, thread: match.thread, type: item.type || match.type };
    return { ...item, thread: item.thread || [] };
  },

  persist(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  },

  state() {
    if (!this._state) this._state = this.load();
    return this._state;
  },

  passActive() {
    return localStorage.getItem(this.passKey) === '1';
  },

  dim() {
    return (typeof DIM_ENGINE !== 'undefined' && DIM_ENGINE.user) ? DIM_ENGINE.user.totalDimBalance : 0;
  },

  spendDim(amount) {
    if (typeof DIM_ENGINE === 'undefined') return false;
    if (DIM_ENGINE.user.totalDimBalance < amount) return false;
    DIM_ENGINE.user.totalDimBalance -= amount;
    if (DIM_ENGINE.updateUI) DIM_ENGINE.updateUI();
    return true;
  },

  grantDim(amount) {
    if (typeof DIM_ENGINE === 'undefined') return;
    DIM_ENGINE.user.totalDimBalance += amount;
    if (DIM_ENGINE.updateUI) DIM_ENGINE.updateUI();
  },

  escape(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  mount() {
    const view = document.getElementById('view-creator-ai');
    if (!view) return;
    ['cai-upgrade-modal', 'cai-usage-modal', 'cai-pass-info-modal', 'cai-summary-modal', 'cai-ctx', 'cai-rail'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== document.body) document.body.appendChild(el);
    });
    this.bindUi();
    this.mounted = true;
    this.placeRail();
    this.render();
    const feed = document.getElementById('cai-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  },

  unmount() {
    this.closeCtx();
    const rail = document.getElementById('cai-rail');
    if (rail) {
      rail.classList.add('hidden');
      rail.classList.remove('flex');
    }
    this.mounted = false;
  },

  backToDashboard() {
    this.closeCtx();
    this.closeSummary();
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen()) {
      closeDimadAiNav();
      return;
    }
    if (typeof switchTab === 'function') switchTab('creator-studio');
  },

  bindUi() {
    if (this.bound) return;
    this.bound = true;
    document.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('#cai-ctx')) return;
      this.closeCtx();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCtx();
        this.closeSummary();
      }
    });
    window.addEventListener('resize', () => {
      if (this.mounted) this.placeRail();
    });
  },

  placeRail() {
    const rail = document.getElementById('cai-rail');
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.isOpen()) {
      if (rail) {
        rail.classList.add('hidden');
        rail.classList.remove('flex');
      }
      return;
    }
    const nav = document.getElementById('main-sidebar');
    if (!rail || !nav) return;
    const box = nav.getBoundingClientRect();
    rail.style.position = 'fixed';
    rail.style.top = `${box.top}px`;
    rail.style.left = `${box.left}px`;
    rail.style.width = `${Math.max(box.width, 180)}px`;
    rail.style.height = `${box.height}px`;
    rail.style.zIndex = '355';
    rail.classList.remove('hidden');
    rail.classList.add('flex');
  },

  chats() {
    return this.state().chats || [];
  },

  activeChat() {
    const s = this.state();
    return this.chats().find((c) => c.id === s.activeChatId) || this.chats().find((c) => c.threadId === s.activeThreadId) || null;
  },

  ensureLiveChat() {
    const s = this.state();
    const threadId = 'thread-' + Date.now();
    const chat = {
      id: 'chat-' + Date.now(),
      title: 'New chat',
      tag: 'Live',
      threadId,
      pinned: false,
      archived: false,
      customTitle: false,
      thread: [],
      updatedAt: Date.now()
    };
    s.chats = s.chats || [];
    s.chats.unshift(chat);
    s.activeChatId = chat.id;
    s.activeThreadId = threadId;
    return chat;
  },

  newChat() {
    const s = this.state();
    this.viewingAssetId = null;
    s.messages = this.defaults().messages.map((m) => ({ ...m }));
    this.ensureLiveChat();
    this.persist(s);
    this.render();
    const input = document.getElementById('cai-input');
    if (input) input.focus();
  },

  loadDailyInspo(seed) {
    if (!seed) return;
    const s = this.state();
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.viewingAssetId = null;
    const chat = this.ensureLiveChat();
    chat.title = seed.title;
    chat.customTitle = true;
    chat.tag = 'Inspo';
    const threadId = chat.threadId;
    s.activeChatId = chat.id;
    s.activeThreadId = threadId;
    s.input = seed.title;
    const msg = {
      id: 'inspo-' + Date.now(),
      sender: 'ai',
      timestamp: stamp,
      text: `Loaded Daily Inspiration: ${seed.title}\n\n"${seed.promptText}"`,
      type: 'image_draft',
      threadId,
      isPreRenderedSample: true,
      draftData: {
        title: seed.title,
        prompt: seed.promptText,
        previewUrl: seed.imageUrl,
        exportCost: 1000,
        isExported: false
      }
    };
    s.messages = [msg];
    chat.thread = [msg];
    chat.updatedAt = Date.now();
    this.persist(s);
    if (typeof switchTab === 'function') switchTab('creator-ai');
    const input = document.getElementById('cai-input');
    if (input) input.value = seed.title;
  },

  openChat(id) {
    const chat = this.chats().find((c) => String(c.id) === String(id));
    if (!chat) return;
    const s = this.state();
    s.activeChatId = chat.id;
    s.activeThreadId = chat.threadId;
    this.viewingAssetId = chat.vaultId || null;
    this.closeCtx();
    this.renamingId = null;
    this.persist(s);
    this.render();
    const feed = document.getElementById('cai-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  },

  toggleArchivedView() {
    this.railView = this.railView === 'archived' ? 'chats' : 'archived';
    this.closeCtx();
    this.renderRail();
  },

  openCtx(event, id) {
    event.preventDefault();
    event.stopPropagation();
    this.ctxId = id;
    const chat = this.chats().find((c) => String(c.id) === String(id));
    const archived = !!(chat && chat.archived);
    const pin = document.getElementById('cai-ctx-pin');
    const arch = document.getElementById('cai-ctx-archive');
    if (pin) {
      pin.classList.toggle('hidden', archived);
      pin.textContent = chat && chat.pinned ? 'Unpin' : 'Pin';
    }
    if (arch) arch.textContent = archived ? 'Unarchive' : 'Archive';
    const ctx = document.getElementById('cai-ctx');
    if (!ctx) return;
    ctx.classList.remove('hidden');
    ctx.style.left = `${Math.min(event.clientX, window.innerWidth - 180)}px`;
    ctx.style.top = `${Math.min(event.clientY, window.innerHeight - 180)}px`;
  },

  closeCtx() {
    const ctx = document.getElementById('cai-ctx');
    if (ctx) ctx.classList.add('hidden');
  },

  ctxAction(action) {
    const id = this.ctxId;
    this.closeCtx();
    if (!id) return;
    if (action === 'pin') this.togglePin(id);
    if (action === 'rename') {
      this.renamingId = id;
      this.renderRail();
      const input = document.getElementById('cai-rename-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
    if (action === 'archive') this.toggleArchive(id);
    if (action === 'summary') this.openSummary(id);
    if (action === 'delete') this.deleteChat(id);
  },

  togglePin(id) {
    const s = this.state();
    s.chats = this.chats().map((c) => String(c.id) === String(id) ? { ...c, pinned: !c.pinned } : c);
    this.persist(s);
    this.renderRail();
  },

  toggleArchive(id) {
    const s = this.state();
    s.chats = this.chats().map((c) => String(c.id) === String(id) ? { ...c, archived: !c.archived, pinned: c.archived ? c.pinned : false } : c);
    this.persist(s);
    this.renderRail();
  },

  deleteChat(id) {
    const s = this.state();
    s.chats = this.chats().filter((c) => String(c.id) !== String(id));
    if (s.activeChatId === id) this.newChat();
    else {
      this.persist(s);
      this.renderRail();
    }
  },

  commitRename() {
    const id = this.renamingId;
    const input = document.getElementById('cai-rename-input');
    this.renamingId = null;
    if (!id || !input) {
      this.renderRail();
      return;
    }
    const name = input.value.trim();
    const s = this.state();
    s.chats = this.chats().map((c) => {
      if (String(c.id) !== String(id)) return c;
      if (!name) return { ...c, customTitle: false };
      return { ...c, title: name, customTitle: true };
    });
    this.persist(s);
    this.render();
  },

  renameKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitRename();
    }
    if (event.key === 'Escape') {
      this.renamingId = null;
      this.renderRail();
    }
  },

  buildSummary(chat) {
    const thread = chat.thread || [];
    const asks = thread.filter((m) => m.sender === 'user').map((m) => m.text).filter(Boolean);
    const answers = thread.filter((m) => m.sender === 'ai').map((m) => m.text).filter(Boolean);
    const recs = answers.join(' ').split(/(?<=\.)\s+/).filter(Boolean).slice(0, 5);
    return [
      `Executive Summary — ${chat.title || 'Creator AI thread'}`,
      '',
      'Objective',
      asks[0] || 'No prompt captured.',
      '',
      'Thread asks',
      ...(asks.length ? asks.map((t, i) => `${i + 1}. ${t}`) : ['—']),
      '',
      'Recommendations',
      ...(recs.length ? recs.map((t) => `• ${t}`) : ['• Continue the brief in Creator AI.']),
      '',
      'Next actions',
      '• Export or lock the strongest draft.',
      '• Move approved copy into WriteSpace or the vault.',
      '',
      `Generated ${new Date().toLocaleString()} · Creator AI`
    ].join('\n');
  },

  openSummary(id) {
    const chat = this.chats().find((c) => String(c.id) === String(id));
    if (!chat) return;
    this.summaryChatId = id;
    const title = document.getElementById('cai-summary-title');
    const body = document.getElementById('cai-summary-body');
    const status = document.getElementById('cai-summary-status');
    if (title) title.textContent = chat.title || 'Untitled chat';
    if (body) body.value = this.buildSummary(chat);
    if (status) status.classList.add('hidden');
    const modal = document.getElementById('cai-summary-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeSummary() {
    const modal = document.getElementById('cai-summary-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveSummaryNote() {
    const body = document.getElementById('cai-summary-body');
    const text = (body && body.value) || '';
    const chat = this.chats().find((c) => String(c.id) === String(this.summaryChatId));
    const title = `Summary — ${chat ? chat.title : 'Creator AI'}`;
    const now = Date.now();
    if (typeof DIMAD_NOTEPAD !== 'undefined') {
      const notes = DIMAD_NOTEPAD.load();
      notes.unshift({
        id: `note-sum-cai-${now}`,
        title,
        body: text,
        createdAt: now,
        updatedAt: now,
        customTitle: true
      });
      DIMAD_NOTEPAD.persist(notes);
    }
    const status = document.getElementById('cai-summary-status');
    if (status) status.classList.remove('hidden');
  },

  renderRail() {
    const root = document.getElementById('cai-chat-list');
    if (!root) return;
    const s = this.state();
    const activeId = s.activeChatId;
    const all = this.chats();
    const archivedView = this.railView === 'archived';
    const pinned = all.filter((c) => c.pinned && !c.archived);
    const live = all.filter((c) => !c.pinned && !c.archived);
    const archived = all.filter((c) => c.archived);
    const heading = document.getElementById('cai-rail-heading');
    const newBtn = document.getElementById('cai-rail-new');
    const switchLabel = document.getElementById('cai-rail-switch-label');
    if (heading) heading.textContent = archivedView ? 'ARCHIVED' : 'SAVED CHATS';
    if (newBtn) newBtn.classList.toggle('hidden', archivedView);
    if (switchLabel) switchLabel.textContent = archivedView ? 'Saved chats' : `Archived${archived.length ? ' · ' + archived.length : ''}`;
    const row = (chat) => {
      if (this.renamingId === chat.id) {
        return `<div class="px-1 py-1"><input id="cai-rename-input" type="text" value="${this.escape(chat.title || '')}" onkeydown="CREATOR_AI.renameKey(event)" onblur="CREATOR_AI.commitRename()" class="w-full bg-slate-900 border border-brand-gold/40 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"></div>`;
      }
      const on = String(chat.id) === String(activeId);
      return `<button type="button" onclick="CREATOR_AI.openChat('${chat.id}')" oncontextmenu="CREATOR_AI.openCtx(event, '${chat.id}')" class="w-full text-left px-2 py-1 rounded border leading-tight ${on ? 'bg-brand-gold/10 border-brand-gold/40 text-slate-100' : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'}">
        <div class="flex items-center gap-1.5 min-w-0">
          ${chat.pinned ? '<i class="fa-solid fa-thumbtack text-brand-gold text-[8px] shrink-0"></i>' : ''}
          <span class="truncate text-[11px] font-semibold">${this.escape(chat.title || 'Untitled')}</span>
        </div>
      </button>`;
    };
    const block = (label, items) => items.length ? `<div class="space-y-0"><div class="px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500">${label}</div>${items.map(row).join('')}</div>` : '';
    if (archivedView) {
      root.innerHTML = archived.length ? `<div class="space-y-0">${archived.map(row).join('')}</div>` : '<p class="px-2 text-[10px] text-slate-500">No archived chats.</p>';
      return;
    }
    root.innerHTML = `${block('Pinned', pinned)}${block('Chats', live)}` || '<p class="px-2 text-[10px] text-slate-500">No saved chats yet.</p>';
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('creator')) DIMAD_AI_HOST.syncChats();
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  openUsageInfo() { this.openModal('cai-usage-modal'); },
  closeUsageInfo() { this.closeModal('cai-usage-modal'); },
  openPassInfo() { this.openModal('cai-pass-info-modal'); },
  closePassInfo() { this.closeModal('cai-pass-info-modal'); },

  setModel(model) {
    this.state().model = model;
    this.persist(this.state());
    this.renderChrome();
  },

  setRatio(ratio) {
    this.state().ratio = ratio;
    this.persist(this.state());
    this.renderChrome();
  },

  setVaultFilter(filter) {
    this.state().vaultFilter = filter;
    this.persist(this.state());
    this.renderVault();
  },

  chip(prompt) {
    const input = document.getElementById('cai-input');
    if (input) input.value = prompt;
    this.state().input = prompt;
    this.send();
  },

  inputKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send(event);
    }
  },

  sendStudio(event) {
    if (event) event.preventDefault();
    const studio = document.getElementById('cs-cai-input');
    const input = document.getElementById('cai-input');
    if (studio && input) input.value = studio.value;
    this.send(event);
    if (studio) studio.value = '';
  },

  renderStudio() {
    const feed = document.getElementById('cs-cai-feed');
    if (!feed) return;
    const s = this.state();
    const msgs = (s.messages || []).filter((m) => m.type !== 'welcome').slice(-4);
    if (!msgs.length) {
      feed.innerHTML = '<p class="text-brand-gold"><strong>CREATOR AI:</strong> Ready to brainstorm essay concepts or video hooks.</p>';
      return;
    }
    feed.innerHTML = msgs.map((m) => {
      const who = m.sender === 'user' ? 'YOU' : 'CREATOR AI';
      const cls = m.sender === 'user' ? 'text-slate-300' : 'text-brand-gold';
      return `<p class="${cls}"><strong>${who}:</strong> ${this.escape(m.text || '')}</p>`;
    }).join('');
    feed.scrollTop = feed.scrollHeight;
  },

  send(event) {
    if (event) event.preventDefault();
    const studioView = document.getElementById('view-creator-studio');
    const studioOpen = studioView && !studioView.classList.contains('hidden');
    const studioInput = document.getElementById('cs-cai-input');
    const fullInput = document.getElementById('cai-input');
    const input = (studioOpen && studioInput) || fullInput || studioInput;
    const prompt = ((input && input.value) || '').trim();
    if (!prompt || this.generating) return;
    const s = this.state();
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.viewingAssetId = null;
    let chat = this.activeChat();
    if (!chat || chat.id === 'c-welcome') chat = this.ensureLiveChat();
    const threadId = chat.threadId;
    s.activeThreadId = threadId;
    s.activeChatId = chat.id;
    const userMsg = { id: 'msg-' + Date.now(), sender: 'user', text: prompt, timestamp: stamp, threadId };
    s.messages.push(userMsg);
    chat.thread = chat.thread || [];
    chat.thread.push(userMsg);
    if (typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.record('creator', 2);
    s.input = '';
    if (input) input.value = '';
    this.generating = true;
    this.persist(s);
    this.render();
    window.setTimeout(() => this.respond(prompt, threadId), 1100);
  },

  respond(prompt, threadId) {
    const s = this.state();
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    threadId = threadId || s.activeThreadId || 'thread-' + Date.now();
    const lower = prompt.toLowerCase();
    let msg;
    if (/motion|video|teaser|🎬/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp,
        text: "I've synthesized your 5-second motion teaser storyboard and draft video keyframe preview.",
        type: 'video_draft',
        threadId,
        videoData: {
          title: 'Tokyo Nomad Motion Loop — Draft',
          aspectRatio: s.ratio,
          fps: '60 FPS',
          prompt,
          previewUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
          exportCost: 4000,
          isExported: false
        }
      };
    } else if (/palette|brand|🎨/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp,
        text: 'Here is your custom brand identity kit draft with hex codes and typography hierarchy:',
        type: 'brand_kit',
        threadId,
        brandData: {
          title: 'Cyber-Nomad Palette & Identity',
          colors: [
            { name: 'Deep Slate', hex: '#070A0F', role: 'Primary Canvas' },
            { name: 'Sky Signal', hex: '#38BDF8', role: 'Accent' },
            { name: 'Mint Yield', hex: '#10B981', role: 'Action' },
            { name: 'Amber Gold', hex: '#F59E0B', role: 'Brand Gold' }
          ]
        }
      };
    } else if (/hook|script|copy|✍️|carousel|instagram|caption|marketing/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp,
        text: 'Here are 3 high-retention short-form video hooks tailored for solopreneur audiences:',
        type: 'script_hooks',
        threadId,
        hooks: [
          { tag: 'Pattern Interrupt', text: 'Stop managing 6 different subscriptions just to invoice two clients a month...' },
          { tag: 'Curiosity Spike', text: 'Here is the exact $35 tech stack I use to automate 16 hours of daily executive work...' },
          { tag: 'Relatable Pain', text: 'If you spend more time chasing client payments than building your business, watch this...' }
        ]
      };
    } else if (/campaign|pack|📦/.test(lower)) {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp,
        text: '1-Click Campaign Pack generated: hero render, social story banner, and copy kit.',
        type: 'campaign_pack',
        threadId,
        packData: {
          title: 'Q2 Solopreneur OS Launch Kit',
          prompt,
          previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
          exportCost: 1000,
          isExported: false
        }
      };
    } else {
      msg = {
        id: 'res-' + Date.now(), sender: 'ai', timestamp: stamp,
        text: `I've generated a fast low-res draft preview using the ${s.model === 'pro' ? 'Studio Pro 4K' : 'Gemini Flash'} engine (${s.ratio} ratio).`,
        type: 'image_draft',
        threadId,
        draftData: {
          title: 'AI Visual Render Draft',
          prompt,
          previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
          exportCost: 1000,
          isExported: false
        }
      };
    }
    s.messages.push(msg);
    const chat = this.chats().find((c) => c.threadId === threadId);
    if (chat) {
      chat.thread = chat.thread || [];
      chat.thread.push(msg);
      if (!chat.customTitle) chat.title = String(prompt || chat.title).replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ') || chat.title;
      chat.tag = s.model === 'pro' ? 'Studio' : 'Flash';
      chat.updatedAt = Date.now();
    }
    this.syncVaultFromMessage(msg);
    this.generating = false;
    this.persist(s);
    this.render();
  },

  exportAsset(msgId, cost, title, type, url) {
    if (!this.spendDim(cost)) {
      this.openUpgrade();
      return;
    }
    const s = this.state();
    if (typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.record('creator', 3);
    s.messages = s.messages.map((msg) => {
      if (msg.id !== msgId) return msg;
      if (msg.draftData) return { ...msg, draftData: { ...msg.draftData, isExported: true } };
      if (msg.videoData) return { ...msg, videoData: { ...msg.videoData, isExported: true } };
      if (msg.packData) return { ...msg, packData: { ...msg.packData, isExported: true } };
      return msg;
    });
    const exported = s.messages.find((m) => m.id === msgId) || {};
    this.syncVaultFromMessage(exported, { title, type, url, ptsSpent: cost, exported: true });
    this.persist(s);
    this.render();
  },

  threadMessages(threadId) {
    const s = this.state();
    return (s.messages || []).filter((m) => m.threadId && m.threadId === threadId && m.type !== 'welcome');
  },

  syncVaultFromMessage(msg, extra = {}) {
    if (!msg) return;
    if (!extra.exported && !['image_draft', 'video_draft', 'campaign_pack', 'brand_kit'].includes(msg.type)) return;
    const s = this.state();
    const threadId = msg.threadId || s.activeThreadId;
    const draft = msg.draftData || msg.packData || {};
    const video = msg.videoData || {};
    const type = extra.type || (msg.type === 'video_draft' ? 'video' : msg.type === 'brand_kit' ? 'image' : 'image');
    const title = extra.title || draft.title || video.title || (msg.brandData && msg.brandData.title) || 'Studio draft';
    const url = extra.url || draft.previewUrl || video.previewUrl || '';
    const colors = msg.brandData ? (msg.brandData.colors || []).map((c) => c.hex || c) : extra.colors;
    const thread = this.threadMessages(threadId);
    const row = {
      id: extra.exported ? ('v-' + Date.now()) : (`v-${threadId}`),
      title,
      type,
      url,
      colors,
      ptsSpent: extra.ptsSpent,
      date: extra.exported ? 'Just now' : 'Draft',
      threadId,
      thread,
      msgId: msg.id
    };
    const idx = s.vault.findIndex((item) => String(item.threadId) === String(threadId) && !extra.exported);
    if (idx >= 0 && !extra.exported) s.vault[idx] = { ...s.vault[idx], ...row };
    else s.vault.unshift(row);
  },

  openAsset(id) {
    const item = this.state().vault.find((row) => String(row.id) === String(id));
    if (!item) return;
    this.viewingAssetId = id;
    this.render();
    const feed = document.getElementById('cai-feed');
    if (feed) feed.scrollTop = 0;
  },

  closeAsset() {
    this.viewingAssetId = null;
    this.render();
    const feed = document.getElementById('cai-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  },

  copyText(text, id) {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    this.copiedId = id;
    this.renderFeed();
    window.setTimeout(() => {
      this.copiedId = null;
      this.renderFeed();
    }, 1600);
  },

  openUpgrade() {
    this.closePassInfo();
    this.openModal('cai-upgrade-modal');
  },

  closeUpgrade() {
    this.closeModal('cai-upgrade-modal');
  },

  activatePass() {
    if (!this.passActive()) {
      localStorage.setItem(this.passKey, '1');
      this.grantDim(18000);
    }
    this.closeUpgrade();
    this.renderChrome();
  },

  render() {
    this.renderStudio();
    if (!this.mounted) return;
    this.placeRail();
    this.renderChrome();
    this.renderFeed();
    this.renderStarters();
    this.renderVault();
    this.renderRail();
  },

  renderStarters() {
    const root = document.getElementById('cai-starters');
    if (!root) return;
    root.innerHTML = this.starters.map((chip) => `<button type="button" onclick='CREATOR_AI.chip(${JSON.stringify(chip.prompt)})' class="text-[10px] px-2.5 py-1 rounded border border-brand-border bg-brand-black text-slate-300 hover:border-brand-gold/50 hover:text-white transition">${this.escape(chip.label)}</button>`).join('');
  },

  renderChrome() {
    const s = this.state();
    const pct = typeof DIMAD_AI_USAGE !== 'undefined' ? DIMAD_AI_USAGE.percent() : Math.max(0, Math.min(100, Number(s.usage) || 0));
    const bar = document.getElementById('cai-usage-bar');
    const label = document.getElementById('cai-usage-pct');
    const tipPct = document.getElementById('cai-usage-tip-pct');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = `h-full rounded-full ${pct > 80 ? 'bg-brand-gold' : 'bg-brand-mint'}`;
    }
    if (label) label.textContent = pct + '%';
    if (tipPct) tipPct.textContent = pct + '% Used';
    const passOn = this.passActive();
    const passCta = document.getElementById('cai-pass-cta');
    const passBtn = document.getElementById('cai-pass-btn');
    if (passCta) passCta.textContent = passOn ? 'Active' : 'Upgrade';
    if (passBtn) {
      passBtn.className = passOn
        ? 'shrink-0 px-2.5 py-1 rounded text-[10px] font-bold bg-brand-gold/10 text-brand-gold border border-brand-gold/40'
        : 'shrink-0 px-2.5 py-1 rounded text-[10px] font-bold bg-brand-gold hover:bg-amber-400 text-slate-950';
    }
    const flash = document.getElementById('cai-model-flash');
    const pro = document.getElementById('cai-model-pro');
    if (flash) flash.className = `px-2.5 py-1.5 rounded text-[10px] font-semibold ${s.model === 'flash' ? 'bg-brand-mint text-slate-950' : 'bg-brand-black text-slate-400 hover:text-white'}`;
    if (pro) pro.className = `px-2.5 py-1.5 rounded text-[10px] font-semibold ${s.model === 'pro' ? 'bg-brand-gold text-slate-950' : 'bg-brand-black text-slate-400 hover:text-white'}`;
    const ratios = document.getElementById('cai-ratios');
    if (ratios) {
      ratios.innerHTML = ['1:1', '16:9', '9:16'].map((ratio) => `<button type="button" onclick="CREATOR_AI.setRatio('${ratio}')" class="px-2.5 py-1 rounded text-[10px] font-mono ${s.ratio === ratio ? 'bg-brand-panel text-brand-gold font-bold border border-brand-border' : 'text-slate-400 hover:text-white'}">${ratio}</button>`).join('');
    }
    const send = document.getElementById('cai-send');
    if (send) send.disabled = this.generating;
    const heading = document.getElementById('cai-active-title');
    const chat = this.activeChat();
    if (heading) heading.textContent = chat && chat.title && chat.title !== 'New chat' ? chat.title : 'Chat for social, image, branding, and marketing work.';
    const inspoActions = document.getElementById('cai-inspo-actions');
    if (inspoActions) inspoActions.classList.toggle('hidden', !(chat && chat.tag === 'Inspo'));
    if (typeof DIMAD_AI_HOST !== 'undefined' && DIMAD_AI_HOST.holding('creator')) DIMAD_AI_HOST.paintUsage();
  },

  renderFeed() {
    const feed = document.getElementById('cai-feed');
    if (!feed) return;
    const s = this.state();
    const viewing = this.viewingAssetId ? (s.vault || []).find((row) => String(row.id) === String(this.viewingAssetId)) : null;
    const chat = this.activeChat();
    const log = viewing && viewing.thread && viewing.thread.length
      ? viewing.thread
      : (chat && chat.thread && chat.thread.length ? chat.thread : (s.messages || []));
    const banner = viewing ? `<div class="flex items-center justify-between gap-2 bg-brand-gold/10 border border-brand-gold/30 rounded px-3 py-2">
      <div class="min-w-0">
        <div class="text-[10px] font-bold text-brand-gold truncate">Render log · ${this.escape(viewing.title)}</div>
        <div class="text-[9px] text-slate-400">Drafts and prompts that produced this asset</div>
      </div>
      <button type="button" onclick="CREATOR_AI.closeAsset()" class="shrink-0 text-[10px] font-bold text-slate-200 border border-brand-border bg-brand-black px-2.5 py-1 rounded hover:border-brand-gold">Back to chat</button>
    </div>` : '';
    const rows = log.map((msg) => {
      const you = msg.sender === 'user';
      let extra = '';
      if (msg.type === 'image_draft' && msg.draftData) extra += this.draftCard(msg.id, msg.draftData, 'image');
      if (msg.type === 'campaign_pack' && msg.packData) extra += this.draftCard(msg.id, { ...msg.packData, prompt: msg.packData.prompt || 'Campaign pack' }, 'image');
      if (msg.type === 'video_draft' && msg.videoData) extra += this.videoCard(msg.id, msg.videoData);
      if (msg.type === 'brand_kit' && msg.brandData) extra += this.brandCard(msg.brandData);
      if (msg.type === 'script_hooks' && msg.hooks) extra += this.hooksCard(msg.hooks);
      const avatar = you
        ? '<div class="w-7 h-7 rounded bg-brand-gold text-slate-950 text-[9px] font-bold flex items-center justify-center shrink-0">YOU</div>'
        : '<div class="w-7 h-7 rounded bg-brand-gold/15 border border-brand-gold/40 text-brand-gold flex items-center justify-center shrink-0"><i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i></div>';
      return `<div class="flex gap-2.5 ${you ? 'flex-row-reverse' : ''} max-w-3xl ${you ? 'ml-auto' : 'mr-auto'} w-full">
        ${avatar}
        <div class="min-w-0 flex-1 space-y-1.5 ${you ? 'flex flex-col items-end' : ''}">
          <div class="text-[9px] text-slate-500 font-mono">${you ? 'You' : 'Creator AI'} · ${this.escape(msg.timestamp || '')}</div>
          ${msg.text ? `<div class="p-3 rounded-2xl text-[13px] leading-relaxed ${you ? 'bg-brand-gold text-slate-950 rounded-tr-md' : 'bg-brand-black border border-brand-border text-slate-200 rounded-tl-md'}">${this.escape(msg.text)}</div>` : ''}
          ${extra}
        </div>
      </div>`;
    }).join('');
    const pending = this.generating
      ? `<div class="flex gap-2.5 max-w-3xl mr-auto"><div class="w-7 h-7 rounded bg-brand-gold/15 border border-brand-gold/40 text-brand-gold flex items-center justify-center shrink-0"><i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i></div><div class="flex items-center gap-2 text-[12px] text-brand-gold bg-brand-black border border-brand-border p-2.5 rounded-2xl"><i class="fa-solid fa-spinner fa-spin"></i> Drafting...</div></div>`
      : '';
    feed.innerHTML = `<div class="max-w-3xl mx-auto w-full space-y-5">${banner}${rows}${viewing ? '' : pending}</div>`;
    feed.scrollTop = feed.scrollHeight;
  },

  draftCard(msgId, data, type) {
    const exported = !!data.isExported;
    const cost = Number(data.exportCost || 1000);
    return `<div class="bg-brand-black border border-brand-border rounded overflow-hidden max-w-lg w-full p-3 space-y-2">
      <div class="relative rounded overflow-hidden bg-slate-950">
        <img src="${this.escape(data.previewUrl)}" alt="" class="w-full h-56 object-cover">
        <div class="absolute top-2 left-2 bg-slate-950/80 text-brand-gold border border-brand-gold/30 text-[9px] font-mono px-2 py-1 rounded flex items-center gap-1"><i class="fa-solid fa-eye"></i> Low-Res Free Draft (0 $DIM)</div>
      </div>
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h4 class="text-[11px] font-bold text-white truncate">${this.escape(data.title)}</h4>
          <p class="text-[10px] text-slate-400 truncate">${this.escape(data.prompt || '')}</p>
        </div>
        <button type="button" ${exported ? 'disabled' : ''} onclick="CREATOR_AI.exportAsset('${msgId}', ${cost}, ${JSON.stringify(data.title)}, '${type}', ${JSON.stringify(data.previewUrl)})" class="shrink-0 px-2.5 py-1.5 rounded text-[10px] font-bold ${exported ? 'bg-brand-mint/10 text-brand-mint border border-brand-mint/30' : 'bg-brand-mint hover:bg-emerald-400 text-slate-950'}">
          ${exported ? 'Exported (4K)' : `Export 4K (${cost.toLocaleString()} $DIM)`}
        </button>
      </div>
    </div>`;
  },

  videoCard(msgId, data) {
    const exported = !!data.isExported;
    const cost = Number(data.exportCost || 4000);
    return `<div class="bg-brand-black border border-brand-border rounded overflow-hidden max-w-lg w-full p-3 space-y-2">
      <div class="relative rounded overflow-hidden bg-slate-950">
        <img src="${this.escape(data.previewUrl)}" alt="" class="w-full h-52 object-cover opacity-80">
        <div class="absolute inset-0 flex items-center justify-center"><div class="w-12 h-12 rounded-full bg-brand-gold text-slate-950 flex items-center justify-center"><i class="fa-solid fa-play ml-0.5"></i></div></div>
        <div class="absolute bottom-2 left-2 bg-slate-950/80 text-brand-gold border border-brand-gold/30 text-[9px] font-mono px-2 py-0.5 rounded">5.0s Motion Loop • ${this.escape(data.fps || '60 FPS')}</div>
      </div>
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h4 class="text-[11px] font-bold text-white truncate">${this.escape(data.title)}</h4>
          <p class="text-[10px] text-slate-400">HD Render Pipeline</p>
        </div>
        <button type="button" ${exported ? 'disabled' : ''} onclick="CREATOR_AI.exportAsset('${msgId}', ${cost}, ${JSON.stringify(data.title)}, 'video', ${JSON.stringify(data.previewUrl)})" class="shrink-0 px-2.5 py-1.5 rounded text-[10px] font-bold ${exported ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30' : 'bg-brand-gold hover:bg-amber-400 text-slate-950'}">
          ${exported ? 'HD Rendered' : `Render HD (${cost.toLocaleString()} $DIM)`}
        </button>
      </div>
    </div>`;
  },

  brandCard(data) {
    return `<div class="bg-brand-black border border-brand-border rounded p-3 max-w-lg w-full space-y-2">
      <h4 class="text-[11px] font-bold text-white flex items-center justify-between"><span>${this.escape(data.title)}</span><span class="text-[9px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded border border-brand-gold/30">Brand Engine</span></h4>
      <div class="grid grid-cols-4 gap-2">${(data.colors || []).map((c, i) => `<button type="button" onclick="CREATOR_AI.copyText('${c.hex}', 'hex-${i}')" class="bg-brand-panel p-2 rounded border border-brand-border text-center hover:border-brand-gold/50">
        <div class="w-full h-8 rounded mb-1" style="background:${this.escape(c.hex)}"></div>
        <div class="text-[10px] font-mono font-bold text-white">${this.escape(c.hex)}</div>
        <div class="text-[9px] text-slate-400 truncate">${this.escape(c.name)}</div>
      </button>`).join('')}</div>
    </div>`;
  },

  hooksCard(hooks) {
    return `<div class="bg-brand-black border border-brand-border rounded p-3 max-w-lg w-full space-y-2">${hooks.map((h, i) => `<div class="bg-brand-panel p-3 rounded border border-brand-border relative">
      <span class="text-[9px] font-mono uppercase bg-brand-mint/10 text-brand-mint px-1.5 py-0.5 rounded border border-brand-mint/30">${this.escape(h.tag)}</span>
      <p class="text-[11px] text-slate-200 mt-1 pr-6">${this.escape(h.text)}</p>
      <button type="button" onclick='CREATOR_AI.copyText(${JSON.stringify(h.text)}, "hook-${i}")' class="absolute right-2 top-2 text-slate-500 hover:text-brand-gold text-[11px]">${this.copiedId === 'hook-' + i ? '<i class="fa-solid fa-check text-brand-mint"></i>' : '<i class="fa-solid fa-copy"></i>'}</button>
    </div>`).join('')}</div>`;
  },

  renderVault() {
    const s = this.state();
    const count = document.getElementById('cai-vault-count');
    const items = (s.vault || []).filter((item) => {
      if (s.vaultFilter === 'images') return item.type === 'image';
      if (s.vaultFilter === 'videos') return item.type === 'video';
      return true;
    });
    if (count) count.textContent = String(items.length);
    const filters = document.getElementById('cai-vault-filters');
    if (filters) {
      filters.innerHTML = ['recent', 'images', 'videos'].map((filter) => {
        const label = filter === 'recent' ? 'Recent' : filter === 'images' ? 'Images' : 'Videos';
        const on = (s.vaultFilter || 'recent') === filter;
        return `<button type="button" onclick="CREATOR_AI.setVaultFilter('${filter}')" class="px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${on ? 'bg-brand-gold/15 text-brand-gold border border-brand-gold/40' : 'text-slate-500 hover:text-slate-200 border border-transparent'}">${label}</button>`;
      }).join('');
    }
    const grid = document.getElementById('cai-vault');
    if (!grid) return;
    grid.innerHTML = items.map((item) => `<button type="button" onclick="CREATOR_AI.openAsset('${item.id}')" class="shrink-0 w-36 text-left bg-brand-black border ${this.viewingAssetId === item.id ? 'border-brand-gold' : 'border-brand-border hover:border-brand-gold/50'} rounded overflow-hidden p-1.5 space-y-1">
      ${item.url ? `<img src="${this.escape(item.url)}" alt="" class="w-full h-16 object-cover rounded">` : `<div class="w-full h-16 rounded bg-brand-panel flex items-center justify-center gap-1">${(item.colors || []).slice(0, 3).map((hex) => `<div class="w-3 h-6 rounded" style="background:${this.escape(hex)}"></div>`).join('')}</div>`}
      <div class="text-[9px] font-semibold text-white truncate">${this.escape(item.title)}</div>
    </button>`).join('') || '<p class="text-[10px] text-slate-500">No assets in this view yet.</p>';
  }
};
window.CREATOR_AI = CREATOR_AI;

const COMMAND_CENTER = {
  storageKey: 'dimad_cc_modules',
  layoutVersion: 2,
  catalog: [
    { id: 'ticker', label: 'Stock Ticker', group: 'core' },
    { id: 'quote', label: 'Quote of the Day', group: 'core' },
    { id: 'clocks', label: 'World Clocks', group: 'core' },
    { id: 'calendar', label: 'Calendar', group: 'core' },
    { id: 'copilot', label: 'Business AI Chat', group: 'core' },
    { id: 'notepad', label: 'DIMAD Notepad', group: 'core' },
    { id: 'goals', label: 'Accountability Log', group: 'core' },
    { id: 'tasks', label: 'Task Manager (To-Do List)', group: 'core' },
    { id: 'stripe', label: 'Stripe', group: 'api' },
    { id: 'store', label: 'Shopify / Lemon Squeezy', group: 'api' },
    { id: 'gumroad', label: 'Gumroad', group: 'api' },
    { id: 'patreon', label: 'Patreon', group: 'api' },
    { id: 'mailerlite', label: 'MailerLite', group: 'api' }
  ],

  apiIds() {
    return this.catalog.filter((item) => item.group === 'api').map((item) => item.id);
  },

  defaultState() {
    return { hidden: this.apiIds(), collapsed: [], layoutVersion: this.layoutVersion };
  },

  state() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || '');
      if (raw && Array.isArray(raw.hidden) && Array.isArray(raw.collapsed)) {
        if (raw.layoutVersion === this.layoutVersion) return raw;
        const next = {
          hidden: Array.from(new Set(raw.hidden.concat(this.apiIds()))),
          collapsed: raw.collapsed,
          layoutVersion: this.layoutVersion
        };
        this.persist(next);
        return next;
      }
    } catch (err) { /* defaults */ }
    return this.defaultState();
  },

  persist(next) {
    localStorage.setItem(this.storageKey, JSON.stringify(next));
  },

  railIds: ['stripe', 'store', 'gumroad', 'patreon', 'mailerlite'],
  lockedOpen: ['copilot', 'notepad'],

  apply() {
    const { hidden } = this.state();
    document.querySelectorAll('[data-cc-module]').forEach((el) => {
      const id = el.getAttribute('data-cc-module');
      const hide = hidden.includes(id);
      el.classList.toggle('hidden', hide);
      if (id === 'ticker') el.style.display = hide ? 'none' : 'flex';
      const body = el.querySelector('[data-cc-body]');
      if (body) body.classList.remove('hidden');
      if (this.railIds.includes(id)) {
        el.classList.add('cc-rail-open', 'w-full');
        el.classList.remove('w-fit', 'flex-1', 'min-w-[280px]', 'flex-none');
      }
    });
    const rail = document.getElementById('cc-integrations');
    if (rail) {
      const visible = rail.querySelectorAll('[data-cc-module]:not(.hidden)').length;
      rail.classList.toggle('hidden', visible === 0);
    }
    this.renderFilter();
    this.renderApiFilter();
    if (typeof DIMAD_NOTEPAD !== 'undefined' && DIMAD_NOTEPAD.renderDash) DIMAD_NOTEPAD.renderDash();
    if (typeof DIMAD_GOALS !== 'undefined' && DIMAD_GOALS.renderDash) DIMAD_GOALS.renderDash();
    if (typeof DIM_ENGINE !== 'undefined' && DIM_ENGINE.renderStreakTrack) DIM_ENGINE.renderStreakTrack();
    if (typeof TASK_MANAGER !== 'undefined') TASK_MANAGER.mount();
  },

  toggleCollapse(id) {
    if (this.lockedOpen.includes(id)) return;
    const next = this.state();
    next.collapsed = next.collapsed.includes(id)
      ? next.collapsed.filter((item) => item !== id)
      : next.collapsed.concat(id);
    this.persist(next);
    this.apply();
  },

  toggleVisible(id, show) {
    const next = this.state();
    if (show) next.hidden = next.hidden.filter((item) => item !== id);
    else if (!next.hidden.includes(id)) next.hidden.push(id);
    this.persist(next);
    this.apply();
  },

  toggleFilter(kind) {
    const core = document.getElementById('cc-module-filter');
    const api = document.getElementById('cc-api-filter');
    const openCore = kind === 'core';
    const openApi = kind === 'api';
    if (core) {
      const show = openCore && core.classList.contains('hidden');
      core.classList.toggle('hidden', !show);
      if (show) this.renderFilter();
    }
    if (api) {
      const show = openApi && api.classList.contains('hidden');
      api.classList.toggle('hidden', !show);
      if (show) this.renderApiFilter();
    }
  },

  filterChecks(items, hidden) {
    return items.map((item) => `
      <label class="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-900 cursor-pointer">
        <input type="checkbox" ${hidden.includes(item.id) ? '' : 'checked'} onchange="COMMAND_CENTER.toggleVisible('${item.id}', this.checked)" class="accent-amber-400">
        <span class="text-[11px] text-slate-200">${item.label}</span>
      </label>
    `).join('');
  },

  renderFilter() {
    const panel = document.getElementById('cc-module-filter');
    if (!panel) return;
    const { hidden } = this.state();
    const items = this.catalog.filter((item) => item.group === 'core');
    panel.innerHTML = `
      <div class="text-[9px] font-mono text-slate-500 uppercase px-1 pb-1">Show on dashboard</div>
      ${this.filterChecks(items, hidden)}
    `;
  },

  renderApiFilter() {
    const panel = document.getElementById('cc-api-filter');
    if (!panel) return;
    const { hidden } = this.state();
    const items = this.catalog.filter((item) => item.group === 'api');
    panel.innerHTML = `
      <div class="text-[9px] font-mono text-slate-500 uppercase px-1 pb-1">API Widgets</div>
      <p class="text-[9px] text-slate-500 px-1 pb-1.5">Check to add to Command Center.</p>
      ${this.filterChecks(items, hidden)}
    `;
  },

  markConnected(id) {
    const indicator = document.getElementById(`${id}-indicator`);
    if (indicator) indicator.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
  }
};

const DIMAD_STUDIO = {
  storageKey: 'dimad_cs_modules',
  layoutVersion: 1,
  catalog: [
    { id: 'inspo', label: 'Daily Inspo', group: 'core' },
    { id: 'creator-ai', label: 'Creator AI Chat', group: 'core' },
    { id: 'notepad', label: 'DIMAD Notepad', group: 'core' },
    { id: 'journal', label: 'Daily Journal', group: 'core' },
    { id: 'scheduler', label: 'Content Scheduler', group: 'core' },
    { id: 'pipeline', label: 'Creator Pipeline', group: 'core' },
    { id: 'youtube', label: 'YouTube', group: 'api' },
    { id: 'substack', label: 'Substack', group: 'api' },
    { id: 'instagram', label: 'Instagram', group: 'api' },
    { id: 'tiktok', label: 'TikTok', group: 'api' }
  ],
  railIds: ['youtube', 'substack', 'instagram', 'tiktok'],

  apiIds() {
    return this.catalog.filter((item) => item.group === 'api').map((item) => item.id);
  },

  defaultState() {
    return { hidden: this.apiIds(), collapsed: [], layoutVersion: this.layoutVersion };
  },

  state() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || '');
      if (raw && Array.isArray(raw.hidden) && Array.isArray(raw.collapsed)) {
        if (raw.layoutVersion === this.layoutVersion) return raw;
        const next = {
          hidden: Array.from(new Set(raw.hidden.concat(this.apiIds()))),
          collapsed: raw.collapsed,
          layoutVersion: this.layoutVersion
        };
        this.persist(next);
        return next;
      }
    } catch (err) { /* defaults */ }
    return this.defaultState();
  },

  persist(next) {
    localStorage.setItem(this.storageKey, JSON.stringify(next));
  },

  apply() {
    const { hidden } = this.state();
    const root = document.getElementById('view-creator-studio') || document;
    root.querySelectorAll('[data-cs-module]').forEach((el) => {
      const id = el.getAttribute('data-cs-module');
      el.classList.toggle('hidden', hidden.includes(id));
    });
    const rail = document.getElementById('cs-integrations');
    if (rail) {
      const visible = rail.querySelectorAll('[data-cs-module]:not(.hidden)').length;
      rail.classList.toggle('hidden', visible === 0);
    }
    this.renderFilter();
    this.renderApiFilter();
    if (typeof DIMAD_NOTEPAD !== 'undefined' && DIMAD_NOTEPAD.renderDash) DIMAD_NOTEPAD.renderDash();
    if (typeof CREATOR_AI !== 'undefined' && CREATOR_AI.renderStudio) CREATOR_AI.renderStudio();
    if (typeof SCHEDULER !== 'undefined' && SCHEDULER.renderStudio) SCHEDULER.renderStudio();
    if (typeof PIPELINE !== 'undefined' && PIPELINE.renderStudio) PIPELINE.renderStudio();
    if (typeof CALENDAR_NAV !== 'undefined' && CALENDAR_NAV.render) CALENDAR_NAV.render();
    if (typeof DAILY_INSPO !== 'undefined' && DAILY_INSPO.render) DAILY_INSPO.render();
    this.renderJournal();
  },

  toggleVisible(id, show) {
    const next = this.state();
    if (show) next.hidden = next.hidden.filter((item) => item !== id);
    else if (!next.hidden.includes(id)) next.hidden.push(id);
    this.persist(next);
    this.apply();
  },

  toggleFilter(kind) {
    const core = document.getElementById('cs-module-filter');
    const api = document.getElementById('cs-api-filter');
    if (core) {
      const show = kind === 'core' && core.classList.contains('hidden');
      core.classList.toggle('hidden', !show);
      if (show) this.renderFilter();
    }
    if (api) {
      const show = kind === 'api' && api.classList.contains('hidden');
      api.classList.toggle('hidden', !show);
      if (show) this.renderApiFilter();
    }
  },

  filterChecks(items, hidden) {
    return items.map((item) => `
      <label class="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-900 cursor-pointer">
        <input type="checkbox" ${hidden.includes(item.id) ? '' : 'checked'} onchange="DIMAD_STUDIO.toggleVisible('${item.id}', this.checked)" class="accent-amber-400">
        <span class="text-[11px] text-slate-200">${item.label}</span>
      </label>
    `).join('');
  },

  renderFilter() {
    const panel = document.getElementById('cs-module-filter');
    if (!panel) return;
    const { hidden } = this.state();
    const items = this.catalog.filter((item) => item.group === 'core');
    panel.innerHTML = `
      <div class="text-[9px] font-mono text-slate-500 uppercase px-1 pb-1">Show on dashboard</div>
      ${this.filterChecks(items, hidden)}
    `;
  },

  renderApiFilter() {
    const panel = document.getElementById('cs-api-filter');
    if (!panel) return;
    const { hidden } = this.state();
    const items = this.catalog.filter((item) => item.group === 'api');
    panel.innerHTML = `
      <div class="text-[9px] font-mono text-slate-500 uppercase px-1 pb-1">API Widgets</div>
      <p class="text-[9px] text-slate-500 px-1 pb-1.5">Check to add to Dimad Studio.</p>
      ${this.filterChecks(items, hidden)}
    `;
  },

  markConnected(id) {
    const indicator = document.getElementById(`cs-${id}-indicator`);
    if (indicator) indicator.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
  },

  renderJournal() {
    if (typeof WRITESPACE === 'undefined') return;
    const dateEl = document.getElementById('cs-journal-date');
    const bodyEl = document.getElementById('cs-journal-body');
    if (!dateEl && !bodyEl) return;
    const j = WRITESPACE.ensureJournalEntry();
    const entry = (j.entries || []).find((e) => e.id === j.currentId) || (j.entries || [])[0];
    if (dateEl) dateEl.textContent = WRITESPACE.formatJournalDate(entry && entry.date);
    if (bodyEl && document.activeElement !== bodyEl) bodyEl.value = (entry && entry.body) || '';
  },

  saveJournal() {
    if (typeof WRITESPACE === 'undefined') return;
    const bodyEl = document.getElementById('cs-journal-body');
    const j = WRITESPACE.ensureJournalEntry();
    const entry = (j.entries || []).find((e) => e.id === j.currentId);
    if (entry && bodyEl) {
      entry.body = bodyEl.value;
      entry.updatedAt = Date.now();
      WRITESPACE.persistJournal(j);
    }
    const status = document.getElementById('cs-journal-status');
    if (status) status.textContent = 'Saved to WriteSpace Journal.';
  },

  openJournal() {
    if (typeof WRITESPACE !== 'undefined') {
      const s = WRITESPACE.state();
      if (s.layoutStyle !== 'journal') s.prevLayout = s.layoutStyle;
      s.layoutStyle = 'journal';
      WRITESPACE.persist(s);
    }
    if (typeof switchTab === 'function') switchTab('creator-writespace');
  }
};

window.onload = async function() {
  loadAiChats();
  await loadViews();
  if (typeof WORLD_CLOCKS !== 'undefined') WORLD_CLOCKS.render();
  if (typeof DIMAD_GEO !== 'undefined') DIMAD_GEO.init();
  if (typeof DIMAD_AI_USAGE !== 'undefined') DIMAD_AI_USAGE.paint();
  updateClocks();
  setInterval(updateClocks, 1000);
  renderModeNav('entrepreneur');
  setIdentityHeaderState('entrepreneur', true);
  initGoalsRewards();
  DIM_ENGINE.updateUI();
  FOCUS_TIMER.init();
  if (typeof DIMAD_GOALS !== 'undefined') DIMAD_GOALS.checkReminders();
  switchTab('ent-dashboard');
  if (typeof CALENDAR_NAV !== 'undefined' && CALENDAR_NAV.render) CALENDAR_NAV.render();
  if (typeof FINNHUB_MARKETS !== 'undefined') FINNHUB_MARKETS.init();
  if (typeof COMMAND_CENTER !== 'undefined') COMMAND_CENTER.apply();
  if (typeof DIMAD_CAL !== 'undefined') {
    DIMAD_CAL.bindUi();
    DIMAD_CAL.fillTimeSelect();
    DIMAD_CAL.renderMiniMonth();
    DIMAD_CAL.tickReminders();
    setInterval(() => DIMAD_CAL.tickReminders(), 15000);
  }
};
