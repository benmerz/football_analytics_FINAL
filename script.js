// Small helper
function $(id){ return document.getElementById(id); }

// Shared dashboard state
let dashboardRows = [];

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
  const KEY = 'project_report_simple_v2';
  const defaultState = {
    title: 'Football Analytics — Project Report',
    content: '1. Overview\n\n' +
      "This project analyzes the Buffalo Bills' first-round draft picks from 1960 to the present. " +
      'My objective is to display info about which colleges have supplied the most Bills first-rounders, which positions the team has prioritized, how often picks became Hall of Famers, and how draft position has changed over time. The links to the application (Open Application ->) and View in Repository are at the top of this page.\n\n' +
      '2. Web Scraping\n\n' +
      'Data Source:\n' +
      'I scraped the main dataset from the Wikipedia page:\n' +
      'https://en.wikipedia.org/wiki/List_of_Buffalo_Bills_first-round_draft_picks\n\n' +
      'This page was chosen because it contains a single, well-structured table with every Bills first-round pick, including season, overall pick, player, position, college, and notes about trades.\n\n' +
      'Tools Used:\n' +
      '- Python requests for the HTTP GET request.\n' +
      '- BeautifulSoup from bs4 to parse the HTML and walk the draft table.\n\n' +
      'Snippet of the code found in script.py:\n\n' +
      'import requests\n' +
      'from bs4 import BeautifulSoup\n' +
      'import sqlite3\n' +
      'from pathlib import Path\n\n' +
      'def scrape_bills_draft_picks():\n' +
      '    url = "https://en.wikipedia.org/wiki/List_of_Buffalo_Bills_first-round_draft_picks"\n' +
      '    \n' +
      '    # Simple User Agent to identify as a standard browser\n' +
      "    headers = {\n" +
      "        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'\n" +
      '    }\n' +
      '    \n' +
      '    response = requests.get(url, headers=headers)\n' +
      "    soup = BeautifulSoup(response.content, 'html.parser')\n\n" +
      "    # Locate the table (specifically the sortable wikitable)\n" +
      "    table = soup.find('table', {'class': 'wikitable sortable'})\n" +
      "    rows = table.find_all('tr')\n\n" +
      'AI prompt used\n' +
      '"Write a Python function that uses requests and BeautifulSoup to scrape all Buffalo Bills first-round draft picks from this Wikipedia page: https://en.wikipedia.org/wiki/List_of_Buffalo_Bills_first-round_draft_picks. Return a list of dictionaries with the keys: Season, Pick, Player, Position, College, Notes. Use a simple user agent"\n\n' +
      '3. Database\n\n' +
      'After scraping, I stored the cleaned data in a local SQLite database bills_draft.db. The main table is:\n\n' +
      'Table: bills_first_round_picks\n' +
      '- id INTEGER PRIMARY KEY AUTOINCREMENT\n' +
      '- season TEXT\n' +
      '- pick_overall TEXT\n' +
      '- player TEXT\n' +
      '- position TEXT\n' +
      '- college TEXT\n' +
      '- notes TEXT\n\n' +
      'From this table I exported a CSV file used by the web app:\n\n' +
      'File: data.csv\n' +
      'Columns:\n' +
      '- id\n' +
      '- season\n' +
      '- pick_overall\n' +
      '- player\n' +
      '- position\n' +
      '- college\n' +
      '- notes\n' +
      '- hall_of_fame (1 if marked as Hall of Famer, 0 otherwise)\n' +
      '- college_player_count (count of picks from that college)\n' +
      '- position_player_count (count of picks at that position)\n\n' +
      'Sample SQL queries used in analysis:\n\n' +
      "-- Flag Hall of Fame players based on last character by a player's name, since a cross is used by wiki to indicate a hall of famer.\n" +
      'SELECT\n' +
      '*,\n' +
      "CASE WHEN player GLOB '*[^A-Za-z*]' THEN 1 ELSE 0 END AS hall_of_fame\n" +
      'FROM bills_first_round_picks;\n\n' +
      '-- Players by college\n' +
      'SELECT\n' +
      'college,\n' +
      'COUNT(*) AS total_players_from_college\n' +
      'FROM bills_first_round_picks\n' +
      'GROUP BY college\n' +
      'ORDER BY total_players_from_college DESC, college;\n\n' +
      '-- Players by position\n' +
      'SELECT\n' +
      'position,\n' +
      'COUNT(*) AS position_player_count\n' +
      'FROM bills_first_round_picks\n' +
      'GROUP BY position\n' +
      'ORDER BY position_player_count DESC, position;\n\n' +
      '-- All metrics together\n' +
      'SELECT\n' +
      '*,\n' +
      "CASE WHEN player GLOB '*[^A-Za-z*]' THEN 1 ELSE 0 END AS hall_of_fame,\n" +
      'COUNT(*) OVER (PARTITION BY college) AS college_player_count,\n' +
      'COUNT(*) OVER (PARTITION BY position) AS position_player_count\n' +
      'FROM bills_first_round_picks;\n\n' +
      '4. Web Application\n\n' +
      'Application Page (Bills First Round Draft Picks)\n' +
      '- Shows a "Franchise Round 1 Draft Snapshot" with four categories: Hall of Fame Players, Distinct Colleges, Distinct Positions, and Total First-Round Picks\n' +
      '- Displays two interactive tables: Players by College and Players by Position. Clicking a college or position shows the detailed list of Bills first-round picks directly below the table.\n' +
      '- There is a scatter chart with Season on the x-axis and draft pick number (1–32) on the y-axis. Red X markers indicate seasons when the Bills had no first-round pick.\n' +
      'When a season is chosen from the dropdown on the application page, the app navigates to a season detail view.\n' +
      '- That page lists all first-round picks for the chosen year along with their notes and Hall of Fame indicator.\n'
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
        const state = JSON.parse(raw) || {};
        const merged = {
          title: state.title && state.title.trim() ? state.title : defaultState.title,
          content: state.content && state.content.trim() ? state.content : defaultState.content
        };
        applyState(merged);
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

    dashboardRows = rows;

    const stats = computeStats(rows);
    renderKpis(stats);
    renderTable(stats.byCollege, 'table-by-college', 'college');
    renderTable(stats.byPosition, 'table-by-position', 'position');
    renderTimeline(stats.hofPlayers);
    renderPickChart(buildPickSeries(rows));
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

function buildPickSeries(rows){
  const perSeason = new Map();

  for (const row of rows){
    if ((row.player || '').startsWith('Carl Eller')) continue;

    const season = row.season;
    if (!season) continue;

    if (!perSeason.has(season)){
      perSeason.set(season, { season, pick: null, player: null, noPick: false });
    }
    const entry = perSeason.get(season);

    const pickRaw = (row.pick_overall || '').trim();
    if (!pickRaw) continue;

    if (pickRaw.toLowerCase() === 'no pick'){
      if (entry.pick == null){
        entry.noPick = true;
      }
      continue;
    }

    const n = parseInt(pickRaw, 10);
    if (!Number.isNaN(n)){
      if (entry.pick == null || n < entry.pick){
        entry.pick = n;
        entry.player = row.player;
        entry.noPick = false;
      }
    }
  }

  return Array.from(perSeason.values()).sort((a,b)=> Number(a.season) - Number(b.season));
}

function renderPickChart(series){
  const container = document.getElementById('pick-chart');
  if (!container || !series || !series.length) return;

  container.innerHTML = '';

  const width = container.clientWidth || 640;
  const height = container.clientHeight || 260;
  const margin = { top: 20, right: 16, bottom: 28, left: 32 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const seasons = series.map(d => Number(d.season));
  const minSeason = Math.min(...seasons);
  const maxSeason = Math.max(...seasons);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'chart-svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const g = document.createElementNS(svgNS, 'g');
  svg.appendChild(g);

  const xFor = (seasonNum) => {
    if (maxSeason === minSeason) return margin.left + innerW / 2;
    return margin.left + ((seasonNum - minSeason) / (maxSeason - minSeason)) * innerW;
  };
  const yForPick = (pick) => {
    const minPick = 1;
    const maxPick = 32;
    const t = (pick - minPick) / (maxPick - minPick);
    return margin.top + t * innerH;
  };
  const yNoPick = margin.top - 4; // slightly above chart; visually distinct

  const axisX = document.createElementNS(svgNS, 'line');
  axisX.setAttribute('x1', margin.left);
  axisX.setAttribute('y1', margin.top + innerH);
  axisX.setAttribute('x2', margin.left + innerW);
  axisX.setAttribute('y2', margin.top + innerH);
  axisX.setAttribute('class', 'chart-axis');
  g.appendChild(axisX);

  const axisY = document.createElementNS(svgNS, 'line');
  axisY.setAttribute('x1', margin.left);
  axisY.setAttribute('y1', margin.top);
  axisY.setAttribute('x2', margin.left);
  axisY.setAttribute('y2', margin.top + innerH);
  axisY.setAttribute('class', 'chart-axis');
  g.appendChild(axisY);

  [1,8,16,24,32].forEach(pick => {
    const y = yForPick(pick);
    const tick = document.createElementNS(svgNS, 'line');
    tick.setAttribute('x1', margin.left);
    tick.setAttribute('y1', y);
    tick.setAttribute('x2', margin.left + innerW);
    tick.setAttribute('y2', y);
    tick.setAttribute('class', 'chart-tick');
    g.appendChild(tick);

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', margin.left - 6);
    label.setAttribute('y', y + 3);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('font-size', '9');
    label.setAttribute('fill', '#4b5563');
    label.textContent = pick;
    g.appendChild(label);
  });

  const yearStep = Math.max(1, Math.round(series.length / 10));
  series.forEach((d, idx) => {
    const seasonNum = Number(d.season);
    const x = xFor(seasonNum);

    if (idx % yearStep === 0) {
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', margin.top + innerH + 14);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '9');
      label.setAttribute('fill', '#4b5563');
      label.textContent = d.season;
      g.appendChild(label);
    }
  });

  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.display = 'none';
  container.appendChild(tooltip);

  function showTooltip(text, clientX, clientY){
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left + 8;
    const y = clientY - rect.top - 28;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }
  function hideTooltip(){
    tooltip.style.display = 'none';
  }

  series.forEach(d => {
    const seasonNum = Number(d.season);
    const x = xFor(seasonNum);

    if (d.pick != null){
      const y = yForPick(d.pick);
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', 4);
      circle.setAttribute('class', 'chart-point');
      circle.addEventListener('mouseenter', (evt)=>{
        const text = `Season ${d.season} — Pick ${d.pick}${d.player ? ' — ' + d.player : ''}`;
        showTooltip(text, evt.clientX, evt.clientY);
      });
      circle.addEventListener('mouseleave', hideTooltip);
      g.appendChild(circle);
    } else if (d.noPick){
      const group = document.createElementNS(svgNS, 'g');
      const size = 6;
      const line1 = document.createElementNS(svgNS, 'line');
      line1.setAttribute('x1', x - size);
      line1.setAttribute('y1', yNoPick - size);
      line1.setAttribute('x2', x + size);
      line1.setAttribute('y2', yNoPick + size);
      line1.setAttribute('class', 'chart-no-pick');
      const line2 = document.createElementNS(svgNS, 'line');
      line2.setAttribute('x1', x - size);
      line2.setAttribute('y1', yNoPick + size);
      line2.setAttribute('x2', x + size);
      line2.setAttribute('y2', yNoPick - size);
      line2.setAttribute('class', 'chart-no-pick');
      group.appendChild(line1);
      group.appendChild(line2);
      group.addEventListener('mouseenter', (evt)=>{
        const text = `Season ${d.season} — No first‑round pick`;
        showTooltip(text, evt.clientX, evt.clientY);
      });
      group.addEventListener('mouseleave', hideTooltip);
      g.appendChild(group);
    }
  });

  container.appendChild(svg);
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
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => handleDimensionClick(labelKey, row.label));
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
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', () => handleHofClick(p));
    container.appendChild(chip);
  });
}

function handleDimensionClick(type, key){
  if (!dashboardRows || !dashboardRows.length) return;

  const rows = dashboardRows.filter(r => {
    if ((r.player || '').startsWith('Carl Eller')) return false;
    const pickRaw = (r.pick_overall || '').trim();
    if (!pickRaw || pickRaw.toLowerCase() === 'no pick') return false;

    if (type === 'college') return (r.college || '').trim() === key;
    if (type === 'position') return (r.position || '').trim() === key;
    return false;
  });

  if (!rows.length) return;

  renderInlineDetail(type, rows, key);
}

function handleHofClick(playerInfo){
  if (!dashboardRows || !dashboardRows.length) return;

  const rows = dashboardRows.filter(r => {
    if ((r.player || '').startsWith('Carl Eller')) return false;
    const pickRaw = (r.pick_overall || '').trim();
    if (!pickRaw || pickRaw.toLowerCase() === 'no pick') return false;
    const hof = Number(r.hall_of_fame || '0') === 1;
    if (!hof) return false;
    const samePlayer = (r.player || '').trim() === (playerInfo.player || '').trim();
    const sameSeason = (r.season || '').trim() === String(playerInfo.season || '').trim();
    return samePlayer && sameSeason;
  });

  if (!rows.length) return;

  const title = `Hall of Fame — ${playerInfo.player}`;
  const subtitle = `Season ${playerInfo.season} · First‑round pick`;
  renderDetailCard(rows, title, subtitle);
}

function renderInlineDetail(type, rows, key){
  const isCollege = type === 'college';
  const wrapId = isCollege ? 'college-detail' : 'position-detail';
  const subtitleId = isCollege ? 'college-detail-subtitle' : 'position-detail-subtitle';
  const tableSelector = isCollege ? '#college-detail-table tbody' : '#position-detail-table tbody';

  const wrap = document.getElementById(wrapId);
  const subtitleEl = document.getElementById(subtitleId);
  const tbody = document.querySelector(tableSelector);
  if (!wrap || !tbody) return;

  const label = key || '';
  const base = isCollege ? `from ${label}` : `at ${label}`;
  subtitleEl.textContent = `${rows.length} first‑round pick(s) ${base}`;

  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    const hof = Number(row.hall_of_fame || '0') === 1 ? 'Yes' : 'No';

    const cells = isCollege
      ? [row.season, row.pick_overall, row.player, row.position, row.notes, hof]
      : [row.season, row.pick_overall, row.player, row.college, row.notes, hof];

    cells.forEach(text => {
      const td = document.createElement('td');
      td.textContent = text || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  wrap.hidden = false;
}

function renderDetailCard(rows, title, subtitle){
  const card = document.getElementById('detail-card');
  const titleEl = document.getElementById('detail-title');
  const subtitleEl = document.getElementById('detail-subtitle');
  const tbody = document.querySelector('#detail-table tbody');
  const closeBtn = document.getElementById('detail-close');

  if (!card || !tbody) return;

  titleEl.textContent = title;
  subtitleEl.textContent = subtitle || '';

  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    const hof = Number(row.hall_of_fame || '0') === 1 ? 'Yes' : 'No';

    [row.season, row.pick_overall, row.player, row.position, row.college, row.notes, hof].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  card.hidden = false;

  if (closeBtn && !closeBtn._bound){
    closeBtn.addEventListener('click', () => {
      card.hidden = true;
    });
    closeBtn._bound = true;
  }
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
    const filtered = rows.filter(r =>
      r.season === season &&
      (r.pick_overall || '').trim().toLowerCase() !== 'no pick' &&
      !(r.player || '').startsWith('Carl Eller')
    );

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

      [row.pick_overall, row.player, row.position, row.college, row.notes, hof].forEach(text => {
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
