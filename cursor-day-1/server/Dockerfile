FROM node:20-bookworm
WORKDIR /app
COPY package*.json ./
RUN npm ci && npx playwright install --with-deps chromium
COPY . .
RUN npm run build
ENTRYPOINT ["node", "server/render.mjs"]
