# Headless Canvasly renderer: same renderer as the editor (src/render.ts, src/pdf.ts) on Skia via @napi-rs/canvas.
# Build from the project root:  docker build -f headless/Dockerfile -t canvasly-render .
# Run:  docker run --rm -v "$PWD/headless/examples:/work" canvasly-render /work/badge.design.json --data /work/people.csv --out /work/out
FROM node:22-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY src ./src
COPY headless ./headless
RUN node headless/build.mjs

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /src/headless/dist ./
RUN npm init -y >/dev/null && npm install --no-audit --no-fund @napi-rs/canvas@1.0.11 && npm cache clean --force
WORKDIR /work
ENTRYPOINT ["node", "/app/canvasly-render.mjs"]
