# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

## Authentication Setup

This app uses Google OAuth for authentication through InstantDB. The app works both with and without authentication:
- **Without authentication**: Uses session IDs stored in localStorage
- **With authentication**: Links data to your Google account

### Setting up Google OAuth

1. **Google Cloud Console Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to "Credentials" section
   - Configure OAuth consent screen (if not already done)
   - Create OAuth 2.0 Client ID (Web application)
   - Add `https://api.instantdb.com/runtime/oauth/callback` to Authorized redirect URIs
   - Add your domain to Authorized JavaScript origins (e.g., `http://localhost:3000` for development)

2. **InstantDB Dashboard Setup**:
   - Go to your [InstantDB dashboard](https://instantdb.com)
   - Navigate to the Auth tab for your app
   - Click "Set up Google"
   - Enter your Google Client ID and Client Secret
   - Add your website URLs to Redirect Origins

3. **Environment Variables**:
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   NEXT_PUBLIC_GOOGLE_CLIENT_NAME=your_app_name
   ```

### How Authentication Works

- Users can sign in with their Google account using the button in the top-right corner
- When authenticated, all blocks and sessions are linked to the user's account
- When not authenticated, data is stored locally using session IDs
- User profiles are automatically created on first sign-in
