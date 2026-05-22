import { localDb } from "./local-db";

const PROVIDERS: Record<string, { url: string; model: string; label: string }> = {
  "gsk_":    { url: "https://api.groq.com/openai/v1",                          model: "llama-3.3-70b-versatile",      label: "Groq — Llama 3.3 70B" },
  "sk-or-":  { url: "https://openrouter.ai/api/v1",                            model: "openai/gpt-4o-mini",           label: "OpenRouter" },
  "pplx-":   { url: "https://api.perplexity.ai",                               model: "sonar-pro",                    label: "Perplexity Sonar Pro" },
  "sk-ant-": { url: "https://api.anthropic.com/v1",                            model: "claude-opus-4-5",              label: "Anthropic Claude" },
  "AIza":    { url: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash",             label: "Google Gemini" },
  "xai-":    { url: "https://api.x.ai/v1",                                     model: "grok-3-latest",                label: "xAI Grok 3" },
  "tvly-":   { url: "https://api.tavily.com",                                  model: "tavily-search",                label: "Tavily Search" },
  "sk-":     { url: "https://api.openai.com/v1",                               model: "gpt-4o",                       label: "OpenAI GPT-4o" },
};

export const MODEL_OPTIONS: Array<{ id: string; label: string; subtitle: string; prefix: string; model: string; url: string }> = [
  { id: "groq-llama",   label: "Llama 3.3 70B",          subtitle: "Groq — Gratuito, rápido",               prefix: "gsk_",    model: "llama-3.3-70b-versatile",       url: "https://api.groq.com/openai/v1" },
  { id: "groq-deepseek",label: "DeepSeek R1",            subtitle: "Groq — Raciocínio avançado",            prefix: "gsk_",    model: "deepseek-r1-distill-llama-70b", url: "https://api.groq.com/openai/v1" },
  { id: "gemini-pro",   label: "Gemini 2.0 Flash",       subtitle: "Google — Rápido e preciso",             prefix: "AIza",    model: "gemini-2.0-flash",              url: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "gemini-think", label: "Gemini 2.5 Pro",         subtitle: "Google — Máxima qualidade",             prefix: "AIza",    model: "gemini-2.5-pro-preview-06-05",  url: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "gpt4o",        label: "GPT-4o",                 subtitle: "OpenAI — Preciso e versátil",           prefix: "sk-",     model: "gpt-4o",                        url: "https://api.openai.com/v1" },
  { id: "gpt4o-mini",   label: "GPT-4o Mini",            subtitle: "OpenAI — Econômico e rápido",           prefix: "sk-",     model: "gpt-4o-mini",                   url: "https://api.openai.com/v1" },
  { id: "claude-opus",  label: "Claude Opus 4.5",        subtitle: "Anthropic — Melhor raciocínio jurídico",prefix: "sk-ant-", model: "claude-opus-4-5",               url: "https://api.anthropic.com/v1" },
  { id: "claude-sonnet",label: "Claude Sonnet 4.5",      subtitle: "Anthropic — Equilíbrio qualidade/custo",prefix: "sk-ant-", model: "claude-sonnet-4-5",             url: "https://api.anthropic.com/v1" },
  { id: "perplexity",   label: "Perplexity Sonar Pro",   subtitle: "Com pesquisa na internet em tempo real",prefix: "pplx-",   model: "sonar-pro",                     url: "https://api.perplexity.ai" },
  { id: "grok",         label: "Grok 3",                 subtitle: "xAI — Análise e raciocínio",            prefix: "xai-",    model: "grok-3-latest",                 url: "https://api.x.ai/v1" },
  { id: "openrouter",   label: "OpenRouter",             subtitle: "Acesso a qualquer modelo",              prefix: "sk-or-",  model: "openai/gpt-4o-mini",            url: "https://openrouter.ai/api/v1" },
];

export async function tavilySearch(query: string, apiKey?: string): Promise<string> {
  const key = apiKey || localStorage.getItem("tavily_api_key") || "";
  if (!key) return "";
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, search_depth: "advanced", include_answer: true, max_results: 5, include_domains: ["stj.jus.br","stf.jus.br","cnj.jus.br","jusbrasil.com.br","conjur.com.br","planalto.gov.br"] }),
  });
  if (!res.ok) return "";
  const d = await res.json() as any;
  const answer = d.answer ? `RESPOSTA: ${d.answer}\n\n` : "";
  const results = (d.results || []).slice(0, 5).map((r: any, i: number) =>
    `[${i+1}] ${r.title}\n${r.url}\n${(r.content || "").slice(0, 400)}`
  ).join("\n\n");
  return answer + results;
}

export async function elevenLabsTts(text: string, apiKey: string, voiceId?: string): Promise<ArrayBuffer | null> {
  const vid = voiceId || localStorage.getItem("elevenlabs_voice_id") || "XrExE9yKIg1WjnnlVkGX";
  const chunk = text.slice(0, 4800);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({ text: chunk, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true } }),
  });
  if (!res.ok) return null;
  return await res.arrayBuffer();
}

export function detectProvider(key: string): { url: string; model: string } | null {
  const k = key.trim();
  for (const [prefix, cfg] of Object.entries(PROVIDERS)) {
    if (k.startsWith(prefix)) return cfg;
  }
  return null;
}

export function getActiveKey(): { key: string; url: string; model: string } | null {
  const cfg = localDb.aiConfig.get();
  for (const field of ["groq_api_key", "openai_api_key", "custom4_api_key", "perplexity_api_key", "gemini_api_key"]) {
    const k = (cfg[field] || "").trim();
    if (!k) continue;
    if (field === "custom4_api_key") {
      return { key: k, url: (cfg.custom4_api_url || "https://api.groq.com/openai/v1").trim(), model: (cfg.custom4_api_model || "llama-3.3-70b-versatile").trim() };
    }
    const prov = detectProvider(k);
    if (prov) return { key: k, url: prov.url, model: prov.model };
  }
  return null;
}

export async function directChat(
  messages: Array<{ role: string; content: string }>,
  opts?: { key?: string; url?: string; model?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  let key = (opts?.key || "").trim();
  let url = (opts?.url || "").trim();
  let model = (opts?.model || "").trim();

  if (!key) {
    const active = getActiveKey();
    if (!active) throw new Error("Nenhuma chave de IA configurada. Vá em Configurações e cole sua chave Groq (gratuita).");
    key = active.key; url = active.url; model = active.model;
  } else if (!url) {
    const prov = detectProvider(key);
    url = prov?.url || "https://api.groq.com/openai/v1";
    model = model || prov?.model || "llama-3.3-70b-versatile";
  }

  const baseUrl = url.replace(/\/chat\/completions\/?$/, "").replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: opts?.maxTokens || 4096, temperature: opts?.temperature ?? 0.7 }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("Chave de API inválida ou expirada. Gere uma nova chave.");
    throw new Error(`Erro da IA (${res.status}): ${txt.slice(0, 150)}`);
  }
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || "";
}

export async function directStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  opts?: { key?: string; url?: string; model?: string; signal?: AbortSignal; systemPrompt?: string }
): Promise<void> {
  let key = (opts?.key || "").trim();
  let url = (opts?.url || "").trim();
  let model = (opts?.model || "").trim();

  if (!key) {
    const active = getActiveKey();
    if (!active) throw new Error("Nenhuma chave de IA configurada. Vá em Configurações e cole sua chave Groq (gratuita).");
    key = active.key; url = active.url; model = active.model;
  } else if (!url) {
    const prov = detectProvider(key);
    url = prov?.url || "https://api.groq.com/openai/v1";
    model = model || prov?.model || "llama-3.3-70b-versatile";
  }

  const baseUrl = url.replace(/\/chat\/completions\/?$/, "").replace(/\/$/, "");
  const isGroq = baseUrl.includes("groq.com");
  const maxTokens = isGroq ? 32000 : 65536;

  const finalMessages: Array<{ role: string; content: string }> = opts?.systemPrompt
    ? [{ role: "system", content: opts.systemPrompt }, ...messages]
    : messages;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: finalMessages, stream: true, max_tokens: maxTokens, temperature: 0.3 }),
    signal: opts?.signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("Chave de API inválida. Verifique nas Configurações.");
    throw new Error(`Erro da IA (${res.status}): ${txt.slice(0, 150)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Sem resposta do servidor de IA");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(jsonStr) as any;
        const delta = parsed.choices?.[0]?.delta?.content || parsed.text || parsed.content || "";
        if (delta) onChunk(delta);
      } catch { /* ignore parse errors */ }
    }
  }
}
