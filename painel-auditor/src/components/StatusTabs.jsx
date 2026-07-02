const TABS = [
  { id: 'pendente', label: 'Pendentes' },
  { id: 'comImagem', label: 'Com imagem' },
  { id: 'aprovado', label: 'Aprovados' },
  { id: 'publicado', label: 'Publicados' },
  { id: 'todos', label: 'Todos' }
];

export default function StatusTabs({ ativo, onChange, contagens }) {
  return (
    <nav className="status-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab ${ativo === tab.id ? 'tab--ativo' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          <span className="tab-count">{contagens[tab.id] ?? 0}</span>
        </button>
      ))}
    </nav>
  );
}
