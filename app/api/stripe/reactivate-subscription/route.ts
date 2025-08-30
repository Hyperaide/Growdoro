import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { subscriptionId, profileId } = await request.json();

        if (!subscriptionId || !profileId) {
            return NextResponse.json(
                { error: 'Subscription ID and Profile ID are required' },
                { status: 400 }
            );
        }

        // Verify the subscription belongs to this user
        const { data } = await db.queryOnce({
            profiles: {
                $: {
                    where: {
                        id: profileId
                    }
                }
            }
        });

        const profile = data?.profiles?.[0];
        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        // Check if the subscription ID matches the profile's subscription
        const stripeDetails = profile.stripeDetails as any;
        if (!stripeDetails || stripeDetails.subscriptionId !== subscriptionId) {
            return NextResponse.json(
                { error: 'Subscription not found or does not belong to this user' },
                { status: 403 }
            );
        }

        // Reactivate the subscription by removing the cancel_at_period_end flag
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });

        // Update the profile to remove cancellation info
        await db.transact([
            db.tx.profiles[profileId].update({
                stripeDetails: {
                    ...stripeDetails,
                    subscriptionStatus: updatedSubscription.status,
                    cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
                    cancelledAt: null, // Remove cancellation timestamp
                }
            })
        ]);

        return NextResponse.json({ 
            success: true,
            message: 'Subscription reactivated successfully',
            cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end
        });
    } catch (error) {
        console.error('Error reactivating subscription:', error);
        return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
        );
    }
}
