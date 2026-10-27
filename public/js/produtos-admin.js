async function loadAdminProducts() {
  const products = await api('/api/admin/products');
  productsTable.innerHTML = products.map((product) => `<tr>
    <td>${product.main_image ? `<img class="table-img" src="${escapeHtml(product.main_image)}" alt="">` : '-'}</td>
    <td><strong>${escapeHtml(product.name)}</strong><br><small>${priceLabel(product.price)}</small></td>
    <td>${escapeHtml(product.category_name || '-')}</td>
    <td>${product.status === 'active' ? 'Ativo' : 'Inativo'}</td>
    <td><a href="/admin/editar-produto.html?id=${escapeHtml(product.id)}">Editar</a>
    <button data-id="${escapeHtml(product.id)}" data-action="toggle">${product.status === 'active' ? 'Desativar' : 'Ativar'}</button>
    <button data-id="${escapeHtml(product.id)}" data-action="delete">Excluir</button></td>
  </tr>`).join('') || '<tr><td colspan="5">Nenhum produto cadastrado.</td></tr>';
}

productsTable.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.id;

  try {
    if (button.dataset.action === 'delete' && confirm('Excluir este produto?')) {
      await api(`/api/admin/products/${id}`, { method: 'DELETE' });
    }
    if (button.dataset.action === 'toggle') {
      const product = await api(`/api/admin/products/${id}`);
      const form = new FormData();
      form.set('name', product.name);
      form.set('category_id', product.category_id ?? '');
      form.set('price', product.price ?? '');
      form.set('short_description', product.short_description || '');
      form.set('full_description', product.full_description || '');
      form.set('status', product.status === 'active' ? 'inactive' : 'active');
      form.set('specs', JSON.stringify(product.specs || []));
      await api(`/api/admin/products/${id}`, { method: 'PUT', body: form });
    }
    loadAdminProducts();
  } catch (error) {
    alert(error.message);
  }
});

loadAdminProducts().catch((error) => {
  console.error(error);
  if (typeof message !== 'undefined') message.textContent = error.message;
});
