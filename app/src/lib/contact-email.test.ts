import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAllSettingsMock, emailSendMock } = vi.hoisted(() => ({
  getAllSettingsMock: vi.fn(),
  emailSendMock: vi.fn()
}));

vi.mock('@lib/db', () => ({
  db: {
    content: {
      getAllSettings: getAllSettingsMock
    }
  }
}));

vi.mock('@lib/email-service', () => ({
  emailService: {
    send: emailSendMock
  }
}));

import { sendContactSubmissionEmails } from './contact-email';

describe('sendContactSubmissionEmails', () => {
  beforeEach(() => {
    getAllSettingsMock.mockReset();
    emailSendMock.mockReset();
  });

  it('routes contact notifications and sends confirmation with configured templates', async () => {
    getAllSettingsMock.mockResolvedValue({
      school_email: 'information@spicebushmontessori.org',
      contact_form_notify_emails: 'admin@spicebushmontessori.org, admissions@spicebushmontessori.org',
      contact_form_notify_subject: 'Contact alert - {{name}}',
      contact_form_confirm_submitter: true,
      contact_form_confirm_subject: 'Thanks {{name}}'
    });

    emailSendMock
      .mockResolvedValueOnce({ success: true, provider: 'SendGrid' })
      .mockResolvedValueOnce({ success: true, provider: 'SendGrid' });

    const result = await sendContactSubmissionEmails({
      source: 'contact',
      name: 'Alicia Parent',
      email: 'alicia@example.com',
      phone: '610-555-1111',
      subject: 'Tuition question',
      message: 'We would love to learn more about options.',
      childAge: '4 years',
      tourInterest: true
    });

    expect(result.notificationSent).toBe(true);
    expect(result.confirmationSent).toBe(true);
    expect(result.notifiedRecipients).toEqual([
      'admin@spicebushmontessori.org',
      'admissions@spicebushmontessori.org'
    ]);
    expect(result.errors).toEqual([]);

    expect(emailSendMock).toHaveBeenCalledTimes(2);
    expect(emailSendMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: ['admin@spicebushmontessori.org', 'admissions@spicebushmontessori.org'],
        subject: 'Contact alert - Alicia Parent',
        replyTo: 'alicia@example.com'
      })
    );
    expect(emailSendMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: 'alicia@example.com',
        subject: 'Thanks Alicia Parent'
      })
    );

    const notificationPayload = emailSendMock.mock.calls[0]?.[0];
    const confirmationPayload = emailSendMock.mock.calls[1]?.[0];
    expect(String(notificationPayload?.html || '')).toContain('School Contact & Directions');
    expect(String(notificationPayload?.html || '')).toContain('Open in Maps');
    expect(String(notificationPayload?.html || '')).toContain(
      'not meant to be published or shared publicly'
    );
    expect(String(confirmationPayload?.text || '')).toContain('Confidentiality notice:');
  });

  it('falls back to school email and skips confirmation when disabled', async () => {
    getAllSettingsMock.mockResolvedValue({
      school_email: 'information@spicebushmontessori.org',
      coming_soon_form_notify_emails: '',
      coming_soon_form_confirm_submitter: false
    });

    emailSendMock.mockResolvedValueOnce({
      success: false,
      provider: 'SendGrid',
      error: 'test failure'
    });

    const result = await sendContactSubmissionEmails({
      source: 'coming-soon',
      name: 'Jamie Family',
      email: 'jamie@example.com',
      phone: null,
      subject: 'Coming Soon Inquiry',
      message: 'Interested in 2026-2027 enrollment.',
      childAge: null,
      tourInterest: false
    });

    expect(result.notificationSent).toBe(false);
    expect(result.confirmationSent).toBe(false);
    expect(result.notifiedRecipients).toEqual(['information@spicebushmontessori.org']);
    expect(result.errors[0]).toContain('notification:');
    expect(emailSendMock).toHaveBeenCalledTimes(1);
  });

  it('uses camp-specific routing keys when source is camp', async () => {
    getAllSettingsMock.mockResolvedValue({
      school_email: 'information@spicebushmontessori.org',
      camp_form_notify_emails: 'camp@spicebushmontessori.org',
      camp_form_notify_subject: 'Camp lead from {{name}}',
      camp_form_confirm_submitter: false
    });

    emailSendMock.mockResolvedValueOnce({ success: true, provider: 'SendGrid' });

    const result = await sendContactSubmissionEmails({
      source: 'camp',
      name: 'Riley Parent',
      email: 'riley@example.com',
      phone: '610-222-3333',
      subject: 'Camp Question: Week 1',
      message: 'Do you offer after care during camp?',
      childAge: '5 years',
      tourInterest: false
    });

    expect(result.notificationSent).toBe(true);
    expect(result.confirmationSent).toBe(false);
    expect(result.notifiedRecipients).toEqual(['camp@spicebushmontessori.org']);
    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(emailSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['camp@spicebushmontessori.org'],
        subject: 'Camp lead from Riley Parent'
      })
    );
  });
});
