const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function loadAdminProducts() {
  const products = await api('/api/admin/products');
  productsTable.innerHTML = products.map((p) => `<tr>
    <td>${p.main_image ? `<img class="table-img" src="${p.main_image}" alt="">` : '-'}</td>
    <td><strong>${p.name}</strong><br><small>${money(p.price)}</small></td>
    <td>${p.category_name || '-'}</td><td>${p.status}</td>
    <td><a href="/admin/editar-produto.html?id=${p.id}">Editar</a>
    <button data-id="${p.id}" data-action="toggle">${p.status === 'active' ? 'Desativar' : 'Ativar'}</button>
    <button data-id="${p.id}" data-action="delete">Excluir</button></td>
  </tr>`).join('');
}

productsTable.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === 'delete' && confirm('Excluir este produto?')) {
    await api(`/api/admin/products/${id}`, { method: 'DELETE' });
  }
  if (button.dataset.action === 'toggle') {
    const product = await api(`/api/admin/products/${id}`);
    const form = new FormData();
    Object.entries(product).forEach(([key, value]) => {
      if (key !== 'images') form.append(key, value ?? '');
    });
    form.set('status', product.status === 'active' ? 'inactive' : 'active');
    await api(`/api/admin/products/${id}`, { method: 'PUT', body: form });
  }
  loadAdminProducts();
});

loadAdminProducts();
