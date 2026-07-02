import { getSupabase } from './supabase.js';
import { config } from './config.js';

export async function fetchLotes() {
  const supabase = getSupabase();
  const { data: posts, error: postsErr } = await supabase
    .from('posts_gerados')
    .select('*')
    .order('artigo_id', { ascending: false })
    .order('posicao', { ascending: true });

  if (postsErr) throw postsErr;

  const artigoIds = [...new Set(posts.map((p) => p.artigo_id))];
  let artigosById = {};

  if (artigoIds.length > 0) {
    const { data: artigos, error: artErr } = await supabase
      .from('artigos_base')
      .select('id, conteudo_bruto, criado_em')
      .in('id', artigoIds);
    if (artErr) throw artErr;
    artigosById = Object.fromEntries(artigos.map((a) => [a.id, a]));
  }

  const lotesMap = new Map();
  for (const post of posts) {
    if (!lotesMap.has(post.artigo_id)) {
      lotesMap.set(post.artigo_id, {
        artigo_id: post.artigo_id,
        artigo: artigosById[post.artigo_id] || null,
        tipo: post.tipo || null,
        posts: []
      });
    }
    lotesMap.get(post.artigo_id).posts.push(post);
  }

  return Array.from(lotesMap.values()).sort((a, b) => {
    const ta = a.artigo?.criado_em ? new Date(a.artigo.criado_em).getTime() : 0;
    const tb = b.artigo?.criado_em ? new Date(b.artigo.criado_em).getTime() : 0;
    return tb - ta;
  });
}

export async function updateStatus(postId, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('posts_gerados')
    .update({ status_uso: status })
    .eq('id', postId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function enviarArtigo(artigoCompleto, tipo, quantidadePosts) {
  if (!config.webhookColetor) throw new Error('Webhook do coletor não configurado');
  const res = await fetch(config.webhookColetor, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      tipo,
      quantidade_posts: quantidadePosts,
      artigo_completo: artigoCompleto
    })
  });
  if (!res.ok) throw new Error(`Servidor retornou status ${res.status}`);
}

export async function dispararGeracaoImagem(post) {
  if (!config.webhookImagem) throw new Error('Webhook de geração de imagem não configurado');
  const res = await fetch(config.webhookImagem, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_id: post.id,
      artigo_id: post.artigo_id,
      posicao: post.posicao,
      tipo: post.tipo,
      tema_central: post.tema_central,
      prompt_imagem: post.prompt_imagem,
      timestamp: new Date().toISOString()
    })
  });
  if (!res.ok) throw new Error(`Webhook respondeu ${res.status}`);
}

export async function converterImagemEmVideo(post, duracao = 30) {
  if (!post.url_imagem_gerada) throw new Error('Post não tem imagem gerada para converter');

  // Base vazia = mesma origem (nginx faz proxy de /api/). Em dev usa a URL absoluta.
  const base = (config.videoServiceUrl || '').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/converter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: post.url_imagem_gerada,
      post_id: post.id,
      duracao
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Serviço de vídeo respondeu ${res.status}`);
  return data; // { video_url, path, duracao, aviso? }
}

export async function dispararWebhook(post, acao) {
  if (!config.webhookAprovacao) return;
  const res = await fetch(config.webhookAprovacao, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      acao,
      post_id: post.id,
      artigo_id: post.artigo_id,
      posicao: post.posicao,
      tipo: post.tipo,
      tema_central: post.tema_central,
      legenda: post.legenda,
      prompt_imagem: post.prompt_imagem,
      url_imagem_gerada: post.url_imagem_gerada,
      timestamp: new Date().toISOString()
    })
  });
  if (!res.ok) throw new Error(`Webhook respondeu ${res.status}`);
}
