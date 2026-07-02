// Utilidades de mídia usadas pelos cards de post.

const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm'
};

// Baixa um arquivo remoto forçando o "Salvar como" via Blob. Se o nome não tiver
// extensão, deriva do MIME real (a URL do Storage às vezes vem sem extensão).
// Se o fetch falhar (ex.: CORS), abre a URL em nova aba como fallback.
export async function baixarArquivo(url, nomeArquivo) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();

    let nome = nomeArquivo || 'download';
    if (!/\.[a-z0-9]{2,5}$/i.test(nome)) {
      nome += '.' + (MIME_EXT[blob.type] || extDaUrl(url, 'bin'));
    }

    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

// Copia texto para a área de transferência, com fallback para navegadores/HTTP
// sem a Clipboard API.
export async function copiarTexto(texto) {
  const valor = texto ?? '';
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(valor);
      return true;
    }
  } catch {
    /* segue para o fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = valor;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  } catch {
    return false;
  }
}

// Extrai a extensão do arquivo a partir da URL (sem query string). Default: fallback.
export function extDaUrl(url, fallback = 'jpg') {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.([a-zA-Z0-9]{2,5})$/);
    return m ? m[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
}
