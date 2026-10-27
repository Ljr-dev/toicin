const fallbackImage = '/img/placeholder.svg';

const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const priceLabel = (value) => (Number(value || 0) > 0 ? money(value) : 'Sob consulta');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function waLink(number, text) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text || '')}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Falha ao carregar ${url}`);
  return response.json();
}

function applyBranding(settings = {}, pageTitle) {
  const storeName = settings.store_name || 'Minha Loja';
  const root = document.documentElement;

  if (settings.primary_color) root.style.setProperty('--primary', settings.primary_color);
  if (settings.secondary_color) root.style.setProperty('--secondary', settings.secondary_color);
  if (settings.hero_image_url) root.style.setProperty('--hero-image', `url("${settings.hero_image_url}")`);

  document.title = pageTitle ? `${pageTitle} | ${storeName}` : storeName;

  const headerName = document.getElementById('storeName');
  if (headerName) headerName.textContent = storeName;

  const footerName = document.getElementById('footerStore');
  if (footerName) footerName.textContent = storeName;

  const logo = document.getElementById('logo');
  if (logo) {
    logo.alt = storeName;
    logo.src = settings.logo_url || fallbackImage;
    logo.hidden = !settings.logo_url;
  }

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && settings.description) metaDescription.content = settings.description;

  const instagram = document.getElementById('instagram');
  if (instagram) {
    if (settings.instagram) {
      instagram.href = settings.instagram;
      instagram.target = '_blank';
      instagram.rel = 'noopener';
    } else {
      instagram.hidden = true;
    }
  }
}

function setWhatsappLink(element, settings = {}, message) {
  if (!element) return;
  const href = waLink(settings.whatsapp, message);
  element.hidden = !href;
  if (href) {
    element.href = href;
    element.target = '_blank';
    element.rel = 'noopener';
  }
}

function productCard(product) {
  const name = escapeHtml(product.name);
  const slug = encodeURIComponent(product.slug);
  const category = product.category_name ? `<small>${escapeHtml(product.category_name)}</small>` : '';
  const description = product.short_description ? `<p>${escapeHtml(product.short_description)}</p>` : '';
  const image = product.main_image || fallbackImage;

  return `<article class="card">
    <img src="${escapeHtml(image)}" alt="${name}" loading="lazy" decoding="async">
    <div>
      ${category}
      <h3>${name}</h3>
      ${description}
      <strong>${priceLabel(product.price)}</strong>
      <div class="card-actions">
        <a class="btn" href="/produto.html?slug=${slug}">Ver detalhes</a>
        <button class="btn outline" type="button" data-add-to-cart
          data-slug="${escapeHtml(product.slug)}" data-name="${name}"
          data-price="${Number(product.price) || 0}" data-image="${escapeHtml(image)}">Adicionar</button>
      </div>
    </div>
  </article>`;
}

function renderMessage(container, message) {
  if (container) container.innerHTML = `<p class="empty">${escapeHtml(message)}</p>`;
}
