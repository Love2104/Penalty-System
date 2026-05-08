import nodemailer from 'nodemailer';

interface SendMailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false', // default true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

export const getMailerConfigStatus = () => {
  const missing = ['SMTP_USER', 'SMTP_PASS'].filter((key) => !process.env[key]);

  return {
    ready: missing.length === 0,
    missing,
    provider: 'gmail' as const,
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || null,
    fromName: process.env.SMTP_FROM_NAME || 'IITK Election Commission',
  };
};

export const verifyMailerConnection = async () => {
  const status = getMailerConfigStatus();

  if (!status.ready) {
    throw new Error(`Gmail SMTP is not configured. Missing: ${status.missing.join(', ')}`);
  }

  const transporter = getTransporter();
  await transporter.verify();
  return status;
};

export const sendMail = async ({ to, subject, html, text }: SendMailPayload) => {
  const status = getMailerConfigStatus();

  if (!status.ready) {
    throw new Error(`Gmail SMTP is not configured. Missing: ${status.missing.join(', ')}`);
  }

  const transporter = getTransporter();

  return transporter.sendMail({
    from: `"${status.fromName}" <${status.fromEmail}>`,
    to,
    subject,
    html,
    text,
  });
};
