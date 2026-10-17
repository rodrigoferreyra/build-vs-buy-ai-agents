# Headless CE.SDK batch render (checklist 60)
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev=false
COPY . .
ENV CESDK_LICENSE=
CMD ["node", "server/batch-csv.mjs"]
