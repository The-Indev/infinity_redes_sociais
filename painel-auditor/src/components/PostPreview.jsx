import { useState } from 'react';
import { dispararGeracaoImagem, converterImagemEmVideo } from '../api.js';
import { baixarArquivo, copiarTexto } from '../utils.js';

const STATUS_LABEL = {
  1: { texto: 'Pendente', classe: 'badge--pendente' },
  2: { texto: 'Com imagem', classe: 'badge--com-imagem' },
  3: { texto: 'Aprovado', classe: 'badge--aprovado' },
  4: { texto: 'Publicado', classe: 'badge--publicado' }
};

export default function PostPreview({ post, onAcao }) {
  const [acaoLoading, setAcaoLoading] = useState(null);
  const [erro, setErro] = useState(null);
  const [legendaAberta, setLegendaAberta] = useState(false);
  const [solicitandoImagem, setSolicitandoImagem] = useState(false);
  const [imagemSolicitada, setImagemSolicitada] = useState(false);
  const [erroImagem, setErroImagem] = useState(null);
  const [gerandoVideo, setGerandoVideo] = useState(false);
  const [erroVideo, setErroVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(post.url_video_gerado || null);
  const [legendaCopiada, setLegendaCopiada] = useState(false);

  const status = STATUS_LABEL[post.status_uso] || STATUS_LABEL[1];
  const semImagem = !post.url_imagem_gerada;
  const finalizado = post.status_uso === 3 || post.status_uso === 4;

  async function handle(acao) {
    setErro(null);
    setAcaoLoading(acao);
    try {
      await onAcao(post, acao);
    } catch (e) {
      setErro(e.message || 'Falha ao processar');
    } finally {
      setAcaoLoading(null);
    }
  }

  async function solicitarImagem() {
    setErroImagem(null);
    setSolicitandoImagem(true);
    try {
      await dispararGeracaoImagem(post);
      setImagemSolicitada(true);
    } catch (e) {
      setErroImagem(e.message || 'Falha ao disparar geração');
    } finally {
      setSolicitandoImagem(false);
    }
  }

  async function gerarVideo() {
    setErroVideo(null);
    setGerandoVideo(true);
    try {
      const { video_url } = await converterImagemEmVideo(post, 30);
      setVideoUrl(video_url);
    } catch (e) {
      setErroVideo(e.message || 'Falha ao gerar vídeo');
    } finally {
      setGerandoVideo(false);
    }
  }

  async function copiarLegenda() {
    const ok = await copiarTexto(post.legenda || '');
    if (ok) {
      setLegendaCopiada(true);
      setTimeout(() => setLegendaCopiada(false), 1800);
    }
  }

  function baixarImagem() {
    // sem extensão: baixarArquivo deriva do MIME real da imagem
    baixarArquivo(post.url_imagem_gerada, `post-${post.id}`);
  }

  function baixarVideo() {
    baixarArquivo(videoUrl, `post-${post.id}.mp4`);
  }

  return (
    <article className={`post-card ${finalizado ? 'post-card--finalizado' : ''}`}>
      <div className="post-image-wrap">
        {semImagem ? (
          imagemSolicitada ? (
            <div className="post-image-placeholder">
              <span className="spinner" />
              <small>Gerando imagem…</small>
            </div>
          ) : (
            <div className="post-image-placeholder">
              <button
                type="button"
                className="btn-gerar-imagem"
                onClick={solicitarImagem}
                disabled={solicitandoImagem}
              >
                {solicitandoImagem ? 'Disparando…' : 'Gerar imagem'}
              </button>
              {erroImagem && <small className="erro-mini">{erroImagem}</small>}
            </div>
          )
        ) : (
          <img
            src={post.url_imagem_gerada}
            alt={post.tema_central}
            className="post-image"
            loading="lazy"
          />
        )}
        <span className="post-posicao">{post.posicao}/10</span>
        <span className={`post-badge ${status.classe}`}>{status.texto}</span>
      </div>

      <div className="post-body">
        {post.tipo && <span className="tag-tipo tag-tipo--post">{post.tipo}</span>}
        <h3 className="post-tema">{post.tema_central}</h3>

        <div className={`post-legenda ${legendaAberta ? 'post-legenda--aberta' : ''}`}>
          {post.legenda}
        </div>
        <div className="post-legenda-actions">
          <button
            type="button"
            className="post-legenda-toggle"
            onClick={() => setLegendaAberta((v) => !v)}
          >
            {legendaAberta ? 'Recolher legenda' : 'Ver legenda completa'}
          </button>
          {post.legenda && (
            <button
              type="button"
              className="post-legenda-toggle"
              onClick={copiarLegenda}
            >
              {legendaCopiada ? '✓ Copiada' : 'Copiar legenda'}
            </button>
          )}
        </div>

        {!semImagem && (
          <div className="post-video">
            {videoUrl ? (
              <>
                <video className="post-video-player" src={videoUrl} controls preload="metadata" />
                <button type="button" className="btn-baixar btn-baixar--video" onClick={baixarVideo}>
                  ⬇ Baixar vídeo (MP4)
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-gerar-video"
                onClick={gerarVideo}
                disabled={gerandoVideo}
              >
                {gerandoVideo ? 'Gerando vídeo…' : 'Gerar vídeo (30s)'}
              </button>
            )}
            {erroVideo && <small className="erro-mini">{erroVideo}</small>}
          </div>
        )}

        {!semImagem && (
          <button type="button" className="btn-baixar" onClick={baixarImagem}>
            ⬇ Baixar imagem
          </button>
        )}

        {erro && <div className="post-erro">{erro}</div>}

        <div className="post-actions">
          <button
            type="button"
            className="btn-acao btn-reprovar"
            onClick={() => handle('reprovado')}
            disabled={acaoLoading !== null}
          >
            {acaoLoading === 'reprovado' ? 'Reprovando…' : 'Reprovar'}
          </button>
          <button
            type="button"
            className="btn-acao btn-aprovar"
            onClick={() => handle('aprovado')}
            disabled={semImagem || acaoLoading !== null}
          >
            {acaoLoading === 'aprovado' ? 'Aprovando…' : 'Aprovar'}
          </button>
        </div>
      </div>
    </article>
  );
}
