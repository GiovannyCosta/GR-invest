const config = window.APP_CONFIG || {};
const BRAPI_TOKEN = config.BRAPI_TOKEN || "";
const supabaseUrl = config.SUPABASE_URL || "";
const supabaseKey = config.SUPABASE_ANON_KEY || "";

let db = null;
let carteira = [];
let fatiasPizza = [];
let compraEmEdicaoId = null;
let cotacoesAtuais = {};
let tipoCompra = "renda-fixa";
let abaGrafico = "geral";

const inputTicker = document.getElementById("input-ticker");
const inputPreco = document.getElementById("input-preco");
const inputComprador = document.getElementById("input-comprador");
const inputSenha = document.getElementById("input-senha");
const senhaWrapper = document.getElementById("senha-wrapper");
const spanPrecoAtual = document.getElementById("current-price");
const formCompra = document.getElementById("form-compra");
const formTitle = document.getElementById("form-title");
const btnSubmit = document.getElementById("btn-submit");
const btnCancelEdit = document.getElementById("btn-cancel-edit");
const connectionStatus = document.getElementById("connection-status");
const comprasBody = document.getElementById("compras-body");
const totalInvestido = document.getElementById("total-investido");
const totalAcoes = document.getElementById("total-acoes");
const totalItens = document.getElementById("total-itens");
const emptyHint = document.getElementById("empty-hint");
const assetLiveStatus = document.getElementById("asset-live-status");
const assetLiveList = document.getElementById("asset-live-list");
const btnRefresh = document.getElementById("btn-refresh");
const canvas = document.getElementById("grafico-pizza");
const ctx = canvas.getContext("2d");
const tooltipGrafico = document.getElementById("grafico-tooltip");
const legendaPizza = document.getElementById("legenda-pizza");
const barrasCarteira = document.getElementById("barras-carteira");
const chartTabs = document.querySelectorAll("[data-chart-view]");
const chartViewGeral = document.getElementById("chart-view-geral");
const chartViewFiis = document.getElementById("chart-view-fiis");
const generalChartTotal = document.getElementById("general-chart-total");
const fiiChartTotal = document.getElementById("fii-chart-total");
const participacaoTitle = document.getElementById("participacao-title");
const participacaoSubtitle = document.getElementById("participacao-subtitle");
const canvasFiis = document.getElementById("grafico-fiis");
const ctxFiis = canvasFiis.getContext("2d");
const legendaFiis = document.getElementById("legenda-fiis");
const barrasFiis = document.getElementById("barras-fiis");
const canvasFiisTab = document.getElementById("grafico-fiis-tab");
const ctxFiisTab = canvasFiisTab.getContext("2d");
const legendaFiisTab = document.getElementById("legenda-fiis-tab");
const purchaseTabs = document.querySelectorAll("[data-purchase-type]");
const cdbProductCard = document.getElementById("cdb-product-card");
const tickerWrapper = document.getElementById("ticker-wrapper");
const priceWrapper = document.getElementById("price-wrapper");
const precoLabelText = document.getElementById("preco-label-text");
const qtdWrapper = document.getElementById("qtd-wrapper");

const dinheiro = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function atualizarAbaGrafico(aba) {
  abaGrafico = aba;
  chartTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.chartView === aba);
  });
  chartViewGeral.hidden = aba !== "geral";
  chartViewFiis.hidden = aba !== "fiis";
  renderizarGraficos();
}

function atualizarTipoCompra(tipo) {
  tipoCompra = tipo;

  purchaseTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.purchaseType === tipo);
  });

  const rendaFixa = tipo === "renda-fixa";
  const fiis = tipo === "fiis";
  formTitle.textContent = rendaFixa ? "Nova compra - Renda fixa" : fiis ? "Nova compra - FIIs" : "Nova compra - Acoes";
  cdbProductCard.hidden = !rendaFixa;
  tickerWrapper.hidden = rendaFixa;
  priceWrapper.hidden = rendaFixa;
  qtdWrapper.hidden = rendaFixa;
  inputTicker.required = !rendaFixa;
  document.getElementById("input-qtd").required = !rendaFixa;
  precoLabelText.textContent = rendaFixa ? "Valor da aplicacao" : "Preco de compra";

  if (rendaFixa) {
    inputTicker.value = "CDBINTERDI";
    document.getElementById("input-qtd").value = "1";
    spanPrecoAtual.textContent = "102% do CDI";
    inputPreco.placeholder = "0,00";
    return;
  }

  if (inputTicker.value === "CDBINTERDI") {
    inputTicker.value = "";
    document.getElementById("input-qtd").value = "";
    spanPrecoAtual.textContent = "Aguardando...";
  }
}

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
  atualizarCotacoesCarteira();
}

async function buscarCotacao(ticker) {
  const codigo = ticker.trim().toUpperCase();
  if (!codigo) return null;

  spanPrecoAtual.textContent = "Buscando...";

  try {
    const tokenParam = BRAPI_TOKEN ? `?token=${encodeURIComponent(BRAPI_TOKEN)}` : "";
    const resposta = await fetch(`https://brapi.dev/api/quote/${codigo}${tokenParam}`);
    const json = await resposta.json();
    const resultado = json.results && json.results[0];

    if (!resposta.ok || !resultado) {
      spanPrecoAtual.textContent = "Nao encontrado";
      return null;
    }

    const preco = Number(resultado.regularMarketPrice || 0);
    spanPrecoAtual.textContent = dinheiro.format(preco);

    if (!inputPreco.value && preco > 0) {
      inputPreco.value = preco.toFixed(2);
    }

    return resultado;
  } catch (error) {
    console.error("Erro ao buscar cotacao:", error);
    spanPrecoAtual.textContent = "Erro na cotacao";
    return null;
  }
}

async function salvarCompra(event) {
  event.preventDefault();

  if (!db) {
    alert("Configure o arquivo config.js antes de salvar.");
    return;
  }

  const precoCompra = lerNumero(inputPreco.value);
  const quantidade = tipoCompra === "renda-fixa" ? 1 : Number(document.getElementById("input-qtd").value);

  if (!Number.isFinite(precoCompra) || precoCompra <= 0) {
    alert("Informe um preco valido. Exemplo: 8,04 ou 8.04");
    inputPreco.focus();
    return;
  }

  if (tipoCompra !== "renda-fixa" && (!Number.isInteger(quantidade) || quantidade <= 0)) {
    alert("Informe uma quantidade valida.");
    document.getElementById("input-qtd").focus();
    return;
  }

  const ticker = tipoCompra === "renda-fixa" ? "CDBINTERDI" : inputTicker.value.trim().toUpperCase();

  if (tipoCompra !== "renda-fixa") {
    const ativoEncontrado = await buscarCotacao(ticker);

    if (!ativoEncontrado) {
      alert(`Ticker "${ticker}" nao encontrado na Brapi. Confira o codigo antes de salvar.`);
      inputTicker.focus();
      return;
    }
  }

  const comprador = normalizarComprador(inputComprador.value);
  if (!comprador) {
    alert("O comprador precisa ser Giovanny ou Rafaela.");
    inputComprador.focus();
    return;
  }

  if (!inputSenha.value) {
    alert(`Informe a senha de ${comprador}.`);
    inputSenha.focus();
    return;
  }

  const dadosCompra = {
    ticker,
    preco_compra: precoCompra,
    quantidade,
    data_compra: document.getElementById("input-data").value,
    comprador
  };

  btnSubmit.disabled = true;
  btnSubmit.textContent = compraEmEdicaoId ? "Atualizando..." : "Salvando...";

  const { data, error } = await enviarCompra({
    action: compraEmEdicaoId ? "update" : "insert",
    id: compraEmEdicaoId,
    compra: dadosCompra,
    senha: inputSenha.value
  });

  if (error) {
    alert(`Erro ao salvar no banco de dados: ${error.message}`);
    console.error(error);
    btnSubmit.disabled = false;
    btnSubmit.textContent = compraEmEdicaoId ? "Atualizar compra" : "Salvar compra";
    return;
  }

  if (!data) {
    alert("O Supabase nao retornou a compra atualizada. Confira a policy de UPDATE da tabela compras.");
    btnSubmit.disabled = false;
    btnSubmit.textContent = compraEmEdicaoId ? "Atualizar compra" : "Salvar compra";
    return;
  }

  aplicarCompraNaTela(data);
  atualizarDashboard();

  formCompra.reset();
  sairModoEdicao();
  definirDataPadrao();
atualizarTipoCompra("renda-fixa");
atualizarCampoSenha();
  spanPrecoAtual.textContent = "Aguardando...";
  btnSubmit.disabled = false;
  await carregarCarteira();
}

function entrarModoEdicao(id) {
  const compra = carteira.find((item) => item.id === id);
  if (!compra) return;

  compraEmEdicaoId = id;
  atualizarTipoCompra(compra.ticker === "CDBINTERDI" ? "renda-fixa" : compra.ticker.endsWith("11") ? "fiis" : "acoes");
  formTitle.textContent = "Editar compra";
  btnSubmit.textContent = "Atualizar compra";
  btnCancelEdit.hidden = false;
  inputTicker.value = compra.ticker;
  inputPreco.value = String(compra.precoCompra).replace(".", ",");
  document.getElementById("input-qtd").value = compra.quantidade;
  document.getElementById("input-data").value = compra.data;
  inputComprador.value = compra.comprador;
  inputSenha.value = "";
  atualizarCampoSenha();
  spanPrecoAtual.textContent = "Aguardando...";
  inputTicker.focus();
}

function sairModoEdicao() {
  compraEmEdicaoId = null;
  formTitle.textContent = "Nova compra";
  btnSubmit.textContent = "Salvar compra";
  btnSubmit.disabled = false;
  btnCancelEdit.hidden = true;
}

function aplicarCompraNaTela(item) {
  const compra = {
    id: item.id,
    ticker: item.ticker,
    precoCompra: Number(item.preco_compra),
    quantidade: Number(item.quantidade),
    data: item.data_compra,
    comprador: item.comprador
  };
  const index = carteira.findIndex((registro) => registro.id === compra.id);

  if (index >= 0) {
    carteira[index] = compra;
    return;
  }

  carteira.unshift(compra);
}

async function excluirCompra(id) {
  if (!db) return;

  const compra = carteira.find((item) => item.id === id);
  if (!compra) return;

  const senha = prompt(`Senha de ${compra.comprador} para excluir ${compra.ticker}:`);
  if (!senha) return;

  if (!confirm("Excluir esta compra?")) return;

  const { error } = await enviarCompra({
    action: "delete",
    id,
    senha
  });

  if (error) {
    alert(`Erro ao excluir compra: ${error.message}`);
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
  totalItens.textContent = `${tickersUnicos} ${tickersUnicos === 1 ? "ativo" : "ativos"}`;
  emptyHint.textContent = carteira.length ? `${carteira.length} compras` : "Sem compras cadastradas";

  renderizarTabela();
  renderizarGraficos();
  renderizarAtivosAoVivo();
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
        <button class="edit-button" type="button" data-action="edit" data-id="${item.id}" aria-label="Editar ${escaparHtml(item.ticker)}" title="Editar">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1l1-4Z"/>
          </svg>
        </button>
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

function renderizarGraficos() {
  const dadosPorClasse = obterResumoPorClasse();
  const dadosFiis = obterResumoDeFiis();
  const totalCarteira = carteira.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const totalFiis = dadosFiis.reduce((soma, item) => soma + item.total, 0);
  const percentualFiis = totalCarteira ? (totalFiis / totalCarteira) * 100 : 0;
  const dadosParticipacao = abaGrafico === "fiis" ? dadosFiis : dadosPorClasse;

  generalChartTotal.textContent = `${dinheiro.format(totalCarteira)} no total`;
  fiiChartTotal.textContent = `${percentualFiis.toFixed(1)}% da carteira em FIIs`;
  participacaoTitle.textContent = abaGrafico === "fiis" ? "Maior participacao em FIIs" : "Maior participacao na carteira";
  participacaoSubtitle.textContent = abaGrafico === "fiis" ? "Percentual por FII" : "Percentual por classe";

  renderizarGraficoPizza(dadosPorClasse);
  renderizarGraficoPizzaSecundario(dadosFiis, ctxFiis, canvasFiis, legendaFiis);
  renderizarGraficoPizzaSecundario(dadosFiis, ctxFiisTab, canvasFiisTab, legendaFiisTab);
  renderizarGraficoBarras(dadosParticipacao, barrasCarteira);
  renderizarGraficoBarras(dadosFiis, barrasFiis);
}

function obterResumoPorClasse() {
  const totalCarteira = carteira.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const mapa = carteira.reduce((resultado, item) => {
    const ticker = obterClasse(item.ticker);
    const total = item.precoCompra * item.quantidade;

    if (!resultado[ticker]) {
      resultado[ticker] = {
        ticker,
        total: 0,
        quantidade: 0,
        segmento: ticker,
        compradores: {}
      };
    }

    resultado[ticker].total += total;
    resultado[ticker].quantidade += item.quantidade;
    resultado[ticker].compradores[item.comprador] = (resultado[ticker].compradores[item.comprador] || 0) + item.quantidade;
    return resultado;
  }, {});

  return Object.values(mapa)
    .map((item) => ({
      ...item,
      percentual: totalCarteira ? (item.total / totalCarteira) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);
}

function obterResumoDeFiis() {
  const fiis = obterResumoPorTicker().filter((item) => obterClasse(item.ticker) === "FIIs");
  const totalFiis = fiis.reduce((soma, item) => soma + item.total, 0);

  return fiis.map((item) => ({
    ...item,
    percentual: totalFiis ? (item.total / totalFiis) * 100 : 0
  }));
}
function obterResumoPorTicker() {
  const totalCarteira = carteira.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const mapa = carteira.reduce((resultado, item) => {
    const ticker = item.ticker;
    const total = item.precoCompra * item.quantidade;

    if (!resultado[ticker]) {
      resultado[ticker] = {
        ticker,
        total: 0,
        quantidade: 0,
        segmento: obterSegmento(ticker),
        compradores: {}
      };
    }

    resultado[ticker].total += total;
    resultado[ticker].quantidade += item.quantidade;
    resultado[ticker].compradores[item.comprador] = (resultado[ticker].compradores[item.comprador] || 0) + item.quantidade;
    return resultado;
  }, {});

  return Object.values(mapa)
    .map((item) => ({
      ...item,
      percentual: totalCarteira ? (item.total / totalCarteira) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);
}

async function atualizarCotacoesCarteira() {
  const tickers = [...new Set(carteira.map((item) => item.ticker).filter((ticker) => ticker !== "CDBINTERDI"))];

  if (!tickers.length) {
    cotacoesAtuais = {};
    assetLiveStatus.textContent = "Sem ativos";
    renderizarAtivosAoVivo();
    return;
  }

  assetLiveStatus.textContent = "Atualizando mercado...";

  const resultados = await Promise.all(
    tickers.map(async (ticker) => {
      const cotacao = await buscarCotacaoSilenciosa(ticker);
      return [ticker, cotacao];
    })
  );

  cotacoesAtuais = resultados.reduce((mapa, [ticker, cotacao]) => {
    mapa[ticker] = cotacao;
    return mapa;
  }, {});

  assetLiveStatus.textContent = "Mercado atualizado";
  renderizarAtivosAoVivo();
}

async function buscarCotacaoSilenciosa(ticker) {
  try {
    const tokenParam = BRAPI_TOKEN ? `?token=${encodeURIComponent(BRAPI_TOKEN)}` : "";
    const resposta = await fetch(`https://brapi.dev/api/quote/${ticker}${tokenParam}`);
    const json = await resposta.json();
    const resultado = json.results && json.results[0];

    if (!resposta.ok || !resultado) {
      return null;
    }

    return Number(resultado.regularMarketPrice || 0);
  } catch (error) {
    console.error(`Erro ao buscar cotacao de ${ticker}:`, error);
    return null;
  }
}

function renderizarAtivosAoVivo() {
  const dados = obterResumoPorTicker();
  assetLiveList.innerHTML = "";

  if (!dados.length) {
    assetLiveList.innerHTML = '<p class="empty-chart">Sem ativos para acompanhar.</p>';
    return;
  }

  dados.forEach((item) => {
    const rendaFixa = item.ticker === "CDBINTERDI";
    const precoMedio = item.quantidade ? item.total / item.quantidade : 0;
    const precoMercado = rendaFixa ? precoMedio : cotacoesAtuais[item.ticker];
    const temMercado = rendaFixa || (Number.isFinite(precoMercado) && precoMercado > 0);
    const valorMercado = temMercado ? precoMercado * item.quantidade : null;
    const ganho = rendaFixa ? 0 : temMercado ? valorMercado - item.total : null;
    const ganhoPercentual = rendaFixa ? 0 : temMercado && item.total ? (ganho / item.total) * 100 : null;
    const variacaoClasse = ganho === null ? "" : ganho >= 0 ? "positive" : "negative";
    const sinal = ganho !== null && ganho > 0 ? "+" : "";
    const card = document.createElement("article");

    card.className = "asset-live-card";
    card.innerHTML = `
      <div class="asset-live-head">
        <div>
          <strong>${escaparHtml(item.ticker)} (${item.percentual.toFixed(1)}%)</strong>
          <span>${item.segmento}</span>
        </div>
        <strong>${temMercado ? dinheiro.format(valorMercado) : "Cotacao indisponivel"}</strong>
      </div>
      <div class="asset-live-grid">
        <div>
          <span>Quantidade</span>
          <strong>${item.quantidade}</strong>
        </div>
        <div>
          <span>Ganho/Perda</span>
          <strong class="${variacaoClasse}">
            ${ganho === null ? "Aguardando" : `${sinal}${dinheiro.format(ganho)} (${sinal}${ganhoPercentual.toFixed(2)}%)`}
          </strong>
        </div>
        <div>
          <span>Preco medio</span>
          <strong>${dinheiro.format(precoMedio)}</strong>
        </div>
        <div>
          <span>${rendaFixa ? "Valor aplicado" : "Preco de mercado atual"}</span>
          <strong>${temMercado ? dinheiro.format(precoMercado) : "Aguardando"}</strong>
        </div>
      </div>
    `;

    assetLiveList.appendChild(card);
  });
}

function renderizarGraficoPizza(dados) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  fatiasPizza = [];
  legendaPizza.innerHTML = "";
  esconderTooltip();

  if (!dados.length) {
    ctx.fillStyle = "#607080";
    ctx.font = "18px Arial";
    ctx.fillText("Sem dados para exibir", 28, 52);
    legendaPizza.innerHTML = '<p class="empty-chart">Cadastre compras para montar os graficos.</p>';
    return;
  }

  const total = dados.reduce((soma, item) => soma + item.total, 0);
  const centroX = 145;
  const centroY = 140;
  const raio = 96;
  let anguloAtual = -Math.PI / 2;

  dados.forEach((item, index) => {
    const angulo = (item.total / total) * Math.PI * 2;
    const inicio = anguloAtual;
    const fim = anguloAtual + angulo;
    const cor = corDoTicker(item.ticker);

    ctx.beginPath();
    ctx.moveTo(centroX, centroY);
    ctx.arc(centroX, centroY, raio, inicio, fim);
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();

    fatiasPizza.push({ ...item, inicio, fim, centroX, centroY, raio, cor });
    legendaPizza.appendChild(criarItemLegenda(item, cor, index));
    anguloAtual = fim;
  });

  ctx.beginPath();
  ctx.arc(centroX, centroY, 46, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "#17212b";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${dados.length}`, centroX, centroY - 2);
  ctx.fillStyle = "#607080";
  ctx.font = "13px Arial";
  ctx.fillText(dados.length === 1 ? "ativo" : "ativos", centroX, centroY + 18);
  ctx.textAlign = "left";
}

function renderizarGraficoPizzaSecundario(dados, contexto, canvasAlvo, legenda) {
  contexto.clearRect(0, 0, canvasAlvo.width, canvasAlvo.height);
  legenda.innerHTML = "";

  if (!dados.length) {
    contexto.fillStyle = "#607080";
    contexto.font = "18px Arial";
    contexto.fillText("Sem FIIs para exibir", 28, 52);
    legenda.innerHTML = '<p class="empty-chart">Cadastre FIIs para montar este grafico.</p>';
    return;
  }

  const total = dados.reduce((soma, item) => soma + item.total, 0);
  const centroX = 145;
  const centroY = 140;
  const raio = 96;
  let anguloAtual = -Math.PI / 2;

  dados.forEach((item, index) => {
    const angulo = (item.total / total) * Math.PI * 2;
    const inicio = anguloAtual;
    const fim = anguloAtual + angulo;
    const cor = corDoTicker(item.ticker);

    contexto.beginPath();
    contexto.moveTo(centroX, centroY);
    contexto.arc(centroX, centroY, raio, inicio, fim);
    contexto.closePath();
    contexto.fillStyle = cor;
    contexto.fill();
    contexto.strokeStyle = "#ffffff";
    contexto.lineWidth = 4;
    contexto.stroke();

    legenda.appendChild(criarItemLegenda(item, cor, index));
    anguloAtual = fim;
  });

  contexto.beginPath();
  contexto.arc(centroX, centroY, 46, 0, Math.PI * 2);
  contexto.fillStyle = "#ffffff";
  contexto.fill();
  contexto.fillStyle = "#17212b";
  contexto.font = "bold 18px Arial";
  contexto.textAlign = "center";
  contexto.fillText(`${dados.length}`, centroX, centroY - 2);
  contexto.fillStyle = "#607080";
  contexto.font = "13px Arial";
  contexto.fillText(dados.length === 1 ? "FII" : "FIIs", centroX, centroY + 18);
  contexto.textAlign = "left";
}
function renderizarGraficoBarras(dados, container = barrasCarteira) {
  container.innerHTML = "";

  if (!dados.length) {
    container.innerHTML = '<p class="empty-chart">Sem percentuais para exibir.</p>';
    return;
  }

  dados.forEach((item, index) => {
    const barra = document.createElement("div");
    const opacidade = Math.max(0.42, 1 - index * 0.14);
    barra.className = "bar-row";
    barra.innerHTML = `
      <div class="bar-info">
        <strong>${escaparHtml(item.ticker)}</strong>
        <span>${item.percentual.toFixed(1)}% - ${dinheiro.format(item.total)}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${item.percentual.toFixed(2)}%; background: ${corDoTicker(item.ticker)}; opacity: ${opacidade};"></div>
      </div>
    `;
    container.appendChild(barra);
  });
}

function criarItemLegenda(item, cor) {
  const div = document.createElement("div");
  div.className = "legend-item";
  div.innerHTML = `
    <span class="legend-color" style="background: ${cor};"></span>
    <div>
      <strong>${escaparHtml(item.ticker)}</strong>
      <small>${item.percentual.toFixed(1)}% - ${item.segmento}</small>
    </div>
  `;
  return div;
}

function mostrarTooltip(event, fatia) {
  const compradores = Object.entries(fatia.compradores)
    .map(([nome, quantidade]) => `${escaparHtml(nome)} - ${quantidade}`)
    .join("<br>");
  const rect = canvas.getBoundingClientRect();

  tooltipGrafico.innerHTML = `
    <strong>${escaparHtml(fatia.ticker)}</strong>
    <span>Quantidade: ${fatia.quantidade}</span>
    <span>Segmento: ${fatia.segmento}</span>
    <span>Carteira: ${fatia.percentual.toFixed(1)}%</span>
    <span>${compradores}</span>
  `;
  tooltipGrafico.style.left = `${event.clientX - rect.left + 14}px`;
  tooltipGrafico.style.top = `${event.clientY - rect.top + 14}px`;
  tooltipGrafico.classList.add("is-visible");
}

function esconderTooltip() {
  tooltipGrafico.classList.remove("is-visible");
}

function obterFatiaNoMouse(event) {
  const rect = canvas.getBoundingClientRect();
  const escalaX = canvas.width / rect.width;
  const escalaY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * escalaX;
  const y = (event.clientY - rect.top) * escalaY;

  return fatiasPizza.find((fatia) => {
    const dx = x - fatia.centroX;
    const dy = y - fatia.centroY;
    const distancia = Math.sqrt(dx * dx + dy * dy);
    let angulo = Math.atan2(dy, dx);

    if (angulo < -Math.PI / 2) {
      angulo += Math.PI * 2;
    }

    return distancia <= fatia.raio && distancia >= 46 && angulo >= fatia.inicio && angulo <= fatia.fim;
  });
}

function obterClasse(ticker) {
  if (ticker === "CDBINTERDI") return "Renda fixa";
  if (ticker.endsWith("11")) return "FIIs";
  return "Acoes";
}

function obterSegmento(ticker) {
  if (ticker === "CDBINTERDI") return "CDB Inter LIQ. diaria";
  if (ticker.endsWith("11")) return "FII, ETF ou Unit";
  if (ticker.endsWith("34")) return "BDR";
  if (ticker.endsWith("3")) return "Acao ordinaria";
  if (ticker.endsWith("4")) return "Acao preferencial";
  return "Ativo";
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
  const cores = ["#05668d", "#f7e733", "#168a63", "#d88c25", "#5e4aa8", "#22748f"];
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

async function enviarCompra(payload) {
  try {
    const response = await fetch("/.netlify/functions/compras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: { message: data.error || "Erro na funcao do Netlify." } };
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Nao foi possivel acessar a funcao segura. No PC, rode com Netlify Dev; no site, confira o deploy."
      }
    };
  }
}

function normalizarComprador(comprador) {
  const nome = String(comprador || "").trim().toLowerCase();

  if (nome === "giovanny") return "Giovanny";
  if (nome === "rafaela") return "Rafaela";
  return "";
}

function atualizarCampoSenha() {
  const comprador = normalizarComprador(inputComprador.value);
  const mostrar = Boolean(comprador);

  senhaWrapper.hidden = !mostrar;
  inputSenha.disabled = !mostrar;
  inputSenha.required = mostrar;

  if (!mostrar) {
    inputSenha.value = "";
  }
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

inputTicker.addEventListener("blur", () => {
  if (tipoCompra !== "renda-fixa") buscarCotacao(inputTicker.value);
});
inputComprador.addEventListener("change", atualizarCampoSenha);
chartTabs.forEach((tab) => tab.addEventListener("click", () => atualizarAbaGrafico(tab.dataset.chartView)));
purchaseTabs.forEach((tab) => tab.addEventListener("click", () => atualizarTipoCompra(tab.dataset.purchaseType)));
formCompra.addEventListener("submit", salvarCompra);
btnCancelEdit.addEventListener("click", () => {
  formCompra.reset();
  sairModoEdicao();
  definirDataPadrao();
atualizarTipoCompra("renda-fixa");
atualizarCampoSenha();
  spanPrecoAtual.textContent = "Aguardando...";
});
btnRefresh.addEventListener("click", carregarCarteira);
canvas.addEventListener("mousemove", (event) => {
  const fatia = obterFatiaNoMouse(event);

  if (!fatia) {
    esconderTooltip();
    return;
  }

  mostrarTooltip(event, fatia);
});
canvas.addEventListener("mouseleave", esconderTooltip);
comprasBody.addEventListener("click", (event) => {
  const botao = event.target.closest("[data-id]");
  if (!botao) return;

  if (botao.dataset.action === "edit") {
    entrarModoEdicao(botao.dataset.id);
    return;
  }

  excluirCompra(botao.dataset.id);
});

definirDataPadrao();
atualizarTipoCompra("renda-fixa");
atualizarCampoSenha();
iniciarSupabase();
carregarCarteira();






