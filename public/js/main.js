const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const wa = (number, text) => `https://wa.me/${String(number || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
const fallbackImage = 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=900&q=80';

function productCard(product) {
  return `<article class="card">
    <img src="${product.main_image || fallbackImage}" alt="${product.name}">
    <div><small>${product.category_name || ''}</small><h3>${product.name}</h3><p>${product.short_description || ''}</p>
    <strong>${money(product.price)}</strong><span>${product.autonomy || ''}</span>
    <a class="btn" href="/produto.html?slug=${product.slug}">Ver detalhes</a></div>
  </article>`;
}

async function loadHome() {
  const [settings, products, categories, faqs] = await Promise.all([
    fetch('/api/settings').then((r) => r.json()),
    fetch('/api/products').then((r) => r.json()),
    fetch('/api/categories').then((r) => r.json()),
    fetch('/api/faqs').then((r) => r.json())
  ]);
  document.documentElement.style.setProperty('--primary', settings.primary_color || '#11c5a6');
  document.documentElement.style.setProperty('--secondary', settings.secondary_color || '#101828');
  if (settings.hero_image_url) document.documentElement.style.setProperty('--hero-image', `url("${settings.hero_image_url}")`);
  document.title = settings.store_name || 'Loja Toicin';
  storeName.textContent = settings.store_name || 'Loja Toicin';
  footerStore.textContent = settings.store_name || 'Loja Toicin';
  logo.src = settings.logo_url || '';
  logo.style.display = settings.logo_url ? 'block' : 'none';
  city.textContent = settings.city || '';
  headline.textContent = settings.headline || '';
  description.textContent = settings.description || '';
  instagram.href = settings.instagram || '#';
  whatsappBtn.href = wa(settings.whatsapp, `Ola, vim pelo site da ${settings.store_name} e quero mais informacoes.`);
  featuredProducts.innerHTML = products.slice(0, 6).map(productCard).join('') || '<p>Nenhum produto ativo cadastrado.</p>';
  window.categories.innerHTML = categories.map((c) => `<a class="category" href="/catalogo.html?category=${c.slug}">${c.name}</a>`).join('');
  window.faqs.innerHTML = faqs.slice(0, 4).map((f) => `<details><summary>${f.question}</summary><p>${f.answer}</p></details>`).join('');
}

loadHome();
