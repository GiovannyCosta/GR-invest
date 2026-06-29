const crypto = require("crypto");

const headers = {
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return resposta(405, { error: "Metodo nao permitido." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const action = body.action;

    if (!["insert", "update", "delete"].includes(action)) {
      return resposta(400, { error: "Acao invalida." });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missingSupabaseVars = [];
    if (!supabaseUrl) missingSupabaseVars.push("SUPABASE_URL");
    if (!serviceKey) missingSupabaseVars.push("SUPABASE_SERVICE_ROLE_KEY");

    if (missingSupabaseVars.length) {
      return resposta(500, {
        error: `Variaveis ausentes no Netlify: ${missingSupabaseVars.join(", ")}. Configure em Site configuration > Environment variables e faca um novo deploy.`,
      });
    }

    if (action === "delete") {
      return excluirCompra(supabaseUrl, serviceKey, body);
    }

    const compra = validarCompra(body.compra);
    if (!compra.ok) {
      return resposta(400, { error: compra.error });
    }

    if (!senhaValida(compra.data.comprador, body.senha)) {
      return resposta(401, { error: "Senha do comprador invalida." });
    }

    if (action === "insert") {
      return inserirCompra(supabaseUrl, serviceKey, compra.data);
    }

    return atualizarCompra(supabaseUrl, serviceKey, body.id, compra.data);
  } catch (error) {
    console.error(error);
    return resposta(500, { error: "Erro interno ao processar a compra." });
  }
};

async function inserirCompra(supabaseUrl, serviceKey, compra) {
  const result = await supabaseRequest(supabaseUrl, serviceKey, "/rest/v1/compras", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([compra]),
  });

  return resposta(result.status, result.body[0] || result.body);
}

async function atualizarCompra(supabaseUrl, serviceKey, id, compra) {
  if (!id) {
    return resposta(400, { error: "ID da compra nao informado." });
  }

  const result = await supabaseRequest(supabaseUrl, serviceKey, `/rest/v1/compras?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(compra),
  });

  if (result.ok && !result.body.length) {
    return resposta(404, { error: "Compra nao encontrada para atualizar." });
  }

  return resposta(result.status, result.body[0] || result.body);
}

async function excluirCompra(supabaseUrl, serviceKey, body) {
  if (!body.id) {
    return resposta(400, { error: "ID da compra nao informado." });
  }

  const atual = await supabaseRequest(
    supabaseUrl,
    serviceKey,
    `/rest/v1/compras?id=eq.${encodeURIComponent(body.id)}&select=*`,
    { method: "GET" },
  );
  const compra = atual.body[0];

  if (!compra) {
    return resposta(404, { error: "Compra nao encontrada para excluir." });
  }

  if (!senhaValida(compra.comprador, body.senha)) {
    return resposta(401, { error: "Senha do comprador invalida." });
  }

  const result = await supabaseRequest(
    supabaseUrl,
    serviceKey,
    `/rest/v1/compras?id=eq.${encodeURIComponent(body.id)}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    },
  );

  return resposta(result.status, result.body[0] || result.body);
}

async function supabaseRequest(supabaseUrl, serviceKey, path, options) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    return { ok: false, status: response.status, body: { error: body.message || body.error || "Erro no Supabase." } };
  }

  return { ok: true, status: response.status, body };
}

function validarCompra(compra) {
  if (!compra) return { ok: false, error: "Compra nao enviada." };

  const data = {
    ticker: String(compra.ticker || "")
      .trim()
      .toUpperCase(),
    preco_compra: Number(compra.preco_compra),
    quantidade: Number(compra.quantidade),
    data_compra: String(compra.data_compra || ""),
    comprador: normalizarComprador(compra.comprador),
  };

  if (!data.ticker) return { ok: false, error: "Ticker obrigatorio." };
  if (!Number.isFinite(data.preco_compra) || data.preco_compra <= 0) return { ok: false, error: "Preco invalido." };
  if (!Number.isInteger(data.quantidade) || data.quantidade <= 0) return { ok: false, error: "Quantidade invalida." };
  if (!data.data_compra) return { ok: false, error: "Data obrigatoria." };
  if (!data.comprador) return { ok: false, error: "Comprador precisa ser Giovanny ou Rafaela." };

  return { ok: true, data };
}

function senhaValida(comprador, senha) {
  const nome = normalizarComprador(comprador);
  const expected = nome === "Giovanny" ? process.env.GIOVANNY_PASSWORD : process.env.RAFAELA_PASSWORD;

  if (!expected || !senha) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(String(senha));

  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function normalizarComprador(comprador) {
  const nome = String(comprador || "")
    .trim()
    .toLowerCase();

  if (nome === "giovanny") return "Giovanny";
  if (nome === "rafaela") return "Rafaela";
  return "";
}

function resposta(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}
