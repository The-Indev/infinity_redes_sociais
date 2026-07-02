#!/bin/sh
set -e

TARGET=/usr/share/nginx/html/env.js

: "${SUPABASE_URL:=}"
: "${SUPABASE_ANON_KEY:=}"
: "${SUPABASE_SCHEMA:=infinity_redes_sociais}"
: "${WEBHOOK_APROVACAO:=}"
: "${WEBHOOK_IMAGEM:=https://n8n.space-cloud.tech/webhook/imagem}"
: "${WEBHOOK_COLETOR:=https://n8n.infinitydev.tech/webhook/coletor}"
: "${VIDEO_SERVICE_URL:=}"

cat > "$TARGET" <<EOF
window.__ENV__ = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",
  SUPABASE_SCHEMA: "${SUPABASE_SCHEMA}",
  WEBHOOK_APROVACAO: "${WEBHOOK_APROVACAO}",
  WEBHOOK_IMAGEM: "${WEBHOOK_IMAGEM}",
  WEBHOOK_COLETOR: "${WEBHOOK_COLETOR}",
  VIDEO_SERVICE_URL: "${VIDEO_SERVICE_URL}"
};
EOF
