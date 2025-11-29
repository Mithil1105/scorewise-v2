import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstitutionProvider } from "@/contexts/InstitutionContext";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import PublicRoute from "@/components/routing/PublicRoute";
import DashboardRedirect from "@/components/routing/DashboardRedirect";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Essay from "./pages/Essay";
import Typing from "./pages/Typing";
import Vocabulary from "./pages/Vocabulary";
import IELTSHome from "./pages/IELTSHome";
import IELTSTask1 from "./pages/IELTSTask1";
import IELTSTask2 from "./pages/IELTSTask2";
import Auth from "./pages/Auth";
import Drafts from "./pages/Drafts";
import AccessDenied from "./pages/AccessDenied";
import ReviewEssay from "./pages/ReviewEssay";
import Profile from "./pages/Profile";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import TeacherDashboard from "./pages/dashboards/TeacherDashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import GRETopics from "./pages/admin/GRETopics";
import IELTSTask1Admin from "./pages/admin/IELTSTask1";
import IELTSTask2Admin from "./pages/admin/IELTSTask2";
import EssayAnalytics from "./pages/admin/EssayAnalytics";
import VocabularyManager from "./pages/admin/VocabularyManager";
import UserManager from "./pages/admin/UserManager";
import AIControls from "./pages/admin/AIControls";
import FeedbackManager from "./pages/admin/FeedbackManager";
import InstitutionsManager from "./pages/admin/InstitutionsManager";
import InstitutionAdmin from "./pages/institution/InstitutionAdmin";
import StudentDashboardOld from "./pages/institution/StudentDashboard";
import TeacherDashboardOld from "./pages/institution/TeacherDashboard";
import ReviewAssignmentEssay from "./pages/institution/ReviewAssignmentEssay";
import ViewReviewedEssay from "./pages/institution/ViewReviewedEssay";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <InstitutionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={
                <PublicRoute redirectIfAuth="/dashboard">
                  <Landing />
                </PublicRoute>
              } />
              <Route path="/auth" element={
                <PublicRoute redirectIfAuth="/dashboard">
                  <Auth />
                </PublicRoute>
              } />
              
              {/* Dashboard Redirect */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              } />
              
              {/* Role-based Dashboards */}
              <Route path="/student/dashboard" element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/teacher/dashboard" element={
                <ProtectedRoute>
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/institution" element={
                <ProtectedRoute>
                  <InstitutionAdmin />
                </ProtectedRoute>
              } />
              
              {/* Practice Pages - Available to all logged-in users */}
              <Route path="/essay" element={<Essay />} />
              <Route path="/typing" element={<Typing />} />
              <Route path="/vocabulary" element={<Vocabulary />} />
              <Route path="/ielts" element={<IELTSHome />} />
              <Route path="/ielts/task1" element={<IELTSTask1 />} />
              <Route path="/ielts/task2" element={<IELTSTask2 />} />
              
              {/* User Pages */}
              <Route path="/drafts" element={
                <ProtectedRoute>
                  <Drafts />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/join-institution" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              {/* Legacy Index - redirect to landing or dashboard */}
              <Route path="/index" element={
                <PublicRoute redirectIfAuth="/dashboard">
                  <Index />
                </PublicRoute>
              } />
              
              {/* Review Pages */}
              <Route path="/review/:token" element={<ReviewEssay />} />
              <Route path="/access-denied" element={<AccessDenied />} />
              
              {/* Institution Routes (Legacy - kept for backward compatibility) */}
              <Route path="/institution/admin" element={
                <ProtectedRoute>
                  <InstitutionAdmin />
                </ProtectedRoute>
              } />
              <Route path="/institution/student" element={
                <ProtectedRoute>
                  <StudentDashboardOld />
                </ProtectedRoute>
              } />
              <Route path="/institution/teacher" element={
                <ProtectedRoute>
                  <TeacherDashboardOld />
                </ProtectedRoute>
              } />
              <Route path="/institution/review-essay/:essayId" element={
                <ProtectedRoute>
                  <ReviewAssignmentEssay />
                </ProtectedRoute>
              } />
              <Route path="/institution/view-reviewed-essay/:essayId" element={
                <ProtectedRoute>
                  <ViewReviewedEssay />
                </ProtectedRoute>
              } />
              
              {/* Platform Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/gre-topics" element={
                <ProtectedRoute>
                  <GRETopics />
                </ProtectedRoute>
              } />
              <Route path="/admin/ielts-task1" element={
                <ProtectedRoute>
                  <IELTSTask1Admin />
                </ProtectedRoute>
              } />
              <Route path="/admin/ielts-task2" element={
                <ProtectedRoute>
                  <IELTSTask2Admin />
                </ProtectedRoute>
              } />
              <Route path="/admin/essay-analytics" element={
                <ProtectedRoute>
                  <EssayAnalytics />
                </ProtectedRoute>
              } />
              <Route path="/admin/vocabulary" element={
                <ProtectedRoute>
                  <VocabularyManager />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute>
                  <UserManager />
                </ProtectedRoute>
              } />
              <Route path="/admin/ai-controls" element={
                <ProtectedRoute>
                  <AIControls />
                </ProtectedRoute>
              } />
              <Route path="/admin/feedback" element={
                <ProtectedRoute>
                  <FeedbackManager />
                </ProtectedRoute>
              } />
              <Route path="/admin/institutions" element={
                <ProtectedRoute>
                  <InstitutionsManager />
                </ProtectedRoute>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </InstitutionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
