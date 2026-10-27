async function api(url, options = {}) {
  const response = await fetch(url, options);
  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await response.json() : null;

  if (response.status === 401) {
    const isLoginPage = location.pathname.endsWith('/login.html');
    if (!isLoginPage) location.href = '/admin/login.html';
    throw new Error(data?.error || 'Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    throw new Error(data?.error || `Erro ${response.status} na requisição`);
  }

  return data;
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
      location.href = '/admin/dashboard.html';
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

document.getElementById('logout')?.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  location.href = '/admin/login.html';
});

async function loadDashboard() {
  if (!document.getElementById('totalProducts')) return;
  const data = await api('/api/admin/dashboard');
  totalProducts.textContent = data.totalProducts;
  activeProducts.textContent = data.activeProducts;
  totalFaqs.textContent = data.totalFaqs;
  const totalCategories = document.getElementById('totalCategories');
  if (totalCategories) totalCategories.textContent = data.totalCategories ?? 0;
}
loadDashboard();
