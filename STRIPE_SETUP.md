# Stripe Subscription Setup Guide

This guide explains how to set up and use the Stripe subscription integration in your Growdoro app.

## Prerequisites

1. A Stripe account (create one at https://stripe.com)
2. Your Stripe API keys (found in the Stripe Dashboard)

## Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook endpoint secret (see below)

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Change to your production URL
```

## Setting Up Webhooks

1. Go to the Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select the following events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the signing secret and add it as `STRIPE_WEBHOOK_SECRET` in your `.env.local`

## Creating Products and Prices

1. In Stripe Dashboard → Products, create a new product
2. Add pricing (recurring for subscriptions)
3. Copy the Price ID (starts with `price_`)

## Implementation Flow

### 1. Payment Link Return Handler (`/api/stripe/callback`)

This endpoint handles the return from Stripe Checkout:
- Retrieves the checkout session
- Creates/updates user profile with subscription details
- Redirects to success/error/pending pages

### 2. Webhook Handler (`/api/stripe/webhook`)

This endpoint handles Stripe events:
- Updates subscription status in real-time
- Handles cancellations and payment failures
- Maintains subscription state in your database

### 3. Creating Payment Links

Use the example endpoint to create payment links:

```javascript
// In your frontend code
const initiateSubscription = async () => {
  const response = await fetch('/api/stripe/create-payment-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId: 'price_xxxxxxxxxxxxx', // Your Stripe Price ID
      email: 'customer@example.com'    // Optional pre-fill
    }),
  });
  
  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe Checkout
};
```

## Database Schema

The integration uses these InstantDB entities:

- `$users`: Stores user email
- `profiles`: Stores subscription details
  - `supporter`: Boolean indicating active subscription
  - `supporterSince`: Timestamp when subscription started
  - `supporterUntil`: Timestamp when current period ends
  - `stripeCustomerId`: Stripe customer ID
  - `stripeDetails`: JSON object with full subscription details

## Testing

1. Use Stripe test mode (keys starting with `sk_test_`)
2. Test card numbers: https://stripe.com/docs/testing
3. Common test card: `4242 4242 4242 4242`

## Production Checklist

- [ ] Replace test API keys with live keys
- [ ] Update `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Set up production webhook endpoint
- [ ] Test the full flow in production
- [ ] Monitor webhook logs in Stripe Dashboard

## Troubleshooting

### Webhook Signature Errors
- Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint secret
- Check that the raw request body is being used for signature verification

### Subscription Not Updating
- Check webhook logs in Stripe Dashboard
- Verify database queries are working correctly
- Ensure webhook events are being received

### Payment Link Not Working
- Verify Price ID is correct
- Check that product is active in Stripe
- Ensure API keys have necessary permissions 