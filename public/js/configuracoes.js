function settingsFields(data = {}) {
  settingsForm.innerHTML = `
    <label>Nome da loja<input name="store_name" value="${data.store_name || ''}"></label>
    <label>Logo atual<input name="logo_url" value="${data.logo_url || ''}" placeholder="/uploads/logo.png"></label>
    <label>Novo logo<input name="logo" type="file" accept="image/*"></label>
    <label>Imagem de fundo atual<input name="hero_image_url" value="${data.hero_image_url || ''}" placeholder="/uploads/fundo.jpg"></label>
    <label>Nova imagem de fundo<input name="hero_image" type="file" accept="image/*"></label>
    <label>WhatsApp<input name="whatsapp" value="${data.whatsapp || ''}"></label>
    <label>Instagram<input name="instagram" value="${data.instagram || ''}"></label>
    <label>Cidade<input name="city" value="${data.city || ''}"></label>
    <label>Frase principal<input name="headline" value="${data.headline || ''}"></label>
    <label>Descricao<textarea name="description">${data.description || ''}</textarea></label>
    <label>Cor principal<input name="primary_color" type="color" value="${data.primary_color || '#11c5a6'}"></label>
    <label>Cor secundaria<input name="secondary_color" type="color" value="${data.secondary_color || '#101828'}"></label>
    <button class="admin-btn">Salvar configuracoes</button>`;
}

async function loadSettings() {
  settingsFields(await api('/api/admin/settings'));
  loadFaqs();
}

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await api('/api/admin/settings', { method: 'PUT', body: new FormData(settingsForm) });
  message.textContent = 'Configuracoes salvas.';
});

function faqRow(faq = {}) {
  return `<article class="faq-row" data-id="${faq.id || ''}">
    <input name="question" placeholder="Pergunta" value="${faq.question || ''}">
    <textarea name="answer" placeholder="Resposta">${faq.answer || ''}</textarea>
    <label class="check"><input name="active" type="checkbox" ${faq.active !== 0 ? 'checked' : ''}> Ativa</label>
    <button type="button" data-action="save">Salvar</button>
    ${faq.id ? '<button type="button" data-action="delete">Excluir</button>' : ''}
  </article>`;
}

async function loadFaqs() {
  const faqs = await api('/api/admin/faqs');
  faqList.innerHTML = faqs.map(faqRow).join('');
}

addFaq.addEventListener('click', () => {
  faqList.insertAdjacentHTML('afterbegin', faqRow());
});

faqList.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const row = button.closest('.faq-row');
  const body = {
    question: row.querySelector('[name="question"]').value,
    answer: row.querySelector('[name="answer"]').value,
    active: row.querySelector('[name="active"]').checked
  };
  if (button.dataset.action === 'save') {
    const id = row.dataset.id;
    await api(id ? `/api/admin/faqs/${id}` : '/api/admin/faqs', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
  if (button.dataset.action === 'delete' && confirm('Excluir pergunta?')) {
    await api(`/api/admin/faqs/${row.dataset.id}`, { method: 'DELETE' });
  }
  loadFaqs();
});

loadSettings();
