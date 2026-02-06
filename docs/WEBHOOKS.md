# Webhook Integration Guide

This guide describes the webhook integrations for Stripe and Clerk with the NBA API.

## Overview

The NBA API includes webhook support for:
- **Stripe**: Payment processing and subscription management
- **Clerk**: User authentication and lifecycle management

## Environment Variables

Add the following to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Clerk Configuration
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_SECRET_KEY=...
CLERK_PUBLISHABLE_KEY=...
```

## Stripe Webhooks

### Endpoint
```
POST /api/v1/webhooks/stripe
```

### Supported Events

#### 1. customer.subscription.created
Triggered when a new subscription is created. The webhook:
- Retrieves product details from Stripe
- Creates the subscription record in the database
- Stores invoice and billing information

**Payload:**
```json
{
  "id": "sub_1234567890",
  "customer": "cus_1234567890",
  "status": "active",
  "current_period_start": 1704067200,
  "current_period_end": 1706745600,
  "items": {
    "data": [
      {
        "plan": {
          "product": "prod_1234567890"
        }
      }
    ]
  },
  "latest_invoice": "in_1234567890"
}
```

#### 2. customer.subscription.updated
Triggered when a subscription is modified. The webhook:
- Updates subscription status and dates
- Updates the invoice information
- Handles subscription cancellations

#### 3. customer.subscription.deleted
Triggered when a subscription is canceled. The webhook:
- Marks the subscription as "canceled" in the database
- Records the cancellation timestamp

#### 4. invoice.paid
Triggered when an invoice is successfully paid.

#### 5. invoice.payment_failed
Triggered when an invoice payment fails.

## Clerk Webhooks

### Endpoint
```
POST /api/v1/webhooks/clerk
```

### Supported Events

#### 1. user.created
Triggered when a new user signs up via Clerk. The webhook:
- Creates a new user record in the database
- Stores: clerk_id, email, first_name, last_name, profile_image_url

**Payload:**
```json
{
  "data": {
    "id": "user_1234567890",
    "email_addresses": [
      {
        "email_address": "user@example.com"
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "profile_image_url": "https://...",
    "created_at": 1704067200000,
    "updated_at": 1704067200000
  },
  "type": "user.created",
  "object": "event"
}
```

#### 2. user.updated
Triggered when a user's information is updated. The webhook:
- Updates user profile information
- Handles email changes
- Updates profile image

#### 3. user.deleted
Triggered when a user account is deleted. The webhook:
- Marks the user as deleted (soft delete)
- Preserves user history

## Setting Up Webhooks

### Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Add an endpoint with:
   - **URL**: `https://your-domain.com/api/v1/webhooks/stripe`
   - **Events to send**: 
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
4. Copy the **Signing Secret** and add it to `.env` as `STRIPE_WEBHOOK_SECRET`

### Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **Webhooks** in your application
3. Add an endpoint with:
   - **URL**: `https://your-domain.com/api/v1/webhooks/clerk`
   - **Events to send**:
     - `user.created`
     - `user.updated`
     - `user.deleted`
4. Copy the **Signing Secret** and add it to `.env` as `CLERK_WEBHOOK_SECRET`

## Testing Webhooks Locally

### Using Stripe CLI

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Authenticate
stripe login

# Forward Stripe events to your local endpoint
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
```

### Using Ngrok

```bash
# Start ngrok tunnel
ngrok http 8000

# Use the provided URL to set up webhooks:
# https://your-ngrok-url.com/api/v1/webhooks/stripe
# https://your-ngrok-url.com/api/v1/webhooks/clerk
```

## API Endpoints

### Subscriptions

#### List Subscriptions
```
GET /api/v1/subscriptions?customerId=cus_1234567890
```

Response:
```json
{
  "success": true,
  "data": {
    "stripe_id": "cus_1234567890",
    "subscription_id": "sub_1234567890",
    "subscription_status": "active",
    "subscription_title": "Premium Plan",
    "subscription_next_billing_date": "2024-02-20T12:00:00.000Z"
  }
}
```

#### Get Subscription
```
GET /api/v1/subscriptions/:subscriptionId
```

#### Create Subscription
```
POST /api/v1/subscriptions
Content-Type: application/json

{
  "customerId": "cus_1234567890",
  "productId": "prod_1234567890",
  "name": "Premium Plan"
}
```

#### Cancel Subscription
```
DELETE /api/v1/subscriptions/:subscriptionId
```

### Users

#### Get User by Clerk ID
```
GET /api/v1/users/:clerkId
```

#### Get User by Email
```
GET /api/v1/users/email/:email
```

#### Create User
```
POST /api/v1/users
Content-Type: application/json

{
  "clerkId": "user_1234567890",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImage": "https://..."
}
```

#### Update User
```
PUT /api/v1/users/:clerkId
Content-Type: application/json

{
  "email": "newemail@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "profileImage": "https://..."
}
```

#### Delete User
```
DELETE /api/v1/users/:clerkId
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY IDENTITY(1,1),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image VARCHAR(500),
  deleted_at DATETIME,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE()
);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id INT PRIMARY KEY IDENTITY(1,1),
  stripe_id VARCHAR(255) UNIQUE NOT NULL,
  subscription_id VARCHAR(255) UNIQUE,
  user_id INT,
  subscription_start_date DATETIME,
  subscription_end_date DATETIME,
  subscription_status VARCHAR(50),
  subscription_title VARCHAR(255),
  subscription_next_billing_date DATETIME,
  subscription_latest_invoice_Id VARCHAR(255),
  subscription_invoice_pdf_url VARCHAR(500),
  subscription_canceled_at DATETIME,
  product_id VARCHAR(255),
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Invoices Table
```sql
CREATE TABLE invoices (
  id INT PRIMARY KEY IDENTITY(1,1),
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  subscription_id INT,
  stripe_customer_id VARCHAR(255),
  amount INT,
  currency VARCHAR(10),
  status VARCHAR(50),
  due_date DATETIME,
  paid_date DATETIME,
  pdf_url VARCHAR(500),
  created_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);
```

## Error Handling

All webhook endpoints return consistent error responses:

```json
{
  "error": "Webhook processing failed",
  "message": "Detailed error message"
}
```

HTTP Status Codes:
- `200 OK`: Webhook processed successfully
- `400 Bad Request`: Invalid webhook signature or missing data
- `500 Internal Server Error`: Database or service error

## webhook Signature Verification

Both Stripe and Clerk webhooks include signature headers that are automatically verified:

- **Stripe**: Uses `stripe-signature` header with HMAC-SHA256
- **Clerk**: Uses Svix webhook verification with HMAC-SHA256

If signature verification fails, the webhook is rejected with a 400 error.

## Logging

All webhook events are logged to the console with the following format:

```
[Webhook] Received Stripe event: customer.subscription.created
[Webhook] Subscription created for customer: cus_1234567890
[Webhook] Received Clerk event
[Webhook] User created: user@example.com
```

## Troubleshooting

### Webhook not being received
1. Verify the webhook URL is publicly accessible
2. Check that the webhook endpoint is correctly registered in Stripe/Clerk dashboard
3. Review server logs for error messages
4. Ensure database connection is working

### Signature verification failed
1. Verify the webhook secret is correctly set in `.env`
2. Ensure the webhook secret hasn't been rotated
3. Check server time synchronization (critical for HMAC verification)

### Database errors
1. Verify SQL Server connection is working
2. Ensure the required tables exist (run migrations)
3. Check that user/subscription exists before updating

## Support

For issues or questions:
1. Check the logs in the console
2. Review the Stripe/Clerk documentation
3. Test locally using Stripe CLI or Ngrok
4. Verify database schema matches the expected tables
