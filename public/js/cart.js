const CART_KEY = 'loja.cart.v1';
const CUSTOMER_KEY = 'loja.customer.v1';
const MAX_QTY = 99;

function clampQty(value) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(MAX_QTY, parsed);
}

function cartMoney(value) {
  return typeof priceLabel === 'function'
    ? priceLabel(value)
    : Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function cartTotalMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.slug && item.name)
      .map((item) => ({
        slug: String(item.slug),
        name: String(item.name),
        price: Number(item.price) || 0,
        image: String(item.image || ''),
        qty: clampQty(item.qty)
      }));
  } catch {
    return [];
  }
}

function writeCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* storage cheio ou bloqueado: segue com o estado em memória */
  }
  syncCartUi();
  document.dispatchEvent(new CustomEvent('cart:updated', { detail: items }));
}

function cartCount(items = readCart()) {
  return items.reduce((total, item) => total + item.qty, 0);
}

function cartSubtotal(items = readCart()) {
  return items.reduce((total, item) => total + item.price * item.qty, 0);
}

function addToCart(product, qty = 1) {
  const items = readCart();
  const slug = String(product.slug || '');
  if (!slug) return items;

  const existing = items.find((item) => item.slug === slug);
  if (existing) {
    existing.qty = clampQty(existing.qty + clampQty(qty));
    if (product.price) existing.price = Number(product.price) || existing.price;
    if (product.image) existing.image = product.image;
  } else {
    items.push({
      slug,
      name: String(product.name || slug),
      price: Number(product.price) || 0,
      image: String(product.image || ''),
      qty: clampQty(qty)
    });
  }

  writeCart(items);
  return items;
}

function updateQuantity(slug, qty) {
  const items = readCart();
  const item = items.find((entry) => entry.slug === slug);
  if (!item) return items;
  item.qty = clampQty(qty);
  writeCart(items);
  return items;
}

function removeFromCart(slug) {
  const items = readCart().filter((item) => item.slug !== slug);
  writeCart(items);
  return items;
}

function clearCart() {
  writeCart([]);
}

function readCustomer() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}');
    return { name: String(parsed.name || ''), note: String(parsed.note || '') };
  } catch {
    return { name: '', note: '' };
  }
}

function saveCustomer(customer) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: customer.name || '', note: customer.note || '' }));
  } catch {
    /* ignora */
  }
}

function buildOrderMessage(items, settings = {}, customer = {}) {
  const store = settings.store_name ? ` da ${settings.store_name}` : '';
  const lines = items.map((item) => {
    const lineTotal = item.price > 0 ? cartTotalMoney(item.price * item.qty) : 'Sob consulta';
    return `• ${item.qty}x ${item.name} — ${lineTotal}`;
  });
  const total = cartSubtotal(items);
  const parts = [
    `Olá! Quero fazer um pedido pelo site${store}:`,
    '',
    ...lines,
    '',
    `Total: ${total > 0 ? cartTotalMoney(total) : 'Sob consulta'}`
  ];

  if (customer.name) parts.push('', `Nome: ${customer.name}`);
  if (customer.note) parts.push(`Observações: ${customer.note}`);

  return parts.join('\n');
}

function checkoutUrl(settings = {}, message) {
  const digits = String(settings.whatsapp || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message || '')}`;
}

function openCheckout(settings, items, customer = {}) {
  const url = checkoutUrl(settings, buildOrderMessage(items, settings, customer));
  if (!url) return false;
  window.open(url, '_blank', 'noopener');
  return true;
}

let toastTimer;

function showCartToast(message, actionHref, actionLabel) {
  let toast = document.getElementById('cartToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cartToast';
    toast.className = 'cart-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span>${escapeHtml(message)}</span>${actionHref ? `<a href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel || 'Ver carrinho')}</a>` : ''}`;
  toast.classList.add('is-visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4000);
}

function syncFloatingPadding() {
  const cart = document.getElementById('fixedCart');
  const whatsapp = document.getElementById('fixedWhatsapp');
  const anyVisible = Boolean((cart && !cart.hidden) || (whatsapp && !whatsapp.hidden));
  document.body.classList.toggle('has-floating-actions', anyVisible);
  document.body.classList.toggle('has-fixed-whatsapp', Boolean(whatsapp && !whatsapp.hidden));
}

function syncCartUi() {
  const items = readCart();
  const count = cartCount(items);
  const total = cartSubtotal(items);

  document.querySelectorAll('[data-cart-count]').forEach((element) => {
    element.textContent = String(count);
    element.hidden = count === 0;
  });

  document.querySelectorAll('[data-cart-total]').forEach((element) => {
    element.textContent = count ? cartTotalMoney(total) : '';
  });

  const fixedCart = document.getElementById('fixedCart');
  if (fixedCart) fixedCart.hidden = count === 0;

  const headerCart = document.querySelector('.cart-link');
  if (headerCart) headerCart.classList.toggle('has-items', count > 0);

  syncFloatingPadding();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-to-cart]');
  if (!button) return;

  event.preventDefault();
  const quantityInput = document.getElementById('quantity');
  const qty = button.hasAttribute('data-use-quantity') && quantityInput ? clampQty(quantityInput.value) : 1;

  addToCart({
    slug: button.dataset.slug,
    name: button.dataset.name,
    price: Number(button.dataset.price) || 0,
    image: button.dataset.image || ''
  }, qty);

  showCartToast('Produto adicionado ao carrinho.', '/carrinho.html', 'Ver carrinho');
});

window.Cart = {
  read: readCart,
  add: addToCart,
  updateQuantity,
  remove: removeFromCart,
  clear: clearCart,
  count: cartCount,
  subtotal: cartSubtotal,
  money: cartTotalMoney,
  readCustomer,
  saveCustomer,
  buildOrderMessage,
  checkoutUrl,
  openCheckout,
  sync: syncCartUi,
  toast: showCartToast
};

window.syncFloatingPadding = syncFloatingPadding;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncCartUi);
} else {
  syncCartUi();
}

document.addEventListener('cart:updated', syncCartUi);
