import nodemailer from 'nodemailer';

type MailProvider = 'smtp' | 'emailjs';
type MailTemplateType = 'generic' | 'otp' | 'penalty';

interface SendMailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateType?: MailTemplateType;
}

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

const getMailProvider = (): MailProvider =>
  process.env.EMAIL_PROVIDER === 'emailjs' ? 'emailjs' : 'smtp';

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

const getEmailJsTemplateId = (templateType: MailTemplateType) => {
  if (templateType === 'otp') {
    return process.env.EMAILJS_TEMPLATE_ID_OTP || process.env.EMAILJS_TEMPLATE_ID;
  }

  if (templateType === 'penalty') {
    return process.env.EMAILJS_TEMPLATE_ID_PENALTY || process.env.EMAILJS_TEMPLATE_ID;
  }

  return process.env.EMAILJS_TEMPLATE_ID;
};

const getEmailJsConfigStatus = (templateType: MailTemplateType = 'generic') => {
  const templateId = getEmailJsTemplateId(templateType);
  const missing = [
    !process.env.EMAILJS_SERVICE_ID ? 'EMAILJS_SERVICE_ID' : null,
    !templateId ? 'EMAILJS_TEMPLATE_ID' : null,
    !process.env.EMAILJS_PUBLIC_KEY ? 'EMAILJS_PUBLIC_KEY' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    ready: missing.length === 0,
    missing,
    provider: 'emailjs' as const,
    fromEmail: process.env.EMAILJS_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || null,
    fromName: process.env.EMAILJS_FROM_NAME || process.env.SMTP_FROM_NAME || 'IITK Election Commission',
    templateId,
  };
};

const getSmtpConfigStatus = () => {
  const missing = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].filter((key) => !process.env[key]);

  return {
    ready: missing.length === 0,
    missing,
    provider: 'smtp' as const,
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || null,
    fromName: process.env.SMTP_FROM_NAME || 'IITK Election Commission',
  };
};

export const getMailerConfigStatus = (templateType: MailTemplateType = 'generic') => {
  return getMailProvider() === 'emailjs'
    ? getEmailJsConfigStatus(templateType)
    : getSmtpConfigStatus();
};

export const verifyMailerConnection = async (templateType: MailTemplateType = 'generic') => {
  const provider = getMailProvider();
  const status = getMailerConfigStatus(templateType);

  if (!status.ready) {
    throw new Error(`${provider.toUpperCase()} is not configured. Missing: ${status.missing.join(', ')}`);
  }

  if (provider === 'smtp') {
    const transporter = getTransporter();
    await transporter.verify();
  }

  return status;
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const sendViaEmailJs = async ({
  to,
  subject,
  html,
  text,
  templateType = 'generic',
}: SendMailPayload) => {
  const status = getEmailJsConfigStatus(templateType);

  if (!status.ready || !status.templateId) {
    throw new Error(`EmailJS is not configured. Missing: ${status.missing.join(', ')}`);
  }

  const response = await fetch(EMAILJS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: status.templateId,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: to,
        to_name: to.split('@')[0],
        subject,
        message_html: html,
        message_text: text || stripHtml(html),
        from_name: status.fromName,
        from_email: status.fromEmail,
      },
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`EmailJS request failed: ${responseText || response.statusText}`);
  }

  return {
    provider: 'emailjs' as const,
    ok: true,
  };
};

const sendViaSmtp = async ({ to, subject, html, text }: SendMailPayload) => {
  const status = getSmtpConfigStatus();

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

export const sendMail = async (payload: SendMailPayload) => {
  return getMailProvider() === 'emailjs'
    ? sendViaEmailJs(payload)
    : sendViaSmtp(payload);
};
