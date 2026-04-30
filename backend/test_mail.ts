import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testMail() {
  try {
    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully!');
    
    console.log('Attempting to send email...');
    await transporter.sendMail({
      from: `"IITK Election Commission" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // send to self
      subject: 'Test Email',
      text: 'This is a test email.',
    });
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

testMail();
