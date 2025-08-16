
-- Test the email function
SELECT auth.send_email_via_unione(
  'test@spicebushmontessori.org',
  'magiclink',
  jsonb_build_object(
    'confirmation_url', 'https://spicebush-testing.netlify.app/test-link'
  )
) as result;
