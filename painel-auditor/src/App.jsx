import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import StatusTabs from './components/StatusTabs.jsx';
import LoteCard from './components/LoteCard.jsx';
import EnviarArtigoModal from './components/EnviarArtigoModal.jsx';
import { fetchLotes, updateStatus, dispararWebhook } from './api.js';
import { config } from './config.js';

// status_uso: 1 = pendente, 2 = com imagem (gravado pelo n8n), 3 = aprovado.
const STATUS_APROVADO = 3;

export default function App() {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState(null);
  const [filtro, setFiltro] = useState('pendente');
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setErro(null);
    try {
      const dados = await fetchLotes();
      setLotes(dados);
    } catch (e) {
      setErro(e.message || 'Falha ao carregar dados do Supabase');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!config.supabaseUrl || !config.supabaseAnonKey) return;
    carregar();
    const interval = setInterval(() => carregar(true), 30000);
    const onFocus = () => carregar(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [carregar]);

  const aplicarAcao = useCallback(async (post, acao) => {
    if (acao === 'aprovado') {
      const atualizado = await updateStatus(post.id, STATUS_APROVADO);
      setLotes((prev) =>
        prev.map((lote) =>
          lote.artigo_id !== post.artigo_id
            ? lote
            : {
                ...lote,
                posts: lote.posts.map((p) => (p.id === post.id ? { ...p, ...atualizado } : p))
              }
        )
      );
      try {
        await dispararWebhook({ ...post, ...atualizado }, acao);
      } catch (e) {
        console.error('Falha no webhook:', e);
        throw new Error(`Status salvo, mas webhook falhou: ${e.message}`);
      }
      return;
    }

    // Reprovar: não altera o banco pelo painel — o n8n deleta a row a partir do webhook.
    await dispararWebhook(post, acao);
    // Remoção otimista: some o card na hora; o n8n remove a row de fato.
    setLotes((prev) =>
      prev
        .map((lote) =>
          lote.artigo_id !== post.artigo_id
            ? lote
            : { ...lote, posts: lote.posts.filter((p) => p.id !== post.id) }
        )
        .filter((lote) => lote.posts.length > 0)
    );
  }, []);

  const contagens = useMemo(() => {
    const c = { pendente: 0, comImagem: 0, aprovado: 0, publicado: 0, todos: 0 };
    for (const lote of lotes) {
      for (const post of lote.posts) {
        c.todos += 1;
        if (post.status_uso === 4) c.publicado += 1;
        else if (post.status_uso === 3) c.aprovado += 1;
        else if (post.status_uso === 2) c.comImagem += 1;
        else c.pendente += 1;
      }
    }
    return c;
  }, [lotes]);

  const lotesFiltrados = useMemo(() => {
    if (filtro === 'todos') return lotes;
    const predicado =
      filtro === 'aprovado'
        ? (p) => p.status_uso === 3
        : filtro === 'comImagem'
          ? (p) => p.status_uso === 2
          : filtro === 'publicado'
            ? (p) => p.status_uso === 4
            : (p) => ![2, 3, 4].includes(p.status_uso); // pendente: 0, 1 ou null
    return lotes
      .map((lote) => ({ ...lote, posts: lote.posts.filter(predicado) }))
      .filter((lote) => lote.posts.length > 0);
  }, [lotes, filtro]);

  const configOk = config.supabaseUrl && config.supabaseAnonKey;

  return (
    <div className="app">
      <Header
        onRefresh={() => carregar()}
        refreshing={refreshing}
        onNovoArtigo={() => setModalAberto(true)}
      />

      <EnviarArtigoModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onEnviado={() => carregar(true)}
      />

      <main className="container">
        {!configOk && (
          <div className="aviso aviso--erro">
            Variáveis de ambiente do Supabase não configuradas. Defina
            <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> antes de subir o container.
          </div>
        )}

        {configOk && (
          <>
            <StatusTabs ativo={filtro} onChange={setFiltro} contagens={contagens} />

            {erro && <div className="aviso aviso--erro">{erro}</div>}

            {loading && <div className="aviso">Carregando lotes…</div>}

            {!loading && lotesFiltrados.length === 0 && !erro && (
              <div className="aviso">Nenhum post nesta categoria.</div>
            )}

            <div className="lotes">
              {lotesFiltrados.map((lote) => (
                <LoteCard key={lote.artigo_id} lote={lote} onAcao={aplicarAcao} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
