import express from 'express';
import cors from 'cors';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Resolve o binário do ffmpeg:
//   1) FFMPEG_PATH explícito (no Docker apontamos para o ffmpeg do sistema);
//   2) ffmpeg-static (binário embutido — bom para dev local sem instalar nada);
//   3) "ffmpeg" no PATH como último recurso.
// ---------------------------------------------------------------------------
let ffmpegStatic = null;
try {
  ffmpegStatic = (await import('ffmpeg-static')).default;
} catch {
  /* pacote ausente — segue com PATH */
}

// ---------------------------------------------------------------------------
// Configuração (via env). Reaproveita as mesmas credenciais do painel.
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT || 3001);
const FFMPEG = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
// Precisa da service_role (a mesma já usada no painel) para conseguir dar
// upload no Storage e atualizar a tabela sem esbarrar em RLS.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA || 'infinity_redes_sociais';
const BUCKET = process.env.SUPABASE_VIDEO_BUCKET || 'videos';
const TABELA = process.env.SUPABASE_TABELA || 'posts_gerados';
const COLUNA_VIDEO = process.env.SUPABASE_COLUNA_VIDEO || 'url_video_gerado';
const DURACAO_PADRAO = Number(process.env.DURACAO_PADRAO || 30);
const DURACAO_MAX = Number(process.env.DURACAO_MAX || 60);
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 25 * 1024 * 1024); // 25 MB

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        db: { schema: SUPABASE_SCHEMA },
        auth: { persistSession: false }
      })
    : null;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, supabase: Boolean(supabase), bucket: BUCKET });
});

// ---------------------------------------------------------------------------
// POST /api/converter
// body: { image_url: string, post_id?: number|string, duracao?: number }
// resposta: { video_url: string, path: string, duracao: number }
// ---------------------------------------------------------------------------
app.post('/api/converter', async (req, res) => {
  const { image_url, post_id, duracao } = req.body || {};

  if (!image_url || typeof image_url !== 'string' || !/^https?:\/\//i.test(image_url)) {
    return res.status(400).json({ error: 'image_url ausente ou inválida (precisa ser http/https).' });
  }
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não configurado no serviço (SUPABASE_URL / SUPABASE_SERVICE_KEY).' });
  }

  const segundos = clampDuracao(duracao);
  let workdir;

  try {
    // 1. Baixa a imagem para um arquivo temporário
    const { buffer, ext } = await baixarImagem(image_url);
    workdir = await mkdtemp(join(tmpdir(), 'img2vid-'));
    const inputPath = join(workdir, `input.${ext}`);
    const outputPath = join(workdir, 'output.mp4');
    await writeFile(inputPath, buffer);

    // 2. Gera o MP4 (imagem estática em loop, H.264, com áudio silencioso)
    await rodarFfmpeg(inputPath, outputPath, segundos);
    const videoBuffer = await readFile(outputPath);

    // 3. Sobe pro Supabase Storage
    const nome = `${post_id ?? 'video'}-${randomUUID()}.mp4`;
    const storagePath = post_id ? `posts/${post_id}/${nome}` : `avulsos/${nome}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true });
    if (upErr) throw new Error(`Falha no upload para o bucket "${BUCKET}": ${upErr.message}`);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const videoUrl = pub?.publicUrl;
    if (!videoUrl) throw new Error('Upload feito, mas não foi possível obter a URL pública.');

    // 4. (Opcional) grava a URL na linha do post
    if (post_id !== undefined && post_id !== null && post_id !== '') {
      const { error: updErr } = await supabase
        .from(TABELA)
        .update({ [COLUNA_VIDEO]: videoUrl })
        .eq('id', post_id);
      if (updErr) {
        // Não falha a request: o vídeo já existe, só não conseguimos vincular.
        console.error(`[converter] vídeo gerado mas update em ${TABELA}.${COLUNA_VIDEO} falhou:`, updErr.message);
        return res.status(207).json({
          video_url: videoUrl,
          path: storagePath,
          duracao: segundos,
          aviso: `Vídeo gerado, mas não foi possível gravar em ${TABELA}.${COLUNA_VIDEO}: ${updErr.message}`
        });
      }
    }

    return res.json({ video_url: videoUrl, path: storagePath, duracao: segundos });
  } catch (e) {
    console.error('[converter] erro:', e);
    return res.status(500).json({ error: e.message || 'Erro ao converter imagem em vídeo.' });
  } finally {
    if (workdir) rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clampDuracao(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return DURACAO_PADRAO;
  return Math.min(Math.max(Math.round(n), 1), DURACAO_MAX);
}

async function baixarImagem(url) {
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`Não foi possível baixar a imagem (HTTP ${resp.status}).`);

  const contentType = resp.headers.get('content-type') || '';
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error(`A URL não aponta para uma imagem (content-type: ${contentType}).`);
  }

  const arrayBuf = await resp.arrayBuffer();
  if (arrayBuf.byteLength === 0) throw new Error('Imagem baixada está vazia.');
  if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Imagem muito grande (> ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB).`);
  }

  return { buffer: Buffer.from(arrayBuf), ext: extPorContentType(contentType) };
}

function extPorContentType(ct) {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

function rodarFfmpeg(inputPath, outputPath, segundos) {
  // Imagem estática em loop -> vídeo H.264 com áudio silencioso (mais compatível
  // com Instagram/Reels/TikTok, que costumam exigir faixa de áudio).
  // O filtro garante dimensões PARES (exigência do yuv420p/H.264).
  const args = [
    '-y',
    '-loop', '1',
    '-i', inputPath,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-t', String(segundos),
    '-r', '30',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'stillimage',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    outputPath
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args);
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    proc.on('error', (err) =>
      reject(new Error(`Não foi possível executar o ffmpeg ("${FFMPEG}"): ${err.message}`))
    );
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg terminou com código ${code}. ${stderr.slice(-1000)}`));
    });
  });
}

app.listen(PORT, () => {
  console.log(`video-service ouvindo na porta ${PORT} (bucket "${BUCKET}", ffmpeg "${FFMPEG}")`);
});
