import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;

  return NextResponse.json({
    appId: appId ? 'Set' : 'Not set',
    adminToken: adminToken ? 'Set' : 'Not set',
    status: (appId && adminToken) ? 'Ready' : 'Missing environment variables'
  });
} 