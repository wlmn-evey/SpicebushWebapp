const API_TOKEN = '69b5932cd3f26ec1f897425ed308bfba182842d0a6f76379352ed6c0c1337834e9eef22b4a8c5086a9dbd41b20dbaea7ab3d87bcbd8754d54cfbcb4c830c202abfb31f4a9e4effbf083fc3e4ba7774eea2bd27eea7a39c9ec27565243cb0eb509e8e8feb25d693c430d25b21cba132fe1c86f25083c3ae13b6e6e50a344ef173';
const STRAPI_URL = 'http://localhost:1337';

console.log('🚀 Attempting to create blog content type via Strapi API...\n');

// First, let's check the current content types
async function checkContentTypes() {
  try {
    const response = await fetch(`${STRAPI_URL}/api/content-type-builder/content-types`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    if (!response.ok) {
      console.log('❌ Could not fetch content types. This approach requires admin privileges.');
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Successfully connected to Strapi API');
    
    // Check if blog already exists
    const blogExists = data.data && data.data.some(ct => ct.uid && ct.uid.includes('blog'));
    if (blogExists) {
      console.log('⚠️  A blog content type might already exist');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking content types:', error.message);
    return false;
  }
}

// Create the blog content type
async function createBlogContentType() {
  console.log('\n📦 Creating blog content type...');
  
  const contentTypePayload = {
    contentType: {
      draftAndPublish: true,
      singularName: 'blog',
      pluralName: 'blogs',
      displayName: 'blog',
      kind: 'collectionType',
      attributes: {
        title: {
          type: 'string',
          required: true,
          pluginOptions: {
            i18n: {
              localized: false
            }
          }
        },
        content: {
          type: 'richtext',
          pluginOptions: {
            i18n: {
              localized: false
            }
          }
        },
        author: {
          type: 'string',
          default: 'Marketing Team 2',
          pluginOptions: {
            i18n: {
              localized: false
            }
          }
        },
        publishDate: {
          type: 'date',
          pluginOptions: {
            i18n: {
              localized: false
            }
          }
        },
        slug: {
          type: 'uid',
          targetField: 'title',
          pluginOptions: {
            i18n: {
              localized: false
            }
          }
        },
        featured_image: {
          type: 'media',
          multiple: false,
          required: false,
          allowedTypes: ['images'],
          pluginOptions: {
            i18n: {
              localized: false
            }
          }
        },
        url: {
          type: 'string',
          pluginOptions: {
            i18n: {
              localized: false
            }
          }
        }
      }
    }
  };
  
  try {
    const response = await fetch(`${STRAPI_URL}/api/content-type-builder/content-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify(contentTypePayload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Could not create content type via API:', error);
      console.log('\n💡 This usually means:');
      console.log('   - The API token doesn\'t have sufficient permissions');
      console.log('   - Content type builder API requires admin session authentication');
      console.log('   - The content type might already exist');
      return false;
    }
    
    console.log('✅ Blog content type created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating content type:', error.message);
    return false;
  }
}

// Configure public permissions
async function configurePermissions() {
  console.log('\n🔐 Configuring public permissions...');
  
  try {
    // Get the public role
    const rolesResponse = await fetch(`${STRAPI_URL}/api/users-permissions/roles`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    if (!rolesResponse.ok) {
      console.log('❌ Could not fetch roles');
      return false;
    }
    
    const roles = await rolesResponse.json();
    const publicRole = roles.roles && roles.roles.find(r => r.type === 'public');
    
    if (!publicRole) {
      console.log('❌ Could not find public role');
      return false;
    }
    
    // Update permissions to allow find and findOne for blogs
    const updatedPermissions = {
      ...publicRole.permissions,
      'api::blog.blog': {
        controllers: {
          blog: {
            find: { enabled: true },
            findOne: { enabled: true }
          }
        }
      }
    };
    
    const updateResponse = await fetch(`${STRAPI_URL}/api/users-permissions/roles/${publicRole.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({
        permissions: updatedPermissions
      })
    });
    
    if (!updateResponse.ok) {
      console.log('❌ Could not update permissions');
      return false;
    }
    
    console.log('✅ Public permissions configured successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error configuring permissions:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('ℹ️  Note: This approach requires special admin privileges that API tokens typically don\'t have.');
  console.log('    If this doesn\'t work, you\'ll need to create the content type manually in the UI.\n');
  
  const canConnect = await checkContentTypes();
  if (!canConnect) {
    console.log('\n❌ Cannot proceed with API approach.');
    console.log('\n📝 Please create the blog content type manually:');
    console.log('   1. Go to Content-Type Builder');
    console.log('   2. Create new collection type: "blog"');
    console.log('   3. Add fields: title, content, author, publishDate, slug, featured_image, url');
    console.log('   4. Save and configure public permissions');
    console.log('\n   Then run: node scripts/setup-blog-strapi.js');
    return;
  }
  
  const created = await createBlogContentType();
  if (created) {
    console.log('\n⏳ Waiting for Strapi to process changes...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await configurePermissions();
    
    console.log('\n✅ Setup complete! Run: node scripts/setup-blog-strapi.js');
  } else {
    console.log('\n📝 Manual steps required:');
    console.log('   1. Go to http://localhost:1337/admin');
    console.log('   2. Navigate to Content-Type Builder');
    console.log('   3. Create new collection type: "blog"');
    console.log('   4. Add the required fields');
    console.log('   5. Save and configure permissions');
  }
}

main().catch(console.error);