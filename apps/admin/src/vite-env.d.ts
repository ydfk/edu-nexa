/// <reference types="vite/client" />
/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />
interface ImportMetaEnv {
  VITE_API_BASE_URL: string;
  VITE_PORT: number;
  VITE_PROXY_HOST: string;
}

declare const __APP_VERSION__: string;

// 扩展 @tanstack/react-table ColumnMeta 以支持自定义 className
import "@tanstack/react-table";
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
