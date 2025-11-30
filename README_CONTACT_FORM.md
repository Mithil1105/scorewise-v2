# Contact Form Email Setup

The contact form now uses a Supabase Edge Function to automatically send emails from the server side, instead of opening the user's email client.

## Setup Instructions

### 1. Deploy the Edge Function

The Edge Function is located at `supabase/functions/send-contact-email/index.ts`. To deploy it:

```bash
# Make sure you have Supabase CLI installed
supabase functions deploy send-contact-email
```

### 2. Configure Resend API (Recommended)

For reliable email delivery, set up Resend API:

1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Add it as a secret in Supabase:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

Or via Supabase Dashboard:
- Go to Project Settings → Edge Functions → Secrets
- Add `RESEND_API_KEY` with your Resend API key

### 3. Verify Configuration

The Edge Function will:
- Save contact form submissions to the `contact_messages` table
- Send an email notification to `mithil20056mistry@gmail.com` when a form is submitted
- Work without authentication (public contact form)

### 4. Email Format

The email will include:
- **Subject**: "New Contact Form Submission: [role] - [name]"
- **From**: ScoreWise <noreply@scorewise.mithilmistry.tech>
- **Reply-To**: The submitter's email address
- **Content**: Formatted HTML email with all form details

### 5. Fallback Behavior

If `RESEND_API_KEY` is not configured:
- The form will still save to the database
- Email details will be logged to the Edge Function logs
- You can check Supabase logs to see contact form submissions

### Testing

After deployment, test the contact form at `/contact`. The email should be sent automatically from Supabase's servers, not from the user's device.

## Troubleshooting

- **Email not sending**: Check that `RESEND_API_KEY` is set correctly in Supabase secrets
- **Function not found**: Make sure the Edge Function is deployed: `supabase functions deploy send-contact-email`
- **Database errors**: Verify the `contact_messages` table exists and has proper RLS policies

