# loja-generica

Vitrine digital para **qualquer tipo de produto** (eletrônicos, roupas, alimentos, cosméticos, veículos, serviços etc.), com catálogo público, painel administrativo e deploy em Docker.

Cada instância é personalizada pelo próprio painel: nome, logo, imagem de fundo, cores, WhatsApp, Instagram, cidade, textos, categorias, produtos, especificações e perguntas frequentes. O mesmo código atende vários clientes.

## Requisitos

- Node.js 18 ou superior (Docker usa Node 22)
- npm

## Como rodar localmente

```bash
npm install
npm start
```

Acesse `http://localhost:3000`.

O banco `database.sqlite` é criado automaticamente no primeiro start. Para usar outro caminho, defina `DB_PATH`.

Painel: `http://localhost:3000/admin/login.html`

```text
email: admin@admin.com
senha: admin123
```

> Troque a senha e defina `SESSION_SECRET` antes de publicar em produção.

## O que é configurável no painel

| Área | Conteúdo |
|---|---|
| Configurações | nome da loja, logo, imagem de fundo, WhatsApp, Instagram, cidade, frase principal, descrição, cor principal e secundária |
| Categorias | criar, renomear e excluir categorias (a exclusão é bloqueada se houver produtos na categoria) |
| Produtos | nome, categoria, preço, descrições, status e imagens (até 12 por envio) |
| Especificações | pares **característica / valor** livres por produto (Cor, Tamanho, Voltagem, Material, Validade, Garantia...) |
| Perguntas frequentes | perguntas e respostas exibidas na home, na página do produto e na página de FAQ |

Preço `0` é exibido como **“Sob consulta”** na loja.

## Carrinho e finalização pelo WhatsApp

O visitante adiciona produtos direto na vitrine ou na página do produto, revisa quantidades e informa nome/observações em `/carrinho.html`. O botão **Finalizar compra no WhatsApp** monta a mensagem com os itens, quantidades, total e dados do cliente e abre o WhatsApp cadastrado em **Configurações**.

O carrinho fica salvo no navegador do cliente (`localStorage`); nenhum pedido é gravado no servidor. Se o WhatsApp não estiver configurado, a finalização fica desabilitada.

## Catálogo de demonstração

Para popular a loja com 22 produtos de exemplo (8 categorias, sem imagens — o site mostra o placeholder até você subir as fotos):

```bash
node scripts/seed-demo.js            # cria categorias e produtos que ainda não existem
node scripts/seed-demo.js --reset    # remove apenas os produtos de demonstração
```

No Docker:

```bash
docker compose exec loja node scripts/seed-demo.js
```

O script é idempotente: rodar de novo não duplica nada, e a categoria padrão `Geral` é removida quando fica vazia.

## Tratamento automático de imagens

- Produto: JPEG 4:3 em `1200 x 900 px`, fundo branco, sem cortar o produto.
- Logo: até `500 x 500 px`.
- Imagem de fundo (hero): `1920 x 1080 px`.

## Docker (produção)

Arquivos: `Dockerfile`, `docker-compose.yml`, `.env.example` e `deploy/nginx-subdominio.conf`.

### 1. Preparar o projeto na VPS

```bash
mkdir -p /opt/loja && cd /opt/loja
git clone <repositorio> app && cd app
cp .env.example .env
# edite o .env e gere a chave:
openssl rand -hex 32
```

`.env`:

```env
SESSION_SECRET=<chave gerada>
APP_PORT=3200
TZ=America/Sao_Paulo
```

### 2. Subir o container

```bash
mkdir -p data/uploads
sudo chown -R 1000:1000 data
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3200/health
```

O container escuta apenas em `127.0.0.1:${APP_PORT}`. Quem publica é o Nginx.

### 3. Publicar no subdomínio

```bash
sudo cp deploy/nginx-subdominio.conf /etc/nginx/sites-available/loja
sudo nano /etc/nginx/sites-available/loja   # ajuste server_name e proxy_pass
sudo ln -s /etc/nginx/sites-available/loja /etc/nginx/sites-enabled/loja
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d SEU-SUBDOMINIO.exemplo.com.br
```

O `client_max_body_size 20m` do template é necessário para upload de imagens (limite de 12 MB por arquivo no app).

### Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | em `production` exige `SESSION_SECRET` e usa cookies `Secure` atrás de proxy |
| `PORT` | `3000` | porta interna do container |
| `SESSION_SECRET` | — | **obrigatório em produção**; assina o cookie de sessão |
| `DB_PATH` | `./database.sqlite` | caminho do SQLite (no container: `/app/data/database.sqlite`) |
| `APP_PORT` | `3200` | porta publicada no host pelo Compose |

## Backup e migração de dados

O que importa está em dois lugares:

- `data/database.sqlite` — banco (configurações, produtos, categorias, FAQs, sessões)
- `data/uploads/` — imagens enviadas

Backup:

```bash
docker compose exec loja node -e "require('./src/db').db.run('PRAGMA wal_checkpoint(FULL)')"
sudo tar czf backup-loja-$(date +%F).tar.gz data
```

Migrar uma instância antiga: copie `database.sqlite` e `public/uploads/*` para `data/` e `data/uploads/` respectivamente, ajustando o dono para UID 1000.

Na primeira subida, os campos antigos de veículos (`motor`, `bateria`, `autonomia`...) são copiados automaticamente para a nova tabela de especificações.

## Estrutura

```text
server.js
Dockerfile
docker-compose.yml
.env.example
deploy/
  nginx-subdominio.conf
data/               (fora do Git, criado no deploy)
database.sqlite     (fora do Git, criado no start)
public/
  index.html  catalogo.html  produto.html  faq.html  carrinho.html
  img/  css/  js/  uploads/
  admin/            (login, dashboard, produtos, categorias, configurações)
src/
  db.js  initDb.js  sessionStore.js  asyncHandler.js  imageProcessor.js
  routes/ (publicRoutes, adminRoutes, uploadRoutes)
```

## Rotas

Públicas:

- `GET /health`
- `GET /api/settings`
- `GET /api/categories`
- `GET /api/products` (`?category=slug`)
- `GET /api/products/:slug` (inclui imagens, especificações e FAQs)
- `GET /api/faqs`

Admin (sessão obrigatória, exceto login):

- `POST /api/admin/login` / `POST /api/admin/logout`
- `GET /api/admin/dashboard`
- `GET|POST /api/admin/products`, `GET|PUT|DELETE /api/admin/products/:id`
- `POST /api/admin/products/:id/images`
- `DELETE /api/admin/images/:id`, `PUT /api/admin/images/:id/main`
- `GET|POST /api/admin/categories`, `PUT|DELETE /api/admin/categories/:id`
- `GET|PUT /api/admin/settings`
- `PUT /api/admin/password`
- `GET|POST /api/admin/faqs`, `PUT|DELETE /api/admin/faqs/:id`
