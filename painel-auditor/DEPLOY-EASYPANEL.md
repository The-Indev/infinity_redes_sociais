# Deploy no EasyPanel

O painel + o serviço de vídeo sobem numa **imagem única** (`Dockerfile.easypanel`):
o nginx serve o frontend e faz proxy de `/api/` para o video-service (node+ffmpeg)
rodando internamente na porta 3001. Assim não há CORS nem URL externa a configurar.

## 1. Criar o serviço (App)

- **Source:** este repositório (ou upload da pasta `painel-auditor`).
- **Build:**
  - Build Context / pasta: `painel-auditor`
  - Método: **Dockerfile**
  - Dockerfile: `Dockerfile.easypanel`
- **Porta exposta:** `80` (aponte o domínio do EasyPanel para a porta 80).

## 2. Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase (frontend + serviço) |
| `SUPABASE_ANON_KEY` | Chave **anon** — usada pelo navegador (painel) |
| `SUPABASE_SERVICE_KEY` | Chave **service_role** — usada pelo video-service (upload + update) |
| `SUPABASE_SCHEMA` | `infinity_redes_sociais` |
| `SUPABASE_VIDEO_BUCKET` | `videos` (bucket público do Storage) |
| `SUPABASE_COLUNA_VIDEO` | `url_video_gerado` |
| `WEBHOOK_APROVACAO` | webhook n8n de aprovação |
| `WEBHOOK_IMAGEM` | webhook n8n de geração de imagem |
| `WEBHOOK_COLETOR` | webhook n8n do coletor |

> **NÃO** defina `VIDEO_SERVICE_URL` — deixando vazia, o painel chama `/api/` na
> mesma origem (proxy do nginx).

## 3. Pré-requisitos no Supabase

1. Bucket **público** `videos` no Storage.
2. Coluna `url_video_gerado text` na tabela `posts_gerados`.
3. Schema `infinity_redes_sociais` exposto no PostgREST.

## 4. Recursos

O ffmpeg roda dentro do container. Para conversões de imagem estática em 30s o custo
é baixo, mas reserve pelo menos ~0.5 vCPU / 512 MB para o serviço.

---

### Alternativa: 2 serviços separados

Se preferir separar (ex.: escalar o vídeo à parte), use o `docker-compose.yml`
(serviços `painel-auditor` e `video-service`). Nesse caso defina
`VIDEO_SERVICE_URL` com a URL pública do video-service.
