import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '1025'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

/**
 * Sends an email via SMTP.
 * Configure SMTP_HOST (+ SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE).
 * In dev: point SMTP_HOST=localhost SMTP_PORT=1025 at Mailpit.
 * Falls back to console log when SMTP_HOST is not set.
 *
 * @param {{ to: string, subject: string, text: string }} opts
 */
export async function sendEmail({ to, subject, text }) {
  if (!process.env.SMTP_HOST) {
    console.log(`[mailer] to="${to}" | subject="${subject}"`);
    return;
  }

  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'taliott <noreply@taliott.app>',
    to,
    subject,
    text,
  });
}
