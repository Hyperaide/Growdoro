import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { init, id } from '@instantdb/admin';
import { DateTime } from 'luxon';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('checkout_session_id');

    if (!sessionId) {
        return new Response('No session ID provided', { status: 400 });
    }

    try {
        // Retrieve the checkout session with expanded line items
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items', 'customer', 'subscription']
        });

        if (session.status === 'complete') {
            // Extract customer information
            const customerEmail = session.customer_details?.email;
            const customerName = session.customer_details?.name;
            const customerPhone = session.customer_details?.phone;
            const customerAddress = session.customer_details?.address;
            
            // Get subscription details if this was a subscription payment
            const subscriptionId = session.subscription;
            let subscriptionDetails = null;
            
            if (subscriptionId && typeof subscriptionId === 'string') {
                // Fetch full subscription details
                subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId);
            } else if (subscriptionId && typeof subscriptionId === 'object') {
                // Already expanded
                subscriptionDetails = subscriptionId;
            }
            
            // Get line items to understand what was purchased
            const lineItems = session.line_items?.data || [];
            
            // Store subscription information in your database
            // This is where you'd typically:
            // 1. Create or update user record
            // 2. Store subscription details
            // 3. Grant access to premium features
            
            // Example database transaction (adjust based on your schema)
            if (customerEmail && subscriptionDetails) {
                const profileId = session.client_reference_id;
                
                await db.transact([
                    // Create or update profile with subscription details
                    db.tx.profiles[profileId as string].update({
                        supporter: true,
                        supporterSince: DateTime.now().toISO(),
                        supporterUntil: DateTime.fromMillis((subscriptionDetails as any).current_period_end * 1000).toISO(),
                        stripeCustomerId: (session.customer as any).id,
                        stripeDetails: {
                            subscriptionId: subscriptionDetails.id,
                            subscriptionStatus: subscriptionDetails.status,
                            priceId: subscriptionDetails.items.data[0]?.price.id,
                            productId: subscriptionDetails.items.data[0]?.price.product,
                        },
                        createdAt: DateTime.now().toISO(),
                    }),
                ]);
            }
            
            // Redirect to success page with session info
            const baseUrl = new URL(request.url).origin;
            const successUrl = new URL('/success', baseUrl);
            successUrl.searchParams.set('session_id', sessionId);
            if (customerEmail) {
                successUrl.searchParams.set('email', customerEmail);
            }
            
            return NextResponse.redirect(successUrl);
        } else if (session.status === 'expired') {
            // Handle expired session
            const baseUrl = new URL(request.url).origin;
            const errorUrl = new URL('/error', baseUrl);
            errorUrl.searchParams.set('reason', 'session_expired');
            return NextResponse.redirect(errorUrl);
        } else {
            // Session is still open or requires action
            const baseUrl = new URL(request.url).origin;
            const pendingUrl = new URL('/pending', baseUrl);
            pendingUrl.searchParams.set('session_id', sessionId);
            return NextResponse.redirect(pendingUrl);
        }
    } catch (error) {
        console.error('Error processing Stripe callback:', error);
        
        // Redirect to error page
        const baseUrl = new URL(request.url).origin;
        const errorUrl = new URL('/error', baseUrl);
        errorUrl.searchParams.set('reason', 'processing_error');
        return NextResponse.redirect(errorUrl);
    }
}