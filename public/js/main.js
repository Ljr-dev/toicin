async function loadHome() {
  const [settings, products, categories, faqs] = await Promise.all([
    fetchJson('/api/settings'),
    fetchJson('/api/products'),
    fetchJson('/api/categories'),
    fetchJson('/api/faqs')
  ]);

  applyBranding(settings);

  const cityEl = document.getElementById('city');
  if (cityEl) {
    cityEl.textContent = settings.city || '';
    cityEl.hidden = !settings.city;
  }

  const headlineEl = document.getElementById('headline');
  if (headlineEl && settings.headline) headlineEl.textContent = settings.headline;

  const descriptionEl = document.getElementById('description');
  if (descriptionEl && settings.description) descriptionEl.textContent = settings.description;

  const whatsappBtn = document.getElementById('whatsappBtn');
  setWhatsappLink(whatsappBtn, settings, `Olá! Vim pelo site da ${settings.store_name || 'loja'} e quero mais informações.`);

  const fixedWhatsapp = document.getElementById('fixedWhatsapp');
  setWhatsappLink(fixedWhatsapp, settings, `Olá! Vim pelo site da ${settings.store_name || 'loja'} e quero mais informações.`);

  const featured = document.getElementById('featuredProducts');
  if (featured) {
    featured.innerHTML = products.slice(0, 6).map(productCard).join('');
    if (!products.length) renderMessage(featured, 'Nenhum produto cadastrado ainda.');
  }

  const categoriesEl = document.getElementById('categories');
  if (categoriesEl) {
    categoriesEl.innerHTML = categories.map((category) => `<a class="category" href="/catalogo.html?category=${encodeURIComponent(category.slug)}">${escapeHtml(category.name)}</a>`).join('');
    if (!categories.length) renderMessage(categoriesEl, 'Nenhuma categoria cadastrada.');
  }

  const faqsEl = document.getElementById('faqs');
  if (faqsEl) {
    faqsEl.innerHTML = faqs.slice(0, 4).map((faq) => `<details><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`).join('');
    if (!faqs.length) renderMessage(faqsEl, 'Nenhuma pergunta cadastrada.');
  }
}

loadHome().catch((error) => {
  console.error(error);
  renderMessage(document.getElementById('featuredProducts'), 'Não foi possível carregar a loja agora. Tente novamente em instantes.');
});
