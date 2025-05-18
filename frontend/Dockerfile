# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* ./
RUN yarn install --frozen-lockfile
COPY . .
# Ensure NEXT_PUBLIC_BACKEND_URL is set at build or runtime
# ARG NEXT_PUBLIC_BACKEND_URL
# ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
RUN yarn build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js # If you have one
COPY --from=builder /app/node_modules ./node_modules # Important for `next` command

EXPOSE 3000
CMD ["yarn", "start"]