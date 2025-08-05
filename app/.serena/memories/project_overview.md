# Spicebush Montessori School Website - Project Overview

## Purpose
A modern, accessible website for Spicebush Montessori School featuring inclusive design, authentication, and content management capabilities.

## Tech Stack
- **Frontend**: Astro v5.2.5 with React 19.1.0
- **Styling**: Tailwind CSS v3.4.16
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **Deployment**: Netlify with SSR (Server-Side Rendering)
- **Payment Processing**: Stripe
- **Email Services**: Multiple providers (Unione, SendGrid, Postmark, Resend)
- **Content Management**: Decap CMS (formerly Netlify CMS)
- **Testing**: Vitest, Playwright for E2E
- **Language**: TypeScript

## Key Features
- User authentication system with magic link support
- Admin dashboard and content management
- Donation and enrollment payment processing
- Photo gallery and media management
- Contact forms and tour scheduling
- Newsletter subscription
- Coming soon mode functionality
- Accessibility compliance
- Mobile responsive design

## Architecture
- **Output**: Server-side rendering (SSR) with Netlify adapter
- **Database**: Supabase PostgreSQL with direct connection capability
- **Storage**: Supabase storage with local fallback
- **Auth**: Supabase Auth with custom middleware
- **API**: Astro API routes for server-side functionality
- **Deployment**: Multi-environment (production, testing)

## Current Status
- Production site deployed on Netlify
- Testing environment recently created but failing to build
- Comprehensive test suites implemented
- Security hardening completed
- Stripe integration implemented but needs verification