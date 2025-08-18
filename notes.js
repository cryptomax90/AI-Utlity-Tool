// Meeting Notes Summarizer logic (page-specific)
document.getElementById('summarize-notes')?.addEventListener('click', async () => {
  const text = (document.getElementById('meeting-text')?.value || '').trim();
  if (!text) return alert('Paste some notes');
  try {
    const resp = await callAI('', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a meeting summarizer. Return JSON: {summary: string, key_points: string[], action_items: string[] }.' },
        { role: 'user', content: text }
      ]
    });
    document.getElementById('notes-results').innerHTML = `<h3>Summary</h3><pre>${escapeHtml(JSON.stringify(resp, null, 2))}</pre>`;
    document.getElementById('download-pdf').style.display = 'inline-block';
    document.getElementById('download-docx').style.display = 'inline-block';
  } catch (err) {
    alert(err.message);
  }
});

function escapeHtml(str){ return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
