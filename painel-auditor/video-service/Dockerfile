FROM node:20-alpine

# ffmpeg do próprio Alpine (evita problemas de musl/glibc de binários estáticos)
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json ./
# --ignore-scripts evita o download do binário do ffmpeg-static (usamos o do apk).
RUN npm install --omit=dev --ignore-scripts

COPY server.js ./

# No container usamos o ffmpeg do sistema (Alpine/musl), não o ffmpeg-static (glibc).
ENV PORT=3001
ENV FFMPEG_PATH=ffmpeg
EXPOSE 3001

CMD ["node", "server.js"]
