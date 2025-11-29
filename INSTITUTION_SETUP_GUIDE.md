# Institution Setup Guide

## How to Make Teacher/Student Dashboards Visible

The teacher and student dashboards only appear when users are members of an institution. Here's how to set it up:

### Step 1: Create an Institution (Platform Admin Only)

1. Log in as a **platform admin** (`admin@sw.com` or your admin account)
2. Go to **Admin Panel** → **Institutions Manager** (`/admin/institutions`)
3. Click **"Create Institution"**
4. Enter institution name (e.g., "Test Academy")
5. Select a plan (Free, Starter, Pro, Enterprise)
6. Click **"Create"**
7. Note the **Institution Code** (e.g., `SW-XXXX-YYYY`)

### Step 2: Add Users to the Institution

1. In the Institutions Manager, find your institution
2. Click the **Users icon** (👥) or **"Manage Members"** button
3. In the dialog, go to **"Add Member"** tab
4. Search and select a user
5. Choose their role:
   - **Student** → Will see Student Dashboard
   - **Teacher** → Will see Teacher Dashboard  
   - **Institution Admin** → Will see Institution Admin Panel + Teacher Dashboard
6. Click **"Add Member"**

### Step 3: Users Will See Dashboards

Once users are added to an institution with appropriate roles:

- **Teachers/Institution Admins** will see:
  - "Teacher Dashboard" link in their user menu dropdown
  - Access to `/institution/teacher` route

- **Students** will see:
  - "Student Dashboard" link in their user menu dropdown
  - Access to `/institution/student` route

- **Institution Admins** will also see:
  - "Institution Admin" link
  - Access to `/institution/admin` route

### Quick Test Setup

To quickly test the dashboards:

1. **As Platform Admin:**
   - Create institution "Test Academy"
   - Add `teacher@sw.com` as **Teacher**
   - Add `student@sw.com` as **Student**
   - Add `cme@sw.com` as **Institution Admin**

2. **Log in as each user:**
   - `teacher@sw.com` → Should see "Teacher Dashboard" in menu
   - `student@sw.com` → Should see "Student Dashboard" in menu
   - `cme@sw.com` → Should see both "Institution Admin" and "Teacher Dashboard"

### Alternative: Users Can Join via Code

Users can also join institutions themselves:

1. User goes to **Profile** page (`/profile`)
2. Clicks **"Join Institution"**
3. Enters the institution code
4. Institution admin approves the request
5. User then sees the appropriate dashboard

---

## Current Status

✅ **Dashboards exist and work:**
- `/institution/teacher` - Teacher Dashboard
- `/institution/student` - Student Dashboard  
- `/institution/admin` - Institution Admin Panel

✅ **Admin panel can create institutions:**
- `/admin/institutions` - Institutions Manager

❌ **Dashboards only show when:**
- User has an active institution membership
- User has the correct role (teacher/student/inst_admin)

---

## Troubleshooting

**Q: I don't see "Teacher Dashboard" in my menu**
- Check if you're a member of an institution
- Check if your role is "teacher" or "inst_admin"
- Check if your membership status is "active" (not "pending")

**Q: How do I check my institution membership?**
- Go to `/profile` page
- Look at "Current Institution" section
- If it says "Not affiliated", you need to join/create an institution

**Q: How do I assign roles to users?**
- As Platform Admin: Go to `/admin/institutions` → Manage Members
- As Institution Admin: Go to `/institution/admin` → Members tab

