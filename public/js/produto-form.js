const editingId = new URLSearchParams(location.search).get('id');

function field(label, name, type = 'text') {
  return `<label>${label}<input name="${name}" type="${type}"></label>`;
}

function buildForm(categories) {
  productForm.innerHTML = `
    <label>Categoria<select name="category_id">${categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select></label>
    ${field('Nome', 'name')}${field('Preco', 'price', 'number')}
    <label>Descricao curta<textarea name="short_description"></textarea></label>
    <label>Descricao completa<textarea name="full_description"></textarea></label>
    ${field('Motor', 'motor')}${field('Bateria', 'battery')}${field('Autonomia', 'autonomy')}
    ${field('Velocidade maxima', 'max_speed')}${field('Tempo de carga', 'charging_time')}${field('Peso suportado', 'max_weight')}
    ${field('Garantia', 'warranty')}<label>Formas de pagamento<textarea name="payment_info"></textarea></label>
    <label>Status<select name="status"><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>
    <label>Imagens<input name="images" type="file" accept="image/*" multiple></label>
    <button class="admin-btn">Salvar produto</button>`;
}

async function loadForm() {
  const categories = await fetch('/api/categories').then((r) => r.json());
  buildForm(categories);
  if (editingId) {
    const product = await api(`/api/admin/products/${editingId}`);
    Object.entries(product).forEach(([key, value]) => {
      const input = productForm.elements[key];
      if (input && key !== 'images') input.value = value ?? '';
    });
    renderImages(product.images || []);
  }
}

function renderImages(images) {
  if (!document.getElementById('imageList')) return;
  imageList.innerHTML = images.map((image) => `<article><img src="${image.image_url}" alt=""><div>
    <button type="button" data-action="main" data-id="${image.id}">${image.is_main ? 'Principal' : 'Tornar principal'}</button>
    <button type="button" data-action="delete" data-id="${image.id}">Excluir</button></div></article>`).join('') || '<p>Nenhuma imagem cadastrada.</p>';
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(productForm);
  try {
    const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
    const method = editingId ? 'PUT' : 'POST';
    const result = await api(url, { method, body: form });
    message.textContent = 'Produto salvo com sucesso.';
    if (!editingId) location.href = `/admin/editar-produto.html?id=${result.id}`;
    else loadForm();
  } catch (error) {
    message.textContent = error.message;
  }
});

document.getElementById('imageList')?.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.action === 'delete' && confirm('Excluir imagem?')) await api(`/api/admin/images/${button.dataset.id}`, { method: 'DELETE' });
  if (button.dataset.action === 'main') await api(`/api/admin/images/${button.dataset.id}/main`, { method: 'PUT' });
  loadForm();
});

loadForm();
