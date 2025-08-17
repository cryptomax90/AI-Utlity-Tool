// ====== CONFIG: AI settings are embedded here (no UI field needed) ======
const CONFIG = {
  PROXY_URL: "https://chatgpt-proxy.cryptomax90.workers.dev/",        // e.g. "https://your-proxy.example.com/v1/chat/completions"
  ACCESS_TOKEN: "my-first-openai-api"      // Optional: "sk-..."
};

// ====== Basic SPA navigation helpers ======
const sections = {
  home: document.getElementById('home'),
  spreadsheets: document.getElementById('spreadsheets'),
  notes: document.getElementById('meeting-notes'),
  branding: document.getElementById('branding'),
};

function showSection(key) {
  Object.values(sections).forEach(s => s.classList.remove('visible'));
  sections[key].classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Home buttons
document.getElementById('go-spreadsheets')?.addEventListener('click', () => showSection('spreadsheets'));
document.getElementById('go-notes')?.addEventListener('click', () => showSection('notes'));

// Back buttons
document.querySelectorAll('[data-back]').forEach(el => el.addEventListener('click', () => showSection('home')));

// Branding open/close
document.getElementById('btn-branding')?.addEventListener('click', () => showSection('branding'));
document.querySelector('[data-close-branding]')?.addEventListener('click', () => {
  // If user came from home, go back there; otherwise default to home.
  showSection('home');
});

// Start on home
showSection('home');

// ====== AI call helper using embedded CONFIG ======
async function callAI(endpoint, payload) {
  const proxyUrl = CONFIG.PROXY_URL;
  const token = CONFIG.ACCESS_TOKEN;
  if (!proxyUrl) throw new Error("Proxy URL not set in CONFIG.PROXY_URL");

  const res = await fetch(proxyUrl + (endpoint || ""), {
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

// ====== Spreadsheet Analyzer ======
document.getElementById('analyze-spreadsheet')?.addEventListener('click', async () => {
  const fileInput = document.getElementById('spreadsheet-upload');
  if (!fileInput.files.length) return alert("Upload a spreadsheet first (.csv or .xlsx).");

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    try {
      const resp = await callAI("", {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a data cleaning assistant. Produce JSON with keys: cleaned_csv (string) and insights (array of strings)." },
          { role: "user", content: `Here is the file content (may be CSV or a serialized preview of XLSX):\n\n${text}` }
        ]
      });
      const resultsDiv = document.getElementById('spreadsheet-results');
      resultsDiv.innerHTML = `<h3>Results</h3><pre>${JSON.stringify(resp, null, 2)}</pre>`;
      document.getElementById('download-cleaned').style.display = 'inline-block';
      // Optionally: create a downloadable file from cleaned_csv if present
      const cleanedBtn = document.getElementById('download-cleaned');
      cleanedBtn.onclick = () => {
        const cleaned = (resp.cleaned_csv) ? resp.cleaned_csv : (resp?.choices?.[0]?.message?.content || "");
        const blob = new Blob([cleaned], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "cleaned.csv";
        a.click();
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      alert(e.message);
    }
  };
  // Read as text; for .xlsx, this is a rough preview unless you add a parser like SheetJS.
  reader.readAsText(file);
});

// ====== Meeting Notes Summarizer ======
document.getElementById('summarize-notes')?.addEventListener('click', async () => {
  const textArea = document.getElementById('meeting-text');
  const text = textArea.value.trim();
  if (!text) return alert("Paste some notes");
  try {
    const resp = await callAI("", {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a meeting summarizer. Return JSON: {summary: string, key_points: string[], action_items: string[] }." },
        { role: "user", content: text }
      ]
    });
    document.getElementById('notes-results').innerHTML = `<h3>Summary</h3><pre>${JSON.stringify(resp, null, 2)}</pre>`;
    document.getElementById('download-pdf').style.display = 'inline-block';
    document.getElementById('download-docx').style.display = 'inline-block';
  } catch (e) {
    alert(e.message);
  }
});

// ====== Branding (very simple preview) ======
document.getElementById('save-branding')?.addEventListener('click', () => {
  const name = document.getElementById('company-name').value || "Your Company";
  const primary = document.getElementById('primary-color').value || "#2a9d8f";
  const secondary = document.getElementById('secondary-color').value || "#264653";
  const preview = document.getElementById('branding-preview');
  preview.innerHTML = `<strong>${name}</strong> • Primary: ${primary} • Secondary: ${secondary}`;
  // Apply primary color to buttons as a basic theming example
  document.documentElement.style.setProperty('--primary', primary);
  document.documentElement.style.setProperty('--secondary', secondary);
});

