# cesdk-day-1

CE.SDK control build for the build-vs-buy experiment. React + TypeScript + Vite with the official **design editor** starter configuration (`src/imgly/`) pinned to **CE.SDK 1.83.0**.

## Setup

1. Copy `.env.example` to `.env` and set `VITE_CESDK_LICENSE_KEY`.
2. `npm install`
3. `npm run dev`

Assets load from the IMG.LY CDN (`cesdk-js/1.83.0/assets`). Demo scene loads from the starter-kit CDN.

## What this is

- Built with the CE.SDK Web build skill / design-editor starter kit pattern (`/cesdk:build` workflow).
- Targets Canva-clone capability: templates, text, images, shapes, layers, export PNG/PDF, save/import scene.
- References: [blog](https://img.ly/blog/how-to-build-a-canva-clone-with-ce-sdk/), [docs](https://img.ly/docs/cesdk/react/prebuilt-solutions/canva-clone-19de75/), [starter kit](https://github.com/imgly/starterkit-design-editor-ts-web).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local editor |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
