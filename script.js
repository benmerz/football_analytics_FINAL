// Small helper
function $(id){ return document.getElementById(id); }

// Detect which page we are on and initialize the appropriate logic.
document.addEventListener('DOMContentLoaded', () => {
  if ($('project-title') && $('content')) {
    initReportPage();
  }

  if ($('kpi-hof')) {
    initDraftDashboard();
  }

  if (document.getElementById('season-title')) {
    initSeasonPage();
  }
});

// ----------------------
// Landing report page
// ----------------------
function initReportPage(){
  const KEY = 'project_report_simple_v1';
  const defaultState = {
    title: 'Football Analytics — Project Report',
    content: 'Welcome — use this single document area to describe your project, plans, notes, and progress. Edit freely; changes are autosaved locally.'
  };

  // Debounce helper
  function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),wait); }; }

  function applyState(s){
    if(s.title) $('project-title').innerText = s.title;
    if(s.content) $('content').innerText = s.content;
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw){
        const state = JSON.parse(raw);
        applyState(state);
        return;
      }
    }catch(e){ console.warn('load failed', e); }
    applyState(defaultState);
  }

  function readState(){
    return {
      title: $('project-title').innerText.trim(),
      content: $('content').innerText.trim()
    };
  }

  function save(){
    const state = readState();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      flashSaved();
    } catch(e){ console.warn('save failed', e); }
  }

  const autosave = debounce(save, 600);

  function attachListeners(){
    $('project-title').addEventListener('input', autosave);
    $('content').addEventListener('input', autosave);

    $('save-btn').addEventListener('click', ()=>{ save(); alert('Saved to browser localStorage.'); });

    $('download-html').addEventListener('click', ()=>{
      const html = buildHtmlPackage();
      downloadBlob(new Blob([html],{type:'text/html'}), 'project-report.html');
    });

    $('export-md').addEventListener('click', ()=>{
      const md = exportMarkdown();
      downloadBlob(new Blob([md],{type:'text/markdown'}), 'project-report.md');
    });

    $('print-btn').addEventListener('click', ()=>window.print());
  }

  function buildHtmlPackage(){
    const s = readState();
    const title = escapeHtml(s.title || 'Project Report');
    const body = escapeHtml(s.content || '');
    return `<!doctype html>\n<html><head><meta charset=\"utf-8\"><title>${title}</title><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>body{font-family:Arial,Helvetica,sans-serif;padding:24px;line-height:1.6;color:#111}h1{color:#0b6efd}</style></head><body>\n<h1>${title}</h1>\n<div>${body.replace(/\n/g,'<br>')}</div>\n</body></html>`;
  }

  function exportMarkdown(){
    const s = readState();
    let md = `# ${s.title}\n\n`;
    md += s.content + '\n';
    return md;
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }

  function flashSaved(){
    const btn = $('save-btn');
    if(!btn) return;
    const prev = btn.innerText;
    btn.innerText = 'Saved';
    setTimeout(()=>btn.innerText = prev, 900);
  }

  function escapeHtml(str){
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');
  }

  load();
  attachListeners();
  window.addEventListener('beforeunload', save);
}

// ----------------------
// Draft dashboard page
// ----------------------
async function initDraftDashboard(){
  try {
    const rows = await loadCsv('data.csv');
    if (!rows || !rows.length) return;

    const stats = computeStats(rows);
    renderKpis(stats);
    renderTable(stats.byCollege, 'table-by-college', 'college');
    renderTable(stats.byPosition, 'table-by-position', 'position');
    renderTimeline(stats.hofPlayers);
    populateSeasonSelect(stats.seasonsSorted);
  } catch (e) {
    console.error('Failed to initialize dashboard', e);
  }
}

function populateSeasonSelect(seasons){
  const select = document.getElementById('season-select');
  if (!select) return;
  seasons.forEach(season => {
    const opt = document.createElement('option');
    opt.value = season;
    opt.textContent = season;
    select.appendChild(opt);
  });

  select.addEventListener('change', e => {
    const val = e.target.value;
    if (!val) return;
    window.location.href = `season.html?season=${encodeURIComponent(val)}`;
  });
}

async function loadCsv(url){
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  return lines.slice(1).map(line => {
    const parts = line.split(',');
    const obj = {};
    header.forEach((h, i) => { obj[h] = parts[i]; });
    return obj;
  });
}

function computeStats(rows){
  let total = 0;
  let hofTotal = 0;
  const byCollege = new Map();
  const byPosition = new Map();
  const collegesSeen = new Set();
  const positionsSeen = new Set();
  const hofPlayers = [];
  const seasonsSet = new Set();

  for (const row of rows){
    if ((row.player || '').startsWith('Carl Eller')) {
      continue;
    }

    const pickOverall = (row.pick_overall || '').trim();
    const isRealPick = pickOverall && pickOverall.toLowerCase() !== 'no pick';

    if (isRealPick) {
      total++;
    }

    const hof = Number(row.hall_of_fame || '0');
    if (hof === 1 && isRealPick){
      hofTotal++;
      hofPlayers.push({ season: row.season, player: row.player });
    }

    const college = (row.college || '').trim();
    if (college) {
      collegesSeen.add(college);
      byCollege.set(college, (byCollege.get(college) || 0) + 1);
    }

    const pos = (row.position || '').trim();
    if (pos) {
      positionsSeen.add(pos);
      byPosition.set(pos, (byPosition.get(pos) || 0) + 1);
    }

    if (row.season) {
      seasonsSet.add(row.season);
    }
  }

  // Convert maps to sorted arrays
  const sortDesc = (a, b) => b.count - a.count || a.label.localeCompare(b.label);

  const byCollegeArr = Array.from(byCollege.entries()).map(([label, count]) => ({label, count})).sort(sortDesc);
  const byPositionArr = Array.from(byPosition.entries()).map(([label, count]) => ({label, count})).sort(sortDesc);

  // Sort timeline by season ascending numeric where possible
  hofPlayers.sort((a,b)=> Number(a.season) - Number(b.season));

  const seasonsSorted = Array.from(seasonsSet).sort((a,b)=> Number(a) - Number(b));

  return {
    total,
    hofTotal,
    distinctColleges: collegesSeen.size,
    distinctPositions: positionsSeen.size,
    byCollege: byCollegeArr,
    byPosition: byPositionArr,
    hofPlayers,
    seasonsSorted
  };
}

function renderKpis(stats){
  const fmt = (n) => n.toLocaleString();
  $('kpi-hof').innerText = fmt(stats.hofTotal);
  $('kpi-total').innerText = fmt(stats.total);
  $('kpi-colleges').innerText = fmt(stats.distinctColleges);
  $('kpi-positions').innerText = fmt(stats.distinctPositions);
}

function renderTable(items, tableId, labelKey){
  const table = document.getElementById(tableId);
  if (!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';

  items.forEach(row => {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    const tdCount = document.createElement('td');
    tdLabel.textContent = row.label;
    tdCount.textContent = row.count;
    tr.appendChild(tdLabel);
    tr.appendChild(tdCount);
    tbody.appendChild(tr);
  });
}

function renderTimeline(hofPlayers){
  const container = $('hof-timeline');
  if (!container) return;
  container.innerHTML = '';

  hofPlayers.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span class="chip-year">${p.season}</span><span class="chip-name">${p.player}</span>`;
    container.appendChild(chip);
  });
}

async function initSeasonPage(){
  const params = new URLSearchParams(window.location.search);
  const season = params.get('season');
  const titleEl = document.getElementById('season-title');
  const subtitleEl = document.getElementById('season-subtitle');
  const summaryEl = document.getElementById('season-summary');
  const tableBody = document.querySelector('#season-table tbody');

  if (season && titleEl) {
    titleEl.textContent = `Bills First Round Draft Picks — ${season}`;
  }
  if (season && subtitleEl) {
    subtitleEl.textContent = `Season ${season} Round 1 Picks`;
  }

  try {
    const rows = await loadCsv('data.csv');
    const filtered = rows.filter(r => r.season === season && (r.pick_overall || '').trim().toLowerCase() !== 'no pick');

    if (summaryEl) {
      if (!season) {
        summaryEl.textContent = 'No season selected.';
      } else if (!filtered.length) {
        summaryEl.textContent = `No first‑round picks recorded for season ${season}.`;
      } else {
        summaryEl.textContent = `Showing ${filtered.length} first‑round pick(s) for season ${season}.`;
      }
    }

    if (!tableBody) return;
    tableBody.innerHTML = '';

    filtered.forEach(row => {
      const tr = document.createElement('tr');
      const hof = Number(row.hall_of_fame || '0') === 1 ? 'Yes' : 'No';

      [row.pick_overall, row.player, row.position, row.college, hof].forEach(text => {
        const td = document.createElement('td');
        td.textContent = text || '';
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    });
  } catch (e) {
    if (summaryEl) summaryEl.textContent = 'Error loading season data.';
    console.error('Failed to initialize season page', e);
  }
}
