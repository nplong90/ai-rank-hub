// js/app.js - Client-side state & rendering engine

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
  document.getElementById('stat-total-repos').textContent = summary.total_repos?.toLocaleString() || allRepos.length;
  document.getElementById('stat-total-stars').textContent = summary.total_stars ? (summary.total_stars / 1e6).toFixed(1) + 'M' : '-';
  document.getElementById('stat-updated-at').textContent = summary.updated_at ? new Date(summary.updated_at).toLocaleDateString() : 'Today';
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
  document.getElementById('search-input').addEventListener('input', (e) => {
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

  document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages} (${filteredRepos.length} repos)`;
  document.getElementById('prev-page-btn').disabled = currentPage === 1;
  document.getElementById('next-page-btn').disabled = currentPage >= totalPages;

  pageRepos.forEach((repo, idx) => {
    const tr = document.createElement('tr');

    // Rank
    const rank = start + idx + 1;

    // Ref URLs
    const runpodRef = affiliates.cloud_deploy?.runpod?.url_template || "https://runpod.io";
    const railwayRef = affiliates.cloud_deploy?.railway?.url_template || "https://railway.app";
    const openrouterRef = affiliates.api_inference?.openrouter?.url || "https://openrouter.ai";

    tr.innerHTML = `
      <td class="font-mono" style="color: var(--color-muted); font-size: 0.85rem;">#${rank}</td>
      <td>
        <div class="repo-cell">
          <a href="${repo.url}" target="_blank" rel="noopener" class="repo-name">${repo.repo}</a>
          <span class="repo-desc">${repo.description || 'No description provided.'}</span>
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.25rem;">
            <span class="badge badge-cat">${repo.category}</span>
            <span class="badge" style="background: #1e293b; color: #94a3b8;">${repo.language || 'Code'}</span>
          </div>
        </div>
      </td>
      <td class="font-mono" style="font-weight: 600;">${repo.stars.toLocaleString()}</td>
      <td class="font-mono">
        <span class="badge badge-green">+${repo.star_1d.toLocaleString()}</span>
      </td>
      <td class="font-mono">
        <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">+${repo.star_7d.toLocaleString()}</span>
      </td>
      <td>
        <div class="deploy-group">
          ${repo.deploy_type === 'gpu' ? `
            <a href="${runpodRef}" target="_blank" rel="noopener sponsored" class="btn-deploy btn-deploy-runpod" title="1-Click GPU Deploy on RunPod">
              Deploy GPU
            </a>
          ` : `
            <a href="${railwayRef}" target="_blank" rel="noopener sponsored" class="btn-deploy" title="Deploy Server on Railway">
              Deploy
            </a>
          `}
          <a href="${openrouterRef}" target="_blank" rel="noopener sponsored" class="btn-deploy" title="Get API Key for this AI repo">
            API Key
          </a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', init);
