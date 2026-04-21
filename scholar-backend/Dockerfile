# Production API — Express (see src/server.js)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN chown -R node:node /app
USER node

EXPOSE 4000

CMD ["node", "src/server.js"]
