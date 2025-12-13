'use server';

import Userplex from 'userplex';

const client = new Userplex({
  apiKey: process.env['USERPLEX_API_KEY'],
});

export async function trackUserplexEvent(
  eventName: string,
  userId: string,
  properties?: Record<string, unknown>
) {
  if (!userId) {
    console.warn('trackUserplexEvent: No userId provided');
    return { success: false, error: 'No userId provided' };
  }

  try {
    await client.events.new({
      name: eventName,
      user_id: userId,
      properties,
    });
    return { success: true };
  } catch (error) {
    console.error('Error tracking Userplex event:', error);
    return { success: false, error: 'Failed to track event' };
  }
}

