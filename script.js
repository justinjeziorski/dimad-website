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
      { id: 'ent-crm', label: 'Kanban CRM' },
      { id: 'ent-stocks', label: 'Stocks & Investments' },
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
      const res = await fetch(new URL(`../views/${id}.html`, window.location.href));
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

function updateClocks() {
  const now = new Date();
  if(document.getElementById('clock-yerevan')) {
    document.getElementById('clock-yerevan').innerText = `${now.toLocaleTimeString('en-US', { timeZone: 'Asia/Yerevan', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} AMT`;
    document.getElementById('clock-london').innerText = `${now.toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} GMT`;
    document.getElementById('clock-ny').innerText = `${now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} EDT`;
  }
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
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`view-${tabId}`);
  if (target) target.classList.remove('hidden');
  if (tabId === 'ent-custom') {
    renderCustomWorkspaces();
    renderModePresets();
  }
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

window.onload = async function() {
  await loadViews();
  updateClocks();
  setInterval(updateClocks, 1000);
  renderModeNav('entrepreneur');
  setIdentityHeaderState('entrepreneur', true);
  switchTab('ent-dashboard');
};
