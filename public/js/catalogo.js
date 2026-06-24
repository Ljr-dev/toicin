const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fallbackImage = 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=900&q=80';
const params = new URLSearchParams(location.search);

function card(product) {
  return `<article class="card"><img src="${product.main_image || fallbackImage}" alt="${product.name}">
    <div><small>${product.category_name || ''}</small><h3>${product.name}</h3><p>${product.short_description || ''}</p>
    <strong>${money(product.price)}</strong><span>Autonomia: ${product.autonomy || 'consulte'}</span>
    <a class="btn" href="/produto.html?slug=${product.slug}">Ver detalhes</a></div></article>`;
}

async function loadCatalog() {
  const [settings, categories] = await Promise.all([
    fetch('/api/settings').then((r) => r.json()),
    fetch('/api/categories').then((r) => r.json())
  ]);
  storeName.textContent = settings.store_name || 'Loja Toicin';
  logo.src = settings.logo_url || '';
  logo.style.display = settings.logo_url ? 'block' : 'none';
  categoryFilter.innerHTML += categories.map((c) => `<option value="${c.slug}">${c.name}</option>`).join('');
  categoryFilter.value = params.get('category') || '';
  await loadProducts();
}

async function loadProducts() {
  const category = categoryFilter.value;
  const products = await fetch(`/api/products${category ? `?category=${category}` : ''}`).then((r) => r.json());
  catalogProducts.innerHTML = products.map(card).join('') || '<p>Nenhum produto encontrado.</p>';
}

categoryFilter.addEventListener('change', loadProducts);
loadCatalog();
