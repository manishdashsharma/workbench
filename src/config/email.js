import { Resend } from 'resend';
import config from './index.js';
import { logger } from '../shared/index.js';

let emailClient = null;

export function initializeEmail() {
  if (emailClient) {
    return emailClient;
  }

  try {
    if (!config.resend.apiKey) {
      logger.warn('Email API key not configured, email service will not be available');
      return null;
    }

    emailClient = new Resend(config.resend.apiKey);
    logger.info('✅ Email service initialized successfully');
    return emailClient;
  } catch (error) {
    logger.error('Failed to initialize email service', {
      error: error.message,
    });
    return null;
  }
}

export function getEmailClient() {
  if (!emailClient) {
    return initializeEmail();
  }
  return emailClient;
}

export async function sendEmail({ to, subject, html, text = null, from = null }) {
  try {
    const client = getEmailClient();

    if (!client) {
      throw new Error('Email service not initialized');
    }

    const emailData = {
      from: from || config.resend.fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (text) {
      emailData.text = text;
    }

    const result = await client.emails.send(emailData);

    logger.info('Email sent successfully', {
      to,
      subject,
      emailId: result.data?.id,
    });

    return { success: true, emailId: result.data?.id };
  } catch (error) {
    logger.error('Failed to send email', {
      to,
      subject,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
}

export async function verifyEmailConnection() {
  try {
    const client = getEmailClient();

    if (!client) {
      throw new Error('Email service not initialized');
    }

    logger.info('Email service is ready');
    return true;
  } catch (error) {
    logger.error('Email service connection failed', {
      error: error.message,
    });
    return false;
  }
}
