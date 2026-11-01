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
  'ent-custom',
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
      { id: 'ent-ai-business', label: '⚡ AI Business' },
      { id: 'ent-crm', label: 'Sales & Revenue' },
      { id: 'ent-stocks', label: 'Stocks & Finance' },
      { id: 'ent-invoices', label: 'Invoices & Proposals' },
      { id: 'ent-goals', label: 'Goals & Achievements' },
      { id: 'ent-tasks', label: 'Task Manager' },
      { type: 'workspace', workspaces: ['Workspace 1', 'Workspace 2', 'Workspace 3'] }
    ]
  },
  creator: {
    defaultTab: 'creator-studio',
    items: [
      { id: 'creator-studio', label: 'Dimad Studio', highlight: true },
      { id: 'creator-ai', label: '⚡ AI Creator' },
      { id: 'creator-writespace', label: 'WriteSpace' },
      { id: 'creator-design', label: 'Design Suite' },
      { id: 'creator-pipeline', label: 'Creator Pipeline' },
      { id: 'creator-scheduler', label: 'Content Scheduler' },
      { id: 'creator-vault', label: 'Asset & Media Vault' },
      { type: 'workspace', workspaces: ['Workspace 1', 'Workspace 2', 'Workspace 3'] }
    ]
  },
  nomad: {
    defaultTab: 'nomad-city',
    items: [
      { id: 'nomad-city', label: 'Your City', highlight: true },
      { id: 'nomad-ai', label: '⚡ AI Travel Planner' },
      { id: 'nomad-concierge', label: 'Dimad Concierge', premium: true },
      { id: 'nomad-maps', label: 'Digital Maps' },
      { id: 'nomad-guides', label: 'Travel Guides' },
      { id: 'nomad-language', label: 'Language Survival Kit' },
      { id: 'nomad-toolbox', label: 'Travel Toolbox' },
      { type: 'workspace', workspaces: ['Workspace 1'] }
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

const modePresets = {
  nomad: [
    { name: "Google Flights", url: "https://www.google.com/travel/flights" },
    { name: "Wise Currency", url: "https://wise.com" },
    { name: "Airbnb Stays", url: "https://www.airbnb.com" },
    { name: "NomadList", url: "https://nomadlist.com" },
    { name: "Google Maps", url: "https://maps.google.com" }
  ],
  entrepreneur: [
    { name: "Superhuman Inbox", url: "https://app.superhuman.com" },
    { name: "Notion Workspace", url: "https://www.notion.so" },
    { name: "Stripe Billing", url: "https://dashboard.stripe.com" },
    { name: "GitHub Repos", url: "https://github.com" },
    { name: "Linear Tasks", url: "https://linear.app" }
  ],
  creator: [
    { name: "Canva Design Deck", url: "https://www.canva.com/design/" },
    { name: "YouTube Studio", url: "https://studio.youtube.com" },
    { name: "Substack Dashboard", url: "https://substack.com" },
    { name: "Descript Editor", url: "https://www.descript.com" },
    { name: "X (Twitter)", url: "https://twitter.com" }
  ]
};

let customWorkspaces = [
  { name: "Google Flights", url: "https://www.google.com/travel/flights" },
  { name: "Wise Currency", url: "https://wise.com" }
];
let activeWorkspaceIdx = 0;

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

const WORLD_CLOCKS = {
  storageKey: 'dimad_world_clocks',
  query: '',
  tones: [
    { time: 'text-brand-accent', badge: 'bg-brand-accent/10 text-brand-accent' },
    { time: 'text-brand-gold', badge: 'bg-brand-gold/10 text-brand-gold' },
    { time: 'text-brand-mint', badge: 'bg-brand-mint/10 text-brand-mint' }
  ],

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
      return `
        <div class="border border-brand-border bg-brand-panel p-2.5 rounded flex items-center justify-between">
          <div>
            <p class="text-[9px] text-slate-400 font-bold">${city.city.toUpperCase()}</p>
            <p data-world-clock="${city.id}" class="text-xs font-bold font-mono ${tone.time}">--:--:--</p>
          </div>
          <span data-world-clock-offset="${city.id}" class="text-[8px] ${tone.badge} px-1.5 py-0.5 rounded">${this.offsetLabel(city.tz)}</span>
        </div>`;
    }).join('');
    this.tick();
    const panel = document.getElementById('world-clocks-picker');
    if (panel && !panel.classList.contains('hidden')) this.renderPicker(true);
  },

  tick() {
    const now = new Date();
    this.selectedIds().forEach((id) => {
      const city = this.cityById(id);
      const el = document.querySelector(`[data-world-clock="${id}"]`);
      if (!city || !el) return;
      try {
        el.textContent = now.toLocaleTimeString('en-US', {
          timeZone: city.tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      } catch (err) { /* skip */ }
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
    if (item.type === 'workspace') {
      const options = item.workspaces.map((name, idx) => `
        <button type="button" onclick="openCustomWorkspace(${idx})" class="block w-full text-left py-1 px-2 rounded text-slate-400 hover:text-slate-200">
          ${name}
        </button>
      `).join('');
      return `
        <div class="workspace-nav">
          <button type="button" onclick="toggleWorkspaceMenu(this)" class="sub-nav-btn text-slate-400 hover:text-slate-200 flex items-center justify-between w-full text-left py-1 px-2 rounded">
            <span>Custom Workspace</span>
            <i class="fa-solid fa-chevron-right text-[8px]"></i>
          </button>
          <div class="workspace-menu hidden pl-2 space-y-0.5 border-l border-brand-border/40 ml-1">${options}</div>
        </div>
      `;
    }

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

function toggleWorkspaceMenu(btn) {
  const menu = btn.nextElementSibling;
  if (!menu) return;
  menu.classList.toggle('hidden');
  const icon = btn.querySelector('i');
  if (icon) {
    icon.classList.toggle('fa-chevron-right');
    icon.classList.toggle('fa-chevron-down');
  }
}

function openCustomWorkspace(idx) {
  while (customWorkspaces.length <= idx) {
    customWorkspaces.push({ name: `Workspace ${customWorkspaces.length + 1}`, url: 'https://www.notion.so' });
  }
  activeWorkspaceIdx = idx;
  switchTab('ent-custom');
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
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`view-${tabId}`);
  if (target) target.classList.remove('hidden');
  if (tabId === 'ent-custom') {
    renderCustomWorkspaces();
    renderModePresets();
  }
  if (tabId === 'dimad-notepad' && typeof DIMAD_NOTEPAD !== 'undefined') {
    DIMAD_NOTEPAD.render();
  }
  if (tabId === 'ent-stocks' && typeof FINNHUB_MARKETS !== 'undefined') {
    FINNHUB_MARKETS.open();
  }
  if (tabId === 'ent-dashboard' && typeof COMMAND_CENTER !== 'undefined') {
    COMMAND_CENTER.apply();
  }
  if (tabId === 'dimad-calendar' && typeof DIMAD_CAL !== 'undefined') {
    DIMAD_CAL.renderFull();
  }
  if (tabId === 'creator-writespace' && typeof WRITESPACE !== 'undefined') {
    WRITESPACE.mount();
  }
  if (tabId === 'dimad-dimdrive' && typeof DIMDRIVE !== 'undefined') {
    DIMDRIVE.render();
  }
  if (tabId === 'creator-design' && typeof DESIGN_SUITE !== 'undefined') {
    DESIGN_SUITE.mount();
  }
  if (tabId === 'creator-pipeline' && typeof PIPELINE !== 'undefined') {
    PIPELINE.mount();
  }
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
    streakDays: 14,
    restShields: 2,
    loggedFocusHours: 45,
    totalDimBalance: 18400
  },

  userQuota: loadAiQuota(),

  streakMilestones: [
    { days: 7, baseReward: 1000 },
    { days: 14, baseReward: 1000 },
    { days: 21, baseReward: 1000 },
    { days: 30, baseReward: 2500 },
    { days: 50, baseReward: 4500 },
    { days: 75, baseReward: 2000 },
    { days: 100, baseReward: 8000 },
    { days: 125, baseReward: 2500 },
    { days: 150, baseReward: 2500 },
    { days: 180, baseReward: 12500 },
    { days: 215, baseReward: 3500 },
    { days: 250, baseReward: 4000 },
    { days: 300, baseReward: 17500 },
    { days: 365, baseReward: 27500 }
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
    const activeTier = this.tierConfigs[this.user.tier];
    if (!activeTier.canRedeem) {
      alert('Vault Redemptions are locked on Free accounts. Upgrade to $9/mo Explore Tier or higher to redeem $DIM.');
      switchVaultTab('subscription');
      return;
    }
    alert(`Concierge Flight/Hotel Request Initiated. Available Purchasing Power: $${this.dimToUsd(this.user.totalDimBalance)} USD.`);
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
    const root = document.getElementById('dim-streak-track');
    if (!root) return;
    const days = this.user.streakDays || 0;
    const milestones = this.streakMilestones;
    const next = milestones.find((m) => m.days > days);
    const activeTier = this.tierConfigs[this.user.tier] || this.tierConfigs.PRO;
    const badge = document.getElementById('goals-streak-badge');
    const nextEl = document.getElementById('goals-streak-next');
    if (badge) badge.textContent = `${days}d`;
    if (nextEl) {
      if (next) {
        const yieldAmt = Math.round(next.baseReward * activeTier.multiplier);
        const remaining = next.days - days;
        nextEl.innerHTML = `Next Milestone: <strong class="text-slate-200">${next.days} Days</strong> · ${yieldAmt.toLocaleString()} $DIM · ${remaining} day${remaining === 1 ? '' : 's'} remaining`;
      } else {
        nextEl.textContent = 'Year streak complete — all milestones claimed';
      }
    }

    let prev = 0;
    const segs = milestones.map((m) => {
      const span = Math.max(1, m.days - prev);
      const earned = Math.max(0, Math.min(span, days - prev));
      const fill = (earned / span) * 100;
      const claimed = days >= m.days;
      const barColor = claimed ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-500 to-amber-300';
      prev = m.days;
      return `<div class="flex-1 min-w-[52px] h-full bg-slate-950 overflow-hidden border-r border-slate-800 last:border-0 first:rounded-l-full last:rounded-r-full" title="${m.days} days · ${m.baseReward.toLocaleString()} $DIM">
        <div class="${barColor} h-full" style="width:${fill}%"></div>
      </div>`;
    }).join('');

    const labels = milestones.map((m) => {
      const claimed = days >= m.days;
      const current = next && m.days === next.days;
      const tone = claimed ? 'text-emerald-400' : current ? 'text-amber-400' : 'text-slate-500';
      return `<div class="flex-1 min-w-[52px] text-center px-0.5">
        <div class="text-[9px] font-bold ${tone} leading-tight">${m.days}d</div>
        <div class="text-[8px] font-mono ${claimed || current ? 'text-amber-400/90' : 'text-slate-600'} leading-tight">${m.baseReward.toLocaleString()}</div>
      </div>`;
    }).join('');

    root.innerHTML = `
      <div class="overflow-x-auto pb-1">
        <div class="min-w-[720px] space-y-1.5">
          <div class="flex h-5 rounded-full overflow-hidden border border-slate-700">${segs}</div>
          <div class="flex">${labels}</div>
        </div>
      </div>
      <p class="text-[10px] font-mono text-slate-500 mt-1">${days} / 365 days · rewards shown in $DIM before ${activeTier.multiplier}x yield</p>
    `;
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
      title: 'AI Travel Planner',
      desc: 'Nomad routes, boutique stays, and flight coordination.',
      placeholder: 'Ask AI Travel Planner anything... (e.g. 10-day Yerevan to Tbilisi)'
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

function openDimadAiNav() {
  const panel = document.getElementById('dimad-ai-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.classList.add('flex');
  switchAiMode(DIMAD_AI_STATE.activeMode || 'business');
  renderAiQuotaUi();
  if (!DIMAD_AI_STATE.activeChatId) startNewChat(true);
  renderChatList();
}

function closeDimadAiNav() {
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
    btn.classList.remove('text-amber-400', 'bg-amber-500/10', 'border', 'border-amber-500/20', 'font-bold');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.querySelector(`.ai-mode-btn[data-mode="${modeKey}"]`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('text-amber-400', 'bg-amber-500/10', 'border', 'border-amber-500/20', 'font-bold');
  }
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
    creator: { label: 'CREATOR AI', icon: '🎨', category: 'writing', className: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
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
  if (count) count.textContent = String(DIMAD_AI_STATE.chats.length);
  if (!list) return;
  if (!DIMAD_AI_STATE.chats.length) {
    list.innerHTML = `<div class="text-slate-500 italic text-[11px] px-2 py-1">No chats yet. Start a conversation and it will auto-save here.</div>`;
    return;
  }
  list.innerHTML = DIMAD_AI_STATE.chats.map((chat) => {
    const active = chat.id === DIMAD_AI_STATE.activeChatId;
    const meta = chatModeMeta(chat.mode);
    return `
      <button type="button" onclick="loadChat('${chat.id}')" class="w-full text-left bg-slate-950 p-2.5 rounded-xl border ${active ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 hover:border-slate-700'} space-y-1">
        <div class="flex justify-between items-center text-[10px] font-mono text-amber-400">
          <span>${meta.icon} ${escapeAiHtml(meta.label)}</span>
        </div>
        <p class="text-slate-200 truncate">${escapeAiHtml(chat.title || 'Untitled chat')}</p>
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

function renderModePresets() {
  const container = document.getElementById('suggestions-container');
  const label = document.getElementById('suggestion-mode-label');
  if (!container || !label) return;

  label.innerText = currentActiveMode.toUpperCase();
  const presets = modePresets[currentActiveMode] || modePresets['nomad'];

  container.innerHTML = '';
  presets.forEach(p => {
    container.innerHTML += `
      <button onclick="pinPreset('${p.name}', '${p.url}')" class="bg-brand-black/60 hover:bg-brand-gold/20 border border-brand-border hover:border-brand-gold text-slate-300 hover:text-brand-gold px-2.5 py-1 rounded text-[9px] font-mono flex items-center space-x-1.5 whitespace-nowrap transition-all">
        <i class="fa-solid fa-plus text-[8px] text-brand-gold"></i>
        <span>${p.name}</span>
      </button>
    `;
  });
}

function pinPreset(name, url) {
  const existingIdx = customWorkspaces.findIndex(w => w.name === name);
  if (existingIdx !== -1) {
    activeWorkspaceIdx = existingIdx;
  } else {
    customWorkspaces.push({ name, url });
    activeWorkspaceIdx = customWorkspaces.length - 1;
  }
  renderCustomWorkspaces();
}

function renderCustomWorkspaces() {
  const bar = document.getElementById('workspace-tabs-bar');
  const canvas = document.getElementById('full-embed-canvas');
  if (!bar || !canvas) return;

  bar.innerHTML = '';
  customWorkspaces.forEach((ws, idx) => {
    const isActive = idx === activeWorkspaceIdx;
    bar.innerHTML += `
      <button onclick="selectWorkspace(${idx})" class="px-3 py-1.5 rounded text-[10px] font-mono flex items-center space-x-2 border transition-all ${isActive ? 'bg-brand-gold/20 border-brand-gold text-brand-gold font-bold' : 'bg-brand-black/50 border-brand-border text-slate-400 hover:text-slate-200'}">
        <i class="fa-solid fa-window-maximize text-[9px]"></i>
        <span>${ws.name}</span>
      </button>
    `;
  });

  if (customWorkspaces.length > 0) {
    const activeWs = customWorkspaces[activeWorkspaceIdx];
    let embedUrl = activeWs.url;
    if (embedUrl.includes('canva.com/design/')) {
      embedUrl = embedUrl.replace('/view', '/view?embed');
    }
    canvas.innerHTML = `
      <div class="absolute top-2 right-3 z-10 flex items-center space-x-2 bg-brand-panel/90 border border-brand-border px-2 py-1 rounded text-[9px]">
        <span class="text-slate-400">URL: <strong class="text-slate-200">${activeWs.url}</strong></span>
        <a href="${activeWs.url}" target="_blank" class="text-brand-gold hover:underline">Open in Tab ↗</a>
      </div>
      <iframe src="${embedUrl}" class="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
    `;
  } else {
    canvas.innerHTML = `<p class="text-slate-500">No custom workspaces pinned yet.</p>`;
  }
}

function selectWorkspace(idx) {
  activeWorkspaceIdx = idx;
  renderCustomWorkspaces();
}

function addCustomWorkspace() {
  const nameInput = document.getElementById('new-workspace-name');
  const urlInput = document.getElementById('new-workspace-url');
  const name = nameInput.value.trim();
  let url = urlInput.value.trim();

  if (!name || !url) {
    alert("Please provide both a workspace name and a valid URL.");
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  customWorkspaces.push({ name, url });
  activeWorkspaceIdx = customWorkspaces.length - 1;
  nameInput.value = '';
  urlInput.value = '';
  renderCustomWorkspaces();
}

function toggleHowToModal() {
  document.getElementById('howto-modal').classList.toggle('hidden');
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

function initGoalsRewards() {
  const select = document.getElementById('goal-horizon-select');
  if (select) {
    select.addEventListener('change', (e) => switchGoalHorizon(e.target.value));
    switchGoalHorizon(select.value);
  }
  if (typeof DIM_ENGINE !== 'undefined') DIM_ENGINE.renderStreakTrack();
}

function toggleTimer() {
  const btn = document.getElementById('btn-timer-start');
  if (!isTimerRunning) {
    isTimerRunning = true; btn.innerText = "PAUSE";
    timerInterval = setInterval(() => {
      weeklyLoggedSeconds++;
      document.getElementById('weekly-progress-text').innerText = `${(weeklyLoggedSeconds / 3600).toFixed(1)} / 40.0 HRS`;
    }, 1000);
  } else {
    isTimerRunning = false; clearInterval(timerInterval); btn.innerText = "START";
  }
}

function resetTimer() { clearInterval(timerInterval); isTimerRunning = false; document.getElementById('btn-timer-start').innerText = "START"; }
function openFocusLog() { alert("Focus Log Modal"); }

const CONNECT_MODULARS = {
  connectStripe() {
    openSalesRevenue();
  },

  connectStore(platform) {
    openSalesRevenue();
  },

  connectCalendar(provider) {
    const status = document.getElementById('calendar-source-status');
    if (status) {
      status.textContent = provider === 'Calendly'
        ? 'Calendly synced • Google, Outlook, Apple'
        : `${provider} Calendar synced`;
    }
    const locked = document.querySelector('[data-cal-locked-source]');
    if (locked) locked.textContent = `Synced via ${provider}`;
  }
};

const DIMAD_NOTEPAD = {
  storageKey: 'dimad_notepad',
  activeId: null,

  load() {
    try {
      const notes = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (Array.isArray(notes) && notes.length) return notes;
    } catch (err) { /* start empty */ }
    return [{
      id: 'note-welcome',
      title: 'Command scratchpad',
      body: 'Use this notepad for meeting notes, ops checklists, and drafts. Notes stay on this device.',
      updatedAt: Date.now()
    }];
  },

  persist(notes) {
    localStorage.setItem(this.storageKey, JSON.stringify(notes));
  },

  render() {
    const list = document.getElementById('notepad-list');
    const titleEl = document.getElementById('notepad-title');
    const bodyEl = document.getElementById('notepad-body');
    const metaEl = document.getElementById('notepad-meta');
    if (!list || !titleEl || !bodyEl) return;

    const notes = this.load();
    if (!this.activeId || !notes.some((n) => n.id === this.activeId)) {
      this.activeId = notes[0] ? notes[0].id : null;
    }
    const active = notes.find((n) => n.id === this.activeId) || notes[0];

    list.innerHTML = notes.map((note) => {
      const selected = note.id === this.activeId
        ? 'bg-amber-500/10 border-amber-500/30 text-slate-100'
        : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200';
      return `
        <button type="button" onclick="DIMAD_NOTEPAD.select('${note.id}')" class="w-full text-left px-2.5 py-2 rounded-lg border ${selected} transition">
          <div class="text-[12px] font-semibold truncate">${this.escape(note.title || 'Untitled')}</div>
          <div class="text-[10px] text-slate-500 truncate">${this.escape((note.body || '').split('\n')[0] || 'Empty note')}</div>
        </button>`;
    }).join('');

    if (!active) {
      titleEl.value = '';
      bodyEl.value = '';
      if (metaEl) metaEl.textContent = 'No note selected';
      return;
    }
    titleEl.value = active.title || '';
    bodyEl.value = active.body || '';
    if (metaEl) {
      const stamp = new Date(active.updatedAt || Date.now());
      metaEl.textContent = `Updated ${stamp.toLocaleString()}`;
    }
  },

  select(id) {
    this.activeId = id;
    this.render();
  },

  create() {
    const notes = this.load();
    const note = { id: `note-${Date.now()}`, title: 'Untitled', body: '', updatedAt: Date.now() };
    notes.unshift(note);
    this.activeId = note.id;
    this.persist(notes);
    this.render();
  },

  save() {
    const titleEl = document.getElementById('notepad-title');
    const bodyEl = document.getElementById('notepad-body');
    if (!titleEl || !bodyEl || !this.activeId) return;
    const notes = this.load().map((note) => {
      if (note.id !== this.activeId) return note;
      return { ...note, title: titleEl.value, body: bodyEl.value, updatedAt: Date.now() };
    });
    this.persist(notes);
    const list = document.getElementById('notepad-list');
    if (list) {
      const active = notes.find((n) => n.id === this.activeId);
      const btn = list.querySelector(`button[onclick="DIMAD_NOTEPAD.select('${this.activeId}')"]`);
      if (btn && active) {
        btn.querySelector('div').textContent = active.title || 'Untitled';
        const preview = btn.querySelectorAll('div')[1];
        if (preview) preview.textContent = (active.body || '').split('\n')[0] || 'Empty note';
      }
    }
    const metaEl = document.getElementById('notepad-meta');
    if (metaEl) metaEl.textContent = `Updated ${new Date().toLocaleString()}`;
  },

  remove() {
    if (!this.activeId) return;
    const notes = this.load().filter((n) => n.id !== this.activeId);
    this.persist(notes);
    this.activeId = notes[0] ? notes[0].id : null;
    this.render();
  },

  escape(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  load() {
    try {
      const rows = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      return [];
    }
  },

  persist(rows) {
    localStorage.setItem(this.storageKey, JSON.stringify(rows));
  },

  escape(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    if (draft.id) {
      const idx = rows.findIndex((f) => String(f.id) === String(draft.id));
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], name, payload, updatedAt: now, type: 'writespace' };
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
      payload
    };
    rows.unshift(file);
    this.persist(rows);
    return file;
  },

  get(id) {
    return this.load().find((f) => String(f.id) === String(id)) || null;
  },

  remove(id) {
    this.persist(this.load().filter((f) => String(f.id) !== String(id)));
    this.render();
  },

  upload(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (file.size > 750000) {
      alert('Keep uploads under 750 KB for dimDrive on this device.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = this.load();
      rows.unshift({
        id: `drv_${Date.now()}`,
        name: file.name,
        type: 'upload',
        kind: file.type || 'File',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mime: file.type,
        payload: { dataUrl: reader.result, text: typeof reader.result === 'string' && !String(reader.result).startsWith('data:') ? reader.result : '' }
      });
      this.persist(rows);
      this.render();
      input.value = '';
    };
    if (file.type.startsWith('text/') || /\.(md|txt|json|html|csv)$/i.test(file.name)) reader.readAsText(file);
    else reader.readAsDataURL(file);
  },

  download(id) {
    const file = this.get(id);
    if (!file) return;
    let blob;
    let filename = file.name || 'dimdrive-file';
    if (file.type === 'writespace') {
      const body = `# ${file.payload.title}\n\n${file.payload.subtitle || ''}\n\n${file.payload.bodyText || ''}`;
      blob = new Blob([body], { type: 'text/markdown' });
      if (!/\.md$/i.test(filename)) filename += '.md';
    } else if (file.payload && file.payload.dataUrl && String(file.payload.dataUrl).startsWith('data:')) {
      const a = document.createElement('a');
      a.href = file.payload.dataUrl;
      a.download = filename;
      a.click();
      return;
    } else {
      blob = new Blob([file.payload && file.payload.text ? file.payload.text : JSON.stringify(file.payload || {})], { type: 'text/plain' });
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
    if (typeof switchTab === 'function') switchTab('creator-writespace');
  },

  render() {
    const root = document.getElementById('dimdrive-list');
    if (!root) return;
    const rows = this.load().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!rows.length) {
      root.innerHTML = '<div class="col-span-full border border-slate-800 rounded-2xl p-6 text-[12px] text-slate-400">No files yet. Save a WriteSpace draft to dimDrive or upload a file.</div>';
      return;
    }
    root.innerHTML = rows.map((file) => {
      const stamp = new Date(file.updatedAt || file.createdAt).toLocaleString();
      const canOpen = file.type === 'writespace';
      return `<article class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-sm font-semibold text-slate-100 truncate">${this.escape(file.name)}</div>
            <div class="text-[10px] font-mono text-amber-400/80 mt-0.5">${this.escape(file.kind || file.type)} · ${stamp}</div>
          </div>
          <span class="text-lg">${file.type === 'writespace' ? '✍️' : '📄'}</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${canOpen ? `<button type="button" onclick="DIMDRIVE.openInWriteSpace('${file.id}')" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] py-1.5 rounded-lg">Open in WriteSpace</button>` : ''}
          <button type="button" onclick="DIMDRIVE.download('${file.id}')" class="px-2.5 bg-slate-950 border border-slate-700 text-[10px] text-slate-200 rounded-lg">Download</button>
          <button type="button" onclick="DIMDRIVE.remove('${file.id}')" class="px-2.5 text-[10px] text-rose-400 border border-rose-500/30 rounded-lg">Delete</button>
        </div>
      </article>`;
    }).join('');
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
      return { ...this.defaults, ...saved };
    } catch (err) {
      return { ...this.defaults };
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
      stage.style.backgroundColor = light ? '#f0f2f5' : '#0f0e13';
      const paper = light ? 'bg-white text-slate-800 border-slate-200' : 'bg-[#16141d] text-amber-50 border-amber-900/30';
      stage.innerHTML = `
        <article class="w-full max-w-3xl ${paper} rounded-xl border shadow-xl p-8 md:p-12 select-text cursor-default" style="font-family:${face}">
          <div class="text-[11px] font-semibold tracking-widest uppercase text-amber-500 mb-2">${this.escape(dateLabel)}</div>
          ${title ? `<h1 class="text-2xl font-bold mb-6">${this.escape(title)}</h1>` : ''}
          <div class="leading-relaxed whitespace-normal" style="font-size:${size}">${bodyHtml}</div>
        </article>`;
    } else {
      stage.style.backgroundColor = light ? '#f0f2f5' : '#0f0e13';
      const paper = light ? 'bg-white text-slate-800 border-slate-200' : 'bg-[#16141d] text-amber-50 border-amber-900/30';
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
          <input id="ws-journal-folder-rename" type="text" value="${esc(f.name)}" class="flex-1 min-w-0 bg-[#0f0e13] border border-amber-500/50 rounded px-1.5 py-1 text-[11px] text-amber-100 font-semibold uppercase" onkeydown="if(event.key==='Enter'){event.preventDefault();WRITESPACE.commitRenameFolder();}">
          <button type="button" onclick="WRITESPACE.commitRenameFolder()" class="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center" title="Save"><i class="fa-solid fa-check text-[10px]"></i></button>
        </div>`;
      }
      const ctx = f.id === 'daily' ? '' : `oncontextmenu="WRITESPACE.openJournalFolderCtx(event, '${f.id}')"`;
      return `<button type="button" ${ctx} onclick="WRITESPACE.switchJournalFolder('${f.id}')" class="w-full text-left px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${on ? 'bg-amber-500/15 text-amber-400' : 'text-amber-200 hover:bg-amber-500/10'}">${esc(f.name)}</button>`;
    }).join('');
    let composer = '';
    if (this._folderComposer) {
      composer = `<div class="px-2 py-1.5 flex items-center gap-1 border-t border-amber-900/30" onclick="event.stopPropagation()">
        <input id="ws-journal-folder-new" type="text" placeholder="Folder name" class="flex-1 min-w-0 bg-[#0f0e13] border border-amber-500/50 rounded px-1.5 py-1 text-[11px] text-amber-100 font-semibold uppercase" onkeydown="if(event.key==='Enter'){event.preventDefault();WRITESPACE.commitNewFolder();}">
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
    root.innerHTML = this.tones.map((tone) => `<button type="button" onclick="WRITESPACE.setTone('${tone}')" class="py-1.5 px-2 rounded text-center font-medium border ${s.selectedTone === tone ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-[#1a1724] border-amber-900/40 text-amber-200'}">${tone}</button>`).join('');
  },

  setTone(tone) {
    this.state().selectedTone = tone;
    this.persist(this.state());
    this.renderTones();
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
  },

  toggleFullscreen() {
    const s = this.state();
    s.fullscreen = !s.fullscreen;
    this.persist(s);
    this.syncChrome();
  },

  toggleSidebar() {
    const s = this.state();
    s.sidebarCollapsed = !s.sidebarCollapsed;
    this.persist(s);
    this.syncChrome();
  },

  openSidebarTab(tab) {
    const s = this.state();
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
    if (aside) aside.classList.toggle('hidden', !!s.sidebarCollapsed);
    if (rail) {
      rail.classList.toggle('hidden', !s.sidebarCollapsed);
      rail.classList.toggle('flex', !!s.sidebarCollapsed);
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
      root.classList.toggle('bg-[#0f0e13]', !light);
      root.classList.toggle('text-amber-50', !light);
    }
    if (btn) {
      btn.innerHTML = light
        ? '<i class="fa-solid fa-moon text-amber-500"></i><span class="hidden sm:inline">Dark Amber</span>'
        : '<i class="fa-solid fa-sun text-blue-400"></i><span class="hidden sm:inline">Word Light</span>';
    }
    const wordDoc = s.layoutStyle === 'word';
    if (canvas && !wordDoc) {
      canvas.style.backgroundColor = light ? '#ffffff' : '';
      canvas.style.color = light ? '#1e293b' : '';
      canvas.classList.toggle('bg-white', light);
      canvas.classList.toggle('border-slate-200', light);
      canvas.classList.toggle('text-slate-800', light);
      canvas.classList.toggle('bg-[#16141d]', !light);
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
      if (stage) stage.style.backgroundColor = s.themeMode === 'light' ? '#f0f2f5' : '#0f0e13';
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
        canvas.classList.remove('rounded-xl', 'bg-[#16141d]', 'text-amber-50');
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
    ['bold', 'italic', 'underline'].forEach((key) => {
      const btn = document.getElementById(`ws-${key}`);
      if (!btn) return;
      btn.className = s[key]
        ? 'p-1.5 rounded border bg-amber-500/20 border-amber-500 text-amber-500'
        : 'p-1.5 rounded border border-transparent';
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
      else if (type === 'tone') text = `Tone shifted toward ${s.selectedTone}: keep the solitude argument, but make the call-to-action more ${s.selectedTone.toLowerCase()}.`;
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
  statuses: ['Target', 'Pitched', 'Negotiating', 'Active Collab', 'Paid'],
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
    if (statusEl && !statusEl.dataset.ready) {
      statusEl.innerHTML = `<option value="all">All statuses</option>${this.statuses.map((s) => `<option value="${this.escape(s)}">${this.escape(s)}</option>`).join('')}`;
      statusEl.dataset.ready = '1';
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

  mount() {
    const statusSelect = document.getElementById('pl-status');
    if (statusSelect && !statusSelect.dataset.ready) {
      statusSelect.innerHTML = this.statuses.map((s) => `<option value="${this.escape(s)}">${this.escape(s)}</option>`).join('');
      statusSelect.dataset.ready = '1';
    }
    this.render();
  },

  render() {
    const body = document.getElementById('pl-rows');
    const total = document.getElementById('pl-total');
    const count = document.getElementById('pl-count');
    if (!body) return;
    const all = this.load();
    this.fillFilters(all);
    const rows = this.sorted(this.filtered());
    this.syncSortMarks();
    if (total) total.textContent = `$${this.pipelineValue(rows).toLocaleString()}`;
    if (count) count.textContent = `${rows.length} of ${all.length}`;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="3" class="px-4 py-10 text-center text-[#666058] text-xs">No businesses match these filters.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((row, i) => {
      const zebra = i % 2 ? 'bg-[#141210]' : 'bg-[#11100f]';
      return `<tr onclick="PIPELINE.openDetail(${Number(row.id)})" class="${zebra} hover:bg-amber-950/30 cursor-pointer border-b border-[#2a2622]">
        <td class="px-4 py-2.5 text-white font-medium whitespace-nowrap">${this.escape(row.name)}</td>
        <td class="px-4 py-2.5 text-amber-400 whitespace-nowrap">${this.escape(row.status)}</td>
        <td class="px-4 py-2.5 text-[#c4bbb2] whitespace-nowrap font-mono text-[12px]">${this.escape(this.formatPitchDate(row.pitchDate))}</td>
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
    this.render();
  }
};

window.PIPELINE = PIPELINE;

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
    return this.load().filter((ev) => ev.date === key);
  },

  eventsForDay(date) {
    const map = {};
    this.eventsListForDay(date).forEach((ev) => {
      const time = ev.startTime || ev.time;
      if (!time) return;
      map[time] = { ...ev, title: ev.title, source: ev.source || 'DIMAD Calendar', tone: ev.tone || 'amber', id: ev.id, notes: ev.notes, reminder: ev.reminder, type: ev.type, endTime: ev.endTime, startTime: time };
    });
    return map;
  },

  upcoming() {
    const now = Date.now();
    return this.load().map((ev) => {
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
      return `<button type="button" onclick="DIMAD_CAL.openComposer({date:'${dateKey}',time:'${time}'})" class="block w-full border-t border-dashed border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition" style="height:${hourPx}px" title="Add event at ${time}"></button>`;
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
      const indigo = ev.type === 'meeting' || ev.source === 'Calendly' || ev.tone === 'indigo';
      const wrap = indigo ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-amber-500/20 border-amber-500/40';
      const startLabel = this.clockValue(ev.startTime || ev.time);
      const endLabel = this.clockValue(ev.endTime || this.calculateEndTime(ev.startTime || ev.time));
      const safeTitle = this.escape(ev.title);
      const click = ev.id
        ? `DIMAD_CAL.openEvent('${ev.id}')`
        : `DIMAD_CAL.openComposer({date:'${dateKey}',time:'${startLabel}',title:'${String(ev.title || '').replace(/'/g, '')}'})`;
      return `<button type="button" onclick="event.stopPropagation(); ${click}" class="absolute left-0 right-0 ${wrap} border rounded-md px-1.5 text-left overflow-hidden z-[1] hover:brightness-110" style="top:${top}px;height:${hgt}px">
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
      if (ignoreId && String(ev.id) === String(ignoreId) || ev.date !== date) return false;
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
      reminded: false
    };
    if (idx >= 0) rows[idx] = { ...rows[idx], ...payload };
    else rows.push(payload);
    this.persist(rows);
    if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.syncFromStore();
    return true;
  },

  deleteEvent(eventId) {
    this.persist(this.load().filter((ev) => ev.id !== eventId));
    if (typeof dimadCal !== 'undefined' && dimadCal) dimadCal.syncFromStore();
    this.renderFull();
    if (typeof CALENDAR_NAV !== 'undefined') CALENDAR_NAV.render();
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
        return `<button type="button" onclick="DIMAD_CAL.openComposer({date:'${this.dateKey(date)}',time:'${time}',title:'${String(ev.title).replace(/'/g, '')}'})" class="w-full text-left bg-amber-500/10 border border-amber-500/30 h-7 px-1.5 rounded-md flex items-center gap-2 my-px">
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
      const items = Object.keys(booked).sort().slice(0, 4).map((time) => `<div class="bg-amber-500/15 text-amber-200 rounded px-1 py-0.5 text-[8px] truncate">${time} ${CALENDAR_NAV.escape(booked[time].title)}</div>`).join('');
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
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((n) => `<div class="text-center text-[9px] font-mono text-slate-500 py-1">${n}</div>`).join('');
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
      return `<div class="border border-slate-800 rounded-lg px-2.5 py-2">
        <div class="text-[11px] font-semibold text-slate-100">${this.escape(ev.title)}</div>
        <div class="text-[9px] font-mono text-slate-500">${ev.date} · ${ev.startTime || ev.time}${ev.endTime ? '–' + ev.endTime : ''} · ${rem}</div>
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
    const ev = this.load().find((row) => String(row.id) === String(id));
    if (!ev) return;
    this.openComposer(ev);
  },

  openComposer(prefill) {
    this.fillTimeSelect();
    let data = Object.assign({}, prefill || {});
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
    const start = this.clockValue(data.startTime || data.time) || '09:00';
    const end = this.clockValue(data.endTime) || this.calculateEndTime(start);
    if (dateInput) dateInput.value = data.date || this.dateKey(this.anchorDate());
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;
    if (titleInput) titleInput.value = data.title || '';
    if (notesInput) notesInput.value = data.notes || '';
    if (typeInput) typeInput.value = data.type || 'meeting';
    if (reminderInput) reminderInput.value = data.reminder || '15';
    if (idInput) idInput.value = this.editingId;
    if (heading) heading.textContent = this.editingId ? 'View / edit event' : 'Add meeting / event';
    if (deleteBtn) deleteBtn.classList.toggle('hidden', !this.editingId);
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
    const id = document.getElementById('cal-event-id')?.value;
    if (!id) return;
    this.deleteEvent(id);
    this.closeComposer();
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
      source: 'DIMAD Calendar'
    });
    if (!ok) return;
    this.closeComposer();
    this.renderFull();
    if (typeof CALENDAR_NAV !== 'undefined') CALENDAR_NAV.render();
    this.renderMiniMonth();
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
      if (ev.reminded || !ev.reminder || ev.reminder === 'none') return;
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
    const heads = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((n) => `<span class="text-slate-500">${n}</span>`).join('');
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
    this.events = typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.load() : [];
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
    const active = (view) => this.currentView === view ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white';
    this.container.innerHTML = `
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div class="flex items-center space-x-3">
            <button type="button" onclick="dimadCal.navigate(-1)" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">◀ Prev</button>
            <button type="button" onclick="dimadCal.navigate(1)" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">Next ▶</button>
            <button type="button" onclick="dimadCal.goToday()" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold">Today</button>
            <h3 class="text-sm font-bold text-white ml-2">${this.getDateRangeString()}</h3>
          </div>
          <div class="flex items-center space-x-2">
            <div class="bg-slate-950 border border-slate-800 p-1 rounded-xl flex space-x-1">
              <button type="button" onclick="dimadCal.changeView('day')" class="px-3 py-1 text-xs font-semibold rounded-lg ${active('day')}">Day</button>
              <button type="button" onclick="dimadCal.changeView('week')" class="px-3 py-1 text-xs font-semibold rounded-lg ${active('week')}">Week</button>
              <button type="button" onclick="dimadCal.changeView('month')" class="px-3 py-1 text-xs font-semibold rounded-lg ${active('month')}">Month</button>
            </div>
            <button type="button" onclick="dimadCal.openQuickCreateModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow">＋ New Event</button>
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
    if (this.currentView === 'month') return this.renderMonthGridView();
    if (this.currentView === 'week') return this.renderWeekGridView();
    return this.renderHourlyGridView();
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
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((n) => `<div class="text-center text-[9px] font-mono text-slate-500 py-1">${n}</div>`).join('');
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = this.formatDateKey(d);
      const items = this.eventsOn(key).slice(0, 3);
      const inMonth = d.getMonth() === month;
      const isToday = key === todayKey;
      return `<button type="button" onclick="dimadCal.promptQuickSlot('${key}', '09:00')" class="min-h-[88px] rounded-md border text-left px-1.5 py-1 ${isToday ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'} ${inMonth ? '' : 'opacity-40'}">
        <div class="text-[11px] font-semibold ${isToday ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</div>
        ${items.map((ev) => `<div onclick="event.stopPropagation(); DIMAD_CAL.openEvent('${ev.id}')" class="text-[8px] text-indigo-200 truncate hover:text-amber-300">${ev.startTime || ev.time} ${DIMAD_CAL.escape(ev.title)}</div>`).join('') || '<div class="text-[8px] text-slate-600 italic">add event</div>'}
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

  weekStart(date) {
    const start = new Date(date);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    return start;
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
      ? { wrap: 'bg-indigo-500/10 border-indigo-500/30', time: 'text-indigo-400', source: 'text-indigo-300/80', badge: 'bg-indigo-500/20 text-indigo-300', badgeText: 'Locked' }
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
    const titleEl = document.getElementById('cal-view-title');
    const hintEl = document.getElementById('cal-view-hint');
    const tzEl = document.getElementById('calendar-timezone-label');
    const selectEl = document.getElementById('cal-mode-select');
    if (titleEl) titleEl.innerText = title;
    if (hintEl) hintEl.innerText = hint;
    if (tzEl) tzEl.textContent = `Timezone: ${this.tzName()} (Auto-detected)`;
    if (selectEl && selectEl.value !== this.mode) selectEl.value = this.mode;
    this.syncNavLabel();
  },

  render() {
    if (this.mode === 'weekly') return this.renderWeek();
    if (this.mode === 'monthly') return this.renderMonth();
    return this.renderDay();
  },

  renderDay(which) {
    if (which === 'tomorrow') this.dayOffset = 1;
    if (which === 'today') this.dayOffset = 0;
    const container = document.getElementById('hourly-slots-container');
    if (!container) return;
    const date = this.anchorDate();
    const dateKey = this.dateKey(date);
    const list = (typeof DIMAD_CAL !== 'undefined' ? DIMAD_CAL.eventsListForDay(dateKey) : []).map((ev) => ({
      ...ev,
      startTime: ev.startTime || ev.time,
      endTime: ev.endTime || DIMAD_CAL.calculateEndTime(ev.startTime || ev.time)
    }));
    const morningHours = Array.from({ length: 12 }, (_, i) => i);
    const eveningHours = Array.from({ length: 12 }, (_, i) => i + 12);
    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        <div>${DIMAD_CAL.renderHourColumn(dateKey, morningHours, list)}</div>
        <div>${DIMAD_CAL.renderHourColumn(dateKey, eveningHours, list)}</div>
      </div>`;
    this.updateChrome(this.formatDayTitle(date), '24-hour overview — click any hour to add an event.');
  },

  renderWeek() {
    const container = document.getElementById('hourly-slots-container');
    if (!container) return;
    const start = this.weekStart(this.anchorDate());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const todayKey = this.dateKey(new Date());
    container.innerHTML = `
      <div class="grid grid-cols-7 gap-1">
        ${days.map((d) => {
          const key = this.dateKey(d);
          const booked = this.bookedForDay(d);
          const items = Object.keys(booked).sort().slice(0, 3).map((time) => {
            const ev = booked[time];
            const tone = ev.tone === 'indigo' ? 'bg-indigo-500/15 text-indigo-200' : 'bg-amber-500/15 text-amber-200';
            return `<div class="${tone} rounded px-1 py-0.5 text-[8px] leading-tight truncate">${time} ${this.escape(ev.title)}</div>`;
          }).join('');
          const isToday = key === todayKey;
          return `
            <button type="button" onclick="CALENDAR_NAV.openDayFromGrid('${key}')" class="text-left min-h-[108px] rounded-lg border ${isToday ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-950/40'} p-1.5 space-y-1 hover:border-amber-500/30 transition">
              <div class="flex items-baseline justify-between">
                <span class="text-[9px] font-mono text-slate-500">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span class="text-[11px] font-semibold ${isToday ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</span>
              </div>
              ${items || '<div class="text-[8px] text-slate-600 italic">open</div>'}
            </button>`;
        }).join('')}
      </div>`;
    const end = days[6];
    this.updateChrome(
      `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      'Weekly overview — click a day to open its 24-hour schedule.'
    );
  },

  renderMonth() {
    const container = document.getElementById('hourly-slots-container');
    if (!container) return;
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
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((n) =>
      `<div class="text-center text-[9px] font-mono text-slate-500 py-1">${n}</div>`
    ).join('');
    container.innerHTML = `
      <div class="grid grid-cols-7 gap-1">
        ${weekday}
        ${cells.map((d) => {
          const inMonth = d.getMonth() === month;
          const key = this.dateKey(d);
          const booked = this.bookedForDay(d);
          const count = Object.keys(booked).length;
          const isToday = key === todayKey;
          return `
            <button type="button" onclick="DIMAD_CAL.openFromCommandCenter({dateKey:'${key}',mode:'hourly'})" class="h-12 rounded-md border text-left px-1.5 py-1 ${isToday ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'} ${inMonth ? '' : 'opacity-40'} hover:border-amber-500/30 transition">
              <div class="text-[11px] font-semibold ${isToday ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</div>
              <div class="text-[8px] font-mono ${count ? 'text-amber-400/80' : 'text-slate-600'}">${count ? count + ' evt' : ''}</div>
            </button>`;
        }).join('')}
      </div>`;
    this.updateChrome(
      date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      'Monthly overview — click a day to edit it in DIMAD Calendar.'
    );
  },

  openDayFromGrid(key) {
    const [y, m, d] = key.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.dayOffset = Math.round((target - today) / 86400000);
    this.mode = 'hourly';
    calendarClickCount = this.dayOffset === 0 ? 0 : 1;
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
    this.renderDay();
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

const COMMAND_CENTER = {
  storageKey: 'dimad_cc_modules',
  catalog: [
    { id: 'quote', label: 'Quote of the Day' },
    { id: 'clocks', label: 'World Clocks' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'store', label: 'Storefront' },
    { id: 'gumroad', label: 'Gumroad' },
    { id: 'patreon', label: 'Patreon' },
    { id: 'mailerlite', label: 'MailerLite' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'copilot', label: 'AI Co-Pilot' },
    { id: 'goals', label: 'Goals & OKRs' },
    { id: 'tasks', label: 'Task Manager' },
    { id: 'monthcal', label: 'Monthly Overview' }
  ],

  state() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || '');
      if (raw && Array.isArray(raw.hidden) && Array.isArray(raw.collapsed)) return raw;
    } catch (err) { /* defaults */ }
    return { hidden: [], collapsed: [] };
  },

  persist(next) {
    localStorage.setItem(this.storageKey, JSON.stringify(next));
  },

  railIds: ['stripe', 'store', 'gumroad', 'patreon', 'mailerlite'],

  apply() {
    const { hidden, collapsed } = this.state();
    document.querySelectorAll('[data-cc-module]').forEach((el) => {
      const id = el.getAttribute('data-cc-module');
      const isCollapsed = collapsed.includes(id);
      el.classList.toggle('hidden', hidden.includes(id));
      const body = el.querySelector('[data-cc-body]');
      if (body) body.classList.toggle('hidden', isCollapsed);
      const chevron = el.querySelector(`[data-cc-chevron="${id}"]`);
      if (this.railIds.includes(id)) {
        el.classList.toggle('flex-1', !isCollapsed);
        el.classList.toggle('min-w-[280px]', !isCollapsed);
        el.classList.toggle('flex-none', isCollapsed);
        if (chevron) {
          chevron.classList.toggle('fa-chevron-left', !isCollapsed);
          chevron.classList.toggle('fa-chevron-right', isCollapsed);
          chevron.classList.remove('fa-chevron-down');
        }
      } else if (chevron) {
        chevron.classList.toggle('fa-chevron-down', !isCollapsed);
        chevron.classList.toggle('fa-chevron-right', isCollapsed);
      }
    });
    const rail = document.getElementById('cc-integrations');
    if (rail) {
      const visible = rail.querySelectorAll('[data-cc-module]:not(.hidden)').length;
      rail.classList.toggle('hidden', visible === 0);
    }
    this.renderFilter();
  },

  toggleCollapse(id) {
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

  toggleFilter() {
    const panel = document.getElementById('cc-module-filter');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) this.renderFilter();
  },

  renderFilter() {
    const panel = document.getElementById('cc-module-filter');
    if (!panel) return;
    const { hidden } = this.state();
    panel.innerHTML = `
      <div class="text-[9px] font-mono text-slate-500 uppercase px-1 pb-1">Show on dashboard</div>
      ${this.catalog.map((item) => `
        <label class="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-900 cursor-pointer">
          <input type="checkbox" ${hidden.includes(item.id) ? '' : 'checked'} onchange="COMMAND_CENTER.toggleVisible('${item.id}', this.checked)" class="accent-amber-400">
          <span class="text-[11px] text-slate-200">${item.label}</span>
        </label>
      `).join('')}
    `;
  },

  markConnected(id) {
    const indicator = document.getElementById(`${id}-indicator`);
    if (indicator) indicator.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
  }
};

window.onload = async function() {
  loadAiChats();
  await loadViews();
  if (typeof WORLD_CLOCKS !== 'undefined') WORLD_CLOCKS.render();
  updateClocks();
  setInterval(updateClocks, 1000);
  renderModeNav('entrepreneur');
  setIdentityHeaderState('entrepreneur', true);
  initGoalsRewards();
  DIM_ENGINE.updateUI();
  switchTab('ent-dashboard');
  if (typeof CALENDAR_NAV !== 'undefined' && CALENDAR_NAV.render) CALENDAR_NAV.render();
  if (typeof FINNHUB_MARKETS !== 'undefined') FINNHUB_MARKETS.init();
  if (typeof COMMAND_CENTER !== 'undefined') COMMAND_CENTER.apply();
  if (typeof DIMAD_CAL !== 'undefined') {
    DIMAD_CAL.fillTimeSelect();
    DIMAD_CAL.renderMiniMonth();
    DIMAD_CAL.tickReminders();
    setInterval(() => DIMAD_CAL.tickReminders(), 15000);
  }
};
