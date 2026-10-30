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

const DIM_ENGINE = {
  peg: {
    tokensPerDollar: 1600
  },

  tierConfigs: {
    FREE: {
      name: 'Free',
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
      name: 'Explore',
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
      name: 'Premium',
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
      name: 'VIP Unlimited',
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
      alert('Vault Redemptions are locked on Free. Upgrade to Explore ($9/mo) or higher to redeem $DIM.');
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
      alert('Vault Redemptions are locked on Free.');
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
    renderAiQuotaUi();
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
  if (!select) return;
  select.addEventListener('change', (e) => switchGoalHorizon(e.target.value));
  switchGoalHorizon(select.value);
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

let calendarClickCount = 0;

const CALENDAR_HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    let seeded = {};
    if (date.getTime() === today.getTime()) {
      seeded = {
        '10:00': { title: 'Client Strategy & Onboarding Call', source: 'Synced via Google Calendar', tone: 'indigo' },
        '13:00': { title: 'Dimad AI Code Sprint & Review', source: 'Execution Queue', tone: 'amber' }
      };
    } else if (date.getTime() === tomorrow.getTime()) {
      seeded = {
        '11:00': { title: 'Investor update write-up', source: 'Execution Queue', tone: 'amber' }
      };
    }
    return Object.assign({}, seeded, extras);
  },

  openSlotHtml(time) {
    return `
      <div data-cal-slot="${time}" onclick="CALENDAR_NAV.clickSlot('${time}')" class="group h-5 flex items-center gap-2 px-0.5 cursor-pointer">
        <span class="text-[10px] font-mono text-slate-500 w-[42px] flex-shrink-0">${time}</span>
        <span class="flex-1 border-t border-dashed border-slate-700 group-hover:border-amber-500/50 transition"></span>
        <span class="text-[9px] text-slate-500 group-hover:text-amber-400 transition flex-shrink-0">add event</span>
      </div>`;
  },

  bookedSlotHtml(time, title, source, tone) {
    const palette = tone === 'indigo'
      ? { wrap: 'bg-indigo-500/10 border-indigo-500/30', time: 'text-indigo-400', source: 'text-indigo-300/80', badge: 'bg-indigo-500/20 text-indigo-300', badgeText: 'Locked' }
      : { wrap: 'bg-amber-500/10 border-amber-500/30', time: 'text-amber-400', source: 'text-amber-300/80', badge: 'bg-amber-500/20 text-amber-300', badgeText: 'Active' };
    const sourceAttr = tone === 'indigo' ? ' data-cal-locked-source' : '';
    return `
      <div class="${palette.wrap} border h-5 px-1 rounded-md flex items-center justify-between gap-1.5 my-px">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-[10px] font-mono ${palette.time} w-[42px] flex-shrink-0">${time}</span>
          <h5 class="text-[10px] font-semibold text-slate-200 truncate">${title}</h5>
          <span class="text-[8px] ${palette.source} font-mono hidden xl:inline truncate"${sourceAttr}>${source}</span>
        </div>
        <span class="text-[8px] font-mono ${palette.badge} px-1 py-px rounded flex-shrink-0">${palette.badgeText}</span>
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
    if (this.mode === 'weekly') navLabel.innerText = 'Next week >';
    else if (this.mode === 'monthly') navLabel.innerText = 'Next month >';
    else navLabel.innerText = this.dayOffset === 0 ? 'Tomorrow >' : 'View Calendar >';
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
    const booked = this.bookedForDay(date);
    const column = (hours) => hours.map((time) => {
      const event = booked[time];
      return event ? this.bookedSlotHtml(time, event.title, event.source, event.tone) : this.openSlotHtml(time);
    }).join('');
    const morning = CALENDAR_HOURS.slice(0, 12);
    const evening = CALENDAR_HOURS.slice(12);
    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        <div class="flex flex-col">${column(morning)}</div>
        <div class="flex flex-col">${column(evening)}</div>
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
            <button type="button" onclick="CALENDAR_NAV.openDayFromGrid('${key}')" class="h-12 rounded-md border text-left px-1.5 py-1 ${isToday ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'} ${inMonth ? '' : 'opacity-40'} hover:border-amber-500/30 transition">
              <div class="text-[11px] font-semibold ${isToday ? 'text-amber-400' : 'text-slate-200'}">${d.getDate()}</div>
              <div class="text-[8px] font-mono ${count ? 'text-amber-400/80' : 'text-slate-600'}">${count ? count + ' evt' : ''}</div>
            </button>`;
        }).join('')}
      </div>`;
    this.updateChrome(
      date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      'Monthly overview — click a day to open its 24-hour schedule.'
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
        if (typeof switchTab === 'function') switchTab('dimad-calendar');
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
        if (typeof switchTab === 'function') switchTab('dimad-calendar');
      }
      return;
    }
    if (calendarClickCount === 1) {
      this.dayOffset = 1;
      this.render();
    } else {
      calendarClickCount = 0;
      if (typeof switchTab === 'function') switchTab('dimad-calendar');
    }
  },

  clickSlot(timeString) {
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
};
