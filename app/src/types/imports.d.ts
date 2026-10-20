// Type declarations for imports without types

// Vitest config type fix
declare module 'vitest/config' {
  export function defineConfig<TConfig>(config: TConfig): TConfig;
}
