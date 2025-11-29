import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstitutionProvider } from "@/contexts/InstitutionContext";
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
import CombinedAssignment from "./pages/institution/CombinedAssignment";
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
              {/* Institution Routes */}
              <Route path="/institution/admin" element={<InstitutionAdmin />} />
              <Route path="/institution/student" element={<StudentDashboard />} />
              <Route path="/institution/teacher" element={<TeacherDashboard />} />
              <Route path="/institution/review-essay/:essayId" element={<ReviewAssignmentEssay />} />
              <Route path="/institution/assignments/group/:groupId" element={<CombinedAssignment />} />
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/gre-topics" element={<GRETopics />} />
              <Route path="/admin/ielts-task1" element={<IELTSTask1Admin />} />
              <Route path="/admin/ielts-task2" element={<IELTSTask2Admin />} />
              <Route path="/admin/essay-analytics" element={<EssayAnalytics />} />
              <Route path="/admin/vocabulary" element={<VocabularyManager />} />
              <Route path="/admin/users" element={<UserManager />} />
              <Route path="/admin/ai-controls" element={<AIControls />} />
              <Route path="/admin/feedback" element={<FeedbackManager />} />
              <Route path="/admin/institutions" element={<InstitutionsManager />} />
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
