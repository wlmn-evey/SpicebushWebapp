const API_TOKEN = '69b5932cd3f26ec1f897425ed308bfba182842d0a6f76379352ed6c0c1337834e9eef22b4a8c5086a9dbd41b20dbaea7ab3d87bcbd8754d54cfbcb4c830c202abfb31f4a9e4effbf083fc3e4ba7774eea2bd27eea7a39c9ec27565243cb0eb509e8e8feb25d693c430d25b21cba132fe1c86f25083c3ae13b6e6e50a344ef173';
const STRAPI_URL = 'http://localhost:1337';

async function createBlogContentType() {
  const contentTypeData = {
    contentType: {
      displayName: 'Blog',
      singularName: 'blog',
      pluralName: 'blogs',
      kind: 'collectionType',
      draftAndPublish: true,
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

  try {
    const response = await fetch(`${STRAPI_URL}/content-type-builder/content-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify(contentTypeData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create content type: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('Blog content type created successfully!');
    console.log('Strapi is restarting...');
    
    // Wait for Strapi to restart
    console.log('Waiting 10 seconds for Strapi to restart...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return result;
  } catch (error) {
    console.error('Error creating content type:', error);
    throw error;
  }
}

async function configurePermissions() {
  try {
    // Get the public role
    const rolesResponse = await fetch(`${STRAPI_URL}/users-permissions/roles`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    const roles = await rolesResponse.json();
    const publicRole = roles.find(role => role.type === 'public');
    
    if (!publicRole) {
      throw new Error('Public role not found');
    }

    // Update permissions
    const permissions = {
      ...publicRole.permissions,
      api: {
        ...publicRole.permissions.api,
        blog: {
          controllers: {
            blog: {
              find: { enabled: true },
              findOne: { enabled: true }
            }
          }
        }
      }
    };

    const updateResponse = await fetch(`${STRAPI_URL}/users-permissions/roles/${publicRole.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({ permissions })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update permissions');
    }

    console.log('Public permissions configured successfully!');
  } catch (error) {
    console.error('Error configuring permissions:', error);
  }
}

// Main execution
(async () => {
  try {
    await createBlogContentType();
    await configurePermissions();
    console.log('\nBlog content type setup complete!');
    console.log('You can now run the import script.');
  } catch (error) {
    console.error('Setup failed:', error);
  }
})();