async function callAI(endpoint, payload) {
  const proxyUrl = document.getElementById('proxy-url').value;
  const token = document.getElementById('access-token').value;
  if (!proxyUrl) throw new Error("Proxy URL not set");

  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  }
  return await res.json();
}

// Branding preview
document.getElementById('save-branding').onclick = () => {
  const name = document.getElementById('company-name').value;
  const primary = document.getElementById('primary-color').value;
  const secondary = document.getElementById('secondary-color').value;
  const preview = document.getElementById('branding-preview');
  preview.innerHTML = `<div style='background:${primary};color:#000;padding:10px;border-radius:5px;'>${name || 'Company Name'}<br/>Primary: ${primary} | Secondary: ${secondary}</div>`;
};

// Test connection
document.getElementById('test-connection').onclick = async () => {
  try {
    await callAI("", { messages: [{role:"user", content:"ping"}], model:"gpt-4o-mini" });
    document.getElementById('connection-result').innerText = '✅ Connection looks good';
  } catch (e) {
    document.getElementById('connection-result').innerText = '❌ ' + e.message;
  }
};

// Spreadsheet analyze
document.getElementById('analyze-spreadsheet').onclick = async () => {
  const fileInput = document.getElementById('spreadsheet-upload');
  if (!fileInput.files.length) return alert("Upload a spreadsheet");
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const text = e.target.result;
      const resp = await callAI("", {
        model: "gpt-4o-mini",
        messages: [{
          role:"system",
          content:"You are a data cleaning assistant. Clean this CSV/XLSX text, return JSON with cleaned_csv, insights, recommendations."
        },{role:"user", content:text}]
      });
      document.getElementById('spreadsheet-results').innerHTML = `<h3>Insights</h3><pre>${JSON.stringify(resp, null, 2)}</pre>`;
      document.getElementById('download-cleaned').style.display = 'inline-block';
    } catch (e) { alert(e.message); }
  };
  reader.readAsText(fileInput.files[0]);
};

// Meeting notes summarize
document.getElementById('summarize-notes').onclick = async () => {
  const text = document.getElementById('meeting-text').value;
  if (!text) return alert("Paste some notes");
  try {
    const resp = await callAI("", {
      model: "gpt-4o-mini",
      messages: [{
        role:"system",
        content:"You are a meeting summarizer. Summarize notes into JSON with summary and actions."
      },{role:"user", content:text}]
    });
    document.getElementById('notes-results').innerHTML = `<h3>Summary</h3><pre>${JSON.stringify(resp, null, 2)}</pre>`;
    document.getElementById('download-pdf').style.display = 'inline-block';
    document.getElementById('download-docx').style.display = 'inline-block';
  } catch (e) { alert(e.message); }
};
