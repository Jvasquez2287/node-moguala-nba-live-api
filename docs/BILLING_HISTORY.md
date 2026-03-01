# Billing History API Documentation

## Overview

The Billing History API provides a comprehensive view of a user's subscription and invoice history. It aggregates data from both the local database and Stripe API to give complete billing information.

**Endpoint:** `GET /api/v1/subscriptions/billinghistory`

## Access Requirements

- **Authentication:** Required (Bearer token in Authorization header)
- **User Identification:** Clerk ID in `x-clerk-id` header (required)
- **HTTP Method:** GET

## Request

### Headers

```
Authorization: Bearer <token>
x-clerk-id: <clerk_user_id>
```

### Parameters

None (User is identified via headers)

## Response Schema

### Success Response (HTTP 200)

```json
{
  "success": true,
  "user": {
    "id": 1,
    "clerk_id": "user_123abc",
    "email": "user@example.com",
    "stripe_id": "cus_ABC123XYZ"
  },
  "billing": {
    "dbInvoices": [
      {
        "id": 1,
        "stripe_invoice_id": "in_123ABC",
        "amount": 9900,
        "currency": "usd",
        "status": "paid",
        "due_date": "2026-03-10T00:00:00.000Z",
        "paid_date": "2026-03-05T12:30:00.000Z",
        "pdf_url": "https://invoice.stripe.com/...",
        "created_at": "2026-03-01T10:00:00.000Z"
      }
    ],
    "stripeInvoices": [
      {
        "id": "in_123ABC",
        "number": "0001",
        "status": "paid",
        "amount": 9900,
        "currency": "usd",
        "receipt_number": "RCPT-123",
        "period_start": "2026-02-01T00:00:00.000Z",
        "period_end": "2026-03-01T00:00:00.000Z",
        "due_date": "2026-03-10T00:00:00.000Z",
        "paid_at": "2026-03-05T12:30:00.000Z",
        "created_at": "2026-03-01T10:00:00.000Z",
        "hosting_invoice": "https://invoice.stripe.com/hosted/...",
        "pdf_url": "https://invoice.stripe.com/pdf/...",
        "total": 9900,
        "total_excluding_tax": 9000,
        "subtotal": 9000,
        "tax": 900,
        "lines": [
          {
            "id": "il_123ABC",
            "description": "Premium Plan - Monthly",
            "amount": 9000,
            "currency": "usd",
            "quantity": 1,
            "unit_amount": 9000,
            "period": {
              "start": "2026-02-01T00:00:00.000Z",
              "end": "2026-03-01T00:00:00.000Z"
            }
          }
        ]
      }
    ],
    "currentSubscription": {
      "id": "sub_123ABC",
      "status": "active",
      "current_period_start": "2026-03-01T00:00:00.000Z",
      "current_period_end": "2026-04-01T00:00:00.000Z",
      "cancel_at_period_end": false,
      "canceled_at": null,
      "default_payment_method": "pm_123ABC",
      "items": [
        {
          "id": "si_123ABC",
          "product_id": "prod_ABC123",
          "price_id": "price_123ABC",
          "quantity": 1,
          "billing_cycle_anchor": "2026-01-01T00:00:00.000Z"
        }
      ]
    },
    "subscriptions": [
      {
        "id": 1,
        "subscription_id": "sub_123ABC",
        "title": "Premium Plan",
        "status": "active",
        "start_date": "2026-01-01T00:00:00.000Z",
        "end_date": "2026-01-08T00:00:00.000Z",
        "next_billing_date": "2026-04-01T00:00:00.000Z",
        "canceled_at": null,
        "cancel_at_period_end": false,
        "pdf_url": "https://invoice.stripe.com/...",
        "created_at": "2026-01-01T10:00:00.000Z",
        "updated_at": "2026-03-01T10:00:00.000Z"
      }
    ]
  },
  "summary": {
    "total_invoices": 3,
    "total_subscriptions": 1,
    "stripe_customer_id": "cus_ABC123XYZ"
  }
}
```

### Error Response (HTTP 200 with error)

**User Not Found:**
```json
{
  "success": false,
  "error": "User not found",
  "clerkId": "user_123abc",
  "invoices": [],
  "subscriptions": []
}
```

**No Stripe Account Linked:**
```json
{
  "success": false,
  "error": "No Stripe account linked to this user",
  "clerkId": "user_123abc",
  "invoices": [],
  "subscriptions": []
}
```

**General Error:**
```json
{
  "success": false,
  "error": "Failed to fetch billing history",
  "message": "Error details here"
}
```

## Response Fields Explanation

### User Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Local database user ID |
| `clerk_id` | String | Clerk authentication user ID |
| `email` | String | User's email address |
| `stripe_id` | String | Stripe customer ID |

### Database Invoices (dbInvoices)
Invoices stored in the local database, synced from Stripe.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Local invoice record ID |
| `stripe_invoice_id` | String | Stripe invoice ID |
| `amount` | Integer | Invoice amount in cents |
| `currency` | String | Currency code (e.g., 'usd') |
| `status` | String | Invoice status: 'draft', 'open', 'paid', 'uncollectible', 'void' |
| `due_date` | DateTime | When payment is due |
| `paid_date` | DateTime | When invoice was paid |
| `pdf_url` | String | URL to invoice PDF |
| `created_at` | DateTime | When record was created |

### Stripe Invoices (stripeInvoices)
Live invoice data directly from Stripe API, more detailed.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Stripe invoice ID |
| `number` | String | Invoice number shown on document |
| `status` | String | Invoice status |
| `amount` | Integer | Amount paid in cents |
| `currency` | String | Currency code |
| `receipt_number` | String | Optional receipt number |
| `period_start` | DateTime | Start of billing period |
| `period_end` | DateTime | End of billing period |
| `due_date` | DateTime | Due date for payment |
| `paid_at` | DateTime | Timestamp when paid |
| `created_at` | DateTime | Invoice creation timestamp |
| `hosting_invoice` | String | Stripe hosted invoice URL |
| `pdf_url` | String | Direct PDF download URL |
| `total` | Integer | Total amount in cents |
| `total_excluding_tax` | Integer | Subtotal before tax |
| `subtotal` | Integer | Subtotal in cents |
| `tax` | Integer | Tax amount in cents |
| `lines` | Array | Array of line items |

#### Line Items
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Line item ID |
| `description` | String | Product/service description |
| `amount` | Integer | Line item amount in cents |
| `currency` | String | Currency code |
| `quantity` | Integer | Quantity billed |
| `unit_amount` | Integer | Unit price in cents |
| `period.start` | DateTime | Period start date |
| `period.end` | DateTime | Period end date |

### Current Subscription
User's active subscription from Stripe.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Stripe subscription ID |
| `status` | String | Status: 'trialing', 'active', 'past_due', 'canceled', 'unpaid' |
| `current_period_start` | DateTime | Current billing period start |
| `current_period_end` | DateTime | Current billing period end |
| `cancel_at_period_end` | Boolean | Whether subscription will cancel at period end |
| `canceled_at` | DateTime | When subscription was canceled (null if not canceled) |
| `default_payment_method` | String | Stripe payment method ID |
| `items` | Array | Subscription line items |

### Subscriptions from Database
Local records of user's subscriptions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Local database record ID |
| `subscription_id` | String | Stripe subscription ID |
| `title` | String | Subscription product name |
| `status` | String | Subscription status |
| `start_date` | DateTime | When subscription started |
| `end_date` | DateTime | End date (if applicable) |
| `next_billing_date` | DateTime | Next billing date |
| `canceled_at` | DateTime | When canceled |
| `cancel_at_period_end` | Boolean | Will cancel at period end |
| `pdf_url` | String | Latest invoice PDF URL |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

### Summary
Aggregate billing information.

| Field | Type | Description |
|-------|------|-------------|
| `total_invoices` | Integer | Total count of invoices |
| `total_subscriptions` | Integer | Total count of subscriptions |
| `stripe_customer_id` | String | Stripe customer ID |

## Database Schema

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

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id INT PRIMARY KEY IDENTITY(1,1),
  stripe_id VARCHAR(255) UNIQUE NOT NULL,
  subscription_id VARCHAR(255) UNIQUE,
  user_id INT,
  clerk_id VARCHAR(255),
  subscription_start_date DATETIME,
  subscription_end_date DATETIME,
  subscription_status VARCHAR(50),
  subscription_title VARCHAR(255),
  subscription_next_billing_date DATETIME,
  subscription_latest_invoice_Id VARCHAR(255),
  subscription_invoice_pdf_url VARCHAR(500),
  subscription_canceled_at DATETIME,
  subscription_cancel_at_period_end BIT,
  product_id VARCHAR(255),
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Usage Examples

### cURL Request
```bash
curl -X GET "http://localhost:8000/api/v1/subscriptions/billinghistory" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-clerk-id: user_123abc"
```

### JavaScript/Fetch
```javascript
const response = await fetch('/api/v1/subscriptions/billinghistory', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-clerk-id': clerkId
  }
});

const data = await response.json();
console.log(data.billing.stripeInvoices);
```

### TypeScript
```typescript
interface BillingHistoryResponse {
  success: boolean;
  user: {
    id: number;
    clerk_id: string;
    email: string;
    stripe_id: string;
  };
  billing: {
    dbInvoices: DatabaseInvoice[];
    stripeInvoices: StripeInvoice[];
    currentSubscription: CurrentSubscription | null;
    subscriptions: DatabaseSubscription[];
  };
  summary: {
    total_invoices: number;
    total_subscriptions: number;
    stripe_customer_id: string;
  };
}
```

## Implementation Details

### Data Flow
1. **User Lookup**: Finds user in database using Clerk ID
2. **Stripe ID Retrieval**: Gets the Stripe customer ID
3. **Database Query**: Fetches invoices and subscriptions from local DB
4. **Stripe API Call**: Retrieves latest invoice data from Stripe
5. **Subscription Fetch**: Gets current active subscription from Stripe
6. **Data Aggregation**: Combines all sources into single response

### Error Handling
- User not found → Returns empty billing data
- No Stripe account → Returns error message
- Stripe API errors → Logged but don't fail entire request
- Database errors → Full error response

### Performance Considerations
- Limits Stripe API calls to 100 invoices max
- Uses indexed queries on clerk_id and stripe_id
- Can handle users with many invoices efficiently

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (even if user not found, returns with success: false) |
| 400 | Missing clerkId header |
| 401 | Unauthorized - invalid token |
| 500 | Server error |

## Related Endpoints

- `GET /api/v1/subscriptions` - List all subscriptions
- `GET /api/v1/subscriptions/current` - Get current subscription
- `POST /api/v1/subscriptions/checkout` - Create checkout session
- `POST /api/v1/subscriptions/reactivate` - Reactivate canceled subscription
- `DELETE /api/v1/subscriptions/cancel` - Cancel subscription

## Common Use Cases

### Display Invoice List
```javascript
const billingData = await getBillingHistory(clerkId);
const invoiceList = billingData.billing.stripeInvoices;
invoiceList.forEach(invoice => {
  console.log(`${invoice.number} - ${invoice.total} ${invoice.currency}`);
});
```

### Check Subscription Status
```javascript
const billingData = await getBillingHistory(clerkId);
const currentSub = billingData.billing.currentSubscription;
if (currentSub?.cancel_at_period_end) {
  console.log('Subscription will cancel at period end');
}
```

### Download Invoice PDF
```javascript
const billingData = await getBillingHistory(clerkId);
const invoice = billingData.billing.stripeInvoices[0];
// Use invoice.pdf_url or invoice.hosting_invoice for PDF
window.open(invoice.pdf_url);
```

## Troubleshooting

### Empty Billing Data
- Verify Stripe customer ID is linked to user account
- Check that invoices exist in Stripe account
- Verify user has active or past subscriptions

### Missing Stripe Data
- Stripe API may be temporarily unavailable
- Check service logs for rate limiting
- Verify Stripe API key is valid

### Inconsistent Invoice Data
- Local database may not be synced with Stripe
- Run invoice sync/webhook processing
- Manual database update may be needed
