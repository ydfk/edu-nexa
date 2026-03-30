/// <reference types="vite/client" />
/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />
interface ImportMetaEnv {
  VITE_API_BASE_URL: string;
  VITE_PORT: number;
  VITE_PROXY_HOST: string;
}
