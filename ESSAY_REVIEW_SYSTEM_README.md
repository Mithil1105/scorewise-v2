# Essay Review & Correction System

## Overview

A simple, robust essay review system that allows teachers to make direct text corrections with visual feedback for students. Designed for non-technical users in coaching centers.

## Features

✅ **Direct Text Editing**: Teachers can select text and add corrections directly
✅ **Visual Corrections**: Students see removed text (red strikethrough) and added text (green)
✅ **Teacher Comments**: Optional comments explaining each change
✅ **Final Published Version**: Teachers can publish a clean corrected version
✅ **Toggle View**: Students can switch between clean and corrections view
✅ **Multiple Teachers**: Multiple teachers can review the same essay
✅ **Original Preserved**: Student's original essay is never overwritten

## Database Schema

### New Tables

#### `essay_edits`
Stores atomic teacher edits:
- `id`: UUID primary key
- `essay_id`: References essays table
- `start_index`: Character index where change begins
- `end_index`: Character index (exclusive) where text is removed
- `new_text`: Teacher's replacement/inserted text
- `comment`: Optional explanation
- `created_by`: Teacher's user ID
- `created_at`: Timestamp

#### New Column in `essays`
- `finalized_teacher_text`: Final corrected essay (clean, no markup)

## Migration

Run the migration file:
```sql
supabase/migrations/20251201000000_add_essay_review_system.sql
```

This creates:
- `essay_edits` table
- `finalized_teacher_text` column
- RLS policies for security

## How It Works

### For Teachers

1. **Open Review Page**: Navigate to `/institution/review-essay/:essayId`
2. **Select Text**: Click and drag to select text in the essay
3. **Add Correction**: 
   - Popover appears with selected text pre-filled
   - Enter replacement text
   - Optionally add a comment
   - Click "Save Change"
4. **Edit Existing Corrections**: Click on green/red text to edit or delete
5. **Publish Final Version**: Click "Publish Final Version" to create clean corrected essay

### For Students

1. **View Reviewed Essay**: Navigate to `/institution/view-reviewed-essay/:essayId`
2. **Toggle Corrections**: Use the switch to show/hide corrections
3. **View Comments**: Hover or tap the ℹ️ icon to see teacher comments
4. **Clean View**: By default, see the finalized corrected version (if published)

## File Structure

```
src/
├── hooks/
│   └── useEssayReview.ts          # Data access layer
├── utils/
│   └── essayReview.ts              # Utility functions (applyEditsToText, renderTextWithCorrections)
├── components/
│   └── essay/
│       └── EditableEssayText.tsx   # Teacher's editable essay component
└── pages/
    └── institution/
        ├── ReviewAssignmentEssayNew.tsx  # Teacher review page
        └── ViewReviewedEssayNew.tsx      # Student view page
```

## Key Functions

### `applyEditsToText(originalText, edits)`
Applies all edits to original text to compute final corrected essay.
- Sorts edits by start_index descending
- Applies from end to beginning to avoid index shifts
- Returns plain text

### `renderTextWithCorrections(originalText, edits)`
Renders HTML with visual corrections:
- Red strikethrough for removed text
- Green text for added text
- Info icon with tooltip for comments

### `useEssayReview()` Hook
Provides:
- `fetchEssayWithEdits(essayId)`: Load essay with all edits
- `addEssayEdit(params)`: Add new correction
- `updateEssayEdit(editId, updates)`: Update existing correction
- `deleteEssayEdit(editId)`: Delete correction
- `publishFinalEssay(essayId)`: Publish final version

## RLS Policies

### Students
- Can SELECT essays they submitted
- Can SELECT essay_edits for their essays
- Cannot INSERT/UPDATE/DELETE essay_edits

### Teachers
- Can SELECT essays in their institution
- Can INSERT/UPDATE/DELETE essay_edits for institution essays
- Can UPDATE finalized_teacher_text for institution essays

## UI/UX Features

- **Large, clear buttons**: Easy to click
- **Simple English labels**: No technical jargon
- **Mobile-friendly**: Works on all devices
- **Visual feedback**: Immediate updates after saving
- **Error handling**: Clear error messages with toasts
- **Loading states**: Shows spinners during operations

## Testing Checklist

- [ ] Run migration successfully
- [ ] Teacher can select text and add correction
- [ ] Teacher can edit existing correction
- [ ] Teacher can delete correction
- [ ] Teacher can publish final version
- [ ] Student sees clean version by default (if published)
- [ ] Student can toggle corrections view
- [ ] Student sees red strikethrough for removed text
- [ ] Student sees green text for added text
- [ ] Student can see teacher comments (hover/tap)
- [ ] Multiple teachers can edit same essay
- [ ] Original essay text is never overwritten

## Troubleshooting

### Migration fails
- Check if `essays` table exists
- Verify RLS is enabled on tables
- Check for conflicting policies

### Teacher can't save edits
- Verify teacher is in institution_members with role 'teacher' or 'inst_admin'
- Check RLS policies allow INSERT on essay_edits
- Verify essay has institution_id set

### Student can't see corrections
- Check essay_edits exist for the essay
- Verify student owns the essay (user_id matches)
- Check RLS policies allow SELECT on essay_edits

### Corrections not displaying correctly
- Check that `renderTextWithCorrections` is being called
- Verify edits are sorted correctly
- Check browser console for errors

## Future Enhancements

- Version history for edits
- Undo/redo functionality
- Batch operations (apply multiple edits at once)
- Export corrected essay as PDF
- Email notifications when essay is reviewed

