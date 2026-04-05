# ADR-007: Configurable Email Provider Abstraction

**Date**: 2026-02-20
**Status**: Accepted

## Context

The application sends email for several purposes: magic-link authentication, contact form confirmations, donation acknowledgements, and announcement delivery. Relying on a single email provider creates a single point of failure, and provider availability can vary (rate limits, deliverability issues, account status changes). The initial email infrastructure was built around SendGrid (commit `b477ca7`, February 2026), with subsequent work adding per-form routing and branded templates.

## Decision

Abstract email delivery behind a provider interface that supports multiple backends: Resend, SendGrid, Postmark, and Unione. The active provider is selected via environment variable configuration. Email provider packages are externalized in the Astro/Rollup build configuration (`astro.config.mjs`) so they resolve at Netlify Functions runtime rather than at build time.

## Consequences

- **Easier**: Switching email providers requires only an environment variable change, not a code deployment. This provides resilience against provider outages or account issues.
- **Easier**: Different environments (development, staging, production) can use different providers without code changes.
- **Easier**: The abstraction layer provides a consistent interface for sending email regardless of which provider is active, simplifying application code that triggers emails.
- **Harder**: Must maintain integration code for four separate provider APIs. Each provider has different response formats, error handling, and configuration patterns.
- **Harder**: The Rollup externalization requirement means email packages are not validated at build time. A misconfigured provider will only fail at runtime when an email is actually sent.
- **Trade-off**: Provider-specific features (SendGrid's template engine, Postmark's message streams, Resend's React email support) are not exposed through the abstraction. The interface targets the lowest common denominator of plain email delivery.
