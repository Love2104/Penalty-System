import nodemailer from 'nodemailer';

const getSmtpSecure = () => {
  if (process.env.SMTP_SECURE) {
    return process.env.SMTP_SECURE === 'true';
  }
  return Number(process.env.SMTP_PORT) === 465;
};

const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: getSmtpSecure(),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

export const getMailerConfigStatus = () => {
  const missing = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].filter(
    (key) => !process.env[key]
  );

  return {
    ready: missing.length === 0,
    missing,
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || null,
    fromName: process.env.SMTP_FROM_NAME || 'IITK Election Commission',
  };
};

export const verifyMailerConnection = async () => {
  const status = getMailerConfigStatus();
  if (!status.ready) {
    throw new Error(`SMTP is not configured. Missing: ${status.missing.join(', ')}`);
  }

  const transporter = getTransporter();
  await transporter.verify();
  return status;
};

export const sendMail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => {
  const status = getMailerConfigStatus();
  if (!status.ready) {
    throw new Error(`SMTP is not configured. Missing: ${status.missing.join(', ')}`);
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
