const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ Error: JWT_SECRET environment variable is not set');
  console.error('Please ensure your .env file contains JWT_SECRET');
  process.exit(1);
}

// Common claims for both tokens
const commonClaims = {
  iss: 'supabase-demo',
  exp: 1983812996, // Far future expiration
};

// Generate anon token
const anonToken = jwt.sign(
  {
    ...commonClaims,
    role: 'anon',
    aud: 'authenticated',
  },
  JWT_SECRET,
  {
    algorithm: 'HS256',
  }
);

// Generate service_role token
const serviceRoleToken = jwt.sign(
  {
    ...commonClaims,
    role: 'service_role',
    aud: 'authenticated',
  },
  JWT_SECRET,
  {
    algorithm: 'HS256',
  }
);

console.log('====================================');
console.log('Supabase JWT Tokens Generated');
console.log('====================================\n');

console.log('ANON TOKEN:');
console.log(anonToken);
console.log('\n');

console.log('SERVICE_ROLE TOKEN:');
console.log(serviceRoleToken);
console.log('\n');

console.log('====================================');
console.log('Environment Variables:');
console.log('====================================');
console.log(`SUPABASE_URL=http://localhost:54321`);
console.log(`SUPABASE_ANON_KEY=${anonToken}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleToken}`);
console.log('\n');

console.log('Add these to your .env file or docker-compose.yml');

// Verify tokens
console.log('\n====================================');
console.log('Token Verification:');
console.log('====================================');

try {
  const decodedAnon = jwt.verify(anonToken, JWT_SECRET);
  console.log('\nAnon token decoded:', JSON.stringify(decodedAnon, null, 2));
  
  const decodedService = jwt.verify(serviceRoleToken, JWT_SECRET);
  console.log('\nService role token decoded:', JSON.stringify(decodedService, null, 2));
} catch (error) {
  console.error('Token verification failed:', error.message);
}