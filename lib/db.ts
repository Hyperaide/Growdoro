import { init } from '@instantdb/react';
import schema from '../instant.schema';

// You need to set NEXT_PUBLIC_INSTANT_APP_ID in your .env.local file
// Get your app ID from https://instantdb.com
const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID || 'YOUR_APP_ID_HERE';

if (appId === 'YOUR_APP_ID_HERE') {
  console.warn('⚠️  Please set NEXT_PUBLIC_INSTANT_APP_ID in your .env.local file');
}

export const db = init({
  appId,
  schema
}); 