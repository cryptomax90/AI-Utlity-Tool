// Placeholder JS hooking UI. Actual AI calls go via proxy.
document.getElementById('save-branding').onclick = () => {
  const name = document.getElementById('company-name').value;
  const primary = document.getElementById('primary-color').value;
  const secondary = document.getElementById('secondary-color').value;
  const preview = document.getElementById('branding-preview');
  preview.innerHTML = `<div style='background:${primary};color:#000;padding:10px;border-radius:5px;'>${name || 'Company Name'}<br/>Primary: ${primary} | Secondary: ${secondary}</div>`;
};

document.getElementById('test-connection').onclick = () => {
  document.getElementById('connection-result').innerText = '✅ Connection looks good (mocked)';
};

document.getElementById('analyze-spreadsheet').onclick = () => {
  document.getElementById('spreadsheet-results').innerHTML = '<h3>AI Insights</h3><ul><li>Data cleaned successfully</li><li>Top product: Widget A</li><li>Revenue gap detected</li></ul>';
  document.getElementById('download-cleaned').style.display = 'inline-block';
};

document.getElementById('summarize-notes').onclick = () => {
  document.getElementById('notes-results').innerHTML = '<h3>Meeting Summary</h3><p>- Project delayed due to API issues<br/>- DB migration approved<br/>- Fix auth bugs before next sprint</p>';
  document.getElementById('download-pdf').style.display = 'inline-block';
  document.getElementById('download-docx').style.display = 'inline-block';
};
