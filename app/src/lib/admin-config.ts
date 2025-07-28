// Admin configuration - manages admin access control
// This replaces hardcoded email checks with a proper configuration system

export interface AdminConfig {
  adminEmails: string[];
  adminDomains: string[];
}

// Default admin configuration
// In production, these should come from environment variables
const defaultConfig: AdminConfig = {
  // Specific admin email addresses
  adminEmails: [
    'admin@spicebushmontessori.org',
    'director@spicebushmontessori.org',
    'evey@eveywinters.com',
  ],
  // Domains that automatically grant admin access
  adminDomains: [
    '@spicebushmontessori.org',
    '@eveywinters.com'
  ]
};

// Get admin configuration from environment or use defaults
export function getAdminConfig(): AdminConfig {
  const envAdminEmails = import.meta.env.ADMIN_EMAILS;
  const envAdminDomains = import.meta.env.ADMIN_DOMAINS;

  return {
    adminEmails: envAdminEmails 
      ? envAdminEmails.split(',').map((email: string) => email.trim())
      : defaultConfig.adminEmails,
    adminDomains: envAdminDomains
      ? envAdminDomains.split(',').map((domain: string) => domain.trim())
      : defaultConfig.adminDomains
  };
}

// Check if an email has admin privileges
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const config = getAdminConfig();
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check specific admin emails
  if (config.adminEmails.some(adminEmail => 
    normalizedEmail === adminEmail.toLowerCase()
  )) {
    return true;
  }
  
  // Check admin domains
  if (config.adminDomains.some(domain => 
    normalizedEmail.endsWith(domain.toLowerCase())
  )) {
    return true;
  }
  
  // For development/testing, allow specific test admin accounts
  if (import.meta.env.DEV) {
    if (normalizedEmail === 'admin@spicebushmontessori.test') {
      return true;
    }
  }
  
  return false;
}