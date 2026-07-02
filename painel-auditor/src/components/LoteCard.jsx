import { useState } from 'react';
import PostPreview from './PostPreview.jsx';

function resumirArtigo(texto) {
  if (!texto) return 'Artigo sem conteúdo bruto';
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length > 240 ? `${limpo.slice(0, 240)}…` : limpo;
}

function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function LoteCard({ lote, onAcao }) {
  const [aberto, setAberto] = useState(true);
  const total = lote.posts.length;
  const publicados = lote.posts.filter((p) => p.status_uso === 4).length;
  const aprovados = lote.posts.filter((p) => p.status_uso === 3).length;
  const comImagem = lote.posts.filter((p) => p.status_uso === 2).length;
  const pendentes = total - aprovados - comImagem - publicados;

  return (
    <section className="lote">
      <header className="lote-header" onClick={() => setAberto((v) => !v)}>
        <div className="lote-meta">
          <span className="lote-id">Lote #{lote.artigo_id}</span>
          {lote.tipo && <span className="tag-tipo">{lote.tipo}</span>}
          <span className="lote-data">{formatarData(lote.artigo?.criado_em)}</span>
        </div>
        <p className="lote-resumo">{resumirArtigo(lote.artigo?.conteudo_bruto)}</p>
        <div className="lote-contadores">
          <span className="contador contador--pendente">{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>
          <span className="contador contador--com-imagem">{comImagem} com imagem</span>
          <span className="contador contador--aprovado">{aprovados} aprovado{aprovados !== 1 ? 's' : ''}</span>
          <span className="contador contador--publicado">{publicados} publicado{publicados !== 1 ? 's' : ''}</span>
          <span className="contador contador--total">{total}/10</span>
          <span className="lote-toggle">{aberto ? '−' : '+'}</span>
        </div>
      </header>

      {aberto && (
        <div className="lote-grid">
          {lote.posts.map((post) => (
            <PostPreview key={post.id} post={post} onAcao={onAcao} />
          ))}
        </div>
      )}
    </section>
  );
}
