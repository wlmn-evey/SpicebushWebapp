# ADR-005: Transparent Classroom as Enrollment System of Record

**Date**: 2025-07-30
**Status**: Accepted

## Context

Spicebush Montessori School uses Transparent Classroom as its operational platform for managing student enrollment, classroom activities, and parent communication. When building the website, the team needed to decide whether to build enrollment and camp registration flows directly in the application (including payment processing) or to link out to the existing system.

An early attempt integrated Stripe for payment processing (commits `9ed8862` and `816c181`, July 2025), but this was quickly corrected: enrollment is free, and payment handling belonged in the school's existing systems, not in the marketing website.

## Decision

The website links to Transparent Classroom for enrollment and camp registration rather than building its own checkout or enrollment forms. Enrollment and donation URLs are stored as configurable external links in the database settings, allowing administrators to update them without code changes.

## Consequences

- **Easier**: No payment processing, PCI compliance, or enrollment workflow logic needed in this application. The scope stays focused on content, marketing, and lightweight admin tools.
- **Easier**: Enrollment data stays in the school's system of record, avoiding synchronization problems between two databases.
- **Easier**: The Stripe integration was removed, reducing dependencies and attack surface.
- **Harder**: The enrollment user experience is split across two systems. A parent browsing camp information on the website must navigate to a separate platform to actually register.
- **Harder**: No ability to show real-time enrollment availability, waitlist status, or registration confirmations on the school website.
- **Trade-off**: The website cannot track enrollment conversions end-to-end since the handoff to Transparent Classroom breaks the analytics funnel.
