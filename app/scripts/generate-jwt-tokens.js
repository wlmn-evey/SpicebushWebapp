#!/usr/bin/env node

/**
 * Generate JWT tokens for Supabase local development
 * This ensures your tokens match your JWT_SECRET
 */

import crypto from 'crypto';

// Read JWT_SECRET from environment or use default
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-token-with-at-least-32-characters-long';

// Simple JWT implementation for development
function base64urlEscape(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function createJWT(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64urlEscape(Buffer.from(JSON.stringify(header)).toString('base64'));
  const encodedPayload = base64urlEscape(Buffer.from(JSON.stringify(payload)).toString('base64'));
  
  const signature = base64urlEscape(
    crypto
      .createHmac('sha256', secret)
      .update(encodedHeader + '.' + encodedPayload)
      .digest('base64')
  );

  return encodedHeader + '.' + encodedPayload + '.' + signature;
}

// Generate tokens
const anonToken = createJWT({
  iss: 'supabase-demo',
  role: 'anon',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10), // 10 years
  iat: Math.floor(Date.now() / 1000)
}, JWT_SECRET);

const serviceToken = createJWT({
  iss: 'supabase-demo',
  role: 'service_role',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10), // 10 years
  iat: Math.floor(Date.now() / 1000)
}, JWT_SECRET);

console.log('Generated JWT tokens for your Supabase setup:\n');
console.log('PUBLIC_SUPABASE_ANON_KEY=' + anonToken);
console.log('SUPABASE_ANON_KEY=' + anonToken);
console.log('SUPABASE_SERVICE_ROLE_KEY=' + serviceToken);
console.log('\nAdd these to your .env.local file to fix JWT authentication issues.');
console.log('\nIMPORTANT: After updating .env.local, restart your Docker containers:');
console.log('docker-compose down && docker-compose up -d');