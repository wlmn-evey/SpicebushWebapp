declare module '*.astro' {
  const component: (...args: unknown[]) => unknown;
  export default component;
}
