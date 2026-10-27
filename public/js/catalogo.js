const params = new URLSearchParams(location.search);
const categoryFilter = document.getElementById('categoryFilter');
const catalogProducts = document.getElementById('catalogProducts');

async function loadProducts() {
  const category = categoryFilter.value;
  catalogProducts.innerHTML = '<p class="empty">Carregando produtos...</p>';

  const url = category ? `/api/products?category=${encodeURIComponent(category)}` : '/api/products';
  const products = await fetchJson(url);

  catalogProducts.innerHTML = products.map(productCard).join('');
  if (!products.length) renderMessage(catalogProducts, 'Nenhum produto encontrado para este filtro.');

  const search = category ? `?category=${encodeURIComponent(category)}` : location.pathname;
  history.replaceState(null, '', search);
}

async function loadCatalog() {
  const [settings, categories] = await Promise.all([
    fetchJson('/api/settings'),
    fetchJson('/api/categories')
  ]);

  applyBranding(settings, 'Catálogo');

  setWhatsappLink(
    document.getElementById('fixedWhatsapp'),
    settings,
    `Olá! Vim pelo site da ${settings.store_name || 'loja'} e quero mais informações.`
  );

  categoryFilter.innerHTML += categories
    .map((category) => `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</option>`)
    .join('');
  categoryFilter.value = params.get('category') || '';
  await loadProducts();
}

categoryFilter.addEventListener('change', () => {
  loadProducts().catch((error) => {
    console.error(error);
    renderMessage(catalogProducts, 'Não foi possível carregar os produtos agora.');
  });
});

loadCatalog().catch((error) => {
  console.error(error);
  renderMessage(catalogProducts, 'Não foi possível carregar o catálogo agora. Tente novamente em instantes.');
});
