// ---------- Navigation ----------
document.querySelectorAll('.navlink').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.navlink').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    const tab = el.dataset.tab;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
  });
});

// ---------- Branding (live preview + storage) ----------
const Brand = {
  get name(){ return localStorage.getItem('brandName') || 'Company'; },
  set name(v){ localStorage.setItem('brandName', v || 'Company'); },
  get primary(){ return localStorage.getItem('brandPrimary') || '#0f65b8'; },
  set primary(v){ localStorage.setItem('brandPrimary', v || '#0f65b8'); },
  get secondary(){ return localStorage.getItem('brandSecondary') || '#66e0a3'; },
  set secondary(v){ localStorage.setItem('brandSecondary', v || '#66e0a3'); },
  get logo(){ return localStorage.getItem('brandLogo') || ''; },
  set logo(dataURL){ if (dataURL) localStorage.setItem('brandLogo', dataURL); else localStorage.removeItem('brandLogo'); }
};
const brandNameEl = document.getElementById('brandName');
const brandPrimaryEl = document.getElementById('brandPrimary');
const brandSecondaryEl = document.getElementById('brandSecondary');
const brandLogoEl = document.getElementById('brandLogo');
const brandMsg = document.getElementById('brandMsg');
const prevName = document.getElementById('prevName');
const prevLogo = document.getElementById('prevLogo');
const sw1 = document.getElementById('sw1');
const sw2 = document.getElementById('sw2');

function refreshBrandUI(){
  brandNameEl.value = Brand.name;
  brandPrimaryEl.value = Brand.primary;
  brandSecondaryEl.value = Brand.secondary;
  prevName.textContent = Brand.name;
  prevName.style.color = Brand.primary;
  sw1.style.background = Brand.primary;
  sw2.style.background = Brand.secondary;
  if (Brand.logo) { prevLogo.style.backgroundImage = `url(${Brand.logo})`; prevLogo.textContent = ''; }
  else { prevLogo.style.backgroundImage = 'none'; prevLogo.textContent = 'LOGO'; }
}
refreshBrandUI();

brandNameEl.addEventListener('input', ()=>{ Brand.name = brandNameEl.value.trim() || 'Company'; refreshBrandUI(); });
brandPrimaryEl.addEventListener('input', ()=>{ Brand.primary = brandPrimaryEl.value; refreshBrandUI(); });
brandSecondaryEl.addEventListener('input', ()=>{ Brand.secondary = brandSecondaryEl.value; refreshBrandUI(); });
brandLogoEl.addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader(); rd.onload = ev => { Brand.logo = ev.target.result; refreshBrandUI(); };
  rd.readAsDataURL(f);
});
document.getElementById('saveBrand').addEventListener('click', ()=>{ brandMsg.textContent = 'Brand saved.'; });
document.getElementById('resetBrand').addEventListener('click', ()=>{
  localStorage.removeItem('brandName'); localStorage.removeItem('brandPrimary'); localStorage.removeItem('brandSecondary'); localStorage.removeItem('brandLogo');
  refreshBrandUI(); brandMsg.textContent = 'Brand reset.';
});

// ---------- AI settings ----------
const AI = {
  get url(){ return localStorage.getItem('proxyUrl') || ''; },
  set url(v){ localStorage.setItem('proxyUrl', v || ''); },
  get token(){ return localStorage.getItem('proxyToken') || ''; },
  set token(v){ localStorage.setItem('proxyToken', v || ''); },
  get model(){ return localStorage.getItem('model') || 'gpt-4o-mini'; },
  set model(v){ localStorage.setItem('model', v || 'gpt-4o-mini'); }
};
const proxyUrlEl = document.getElementById('proxyUrl');
const proxyTokenEl = document.getElementById('proxyToken');
const modelEl = document.getElementById('model');
const aiMsg = document.getElementById('aiMsg');
proxyUrlEl.value = AI.url; proxyTokenEl.value = AI.token; modelEl.value = AI.model;

document.getElementById('saveAI').addEventListener('click', ()=>{
  AI.url = proxyUrlEl.value.trim(); AI.token = proxyTokenEl.value.trim(); AI.model = modelEl.value; aiMsg.textContent = 'Saved.';
});
document.getElementById('testAI').addEventListener('click', async ()=>{
  aiMsg.textContent = 'Testing…';
  try {
    const txt = await callAI([{role:'user', content:'Reply only: pong'}]);
    aiMsg.textContent = (txt||'').trim().toLowerCase()==='pong' ? '✅ Proxy working' : '⚠️ Unexpected reply';
  } catch(e){ aiMsg.textContent = '❌ ' + (e.message || e); }
});

async function callAI(messages){
  if (!AI.url) throw new Error('Proxy URL not set');
  const res = await fetch(AI.url, { method:'POST', headers:{'Content-Type':'application/json', ...(AI.token?{'Authorization':'Bearer '+AI.token}:{})}, body:JSON.stringify({ model: AI.model, messages }) });
  if (!res.ok) throw new Error('HTTP '+res.status);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || data.content || JSON.stringify(data);
}

// ---------- Helpers ----------
async function extractTxt(file){ return await file.text(); }
async function extractPdf(file){
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = '';
  for (let i=1; i<=pdf.numPages; i++){ const page = await pdf.getPage(i); const t = await page.getTextContent(); out += t.items.map(it=>it.str).join(' ') + '\\n'; }
  return out;
}
async function extractDocx(file){
  const ab = await file.arrayBuffer();
  const res = await window.mammoth.extractRawText({ arrayBuffer: ab });
  return res.value || '';
}
function renderTableFromCSV(csv){
  const rows = Papa.parse(csv.trim()).data;
  const table = document.getElementById('sheetTable');
  table.innerHTML = '';
  if (!rows.length) return;
  const thead = document.createElement('thead'); const thr = document.createElement('tr');
  rows[0].forEach(h => { const th = document.createElement('th'); th.textContent = h; thr.appendChild(th); });
  thead.appendChild(thr); table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.slice(1,201).forEach(r => {
    const tr = document.createElement('tr');
    r.forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  document.getElementById('sheetPreview').style.display='';
}

// ---------- Spreadsheet: AI-only clean + insights ----------
let lastCleanCSV = '';
document.getElementById('runSheetAI').addEventListener('click', async ()=>{
  const f = document.getElementById('sheetFile').files[0];
  const status = document.getElementById('sheetStatus');
  const insightsBox = document.getElementById('sheetInsights');
  const recsList = document.getElementById('sheetRecs');
  insightsBox.textContent = '—'; recsList.innerHTML = '';
  status.textContent = 'Reading file…';

  if (!f){ status.textContent='Please choose a CSV/XLSX file.'; return; }

  // Read file → CSV string
  let rawCsv='';
  try{
    if (/\.(xlsx|xls)$/i.test(f.name)) {
      const ab = await f.arrayBuffer(); const wb = XLSX.read(new Uint8Array(ab), {type:'array'});
      const sh = wb.Sheets[wb.SheetNames[0]]; rawCsv = XLSX.utils.sheet_to_csv(sh);
    } else {
      await new Promise((resolve,reject)=>{
        Papa.parse(f, { complete: r => { rawCsv = r.data.map(row => row.join(',')).join('\\n'); resolve(); }, error: reject });
      });
    }
  } catch(e){ status.textContent='Failed to read file: '+(e.message||e); return; }

  status.textContent = 'Asking AI to clean & analyze…';
  const prompt = `You are a senior data analyst.
You will receive a CSV table. Clean it and return results as JSON only.
Rules:
- Standardize header casing (Title Case), trim whitespace, normalize dates to YYYY-MM-DD.
- Remove exact duplicate rows.
- Fill obviously missing numeric fields with 0. Leave ambiguous text blanks as "".
- Do NOT invent columns.
Return JSON ONLY with:
{
  "cleaned_csv": "CSV string",
  "insights": ["5-7 concise bullets"],
  "recommendations": ["3-5 actionable bullets"]
}
CSV:
---
${rawCsv}
---`;

  try{
    const out = await callAI([{role:'user', content: prompt}]);
    const s = out.indexOf('{'); const e = out.lastIndexOf('}');
    const obj = JSON.parse(out.slice(s, e+1));

    lastCleanCSV = obj.cleaned_csv || '';
    if (lastCleanCSV) {
      renderTableFromCSV(lastCleanCSV);
      // enable downloads
      const dlCSV = document.getElementById('downloadCleanCSV');
      const dlXLSX = document.getElementById('downloadCleanXLSX');
      const dlBrand = document.getElementById('downloadBrandedXLSX');
      dlCSV.disabled = dlXLSX.disabled = dlBrand.disabled = false;
      dlCSV.onclick = () => {
        const blob = new Blob([lastCleanCSV], {type:'text/csv;charset=utf-8'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cleaned.csv'; a.click(); URL.revokeObjectURL(a.href);
      };
      dlXLSX.onclick = () => {
        const rows = Papa.parse(lastCleanCSV).data;
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Cleaned');
        XLSX.writeFile(wb, 'cleaned.xlsx');
      };
      dlBrand.onclick = () => makeBrandedExcel(lastCleanCSV);
    }

    // Render insights/recs
    insightsBox.innerHTML = '<ul>'+ (obj.insights||[]).map(i=>`<li>${i}</li>`).join('') + '</ul>';
    document.getElementById('sheetRecs').innerHTML = (obj.recommendations||[]).map(r=>`<li>${r}</li>`).join('');

    status.textContent = 'Done.';
  } catch(e){
    status.textContent = 'AI error: ' + (e.message || e);
  }
});

async function makeBrandedExcel(cleanCSV){
  const rows = Papa.parse(cleanCSV).data;
  if (!rows.length) return;
  const headers = rows[0]; const data = rows.slice(1);
  const title = `${Brand.name} — Data Report`;
  await XlsxPopulate.fromBlankAsync().then(wb => {
    const sh = wb.sheet(0).name('Presentation');
    const cols = headers.length;
    // Title
    sh.cell('A1').value(title).style({ bold:true, fontSize:18, fontColor: Brand.primary });
    if (cols>1) sh.range(1,1,1,cols).merged(true);
    sh.cell('A2').value('Generated: '+new Date().toISOString().slice(0,10)).style({ italic:true, fontColor: '888888' });
    // Header
    const start=4;
    sh.range(start,1,start,cols).value([headers]).style({ bold:true, fill: Brand.primary, fontColor: 'ffffff' });
    // Data
    sh.range(start+1,1,start+data.length,cols).value(data);
    for (let c=1;c<=cols;c++){ sh.column(c).width(16); }
    for (let r=start+1;r<=start+data.length;r++){ if ((r-start)%2===0) sh.range(r,1,r,cols).style({ fill: '#f7f9fc' }); }
    sh.range(start,1,start+data.length,cols).style({ border:true, borderColor:'#e5e7eb' });
    sh.freezePanes(start+1,1); sh.autoFilter(start,1,start,cols);

    // Optional logo in corner
    // (XlsxPopulate images API requires a data URL -> not available here in OSS; we keep title colored instead)

    return wb.outputAsync().then(blob => { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='presentation.xlsx'; a.click(); URL.revokeObjectURL(a.href); });
  });
}

// ---------- Meetings: AI-only with attachments ----------
function hexToRgbInts(hex){ const h=hex.replace('#',''); return {r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16)}; }
async function readAttachments(files){
  let all=''; const names=[];
  for (const f of files){
    let t='';
    if (/\.pdf$/i.test(f.name)) t = await extractPdf(f);
    else if (/\.docx$/i.test(f.name)) t = await extractDocx(f);
    else if (/\.txt$/i.test(f.name)) t = await extractTxt(f);
    if (t){ all += `\n\n--- ${f.name} ---\n${t}`; names.push(f.name); }
  }
  document.getElementById('attachStatus').textContent = names.length? `Attached: ${names.join(', ')}` : 'No readable attachments.';
  return all;
}

document.getElementById('runNotesAI').addEventListener('click', async ()=>{
  const notes = (document.getElementById('notesText').value || '').trim();
  const files = [...document.getElementById('notesFiles').files];
  const sumBox = document.getElementById('sumBox');
  const list = document.getElementById('actionsList');
  sumBox.textContent = 'Thinking…'; list.innerHTML = '';

  const attachmentsText = files.length ? await readAttachments(files) : '';

  const prompt = `You are an executive assistant.
Summarize the meeting notes and attachments and return JSON ONLY in this structure:
{
  "summary": ["sentence 1", "sentence 2", "sentence 3", "sentence 4", "sentence 5"],
  "actions": [{"owner":"Name or Unassigned","task":"...", "due":"YYYY-MM-DD or "-" }]
}
Guidelines:
- Be concise and professional; avoid filler.
- If owner not specified, use "Unassigned".
- Normalize dates to YYYY-MM-DD if possible, else "-".
Notes and attachments:
---
${notes}

${attachmentsText}
---`;

  try{
    const out = await callAI([{role:'user', content: prompt}]);
    const s = out.indexOf('{'); const e = out.lastIndexOf('}');
    const obj = JSON.parse(out.slice(s, e+1));

    // Render
    sumBox.innerHTML = '<ul>'+ (obj.summary||[]).map(x=>`<li>${x}</li>`).join('') + '</ul>';
    list.innerHTML = (obj.actions||[]).map(a=>`<li><strong>${a.owner}</strong> — ${a.task} <span class="muted">Due: ${a.due||'-'}</span></li>`).join('');

    document.getElementById('downloadPDF').disabled = false;
    document.getElementById('downloadDOCX').disabled = false;

    document.getElementById('downloadDOCX').onclick = () => exportDOCX(obj);
    document.getElementById('downloadPDF').onclick = () => exportPDF(obj);
  } catch(e){
    sumBox.textContent = 'AI error: ' + (e.message || e);
  }
});

// ---------- Exports (black default text) ----------
async function exportPDF(obj){
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612,792]);
  const margin = 56;
  const p = hexToRgbInts(Brand.primary), s = hexToRgbInts(Brand.secondary);
  // Header band
  page.drawRectangle({x:0,y:742,width:612,height:50,color:rgb(p.r/255,p.g/255,p.b/255)});
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // Logo
  if (Brand.logo){
    const bytes = dataURLToBytes(Brand.logo);
    const img = Brand.logo.startsWith('data:image/png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const scale = 40 / Math.max(img.width, img.height);
    page.drawImage(img, {x:margin, y:750, width:img.width*scale, height:img.height*scale});
  }
  // Title
  page.drawText(`${Brand.name} — Meeting Summary`, {x: Brand.logo? (margin+60): margin, y:760, size:14, color:rgb(1,1,1), font: fontB});
  page.drawText(new Date().toISOString().slice(0,10), {x:500, y:760, size:10, color:rgb(1,1,1), font});

  // Body (black text)
  let y = 710;
  const black = rgb(0,0,0);
  const sec = rgb(s.r/255, s.g/255, s.b/255);
  page.drawText('Summary', {x:margin, y, size:12, color:sec, font: fontB}); y -= 18;
  for (const line of (obj.summary||[])){ y = drawLineWrapped(page, line, font, 11, black, margin, y, 500); }

  y -= 10;
  page.drawText('Action Items', {x:margin, y, size:12, color:sec, font: fontB}); y -= 18;
  let i=1; for (const a of (obj.actions||[])){
    y = drawLineWrapped(page, `${i}. ${a.owner} — ${a.task} (Due: ${a.due||'-'})`, font, 11, black, margin, y, 500);
    i++;
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes], {type:'application/pdf'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'meeting_summary.pdf'; a.click(); URL.revokeObjectURL(a.href);
}
function dataURLToBytes(dataURL){
  const parts = dataURL.split(',');
  const bin = atob(parts[1]); const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return bytes;
}
function drawLineWrapped(page, text, font, size, color, x, y, maxWidth){
  const words = (text||'').split(/\s+/); let line='';
  for (const w of words){
    const test = line? line+' '+w : w; const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth){ page.drawText(line, {x,y,size,font,color}); y -= 14; line = w; }
    else line = test;
  }
  if (line){ page.drawText(line, {x,y,size,font,color}); y -= 14; }
  return y;
}

function exportDOCX(obj){
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
  const doc = new Document({ sections:[{ children: [] }] });
  const children = [];
  // Title
  children.push(new Paragraph({ text: `${Brand.name} — Meeting Summary`, heading: HeadingLevel.TITLE }));
  children.push(new Paragraph({ text: new Date().toISOString().slice(0,10) }));
  // Summary
  children.push(new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 }));
  (obj.summary||[]).forEach(line => {
    children.push(new Paragraph({ children:[ new TextRun({ text: "• "+line, color: "000000" }) ] }));
  });
  // Actions
  children.push(new Paragraph({ text: "Action Items", heading: HeadingLevel.HEADING_2 }));
  (obj.actions||[]).forEach((a, idx) => {
    children.push(new Paragraph({ children:[ new TextRun({ text: `${idx+1}. ${a.owner} — ${a.task} (Due: ${a.due||'-'})`, color: "000000" }) ] }));
  });
  doc.addSection({ children });
  Packer.toBlob(doc).then(blob => { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='meeting_summary.docx'; a.click(); URL.revokeObjectURL(a.href); });
}
