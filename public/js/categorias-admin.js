const categoriesTable = document.getElementById('categoriesTable');
const categoryForm = document.getElementById('categoryForm');
const messageEl = document.getElementById('message');

function categoryRow(category) {
  return `<tr data-id="${escapeHtml(category.id)}">
    <td><input class="category-name" value="${escapeHtml(category.name)}" maxlength="60" aria-label="Nome da categoria"></td>
    <td><code>${escapeHtml(category.slug)}</code></td>
    <td>${Number(category.product_count || 0)}</td>
    <td>
      <button type="button" data-action="save">Salvar</button>
      <button type="button" data-action="delete">Excluir</button>
    </td>
  </tr>`;
}

async function loadCategories() {
  const categories = await api('/api/admin/categories');
  categoriesTable.innerHTML = categories.map(categoryRow).join('') || '<tr><td colspan="4">Nenhuma categoria cadastrada.</td></tr>';
}

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryForm.elements.name.value })
    });
    categoryForm.reset();
    messageEl.textContent = 'Categoria criada.';
    await loadCategories();
  } catch (error) {
    messageEl.textContent = error.message;
  }
});

categoriesTable.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  const id = row.dataset.id;

  try {
    if (button.dataset.action === 'save') {
      const name = row.querySelector('.category-name').value;
      await api(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      messageEl.textContent = 'Categoria atualizada.';
    }

    if (button.dataset.action === 'delete' && confirm('Excluir esta categoria?')) {
      await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
      messageEl.textContent = 'Categoria excluída.';
    }

    await loadCategories();
  } catch (error) {
    messageEl.textContent = error.message;
  }
});

loadCategories().catch((error) => {
  console.error(error);
  messageEl.textContent = error.message;
});
