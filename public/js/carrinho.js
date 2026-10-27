const cartItemsEl = document.getElementById('cartItems');
const cartLayout = document.getElementById('cartLayout');
const cartSummaryEl = document.getElementById('cartSummary');
const cartItemCountEl = document.getElementById('cartItemCount');
const cartSubtotalEl = document.getElementById('cartSubtotal');
const customerNameInput = document.getElementById('customerName');
const customerNoteInput = document.getElementById('customerNote');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutHint = document.getElementById('checkoutHint');
const clearCartBtn = document.getElementById('clearCartBtn');

let storeSettings = {};
let hasWhatsapp = false;

const savedCustomer = Cart.readCustomer();
customerNameInput.value = savedCustomer.name;
customerNoteInput.value = savedCustomer.note;

function cartItemTemplate(item) {
  const name = escapeHtml(item.name);
  const image = escapeHtml(item.image || fallbackImage);
  const productHref = `/produto.html?slug=${encodeURIComponent(item.slug)}`;

  return `<article class="cart-item" data-slug="${escapeHtml(item.slug)}">
    <img class="cart-thumb" src="${image}" alt="${name}" loading="lazy" decoding="async">
    <div class="cart-item-info">
      <h2><a href="${productHref}">${name}</a></h2>
      <p>${escapeHtml(priceLabel(item.price))} cada</p>
      <button class="cart-remove" type="button" data-cart-action="remove" aria-label="Remover ${name} do carrinho">Remover</button>
    </div>
    <div class="qty-control" role="group" aria-label="Quantidade de ${name}">
      <button type="button" data-cart-action="decrease" aria-label="Diminuir quantidade de ${name}">−</button>
      <input type="number" min="1" max="99" step="1" value="${item.qty}" data-cart-action="set" inputmode="numeric" aria-label="Quantidade de ${name}">
      <button type="button" data-cart-action="increase" aria-label="Aumentar quantidade de ${name}">+</button>
    </div>
    <strong class="cart-item-total">${escapeHtml(priceLabel(item.price * item.qty))}</strong>
  </article>`;
}

function emptyCartTemplate() {
  return `<div class="cart-empty">
    <h2>Seu carrinho está vazio</h2>
    <p>Adicione produtos para finalizar a compra pelo WhatsApp.</p>
    <a class="btn" href="/catalogo.html">Ver catálogo</a>
  </div>`;
}

function renderCart() {
  const items = Cart.read();
  const count = Cart.count(items);
  const subtotal = Cart.subtotal(items);
  const isEmpty = items.length === 0;

  cartLayout.classList.toggle('is-empty', isEmpty);
  cartSummaryEl.hidden = isEmpty;
  cartItemsEl.innerHTML = isEmpty ? emptyCartTemplate() : items.map(cartItemTemplate).join('');

  cartItemCountEl.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
  cartSubtotalEl.textContent = priceLabel(subtotal);
  checkoutBtn.disabled = isEmpty || !hasWhatsapp;

  if (!hasWhatsapp) {
    checkoutHint.textContent = 'O WhatsApp da loja ainda não foi configurado. Fale com o vendedor para finalizar.';
  } else if (isEmpty) {
    checkoutHint.textContent = 'Adicione produtos para finalizar a compra.';
  } else {
    checkoutHint.textContent = 'Ao continuar, o WhatsApp da loja abre com o pedido pronto para enviar.';
  }
}

function findItem(slug) {
  return Cart.read().find((item) => item.slug === slug);
}

cartItemsEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-cart-action]');
  if (!button) return;

  const itemEl = button.closest('.cart-item');
  const item = itemEl ? findItem(itemEl.dataset.slug) : null;
  if (!item) return;

  const action = button.dataset.cartAction;
  if (action === 'remove') Cart.remove(item.slug);
  else if (action === 'increase') Cart.updateQuantity(item.slug, item.qty + 1);
  else if (action === 'decrease') Cart.updateQuantity(item.slug, item.qty - 1);
});

cartItemsEl.addEventListener('change', (event) => {
  const input = event.target.closest('input[data-cart-action="set"]');
  if (!input) return;

  const itemEl = input.closest('.cart-item');
  const item = itemEl ? findItem(itemEl.dataset.slug) : null;
  if (!item) return;

  Cart.updateQuantity(item.slug, input.value);
});

[customerNameInput, customerNoteInput].forEach((input) => {
  input.addEventListener('input', () => {
    Cart.saveCustomer({ name: customerNameInput.value, note: customerNoteInput.value });
  });
});

checkoutBtn.addEventListener('click', () => {
  const items = Cart.read();
  if (!items.length) return;

  const customer = {
    name: customerNameInput.value.trim(),
    note: customerNoteInput.value.trim()
  };

  Cart.saveCustomer(customer);

  if (!Cart.openCheckout(storeSettings, items, customer)) {
    Cart.toast('WhatsApp da loja não configurado.');
    return;
  }

  Cart.toast('Pedido preparado no WhatsApp!');
});

clearCartBtn.addEventListener('click', () => {
  if (!Cart.read().length) return;
  if (window.confirm('Esvaziar o carrinho?')) Cart.clear();
});

async function loadStore() {
  try {
    storeSettings = await fetchJson('/api/settings');
  } catch (error) {
    console.error(error);
    storeSettings = {};
  }

  applyBranding(storeSettings, 'Carrinho');

  hasWhatsapp = Boolean(Cart.checkoutUrl(storeSettings, 'pedido'));
  setWhatsappLink(
    document.getElementById('fixedWhatsapp'),
    storeSettings,
    `Olá! Vim pelo site da ${storeSettings.store_name || 'loja'} e quero mais informações.`
  );

  renderCart();
}

renderCart();
loadStore();

document.addEventListener('cart:updated', renderCart);
