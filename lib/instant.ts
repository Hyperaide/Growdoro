import { init, id } from '@instantdb/admin';

// ID for app: Growdoro Dev
const APP_ID = '8134a84d-619c-4d6d-a54e-9d357e6d2d01';
export const db = init({
  appId: APP_ID,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
});