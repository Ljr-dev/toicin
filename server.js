const express = require('express');
const path = require('path');
const session = require('express-session');
const { db, get } = require('./src/db');
const { initDb } = require('./src/initDb');
const { SqliteSessionStore } = require('./src/sessionStore');
const publicRoutes = require('./src/routes/publicRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || (isProduction ? null : 'dev-secret-nao-use-em-producao');

if (!SESSION_SECRET) {
  console.error('SESSION_SECRET é obrigatório quando NODE_ENV=production.');
  process.exit(1);
}

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionTtl = 1000 * 60 * 60 * 8;
app.use(session({
  name: 'loja.sid',
  store: new SqliteSessionStore({ ttl: sessionTtl }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: sessionTtl }
}));

app.get('/health', async (req, res) => {
  try {
    await get('SELECT 1 AS ok');
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  } catch (error) {
    res.status(503).json({ status: 'error' });
  }
});

function requireAdminPage(req, res, next) {
  if (req.path === '/login.html' || req.path === '/' || req.path === '') {
    return next();
  }
  if (!req.session.adminId) return res.redirect('/admin/login.html');
  return next();
}

app.use('/admin', requireAdminPage);
app.get('/admin', (req, res) => res.redirect(req.session.adminId ? '/admin/dashboard.html' : '/admin/login.html'));

const uploadsDir = path.join(__dirname, 'public', 'uploads');
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    const normalized = filePath.split(path.sep).join('/');
    if (normalized.includes('/public/uploads/')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (normalized.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', uploadRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Recurso não encontrado' }));

app.get('*', (req, res, next) => {
  if (path.extname(req.path) || !req.accepts('html')) return next();
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).type('html').send('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Página não encontrada</title><body style="font-family:system-ui,sans-serif;padding:48px;text-align:center"><h1>404</h1><p>Página não encontrada.</p><p><a href="/">Voltar para a loja</a></p></body></html>');
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  let status = error.status || error.statusCode;
  if (!status) status = error.name === 'MulterError' ? 400 : 500;

  console.error(`[erro] ${req.method} ${req.originalUrl}:`, error.message);
  const message = status >= 500 ? 'Erro interno do servidor' : error.message || 'Requisição inválida';
  if (status >= 500 && process.env.NODE_ENV !== 'production') {
    return res.status(status).json({ error: message, detail: error.stack });
  }
  return res.status(status).json({ error: message });
});

initDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Loja rodando em http://localhost:${PORT} (upload: ${uploadsDir})`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} recebido, encerrando...`);
      server.close(() => {
        db.close(() => process.exit(0));
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((error) => {
    console.error('Erro ao iniciar banco de dados:', error);
    process.exit(1);
  });
