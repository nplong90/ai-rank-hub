// js/app.js - Comprehensive GoodAIList Clone with Multi-Tab Navigation & Chart.js

let reposData = [];
let devsData = [];
let summaryData = {};
let categoryStats = null;
let locationStats = null;
let affiliates = {};

// Filter & pagination states
let reposFiltered = [];
let reposPage = 1;
let reposPageSize = 50;
let reposSort = { col: 'star_1d', desc: true };

let devsFiltered = [];
let devsPage = 1;
let devsPageSize = 50;
let devsSort = { col: 'weighted_contributions', desc: true };

let chartsInitialized = false;

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
    initTabs();
    initReposTab();
    initDevsTab();
    initCountriesTab();
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
  document.getElementById('header-stars-count').textContent = formatCompact(summaryData.total_stars || 72000000);
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
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

// -------------------------------------------------------------
// REPOS TAB
// -------------------------------------------------------------
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
    opt.value = cat;
    opt.textContent = cat;
    catFilter.appendChild(opt);
  });

  Array.from(subcats).sort().forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    subcatFilter.appendChild(opt);
  });

  document.getElementById('repos-search').addEventListener('input', () => {
    reposPage = 1;
    applyReposFilter();
  });

  catFilter.addEventListener('change', () => {
    reposPage = 1;
    applyReposFilter();
  });

  subcatFilter.addEventListener('change', () => {
    reposPage = 1;
    applyReposFilter();
  });

  document.getElementById('repos-sort-filter').addEventListener('change', (e) => {
    const [col, order] = e.target.value.split('_');
    reposSort.col = col;
    reposSort.desc = order === 'desc';
    applyReposFilter();
  });

  document.getElementById('repos-page-size').addEventListener('change', (e) => {
    reposPageSize = parseInt(e.target.value, 10);
    reposPage = 1;
    renderReposTable();
  });

  document.getElementById('repos-prev-btn').addEventListener('click', () => {
    if (reposPage > 1) {
      reposPage--;
      renderReposTable();
    }
  });

  document.getElementById('repos-next-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(reposFiltered.length / reposPageSize);
    if (reposPage < totalPages) {
      reposPage++;
      renderReposTable();
    }
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
    const deployLabel = isGpu ? 'Deploy GPU' : 'Deploy';

    tr.innerHTML = `
      <td class="rank-text">${rank}</td>
      <td>
        <div class="repo-block">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <a href="https://github.com/${r.repo}" target="_blank" rel="noopener" class="repo-name-link">${r.repo}</a>
            <span class="badge-tag">${r.language || 'Code'}</span>
          </div>
          <span class="repo-desc">${r.description || 'No description provided.'}</span>
        </div>
      </td>
      <td style="font-family: var(--font-mono); font-weight: 500; color: var(--text-primary);">${(r.stars || 0).toLocaleString()}</td>
      <td><span class="pill-growth-green">+${(r.star_1d || 0).toLocaleString()}</span></td>
      <td><span class="pill-growth-sky">+${(r.star_7d || 0).toLocaleString()}</span></td>
      <td style="font-family: var(--font-mono); color: var(--text-tertiary); font-size: 0.8rem;">${(r.forks || 0).toLocaleString()}</td>
      <td>
        <span class="badge-tag">${r.category || 'AI'}</span>
      </td>
      <td>
        <div class="deploy-actions">
          <a href="${deployUrl}" target="_blank" rel="noopener sponsored" class="btn-deploy-action" title="Deploy on Cloud">
            <span>${deployLabel}</span>
          </a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// DEVS TAB
// -------------------------------------------------------------
function initDevsTab() {
  const countryFilter = document.getElementById('devs-country-filter');
  const countries = new Set();
  devsData.forEach(d => {
    if (d.Country) countries.add(d.Country);
  });

  Array.from(countries).sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    countryFilter.appendChild(opt);
  });

  document.getElementById('devs-search').addEventListener('input', () => {
    devsPage = 1;
    applyDevsFilter();
  });

  countryFilter.addEventListener('change', () => {
    devsPage = 1;
    applyDevsFilter();
  });

  document.getElementById('devs-sort-filter').addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'weighted_desc') devsSort.col = 'Weighted contributions';
    else if (mode === 'contributions_desc') devsSort.col = 'Contributions';
    else if (mode === 'repos_desc') devsSort.col = 'Repos';
    applyDevsFilter();
  });

  document.getElementById('devs-prev-btn').addEventListener('click', () => {
    if (devsPage > 1) {
      devsPage--;
      renderDevsTable();
    }
  });

  document.getElementById('devs-next-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(devsFiltered.length / devsPageSize);
    if (devsPage < totalPages) {
      devsPage++;
      renderDevsTable();
    }
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
      <td style="font-family: var(--font-mono); color: var(--accent-violet); font-weight: 600;">${(d['Weighted contributions'] || 0).toLocaleString()}</td>
      <td style="font-size: 0.8rem; color: var(--text-tertiary); max-width: 400px; white-space: normal;">
        ${d['Top repos'] || '—'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// CATEGORIES TAB (CHART.JS)
// -------------------------------------------------------------
function renderCategoryCharts() {
  if (!categoryStats || !categoryStats.months) return;

  const months = categoryStats.months.slice(-60); // Last 5 years
  const categories = categoryStats.categories || [];

  const colors = [
    '#7170ff',
    '#38bdf8',
    '#10b981',
    '#f59e0b',
    '#ec4899'
  ];

  // Chart 1: Cumulative Repos
  const repoDatasets = categories.map((cat, i) => {
    const fullData = categoryStats.cumulative_repos[cat] || [];
    return {
      label: cat,
      data: fullData.slice(-60),
      borderColor: colors[i % colors.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0
    };
  });

  const ctxRepos = document.getElementById('chart-repos-time').getContext('2d');
  new Chart(ctxRepos, {
    type: 'line',
    data: { labels: months, datasets: repoDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8a8f98', font: { family: 'Inter' } } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#62666d' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#62666d' } }
      }
    }
  });

  // Chart 2: Cumulative Stars
  const starDatasets = categories.map((cat, i) => {
    const fullData = categoryStats.cumulative_stars[cat] || [];
    return {
      label: cat,
      data: fullData.slice(-60),
      borderColor: colors[i % colors.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0
    };
  });

  const ctxStars = document.getElementById('chart-stars-time').getContext('2d');
  new Chart(ctxStars, {
    type: 'line',
    data: { labels: months, datasets: starDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8a8f98', font: { family: 'Inter' } } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#62666d' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#62666d' } }
      }
    }
  });
}

// -------------------------------------------------------------
// COUNTRIES TAB
// -------------------------------------------------------------
function initCountriesTab() {
  if (!locationStats || !locationStats.countries) return;

  const tbody = document.getElementById('countries-tbody');
  tbody.innerHTML = '';

  const countryEntries = Object.entries(locationStats.countries).map(([name, data]) => {
    return {
      name,
      repos: data.total_repos || 0,
      stars: data.total_stars || 0,
      devs: data.total_devs || 0,
      contributions: data.total_contributions || 0
    };
  });

  countryEntries.sort((a, b) => b.stars - a.stars);

  countryEntries.forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-text">#${idx + 1}</td>
      <td style="font-weight: 600; color: var(--text-primary);">${c.name}</td>
      <td style="font-family: var(--font-mono);">${c.repos.toLocaleString()}</td>
      <td style="font-family: var(--font-mono); color: var(--accent-violet); font-weight: 600;">${c.stars.toLocaleString()}</td>
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
        backgroundColor: 'rgba(113, 112, 255, 0.4)',
        borderColor: '#7170ff',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8a8f98' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a8f98' } }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
