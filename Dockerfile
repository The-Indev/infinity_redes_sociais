# =========================================================================
# Imagem ÚNICA para o EasyPanel (detectada por padrão na raiz do repositório).
# Junta frontend (nginx) + video-service (node+ffmpeg) na MESMA origem: o nginx
# serve o painel e faz proxy de /api/ -> 127.0.0.1:3001. Sem CORS, sem URL externa.
#
# O app fica na subpasta painel-auditor/ — os COPY abaixo referenciam ela.
# Build context = raiz do repositório (padrão do EasyPanel).
# Porta exposta = 80.
# =========================================================================

# --- Stage 1: build do frontend ---
FROM node:20-alpine AS build
WORKDIR /app
COPY painel-auditor/package.json ./
RUN npm install
COPY painel-auditor/ ./
RUN npm run build

# --- Stage 2: runtime (nginx + node + ffmpeg) ---
FROM nginx:1.27-alpine
RUN apk add --no-cache gettext nodejs npm ffmpeg

# Frontend estático + templating do env.js em runtime (entrypoint do nginx)
COPY painel-auditor/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY painel-auditor/docker-entrypoint.sh /docker-entrypoint.d/40-render-env.sh
RUN chmod +x /docker-entrypoint.d/40-render-env.sh

# video-service (usa o ffmpeg do apk; ignore-scripts evita baixar o ffmpeg-static)
WORKDIR /opt/video-service
COPY painel-auditor/video-service/package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY painel-auditor/video-service/server.js ./
ENV FFMPEG_PATH=ffmpeg

# Inicia o node (background) e o nginx (foreground)
COPY painel-auditor/docker-start.sh /docker-start.sh
RUN chmod +x /docker-start.sh

EXPOSE 80
CMD ["/docker-start.sh"]
