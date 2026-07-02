#!/bin/sh
set -e

# O video-service escuta numa porta interna fixa (3001); o nginx faz proxy de
# /api/ para ela. Forçamos PORT=3001 para não ser afetado por um PORT global
# que a plataforma possa injetar.
echo "[start] subindo video-service em 127.0.0.1:3001…"
cd /opt/video-service
PORT=3001 node server.js &

# nginx como processo principal do container (mantém o container vivo).
echo "[start] subindo nginx na porta 80…"
exec nginx -g 'daemon off;'
