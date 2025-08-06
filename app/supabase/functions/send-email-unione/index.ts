import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const UNIONE_API_KEY = Deno.env.get('UNIONE_API_KEY') || '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme'
const UNIONE_REGION = Deno.env.get('UNIONE_REGION') || 'us'

serve(async (req) => {
  try {
    const { email, subject, html, text } = await req.json()
    
    // Unione.io API endpoint
    const apiUrl = `https://${UNIONE_REGION}1.unione.io/en/transactional/api/v1/email/send.json`
    
    // Send email via Unione.io
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': UNIONE_API_KEY
      },
      body: JSON.stringify({
        message: {
          from_email: 'noreply@spicebushmontessori.org',
          from_name: 'Spicebush Montessori School',
          subject: subject,
          body: {
            html: html,
            plaintext: text
          },
          recipients: [
            {
              email: email,
              substitutions: {}
            }
          ]
        }
      })
    })
    
    const result = await response.json()
    
    if (response.ok && result.status === 'success') {
      return new Response(JSON.stringify({
        success: true,
        messageId: result.job_id
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    } else {
      console.error('Unione.io error:', result)
      return new Response(JSON.stringify({
        success: false,
        error: result.message || 'Failed to send email'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      })
    }
  } catch (error) {
    console.error('Email function error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})