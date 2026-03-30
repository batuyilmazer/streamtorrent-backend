
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build


# -------------------------------------------------------------


FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --only=production 

COPY --from=builder /app/dist ./dist 

COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

COPY prisma/schema.prisma ./
COPY prisma/migrations ./


EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]