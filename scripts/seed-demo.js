// Popula a loja com um catálogo de demonstração (22 produtos, sem imagens).
// Uso: node scripts/seed-demo.js [--reset]
//   --reset  remove apenas os produtos de demonstração (e suas especificações)
const { run, get, db } = require('../src/db');
const { initDb } = require('../src/initDb');

const categories = [
  ['Eletrônicos', 'eletronicos'],
  ['Roupas e Acessórios', 'roupas-e-acessorios'],
  ['Calçados', 'calcados'],
  ['Casa e Decoração', 'casa-e-decoracao'],
  ['Beleza e Cuidados', 'beleza-e-cuidados'],
  ['Esporte e Lazer', 'esporte-e-lazer'],
  ['Pet Shop', 'pet-shop'],
  ['Papelaria e Escritório', 'papelaria-e-escritorio']
];

const products = [
  {
    name: 'Fone de Ouvido Bluetooth com Cancelamento de Ruído',
    category: 'eletronicos',
    price: 349.9,
    short: 'Cancelamento ativo de ruído, até 30 horas de bateria e conexão multiponto.',
    full: 'Fone over-ear com cancelamento ativo de ruído e microfone duplo para chamadas. A bateria rende até 30 horas com o ANC desligado e 22 horas com ele ligado. Dobra para guardar na mochila e acompanha estojo rígido.',
    specs: [['Conexão', 'Bluetooth 5.3'], ['Bateria', 'até 30 h'], ['Cancelamento de ruído', 'Ativo (ANC)'], ['Peso', '240 g']]
  },
  {
    name: 'Smartwatch Esportivo com GPS',
    category: 'eletronicos',
    price: 799,
    short: 'Tela AMOLED, GPS integrado, monitor cardíaco e 14 dias de autonomia.',
    full: 'Relógio inteligente com tela AMOLED de 1,43 polegadas, GPS integrado e mais de 100 modos esportivos. Acompanha sono, frequência cardíaca e oxigenação. Resistente a água até 5 ATM.',
    specs: [['Tela', 'AMOLED 1,43"'], ['Bateria', 'até 14 dias'], ['Resistência', '5 ATM'], ['GPS', 'Integrado']]
  },
  {
    name: 'Caixa de Som Portátil 20W à Prova de Água',
    category: 'eletronicos',
    price: 289.9,
    short: 'Som potente para levar para qualquer lugar, com 12 horas de autonomia.',
    full: 'Caixa de som portátil de 20 W com graves reforçados, conexão Bluetooth 5.0 e entrada para cartão microSD. Certificação IPX7 permite uso na piscina e na praia.',
    specs: [['Potência', '20 W'], ['Autonomia', 'até 12 h'], ['Proteção', 'IPX7'], ['Entradas', 'Bluetooth, microSD, P2']]
  },
  {
    name: 'Carregador Turbo GaN 65W com 3 Portas',
    category: 'eletronicos',
    price: 179.9,
    short: 'Carrega notebook, celular e fone ao mesmo tempo em um único plugue.',
    full: 'Carregador de parede com tecnologia GaN, compacto e com três saídas (2 USB-C e 1 USB-A). Distribui até 65 W entre os dispositivos e possui proteção contra sobrecarga.',
    specs: [['Potência', '65 W'], ['Portas', '2 USB-C + 1 USB-A'], ['Tecnologia', 'GaN'], ['Compatibilidade', 'bivolt']]
  },
  {
    name: 'Camiseta Básica de Algodão Premium',
    category: 'roupas-e-acessorios',
    price: 79.9,
    short: 'Algodão penteado 30.1, modelagem confortável e acabamento reforçado.',
    full: 'Camiseta de corte regular em algodão penteado, com gola reforçada que não deforma na lavagem. Disponível em cores neutras, combina com qualquer look.',
    specs: [['Tamanhos', 'P, M, G, GG'], ['Composição', '100% algodão'], ['Modelagem', 'Regular'], ['Cores', 'Preto, branco, cinza']]
  },
  {
    name: 'Jaqueta Corta-Vento Impermeável',
    category: 'roupas-e-acessorios',
    price: 249.9,
    short: 'Leve, impermeável e com capuz ajustável para dias de chuva e vento.',
    full: 'Jaqueta em tecido ripstop com costura selada e capuz ajustável. Possui bolsos com zíper e pode ser compactada dentro do próprio bolso.',
    specs: [['Tamanhos', 'P, M, G, GG'], ['Impermeabilidade', 'Sim'], ['Capuz', 'Ajustável'], ['Peso', '310 g']]
  },
  {
    name: 'Mochila Casual 22L com Compartimento para Notebook',
    category: 'roupas-e-acessorios',
    price: 219,
    short: 'Compartimento acolchoado para notebook até 15,6 polegadas e bolso térmico lateral.',
    full: 'Mochila urbana de 22 litros em nylon resistente, com alças acolchoadas, bolso para notebook de até 15,6 polegadas e porta USB externa para carregamento.',
    specs: [['Capacidade', '22 L'], ['Notebook', 'até 15,6"'], ['Material', 'Nylon 600D'], ['Porta USB', 'Sim']]
  },
  {
    name: 'Boné Aba Curva com Ajuste Traseiro',
    category: 'roupas-e-acessorios',
    price: 59.9,
    short: 'Bordado discreto, tela respirável e tira ajustável em metal.',
    full: 'Boné em algodão com aba curva, painéis de tela para ventilação e fecho de metal ajustável. Tamanho único que serve na maioria das cabeças.',
    specs: [['Tamanho', 'Único'], ['Material', 'Algodão'], ['Ajuste', 'Tira de metal'], ['Cor', 'Variadas']]
  },
  {
    name: 'Tênis de Corrida Leve com Amortecimento',
    category: 'calcados',
    price: 399.9,
    short: 'Entressola em EVA de alto retorno e cabedal respirável para treinos diários.',
    full: 'Tênis desenvolvido para corridas de 5 a 15 km, com entressola em EVA de dupla densidade e cabedal em mesh respirável. Solado em borracha com sulcos de flexão.',
    specs: [['Numeração', '38 ao 44'], ['Peso', '240 g (par, nº 40)'], ['Entressola', 'EVA dupla densidade'], ['Indicação', 'Corrida e caminhada']]
  },
  {
    name: 'Sandália de Conforto com Palmilha Anatômica',
    category: 'calcados',
    price: 129.9,
    short: 'Palmilha macia e tiras ajustáveis, ideal para uso prolongado.',
    full: 'Sandália em couro sintético com palmilha anatômica em EVA e tiras ajustáveis no calcanhar e no peito do pé. Solado leve e antiderrapante.',
    specs: [['Numeração', '34 ao 40'], ['Material', 'Couro sintético'], ['Palmilha', 'Anatômica'], ['Solado', 'Antiderrapante']]
  },
  {
    name: 'Bota de Couro Adventure',
    category: 'calcados',
    price: 549,
    short: 'Couro legítimo, solado tratorado e costura reforçada para uso pesado.',
    full: 'Bota em couro legítimo com forro em tecido, solado tratorado de alta aderência e biqueira estruturada. Indicada para trilhas, moto e trabalho em campo.',
    specs: [['Numeração', '38 ao 45'], ['Material', 'Couro legítimo'], ['Solado', 'Tratorado'], ['Indicação', 'Trilha, moto e trabalho']]
  },
  {
    name: 'Luminária de Mesa LED Articulada',
    category: 'casa-e-decoracao',
    price: 169.9,
    short: 'Três temperaturas de cor, braço articulado e saída USB para carregar o celular.',
    full: 'Luminária de mesa com 8 W de potência em LED, três temperaturas de cor (quente, neutra e fria) e ajuste de intensidade por toque. Braço articulado em alumínio e base estável.',
    specs: [['Potência', '8 W'], ['Temperaturas', '3 (3000K, 4500K, 6000K)'], ['Alimentação', 'USB-C'], ['Saída extra', 'USB 5V']]
  },
  {
    name: 'Jogo de Toalhas 5 Peças 100% Algodão',
    category: 'casa-e-decoracao',
    price: 189.9,
    short: 'Alta absorção, toque macio e acabamento em barra dupla.',
    full: 'Conjunto com 2 toalhas de banho, 2 toalhas de rosto e 1 toalha de piso, todas em algodão penteado de alta gramatura. Lavável em máquina.',
    specs: [['Peças', '5'], ['Composição', '100% algodão'], ['Gramatura', '480 g/m²'], ['Cor', 'Cinza mescla']]
  },
  {
    name: 'Kit 3 Vasos de Cerâmica Decorativos',
    category: 'casa-e-decoracao',
    price: 149.9,
    short: 'Três tamanhos para compor prateleiras e aparadores.',
    full: 'Conjunto de três vasos em cerâmica com acabamento fosco e base emborrachada. Acompanha pratos individuais e pode ser usado com plantas naturais ou secas.',
    specs: [['Peças', '3 vasos + 3 pratos'], ['Material', 'Cerâmica'], ['Tamanhos', '12, 16 e 20 cm'], ['Acabamento', 'Fosco']]
  },
  {
    name: 'Air Fryer Digital 5L com 8 Programas',
    category: 'casa-e-decoracao',
    price: 449,
    short: 'Cesto antiaderente de 5 litros, painel digital e timer de 60 minutos.',
    full: 'Fritadeira sem óleo com 1500 W de potência, cesto antiaderente de 5 litros e oito programas prontos. Painel digital com timer de até 60 minutos e desligamento automático.',
    specs: [['Capacidade', '5 L'], ['Potência', '1500 W'], ['Programas', '8'], ['Timer', 'até 60 min']]
  },
  {
    name: 'Sérum Facial de Vitamina C 30ml',
    category: 'beleza-e-cuidados',
    price: 129.9,
    short: 'Vitamina C estabilizada com ácido hialurônico, vegano e sem perfume.',
    full: 'Sérum facial com 10% de vitamina C estabilizada e ácido hialurônico. Textura leve de rápida absorção, indicado para uso diário pela manhã. Frasco âmbar de 30 ml com conta-gotas.',
    specs: [['Volume', '30 ml'], ['Ativos', 'Vitamina C 10% e ácido hialurônico'], ['Indicação', 'Todos os tipos de pele'], ['Vegano', 'Sim']]
  },
  {
    name: 'Secador de Cabelo Íon 2100W com Difusor',
    category: 'beleza-e-cuidados',
    price: 279.9,
    short: 'Tecnologia íon, três temperaturas e duas velocidades com difusor incluso.',
    full: 'Secador profissional de 2100 W com emissão de íons para reduzir o frizz. Acompanha difusor, concentrador e cordão giratório de 1,8 m.',
    specs: [['Potência', '2100 W'], ['Temperaturas', '3'], ['Velocidades', '2'], ['Acessórios', 'Difusor e concentrador']]
  },
  {
    name: 'Kit Halteres Ajustáveis 20kg',
    category: 'esporte-e-lazer',
    price: 399,
    short: 'Dois halteres com anilhas removíveis para treinar em casa.',
    full: 'Kit com dois halteres e anilhas revestidas em PVC que somam 20 kg. Permite montar diferentes cargas conforme o exercício. Acompanha barra com pegada emborrachada.',
    specs: [['Peso total', '20 kg'], ['Revestimento', 'PVC'], ['Peças', '2 barras + anilhas'], ['Indicação', 'Treino em casa']]
  },
  {
    name: 'Tapete de Yoga Antiderrapante 6mm',
    category: 'esporte-e-lazer',
    price: 99.9,
    short: 'Material TPE, superfície antiderrapante e alça para transporte.',
    full: 'Tapete de yoga em TPE de 6 mm, com textura antiderrapante dos dois lados, livre de PVC e acompanhado de alça para transporte.',
    specs: [['Dimensões', '183 x 61 cm'], ['Espessura', '6 mm'], ['Material', 'TPE'], ['Acessório', 'Alça de transporte']]
  },
  {
    name: 'Cama Pet Redonda Média Lavável',
    category: 'pet-shop',
    price: 159.9,
    short: 'Almofada removível, tecido macio e base antiderrapante.',
    full: 'Cama pet redonda com bordas elevadas para apoiar a cabeça, almofada removível e capa lavável em máquina. Indicada para cães e gatos de porte pequeno a médio.',
    specs: [['Diâmetro', '60 cm'], ['Material', 'Algodão e plush'], ['Capa', 'Removível e lavável'], ['Base', 'Antiderrapante']]
  },
  {
    name: 'Caderno Executivo A5 com Capa Dura',
    category: 'papelaria-e-escritorio',
    price: 69.9,
    short: '200 folhas pautadas, capa dura e elástico de fechamento.',
    full: 'Caderno executivo formato A5 com capa dura revestida, 200 folhas pautadas de 90 g/m², marcador de página e elástico de fechamento. Ideal para reuniões e planejamento.',
    specs: [['Formato', 'A5 (14,8 x 21 cm)'], ['Folhas', '200 pautadas'], ['Gramatura', '90 g/m²'], ['Extras', 'Elástico e marcador']]
  },
  {
    name: 'Caneta Esferográfica Kit 12 Cores',
    category: 'papelaria-e-escritorio',
    price: 39.9,
    short: 'Ponta 0,7 mm, escrita macia e 12 cores diferentes.',
    full: 'Kit com 12 canetas esferográficas de ponta 0,7 mm em cores variadas. Tinta de secagem rápida e corpo emborrachado para maior conforto.',
    specs: [['Quantidade', '12 canetas'], ['Ponta', '0,7 mm'], ['Cores', '12'], ['Corpo', 'Emborrachado']]
  }
];

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seed() {
  await initDb();

  const categoryIds = {};
  for (const [name, slug] of categories) {
    let row = await get('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (!row) {
      const result = await run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
      row = { id: result.id };
      console.log(`categoria criada: ${name}`);
    }
    categoryIds[slug] = row.id;
  }

  let created = 0;
  for (const product of products) {
    const slug = slugify(product.name);
    const exists = await get('SELECT id FROM products WHERE slug = ?', [slug]);
    if (exists) continue;

    const result = await run(`INSERT INTO products
      (category_id, name, slug, price, short_description, full_description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')`, [
      categoryIds[product.category],
      product.name,
      slug,
      product.price,
      product.short,
      product.full
    ]);

    for (let index = 0; index < product.specs.length; index += 1) {
      const [label, value] = product.specs[index];
      await run('INSERT INTO product_specs (product_id, label, value, sort_order) VALUES (?, ?, ?, ?)', [
        result.id, label, value, index
      ]);
    }

    created += 1;
  }

  const emptyGeral = await get(`SELECT c.id FROM categories c WHERE c.slug = 'geral'
    AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id)`);
  if (emptyGeral) {
    await run('DELETE FROM categories WHERE id = ?', [emptyGeral.id]);
    console.log('categoria padrão vazia removida: Geral');
  }

  const total = await get('SELECT COUNT(*) AS c FROM products');
  const totalCategories = await get('SELECT COUNT(*) AS c FROM categories');
  console.log(`\n${created} produto(s) criado(s). Total na loja: ${total.c}`);
  console.log(`Categorias: ${totalCategories.c}`);
}

async function reset() {
  await initDb();
  let removed = 0;
  for (const product of products) {
    const row = await get('SELECT id FROM products WHERE slug = ?', [slugify(product.name)]);
    if (!row) continue;

    await run('DELETE FROM product_specs WHERE product_id = ?', [row.id]);
    await run('DELETE FROM product_images WHERE product_id = ?', [row.id]);
    await run('DELETE FROM products WHERE id = ?', [row.id]);
    removed += 1;
  }
  console.log(`${removed} produto(s) de demonstração removido(s).`);
}

const action = process.argv.includes('--reset') ? reset : seed;

action()
  .then(() => db.close())
  .catch((error) => {
    console.error('Falha ao popular a loja:', error.message);
    db.close(() => process.exit(1));
  });
