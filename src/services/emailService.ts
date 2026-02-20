import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';

interface EmailData {
  [key: string]: any;  // Allow any key for template variable replacement
}

type SubscriptionStatus = 'subscribed' | 'renewal' | 'reactivate' | 'resume' | 'canceled' | 'error' | 'invalid' | 'success' | 'cancel';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      const emailConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        connectionTimeout: 10000,  // 10 seconds
        socketTimeout: 10000,      // 10 seconds
        greetingTimeout: 10000,    // 10 seconds
        tls: {
          rejectUnauthorized: false,  // Allow self-signed certificates
        },
      };

      // Validate email configuration
      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn('[EmailService] Email credentials not configured. Email service will be disabled.');
        console.warn('[EmailService] Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD in .env');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;
      console.log('[EmailService] Email service initialized successfully');
    } catch (error) {
      console.error('[EmailService] Failed to initialize email transporter:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Read and render HTML template with data
   */
  private async renderTemplate(templateName: SubscriptionStatus, data: EmailData): Promise<string> {
    try {
      // Determine template filename based on status
      const templateMap: { [key in SubscriptionStatus]: string } = {
        subscribed: 'emails/subscribed.html',
        renewal: 'emails/renewal.html',
        reactivate: 'emails/reactivate.html',
        resume: 'emails/resume.html',
        canceled: 'emails/canceled.html',
        success: 'success.html',
        cancel: 'cancel.html',
        error: 'error.html',
        invalid: 'invalid.html',
      };

      const templatePath = path.join(__dirname, '..', 'templates', templateMap[templateName]);
      let htmlContent = await fs.readFile(templatePath, 'utf-8');
 
      // Replace all template variables {{KEY}} with actual data values
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const replacementValue = String(value || '');
        htmlContent = htmlContent.replace(regex, replacementValue);
        console.log(`[EmailService] Replaced {{${key}}} = ${replacementValue}`);
      });

      // Check for any unreplaced template variables (sanity check)
      const unreplacedVars = htmlContent.match(/{{.*?}}/g) || [];
      if (unreplacedVars.length > 0) {
        console.warn(`[EmailService] ⚠️  Found unreplaced template variables in ${templateName}:`, unreplacedVars);
      }

      return htmlContent;
    } catch (error) {
      console.error(`[EmailService] Error reading template ${templateName}:`, error);
      throw new Error(`Failed to render email template: ${templateName}`);
    }
  }

  /**
   * Send subscription success email
   */
  async sendSuccessEmail(data: {
    userEmail: string;
    userName?: string;
    userClerkId: string;
    subscriptionStatus: string;
    subscriptionId: string;
    periodStart: string;
    periodEnd: string;
    subscriptionInvoicePdfUrl?: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] Email service not configured. Skipping success email.');
      return false;
    }

    try {
      const htmlContent = await this.renderTemplate('success', {
        USER_NAME: data.userName || 'Subscriber',
        USER_EMAIL: data.userEmail,
        USER_CLERK_ID: data.userClerkId,
        SUBSCRIPTION_STATUS: data.subscriptionStatus,
        STATUS_CLASS: 'status-active',
        SUBSCRIPTION_ID: data.subscriptionId,
        PERIOD_START: data.periodStart,
        PERIOD_END: data.periodEnd,
        SUBSCRIPTION_INVOICE_PDF_URL: data.subscriptionInvoicePdfUrl || '',
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.userEmail,
        subject: 'Subscription Confirmed - Premium Access Activated',
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`[EmailService] ✅  Success email sent to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] ❌  Error sending success email:', error);
      return false;
    }
  }

  /**
   * Send subscription subscribed email
   */
  async sendSubscribedEmail(data: {
    userEmail: string;
    userName?: string;
    subscriptionTitle: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] Email service not configured. Skipping subscribed email.');
      return false;
    }

    try {
      const htmlContent = await this.renderTemplate('subscribed', {
        subscription_title: data.subscriptionTitle,
        period_start: data.periodStart,
        period_end: data.periodEnd,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.userEmail,
        subject: 'Welcome to MO\'GUALA - Subscription Active',
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`[EmailService] ✅  Subscribed email sent to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] ❌  Error sending subscribed email:', error);
      return false;
    }
  }

  /**
   * Send subscription renewal email
   */
  async sendRenewalEmail(data: {
    userEmail: string;
    userName?: string;
    subscriptionStatus: string;
    subscriptionId: string;
    periodStart: string;
    periodEnd: string;
    subscriptionInvoicePdfUrl?: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] Email service not configured. Skipping renewal email.');
      return false;
    }

    try {
      const htmlContent = await this.renderTemplate('renewal', {
        subscription_title: data.subscriptionId,
        period_start: data.periodStart,
        period_end: data.periodEnd,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.userEmail,
        subject: 'MO\'GUALA Subscription Renewed - Premium Access Continues',
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`[EmailService] ✅  Renewal email sent to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] ❌  Error sending renewal email:', error);
      return false;
    }
  }

  /**
   * Send subscription reactivated email
   */
  async sendReactivateEmail(data: {
    userEmail: string;
    userName?: string;
    subscriptionTitle: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] Email service not configured. Skipping reactivate email.');
      return false;
    }

    try {
      const htmlContent = await this.renderTemplate('reactivate', {
        subscription_title: data.subscriptionTitle,
        period_start: data.periodStart,
        period_end: data.periodEnd,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.userEmail,
        subject: 'Welcome Back! Subscription Reactivated',
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`[EmailService] ✅  Reactivate email sent to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] ❌  Error sending reactivate email:', error);
      return false;
    }
  }

  /**
   * Send subscription resumed email
   */
  async sendResumeEmail(data: {
    userEmail: string;
    userName?: string;
    subscriptionTitle: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] Email service not configured. Skipping resume email.');
      return false;
    }

    try {
      const htmlContent = await this.renderTemplate('resume', {
        subscription_title: data.subscriptionTitle,
        period_start: data.periodStart,
        period_end: data.periodEnd,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.userEmail,
        subject: 'Subscription Resumed - Access Restored',
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`[EmailService] ✅  Resume email sent to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] ❌  Error sending resume email:', error);
      return false;
    }
  }

  /**
   * Send subscription canceled email
   */
  async sendCanceledEmail(data: {
    userEmail: string;
    userName?: string;
    subscriptionTitle: string;
    periodEnd: string;
    cancelDate?: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] Email service not configured. Skipping canceled email.');
      return false;
    }

    try {
      const htmlContent = await this.renderTemplate('canceled', {
        subscription_title: data.subscriptionTitle,
        cancel_date: data.cancelDate || new Date().toLocaleDateString(),
        period_end: data.periodEnd,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.userEmail,
        subject: 'Subscription Canceled',
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`[EmailService] ✅  Canceled email sent to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] ❌  Error sending canceled email:', error);
      return false;
    }
  }

  /**
   * Send subscription error email
   */
  async sendErrorEmail(data: {
    userEmail: string;
    userName?: string;
    errorMessage?: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] Email service not configured. Skipping error email.');
      return false;
    }

    try {
      const htmlContent = await this.renderTemplate('error', {
        USER_NAME: data.userName || 'User',
        USER_EMAIL: data.userEmail,
        ERROR_MESSAGE: data.errorMessage || 'An unexpected error occurred during subscription processing.',
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.userEmail,
        subject: 'Subscription Error - Action Required',
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`[EmailService] ✅  Error email sent to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] ❌  Error sending error email:', error);
      return false;
    }
  }

  /**
   * Send invalid request email
   */
  async sendInvalidEmail(data: {
    userEmail: string;
    userName?: string;
    errorMessage?: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] Email service not configured. Skipping invalid email.');
      return false;
    }

    try {
      const htmlContent = await this.renderTemplate('invalid', {
        USER_NAME: data.userName || 'User',
        USER_EMAIL: data.userEmail,
        ERROR_MESSAGE: data.errorMessage || 'The subscription request was invalid or incomplete.',
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.userEmail,
        subject: 'Invalid Subscription Request',
        html: htmlContent,
      };

      const result = await this.transporter!.sendMail(mailOptions);
      console.log(`[EmailService] ✅  Invalid email sent to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] ❌  Error sending invalid email:', error);
      return false;
    }
  }

  /**
   * Generic method to send email based on subscription status
   */
  async sendSubscriptionEmail(status: SubscriptionStatus, data: EmailData): Promise<boolean> {
    switch (status) {
      case 'subscribed':
        return this.sendSubscribedEmail(data as any);
      case 'renewal':
        return this.sendRenewalEmail(data as any);
      case 'reactivate':
        return this.sendReactivateEmail(data as any);
      case 'resume':
        return this.sendResumeEmail(data as any);
      case 'canceled':
        return this.sendCanceledEmail(data as any);
      case 'success':
        return this.sendSuccessEmail(data as any);
      case 'cancel':
        return this.sendCanceledEmail(data as any);
      case 'error':
        return this.sendErrorEmail(data as any);
      case 'invalid':
        return this.sendInvalidEmail(data as any);
      default:
        console.error(`[EmailService] Unknown subscription status: ${status}`);
        return false;
    }
  }

  /**
   * Verify email configuration and send test email
   */
  async verifyConfiguration(testEmail: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('[EmailService] Email service not configured');
      return false;
    }

    try {
      const result = await this.transporter!.verify();
      if (result) {
        console.log('[EmailService] ✅ Email configuration verified successfully');
        
        // Send test email
        await this.transporter!.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: testEmail,
          subject: '[TEST] NBA Tracker Email Service Configuration',
          html: '<p>This is a test email to verify the email service is working correctly.</p>',
        });
        
        console.log(`[EmailService] Test email sent to ${testEmail}`);
        return true;
      } else {
        console.error('[EmailService] Email configuration verification failed');
        return false;
      }
    } catch (error) {
      console.error('[EmailService] Error verifying email configuration:', error);
      return false;
    }
  }

  /**
   * Check if email service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }
}

// Export singleton instance
export const emailService = new EmailService();
