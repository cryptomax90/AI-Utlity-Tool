// Tab logic
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(s => s.style.display = 'none');
    document.getElementById(tab).style.display = '';
  });
});

// AI settings localStorage
const aiCfg = {
  get url() { return localStorage.getItem('proxyUrl') || ''; },
  set url(v) { localStorage.setItem('proxyUrl', v || ''); },
  get token() { return localStorage.getItem('proxyToken') || ''; },
  set token(v) { localStorage.setItem('proxyToken', v || ''); },
  get model() { return localStorage.getItem('model') || 'gpt-4o-mini'; },
  set model(v) { localStorage.setItem('model', v || 'gpt-4o-mini'); }
};

const proxyUrlEl = document.getElementById('proxyUrl');
const proxyTokenEl = document.getElementById('proxyToken');
const modelEl = document.getElementById('model');
const aiStatus = document.getElementById('aiStatus');

proxyUrlEl.value = aiCfg.url;
proxyTokenEl.value = aiCfg.token;
modelEl.value = aiCfg.model;

document.getElementById('saveAiSettings').addEventListener('click', () => {
  aiCfg.url = proxyUrlEl.value.trim();
  aiCfg.token = proxyTokenEl.value.trim();
  aiCfg.model = modelEl.value;
  aiStatus.textContent = 'Saved.';
});

document.getElementById('testAi').addEventListener('click', async () => {
  aiStatus.textContent = 'Testing…';
  try {
    const ok = await callAI([{role:'user', content:'Reply with the single word: pong'}], {timeoutMs: 12000});
    aiStatus.innerHTML = ok.trim().toLowerCase().includes('pong') ? '✅ Proxy working.' : '⚠️ Proxy responded but unexpected.';
  } catch (e) {
    aiStatus.innerHTML = '❌ Failed: ' + (e.message || e);
  }
});

async function callAI(messages, {timeoutMs=20000}={}) {
  if (!aiCfg.url) throw new Error('Proxy URL not set.');
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(aiCfg.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(aiCfg.token ? {'Authorization': 'Bearer ' + aiCfg.token} : {})
    },
    body: JSON.stringify({ model: aiCfg.model, messages }),
    signal: controller.signal
  });
  clearTimeout(t);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  // Expect {content: "..."} or raw OpenAI response passthrough
  if (typeof data.content === 'string') return data.content;
  if (data.choices && data.choices[0]?.message?.content) return data.choices[0].message.content;
  return JSON.stringify(data);
}

// -------- Utils (local) --------
const stopwords = new Set(('a,about,after,again,all,also,an,and,any,are,as,at,be,been,before,being,between,both,but,by,can,do,down,for,from,further,had,has,have,having,he,her,here,hers,him,himself,his,how,i,if,in,into,is,it,its,itself,just,more,most,my,myself,no,nor,not,now,of,off,on,once,only,or,other,our,ours,ourselves,out,over,own,same,she,should,so,some,such,than,that,the,their,theirs,them,themselves,then,there,these,they,this,those,through,to,too,under,until,up,very,was,we,were,what,when,where,which,while,who,whom,why,with,you,your,yours,yourself,yourselves').split(','));
const cleanText = t => t.toLowerCase().replace(/[^a-z0-9\s:\-\/]/g, ' ');
const tokenize = t => cleanText(t).split(/\s+/).filter(w => w && !stopwords.has(w));
function saveText(filename, text) {
  const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}
function saveCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => {
    const s = (v ?? '').toString();
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

// Jaro–Winkler
function jaroWinkler(s1='', s2='') {
  if (s1 === s2) return 1;
  const m = Math.floor(Math.max(s1.length, s2.length)/2)-1;
  const mt1 = new Array(s1.length).fill(false);
  const mt2 = new Array(s2.length).fill(false);
  let matches = 0, transpositions = 0;
  for (let i=0;i<s1.length;i++) {
    const start = Math.max(0, i - m), end = Math.min(i + m + 1, s2.length);
    for (let j=start;j<end;j++) {
      if (mt2[j]) continue;
      if (s1[i] === s2[j]) { mt1[i]=true; mt2[j]=true; matches++; break; }
    }
  }
  if (!matches) return 0;
  let k=0;
  for (let i=0;i<s1.length;i++) if (mt1[i]) {
    while (!mt2[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const jaro = (matches/s1.length + matches/s2.length + (matches - transpositions/2)/matches) / 3;
  let prefix = 0; for (let i=0;i<Math.min(4, s1.length, s2.length); i++) { if (s1[i] === s2[i]) prefix++; else break; }
  return jaro + prefix * 0.1 * (1 - jaro);
}
function fuzzyEqualRows(rowA, rowB, keyIdx=[], threshold=0.92) {
  if (!keyIdx.length) return false;
  const sims = keyIdx.map(i => jaroWinkler(String(rowA[i] ?? '').toLowerCase(), String(rowB[i] ?? '').toLowerCase()));
  return sims.every(s => s >= threshold);
}

// -------- Sheets --------
let cleanedRows = [], cleanedHeaders = [], numericColumns = [], numericIdx = [];
let chart;

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, { header: true, skipEmptyLines: true,
      complete: res => resolve(res.data), error: err => reject(err) });
  });
}
function parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type: 'array'});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      resolve(XLSX.utils.sheet_to_json(sheet, {defval: ''}));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
function standardizeHeaders(headers) {
  return headers.map(h => h.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^\w]/g,''));
}
function removeEmptyRows(rows) {
  return rows.filter(r => Object.values(r).some(v => (v ?? '').toString().trim() !== ''));
}
function objectRowsToMatrix(rows) {
  const headers = Object.keys(rows[0] || {});
  const headerStd = standardizeHeaders(headers);
  const matrix = [headerStd];
  for (const r of rows) {
    matrix.push(headerStd.map((h, i) => {
      const key = headers[i]; let v = r[key];
      if (typeof v === 'string') v = v.trim();
      return v;
    }));
  }
  return matrix;
}
function buildPreviewTable(matrix, limit=200) {
  const table = document.getElementById('previewTable');
  table.innerHTML = '';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  matrix[0].forEach(h => { const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
  thead.appendChild(trh);
  const tbody = document.createElement('tbody');
  matrix.slice(1, 1+limit).forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  table.appendChild(thead); table.appendChild(tbody);
  document.getElementById('tableWrap').style.display = '';
}
function computeStats(matrix) {
  const headers = matrix[0]; const rows = matrix.slice(1);
  document.getElementById('statRows').textContent = rows.length.toString();
  document.getElementById('statCols').textContent = headers.length.toString();

  numericColumns = []; numericIdx = [];
  for (let j=0; j<headers.length; j++) {
    const colVals = rows.map(r => r[j]).filter(v => v !== null && v !== undefined && v !== '');
    const numericVals = colVals.map(v => +v).filter(v => !isNaN(v));
    if (numericVals.length && numericVals.length/Math.max(1,colVals.length) > 0.8) {
      numericColumns.push(headers[j]); numericIdx.push(j);
    }
  }
  const sel = document.getElementById('numericColumnSelect'); sel.innerHTML = '<option value="">(none)</option>';
  numericColumns.forEach((name, i) => { const opt = document.createElement('option'); opt.value = String(i); opt.textContent = name; sel.appendChild(opt); });

  const container = document.getElementById('numStats'); container.innerHTML = '';
  numericIdx.forEach((j, idx) => {
    const vals = rows.map(r => +r[j]).filter(v => !isNaN(v));
    if (!vals.length) return;
    const min = Math.min(...vals), max = Math.max(...vals), mean = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
    const unique = new Set(vals.map(v => v.toString())).size;
    const div = document.createElement('div'); div.style.marginTop='8px';
    div.innerHTML = `<div><strong>${numericColumns[idx]}</strong></div><div class="muted">min ${min} • max ${max} • mean ${mean} • unique ${unique}</div>`;
    container.appendChild(div);
  });
}

document.getElementById('processBtn').addEventListener('click', async () => {
  const f = document.getElementById('fileInput').files[0];
  const status = document.getElementById('sheetStatus');
  if (!f) { status.textContent = 'Choose a CSV/XLSX file.'; return; }
  status.textContent = 'Processing…';
  let rowsObj = [];
  try {
    if (/\.(xlsx|xls)$/i.test(f.name)) rowsObj = await parseXLSX(f);
    else rowsObj = await parseCSV(f);
  } catch (e) { status.innerHTML = `<span class="danger">Parse error: ${e.message}</span>`; return; }
  rowsObj = removeEmptyRows(rowsObj);
  const matrix0 = objectRowsToMatrix(rowsObj);
  const headers = matrix0[0];
  const body = matrix0.slice(1).map(r => r.map(v => (typeof v === 'string' ? v.trim() : v)));

  let dedupeKeys = document.getElementById('dedupeCols').value.trim();
  let keyIdx = [];
  if (dedupeKeys) {
    const keys = dedupeKeys.split(',').map(s => s.trim().toLowerCase().replace(/\s+/g,'_'));
    keyIdx = keys.map(k => headers.indexOf(k)).filter(i => i >= 0);
  }
  const fuzzy = document.getElementById('fuzzyToggle').checked;

  const seen = new Set(); const deduped = [];
  for (const row of body) {
    const sig = keyIdx.length ? keyIdx.map(i => (row[i] ?? '').toString().toLowerCase()).join('||') : row.join('||').toLowerCase();
    let isDup = seen.has(sig);
    if (!isDup && fuzzy && keyIdx.length) {
      for (const ex of deduped) { if (fuzzyEqualRows(row, ex, keyIdx, 0.92)) { isDup = true; break; } }
    }
    if (!isDup) { seen.add(sig); deduped.push(row); }
  }

  cleanedHeaders = headers; cleanedRows = deduped;
  buildPreviewTable([headers, ...deduped]); computeStats([headers, ...deduped]);
  status.innerHTML = `<span class="success">Done. Rows: ${deduped.length}, Columns: ${headers.length}</span>`;
  document.getElementById('downloadCleanBtn').disabled = false;
  document.getElementById('downloadSummaryBtn').disabled = false;
  document.getElementById('downloadXLSXBtn').disabled = false;
});

document.getElementById('downloadCleanBtn').addEventListener('click', () => {
  if (!cleanedRows.length) return;
  saveCSV('cleaned.csv', [cleanedHeaders, ...cleanedRows]);
});
document.getElementById('downloadXLSXBtn').addEventListener('click', () => {
  if (!cleanedRows.length) return;
  const aoa = [cleanedHeaders, ...cleanedRows]; const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Cleaned');
  XLSX.writeFile(wb, 'cleaned.xlsx');
});
document.getElementById('downloadSummaryBtn').addEventListener('click', () => {
  if (!cleanedRows.length) return;
  let out = ['Spreadsheet Summary','===================',`Rows: ${cleanedRows.length}`,`Columns: ${cleanedHeaders.length}`];
  saveText('summary.txt', out.join('\n'));
});

document.getElementById('numericColumnSelect').addEventListener('change', (e) => {
  const i = +e.target.value; const ctx = document.getElementById('chartCanvas').getContext('2d');
  if (isNaN(i)) { if (chart) chart.destroy(); return; }
  const j = numericIdx[i]; const label = numericColumns[i];
  const labels = cleanedRows.map((_, idx) => String(idx+1));
  const values = cleanedRows.map(r => +r[j]).filter(v => !isNaN(v));
  if (chart) chart.destroy();
  chart = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{label, data: values}] }, options:{ responsive:true, scales:{ x:{ ticks:{ display:false }}}}});
});

document.getElementById('askAiInsights').addEventListener('click', async () => {
  const box = document.getElementById('aiInsightsBox'); box.textContent = 'Thinking…';
  try {
    if (!cleanedRows.length) { box.textContent = 'Load and process a sheet first.'; return; }
    // send first N rows to AI for summary/insights
    const N = Math.min(40, cleanedRows.length);
    const sample = [cleanedHeaders, ...cleanedRows.slice(0, N)].map(r => r.join('\t')).join('\n');
    const prompt = `You are a data analyst. Given TSV table lines (header first), return 5-8 bullet insights: trends, outliers, counts, and 3 recommended actions. Keep it concise.\n\nTSV:\n${sample}`;
    const answer = await callAI([{role:'user', content: prompt}]);
    box.textContent = answer;
  } catch (e) { box.textContent = 'AI error: ' + (e.message || e); }
});

// -------- Meetings --------
function splitSentences(text) {
  return text.replace(/\n+/g, ' ').split(/(?<=[\.\!\?])\s+/).map(s => s.trim()).filter(Boolean);
}
function sentenceScore(sent, tf) {
  const words = tokenize(sent);
  return words.reduce((sum,w) => sum + (tf[w] || 0), 0) / Math.sqrt(words.length + 1);
}
function summarizeLocal(text, n=5) {
  const sentences = splitSentences(text);
  if (sentences.length <= n) return sentences;
  const tf = {}; sentences.forEach(s => tokenize(s).forEach(w => tf[w] = (tf[w]||0)+1));
  const maxf = Math.max(...Object.values(tf)); Object.keys(tf).forEach(w => tf[w] = tf[w]/maxf);
  const scored = sentences.map((s,i) => ({ i, s, score: sentenceScore(s, tf) }));
  scored.sort((a,b) => b.score - a.score);
  return scored.slice(0, n).sort((a,b) => a.i - b.i).map(x => x.s);
}
function normalizeDue(str) {
  try { const r = chrono.parse(str); if (r && r.length) { const d = r[0].start.date(); return d.toISOString().slice(0,10);} } catch(e){}
  return str;
}
function extractActionsLocal(text) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const actions = [];
  const ownerPat = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b(?=[:\- ]| will| to)\s*/;
  const datePat = /\b(by|on|before|due)\s+([A-Za-z]{3,9}\s?\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|tomorrow|today|next\s+\w+|EOW|EOD)\b/i;
  const imperativePat = /^(please\s+)?(send|create|prepare|review|follow|update|email|schedule|draft|share|compile|confirm|investigate|fix|ship|launch|test|call|meet|analyze|document)\b/i;
  const cuePat = /\b(action|todo|task|follow[-\s]?up|next steps?)\b/i;
  lines.forEach(l => {
    let isAction = imperativePat.test(l) || cuePat.test(l);
    let owner = l.match(ownerPat)?.[1] || null;
    let due = l.match(datePat)?.[0] || null;
    if (!isAction) {
      const sents = splitSentences(l);
      for (const s of sents) {
        if (imperativePat.test(s) || cuePat.test(s)) {
          isAction = true; if (!owner) owner = s.match(ownerPat)?.[1] || null;
          if (!due) due = s.match(datePat)?.[0] || null;
          break;
        }
      }
    }
    if (isAction) actions.push({ text: l.replace(/^\-+\s*/,'').trim(), owner: owner || 'Unassigned', due: due ? normalizeDue(due) : '—' });
  });
  const seen = new Set(); return actions.filter(a => { const sig = a.text.toLowerCase(); if (seen.has(sig)) return false; seen.add(sig); return true; });
}

document.getElementById('summarizeBtn').addEventListener('click', async () => {
  const mode = document.querySelector('input[name="sumMode"]:checked').value;
  const raw = document.getElementById('notesInput').value.trim();
  const n = +document.getElementById('numSentences').value;
  if (!raw) return;
  document.getElementById('summaryBox').textContent = '…';
  document.getElementById('actionsList').innerHTML = '';
  try {
    if (mode === 'local') {
      const sum = summarizeLocal(raw, n); const acts = extractActionsLocal(raw);
      document.getElementById('summaryBox').textContent = sum.join(' ');
      const list = document.getElementById('actionsList');
      acts.forEach(a => { const li = document.createElement('li'); li.innerHTML = `<div>${a.text}</div><div class="muted">Owner: <strong>${a.owner}</strong> • Due: <strong>${a.due}</strong></div>`; list.appendChild(li); });
    } else {
      const prompt = `Summarize the following meeting transcript into ${n} concise sentences. Then list action items as "- [Owner] Task — Due: YYYY-MM-DD (if date mentioned)". If owner not specified, use "Unassigned". If a natural date is given, normalize to ISO.\n\n---\n${raw}\n---`;
      const answer = await callAI([{role:'user', content: prompt}]);
      // Simple render: split into summary and actions based on lines
      const parts = answer.split('\n').filter(Boolean);
      const summaryLines = []; const actions = [];
      for (const line of parts) {
        if (/^\s*[-•]/.test(line)) actions.push(line.replace(/^\s*[-•]\s*/, ''));
        else summaryLines.push(line);
      }
      document.getElementById('summaryBox').textContent = summaryLines.join(' ');
      const list = document.getElementById('actionsList');
      actions.forEach(t => { const li = document.createElement('li'); li.textContent = t; list.appendChild(li); });
    }
    document.getElementById('downloadMeetingBtn').disabled = false;
  } catch (e) {
    document.getElementById('summaryBox').textContent = 'AI error: ' + (e.message || e);
  }
});

document.getElementById('downloadMeetingBtn').addEventListener('click', () => {
  const sum = document.getElementById('summaryBox').textContent || '';
  const lis = [...document.querySelectorAll('#actionsList li')].map(li => li.textContent.trim());
  const out = ['Meeting Summary','==============',sum,'','Action Items','============',...lis.map((t,i)=>`${i+1}. ${t}`)].join('\n');
  saveText('meeting_summary.txt', out);
});

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(console.error); });
}
