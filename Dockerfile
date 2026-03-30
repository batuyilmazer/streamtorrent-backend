
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate 

RUN npm run build 


# -------------------------------------------------------------


FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json ./
RUN npm install --only=production 

COPY --from=builder /app/dist ./dist 

COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

COPY prisma/schema.prisma ./
COPY prisma/migrations ./


EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]