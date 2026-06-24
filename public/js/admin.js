async function api(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) location.href = '/admin/login.html';
  if (!response.ok) throw new Error((await response.json()).error || 'Erro na requisicao');
  return response.json();
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
}
loadDashboard();
