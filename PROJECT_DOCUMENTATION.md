# ScoreWise v2 - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Core Features](#core-features)
7. [Institution System](#institution-system)
8. [Essay Management](#essay-management)
9. [Vocabulary System](#vocabulary-system)
10. [Admin Features](#admin-features)
11. [Recent Updates & Fixes](#recent-updates--fixes)
12. [Deployment](#deployment)

---

## Project Overview

**ScoreWise v2** is a comprehensive educational platform designed for GRE and IELTS exam preparation. The platform provides essay writing practice, vocabulary learning, typing exercises, and institutional management features for coaching centers and educational institutions.

### Key Capabilities
- **Essay Writing & Review**: AI-powered essay scoring, teacher reviews, and detailed feedback
- **Vocabulary Learning**: Interactive vocabulary system with 497 words from Verbalhelp.json
- **Institution Management**: Multi-tenant system for coaching centers with role-based access
- **Assignment System**: Teachers can create assignments, students submit essays, and receive grades
- **IELTS Support**: Task 1 and Task 2 essay practice with image support
- **Admin Dashboard**: Comprehensive platform administration tools

---

## Technology Stack

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server
- **React Router 6.30.1** - Client-side routing
- **TanStack Query 5.83.0** - Data fetching and caching
- **Tailwind CSS 3.4.17** - Styling
- **shadcn/ui** - Component library (Radix UI primitives)
- **Lucide React** - Icons
- **react-easy-crop 5.5.6** - Image cropping functionality

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Row Level Security (RLS)
  - Storage buckets for file uploads
  - Authentication (email/password, Google OAuth)
  - Real-time subscriptions

### Additional Libraries
- **date-fns 3.6.0** - Date formatting
- **react-hook-form 7.61.1** - Form management
- **zod 3.25.76** - Schema validation
- **recharts 2.15.4** - Data visualization
- **docx 9.5.1** - Document generation
- **file-saver 2.0.5** - File downloads

---

## Project Structure

```
scorewise-final-main/
├── public/
│   ├── Verbalhelp.json          # Vocabulary data (497 words)
│   └── robots.txt
│
├── src/
│   ├── components/              # Reusable React components
│   │   ├── admin/              # Admin-specific components
│   │   │   ├── AdminLayout.tsx
│   │   │   └── AdminSidebar.tsx
│   │   ├── essay/              # Essay-related components
│   │   │   ├── AIScorePanel.tsx
│   │   │   ├── EssayStats.tsx
│   │   │   ├── EssayViewer.tsx
│   │   │   ├── PeerFeedbackPanel.tsx
│   │   │   ├── SaveStatus.tsx
│   │   │   ├── SimpleEssayReview.tsx
│   │   │   ├── SubmitSuccessDialog.tsx
│   │   │   ├── Timer.tsx
│   │   │   └── TopicCard.tsx
│   │   ├── institution/        # Institution management components
│   │   │   ├── AssignmentManager.tsx
│   │   │   ├── BatchManager.tsx
│   │   │   ├── CreateInstitutionModal.tsx
│   │   │   ├── InstitutionBranding.tsx
│   │   │   ├── JoinInstitutionModal.tsx
│   │   │   └── StudentAssignments.tsx
│   │   ├── layout/             # Layout components
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── PageLayout.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── routing/            # Route protection components
│   │   │   ├── DashboardRedirect.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── ui/                 # shadcn/ui components (30+ components)
│   │   └── vocab/              # Vocabulary components
│   │       └── VocabCard.tsx
│   │
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx     # Authentication state management
│   │   └── InstitutionContext.tsx  # Institution state management
│   │
│   ├── data/                   # Static data files
│   │   ├── greTopics.ts
│   │   ├── ieltsTask1.ts
│   │   ├── ieltsTask2.ts
│   │   ├── typingPassages.ts
│   │   └── vocabulary.ts       # Vocabulary data loader
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useAdmin.ts
│   │   ├── useCloudSync.ts
│   │   ├── useEssayCorrections.ts
│   │   ├── useImageUpload.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── integrations/           # Third-party integrations
│   │   └── supabase/
│   │       ├── client.ts       # Supabase client initialization
│   │       └── types.ts        # Generated TypeScript types
│   │
│   ├── lib/                    # Utility libraries
│   │   └── utils.ts            # Common utility functions
│   │
│   ├── pages/                  # Page components (routes)
│   │   ├── admin/             # Admin pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── GRETopics.tsx
│   │   │   ├── IELTSTask1.tsx
│   │   │   ├── IELTSTask2.tsx
│   │   │   ├── EssayAnalytics.tsx
│   │   │   ├── VocabularyManager.tsx
│   │   │   ├── UserManager.tsx
│   │   │   ├── AIControls.tsx
│   │   │   ├── FeedbackManager.tsx
│   │   │   ├── InstitutionsManager.tsx
│   │   │   └── ContactInquiries.tsx
│   │   ├── institution/       # Institution pages
│   │   │   ├── InstitutionAdmin.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── TeacherDashboard.tsx
│   │   │   ├── ReviewAssignmentEssay.tsx
│   │   │   ├── ReviewSharedEssay.tsx
│   │   │   ├── ViewReviewedEssay.tsx
│   │   │   ├── GradingPage.tsx
│   │   │   └── CombinedAssignment.tsx
│   │   ├── legal/             # Legal pages
│   │   │   ├── contact.tsx
│   │   │   ├── ContactForm.tsx
│   │   │   ├── cookies.tsx
│   │   │   ├── disclaimer.tsx
│   │   │   ├── FAQs.tsx
│   │   │   ├── privacy.tsx
│   │   │   └── terms.tsx
│   │   ├── Auth.tsx           # Authentication page
│   │   ├── Drafts.tsx         # Essay drafts
│   │   ├── Essay.tsx         # Main essay writing page
│   │   ├── IELTSHome.tsx
│   │   ├── IELTSTask1.tsx
│   │   ├── IELTSTask2.tsx
│   │   ├── Index.tsx         # Home page
│   │   ├── Profile.tsx       # User profile
│   │   ├── ReviewEssay.tsx   # Public essay review
│   │   ├── Typing.tsx        # Typing practice
│   │   ├── Vocabulary.tsx    # Vocabulary list page
│   │   ├── NotFound.tsx     # 404 page
│   │   └── AccessDenied.tsx # Access denied page
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── essay.ts
│   │
│   ├── utils/                 # Utility functions
│   │   ├── essayCorrections.ts
│   │   ├── essayReview.ts
│   │   ├── exportEssay.ts
│   │   ├── exportFeedback.ts
│   │   ├── exportIELTS.ts
│   │   └── storageUsage.ts
│   │
│   ├── App.tsx                # Main app component with routing
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
│
├── supabase/
│   └── migrations/           # Database migrations (27 files)
│       ├── 20251127125058_*.sql  # Initial schema
│       ├── 20251129035423_*.sql  # Institutions system
│       ├── 20251129041520_*.sql  # Assignments & batches
│       ├── 20251201000001_*.sql  # Essay corrections
│       └── ... (24 more migrations)
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Database Schema

### Core Tables

#### `essays`
Stores all essay submissions from users.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users)
- `institution_id` (UUID, Foreign Key → institutions, nullable)
- `institution_member_id` (UUID, Foreign Key → institution_members, nullable)
- `exam_type` (TEXT) - 'GRE', 'IELTS Task 1', 'IELTS Task 2'
- `topic` (TEXT)
- `essay_text` (TEXT) - Current essay content
- `original_essay_text` (TEXT) - Original student submission (never modified)
- `teacher_edited_essay_text` (TEXT) - Teacher's corrected version
- `word_count` (INTEGER)
- `ai_score` (INTEGER) - AI-generated score (0-6)
- `ai_feedback` (TEXT) - AI-generated feedback
- `shared_with_teacher` (BOOLEAN) - Whether student shared essay for review
- `created_at`, `updated_at` (TIMESTAMP)

#### `institutions`
Stores educational institutions/coaching centers.
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `code` (TEXT, Unique) - Join code format: SW-XXXX-XXXX
- `owner_user_id` (UUID, Foreign Key → auth.users)
- `logo_url` (TEXT, nullable) - URL to institution logo
- `theme_color` (TEXT, nullable) - Hex color code
- `plan` (TEXT) - 'free', 'premium', etc.
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

#### `institution_members`
Junction table for institution membership.
- `id` (UUID, Primary Key)
- `institution_id` (UUID, Foreign Key → institutions)
- `user_id` (UUID, Foreign Key → auth.users)
- `role` (TEXT) - 'student', 'teacher', 'inst_admin'
- `status` (TEXT) - 'active', 'pending', 'blocked'
- `created_at` (TIMESTAMP)
- Unique constraint on (institution_id, user_id)

#### `assignments`
Stores assignments created by teachers.
- `id` (UUID, Primary Key)
- `institution_id` (UUID, Foreign Key → institutions)
- `batch_id` (UUID, Foreign Key → batches, nullable)
- `created_by` (UUID, Foreign Key → auth.users)
- `title` (TEXT)
- `topic` (TEXT)
- `exam_type` (TEXT) - 'GRE', 'IELTS Task 1', 'IELTS Task 2'
- `instructions` (TEXT, nullable)
- `due_date` (TIMESTAMP, nullable)
- `max_word_count`, `min_word_count` (INTEGER, nullable)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

#### `assignment_submissions`
Stores student submissions for assignments.
- `id` (UUID, Primary Key)
- `assignment_id` (UUID, Foreign Key → assignments)
- `essay_id` (UUID, Foreign Key → essays)
- `student_id` (UUID, Foreign Key → institution_members)
- `score` (INTEGER, nullable) - Teacher-assigned score
- `feedback` (TEXT, nullable) - Teacher feedback
- `reviewed_at` (TIMESTAMP, nullable)
- `reviewed_by` (UUID, Foreign Key → auth.users, nullable)
- `created_at`, `updated_at` (TIMESTAMP)

#### `shared_essay_reviews`
Stores reviews for essays shared by students (not assignments).
- `id` (UUID, Primary Key)
- `essay_id` (UUID, Foreign Key → essays)
- `reviewed_by` (UUID, Foreign Key → auth.users)
- `score` (INTEGER, nullable)
- `feedback` (TEXT, nullable)
- `reviewed_at` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

#### `essay_corrections`
Stores teacher corrections for essays (yellow highlights system).
- `id` (UUID, Primary Key)
- `essay_id` (UUID, Foreign Key → essays)
- `original_text` (TEXT) - Text to be corrected
- `corrected_text` (TEXT) - Teacher's correction
- `start_index` (INTEGER) - Character position in essay
- `end_index` (INTEGER) - End character position
- `teacher_note` (TEXT, nullable) - Optional advice
- `created_by` (UUID, Foreign Key → auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

#### `batches`
Stores class/batch groups within institutions.
- `id` (UUID, Primary Key)
- `institution_id` (UUID, Foreign Key → institutions)
- `name` (TEXT)
- `description` (TEXT, nullable)
- `created_by` (UUID, Foreign Key → auth.users)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

#### `batch_members`
Junction table for batch membership.
- `id` (UUID, Primary Key)
- `batch_id` (UUID, Foreign Key → batches)
- `member_id` (UUID, Foreign Key → institution_members)
- `added_at` (TIMESTAMP)
- Unique constraint on (batch_id, member_id)

#### `profiles`
User profile information.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Unique, Foreign Key → auth.users)
- `display_name` (TEXT, nullable)
- `avatar_url` (TEXT, nullable)
- `created_at`, `updated_at` (TIMESTAMP)

#### `user_roles`
Platform-level roles (admin, moderator, user).
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users)
- `role` (app_role ENUM) - 'admin', 'moderator', 'user'
- `created_at` (TIMESTAMP)
- Unique constraint on (user_id, role)

#### `gre_topics`
Stores GRE essay topics.
- `id` (UUID, Primary Key)
- `topic` (TEXT, Unique)
- `created_at`, `updated_at` (TIMESTAMP)

#### `task1_images`
Stores images for IELTS Task 1 essays.
- `id` (UUID, Primary Key)
- `essay_id` (UUID, Foreign Key → essays, nullable)
- `user_id` (UUID, Foreign Key → auth.users)
- `image_base64` (TEXT, nullable) - Base64 encoded image
- `image_type` (TEXT, nullable)
- `storage_path` (TEXT, nullable) - Supabase storage path
- `created_at` (TIMESTAMP)

#### `contact_messages`
Stores contact form submissions.
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `email` (TEXT)
- `subject` (TEXT)
- `message` (TEXT)
- `created_at` (TIMESTAMP)

### Storage Buckets

#### `institution-logos`
Stores institution logo images.
- Public access for reading
- Upload restricted to authenticated users
- Files named: `{institution_id}-logo-{timestamp}.{ext}`

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- **Users**: Can access their own data
- **Institution Admins**: Can manage their institution
- **Teachers**: Can view/update essays and assignments in their institution
- **Students**: Can view their own submissions and reviews
- **Platform Admins**: Full access to all data

---

## Authentication & Authorization

### Authentication Methods
1. **Email/Password**: Traditional sign-up and sign-in
2. **Google OAuth**: Social authentication via Supabase Auth

### User Roles

#### Platform Roles (stored in `user_roles`)
- **admin**: Full platform access, can manage all institutions, users, and content
- **moderator**: Limited admin access (future use)
- **user**: Standard user (default)

#### Institution Roles (stored in `institution_members`)
- **inst_admin**: Institution administrator
  - Can manage institution settings (name, logo, theme color)
  - Can create/edit/delete assignments
  - Can manage batches and members
  - Can review all student essays
  - Can view all student grades and profiles
- **teacher**: Teacher/Instructor
  - Can create assignments for their batches
  - Can review student essays (assignments and shared essays)
  - Can grade submissions
  - Can view student profiles and grades
- **student**: Student
  - Can view and submit assignments
  - Can write and share essays
  - Can view their own grades and feedback
  - Can view reviewed essays

### Context Providers

#### `AuthContext`
- Manages user authentication state
- Provides: `user`, `session`, `profile`, `loading`
- Methods: `signUp`, `signIn`, `signInWithGoogle`, `signOut`, `updatePassword`
- Tracks online/offline status

#### `InstitutionContext`
- Manages institution membership state
- Provides: `memberships`, `activeMembership`, `activeInstitution`
- Methods: `setActiveMembership`, `refreshMemberships`, `createInstitution`, `joinInstitution`
- Auto-refreshes on membership changes

### Route Protection

#### `ProtectedRoute`
- Wraps routes that require authentication
- Redirects to `/auth` if not logged in
- Shows loading state during auth check

#### `DashboardRedirect`
- Automatically routes users to appropriate dashboard:
  - Platform admins → `/admin`
  - Institution admins → `/institution/admin`
  - Teachers → `/institution/teacher`
  - Students → `/institution/student`
  - Regular users → `/` (home page)

---

## Core Features

### 1. Essay Writing System

#### Essay Types
- **GRE Essays**: Argument and Issue topics
- **IELTS Task 1**: Academic writing (charts, graphs, processes)
- **IELTS Task 2**: Opinion/argumentative essays

#### Features
- **Real-time Word Count**: Updates as user types
- **Timer**: Optional countdown timer for practice
- **Auto-save**: Essays saved to local storage and synced to cloud
- **AI Scoring**: Automatic scoring (0-6 scale) with detailed feedback
- **Draft Management**: Save multiple drafts, load previous versions
- **Export Options**: Download as Word document (.docx)
- **Image Support**: For IELTS Task 1 (upload and embed images)

#### Essay Review Flow
1. Student writes essay
2. Student can request AI feedback
3. Student can share essay with teacher (if in institution)
4. Teacher reviews and adds corrections (yellow highlights)
5. Teacher can grade and provide feedback
6. Student views reviewed essay with corrections toggle

### 2. Vocabulary System

#### Data Source
- **File**: `public/Verbalhelp.json`
- **Total Words**: 497 words
- **Structure**: 5 lists (List1-List5), each containing multiple words

#### Word Structure
Each word includes:
- **Word**: The vocabulary word
- **Type**: Part of speech (adj, v, n, etc.) - converted to full names
- **Meaning**: Definition
- **Examples**: Up to 4 examples from TV shows:
  - Modern Family
  - Friends
  - Gilmore Girls
  - Big Bang Theory

#### Features
- **Vocabulary List Page** (`/vocabulary`):
  - Filter by alphabet (A-Z)
  - Search functionality
  - Clickable cards showing word preview
  - Displays first example and count of additional examples
- **Word Detail Page** (`/vocabulary/word/:wordId`):
  - Full-screen word view
  - Displays word, part of speech, meaning, and all examples
  - Next/Previous navigation buttons
  - Keyboard navigation (Arrow Left/Right)
  - Auto-advance to next alphabet when reaching letter boundary
  - Shows current position (e.g., "5 / 497") with current letter
  - Preserves filter context (navigates within filtered list)

#### Navigation Logic
- When at end of current alphabet → automatically moves to next alphabet
- When at start of current alphabet → automatically moves to previous alphabet
- Keyboard arrows work seamlessly across all words
- Navigation respects current filter (letter or search results)

### 3. Typing Practice

- Pre-loaded passages for typing practice
- Word-per-minute (WPM) calculation
- Accuracy tracking
- Multiple difficulty levels

### 4. IELTS Support

#### Task 1
- Image upload and embedding
- Support for charts, graphs, maps, and processes
- Word count tracking
- Export functionality

#### Task 2
- Opinion and argumentative essay prompts
- Timer support
- AI feedback
- Teacher review integration

---

## Institution System

### Institution Creation
- Any authenticated user can create an institution
- Auto-generates unique join code (format: `SW-XXXX-XXXX`)
- Creator automatically becomes `inst_admin`
- Can set institution name, upload logo, and choose theme color

### Institution Branding
- **Logo Upload**:
  - Circular image cropper modal
  - Supports drag, zoom, and reposition
  - Crops to 200x200px circle
  - Stores in `institution-logos` bucket
  - Unique filenames with timestamps
  - Option to remove logo
- **Theme Color**:
  - Color picker for custom theme
  - Applied to institution-specific UI elements
- **Persistence**:
  - Branding saved to database
  - Persists across page refreshes
  - Applied globally when institution is active

### Batch Management
- Teachers/Admins can create batches (classes)
- Add/remove students from batches
- Assignments can be assigned to specific batches
- Batch filtering in dashboards

### Assignment System

#### Creating Assignments
- **By Teachers/Admins**:
  - Set title, topic, exam type
  - Add instructions
  - Set due date (optional)
  - Set word count limits (optional)
  - Assign to batch or all students
  - Upload images (for IELTS Task 1)

#### Assignment Groups
- Multiple assignments can be grouped together
- Students see grouped assignments in a combined view
- Teachers can review all submissions in one place

#### Student Submission Flow
1. Student views assignment
2. Writes essay in assignment interface
3. Submits essay (creates `assignment_submission`)
4. Essay linked to assignment
5. Teacher receives notification (via dashboard)

#### Teacher Review Flow
1. Teacher views assignment submissions
2. Opens student essay
3. Can add corrections (yellow highlights)
4. Can grade (0-6 scale)
5. Can add written feedback
6. Student sees review in their dashboard

### Shared Essays
- Students can share essays with teachers (outside of assignments)
- Creates entry in `shared_essay_reviews` table
- Teachers can review and provide feedback
- Appears in student's "Teacher Feedback" section

### Student Profiles
- **Access**: Institution admins and teachers can view student profiles
- **Information Displayed**:
  - Student name and email
  - Join date
  - Avatar
  - Statistics: Average score, total submissions, reviewed count, shared essays count
- **Tabs**:
  - Assignment Submissions: All assignment submissions with grades
  - Shared Essays: All shared essays with reviews
  - All Grades: Combined view of all grades
- **Navigation**: Click student name/row in admin/teacher dashboards

---

## Essay Management

### Essay Corrections System

#### Teacher Workflow
1. Open review page (`/institution/review-essay/:essayId`)
2. Select text in essay (click and drag)
3. Popover appears with:
   - Selected text (read-only)
   - Corrected text input (required)
   - Teacher note/advice (optional)
4. Click "Save" → Text highlighted in yellow
5. Click yellow highlight to edit/delete correction

#### Student Workflow
1. Open reviewed essay (`/institution/view-reviewed-essay/:essayId`)
2. Toggle "Show teacher corrections" ON
3. Yellow highlights appear on corrected text
4. Hover/tap highlight to see:
   - Original text (strikethrough)
   - Corrected text (green)
   - Teacher note (if provided)
5. Toggle OFF to see clean essay

#### Technical Implementation
- Corrections stored in `essay_corrections` table
- `renderEssayWithCorrections()` utility applies corrections
- Corrections applied from end to start to avoid index shifting
- Original essay text never modified (preserved in `original_essay_text`)

### AI Scoring
- Integrated AI service for automatic essay scoring
- Returns score (0-6) and detailed feedback
- Feedback includes:
  - Overall assessment
  - Strengths
  - Areas for improvement
  - Specific suggestions

### Essay Export
- Download as Word document (.docx)
- Includes essay text, word count, AI score, and feedback
- Formatted for easy reading

---

## Vocabulary System

### Data Loading
- **File**: `public/Verbalhelp.json`
- **Loader**: `src/data/vocabulary.ts`
- **Async Loading**: Vocabulary loaded on Vocabulary page mount
- **Error Handling**: Graceful handling of missing fields

### Data Transformation
- Converts JSON structure to `VocabWord` interface
- Maps Type abbreviations to full names:
  - "adj" → "adjective"
  - "v" → "verb"
  - "n" → "noun"
  - etc.
- Handles null/undefined values safely
- Capitalizes word and meaning appropriately

### Components

#### `VocabCard`
- Displays word preview
- Shows first example
- Displays count of additional examples
- Clickable → navigates to word detail page
- Hover effects for better UX

#### `Vocabulary` Page
- Main vocabulary list view
- Alphabet filter (A-Z buttons)
- Search functionality
- Loading and error states
- Displays total word count
- Responsive grid layout

#### `WordDetail` Page (Future: to be recreated)
- Full-screen word view
- Large, readable layout
- Displays all word information
- Next/Previous navigation
- Keyboard navigation support
- Position indicator
- Auto-alphabet navigation

### Navigation Features
- **Next/Previous Buttons**: Navigate between words
- **Keyboard Shortcuts**: Arrow Left/Right keys
- **Auto-Alphabet Transition**: Automatically moves to next/previous alphabet
- **Context Preservation**: Maintains filter state during navigation
- **Position Display**: Shows current position (e.g., "Word 5 of 497 - Letter A")

---

## Admin Features

### Platform Admin Dashboard (`/admin`)

#### User Management
- View all users
- Assign roles (admin, moderator, user)
- View user statistics
- Manage user access

#### Institution Management
- View all institutions
- Activate/deactivate institutions
- View institution statistics
- Manage institution plans

#### Content Management
- **GRE Topics**: Add/edit/delete GRE essay topics
- **IELTS Task 1**: Manage Task 1 prompts and images
- **IELTS Task 2**: Manage Task 2 prompts
- **Vocabulary**: Manage vocabulary words (future enhancement)

#### Analytics
- **Essay Analytics**: View platform-wide essay statistics
  - Total essays
  - Average scores
  - Score distribution
  - Essays by exam type
  - Time-based trends

#### AI Controls
- Configure AI scoring settings
- Manage AI feedback templates
- Control AI service usage

#### Feedback Management
- View all AI-generated feedback
- Moderate feedback content
- Manage feedback templates

#### Contact Inquiries
- View contact form submissions
- Respond to user inquiries
- Track inquiry status

### Institution Admin Dashboard (`/institution/admin`)

#### Member Management
- View all institution members
- Add/remove members
- Change member roles
- Activate/block members
- View member statistics

#### Assignment Management
- Create/edit/delete assignments
- View all assignments
- Group assignments
- View assignment statistics
- Manage assignment images

#### Batch Management
- Create/edit/delete batches
- Add/remove students from batches
- View batch statistics

#### Institution Settings
- Update institution name
- Upload/change/remove logo
- Set theme color
- View institution code

#### Student Profiles
- Click any student to view full profile
- View all grades and submissions
- Track student progress

### Teacher Dashboard (`/institution/teacher`)

#### Assignment Management
- Create assignments for assigned batches
- View assignments
- View student submissions

#### Review Management
- Review assignment submissions
- Review shared essays
- Grade and provide feedback
- Add corrections (yellow highlights)

#### Student Management
- View students in assigned batches
- Click student to view profile
- Track student progress

### Student Dashboard (`/institution/student`)

#### Assignments
- View all assigned assignments
- View assignment details
- Submit essays for assignments
- View submission status

#### Teacher Feedback
- View reviewed assignments
- View shared essay reviews
- Toggle corrections view
- See grades and feedback

#### Statistics
- View personal statistics
- Track progress over time
- View average scores

---

## Recent Updates & Fixes

### 1. Assignment Query Fixes (400 Errors)
- **Issue**: Complex nested Supabase joins causing 400 errors
- **Fix**: Separated queries, fetched data independently, merged in memory
- **Files**: `src/components/institution/StudentAssignments.tsx`

### 2. Essay Query Fixes
- **Issue**: Essays not filtering correctly by institution
- **Fix**: Filter by `user_id` first, then filter by institution in memory
- **Files**: `src/pages/institution/StudentDashboard.tsx`

### 3. Shared Essay Reviews Display
- **Issue**: Students couldn't see teacher reviews of shared essays
- **Fix**: Added `shared_essay_reviews` to reviewed assignments fetch
- **Files**: `src/pages/institution/StudentDashboard.tsx`, `src/pages/institution/ViewReviewedEssay.tsx`

### 4. Date Created Column
- **Feature**: Added "Date Created" column to assignments table
- **Format**: "MMM d, yyyy h:mm a" with clock icon
- **Files**: `src/components/institution/AssignmentManager.tsx`

### 5. Institution Branding Persistence
- **Issue**: Logo and theme color not persisting after refresh
- **Fixes**:
  - Created migration for institution admin update permissions
  - Improved state synchronization in `InstitutionBranding.tsx`
  - Enhanced `refreshMemberships` in `InstitutionContext.tsx`
- **Files**: 
  - `supabase/migrations/202502250005_allow_institution_admins_update_branding.sql`
  - `src/components/institution/InstitutionBranding.tsx`
  - `src/contexts/InstitutionContext.tsx`

### 6. Logo Upload/Replacement
- **Issue**: Logo replacement not working, no remove option
- **Fixes**:
  - Always delete old logo before uploading new one
  - Use unique filenames with timestamps
  - Add cache-busting query parameters
  - Add "Remove Logo" button
- **Files**: `src/components/institution/InstitutionBranding.tsx`

### 7. Image Cropper Implementation
- **Feature**: Circular image cropper modal for logo upload
- **Features**:
  - Drag to reposition
  - Zoom slider
  - Real-time preview
  - Crops to perfect circle (200x200px)
- **Files**: 
  - `src/components/institution/LogoCropperModal.tsx` (to be recreated)
  - `src/utils/cropImageToCircle.ts` (to be recreated)

### 8. Cropping Accuracy Fix
- **Issue**: Cropped image not matching selection
- **Fix**: Corrected coordinate scaling from displayed size to natural size
- **Files**: `src/utils/cropImageToCircle.ts` (to be recreated)

### 9. Student Profile Page
- **Feature**: Comprehensive student profile view
- **Features**:
  - Student information (name, email, join date)
  - Statistics (avg score, total submissions, etc.)
  - Tabs for assignments, shared essays, all grades
  - Navigation from admin/teacher dashboards
- **Files**: `src/pages/institution/StudentProfile.tsx` (to be recreated)

### 10. Email Fetching Fix
- **Issue**: User email not available on student profile
- **Fix**: Use RPC function `get_user_emails` instead of admin API
- **Files**: 
  - `supabase/migrations/20251130000003_add_get_user_emails_function.sql`
  - `src/pages/institution/StudentProfile.tsx` (to be recreated)

### 11. Chrome Extension Error Suppression
- **Issue**: Console errors from browser extensions
- **Fix**: Global error handler in `main.tsx` to suppress harmless extension errors
- **Files**: `src/main.tsx`

### 12. Vocabulary System Overhaul
- **Feature**: Complete vocabulary system rewrite
- **Changes**:
  - Load from `Verbalhelp.json` (497 words)
  - Individual word detail pages
  - Clickable vocabulary cards
  - Next/Previous navigation
  - Keyboard navigation (arrow keys)
  - Auto-alphabet navigation
  - Context preservation
- **Files**:
  - `src/data/vocabulary.ts`
  - `src/pages/Vocabulary.tsx`
  - `src/pages/WordDetail.tsx` (to be recreated)
  - `src/components/vocab/VocabCard.tsx`
  - `public/Verbalhelp.json`

### 13. Vocabulary Error Handling
- **Issue**: "Cannot read properties of undefined" errors
- **Fix**: Added null/undefined checks in `convertPartOfSpeech` and word mapping
- **Files**: `src/data/vocabulary.ts`

### 14. Keyboard Navigation Fix
- **Issue**: Arrow keys not working when changing alphabets
- **Fix**: Removed boundary checks from keyboard handler, let `handlePrevious`/`handleNext` handle transitions
- **Files**: `src/pages/WordDetail.tsx` (to be recreated)

---

## Deployment

### Build Process
```bash
npm install          # Install dependencies
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Environment Variables
Required Supabase environment variables (configured in deployment platform):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Deployment Platforms
- **Lovable**: Primary deployment platform (auto-deploys on push)
- **Vercel/Netlify**: Alternative platforms (if needed)

### Database Migrations
- All migrations in `supabase/migrations/` folder
- Run migrations in Supabase SQL Editor or via CLI
- Migrations are idempotent (safe to run multiple times)

### Storage Setup
- Ensure `institution-logos` bucket exists
- Configure bucket policies for public read, authenticated write
- Migration: `20251130000000_add_institution_logos_bucket.sql`

---

## Key Utilities & Helpers

### `src/utils/essayCorrections.ts`
- `renderEssayWithCorrections()`: Applies yellow highlights to essay text
- Handles index shifting when applying multiple corrections

### `src/utils/essayReview.ts`
- `applyEditsToText()`: Applies edits to compute final corrected essay
- `renderTextWithCorrections()`: Renders HTML with visual corrections

### `src/utils/exportEssay.ts`
- `exportEssayAsDocx()`: Exports essay as Word document
- Includes essay text, metadata, and feedback

### `src/utils/storageUsage.ts`
- Calculates storage usage for users
- Tracks file sizes in Supabase storage

### `src/hooks/useEssayCorrections.ts`
- Custom hook for essay correction operations
- Methods: `fetchCorrections`, `addCorrection`, `updateCorrection`, `deleteCorrection`

### `src/hooks/useCloudSync.ts`
- Manages cloud synchronization for essays
- Handles online/offline states
- Auto-syncs when connection restored

---

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies enforce data access based on:
  - User ownership
  - Institution membership
  - Role permissions
  - Platform admin status

### Authentication
- Supabase Auth handles all authentication
- JWT tokens for API requests
- Secure password hashing
- OAuth integration for Google sign-in

### Data Validation
- Zod schemas for form validation
- TypeScript for type safety
- Input sanitization on backend
- SQL injection prevention via parameterized queries

### File Uploads
- Logo uploads restricted to authenticated users
- File type validation
- Size limits enforced
- Unique filenames prevent conflicts

---

## Future Enhancements

### Planned Features
1. **Peer Review System**: Students can review each other's essays
2. **Advanced Analytics**: More detailed statistics and charts
3. **Notification System**: Real-time notifications for reviews and grades
4. **Mobile App**: React Native version
5. **Offline Mode**: Full offline essay writing capability
6. **Export Enhancements**: PDF export, multiple format options
7. **Vocabulary Quizzes**: Interactive vocabulary testing
8. **Progress Tracking**: Detailed progress reports and recommendations

### Technical Improvements
1. **Performance Optimization**: Code splitting, lazy loading
2. **Caching Strategy**: Improved caching for vocabulary and topics
3. **Error Monitoring**: Integration with error tracking service
4. **Testing**: Unit and integration tests
5. **Documentation**: API documentation, component storybook

---

## Contributing

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (if configured)
- Component-based architecture
- Custom hooks for reusable logic

### Git Workflow
- Main branch for production
- Feature branches for new features
- Descriptive commit messages
- Pull requests for code review

---

## Support & Contact

For issues, questions, or contributions:
- Check existing documentation files
- Review migration files for database changes
- Check component documentation in code comments
- Contact platform administrators for access issues

---

## License

[Specify license if applicable]

---

**Last Updated**: January 2025
**Version**: 2.0
**Maintained By**: ScoreWise Development Team

