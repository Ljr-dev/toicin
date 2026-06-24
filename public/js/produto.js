const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const wa = (number, text) => `https://wa.me/${String(number || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
const fallbackImage = 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=1000&q=80';
const slug = new URLSearchParams(location.search).get('slug');

async function loadProduct() {
  const product = await fetch(`/api/products/${slug}`).then((r) => r.ok ? r.json() : null);
  if (!product) {
    document.querySelector('main').innerHTML = '<section class="section"><h1>Produto nao encontrado</h1></section>';
    return;
  }
  const settings = product.settings || {};
  document.title = product.name;
  storeName.textContent = settings.store_name || 'Loja Toicin';
  logo.src = settings.logo_url || '';
  logo.style.display = settings.logo_url ? 'block' : 'none';
  category.textContent = product.category_name || '';
  productName.textContent = product.name;
  price.textContent = money(product.price);
  shortDescription.textContent = product.short_description || '';
  fullDescription.textContent = product.full_description || '';
  const images = product.images?.length ? product.images : [{ image_url: fallbackImage }];
  mainImage.src = images[0].image_url;
  thumbs.innerHTML = images.map((image) => `<button type="button"><img src="${image.image_url}" alt=""></button>`).join('');
  thumbs.querySelectorAll('button').forEach((button, index) => button.onclick = () => { mainImage.src = images[index].image_url; });
  const specMap = {
    Motor: product.motor, Bateria: product.battery, Autonomia: product.autonomy,
    'Velocidade maxima': product.max_speed, 'Tempo de carga': product.charging_time,
    'Peso suportado': product.max_weight, Garantia: product.warranty, Pagamento: product.payment_info
  };
  specs.innerHTML = Object.entries(specMap).filter(([, value]) => value).map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`).join('');
  faqs.innerHTML = (product.faqs || []).map((f) => `<details><summary>${f.question}</summary><p>${f.answer}</p></details>`).join('');
  fixedWhatsapp.href = wa(settings.whatsapp, `Ola, vi o produto ${product.name} no site e tenho interesse. Pode me passar mais detalhes?`);
}

loadProduct();
