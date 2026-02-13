# Email Service Documentation

## Overview

The Email Service (`src/services/emailService.ts`) automatically sends HTML-based emails to users when their subscription status changes. It supports multiple email providers via SMTP configuration.

## Features

- **Automated Email Sending**: Sends emails based on subscription status changes
- **HTML Template Support**: Uses the subscription template files (success.html, cancel.html, error.html, invalid.html)
- **Multiple Providers**: Works with Gmail, SendGrid, Mailgun, or any SMTP-compatible email provider
- **Error Handling**: Gracefully handles missing configuration without crashing
- **Logging**: Comprehensive logging for debugging and monitoring

## Installation

The email service uses the `nodemailer` package which has already been installed:

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## Configuration

Add the following environment variables to your `.env` file:

```dotenv
# Email Server Configuration
EMAIL_HOST=smtp.gmail.com          # SMTP server hostname
EMAIL_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
EMAIL_USER=your-email@gmail.com    # Email account username
EMAIL_PASSWORD=app-password        # Email account password/app-specific password
EMAIL_FROM=noreply@example.com     # Sender email address
EMAIL_SECURE=false                 # Use TLS (false for 587, true for 465)
```

### Provider-Specific Setup

#### Gmail With App Password

1. Enable 2-Factor Authentication on your Google Account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password as `EMAIL_PASSWORD`

```dotenv
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_SECURE=false
```

#### SendGrid SMTP

```dotenv
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your-api-key-here
EMAIL_FROM=noreply@yourdomain.com
EMAIL_SECURE=false
```

#### Mailgun SMTP

```dotenv
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password
EMAIL_FROM=noreply@your-domain.mailgun.org
EMAIL_SECURE=false
```

#### Office 365

```dotenv
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=your-email@outlook.com
EMAIL_SECURE=false
```

## API Usage

### Check Email Configuration

```bash
GET /api/v1/test/email-config

Response:
{
  "success": true,
  "emailServiceReady": true,
  "configuration": {
    "host": "✓ Configured",
    "port": "✓ Configured",
    "user": "✓ Configured",
    "password": "✓ Configured",
    "from": "✓ Configured"
  },
  "message": "Email service is ready"
}
```

### Send Test Success Email

```bash
POST /api/v1/test/send-success-email
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "John Doe"
}

Response:
{
  "success": true,
  "message": "Test email sent to test@example.com"
}
```

### Send Test Cancel Email

```bash
POST /api/v1/test/send-cancel-email
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "John Doe"
}
```

### Send Test Error Email

```bash
POST /api/v1/test/send-error-email
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "John Doe",
  "errorMessage": "Custom error message"
}
```

## Service Methods

### sendSuccessEmail(data)

Sends a subscription success email using the `success.html` template.

**Parameters:**
```typescript
{
  userEmail: string;          // Recipient email address
  userName?: string;          // User's display name
  userClerkId: string;       // Clerk user ID
  subscriptionStatus: string; // Subscription status (e.g., "ACTIVE")
  subscriptionId: string;    // Stripe subscription ID
  periodStart: string;       // Subscription start date
  periodEnd: string;         // Subscription end date
}
```

### sendCanceledEmail(data)

Sends a subscription canceled email using the `cancel.html` template.

**Parameters:**
```typescript
{
  userEmail: string;    // Recipient email address
  userName?: string;    // User's display name
}
```

### sendErrorEmail(data)

Sends an error notification email using the `error.html` template.

**Parameters:**
```typescript
{
  userEmail: string;        // Recipient email address
  userName?: string;        // User's display name
  errorMessage?: string;    // Error description
}
```

### sendInvalidEmail(data)

Sends an invalid request email using the `invalid.html` template.

**Parameters:**
```typescript
{
  userEmail: string;        // Recipient email address
  userName?: string;        // User's display name
  errorMessage?: string;    // Error description
}
```

### sendSubscriptionEmail(status, data)

Generic method to send email based on subscription status.

**Parameters:**
```typescript
status: 'success' | 'cancel' | 'error' | 'invalid'
data: EmailData  // Varies based on status
```

### isReady()

Check if the email service is properly configured.

**Returns:** `boolean`

## Integration With Webhooks

The email service is automatically integrated with Stripe webhooks:

### When Email is Sent

1. **customer.subscription.created** → Sends success email
2. **customer.subscription.updated** (status changes to active) → Sends success email
3. **customer.subscription.updated** (status changes to canceled) → Sends cancel email
4. **invoice.payment_failed** → Sends error email

## Logging

The email service provides detailed logging:

```
[EmailService] Email service initialized successfully
[EmailService] ✅ Success email sent to user@example.com: <messageId>
[EmailService] ⏸️ Cancel email sent to user@example.com: <messageId>
[EmailService] ❌ Error email sent to user@example.com: <messageId>
[EmailService] Error sending success email: <error details>
```

## Troubleshooting

### Email service not configured

**Issue:** "Email service not configured. Skipping email."

**Solution:** Ensure all required environment variables are set in `.env`:
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_USER
- EMAIL_PASSWORD

### Authentication Error

**Issue:** "Invalid login credentials"

**Solution:**
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- For Gmail, use an [App Password](https://myaccount.google.com/apppasswords), not your regular password
- Check that 2-Factor Authentication is enabled on Gmail

### SMTP Connection Error

**Issue:** "Failed to connect to SMTP server"

**Solution:**
- Verify EMAIL_HOST and EMAIL_PORT are correct for your provider
- Check if your firewall blocks outgoing SMTP connections
- Ensure EMAIL_SECURE matches your port (false for 587, true for 465)

### Templates Not Found

**Issue:** "Failed to render email template"

**Solution:**
- Ensure template files exist in `src/templates/`:
  - success.html
  - cancel.html
  - error.html
  - invalid.html
- Run `npm run build` to copy templates to dist folder

### Email Not Received

**Issue:** Email sent successfully but not received

**Solution:**
- Check spam/junk folder
- Verify EMAIL_FROM matches your configured sender domain
- Check email provider's bounce/complaint logs
- Test with `GET /api/v1/test/email-config` to verify configuration

## Testing

To test the email service without waiting for webhooks:

```bash
# Check configuration
curl http://localhost:8000/api/v1/test/email-config

# Send test success email
curl -X POST http://localhost:8000/api/v1/test/send-success-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Send test cancel email
curl -X POST http://localhost:8000/api/v1/test/send-cancel-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Send test error email
curl -X POST http://localhost:8000/api/v1/test/send-error-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","errorMessage":"Payment failed"}'
```

## Production Deployment

### Security Best Practices

1. **Never commit `.env` to Git** - Use `.env.example` as a template
2. **Use environment variables** - Never hardcode credentials
3. **Use strong passwords** - Generate secure app-specific passwords
4. **Enable TLS/SSL** - Always use secure SMTP connections in production
5. **Monitor logs** - Watch for email sending errors in server logs
6. **Rate limiting** - Consider implementing rate limiting for email sending

### Recommended Provider for Production

For production deployment, consider using:
- **SendGrid** - Reliable, scalable, great analytics
- **Mailgun** - Developer-friendly, flexible pricing
- **AWS SES** - Cost-effective at scale
- **Google Workspace** - If already using Google's services

## File Structure

```
src/
├── services/
│   └── emailService.ts          # Email service implementation
├── routes/
│   ├── testRoutes.ts            # Email testing endpoints
│   └── webhooks.ts              # Stripe webhook integration
├── templates/
│   ├── success.html             # Success email template
│   ├── cancel.html              # Cancel email template
│   ├── error.html               # Error email template
│   └── invalid.html             # Invalid email template
└── .env.example                 # Environment variable template
```

## Support

For issues or questions about the email service:
1. Check the troubleshooting section above
2. Review the server logs for error messages
3. Test configuration with `/api/v1/test/email-config`
4. Send a test email with `/api/v1/test/send-success-email`
