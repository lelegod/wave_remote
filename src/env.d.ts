// Build-time env values injected by esbuild define (from .env). Not a runtime object in the extension.
declare const process: {
  env: {
    NODE_ENV?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
};
