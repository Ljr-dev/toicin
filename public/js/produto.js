const slug = new URLSearchParams(location.search).get('slug');

function notFound() {
  document.title = 'Produto não encontrado';
  const main = document.querySelector('main');
  if (main) main.innerHTML = '<section class="section"><h1>Produto não encontrado</h1><p>O produto que você procura não está mais disponível.</p><a class="btn" href="/catalogo.html">Voltar ao catálogo</a></section>';
}

async function loadProduct() {
  if (!slug) return notFound();

  let product;
  try {
    product = await fetchJson(`/api/products/${encodeURIComponent(slug)}`);
  } catch {
    return notFound();
  }

  const settings = product.settings || {};
  applyBranding(settings, product.name);

  const categoryEl = document.getElementById('category');
  if (categoryEl) {
    categoryEl.textContent = product.category_name || '';
    categoryEl.hidden = !product.category_name;
  }

  const nameEl = document.getElementById('productName');
  if (nameEl) nameEl.textContent = product.name;

  const priceEl = document.getElementById('price');
  if (priceEl) priceEl.textContent = priceLabel(product.price);

  const shortEl = document.getElementById('shortDescription');
  if (shortEl) {
    shortEl.textContent = product.short_description || '';
    shortEl.hidden = !product.short_description;
  }

  const fullEl = document.getElementById('fullDescription');
  if (fullEl) {
    fullEl.textContent = product.full_description || '';
    fullEl.hidden = !product.full_description;
  }

  const specs = (product.specs || []).filter((spec) => spec.label && spec.value);
  const specsBlock = document.getElementById('specsBlock');
  const specsEl = document.getElementById('specs');
  if (specs.length && specsBlock && specsEl) {
    specsEl.innerHTML = specs
      .map((spec) => `<dt>${escapeHtml(spec.label)}</dt><dd>${escapeHtml(spec.value)}</dd>`)
      .join('');
  } else if (specsBlock) {
    specsBlock.hidden = true;
  }

  const faqs = product.faqs || [];
  const faqSection = document.getElementById('faqSection');
  const faqsEl = document.getElementById('faqs');
  if (faqs.length && faqSection && faqsEl) {
    faqsEl.innerHTML = faqs
      .map((faq) => `<details><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`)
      .join('');
  } else if (faqSection) {
    faqSection.hidden = true;
  }

  const images = (product.images || []).map((image) => image.image_url).filter(Boolean);
  const mainImage = document.getElementById('mainImage');
  const thumbs = document.getElementById('thumbs');

  const selectImage = (index) => {
    if (!mainImage) return;
    mainImage.src = images[index] || fallbackImage;
    mainImage.alt = `${product.name} - imagem ${index + 1}`;
    if (!thumbs) return;
    thumbs.querySelectorAll('button').forEach((button, buttonIndex) => {
      button.classList.toggle('is-active', buttonIndex === index);
    });
  };

  if (!images.length) images.push(fallbackImage);

  if (thumbs) {
    thumbs.innerHTML = images
      .map((image, index) => `<button type="button" aria-label="Ver imagem ${index + 1}"><img src="${escapeHtml(image)}" alt="" loading="lazy"></button>`)
      .join('');
    thumbs.hidden = images.length <= 1;
    thumbs.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      selectImage(Array.from(thumbs.children).indexOf(button));
    });
  }

  selectImage(0);

  const addToCartBtn = document.getElementById('addToCartBtn');
  if (addToCartBtn) {
    addToCartBtn.dataset.slug = product.slug;
    addToCartBtn.dataset.name = product.name;
    addToCartBtn.dataset.price = String(Number(product.price) || 0);
    addToCartBtn.dataset.image = images[0] || '';
    addToCartBtn.hidden = false;
  }

  const fixedWhatsapp = document.getElementById('fixedWhatsapp');
  setWhatsappLink(fixedWhatsapp, settings, `Olá! Vi o produto ${product.name} no site e tenho interesse. Pode me passar mais detalhes?`);
}

loadProduct().catch((error) => {
  console.error(error);
  notFound();
});
