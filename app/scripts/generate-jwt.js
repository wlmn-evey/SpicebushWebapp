import jwt from 'jsonwebtoken';

// JWT secret from .env.local
const JWT_SECRET = 'your-super-secret-jwt-token-with-at-least-32-characters-long';

// Generate service role token
const serviceRolePayload = {
  role: 'service_role',
  iss: 'supabase-demo',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};

const serviceRoleToken = jwt.sign(serviceRolePayload, JWT_SECRET, { algorithm: 'HS256' });

console.log('Service Role Key:');
console.log(serviceRoleToken);
console.log('\n');

// Generate anon token
const anonPayload = {
  role: 'anon',
  iss: 'supabase-demo',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};

const anonToken = jwt.sign(anonPayload, JWT_SECRET, { algorithm: 'HS256' });

console.log('Anon Key:');
console.log(anonToken);