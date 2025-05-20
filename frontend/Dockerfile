# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts 
COPY --from=builder /app/node_modules ./node_modules 

EXPOSE 3000
CMD ["yarn", "start"]