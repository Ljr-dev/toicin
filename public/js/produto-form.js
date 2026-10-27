const editingId = new URLSearchParams(location.search).get('id');
const productForm = document.getElementById('productForm');

function field(label, name, extra = '') {
  return `<label>${label}<input name="${name}" ${extra}></label>`;
}

function buildForm(categories) {
  productForm.innerHTML = `
    <label>Categoria<select name="category_id">
      <option value="">Sem categoria</option>
      ${categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join('')}
    </select></label>
    <label>Status<select name="status">
      <option value="active">Ativo</option>
      <option value="inactive">Inativo</option>
    </select></label>
    ${field('Nome *', 'name', 'required maxlength="160"')}
    ${field('Preço (R$)', 'price', 'type="text" inputmode="decimal" placeholder="0,00"')}
    <label class="full">Descrição curta<textarea name="short_description" rows="2" maxlength="220"></textarea></label>
    <label class="full">Descrição completa<textarea name="full_description" rows="6"></textarea></label>
    <label class="full">Imagens<input name="images" type="file" accept="image/*" multiple></label>
    <section class="spec-editor">
      <div class="topline">
        <h2>Especificações</h2>
        <button id="addSpec" class="admin-btn secondary" type="button">Adicionar especificação</button>
      </div>
      <div id="specRows"></div>
      <p class="hint">Cadastre qualquer característica do produto (cor, tamanho, voltagem, material, validade...).</p>
    </section>
    <button class="admin-btn form-submit">Salvar produto</button>`;

  document.getElementById('addSpec').addEventListener('click', () => addSpec());
  document.getElementById('specRows').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="remove-spec"]');
    if (button) button.closest('.spec-row').remove();
  });
}

function specRow(spec = {}) {
  return `<div class="spec-row">
    <input data-spec="label" placeholder="Característica (ex: Cor)" value="${escapeHtml(spec.label || '')}">
    <input data-spec="value" placeholder="Valor (ex: Azul)" value="${escapeHtml(spec.value || '')}">
    <button type="button" data-action="remove-spec" aria-label="Remover especificação">Remover</button>
  </div>`;
}

function addSpec(spec) {
  const container = document.getElementById('specRows');
  if (container) container.insertAdjacentHTML('beforeend', specRow(spec));
}

function collectSpecs() {
  return Array.from(document.querySelectorAll('#specRows .spec-row'))
    .map((row) => ({
      label: row.querySelector('[data-spec="label"]').value.trim(),
      value: row.querySelector('[data-spec="value"]').value.trim()
    }))
    .filter((spec) => spec.label && spec.value);
}

async function loadForm() {
  const categories = await fetchJson('/api/categories');
  buildForm(categories);

  if (!editingId) {
    addSpec();
    return;
  }

  const product = await api(`/api/admin/products/${editingId}`);
  Object.entries(product).forEach(([key, value]) => {
    const input = productForm.elements[key];
    if (input && ['images', 'specs', 'id', 'slug', 'created_at'].includes(key) === false) input.value = value ?? '';
  });

  (product.specs || []).forEach((spec) => addSpec(spec));
  if (!product.specs?.length) addSpec();

  renderImages(product.images || []);
}

function renderImages(images) {
  const list = document.getElementById('imageList');
  if (!list) return;
  list.innerHTML = images.map((image) => `<article><img src="${escapeHtml(image.image_url)}" alt=""><div>
    <button type="button" data-action="main" data-id="${escapeHtml(image.id)}">${image.is_main ? 'Principal' : 'Tornar principal'}</button>
    <button type="button" data-action="delete" data-id="${escapeHtml(image.id)}">Excluir</button></div></article>`).join('') || '<p>Nenhuma imagem cadastrada.</p>';
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = document.getElementById('message');
  const form = new FormData(productForm);
  form.set('specs', JSON.stringify(collectSpecs()));

  try {
    const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
    const method = editingId ? 'PUT' : 'POST';
    const result = await api(url, { method, body: form });
    if (message) message.textContent = 'Produto salvo com sucesso.';
    if (!editingId) location.href = `/admin/editar-produto.html?id=${result.id}`;
    else loadForm();
  } catch (error) {
    if (message) message.textContent = error.message;
  }
});

document.getElementById('imageList')?.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.action === 'delete' && confirm('Excluir imagem?')) await api(`/api/admin/images/${button.dataset.id}`, { method: 'DELETE' });
  if (button.dataset.action === 'main') await api(`/api/admin/images/${button.dataset.id}/main`, { method: 'PUT' });
  loadForm();
});

loadForm().catch((error) => {
  console.error(error);
  const message = document.getElementById('message');
  if (message) message.textContent = error.message;
});
