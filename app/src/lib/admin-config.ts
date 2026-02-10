// Admin configuration - manages admin access control
// This replaces hardcoded email checks with a proper configuration system

export interface AdminConfig {
  adminEmails: string[];
  adminDomains: string[];
}

const isDevelopmentEnvironment = (): boolean => process.env.NODE_ENV !== 'production';

const ALLOWED_ADMIN_LOGIN_DOMAINS = new Set(['spicebushmontessori.org', 'eveywinters.com']);
const DEVELOPMENT_ADMIN_DOMAIN_ALLOWLIST = new Set(['spicebushmontessori.test']);

const normalizeDomain = (value: string): string => value.trim().toLowerCase().replace(/^@/, '');

const getEmailDomain = (email: string): string | null => {
  const atIndex = email.lastIndexOf('@');
  if (atIndex < 0) return null;
  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  return domain || null;
};

// Default admin configuration
// In production, these should come from environment variables
const defaultConfig: AdminConfig = {
  // Specific admin email addresses
  adminEmails: [
    'admin@spicebushmontessori.org',
    'director@spicebushmontessori.org',
    'evey@eveywinters.com'
  ],
  // Keep empty by default. Broad domain-based admin access must be explicitly enabled via ADMIN_DOMAINS.
  adminDomains: []
};

// Get admin configuration from environment or use defaults
export function getAdminConfig(): AdminConfig {
  const envAdminEmails = process.env.ADMIN_EMAILS;
  const envAdminDomains = process.env.ADMIN_DOMAINS;

  return {
    adminEmails: envAdminEmails 
      ? envAdminEmails.split(',').map((email: string) => email.trim())
      : defaultConfig.adminEmails,
    adminDomains: envAdminDomains
      ? envAdminDomains.split(',').map((domain: string) => domain.trim())
      : defaultConfig.adminDomains
  };
}

export function isAllowedAdminLoginEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase().trim();
  const domain = getEmailDomain(normalizedEmail);
  if (!domain) return false;

  if (ALLOWED_ADMIN_LOGIN_DOMAINS.has(domain)) {
    return true;
  }

  if (isDevelopmentEnvironment() && DEVELOPMENT_ADMIN_DOMAIN_ALLOWLIST.has(domain)) {
    return true;
  }

  return false;
}

// Check if an email has admin privileges
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const config = getAdminConfig();
  const normalizedEmail = email.toLowerCase().trim();

  // For development/testing, allow specific test admin accounts
  if (isDevelopmentEnvironment()) {
    if (normalizedEmail === 'admin@spicebushmontessori.test') {
      return true;
    }
  }

  // Hard allowlist so magic links never go to unexpected domains.
  if (!isAllowedAdminLoginEmail(normalizedEmail)) {
    return false;
  }

  const domain = getEmailDomain(normalizedEmail);
  if (!domain) return false;
  
  // Check specific admin emails
  if (config.adminEmails.some(adminEmail => 
    normalizedEmail === adminEmail.toLowerCase()
  )) {
    return true;
  }
  
  // Check admin domains
  if (config.adminDomains.some((adminDomain) => 
    domain === normalizeDomain(adminDomain)
  )) {
    return true;
  }
  
  return false;
}
