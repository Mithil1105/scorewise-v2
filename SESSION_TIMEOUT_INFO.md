# User Session Timeout Information

## Current Configuration

ScoreWise uses **Supabase Authentication** with the following settings:

```typescript
// src/integrations/supabase/client.ts
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,  // ← This is key!
  }
});
```

## How Session Timeout Works

### Default Behavior

1. **Access Token Lifetime**: Supabase JWT access tokens expire after **1 hour** by default
2. **Auto-Refresh**: With `autoRefreshToken: true`, tokens are automatically refreshed **before** they expire (typically every 55 minutes)
3. **Session Persistence**: Sessions are stored in `localStorage`, so they persist across browser sessions
4. **Refresh Token**: Refresh tokens have a longer lifetime (typically 30 days) and are used to get new access tokens

### When Users Get Signed Out

Users will be signed out in the following scenarios:

1. **Manual Sign Out**: User clicks "Sign Out" button
2. **Token Refresh Failure**: If the refresh token expires or is invalid (after ~30 days of inactivity)
3. **Browser Data Cleared**: If user clears browser localStorage/cookies
4. **Supabase Configuration**: If session timeout is changed in Supabase Dashboard (Settings → Auth → Session Management)

### Current Timeout Settings

- **Access Token**: 1 hour (auto-refreshes every ~55 minutes)
- **Refresh Token**: 30 days (default Supabase setting)
- **Session Persistence**: Indefinite (until refresh token expires or user signs out)

## What This Means

✅ **Users stay logged in** as long as:
- They use the app at least once every 30 days
- They don't manually sign out
- They don't clear browser data

❌ **Users get signed out** if:
- They don't use the app for 30+ days (refresh token expires)
- They manually sign out
- They clear browser localStorage/cookies
- Session is invalidated server-side

## Changing Session Timeout

To modify session timeout, you need to configure it in **Supabase Dashboard**:

1. Go to your Supabase project
2. Navigate to **Settings** → **Auth** → **Session Management**
3. Adjust:
   - **JWT expiry**: Access token lifetime (default: 3600 seconds = 1 hour)
   - **Refresh token rotation**: When refresh tokens are rotated
   - **Refresh token expiry**: How long refresh tokens last (default: 30 days)

## Important Notes

- The `autoRefreshToken: true` setting ensures users don't get logged out during active use
- Sessions persist across browser restarts (stored in localStorage)
- The 1-hour access token is transparent to users due to auto-refresh
- For security, consider implementing an idle timeout if needed (not currently configured)

