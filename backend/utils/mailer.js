let SibApiV3Sdk = null;
try {
  SibApiV3Sdk = require('sib-api-v3-sdk');
} catch (_err) {
  SibApiV3Sdk = null;
}
const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  if (SibApiV3Sdk && process.env.BREVO_API_KEY) {
    try {
      const client = SibApiV3Sdk.ApiClient.instance;
      const apiKey = client.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_API_KEY;

      const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.sender = {
        email: process.env.SENDER_EMAIL,
        name: 'WalletWise'
      };
      sendSmtpEmail.to = [{ email: to }];
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html || `<html><body><p>${text}</p></body></html>`;
      if (text) sendSmtpEmail.textContent = text;

      return await emailApi.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      console.error('Brevo email error:', error);
      throw error;
    }
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    return transporter.sendMail({
      from: process.env.SENDER_EMAIL || process.env.SMTP_USER,
      to,
      subject,
      text,
      html: html || `<html><body><p>${text}</p></body></html>`
    });
  }

  console.warn('Email provider not configured. Skipping email send.');
  return { skipped: true };
};

module.exports = { sendEmail };
