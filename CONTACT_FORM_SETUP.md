# Contact Form Email Setup Guide

## Problem
The contact form submits successfully but emails are not being sent. This is because the Resend API key is not configured.

## Solution

### Step 1: Deploy the Edge Function

The Edge Function URL you have is:
```
https://enigcyvybtbmqovnjbfq.supabase.co/functions/v1/send-contact-email
```

**Deploy the function using Supabase CLI:**

```bash
# Make sure you're in the project root
cd "C:\Users\nehal\Downloads\scrowise screwed me\scorewise-final-main"

# Deploy the function
supabase functions deploy send-contact-email
```

**Or via Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Click "Deploy a new function"
4. Upload the `supabase/functions/send-contact-email` folder

### Step 2: Set Up Resend API (Required for Email Sending)

1. **Sign up for Resend** (free tier available):
   - Go to https://resend.com
   - Sign up for an account
   - Verify your email

2. **Get your API Key**:
   - Go to https://resend.com/api-keys
   - Click "Create API Key"
   - Name it "ScoreWise Contact Form"
   - Copy the API key (starts with `re_`)

3. **Add the API Key to Supabase Secrets**:

   **Option A: Using Supabase CLI**
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```

   **Option B: Using Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Project Settings** → **Edge Functions** → **Secrets**
   - Click "Add new secret"
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (starts with `re_`)
   - Click "Save"

4. **Verify Domain (Important for Production)**:
   - In Resend dashboard, go to **Domains**
   - Add your domain: `scorewise.mithilmistry.tech`
   - Follow DNS verification steps
   - Or use Resend's default domain for testing

### Step 3: Test the Contact Form

1. Go to `/contact` on your website
2. Fill out and submit the form
3. Check your email (`mithil20056mistry@gmail.com`)
4. Check the **Contact Inquiries** page in Admin Dashboard (`/admin/contact-inquiries`)

### Step 4: View Contact Inquiries (Fallback)

Even if emails fail, all contact form submissions are saved to the database. You can view them:

1. Log in as Master Admin
2. Go to Admin Dashboard
3. Click "Contact Inquiries" in the sidebar
4. View all submissions with search and filter options

## Troubleshooting

### Emails Still Not Sending

1. **Check Edge Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → `send-contact-email`
   - Click "Logs" to see error messages
   - Look for "RESEND_API_KEY not configured" or API errors

2. **Verify Secret is Set**:
   ```bash
   supabase secrets list
   ```
   Should show `RESEND_API_KEY`

3. **Test Resend API Directly**:
   - Check Resend dashboard for API usage and errors
   - Verify your API key is active

4. **Check Email Domain**:
   - If using custom domain, ensure DNS records are verified
   - For testing, use Resend's default domain

### Function Not Found (404 Error)

- Make sure the function is deployed: `supabase functions deploy send-contact-email`
- Check the function name matches exactly: `send-contact-email`
- Verify the URL is correct in your Supabase project

### Database Errors

- Ensure the `contact_messages` table exists (run migration if needed)
- Check RLS policies allow the service role to insert

## Current Status

✅ Contact form saves to database  
✅ Admin page created to view inquiries  
⚠️ Email sending requires Resend API key configuration  
⚠️ Edge Function needs to be deployed

## Next Steps

1. Deploy the Edge Function
2. Set up Resend API key
3. Test email delivery
4. Use Admin Dashboard as fallback to view inquiries

