const SibApiV3Sdk = require("sib-api-v3-sdk");

const sendEmail = async ({ to, subject, text, html }) => {
  const client = SibApiV3Sdk.ApiClient.instance;
  const apiKey = client.authentications["api-key"];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      email: process.env.SENDER_EMAIL,
      name: "WalletWise"
    };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;

    if (html) {
      sendSmtpEmail.htmlContent = html;
    } else {
      sendSmtpEmail.htmlContent = `<html><body><p>${text}</p></body></html>`;
    }

    if (text) sendSmtpEmail.textContent = text;

    const data = await emailApi.sendTransacEmail(sendSmtpEmail);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
