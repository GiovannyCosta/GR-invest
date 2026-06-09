const config = window.APP_CONFIG || {};
const BRAPI_TOKEN = config.BRAPI_TOKEN || "";
const supabaseUrl = config.SUPABASE_URL || "";
const supabaseKey = config.SUPABASE_ANON_KEY || "";

let db = null;
let carteira = [];
let fatiasPizza = [];
let fatiasGraficos = new Map();
let tooltipsGraficos = new Map();
let barrasPatrimonio = [];
let compraEmEdicaoId = null;
let cotacoesAtuais = {};
let proventosRecebidos = [];
let proventosFuturos = [];
let cdiDiarioAtual = null;
let tipoCompra = "renda-fixa";
let abaGrafico = "geral";

const saldoAntigoCdbInter = {
  id: "saldo-antigo-cdb-inter",
  ticker: "CDBINTERDI",
  precoCompra: 2.77,
  quantidade: 1,
  data: "2026-04-09",
  comprador: "Giovanny",
  virtual: true
};

const cdbInterConfig = {
  nome: "CDB POS DI LIQUIDEZ DIARIA",
  emissor: "Banco Inter",
  vencimento: "2028-05-29",
  percentualCdi: 1,
  valorMinimo: 1,
  liquidez: "Imediato",
  garantia: "FGC ate R$ 250 mil"
};

const historicoManualProventos = [
  { ticker: "CPTS11", dataPagamento: "2026-04-19", total: 4.50, fonte: "manual" },
  { ticker: "GGRC11", dataPagamento: "2026-04-30", total: 3.00, fonte: "manual" },
  { ticker: "CPTS11", dataPagamento: "2026-05-18", total: 4.50, fonte: "manual" },
  { ticker: "GGRC11", dataPagamento: "2026-05-20", total: 4.50, fonte: "manual" }
];

const inputTicker = document.getElementById("input-ticker");
const inputPreco = document.getElementById("input-preco");
const inputComprador = document.getElementById("input-comprador");
const inputSenha = document.getElementById("input-senha");
const senhaWrapper = document.getElementById("senha-wrapper");
const spanPrecoAtual = document.getElementById("current-price");
const formCompra = document.getElementById("form-compra");
const mainLayout = document.getElementById("main-layout");
const purchasePanel = document.getElementById("purchase-panel");
const purchaseNav = document.getElementById("purchase-nav");
const formTitle = document.getElementById("form-title");
const btnSubmit = document.getElementById("btn-submit");
const btnCancelEdit = document.getElementById("btn-cancel-edit");
const connectionStatus = document.getElementById("connection-status");
const comprasBody = document.getElementById("compras-body");
const totalInvestido = document.getElementById("total-investido");
const totalAcoes = document.getElementById("total-acoes");
const totalProventos = document.getElementById("total-proventos");
const patrimonioProventos = document.getElementById("patrimonio-proventos");
const totalItens = document.getElementById("total-itens");
const emptyHint = document.getElementById("empty-hint");
const proventosStatus = document.getElementById("proventos-status");
const proventosLista = document.getElementById("proventos-lista");
const proventosFuturosStatus = document.getElementById("proventos-futuros-status");
const proventosFuturosLista = document.getElementById("proventos-futuros-lista");
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
const chartViewProventos = document.getElementById("chart-view-proventos");
const chartViewCompradores = document.getElementById("chart-view-compradores");
const generalChartTotal = document.getElementById("general-chart-total");
const fiiChartTotal = document.getElementById("fii-chart-total");
const compradoresChartTotal = document.getElementById("compradores-chart-total");
const participacaoTitle = document.getElementById("participacao-title");
const participacaoSubtitle = document.getElementById("participacao-subtitle");
const canvasFiis = document.getElementById("grafico-fiis");
const ctxFiis = canvasFiis.getContext("2d");
const legendaFiis = document.getElementById("legenda-fiis");
const barrasFiis = document.getElementById("barras-fiis");
const canvasFiisTab = document.getElementById("grafico-fiis-tab");
const ctxFiisTab = canvasFiisTab.getContext("2d");
const legendaFiisTab = document.getElementById("legenda-fiis-tab");
const canvasCompradores = document.getElementById("grafico-compradores");
const ctxCompradores = canvasCompradores.getContext("2d");
const legendaCompradores = document.getElementById("legenda-compradores");
const patrimonioPeriodo = document.getElementById("patrimonio-periodo");
const patrimonioTipo = document.getElementById("patrimonio-tipo");
const canvasPatrimonio = document.getElementById("grafico-patrimonio");
const ctxPatrimonio = canvasPatrimonio.getContext("2d");
const tooltipPatrimonio = document.getElementById("patrimonio-tooltip");
const mainNavTabs = document.querySelectorAll("[data-main-view]");
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
  chartViewProventos.hidden = aba !== "proventos";
  chartViewFiis.hidden = aba !== "fiis";
  chartViewCompradores.hidden = aba !== "compradores";
  renderizarGraficos();
}

function atualizarTelaPrincipal(tela) {
  const comprasAtivo = tela === "compras";

  mainNavTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.mainView === tela);
  });
  purchasePanel.hidden = !comprasAtivo;
  purchaseNav.hidden = !comprasAtivo;
  mainLayout.classList.toggle("is-home", !comprasAtivo);

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
    spanPrecoAtual.textContent = "100% do CDI";
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
  atualizarProventos();
  atualizarCdi();
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

  atualizarTelaPrincipal("compras");
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

function obterCarteiraComAjustes() {
  return [...carteira, saldoAntigoCdbInter];
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
  const carteiraAjustada = obterCarteiraComAjustes();
  const total = carteiraAjustada.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const quantidade = carteiraAjustada.reduce((soma, item) => soma + item.quantidade, 0);
  const tickersUnicos = new Set(carteiraAjustada.map((item) => item.ticker)).size;
  const totalRecebido = proventosRecebidos.reduce((soma, item) => soma + item.total, 0);

  totalInvestido.textContent = dinheiro.format(total);
  totalAcoes.textContent = String(quantidade);
  totalProventos.textContent = dinheiro.format(totalRecebido);
  patrimonioProventos.textContent = dinheiro.format(total + totalRecebido);
  totalItens.textContent = `${tickersUnicos} ${tickersUnicos === 1 ? "ativo" : "ativos"}`;
  emptyHint.textContent = carteira.length ? `${carteira.length} compras` : "Sem compras cadastradas";

  renderizarTabela();
  renderizarGraficos();
  renderizarEvolucaoPatrimonio();
  renderizarProventos();
  renderizarAtivosAoVivo();
}

function renderizarTabela() {
  comprasBody.innerHTML = "";

  obterCarteiraComAjustes().forEach((item) => {
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
        ${item.virtual ? '<span class="virtual-row">Ajuste</span>' : `
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
        `}
      </td>
    `;

    comprasBody.appendChild(tr);
  });
}

function renderizarGraficos() {
  const dadosPorClasse = obterResumoPorClasse();
  const dadosFiis = obterResumoDeFiis();
  const dadosCompradores = obterResumoPorComprador();
  const totalCarteira = obterCarteiraComAjustes().reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const totalFiis = dadosFiis.reduce((soma, item) => soma + item.total, 0);
  const totalCompradores = dadosCompradores.reduce((soma, item) => soma + item.total, 0);
  const percentualFiis = totalCarteira ? (totalFiis / totalCarteira) * 100 : 0;
  const dadosParticipacao = abaGrafico === "fiis"
    ? dadosFiis
    : abaGrafico === "compradores"
      ? dadosCompradores
      : dadosPorClasse;

  generalChartTotal.textContent = `${dinheiro.format(totalCarteira)} no total`;
  fiiChartTotal.textContent = `${percentualFiis.toFixed(1)}% da carteira em FIIs`;
  compradoresChartTotal.textContent = `${dinheiro.format(totalCompradores)} em compras`;
  participacaoTitle.textContent = abaGrafico === "fiis"
    ? "Maior participacao em FIIs"
    : abaGrafico === "compradores"
      ? "Maior participacao por comprador"
      : "Maior participacao na carteira";
  participacaoSubtitle.textContent = abaGrafico === "fiis"
    ? "Percentual por FII"
    : abaGrafico === "compradores"
      ? "Percentual por comprador"
      : "Percentual por classe";

  renderizarGraficoPizza(dadosPorClasse);
  renderizarGraficoPizzaSecundario(dadosFiis, ctxFiis, canvasFiis, legendaFiis);
  renderizarGraficoPizzaSecundario(dadosFiis, ctxFiisTab, canvasFiisTab, legendaFiisTab);
  renderizarGraficoPizzaSecundario(dadosCompradores, ctxCompradores, canvasCompradores, legendaCompradores, {
    vazio: "Sem compras para exibir",
    dicaVazia: "Cadastre compras para comparar Giovanny e Rafaela.",
    singular: "pessoa",
    plural: "pessoas",
    centroX: 130,
    centroY: 110,
    raio: 74,
    raioInterno: 34
  });
  renderizarGraficoBarras(dadosParticipacao, barrasCarteira);
  renderizarGraficoBarras(dadosFiis, barrasFiis);
}

function obterResumoPorClasse() {
  const carteiraAjustada = obterCarteiraComAjustes();
  const totalCarteira = carteiraAjustada.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const mapa = carteiraAjustada.reduce((resultado, item) => {
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

function obterResumoPorComprador() {
  const carteiraAjustada = obterCarteiraComAjustes();
  const totalCarteira = carteiraAjustada.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const mapa = carteiraAjustada.reduce((resultado, item) => {
    const comprador = normalizarComprador(item.comprador) || item.comprador || "Sem comprador";
    const total = item.precoCompra * item.quantidade;

    if (!resultado[comprador]) {
      resultado[comprador] = {
        ticker: comprador,
        total: 0,
        quantidade: 0,
        segmento: "Compras",
        compradores: {}
      };
    }

    resultado[comprador].total += total;
    resultado[comprador].quantidade += 1;
    resultado[comprador].compradores[comprador] = resultado[comprador].quantidade;
    return resultado;
  }, {});

  return Object.values(mapa)
    .map((item) => ({
      ...item,
      percentual: totalCarteira ? (item.total / totalCarteira) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);
}

function obterResumoPorTicker() {
  const carteiraAjustada = obterCarteiraComAjustes();
  const totalCarteira = carteiraAjustada.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const mapa = carteiraAjustada.reduce((resultado, item) => {
    const ticker = item.ticker;
    const total = item.precoCompra * item.quantidade;

    if (!resultado[ticker]) {
      resultado[ticker] = {
        ticker,
        total: 0,
        quantidade: 0,
        segmento: obterSegmento(ticker),
        compradores: {},
        aplicacoes: []
      };
    }

    resultado[ticker].total += total;
    resultado[ticker].quantidade += item.quantidade;
    resultado[ticker].compradores[item.comprador] = (resultado[ticker].compradores[item.comprador] || 0) + item.quantidade;
    resultado[ticker].aplicacoes.push(item);
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
  renderizarEvolucaoPatrimonio();
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

async function atualizarProventos() {
  const fiis = [...new Set(carteira.map((item) => item.ticker).filter((ticker) => obterClasse(ticker) === "FIIs"))];
  const hoje = new Date();

  if (!fiis.length) {
    proventosRecebidos = obterProventosManuaisElegiveis(hoje);
    proventosFuturos = [];
    proventosStatus.textContent = "Sem FIIs";
    proventosFuturosStatus.textContent = "Sem FIIs";
    atualizarDashboard();
    return;
  }

  proventosStatus.textContent = "Buscando proventos...";

  try {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 12, hoje.getDate());
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 8, hoje.getDate());
    const params = new URLSearchParams({
      symbols: fiis.slice(0, 20).join(","),
      startDate: formatarDataApi(inicio),
      endDate: formatarDataApi(fim),
      sortOrder: "asc"
    });
    const headers = BRAPI_TOKEN ? { Authorization: `Bearer ${BRAPI_TOKEN}` } : {};
    const resposta = await fetch(`https://brapi.dev/api/v2/fii/dividends?${params.toString()}`, { headers });
    const json = await resposta.json();

    if (!resposta.ok) {
      throw new Error(json.message || json.error || "Nao foi possivel buscar proventos.");
    }

    const calculados = calcularProventosRecebidos(json.dividends || [], hoje);
    proventosRecebidos = combinarProventosRecebidos(obterProventosManuaisElegiveis(hoje), calculados.recebidos);
    proventosFuturos = calculados.futuros;
    proventosStatus.textContent = proventosRecebidos.length
      ? `${proventosRecebidos.length} pagamentos recebidos`
      : "Sem pagamentos elegiveis";
    proventosFuturosStatus.textContent = proventosFuturos.length
      ? `${proventosFuturos.length} pagamentos anunciados`
      : "Sem pagamentos anunciados";
    atualizarDashboard();
  } catch (error) {
    console.error("Erro ao buscar proventos:", error);
    proventosRecebidos = obterProventosManuaisElegiveis(hoje);
    proventosFuturos = [];
    proventosStatus.textContent = "Historico manual carregado";
    proventosFuturosStatus.textContent = "Consulta indisponivel";
    atualizarDashboard();
  }
}

async function atualizarCdi() {
  try {
    const resposta = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/15?formato=json");
    const dados = await resposta.json();
    const ultimo = [...(dados || [])].reverse().find((item) => Number.isFinite(lerNumero(item.valor)));

    if (!resposta.ok || !ultimo) {
      throw new Error("CDI indisponivel");
    }

    cdiDiarioAtual = lerNumero(ultimo.valor);
    renderizarAtivosAoVivo();
  } catch (error) {
    console.error("Erro ao buscar CDI:", error);
    cdiDiarioAtual = null;
    renderizarAtivosAoVivo();
  }
}

function calcularProventosRecebidos(dividendos, hoje) {
  return dividendos
    .reduce((resultado, dividendo) => {
      const ticker = String(dividendo.symbol || "").toUpperCase();
      const dataBase = criarDataBrapi(dividendo.lastDatePrior);
      const dataPagamento = criarDataBrapi(dividendo.paymentDate);
      const valorPorCota = Number(dividendo.rate || 0);

      if (!ticker || !dataPagamento || valorPorCota <= 0) {
        return resultado;
      }

      const dataCorte = dataBase || hoje;
      const quantidadeElegivel = dataPagamento <= hoje
        ? obterQuantidadeAteData(ticker, dataCorte)
        : obterQuantidadeAtual(ticker);

      if (quantidadeElegivel <= 0) {
        return resultado;
      }

      const item = {
        ticker,
        quantidade: quantidadeElegivel,
        valorPorCota,
        total: quantidadeElegivel * valorPorCota,
        dataBase,
        dataPagamento,
        label: dividendo.label || "Provento",
        fonte: "brapi"
      };

      if (dataPagamento <= hoje) {
        resultado.recebidos.push(item);
      } else {
        resultado.futuros.push(item);
      }

      return resultado;
    }, { recebidos: [], futuros: [] });
}

function obterProventosManuaisElegiveis(hoje) {
  return historicoManualProventos
    .map((item) => ({
      ...item,
      dataPagamento: new Date(`${item.dataPagamento}T00:00:00`),
      dataBase: null,
      quantidade: obterQuantidadeAtual(item.ticker),
      valorPorCota: null,
      label: "Provento recebido"
    }))
    .filter((item) => item.dataPagamento <= hoje);
}

function combinarProventosRecebidos(manuais, calculados) {
  const chavesManuais = new Set(manuais.map((item) => chaveProvento(item)));
  const calculadosSemDuplicar = calculados.filter((item) => !chavesManuais.has(chaveProvento(item)));

  return [...manuais, ...calculadosSemDuplicar]
    .sort((a, b) => a.dataPagamento - b.dataPagamento);
}

function chaveProvento(item) {
  return `${item.ticker}|${formatarDataApi(item.dataPagamento)}`;
}

function obterQuantidadeAteData(ticker, data) {
  return carteira
    .filter((item) => item.ticker === ticker && new Date(`${item.data}T00:00:00`) <= data)
    .reduce((soma, item) => soma + item.quantidade, 0);
}

function obterQuantidadeAtual(ticker) {
  return carteira
    .filter((item) => item.ticker === ticker)
    .reduce((soma, item) => soma + item.quantidade, 0);
}

function renderizarProventos() {
  proventosLista.innerHTML = "";
  proventosFuturosLista.innerHTML = "";

  if (!proventosRecebidos.length) {
    proventosLista.innerHTML = '<p class="empty-chart">Sem proventos recebidos para as compras elegiveis.</p>';
  } else {
    proventosRecebidos
      .slice()
      .sort((a, b) => b.dataPagamento - a.dataPagamento)
      .forEach((item) => {
        const row = document.createElement("div");
        row.className = "income-row";
        row.innerHTML = `
          <div>
            <strong>${escaparHtml(item.ticker)} - ${formatarDataObjeto(item.dataPagamento)}</strong>
            <span>${escaparHtml(item.label)}${item.fonte === "manual" ? " - lancamento real informado" : ` - ${item.quantidade} cotas x ${dinheiro.format(item.valorPorCota)}`}</span>
          </div>
          <strong>${dinheiro.format(item.total)}</strong>
        `;
        proventosLista.appendChild(row);
      });
  }

  if (!proventosFuturos.length) {
    proventosFuturosLista.innerHTML = '<p class="empty-chart">Sem pagamentos futuros anunciados pela fonte consultada.</p>';
  } else {
    proventosFuturos
      .slice()
      .sort((a, b) => a.dataPagamento - b.dataPagamento)
      .forEach((item) => {
      const row = document.createElement("div");
      row.className = "income-row";
      row.innerHTML = `
        <div>
          <strong>${escaparHtml(item.ticker)} - ${formatarDataObjeto(item.dataPagamento)}</strong>
          <span>${item.quantidade} cotas x ${dinheiro.format(item.valorPorCota)}${item.dataBase ? ` - data-base ${formatarDataObjeto(item.dataBase)}` : ""}</span>
        </div>
        <strong>${dinheiro.format(item.total)}</strong>
      `;
      proventosFuturosLista.appendChild(row);
      });
  }
}

function criarDataBrapi(valor) {
  if (!valor) return null;
  const data = new Date(String(valor).replace(" ", "T"));
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataApi(data) {
  return data.toISOString().slice(0, 10);
}

function formatarDataObjeto(data) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

function calcularCdbInter(item) {
  const aplicacoes = item.aplicacoes && item.aplicacoes.length ? item.aplicacoes : [item];
  const hoje = new Date();
  const cdiDiario = Number.isFinite(cdiDiarioAtual) ? cdiDiarioAtual : 0;
  const taxaDiaria = (cdiDiario / 100) * cdbInterConfig.percentualCdi;
  const totais = aplicacoes.reduce((resultado, aplicacao) => {
    const dataCompra = new Date(`${aplicacao.data}T00:00:00`);
    const principal = aplicacao.precoCompra * aplicacao.quantidade;
    const diasCorridos = Number.isNaN(dataCompra.getTime()) ? 0 : Math.max(0, Math.floor((hoje - dataCompra) / 86400000));
    const diasUteis = Number.isNaN(dataCompra.getTime()) ? 0 : contarDiasUteis(dataCompra, hoje);
    const rendimentoBruto = principal * (Math.pow(1 + taxaDiaria, diasUteis) - 1);
    const iof = rendimentoBruto * obterAliquotaIof(diasCorridos);
    const baseIr = Math.max(0, rendimentoBruto - iof);
    const ir = baseIr * obterAliquotaIr(diasCorridos);
    const rendimentoLiquido = Math.max(0, rendimentoBruto - iof - ir);

    resultado.principal += principal;
    resultado.diasCorridos = Math.max(resultado.diasCorridos, diasCorridos);
    resultado.diasUteis += diasUteis;
    resultado.rendimentoBruto += rendimentoBruto;
    resultado.iof += iof;
    resultado.ir += ir;
    resultado.rendimentoLiquido += rendimentoLiquido;
    return resultado;
  }, {
    principal: 0,
    diasCorridos: 0,
    diasUteis: 0,
    rendimentoBruto: 0,
    iof: 0,
    ir: 0,
    rendimentoLiquido: 0
  });

  return {
    ...totais,
    cdiDiario,
    valorBruto: totais.principal + totais.rendimentoBruto,
    valorLiquido: totais.principal + totais.rendimentoLiquido
  };
}

function contarDiasUteis(inicio, fim) {
  let total = 0;
  const data = new Date(inicio);

  while (data <= fim) {
    const dia = data.getDay();

    if (dia !== 0 && dia !== 6) {
      total += 1;
    }

    data.setDate(data.getDate() + 1);
  }

  return Math.max(0, total - 1);
}

function obterAliquotaIof(diasCorridos) {
  const tabela = [
    0.96, 0.93, 0.90, 0.86, 0.83, 0.80, 0.76, 0.73, 0.70, 0.66,
    0.63, 0.60, 0.56, 0.53, 0.50, 0.46, 0.43, 0.40, 0.36, 0.33,
    0.30, 0.26, 0.23, 0.20, 0.16, 0.13, 0.10, 0.06, 0.03
  ];

  if (diasCorridos <= 0) return 0.96;
  if (diasCorridos >= 30) return 0;
  return tabela[diasCorridos - 1] || 0;
}

function obterAliquotaIr(diasCorridos) {
  if (diasCorridos <= 180) return 0.225;
  if (diasCorridos <= 360) return 0.20;
  if (diasCorridos <= 720) return 0.175;
  return 0.15;
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
    const cdb = rendaFixa ? calcularCdbInter(item) : null;
    const precoMercado = rendaFixa ? cdb.valorLiquido : cotacoesAtuais[item.ticker];
    const temMercado = rendaFixa || (Number.isFinite(precoMercado) && precoMercado > 0);
    const valorMercado = rendaFixa ? cdb.valorLiquido : temMercado ? precoMercado * item.quantidade : null;
    const ganho = rendaFixa ? cdb.rendimentoLiquido : temMercado ? valorMercado - item.total : null;
    const ganhoPercentual = rendaFixa ? (item.total ? (ganho / item.total) * 100 : 0) : temMercado && item.total ? (ganho / item.total) * 100 : null;
    const variacaoClasse = ganho === null ? "" : ganho >= 0 ? "positive" : "negative";
    const sinal = ganho !== null && ganho > 0 ? "+" : "";
    const detalhesCdb = rendaFixa ? `
        <div>
          <span>IR estimado</span>
          <strong>${dinheiro.format(cdb.ir)}</strong>
        </div>
        <div>
          <span>IOF estimado</span>
          <strong>${dinheiro.format(cdb.iof)}</strong>
        </div>
        <div>
          <span>CDI diario</span>
          <strong>${Number.isFinite(cdiDiarioAtual) ? `${cdb.cdiDiario.toFixed(6)}%` : "Aguardando"}</strong>
        </div>
        <div>
          <span>Dias uteis</span>
          <strong>${cdb.diasUteis}</strong>
        </div>
      ` : "";
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
          <span>${rendaFixa ? "Aplicacoes" : "Quantidade"}</span>
          <strong>${item.quantidade}</strong>
        </div>
        <div>
          <span>Ganho/Perda</span>
          <strong class="${variacaoClasse}">
            ${ganho === null ? "Aguardando" : `${sinal}${dinheiro.format(ganho)} (${sinal}${ganhoPercentual.toFixed(2)}%)`}
          </strong>
        </div>
        <div>
          <span>${rendaFixa ? "Valor bruto" : "Preco medio"}</span>
          <strong>${rendaFixa ? dinheiro.format(cdb.valorBruto) : dinheiro.format(precoMedio)}</strong>
        </div>
        <div>
          <span>${rendaFixa ? "Valor liquido atual" : "Preco de mercado atual"}</span>
          <strong>${temMercado ? dinheiro.format(precoMercado) : "Aguardando"}</strong>
        </div>
        ${detalhesCdb}
      </div>
    `;

    assetLiveList.appendChild(card);
  });
}

function renderizarGraficoPizza(dados) {
  renderizarDonut(dados, ctx, canvas, legendaPizza, {
    vazio: "Sem dados para exibir",
    dicaVazia: "Cadastre compras para montar os graficos.",
    singular: "ativo",
    plural: "ativos"
  });

  fatiasPizza = fatiasGraficos.get(canvas) || [];
}

function renderizarGraficoPizzaSecundario(dados, contexto, canvasAlvo, legenda, opcoes = {}) {
  renderizarDonut(dados, contexto, canvasAlvo, legenda, {
    vazio: "Sem FIIs para exibir",
    dicaVazia: "Cadastre FIIs para montar este grafico.",
    singular: "FII",
    plural: "FIIs",
    centroX: 145,
    centroY: 140,
    raio: 96,
    raioInterno: 46,
    ...opcoes
  });
}

function renderizarDonut(dados, contexto, canvasAlvo, legenda, opcoes = {}) {
  const configGrafico = {
    vazio: "Sem dados para exibir",
    dicaVazia: "Cadastre compras para montar este grafico.",
    singular: "item",
    plural: "itens",
    centroX: 145,
    centroY: 140,
    raio: 96,
    raioInterno: 46,
    ...opcoes
  };
  const fatias = [];

  contexto.clearRect(0, 0, canvasAlvo.width, canvasAlvo.height);
  legenda.innerHTML = "";
  fatiasGraficos.set(canvasAlvo, fatias);

  if (!dados.length) {
    contexto.fillStyle = "#9aa6b5";
    contexto.font = "18px Arial";
    contexto.fillText(configGrafico.vazio, 28, 52);
    legenda.innerHTML = `<p class="empty-chart">${configGrafico.dicaVazia}</p>`;
    return;
  }

  const total = dados.reduce((soma, item) => soma + item.total, 0);
  const centroX = configGrafico.centroX;
  const centroY = configGrafico.centroY;
  const raio = configGrafico.raio;
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
    contexto.strokeStyle = "#20242d";
    contexto.lineWidth = 4;
    contexto.stroke();

    const itemLegenda = criarItemLegenda(item, cor, index);
    legenda.appendChild(itemLegenda);
    fatias.push({
      ...item,
      inicio,
      fim,
      centroX,
      centroY,
      raio,
      raioInterno: configGrafico.raioInterno,
      cor,
      legenda: itemLegenda
    });
    anguloAtual = fim;
  });

  contexto.beginPath();
  contexto.arc(centroX, centroY, configGrafico.raioInterno, 0, Math.PI * 2);
  contexto.fillStyle = "#20242d";
  contexto.fill();
  contexto.fillStyle = "#eef3f8";
  contexto.font = "bold 18px Arial";
  contexto.textAlign = "center";
  contexto.fillText(`${dados.length}`, centroX, centroY - 2);
  contexto.fillStyle = "#9aa6b5";
  contexto.font = "13px Arial";
  contexto.fillText(dados.length === 1 ? configGrafico.singular : configGrafico.plural, centroX, centroY + 18);
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

function renderizarEvolucaoPatrimonio() {
  const meses = obterMesesEvolucao(Number(patrimonioPeriodo.value || 12));
  const tipoSelecionado = patrimonioTipo.value;
  const dadosBase = meses.map((mes) => calcularPatrimonioDoMes(mes, tipoSelecionado));
  const dados = aplicarMetricaDeAporte(dadosBase);
  const largura = canvasPatrimonio.width;
  const altura = canvasPatrimonio.height;
  const margem = { top: 26, right: 28, bottom: 58, left: 72 };
  const areaLargura = largura - margem.left - margem.right;
  const areaAltura = altura - margem.top - margem.bottom;
  const maiorValor = Math.max(1000, ...dados.map((item) => item.aplicado + item.ganho));
  const maiorDeficit = Math.max(0, ...dados.map((item) => item.deficitAporte));
  const topoEscala = Math.ceil(maiorValor / 1000) * 1000;
  const fundoEscala = maiorDeficit ? Math.ceil(maiorDeficit / 1000) * 1000 : 0;
  const totalEscala = topoEscala + fundoEscala;
  const yZero = margem.top + (topoEscala / totalEscala) * areaAltura;
  const linhas = 5;

  barrasPatrimonio = [];
  esconderTooltipPatrimonio();
  ctxPatrimonio.clearRect(0, 0, largura, altura);
  ctxPatrimonio.fillStyle = "#1d222b";
  ctxPatrimonio.fillRect(0, 0, largura, altura);
  ctxPatrimonio.font = "13px Arial";
  ctxPatrimonio.textBaseline = "middle";

  for (let index = 0; index <= linhas; index += 1) {
    const valor = topoEscala - (totalEscala / linhas) * index;
    const y = valorParaYPatrimonio(valor, margem, areaAltura, topoEscala, totalEscala);

    ctxPatrimonio.beginPath();
    ctxPatrimonio.moveTo(margem.left, y);
    ctxPatrimonio.lineTo(largura - margem.right, y);
    ctxPatrimonio.strokeStyle = Math.abs(valor) < 1 ? "#4a5260" : "#303744";
    ctxPatrimonio.lineWidth = 1;
    ctxPatrimonio.stroke();
    ctxPatrimonio.fillStyle = "#aeb8c4";
    ctxPatrimonio.textAlign = "right";
    ctxPatrimonio.fillText(formatarNumeroGrafico(valor), margem.left - 12, y);
  }

  ctxPatrimonio.beginPath();
  ctxPatrimonio.moveTo(margem.left, yZero);
  ctxPatrimonio.lineTo(largura - margem.right, yZero);
  ctxPatrimonio.strokeStyle = "#6a7280";
  ctxPatrimonio.lineWidth = 1.5;
  ctxPatrimonio.stroke();

  const passo = areaLargura / dados.length;
  const larguraBarra = Math.min(48, passo * 0.66);

  dados.forEach((item, index) => {
    const x = margem.left + passo * index + (passo - larguraBarra) / 2;
    const aplicadoAltura = (item.aplicado / totalEscala) * areaAltura;
    const ganhoAltura = (item.ganho / totalEscala) * areaAltura;
    const deficitAltura = (item.deficitAporte / totalEscala) * areaAltura;
    const yAplicado = yZero - aplicadoAltura;
    const yGanho = yAplicado - ganhoAltura;
    const segmentos = [];

    if (aplicadoAltura > 0) {
      segmentos.push({ x, y: yAplicado, largura: larguraBarra, altura: aplicadoAltura });
    }

    if (ganhoAltura > 0) {
      segmentos.push({ x, y: yGanho, largura: larguraBarra, altura: ganhoAltura });
    }

    if (deficitAltura > 0) {
      segmentos.push({ x, y: yZero, largura: larguraBarra, altura: deficitAltura });
    }

    barrasPatrimonio.push({
      ...item,
      xCentro: x + larguraBarra / 2,
      yTopo: Math.min(yAplicado, yGanho),
      yBase: yZero,
      segmentos
    });

    ctxPatrimonio.fillStyle = "#28a977";
    desenharBarraArredondada(ctxPatrimonio, x, yAplicado, larguraBarra, aplicadoAltura, ganhoAltura > 0 ? 0 : 5);

    if (ganhoAltura > 0) {
      ctxPatrimonio.fillStyle = "#8dddcf";
      desenharBarraArredondada(ctxPatrimonio, x, yGanho, larguraBarra, ganhoAltura, 5);
    }

    if (deficitAltura > 0) {
      ctxPatrimonio.fillStyle = "#cf3f4b";
      desenharBarraArredondada(ctxPatrimonio, x, yZero, larguraBarra, deficitAltura, 5);
    }

    ctxPatrimonio.save();
    ctxPatrimonio.translate(x + larguraBarra / 2, altura - 28);
    ctxPatrimonio.rotate(-Math.PI / 4);
    ctxPatrimonio.fillStyle = "#aeb8c4";
    ctxPatrimonio.textAlign = "right";
    ctxPatrimonio.fillText(item.rotulo, 0, 0);
    ctxPatrimonio.restore();
  });

  if (!carteira.length) {
    ctxPatrimonio.fillStyle = "#aeb8c4";
    ctxPatrimonio.textAlign = "center";
    ctxPatrimonio.font = "18px Arial";
    ctxPatrimonio.fillText("Cadastre compras para acompanhar a evolucao.", largura / 2, altura / 2);
  }
}

function obterMesesEvolucao(totalMeses) {
  const agora = new Date();
  const meses = [];

  if (totalMeses === 12) {
    for (let mes = 0; mes < 12; mes += 1) {
      meses.push({
        ano: agora.getFullYear(),
        mes,
        inicio: new Date(agora.getFullYear(), mes, 1),
        fim: new Date(agora.getFullYear(), mes + 1, 0),
        rotulo: `${String(mes + 1).padStart(2, "0")}/${String(agora.getFullYear()).slice(-2)}`
      });
    }

    return meses;
  }

  for (let index = totalMeses - 1; index >= 0; index -= 1) {
    const data = new Date(agora.getFullYear(), agora.getMonth() - index, 1);
    meses.push({
      ano: data.getFullYear(),
      mes: data.getMonth(),
      inicio: data,
      fim: new Date(data.getFullYear(), data.getMonth() + 1, 0),
      rotulo: `${String(data.getMonth() + 1).padStart(2, "0")}/${String(data.getFullYear()).slice(-2)}`
    });
  }

  return meses;
}

function calcularPatrimonioDoMes(mes, tipoSelecionado) {
  const hoje = new Date();
  const carteiraAjustada = obterCarteiraComAjustes();

  if (mes.inicio > hoje) {
    return {
      rotulo: mes.rotulo,
      aplicado: 0,
      ganho: 0,
      total: 0,
      aporteMensal: 0,
      tiposDoMes: [],
      tipos: [],
      periodoDisponivel: false
    };
  }

  const comprasDoMes = carteiraAjustada.filter((item) => {
    const dataCompra = new Date(`${item.data}T00:00:00`);
    const classe = obterClasse(item.ticker);

    return dataCompra <= mes.fim && (tipoSelecionado === "todos" || classe === tipoSelecionado);
  });
  const comprasNoMes = carteiraAjustada.filter((item) => {
    const dataCompra = new Date(`${item.data}T00:00:00`);
    const classe = obterClasse(item.ticker);

    return dataCompra >= mes.inicio &&
      dataCompra <= mes.fim &&
      (tipoSelecionado === "todos" || classe === tipoSelecionado);
  });
  const aplicado = comprasDoMes.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const aporteMensal = comprasNoMes.reduce((soma, item) => soma + item.precoCompra * item.quantidade, 0);
  const valorMercado = comprasDoMes.reduce((soma, item) => {
    if (item.ticker === "CDBINTERDI") {
      return soma + item.precoCompra * item.quantidade;
    }

    const cotacao = cotacoesAtuais[item.ticker];
    const precoAtual = Number.isFinite(cotacao) && cotacao > 0 ? cotacao : item.precoCompra;
    return soma + precoAtual * item.quantidade;
  }, 0);
  const tipos = obterTiposComprados(comprasDoMes);

  return {
    rotulo: mes.rotulo,
    aplicado,
    ganho: Math.max(0, valorMercado - aplicado),
    total: valorMercado,
    aporteMensal,
    tiposDoMes: obterTiposComprados(comprasNoMes),
    tipos,
    periodoDisponivel: true
  };
}

function aplicarMetricaDeAporte(dados) {
  let maiorAporteAnterior = 0;

  return dados.map((item) => {
    const deficitAporte = item.periodoDisponivel && maiorAporteAnterior > 0 && item.aporteMensal < maiorAporteAnterior
      ? maiorAporteAnterior - item.aporteMensal
      : 0;

    if (item.aporteMensal > maiorAporteAnterior) {
      maiorAporteAnterior = item.aporteMensal;
    }

    return {
      ...item,
      deficitAporte,
      metricaAporte: maiorAporteAnterior
    };
  });
}

function valorParaYPatrimonio(valor, margem, areaAltura, topoEscala, totalEscala) {
  return margem.top + ((topoEscala - valor) / totalEscala) * areaAltura;
}

function obterTiposComprados(compras) {
  const mapa = compras.reduce((resultado, item) => {
    const tipo = obterClasse(item.ticker);
    const total = item.precoCompra * item.quantidade;

    if (!resultado[tipo]) {
      resultado[tipo] = {
        tipo,
        total: 0,
        tickers: new Set()
      };
    }

    resultado[tipo].total += total;
    resultado[tipo].tickers.add(item.ticker);
    return resultado;
  }, {});

  return Object.values(mapa)
    .map((item) => ({
      tipo: item.tipo,
      total: item.total,
      tickers: [...item.tickers].sort()
    }))
    .sort((a, b) => b.total - a.total);
}

function mostrarTooltipPatrimonio(event, barra) {
  const rectCanvas = canvasPatrimonio.getBoundingClientRect();
  const rectPainel = canvasPatrimonio.closest(".patrimonio-panel").getBoundingClientRect();
  const tiposDoMesHtml = barra.tiposDoMes.length
    ? barra.tiposDoMes
        .map((item) => `
          <span>${escaparHtml(item.tipo)}: ${dinheiro.format(item.total)} (${escaparHtml(item.tickers.join(", "))})</span>
        `)
        .join("")
    : "<span>Nenhuma compra neste mes.</span>";
  const tiposAcumuladosHtml = barra.tipos.length
    ? barra.tipos
        .map((item) => `
          <span>${escaparHtml(item.tipo)}: ${dinheiro.format(item.total)} (${escaparHtml(item.tickers.join(", "))})</span>
        `)
        .join("")
    : "<span>Sem compras acumuladas ate este mes.</span>";
  const deficitHtml = barra.deficitAporte > 0
    ? `<span>Abaixo da metrica: ${dinheiro.format(barra.deficitAporte)}</span>`
    : "";

  tooltipPatrimonio.innerHTML = `
    <strong>${escaparHtml(barra.rotulo)}</strong>
    <span>Patrimonio estimado: ${dinheiro.format(barra.total)}</span>
    <span>Valor aplicado: ${dinheiro.format(barra.aplicado)}</span>
    <span>Ganho de capital: ${dinheiro.format(barra.ganho)}</span>
    <span>Aporte do mes: ${dinheiro.format(barra.aporteMensal)}</span>
    ${deficitHtml}
    <small>Tipos comprados no mes</small>
    <div class="patrimonio-tooltip-list">${tiposDoMesHtml}</div>
    <small>Carteira acumulada</small>
    <div class="patrimonio-tooltip-list">${tiposAcumuladosHtml}</div>
  `;

  tooltipPatrimonio.classList.add("is-visible");

  const larguraTooltip = tooltipPatrimonio.offsetWidth;
  const alturaTooltip = tooltipPatrimonio.offsetHeight;
  const xDesejado = event.clientX - rectPainel.left + 14;
  const yDesejado = rectCanvas.top - rectPainel.top + (barra.yTopo * rectCanvas.height) / canvasPatrimonio.height - 8;
  const maxX = rectPainel.width - larguraTooltip - 12;
  const maxY = rectPainel.height - alturaTooltip - 12;

  tooltipPatrimonio.style.left = `${Math.max(12, Math.min(xDesejado, maxX))}px`;
  tooltipPatrimonio.style.top = `${Math.max(12, Math.min(yDesejado, maxY))}px`;
}

function esconderTooltipPatrimonio() {
  tooltipPatrimonio.classList.remove("is-visible");
}

function obterBarraPatrimonioNoMouse(event) {
  const rect = canvasPatrimonio.getBoundingClientRect();
  const escalaX = canvasPatrimonio.width / rect.width;
  const escalaY = canvasPatrimonio.height / rect.height;
  const x = (event.clientX - rect.left) * escalaX;
  const y = (event.clientY - rect.top) * escalaY;

  return barrasPatrimonio.find((barra) => (
    barra.segmentos.some((segmento) => (
      x >= segmento.x &&
      x <= segmento.x + segmento.largura &&
      y >= segmento.y &&
      y <= segmento.y + segmento.altura
    ))
  ));
}

function desenharBarraArredondada(contexto, x, y, largura, altura, raio) {
  if (altura <= 0) return;

  const raioFinal = Math.min(raio, largura / 2, altura / 2);

  contexto.beginPath();
  contexto.moveTo(x, y + altura);
  contexto.lineTo(x, y + raioFinal);
  contexto.quadraticCurveTo(x, y, x + raioFinal, y);
  contexto.lineTo(x + largura - raioFinal, y);
  contexto.quadraticCurveTo(x + largura, y, x + largura, y + raioFinal);
  contexto.lineTo(x + largura, y + altura);
  contexto.closePath();
  contexto.fill();
}

function formatarNumeroGrafico(valor) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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

function mostrarTooltip(event, fatia, canvasAlvo = canvas) {
  const tooltip = obterTooltipDoGrafico(canvasAlvo);
  const compradores = Object.entries(fatia.compradores || {})
    .map(([nome, quantidade]) => `${escaparHtml(nome)} - ${quantidade}`)
    .join("<br>");
  const rect = canvasAlvo.getBoundingClientRect();
  const carteiraTexto = `${fatia.percentual.toFixed(1)}%`;

  tooltip.innerHTML = `
    <strong>${escaparHtml(fatia.ticker)}</strong>
    <span>${dinheiro.format(fatia.total)}</span>
    <span>Segmento: ${fatia.segmento}</span>
    <span>Participacao: ${carteiraTexto}</span>
    ${compradores ? `<span>${compradores}</span>` : ""}
  `;
  tooltip.style.left = `${event.clientX - rect.left + 14}px`;
  tooltip.style.top = `${event.clientY - rect.top + 14}px`;
  tooltip.classList.add("is-visible");
  fatia.legenda?.classList.add("is-active");
}

function esconderTooltip(canvasAlvo = canvas) {
  const tooltip = obterTooltipDoGrafico(canvasAlvo);
  tooltip.classList.remove("is-visible");
  (fatiasGraficos.get(canvasAlvo) || []).forEach((fatia) => {
    fatia.legenda?.classList.remove("is-active");
  });
}

function obterFatiaNoMouse(event, canvasAlvo = canvas) {
  const rect = canvasAlvo.getBoundingClientRect();
  const escalaX = canvasAlvo.width / rect.width;
  const escalaY = canvasAlvo.height / rect.height;
  const x = (event.clientX - rect.left) * escalaX;
  const y = (event.clientY - rect.top) * escalaY;

  return (fatiasGraficos.get(canvasAlvo) || []).find((fatia) => {
    const dx = x - fatia.centroX;
    const dy = y - fatia.centroY;
    const distancia = Math.sqrt(dx * dx + dy * dy);
    let angulo = Math.atan2(dy, dx);

    if (angulo < -Math.PI / 2) {
      angulo += Math.PI * 2;
    }

    return distancia <= fatia.raio && distancia >= fatia.raioInterno && angulo >= fatia.inicio && angulo <= fatia.fim;
  });
}

function obterTooltipDoGrafico(canvasAlvo) {
  if (tooltipsGraficos.has(canvasAlvo)) {
    return tooltipsGraficos.get(canvasAlvo);
  }

  const tooltip = canvasAlvo === canvas ? tooltipGrafico : document.createElement("div");

  if (canvasAlvo !== canvas) {
    tooltip.className = "chart-tooltip";
    tooltip.setAttribute("role", "status");
    canvasAlvo.parentElement.appendChild(tooltip);
  }

  tooltipsGraficos.set(canvasAlvo, tooltip);
  return tooltip;
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
  const coresFixas = {
    FIIs: "#4389ed",
    Acoes: "#69dfad",
    "Renda fixa": "#ffdf61",
    Giovanny: "#e39a22",
    Rafaela: "#087da0",
    CDBINTERDI: "#ffdf61"
  };

  if (coresFixas[ticker]) {
    return coresFixas[ticker];
  }

  const cores = ["#6752b5", "#2a8196", "#ff7575", "#4fd2d8", "#b66cff", "#ff955c"];
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

function registrarInteracaoPizza(canvasAlvo) {
  canvasAlvo.addEventListener("mousemove", (event) => {
    const fatia = obterFatiaNoMouse(event, canvasAlvo);

    if (!fatia) {
      esconderTooltip(canvasAlvo);
      return;
    }

    esconderTooltip(canvasAlvo);
    mostrarTooltip(event, fatia, canvasAlvo);
  });
  canvasAlvo.addEventListener("mouseleave", () => esconderTooltip(canvasAlvo));
}

inputTicker.addEventListener("blur", () => {
  if (tipoCompra !== "renda-fixa") buscarCotacao(inputTicker.value);
});
inputComprador.addEventListener("change", atualizarCampoSenha);
mainNavTabs.forEach((tab) => tab.addEventListener("click", () => atualizarTelaPrincipal(tab.dataset.mainView)));
chartTabs.forEach((tab) => tab.addEventListener("click", () => atualizarAbaGrafico(tab.dataset.chartView)));
patrimonioPeriodo.addEventListener("change", renderizarEvolucaoPatrimonio);
patrimonioTipo.addEventListener("change", renderizarEvolucaoPatrimonio);
purchaseTabs.forEach((tab) => tab.addEventListener("click", () => {
  atualizarTelaPrincipal("compras");
  atualizarTipoCompra(tab.dataset.purchaseType);
}));
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
[canvas, canvasFiis, canvasFiisTab, canvasCompradores].forEach(registrarInteracaoPizza);
canvasPatrimonio.addEventListener("mousemove", (event) => {
  const barra = obterBarraPatrimonioNoMouse(event);

  if (!barra) {
    esconderTooltipPatrimonio();
    return;
  }

  mostrarTooltipPatrimonio(event, barra);
});
canvasPatrimonio.addEventListener("mouseleave", esconderTooltipPatrimonio);
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
atualizarTelaPrincipal("inicio");
atualizarTipoCompra("renda-fixa");
atualizarCampoSenha();
iniciarSupabase();
carregarCarteira();






