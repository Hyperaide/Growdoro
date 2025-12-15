import { init } from '@instantdb/admin';
import { NextResponse } from 'next/server';
import Userplex from 'userplex';

// Initialize Userplex
const userplex = new Userplex({
  apiKey: process.env.USERPLEX_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const dryRun = searchParams.get('dryRun') === 'true';

    // Simple security check
    if (secret !== process.env.CRON_SECRET && secret !== process.env.ADMIN_SECRET && secret !== process.env.INSTANT_APP_ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
    const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;

    if (!appId || !adminToken) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const db = init({
      appId,
      adminToken,
    });

    const results = {
      profiles: 0,
      sessions: 0,
      blocks: 0,
      rewards: 0,
      errors: 0,
    };

    // 1. Backfill Profiles (User Signups)
    const profilesQuery = await db.query({
      profiles: {
        $: {
          limit: 1000, // Adjust limit as needed
        },
        user: {},
      },
    });

    for (const profile of profilesQuery.profiles) {
      if (profile.user?.[0]?.id) {
        const userId = profile.user[0].id;
        const timestamp = new Date(profile.createdAt).toISOString();
        
        if (!dryRun) {
          try {
            const email = profile.user[0].email;
            
            // Construct identification payload
            const identifyPayload: any = {
              userId,
              name: profile.username || undefined,
              ...({ username: profile.username } as any)
            };
            
            if (email) {
              identifyPayload.email = email;
            }

            await userplex.users.identify(identifyPayload);

            await userplex.events.new({
              name: 'user_signed_up',
              user_id: userId,
              timestamp,
              properties: {
                username: profile.username,
              },
            });
            results.profiles++;
          } catch (e) {
            console.error(`Failed to track signup for ${userId}`, e);
            results.errors++;
          }
        } else {
            results.profiles++;
        }
      }
    }

    // 2. Backfill Sessions (Timer Starts)
    const sessionsQuery = await db.query({
      sessions: {
        $: {
            limit: 1000,
        },
        user: {},
      },
    });

    for (const session of sessionsQuery.sessions) {
      if (session.user?.[0]?.id) {
        const userId = session.user[0].id;
        const timestamp = new Date(session.createdAt).toISOString();
        const eventName = session.type === 'break' ? 'break_timer_started' : 'focus_timer_started';

        if (!dryRun) {
          try {
            await userplex.events.new({
              name: eventName,
              user_id: userId,
              timestamp,
              properties: {
                duration: session.timeInSeconds,
              },
            });
            results.sessions++;
          } catch (e) {
            console.error(`Failed to track session ${session.id}`, e);
            results.errors++;
          }
        } else {
            results.sessions++;
        }

        // 3. Backfill Rewards (Pack Claimed)
        if (session.rewardsClaimedAt) {
            const rewardTimestamp = new Date(session.rewardsClaimedAt).toISOString();
            const minutes = Math.floor(session.timeInSeconds / 60);
            const packType = minutes >= 60 ? 'large' : 'standard';

            if (!dryRun) {
                try {
                    await userplex.events.new({
                        name: 'claimed_rewards',
                        user_id: userId,
                        timestamp: rewardTimestamp,
                        properties: {
                            packType,
                        },
                    });
                    results.rewards++;
                } catch (e) {
                    console.error(`Failed to track reward for session ${session.id}`, e);
                    results.errors++;
                }
            } else {
                results.rewards++;
            }
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      results,
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: 'Failed to backfill events' },
      { status: 500 }
    );
  }
}
