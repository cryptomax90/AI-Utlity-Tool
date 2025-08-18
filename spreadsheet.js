// Spreadsheet Analyzer logic (page-specific)
document.getElementById('analyze-spreadsheet')?.addEventListener('click', async () => {
  const fileInput = document.getElementById('spreadsheet-upload');
  if (!fileInput.files.length) return alert('Upload a spreadsheet first (.csv or .xlsx).');
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const resp = await callAI('', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a data cleaning assistant. Produce JSON with keys: cleaned_csv (string) and insights (array of strings).' },
          { role: 'user', content: `Here is the file content (may be CSV or a serialized preview of XLSX):\n\n${text}` }
        ]
      });
      const out = document.getElementById('spreadsheet-results');
      out.innerHTML = `<h3>Results</h3><pre>${escapeHtml(JSON.stringify(resp, null, 2))}</pre>`;
      const btn = document.getElementById('download-cleaned');
      btn.style.display = 'inline-block';
      btn.onclick = () => {
        const cleaned = (resp.cleaned_csv) ? resp.cleaned_csv : (resp?.choices?.[0]?.message?.content || '');
        const blob = new Blob([cleaned], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'cleaned.csv'; a.click(); URL.revokeObjectURL(url);
      };
    } catch (err) {
      alert(err.message);
    }
  };
  reader.readAsText(file);
});

function escapeHtml(str){ return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
