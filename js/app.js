// js/app.js — ZenAIList Pro Engine
// Velocity Spotlight, Hardware Specs, Stagger Animations, Accessible Charts

let reposData = [];
let devsData = [];
let summaryData = {};
let categoryStats = null;
let locationStats = null;
let affiliates = {};

let reposFiltered = [];
let reposPage = 1;
let reposPageSize = 50;
let reposSort = { col: 'star_1d', desc: true };

let devsFiltered = [];
let devsPage = 1;
let devsPageSize = 50;
let devsSort = { col: 'weighted_contributions', desc: true };

let chartsInitialized = false;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function init() {
  try {
    const [reposRes, devsRes, sumRes, catRes, locRes, affRes] = await Promise.all([
      fetch('data/repos.json'),
      fetch('data/devs.json'),
      fetch('data/summary.json'),
      fetch('data/category_stats.json'),
      fetch('data/location_stats.json'),
      fetch('config/affiliates.json')
    ]);

    reposData = await reposRes.json();
    devsData = await devsRes.json();
    summaryData = await sumRes.json();
    categoryStats = await catRes.json();
    locationStats = await locRes.json();
    affiliates = await affRes.json();

    renderHeaderStats();
    renderVelocitySpotlight();
    initTabs();
    initReposTab();
    initDevsTab();
    initCountriesTab();
    initBackToTop();

    // Hide skeleton, show table
    const skel = document.getElementById('repos-skeleton');
    const tbl = document.getElementById('repos-table-container');
    if (skel) skel.style.display = 'none';
    if (tbl) tbl.style.display = 'block';
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

function formatCompact(num) {
  if (!num) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

function renderHeaderStats() {
  document.getElementById('header-repos-count').textContent = formatCompact(summaryData.total_repos || reposData.length);
  document.getElementById('header-devs-count').textContent = formatCompact(summaryData.total_devs || devsData.length);
  document.getElementById('header-stars-count').textContent = formatCompact(summaryData.total_stars || 72664000);
}

// Stagger reveal helper
function staggerReveal(selector, delay) {
  if (prefersReducedMotion) {
    document.querySelectorAll(selector).forEach(el => el.classList.add('revealed'));
    return;
  }
  document.querySelectorAll(selector).forEach((el, i) => {
    setTimeout(() => el.classList.add('revealed'), i * (delay || 60));
  });
}

// Render Top 3 Breakout Repos (Velocity Radar)
function renderVelocitySpotlight() {
  const radarGrid = document.getElementById('radar-grid');
  if (!radarGrid) return;
  radarGrid.innerHTML = '';

  const top3 = [...reposData].sort((a, b) => (b.star_1d || 0) - (a.star_1d || 0)).slice(0, 3);
  const railwayRef = affiliates.cloud_deploy?.railway?.url_template || "https://railway.com?referralCode=Ks00DU";

  const badges = [
    { text: 'BREAKOUT #1', cls: 'radar-badge-breakout' },
    { text: 'VIRAL', cls: 'radar-badge-trending' },
    { text: 'GPU ACCELERATED', cls: 'radar-badge-gpu' }
  ];

  top3.forEach((r, idx) => {
    const card = document.createElement('div');
    card.className = 'radar-card';
    card.innerHTML = `
      <div>
        <div class="radar-badge-row">
          <span class="radar-badge ${badges[idx].cls}">${badges[idx].text}</span>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-quaternary);">Velocity #${idx+1}</span>
        </div>
        <a href="https://github.com/${r.repo}" target="_blank" rel="noopener" class="radar-repo-name">${r.repo}</a>
        <p class="radar-desc">${r.description || 'No description provided.'}</p>
      </div>
      <div class="radar-footer">
        <div style="display: flex; flex-direction: column;">
          <span class="radar-growth">+${(r.star_1d || 0).toLocaleString()} stars today</span>
          <span style="font-size: 0.75rem; color: var(--text-quaternary); font-family: var(--font-mono);">${(r.stars || 0).toLocaleString()} total</span>
        </div>
        <a href="${railwayRef}" target="_blank" rel="noopener sponsored" class="btn-deploy-action btn-deploy-railway">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          <span>Deploy</span>
        </a>
      </div>
    `;
    radarGrid.appendChild(card);
  });

  staggerReveal('.radar-card', 120);
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetTab = btn.getAttribute('data-tab');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      if (targetTab === 'categories' && !chartsInitialized) {
        renderCategoryCharts();
        chartsInitialized = true;
      }
      if (targetTab === 'countries' && !window.countryChartRendered) {
        renderCountriesChart();
        window.countryChartRendered = true;
      }
    });
  });
}

// ── REPOS TAB ──
function getHardwareSpec(r) {
  const text = ((r.repo || '') + ' ' + (r.description || '')).toLowerCase();
  if (text.includes('vllm') || text.includes('70b') || text.includes('deepseek')) return '8× H100 / 80GB';
  if (text.includes('diffusion') || text.includes('comfyui') || text.includes('flux')) return '1× RTX 4090 / 24GB';
  if (text.includes('ollama') || text.includes('inference') || text.includes('audio') || text.includes('voice')) return '1× A10G / 16GB';
  if (text.includes('bot') || text.includes('agent') || text.includes('browser') || text.includes('rag') || text.includes('crawler')) return '1 vCPU / 2GB RAM';
  return 'Serverless';
}

function initReposTab() {
  const catFilter = document.getElementById('repos-category-filter');
  const subcatFilter = document.getElementById('repos-subcat-filter');

  const categories = new Set();
  const subcats = new Set();
  reposData.forEach(r => {
    if (r.category) categories.add(r.category);
    if (r.subcat) subcats.add(r.subcat);
  });

  Array.from(categories).sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    catFilter.appendChild(opt);
  });

  Array.from(subcats).sort().forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub; opt.textContent = sub;
    subcatFilter.appendChild(opt);
  });

  document.getElementById('repos-search').addEventListener('input', () => { reposPage = 1; applyReposFilter(); });
  catFilter.addEventListener('change', () => { reposPage = 1; applyReposFilter(); });
  subcatFilter.addEventListener('change', () => { reposPage = 1; applyReposFilter(); });

  document.getElementById('repos-sort-filter').addEventListener('change', (e) => {
    const parts = e.target.value.split('_');
    reposSort.desc = parts.pop() === 'desc';
    reposSort.col = parts.join('_');
    applyReposFilter();
  });

  document.getElementById('repos-page-size').addEventListener('change', (e) => {
    reposPageSize = parseInt(e.target.value, 10);
    reposPage = 1;
    renderReposTable();
  });

  document.getElementById('repos-prev-btn').addEventListener('click', () => {
    if (reposPage > 1) { reposPage--; renderReposTable(); }
  });

  document.getElementById('repos-next-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(reposFiltered.length / reposPageSize);
    if (reposPage < totalPages) { reposPage++; renderReposTable(); }
  });

  applyReposFilter();
}

function applyReposFilter() {
  const q = document.getElementById('repos-search').value.toLowerCase().trim();
  const cat = document.getElementById('repos-category-filter').value;
  const subcat = document.getElementById('repos-subcat-filter').value;

  reposFiltered = reposData.filter(r => {
    const textMatch = !q || r.repo.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q));
    const catMatch = !cat || r.category === cat;
    const subMatch = !subcat || r.subcat === subcat;
    return textMatch && catMatch && subMatch;
  });

  reposFiltered.sort((a, b) => {
    let valA = a[reposSort.col] ?? 0;
    let valB = b[reposSort.col] ?? 0;
    return reposSort.desc ? valB - valA : valA - valB;
  });

  renderReposTable();
}

function renderReposTable() {
  const tbody = document.getElementById('repos-tbody');
  tbody.innerHTML = '';

  const totalPages = Math.ceil(reposFiltered.length / reposPageSize) || 1;
  const start = (reposPage - 1) * reposPageSize;
  const slice = reposFiltered.slice(start, start + reposPageSize);

  document.getElementById('repos-page-info').textContent = `Showing ${start + 1}–${Math.min(start + reposPageSize, reposFiltered.length)} of ${reposFiltered.length} repos`;
  document.getElementById('repos-prev-btn').disabled = reposPage === 1;
  document.getElementById('repos-next-btn').disabled = reposPage >= totalPages;

  const railwayRef = affiliates.cloud_deploy?.railway?.url_template || "https://railway.com?referralCode=Ks00DU";
  const runpodRef = affiliates.cloud_deploy?.runpod?.url_template || "https://runpod.io";

  slice.forEach((r, idx) => {
    const tr = document.createElement('tr');
    const rank = start + idx + 1;
    const isGpu = r.deploy_type === 'gpu';
    const deployUrl = isGpu ? runpodRef : railwayRef;
    const deployLabel = isGpu ? 'GPU' : 'Cloud';
    const hwSpec = getHardwareSpec(r);

    tr.innerHTML = `
      <td class="rank-text">${rank}</td>
      <td>
        <div class="repo-block">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <a href="https://github.com/${r.repo}" target="_blank" rel="noopener" class="repo-name-link">${r.repo}</a>
            <span class="badge-tag">${r.language || 'Code'}</span>
            <span class="badge-tag" style="color: var(--brand-green); border-color: rgba(34,197,94,0.2);">${r.category || 'AI'}</span>
          </div>
          <span class="repo-desc">${r.description || 'No description provided.'}</span>
        </div>
      </td>
      <td>
        <span class="hw-spec-pill">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>
          <span>${hwSpec}</span>
        </span>
      </td>
      <td style="font-family: var(--font-mono); font-weight: 500; color: var(--text-primary);">${(r.stars || 0).toLocaleString()}</td>
      <td><span class="pill-growth-green">+${(r.star_1d || 0).toLocaleString()}</span></td>
      <td><span class="pill-growth-sky">+${(r.star_7d || 0).toLocaleString()}</span></td>
      <td>
        <div class="deploy-actions">
          <a href="${deployUrl}" target="_blank" rel="noopener sponsored" class="btn-deploy-action ${!isGpu ? 'btn-deploy-railway' : ''}" title="Deploy on ${isGpu ? 'RunPod GPU' : 'Railway Cloud'}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span>${deployLabel}</span>
          </a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  staggerReveal('.table-linear tbody tr:not(.revealed)', 30);
}

// ── DEVS TAB ──
function initDevsTab() {
  const countryFilter = document.getElementById('devs-country-filter');
  const countries = new Set();
  devsData.forEach(d => { if (d.Country) countries.add(d.Country); });

  Array.from(countries).sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    countryFilter.appendChild(opt);
  });

  document.getElementById('devs-search').addEventListener('input', () => { devsPage = 1; applyDevsFilter(); });
  countryFilter.addEventListener('change', () => { devsPage = 1; applyDevsFilter(); });

  document.getElementById('devs-sort-filter').addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'weighted_desc') devsSort.col = 'Weighted contributions';
    else if (mode === 'contributions_desc') devsSort.col = 'Contributions';
    else if (mode === 'repos_desc') devsSort.col = 'Repos';
    applyDevsFilter();
  });

  document.getElementById('devs-prev-btn').addEventListener('click', () => {
    if (devsPage > 1) { devsPage--; renderDevsTable(); }
  });

  document.getElementById('devs-next-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(devsFiltered.length / devsPageSize);
    if (devsPage < totalPages) { devsPage++; renderDevsTable(); }
  });

  applyDevsFilter();
}

function applyDevsFilter() {
  const q = document.getElementById('devs-search').value.toLowerCase().trim();
  const c = document.getElementById('devs-country-filter').value;

  devsFiltered = devsData.filter(d => {
    const user = (d.User || '').toLowerCase();
    const name = (d.Name || '').toLowerCase();
    const top = (d['Top repos'] || '').toLowerCase();
    const matchText = !q || user.includes(q) || name.includes(q) || top.includes(q);
    const matchCountry = !c || d.Country === c;
    return matchText && matchCountry;
  });

  devsFiltered.sort((a, b) => (b[devsSort.col] ?? 0) - (a[devsSort.col] ?? 0));
  renderDevsTable();
}

function renderDevsTable() {
  const tbody = document.getElementById('devs-tbody');
  tbody.innerHTML = '';

  const totalPages = Math.ceil(devsFiltered.length / devsPageSize) || 1;
  const start = (devsPage - 1) * devsPageSize;
  const slice = devsFiltered.slice(start, start + devsPageSize);

  document.getElementById('devs-page-info').textContent = `Showing ${start + 1}–${Math.min(start + devsPageSize, devsFiltered.length)} of ${devsFiltered.length} developers`;
  document.getElementById('devs-prev-btn').disabled = devsPage === 1;
  document.getElementById('devs-next-btn').disabled = devsPage >= totalPages;

  slice.forEach((d, idx) => {
    const tr = document.createElement('tr');
    const rank = start + idx + 1;

    tr.innerHTML = `
      <td class="rank-text">${rank}</td>
      <td style="font-size: 0.8rem; color: var(--text-tertiary);">${d.Country || '—'}</td>
      <td>
        <div style="display: flex; flex-direction: column;">
          <a href="https://github.com/${d.User}" target="_blank" rel="noopener" class="repo-name-link">${d.User}</a>
          <span style="font-size: 0.775rem; color: var(--text-tertiary);">${d.Name || ''}</span>
        </div>
      </td>
      <td style="font-family: var(--font-mono);">${d.Repos || 0}</td>
      <td style="font-family: var(--font-mono); color: var(--text-primary);">${(d.Contributions || 0).toLocaleString()}</td>
      <td style="font-family: var(--font-mono); color: var(--brand-green); font-weight: 600;">${(d['Weighted contributions'] || 0).toLocaleString()}</td>
      <td style="font-size: 0.8rem; color: var(--text-tertiary); max-width: 420px; white-space: normal;">
        ${d['Top repos'] || '—'}
      </td>
    `;
    tbody.appendChild(tr);
  });

  staggerReveal('#devs-tbody tr:not(.revealed)', 30);
}

// ── CATEGORIES TAB (CHART.JS) ──
function renderCategoryCharts() {
  if (!categoryStats || !categoryStats.months) return;

  const months = categoryStats.months.slice(-60);
  const categories = categoryStats.categories || [];

  const colors = ['#22C55E', '#38bdf8', '#f59e0b', '#ec4899', '#7170ff'];
  const dashes = [[], [8, 4], [2, 4], [12, 4, 2, 4], [6, 2]];

  const repoDatasets = categories.map((cat, i) => ({
    label: cat,
    data: (categoryStats.cumulative_repos[cat] || []).slice(-60),
    borderColor: colors[i % colors.length],
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderDash: dashes[i % dashes.length],
    tension: 0.3,
    pointRadius: 0
  }));

  const ctxRepos = document.getElementById('chart-repos-time').getContext('2d');
  new Chart(ctxRepos, {
    type: 'line',
    data: { labels: months, datasets: repoDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8a8f98', font: { family: 'IBM Plex Sans' }, usePointStyle: true, pointStyle: 'line' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#62666d', font: { family: 'IBM Plex Sans' } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#62666d', font: { family: 'IBM Plex Sans' } } }
      }
    }
  });

  const starDatasets = categories.map((cat, i) => ({
    label: cat,
    data: (categoryStats.cumulative_stars[cat] || []).slice(-60),
    borderColor: colors[i % colors.length],
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderDash: dashes[i % dashes.length],
    tension: 0.3,
    pointRadius: 0
  }));

  const ctxStars = document.getElementById('chart-stars-time').getContext('2d');
  new Chart(ctxStars, {
    type: 'line',
    data: { labels: months, datasets: starDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8a8f98', font: { family: 'IBM Plex Sans' }, usePointStyle: true, pointStyle: 'line' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#62666d', font: { family: 'IBM Plex Sans' } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#62666d', font: { family: 'IBM Plex Sans' } } }
      }
    }
  });
}

// ── COUNTRIES TAB ──
function initCountriesTab() {
  if (!locationStats || !locationStats.countries) return;

  const tbody = document.getElementById('countries-tbody');
  tbody.innerHTML = '';

  const countryEntries = Object.entries(locationStats.countries).map(([name, data]) => ({
    name,
    repos: data.total_repos || 0,
    stars: data.total_stars || 0,
    devs: data.total_devs || 0,
    contributions: data.total_contributions || 0
  }));

  countryEntries.sort((a, b) => b.stars - a.stars);

  countryEntries.forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-text">#${idx + 1}</td>
      <td style="font-weight: 600; color: var(--text-primary);">${c.name}</td>
      <td style="font-family: var(--font-mono);">${c.repos.toLocaleString()}</td>
      <td style="font-family: var(--font-mono); color: var(--brand-green); font-weight: 600;">${c.stars.toLocaleString()}</td>
      <td style="font-family: var(--font-mono);">${c.devs.toLocaleString()}</td>
      <td style="font-family: var(--font-mono); color: var(--status-emerald);">${c.contributions.toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCountriesChart() {
  if (!locationStats || !locationStats.countries) return;

  const top10 = Object.entries(locationStats.countries)
    .map(([name, data]) => ({ name, stars: data.total_stars || 0 }))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 10);

  const ctx = document.getElementById('chart-countries-bar').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(c => c.name),
      datasets: [{
        label: 'Total Stars',
        data: top10.map(c => c.stars),
        backgroundColor: 'rgba(34, 197, 94, 0.35)',
        borderColor: '#22C55E',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8a8f98', font: { family: 'IBM Plex Sans' } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8a8f98', font: { family: 'IBM Plex Sans' } } }
      }
    }
  });
}

// ── Back to Top ──
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
}

document.addEventListener('DOMContentLoaded', init);
