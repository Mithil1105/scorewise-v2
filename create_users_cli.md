# Alternative: Create Users via Supabase CLI

If the SQL approach fails due to permissions, use this method:

## Step 1: Install Supabase CLI (if not already installed)
```powershell
npm install -g supabase
```

## Step 2: Login to Supabase
```powershell
supabase login
```

## Step 3: Link to your project
```powershell
supabase link --project-ref enigcyvybtbmqovnjbfq
```

## Step 4: Create users using Supabase CLI
You'll need to use the Supabase Management API or create a simple script.

Actually, the easiest way is to use the Supabase Dashboard:
1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password for each user
4. Make sure "Auto Confirm User" is checked

Then run the SQL to assign roles (the second part of the SQL file).

