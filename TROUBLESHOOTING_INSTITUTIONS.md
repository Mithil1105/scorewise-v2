# Troubleshooting: Institution Dashboards Not Showing

## Problem
After adding a user to an institution with a teacher/student role, the dashboards don't appear.

## Solutions

### Solution 1: Refresh the Page (Easiest)
After adding a user to an institution:
1. **The user needs to refresh their browser page** (F5 or Ctrl+R)
2. The InstitutionContext will reload and detect the new membership
3. The dashboard links should appear in the user menu

### Solution 2: Log Out and Log Back In
1. User logs out
2. User logs back in
3. InstitutionContext will fetch fresh membership data
4. Dashboards will appear

### Solution 3: Check Membership Status
1. Go to **Profile** page (`/profile`)
2. Check "Current Institution" section
3. If it shows "Not affiliated", the membership might not be active
4. As admin, check in **Institutions Manager** → **Manage Members** that the user's status is "active"

### Solution 4: Verify Role Assignment
1. As admin, go to **User Manager** (`/admin/users`)
2. Click the **Building icon** (🏢) next to the user
3. Select the institution
4. Make sure the role is set correctly:
   - **Teacher** → Will see Teacher Dashboard
   - **Student** → Will see Student Dashboard
   - **Institution Admin** → Will see both Admin Panel and Teacher Dashboard

### Solution 5: Check Active Membership
1. User goes to **Profile** page
2. If they have multiple institutions, they need to **select which one is active**
3. The dashboards only show for the **active institution**

## What I Fixed

1. ✅ **UserManager now updates existing memberships** - If a user is already in an institution, it will update their role instead of showing an error
2. ✅ **InstitutionContext auto-selects first membership** - If a user has memberships but none is active, it will automatically select the first one
3. ✅ **Better error messages** - More helpful error messages when adding users

## Step-by-Step: Adding Hasti as Teacher

1. **As Platform Admin:**
   - Go to **User Manager** (`/admin/users`)
   - Find "Hasti Vakani"
   - Click the **Building icon** (🏢) in Actions column
   - Select institution "CME" (or create one first)
   - Select role: **Teacher**
   - Click "Add to Institution"

2. **As Hasti:**
   - **Refresh the page** (F5)
   - Or log out and log back in
   - Check user menu (avatar in top right)
   - Should see "Teacher Dashboard" link
   - Click it to go to `/institution/teacher`

## Still Not Working?

1. **Check browser console** for errors (F12)
2. **Check Supabase database:**
   - `institution_members` table
   - Verify `user_id`, `institution_id`, `role`, and `status = 'active'`
3. **Clear browser cache** and try again
4. **Check if institution is active:**
   - In Institutions Manager, make sure the institution's status is "Active"

