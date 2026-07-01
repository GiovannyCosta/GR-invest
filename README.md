# GR Invest

[![Netlify Status](https://api.netlify.com/api/v1/badges/a9d7e035-f5c5-4c28-9427-194a743b6b65/deploy-status)](https://app.netlify.com/projects/gr-invest/deploys)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=111)
![Supabase](https://img.shields.io/badge/Supabase-database-3ecf8e?logo=supabase&logoColor=fff)
![Netlify](https://img.shields.io/badge/Netlify-deploy-00c7b7?logo=netlify&logoColor=fff)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-05668d)

O GR Invest e um dashboard financeiro pessoal para registrar compras, acompanhar patrimonio, visualizar distribuicao da carteira, controlar proventos e consultar o historico de compras.

O projeto foi feito com HTML, CSS e JavaScript puro. Nao existe framework frontend nem etapa obrigatoria de build para rodar localmente. O Netlify e usado para deploy e para as functions seguras de gravacao no Supabase.

## Como Funciona

O dashboard tem duas areas principais:

- `Inicio`: mostra resumo da carteira, graficos, evolucao do patrimonio, ativos ao vivo e historico de compras.
- `Compras`: abre o formulario para cadastrar ou editar compras de FIIs, acoes e renda fixa.

Ao abrir o app, o `script.js`:

1. Le as chaves publicas do `config.js`.
2. Conecta no Supabase com a chave anon.
3. Busca as compras salvas na tabela `compras`.
4. Busca cotacoes e CDI quando possivel.
5. Atualiza os cards, graficos, tabela e proventos.

## Compras

A tela `Compras` permite cadastrar tres tipos de ativo:

- `FIIs`: exige ticker, preco, quantidade, data, comprador e senha.
- `Acoes`: exige ticker, preco, quantidade, data, comprador e senha.
- `CDB Inter`: usa o ticker interno `CDBINTERDI`, quantidade `1` e o campo de preco como valor aplicado.

Antes de salvar FIIs ou acoes, o app consulta a Brapi para confirmar se o ticker existe. Se o ticker nao for encontrado, a compra nao e salva.

Campos usados em cada compra:

```json
{
  "ticker": "CPTS11",
  "preco_compra": 8.04,
  "quantidade": 10,
  "data_compra": "2026-06-02",
  "comprador": "Giovanny"
}
```

O comprador precisa ser `Giovanny` ou `Rafaela`. A senha nao e validada no navegador: ela e enviada para a Netlify Function `netlify/functions/compras.js`, que compara com as variaveis `GIOVANNY_PASSWORD` ou `RAFAELA_PASSWORD`.

## Edicao e Exclusao

No historico de compras, cada compra real tem botoes de editar e excluir.

- `Editar`: carrega a compra no formulario, muda o botao para `Atualizar compra` e salva via action `update`.
- `Excluir`: pede a senha do comprador, confirma a exclusao e chama a action `delete`.

As compras virtuais aparecem como `Ajuste` e nao possuem botoes de edicao/exclusao. Hoje existe um ajuste virtual para saldo antigo do CDB Inter, definido em `saldoAntigoCdbInter`.

## Historico de Compras

A tabela `Compras` mostra as compras em ordem decrescente de data.

Por padrao, aparecem apenas as ultimas 5 compras. O botao `Ver historico completo` alterna entre:

- ultimas 5 compras;
- historico completo filtrado.

Filtros disponiveis:

- ativo;
- data;
- preco minimo;
- preco maximo;
- comprador.

O botao `Limpar` remove todos os filtros. O contador ao lado do titulo mostra quantas compras estao visiveis ou quantas foram encontradas com os filtros.

## Resumo

O painel `Resumo` agrega a carteira inteira, incluindo o ajuste virtual do CDB Inter.

Ele exibe:

- `Total investido`: soma de `precoCompra * quantidade`.
- `Total de acoes`: soma das quantidades cadastradas.
- `Proventos recebidos`: soma dos proventos ja recebidos.
- `Patrimonio + proventos`: valor atual estimado da carteira mais proventos recebidos.

Para FIIs e acoes, o valor atual usa a cotacao de mercado quando disponivel. Se nao houver cotacao, o app usa o preco de compra como fallback. Para o CDB Inter, o valor atual e calculado com base em CDI, dias uteis, IOF e IR estimados.

## Meta da Carteira

No card `Meta`, voce informa:

- valor alvo;
- mes limite.

O app salva essa meta no `localStorage` usando a chave `gr-invest-meta-carteira`. A partir disso, ele calcula:

- percentual atingido;
- quanto falta;
- aporte mensal necessario ate o prazo, quando o mes limite foi preenchido.

## Graficos

Os graficos sao desenhados em `canvas`, sem biblioteca externa.

### Carteira Geral

Mostra a distribuicao da carteira por classe:

- FIIs;
- Acoes;
- Renda fixa.

O total usado e o valor atual estimado da carteira.

### FIIs

Mostra somente a participacao dos fundos imobiliarios na carteira. A legenda indica percentual e valor por FII.

### Acoes

Mostra somente a participacao das acoes na carteira. A legenda indica percentual e valor por acao.

### Compradores

Mostra a distribuicao das compras entre Giovanny e Rafaela. Esse grafico usa o valor comprado, nao necessariamente o valor de mercado atual.

### Maior Participacao

O bloco de barras muda conforme a aba selecionada:

- na aba geral, mostra participacao por classe;
- na aba FIIs, por FII;
- na aba acoes, por acao;
- na aba compradores, por pessoa.

## Evolucao do Patrimonio

O grafico `Evolucao do Patrimonio` e um grafico composto: ele compara o aporte mensal com a meta de R$ 1.200 e, ao mesmo tempo, mostra a evolucao acumulada do patrimonio estimado.

Controles:

- periodo: 6, 12 ou 24 meses;
- tipo: todos os tipos, FIIs, acoes ou renda fixa.

Para cada mes, o app calcula:

- compras acumuladas ate o fim daquele mes;
- valor aplicado acumulado;
- valor de mercado estimado;
- ganho de capital positivo;
- aporte feito naquele mes;
- tipos comprados no mes;
- carteira acumulada ate o mes.

O grafico usa duas escalas independentes:

- eixo esquerdo: `Aporte do mes`, usado pelas barras verdes e pela meta mensal;
- eixo direito: `Patrimonio estimado`, usado pela linha azul/ciano;
- linha tracejada: meta mensal fixa de R$ 1.200.

Essa separacao evita que o patrimonio acumulado, que costuma ser muito maior, esmague visualmente as barras de aporte mensal.

O tooltip do grafico funciona como detalhamento do mes focado. Ele mostra aporte do mes, status da meta, patrimonio estimado, valor aplicado, ganho de capital, tipos comprados no mes e carteira acumulada.

## Proventos

A aba `Proventos` possui tres blocos:

- `Historico de proventos`;
- `Proximos pagamentos`;
- `Estimativa de proventos`.

O app busca proventos de FIIs na Brapi usando `/api/v2/fii/dividends`. A consulta olha aproximadamente:

- 12 meses para tras;
- 8 meses para frente.

Para calcular se voce tinha direito a um provento, o app usa a quantidade de cotas ate a data-base. Se a data-base nao vier da API, usa a data atual como referencia.

## Proventos Manuais

Voce tambem pode adicionar proventos manualmente.

Campos:

- ativo;
- data de pagamento;
- valor recebido;
- comprador;
- senha.

O provento manual fica salvo localmente e pode ser sincronizado com o Supabase pela function `netlify/functions/proventos-manuais.js`.

O botao `Sincronizar` carrega proventos remotos, envia proventos pendentes e mescla os registros locais com os do banco.

## Estimativa de Proventos

A estimativa usa o ultimo provento recebido de cada FII como base para projetar o proximo pagamento.

Ela nao e uma previsao garantida. E apenas uma repeticao simples do ultimo valor conhecido, avancando a data para o proximo mes disponivel.

## Ativos na Carteira

O painel `Ativos na carteira` mostra cards por ticker.

Para FIIs e acoes, cada card exibe:

- ticker;
- percentual na carteira;
- valor de mercado;
- quantidade;
- ganho ou perda;
- preco medio;
- custo total;
- preco de mercado atual.

Para o CDB Inter, o card exibe:

- aplicacoes;
- rendimento liquido;
- valor bruto;
- valor liquido atual;
- IR estimado;
- IOF estimado;
- CDI diario;
- dias uteis.

As cotacoes sao atualizadas automaticamente a cada 15 minutos quando ha carteira cadastrada. O botao de atualizar no topo tambem recarrega a carteira e os dados.

## Fontes de Dados

- Supabase: compras e proventos manuais sincronizados.
- Brapi: cotacoes, dados dos ativos e proventos de FIIs.
- Banco Central: CDI diario para calculo do CDB Inter.
- LocalStorage: meta da carteira e proventos manuais pendentes/localizados no navegador.

## Estrutura do Projeto

```text
GR-invest/
+-- index.html
+-- styles.css
+-- script.js
+-- build-config.js
+-- config.example.js
+-- netlify.toml
+-- netlify/functions/compras.js
+-- netlify/functions/proventos-manuais.js
+-- assets/GR-logo.png
+-- README.md
```

## Tecnologias

- HTML5
- CSS3
- JavaScript vanilla
- Supabase
- Netlify Functions
- Brapi
- API SGS do Banco Central

## Como Rodar Localmente

Para abrir somente a interface, abra o arquivo `index.html` no navegador.

Para usar cadastro, edicao, exclusao e sincronizacao protegida por senha, rode com Netlify Dev, porque essas operacoes passam pelas Netlify Functions.

Crie um `config.js` na raiz:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://SUA_URL_DO_SUPABASE.supabase.co",
  SUPABASE_ANON_KEY: "SUA_ANON_KEY_DO_SUPABASE",
  BRAPI_TOKEN: "SUA_CHAVE_API_BRAPI"
};
```

O arquivo `config.js` nao deve ir para o GitHub. Ele ja esta no `.gitignore`.

## Banco de Dados

Tabela de compras:

```sql
create table if not exists public.compras (
  id uuid default gen_random_uuid() primary key,
  ticker text not null,
  preco_compra numeric not null,
  quantidade integer not null,
  data_compra date not null,
  comprador text not null
);

alter table public.compras enable row level security;

create policy "Permitir leitura publica das compras"
on public.compras
for select
to anon
using (true);
```

Tabela de proventos manuais:

```sql
create table if not exists public.proventos_manuais (
  id text primary key,
  ticker text not null,
  data_pagamento date not null,
  total numeric not null,
  comprador text not null,
  created_at timestamptz not null default now()
);

alter table public.proventos_manuais enable row level security;

create policy "Permitir leitura publica dos proventos manuais"
on public.proventos_manuais
for select
to anon
using (true);
```

As gravacoes nao devem ser liberadas diretamente para `anon`. Inserts, updates e deletes passam pelas Netlify Functions usando `SUPABASE_SERVICE_ROLE_KEY`.

## Deploy no Netlify

Configuracoes recomendadas:

```text
Branch to deploy: main
Base directory: deixe vazio
Build command: node build-config.js
Publish directory: .
Functions directory: netlify/functions
```

Variaveis de ambiente:

```text
SUPABASE_URL=https://SUA_URL_DO_SUPABASE.supabase.co
SUPABASE_ANON_KEY=SUA_ANON_KEY_DO_SUPABASE
BRAPI_TOKEN=SUA_CHAVE_API_BRAPI
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_DO_SUPABASE
GIOVANNY_PASSWORD=SENHA_FORTE_DO_GIOVANNY
RAFAELA_PASSWORD=SENHA_FORTE_DA_RAFAELA
```

Durante o deploy, `build-config.js` gera o `config.js` com as variaveis publicas. As variaveis sensiveis ficam apenas no servidor do Netlify.

## Seguranca

- A chave `anon public` fica no frontend apenas para leitura.
- A chave `service_role` fica somente nas Netlify Functions.
- Senhas reais nunca devem ser commitadas.
- A comparacao de senha nas functions usa `crypto.timingSafeEqual`.
- O ideal e manter policies publicas apenas de `SELECT` no Supabase.
