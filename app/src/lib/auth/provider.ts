export const MAGIC_LINK_AUTH_PROVIDER = 'netlify-magic-link' as const;
export const AUTH0_PROVIDER = 'auth0' as const;

export type AdminAuthProvider = typeof MAGIC_LINK_AUTH_PROVIDER | typeof AUTH0_PROVIDER;

export const getAdminAuthProvider = (): AdminAuthProvider => {
  const configured = process.env.AUTH_PROVIDER?.trim().toLowerCase();
  if (configured === AUTH0_PROVIDER) {
    return AUTH0_PROVIDER;
  }

  return MAGIC_LINK_AUTH_PROVIDER;
};

export const isAuth0Provider = (): boolean => getAdminAuthProvider() === AUTH0_PROVIDER;
export const isMagicLinkProvider = (): boolean => getAdminAuthProvider() === MAGIC_LINK_AUTH_PROVIDER;
