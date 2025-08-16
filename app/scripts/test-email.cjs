require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.UNIONE_API_KEY;
const region = process.env.UNIONE_REGION || 'us';

if (!apiKey) {
  console.error('❌ UNIONE_API_KEY not set in .env.local');
  process.exit(1);
}

const baseUrl = region === 'us' 
  ? 'https://us1.unione.io/en/transactional/api/v1'
  : 'https://eu1.unione.io/en/transactional/api/v1';

console.log('🔍 Testing Unione.io configuration...');
console.log(`   Region: ${region}`);
console.log(`   API URL: ${baseUrl}`);

// Test API key validity using header authentication
fetch(`${baseUrl}/account/info.json`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey
  },
  body: JSON.stringify({})
})
.then(res => res.json())
.then(data => {
  if (data.status === 'success') {
    console.log('✅ API key is valid');
    console.log(`   Account email: ${data.account_email}`);
    console.log(`   Account status: ${data.account_status}`);
    
    // Check domain verification using header authentication
    return fetch(`${baseUrl}/domain/list.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({})
    });
  } else {
    throw new Error(`API key validation failed: ${data.message}`);
  }
})
.then(res => res.json())
.then(data => {
  if (data.status === 'success' && data.domains) {
    console.log('\n📧 Verified domains:');
    data.domains.forEach(domain => {
      const status = domain.verification_status === 'verified' ? '✅' : '⚠️';
      console.log(`   ${status} ${domain.domain}`);
    });
    
    const spicebushDomain = data.domains.find(d => 
      d.domain === 'spicebushmontessori.org' || 
      d.domain === 'mail.spicebushmontessori.org'
    );
    
    if (spicebushDomain && spicebushDomain.verification_status === 'verified') {
      console.log('\n✅ spicebushmontessori.org domain is verified!');
      console.log('   Email service is ready for production.');
    } else {
      console.log('\n⚠️  spicebushmontessori.org domain needs verification');
      console.log('   Add DNS records from Unione.io dashboard');
    }
  }
})
.catch(err => {
  console.error('❌ Error:', err.message);
  if (err.message.includes('fetch')) {
    console.log('   Check your internet connection');
  }
  process.exit(1);
});