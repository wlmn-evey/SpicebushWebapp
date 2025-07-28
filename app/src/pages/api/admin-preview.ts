export const prerender = false;

export async function GET({ cookies, redirect }: any) {
  // Set admin auth cookie for testing
  cookies.set('sbms-admin-auth', 'true', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  });
  
  return redirect('/');
}

export async function DELETE({ cookies, redirect }: any) {
  // Remove admin auth cookie
  cookies.delete('sbms-admin-auth', {
    path: '/'
  });
  
  return redirect('/');
}