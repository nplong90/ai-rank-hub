// js/app.js - Modernized for Linear Dark Aesthetics

let allRepos = [];
let filteredRepos = [];
let affiliates = {};
let summary = {};

let currentPage = 1;
const pageSize = 25;
let currentSort = { col: 'star_1d', desc: true };

async function init() {
  try {
    const [reposRes, summaryRes, affRes] = await Promise.all([
      fetch('data/repos.json'),
      fetch('data/summary.json'),
      fetch('config/affiliates.json')
    ]);

    allRepos = await reposRes.json();
    summary = await summaryRes.json();
    affiliates = await affRes.json();

    renderSummary();
    populateCategories();
    setupEventListeners();
    applyFiltersAndSort();
  } catch (err) {
    console.error("Failed to load initial data:", err);
  }
}

function renderSummary() {
  document.getElementById('stat-total-repos').textContent = (summary.total_repos || allRepos.length).toLocaleString();
  document.getElementById('stat-total-stars').textContent = summary.total_stars ? (summary.total_stars / 1e6).toFixed(1) + 'M' : '-';
  document.getElementById('stat-updated-at').textContent = summary.updated_at ? new Date(summary.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
}

function populateCategories() {
  const catSelect = document.getElementById('category-filter');
  const cats = summary.categories || {};
  Object.keys(cats).sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = `${cat} (${cats[cat]})`;
    catSelect.appendChild(opt);
  });
}

function setupEventListeners() {
  document.getElementById('search-input').addEventListener('input', () => {
    currentPage = 1;
    applyFiltersAndSort();
  });

  document.getElementById('category-filter').addEventListener('change', () => {
    currentPage = 1;
    applyFiltersAndSort();
  });

  document.getElementById('sort-filter').addEventListener('change', (e) => {
    const [col, order] = e.target.value.split('_');
    currentSort.col = col;
    currentSort.desc = order === 'desc';
    applyFiltersAndSort();
  });

  document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  document.getElementById('next-page-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredRepos.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
}

function applyFiltersAndSort() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const selectedCat = document.getElementById('category-filter').value;

  filteredRepos = allRepos.filter(r => {
    const matchSearch = !q || r.repo.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q));
    const matchCat = !selectedCat || r.category === selectedCat;
    return matchSearch && matchCat;
  });

  filteredRepos.sort((a, b) => {
    let valA = a[currentSort.col] ?? 0;
    let valB = b[currentSort.col] ?? 0;
    if (typeof valA === 'string') return currentSort.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    return currentSort.desc ? valB - valA : valA - valB;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('repos-tbody');
  tbody.innerHTML = '';

  const totalPages = Math.ceil(filteredRepos.length / pageSize) || 1;
  const start = (currentPage - 1) * pageSize;
  const pageRepos = filteredRepos.slice(start, start + pageSize);

  document.getElementById('page-info').textContent = `Showing ${start + 1}–${Math.min(start + pageSize, filteredRepos.length)} of ${filteredRepos.length} repositories`;
  document.getElementById('prev-page-btn').disabled = currentPage === 1;
  document.getElementById('next-page-btn').disabled = currentPage >= totalPages;

  pageRepos.forEach((repo, idx) => {
    const tr = document.createElement('tr');
    const rank = start + idx + 1;

    const runpodRef = affiliates.cloud_deploy?.runpod?.url_template || "https://runpod.io";
    const railwayRef = affiliates.cloud_deploy?.railway?.url_template || "https://railway.app";
    const openrouterRef = affiliates.api_inference?.openrouter?.url || "https://openrouter.ai";

    const isGpu = repo.deploy_type === 'gpu';

    tr.innerHTML = `
      <td class="rank-number">${rank < 10 ? '0' + rank : rank}</td>
      <td>
        <div class="repo-block">
          <div class="repo-title-row">
            <a href="${repo.url}" target="_blank" rel="noopener" class="repo-link">${repo.repo}</a>
            <span class="tag-badge">${repo.category}</span>
            <span class="tag-badge" style="color: var(--text-quaternary);">${repo.language || 'Code'}</span>
          </div>
          <p class="repo-summary">${repo.description || 'No description provided.'}</p>
        </div>
      </td>
      <td style="font-family: var(--font-mono); font-weight: 500; color: var(--text-primary);">
        ${repo.stars.toLocaleString()}
      </td>
      <td>
        <span class="metric-pill metric-green">+${repo.star_1d.toLocaleString()}</span>
      </td>
      <td>
        <span class="metric-pill metric-sky">+${repo.star_7d.toLocaleString()}</span>
      </td>
      <td>
        <div class="actions-cell">
          ${isGpu ? `
            <a href="${runpodRef}" target="_blank" rel="noopener sponsored" class="btn-action btn-action-primary" title="Deploy on RunPod GPU">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <span>Deploy GPU</span>
            </a>
          ` : `
            <a href="${railwayRef}" target="_blank" rel="noopener sponsored" class="btn-action" title="Deploy on Railway">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
              <span>Deploy</span>
            </a>
          `}
          <a href="${openrouterRef}" target="_blank" rel="noopener sponsored" class="btn-action" title="OpenRouter API Key">
            <span>API</span>
          </a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', init);
