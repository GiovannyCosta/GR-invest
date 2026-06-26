const crypto = require("crypto");

const headers = {
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return resposta(405, { error: "Metodo nao permitido." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const action = body.action;

    if (!["insert", "upsert_many"].includes(action)) {
      return resposta(400, { error: "Acao invalida." });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missingSupabaseVars = [];
    if (!supabaseUrl) missingSupabaseVars.push("SUPABASE_URL");
    if (!serviceKey) missingSupabaseVars.push("SUPABASE_SERVICE_ROLE_KEY");

    if (missingSupabaseVars.length) {
      return resposta(500, {
        error: `Variaveis ausentes no Netlify: ${missingSupabaseVars.join(", ")}. Configure em Site configuration > Environment variables e faca um novo deploy.`
      });
    }

    const proventos = action === "insert" ? [body.provento] : body.proventos;
    if (!Array.isArray(proventos) || !proventos.length) {
      return resposta(400, { error: "Nenhum provento enviado." });
    }

    const compradorSenha = normalizarComprador(body.comprador || (proventos[0] && proventos[0].comprador));
    if (!senhaValida(compradorSenha, body.senha)) {
      return resposta(401, { error: "Senha do comprador invalida." });
    }

    const validados = [];
    for (const item of proventos) {
      const provento = validarProvento({ ...item, comprador: item.comprador || compradorSenha });

      if (!provento.ok) {
        return resposta(400, { error: provento.error });
      }

      if (provento.data.comprador !== compradorSenha) {
        return resposta(401, { error: "A senha informada nao confere com o comprador do provento." });
      }

      validados.push(provento.data);
    }

    const result = await supabaseRequest(supabaseUrl, serviceKey, "/rest/v1/proventos_manuais?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(validados)
    });

    if (action === "insert") {
      return resposta(result.status, result.body[0] || result.body);
    }

    return resposta(result.status, result.body);
  } catch (error) {
    console.error(error);
    return resposta(500, { error: "Erro interno ao processar o provento manual." });
  }
};

async function supabaseRequest(supabaseUrl, serviceKey, path, options) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    return { ok: false, status: response.status, body: { error: body.message || body.error || "Erro no Supabase." } };
  }

  return { ok: true, status: response.status, body };
}

function validarProvento(provento) {
  if (!provento) return { ok: false, error: "Provento nao enviado." };

  const data = {
    id: String(provento.id || `manual-${Date.now()}`).trim(),
    ticker: String(provento.ticker || "").trim().toUpperCase(),
    data_pagamento: String(provento.data_pagamento || ""),
    total: Number(provento.total),
    comprador: normalizarComprador(provento.comprador)
  };

  if (!data.id) return { ok: false, error: "ID obrigatorio." };
  if (!data.ticker) return { ok: false, error: "Ticker obrigatorio." };
  if (!data.data_pagamento) return { ok: false, error: "Data de pagamento obrigatoria." };
  if (!Number.isFinite(data.total) || data.total <= 0) return { ok: false, error: "Valor recebido invalido." };
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
  const nome = String(comprador || "").trim().toLowerCase();

  if (nome === "giovanny") return "Giovanny";
  if (nome === "rafaela") return "Rafaela";
  return "";
}

function resposta(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
