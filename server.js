const express = require('express');
const path = require('path');
const session = require('express-session');
const { initDb } = require('./src/initDb');
const publicRoutes = require('./src/routes/publicRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'troque-esta-chave-em-producao',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

function requireAdminPage(req, res, next) {
  if (req.path === '/login.html' || req.path === '/' || req.path === '') {
    return next();
  }
  if (!req.session.adminId) return res.redirect('/admin/login.html');
  return next();
}

app.use('/admin', requireAdminPage);
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', uploadRoutes);

app.get('/admin', (req, res) => res.redirect('/admin/login.html'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Loja Toicin rodando em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao iniciar banco de dados:', error);
    process.exit(1);
  });
