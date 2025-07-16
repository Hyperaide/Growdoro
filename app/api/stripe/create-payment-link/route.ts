import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

// Example API route to create a payment link
// In production, you'd want to add authentication and validation
export async function POST(request: Request) {
    try {
        const { priceId, email } = await request.json();

        if (!priceId) {
            return NextResponse.json(
                { error: 'Price ID is required' },
                { status: 400 }
            );
        }

        // Create a checkout session for subscription
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            // Pre-fill customer email if provided
            ...(email && { customer_email: email }),
            
            // Return URL after payment
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/callback?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`,
            
            // Collect billing address
            billing_address_collection: 'required',
            
            // Allow promotion codes
            allow_promotion_codes: true,
            
            // Metadata for tracking
            metadata: {
                source: 'Growdoro',
            },
        });

        return NextResponse.json({ 
            url: session.url,
            sessionId: session.id 
        });
    } catch (error) {
        console.error('Error creating payment link:', error);
        return NextResponse.json(
            { error: 'Failed to create payment link' },
            { status: 500 }
        );
    }
}

// Example of how to use this endpoint:
// 
// const response = await fetch('/api/stripe/create-payment-link', {
//     method: 'POST',
//     headers: {
//         'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//         priceId: 'price_xxxxxxxxxxxxx', // Your Stripe Price ID
//         email: 'customer@example.com'    // Optional
//     }),
// });
// 
// const { url } = await response.json();
// window.location.href = url; // Redirect to Stripe Checkout 