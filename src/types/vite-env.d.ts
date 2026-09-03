/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_HOMEPAGE: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_GOOGLE_ANALYTICS_ID: string;
  // Research ingestion (Supabase Edge Function; participant bundles and
  // test-mode sessions — docs/operations/QUALTRICS-HANDOFF.md).
  // Deliberately `| undefined`: neither variable ships in tracked env
  // files — real values live only in the untracked `.env.local` (see
  // `.env.example`), so callers must handle the unset case.
  readonly VITE_RESEARCH_INGEST_URL: string | undefined;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string | undefined;
  // Pilot V3 Unit 2 — PROVISIONAL(INT-4): comma-separated hosts the survey
  // return navigation may target (default: qualtrics.com). Unset = default.
  readonly VITE_RETURN_URL_ALLOWED_HOSTS: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.avif' {
  const src: string;
  export default src;
}

declare module '*.bmp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.ogg' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.wav' {
  const src: string;
  export default src;
}
