function settingsFields(data = {}) {
  settingsForm.innerHTML = `
    <label>Nome da loja<input name="store_name" value="${escapeHtml(data.store_name || '')}" maxlength="80"></label>
    <label>Logo atual<input name="logo_url" value="${escapeHtml(data.logo_url || '')}" placeholder="/uploads/logo.jpg"></label>
    <label>Novo logo<input name="logo" type="file" accept="image/*"></label>
    <label>Imagem de fundo atual<input name="hero_image_url" value="${escapeHtml(data.hero_image_url || '')}" placeholder="/uploads/fundo.jpg"></label>
    <label>Nova imagem de fundo<input name="hero_image" type="file" accept="image/*"></label>
    <label>WhatsApp<input name="whatsapp" value="${escapeHtml(data.whatsapp || '')}" placeholder="5511999999999"></label>
    <label>Instagram<input name="instagram" value="${escapeHtml(data.instagram || '')}" placeholder="https://instagram.com/sualoja"></label>
    <label>Cidade<input name="city" value="${escapeHtml(data.city || '')}"></label>
    <label>Frase principal<input name="headline" value="${escapeHtml(data.headline || '')}" maxlength="120"></label>
    <label>Descrição<textarea name="description" rows="3">${escapeHtml(data.description || '')}</textarea></label>
    <label>Cor principal<input name="primary_color" type="color" value="${escapeHtml(data.primary_color || '#11c5a6')}"></label>
    <label>Cor secundária<input name="secondary_color" type="color" value="${escapeHtml(data.secondary_color || '#101828')}"></label>
    <button class="admin-btn form-submit">Salvar configurações</button>`;
}

async function loadSettings() {
  settingsFields(await api('/api/admin/settings'));
  loadFaqs();
}

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/admin/settings', { method: 'PUT', body: new FormData(settingsForm) });
    message.textContent = 'Configurações salvas.';
  } catch (error) {
    message.textContent = error.message;
  }
});

function faqRow(faq = {}) {
  return `<article class="faq-row" data-id="${escapeHtml(faq.id || '')}">
    <input name="question" placeholder="Pergunta" value="${escapeHtml(faq.question || '')}">
    <textarea name="answer" placeholder="Resposta">${escapeHtml(faq.answer || '')}</textarea>
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

const passwordForm = document.getElementById('passwordForm');
if (passwordForm) {
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const passwordMessage = document.getElementById('passwordMessage');
    const data = Object.fromEntries(new FormData(passwordForm));

    if (data.newPassword !== data.confirmPassword) {
      passwordMessage.textContent = 'A confirmação não confere com a nova senha.';
      return;
    }

    try {
      await api('/api/admin/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      });
      passwordForm.reset();
      passwordMessage.textContent = 'Senha alterada com sucesso.';
    } catch (error) {
      passwordMessage.textContent = error.message;
    }
  });
}
