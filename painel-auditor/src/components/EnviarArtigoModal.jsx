import { useEffect, useState } from 'react';
import { enviarArtigo } from '../api.js';
import { config } from '../config.js';
import { TIPOS } from '../tipos.js';

export default function EnviarArtigoModal({ aberto, onFechar, onEnviado }) {
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipoOutro, setTipoOutro] = useState('');
  const [quantidade, setQuantidade] = useState('10');
  const [status, setStatus] = useState(null);

  const tipoFinal = (tipo === '__outro__' ? tipoOutro : tipo).trim();
  const qtd = parseInt(quantidade, 10);
  const qtdValida = Number.isInteger(qtd) && qtd >= 1;

  useEffect(() => {
    if (!aberto) return;
    function onKey(e) {
      if (e.key === 'Escape' && status?.tipo !== 'loading') onFechar();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onFechar, status]);

  if (!aberto) return null;

  async function submeter(e) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || !tipoFinal || !qtdValida) return;

    setStatus({ tipo: 'loading', msg: 'Enviando dados para o pipeline do n8n…' });
    try {
      await enviarArtigo(conteudo, tipoFinal, qtd);
      setStatus({
        tipo: 'success',
        msg: `Sucesso! O artigo foi enviado e o pipeline de ${qtd} post${qtd !== 1 ? 's' : ''} foi iniciado.`
      });
      setTexto('');
      setTipo('');
      setTipoOutro('');
      setQuantidade('10');
      onEnviado?.();
    } catch (err) {
      setStatus({
        tipo: 'error',
        msg:
          err.message?.includes('status')
            ? `Erro ao enviar: ${err.message}`
            : 'Falha na conexão: verifique se o webhook está ativo no n8n ou se há bloqueio de CORS.'
      });
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && status?.tipo !== 'loading') onFechar();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Novo artigo">
        <header className="modal-header">
          <h2>Novo Artigo</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onFechar}
            disabled={status?.tipo === 'loading'}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <form onSubmit={submeter} className="modal-body">
          <div className="form-group">
            <label>Destino do Pipeline (Fixo)</label>
            <div className="webhook-static">{config.webhookColetor}</div>
          </div>

          <div className="form-group">
            <label htmlFor="artigoTipo">Tipo do vídeo</label>
            <select
              id="artigoTipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              required
              disabled={status?.tipo === 'loading'}
            >
              <option value="" disabled>
                Selecione o tipo…
              </option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__outro__">Outro…</option>
            </select>
            {tipo === '__outro__' && (
              <input
                type="text"
                className="tipo-outro-input"
                value={tipoOutro}
                onChange={(e) => setTipoOutro(e.target.value)}
                placeholder="Digite o tipo"
                required
                disabled={status?.tipo === 'loading'}
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="artigoQtd">Quantidade de posts</label>
            <input
              id="artigoQtd"
              type="number"
              className="tipo-outro-input"
              min="1"
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
              disabled={status?.tipo === 'loading'}
            />
          </div>

          <div className="form-group">
            <label htmlFor="artigoTexto">Texto ou Artigo Base</label>
            <textarea
              id="artigoTexto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={`Cole aqui o artigo ou texto bruto completo para ser fragmentado em ${qtdValida ? qtd : 'N'} posts...`}
              required
              disabled={status?.tipo === 'loading'}
            />
          </div>

          <button
            type="submit"
            className="btn-enviar"
            disabled={status?.tipo === 'loading' || !texto.trim() || !tipoFinal || !qtdValida}
          >
            {status?.tipo === 'loading' ? 'Enviando…' : 'Disparar Automação'}
          </button>

          {status && (
            <div className={`status-message status-${status.tipo}`}>{status.msg}</div>
          )}
        </form>
      </div>
    </div>
  );
}
