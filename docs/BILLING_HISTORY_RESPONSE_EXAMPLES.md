# Billing History API - Response Examples

**Endpoint:** `GET /subscriptions/billinghistory`

## Request

```bash
GET /subscriptions/billinghistory HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
x-clerk-id: user_2d6uIswUnhBsL9Q6zBXXx9pwJhR
Host: api.example.com
```

---

## Response Examples

### ✅ Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "success": true,
    "user": {
      "id": 1,
      "clerk_id": "user_2d6uIswUnhBsL9Q6zBXXx9pwJhR",
      "email": "john.doe@example.com",
      "stripe_id": "cus_P8xQ9rK2mN5vL7jH"
    },
    "billing": {
      "dbInvoices": [
        {
          "id": 1,
          "stripe_invoice_id": "in_1PN0eXC9Z59e8GjOABC123",
          "amount": 9900,
          "currency": "usd",
          "status": "paid",
          "due_date": "2026-03-10T00:00:00.000Z",
          "paid_date": "2026-03-05T14:32:15.000Z",
          "pdf_url": "https://invoice.stripe.com/i/acct_1PN0eXC9Z59e8G/test_YWNjdF8xUE4wZVhDOVo1OWU4R2pP0100a1234567",
          "created_at": "2026-03-01T10:00:00.000Z"
        },
        {
          "id": 2,
          "stripe_invoice_id": "in_1PMzvyC9Z59e8GjODEF456",
          "amount": 9900,
          "currency": "usd",
          "status": "paid",
          "due_date": "2026-02-10T00:00:00.000Z",
          "paid_date": "2026-02-05T09:15:42.000Z",
          "pdf_url": "https://invoice.stripe.com/i/acct_1PN0eXC9Z59e8G/test_YWNjdF8xUE0wenlDOVo1OWU4R2pPABC123456",
          "created_at": "2026-02-01T10:00:00.000Z"
        }
      ],
      "stripeInvoices": [
        {
          "id": "in_1PN0eXC9Z59e8GjOABC123",
          "number": "0001",
          "status": "paid",
          "amount": 9900,
          "currency": "usd",
          "receipt_number": "RCPT20260305001",
          "period_start": "2026-03-01T00:00:00.000Z",
          "period_end": "2026-04-01T00:00:00.000Z",
          "due_date": "2026-03-10T00:00:00.000Z",
          "paid_at": "2026-03-05T14:32:15.000Z",
          "created_at": "2026-03-01T10:00:00.000Z",
          "hosting_invoice": "https://invoice.stripe.com/i/acct_1PN0eXC9Z59e8G/test_YWNjdF8xUE4wZVhDOVo1OWU4R2pP0100a1234567",
          "pdf_url": "https://files.stripe.com/links/MDB8YWNjdF8xUE40ZVhDOVo1OWU4R2pP",
          "total": 9900,
          "total_excluding_tax": 9000,
          "subtotal": 9000,
          "tax": 900,
          "lines": [
            {
              "id": "il_1PN0eXC9Z59e8GjOXYZ789",
              "description": "Premium Plan - Monthly subscription",
              "amount": 9000,
              "currency": "usd",
              "quantity": 1,
              "unit_amount": 9000,
              "period": {
                "start": "2026-03-01T00:00:00.000Z",
                "end": "2026-04-01T00:00:00.000Z"
              }
            }
          ]
        },
        {
          "id": "in_1PMzvyC9Z59e8GjODEF456",
          "number": "0002",
          "status": "paid",
          "amount": 9900,
          "currency": "usd",
          "receipt_number": "RCPT20260205002",
          "period_start": "2026-02-01T00:00:00.000Z",
          "period_end": "2026-03-01T00:00:00.000Z",
          "due_date": "2026-02-10T00:00:00.000Z",
          "paid_at": "2026-02-05T09:15:42.000Z",
          "created_at": "2026-02-01T10:00:00.000Z",
          "hosting_invoice": "https://invoice.stripe.com/i/acct_1PN0eXC9Z59e8G/test_YWNjdF8xUE0wenlDOVo1OWU4R2pPABC123456",
          "pdf_url": "https://files.stripe.com/links/MDB8YWNjdF8xUDE4ZVhDOVo1OWU4R2pO",
          "total": 9900,
          "total_excluding_tax": 9000,
          "subtotal": 9000,
          "tax": 900,
          "lines": [
            {
              "id": "il_1PMzvyC9Z59e8GjOQRS123",
              "description": "Premium Plan - Monthly subscription",
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
        "id": "sub_1PN0eXC9Z59e8GjO",
        "status": "active",
        "current_period_start": "2026-03-01T00:00:00.000Z",
        "current_period_end": "2026-04-01T00:00:00.000Z",
        "cancel_at_period_end": false,
        "canceled_at": null,
        "default_payment_method": "pm_1PN0eXC9Z59e8GjO",
        "items": [
          {
            "id": "si_P8xQ9rK2mN5vL7jH",
            "product_id": "prod_QDRXMY3ecBW5bP",
            "price_id": "price_1PN0eXC9Z59e8GjO06cltizs",
            "quantity": 1,
            "billing_cycle_anchor": "2026-01-01T00:00:00.000Z"
          }
        ]
      },
      "subscriptions": [
        {
          "id": 1,
          "subscription_id": "sub_1PN0eXC9Z59e8GjO",
          "title": "Premium Plan",
          "status": "active",
          "start_date": "2026-01-01T00:00:00.000Z",
          "end_date": "2026-01-08T00:00:00.000Z",
          "next_billing_date": "2026-04-01T00:00:00.000Z",
          "canceled_at": null,
          "cancel_at_period_end": false,
          "pdf_url": "https://invoice.stripe.com/i/acct_1PN0eXC9Z59e8G/test_YWNjdF8xUE0wZVhDOVo1OWU4R2pP",
          "created_at": "2026-01-01T10:00:00.000Z",
          "updated_at": "2026-03-01T10:00:00.000Z"
        }
      ]
    },
    "summary": {
      "total_invoices": 2,
      "total_subscriptions": 1,
      "stripe_customer_id": "cus_P8xQ9rK2mN5vL7jH"
    }
  }
}
```

---

### ⚠️ User Not Found (200 OK)

```json
{
  "success": false,
  "error": "User not found",
  "clerkId": "user_invalid123",
  "invoices": [],
  "subscriptions": []
}
```

---

### ⚠️ No Stripe Account Linked (200 OK)

```json
{
  "success": false,
  "error": "No Stripe account linked to this user",
  "clerkId": "user_2d6uIswUnhBsL9Q6zBXXx9pwJhR",
  "invoices": [],
  "subscriptions": []
}
```

---

### ✅ Active Subscription with Pending Cancellation (200 OK)

```json
{
  "success": true,
  "data": {
    "success": true,
    "user": {
      "id": 2,
      "clerk_id": "user_2d6uIswUnhBsL9Q6zBXXx9pwJhS",
      "email": "jane.smith@example.com",
      "stripe_id": "cus_P8xQ9rK2mN5vL7jI"
    },
    "billing": {
      "dbInvoices": [
        {
          "id": 3,
          "stripe_invoice_id": "in_1POKlhC9Z59e8GjOXYZ789",
          "amount": 4950,
          "currency": "usd",
          "status": "paid",
          "due_date": "2026-03-15T00:00:00.000Z",
          "paid_date": "2026-03-12T08:45:30.000Z",
          "pdf_url": "https://invoice.stripe.com/i/acct_1PN0eXC9Z59e8G/test_invoice_url",
          "created_at": "2026-03-01T12:00:00.000Z"
        }
      ],
      "stripeInvoices": [
        {
          "id": "in_1POKlhC9Z59e8GjOXYZ789",
          "number": "0001",
          "status": "paid",
          "amount": 4950,
          "currency": "usd",
          "receipt_number": null,
          "period_start": "2026-03-01T00:00:00.000Z",
          "period_end": "2026-04-01T00:00:00.000Z",
          "due_date": "2026-03-15T00:00:00.000Z",
          "paid_at": "2026-03-12T08:45:30.000Z",
          "created_at": "2026-03-01T12:00:00.000Z",
          "hosting_invoice": "https://invoice.stripe.com/i/acct_1PN0eXC9Z59e8G/hosted_url",
          "pdf_url": "https://files.stripe.com/links/pdf_link",
          "total": 4950,
          "total_excluding_tax": 4500,
          "subtotal": 4500,
          "tax": 450,
          "lines": [
            {
              "id": "il_1POKlhC9Z59e8GjO123",
              "description": "Professional Plan - Monthly subscription",
              "amount": 4500,
              "currency": "usd",
              "quantity": 1,
              "unit_amount": 4500,
              "period": {
                "start": "2026-03-01T00:00:00.000Z",
                "end": "2026-04-01T00:00:00.000Z"
              }
            }
          ]
        }
      ],
      "currentSubscription": {
        "id": "sub_1POKlhC9Z59e8GjO",
        "status": "active",
        "current_period_start": "2026-03-01T00:00:00.000Z",
        "current_period_end": "2026-04-01T00:00:00.000Z",
        "cancel_at_period_end": true,
        "canceled_at": "2026-03-10T16:22:45.000Z",
        "default_payment_method": "pm_1POKlhC9Z59e8GjO",
        "items": [
          {
            "id": "si_P9yR0sL3nO6wM8kI",
            "product_id": "prod_QDRXMY3ecBW5bQ",
            "price_id": "price_1POKlhC9Z59e8GjO",
            "quantity": 1,
            "billing_cycle_anchor": "2026-01-01T00:00:00.000Z"
          }
        ]
      },
      "subscriptions": [
        {
          "id": 2,
          "subscription_id": "sub_1POKlhC9Z59e8GjO",
          "title": "Professional Plan",
          "status": "active",
          "start_date": "2026-01-15T00:00:00.000Z",
          "end_date": null,
          "next_billing_date": "2026-04-01T00:00:00.000Z",
          "canceled_at": "2026-03-10T16:22:45.000Z",
          "cancel_at_period_end": true,
          "pdf_url": "https://invoice.stripe.com/i/acct_1PN0eXC9Z59e8G/test_url",
          "created_at": "2026-01-15T10:00:00.000Z",
          "updated_at": "2026-03-10T16:22:45.000Z"
        }
      ]
    },
    "summary": {
      "total_invoices": 1,
      "total_subscriptions": 1,
      "stripe_customer_id": "cus_P8xQ9rK2mN5vL7jI"
    }
  }
}
```

---

### ✅ User with No Active Subscription (200 OK)

```json
{
  "success": true,
  "data": {
    "success": true,
    "user": {
      "id": 3,
      "clerk_id": "user_2d6uIswUnhBsL9Q6zBXXx9pwJhT",
      "email": "bob.wilson@example.com",
      "stripe_id": "cus_P8xQ9rK2mN5vL7jJ"
    },
    "billing": {
      "dbInvoices": [],
      "stripeInvoices": [],
      "currentSubscription": null,
      "subscriptions": []
    },
    "summary": {
      "total_invoices": 0,
      "total_subscriptions": 0,
      "stripe_customer_id": "cus_P8xQ9rK2mN5vL7jJ"
    }
  }
}
```

---

### ❌ Missing Clerk ID Header (200 OK with error)

```json
{
  "error": "clerkId is required"
}
```

---

### ❌ Server Error (200 OK with error)

```json
{
  "error": "Failed to fetch billing history"
}
```

---

## Response Status Codes

| Status | Scenario |
|--------|----------|
| **200** | Always returns 200 (even with errors, check `success` field) |
| **401** | Invalid or missing authentication token |
| **500** | Server error (rare) |

---

## Key Fields Explained

### User Object
- **id**: Local database user ID
- **clerk_id**: Clerk authentication user ID (identifier for request)
- **email**: User's email address
- **stripe_id**: Stripe customer ID (used for Stripe operations)

### DBInvoices (Local Database)
Local copy of invoices synced from Stripe. May lag behind live Stripe data.

### StripeInvoices (Live from API)
Real-time invoice data directly from Stripe. Most up-to-date information.

### CurrentSubscription
Active subscription from Stripe. `null` if no active subscription exists.

**Important fields:**
- `cancel_at_period_end`: `true` = subscription will end at period end
- `canceled_at`: When cancellation was requested
- `status`: 'active', 'canceled', 'past_due', 'trialing'

### Subscriptions (Local Database)
Historical subscription records stored locally.

### Summary
Quick stats about billing:
- `total_invoices`: Count of invoices from Stripe
- `total_subscriptions`: Count of subscription records
- `stripe_customer_id`: The Stripe customer ID for reference

---

## Common Patterns

### Checking if Subscription will Cancel
```javascript
if (data.billing.currentSubscription?.cancel_at_period_end) {
  console.log('Subscription will be canceled at: ' + 
              data.billing.currentSubscription.current_period_end);
}
```

### Getting Latest Invoice
```javascript
const latestInvoice = data.billing.stripeInvoices[0];
console.log(`Latest invoice: ${latestInvoice.number} - $${latestInvoice.total / 100}`);
```

### Downloading Invoice PDF
```javascript
const pdfUrl = data.billing.stripeInvoices[0].pdf_url;
window.open(pdfUrl, '_blank');
```

### Checking Payment Status
```javascript
const invoice = data.billing.stripeInvoices[0];
if (invoice.status === 'paid') {
  console.log('Invoice was paid on:', invoice.paid_at);
} else if (invoice.status === 'open') {
  console.log('Invoice is overdue. Due date:', invoice.due_date);
}
```

---

## Notes

⚠️ **Important:** 
- Some fields in the success response may not exist depending on user state
- `currentSubscription` will be `null` if user has no active subscription
- `dbInvoices` may differ from `stripeInvoices` due to sync delays
- Always use `stripeInvoices` for display when live data is critical
- Timestamps are in ISO 8601 format with millisecond precision
