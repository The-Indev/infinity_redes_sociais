#!/bin/sh
set -e

# Gera o /usr/share/nginx/html/env.js a partir das variáveis de ambiente.
# O entrypoint do nginx só roda os scripts de /docker-entrypoint.d quando o
# comando é "nginx"; como usamos um CMD próprio, chamamos o render manualmente.
echo "[start] renderizando env.js a partir das variáveis de ambiente…"
/docker-entrypoint.d/40-render-env.sh

# O video-service escuta numa porta interna fixa (3001); o nginx faz proxy de
# /api/ para ela. Forçamos PORT=3001 para não ser afetado por um PORT global
# que a plataforma possa injetar.
echo "[start] subindo video-service em 127.0.0.1:3001…"
cd /opt/video-service
PORT=3001 node server.js &

# nginx como processo principal do container (mantém o container vivo).
echo "[start] subindo nginx na porta 80…"
exec nginx -g 'daemon off;'
