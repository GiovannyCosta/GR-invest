const config = window.APP_CONFIG || {};
const BRAPI_TOKEN = config.BRAPI_TOKEN || "";
const supabaseUrl = config.SUPABASE_URL || "";
const supabaseKey = config.SUPABASE_ANON_KEY || "";

let db = null;
let carteira = [];

const inputTicker = document.getElementById("input-ticker");
const inputPreco = document.getElementById("input-preco");
const spanPrecoAtual = document.getElementById("current-price");
const formCompra = document.getElementById("form-compra");
const connectionStatus = document.getElementById("connection-status");
const comprasBody = document.getElementById("compras-body");
const totalInvestido = document.getElementById("total-investido");
const totalAcoes = document.getElementById("total-acoes");
const ticketMedio = document.getElementById("ticket-medio");
const totalItens = document.getElementById("total-itens");
const emptyHint = document.getElementById("empty-hint");
const btnRefresh = document.getElementById("btn-refresh");
const canvas = document.getElementById("grafico-carteira");
const ctx = canvas.getContext("2d");

const dinheiro = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function iniciarSupabase() {
  if (!window.supabase || !supabaseUrl || !supabaseKey) {
    connectionStatus.textContent = "Configure config.js";
    return;
  }

  const { createClient } = window.supabase;
  db = createClient(supabaseUrl, supabaseKey);
  connectionStatus.textContent = "Conectado";
}

async function carregarCarteira() {
  if (!db) {
    atualizarDashboard();
    return;
  }

  connectionStatus.textContent = "Carregando...";
  const { data, error } = await db
    .from("compras")
    .select("*")
    .order("data_compra", { ascending: false });

  if (error) {
    console.error("Erro ao buscar dados:", error);
    connectionStatus.textContent = "Erro no banco";
    return;
  }

  carteira = (data || []).map((item) => ({
    id: item.id,
    ticker: item.ticker,
    precoCompra: Number(item.preco_compra),
    quantidade: Number(item.quantidade),
    data: item.data_compra,
    comprador: item.comprador
  }));

  connectionStatus.textContent = "Conectado";
  atualizarDashboard();
}

async function buscarCotacao(ticker) {
  const codigo = ticker.trim().toUpperCase();
  if (!codigo) return;

  spanPrecoAtual.textContent = "Buscando...";

  try {
    const tokenParam = BRAPI_TOKEN ? `?token=${encodeURIComponent(BRAPI_TOKEN)}` : "";
    const resposta = await fetch(`https://brapi.dev/api/quote/${codigo}${tokenParam}`);
    const json = await resposta.json();
    const resultado = json.results && json.results[0];

    if (!resposta.ok || !resultado) {
      spanPrecoAtual.textContent = "Nao encontrado";
      return;
    }

    const preco = Number(resultado.regularMarketPrice || 0);
    spanPrecoAtual.textContent = dinheiro.format(preco);

    if (!inputPreco.value && preco > 0) {
      inputPreco.value = preco.toFixed(2);
    }
  } catch (error) {
    console.error("Erro ao buscar cotacao:", error);
    spanPrecoAtual.textContent = "Erro na cotacao";
  }
}

async function salvarCompra(event) {
  event.preventDefault();

  if (!db) {
    alert("Configure o arquivo config.js antes de salvar.");
    return;
  }

  const precoCompra = lerNumero(inputPreco.value);
  const quantidade = Number(document.getElementById("input-qtd").value);

  if (!Number.isFinite(precoCompra) || precoCompra <= 0) {
    alert("Informe um preco valido. Exemplo: 8,04 ou 8.04");
    inputPreco.focus();
    return;
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    alert("Informe uma quantidade valida.");
    document.getElementById("input-qtd").focus();
    return;
  }

  const novaCompra = {
    ticker: inputTicker.value.trim().toUpperCase(),
    preco_compra: precoCompra,
    quantidade,
    data_compra: document.getElementById("input-data").value,
    comprador: document.getElementById("input-comprador").value.trim()
  };

  const { error } = await db.from("compras").insert([novaCompra]);

  if (error) {
    alert(`Erro ao salvar no banco de dados: ${error.message}`);
    console.error(error);
    return;
  }

  formCompra.reset();
  definirDataPadrao();
  spanPrecoAtual.textContent = "Aguardando...";
  carregarCarteira();
}

async function excluirCompra(id) {
  if (!db || !confirm("Excluir esta compra?")) return;

  const { error } = await db.from("compras").delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir compra.");
    console.error(error);
    return;
  }

  carregarCarteira();
}

function atualizarDashboard() {
  const total = carteira.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const quantidade = carteira.reduce((soma, item) => soma + item.quantidade, 0);
  const tickersUnicos = new Set(carteira.map((item) => item.ticker)).size;

  totalInvestido.textContent = dinheiro.format(total);
  totalAcoes.textContent = String(quantidade);
  ticketMedio.textContent = quantidade ? dinheiro.format(total / quantidade) : dinheiro.format(0);
  totalItens.textContent = `${tickersUnicos} ${tickersUnicos === 1 ? "ativo" : "ativos"}`;
  emptyHint.textContent = carteira.length ? `${carteira.length} compras` : "Sem compras cadastradas";

  renderizarTabela();
  renderizarGrafico();
}

function renderizarTabela() {
  comprasBody.innerHTML = "";

  carteira.forEach((item) => {
    const total = item.precoCompra * item.quantidade;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <div class="ticker-cell">
          ${criarIconeTicker(item.ticker)}
          <span>${escaparHtml(item.ticker)}</span>
        </div>
      </td>
      <td>${dinheiro.format(item.precoCompra)}</td>
      <td>${item.quantidade}</td>
      <td>${dinheiro.format(total)}</td>
      <td>${formatarData(item.data)}</td>
      <td>${escaparHtml(item.comprador)}</td>
      <td>
        <button class="delete-button" type="button" data-id="${item.id}" aria-label="Excluir ${escaparHtml(item.ticker)}" title="Excluir">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18"/>
            <path d="M8 6V4h8v2"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v5"/>
            <path d="M14 11v5"/>
          </svg>
        </button>
      </td>
    `;

    comprasBody.appendChild(tr);
  });
}

function renderizarGrafico() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const porTicker = carteira.reduce((mapa, item) => {
    mapa[item.ticker] = (mapa[item.ticker] || 0) + item.precoCompra * item.quantidade;
    return mapa;
  }, {});

  const dados = Object.entries(porTicker);
  if (!dados.length) {
    ctx.fillStyle = "#607080";
    ctx.font = "18px Arial";
    ctx.fillText("Sem dados para exibir", 24, 52);
    return;
  }

  const maiorValor = Math.max(...dados.map(([, valor]) => valor));
  const alturaBarra = 28;
  const espaco = 18;
  const inicioX = 110;

  dados.forEach(([ticker, valor], index) => {
    const y = 28 + index * (alturaBarra + espaco);
    const largura = Math.max(6, (valor / maiorValor) * (canvas.width - 220));

    ctx.fillStyle = "#17212b";
    ctx.font = "bold 16px Arial";
    ctx.fillText(ticker, 24, y + 20);

    ctx.fillStyle = corDoTicker(ticker);
    ctx.fillRect(inicioX, y, largura, alturaBarra);

    ctx.fillStyle = "#17212b";
    ctx.font = "14px Arial";
    ctx.fillText(dinheiro.format(valor), inicioX + largura + 12, y + 20);
  });
}

function criarIconeTicker(ticker) {
  const texto = escaparHtml(ticker.slice(0, 5));
  const cor = corDoTicker(ticker);

  return `
    <svg class="ticker-icon" viewBox="0 0 48 48" role="img" aria-label="Icone ${texto}">
      <rect width="48" height="48" rx="8" fill="${cor}"></rect>
      <path d="M12 31L20 23L26 28L36 16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      <text x="24" y="39" text-anchor="middle" fill="#fff" font-size="10" font-family="Arial" font-weight="700">${texto}</text>
    </svg>
  `;
}

function corDoTicker(ticker) {
  const cores = ["#126b5c", "#2457a6", "#9b3d2e", "#6d5a14", "#5e4aa8", "#22748f"];
  const soma = ticker.split("").reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return cores[soma % cores.length];
}

function formatarData(data) {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function lerNumero(valor) {
  return Number(String(valor).replace(",", "."));
}

function escaparHtml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function definirDataPadrao() {
  document.getElementById("input-data").valueAsDate = new Date();
}

inputTicker.addEventListener("blur", () => buscarCotacao(inputTicker.value));
formCompra.addEventListener("submit", salvarCompra);
btnRefresh.addEventListener("click", carregarCarteira);
comprasBody.addEventListener("click", (event) => {
  const botao = event.target.closest("[data-id]");
  if (botao) excluirCompra(botao.dataset.id);
});

definirDataPadrao();
iniciarSupabase();
carregarCarteira();
