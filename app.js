// Tabs
document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  document.querySelectorAll('.tab').forEach(s=>s.style.display='none');
  document.getElementById(b.dataset.tab).style.display='';
}));

// ---------- Branding storage ----------
const brand = {
  get name(){return localStorage.getItem('brandName')||'Company';},
  set name(v){localStorage.setItem('brandName',v||'Company');},
  get primary(){return localStorage.getItem('brandPrimary')||'#0f65b8';},
  set primary(v){localStorage.setItem('brandPrimary',v||'#0f65b8');},
  get secondary(){return localStorage.getItem('brandSecondary')||'#66e0a3';},
  set secondary(v){localStorage.setItem('brandSecondary',v||'#66e0a3');},
  get logo(){return localStorage.getItem('brandLogo')||'';}, // base64 data URL
  set logo(v){if(v) localStorage.setItem('brandLogo',v); else localStorage.removeItem('brandLogo');}
};

// Branding UI
const brandCompany=document.getElementById('brandCompany');
const brandPrimary=document.getElementById('brandPrimary');
const brandSecondary=document.getElementById('brandSecondary');
const brandLogo=document.getElementById('brandLogo');
const brandStatus=document.getElementById('brandStatus');
const prevName=document.getElementById('brandPreviewName');
const prevLogo=document.getElementById('brandPreviewLogo');
const swP=document.getElementById('swPrimary');
const swS=document.getElementById('swSecondary');

function refreshBrandPreview(){
  prevName.textContent=brand.name;
  prevName.style.color=brand.primary;
  swP.style.background=brand.primary; swS.style.background=brand.secondary;
  if(brand.logo){ prevLogo.style.backgroundImage=`url(${brand.logo})`; prevLogo.style.backgroundSize='cover'; prevLogo.textContent=''; }
  else { prevLogo.style.backgroundImage='none'; prevLogo.textContent='LOGO'; }
}
brandCompany.value=brand.name; brandPrimary.value=brand.primary; brandSecondary.value=brand.secondary; refreshBrandPreview();

brandLogo.addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return;
  const rd=new FileReader(); rd.onload=ev=>{ brand.logo=ev.target.result; refreshBrandPreview(); }; rd.readAsDataURL(f);
});
document.getElementById('saveBrand').addEventListener('click', ()=>{
  brand.name=brandCompany.value.trim()||'Company';
  brand.primary=brandPrimary.value; brand.secondary=brandSecondary.value;
  brandStatus.textContent='Saved branding.'; refreshBrandPreview();
});
document.getElementById('resetBrand').addEventListener('click', ()=>{
  localStorage.removeItem('brandName'); localStorage.removeItem('brandPrimary'); localStorage.removeItem('brandSecondary'); localStorage.removeItem('brandLogo');
  brandCompany.value=brand.name; brandPrimary.value=brand.primary; brandSecondary.value=brand.secondary; refreshBrandPreview(); brandStatus.textContent='Reset.';
});

// ---------- AI settings ----------
const aiCfg={
  get url(){return localStorage.getItem('proxyUrl')||'';}, set url(v){localStorage.setItem('proxyUrl',v||'');},
  get token(){return localStorage.getItem('proxyToken')||'';}, set token(v){localStorage.setItem('proxyToken',v||'');},
  get model(){return localStorage.getItem('model')||'gpt-4o-mini';}, set model(v){localStorage.setItem('model',v||'gpt-4o-mini');}
};
const proxyUrlEl=document.getElementById('proxyUrl'), proxyTokenEl=document.getElementById('proxyToken'), modelEl=document.getElementById('model'), aiStatus=document.getElementById('aiStatus');
proxyUrlEl.value=aiCfg.url; proxyTokenEl.value=aiCfg.token; modelEl.value=aiCfg.model;
document.getElementById('saveAiSettings').addEventListener('click',()=>{ aiCfg.url=proxyUrlEl.value.trim(); aiCfg.token=proxyTokenEl.value.trim(); aiCfg.model=modelEl.value; aiStatus.textContent='Saved.'; });
document.getElementById('testAi').addEventListener('click', async ()=>{
  aiStatus.textContent='Testing…';
  try { const txt=await callAI([{role:'user',content:'Respond with: pong'}],{timeoutMs:12000}); aiStatus.textContent=(txt||'').toLowerCase().includes('pong')?'✅ Proxy working':'⚠️ Unexpected reply'; }
  catch(e){ aiStatus.textContent='❌ '+(e.message||e); }
});
async function callAI(messages,{timeoutMs=20000}={}){
  if(!aiCfg.url) throw new Error('Proxy URL not set');
  const controller=new AbortController(); const t=setTimeout(()=>controller.abort(),timeoutMs);
  const res=await fetch(aiCfg.url,{method:'POST',headers:{'Content-Type':'application/json',...(aiCfg.token?{'Authorization':'Bearer '+aiCfg.token}:{})},body:JSON.stringify({model:aiCfg.model,messages}),signal:controller.signal});
  clearTimeout(t); if(!res.ok) throw new Error('HTTP '+res.status); const data=await res.json();
  return data?.choices?.[0]?.message?.content || data.content || JSON.stringify(data);
}

// ---------- Spreadsheet (simplified: clean + branded Excel) ----------
let cleanedHeaders=[], cleanedRows=[];
function standardizeHeaders(hs){return hs.map(h=>h.trim().replace(/\s+/g,' '));}
function removeEmptyRows(rows){return rows.filter(r=>Object.values(r).some(v=>(v??'').toString().trim()!==''));}
function parseCSV(file){return new Promise((res,rej)=>Papa.parse(file,{header:true,skipEmptyLines:true,complete:r=>res(r.data),error:rej}));}
function parseXLSX(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=e=>{const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});const sh=wb.Sheets[wb.SheetNames[0]];res(XLSX.utils.sheet_to_json(sh,{defval:''}));};fr.onerror=rej;fr.readAsArrayBuffer(file);});}
function objectRowsToMatrix(rows){const headers=Object.keys(rows[0]||{});const H=standardizeHeaders(headers);const M=[H];for(const r of rows){M.push(H.map((h,i)=>{const k=headers[i];let v=r[k];if(typeof v==='string') v=v.trim();return v;}));}return M;}
function buildPreviewTable(matrix){const t=document.getElementById('previewTable');t.innerHTML='';const thead=document.createElement('thead');const trh=document.createElement('tr');matrix[0].forEach(h=>{const th=document.createElement('th');th.textContent=h;trh.appendChild(th);});thead.appendChild(trh);const tbody=document.createElement('tbody');matrix.slice(1,1+200).forEach(r=>{const tr=document.createElement('tr');r.forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td);});tbody.appendChild(tr);});t.appendChild(thead);t.appendChild(tbody);document.getElementById('tableWrap').style.display='';}

document.getElementById('processBtn').addEventListener('click', async ()=>{
  const f=document.getElementById('fileInput').files[0]; const st=document.getElementById('sheetStatus');
  if(!f){st.textContent='Choose a CSV/XLSX file.';return;}
  st.textContent='Processing…';
  let rows=[]; try{ rows=/\.(xlsx|xls)$/i.test(f.name)? await parseXLSX(f): await parseCSV(f);}catch(e){st.textContent='Parse error: '+e.message;return;}
  rows=removeEmptyRows(rows); const M=objectRowsToMatrix(rows); cleanedHeaders=M[0]; cleanedRows=M.slice(1);
  buildPreviewTable([cleanedHeaders, ...cleanedRows]); st.textContent='Done. Click “Make Branded Excel”.';
  document.getElementById('makePresentableBtn').disabled=false;
});

document.getElementById('makePresentableBtn').addEventListener('click', async ()=>{
  if(!cleanedRows.length) return;
  const headers=cleanedHeaders, rows=cleanedRows, title=(brand.name||'Report')+' — Data Report';
  await XlsxPopulate.fromBlankAsync().then(wb=>{
    const sh=wb.sheet(0).name('Presentation'); const cols=headers.length;
    sh.cell('A1').value(title).style({bold:true,fontSize:18,fontColor:brand.primary});
    if(cols>1) sh.range(1,1,1,cols).merged(true);
    sh.cell('A2').value('Generated: '+new Date().toISOString().slice(0,10)).style({italic:true,fontColor:'888888'});
    const start=4;
    sh.range(start,1,start,cols).value([headers]).style({bold:true,fill:brand.primary,fontColor:'ffffff'});
    sh.range(start+1,1,start+rows.length,cols).value(rows);
    for(let c=1;c<=cols;c++){ sh.column(c).width(16); }
    for(let r=start+1;r<=start+rows.length;r++){ if((r-start)%2===0) sh.range(r,1,r,cols).style({fill:'#f7f9fc'}); }
    sh.range(start,1,start+rows.length,cols).style({border:true,borderColor:'#e5e7eb'});
    sh.freezePanes(start+1,1); sh.autoFilter(start,1,start,cols);
    return wb.outputAsync().then(blob=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='presentation.xlsx'; a.click(); URL.revokeObjectURL(a.href); });
  });
});

// ---------- Meeting Attachments: PDF/DOCX/TXT ingest ----------
async function readTxt(file){ return await file.text(); }
async function readDocx(file){
  const arrayBuffer = await file.arrayBuffer();
  const res = await window.mammoth.convertToHtml({arrayBuffer});
  const html = res.value || ''; // extract text content lightly
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
async function readPdf(file){
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: buf}).promise;
  let text='';
  for (let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i); const content=await page.getTextContent();
    text += content.items.map(it=>it.str).join(' ') + '\n';
  }
  return text;
}
async function readAttachments(files){
  let all=''; const names=[];
  for (const f of files){
    let t='';
    if (f.name.match(/\.txt$/i)) t=await readTxt(f);
    else if (f.name.match(/\.docx$/i)) t=await readDocx(f);
    else if (f.name.match(/\.pdf$/i)) t=await readPdf(f);
    if (t){ all += `\n\n--- ${f.name} ---\n` + t; names.push(f.name); }
  }
  document.getElementById('attachStatus').textContent = names.length? `Attached: ${names.join(', ')}` : 'No readable attachments.';
  return all;
}

// ---------- Meeting Summarization (local/AI) ----------
function splitSentences(t){ return t.replace(/\n+/g,' ').split(/(?<=[\.\!\?])\s+/).map(s=>s.trim()).filter(Boolean); }
function summarizeLocal(text, n=5){
  const sents = splitSentences(text); if (sents.length<=n) return sents;
  const tf={}; const words=(t)=>t.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
  sents.forEach(s=>words(s).forEach(w=>tf[w]=(tf[w]||0)+1));
  const max=Math.max(...Object.values(tf)); Object.keys(tf).forEach(k=>tf[k]/=max);
  const score=s=>{const ws=words(s); return ws.reduce((a,w)=>a+(tf[w]||0),0)/Math.sqrt(ws.length+1); };
  return sents.map((s,i)=>({i,s,score:score(s)})).sort((a,b)=>b.score-a.score).slice(0,n).sort((a,b)=>a.i-b.i).map(x=>x.s);
}

document.getElementById('summarizeBtn').addEventListener('click', async ()=>{
  const mode=document.querySelector('input[name="sumMode"]:checked').value;
  const baseText=document.getElementById('notesInput').value.trim();
  const files=[...document.getElementById('notesFiles').files];
  const n=+document.getElementById('numSentences').value;
  let combined = baseText;
  if (files.length){ combined += '\n\n' + await readAttachments(files); }

  const sumBox=document.getElementById('summaryBox'); const list=document.getElementById('actionsList');
  sumBox.textContent='…'; list.innerHTML='';

  try {
    if (mode==='local'){
      const summary=summarizeLocal(combined, n); sumBox.textContent=summary.join(' ');
      // simple rule-based actions
      const actions=[]; combined.split(/\n+/).forEach(l=>{ if (/^(please\s+)?(send|create|prepare|review|update|schedule|draft|share|confirm|investigate|fix|ship|launch|test|call|meet|analyze|document)\b/i.test(l)) actions.push(l.trim()); });
      actions.slice(0,10).forEach(t=>{ const li=document.createElement('li'); li.textContent=t; list.appendChild(li); });
    } else {
      const prompt = `You are an operations assistant. Summarize the following notes and attachments into ${n} concise sentences and list action items as bullet points with owners/dates if present.\n---\n${combined}\n---`;
      const resp=await callAI([{role:'user',content:prompt}]);
      const lines=(resp||'').split('\n').filter(Boolean); const actions=[]; const sums=[];
      lines.forEach(l=>{ if (/^\s*[-•]/.test(l)) actions.push(l.replace(/^\s*[-•]\s*/,'')); else sums.push(l); });
      sumBox.textContent=sums.join(' ');
      actions.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; list.appendChild(li); });
    }
    document.getElementById('exportBrandedPdfBtn').disabled=false;
  } catch(e){ sumBox.textContent='Error: '+(e.message||e); }
});

// ---------- Branded PDF export for meeting summary ----------
document.getElementById('exportBrandedPdfBtn').addEventListener('click', async ()=>{
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter
  const primary = hexToRgb(brand.primary), secondary = hexToRgb(brand.secondary);
  const margin=50;
  // Header band
  page.drawRectangle({ x:0, y:742, width:612, height:50, color: rgb(primary.r, primary.g, primary.b) });
  // Logo (optional)
  let xLogo = margin, yLogo = 746;
  if (brand.logo){
    const bytes = dataURLToBytes(brand.logo);
    const img = brand.logo.startsWith('data:image/png') ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    const dims = img.scale(50 / Math.max(img.height, img.width));
    page.drawImage(img, { x: xLogo, y: yLogo, width: dims.width, height: dims.height });
  }
  // Company + Title
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(brand.name + ' — Meeting Summary', { x: margin + 60, y: 760, size: 14, color: rgb(1,1,1), font });
  page.drawText(new Date().toISOString().slice(0,10), { x: 500, y: 760, size: 10, color: rgb(1,1,1) });

  // Body
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const summary = document.getElementById('summaryBox').textContent || '';
  const actions = [...document.querySelectorAll('#actionsList li')].map(li=>li.textContent.trim());
  let y = 700;
  page.drawText('Summary', { x: margin, y, size: 12, font, color: rgb(secondary.r, secondary.g, secondary.b) });
  y -= 16;
  y = drawWrappedText(page, summary, bodyFont, 11, margin, y, 512, 14, rgb(0.93,0.95,0.98));

  y -= 10;
  page.drawText('Action Items', { x: margin, y, size: 12, font, color: rgb(secondary.r, secondary.g, secondary.b) });
  y -= 16;
  actions.forEach((t,i)=>{
    y = drawWrappedText(page, `${i+1}. ${t}`, bodyFont, 11, margin, y, 512, 14, rgb(1,1,1));
  });

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], {type:'application/pdf'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='meeting_summary.pdf'; a.click(); URL.revokeObjectURL(a.href);
});

function hexToRgb(hex){
  const m = hex.replace('#',''); const r=parseInt(m.slice(0,2),16)/255; const g=parseInt(m.slice(2,4),16)/255; const b=parseInt(m.slice(4,6),16)/255;
  return {r,g,b};
}
function dataURLToBytes(dataURL){
  const parts = dataURL.split(',');
  const byteString = atob(parts[1]);
  const bytes = new Uint8Array(byteString.length);
  for (let i=0;i<byteString.length;i++) bytes[i]=byteString.charCodeAt(i);
  return bytes;
}
function drawWrappedText(page, text, font, size, x, y, maxWidth, leading, color){
  const words = text.split(/\s+/);
  let line='';
  for (let i=0;i<words.length;i++){
    const test = line ? line + ' ' + words[i] : words[i];
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth){
      page.drawText(line, { x, y, size, font, color });
      y -= leading;
      line = words[i];
    } else line = test;
  }
  if (line){ page.drawText(line, { x, y, size, font, color }); y -= leading; }
  return y;
}

// ---------- Simple AI insights for sheet ----------
document.getElementById('askAiInsights').addEventListener('click', async ()=>{
  const box=document.getElementById('aiInsightsBox'); box.textContent='Thinking…';
  try{
    if(!cleanedRows.length){ box.textContent='Process a sheet first.'; return; }
    const sample=[cleanedHeaders, ...cleanedRows.slice(0,40)].map(r=>r.join('\\t')).join('\\n');
    const prompt=`Company: ${brand.name}. Use a professional tone.\nProvide 5 concise insights and 3 recommendations.\nTSV:\n${sample}`;
    const out=await callAI([{role:'user',content:prompt}]);
    box.textContent=out;
  }catch(e){ box.textContent='AI error: '+(e.message||e); }
});
