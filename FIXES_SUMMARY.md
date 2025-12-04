# Detailed Summary of Fixes Applied for Assignment Submission Issues

## Problem Statement
- Teachers cannot see submitted assignments in the "Assignment Submissions" modal
- Submitted assignments show "In Progress" status instead of "Submitted"
- Students can still edit assignments after submission
- Essays are not visible to teachers when viewing submissions
- 400 errors when querying assignments table

---

## Changes Made

### 1. Fixed Assignments Query Error (400 Status)
**File:** `src/pages/institution/TeacherDashboard.tsx`
**Line:** ~163-165

**Problem:** 
- Query was trying to select `status` field from `assignments` table
- The `assignments` table does NOT have a `status` field
- This caused 400 errors: `assignments?select=id%2Cstatus`

**Fix:**
```typescript
// BEFORE (BROKEN):
.select('id, status')

// AFTER (FIXED):
.select('id')
.eq('is_active', true)
```

**What this does:** Only selects the `id` field and filters for active assignments.

---

### 2. Improved get_user_emails RPC Error Handling
**File:** `src/pages/institution/TeacherDashboard.tsx`
**Line:** ~124-143

**Problem:**
- RPC function `get_user_emails` was failing with 400 errors
- Errors were not being handled gracefully

**Fix:**
- Added try-catch block around RPC call
- Changed error logging to be non-critical (emails are optional for display)
- Added check for `userEmails` existence before processing

**What this does:** Prevents crashes when email fetching fails, since emails are optional.

---

### 3. Added Navigation Hook to AssignmentManager
**File:** `src/components/institution/AssignmentManager.tsx`
**Line:** ~1-2, ~114

**Changes:**
```typescript
// Added import:
import { useNavigate } from 'react-router-dom';

// Added hook:
const navigate = useNavigate();
```

**What this does:** Enables programmatic navigation to essay review pages.

---

### 4. Fixed "View Essay" Button Navigation
**File:** `src/components/institution/AssignmentManager.tsx`
**Line:** ~1730-1757

**Problem:**
- Button used `window.open()` which doesn't work well with React Router
- Could fail if essay data wasn't loaded in the modal

**Fix:**
```typescript
// BEFORE:
window.open(`/institution/review-essay/${submission.essay.id}`, '_blank');

// AFTER:
navigate(`/institution/review-essay/${submission.essay_id}`);
```

**What this does:** Uses React Router navigation which handles RLS and loading properly.

---

### 5. Improved Essay Fetching in AssignmentManager
**File:** `src/components/institution/AssignmentManager.tsx`
**Line:** ~715-736

**Changes:**
- Removed toast notification when essays can't be fetched (RLS might block)
- Added console warnings instead
- Changed error handling to be non-blocking

**What this does:** Submissions still show even if essay text can't be loaded (teachers can click "View Essay" to see it).

---

### 6. Updated ReviewAssignmentEssay to Fetch More Fields
**File:** `src/pages/institution/ReviewAssignmentEssay.tsx`
**Line:** ~108-114

**Problem:**
- Essay query wasn't fetching `institution_id` and `institution_member_id`
- RLS policies need these fields to match

**Fix:**
```typescript
// BEFORE:
.select('id, essay_text, exam_type, topic, ai_score, ai_feedback')

// AFTER:
.select('id, essay_text, exam_type, topic, ai_score, ai_feedback, institution_id, institution_member_id, user_id')
```

**What this does:** Ensures RLS policies can properly match the essay to the teacher's institution.

---

### 7. Created RLS Policy Migration for Assignment Essays
**File:** `supabase/migrations/20251202000003_fix_essay_rls_for_assignments.sql`

**What it does:**
- Creates a new RLS policy: "Teachers can view assignment essays via submissions"
- Allows teachers to view essays that are linked to `assignment_submissions` in their institution
- Works even if the essay's `institution_id` is not set correctly
- Also ensures the existing "Teachers can view essays in their institution" policy exists

**Policy Logic:**
```sql
-- Teacher can see essay if:
-- 1. Essay is linked to an assignment_submission
-- 2. That submission belongs to an assignment
-- 3. That assignment belongs to teacher's institution
-- 4. Teacher is an active member of that institution
```

---

### 8. Previous Migration (Status Fix)
**File:** `supabase/migrations/20251202000002_fix_assignment_submissions.sql`

**What it does:**
- Adds CHECK constraint for valid status values
- Updates existing submissions with `essay_id` and `submitted_at` to have status 'submitted'
- Creates trigger to prevent status changes after submission

---

## Files Modified

1. `src/pages/institution/TeacherDashboard.tsx`
   - Fixed assignments query (removed non-existent `status` field)
   - Improved `get_user_emails` error handling

2. `src/components/institution/AssignmentManager.tsx`
   - Added `useNavigate` import and hook
   - Fixed "View Essay" button to use `navigate()` instead of `window.open()`
   - Improved essay fetching error handling

3. `src/pages/institution/ReviewAssignmentEssay.tsx`
   - Updated essay query to include `institution_id`, `institution_member_id`, `user_id`

4. `supabase/migrations/20251202000003_fix_essay_rls_for_assignments.sql` (NEW)
   - Creates RLS policy for teachers to view assignment essays

---

## Database Migrations That Need to Be Run

### Migration 1: `20251202000002_fix_assignment_submissions.sql`
- Fixes existing submission statuses
- Adds constraints and triggers

### Migration 2: `20251202000003_fix_essay_rls_for_assignments.sql` (NEW)
- Adds RLS policy so teachers can view assignment essays
- **THIS IS CRITICAL** - Without this, teachers cannot see essays even if submissions exist

---

## How to Verify Fixes

### 1. Check Browser Console
- Should NOT see 400 errors for `assignments?select=id%2Cstatus`
- Should NOT see 400 errors for `get_user_emails` (or they should be logged as non-critical)

### 2. Check Assignment Submissions Modal
- Open an assignment that has submissions
- Click "View Submissions" button
- Should see ALL assigned students (not just those who submitted)
- Status should show "Submitted" if `essay_id` and `submitted_at` exist

### 3. Check Essay Visibility
- In submissions modal, click "View Essay" button
- Should navigate to review page
- Essay should load (if RLS migration was run)

### 4. Check Database
Run this query in Supabase SQL Editor:
```sql
-- Check if RLS policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'essays' 
AND policyname = 'Teachers can view assignment essays via submissions';
```

Should return 1 row.

---

## Potential Remaining Issues

### 1. Migration Not Run
- If `20251202000003_fix_essay_rls_for_assignments.sql` hasn't been run, teachers still can't see essays
- **Solution:** Run the migration in Supabase SQL Editor

### 2. Essay institution_id Not Set
- If essays don't have `institution_id` set, the new RLS policy should still work (via assignment_submissions)
- But the existing "Teachers can view essays in their institution" policy won't work

### 3. Assignment Not Linked Properly
- Check that `assignment_submissions.essay_id` is correctly set
- Check that `assignment_submissions.assignment_id` links to correct assignment
- Check that `assignments.institution_id` matches teacher's institution

### 4. RLS Policy Conflicts
- Multiple RLS policies use OR logic (if any policy allows, access is granted)
- But if ALL policies deny, access is blocked
- Check that teacher's `institution_members` record has `status = 'active'` and `role IN ('teacher', 'inst_admin')`

---

## Debugging Steps

### Step 1: Check Submissions Exist
```sql
SELECT * FROM assignment_submissions 
WHERE assignment_id = 'YOUR_ASSIGNMENT_ID';
```

### Step 2: Check Essay Links
```sql
SELECT asub.*, e.id as essay_exists, e.institution_id 
FROM assignment_submissions asub
LEFT JOIN essays e ON e.id = asub.essay_id
WHERE asub.assignment_id = 'YOUR_ASSIGNMENT_ID';
```

### Step 3: Check Teacher Access
```sql
-- Check teacher's institution membership
SELECT * FROM institution_members 
WHERE user_id = 'TEACHER_USER_ID' 
AND status = 'active' 
AND role IN ('teacher', 'inst_admin');

-- Check assignment's institution
SELECT id, institution_id FROM assignments 
WHERE id = 'YOUR_ASSIGNMENT_ID';
```

### Step 4: Test RLS Policy
```sql
-- Run as the teacher user (use Supabase Auth to switch users)
SELECT * FROM essays 
WHERE id IN (
  SELECT essay_id FROM assignment_submissions 
  WHERE assignment_id = 'YOUR_ASSIGNMENT_ID'
);
```

---

## Next Steps If Still Not Working

1. **Check if migrations were run:**
   - Go to Supabase Dashboard → SQL Editor
   - Check if migration `20251202000003_fix_essay_rls_for_assignments.sql` was executed
   - If not, run it manually

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for specific error messages
   - Check Network tab for failed requests

3. **Check database directly:**
   - Verify `assignment_submissions` has correct `essay_id`
   - Verify `essays` table has the essay
   - Verify `assignments.institution_id` matches teacher's institution

4. **Test RLS policies:**
   - Use Supabase SQL Editor
   - Switch to teacher's user context
   - Try querying essays directly

5. **Check assignment submission creation:**
   - Verify that when student submits, `essay_id` is correctly set
   - Verify that `submitted_at` timestamp is set
   - Verify that `status` is updated to 'submitted'

---

## Contact Points for Further Help

When asking for help, provide:
1. **Browser console errors** (screenshot or copy-paste)
2. **Network tab errors** (failed requests with status codes)
3. **Database query results** (from the debugging steps above)
4. **Specific behavior** (what happens vs. what should happen)
5. **Migration status** (which migrations have been run)

