import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstitutionProvider } from "@/contexts/InstitutionContext";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import DashboardRedirect from "@/components/routing/DashboardRedirect";
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
import StudentDashboard from "./pages/institution/StudentDashboard";
import TeacherDashboard from "./pages/institution/TeacherDashboard";
import ReviewAssignmentEssay from "./pages/institution/ReviewAssignmentEssay";
import ViewReviewedEssay from "./pages/institution/ViewReviewedEssay";
import GradingPage from "./pages/institution/GradingPage";
import CombinedAssignment from "./pages/institution/CombinedAssignment";
import NotFound from "./pages/NotFound";
import Contact from "./pages/legal/contact";
import Privacy from "./pages/legal/privacy";
import Terms from "./pages/legal/terms";
import Cookies from "./pages/legal/cookies";
import Disclaimer from "./pages/legal/disclaimer";
import FAQs from "./pages/legal/FAQs";
import { CookieConsentBanner } from "./components/CookieConsentBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <InstitutionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CookieConsentBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/essay" element={<Essay />} />
              <Route path="/typing" element={<Typing />} />
              <Route path="/vocabulary" element={<Vocabulary />} />
              <Route path="/ielts" element={<IELTSHome />} />
              <Route path="/ielts/task1" element={<IELTSTask1 />} />
              <Route path="/ielts/task2" element={<IELTSTask2 />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/drafts" element={<Drafts />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route path="/review/:token" element={<ReviewEssay />} />
              
              {/* Legal Pages */}
              <Route path="/contact" element={<Contact />} />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              
              {/* Dashboard Redirect - automatically routes users to their appropriate dashboard */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              } />
              
              {/* Institution Routes - Protected */}
              <Route path="/institution/admin" element={
                <ProtectedRoute>
                  <InstitutionAdmin />
                </ProtectedRoute>
              } />
              <Route path="/institution/student" element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/institution/teacher" element={
                <ProtectedRoute>
                  <TeacherDashboard />
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
              <Route path="/institution/grading" element={
                <ProtectedRoute>
                  <GradingPage />
                </ProtectedRoute>
              } />
              <Route path="/institution/assignments/group/:groupId" element={
                <ProtectedRoute>
                  <CombinedAssignment />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes - Protected */}
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
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </InstitutionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
