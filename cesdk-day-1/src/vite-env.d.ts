/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESDK_LICENSE?: string;
  readonly VITE_CESDK_LICENSE_KEY?: string;
  readonly VITE_DEMO_ASSETS_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
