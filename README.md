# loja-toicin

Sistema de vitrine digital para motos eletricas, bicicletas eletricas e scooters, com painel administrativo para produtos, imagens, perguntas frequentes e configuracoes da loja.

## Requisitos

- Node.js 18 ou superior
- npm

## Como instalar

```bash
npm install
```

## Como rodar

Modo producao/local:

```bash
npm start
```

Modo desenvolvimento com reinicio automatico:

```bash
npm run dev
```

Depois acesse:

```text
http://localhost:3000
```

O banco `database.sqlite` e criado automaticamente no primeiro start.

## Como acessar o painel

Abra:

```text
http://localhost:3000/admin/login.html
```

Usuario inicial:

```text
email: admin@admin.com
senha: admin123
```

## Como trocar nome, logo e WhatsApp

1. Entre no painel administrativo.
2. Acesse `Configuracoes`.
3. Altere nome da loja, logo, imagem de fundo, WhatsApp, Instagram, cidade, frase principal, descricao e cores.
4. Clique em `Salvar configuracoes`.

Esses dados alimentam a vitrine publica e permitem revender a mesma base para outro cliente apenas trocando as configuracoes, produtos e perguntas frequentes.

## Como cadastrar produtos

1. Entre no painel administrativo.
2. Acesse `Novo produto`.
3. Preencha categoria, nome, preco, descricoes, especificacoes, garantia, pagamento e status.
4. Envie uma ou mais imagens.
5. Salve o produto.

Para editar um produto, acesse `Produtos`, clique em `Editar` e altere os dados. Na edicao tambem e possivel adicionar imagens, excluir imagens e escolher a imagem principal.

## Tratamento automatico de imagens

Ao cadastrar ou editar produtos, o sistema aceita imagens grandes e faz o tratamento automaticamente:

- converte para JPG;
- ajusta no formato 4:3 sem cortar o produto;
- salva em `1200 x 900 px` com fundo branco quando a proporcao da foto for diferente;
- aplica compressao para deixar o site mais leve.

O logo enviado em `Configuracoes` tambem e otimizado automaticamente, limitado a `500 x 500 px`.

A imagem de fundo da pagina inicial e otimizada automaticamente em `1920 x 1080 px`.

## Estrutura

```text
server.js
package.json
database.sqlite
public/
  index.html
  produto.html
  catalogo.html
  faq.html
  admin/
  css/
  js/
  uploads/
src/
  db.js
  initDb.js
  routes/
    publicRoutes.js
    adminRoutes.js
    uploadRoutes.js
```

## Rotas principais

Publicas:

- `GET /api/settings`
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/categories`
- `GET /api/faqs`

Admin:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/dashboard`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PUT /api/admin/products/:id`
- `DELETE /api/admin/products/:id`
- `POST /api/admin/products/:id/images`
- `DELETE /api/admin/images/:id`
- `PUT /api/admin/images/:id/main`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `GET /api/admin/faqs`
- `POST /api/admin/faqs`
- `PUT /api/admin/faqs/:id`
- `DELETE /api/admin/faqs/:id`
