// ===== Embedded AI settings (no separate page) =====
const CONFIG = {
  PROXY_URL: "",   // e.g. "https://your-proxy.example.com/v1/chat/completions"
  ACCESS_TOKEN: "" // optional
};

// ===== Branding modal wiring (shared) =====
(function setupBrandingModal(){
  const modal = document.getElementById('branding-modal');
  const btn = document.getElementById('btn-branding');
  if (btn && modal) {
    btn.addEventListener('click', () => modal.classList.remove('hidden'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.matches('[data-close]')) {
        modal.classList.add('hidden');
      }
    });
  }

  // Save Branding and apply theme vars
  const saveBtn = document.getElementById('save-branding');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = (document.getElementById('company-name')?.value || 'Your Company').trim();
      const primary = document.getElementById('primary-color')?.value || '#2a9d8f';
      const secondary = document.getElementById('secondary-color')?.value || '#264653';
      const preview = document.getElementById('branding-preview');
      if (preview) preview.innerHTML = `<strong>${name}</strong> • Primary: ${primary} • Secondary: ${secondary}`;
      document.documentElement.style.setProperty('--primary', primary);
      document.documentElement.style.setProperty('--secondary', secondary);
    });
  }
})();

// ===== Shared helper for AI fetch using CONFIG =====
async function callAI(endpoint, payload) {
  const url = CONFIG.PROXY_URL;
  const token = CONFIG.ACCESS_TOKEN;
  if (!url) throw new Error('Proxy URL not set in CONFIG.PROXY_URL');

  const res = await fetch(url + (endpoint || ''), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  return await res.json();
}
