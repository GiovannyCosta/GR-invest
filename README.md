# GR Invest
[![Netlify Status](https://api.netlify.com/api/v1/badges/a9d7e035-f5c5-4c28-9427-194a743b6b65/deploy-status)](https://app.netlify.com/projects/gr-invest/deploys)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=111)
![Supabase](https://img.shields.io/badge/Supabase-database-3ecf8e?logo=supabase&logoColor=fff)
![Netlify](https://img.shields.io/badge/Netlify-deploy-00c7b7?logo=netlify&logoColor=fff)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-05668d)

Dashboard simples para registrar compras de ativos, acompanhar o total investido e visualizar a distribuicao da carteira.

O projeto foi feito com HTML, CSS e JavaScript puro, sem framework e sem etapa de build. A ideia e manter o codigo leve, facil de entender.

## Preview

O GR Invest permite cadastrar compras com ticker, preco, quantidade, data e comprador. Depois disso, o painel mostra:

- resumo do total investido;
- quantidade total de acoes;
- evolucao mensal do patrimonio por periodo e tipo de ativo;
- ticket medio da carteira;
- tabela com todas as compras;
- grafico simples por ticker;
- icones SVG gerados automaticamente para cada ativo.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Supabase
- Brapi

## Funcionalidades

- Cadastro de compras de ativos.
- Listagem dos registros salvos no Supabase.
- Exclusao de compras.
- Busca de cotacao atual pela Brapi.
- Grafico de evolucao do patrimonio com valor aplicado e ganho de capital.
- Grafico em canvas com distribuicao por ticker.
- Configuracao local protegida por `.gitignore`.

## Estrutura

```text
GR-invest/
+-- index.html
+-- styles.css
+-- script.js
+-- build-config.js
+-- netlify.toml
+-- netlify/functions/compras.js
+-- config.example.js
+-- .env.example
+-- .gitignore
+-- README.md
```

## Configuracao

Crie uma tabela chamada `compras` no Supabase:

```sql
CREATE TABLE compras (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text NOT NULL,
  preco_compra numeric NOT NULL,
  quantidade integer NOT NULL,
  data_compra date NOT NULL,
  comprador text NOT NULL
);
```

Depois, crie um arquivo `config.js` na raiz do projeto seguindo o modelo abaixo:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://SUA_URL_DO_SUPABASE.supabase.co",
  SUPABASE_ANON_KEY: "SUA_ANON_KEY_DO_SUPABASE",
  BRAPI_TOKEN: "SUA_CHAVE_API_BRAPI"
};
```

O arquivo `config.js` nao deve ser enviado para o GitHub. Ele ja esta listado no `.gitignore`.

## Como Rodar

Abra o arquivo `index.html` no navegador.

Para testar as gravacoes seguras localmente, use o Netlify Dev, porque cadastro, edicao e exclusao passam por uma Netlify Function.

## Deploy no Netlify

Use estas configuracoes no Netlify:

```text
Branch to deploy: main
Base directory: deixe vazio
Build command: node build-config.js
Publish directory: .
Functions directory: netlify/functions
```

Adicione estas Environment Variables no Netlify:

```text
SUPABASE_URL=https://SUA_URL_DO_SUPABASE.supabase.co
SUPABASE_ANON_KEY=SUA_ANON_KEY_DO_SUPABASE
BRAPI_TOKEN=SUA_CHAVE_API_BRAPI
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_DO_SUPABASE
GIOVANNY_PASSWORD=SENHA_FORTE_DO_GIOVANNY
RAFAELA_PASSWORD=SENHA_FORTE_DA_RAFAELA
```

Durante o deploy, o arquivo `build-config.js` gera um `config.js` automaticamente com as variaveis publicas. As variaveis `SUPABASE_SERVICE_ROLE_KEY`, `GIOVANNY_PASSWORD` e `RAFAELA_PASSWORD` ficam apenas no servidor do Netlify e nao aparecem no navegador.

Se aparecer o erro `Variaveis do Supabase nao configuradas no Netlify`, confira principalmente:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Depois de criar ou alterar variaveis no Netlify, faca um novo deploy para garantir que o site e as functions usem os valores atuais.

## Protecao por Senha

Para cadastrar ou editar uma compra, o campo de senha aparece quando o comprador for `Giovanny` ou `Rafaela`.

A validacao acontece em `netlify/functions/compras.js`. Essa funcao grava no Supabase usando `SUPABASE_SERVICE_ROLE_KEY`, sem expor essa chave no frontend.

Nunca publique senhas reais no README. Configure `GIOVANNY_PASSWORD` e `RAFAELA_PASSWORD` apenas nas variaveis de ambiente do Netlify.

## Observacao Sobre Seguranca

A chave `anon public` do Supabase pode ser usada no frontend para leitura. Para evitar que visitantes gravem direto no banco, deixe o publico apenas com `SELECT` e remova policies publicas de `INSERT`, `UPDATE` e `DELETE`.

Policy recomendada para leitura:

```sql
create policy "Permitir leitura publica"
on public.compras
for select
to anon
using (true);
```

## Sincronizacao de Proventos Manuais

Os proventos adicionados manualmente tambem podem ficar sincronizados entre celular e PC. Crie a tabela abaixo no Supabase:

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

A gravacao passa pela Netlify Function `proventos-manuais`, usando `SUPABASE_SERVICE_ROLE_KEY` e a senha do comprador. Depois de criar a tabela, faca um novo deploy e use o botao `Sincronizar` no celular para enviar qualquer provento que tenha ficado salvo apenas naquele aparelho.
