async function loadFaq() {
  const [settings, items] = await Promise.all([
    fetch('/api/settings').then((r) => r.json()),
    fetch('/api/faqs').then((r) => r.json())
  ]);
  storeName.textContent = settings.store_name || 'Loja Toicin';
  logo.src = settings.logo_url || '';
  logo.style.display = settings.logo_url ? 'block' : 'none';
  faqs.innerHTML = items.map((f) => `<details><summary>${f.question}</summary><p>${f.answer}</p></details>`).join('') || '<p>Nenhuma pergunta cadastrada.</p>';
}
loadFaq();
