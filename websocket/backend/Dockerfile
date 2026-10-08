FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.mjs utils.mjs ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.mjs"]