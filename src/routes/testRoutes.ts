import express from 'express';
import path from 'path';
import fs from 'fs'; 
import { emailService } from '../services/emailService';

const router = express.Router();

router.get('/', (req, res) => {
  return res.json({ success: true, message: 'Test endpoint is working!' });
});


router.get('/convert', (req, res) => {
  try {
    const logoPath = path.join(__dirname,'..', '..', 'public', `app_Logo.png`);
    if(!fs.existsSync(logoPath)) {
      return res.status(404).json({ success: false, error: 'Logo not found' });
    }
    const logoData = fs.readFileSync(logoPath);
    res.setHeader('Content-Type', 'image/png');
    return res.send(logoData);
  } catch (error) {
    console.error('Error fetching logo:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch logo' });
  }
});

/**
 * Test email service configuration
 * GET /api/v1/test/email-config
 */
router.get('/email-config', (req, res) => {
  try {
    const isReady = emailService.isReady();
    return res.json({
      success: true,
      emailServiceReady: isReady,
      configuration: {
        host: process.env.EMAIL_HOST ? '✓ Configured' : '✗ Missing',
        port: process.env.EMAIL_PORT ? '✓ Configured' : '✗ Missing',
        user: process.env.EMAIL_USER ? '✓ Configured' : '✗ Missing',
        password: process.env.EMAIL_PASSWORD ? '✓ Configured' : '✗ Missing',
        from: process.env.EMAIL_FROM ? '✓ Configured' : '✗ Missing',
      },
      message: isReady ? 'Email service is ready' : 'Email service not properly configured'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to check email config' });
  }
});

/**
 * Send test success email
 * POST /api/v1/test/send-success-email
 * Body: { email: string, name?: string }
 */
router.post('/send-success-email', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (!emailService.isReady()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Email service not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env' 
      });
    }

    const success = await emailService.sendSuccessEmail({
      userEmail: email,
      userName: name,
      userClerkId: 'test-clerk-id',
      subscriptionStatus: 'ACTIVE',
      subscriptionId: 'sub_test_' + Date.now(),
      periodStart: new Date().toLocaleDateString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    });

    if (success) {
      res.json({ success: true, message: `Test email sent to ${email}` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, error: 'Failed to send test email' });
  }
});

/**
 * Send test cancel email
 * POST /api/v1/test/send-cancel-email
 * Body: { email: string, name?: string }
 */
router.post('/send-cancel-email', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (!emailService.isReady()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Email service not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env' 
      });
    }

    const success = await emailService.sendCanceledEmail({
      userEmail: email,
      userName: name,
    });

    if (success) {
      res.json({ success: true, message: `Cancel email sent to ${email}` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error sending cancel email:', error);
    res.status(500).json({ success: false, error: 'Failed to send cancel email' });
  }
});

/**
 * Send test error email
 * POST /api/v1/test/send-error-email
 * Body: { email: string, name?: string, errorMessage?: string }
 */
router.post('/send-error-email', async (req, res) => {
  try {
    const { email, name, errorMessage } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (!emailService.isReady()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Email service not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env' 
      });
    }

    const success = await emailService.sendErrorEmail({
      userEmail: email,
      userName: name,
      errorMessage,
    });

    if (success) {
      res.json({ success: true, message: `Error email sent to ${email}` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error sending error email:', error);
    res.status(500).json({ success: false, error: 'Failed to send error email' });
  }
});

/**
 * Send test renewal email
 * POST /api/v1/test/send-renewal-email
 * Body: { email: string, name?: string }
 */
router.post('/send-renewal-email', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (!emailService.isReady()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Email service not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env' 
      });
    }

    const success = await emailService.sendRenewalEmail({
      userEmail: email,
      userName: name,
      subscriptionStatus: 'ACTIVE',
      subscriptionId: 'sub_test_renewal_' + Date.now(),
      periodStart: new Date().toLocaleDateString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    });

    if (success) {
      res.json({ success: true, message: `Renewal email sent to ${email}` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error sending renewal email:', error);
    res.status(500).json({ success: false, error: 'Failed to send renewal email' });
  }
});

export default router;