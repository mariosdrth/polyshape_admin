/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' enables MSW in development */
  readonly VITE_USE_MSW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
