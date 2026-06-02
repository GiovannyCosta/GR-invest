# GR Invest

Dashboard simples para registrar compras de ativos, acompanhar o total investido e visualizar a distribuicao da carteira.

O projeto foi feito com HTML, CSS e JavaScript puro, sem framework e sem etapa de build. A ideia e manter o codigo leve, facil de entender e pronto para publicar no GitHub Pages.

## Preview

O GR Invest permite cadastrar compras com ticker, preco, quantidade, data e comprador. Depois disso, o painel mostra:

- resumo do total investido;
- quantidade total de acoes;
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
- Grafico em canvas com distribuicao por ticker.
- Configuracao local protegida por `.gitignore`.

## Estrutura

```text
GR-invest/
+-- index.html
+-- styles.css
+-- script.js
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

Tambem e possivel publicar o projeto no GitHub Pages, desde que as configuracoes do Supabase e da Brapi estejam definidas corretamente no ambiente publicado.

## Observacao Sobre Seguranca

A chave `anon public` do Supabase pode ser usada no frontend, mas as permissoes da tabela devem ser controladas pelas regras de seguranca do Supabase, como RLS e policies.
