async function loadFaq() {
  const [settings, items] = await Promise.all([
    fetchJson('/api/settings'),
    fetchJson('/api/faqs')
  ]);

  applyBranding(settings, 'Perguntas frequentes');

  const faqs = document.getElementById('faqs');
  if (!faqs) return;

  faqs.innerHTML = items
    .map((faq) => `<details><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`)
    .join('');

  if (!items.length) renderMessage(faqs, 'Nenhuma pergunta cadastrada.');
}

loadFaq().catch((error) => {
  console.error(error);
  renderMessage(document.getElementById('faqs'), 'Não foi possível carregar as perguntas agora.');
});
