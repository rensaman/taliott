import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
const mockCreateTransport = vi.fn(() => ({ sendMail: mockSendMail }));

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}));

// Import after mock is set up
const { sendEmail } = await import('./mailer.js');

describe('sendEmail', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockCreateTransport.mockClear();
    mockSendMail.mockClear();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_FROM;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('stub mode (no SMTP_HOST)', () => {
    it('resolves without throwing', async () => {
      await expect(
        sendEmail({ to: 'jamie@example.com', subject: 'Test', text: 'Hello' })
      ).resolves.toBeUndefined();
    });

    it('logs the recipient and subject to console', async () => {
      await sendEmail({ to: 'jamie@example.com', subject: 'Voting closed', text: 'Hello' });

      expect(console.log).toHaveBeenCalledOnce();
      const [message] = console.log.mock.calls[0];
      expect(message).toContain('jamie@example.com');
      expect(message).toContain('Voting closed');
    });

    it('does not call nodemailer', async () => {
      await sendEmail({ to: 'jamie@example.com', subject: 'Test', text: 'Hello' });
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });
  });

  describe('SMTP mode (SMTP_HOST set)', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'localhost';
      process.env.SMTP_PORT = '1025';
      process.env.SMTP_FROM = 'taliott <noreply@taliott.app>';
    });

    it('creates a nodemailer transport with the configured host and port', async () => {
      await sendEmail({ to: 'jamie@example.com', subject: 'Test', text: 'Hello' });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'localhost', port: 1025 })
      );
    });

    it('calls sendMail with the correct to and subject', async () => {
      await sendEmail({ to: 'jamie@example.com', subject: 'Voting closed', text: 'Body' });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'jamie@example.com', subject: 'Voting closed' })
      );
    });

    it('uses SMTP_FROM as the from address', async () => {
      await sendEmail({ to: 'jamie@example.com', subject: 'Test', text: 'Hello' });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'taliott <noreply@taliott.app>' })
      );
    });

    it('defaults SMTP_PORT to 1025 when not set', async () => {
      delete process.env.SMTP_PORT;
      await sendEmail({ to: 'jamie@example.com', subject: 'Test', text: 'Hello' });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 1025 })
      );
    });

    it('uses default from address when SMTP_FROM is not set', async () => {
      delete process.env.SMTP_FROM;
      await sendEmail({ to: 'jamie@example.com', subject: 'Test', text: 'Hello' });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'taliott <noreply@taliott.app>' })
      );
    });

    it('omits auth when SMTP_USER is not set', async () => {
      await sendEmail({ to: 'jamie@example.com', subject: 'Test', text: 'Hello' });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ auth: undefined })
      );
    });

    it('includes auth when SMTP_USER is set', async () => {
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';
      await sendEmail({ to: 'jamie@example.com', subject: 'Test', text: 'Hello' });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ auth: { user: 'user', pass: 'pass' } })
      );
    });
  });
});
