FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ \
  && npm ci --omit=dev \
  && apk del python3 make g++

COPY backend/ ./backend/
COPY frontend/ ./frontend/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "backend/index.mjs"]
