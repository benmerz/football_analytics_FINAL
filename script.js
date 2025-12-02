(function(){
  const KEY = 'project_report_simple_v1';
  const defaultState = {
    title: 'Football Analytics — Project Report',
    content: 'Welcome — use this single document area to describe your project, plans, notes, and progress. Edit freely; changes are autosaved locally.'
  };

  function $(id){return document.getElementById(id)}

  // Debounce helper
  function debounce(fn, wait){let t; return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)}}

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw){
        const state = JSON.parse(raw);
        applyState(state);
        return;
      }
    }catch(e){console.warn('load failed', e)}
    applyState(defaultState);
  }

  function applyState(s){
    if(s.title) $('project-title').innerText = s.title;
    if(s.content) $('content').innerText = s.content;
  }

  function readState(){
    return {
      title: $('project-title').innerText.trim(),
      content: $('content').innerText.trim()
    };
  }

  function save(){
    const state = readState();
    try{ localStorage.setItem(KEY, JSON.stringify(state)); flashSaved(); }catch(e){console.warn('save failed', e)}
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

    // Reset feature removed per request
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

  // init
  load();
  attachListeners();
  window.addEventListener('beforeunload', save);
})();
