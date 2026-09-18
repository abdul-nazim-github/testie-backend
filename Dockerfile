# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist

USER appuser

EXPOSE 3000

CMD [ "node", "dist/main.js" ]
