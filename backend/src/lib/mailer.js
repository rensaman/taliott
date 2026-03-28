import nodemailer from 'nodemailer';

let _transport = null;

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return _transport;
}

/** Reset the cached transport (used in tests to pick up env changes). */
export function resetTransport() {
  _transport = null;
}

/**
 * Sends an email via SMTP.
 * Configure SMTP_HOST (+ SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE).
 * In dev: point SMTP_HOST=localhost SMTP_PORT=1025 at Mailpit.
 * Falls back to console log when SMTP_HOST is not set.
 *
 * @param {{ to: string, subject: string, text: string, attachments?: Array<{filename: string, content: string}> }} opts
 */
export async function sendEmail({ to, subject, text, attachments }) {
  if (!process.env.SMTP_HOST) {
    console.log(`[mailer] to="${to}" | subject="${subject}"${attachments?.length ? ` | attachments=${attachments.map(a => a.filename).join(',')}` : ''}`);
    return;
  }

  await getTransport().sendMail({
    from: process.env.SMTP_FROM ?? 'taliott <noreply@taliott.app>',
    to,
    subject,
    text,
    attachments,
  });
}
