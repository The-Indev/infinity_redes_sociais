const runtime = typeof window !== 'undefined' ? window.__ENV__ || {} : {};

function pick(runtimeKey, viteKey, fallback = '') {
  const fromRuntime = runtime[runtimeKey];
  if (fromRuntime && !fromRuntime.startsWith('__')) return fromRuntime;
  return import.meta.env[viteKey] || fallback;
}

export const config = {
  supabaseUrl: pick('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  supabaseAnonKey: pick('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
  supabaseSchema: pick('SUPABASE_SCHEMA', 'VITE_SUPABASE_SCHEMA', 'infinity_redes_sociais'),
  webhookAprovacao: pick('WEBHOOK_APROVACAO', 'VITE_WEBHOOK_APROVACAO'),
  webhookImagem: pick('WEBHOOK_IMAGEM', 'VITE_WEBHOOK_IMAGEM', 'https://n8n.space-cloud.tech/webhook/imagem'),
  webhookColetor: pick('WEBHOOK_COLETOR', 'VITE_WEBHOOK_COLETOR', 'https://n8n.infinitydev.tech/webhook/coletor'),
  // Vazio = mesma origem (nginx faz proxy de /api/). Em dev, defina
  // VITE_VIDEO_SERVICE_URL=http://localhost:3001.
  videoServiceUrl: pick('VIDEO_SERVICE_URL', 'VITE_VIDEO_SERVICE_URL', '')
};
