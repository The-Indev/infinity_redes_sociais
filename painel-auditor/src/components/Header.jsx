export default function Header({ onRefresh, refreshing, onNovoArtigo }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <svg className="logo-svg" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M30 13c-6.63 0-12 5.37-12 12s5.37 12 12 12c4.42 0 8.29-2.39 10.41-5.94L50 25l9.59-6.06C61.71 15.39 65.58 13 70 13c6.63 0 12 5.37 12 12s-5.37 12-12 12c-4.42 0-8.29-2.39-10.41-5.94L50 25l-9.59 6.06C38.29 34.61 34.42 37 30 37c-6.63 0-12-5.37-12-12s5.37-12 12-12m40-3c-8.05 0-14.88 4.75-18 11.58C48.88 14.75 42.05 10 34 10 22.95 10 14 18.95 14 30s8.95 20 20 20c8.05 0 14.88-4.75 18-11.58 3.12 6.83 9.95 11.58 18 11.58 11.05 0 20-8.95 20-20S81.05 10 70 10z"
              fill="#d4af37"
            />
          </svg>
          <div className="brand-text">
            <h1>
              INDEV · <span>Painel Auditor</span>
            </h1>
            <p>Aprovação de Conteúdo Gerado para Redes Sociais</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-novo-artigo"
            onClick={onNovoArtigo}
          >
            + Novo artigo
          </button>
          <button
            type="button"
            className="btn-refresh"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Atualizar"
          >
            {refreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </div>
    </header>
  );
}
