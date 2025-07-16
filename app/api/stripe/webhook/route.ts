import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request: Request) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return new Response('No signature', { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return new Response('Webhook secret not configured', { status: 500 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return new Response('Invalid signature', { status: 400 });
    }

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdate(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCancellation(subscription);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                await handleSuccessfulPayment(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handleFailedPayment(invoice);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new Response('Webhook processing failed', { status: 500 });
    }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    
    // Find profile by Stripe customer ID
    const { data } = await db.queryOnce({
        profiles: {
            $: {
                where: {
                    stripeCustomerId: customerId
                }
            }
        }
    });

    if (data?.profiles && data.profiles.length > 0) {
        const profile = data.profiles[0];
        
        await db.transact([
            db.tx.profiles[profile.id].update({
                supporter: subscription.status === 'active',
                supporterUntil: (subscription as any).current_period_end * 1000,
                stripeDetails: {
                    subscriptionId: subscription.id,
                    subscriptionStatus: subscription.status,
                    priceId: subscription.items.data[0]?.price.id,
                    productId: subscription.items.data[0]?.price.product,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                }
            })
        ]);
    }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    
    // Find profile by Stripe customer ID
    const { data } = await db.queryOnce({
        profiles: {
            $: {
                where: {
                    stripeCustomerId: customerId
                }
            }
        }
    });

    if (data?.profiles && data.profiles.length > 0) {
        const profile = data.profiles[0];
        
        await db.transact([
            db.tx.profiles[profile.id].update({
                supporter: false,
                stripeDetails: {
                    subscriptionId: subscription.id,
                    subscriptionStatus: 'cancelled',
                    cancelledAt: Date.now(),
                }
            })
        ]);
    }
}

async function handleSuccessfulPayment(invoice: Stripe.Invoice) {
    // Log successful payment
    console.log(`Payment successful for invoice ${invoice.id}`);
    
    // You could send a receipt email here
    // Or update user credits/usage if applicable
}

async function handleFailedPayment(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    
    // Log failed payment
    console.error(`Payment failed for invoice ${invoice.id}`);
    
    // Find profile by Stripe customer ID
    const { data } = await db.queryOnce({
        profiles: {
            $: {
                where: {
                    stripeCustomerId: customerId
                }
            }
        }
    });

    if (data?.profiles && data.profiles.length > 0) {
        const profile = data.profiles[0];
        
        // Update profile to note payment failure
        await db.transact([
            db.tx.profiles[profile.id].update({
                stripeDetails: {
                    ...profile.stripeDetails as any,
                    lastPaymentFailed: true,
                    lastPaymentFailedAt: Date.now(),
                }
            })
        ]);
    }
    
    // You could send a payment failure email here
} 