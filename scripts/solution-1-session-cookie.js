const fetch = require('node-fetch');

async function loginAndCreateContentType() {
  console.log('🔐 Solution 1: Session Cookie Approach\n');
  
  const STRAPI_URL = 'http://localhost:1337';
  const credentials = {
    email: 'evey@eveywinters.com',
    password: 'rtp9RJK-rza.dxh3buk'
  };
  
  try {
    // Step 1: Login to get session cookie
    console.log('📍 Logging in to Strapi admin...');
    const loginResponse = await fetch(`${STRAPI_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const cookies = loginResponse.headers.get('set-cookie');
    const token = loginData.data?.token || loginData.token;
    
    console.log('✅ Login successful');
    console.log('🍪 Session established');
    
    // Step 2: Create content type using session
    console.log('\n📦 Creating blog content type...');
    
    const contentTypePayload = {
      contentType: {
        draftAndPublish: true,
        singularName: 'blog',
        pluralName: 'blogs',
        displayName: 'Blog',
        kind: 'collectionType',
        attributes: {
          title: {
            type: 'string',
            required: true
          },
          content: {
            type: 'richtext'
          },
          author: {
            type: 'string',
            default: 'Marketing Team 2'
          },
          publishDate: {
            type: 'date'
          },
          slug: {
            type: 'uid',
            targetField: 'title'
          },
          featured_image: {
            type: 'media',
            multiple: false,
            required: false,
            allowedTypes: ['images']
          },
          url: {
            type: 'string'
          }
        }
      }
    };
    
    const createResponse = await fetch(`${STRAPI_URL}/content-type-builder/content-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies
      },
      body: JSON.stringify(contentTypePayload)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Content type creation failed: ${error}`);
    }
    
    console.log('✅ Blog content type created successfully!');
    
    // Step 3: Configure permissions
    console.log('\n🔐 Configuring public permissions...');
    
    // Wait for Strapi to process the content type
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get public role
    const rolesResponse = await fetch(`${STRAPI_URL}/users-permissions/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies
      }
    });
    
    const roles = await rolesResponse.json();
    const publicRole = roles.find(r => r.type === 'public');
    
    if (publicRole) {
      // Update permissions
      const permissionsPayload = {
        permissions: {
          'api::blog.blog': {
            controllers: {
              blog: {
                find: { enabled: true },
                findOne: { enabled: true }
              }
            }
          }
        }
      };
      
      await fetch(`${STRAPI_URL}/users-permissions/roles/${publicRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cookie': cookies
        },
        body: JSON.stringify(permissionsPayload)
      });
      
      console.log('✅ Public permissions configured!');
    }
    
    console.log('\n🎉 Success! Blog content type is ready.');
    console.log('📌 Run: node scripts/setup-blog-strapi.js');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run the solution
loginAndCreateContentType();