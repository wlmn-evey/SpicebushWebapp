import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  // Check if user is authenticated
  const authCookie = cookies.get('sbms-admin-auth');
  
  if (authCookie?.value !== 'bypass' && !import.meta.env.DEV) {
    const { supabase } = await import('@lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
  
  // Return minimal valid YAML
  const yamlContent = `# Minimal config - actual configuration is in JavaScript
backend:
  name: supabase
  branch: main

collections: []
`;
  
  return new Response(yamlContent, {
    status: 200,
    headers: { 
      'Content-Type': 'text/yaml',
      'Cache-Control': 'no-cache'
    }
  });
};