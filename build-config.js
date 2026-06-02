const fs = require("fs");

const isNetlify = process.env.NETLIFY === "true";
const forceBuild = process.env.FORCE_CONFIG_BUILD === "true";

if (!isNetlify && !forceBuild && fs.existsSync("config.js")) {
  console.log("config.js local encontrado. Geracao ignorada fora do Netlify.");
  process.exit(0);
}

const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  BRAPI_TOKEN: process.env.BRAPI_TOKEN || ""
};

const missing = Object.entries(config)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.warn(`Variaveis ausentes no deploy: ${missing.join(", ")}`);
}

const file = `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

fs.writeFileSync("config.js", file);
console.log("config.js gerado para o deploy.");
